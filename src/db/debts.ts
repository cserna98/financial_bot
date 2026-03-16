import { pool } from '../config/database.js';

export interface Debt {
  id: number;
  account_id?: number | null; // 👈 El enlace a la tarjeta de crédito
  lender: string;
  type: string;
  total_amount: number;
  remaining_amount: number;
  interest_rate: number;
  total_installments: number;
  paid_installments: number;
  next_payment_date: Date;
  event_id?: number | null; // 👈 Enlace al evento
}

export const debtRepository = {
  async getAll() {
    const res = await pool.query('SELECT * FROM debts ORDER BY id ASC');
    return res.rows as Debt[];
  },

  async getById(id: number) {
    const res = await pool.query('SELECT * FROM debts WHERE id = $1', [id]);
    return res.rows[0] as Debt | undefined;
  },

  async findByLender(lender: string) {
    if (!lender) return undefined;
    const cleanLender = lender.trim();
    const query = `SELECT * FROM debts WHERE lender ILIKE $1 LIMIT 1`;
    const res = await pool.query(query, [`%${cleanLender}%`]);
    return res.rows[0] as Debt | undefined;
  },

  // Fíjate que arriba de este async create sí hay una coma al terminar findByLender
  async create(debt: Omit<Debt, 'id' | 'paid_installments'>) {
    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO debts (
                    account_id, lender, type, total_amount, remaining_amount, 
                    interest_rate, total_installments, next_payment_date, event_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          debt.account_id ?? null, debt.lender, debt.type, debt.total_amount, debt.remaining_amount,
          debt.interest_rate, debt.total_installments, debt.next_payment_date, debt.event_id ?? null
        ]
      );
      return res.rows[0] as Debt;
    } finally {
      client.release();
    }
  }
};