const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool();
async function run() {
  const res = await pool.query("SELECT * FROM menu_subsessions WHERE section_id = 'comercial'");
  console.log('Subsessions in comercial:', res.rows);
  const res2 = await pool.query("SELECT * FROM menu_pages WHERE subsession_id = 'contatos'");
  console.log('Pages in contatos:', res2.rows);
  process.exit(0);
}
run();
