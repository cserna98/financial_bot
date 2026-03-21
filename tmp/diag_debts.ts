import { pool } from '../src/config/database.js';

async function test() {
    try {
        const res = await pool.query("SELECT * FROM debts");
        console.table(res.rows);
    } catch (e) {
        console.error("DB_ERROR:" + e.message);
    } finally {
        await pool.end();
    }
}

test();
