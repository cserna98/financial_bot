import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools.js";
import { accountRepository } from "../db/accounts.js";
import { transactionRepository } from "../db/transactions.js";
import { debtRepository } from "../db/debts.js";
import { pool } from "../config/database.js";

const server = new Server(
    { name: "financial-mcp-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.log(`📡 RECIBIDA SOLICITUD DE HERRAMIENTA: ${name}`);
    console.log(`📦 DATOS RECIBIDOS:`, JSON.stringify(args, null, 2));

    try {
        switch (name) {

            case "run_sql_query": {
                const { query } = args as any;

                // 🛡️ CAPA DE SEGURIDAD BÁSICA
                // Evitamos que la IA borre tablas o bases de datos por accidente
                const forbidden = ["DROP", "TRUNCATE", "ALTER"];
                const upperQuery = query.toUpperCase();
                if (forbidden.some(word => upperQuery.includes(word))) {
                    throw new Error("❌ Operación denegada: La consulta contiene comandos destructivos prohibidos.");
                }

                console.log(`⚡ EJECUTANDO SQL CRUDO: ${query}`);

                try {
                    const res = await pool.query(query);

                    // Si es un SELECT, devolvemos las filas
                    if (Array.isArray(res.rows)) {
                        // Limitamos a 20 filas para no saturar el chat de Telegram
                        const limitedRows = res.rows.slice(0, 20);
                        return {
                            content: [{
                                type: "text",
                                text: `✅ Resultados (${res.rowCount} filas):\n${JSON.stringify(limitedRows, null, 2)}`
                            }]
                        };
                    }

                    // Si es un INSERT/UPDATE
                    return { content: [{ type: "text", text: `✅ Operación ejecutada con éxito.` }] };

                } catch (error: any) {
                    return {
                        content: [{ type: "text", text: `❌ Error SQL: ${error.message}` }],
                        isError: true
                    };
                }
            }
            case "create_account": {
                const { name, type, balance, alias, account_number } = args as any;
                const acc = await accountRepository.create(name, type, balance, alias, account_number);
                return { content: [{ type: "text", text: `Cuenta creada: ${acc.name}` }] };
            }

            case "get_accounts": {
                const accounts = await accountRepository.getAll();
                return { content: [{ type: "text", text: JSON.stringify(accounts, null, 2) }] };
            }

            case "register_transaction": {
                const { account_identifier, amount, description, category } = args as any;

                // 1. Verificamos si la cuenta existe
                console.log(`🔍 Buscando cuenta: '${account_identifier}'...`);
                const account = await accountRepository.findByIdentifier(account_identifier);

                if (!account) {
                    console.error(`❌ Cuenta '${account_identifier}' NO ENCONTRADA en la DB.`);
                    throw new Error(`La cuenta '${account_identifier}' no existe. Revisa el alias.`);
                }
                console.log(`✅ Cuenta encontrada: ID ${account.id} (${account.name})`);

                // 2. Ajuste de signo
                let finalAmount = amount;
                const desc = (description || "").toLowerCase();
                if (desc.includes('gast') || desc.includes('pagué') || category === 'food') {
                    finalAmount = -Math.abs(amount);
                }

                // 3. Intentamos crear la transacción
                console.log(`📝 Intentando insertar transacción en ID ${account.id} por ${finalAmount}...`);
                await transactionRepository.create(account.id, finalAmount, description, category);

                return { content: [{ type: "text", text: `✅ Transacción registrada correctamente.` }] };
            }

            case "pay_debt": {
                const {
                    source_account_identifier,
                    debt_identifier,
                    debt_id,
                    destination_account_identifier, // 👈 Nuevo parámetro
                    amount,
                    description
                } = args as any;

                const sourceAccount = await accountRepository.findByIdentifier(source_account_identifier);
                if (!sourceAccount) throw new Error(`La cuenta origen '${source_account_identifier}' no existe.`);

                let debt;
                if (debt_id) debt = await debtRepository.getById(debt_id);
                else if (debt_identifier) debt = await debtRepository.findByLender(debt_identifier);

                if (!debt) throw new Error("Deuda no encontrada en la base de datos.");

                // 1. Resta el dinero de la cuenta origen y actualiza la tabla de deudas
                await transactionRepository.payDebt(sourceAccount.id, debt.id, amount, description || 'Pago de cuota');

                // 2. ¡LA SOLUCIÓN! Si es una tarjeta de crédito, le devolvemos el saldo (cupo)
                if (destination_account_identifier) {
                    const destAccount = await accountRepository.findByIdentifier(destination_account_identifier);
                    if (destAccount) {
                        // Creamos una transacción positiva en la tarjeta
                        await transactionRepository.create(
                            destAccount.id,
                            Math.abs(amount), // Positivo para liberar cupo
                            `Abono de cuota: ${debt.lender}`,
                            'debt_payment_received'
                        );
                    }
                }

                return { content: [{ type: "text", text: `✅ Pago de $${amount} aplicado a la deuda '${debt.lender}'. Saldo actualizado correctamente en tus cuentas.` }] };
            }

            case "create_debt": {
                const { account_identifier, lender, total_amount, total_installments = 1, description } = args as any;

                const account = await accountRepository.findByIdentifier(account_identifier);
                if (!account) throw new Error(`La cuenta o tarjeta '${account_identifier}' no existe.`);

                // 1. Registramos la deuda y LA ENLAZAMOS a la tarjeta
                const debt = await debtRepository.create({
                    account_id: account.id, // 👈 ¡MAGIA! Guardamos de qué tarjeta salió
                    lender,
                    type: 'credit_card',
                    total_amount,
                    remaining_amount: total_amount,
                    interest_rate: 0,
                    total_installments,
                    next_payment_date: new Date()
                });

                // 2. Registramos el gasto (te quita cupo)
                const finalDesc = description ? `Compra a cuotas: ${lender} - ${description}` : `Compra a cuotas: ${lender}`;
                await transactionRepository.create(account.id, -Math.abs(total_amount), finalDesc, 'credit_purchase');

                return { content: [{ type: "text", text: `✅ Compra de '${lender}' registrada en '${account.name}'.` }] };
            }

            case "pay_debt": {
                const { source_account_identifier, debt_identifier, debt_id, amount, description } = args as any;

                const sourceAccount = await accountRepository.findByIdentifier(source_account_identifier);
                if (!sourceAccount) throw new Error(`La cuenta origen '${source_account_identifier}' no existe.`);

                let debt;
                if (debt_id) debt = await debtRepository.getById(debt_id);
                else if (debt_identifier) debt = await debtRepository.findByLender(debt_identifier);
                if (!debt) throw new Error("Deuda no encontrada en la base de datos.");

                // 1. Quitamos la plata de la cuenta origen (ej. Nómina) y bajamos la deuda
                await transactionRepository.payDebt(sourceAccount.id, debt.id, amount, description || 'Pago de cuota');

                // 2. ¡MAGIA AUTOMÁTICA! Si la deuda tiene una tarjeta enlazada, le devolvemos el cupo
                if (debt.account_id) {
                    await transactionRepository.create(
                        debt.account_id,
                        Math.abs(amount), // Positivo para liberar cupo
                        `Abono automático de cuota: ${debt.lender}`,
                        'debt_payment_received'
                    );
                }

                return { content: [{ type: "text", text: `✅ Pago de $${amount} aplicado a la deuda '${debt.lender}'. Saldo actualizado correctamente en tus cuentas de forma automática.` }] };
            }

            case "get_debts": {
                const debts = await debtRepository.getAll();
                return { content: [{ type: "text", text: JSON.stringify(debts) }] };
            }

            default:
                throw new Error(`Herramienta no encontrada: ${name}`);
        }
    } catch (error: any) {
        // ESTA ES LA PARTE IMPORTANTE: IMPRIMIR EL ERROR COMPLETO
        console.error("🔥 ERROR CRÍTICO EN EL SERVIDOR:");
        console.error(error); // Imprime el objeto error crudo
        if (error.detail) console.error("🔍 DETALLE SQL:", error.detail); // Detalle específico de Postgres
        if (error.hint) console.error("💡 PISTA:", error.hint);

        return {
            content: [{ type: "text", text: `Error Técnico: ${error.message || JSON.stringify(error)}` }],
            isError: true
        };
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);