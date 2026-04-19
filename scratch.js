const { Pool } = require('pg');
const pool = new Pool();
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'crm_comercial_leads'").then(res => {
  console.log(res.rows.map(r => r.column_name).join(', '));
  process.exit(0);
}).catch(console.error);
