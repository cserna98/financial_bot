import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const tools: Tool[] = [

    {
        name: "create_account",
        description: "Creates a new financial account. Always ask for an alias to make future transactions easier.",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Official name of the bank or account" },
                type: { type: "string", enum: ["savings", "cash", "credit_card"] },
                balance: { type: "number", description: "Starting balance" },
                alias: { type: "string", description: "Short nickname (e.g., 'nomina', 'efectivo')" },
                account_number: { type: "string" }
            },
            required: ["name", "type", "balance", "alias"] // Ahora el alias es obligatorio
        }
    },
    {
        name: "get_accounts",
        description: "Get all financial accounts with their balances and aliases.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "register_transaction",
        description: "Registers an income or expense. Use positive numbers for income (salary) and negative for expenses.",
        inputSchema: {
            type: "object",
            properties: {
                account_identifier: { type: "string", description: "Name, alias (e.g., 'nomina'), or account number" },
                amount: { type: "number", description: "Amount (positive for income, negative for expense)" },
                description: { type: "string" },
                category: { type: "string", description: "e.g., 'salary', 'food', 'concert', 'leisure'" }
            },
            required: ["account_identifier", "amount", "description", "category"]
        }
    },
    {
        name: "get_debts",
        description: "Lists all debts, including lender, interest rate, and remaining amount.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "pay_debt",
        description: "Paga la cuota de una deuda. Si la deuda pertenece a una tarjeta de crédito, incluye el alias en destination_account_identifier.",
        inputSchema: {
            type: "object",
            properties: {
                source_account_identifier: { type: "string", description: "Cuenta de donde sale el dinero (ej. 'nomina')" },
                debt_identifier: { type: "string", description: "Nombre de la deuda" },
                destination_account_identifier: { type: "string", description: "OPCIONAL. Alias de la tarjeta de crédito a la que se le libera cupo (ej. 'mastercard')" },
                amount: { type: "number" },
                description: { type: "string" }
            },
            required: ["source_account_identifier", "debt_identifier", "amount"]
        }
    },

    {
        name: "create_debt",
        description: "Registra una compra a cuotas. CREA la deuda para control de cuotas y REGISTRA el gasto en la cuenta/tarjeta al mismo tiempo.",
        inputSchema: {
            type: "object",
            properties: {
                account_identifier: { type: "string", description: "Alias de la cuenta o tarjeta usada (ej. 'mastercard')" },
                lender: { type: "string", description: "Qué se compró o a quién se le debe (ej. 'iPhone')" },
                total_amount: { type: "number", description: "Monto total de la compra (ej. 4500000)" },
                total_installments: { type: "number", description: "Número de cuotas (por defecto 1)" },
                description: { type: "string", description: "Detalles adicionales de la compra o el motivo" } // 👈 ¡NUEVO!
            },
            required: ["account_identifier", "lender", "total_amount"]
        }
    },
    {
        name: "run_sql_query",
        description: "ADVANCED: Executes a raw SQL query. Use this ONLY for complex reports or data retrieval not covered by other tools. DO NOT use for INSERT/UPDATE/DELETE unless explicitly asked.",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The SQL query to execute (PostgreSQL syntax)"
                }
            },
            required: ["query"]
        }
    }

];