import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query("SELECT * FROM menu_pages WHERE id = 'crm-financeiro'");
    console.log('CRM Financeiro Page:', res.rows);
    
    const subs = await pool.query('SELECT * FROM menu_subsessions');
    console.log('Subsessions:', subs.rows);
    
    const subsubs = await pool.query('SELECT * FROM menu_subsubsessions');
    console.log('Subsubsessions:', subsubs.rows);
    
    const users = await pool.query('SELECT email, allowed_pages FROM users');
    console.log('Users:', users.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
