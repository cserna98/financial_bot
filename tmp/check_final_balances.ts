import { pool } from '../src/config/database.js';

async function test() {
    try {
        const res = await pool.query("SELECT id, name, balance FROM accounts");
        console.log("ACCOUNTS_JSON:" + JSON.stringify(res.rows));
        
        const res2 = await pool.query("SELECT id, lender, account_id FROM debts");
        console.log("DEBTS_LINK_JSON:" + JSON.stringify(res2.rows));
    } catch (e) {
        console.error("DB_ERROR:" + e.message);
    } finally {
        await pool.end();
    }
}

test();
