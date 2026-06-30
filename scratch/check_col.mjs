import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
const r = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='crm_comercial_leads' AND column_name IN ('lead_score','prob_fechamento') ORDER BY column_name`);
console.log('colunas encontradas:', r.rows.map(x=>x.column_name).join(', ') || '(nenhuma)');
await pool.end();
