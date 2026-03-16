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
    }
];
