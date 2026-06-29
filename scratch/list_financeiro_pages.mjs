import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query(`
  SELECT id, label, icon, icon_color, order_index, section_id, subsession_id
  FROM menu_pages
  WHERE section_id = 'financeiro' OR id IN ('superadmin-dashboard')
  ORDER BY order_index NULLS LAST, label
`);
console.table(r.rows);
// also check if superadmin-dashboard already exists anywhere
const r2 = await pool.query(`SELECT id, label, section_id, subsession_id FROM menu_pages WHERE id='superadmin-dashboard'`);
console.log('superadmin-dashboard existe no menu?', r2.rows);
await pool.end();
