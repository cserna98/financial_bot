import { pool } from '../config/database.js';

export interface Account {
  id: number;
  name: string;
  type: string;
  balance: number;
  alias: string | null;
  account_number: string | null;
}

export const accountRepository = {
  // 1. Obtener todas las cuentas
  async getAll() {
    const res = await pool.query('SELECT * FROM accounts ORDER BY id ASC');
    return res.rows as Account[];
  }, // <--- Coma agregada

  // 2. BUSCADOR: Encuentra por alias, nombre o número de cuenta
  async findByIdentifier(id: string) {
    const cleanId = id.trim();
    const query = `
      SELECT * FROM accounts 
      WHERE translate(alias, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') ILIKE translate($1, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')
         OR translate(name, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') ILIKE translate($1, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')
         OR translate(alias, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') ILIKE translate($2, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')
         OR translate(name, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') ILIKE translate($2, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')
         OR account_number = $3
      ORDER BY 
         CASE WHEN translate(alias, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') ILIKE translate($2, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') THEN 1
              WHEN translate(name, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') ILIKE translate($2, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') THEN 2
              WHEN translate(alias, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') ILIKE translate($1, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') THEN 3
              WHEN translate(name, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') ILIKE translate($1, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU') THEN 4
              ELSE 5 END
      LIMIT 1
    `;
    // $1 = Búsqueda parcial (%texto%)
    // $2 = Búsqueda exacta (texto)
    // $3 = Búsqueda exacta número
    const res = await pool.query(query, [`%${cleanId}%`, cleanId, cleanId]);
    return res.rows[0] as Account | undefined;
  }, // <--- Coma agregada

  // 3. Crear una cuenta nueva con validación de alias
  async create(name: string, type: string, balance: number, alias?: string, accountNumber?: string) {
    const client = await pool.connect();
    try {
      if (alias) {
        const existing = await this.findByIdentifier(alias);
        if (existing) {
          const isExact = existing.alias?.toLowerCase() === alias.toLowerCase() || 
                          existing.name.toLowerCase() === alias.toLowerCase();
          
          if (isExact) {
            throw new Error(`El alias '${alias}' ya está en uso exacto por la cuenta '${existing.name}'.`);
          } else {
            throw new Error(`El alias '${alias}' es muy similar al existente '${existing.alias ?? existing.name}'. Para evitar confusiones, te sugiero usar uno más diferente.`);
          }
        }
      }

      const res = await client.query(
        'INSERT INTO accounts (name, type, balance, alias, account_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, type, balance, alias, accountNumber]
      );
      return res.rows[0] as Account;
    } catch (error: any) {
      // Error 23505 = Clave duplicada en PostgreSQL
      if (error.code === '23505') {
        throw new Error(`Error: El alias '${alias}' ya existe en la base de datos.`);
      }
      throw error;
    } finally {
      client.release();
    }
  }, // <--- Coma agregada

  // 4. Actualizar el saldo
  async updateBalance(id: number, newBalance: number) {
    const res = await pool.query(
      'UPDATE accounts SET balance = $1 WHERE id = $2 RETURNING *',
      [newBalance, id]
    );
    return res.rows[0] as Account;
  },

  // 5. Actualizar cuenta completa
  async update(id: number, updates: Partial<Account>) {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) {
      const res = await pool.query('SELECT * FROM accounts WHERE id = $1', [id]);
      return res.rows[0] as Account;
    }
    
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map(f => (updates as any)[f]);

    const res = await pool.query(
      `UPDATE accounts SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return res.rows[0] as Account;
  },

  // 6. Eliminar cuenta
  async delete(id: number) {
    await pool.query('DELETE FROM accounts WHERE id = $1', [id]);
  }
};