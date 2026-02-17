import { pool } from '../config/database.js';

export interface Transaction {
    id?: number;
    account_id: number;
    amount: number;
    description: string;
    category: string;
    transaction_date?: Date;
}

export const transactionRepository = {
    // 1. Crear transacción normal (Ingreso o Gasto)
    async create(accountId: number, amount: number, description: string, category: string) {
        // Log de depuración para ver qué datos llegan realmente
        console.log("📝 Intentando crear transacción:", { accountId, amount, description, category });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Verificamos que los datos no sean null/undefined antes de SQL
            if (!accountId) throw new Error("El accountId es inválido o indefinido");
            if (amount === undefined || amount === null) throw new Error("El monto es inválido");

            const res = await client.query(
                'INSERT INTO transactions (account_id, amount, description, category) VALUES ($1, $2, $3, $4) RETURNING *',
                [accountId, amount, description, category]
            );

            // Actualizamos saldo
            await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, accountId]);

            await client.query('COMMIT');
            console.log("✅ Transacción guardada en DB:", res.rows[0]);
            return res.rows[0] as Transaction;

        } catch (e: any) {
            await client.query('ROLLBACK');
            // ESTO ES CLAVE: Imprimir el error real en la terminal
            console.error("❌ ERROR CRÍTICO SQL (create):", JSON.stringify(e, null, 2));
            // Lanzamos un error con mensaje claro para que el bot lo lea
            throw new Error(e.message || "Error desconocido en base de datos");
        } finally {
            client.release();
        }
    },

    // 2. Obtener historial reciente
    async getRecentByAccount(accountId: number, limit = 5) {
        try {
            const res = await pool.query(
                'SELECT * FROM transactions WHERE account_id = $1 ORDER BY transaction_date DESC LIMIT $2',
                [accountId, limit]
            );
            return res.rows as Transaction[];
        } catch (error: any) {
            console.error("❌ Error obteniendo historial:", error);
            throw new Error(error.message);
        }
    },

    // 3. Pagar Deuda (Afecta cuenta y tabla de deudas)
    async payDebt(accountId: number, debtId: number, amount: number, description: string) {
        console.log("💸 Iniciando pago de deuda:", { accountId, debtId, amount });
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Resta de la cuenta
            await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, accountId]);

            // Resta de la deuda
            await client.query(
                'UPDATE debts SET remaining_amount = remaining_amount - $1, paid_installments = paid_installments + 1 WHERE id = $2',
                [amount, debtId]
            );

            // Registra en transacciones
            const res = await client.query(
                'INSERT INTO transactions (account_id, amount, description, category) VALUES ($1, $2, $3, $4) RETURNING *',
                [accountId, -amount, `PAGO DEUDA: ${description}`, 'debt_payment']
            );

            await client.query('COMMIT');
            return res.rows[0] as Transaction;
        } catch (e: any) {
            await client.query('ROLLBACK');
            console.error("❌ ERROR CRÍTICO SQL (payDebt):", e);
            throw new Error(e.message || "Error al procesar pago de deuda");
        } finally {
            client.release();
        }
    }
};