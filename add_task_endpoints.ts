import fs from 'fs';

const serverFile = fs.readFileSync('server.ts', 'utf8');

const endpoints = `
  // --- Tasks API ---
  app.get("/api/tasks", async (req, res) => {
    try {
      const { project_id } = req.query;
      const result = await pool.query("SELECT * FROM todos WHERE project_id = $1 ORDER BY due_date ASC NULLS LAST, created_at DESC", [project_id]);
      res.json(result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
        dueDate: row.due_date,
        createdBy: row.created_by,
        assignedTo: row.assigned_to,
        projectId: row.project_id
      })));
    } catch (err) {
      console.error("Error fetching tasks:", err);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    const { id, title, description, status, createdBy, assignedTo, dueDate, project_id } = req.body;
    try {
      const taskId = id || Date.now().toString();
      await pool.query(
        \`INSERT INTO todos (id, title, description, status, created_by, assigned_to, due_date, project_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\`,
        [taskId, title, description, status || 'pending', createdBy, assignedTo, dueDate, project_id]
      );
      
      // Add history
      await pool.query(
        \`INSERT INTO task_history (task_id, user_id, action, new_value) VALUES ($1, $2, $3, $4)\`,
        [taskId, createdBy, 'Tarefa criada', title]
      );
      
      res.json({ success: true, id: taskId });
    } catch (err) {
      console.error("Error saving task:", err);
      res.status(500).json({ error: "Failed to save task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const { id } = req.params;
    const { user_id, ...updates } = req.body;
    try {
      const keys = Object.keys(updates);
      if (keys.length === 0) return res.json({ success: true });
      
      // Get old task for history
      const oldTaskRes = await pool.query("SELECT * FROM todos WHERE id = $1", [id]);
      const oldTask = oldTaskRes.rows[0];
      
      const setClause = keys.map((key, i) => {
        // Map camelCase to snake_case if needed
        const dbKey = key === 'dueDate' ? 'due_date' : key === 'assignedTo' ? 'assigned_to' : key;
        return \`\${dbKey} = $\${i + 2}\`;
      }).join(', ');
      const values = keys.map(key => updates[key]);
      
      await pool.query(
        \`UPDATE todos SET \${setClause} WHERE id = $1\`,
        [id, ...values]
      );
      
      // Add history
      if (user_id) {
        if (updates.status && oldTask.status !== updates.status) {
          await pool.query(\`INSERT INTO task_history (task_id, user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)\`, [id, user_id, 'Status alterado', oldTask.status, updates.status]);
        }
        if (updates.dueDate !== undefined && oldTask.due_date !== updates.dueDate) {
          await pool.query(\`INSERT INTO task_history (task_id, user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)\`, [id, user_id, 'Data de vencimento alterada', oldTask.due_date, updates.dueDate]);
        }
        if (updates.assignedTo !== undefined && oldTask.assigned_to !== updates.assignedTo) {
          await pool.query(\`INSERT INTO task_history (task_id, user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)\`, [id, user_id, 'Responsável alterado', oldTask.assigned_to, updates.assignedTo]);
        }
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating task:", err);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.get("/api/task-subtasks", async (req, res) => {
    try {
      const { task_id } = req.query;
      const result = await pool.query("SELECT * FROM task_subtasks WHERE task_id = $1 ORDER BY id ASC", [task_id]);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching subtasks:", err);
      res.status(500).json({ error: "Failed to fetch subtasks" });
    }
  });

  app.post("/api/task-subtasks", async (req, res) => {
    const { task_id, title, assignee, due_date } = req.body;
    try {
      const result = await pool.query(
        \`INSERT INTO task_subtasks (task_id, title, assignee, due_date) VALUES ($1, $2, $3, $4) RETURNING *\`,
        [task_id, title, assignee, due_date]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error saving subtask:", err);
      res.status(500).json({ error: "Failed to save subtask" });
    }
  });

  app.patch("/api/task-subtasks/:id", async (req, res) => {
    const { id } = req.params;
    const { completed, user_id } = req.body;
    try {
      const result = await pool.query(
        \`UPDATE task_subtasks SET completed = $1, completed_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END WHERE id = $2 RETURNING *\`,
        [completed, id]
      );
      
      if (user_id && completed) {
        await pool.query(\`INSERT INTO task_history (task_id, user_id, action, new_value) VALUES ($1, $2, $3, $4)\`, [result.rows[0].task_id, user_id, 'Subtarefa concluída', result.rows[0].title]);
      }
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating subtask:", err);
      res.status(500).json({ error: "Failed to update subtask" });
    }
  });

  app.get("/api/task-templates", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM task_templates ORDER BY name ASC");
      const templates = result.rows;
      
      for (let t of templates) {
        const itemsRes = await pool.query("SELECT * FROM task_template_items WHERE template_id = $1 ORDER BY order_index ASC", [t.id]);
        t.items = itemsRes.rows;
      }
      
      res.json(templates);
    } catch (err) {
      console.error("Error fetching templates:", err);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

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
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await pool.query(
            \`INSERT INTO task_template_items (template_id, title, parent_item_id, assignee, due_days_offset, order_index) VALUES ($1, $2, $3, $4, $5, $6)\`,
            [templateId, item.title, item.parent_item_id || null, item.assignee || null, item.due_days_offset || 0, i]
          );
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

  app.post("/api/task-templates/:id/apply", async (req, res) => {
    const { id } = req.params;
    const { project_id, user_id } = req.query;
    try {
      const itemsRes = await pool.query("SELECT * FROM task_template_items WHERE template_id = $1 ORDER BY order_index ASC", [id]);
      const items = itemsRes.rows;
      
      const templateRes = await pool.query("SELECT * FROM task_templates WHERE id = $1", [id]);
      const templateName = templateRes.rows[0]?.name || 'Modelo';
      
      // Map to keep track of parent tasks
      const parentMap = new Map();
      
      for (let item of items) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (item.due_days_offset || 0));
        
        if (!item.parent_item_id) {
          // It's a task
          const taskId = Date.now().toString() + Math.random().toString(36).substring(7);
          await pool.query(
            \`INSERT INTO todos (id, title, status, created_by, assigned_to, due_date, project_id) VALUES ($1, $2, $3, $4, $5, $6, $7)\`,
            [taskId, item.title, 'pending', user_id, item.assignee || 'all', dueDate, project_id]
          );
          parentMap.set(item.id, taskId);
          
          await pool.query(
            \`INSERT INTO task_history (task_id, user_id, action, new_value) VALUES ($1, $2, $3, $4)\`,
            [taskId, user_id, 'Modelo aplicado', templateName]
          );
        } else {
          // It's a subtask
          const parentTaskId = parentMap.get(item.parent_item_id);
          if (parentTaskId) {
            await pool.query(
              \`INSERT INTO task_subtasks (task_id, title, assignee, due_date) VALUES ($1, $2, $3, $4)\`,
              [parentTaskId, item.title, item.assignee || null, dueDate]
            );
          }
        }
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error("Error applying template:", err);
      res.status(500).json({ error: "Failed to apply template" });
    }
  });

  app.get("/api/task-history", async (req, res) => {
    try {
      const { task_id } = req.query;
      const result = await pool.query("SELECT * FROM task_history WHERE task_id = $1 ORDER BY created_at DESC", [task_id]);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching task history:", err);
      res.status(500).json({ error: "Failed to fetch task history" });
    }
  });
`;

const insertIndex = serverFile.indexOf('app.get("/api/todos"');
const newServerFile = serverFile.slice(0, insertIndex) + endpoints + '\n' + serverFile.slice(insertIndex);

fs.writeFileSync('server.ts', newServerFile);
