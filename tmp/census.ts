import { pool } from '../src/config/database.js';

async function test() {
    try {
        const tables = ['accounts', 'transactions', 'debts', 'events'];
        for (const table of tables) {
            const res = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`${table.toUpperCase()}_COUNT:${res.rows[0].count}`);
        }
    } catch (e) {
        console.error("DB_ERROR:" + e.message);
    } finally {
        await pool.end();
    }
}

test();
