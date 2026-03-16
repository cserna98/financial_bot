import { pool } from "../../../config/database.js";

type HandlerFn = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

export const eventHandlers: Record<string, HandlerFn> = {

    async create_event(args) {
        const { name, description, total_budget, start_date, end_date } = args as {
            name: string;
            description?: string;
            total_budget?: number;
            start_date?: string;
            end_date?: string;
        };

        const res = await pool.query(
            `INSERT INTO events (name, description, total_budget, start_date, end_date, is_active)
             VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
            [name, description ?? null, total_budget ?? null, start_date ?? null, end_date ?? null]
        );
        const event = res.rows[0];
        const parts = [`✅ Evento '${event.name}' creado (ID: ${event.id})`];
        if (total_budget) parts.push(`con presupuesto de $${Number(total_budget).toLocaleString("es-CO")}`);
        if (start_date) parts.push(`desde ${start_date}${end_date ? ` hasta ${end_date}` : ""}`);

        return { content: [{ type: "text", text: parts.join(" — ") + "." }] };
    },

    async list_events(_args) {
        const res = await pool.query(`SELECT * FROM events ORDER BY id DESC`);
        return {
            content: [{ type: "text", text: JSON.stringify(res.rows, null, 2) }]
        };
    },

    async get_event_summary(args) {
        const { event_id } = args as { event_id: number };

        const eventRes = await pool.query(`SELECT * FROM events WHERE id = $1`, [event_id]);
        if (!eventRes.rows.length) {
            throw new Error(`Evento con ID ${event_id} no encontrado.`);
        }
        const event = eventRes.rows[0];

        // Sumar transacciones etiquetadas con este event_id en la categoría
        const spendRes = await pool.query(
            `SELECT COALESCE(SUM(ABS(amount)), 0) AS total_spent
             FROM transactions
             WHERE category LIKE $1 AND amount < 0`,
            [`%[event:${event_id}]%`]
        );
        const totalSpent = parseFloat(spendRes.rows[0].total_spent);
        const budget = event.total_budget ? parseFloat(event.total_budget) : null;
        const remaining = budget !== null ? budget - totalSpent : null;

        const lines = [
            `📅 Evento: ${event.name}`,
            event.description ? `📝 ${event.description}` : null,
            event.start_date ? `🗓️  ${event.start_date} → ${event.end_date ?? "…"}` : null,
            `⚡ Activo: ${event.is_active ? "Sí" : "No"}`,
            budget !== null ? `💰 Presupuesto: $${budget.toLocaleString("es-CO")}` : null,
            `💸 Gastado: $${totalSpent.toLocaleString("es-CO")}`,
            remaining !== null ? `📊 Disponible: $${remaining.toLocaleString("es-CO")}` : null,
        ].filter(Boolean);

        return { content: [{ type: "text", text: lines.join("\n") }] };
    }
};