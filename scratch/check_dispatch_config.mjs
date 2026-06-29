import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query(`SELECT dispatch_enabled, dispatch_time, interval_seconds, last_batch_date, updated_at, (n8n_webhook_url IS NOT NULL) AS tem_webhook FROM fin_dispatch_config LIMIT 1`);
console.log(JSON.stringify(r.rows[0], null, 2));
// horário do primeiro e último disparo de hoje (BRT)
const d = await pool.query(`
  SELECT MIN(sent_at) AS primeiro, MAX(sent_at) AS ultimo, COUNT(*)::int AS qtd
  FROM fin_dispatch_queue
  WHERE status='ENVIADO' AND sent_at::date = '2026-06-28'
`);
console.log('disparos de hoje (UTC):', d.rows[0]);
await pool.end();
