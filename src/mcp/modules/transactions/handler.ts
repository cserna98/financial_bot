import { accountRepository } from "../../../db/accounts.js";
import { transactionRepository } from "../../../db/transactions.js";

type HandlerFn = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

export const transactionHandlers: Record<string, HandlerFn> = {

    async register_transaction(args) {
        const { account_identifier, amount, description, category, category_id, event_id, event_name } = args as {
            account_identifier: string;
            amount: number;
            description: string;
            category: string;
            category_id?: number;
            event_id?: number;
            event_name?: string;
        };

        console.log(`🔍 Buscando cuenta: '${account_identifier}'...`);
        const account = await accountRepository.findByIdentifier(account_identifier);
        if (!account) {
            console.error(`❌ Cuenta '${account_identifier}' NO ENCONTRADA en la DB.`);
            throw new Error(`La cuenta '${account_identifier}' no existe. Revisa el alias.`);
        }
        console.log(`✅ Cuenta encontrada: ID ${account.id} (${account.name})`);

        // Ajuste automático de signo para gastos descriptivos
        let finalAmount = amount;
        const desc = (description || "").toLowerCase();
        if (desc.includes("gast") || desc.includes("pagué") || category === "food") {
            finalAmount = -Math.abs(amount);
        }

        // Resolviendo event_name a event_id si es necesario
        let resolvedEventId = event_id;
        let eventWarning = "";
        if (!resolvedEventId && event_name) {
            const { pool } = await import("../../../config/database.js");
            const eventRes = await pool.query(
                `SELECT id FROM events WHERE name ILIKE $1 LIMIT 1`,
                [`%${event_name.trim()}%`]
            );
            if (eventRes.rows.length > 0) {
                resolvedEventId = eventRes.rows[0].id;
            } else {
                eventWarning = ` (Nota: No se encontró un evento llamado '${event_name}', por lo que el gasto no se sumó a ningún evento).`;
            }
        }

        // Construimos la category string enriquecida
        let resolvedCategory = category;
        if (category_id) resolvedCategory += ` [cat:${category_id}]`;
        if (resolvedEventId) resolvedCategory += ` [event:${resolvedEventId}]`;

        console.log(`📝 Insertando transacción en ID ${account.id} por ${finalAmount}${resolvedEventId ? ` (event_id: ${resolvedEventId})` : ""}...`);
        await transactionRepository.create(account.id, finalAmount, description, resolvedCategory);

        return {
            content: [{ type: "text", text: `✅ Transacción registrada correctamente en '${account.name}'.${eventWarning}` }]
        };
    },

    async get_recent_transactions(args) {
        const { account_identifier, limit = 10 } = args as {
            account_identifier: string;
            limit?: number;
        };

        const account = await accountRepository.findByIdentifier(account_identifier);
        if (!account) {
            throw new Error(`La cuenta '${account_identifier}' no existe. Revisa el alias.`);
        }

        const transactions = await transactionRepository.getRecentByAccount(account.id, limit);
        return {
            content: [{
                type: "text",
                text: `📋 Últimas ${transactions.length} transacciones de '${account.name}':\n${JSON.stringify(transactions, null, 2)}`
            }]
        };
    }
};
