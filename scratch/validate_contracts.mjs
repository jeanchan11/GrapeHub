import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
// quantos contracts NÃO começam com '[' (não-array)
const nonArr = await pool.query(`SELECT count(*) FROM clients WHERE contracts IS NOT NULL AND contracts <> '' AND contracts !~ '^\\s*\\['`);
console.log("contracts não-array (≠ começam com '['):", nonArr.rows[0].count);
// stripping em SQL funciona + payload reduzido?
const t0=Date.now();
const r = await pool.query(`
  SELECT c.id,
    CASE WHEN c.contracts ~ '^\\s*\\[' THEN
      COALESCE((SELECT jsonb_agg(jsonb_build_object('name', elem->>'name')) FROM jsonb_array_elements(c.contracts::jsonb) elem), '[]'::jsonb)::text
    ELSE '[]' END AS contracts_light
  FROM clients c`);
const ms=Date.now()-t0;
const bytes = Buffer.byteLength(JSON.stringify(r.rows));
console.log(`stripping SQL -> ${ms}ms, payload ${(bytes/1024).toFixed(0)} KB (antes era ~40.000 KB)`);
console.log('exemplo:', r.rows.find(x=>x.contracts_light!=='[]')?.contracts_light?.slice(0,120) || '(nenhum com contrato)');
await pool.end();
