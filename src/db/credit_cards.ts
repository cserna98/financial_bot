import { pool } from '../config/database.js';

export interface CreditCardPurchase {
  id?: number;
  debt_id: number;
  description: string;
  total_amount: number;
  remaining_amount: number;
  interest_rate: number;
  total_installments: number;
  paid_installments: number;
  purchase_date?: Date;
  next_installment_date?: Date;
}

export const creditCardRepository = {
  async createPurchase(purchase: Omit<CreditCardPurchase, 'id' | 'paid_installments'>) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert the purchase
      const res = await client.query(
        `INSERT INTO credit_card_purchases (
          debt_id, description, total_amount, remaining_amount, 
          interest_rate, total_installments, paid_installments
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          purchase.debt_id, purchase.description, purchase.total_amount, 
          purchase.remaining_amount, purchase.interest_rate, 
          purchase.total_installments, 0
        ]
      );

      // 2. Update the parent debt total/remaining
      await client.query(
        `UPDATE debts SET 
         remaining_amount = remaining_amount + $1 
         WHERE id = $2`,
        [purchase.total_amount, purchase.debt_id]
      );

      await client.query('COMMIT');
      return res.rows[0] as CreditCardPurchase;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async getPurchasesByDebtId(debtId: number) {
    const res = await pool.query(
      'SELECT * FROM credit_card_purchases WHERE debt_id = $1 ORDER BY purchase_date ASC',
      [debtId]
    );
    return res.rows as CreditCardPurchase[];
  },

  async applyPaymentToPurchases(debtId: number, paymentAmount: number) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get pending purchases for this card, oldest first (FIFO)
      const purchasesRes = await client.query(
        `SELECT * FROM credit_card_purchases 
         WHERE debt_id = $1 AND remaining_amount > 0 
         ORDER BY purchase_date ASC`,
        [debtId]
      );

      const purchases = purchasesRes.rows as CreditCardPurchase[];
      let remainingPayment = paymentAmount;

      for (const purchase of purchases) {
        if (remainingPayment <= 0) break;

        const amountToPay = Math.min(remainingPayment, Number(purchase.remaining_amount));
        
        // Update individual purchase
        await client.query(
          `UPDATE credit_card_purchases 
           SET remaining_amount = remaining_amount - $1,
               paid_installments = CASE 
                 WHEN remaining_amount - $1 <= 0 THEN total_installments 
                 ELSE paid_installments + 1 END
           WHERE id = $2`,
          [amountToPay, purchase.id]
        );

        remainingPayment -= amountToPay;
      }

      // Update parent debt as well
      await client.query(
        'UPDATE debts SET remaining_amount = remaining_amount - $1 WHERE id = $2',
        [paymentAmount, debtId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};
