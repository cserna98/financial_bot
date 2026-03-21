import { pool } from '../config/database.js';

export interface Event {
    id: number;
    name: string;
    description: string | null;
    total_budget: number | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    created_at: Date;
}

export const eventRepository = {
    async getAll() {
        const res = await pool.query('SELECT * FROM events ORDER BY id DESC');
        return res.rows as Event[];
    },

    async getById(id: number) {
        const res = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
        return res.rows[0] as Event | undefined;
    },

    async findByName(name: string) {
        const res = await pool.query('SELECT * FROM events WHERE name ILIKE $1 LIMIT 1', [`%${name.trim()}%`]);
        return res.rows[0] as Event | undefined;
    },

    async create(event: Partial<Event>) {
        const { name, description, total_budget, start_date, end_date } = event;
        const res = await pool.query(
            `INSERT INTO events (name, description, total_budget, start_date, end_date, is_active)
             VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
            [name, description ?? null, total_budget ?? null, start_date ?? null, end_date ?? null]
        );
        return res.rows[0] as Event;
    },

    async update(id: number, updates: Partial<Event>) {
        const fields = Object.keys(updates).filter(k => k !== 'id');
        if (fields.length === 0) return this.getById(id);
        
        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        const values = fields.map(f => (updates as any)[f]);

        const res = await pool.query(
            `UPDATE events SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...values]
        );
        return res.rows[0] as Event;
    },

    async delete(id: number) {
        await pool.query('DELETE FROM events WHERE id = $1', [id]);
    }
};
