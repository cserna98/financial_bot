import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const transactionTools: Tool[] = [
    {
        name: "register_transaction",
        description: "Registers an income or expense. Use positive numbers for income (salary) and negative for expenses.",
        inputSchema: {
            type: "object",
            properties: {
                account_identifier: {
                    type: "string",
                    description: "Name, alias (e.g., 'nomina'), or account number"
                },
                amount: {
                    type: "number",
                    description: "Amount (positive for income, negative for expense)"
                },
                description: { type: "string" },
                category: {
                    type: "string",
                    description: "e.g., 'salary', 'food', 'concert', 'leisure'"
                },
                category_id: {
                    type: "number",
                    description: "Optional: ID of a predefined category"
                },
                event_name: {
                    type: "string",
                    description: "Optional: Nombre del evento al que pertenece este gasto (ej. 'Asado Fin de Semana'). Usa esto en lugar de event_id si conoces el nombre."
                },
                event_id: {
                    type: "number",
                    description: "Optional: ID of an event this transaction belongs to"
                }
            },
            required: ["account_identifier", "amount", "description", "category"]
        }
    },
    {
        name: "get_recent_transactions",
        description: "Get the most recent transactions for a specific account.",
        inputSchema: {
            type: "object",
            properties: {
                account_identifier: {
                    type: "string",
                    description: "Alias, name, or account number of the account"
                },
                limit: {
                    type: "number",
                    description: "Number of transactions to return (default: 10)"
                }
            },
            required: ["account_identifier"]
        }
    }
];
