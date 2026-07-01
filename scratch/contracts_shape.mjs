import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
const r = await pool.query(`SELECT contracts FROM clients WHERE octet_length(contracts) = (SELECT MAX(octet_length(contracts)) FROM clients) LIMIT 1`);
let arr; try { arr = JSON.parse(r.rows[0].contracts); } catch(e){ console.log('nao e JSON:', String(r.rows[0].contracts).slice(0,200)); process.exit(0); }
console.log('contracts é array?', Array.isArray(arr), 'len:', arr.length);
if (arr.length) {
  const c0 = arr[0];
  console.log('chaves de cada contrato:', Object.keys(c0));
  for (const k of Object.keys(c0)) {
    const v = c0[k];
    const size = typeof v === 'string' ? v.length : JSON.stringify(v||'').length;
    console.log(`  ${k}: ${typeof v}, ~${size} chars ${size>500?'<== GRANDE':''}`, typeof v==='string'&&size<80?`= "${v}"`:'');
  }
}
await pool.end();
