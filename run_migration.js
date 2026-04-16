const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'admin',
  password: 'grapehubpassword', // Check server.ts for pass if this fails
  database: 'grapehub_db'
});
async function run() {
  try {
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS instagram TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS nicho TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS tempo_oab TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS faturamento TEXT`);
    console.log("Migration successful");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
