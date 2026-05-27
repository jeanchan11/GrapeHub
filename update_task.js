import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@localhost:5432/grapehub' });

async function run() {
  await pool.query(`
    UPDATE onboarding_tasks 
    SET nome_fantasia = client_name 
    WHERE nome_fantasia IS NULL OR nome_fantasia = ''
  `);
  console.log("Updated!");
  process.exit(0);
}
run();
