import { pool } from '../src/config/database.js';

async function finalCleanup() {
    try {
        console.log("--- STARTING FINAL CLEANUP ---");
        
        // 1. Delete noise transactions
        const delRes = await pool.query("DELETE FROM transactions WHERE id IN (10, 12, 13, 14, 15)");
        console.log(`Deleted ${delRes.rowCount} transactions (IDs 10, 12, 13, 14, 15).`);

        // 2. Unlink debts from account_id 1 (Nómina)
        const unlinkRes = await pool.query(
            "UPDATE debts SET account_id = NULL WHERE id IN (2, 3, 4, 5)"
        );
        console.log(`Unlinked ${unlinkRes.rowCount} debts from Nómina account.`);

        console.log("--- FINAL CLEANUP SUCCESSFUL ---");
    } catch (e) {
        console.error("CLEANUP_ERROR:" + e.message);
    } finally {
        await pool.end();
    }
}

finalCleanup();
