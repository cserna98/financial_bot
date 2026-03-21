import { pool } from '../config/database.js';

export interface Subscription {
    id: number;
    name: string;
    amount: number;
    billing_day: number;
    account_identifier: string | null;
    created_at: Date;
}

export const subscriptionRepository = {
    async ensureTable() {
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
    },

    async getAll() {
        await this.ensureTable();
        const res = await pool.query('SELECT * FROM subscriptions ORDER BY billing_day ASC');
        return res.rows as Subscription[];
    },

    async getById(id: number) {
        await this.ensureTable();
        const res = await pool.query('SELECT * FROM subscriptions WHERE id = $1', [id]);
        return res.rows[0] as Subscription | undefined;
    },

    async findByName(name: string) {
        await this.ensureTable();
        const res = await pool.query('SELECT * FROM subscriptions WHERE name ILIKE $1 LIMIT 1', [`%${name.trim()}%`]);
        return res.rows[0] as Subscription | undefined;
    },

    async create(subscription: Partial<Subscription>) {
        await this.ensureTable();
        const { name, amount, billing_day, account_identifier } = subscription;
        const res = await pool.query(
            `INSERT INTO subscriptions (name, amount, billing_day, account_identifier)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [name, amount, billing_day, account_identifier ?? null]
        );
        return res.rows[0] as Subscription;
    },

    async update(id: number, updates: Partial<Subscription>) {
        await this.ensureTable();
        const fields = Object.keys(updates).filter(k => k !== 'id');
        if (fields.length === 0) return this.getById(id);

        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        const values = fields.map(f => (updates as any)[f]);

        const res = await pool.query(
            `UPDATE subscriptions SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...values]
        );
        return res.rows[0] as Subscription;
    },

    async delete(id: number) {
        await this.ensureTable();
        await pool.query('DELETE FROM subscriptions WHERE id = $1', [id]);
    }
};
