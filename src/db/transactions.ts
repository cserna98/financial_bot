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

            const res = await client.query(
                'INSERT INTO transactions (account_id, amount, description, category) VALUES ($1, $2, $3, $4) RETURNING *',
                [accountId, amount, description, category]
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

            // Insertar la transacción
            const transRes = await client.query(
                'INSERT INTO transactions (account_id, amount, description, category) VALUES ($1, $2, $3, $4) RETURNING id',
                [accountId, -amount, description, 'pago_deuda']
            );

            // Actualizar la deuda vinculada a debtId
            await client.query(
                `UPDATE debts SET remaining_amount = remaining_amount - $1, 
                paid_installments = paid_installments + 1 
                WHERE id = $2`,
                [amount, debtId]
            );

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
        const fields = Object.keys(updates).filter(k => k !== 'id');
        if (fields.length === 0) {
            const res = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
            return res.rows[0];
        }

        const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
        const values = fields.map(f => (updates as any)[f]);

        const res = await pool.query(
            `UPDATE transactions SET ${setClause} WHERE id = $1 RETURNING *`,
            [id, ...values]
        );
        return res.rows[0];
    },

    // 6. Eliminar transacción
    async delete(id: number) {
        await pool.query('DELETE FROM transactions WHERE id = $1', [id]);
    }
};