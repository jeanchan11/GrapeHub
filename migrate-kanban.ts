import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_comercial_kanbans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        cor VARCHAR(50) DEFAULT 'blue',
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Check if default kanban exists
    const res = await pool.query("SELECT * FROM crm_comercial_kanbans WHERE is_default = true");
    let defaultKanbanId;
    if (res.rows.length === 0) {
      const insertRes = await pool.query(`
        INSERT INTO crm_comercial_kanbans (nome, descricao, cor, is_default)
        VALUES ('Comercial 🔥', 'Kanban padrão', 'violet', true)
        RETURNING id;
      `);
      defaultKanbanId = insertRes.rows[0].id;
    } else {
      defaultKanbanId = res.rows[0].id;
    }

    // Add kanban_id to leads if it doesn't exist
    await pool.query(`
      ALTER TABLE crm_comercial_leads 
      ADD COLUMN IF NOT EXISTS kanban_id UUID REFERENCES crm_comercial_kanbans(id);
    `);

    // Update existing leads to use the default kanban
    await pool.query(`
      UPDATE crm_comercial_leads 
      SET kanban_id = $1 
      WHERE kanban_id IS NULL;
    `, [defaultKanbanId]);

    console.log("Migration successful");
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
