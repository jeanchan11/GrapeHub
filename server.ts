import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import pg from "pg";
import dotenv from "dotenv";

// IMMEDIATE LOGGING TO VERIFY BOOT
console.log("-----------------------------------------");
console.log(`[BOOT] ${new Date().toISOString()}: Node.js process starting...`);
console.log(`[BOOT] Current Directory: ${process.cwd()}`);
console.log(`[BOOT] Node Version: ${process.version}`);
console.log("-----------------------------------------");

// Catch-all for errors that crash the server silently
process.on("uncaughtException", (err) => {
  console.error("[CRITICAL] Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[CRITICAL] Unhandled Rejection at:", promise, "reason:", reason);
});

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === "production" || process.env.VITE_USER_NODE_ENV === "production";

  console.log(`Starting server in ${isProduction ? "production" : "development"} mode...`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

  // Database Environment Variables
  const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  const dbHost = process.env.PGHOST || process.env.VITE_PGHOST;
  const dbName = process.env.PGDATABASE || process.env.VITE_PGDATABASE;
  const dbUser = process.env.PGUSER || process.env.VITE_PGUSER;
  const dbPass = process.env.PGPASSWORD || process.env.VITE_PGPASSWORD;
  const dbSSL = process.env.PGSSLMODE || process.env.VITE_PGSSLMODE;

  // Check for placeholder hostname 'base' which often causes ENOTFOUND errors
  const isPlaceholderHost = (dbHost === "base" || (dbUrl && dbUrl.includes("@base:")));

  console.log("Database Config Check:", {
    url: dbUrl ? "OK (Using URL)" : "MISSING",
    host: dbHost ? "OK" : "MISSING",
    database: dbName ? "OK" : "MISSING",
    user: dbUser ? "OK" : "MISSING",
    password: dbPass ? "OK" : "MISSING",
    sslMode: dbSSL || "DEFAULT",
    isPlaceholder: isPlaceholderHost ? "YES (Warning: 'base' detected)" : "NO"
  });

  if (isPlaceholderHost) {
    console.warn("[DB] CRITICAL WARNING: Using placeholder hostname 'base'. This will cause connection errors (ENOTFOUND). Please update your environment variables in Hostinger/GitHub.");
  }

  // Postgres Pool Configuration
  const poolConfig: any = dbUrl 
    ? { connectionString: dbUrl }
    : {
        host: dbHost,
        database: dbName,
        user: dbUser,
        password: dbPass,
        port: 5432,
      };

  if (dbUrl) {
    try {
      const url = new URL(dbUrl);
      console.log(`[DB] Connecting to host: ${url.hostname}`);
      if (url.hostname === 'base') {
        console.error("[DB] ERROR: DATABASE_URL contains placeholder host 'base'. Please replace it with your actual Neon DB host.");
      }
    } catch (e) {
      console.warn("[DB] Could not parse DATABASE_URL for logging");
    }
  } else if (dbHost) {
    console.log(`[DB] Connecting to host: ${dbHost}`);
  }

  // Neon requires SSL.
  if (dbUrl?.includes("neon.tech") || dbHost?.includes("neon.tech") || dbSSL === "require") {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(poolConfig);

  pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
  });

  // Initialize Tables
  try {
    console.log("Initializing database tables...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        partner TEXT NOT NULL,
        status TEXT NOT NULL,
        roi TEXT NOT NULL,
        investment TEXT NOT NULL,
        responsible TEXT NOT NULL,
        last_update TEXT NOT NULL,
        active_client_id TEXT
      );
      
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS page_id TEXT;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS "group" TEXT;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_result TEXT;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]';
      
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        status TEXT DEFAULT 'Ativo',
        start_date TEXT,
        location TEXT,
        squad TEXT,
        tags TEXT,
        contracts TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS aviso_previo_date TEXT;

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        icon TEXT,
        cac TEXT,
        results TEXT,
        kpis TEXT,
        budget TEXT,
        platform TEXT,
        status TEXT,
        delivery TEXT,
        ai_service TEXT,
        bottleneck TEXT,
        history TEXT,
        balance TEXT,
        payment_method TEXT,
        project_result TEXT,
        cpa_goal TEXT,
        leads_goal TEXT,
        cac_goal TEXT,
        fechamentos_goal TEXT
      );

      ALTER TABLE products ADD COLUMN IF NOT EXISTS cac_goal TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS fechamentos_goal TEXT;

      CREATE TABLE IF NOT EXISTS optimizations (
        id TEXT PRIMARY KEY,
        product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
        author TEXT,
        author_photo TEXT,
        role TEXT,
        date TEXT,
        time TEXT,
        message TEXT,
        is_internal BOOLEAN DEFAULT FALSE,
        images TEXT[],
        status TEXT,
        type TEXT,
        optimization TEXT
      );

      -- Migration: Ensure new columns exist
      ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;
      ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS images TEXT[];
      ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS status TEXT;
      ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS type TEXT;
      ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS optimization TEXT;
      ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS time TEXT;
      ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS author_photo TEXT;

      -- Migration: Ensure all columns exist if table was created before they were added
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS partner TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS roi TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS investment TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS responsible TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_update TEXT NOT NULL DEFAULT '';
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS active_client_id TEXT;
      
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS start_date TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS location TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS squad TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS contracts TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS crm_status TEXT;

      CREATE TABLE IF NOT EXISTS crm_comments (
        id SERIAL PRIMARY KEY,
        client_id TEXT REFERENCES clients(id),
        user_id TEXT,
        type VARCHAR(50),
        content TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        images TEXT[]
      );
      
      ALTER TABLE crm_comments ADD COLUMN IF NOT EXISTS images TEXT[];

      CREATE TABLE IF NOT EXISTS crm_checklist (
        id SERIAL PRIMARY KEY,
        client_id TEXT REFERENCES clients(id),
        item TEXT,
        completed BOOLEAN DEFAULT FALSE,
        completed_by TEXT,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crm_exit_data (
        id SERIAL PRIMARY KEY,
        client_id TEXT REFERENCES clients(id),
        exit_date TIMESTAMP DEFAULT NOW(),
        how_it_went VARCHAR(50),
        exit_reasons TEXT[],
        project_result VARCHAR(20),
        client_relationship VARCHAR(20),
        notes TEXT,
        archived_by TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crm_checklist_template (
        id SERIAL PRIMARY KEY,
        item TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Seed crm_checklist_template
      DO $$
      DECLARE
        template_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO template_count FROM crm_checklist_template;
        IF template_count = 0 THEN
          INSERT INTO crm_checklist_template (item, order_index) VALUES
            ('COBRANÇA – Informar a Marvee para retirar do Asaas e Plataforma Marvee', 0),
            ('RETIRAR – Planilha Marvee Parceiros Ativos', 1),
            ('RETIRAR – Parceiros Ativos', 2),
            ('RETIRAR – Painel Gestor', 3),
            ('ARQUIVAR – Pasta Google Drive (Dentro de Operacional → Parceiros)', 4),
            ('ARQUIVAR – Pasta Google Data Studio', 5),
            ('ARQUIVAR – Contrato Authentique', 6),
            ('PAUSAR – Campanhas gerenciadas pela Grape Mídia', 7),
            ('SAIR – BM Facebook Ads (Pessoas e Parceiro All Grape Mídia) + Conta Google Ads', 8),
            ('DESATIVAR – LP dentro do WordPress', 9),
            ('DESATIVAR – CRM Padrão Grape', 10),
            ('RETIRAR – Planilha Acesso CRM', 11),
            ('RELATÓRIO DE SAÍDA (Motivos da Saída)', 12),
            ('FINALIZAR GRUPO', 13);
        END IF;
      END $$;
      
      -- Drop old columns if they exist
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='product') THEN
          ALTER TABLE projects DROP COLUMN product;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='products') THEN
          ALTER TABLE projects DROP COLUMN products;
        END IF;
      END $$;
      
      -- Ensure all columns exist in products table
      ALTER TABLE products ADD COLUMN IF NOT EXISTS project_id TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS name TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS icon TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS cac TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS results TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS kpis TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS budget TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS platform TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS ai_service TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS bottleneck TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS history TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS balance TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS payment_method TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS project_result TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS cpa_goal TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS leads_goal TEXT;

      -- Ensure all columns exist in optimizations table
      ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS product_id TEXT;
      ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS author TEXT;
      ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS role TEXT;
      ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS date TEXT;
      ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS time TEXT;
      ALTER TABLE optimizations ADD COLUMN IF NOT EXISTS message TEXT;

      CREATE TABLE IF NOT EXISTS commercial_data (
        id SERIAL PRIMARY KEY,
        target_sales NUMERIC DEFAULT 0,
        lead_cost NUMERIC DEFAULT 0,
        lead_to_meeting_rate NUMERIC DEFAULT 0,
        meeting_to_closing_rate NUMERIC DEFAULT 0,
        average_ticket NUMERIC DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS gestor_data (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS closer_data (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        due_date TIMESTAMP,
        created_by TEXT NOT NULL,
        assigned_to TEXT DEFAULT 'all',
        subtasks JSONB DEFAULT '[]',
        project_id TEXT,
        page_id TEXT
      );

      CREATE TABLE IF NOT EXISTS task_subtasks (
        id SERIAL PRIMARY KEY,
        task_id TEXT,
        title TEXT,
        assignee TEXT,
        due_date DATE,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS task_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS task_template_items (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES task_templates(id),
        title TEXT NOT NULL,
        parent_item_id INTEGER,
        assignee TEXT,
        due_days_offset INTEGER DEFAULT 0,
        order_index INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS task_batches (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES task_templates(id),
        date DATE NOT NULL,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS task_batch_clients (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER REFERENCES task_batches(id),
        client_id TEXT
      );

      CREATE TABLE IF NOT EXISTS task_history (
        id SERIAL PRIMARY KEY,
        task_id TEXT,
        user_id TEXT,
        action VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Migration for todos table
      ALTER TABLE todos ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;
      ALTER TABLE todos ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]';
      ALTER TABLE todos ADD COLUMN IF NOT EXISTS page_id TEXT;
      ALTER TABLE todos ADD COLUMN IF NOT EXISTS project_id TEXT;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        picture TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        allowed_pages JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        date TIMESTAMP NOT NULL,
        attendees TEXT,
        actions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Ensure menu tables exist without dropping them
      CREATE TABLE IF NOT EXISTS menu_sections (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        icon TEXT,
        icon_color TEXT,
        order_index INTEGER DEFAULT 0
      );

      ALTER TABLE menu_sections ADD COLUMN IF NOT EXISTS icon TEXT;
      ALTER TABLE menu_sections ADD COLUMN IF NOT EXISTS icon_color TEXT;

      CREATE TABLE IF NOT EXISTS menu_subsessions (
        id TEXT PRIMARY KEY,
        section_id TEXT REFERENCES menu_sections(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        icon TEXT NOT NULL,
        icon_color TEXT,
        order_index INTEGER DEFAULT 0
      );

      ALTER TABLE menu_subsessions ADD COLUMN IF NOT EXISTS icon_color TEXT;

      CREATE TABLE IF NOT EXISTS menu_subsubsessions (
        id TEXT PRIMARY KEY,
        subsession_id TEXT REFERENCES menu_subsessions(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        icon TEXT NOT NULL,
        icon_color TEXT,
        order_index INTEGER DEFAULT 0
      );

      ALTER TABLE menu_subsubsessions ADD COLUMN IF NOT EXISTS icon_color TEXT;

      CREATE TABLE IF NOT EXISTS menu_pages (
        id TEXT PRIMARY KEY,
        subsubsession_id TEXT REFERENCES menu_subsubsessions(id) ON DELETE CASCADE,
        subsession_id TEXT REFERENCES menu_subsessions(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        icon TEXT NOT NULL,
        template TEXT DEFAULT 'default',
        order_index INTEGER DEFAULT 0
      );

      -- Migration for menu_pages table
      ALTER TABLE menu_pages ADD COLUMN IF NOT EXISTS template TEXT DEFAULT 'default';
      ALTER TABLE menu_pages ADD COLUMN IF NOT EXISTS icon_color TEXT;
      ALTER TABLE menu_pages ADD COLUMN IF NOT EXISTS section_id TEXT REFERENCES menu_sections(id) ON DELETE CASCADE;
    `);
    console.log("Database tables initialized successfully.");
    
    // Initial menu data population removed to prevent overwriting user changes.
    // The menu should now be managed exclusively through the Admin Panel.
    
    // Migration: Ensure CRM Financeiro page exists
    await pool.query(`
      INSERT INTO menu_pages (id, subsession_id, label, icon, template, order_index)
      VALUES ('crm-financeiro', 'painel-admin', 'CRM Financeiro', 'CreditCard', 'crm-financeiro', 2)
      ON CONFLICT (id) DO NOTHING
    `);

    // Migration: Grant access to crm-financeiro for users who have active-clients
    await pool.query(`
      UPDATE users 
      SET allowed_pages = allowed_pages || '["crm-financeiro"]'::jsonb
      WHERE allowed_pages @> '["active-clients"]'::jsonb 
      AND NOT allowed_pages @> '["crm-financeiro"]'::jsonb
    `);
  } catch (err) {
    console.error("Error initializing database tables:", err);
  }

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Request Logging Middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Health Check
  app.get("/api/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", env: process.env.NODE_ENV, db: "connected" });
    } catch (err) {
      res.status(500).json({ status: "error", env: process.env.NODE_ENV, db: "disconnected", error: String(err) });
    }
  });

  // API Routes
  app.get("/api/db-test", async (req, res) => {
    try {
      const client = await pool.connect();
      const result = await client.query("SELECT NOW() as current_time");
      client.release();
      res.json({ 
        status: "success", 
        message: "Connected to Neon DB successfully!",
        time: result.rows[0].current_time 
      });
    } catch (err) {
      console.error("Database connection error:", err);
      res.status(500).json({ 
        status: "error", 
        message: "Failed to connect to Neon DB",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // Projects API
  app.get("/api/projects", async (req, res) => {
    console.log("!!! RECEBIDA REQUISIÇÃO GET /api/projects !!!");
    try {
      const { page_id } = req.query;
      let query = "SELECT * FROM projects";
      const params = [];
      if (page_id) {
        query += " WHERE page_id = $1";
        params.push(page_id);
      }
      query += " ORDER BY partner ASC";
      
      console.log("Executing query:", query, params);
      const projectsResult = await pool.query(query, params);
      console.log("Query result rows:", projectsResult.rows.length);
      const projects = [];

      for (const row of projectsResult.rows) {
        console.log(`Fetching products for project: ${row.id}`);
        const productsResult = await pool.query("SELECT * FROM products WHERE project_id = $1", [row.id]);
        console.log(`Found ${productsResult.rows.length} products for project: ${row.id}`);
        const products = [];

        for (const prodRow of productsResult.rows) {
          console.log(`Fetching optimizations for product: ${prodRow.id}`);
          const optimizationsResult = await pool.query("SELECT * FROM optimizations WHERE product_id = $1 ORDER BY date DESC", [prodRow.id]);
          console.log(`Found ${optimizationsResult.rows.length} optimizations for product: ${prodRow.id}`);
          products.push({
            id: prodRow.id,
            name: prodRow.name,
            icon: prodRow.icon,
            cac: prodRow.cac,
            results: prodRow.results,
            kpis: prodRow.kpis,
            budget: prodRow.budget,
            platform: prodRow.platform,
            status: prodRow.status,
            delivery: prodRow.delivery,
            aiService: prodRow.ai_service,
            bottleneck: prodRow.bottleneck,
            history: prodRow.history,
            balance: prodRow.balance,
            paymentMethod: prodRow.payment_method,
            projectResult: prodRow.project_result,
            cpaGoal: prodRow.cpa_goal,
            leadsGoal: prodRow.leads_goal,
            cacGoal: prodRow.cac_goal,
            fechamentosGoal: prodRow.fechamentos_goal,
            optimizations: optimizationsResult.rows.map(opt => ({
              id: opt.id,
              author: opt.author,
              authorPhoto: opt.author_photo,
              role: opt.role,
              date: opt.date,
              time: opt.time,
              message: opt.message,
              isInternal: opt.is_internal,
              images: opt.images,
              status: opt.status,
              type: opt.type,
              optimization: opt.optimization
            }))
          });
        }

        projects.push({
          id: row.id,
          partner: row.partner,
          product: row.partner, // Mapeando partner para product para compatibilidade
          status: row.status,
          roi: row.roi,
          investment: row.investment,
          responsible: row.responsible,
          lastUpdate: row.last_update,
          activeClientId: row.active_client_id,
          page_id: row.page_id,
          group: row.group,
          projectResult: row.project_result,
          files: (() => {
            if (typeof row.files === 'string') {
              try {
                return JSON.parse(row.files);
              } catch (e) {
                console.error("Error parsing files JSON:", e);
                return [];
              }
            }
            return row.files || [];
          })(),
          products: products
        });
      }
      res.json(projects);
    } catch (err) {
      console.error("Error fetching projects:", err);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    console.log("!!! RECEBIDA REQUISIÇÃO POST /api/projects !!!");
    console.log("Headers:", req.headers);
    const projects = req.body;
    if (!Array.isArray(projects)) {
      console.log("!!! ERRO: Expected an array of projects !!!", typeof projects);
      return res.status(400).json({ error: "Expected an array of projects" });
    }
    console.log(`Recebido array com ${projects.length} projetos.`);

    const MAX_RETRIES = 3;
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        console.log(`Recebida solicitação para salvar ${projects.length} projetos (tentativa ${retries + 1})`);
        
        // Ordenar projetos para evitar deadlocks
        projects.sort((a, b) => (a.id || '').localeCompare(b.id || ''));

        await pool.query("BEGIN");
        
        for (const p of projects) {
          console.log(`[SAVE] Iniciando processamento do projeto ${p.id} (${p.partner})`);
          
          // 1. Upsert Project
          try {
            await pool.query(
              `INSERT INTO projects (id, partner, status, roi, investment, responsible, last_update, active_client_id, page_id, "group", project_result, files) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
               ON CONFLICT (id) DO UPDATE SET
                 partner = EXCLUDED.partner,
                 status = EXCLUDED.status,
                 roi = EXCLUDED.roi,
                 investment = EXCLUDED.investment,
                 responsible = EXCLUDED.responsible,
                 last_update = EXCLUDED.last_update,
                 active_client_id = EXCLUDED.active_client_id,
                 page_id = EXCLUDED.page_id,
                 "group" = EXCLUDED."group",
                 project_result = EXCLUDED.project_result,
                 files = EXCLUDED.files`,
              [p.id, p.partner, p.status, p.roi, p.investment, p.responsible, p.lastUpdate, p.activeClientId, p.page_id, p.group, p.projectResult, JSON.stringify(p.files || [])]
            );
            console.log(`[SAVE] Projeto ${p.id} salvo.`);
          } catch (err) {
            console.error(`[SAVE ERROR] Erro ao salvar projeto ${p.id}:`, err);
            throw err;
          }

          // 2. Handle Products
          if (p.products && Array.isArray(p.products)) {
            console.log(`[SAVE] Processando ${p.products.length} produtos para o projeto ${p.id}`);
            // Get current product IDs to delete those not in the request
            const currentProductIdsResult = await pool.query("SELECT id FROM products WHERE project_id = $1", [p.id]);
            const currentProductIds = currentProductIdsResult.rows.map(r => r.id);
            const incomingProductIds = p.products.map(prod => prod.id);
            const productsToDelete = currentProductIds.filter(id => !incomingProductIds.includes(id));

            if (productsToDelete.length > 0) {
              await pool.query("DELETE FROM products WHERE id = ANY($1)", [productsToDelete]);
            }

            for (const prod of p.products) {
              try {
                await pool.query(
                  `INSERT INTO products (id, project_id, name, icon, cac, results, kpis, budget, platform, status, delivery, ai_service, bottleneck, history, balance, payment_method, project_result, cpa_goal, leads_goal, cac_goal, fechamentos_goal)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                   ON CONFLICT (id) DO UPDATE SET
                     name = EXCLUDED.name,
                     icon = EXCLUDED.icon,
                     cac = EXCLUDED.cac,
                     results = EXCLUDED.results,
                     kpis = EXCLUDED.kpis,
                     budget = EXCLUDED.budget,
                     platform = EXCLUDED.platform,
                     status = EXCLUDED.status,
                     delivery = EXCLUDED.delivery,
                     ai_service = EXCLUDED.ai_service,
                     bottleneck = EXCLUDED.bottleneck,
                     history = EXCLUDED.history,
                     balance = EXCLUDED.balance,
                     payment_method = EXCLUDED.payment_method,
                     project_result = EXCLUDED.project_result,
                     cpa_goal = EXCLUDED.cpa_goal,
                     leads_goal = EXCLUDED.leads_goal,
                     cac_goal = EXCLUDED.cac_goal,
                     fechamentos_goal = EXCLUDED.fechamentos_goal`,
                  [
                    prod.id, p.id, prod.name, prod.icon, prod.cac, prod.results, prod.kpis, prod.budget, 
                    prod.platform, prod.status, prod.delivery, prod.aiService, prod.bottleneck, 
                    prod.history, prod.balance, prod.paymentMethod, prod.projectResult, prod.cpaGoal, 
                    prod.leadsGoal, prod.cacGoal, prod.fechamentosGoal
                  ]
                );
              } catch (err) {
                console.error(`[SAVE ERROR] Erro ao salvar produto ${prod.id} do projeto ${p.id}:`, err);
                throw err;
              }

              // 3. Handle Optimizations
              if (prod.optimizations && Array.isArray(prod.optimizations)) {
                console.log(`[SAVE] Processando ${prod.optimizations.length} otimizações para o produto ${prod.id}`);
                const currentOptIdsResult = await pool.query("SELECT id FROM optimizations WHERE product_id = $1", [prod.id]);
                const currentOptIds = currentOptIdsResult.rows.map(r => r.id);
                const incomingOptIds = prod.optimizations.map(o => o.id);
                const optsToDelete = currentOptIds.filter(id => !incomingOptIds.includes(id));

                if (optsToDelete.length > 0) {
                  await pool.query("DELETE FROM optimizations WHERE id = ANY($1)", [optsToDelete]);
                }

                for (const opt of prod.optimizations) {
                  try {
                    await pool.query(
                      `INSERT INTO optimizations (id, product_id, author, author_photo, role, date, time, message, is_internal, images, status, type, optimization)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                       ON CONFLICT (id) DO UPDATE SET
                         author = EXCLUDED.author,
                         author_photo = EXCLUDED.author_photo,
                         role = EXCLUDED.role,
                         date = EXCLUDED.date,
                         time = EXCLUDED.time,
                         message = EXCLUDED.message,
                         is_internal = EXCLUDED.is_internal,
                         images = EXCLUDED.images,
                         status = EXCLUDED.status,
                         type = EXCLUDED.type,
                         optimization = EXCLUDED.optimization`,
                      [opt.id, prod.id, opt.author, opt.authorPhoto, opt.role, opt.date, opt.time, opt.message, opt.isInternal, opt.images, opt.status, opt.type, opt.optimization]
                    );
                  } catch (err) {
                    console.error(`[SAVE ERROR] Erro ao salvar otimização ${opt.id} do produto ${prod.id}:`, err);
                    throw err;
                  }
                }
                console.log(`[SAVE] Otimizações para produto ${prod.id} salvas.`);
              }
            }
            console.log(`[SAVE] Produtos para projeto ${p.id} salvos.`);
          }
        }
        await pool.query("COMMIT");
        console.log("Projetos e dados relacionados salvos com sucesso");
        res.json({ status: "success" });
        return; // Success
      } catch (err) {
        try {
          await pool.query("ROLLBACK");
        } catch (rollbackErr) {
          console.error("Error rolling back transaction:", rollbackErr);
        }
        
        const isDeadlock = err instanceof Error && err.message.includes('deadlock detected');
        if (isDeadlock && retries < MAX_RETRIES - 1) {
          retries++;
          console.warn(`Deadlock detected, retrying (${retries}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, 100 * retries)); // Exponential backoff
          continue;
        }

        console.error("Error saving projects:", err);
        res.status(500).json({ error: "Failed to save projects", details: err instanceof Error ? err.message : String(err) });
        return; // Failure
      }
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[DELETE] Tentando excluir projeto com ID: ${id}`);
      
      await pool.query("BEGIN");
      
      // 1. Excluir otimizações vinculadas aos produtos do projeto
      await pool.query(`
        DELETE FROM optimizations 
        WHERE product_id IN (SELECT id FROM products WHERE project_id = $1)
      `, [id]);
      
      // 2. Excluir produtos vinculados ao projeto
      await pool.query("DELETE FROM products WHERE project_id = $1", [id]);
      
      // 3. Excluir o projeto
      const result = await pool.query("DELETE FROM projects WHERE id = $1", [id]);
      
      await pool.query("COMMIT");
      
      console.log(`[DELETE] Resultado da exclusão: ${result.rowCount} linhas afetadas`);
      res.json({ success: true, deletedCount: result.rowCount });
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error("Error deleting project:", err);
      res.status(500).json({ error: "Failed to delete project", details: err instanceof Error ? err.message : String(err) });
    }
  });

  // Comercial Data API
  app.get("/api/comercial-data", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM commercial_data ORDER BY id DESC LIMIT 1");
      if (result.rows.length > 0) {
        const row = result.rows[0];
        res.json({
          targetSales: parseFloat(row.target_sales),
          leadCost: parseFloat(row.lead_cost),
          leadToMeetingRate: parseFloat(row.lead_to_meeting_rate),
          meetingToClosingRate: parseFloat(row.meeting_to_closing_rate),
          averageTicket: parseFloat(row.average_ticket)
        });
      } else {
        // Default values
        res.json({
          targetSales: 168000,
          leadCost: 12,
          leadToMeetingRate: 20,
          meetingToClosingRate: 25,
          averageTicket: 14000
        });
      }
    } catch (err) {
      console.error("Error fetching comercial data:", err);
      res.status(500).json({ error: "Failed to fetch comercial data" });
    }
  });

  app.post("/api/comercial-data", async (req, res) => {
    const { targetSales, leadCost, leadToMeetingRate, meetingToClosingRate, averageTicket } = req.body;
    try {
      await pool.query(
        "INSERT INTO commercial_data (target_sales, lead_cost, lead_to_meeting_rate, meeting_to_closing_rate, average_ticket) VALUES ($1, $2, $3, $4, $5)",
        [targetSales, leadCost, leadToMeetingRate, meetingToClosingRate, averageTicket]
      );
      res.json({ status: "success" });
    } catch (err) {
      console.error("Error saving comercial data:", err);
      res.status(500).json({ error: "Failed to save comercial data" });
    }
  });

  // Gestor Data API
  app.get("/api/gestor-data", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM gestor_data ORDER BY updated_at DESC LIMIT 1");
      if (result.rows.length > 0) {
        res.json(result.rows[0].data);
      } else {
        res.json({
          baseSalary: 3000,
          maxBonus: 2000,
          meetingDelay: false,
          reportDelay: false,
          taskDelays: [false, false, false],
          activeClients: 10,
          okResultClients: 10
        });
      }
    } catch (err) {
      console.error("Error fetching gestor data:", err);
      res.status(500).json({ error: "Failed to fetch gestor data" });
    }
  });

  app.post("/api/gestor-data", async (req, res) => {
    try {
      const data = req.body;
      await pool.query("INSERT INTO gestor_data (data) VALUES ($1)", [data]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving gestor data:", err);
      res.status(500).json({ error: "Failed to save gestor data" });
    }
  });

  // Closer Data API
  app.get("/api/closer-data", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM closer_data ORDER BY updated_at DESC LIMIT 1");
      if (result.rows.length > 0) {
        res.json(result.rows[0].data);
      } else {
        res.json({
          baseSalary: 3000,
          maxBonus: 2000,
          meetingDelay: false,
          reportDelay: false,
          taskDelays: [false, false, false],
          activeClients: 10,
          okResultClients: 10
        });
      }
    } catch (err) {
      console.error("Error fetching closer data:", err);
      res.status(500).json({ error: "Failed to fetch closer data" });
    }
  });

  app.post("/api/closer-data", async (req, res) => {
    try {
      const data = req.body;
      await pool.query("INSERT INTO closer_data (data) VALUES ($1)", [data]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving closer data:", err);
      res.status(500).json({ error: "Failed to save closer data" });
    }
  });

  // Menu API
  app.get("/api/debug-initdb", async (req, res) => {
    try {
      await pool.query("DELETE FROM menu_pages");
      await pool.query("DELETE FROM menu_subsubsessions");
      await pool.query("DELETE FROM menu_subsessions");
      await pool.query("DELETE FROM menu_sections");

      await pool.query("INSERT INTO menu_sections (id, title, order_index) VALUES ('operacional', 'Operacional', 0)");
      await pool.query("INSERT INTO menu_subsessions (id, section_id, label, icon, order_index) VALUES ('squad-able', 'operacional', 'Squad Able', 'Users', 0)");
      
      // Kpi's Squad directly under Squad Able
      await pool.query("INSERT INTO menu_pages (id, subsession_id, label, icon, template, order_index) VALUES ('kpis-squad', 'squad-able', 'Kpi''s Squad', 'TrendingUp', 'kpis-squad', 0)");
      
      await pool.query("INSERT INTO menu_subsubsessions (id, subsession_id, label, icon, order_index) VALUES ('resumo-squad', 'squad-able', 'Resumo do squad', 'LayoutDashboard', 1)");
      await pool.query("INSERT INTO menu_pages (id, subsubsession_id, label, icon, template, order_index) VALUES ('parceiros-squad', 'resumo-squad', 'Parceiros squad', 'Users', 'parceiros-squad', 0)");
      
      await pool.query("INSERT INTO menu_subsubsessions (id, subsession_id, label, icon, order_index) VALUES ('gestor-trafego', 'squad-able', 'Gestor de Tráfego', 'Target', 2)");
      await pool.query("INSERT INTO menu_pages (id, subsubsession_id, label, icon, template, order_index) VALUES ('projects', 'gestor-trafego', 'Projetos & Parceiros', 'Briefcase', 'projects', 0), ('todo', 'gestor-trafego', 'Tarefas', 'ListTodo', 'todo', 1)");
      
      await pool.query("INSERT INTO menu_subsubsessions (id, subsession_id, label, icon, order_index) VALUES ('gestor-trafego-2', 'squad-able', 'Gestor de Tráfego 2', 'Target', 3)");
      await pool.query("INSERT INTO menu_pages (id, subsubsession_id, label, icon, template, order_index) VALUES ('projects-2', 'gestor-trafego-2', 'Projetos & Parceiros 2', 'Briefcase', 'projects', 0), ('todo-2', 'gestor-trafego-2', 'Tarefas 2', 'ListTodo', 'todo', 1)");
      
      await pool.query("INSERT INTO menu_sections (id, title, order_index) VALUES ('administracao', 'Administração', 1)");
      await pool.query("INSERT INTO menu_subsessions (id, section_id, label, icon, order_index) VALUES ('painel-admin', 'administracao', 'Painel Admin', 'Shield', 0)");
      await pool.query("INSERT INTO menu_subsubsessions (id, subsession_id, label, icon, order_index) VALUES ('admin-geral', 'painel-admin', 'Geral', 'FileText', 0)");
      await pool.query("INSERT INTO menu_pages (id, subsubsession_id, label, icon, template, order_index) VALUES ('admin', 'admin-geral', 'Painel Admin', 'Shield', 'admin', 0), ('active-clients', 'admin-geral', 'Clientes Ativos', 'Users', 'active-clients', 1)");
      
      res.json({ success: true, message: "Database re-initialized successfully" });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.get("/api/debug-pages", async (req, res) => {
    try {
      const pages = await pool.query("SELECT * FROM menu_pages");
      res.json(pages.rows);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/debug-menu", async (req, res) => {
    try {
      const pages = await pool.query("SELECT * FROM menu_pages");
      const subsessions = await pool.query("SELECT * FROM menu_subsessions");
      const subsubsessions = await pool.query("SELECT * FROM menu_subsubsessions");
      res.json({
        pages: pages.rows,
        subsessions: subsessions.rows,
        subsubsessions: subsubsessions.rows
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/menu", async (req, res) => {
    console.log("!!! RECEBIDA REQUISIÇÃO GET /api/menu !!!");
    try {
      const sectionsRes = await pool.query("SELECT * FROM menu_sections ORDER BY order_index");
      console.log("Sections fetched:", sectionsRes.rows.length);
      const subsessionsRes = await pool.query("SELECT * FROM menu_subsessions ORDER BY order_index");
      console.log("Subsessions fetched:", subsessionsRes.rows.length);
      const subsubsessionsRes = await pool.query("SELECT * FROM menu_subsubsessions ORDER BY order_index");
      console.log("Subsubsessions fetched:", subsubsessionsRes.rows.length);
      const pagesRes = await pool.query("SELECT * FROM menu_pages ORDER BY order_index");
      console.log("Pages fetched:", pagesRes.rows.length);

      const sections = sectionsRes.rows;
      const subsessions = subsessionsRes.rows;
      const subsubsessions = subsubsessionsRes.rows;
      const pages = pagesRes.rows;

      const menu = sections.map(section => {
        return {
          id: section.id,
          title: section.title,
          icon: section.icon,
          icon_color: section.icon_color,
          pages: pages
            .filter(p => p.section_id === section.id && p.subsession_id === null && p.subsubsession_id === null)
            .map(p => ({
              id: p.id,
              label: p.label,
              icon: p.icon,
              icon_color: p.icon_color,
              template: p.template
            })),
          subSessions: subsessions
            .filter(ss => ss.section_id === section.id)
            .map(ss => {
              return {
                id: ss.id,
                label: ss.label,
                icon: ss.icon,
                icon_color: ss.icon_color,
                subSubSessions: subsubsessions
                  .filter(sss => sss.subsession_id === ss.id)
                  .map(sss => {
                    return {
                      id: sss.id,
                      label: sss.label,
                      icon: sss.icon,
                      icon_color: sss.icon_color,
                      pages: pages
                        .filter(p => p.subsubsession_id === sss.id)
                        .map(p => ({
                          id: p.id,
                          label: p.label,
                          icon: p.icon,
                          icon_color: p.icon_color,
                          template: p.template
                        }))
                    };
                  }),
                pages: pages
                  .filter(p => p.subsession_id === ss.id && p.subsubsession_id === null)
                  .map(p => ({
                    id: p.id,
                    label: p.label,
                    icon: p.icon,
                    icon_color: p.icon_color,
                    template: p.template
                  }))
              };
            })
        };
      });

      res.json(menu);
    } catch (err) {
      console.error("Error fetching menu:", err);
      res.status(500).json({ error: "Failed to fetch menu" });
    }
  });

  app.post("/api/menu/pages", async (req, res) => {
    try {
      const { id, subsubsession_id, subsession_id, section_id, label, icon, icon_color, template } = req.body;
      await pool.query(
        "INSERT INTO menu_pages (id, subsubsession_id, subsession_id, section_id, label, icon, icon_color, template, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, (SELECT COALESCE(MAX(order_index) + 1, 0) FROM menu_pages))",
        [id, subsubsession_id || null, subsession_id || null, section_id || null, label, icon, icon_color || '#64748b', template || id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error creating menu page:", err);
      res.status(500).json({ error: "Failed to create menu page" });
    }
  });

  app.put("/api/menu/pages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { subsubsession_id, subsession_id, section_id, label, icon, icon_color, template } = req.body;
      
      console.log(`[PUT] Atualizando página ${id}:`, { subsubsession_id, subsession_id, section_id, label });

      await pool.query(
        `UPDATE menu_pages 
         SET subsubsession_id = $1, 
             subsession_id = $2, 
             section_id = $3,
             label = $4, 
             icon = $5, 
             icon_color = $6,
             template = $7 
         WHERE id = $8`,
        [subsubsession_id || null, subsession_id || null, section_id || null, label, icon || 'FileText', icon_color || '#64748b', template, id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating menu page:", err);
      res.status(500).json({ error: "Failed to update menu page", details: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/fix-kpis-move", async (req, res) => {
    try {
      await pool.query(
        `UPDATE menu_pages 
         SET subsubsession_id = NULL, 
             subsession_id = 'squad-able'
         WHERE id = 'kpis-squad'`
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.delete("/api/menu/pages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM menu_pages WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting menu page:", err);
      res.status(500).json({ error: "Failed to delete menu page" });
    }
  });

  app.post("/api/menu/sections", async (req, res) => {
    try {
      const { id, title, icon, icon_color } = req.body;
      await pool.query(
        "INSERT INTO menu_sections (id, title, icon, icon_color, order_index) VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(order_index) + 1, 0) FROM menu_sections))",
        [id, title, icon || 'Folder', icon_color || '#64748b']
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error creating menu section:", err);
      res.status(500).json({ error: "Failed to create menu section" });
    }
  });

  app.post("/api/menu/subsessions", async (req, res) => {
    try {
      const { id, section_id, label, icon, icon_color } = req.body;
      await pool.query(
        "INSERT INTO menu_subsessions (id, section_id, label, icon, icon_color, order_index) VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(MAX(order_index) + 1, 0) FROM menu_subsessions WHERE section_id = $2))",
        [id, section_id, label, icon || 'Folder', icon_color || '#64748b']
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error creating menu subsession:", err);
      res.status(500).json({ error: "Failed to create menu subsession" });
    }
  });

  app.post("/api/menu/subsubsessions", async (req, res) => {
    try {
      const { id, subsession_id, label, icon, icon_color } = req.body;
      await pool.query(
        "INSERT INTO menu_subsubsessions (id, subsession_id, label, icon, icon_color, order_index) VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(MAX(order_index) + 1, 0) FROM menu_subsubsessions WHERE subsession_id = $2))",
        [id, subsession_id, label, icon || 'FolderOpen', icon_color || '#64748b']
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error creating menu subsubsession:", err);
      res.status(500).json({ error: "Failed to create menu subsubsession" });
    }
  });

  app.put("/api/menu/sections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, icon, icon_color } = req.body;
      await pool.query("UPDATE menu_sections SET title = $1, icon = $2, icon_color = $3 WHERE id = $4", [title, icon || 'Folder', icon_color || '#64748b', id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating menu section:", err);
      res.status(500).json({ error: "Failed to update menu section" });
    }
  });

  app.delete("/api/menu/sections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM menu_sections WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting menu section:", err);
      res.status(500).json({ error: "Failed to delete menu section" });
    }
  });

  app.put("/api/menu/subsessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { section_id, label, icon, icon_color } = req.body;
      await pool.query(
        "UPDATE menu_subsessions SET section_id = $1, label = $2, icon = $3, icon_color = $4 WHERE id = $5",
        [section_id, label, icon || 'Folder', icon_color || '#64748b', id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating menu subsession:", err);
      res.status(500).json({ error: "Failed to update menu subsession" });
    }
  });

  app.delete("/api/menu/subsessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM menu_subsessions WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting menu subsession:", err);
      res.status(500).json({ error: "Failed to delete menu subsession" });
    }
  });

  app.put("/api/menu/subsubsessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { subsession_id, label, icon, icon_color } = req.body;
      await pool.query(
        "UPDATE menu_subsubsessions SET subsession_id = $1, label = $2, icon = $3, icon_color = $4 WHERE id = $5",
        [subsession_id, label, icon || 'FolderOpen', icon_color || '#64748b', id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating menu subsubsession:", err);
      res.status(500).json({ error: "Failed to update menu subsubsession" });
    }
  });

  app.delete("/api/menu/subsubsessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM menu_subsubsessions WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting menu subsubsession:", err);
      res.status(500).json({ error: "Failed to delete menu subsubsession" });
    }
  });

  app.post("/api/menu/reorder", async (req, res) => {
    try {
      const { type, items } = req.body; // type: 'sections', 'subsessions', 'subsubsessions', 'pages'
      // items: [{ id: '...', order_index: 0 }, ...]
      
      let tableName = '';
      if (type === 'sections') tableName = 'menu_sections';
      else if (type === 'subsessions') tableName = 'menu_subsessions';
      else if (type === 'subsubsessions') tableName = 'menu_subsubsessions';
      else if (type === 'pages') tableName = 'menu_pages';
      else return res.status(400).json({ error: "Invalid type" });

      // Use a transaction for batch updates
      await pool.query('BEGIN');
      for (const item of items) {
        await pool.query(`UPDATE ${tableName} SET order_index = $1 WHERE id = $2`, [item.order_index, item.id]);
      }
      await pool.query('COMMIT');
      
      res.json({ success: true });
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error("Error reordering menu items:", err);
      res.status(500).json({ error: "Failed to reorder menu items" });
    }
  });

  // Users API
  app.get("/api/users", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM users ORDER BY email ASC");
      res.json(result.rows.map(row => ({
        id: row.id,
        email: row.email,
        name: row.name,
        picture: row.picture,
        role: row.role,
        allowedPages: row.allowed_pages || []
      })));
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/profile/:email", async (req, res) => {
    const { email } = req.params;
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        res.json({
          id: row.id,
          email: row.email,
          name: row.name,
          picture: row.picture,
          role: row.role,
          allowedPages: row.allowed_pages || []
        });
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  app.post("/api/users", async (req, res) => {
    const { email, role, allowedPages, name, picture } = req.body;
    const id = Math.random().toString(36).substring(2, 15);
    try {
      await pool.query(
        "INSERT INTO users (id, email, name, picture, role, allowed_pages) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name), picture = COALESCE(EXCLUDED.picture, users.picture), role = EXCLUDED.role, allowed_pages = EXCLUDED.allowed_pages",
        [id, email, name, picture, role, JSON.stringify(allowedPages || [])]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error adding user:", err);
      res.status(500).json({ error: "Failed to add user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { role, allowedPages, name, picture } = req.body;
    try {
      await pool.query(
        "UPDATE users SET role = $1, allowed_pages = $2, name = COALESCE($3, name), picture = COALESCE($4, picture) WHERE id = $5",
        [role, JSON.stringify(allowedPages || []), name, picture, id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Todos API
  
  app.get("/api/daily-tasks", async (req, res) => {
    try {
      const { date, group, status } = req.query;
      let query = `
        SELECT t.*, p.partner as project_name, p.group as project_group
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE (t.due_date::date = $1::date OR t.due_date IS NULL)
      `;
      const params: any[] = [date];
      
      if (group) {
        params.push(group);
        query += ` AND p.group = $${params.length}`;
      }
      
      if (status) {
        params.push(status);
        query += ` AND t.status = $${params.length}`;
      }
      
      query += ` ORDER BY t.created_at DESC`;
      
      const result = await pool.query(query, params);
      
      // Also fetch subtasks for these tasks
      const tasks = result.rows;
      if (tasks.length > 0) {
        const taskIds = tasks.map(t => t.id);
        const subtasksResult = await pool.query(
          `SELECT * FROM task_subtasks WHERE task_id = ANY($1)`,
          [taskIds]
        );
        const subtasksByTaskId: Record<string, any[]> = {};
        for (const st of subtasksResult.rows) {
          if (!subtasksByTaskId[st.task_id]) subtasksByTaskId[st.task_id] = [];
          subtasksByTaskId[st.task_id].push(st);
        }
        for (const t of tasks) {
          t.subtasks_list = subtasksByTaskId[t.id] || [];
        }
      }
      
      res.json(tasks);
    } catch (err) {
      console.error("Error fetching daily tasks:", err);
      res.status(500).json({ error: "Failed to fetch daily tasks" });
    }
  });

  app.post("/api/task-batches", async (req, res) => {
    const { template_id, client_ids, date, user_id } = req.body;
    try {
      await pool.query('BEGIN');
      
      const batchResult = await pool.query(
        `INSERT INTO task_batches (template_id, date, created_by) VALUES ($1, $2, $3) RETURNING id`,
        [template_id, date, user_id]
      );
      const batchId = batchResult.rows[0].id;
      
      const templateItemsResult = await pool.query(
        `SELECT * FROM task_template_items WHERE template_id = $1 ORDER BY order_index ASC`,
        [template_id]
      );
      const templateItems = templateItemsResult.rows;
      
      for (const projectId of client_ids) {
        await pool.query(
          `INSERT INTO task_batch_clients (batch_id, client_id) VALUES ($1, $2)`,
          [batchId, projectId]
        );
        
        for (const item of templateItems) {
          const taskId = Math.random().toString(36).substring(2, 15);
          await pool.query(
            `INSERT INTO todos (id, title, description, status, created_by, project_id, due_date, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [taskId, item.title, item.description || '', 'pending', user_id, projectId, date]
          );
        }
      }
      
      await pool.query('COMMIT');
      res.json({ success: true, batchId });
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error("Error creating task batch:", err);
      res.status(500).json({ error: "Failed to create task batch" });
    }
  });

  // --- Tasks API ---
  app.get("/api/tasks", async (req, res) => {
    try {
      const { project_id } = req.query;
      let query = "SELECT * FROM todos";
      const params = [];
      if (project_id) {
        query += " WHERE project_id = $1";
        params.push(project_id);
      }
      query += " ORDER BY due_date ASC NULLS LAST, created_at DESC";
      const result = await pool.query(query, params);
      res.json(result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
        dueDate: row.due_date,
        createdBy: row.created_by,
        assignedTo: row.assigned_to,
        project_id: row.project_id,
        priority: row.priority
      })));
    } catch (err) {
      console.error("Error fetching tasks:", err);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    const { id, title, description, status, createdBy, assignedTo, dueDate, project_id, priority, subtasks, page_id } = req.body;
    try {
      const taskId = id || Date.now().toString();
      const finalProjectId = project_id === "" ? null : project_id;
      await pool.query(
        `INSERT INTO todos (id, title, description, status, created_by, assigned_to, due_date, project_id, priority, subtasks, page_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET 
           title = EXCLUDED.title, 
           description = EXCLUDED.description, 
           status = EXCLUDED.status, 
           assigned_to = EXCLUDED.assigned_to,
           due_date = EXCLUDED.due_date,
           project_id = EXCLUDED.project_id,
           priority = EXCLUDED.priority,
           subtasks = EXCLUDED.subtasks,
           page_id = EXCLUDED.page_id`,
        [taskId, title, description, status || 'pending', createdBy, assignedTo, dueDate, finalProjectId, priority || 'Média', JSON.stringify(subtasks || []), page_id]
      );
      
      // Add history if it's a new task (we can check if id was provided, but for simplicity we just log creation if id wasn't provided)
      if (!id) {
        await pool.query(
          `INSERT INTO task_history (task_id, user_id, action, new_value) VALUES ($1, $2, $3, $4)`,
          [taskId, createdBy, 'Tarefa criada', title]
        );
      }
      
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
        return `${dbKey} = $${i + 2}`;
      }).join(', ');
      const values = keys.map(key => updates[key]);
      
      await pool.query(
        `UPDATE todos SET ${setClause} WHERE id = $1`,
        [id, ...values]
      );
      
      // Add history
      if (user_id) {
        if (updates.status && oldTask.status !== updates.status) {
          await pool.query(`INSERT INTO task_history (task_id, user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)`, [id, user_id, 'Status alterado', oldTask.status, updates.status]);
        }
        if (updates.dueDate !== undefined && oldTask.due_date !== updates.dueDate) {
          await pool.query(`INSERT INTO task_history (task_id, user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)`, [id, user_id, 'Data de vencimento alterada', oldTask.due_date, updates.dueDate]);
        }
        if (updates.assignedTo !== undefined && oldTask.assigned_to !== updates.assignedTo) {
          await pool.query(`INSERT INTO task_history (task_id, user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)`, [id, user_id, 'Responsável alterado', oldTask.assigned_to, updates.assignedTo]);
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
        `INSERT INTO task_subtasks (task_id, title, assignee, due_date) VALUES ($1, $2, $3, $4) RETURNING *`,
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
        `UPDATE task_subtasks SET completed = $1, completed_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END WHERE id = $2 RETURNING *`,
        [completed, id]
      );
      
      if (user_id && completed) {
        await pool.query(`INSERT INTO task_history (task_id, user_id, action, new_value) VALUES ($1, $2, $3, $4)`, [result.rows[0].task_id, user_id, 'Subtarefa concluída', result.rows[0].title]);
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
        `INSERT INTO task_templates (name, description, created_by) VALUES ($1, $2, $3) RETURNING id`,
        [name, description, created_by]
      );
      const templateId = tRes.rows[0].id;
      
      if (items && items.length > 0) {
        const idMap = new Map();
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const parentId = item.parent_item_id ? (idMap.get(item.parent_item_id) || item.parent_item_id) : null;
          const iRes = await pool.query(
            `INSERT INTO task_template_items (template_id, title, parent_item_id, assignee, due_days_offset, order_index) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
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
            `INSERT INTO task_template_items (template_id, title, parent_item_id, assignee, due_days_offset, order_index) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
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
            `INSERT INTO todos (id, title, status, created_by, assigned_to, due_date, project_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [taskId, item.title, 'pending', user_id, item.assignee || 'all', dueDate, project_id]
          );
          parentMap.set(item.id, taskId);
          
          await pool.query(
            `INSERT INTO task_history (task_id, user_id, action, new_value) VALUES ($1, $2, $3, $4)`,
            [taskId, user_id, 'Modelo aplicado', templateName]
          );
        } else {
          // It's a subtask
          const parentTaskId = parentMap.get(item.parent_item_id);
          if (parentTaskId) {
            await pool.query(
              `INSERT INTO task_subtasks (task_id, title, assignee, due_date) VALUES ($1, $2, $3, $4)`,
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

app.get("/api/todos", async (req, res) => {
    try {
      const { page_id } = req.query;
      let query = "SELECT * FROM todos";
      const params = [];
      if (page_id) {
        query += " WHERE page_id = $1";
        params.push(page_id);
      }
      query += " ORDER BY created_at DESC";
      const result = await pool.query(query, params);
      res.json(result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
        dueDate: row.due_date,
        createdBy: row.created_by,
        assignedTo: row.assigned_to,
        subtasks: row.subtasks,
        page_id: row.page_id
      })));
    } catch (err) {
      console.error("Error fetching todos:", err);
      res.status(500).json({ error: "Failed to fetch todos" });
    }
  });

  app.post("/api/todos", async (req, res) => {
    const { id, title, description, status, createdBy, assignedTo, createdAt, dueDate, subtasks, page_id } = req.body;
    try {
      await pool.query(
        `INSERT INTO todos (id, title, description, status, created_by, assigned_to, created_at, due_date, subtasks, page_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
         ON CONFLICT (id) DO UPDATE SET 
           title = EXCLUDED.title, 
           description = EXCLUDED.description, 
           status = EXCLUDED.status, 
           assigned_to = EXCLUDED.assigned_to,
           due_date = EXCLUDED.due_date,
           subtasks = EXCLUDED.subtasks,
           page_id = EXCLUDED.page_id`,
        [id, title, description, status, createdBy, assignedTo, createdAt, dueDate, JSON.stringify(subtasks || []), page_id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving todo:", err);
      res.status(500).json({ error: "Failed to save todo" });
    }
  });

  app.post("/api/meetings", async (req, res) => {
    const { id, project_id, title, date, attendees, actions } = req.body;
    try {
      await pool.query(
        `INSERT INTO meetings (id, project_id, title, date, attendees, actions) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (id) DO UPDATE SET 
           title = EXCLUDED.title, 
           date = EXCLUDED.date, 
           attendees = EXCLUDED.attendees,
           actions = EXCLUDED.actions`,
        [id, project_id, title, date, attendees, actions]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving meeting:", err);
      res.status(500).json({ error: "Failed to save meeting" });
    }
  });

  app.get("/api/meetings", async (req, res) => {
    const { project_id } = req.query;
    try {
      const result = await pool.query("SELECT * FROM meetings WHERE project_id = $1 ORDER BY date DESC", [project_id]);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching meetings:", err);
      res.status(500).json({ error: "Failed to fetch meetings" });
    }
  });

  app.delete("/api/todos/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM todos WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting todo:", err);
      res.status(500).json({ error: "Failed to delete todo" });
    }
  });

  // Clients API
  app.get("/api/clients", async (req, res) => {
    try {
      const { crm_status } = req.query;
      let whereClause = "";
      const params = [];

      if (crm_status === 'true') {
        whereClause = "WHERE c.crm_status IS NOT NULL AND c.crm_status != ''";
      }

      const result = await pool.query(`
        SELECT 
          c.*,
          EXISTS(SELECT 1 FROM fin_people fp WHERE fp.grapehub_client_id = c.id) as has_financial_link,
          EXISTS(SELECT 1 FROM projects p WHERE p.active_client_id = c.id) as has_project_link,
          (SELECT p.partner FROM projects p WHERE p.active_client_id = c.id LIMIT 1) as project_name,
          (
            SELECT fm.movement_value 
            FROM fin_movements fm 
            JOIN fin_people fp ON fp.id = fm.fin_people_id 
            WHERE fp.grapehub_client_id = c.id 
            AND fm.type = 1 
            AND fm.category_l1_ext_id = 176790 
            ORDER BY fm.expiration_date DESC 
            LIMIT 1
          ) as monthly_fee,
          (
            SELECT MAX(CURRENT_DATE - fm.expiration_date::date)
            FROM fin_movements fm 
            JOIN fin_people fp ON fp.id = fm.fin_people_id 
            WHERE fp.grapehub_client_id = c.id 
            AND fm.status = 'Atrasado'
          ) as days_in_arrears,
          (
            SELECT SUM(fm.movement_value)
            FROM fin_movements fm
            JOIN fin_people fp ON fp.id = fm.fin_people_id
            WHERE fp.grapehub_client_id = c.id
            AND fm.status = 'Conciliado'
            AND fm.type = 1
            AND EXTRACT(MONTH FROM fm.expiration_date) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM fm.expiration_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          ) as paid_this_month,
          (
            SELECT json_agg(json_build_object('date', fm.expiration_date, 'status', fm.status))
            FROM (
              SELECT fm2.expiration_date, fm2.status
              FROM fin_movements fm2
              JOIN fin_people fp2 ON fp2.id = fm2.fin_people_id
              WHERE fp2.grapehub_client_id = c.id
              AND fm2.type = 1
              AND fm2.category_l1_ext_id = 176790
              ORDER BY fm2.expiration_date DESC
              LIMIT 6
            ) fm
          ) as payment_history
        FROM clients c 
        ${whereClause}
        ORDER BY c.name ASC
      `, params);
      
      const clients = result.rows.map(row => {
        let recurringDelay = false;
        if (row.payment_history && row.payment_history.length >= 2) {
          const history = row.payment_history.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
          let consecutiveDelays = 0;
          for (const payment of history) {
            if (payment.status === 'Atrasado') {
              consecutiveDelays++;
              if (consecutiveDelays >= 2) {
                recurringDelay = true;
                break;
              }
            } else {
              consecutiveDelays = 0;
            }
          }
        }

        return {
          id: row.id,
          name: row.name,
          email: row.email,
          phone: row.phone,
          status: row.status,
          startDate: row.start_date,
          location: row.location,
          squad: row.squad,
          tags: row.tags,
          contracts: row.contracts,
          createdAt: row.created_at,
          hasFinancialLink: row.has_financial_link,
          hasProjectLink: row.has_project_link,
          projectName: row.project_name,
          crmStatus: row.crm_status,
          monthlyFee: row.monthly_fee,
          daysInArrears: row.days_in_arrears,
          paidThisMonth: row.paid_this_month,
          paymentHistory: row.payment_history,
          recurringDelay: recurringDelay,
          aviso_previo_date: row.aviso_previo_date
        };
      });
      res.json(clients);
    } catch (err) {
      console.error("Error fetching clients:", err);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.post("/api/optimizations", async (req, res) => {
    const { id, product_id, author, authorPhoto, role, date, time, message, is_internal, images } = req.body;
    try {
      await pool.query(
        "INSERT INTO optimizations (id, product_id, author, author_photo, role, date, time, message, is_internal, images) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [id, product_id, author, authorPhoto, role, date, time, message, is_internal, images]
      );
      res.status(201).json({ message: "Optimization saved" });
    } catch (err) {
      console.error("Error saving optimization:", err);
      res.status(500).json({ error: "Failed to save optimization" });
    }
  });

  app.get("/api/products/:productId/optimizations", async (req, res) => {
    const { productId } = req.params;
    try {
      const result = await pool.query("SELECT * FROM optimizations WHERE product_id = $1 ORDER BY date DESC", [productId]);
      res.json(result.rows.map(row => ({
        id: row.id,
        author: row.author,
        authorPhoto: row.author_photo,
        role: row.role,
        date: row.date,
        time: row.time,
        message: row.message,
        isInternal: row.is_internal,
        images: row.images
      })));
    } catch (err) {
      console.error("Error fetching optimizations:", err);
      res.status(500).json({ error: "Failed to fetch optimizations" });
    }
  });

  app.post("/api/crm/sync-inadimplentes", async (req, res) => {
    try {
      const clientsResult = await pool.query(`SELECT id, crm_status FROM clients`);
      const clients = clientsResult.rows;

      const atrasadosResult = await pool.query(`
        SELECT 
          c.id as client_id,
          MAX(CURRENT_DATE - fm.expiration_date::date) as days_in_arrears
        FROM clients c
        JOIN fin_people fp ON fp.grapehub_client_id = c.id
        JOIN fin_movements fm ON fm.fin_people_id = fp.id
        WHERE fm.source = 'bills_to_receive' AND fm.status = 'Atrasado'
        GROUP BY c.id
      `);
      
      const atrasadosMap = new Map(atrasadosResult.rows.map(r => [r.client_id, r.days_in_arrears]));

      let added = 0;
      let moved = 0;
      let removed = 0;

      const manualStatuses = ['negociacao', 'aviso_30_dias', 'pedido_finalizacao', 'processo_saida', 'arquivado'];

      for (const client of clients) {
        const { id, crm_status } = client;
        const isManual = crm_status && manualStatuses.includes(crm_status);
        
        if (isManual) continue;

        const daysInArrears = atrasadosMap.get(id);

        if (daysInArrears !== undefined) {
          let newStatus = null;
          if (daysInArrears >= 1 && daysInArrears <= 10) {
            newStatus = 'inadimplente_marvee';
          } else if (daysInArrears >= 11 && daysInArrears <= 20) {
            newStatus = 'inadimplente_grape';
          } else if (daysInArrears > 20) {
            if (crm_status === 'inadimplente_marvee' || crm_status === 'inadimplente_grape') {
              newStatus = crm_status;
            } else {
              newStatus = 'inadimplente_grape';
            }
          }

          if (newStatus && newStatus !== crm_status) {
            await pool.query(`UPDATE clients SET crm_status = $1 WHERE id = $2`, [newStatus, id]);
            if (!crm_status) added++;
            else moved++;
          }
        } else {
          if (crm_status === 'inadimplente_marvee' || crm_status === 'inadimplente_grape') {
            await pool.query(`UPDATE clients SET crm_status = NULL WHERE id = $1`, [id]);
            removed++;
          }
        }
      }

      res.json({ added, moved, removed });
    } catch (err) {
      console.error("Error syncing inadimplentes:", err);
      res.status(500).json({ error: "Failed to sync inadimplentes" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    const clients = req.body;
    if (!Array.isArray(clients)) {
      return res.status(400).json({ error: "Expected an array of clients" });
    }

    try {
      await pool.query("BEGIN");
      for (const c of clients) {
        await pool.query(
          `INSERT INTO clients (id, name, email, phone, status, start_date, location, squad, tags, contracts, crm_status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             phone = EXCLUDED.phone,
             status = EXCLUDED.status,
             start_date = EXCLUDED.start_date,
             location = EXCLUDED.location,
             squad = EXCLUDED.squad,
             tags = EXCLUDED.tags,
             contracts = EXCLUDED.contracts,
             crm_status = EXCLUDED.crm_status`,
          [c.id, c.name, c.email, c.phone, c.status, c.startDate, c.location, c.squad, c.tags, c.contracts, c.crmStatus]
        );
      }
      await pool.query("COMMIT");
      res.json({ status: "success" });
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error("Error saving clients:", err);
      res.status(500).json({ error: "Failed to save clients" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM clients WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting client:", err);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    const { id } = req.params;
    const { crm_status, status, aviso_previo_date } = req.body;
    try {
      console.log(`[CLIENT PATCH] ID: ${id}, Body:`, req.body);
      // Check if crm_status is changing to 'processo_saida'
      if (crm_status === 'processo_saida') {
        const currentClient = await pool.query("SELECT crm_status FROM clients WHERE id = $1", [id]);
        if (currentClient.rows.length > 0 && currentClient.rows[0].crm_status !== 'processo_saida') {
          console.log(`[CLIENT PATCH] Generating checklist for ${id}`);
          // It's entering 'processo_saida', generate checklist from template
          const templateItems = await pool.query("SELECT item FROM crm_checklist_template WHERE active = TRUE ORDER BY order_index ASC");
          
          if (templateItems.rows.length > 0) {
            // Check if checklist already exists to avoid duplicates
            const existingChecklist = await pool.query("SELECT id FROM crm_checklist WHERE client_id = $1", [id]);
            if (existingChecklist.rows.length === 0) {
              const insertQuery = `
                INSERT INTO crm_checklist (client_id, item)
                VALUES ${templateItems.rows.map((_, i) => `($1, $${i + 2})`).join(', ')}
              `;
              const values = [id, ...templateItems.rows.map(row => row.item)];
              await pool.query(insertQuery, values);
            }
          }
        }
      }

      const updates = [];
      const values = [];
      let i = 1;

      if (crm_status !== undefined) {
        updates.push(`crm_status = $${i++}`);
        values.push(crm_status);
      }
      if (status !== undefined) {
        updates.push(`status = $${i++}`);
        values.push(status);
      }
      if (aviso_previo_date !== undefined) {
        updates.push(`aviso_previo_date = $${i++}`);
        values.push(aviso_previo_date);
        console.log(`[CLIENT PATCH] Updating aviso_previo_date to: ${aviso_previo_date}`);
      }

      if (updates.length > 0) {
        values.push(id);
        const query = `UPDATE clients SET ${updates.join(', ')} WHERE id = $${i}`;
        console.log(`[CLIENT PATCH] Executing query: ${query} params:`, values);
        await pool.query(query, values);
        console.log(`[CLIENT PATCH] Successfully updated client ${id}`);
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error("[CLIENT PATCH ERROR] Error updating client:", err);
      res.status(500).json({ error: "Failed to update client", details: String(err) });
    }
  });

  // --- CRM Exit Data Endpoints ---
  app.post("/api/crm-exit-data", async (req, res) => {
    const { client_id, how_it_went, exit_reasons, project_result, client_relationship, notes, archived_by } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO crm_exit_data (client_id, how_it_went, exit_reasons, project_result, client_relationship, notes, archived_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [client_id, how_it_went, exit_reasons, project_result, client_relationship, notes, archived_by]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error saving exit data:", err);
      res.status(500).json({ error: "Failed to save exit data" });
    }
  });

  app.get("/api/crm-exit-data", async (req, res) => {
    const { client_id } = req.query;
    try {
      let query = "SELECT * FROM crm_exit_data";
      const params: any[] = [];
      if (client_id) {
        query += " WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1";
        params.push(client_id);
      } else {
        query += " ORDER BY created_at DESC";
      }
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching exit data:", err);
      res.status(500).json({ error: "Failed to fetch exit data" });
    }
  });

  // --- CRM Checklist Template Endpoints ---
  app.get("/api/crm-checklist-template", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM crm_checklist_template ORDER BY order_index ASC");
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching checklist template:", err);
      res.status(500).json({ error: "Failed to fetch checklist template" });
    }
  });

  app.post("/api/crm-checklist-template", async (req, res) => {
    const { item, order_index } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO crm_checklist_template (item, order_index) VALUES ($1, $2) RETURNING *",
        [item, order_index]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error adding checklist template item:", err);
      res.status(500).json({ error: "Failed to add checklist template item" });
    }
  });

  app.patch("/api/crm-checklist-template/:id", async (req, res) => {
    const { id } = req.params;
    const { item, order_index, active } = req.body;
    try {
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (item !== undefined) {
        updates.push(`item = $${paramCount}`);
        values.push(item);
        paramCount++;
      }
      if (order_index !== undefined) {
        updates.push(`order_index = $${paramCount}`);
        values.push(order_index);
        paramCount++;
      }
      if (active !== undefined) {
        updates.push(`active = $${paramCount}`);
        values.push(active);
        paramCount++;
      }

      if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });

      values.push(id);
      const query = `UPDATE crm_checklist_template SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      const result = await pool.query(query, values);
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating checklist template item:", err);
      res.status(500).json({ error: "Failed to update checklist template item" });
    }
  });

  app.delete("/api/crm-checklist-template/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM crm_checklist_template WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting checklist template item:", err);
      res.status(500).json({ error: "Failed to delete checklist template item" });
    }
  });

  // --- CRM Comments Endpoints ---
  app.get("/api/crm-comments", async (req, res) => {
    const { client_id } = req.query;
    if (!client_id) {
      return res.status(400).json({ error: "client_id is required" });
    }
    try {
      const result = await pool.query(
        `SELECT c.*, u.email as user_email, u.name as user_name, u.picture as user_picture, u.role as user_role
         FROM crm_comments c 
         LEFT JOIN users u ON c.user_id = u.email 
         WHERE c.client_id = $1 
         ORDER BY c.created_at DESC`,
        [client_id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching crm_comments:", err);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/crm-comments", async (req, res) => {
    const { client_id, user_id, type, content, images } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO crm_comments (client_id, user_id, type, content, images) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [client_id, user_id, type, content, images || []]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating crm_comment:", err);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // --- CRM Checklist Endpoints ---
  app.get("/api/crm-checklist", async (req, res) => {
    const { client_id } = req.query;
    if (!client_id) {
      return res.status(400).json({ error: "client_id is required" });
    }
    try {
      const result = await pool.query(
        "SELECT * FROM crm_checklist WHERE client_id = $1 ORDER BY id ASC",
        [client_id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching crm_checklist:", err);
      res.status(500).json({ error: "Failed to fetch checklist" });
    }
  });

  app.post("/api/crm-checklist", async (req, res) => {
    const { client_id, item } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO crm_checklist (client_id, item) VALUES ($1, $2) RETURNING *",
        [client_id, item]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating crm_checklist item:", err);
      res.status(500).json({ error: "Failed to create checklist item" });
    }
  });

  app.patch("/api/crm-checklist/:id", async (req, res) => {
    const { id } = req.params;
    const { completed, completed_by, completed_at } = req.body;
    try {
      const result = await pool.query(
        "UPDATE crm_checklist SET completed = $1, completed_by = $2, completed_at = $3 WHERE id = $4 RETURNING *",
        [completed, completed_by, completed_at, id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating crm_checklist item:", err);
      res.status(500).json({ error: "Failed to update checklist item" });
    }
  });
  // ------------------------------

  // Resumo financeiro do mês
  app.get("/api/financeiro/resumo", async (req, res) => {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const fim = new Date(new Date(inicio).getFullYear(), new Date(inicio).getMonth() + 1, 1).toISOString().slice(0, 10);

      const result = await pool.query(`
        WITH movements AS (
          SELECT * FROM fin_movements
          WHERE (movement_date >= $1 AND movement_date < $2)
             OR (expiration_date >= $1 AND expiration_date < $2)
        ),
        conciliados_codes AS (
          SELECT DISTINCT document_code FROM movements 
          WHERE type_column = 'realizado' AND status = 'Conciliado' AND document_code IS NOT NULL
        )
        SELECT
          COALESCE(SUM(CASE WHEN type = 1  AND type_column = 'realizado' THEN value ELSE 0 END), 0) AS caixa_realizado,
          COALESCE(SUM(CASE WHEN type = -1 AND type_column = 'realizado' 
                            AND category_l1_ext_id != 176913 THEN value ELSE 0 END), 0) AS saidas_operacionais,
          COALESCE(SUM(CASE WHEN type = -1 AND type_column = 'realizado' 
                            AND category_l1_ext_id = 176913 THEN value ELSE 0 END), 0) AS distribuicao,
          COALESCE(SUM(CASE WHEN type = 1  AND type_column = 'previsto' 
                            AND (document_code IS NULL OR document_code NOT IN (SELECT document_code FROM conciliados_codes))
                            THEN movement_value ELSE 0 END), 0) AS a_receber,
          COALESCE(SUM(CASE WHEN type = -1 AND type_column = 'previsto' 
                            AND (document_code IS NULL OR document_code NOT IN (SELECT document_code FROM conciliados_codes))
                            THEN movement_value ELSE 0 END), 0) AS despesas_previstas,
          COALESCE(SUM(CASE WHEN type_column = 'realizado' THEN value * type ELSE 0 END), 0) AS saldo_periodo
        FROM movements
      `, [inicio, fim]);

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching financeiro resumo:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Fluxo semanal do mês (agrupado por semana)
  app.get("/api/financeiro/fluxo-diario", async (req, res) => {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const fim = new Date(new Date(inicio).getFullYear(), new Date(inicio).getMonth() + 1, 1).toISOString().slice(0, 10);

      const saldoBase = 70232.04;

      const saldoAnteriorResult = await pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 1 THEN value ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN type = -1 THEN value ELSE 0 END), 0) AS net_anterior
        FROM fin_movements
        WHERE type_column = 'realizado' AND status = 'Conciliado'
          AND COALESCE(movement_date, expiration_date) < $1
      `, [inicio]);

      const saldoAnterior = saldoBase + parseFloat(saldoAnteriorResult.rows[0].net_anterior);

      const result = await pool.query(`
        WITH movements AS (
          SELECT * FROM fin_movements
          WHERE (movement_date >= $1 AND movement_date < $2)
             OR (expiration_date >= $1 AND expiration_date < $2)
        ),
        conciliados_no_mes AS (
          SELECT DISTINCT document_code
          FROM movements
          WHERE type_column = 'realizado' AND status = 'Conciliado' AND document_code IS NOT NULL
        ),
        realizado_diario AS (
          SELECT
            COALESCE(movement_date, expiration_date) AS data_movimento,
            SUM(CASE WHEN type = 1 THEN value ELSE 0 END) AS entradas_realizadas,
            SUM(CASE WHEN type = -1 THEN value ELSE 0 END) AS saidas_realizadas
          FROM movements
          WHERE type_column = 'realizado' AND status = 'Conciliado'
          GROUP BY data_movimento
        ),
        previsto_diario AS (
          SELECT
            expiration_date AS data_movimento,
            SUM(CASE WHEN type = 1 THEN movement_value ELSE 0 END) AS entradas_previstas,
            SUM(CASE WHEN type = -1 THEN movement_value ELSE 0 END) AS saidas_previstas
          FROM movements
          WHERE type_column = 'previsto' AND status IN ('Pendente', 'Vence Hoje')
            AND (document_code IS NULL OR document_code NOT IN (SELECT document_code FROM conciliados_no_mes))
          GROUP BY data_movimento
        )
        SELECT
          TO_CHAR(d.data_movimento, 'DD/MM') AS dia,
          EXTRACT(DAY FROM d.data_movimento) AS dia_numero,
          COALESCE(r.entradas_realizadas, 0) AS entradas_realizadas,
          COALESCE(r.saidas_realizadas, 0) AS saidas_realizadas,
          COALESCE(p.entradas_previstas, 0) AS entradas_previstas,
          COALESCE(p.saidas_previstas, 0) AS saidas_previstas,
          CASE WHEN r.data_movimento IS NOT NULL THEN true ELSE false END as tem_realizado
        FROM (
          SELECT data_movimento FROM realizado_diario
          UNION
          SELECT data_movimento FROM previsto_diario
        ) d
        LEFT JOIN realizado_diario r ON r.data_movimento = d.data_movimento
        LEFT JOIN previsto_diario p ON p.data_movimento = d.data_movimento
        WHERE d.data_movimento >= $1 AND d.data_movimento < $2
        ORDER BY d.data_movimento
      `, [inicio, fim]);

      res.json({
        saldo_anterior: saldoAnterior,
        diario: result.rows
      });
    } catch (err) {
      console.error("Error fetching fluxo diario:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  app.get("/api/financeiro/fluxo-semanal", async (req, res) => {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const fim = new Date(new Date(inicio).getFullYear(), new Date(inicio).getMonth() + 1, 1).toISOString().slice(0, 10);

      const result = await pool.query(`
        SELECT
          CASE 
            WHEN EXTRACT(DAY FROM COALESCE(movement_date, expiration_date)) <= 7  THEN '01-07'
            WHEN EXTRACT(DAY FROM COALESCE(movement_date, expiration_date)) <= 14 THEN '08-14'
            WHEN EXTRACT(DAY FROM COALESCE(movement_date, expiration_date)) <= 21 THEN '15-21'
            ELSE '22-30'
          END AS semana,
          COALESCE(SUM(CASE WHEN type = 1  AND type_column = 'realizado' THEN movement_value ELSE 0 END), 0) AS entradas_realizadas,
          COALESCE(SUM(CASE WHEN type = 1  AND type_column = 'previsto'  THEN movement_value ELSE 0 END), 0) AS entradas_previstas,
          COALESCE(SUM(CASE WHEN type = -1 THEN movement_value ELSE 0 END), 0) AS saidas
        FROM fin_movements
        WHERE (movement_date >= $1 AND movement_date < $2)
           OR (expiration_date >= $1 AND expiration_date < $2)
        GROUP BY semana
        ORDER BY semana
      `, [inicio, fim]);

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching fluxo semanal:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Clientes recentes (últimos pagamentos do mês)
  app.get("/api/financeiro/clientes-recentes", async (req, res) => {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const fim = new Date(new Date(inicio).getFullYear(), new Date(inicio).getMonth() + 1, 1).toISOString().slice(0, 10);

      const result = await pool.query(`
        SELECT
          fp.name,
          fp.fantasy_name,
          fm.movement_value AS valor,
          fm.payment_method,
          fm.status,
          fm.installment_number,
          fm.movement_date
        FROM fin_movements fm
        LEFT JOIN fin_people fp ON fp.id = fm.fin_people_id
        WHERE fm.type = 1
          AND fm.category_l1_ext_id = 176790
          AND ((fm.movement_date >= $1 AND fm.movement_date < $2)
            OR (fm.expiration_date >= $1 AND fm.expiration_date < $2))
        ORDER BY COALESCE(fm.movement_date, fm.expiration_date) DESC
        LIMIT 10
      `, [inicio, fim]);

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching clientes recentes:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Inadimplentes
  app.get("/api/financeiro/inadimplentes", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          fp.name,
          fp.fantasy_name,
          fm.movement_value AS valor,
          fm.payment_method,
          fm.description,
          fm.installment_number,
          fm.expiration_date,
          CURRENT_DATE - fm.expiration_date::date AS dias_atraso
        FROM fin_movements fm
        LEFT JOIN fin_people fp ON fp.id = fm.fin_people_id
        WHERE fm.status = 'Atrasado'
          AND fm.type = 1
        ORDER BY dias_atraso DESC
      `);

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching inadimplentes:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Previsto no mês
  app.get("/api/financeiro/previsto", async (req, res) => {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const fim = new Date(new Date(inicio).getFullYear(), new Date(inicio).getMonth() + 1, 1).toISOString().slice(0, 10);

      const result = await pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 1  THEN movement_value ELSE 0 END), 0) AS entradas_previstas,
          COALESCE(SUM(CASE WHEN type = -1 THEN movement_value ELSE 0 END), 0) AS despesas_previstas,
          COALESCE(SUM(movement_value * type), 0) AS saldo_projetado
        FROM fin_movements
        WHERE type_column = 'previsto'
          AND status IN ('Pendente', 'Vence Hoje')
          AND expiration_date >= $1 AND expiration_date < $2
      `, [inicio, fim]);

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error fetching previsto:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Despesas do mês (source = 'bills_to_pay')
  app.get("/api/financeiro/despesas", async (req, res) => {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const fim = new Date(new Date(inicio).getFullYear(), new Date(inicio).getMonth() + 1, 1).toISOString().slice(0, 10);

      const result = await pool.query(`
        SELECT
          fm.description,
          fm.movement_value,
          fm.value,
          fm.movement_date,
          fm.expiration_date,
          fm.status,
          fm.type_column,
          fm.category_l1_ext_id,
          fm.category_l2_ext_id,
          fm.category_l3_ext_id,
          fm.payment_method,
          fm.document_code
        FROM fin_movements fm
        WHERE fm.source = 'bills_to_pay'
          AND ((fm.movement_date >= $1 AND fm.movement_date < $2)
            OR (fm.expiration_date >= $1 AND expiration_date < $2))
        ORDER BY COALESCE(fm.movement_date, fm.expiration_date) DESC
      `, [inicio, fim]);

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching financeiro despesas:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Receitas do mês (source = 'bills_to_receive')
  app.get("/api/financeiro/receitas", async (req, res) => {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const fim = new Date(new Date(inicio).getFullYear(), new Date(inicio).getMonth() + 1, 1).toISOString().slice(0, 10);

      const result = await pool.query(`
        SELECT
          fm.description,
          fm.movement_value,
          fm.value,
          fm.movement_date,
          fm.expiration_date,
          fm.status,
          fm.type_column,
          fm.category_l1_ext_id,
          fm.category_l2_ext_id,
          fm.category_l3_ext_id,
          fm.payment_method,
          fm.document_code
        FROM fin_movements fm
        WHERE fm.source = 'bills_to_receive'
          AND ((fm.movement_date >= $1 AND fm.movement_date < $2)
            OR (fm.expiration_date >= $1 AND expiration_date < $2))
        ORDER BY COALESCE(fm.movement_date, fm.expiration_date) DESC
      `, [inicio, fim]);

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching financeiro receitas:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // GET /api/fin-people - retorna todos os registros de fin_people onde is_client = true
  app.get("/api/fin-people", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT id, name, cnpjcpf, grapehub_client_id 
        FROM fin_people 
        WHERE is_client = true 
        ORDER BY name ASC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching fin_people:", err);
      res.status(500).json({ error: "Failed to fetch financial people" });
    }
  });

  // PATCH /api/fin-people/:id - atualiza o campo grapehub_client_id na tabela fin_people
  app.patch("/api/fin-people/:id", async (req, res) => {
    const { id } = req.params;
    const { grapehub_client_id } = req.body;

    try {
      // Se estamos vinculando a um novo cliente, primeiro desvinculamos o cliente de qualquer outra pessoa
      if (grapehub_client_id) {
        await pool.query(
          "UPDATE fin_people SET grapehub_client_id = NULL WHERE grapehub_client_id = $1",
          [grapehub_client_id]
        );
      }

      const result = await pool.query(
        "UPDATE fin_people SET grapehub_client_id = $1 WHERE id = $2 RETURNING *",
        [grapehub_client_id, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Person not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating fin_people:", err);
      res.status(500).json({ error: "Failed to update financial link" });
    }
  });

  // GET /api/fin-people/:id/movements - retorna o histórico financeiro de uma pessoa
  app.get("/api/fin-people/:id/movements", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(`
        SELECT 
          description,
          movement_value,
          value,
          movement_date,
          expiration_date,
          status,
          type_column,
          payment_method
        FROM fin_movements
        WHERE fin_people_id = $1 AND source = 'bills_to_receive'
        ORDER BY COALESCE(movement_date, expiration_date) DESC
      `, [id]);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching fin_people movements:", err);
      res.status(500).json({ error: "Failed to fetch movements" });
    }
  });

  // CRM Comercial Endpoints
  app.get("/api/crm-comercial/kanbans", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM crm_comercial_kanbans ORDER BY created_at ASC");
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching kanbans:", err);
      res.status(500).json({ error: "Failed to fetch kanbans" });
    }
  });

  app.post("/api/crm-comercial/kanbans", async (req, res) => {
    try {
      const { nome, descricao, cor } = req.body;
      const result = await pool.query(
        `INSERT INTO crm_comercial_kanbans (nome, descricao, cor) 
         VALUES ($1, $2, $3) RETURNING *`,
        [nome, descricao, cor || 'blue']
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating kanban:", err);
      res.status(500).json({ error: "Failed to create kanban" });
    }
  });

  app.delete("/api/crm-comercial/kanbans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // Check if default
      const kanbanRes = await pool.query("SELECT is_default FROM crm_comercial_kanbans WHERE id = $1", [id]);
      if (kanbanRes.rows.length > 0 && kanbanRes.rows[0].is_default) {
        return res.status(400).json({ error: "Cannot delete default kanban" });
      }
      
      // Get all leads for this kanban
      const leadsRes = await pool.query("SELECT id FROM crm_comercial_leads WHERE kanban_id = $1", [id]);
      const leadIds = leadsRes.rows.map(row => row.id);
      
      if (leadIds.length > 0) {
        // Delete history and comments for these leads
        await pool.query("DELETE FROM crm_comercial_history WHERE lead_id = ANY($1)", [leadIds]);
        await pool.query("DELETE FROM crm_comercial_comments WHERE lead_id = ANY($1)", [leadIds]);
      }
      
      // Delete associated leads
      await pool.query("DELETE FROM crm_comercial_leads WHERE kanban_id = $1", [id]);
      // Delete associated columns
      await pool.query("DELETE FROM crm_comercial_columns WHERE kanban_id = $1", [id]);
      // Delete kanban
      await pool.query("DELETE FROM crm_comercial_kanbans WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting kanban:", err);
      res.status(500).json({ error: "Failed to delete kanban" });
    }
  });

  app.get("/api/crm-comercial/columns", async (req, res) => {
    try {
      const { kanban_id } = req.query;
      if (!kanban_id) {
        return res.status(400).json({ error: "kanban_id is required" });
      }
      const result = await pool.query("SELECT * FROM crm_comercial_columns WHERE kanban_id = $1 ORDER BY order_index ASC", [kanban_id]);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching columns:", err);
      res.status(500).json({ error: "Failed to fetch columns" });
    }
  });

  app.post("/api/crm-comercial/columns", async (req, res) => {
    try {
      const { kanban_id, title, color, order_index } = req.body;
      const result = await pool.query(
        `INSERT INTO crm_comercial_columns (kanban_id, title, color, order_index) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [kanban_id, title, color || 'orange', order_index || 0]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating column:", err);
      res.status(500).json({ error: "Failed to create column" });
    }
  });

  app.get("/api/crm-comercial/leads", async (req, res) => {
    try {
      const { search, kanban_id } = req.query;
      let query = "SELECT * FROM crm_comercial_leads WHERE 1=1";
      const params = [];
      let paramIdx = 1;
      
      if (kanban_id) {
        query += ` AND kanban_id = $${paramIdx}`;
        params.push(kanban_id);
        paramIdx++;
      }

      if (search) {
        query += ` AND (nome ILIKE $${paramIdx} OR telefone ILIKE $${paramIdx})`;
        params.push(`%${search}%`);
        paramIdx++;
      }
      
      query += " ORDER BY created_at DESC";
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching leads:", err);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.post("/api/crm-comercial/leads", async (req, res) => {
    try {
      const { nome, telefone, origem, responsavel_id, valor, observacoes, kanban_id } = req.body;
      const result = await pool.query(
        `INSERT INTO crm_comercial_leads (nome, telefone, origem, responsavel_id, valor, observacoes, kanban_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [nome, telefone, origem || 'Outro', responsavel_id, valor || 0, observacoes, kanban_id]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating lead:", err);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  app.patch("/api/crm-comercial/leads/:id", async (req, res) => {
    console.log(`[PATCH] Received request for lead ID: ${req.params.id}`);
    console.log(`[PATCH] Request body:`, req.body);
    try {
      const { id } = req.params;
      const { coluna, valor, responsavel_id, moved_by } = req.body;
      
      const currentResult = await pool.query("SELECT coluna FROM crm_comercial_leads WHERE id = $1", [id]);
      if (currentResult.rows.length === 0) {
        console.log(`[PATCH] Lead not found: ${id}`);
        return res.status(404).json({ error: "Lead not found" });
      }
      
      const currentColuna = currentResult.rows[0].coluna;
      
      const updates = [];
      const params = [];
      let paramIdx = 1;
      
      if (coluna !== undefined) {
        updates.push(`coluna = $${paramIdx++}`);
        params.push(coluna);
      }
      if (valor !== undefined) {
        updates.push(`valor = $${paramIdx++}`);
        params.push(valor);
      }
      if (responsavel_id !== undefined) {
        updates.push(`responsavel_id = $${paramIdx++}`);
        params.push(responsavel_id);
      }
      
      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        params.push(id);
        console.log(`[PATCH] Updating lead ${id} with params:`, params);
        const result = await pool.query(
          `UPDATE crm_comercial_leads SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
          params
        );
        
        if (coluna !== undefined && coluna !== currentColuna) {
          await pool.query(
            `INSERT INTO crm_comercial_history (lead_id, from_coluna, to_coluna, moved_by) VALUES ($1, $2, $3, $4)`,
            [id, currentColuna, coluna, moved_by || 'Sistema']
          );
        }
        
        res.json(result.rows[0]);
      } else {
        res.json({ message: "No updates provided" });
      }
    } catch (err) {
      console.error("Error updating lead:", err);
      res.status(500).json({ error: "Failed to update lead", details: err instanceof Error ? err.message : String(err) });
    }
  });

  app.delete("/api/crm-comercial/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM crm_comercial_leads WHERE id = $1", [id]);
      res.json({ message: "Lead deleted" });
    } catch (err) {
      console.error("Error deleting lead:", err);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  app.post("/api/crm-comercial/webhook", async (req, res) => {
    try {
      const { nome, telefone, origem, responsavel_id, valor } = req.body;
      if (!nome) return res.status(400).json({ error: "Nome is required" });
      
      const result = await pool.query(
        `INSERT INTO crm_comercial_leads (nome, telefone, origem, responsavel_id, valor, coluna) 
         VALUES ($1, $2, $3, $4, $5, 'follow_up_1') RETURNING *`,
        [nome, telefone, origem || 'Outro', responsavel_id, valor || 0]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error in webhook:", err);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.get("/api/crm-comercial/comments", async (req, res) => {
    try {
      const { lead_id } = req.query;
      const result = await pool.query(
        "SELECT * FROM crm_comercial_comments WHERE lead_id = $1 ORDER BY created_at ASC",
        [lead_id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching comments:", err);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/crm-comercial/comments", async (req, res) => {
    try {
      const { lead_id, user_id, user_name, user_avatar, content, is_internal } = req.body;
      const result = await pool.query(
        `INSERT INTO crm_comercial_comments (lead_id, user_id, user_name, user_avatar, content, is_internal) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [lead_id, user_id, user_name, user_avatar, content, is_internal || false]
      );
      
      await pool.query(
        "UPDATE crm_comercial_leads SET comment_count = comment_count + 1 WHERE id = $1",
        [lead_id]
      );
      
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error adding comment:", err);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  app.delete("/api/crm-comercial/comments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const commentRes = await pool.query("SELECT lead_id FROM crm_comercial_comments WHERE id = $1", [id]);
      if (commentRes.rows.length > 0) {
        const lead_id = commentRes.rows[0].lead_id;
        await pool.query("DELETE FROM crm_comercial_comments WHERE id = $1", [id]);
        await pool.query(
          "UPDATE crm_comercial_leads SET comment_count = GREATEST(0, comment_count - 1) WHERE id = $1",
          [lead_id]
        );
      }
      res.json({ message: "Comment deleted" });
    } catch (err) {
      console.error("Error deleting comment:", err);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  app.get("/api/crm-comercial/history", async (req, res) => {
    try {
      const { lead_id } = req.query;
      const result = await pool.query(
        "SELECT * FROM crm_comercial_history WHERE lead_id = $1 ORDER BY created_at DESC",
        [lead_id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching history:", err);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // Vite middleware for development
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    try {
      console.log("Loading Vite middleware for development...");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite not found, falling back to static serving");
      setupStaticServing(app);
    }
  } else {
    console.log("Starting in PRODUCTION mode...");
    setupStaticServing(app);
  }

  const portNum = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
  const server = app.listen(portNum, "0.0.0.0", () => {
    const addr = server.address();
    const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr?.port;
    console.log(`>>> SERVER STARTED SUCCESS! <<<`);
    console.log(`Listening on ${bind}`);
    console.log(`Env: ${process.env.NODE_ENV}`);
    console.log(`CWD: ${process.cwd()}`);
    console.log(`__dirname: ${__dirname}`);
  });
}

function setupStaticServing(app: any) {
  // Since server.js is now inside the dist folder, the static files are in the same folder
  const distPath = __dirname;
  
  console.log(`[STATIC] Serving from: ${distPath}`);
  
  if (fs.existsSync(path.join(distPath, "index.html"))) {
    console.log(`[STATIC] index.html found!`);
  } else {
    console.error(`[STATIC] ERROR: index.html NOT found in ${distPath}`);
  }
  
  app.use(express.static(distPath));
  app.get("*all", (req, res) => {
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      // Read index.html and inject environment variables for the frontend
      let html = fs.readFileSync(indexPath, 'utf8');
      
      const config = {
        FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
        FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
        FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
        FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
        FIREBASE_FIRESTORE_DATABASE_ID: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || process.env.FIREBASE_FIRESTORE_DATABASE_ID || '(default)'
      };

      console.log("[CONFIG] Firebase Variables Check:", {
        apiKey: config.FIREBASE_API_KEY ? "FOUND" : "MISSING",
        authDomain: config.FIREBASE_AUTH_DOMAIN ? "FOUND" : "MISSING",
        projectId: config.FIREBASE_PROJECT_ID ? "FOUND" : "MISSING",
        appId: config.FIREBASE_APP_ID ? "FOUND" : "MISSING"
      });

      const injection = `
        <script>
          window.FIREBASE_CONFIG = ${JSON.stringify(config)};
          // Compatibility fallbacks
          window.FIREBASE_API_KEY = "${config.FIREBASE_API_KEY || ''}";
          window.FIREBASE_AUTH_DOMAIN = "${config.FIREBASE_AUTH_DOMAIN || ''}";
          window.FIREBASE_PROJECT_ID = "${config.FIREBASE_PROJECT_ID || ''}";
          window.FIREBASE_APP_ID = "${config.FIREBASE_APP_ID || ''}";
        </script>
      `;

      // Insert before </head>
      html = html.replace('</head>', `${injection}</head>`);
      
      res.send(html);
    } else {
      res.status(404).send(`Frontend build not found. Searched in: ${distPath}. Please check your deployment.`);
    }
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
});
