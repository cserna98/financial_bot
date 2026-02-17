import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools.js";
import { accountRepository } from "../db/accounts.js";
import { transactionRepository } from "../db/transactions.js";
import { debtRepository } from "../db/debts.js";

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
                const { source_account_identifier, debt_identifier, amount, description } = args as any;
                const account = await accountRepository.findByIdentifier(source_account_identifier);
                const debt = await debtRepository.findByLender(debt_identifier);

                if (!account) throw new Error("Cuenta origen no encontrada");
                if (!debt) throw new Error("Deuda no encontrada");

                await transactionRepository.payDebt(account.id, debt.id, amount, description);
                return { content: [{ type: "text", text: `✅ Pago aplicado a ${debt.lender}` }] };
            }

            case "create_debt": {
                const { lender, total_amount, interest_rate, total_installments, type } = args as any;
                const debt = await debtRepository.create({
                    lender, type: type || 'credit_card', total_amount,
                    remaining_amount: total_amount, interest_rate,
                    total_installments, next_payment_date: new Date()
                });
                return { content: [{ type: "text", text: `Deuda creada.` }] };
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