import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { tools } from "./tools.js";

import { accountHandlers } from "./modules/accounts/handler.js";
import { transactionHandlers } from "./modules/transactions/handler.js";
import { debtHandlers } from "./modules/debts/handler.js";
import { eventHandlers } from "./modules/events/handler.js";
import { subscriptionHandlers } from "./modules/subscriptions/handler.js";
import { coreHandlers } from "./modules/core/handler.js";
import { reportHandlers } from "./modules/reports/handler.js";

// ─── Master dispatcher ────────────────────────────────────────────────────────
// Add any new module's handlers here; no switch/case ever needed again.
const allHandlers: Record<string, (args: Record<string, unknown>) => Promise<{
    content: { type: string; text: string }[];
    isError?: boolean;
}>> = {
    ...accountHandlers,
    ...transactionHandlers,
    ...debtHandlers,
    ...eventHandlers,
    ...subscriptionHandlers,
    ...coreHandlers,
    ...reportHandlers,
};

// ─── MCP Server ───────────────────────────────────────────────────────────────
const server = new Server(
    { name: "financial-mcp-server", version: "2.0.0" },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    console.log(`📡 TOOL REQUEST: ${name}`);
    console.log(`📦 ARGS:`, JSON.stringify(args, null, 2));

    const handler = allHandlers[name];
    if (!handler) {
        console.error(`❌ Herramienta desconocida: ${name}`);
        return {
            content: [{ type: "text", text: `❌ Herramienta '${name}' no encontrada.` }],
            isError: true,
        };
    }

    try {
        const result = await handler(args as Record<string, unknown>);
        return result;
    } catch (error: any) {
        console.error("🔥 ERROR EN HANDLER:", error);
        if (error.detail) console.error("🔍 DETALLE SQL:", error.detail);
        if (error.hint) console.error("💡 PISTA:", error.hint);

        return {
            content: [{ type: "text", text: `Error Técnico: ${error.message || JSON.stringify(error)}` }],
            isError: true,
        };
    }
});

// ─── Start transport ──────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);