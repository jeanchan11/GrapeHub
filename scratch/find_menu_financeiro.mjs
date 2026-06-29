import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query(`
  SELECT id, label, icon, icon_color, section_id, subsession_id
  FROM menu_pages
  WHERE LOWER(label) LIKE '%financeiro%' OR LOWER(label) LIKE '%dashboard%' OR id IN ('financeiro','dashboard-financeiro','crm-financeiro')
  ORDER BY label
`);
console.table(r.rows);
await pool.end();
