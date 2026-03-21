import { pool } from '../src/config/database.js';

async function cleanup() {
    try {
        console.log("--- START CLEANUP ---");
        
        // 1. Delete erroneous transactions
        const delRes = await pool.query("DELETE FROM transactions WHERE id IN (9, 11)");
        console.log(`Deleted ${delRes.rowCount} transactions (IDs 9, 11).`);

        // 2. Correct Mastercard balance (ID 5)
        const updateRes = await pool.query(
            "UPDATE debts SET total_amount = 11814761, remaining_amount = 11814761 WHERE id = 5"
        );
        console.log(`Updated Mastercard debt (ID 5). Rows affected: ${updateRes.rowCount}`);

        // 3. Ensure Crediágil balance (ID 2) is correct
        const updateRes2 = await pool.query(
            "UPDATE debts SET remaining_amount = 7295413, paid_installments = 0 WHERE id = 2"
        );
        console.log(`Restored Crediágil debt (ID 2). Rows affected: ${updateRes2.rowCount}`);

        console.log("--- CLEANUP SUCCESSFUL ---");
    } catch (e) {
        console.error("CLEANUP_ERROR:" + e.message);
    } finally {
        await pool.end();
    }
}

cleanup();
