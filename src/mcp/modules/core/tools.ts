import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const coreTools: Tool[] = [
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
