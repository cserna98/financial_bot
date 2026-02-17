import { pool } from '../config/database.js';

export interface Debt {
  id: number;
  lender: string;
  type: string;
  total_amount: number;
  remaining_amount: number;
  interest_rate: number;
  total_installments: number;
  paid_installments: number;
  next_payment_date: Date | null;
}

export const debtRepository = {
  // Obtener todas las deudas activas
  async getAll() {
    const res = await pool.query('SELECT * FROM debts ORDER BY next_payment_date ASC');
    return res.rows as Debt[];
  },

  // Crear una nueva deuda (Préstamo, Tarjeta, etc.)
  async create(debt: Omit<Debt, 'id' | 'paid_installments'>) {
    const res = await pool.query(
      `INSERT INTO debts 
       (lender, type, total_amount, remaining_amount, interest_rate, total_installments, next_payment_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [debt.lender, debt.type, debt.total_amount, debt.remaining_amount, debt.interest_rate, debt.total_installments, debt.next_payment_date]
    );
    return res.rows[0] as Debt;
  },

  // Obtener una deuda específica por ID
  async getById(id: number) {
    const res = await pool.query('SELECT * FROM debts WHERE id = $1', [id]);
    return res.rows[0] as Debt | undefined;
  }
};