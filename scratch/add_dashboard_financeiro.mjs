import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// 1) Abre espaço: desloca as páginas existentes da seção financeiro +1
await pool.query(`UPDATE menu_pages SET order_index = order_index + 1 WHERE section_id = 'financeiro'`);

// 2) Insere a nova página como primeira (order 0), apontando para o componente via template
await pool.query(`
  INSERT INTO menu_pages (id, section_id, subsession_id, label, icon, icon_color, template, order_index)
  VALUES ('dashboard-financeiro', 'financeiro', NULL, 'Dashboard Financeiro', 'LayoutDashboard', '#0ea5e9', 'superadmin-dashboard', 0)
  ON CONFLICT (id) DO UPDATE
    SET section_id = EXCLUDED.section_id, subsession_id = NULL, label = EXCLUDED.label,
        icon = EXCLUDED.icon, icon_color = EXCLUDED.icon_color, template = EXCLUDED.template, order_index = 0
`);

const r = await pool.query(`
  SELECT id, label, icon, template, order_index
  FROM menu_pages WHERE section_id = 'financeiro' ORDER BY order_index
`);
console.table(r.rows);
await pool.end();
