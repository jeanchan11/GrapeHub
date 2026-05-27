const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.VITE_DATABASE_URL || 'postgresql://neondb_owner:npg_Ucjz1nygpE4L@ep-sweet-morning-ac7xd87o-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  await client.connect();
  try {
    const res = await client.query(`
      INSERT INTO automations (name, description, active, runs)
      VALUES (
        'Lead ganho → Onboarding Operacional', 
        'Quando um negócio é marcado como ganho no CRM Comercial, cria automaticamente um cliente no kanban Onboarding Operacional com os dados do negócio.',
        true,
        34
      ) RETURNING id
    `);
    const newId = res.rows[0].id;
    
    await client.query(`
      INSERT INTO automation_steps (automation_id, type, order_index, config)
      VALUES ($1, 'trigger', 0, '{"event": "lead_won"}')
    `, [newId]);
    
    await client.query(`
      INSERT INTO automation_steps (automation_id, type, order_index, config)
      VALUES ($1, 'action', 1, '{"action_type": "create_onboarding"}')
    `, [newId]);
    
    console.log("Inserida automação:", newId);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
