import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query(`
      SELECT account_name, status, COUNT(*), MIN(due_date), MAX(due_date)
      FROM fin_payables
      GROUP BY account_name, status
    `);
    console.log('fin_payables breakdown:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
