import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query(`SELECT id, label, icon, template, subsession_id, section_id FROM menu_pages WHERE id ILIKE '%operacional%' OR label ILIKE '%operacional%'`);
console.table(r.rows);
await pool.end();
