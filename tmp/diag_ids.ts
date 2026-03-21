import { pool } from '../src/config/database.js';

async function test() {
    try {
        const res = await pool.query("SELECT id, lender, total_amount, remaining_amount FROM debts");
        console.table(res.rows);
        
        const res2 = await pool.query("SELECT * FROM transactions ORDER BY id DESC LIMIT 5");
        console.log("\n--- RECENT TRANSACTIONS ---");
        console.table(res2.rows);
    } catch (e) {
        console.error("DB_ERROR:" + e.message);
    } finally {
        await pool.end();
    }
}

test();
