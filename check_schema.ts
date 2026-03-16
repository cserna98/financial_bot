import { pool } from './src/config/database.js';

async function main() {
  const debtsRes = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'debts' ORDER BY ordinal_position`
  );
  console.log("=== DEBTS TABLE ===");
  console.log(JSON.stringify(debtsRes.rows, null, 2));

  await pool.end();
}

main();
