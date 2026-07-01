import pg from 'pg'; import dotenv from 'dotenv'; import fs from 'fs'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
const rows = JSON.parse(fs.readFileSync('/tmp/dfc_2025.json','utf-8'));
let n=0;
for (const r of rows) {
  await pool.query(`INSERT INTO fin_dfc_historico (ref_month, structure, description, value, sort_order)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (ref_month, structure) DO UPDATE SET value=EXCLUDED.value, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order`,
    [r.ref_month, r.structure, r.description, r.value, r.sort]);
  n++;
}
// abertura real de Jan/2025 (pra Dez/2025 fechar = abertura de 2026)
await pool.query(`UPDATE fin_dfc_historico SET value=18803.60 WHERE ref_month='2025-01' AND structure='_saldo_inicial'`);
console.log('importados 2025:', n);
// validação: carry-forward
const g=await pool.query(`SELECT ref_month, value FROM fin_dfc_historico WHERE structure='_geracao' AND ref_month LIKE '2025%' ORDER BY ref_month`);
let s=18803.60; for(const r of g.rows) s+=parseFloat(r.value);
console.log('Dez/2025 saldo final (carry-forward):', s.toFixed(2), '  [esperado 70268.58 = abertura 2026]');
await pool.end();
