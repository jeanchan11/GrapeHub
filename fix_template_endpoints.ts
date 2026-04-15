import fs from 'fs';

const serverFile = 'server.ts';
let content = fs.readFileSync(serverFile, 'utf8');

const postEndpoint = `
  app.post("/api/task-templates", async (req, res) => {
    const { name, description, created_by, items } = req.body;
    try {
      await pool.query('BEGIN');
      const tRes = await pool.query(
        \`INSERT INTO task_templates (name, description, created_by) VALUES ($1, $2, $3) RETURNING id\`,
        [name, description, created_by]
      );
      const templateId = tRes.rows[0].id;
      
      if (items && items.length > 0) {
        const idMap = new Map();
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const parentId = item.parent_item_id ? (idMap.get(item.parent_item_id) || item.parent_item_id) : null;
          const iRes = await pool.query(
            \`INSERT INTO task_template_items (template_id, title, parent_item_id, assignee, due_days_offset, order_index) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id\`,
            [templateId, item.title, parentId, item.assignee || null, item.due_days_offset || 0, i]
          );
          idMap.set(item.id, iRes.rows[0].id);
        }
      }
      
      await pool.query('COMMIT');
      res.json({ success: true, id: templateId });
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error("Error saving template:", err);
      res.status(500).json({ error: "Failed to save template" });
    }
  });
`;

const putEndpoint = `
  app.put("/api/task-templates/:id", async (req, res) => {
    const { id } = req.params;
    const { name, description, items } = req.body;
    try {
      await pool.query('BEGIN');
      await pool.query(
        "UPDATE task_templates SET name = $1, description = $2 WHERE id = $3",
        [name, description, id]
      );
      
      await pool.query("DELETE FROM task_template_items WHERE template_id = $1", [id]);
      
      if (items && items.length > 0) {
        const idMap = new Map();
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const parentId = item.parent_item_id ? (idMap.get(item.parent_item_id) || item.parent_item_id) : null;
          const iRes = await pool.query(
            \`INSERT INTO task_template_items (template_id, title, parent_item_id, assignee, due_days_offset, order_index) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id\`,
            [id, item.title, parentId, item.assignee || null, item.due_days_offset || 0, i]
          );
          idMap.set(item.id, iRes.rows[0].id);
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

// Replace POST
content = content.replace(
  /app\.post\("\/api\/task-templates", async \(req, res\) => \{[\s\S]*?\}\);/,
  postEndpoint.trim()
);

// Replace PUT
content = content.replace(
  /app\.put\("\/api\/task-templates\/:id", async \(req, res\) => \{[\s\S]*?\}\);/,
  putEndpoint.trim()
);

fs.writeFileSync(serverFile, content);
console.log('Endpoints updated');
