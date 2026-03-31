import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getCategoryEnumDescription, ALL_CATEGORIES } from "../../../config/categories.js";

export const transactionTools: Tool[] = [
    {
        name: "register_transaction",
        description: "Registers an income or expense. Use positive numbers for income (salary) and negative for expenses.",
        inputSchema: {
            type: "object",
            properties: {
                account_identifier: {
                    type: "string",
                    description: "Literal Name or Alias (e.g., 'nomina', 'efectivo'). DO NOT TRANSLATE TO ENGLISH."
                },
                amount: {
                    type: "number",
                    description: "Amount (positive for income, negative for expense)"
                },
                description: {
                    type: "string",
                    description: "Optional: Descripción libre del gasto (ej. 'Almuerzo con Juan', 'Tanqueada moto')"
                },
                category: {
                    type: "string",
                    description: getCategoryEnumDescription(),
                    enum: [...ALL_CATEGORIES]
                },
                event_name: {
                    type: "string",
                    description: "Optional: Nombre del evento al que pertenece este gasto (ej. 'Asado Fin de Semana', 'Viaje Costa'). Usa esto para vincular el gasto a un evento/viaje."
                },
                event_id: {
                    type: "number",
                    description: "Optional: ID of an event this transaction belongs to"
                }
            },
            required: ["account_identifier", "amount", "category"]
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
                    description: "Literal Alias, name, or account number. NO TRADUCIR."
                },
                limit: {
                    type: "number",
                    description: "Number of transactions to return (default: 10)"
                }
            },
            required: ["account_identifier"]
        }
    },
    {
        name: "get_transactions",
        description: "Busca transacciones con filtros opcionales de cuenta y rango de fechas.",
        inputSchema: {
            type: "object",
            properties: {
                account_identifier: {
                    type: "string",
                    description: "Opcional: Alias o nombre literal de la cuenta. NO TRADUCIR."
                },
                start_date: {
                    type: "string",
                    description: "Fecha de inicio (YYYY-MM-DD)"
                },
                end_date: {
                    type: "string",
                    description: "Fecha de fin (YYYY-MM-DD)"
                },
                limit: {
                    type: "number",
                    description: "Límite de resultados (default: 20)"
                }
            }
        }
    },
    {
        name: "update_transaction",
        description: "Updates an existing transaction's details (amount, description, category, etc.).",
        inputSchema: {
            type: "object",
            properties: {
                transaction_id: { type: "number", description: "ID of the transaction to update" },
                amount: { type: "number" },
                description: { type: "string" },
                category: { type: "string" },
                account_id: { type: "number" }
            },
            required: ["transaction_id"]
        }
    },
    {
        name: "delete_transaction",
        description: "Permanently deletes a transaction from the database.",
        inputSchema: {
            type: "object",
            properties: {
                transaction_id: { type: "number", description: "ID of the transaction to delete" }
            },
            required: ["transaction_id"]
        }
    }
];
