import { pool } from '../src/config/database.js';

async function test() {
    try {
        const res = await pool.query("SELECT * FROM transactions WHERE amount = -3233000 OR amount = 3233000 OR description ILIKE '%Crediágil%' ORDER BY id DESC");
        console.log("PAYMENT_TRANSACTIONS:" + JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error("DB_ERROR:" + e.message);
    } finally {
        await pool.end();
    }
}

test();
