import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query(`
  SELECT
    (sent_at AT TIME ZONE 'America/Sao_Paulo')::date AS dia_brt,
    MIN(sent_at AT TIME ZONE 'America/Sao_Paulo')::time AS primeiro_brt,
    MAX(sent_at AT TIME ZONE 'America/Sao_Paulo')::time AS ultimo_brt,
    COUNT(*)::int AS qtd
  FROM fin_dispatch_queue
  WHERE status='ENVIADO' AND sent_at IS NOT NULL
  GROUP BY 1
  ORDER BY 1 DESC
  LIMIT 12
`);
console.table(r.rows);
await pool.end();
