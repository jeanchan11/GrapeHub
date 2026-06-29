import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query(`
  SELECT customer_name, customer_phone, channel, status,
         (message_rendered IS NOT NULL) AS tem_msg,
         LEFT(COALESCE(message_rendered,''), 40) AS msg_preview,
         sent_at
  FROM fin_dispatch_queue
  WHERE status = 'ENVIADO'
  ORDER BY sent_at DESC NULLS LAST
  LIMIT 5
`);
console.table(r.rows);
const c = await pool.query(`SELECT status, COUNT(*)::int FROM fin_dispatch_queue GROUP BY status ORDER BY 2 DESC`);
console.log('contagem por status:', c.rows);
await pool.end();
