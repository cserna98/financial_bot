import { pool } from '../src/config/database.js';

async function test() {
    try {
        const res = await pool.query("SELECT id, lender, total_amount, created_at FROM debts ORDER BY id ASC");
        console.log("ALL_DEBTS_JSON:" + JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error("DB_ERROR:" + e.message);
    } finally {
        await pool.end();
    }
}

test();
