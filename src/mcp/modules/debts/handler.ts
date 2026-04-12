import { accountRepository } from "../../../db/accounts.js";
import { transactionRepository } from "../../../db/transactions.js";
import { debtRepository } from "../../../db/debts.js";
import { creditCardRepository } from "../../../db/credit_cards.js";

type HandlerFn = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

export const debtHandlers: Record<string, HandlerFn> = {

    async get_debts(_args) {
        const debts = await debtRepository.getAll();
        return {
            content: [{ type: "text", text: JSON.stringify(debts, null, 2) }]
        };
    },

    async create_debt(args) {
        const { account_identifier, lender, total_amount, total_installments = 1, description, event_name, affect_balance = false } = args as {
            account_identifier?: string;
            lender: string;
            total_amount: number;
            total_installments?: number;
            description?: string;
            event_name?: string;
            affect_balance?: boolean;
        };

        let account = null;
        let accountWarning = "";
        if (account_identifier) {
            account = await accountRepository.findByIdentifier(account_identifier);
            if (!account) {
                accountWarning = ` (Nota: La cuenta '${account_identifier}' no se encontró, así que la deuda se registró sin asociarse a ninguna cuenta).`;
            }
        }

        // --- DUPLICATE GUARD ---
        const existing = await debtRepository.findByLender(lender);
        if (existing && Math.abs(Number(existing.total_amount) - total_amount) < 1) {
            return {
                content: [{ type: "text", text: `⚠️ La deuda con '${lender}' por $${total_amount} ya está registrada en el sistema. No se ha creado un duplicado.` }]
            };
        }

        let eventId: number | null = null;
        if (event_name) {
            const { pool } = await import("../../../config/database.js");
            const eventRes = await pool.query(
                `SELECT id FROM events WHERE name ILIKE $1 LIMIT 1`,
                [`%${event_name.trim()}%`]
            );
            if (eventRes.rows.length > 0) {
                eventId = eventRes.rows[0].id;
            } else {
                throw new Error(`No se encontró un evento que coincida con '${event_name}'.`);
            }
        }

        // 1. Registramos la deuda enlazada a la tarjeta/cuenta (o sin enlazar)
        await debtRepository.create({
            account_id: account ? account.id : null,
            lender,
            type: account ? "credit_card" : "personal_loan",
            total_amount,
            remaining_amount: total_amount,
            interest_rate: 0,
            total_installments,
            next_payment_date: new Date(),
            event_id: eventId
        });

        // 2. Registramos el gasto SOLAMENTE si se usó una cuenta Y se pidió explícitamente afectar el saldo
        let finalDesc = description
            ? `Compra a cuotas: ${lender} - ${description}`
            : `Compra a cuotas: ${lender}`;
            
        if (eventId) {
            finalDesc = `${finalDesc} [event:${eventId}]`;
        }

        if (account && affect_balance) {
            await transactionRepository.create(account.id, -Math.abs(total_amount), finalDesc, "credit_purchase");
            return {
                content: [{ type: "text", text: `✅ Deuda con '${lender}' registrada en '${account.name}' y saldo actualizado (se creó transacción de gasto).` }]
            };
        } else if (account) {
            return {
                content: [{ type: "text", text: `✅ Deuda con '${lender}' registrada y vinculada a '${account.name}'. NO se afectó el saldo de la cuenta (uso informativo).` }]
            };
        } else {
            return {
                content: [{ type: "text", text: `✅ Deuda personal con '${lender}' registrada en ${total_installments} cuota(s). No se afectó ninguna cuenta.${accountWarning}` }]
            };
        }
    },

    async pay_debt(args) {
        const { source_account_identifier, debt_identifier, amount, description } = args as {
            source_account_identifier: string;
            debt_identifier: string;
            amount: number;
            description?: string;
        };

        const sourceAccount = await accountRepository.findByIdentifier(source_account_identifier);
        if (!sourceAccount) {
            throw new Error(`La cuenta origen '${source_account_identifier}' no existe.`);
        }

        // Buscar deuda por nombre (lender)
        const debt = await debtRepository.findByLender(debt_identifier);
        if (!debt) {
            throw new Error(`Deuda '${debt_identifier}' no encontrada en la base de datos.`);
        }

        console.log(`💳 Procesando pago para '${debt.lender}' (Tipo: ${debt.type})`);

        // 1. Descuenta plata de la cuenta origen
        await transactionRepository.payDebt(sourceAccount.id, amount, debt.id, description || `Pago a ${debt.lender}`);

        // 2. Si es tarjeta de crédito, aplicamos el pago en cascada a sus compras
        if (debt.type === 'credit_card') {
            console.log(`📉 Aplicando pago en cascada a compras de '${debt.lender}'...`);
            await creditCardRepository.applyPaymentToPurchases(debt.id, amount);
        }

        return {
            content: [{
                type: "text",
                text: `✅ Pago de $${amount} aplicado a la deuda '${debt.lender}'. Saldo actualizado correctamente en la cuenta de origen.${debt.type === 'credit_card' ? ' El pago se distribuyó entre las compras pendientes.' : ''}`
            }]
        };
    },

    async update_debt(args) {
        const { debt_identifier, ...updates } = args as { debt_identifier: string } & any;
        
        let debt;
        if (!isNaN(Number(debt_identifier))) {
            debt = await debtRepository.getById(Number(debt_identifier));
        } else {
            debt = await debtRepository.findByLender(debt_identifier);
        }

        if (!debt) {
            throw new Error(`No se encontró la deuda '${debt_identifier}'.`);
        }

        const updated = await debtRepository.update(debt.id, updates);
        return {
            content: [{ type: "text", text: `✅ Deuda '${updated.lender}' actualizada correctamente.` }]
        };
    },

    async register_card_purchase(args) {
        const { card_name, amount, description, installments, interest_rate = 0 } = args as {
            card_name: string;
            amount: number;
            description: string;
            installments: number;
            interest_rate?: number;
        };

        // 1. Buscar la tarjeta (la deuda padre)
        const debt = await debtRepository.findByLender(card_name);
        if (!debt) {
            throw new Error(`No se encontró la tarjeta '${card_name}'. Asegúrate de que esté creada como una deuda tipo 'credit_card'.`);
        }

        if (debt.type !== 'credit_card') {
            throw new Error(`'${card_name}' no es una tarjeta de crédito (es tipo ${debt.type}). Solo puedes registrar compras en una tarjeta.`);
        }

        // 2. Registrar la compra individual
        await creditCardRepository.createPurchase({
            debt_id: debt.id,
            description,
            total_amount: amount,
            remaining_amount: amount,
            interest_rate,
            total_installments: installments
        });

        return {
            content: [{ type: "text", text: `✅ Compra de '${description}' por $${amount} registrada en '${card_name}' a ${installments} cuotas.` }]
        };
    },

    async delete_debt(args) {
        const { debt_identifier } = args as { debt_identifier: string };
        
        let debt;
        if (!isNaN(Number(debt_identifier))) {
            debt = await debtRepository.getById(Number(debt_identifier));
        } else {
            debt = await debtRepository.findByLender(debt_identifier);
        }

        if (!debt) {
            throw new Error(`No se encontró la deuda '${debt_identifier}'.`);
        }

        await debtRepository.delete(debt.id);
        return {
            content: [{ type: "text", text: `✅ Deuda '${debt.lender}' eliminada correctamente.` }]
        };
    }
};
