import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const upd = await pool.query(
  `UPDATE menu_pages SET label = $1, icon = $2 WHERE id = 'financeiro' RETURNING id, label, icon, icon_color`,
  ['Fluxo de Caixa', 'ChartNoAxesCombined']
);
console.table(upd.rows);
await pool.end();
