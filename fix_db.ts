import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    console.log("Removing duplicates...");
    await pool.query(`
      DELETE FROM crm_pessoas 
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER(PARTITION BY user_id, COALESCE(telefone, '') ORDER BY updated_at DESC) as rnum
          FROM crm_pessoas
        ) t 
        WHERE t.rnum > 1
      )
    `);
    
    try {
      await pool.query(`ALTER TABLE crm_pessoas DROP CONSTRAINT IF EXISTS crm_pessoas_unique_phone`);
    } catch(e) {}
    
    console.log("Adding unique constraint...");
    await pool.query(`ALTER TABLE crm_pessoas ADD CONSTRAINT crm_pessoas_unique_phone UNIQUE (user_id, telefone)`);
    console.log("SUCCESS!");
  } catch(e: any) {
    console.error("FAIL:", e.message);
  } finally {
    pool.end();
  }
})();
