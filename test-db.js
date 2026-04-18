const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool();
pool.query('SELECT user_id, whatsapp_webhook_url, form_webhook_url FROM crm_webhook_settings').then(res => {
  console.log(res.rows);
  process.exit();
}).catch(console.error);
