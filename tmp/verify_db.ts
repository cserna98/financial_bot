import { pool } from '../src/config/database.js';

async function test() {
    try {
        const res = await pool.query("SELECT COUNT(*) as count FROM accounts");
        console.log("ACCOUNTS_COUNT:" + res.rows[0].count);
        
        const res2 = await pool.query("SELECT COUNT(*) as count FROM debts");
        console.log("DEBTS_COUNT:" + res2.rows[0].count);
        
        const res3 = await pool.query("SELECT id, lender, total_amount FROM debts");
        console.log("DEBTS_SAMPLE:" + JSON.stringify(res3.rows));
    } catch (e) {
        console.error("DB_ERROR:" + e.message);
    } finally {
        await pool.end();
    }
}

test();
