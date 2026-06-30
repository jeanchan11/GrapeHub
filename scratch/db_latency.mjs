import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
for (let i=0;i<3;i++){
  const t=Date.now();
  try { await pool.query('SELECT 1'); console.log(`SELECT 1  -> ${Date.now()-t}ms`); }
  catch(e){ console.log(`SELECT 1  -> ERRO ${Date.now()-t}ms: ${e.message}`); }
}
const t2=Date.now(); try{ const r=await pool.query('SELECT COUNT(*) FROM projects'); console.log(`COUNT projects (${r.rows[0].count}) -> ${Date.now()-t2}ms`);}catch(e){console.log('projects ERRO:',e.message);}
await pool.end();
