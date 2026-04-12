import { pool } from './src/config/database.js';

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("🚀 Iniciando migración: Tabla credit_card_purchases...");
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS credit_card_purchases (
                id SERIAL PRIMARY KEY,
                debt_id INTEGER REFERENCES debts(id) ON DELETE CASCADE,
                description TEXT NOT NULL,
                total_amount DECIMAL(15, 2) NOT NULL,
                remaining_amount DECIMAL(15, 2) NOT NULL,
                interest_rate DECIMAL(5, 2) DEFAULT 0,
                total_installments INTEGER DEFAULT 1,
                paid_installments INTEGER DEFAULT 0,
                purchase_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                next_installment_date DATE
            );
        `);
        
        console.log("✅ Tabla credit_card_purchases creada o ya existente.");

        // Aseguramos que la tabla debts tenga los campos necesarios or indices
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cc_purchases_debt_id ON credit_card_purchases(debt_id);
        `);

        console.log("✅ Índices creados.");

    } catch (err) {
        console.error("❌ Error en migración:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
