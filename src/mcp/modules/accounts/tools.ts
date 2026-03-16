import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const accountTools: Tool[] = [
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
            required: ["name", "type", "balance", "alias"]
        }
    },
    {
        name: "get_accounts",
        description: "Get all financial accounts with their balances and aliases.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "get_account_balance",
        description: "Get the current balance of a specific account by its alias, name, or account number.",
        inputSchema: {
            type: "object",
            properties: {
                account_identifier: {
                    type: "string",
                    description: "Alias, name, or account number of the account"
                }
            },
            required: ["account_identifier"]
        }
    }
];
