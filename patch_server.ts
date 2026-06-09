import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const deleteRoute = `
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Delete attachments associated with the task
      await pool.query("DELETE FROM todo_attachments WHERE task_id = $1", [id]);
      
      // Delete comments associated with the task
      await pool.query("DELETE FROM todo_comments WHERE task_id = $1", [id]);
      
      // Delete subtasks associated with the task
      await pool.query("DELETE FROM todo_subtasks WHERE task_id = $1", [id]);
      
      // Finally delete the task itself
      await pool.query("DELETE FROM todos WHERE id = $1", [id]);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  });
`;

if (!content.includes('app.delete("/api/tasks/:id"')) {
  content = content.replace(
    '  app.patch("/api/tasks/:id", async (req, res) => {',
    deleteRoute + '\n  app.patch("/api/tasks/:id", async (req, res) => {'
  );
  fs.writeFileSync('server.ts', content);
  console.log('Patched server.ts with DELETE route');
} else {
  console.log('DELETE route already exists!');
}
