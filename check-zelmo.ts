import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  const res = await pool.query("SELECT id, name, status, crm_status FROM clients WHERE name ILIKE '%Zelmo%'");
  console.log(res.rows);
  process.exit(0);
}

check();
