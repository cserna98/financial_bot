import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const subscriptionTools: Tool[] = [
    {
        name: "add_subscription",
        description: "Registers a recurring subscription or monthly bill (e.g., Netflix, gym, rent).",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Name of the subscription (e.g., 'Netflix')" },
                amount: { type: "number", description: "Monthly cost of the subscription" },
                billing_day: {
                    type: "number",
                    description: "Day of the month when it is charged (1-31)"
                },
                account_identifier: {
                    type: "string",
                    description: "Optional: alias or name of the account it is charged to"
                }
            },
            required: ["name", "amount", "billing_day"]
        }
    },
    {
        name: "list_subscriptions",
        description: "Lists all registered subscriptions with their monthly costs and billing days.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "check_upcoming_bills",
        description: "Shows subscriptions due in the next N days. Useful for cash flow planning.",
        inputSchema: {
            type: "object",
            properties: {
                days_ahead: {
                    type: "number",
                    description: "Number of days to look ahead (default: 7)"
                }
            }
        }
    },
    {
        name: "update_subscription",
        description: "Updates an existing subscription's details (name, amount, billing day, etc.).",
        inputSchema: {
            type: "object",
            properties: {
                subscription_id: { type: "number", description: "ID of the subscription to update" },
                name: { type: "string" },
                amount: { type: "number" },
                billing_day: { type: "number", minimum: 1, maximum: 31 },
                account_identifier: { type: "string" }
            },
            required: ["subscription_id"]
        }
    },
    {
        name: "delete_subscription",
        description: "Permanently deletes a subscription from the database.",
        inputSchema: {
            type: "object",
            properties: {
                subscription_id: { type: "number", description: "ID of the subscription to delete" }
            },
            required: ["subscription_id"]
        }
    }
];
