import pg from 'pg'; import dotenv from 'dotenv'; import fs from 'fs'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
await pool.query(`CREATE TABLE IF NOT EXISTS fin_dfc_historico (
  ref_month   TEXT NOT NULL,
  structure   TEXT NOT NULL,
  description TEXT,
  value       NUMERIC(14,2) DEFAULT 0,
  sort_order  INT,
  PRIMARY KEY (ref_month, structure)
)`);
const rows = JSON.parse(fs.readFileSync('/tmp/dfc_historico.json','utf-8'));
let n=0;
for (const r of rows) {
  await pool.query(`INSERT INTO fin_dfc_historico (ref_month, structure, description, value, sort_order)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (ref_month, structure) DO UPDATE SET value=EXCLUDED.value, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order`,
    [r.ref_month, r.structure, r.description, r.value, r.sort]);
  n++;
}
console.log('importados:', n);
const chk = await pool.query(`SELECT ref_month, value FROM fin_dfc_historico WHERE structure='01' ORDER BY ref_month`);
console.log('Receitas (01) por mês:'); console.table(chk.rows);
await pool.end();
