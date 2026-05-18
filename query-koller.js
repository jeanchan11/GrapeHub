import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT 
        r.customer_name, r.status, r.due_date, r.value,
        fp.name as person_name
      FROM fin_receivables r
      LEFT JOIN fin_people fp ON fp.asaas_id = r.customer_id
      WHERE r.due_date = '2026-05-01'
        AND r.value = 1200
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
