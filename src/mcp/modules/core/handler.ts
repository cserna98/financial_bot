import { pool } from "../../../config/database.js";

type HandlerFn = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

const FORBIDDEN_COMMANDS = ["DROP", "TRUNCATE", "ALTER"];

export const coreHandlers: Record<string, HandlerFn> = {

    async run_sql_query(args) {
        const { query } = args as { query: string };

        // 🛡️ Capa de seguridad: bloqueamos comandos destructivos
        const upperQuery = query.toUpperCase();
        if (FORBIDDEN_COMMANDS.some(cmd => upperQuery.includes(cmd))) {
            throw new Error("❌ Operación denegada: La consulta contiene comandos destructivos prohibidos (DROP, TRUNCATE, ALTER).");
        }

        console.log(`⚡ EJECUTANDO SQL CRUDO: ${query}`);

        try {
            const res = await pool.query(query);

            if (Array.isArray(res.rows)) {
                const limitedRows = res.rows.slice(0, 20);
                return {
                    content: [{
                        type: "text",
                        text: `✅ Resultados (${res.rowCount} filas):\n${JSON.stringify(limitedRows, null, 2)}`
                    }]
                };
            }

            return {
                content: [{ type: "text", text: `✅ Operación ejecutada con éxito.` }]
            };
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `❌ Error SQL: ${error.message}` }],
                isError: true
            };
        }
    }
};
