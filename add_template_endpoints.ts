import fs from 'fs';

const serverFile = 'server.ts';
let content = fs.readFileSync(serverFile, 'utf8');

const deleteEndpoint = `
  app.delete("/api/task-templates/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query('BEGIN');
      await pool.query("DELETE FROM task_template_items WHERE template_id = $1", [id]);
      await pool.query("DELETE FROM task_templates WHERE id = $1", [id]);
      await pool.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error("Error deleting template:", err);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });
`;

const updateEndpoint = `
  app.put("/api/task-templates/:id", async (req, res) => {
    const { id } = req.params;
    const { name, description, items } = req.body;
    try {
      await pool.query('BEGIN');
      await pool.query(
        "UPDATE task_templates SET name = $1, description = $2 WHERE id = $3",
        [name, description, id]
      );
      
      // Delete old items and insert new ones
      await pool.query("DELETE FROM task_template_items WHERE template_id = $1", [id]);
      
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await pool.query(
            \`INSERT INTO task_template_items (template_id, title, parent_item_id, assignee, due_days_offset, order_index) VALUES ($1, $2, $3, $4, $5, $6)\`,
            [id, item.title, item.parent_item_id || null, item.assignee || null, item.due_days_offset || 0, i]
          );
        }
      }
      
      await pool.query('COMMIT');
      res.json({ success: true });
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error("Error updating template:", err);
      res.status(500).json({ error: "Failed to update template" });
    }
  });
`;

if (!content.includes('app.delete("/api/task-templates/:id"')) {
  content = content.replace(
    'app.post("/api/task-templates/:id/apply"',
    deleteEndpoint + '\n' + updateEndpoint + '\n  app.post("/api/task-templates/:id/apply"'
  );
  fs.writeFileSync(serverFile, content);
  console.log('Endpoints added');
} else {
  console.log('Endpoints already exist');
}
