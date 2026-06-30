import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });

// Alvos: migrations de boot presas (CREATE TABLE) + backends presos enviando p/ cliente morto (>20s).
// Todos os servidores locais foram encerrados, então essas sessões são órfãs.
const alvos = await pool.query(`
  SELECT pid, state, wait_event, (now()-query_start)::text AS dur, left(query, 55) AS q
  FROM pg_stat_activity
  WHERE datname = current_database() AND pid <> pg_backend_pid()
    AND (
      query LIKE '%CREATE TABLE IF NOT EXISTS projects%'
      OR (wait_event = 'ClientWrite' AND state = 'active' AND now() - query_start > interval '20 seconds')
    )`);

console.log('Sessoes orfas a encerrar:', alvos.rows.length);
for (const r of alvos.rows) {
  const k = await pool.query('SELECT pg_terminate_backend($1) AS ok', [r.pid]);
  console.log(`  pid ${r.pid} [${r.state}/${r.wait_event}] dur=${r.dur.split('.')[0]} -> terminate=${k.rows[0].ok}`);
}

const left = await pool.query(`SELECT count(*) AS ungranted FROM pg_locks WHERE NOT granted`);
console.log('locks NAO concedidos agora:', left.rows[0].ungranted);
await pool.end();
