import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
const r = await pool.query(`
  SELECT pid, state, wait_event_type, wait_event,
         now()-query_start AS dur, left(query,90) AS query
  FROM pg_stat_activity
  WHERE datname = current_database() AND pid <> pg_backend_pid()
  ORDER BY query_start NULLS LAST`);
console.log('=== sessões ativas no banco ===');
console.table(r.rows.map(x=>({pid:x.pid,state:x.state,wait:x.wait_event_type?`${x.wait_event_type}:${x.wait_event}`:'-',dur:String(x.dur).split('.')[0],q:x.query})));
// locks bloqueados
const b = await pool.query(`SELECT count(*) FROM pg_locks WHERE NOT granted`);
console.log('locks NÃO concedidos:', b.rows[0].count);
await pool.end();
