import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query("SELECT * FROM todos WHERE title = 'teste' LIMIT 1");
  const task = res.rows[0];
  console.log("Task:", task);
  if (task) {
    const id = task.id;
    try {
      await pool.query("UPDATE todos SET due_date = $2 WHERE id = $1", [id, '2026-06-15']);
      console.log("UPDATE OK");
      
      const oldTask = task;
      const updates = { dueDate: '2026-06-15' };
      const authenticatedUid = 'some-uid';
      
      // Simulate task_history INSERT
      if (updates.dueDate !== undefined && oldTask.due_date !== updates.dueDate) {
        await pool.query(
          `INSERT INTO task_history (task_id, user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)`,
          [id, authenticatedUid, 'Data de vencimento alterada', oldTask.due_date, updates.dueDate]
        );
        console.log("HISTORY OK");
      }
    } catch (e) {
      console.error("ERROR:", e);
    }
  }
  process.exit(0);
}
run();
