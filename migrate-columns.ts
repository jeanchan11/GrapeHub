import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_comercial_columns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kanban_id UUID REFERENCES crm_comercial_kanbans(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        color VARCHAR(50) DEFAULT 'orange',
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Get default kanban
    const res = await pool.query("SELECT id FROM crm_comercial_kanbans WHERE is_default = true");
    if (res.rows.length > 0) {
      const defaultKanbanId = res.rows[0].id;
      
      // Check if columns exist for default kanban
      const colsRes = await pool.query("SELECT * FROM crm_comercial_columns WHERE kanban_id = $1", [defaultKanbanId]);
      if (colsRes.rows.length === 0) {
        // Insert default columns
        const defaultColumns = [
          { title: 'Follow up 1', color: 'orange', order: 0 },
          { title: 'Follow up 2', color: 'orange', order: 1 },
          { title: 'Follow up 3', color: 'orange', order: 2 },
          { title: 'Follow up 4', color: 'orange', order: 3 },
          { title: 'Negociação 🏆', color: 'purple', order: 4 },
          { title: 'Onboarding Comercial', color: 'blue', order: 5 },
          { title: 'Fechado', color: 'emerald', order: 6 }
        ];
        
        for (const col of defaultColumns) {
          await pool.query(`
            INSERT INTO crm_comercial_columns (kanban_id, title, color, order_index)
            VALUES ($1, $2, $3, $4)
          `, [defaultKanbanId, col.title, col.color, col.order]);
        }
      }
    }

    console.log("Migration successful");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
