import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
const r = await pool.query(`SELECT id, name, contracts FROM clients WHERE contracts IS NOT NULL AND contracts <> '' AND contracts <> '[]'`);
let comUrl=0, semUrl=0; const corrompidos=[];
for (const row of r.rows) {
  let arr; try { arr = JSON.parse(row.contracts); } catch { continue; }
  if (!Array.isArray(arr)) continue;
  for (const c of arr) {
    if (c && typeof c==='object' && 'name' in c) {
      if (c.url && String(c.url).length > 100) comUrl++;
      else { semUrl++; corrompidos.push(`${row.name}: "${c.name}"`); }
    }
  }
}
console.log(`Contratos COM arquivo (url): ${comUrl}`);
console.log(`Contratos SEM arquivo (só nome — possível perda): ${semUrl}`);
if (corrompidos.length) { console.log('--- sem url ---'); corrompidos.slice(0,20).forEach(x=>console.log('  '+x)); }
await pool.end();
