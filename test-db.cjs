const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('task_attachments', 'task_comments', 'task_subtasks', 'todo_attachments', 'todo_comments', 'todo_subtasks');")
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
