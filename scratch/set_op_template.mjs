import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query(`UPDATE menu_pages SET template='operacional-consolidado' WHERE id='dashboard-operacional' RETURNING id,label,template`);
console.table(r.rows);
await pool.end();
