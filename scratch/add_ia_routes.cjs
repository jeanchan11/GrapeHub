const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

// Check if routes already exist
if (code.includes("/api/ia-status-groups")) {
  console.log("Routes already exist! Skipping.");
  process.exit(0);
}

// Find insertion point after visual-hub-status-groups/reorder route
const marker = "app.put('/api/visual-hub-status-groups/reorder'";
const idx = code.indexOf(marker);
if (idx === -1) {
  console.log("MARKER NOT FOUND");
  process.exit(1);
}
const endBlock = code.indexOf("});", code.indexOf("res.json(result.rows)", idx));
const insertPos = code.indexOf("\n", endBlock) + 1;

// Also find the CREATE TABLE section to add our table
const tableMarker = "CREATE TABLE IF NOT EXISTS visual_hub_status_groups";
const tableIdx = code.indexOf(tableMarker);
if (tableIdx === -1) {
  console.log("TABLE MARKER NOT FOUND");
  process.exit(1);
}
// Find the end of the visual_hub seed block
const seedEnd = code.indexOf("}\n", code.indexOf("parseInt(existingGroups.rows[0].count) === 0"));
const tableInsertPos = code.indexOf("\n", seedEnd) + 1;

// Table + seed code
const tableCode = `
  // ── IA Status Groups table ──
  await pool.query(\`
    CREATE TABLE IF NOT EXISTS ia_status_groups (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#8b5cf6',
      emoji TEXT NOT NULL DEFAULT '🤖',
      order_index INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  \`);

  // Seed IA defaults if table is empty
  const existingIaGroups = await pool.query('SELECT COUNT(*) FROM ia_status_groups');
  if (parseInt(existingIaGroups.rows[0].count) === 0) {
    const iaDefaults = [
      { id: 'a-fazer-briefing', label: 'A FAZER BRIEFING', color: '#52525b', emoji: '📋', order_index: 0 },
      { id: 'briefing-feito', label: 'BRIEFING FEITO', color: '#3b82f6', emoji: '✅', order_index: 1 },
      { id: 'em-implementacao', label: 'EM IMPLEMENTAÇÃO', color: '#f59e0b', emoji: '⚙️', order_index: 2 },
      { id: 'em-testes', label: 'EM TESTES', color: '#8b5cf6', emoji: '🧪', order_index: 3 },
      { id: 'concluido', label: 'CONCLUÍDO', color: '#22c55e', emoji: '🚀', order_index: 4 },
    ];
    for (const d of iaDefaults) {
      await pool.query(
        'INSERT INTO ia_status_groups (id, label, color, emoji, order_index) VALUES ($1,$2,$3,$4,$5)',
        [d.id, d.label, d.color, d.emoji, d.order_index]
      );
    }
  }
`;

// API routes code
const routesCode = `
  // ── IA Status Groups API ──
  app.get('/api/ia-status-groups', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM ia_status_groups ORDER BY order_index ASC');
      res.json(result.rows);
    } catch (err) {
      console.error('GET /api/ia-status-groups error:', err);
      res.status(500).json({ error: 'Erro ao buscar grupos.' });
    }
  });

  app.post('/api/ia-status-groups', async (req, res) => {
    try {
      const { id, label, color, emoji, order_index } = req.body;
      if (!id || !label) return res.status(400).json({ error: 'id e label obrigatórios.' });
      const result = await pool.query(
        \`INSERT INTO ia_status_groups (id, label, color, emoji, order_index) VALUES ($1,$2,$3,$4,$5) RETURNING *\`,
        [id, label, color || '#8b5cf6', emoji || '🤖', order_index ?? 0]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /api/ia-status-groups error:', err);
      res.status(500).json({ error: 'Erro ao criar grupo.' });
    }
  });

  app.patch('/api/ia-status-groups/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const fields = req.body;
      const allowed = ['label', 'color', 'emoji', 'order_index'];
      const sets: string[] = [];
      const vals: any[] = [];
      let idx = 1;
      for (const key of allowed) {
        if (key in fields) { sets.push(\`\${key} = $\${idx++}\`); vals.push(fields[key]); }
      }
      if (sets.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
      vals.push(id);
      const result = await pool.query(
        \`UPDATE ia_status_groups SET \${sets.join(', ')} WHERE id = $\${idx} RETURNING *\`,
        vals
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Grupo não encontrado.' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error('PATCH /api/ia-status-groups error:', err);
      res.status(500).json({ error: 'Erro ao atualizar grupo.' });
    }
  });

  app.delete('/api/ia-status-groups/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query(
        \`UPDATE onboarding_tasks SET status_group = 'a-fazer-briefing' WHERE status_group = $1 AND type = 'implementacao-ia'\`,
        [id]
      );
      await pool.query('DELETE FROM ia_status_groups WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (err) {
      console.error('DELETE /api/ia-status-groups error:', err);
      res.status(500).json({ error: 'Erro ao deletar grupo.' });
    }
  });

  app.put('/api/ia-status-groups/reorder', async (req, res) => {
    try {
      const { groups } = req.body;
      if (!Array.isArray(groups)) return res.status(400).json({ error: 'groups array required.' });
      for (const g of groups) {
        await pool.query('UPDATE ia_status_groups SET order_index = $1 WHERE id = $2', [g.order_index, g.id]);
      }
      const result = await pool.query('SELECT * FROM ia_status_groups ORDER BY order_index ASC');
      res.json(result.rows);
    } catch (err) {
      console.error('PUT /api/ia-status-groups/reorder error:', err);
      res.status(500).json({ error: 'Erro ao reordenar.' });
    }
  });
`;

// Insert table code first (at tableInsertPos), then routes (at insertPos + offset)
code = code.slice(0, tableInsertPos) + tableCode + code.slice(tableInsertPos);
// Recalculate insertPos since we added code before it
const newInsertPos = insertPos + tableCode.length;
code = code.slice(0, newInsertPos) + routesCode + code.slice(newInsertPos);

fs.writeFileSync("server.ts", code);
console.log("OK - IA Status Groups routes added to server.ts");
console.log("Table code inserted at:", tableInsertPos);
console.log("Routes code inserted at:", newInsertPos);
console.log("New file size:", code.length);
