const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    const res = await pool.query(`
      SELECT user_id, telefone, COUNT(*) 
      FROM crm_pessoas 
      GROUP BY user_id, telefone 
      HAVING COUNT(*) > 1
    `);
    console.log("Duplicates:", res.rows);
    
    const alterRes = await pool.query(`ALTER TABLE crm_pessoas ADD CONSTRAINT crm_pessoas_unique_phone UNIQUE (user_id, telefone)`);
    console.log("Alter successful!");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    pool.end();
  }
})();
