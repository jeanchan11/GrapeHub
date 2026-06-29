import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query(`
  SELECT customer_name, rule_triggered, day_offset
  FROM fin_dispatch_queue
  WHERE status='ENVIADO'
  ORDER BY sent_at DESC LIMIT 5
`);
console.table(r.rows);
await pool.end();
