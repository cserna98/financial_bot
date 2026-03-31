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

            // 1. Insertar la transacción
            const res = await client.query(
                'INSERT INTO transactions (account_id, amount, description, category) VALUES ($1, $2, $3, $4) RETURNING *',
                [accountId, amount, description, category]
            );

            // 2. Actualizar el saldo de la cuenta
            await client.query(
                'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
                [amount, accountId]
            );

            await client.query('COMMIT');
            return res.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // 2. Obtener movimientos recientes por cuenta
    async getRecentByAccount(accountId: number, limit: number = 10) {
        const res = await pool.query(
            'SELECT * FROM transactions WHERE account_id = $1 ORDER BY transaction_date DESC LIMIT $2',
            [accountId, limit]
        );
        return res.rows;
    },

    // 3. Registrar pago de deuda (afecta transacción y saldo)
    async payDebt(accountId: number, amount: number, debtId: number, description: string) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            console.log(`💳 [payDebt] accountId=${accountId}, amount=${amount}, debtId=${debtId}`);

            // Insertar la transacción
            const transRes = await client.query(
                'INSERT INTO transactions (account_id, amount, description, category) VALUES ($1, $2, $3, $4) RETURNING id',
                [accountId, -amount, description, 'pago_deuda']
            );

            // 2. Actualizar la deuda vinculada a debtId
            const updateRes = await client.query(
                `UPDATE debts SET remaining_amount = remaining_amount - $1, 
                paid_installments = paid_installments + 1 
                WHERE id = $2 RETURNING id, remaining_amount`,
                [amount, debtId]
            );

            // 3. Actualizar el saldo de la cuenta (RESTAR el pago)
            await client.query(
                'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
                [amount, accountId]
            );

            console.log(`💳 [payDebt] UPDATE result: rowCount=${updateRes.rowCount}, rows=${JSON.stringify(updateRes.rows)}`);

            await client.query('COMMIT');
            return transRes.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // 4. Obtener transacciones con filtros (Fecha, Cuenta)
    async getFiltered(options: { accountId?: number; startDate?: string; endDate?: string; limit?: number }) {
        const { accountId, startDate, endDate, limit = 20 } = options;

        let query = `
            SELECT t.*, a.name as account_name, a.alias as account_alias
            FROM transactions t
            JOIN accounts a ON t.account_id = a.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (accountId) {
            params.push(accountId);
            query += ` AND t.account_id = $${params.length}`;
        }

        // --- SOLUCIÓN V15 DEFINITIVA: Sincronización Bogota -> UTC ---
        // Los registros se guardan como Bogota local en un 'timestamp without time zone'.
        // Para que coincidan con el JSON del Bot (UTC), forzamos el shift Bogotá -> UTC.
        const TZ_SYNC = "(t.transaction_date AT TIME ZONE 'America/Bogota' AT TIME ZONE 'UTC')";

        if (startDate && endDate && startDate === endDate) {
            params.push(startDate);
            query += ` AND TO_CHAR(${TZ_SYNC}, 'YYYY-MM-DD') = $${params.length}`;
        } else {
            if (startDate) {
                params.push(startDate);
                query += ` AND TO_CHAR(${TZ_SYNC}, 'YYYY-MM-DD') >= $${params.length}`;
            }

            if (endDate) {
                params.push(endDate);
                query += ` AND TO_CHAR(${TZ_SYNC}, 'YYYY-MM-DD') <= $${params.length}`;
            }
        }

        query += ` ORDER BY t.transaction_date DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        console.error(`🔍 [V15-DEFINITIVE] SQL: ${query}`);
        console.error(`🔍 [V15-DEFINITIVE] Params: ${JSON.stringify(params)}`);

        try {
            const res = await pool.query(query, params);
            console.error(`✅ [V15-DEFINITIVE] Filas encontradas: ${res.rows.length}`);
            return res.rows;
        } catch (error: any) {
            console.error("❌ Error en getFiltered [V15]:", error);
            throw new Error(error.message);
        }
    },

    // 5. Actualizar transacción
    async update(id: number, updates: Partial<Transaction>) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Obtener los datos antiguos para calcular el ajuste de balance
            const oldRes = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
            if (oldRes.rows.length === 0) return null;
            const oldTx = oldRes.rows[0];

            // 2. Ejecutar el update
            const fields = Object.keys(updates).filter(k => k !== 'id');
            if (fields.length === 0) {
                await client.query('COMMIT');
                return oldTx;
            }

            const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
            const values = fields.map(f => (updates as any)[f]);

            const res = await client.query(
                `UPDATE transactions SET ${setClause} WHERE id = $1 RETURNING *`,
                [id, ...values]
            );
            const newTx = res.rows[0];

            // 3. Si el monto cambió, ajustar el balance de la cuenta
            if (updates.amount !== undefined && updates.amount !== oldTx.amount) {
                const diff = updates.amount - oldTx.amount;
                await client.query(
                    'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
                    [diff, oldTx.account_id]
                );
            }

            await client.query('COMMIT');
            return newTx;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    // 6. Eliminar transacción
    async delete(id: number) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const res = await client.query('SELECT * FROM transactions WHERE id = $1', [id]);
            if (res.rows.length > 0) {
                const tx = res.rows[0];
                // Revertir el balance: si era un gasto (-50), sumamos 50 (+50). balance = balance - (-50)
                await client.query(
                    'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
                    [tx.amount, tx.account_id]
                );
                await client.query('DELETE FROM transactions WHERE id = $1', [id]);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};