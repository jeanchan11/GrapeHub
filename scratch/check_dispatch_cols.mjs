import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'fin_dispatch_queue'
  AND column_name IN ('customer_phone','message_rendered','error_message','sent_at','rule_triggered','channel','customer_name','updated_at')
  ORDER BY column_name
`);
console.log(r.rows.map(x => x.column_name));
await pool.end();
