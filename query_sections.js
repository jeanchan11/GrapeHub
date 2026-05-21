const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const res = await pool.query("SELECT * FROM menu_sections");
  console.log(res.rows);
  const subs = await pool.query("SELECT * FROM menu_subsessions WHERE section_id = 'comercial'");
  console.log(subs.rows);
  pool.end();
}
run();
