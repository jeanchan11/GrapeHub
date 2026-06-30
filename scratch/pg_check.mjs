import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
const r = await pool.query(`SELECT count(*) FILTER (WHERE wait_event='relation') AS lock_relation,
  count(*) FILTER (WHERE wait_event='ClientWrite') AS client_write,
  count(*) AS total FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()`);
console.log('sessões:', r.rows[0]);
const b = await pool.query(`SELECT count(*) AS ungranted FROM pg_locks WHERE NOT granted`);
console.log('locks NÃO concedidos:', b.rows[0].ungranted);
await pool.end();
