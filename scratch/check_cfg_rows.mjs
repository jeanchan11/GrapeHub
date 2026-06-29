import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const c = await pool.query(`SELECT COUNT(*)::int AS n FROM fin_dispatch_config`);
console.log('total de linhas de config:', c.rows[0].n);
const r = await pool.query(`SELECT id, dispatch_enabled, dispatch_time, dispatch_interval_seconds, last_batch_date, updated_at FROM fin_dispatch_config ORDER BY updated_at DESC`);
console.table(r.rows);
// qual linha o scheduler pega (LIMIT 1 sem order)
const lim = await pool.query(`SELECT id, dispatch_time FROM fin_dispatch_config LIMIT 1`);
console.log('LIMIT 1 (o que o scheduler lê):', lim.rows[0]);
await pool.end();
