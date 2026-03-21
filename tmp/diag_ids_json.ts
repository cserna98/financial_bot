import { pool } from '../src/config/database.js';

async function test() {
    try {
        const res = await pool.query("SELECT id, lender, total_amount, remaining_amount FROM debts");
        console.log("DEBTS_JSON:" + JSON.stringify(res.rows, null, 2));
        
        const res2 = await pool.query("SELECT id, amount, description, account_id FROM transactions ORDER BY id DESC LIMIT 5");
        console.log("TRANSACTIONS_JSON:" + JSON.stringify(res2.rows, null, 2));
    } catch (e) {
        console.error("DB_ERROR:" + e.message);
    } finally {
        await pool.end();
    }
}

test();
