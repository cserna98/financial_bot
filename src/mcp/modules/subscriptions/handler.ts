import { pool } from "../../../config/database.js";

type HandlerFn = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

// Crea la tabla si no existe aún (idempotente)
async function ensureTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
            id           SERIAL PRIMARY KEY,
            name         TEXT NOT NULL,
            amount       NUMERIC(12,2) NOT NULL,
            billing_day  INT NOT NULL,
            account_identifier TEXT,
            created_at   TIMESTAMPTZ DEFAULT NOW()
        )
    `);
}

export const subscriptionHandlers: Record<string, HandlerFn> = {

    async add_subscription(args) {
        await ensureTable();
        const { name, amount, billing_day, account_identifier } = args as {
            name: string;
            amount: number;
            billing_day: number;
            account_identifier?: string;
        };

        if (billing_day < 1 || billing_day > 31) {
            throw new Error("El día de cobro debe estar entre 1 y 31.");
        }

        const res = await pool.query(
            `INSERT INTO subscriptions (name, amount, billing_day, account_identifier)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [name, amount, billing_day, account_identifier ?? null]
        );
        const sub = res.rows[0];
        return {
            content: [{
                type: "text",
                text: `✅ Suscripción '${sub.name}' registrada: $${Number(amount).toLocaleString("es-CO")}/mes — se cobra el día ${billing_day}.`
            }]
        };
    },

    async list_subscriptions(_args) {
        await ensureTable();
        const res = await pool.query(`SELECT * FROM subscriptions ORDER BY billing_day ASC`);
        if (!res.rows.length) {
            return { content: [{ type: "text", text: "📋 No tienes suscripciones registradas aún." }] };
        }
        const total = res.rows.reduce((sum: number, s: { amount: string }) => sum + parseFloat(s.amount), 0);
        return {
            content: [{
                type: "text",
                text: `📋 Suscripciones (${res.rows.length}):\n${JSON.stringify(res.rows, null, 2)}\n\n💰 Total mensual: $${total.toLocaleString("es-CO")}`
            }]
        };
    },

    async check_upcoming_bills(args) {
        await ensureTable();
        const { days_ahead = 7 } = args as { days_ahead?: number };

        const today = new Date();
        const currentDay = today.getDate();
        const endDay = currentDay + (days_ahead as number);

        const res = await pool.query(`SELECT * FROM subscriptions ORDER BY billing_day ASC`);
        const upcoming = res.rows.filter((s: { billing_day: number }) =>
            s.billing_day >= currentDay && s.billing_day <= endDay
        );

        if (!upcoming.length) {
            return {
                content: [{ type: "text", text: `✅ No tienes cobros en los próximos ${days_ahead} días.` }]
            };
        }

        const total = upcoming.reduce((sum: number, s: { amount: string }) => sum + parseFloat(s.amount), 0);
        return {
            content: [{
                type: "text",
                text: `⚠️ Cobros en los próximos ${days_ahead} días:\n${JSON.stringify(upcoming, null, 2)}\n\n💸 Total próximo: $${total.toLocaleString("es-CO")}`
            }]
        };
    }
};
