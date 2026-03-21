import { pool } from '../src/config/database.js';

async function restore() {
    try {
        console.log("--- RESTORING DEBTS ---");
        
        // 1. Manuela
        await pool.query(
            "INSERT INTO debts (lender, type, total_amount, remaining_amount, interest_rate, total_installments, next_payment_date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            ['Manuela', 'personal_loan', 1000000, 1000000, 0, 1, '2026-03-17']
        );

        // 2. Crediágil Bancolombia
        await pool.query(
            "INSERT INTO debts (account_id, lender, type, total_amount, remaining_amount, interest_rate, total_installments, next_payment_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [1, 'Crediágil Bancolombia', 'credit_card', 7295413, 7295413, 0, 36, '2026-03-19']
        );

        // 3. Amex *2104
        await pool.query(
            "INSERT INTO debts (lender, type, total_amount, remaining_amount, interest_rate, total_installments, next_payment_date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            ['Amex *2104', 'personal_loan', 3947596, 3947596, 0, 1, '2026-03-19']
        );

        // 4. Tarjeta Visa 6453
        await pool.query(
            "INSERT INTO debts (lender, type, total_amount, remaining_amount, interest_rate, total_installments, next_payment_date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            ['Tarjeta Visa 6453', 'personal_loan', 4704744, 4704744, 0, 1, '2026-03-19']
        );

        // 5. Tarjeta Mastercard 6812
        await pool.query(
            "INSERT INTO debts (lender, type, total_amount, remaining_amount, interest_rate, total_installments, next_payment_date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            ['Tarjeta Mastercard 6812', 'personal_loan', 11814761, 11814761, 0, 1, '2026-03-19']
        );

        console.log("--- RESTORATION SUCCESSFUL ---");
    } catch (e) {
        console.error("RESTORE_ERROR:" + e.message);
    } finally {
        await pool.end();
    }
}

restore();
