const fs = require("fs");
let code = fs.readFileSync("server.ts", "utf8");

// 1. Check if routes already exist
if (code.includes('crm-comercial/checklist')) {
  console.log("Routes already exist! Skipping route injection.");
} else {
  // Find insertion point: after the last crm-comercial/files route
  const marker = 'app.delete("/api/crm-comercial/files/:id"';
  const markerIdx = code.indexOf(marker);
  if (markerIdx === -1) {
    console.log("MARKER NOT FOUND: crm-comercial/files/:id");
    process.exit(1);
  }
  // Find the end of this route handler (closing });)
  let braceCount = 0;
  let routeEnd = -1;
  let inRoute = false;
  for (let i = markerIdx; i < code.length; i++) {
    if (code[i] === '{') { braceCount++; inRoute = true; }
    if (code[i] === '}') { braceCount--; }
    if (inRoute && braceCount === 0) {
      // Skip past the closing ");", look for ");"
      const afterBrace = code.indexOf("});", i);
      if (afterBrace !== -1 && afterBrace - i < 5) {
        routeEnd = afterBrace + 3;
        break;
      }
    }
  }
  if (routeEnd === -1) {
    console.log("Could not find end of files/:id route");
    process.exit(1);
  }

  const checklistRoutes = `

  // CRM Comercial — Checklist de Entrada
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // GET checklist items for a lead (auto-creates from template if empty)
  app.get("/api/crm-comercial/checklist", async (req, res) => {
    try {
      const { lead_id } = req.query as { lead_id: string };
      if (!lead_id) return res.status(400).json({ error: "lead_id required" });

      let result = await pool.query(
        "SELECT * FROM crm_comercial_checklist WHERE lead_id = $1 ORDER BY order_index ASC",
        [lead_id]
      );

      // Auto-populate from template if lead has no checklist yet
      if (result.rows.length === 0) {
        const tpl = await pool.query(
          "SELECT item, order_index FROM crm_comercial_checklist_template WHERE active = true ORDER BY order_index ASC"
        );
        if (tpl.rows.length > 0) {
          const values: any[] = [];
          const placeholders: string[] = [];
          tpl.rows.forEach((t: any, i: number) => {
            const offset = i * 3;
            placeholders.push(\`($\${offset + 1}, $\${offset + 2}, $\${offset + 3})\`);
            values.push(lead_id, t.item, t.order_index);
          });
          await pool.query(
            \`INSERT INTO crm_comercial_checklist (lead_id, item, order_index) VALUES \${placeholders.join(', ')}\`,
            values
          );
          result = await pool.query(
            "SELECT * FROM crm_comercial_checklist WHERE lead_id = $1 ORDER BY order_index ASC",
            [lead_id]
          );
        }
      }

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching checklist:", err);
      res.status(500).json({ error: "Failed to fetch checklist" });
    }
  });

  // PUT update a checklist item (toggle completed)
  app.put("/api/crm-comercial/checklist/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { completed, completed_by } = req.body;
      const result = await pool.query(
        \`UPDATE crm_comercial_checklist 
         SET completed = $1, completed_by = $2, completed_at = $3
         WHERE id = $4 RETURNING *\`,
        [completed, completed_by || null, completed ? new Date() : null, id]
      );
      if (!result.rows.length) return res.status(404).json({ error: "Item not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating checklist item:", err);
      res.status(500).json({ error: "Failed to update checklist item" });
    }
  });

  // GET checklist template
  app.get("/api/crm-comercial/checklist-template", async (_req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM crm_comercial_checklist_template WHERE active = true ORDER BY order_index ASC"
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching checklist template:", err);
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  // PUT replace entire checklist template
  app.put("/api/crm-comercial/checklist-template", async (req, res) => {
    const client = await pool.connect();
    try {
      const { items } = req.body as { items: { item: string }[] };
      if (!Array.isArray(items)) return res.status(400).json({ error: "items array required" });
      const validItems = items.filter(t => t.item && t.item.trim() !== '');

      await client.query('BEGIN');
      await client.query("UPDATE crm_comercial_checklist_template SET active = false");

      if (validItems.length > 0) {
        const values: any[] = [];
        const placeholders: string[] = [];
        validItems.forEach((t, i) => {
          const offset = i * 2;
          placeholders.push(\`($\${offset + 1}, $\${offset + 2})\`);
          values.push(t.item.trim(), i);
        });
        await client.query(
          \`INSERT INTO crm_comercial_checklist_template (item, order_index) VALUES \${placeholders.join(', ')}\`,
          values
        );
      }

      await client.query('COMMIT');
      const result = await client.query(
        "SELECT * FROM crm_comercial_checklist_template WHERE active = true ORDER BY order_index ASC"
      );
      res.json(result.rows);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error("Error updating checklist template:", err);
      res.status(500).json({ error: "Failed to update template" });
    } finally {
      client.release();
    }
  });
`;

  code = code.slice(0, routeEnd) + checklistRoutes + code.slice(routeEnd);
  console.log("✅ Checklist routes injected after crm-comercial/files");
}

// 2. Add table creation SQL if missing
if (!code.includes('crm_comercial_checklist_template')) {
  const tableMarker = 'CREATE TABLE IF NOT EXISTS crm_comercial_checklist';
  if (!code.includes(tableMarker)) {
    // Find a good spot - after crm_checklist_template seed
    const seedEnd = code.indexOf("END $$;", code.indexOf("crm_checklist_template"));
    if (seedEnd !== -1) {
      const insertPos = code.indexOf("\n", seedEnd) + 1;
      const tableSql = `
      CREATE TABLE IF NOT EXISTS crm_comercial_checklist_template (
        id SERIAL PRIMARY KEY,
        item TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Seed checklist de entrada padrão
      DO $$
      DECLARE
        active_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO active_count FROM crm_comercial_checklist_template WHERE active = true;
        IF active_count = 0 THEN
          DELETE FROM crm_comercial_checklist_template WHERE active = false;
          INSERT INTO crm_comercial_checklist_template (item, order_index) VALUES
            ('Gerar contrato', 0),
            ('Link forms', 1),
            ('Faz copia do contrato no drive', 2),
            ('Criar em pdf com os ajustes no claudio', 3),
            ('Pix', 4),
            ('Criar grupo', 5),
            ('Mensagem boas vindas', 6),
            ('Ganho CRM', 7),
            ('Arquivar contrato após as assinaturas', 8);
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS crm_comercial_checklist (
        id SERIAL PRIMARY KEY,
        lead_id TEXT NOT NULL,
        item TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        completed_by TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
`;
      code = code.slice(0, insertPos) + tableSql + code.slice(insertPos);
      console.log("✅ Table definitions injected");
    } else {
      console.log("⚠️ Could not find spot for table SQL, skipping");
    }
  }
} else {
  console.log("Table definitions already exist");
}

// 3. Add to PUBLIC_ROUTES
if (code.includes("crm-comercial/checklist") && !code.includes("RegExp('^/api/crm-comercial/checklist')")) {
  const publicMarker = "{ pattern: new RegExp('^/api/crm-checklist-template') },";
  const prIdx = code.indexOf(publicMarker);
  if (prIdx !== -1) {
    const endPos = prIdx + publicMarker.length;
    code = code.slice(0, endPos) + 
      "\n  { pattern: new RegExp('^/api/crm-comercial/checklist') }," +
      "\n  { pattern: new RegExp('^/api/crm-comercial/checklist-template') }," +
      code.slice(endPos);
    console.log("✅ PUBLIC_ROUTES updated");
  } else {
    // Try without the crm-checklist-template entry
    const altMarker = "{ pattern: new RegExp('^/api/crm-checklist') },";
    const altIdx = code.indexOf(altMarker);
    if (altIdx !== -1) {
      const endPos = altIdx + altMarker.length;
      code = code.slice(0, endPos) +
        "\n  { pattern: new RegExp('^/api/crm-comercial/checklist') }," +
        "\n  { pattern: new RegExp('^/api/crm-comercial/checklist-template') }," +
        code.slice(endPos);
      console.log("✅ PUBLIC_ROUTES updated (alt marker)");
    } else {
      console.log("⚠️ Could not find PUBLIC_ROUTES marker");
    }
  }
}

fs.writeFileSync("server.ts", code);
console.log("✅ server.ts saved");
