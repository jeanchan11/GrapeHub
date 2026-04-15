import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    const leads = await pool.query('SELECT id, coluna FROM crm_comercial_leads');
    console.log('Leads:', leads.rows);
    const cols = await pool.query('SELECT id, title FROM crm_comercial_columns');
    console.log('Cols:', cols.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
