import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const eventTools: Tool[] = [
    {
        name: "create_event",
        description: "Creates a new financial event (e.g., a trip or project) with an optional budget and date range to track spending.",
        inputSchema: {
            type: "object",
            properties: {
                name: { type: "string", description: "Name of the event (e.g., 'Viaje Medellín')" },
                description: { type: "string", description: "Optional details about the event" },
                total_budget: { type: "number", description: "Optional total budget allocated for the event" },
                start_date: { type: "string", description: "Optional start date (ISO format, e.g. '2026-04-01')" },
                end_date: { type: "string", description: "Optional end date (ISO format, e.g. '2026-04-07')" }
            },
            required: ["name"]
        }
    },
    {
        name: "list_events",
        description: "Lists all registered events with their budgets, dates, and active status.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "get_event_summary",
        description: "Gets the total spending vs budget for a specific event, based on linked transactions.",
        inputSchema: {
            type: "object",
            properties: {
                event_id: { type: "number", description: "ID of the event to summarize" }
            },
            required: ["event_id"]
        }
    }
];
