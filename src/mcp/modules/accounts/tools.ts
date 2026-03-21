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
    },
    {
        name: "update_account",
        description: "Updates an existing financial account's details (name, type, balance, alias, etc.).",
        inputSchema: {
            type: "object",
            properties: {
                account_identifier: { type: "string", description: "Current alias, name, or account number" },
                name: { type: "string" },
                type: { type: "string", enum: ["savings", "cash", "credit_card"] },
                balance: { type: "number" },
                alias: { type: "string" },
                account_number: { type: "string" }
            },
            required: ["account_identifier"]
        }
    },
    {
        name: "delete_account",
        description: "Permanently deletes a financial account from the system.",
        inputSchema: {
            type: "object",
            properties: {
                account_identifier: { type: "string", description: "Alias, name, or account number of the account to delete" }
            },
            required: ["account_identifier"]
        }
    }
];
