import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function fix() {
  try {
    const res = await pool.query('SELECT kanban_id, id FROM crm_comercial_columns ORDER BY order_index ASC');
    const kanbans = {};
    res.rows.forEach(r => { if (!kanbans[r.kanban_id]) kanbans[r.kanban_id] = r.id; });
    
    const leads = await pool.query('SELECT id, kanban_id, coluna FROM crm_comercial_leads WHERE coluna IS NULL OR coluna = \'\'');
    console.log('Fixing leads:', leads.rows.length);
    for (const lead of leads.rows) {
      const firstCol = kanbans[lead.kanban_id];
      if (firstCol) {
        await pool.query('UPDATE crm_comercial_leads SET coluna = $1 WHERE id = $2', [firstCol, lead.id]);
        console.log('Updated lead', lead.id, 'to column', firstCol);
      }
    }
  } catch(e) { console.error(e) } finally { await pool.end(); }
}
fix();
