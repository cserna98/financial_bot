import { pool } from './src/config/database.js';

async function main() {
  const transRes = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'transactions' ORDER BY ordinal_position`
  );
  console.log("=== TRANSACTIONS TABLE ===");
  console.log(JSON.stringify(transRes.rows, null, 2));

  await pool.end();
}

main();
