// fin_movements (Marvee legado) — não usar.
// Usar fin_movements_asaas para extrato e fin_receivables para cobranças.
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import https from "https";
import pg from "pg";
import dotenv from "dotenv";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";
import { setupCollectionRoutes } from "./src/routes/collection";


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

// ── Asaas API helper (usa https nativo para compatibilidade) ──
function asaasFetch(endpoint: string): Promise<any | null> {
  let key = process.env.ASAAS_API_KEY;
  if (!key) return Promise.resolve(null);
  // Hostinger escapa $ com \ — limpar
  key = key.replace(/\\\$/g, '$');
  return new Promise((resolve) => {
    const req = https.request(`https://api.asaas.com/v3${endpoint}`, {
      method: 'GET',
      headers: { 'access_token': key }
    }, (res) => {
      let data = '';
      res.on('data', (chunk: string) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          console.warn('Asaas API parse error:', data.substring(0, 100));
          resolve(null);
        }
      });
    });
    req.on('error', (err: any) => {
      console.warn('Asaas API network error:', err.message);
      resolve(null);
    });
    req.setTimeout(10000, () => {
      req.destroy();
      console.warn('Asaas API timeout');
      resolve(null);
    });
    req.end();
  });
}

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
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS squad TEXT;

      -- Backfill squad from linked client for existing projects
      UPDATE projects p
      SET squad = c.squad
      FROM clients c
      WHERE p.active_client_id = c.id
        AND p.squad IS NULL
        AND c.squad IS NOT NULL;
      
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

      ALTER TABLE churn ADD COLUMN IF NOT EXISTS comments TEXT;

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
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS product TEXT;

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

      CREATE TABLE IF NOT EXISTS to_do_staff (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'todo',
        tags JSONB DEFAULT '[]',
        assignee TEXT,
        due_date TEXT,
        subtasks JSONB DEFAULT '[]',
        comments JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        done_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS to_do_staff_recurring (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        assignee TEXT,
        tags JSONB DEFAULT '[]',
        frequency TEXT NOT NULL DEFAULT 'semanal',
        day_of_week TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS to_do_staff_ideas (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'nova',
        tags JSONB DEFAULT '[]',
        comments JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crm_comercial_tasks (
        id SERIAL PRIMARY KEY,
        lead_id TEXT,
        title TEXT NOT NULL,
        type VARCHAR(50),
        priority VARCHAR(20),
        due_date TIMESTAMP,
        start_time TIME,
        end_time TIME,
        responsible_id TEXT,
        observations TEXT,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crm_comercial_task_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS crm_comercial_task_template_items (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES crm_comercial_task_templates(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        type VARCHAR(50),
        priority VARCHAR(20),
        due_days_offset INTEGER DEFAULT 0,
        order_index INTEGER DEFAULT 0
      );

      -- Seed CRM Comercial Task Templates
      DO $$
      DECLARE
        template_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO template_count FROM crm_comercial_task_templates;
        IF template_count = 0 THEN
          INSERT INTO crm_comercial_task_templates (name, description) VALUES
            ('Comercial', 'Vendas'),
            ('Pré-vendas 1', 'Pré-vendas 1'),
            ('Pré-vendas 2', 'Pré-vendas 2');
          
          -- Comercial items
          INSERT INTO crm_comercial_task_template_items (template_id, title, type, priority, due_days_offset, order_index) VALUES
            (1, 'DIA 1 - WhatsApp 🔴', 'WhatsApp', 'Urgente', 0, 0),
            (1, 'DIA 1 - Ligação 🔴', 'Ligação', 'Urgente', 0, 1),
            (1, 'Proposta Comercial 📝', 'Tarefa', 'Normal', 1, 2);

          -- Pré-vendas 1 items
          INSERT INTO crm_comercial_task_template_items (template_id, title, type, priority, due_days_offset, order_index) VALUES
            (2, 'Primeiro Contato', 'WhatsApp', 'Normal', 0, 0),
            (2, 'Qualificação', 'Ligação', 'Alta', 1, 1);
        END IF;
      END $$;

      CREATE TABLE IF NOT EXISTS crm_comercial_loss_reasons (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color VARCHAR(20) DEFAULT '#6b7280',
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
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
      ALTER TABLE menu_subsubsessions ADD COLUMN IF NOT EXISTS section_id TEXT REFERENCES menu_sections(id) ON DELETE CASCADE;

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

      -- Migration: Add status/type_column to fin_movements_asaas for Sicredi payment tracking
      ALTER TABLE fin_movements_asaas ADD COLUMN IF NOT EXISTS sicredi_status VARCHAR(30) DEFAULT 'realizado';
      ALTER TABLE fin_movements_asaas ADD COLUMN IF NOT EXISTS billing_month VARCHAR(7);
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

    // Migrations for crm_comercial_history
    await pool.query(`ALTER TABLE crm_comercial_history ADD COLUMN IF NOT EXISTS action_type VARCHAR(50)`);
    await pool.query(`ALTER TABLE crm_comercial_history ADD COLUMN IF NOT EXISTS description TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_history ADD COLUMN IF NOT EXISTS user_name TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_history ADD COLUMN IF NOT EXISTS task_type VARCHAR(50)`);
    
    // Timezone migrations (convert to TIMESTAMPTZ)
    try { await pool.query(`ALTER TABLE crm_comercial_history ALTER COLUMN created_at TYPE TIMESTAMPTZ`); } catch(e) {}
    try { await pool.query(`ALTER TABLE crm_comercial_leads ALTER COLUMN created_at TYPE TIMESTAMPTZ`); } catch(e) {}
    try { await pool.query(`ALTER TABLE crm_comercial_leads ALTER COLUMN updated_at TYPE TIMESTAMPTZ`); } catch(e) {}
    try { await pool.query(`ALTER TABLE crm_comercial_tasks ALTER COLUMN created_at TYPE TIMESTAMPTZ`); } catch(e) {}
    try { await pool.query(`ALTER TABLE crm_comercial_tasks ALTER COLUMN completed_at TYPE TIMESTAMPTZ`); } catch(e) {}
    try { await pool.query(`ALTER TABLE crm_comercial_tasks ALTER COLUMN due_date TYPE TIMESTAMPTZ`); } catch(e) {}

    // Api4Com Settings Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_api4com_settings (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        api4com_token TEXT,
        api4com_domain TEXT,
        sip_extension TEXT,
        sip_password TEXT,
        sip_server TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Webhook Settings Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_webhook_settings (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        form_webhook_url TEXT,
        whatsapp_webhook_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Migrações Inbound Webhooks
    await pool.query(`ALTER TABLE crm_webhook_settings ADD COLUMN IF NOT EXISTS inbound_token TEXT`);
    await pool.query(`ALTER TABLE crm_webhook_settings ADD COLUMN IF NOT EXISTS inbound_kanban_id TEXT`);
    await pool.query(`ALTER TABLE crm_webhook_settings ADD COLUMN IF NOT EXISTS inbound_coluna TEXT`);

    // Migration: add squad column to users if missing
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS squad TEXT`);

    // Ensure missing columns in crm_comercial_leads
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS previsao DATE`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS etapa_updated_at TIMESTAMPTZ DEFAULT NOW()`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS instagram TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS nicho TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS tempo_oab TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS faturamento TEXT`);
    
    // Novas colunas (Editáveis text)
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS reunion_date TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS office_location TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS monthly_closings TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS closing_goal TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS reunion_link TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS form_nome_completo TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS form_nome_fantasia TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS form_telefone_whatsapp TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS form_cep TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS form_cidade TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS form_estado TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS form_cnpj_cpf TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS forma_pagamento TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS is_lost BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS loss_reason_id INTEGER`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS utm_platform TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS utm_set TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS utm_creative TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS utm_position TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS email TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS investimento TEXT`);
    
    // Tabela de Pessoas (Contacts)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_pessoas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        nome TEXT NOT NULL,
        email TEXT,
        telefone TEXT,
        cargo TEXT,
        empresa TEXT,
        responsavel_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    try {
      // Remover duplicatas silenciosas de inserções velhas antes da Constraint entrar
      await pool.query(`
        DELETE FROM crm_pessoas 
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER(PARTITION BY user_id, COALESCE(telefone, '') ORDER BY updated_at DESC) as rnum
            FROM crm_pessoas
          ) t 
          WHERE t.rnum > 1
        )
      `);
      await pool.query(`ALTER TABLE crm_pessoas ADD CONSTRAINT crm_pessoas_unique_phone UNIQUE (user_id, telefone)`);
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
         console.warn('Constraint unique add warning:', e.message);
      }
    }
    
    // Tabela de Empresas (Companies)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_empresas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        nome TEXT NOT NULL,
        site TEXT,
        setor TEXT,
        telefone TEXT,
        email TEXT,
        cidade TEXT,
        responsavel_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // Auto-fix template if user already created page named 'Empresas'
    await pool.query(`UPDATE menu_pages SET template = 'crm-empresas' WHERE LOWER(label) = 'empresas' AND (template IS NULL OR template = 'blank')`);

    // ── Sequências de Cadência ──────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_sequences (
        id SERIAL PRIMARY KEY,
        kanban_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        skip_weekends BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_sequence_steps (
        id SERIAL PRIMARY KEY,
        sequence_id INTEGER REFERENCES crm_sequences(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL DEFAULT 0,
        type TEXT NOT NULL DEFAULT 'Tarefa',
        title TEXT,
        observations TEXT,
        day_offset INTEGER NOT NULL DEFAULT 1
      );
    `);
    // ── Fim Sequências ─────────────────────────────────────────────────────

    // ── Automações ──────────────────────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        active BOOLEAN DEFAULT TRUE,
        runs INTEGER DEFAULT 0,
        last_run_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automation_steps (
        id SERIAL PRIMARY KEY,
        automation_id INTEGER REFERENCES automations(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('trigger', 'condition', 'action')),
        order_index INTEGER NOT NULL DEFAULT 0,
        config JSONB NOT NULL DEFAULT '{}'
      );
    `);
    // ── Fim Automações ──────────────────────────────────────────────────────

    // Tabela de logs de execução de automações
    await pool.query(`
      CREATE TABLE IF NOT EXISTS automation_logs (
        id SERIAL PRIMARY KEY,
        automation_id INTEGER REFERENCES automations(id) ON DELETE CASCADE,
        automation_name TEXT,
        lead_id TEXT,
        lead_nome TEXT,
        event TEXT,
        action_type TEXT,
        status TEXT DEFAULT 'success',
        message TEXT,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Tabela de Metas de Vendas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_metas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL,
        metrica TEXT NOT NULL DEFAULT 'quantidade',
        periodo TEXT NOT NULL DEFAULT 'mensal',
        alvo NUMERIC NOT NULL DEFAULT 10,
        kanban_id TEXT,
        coluna_id TEXT,
        activity_type TEXT,
        responsavel_id TEXT,
        data_inicio DATE,
        data_fim DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Garante que coluna_id e activity_type existem em tabelas já criadas
    await pool.query(`ALTER TABLE crm_metas ADD COLUMN IF NOT EXISTS coluna_id TEXT`);
    await pool.query(`ALTER TABLE crm_metas ADD COLUMN IF NOT EXISTS activity_type TEXT`);
    
    
    // Auto-fix template for Metas page
    await pool.query(`UPDATE menu_pages SET template = 'crm-metas' WHERE LOWER(label) LIKE '%metas%' AND (template IS NULL OR template = 'blank')`);
    // Auto-fix template for Métricas page
    await pool.query(`UPDATE menu_pages SET template = 'crm-metricas' WHERE LOWER(label) LIKE '%métricas%' OR LOWER(label) LIKE '%metricas%'`);
    // Auto-fix template for Dashboard Marketing
    await pool.query(`UPDATE menu_pages SET template = 'marketing-dashboard' WHERE LOWER(label) LIKE '%dashboard marketing%' AND (template IS NULL OR template = 'blank')`);
    // Auto-fix template for Ações (Marketing)
    await pool.query(`UPDATE menu_pages SET template = 'marketing-acoes' WHERE LOWER(label) LIKE '%ações%' AND (template IS NULL OR template = 'blank')`);


    
    // Auto-fix template if user already created page named 'Pessoas'
    await pool.query(`UPDATE menu_pages SET template = 'crm-pessoas' WHERE LOWER(label) = 'pessoas'`);
    
    // Migração: Inserir Pessoas automaticamente a partir dos Leads existentes (basendo-se no telefone único)
    try {
      await pool.query(`
        INSERT INTO crm_pessoas (user_id, nome, email, telefone, responsavel_id)
        SELECT 
          COALESCE(k.user_id, l.responsavel_id, 'admin@dm.com'),
          COALESCE(MAX(l.nome), 'Desconhecido') as nome,
          MAX(l.email) as email,
          l.telefone,
          MAX(l.responsavel_id) as responsavel_id
        FROM crm_comercial_leads l
        JOIN crm_comercial_kanbans k ON k.id = l.kanban_id
        LEFT JOIN crm_pessoas p ON p.telefone = l.telefone AND p.user_id = k.user_id
        WHERE p.id IS NULL AND l.telefone IS NOT NULL AND l.telefone != ''
        GROUP BY k.user_id, l.telefone;
      `);
    } catch (migErr) {
      console.error("Migration error (crm_pessoas):", migErr);
    }
    
    // Inject Ligações Dashboard into menus
    try {
      await pool.query(`
        INSERT INTO menu_pages (id, subsession_id, label, icon, template, order_index)
        VALUES ('crm-ligacoes', 'comercial', 'Ligações', 'Phone', 'ligacoes-dashboard', 3)
        ON CONFLICT (id) DO UPDATE SET template = EXCLUDED.template;
      `);
    } catch(errMenu) {
      console.log('Skipping ligacoes menu injection: ', errMenu.message);
    }

    // Migration: permission to access ligacoes
    await pool.query(`
      UPDATE users 
      SET allowed_pages = allowed_pages || '["crm-ligacoes"]'::jsonb
      WHERE allowed_pages @> '["crm-comercial"]'::jsonb 
      AND NOT allowed_pages @> '["crm-ligacoes"]'::jsonb
    `);

    // Tabela global de tags para o Comercial
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_comercial_tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        color VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Garantia de criação das tabelas de tasks (executadas separadamente para não falhar no bloco grande)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_comercial_tasks (
        id SERIAL PRIMARY KEY,
        lead_id TEXT,
        title TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'Tarefa',
        priority VARCHAR(20) DEFAULT 'Normal',
        due_date TIMESTAMP,
        start_time TIME,
        end_time TIME,
        responsible_id TEXT,
        observations TEXT,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_comercial_notes (
        id SERIAL PRIMARY KEY,
        lead_id TEXT,
        content TEXT,
        user_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_comercial_files (
        id SERIAL PRIMARY KEY,
        lead_id TEXT NOT NULL,
        name TEXT NOT NULL,
        size TEXT,
        url TEXT NOT NULL,
        sender TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_comercial_meetings (
        id SERIAL PRIMARY KEY,
        lead_id TEXT NOT NULL,
        title TEXT NOT NULL,
        meeting_date TIMESTAMP NOT NULL,
        responsible_name TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      ALTER TABLE crm_comercial_meetings 
      ADD COLUMN IF NOT EXISTS office_location TEXT,
      ADD COLUMN IF NOT EXISTS reunion_link TEXT,
      ADD COLUMN IF NOT EXISTS reunion_niche TEXT,
      ADD COLUMN IF NOT EXISTS monthly_closings TEXT,
      ADD COLUMN IF NOT EXISTS closing_goal TEXT;
    `).catch(e => console.error("Error migrating crm_comercial_meetings columns", e));
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_comercial_task_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_comercial_task_template_items (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES crm_comercial_task_templates(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'Tarefa',
        priority VARCHAR(20) DEFAULT 'Normal',
        due_days_offset INTEGER DEFAULT 0,
        order_index INTEGER DEFAULT 0
      )
    `);
    // Seed inicial de templates (só insere se ainda não existir)
    const templateCount = await pool.query("SELECT COUNT(*) FROM crm_comercial_task_templates");
    if (parseInt(templateCount.rows[0].count) === 0) {
      const t1 = await pool.query(
        "INSERT INTO crm_comercial_task_templates (name, description) VALUES ($1, $2) RETURNING id",
        ['Comercial', 'Fluxo de vendas']
      );
      const t2 = await pool.query(
        "INSERT INTO crm_comercial_task_templates (name, description) VALUES ($1, $2) RETURNING id",
        ['Pré-vendas', 'Fluxo de pré-vendas']
      );
      await pool.query(
        `INSERT INTO crm_comercial_task_template_items (template_id, title, type, priority, due_days_offset, order_index) VALUES
         ($1, 'DIA 1 - WhatsApp 🔴', 'WhatsApp', 'Urgente', 0, 0),
         ($1, 'DIA 1 - Ligação 🔴', 'Ligação', 'Urgente', 0, 1),
         ($1, 'Proposta Comercial 📝', 'Tarefa', 'Normal', 1, 2)`,
        [t1.rows[0].id]
      );
      await pool.query(
        `INSERT INTO crm_comercial_task_template_items (template_id, title, type, priority, due_days_offset, order_index) VALUES
         ($1, 'Primeiro Contato', 'WhatsApp', 'Normal', 0, 0),
         ($1, 'Qualificação', 'Ligação', 'Alta', 1, 1)`,
        [t2.rows[0].id]
      );
      console.log('[SEED] CRM task templates criados com sucesso.');
    }

    // Auto-fix: Recuperar leads que perderam o ID da coluna (null ou vazio)
    try {
      await pool.query("ALTER TABLE crm_comercial_columns ADD COLUMN IF NOT EXISTS icon varchar(50) DEFAULT 'LayoutGrid'");
    } catch(err) {
      console.error("Error adding icon column:", err);
    }

    try {
      const leadsToFix = await pool.query("SELECT id, kanban_id FROM crm_comercial_leads WHERE coluna IS NULL OR coluna = ''");
      if (leadsToFix.rows.length > 0) {
        console.log(`[AUTOREPAIR] Found ${leadsToFix.rows.length} leads with corrupted 'coluna'. Attempting to fix...`);
        for (const lead of leadsToFix.rows) {
          const firstColResult = await pool.query(
            "SELECT id FROM crm_comercial_columns WHERE kanban_id = $1 ORDER BY order_index ASC LIMIT 1",
            [lead.kanban_id]
          );
          if (firstColResult.rows.length > 0) {
            await pool.query(
              "UPDATE crm_comercial_leads SET coluna = $1 WHERE id = $2",
              [firstColResult.rows[0].id, lead.id]
            );
          }
        }
        console.log(`[AUTOREPAIR] Leads recovered successfully.`);
      }
    } catch (err) {
      console.error("[AUTOREPAIR] Failed to repair leads:", err);
    }
    // Project Comments Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id TEXT NOT NULL,
        author TEXT NOT NULL,
        author_photo TEXT,
        text TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id)`);

    // ── Hiring / Contratação tables ──────────────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hiring_folders (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        cargo TEXT,
        cols JSONB NOT NULL DEFAULT '[]',
        form_fields JSONB DEFAULT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE hiring_folders ADD COLUMN IF NOT EXISTS form_fields JSONB DEFAULT NULL`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hiring_candidates (
        id SERIAL PRIMARY KEY,
        folder_id INTEGER REFERENCES hiring_folders(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        contato TEXT,
        acao TEXT,
        data_acao DATE,
        col TEXT NOT NULL,
        form_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_hiring_candidates_folder ON hiring_candidates(folder_id)`);

    // Migration
    await pool.query(`
      ALTER TABLE hiring_candidates ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hiring_candidate_notes (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER REFERENCES hiring_candidates(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        user_name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_hiring_candidate_notes_cand ON hiring_candidate_notes(candidate_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hiring_candidate_history (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER REFERENCES hiring_candidates(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        details TEXT,
        user_name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_hiring_candidate_history_cand ON hiring_candidate_history(candidate_id)`);

    // Saboteur results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hiring_saboteur_results (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER REFERENCES hiring_candidates(id) ON DELETE CASCADE,
        saboteur_key TEXT NOT NULL,
        score NUMERIC(4,1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(candidate_id, saboteur_key)
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_hiring_saboteur_cand ON hiring_saboteur_results(candidate_id)`);
    // Migration: score INTEGER → NUMERIC
    await pool.query(`ALTER TABLE hiring_saboteur_results ALTER COLUMN score TYPE NUMERIC(4,1)`);

    // DISC profile results table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hiring_disc_results (
        id SERIAL PRIMARY KEY,
        candidate_id INTEGER REFERENCES hiring_candidates(id) ON DELETE CASCADE UNIQUE,
        d_score NUMERIC(5,1) DEFAULT 0,
        i_score NUMERIC(5,1) DEFAULT 0,
        s_score NUMERIC(5,1) DEFAULT 0,
        c_score NUMERIC(5,1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Hiring documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hiring_documents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Sem título',
        content TEXT DEFAULT '',
        section TEXT DEFAULT '',
        created_by TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE hiring_documents ADD COLUMN IF NOT EXISTS section TEXT DEFAULT '';`);

    // Hiring contracts table (for contract templates / attachments)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hiring_contracts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        file_name TEXT NOT NULL,
        file_data TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        uploaded_by TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Inject Contratação page into sidebar (OPERACIONAL section)
    try {
      await pool.query(`
        INSERT INTO menu_pages (id, section_id, label, icon, template, order_index)
        VALUES ('contratacao', 'operacional', 'Contratação', 'Users', 'contratacao', 10)
        ON CONFLICT (id) DO NOTHING;
      `);
    } catch (e: any) { console.log('Skipping contratacao menu injection:', e.message); }

    // Inject Contas a Pagar page into sidebar (FINANCEIRO section)
    try {
      await pool.query(`
        INSERT INTO menu_pages (id, section_id, label, icon, template, order_index)
        VALUES ('contas-a-pagar', 'financeiro', 'Contas a Pagar', 'FileText', 'contas-a-pagar', 2)
        ON CONFLICT (id) DO NOTHING;
      `);
      // Bump CRM Financeiro order to 3 to keep it after Contas a Pagar
      await pool.query(`UPDATE menu_pages SET order_index = 3 WHERE id = 'crm-financeiro' AND section_id = 'financeiro'`);
    } catch (e: any) { console.log('Skipping contas-a-pagar menu injection:', e.message); }

    // Inject Contas a Receber page into sidebar (FINANCEIRO section)
    try {
      await pool.query(`
        INSERT INTO menu_pages (id, section_id, label, icon, template, order_index)
        VALUES ('contas-a-receber', 'financeiro', 'Contas a Receber', 'ArrowDownLeft', 'contas-a-receber', 3)
        ON CONFLICT (id) DO NOTHING;
      `);
      // Bump CRM Financeiro order to 4
      await pool.query(`UPDATE menu_pages SET order_index = 4 WHERE id = 'crm-financeiro' AND section_id = 'financeiro'`);
    } catch (e: any) { console.log('Skipping contas-a-receber menu injection:', e.message); }

  } catch (err) {
    console.error("Error initializing database tables:", err);
  }

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // ── Project Comments ────────────────────────────────────────────────────────
  app.get('/api/project-comments/:projectId', async (req, res) => {
    try {
      const { projectId } = req.params;
      const result = await pool.query(
        `SELECT id, project_id, author, author_photo, text, is_internal, created_at
         FROM project_comments
         WHERE project_id = $1
         ORDER BY created_at ASC`,
        [projectId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching project comments:', err);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  app.post('/api/project-comments/:projectId', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { author, author_photo, text, is_internal } = req.body;
      if (!author || !text) return res.status(400).json({ error: 'author and text are required' });
      const result = await pool.query(
        `INSERT INTO project_comments (project_id, author, author_photo, text, is_internal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, project_id, author, author_photo, text, is_internal, created_at`,
        [projectId, author, author_photo || null, text, is_internal || false]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error saving project comment:', err);
      res.status(500).json({ error: 'Failed to save comment' });
    }
  });

  app.delete('/api/project-comments/:commentId', async (req, res) => {
    try {
      const { commentId } = req.params;
      await pool.query(`DELETE FROM project_comments WHERE id = $1`, [commentId]);
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting project comment:', err);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });



  // Request Logging Middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
  // ── Motor de Automações ─────────────────────────────────────────────────────
  // Executa todas as automações ativas que correspondem ao evento disparo.
  // Chamada de forma assíncrona (fire-and-forget) para não bloquear a resposta.
  async function runAutomations(event: string, lead: Record<string, any>) {
    try {
      // 1. Carrega automações ativas com trigger = event
      const autoRes = await pool.query(`SELECT * FROM automations WHERE active = TRUE`);
      for (const automation of autoRes.rows) {
        const stepsRes = await pool.query(
          `SELECT * FROM automation_steps WHERE automation_id = $1 ORDER BY order_index ASC`,
          [automation.id]
        );
        const steps = stepsRes.rows.map((s: any) => ({
          ...s,
          // Garante que config seja sempre objeto (JSONB pode vir como string em alguns drivers)
          config: typeof s.config === 'string' ? JSON.parse(s.config) : (s.config || {}),
        }));

        console.log(`[Automação] Verificando "${automation.name}" (${steps.length} passos) para evento "${event}"`);

        // 2. Verifica o trigger
        const triggerStep = steps.find((s: any) => s.type === 'trigger');
        if (!triggerStep) { console.log(`[Automação] "${automation.name}": sem trigger, pulando`); continue; }
        const triggerEvent = triggerStep.config?.event;
        console.log(`[Automação] "${automation.name}": trigger.config.event = "${triggerEvent}", esperado = "${event}"`);
        if (triggerEvent !== event) continue;

        // 3. Avalia condições (se existirem)
        const conditions = steps.filter((s: any) => s.type === 'condition');
        let conditionsPassed = true;
        for (const cond of conditions) {
          const rules = cond.config?.rules || [];
          for (const rule of rules) {
            const field = rule.field;
            const op = rule.op;
            const value = rule.value;
            // Campo especial: Kanban compara kanban_id do lead
            // Campo especial: Etapa do funil compara coluna atual do lead
            const leadVal = field === 'Kanban'
              ? String(lead.kanban_id || '').toLowerCase()
              : field === 'Etapa do funil'
                ? String(lead.coluna || '').toLowerCase()
                : String(lead[field] || lead[field?.toLowerCase()] || '').toLowerCase();
            const ruleVal = String(value || '').toLowerCase();
            console.log(`[Automação] Condição: field="${field}" op="${op}" leadVal="${leadVal}" ruleVal="${ruleVal}"`);
            if (op === 'é' && leadVal !== ruleVal) { conditionsPassed = false; break; }
            if (op === 'mudou para' && leadVal !== ruleVal) { conditionsPassed = false; break; }
            if (op === 'não é' && leadVal === ruleVal) { conditionsPassed = false; break; }
            if (op === 'contém' && !leadVal.includes(ruleVal)) { conditionsPassed = false; break; }
            if (op === 'não contém' && leadVal.includes(ruleVal)) { conditionsPassed = false; break; }
            if (op === 'maior que' && !(Number(leadVal) > Number(ruleVal))) { conditionsPassed = false; break; }
            if (op === 'menor que' && !(Number(leadVal) < Number(ruleVal))) { conditionsPassed = false; break; }
            if (op === 'está preenchido' && !leadVal) { conditionsPassed = false; break; }
            if (op === 'está vazio' && leadVal) { conditionsPassed = false; break; }
          }
          if (!conditionsPassed) break;
        }
        console.log(`[Automação] "${automation.name}": condições ${conditionsPassed ? 'PASSARAM ✓' : 'FALHARAM ✗'}`);
        if (!conditionsPassed) continue;

        // 4. Executa ações em ordem
        const actions = steps.filter((s: any) => s.type === 'action');
        console.log(`[Automação] "${automation.name}": ${actions.length} ação(ões) a executar`);
        for (const action of actions) {
          const cfg = action.config || {};
          const actionType = cfg.action_type;
          const leadId = lead.id;
          console.log(`[Automação] "${automation.name}": executando ação "${actionType}" cfg=`, JSON.stringify(cfg));

          try {
            if (actionType === 'create_task') {
              // Calcula due_date com base em day_offset
              const dayOffset = cfg.day_offset ?? 1;
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + dayOffset);
              await pool.query(
                `INSERT INTO crm_comercial_tasks (lead_id, title, type, due_date, observations, responsible_id)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [leadId, cfg.title || 'Atividade automática', cfg.task_type || 'Ligação',
                 dueDate.toISOString().slice(0, 10), cfg.observations || null, lead.responsavel_id || null]
              );

            } else if (actionType === 'create_note') {
              await pool.query(
                `INSERT INTO crm_comercial_messages (lead_id, content, user_name, created_at)
                 VALUES ($1, $2, $3, NOW())`,
                [leadId, cfg.note || '', 'Automação']
              );

            } else if (actionType === 'add_tag') {
              if (cfg.tag) {
                const currentTags: any = await pool.query(
                  `SELECT tags FROM crm_comercial_leads WHERE id = $1`, [leadId]
                );
                const existingTags: string[] = currentTags.rows[0]?.tags || [];
                if (!existingTags.includes(cfg.tag)) {
                  await pool.query(
                    `UPDATE crm_comercial_leads SET tags = array_append(COALESCE(tags, '{}'), $2) WHERE id = $1`,
                    [leadId, cfg.tag]
                  );
                }
              }

            } else if (actionType === 'assign_responsible') {
              if (cfg.responsible_id) {
                await pool.query(
                  `UPDATE crm_comercial_leads SET responsavel_id = $2 WHERE id = $1`,
                  [leadId, cfg.responsible_id]
                );
              }

            } else if (actionType === 'mark_won') {
              // Move para primeira coluna com "ganho" no título
              const colRes = await pool.query(
                `SELECT id FROM crm_comercial_columns WHERE kanban_id = $1 AND (LOWER(title) LIKE '%ganho%' OR LOWER(title) LIKE '%fechado%') LIMIT 1`,
                [lead.kanban_id]
              );
              if (colRes.rows.length > 0) {
                await pool.query(`UPDATE crm_comercial_leads SET coluna = $2 WHERE id = $1`, [leadId, colRes.rows[0].id]);
              }

            } else if (actionType === 'mark_lost') {
              await pool.query(`UPDATE crm_comercial_leads SET is_lost = TRUE WHERE id = $1`, [leadId]);

            } else if (actionType === 'move_stage') {
              if (cfg.column_id) {
                await pool.query(`UPDATE crm_comercial_leads SET coluna = $2 WHERE id = $1`, [leadId, cfg.column_id]);
              }

            } else if (actionType === 'create_lead') {
              // Duplica o lead em outro kanban/coluna
              if (cfg.kanban_id) {
                await pool.query(
                  `INSERT INTO crm_comercial_leads (nome, telefone, origem, responsavel_id, valor, observacoes, kanban_id, coluna)
                   SELECT nome, telefone, origem, responsavel_id, valor, observacoes, $2, $3 FROM crm_comercial_leads WHERE id = $1`,
                  [leadId, cfg.kanban_id, cfg.column_id || null]
                );
              }

            } else if (actionType === 'duplicate_lead') {
              await pool.query(
                `INSERT INTO crm_comercial_leads (nome, telefone, origem, responsavel_id, valor, observacoes, kanban_id, coluna)
                 SELECT nome, telefone, origem, responsavel_id, valor, observacoes, kanban_id, coluna FROM crm_comercial_leads WHERE id = $1`,
                [leadId]
              );

            } else if (actionType === 'send_webhook') {
              if (cfg.webhook_url) {
                // Fire-and-forget HTTP POST
                fetch(cfg.webhook_url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ event, lead, automation_id: automation.id }),
                }).catch(e => console.error('[Webhook] Failed:', e.message));
              }

            } else if (actionType === 'start_sequence') {
              // Aplica a sequência ao lead (usa a lógica de crm_sequences)
              if (cfg.sequence_id) {
                const seqSteps = await pool.query(
                  `SELECT * FROM crm_sequence_steps WHERE sequence_id = $1 ORDER BY order_index ASC`,
                  [cfg.sequence_id]
                );
                for (const step of seqSteps.rows) {
                  const dueDate = new Date();
                  dueDate.setDate(dueDate.getDate() + (step.day_offset || 1));
                  await pool.query(
                    `INSERT INTO crm_comercial_tasks (lead_id, title, type, due_date, observations)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [leadId, step.title || '', step.type || 'Tarefa', dueDate.toISOString().slice(0, 10), step.observations || null]
                  );
                }
              }

            } else if (actionType === 'clear_open_tasks') {
              // Apaga todas as atividades em aberto (não concluídas) do lead
              const deleted = await pool.query(
                `DELETE FROM crm_comercial_tasks WHERE lead_id = $1 AND completed = FALSE RETURNING id`,
                [leadId]
              );
              console.log(`[Automação] clear_open_tasks: ${deleted.rowCount} atividade(s) removida(s) do lead ${leadId}`);
            }

            console.log(`[Automação] "${automation.name}" → ação "${actionType}" executada para lead ${leadId}`);

            // Log de sucesso na tabela automation_logs
            await pool.query(
              `INSERT INTO automation_logs (automation_id, automation_name, lead_id, lead_nome, event, action_type, status, message)
               VALUES ($1, $2, $3, $4, $5, $6, 'success', $7)`,
              [automation.id, automation.name, leadId, lead.nome || lead.id, event, actionType,
               `Ação "${actionType}" executada com sucesso`]
            ).catch(() => {});

          } catch (actionErr: any) {
            console.error(`[Automação] Erro na ação "${actionType}" para lead ${leadId}:`, actionErr.message);

            // Log de falha na tabela automation_logs
            await pool.query(
              `INSERT INTO automation_logs (automation_id, automation_name, lead_id, lead_nome, event, action_type, status, message)
               VALUES ($1, $2, $3, $4, $5, $6, 'error', $7)`,
              [automation.id, automation.name, leadId, lead.nome || lead.id, event, actionType,
               actionErr.message || 'Erro desconhecido']
            ).catch(() => {});
          }
        }

        // 5. Incrementa contador de execuções
        await pool.query(`UPDATE automations SET runs = runs + 1, last_run_at = NOW() WHERE id = $1`, [automation.id]);

        // 6. Escreve no histórico do lead (tab Histórico do card)
        const actionLabels = actions.map((a: any) => a.config?.action_type || '').filter(Boolean).join(', ');
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
           VALUES ($1, 'automacao', $2, 'Sistema')`,
          [lead.id, `⚡ Automação "${automation.name}" executada — Ações: ${actionLabels}`]
        ).catch(() => {});
      }
    } catch (err: any) {
      console.error('[Motor de Automações] Erro geral:', err.message);
    }
  }
  // ── Fim Motor de Automações ─────────────────────────────────────────────────

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
  // DIAGNOSTIC: check actual users table columns
  app.get("/api/debug-users-schema", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      res.json({ columns: result.rows });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

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
          squad: row.squad,
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
            // Resolve squad: use provided value or fetch from linked client
            let squadValue = p.squad || null;
            if (!squadValue && p.activeClientId) {
              const clientRes = await pool.query('SELECT squad FROM clients WHERE id = $1', [p.activeClientId]);
              squadValue = clientRes.rows[0]?.squad || null;
            }

            await pool.query(
              `INSERT INTO projects (id, partner, status, roi, investment, responsible, last_update, active_client_id, page_id, "group", project_result, files, squad) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
                 files = EXCLUDED.files,
                 squad = COALESCE(EXCLUDED.squad, projects.squad)`,
              [p.id, p.partner, p.status, p.roi, p.investment, p.responsible, p.lastUpdate, p.activeClientId, p.page_id, p.group, p.projectResult, JSON.stringify(p.files || []), squadValue]
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
        // subsubsessions directly under this section (no subsession_id)
        const sectionSubSubSessions = subsubsessions
          .filter(sss => sss.section_id === section.id && !sss.subsession_id)
          .map(sss => ({
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
          }));

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
          subSubSessions: sectionSubSubSessions,
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
      const { id, subsession_id, section_id, label, icon, icon_color } = req.body;
      if (!subsession_id && !section_id) {
        return res.status(400).json({ error: "subsession_id ou section_id é obrigatório" });
      }
      const parentClause = subsession_id
        ? "WHERE subsession_id = $2"
        : "WHERE section_id = $2";
      const parentValue = subsession_id || section_id;
      await pool.query(
        `INSERT INTO menu_subsubsessions (id, subsession_id, section_id, label, icon, icon_color, order_index) VALUES ($1, $3, $4, $5, $6, $7, (SELECT COALESCE(MAX(order_index) + 1, 0) FROM menu_subsubsessions ${parentClause}))`,
        [id, parentValue, subsession_id || null, section_id || null, label, icon || 'FolderOpen', icon_color || '#64748b']
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
      const { subsession_id, section_id, label, icon, icon_color } = req.body;
      await pool.query(
        "UPDATE menu_subsubsessions SET subsession_id = $1, section_id = $2, label = $3, icon = $4, icon_color = $5 WHERE id = $6",
        [subsession_id || null, section_id || null, label, icon || 'FolderOpen', icon_color || '#64748b', id]
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
    const { email, role, allowedPages, name, picture, uid } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required', message: 'Email é obrigatório' });
    // uid is required by the DB (NOT NULL). Use provided uid, or derive one from email.
    const userUid = uid || email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    try {
      await pool.query(
        "INSERT INTO users (uid, email, name, picture, role, allowed_pages) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name), picture = COALESCE(EXCLUDED.picture, users.picture), role = EXCLUDED.role, allowed_pages = EXCLUDED.allowed_pages",
        [userUid, email.toLowerCase().trim(), name || null, picture || null, role || 'user', JSON.stringify(allowedPages || [])]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error adding user:", err);
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to add user", message: msg });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { role, allowedPages, name, picture, squad } = req.body;
    try {
      await pool.query(
        "UPDATE users SET role = $1, allowed_pages = $2, name = COALESCE($3, name), picture = COALESCE($4, picture), squad = $5 WHERE id = $6",
        [role, JSON.stringify(allowedPages || []), name, picture, squad || null, id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating user:", err);
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to update user", message: msg });
    }
  });

  // Todos API
  
  app.get("/api/daily-tasks", async (req, res) => {
    try {
      const { date, group, status, page_id } = req.query;
      let query = `
        SELECT t.*, p.partner as project_name, p.group as project_group
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE (t.due_date::date = $1::date OR t.due_date IS NULL)
      `;
      const params: any[] = [date];
      
      if (page_id) {
        params.push(page_id);
        query += ` AND t.page_id = $${params.length}`;
      }
      
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
    const { template_id, client_ids, date, user_id, page_id } = req.body;
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
            `INSERT INTO todos (id, title, description, status, created_by, project_id, due_date, created_at, page_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
            [taskId, item.title, item.description || '', 'pending', user_id, projectId, date, page_id]
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
      const params: any[] = [];

      if (crm_status === 'true') {
        whereClause = "WHERE c.crm_status IS NOT NULL AND c.crm_status != ''";
      }

      const result = await pool.query(`
        SELECT 
          c.*,
          fp_link.id IS NOT NULL as has_financial_link,
          fp_link.guid as fin_people_guid_resolved,
          EXISTS(SELECT 1 FROM projects p WHERE p.active_client_id = c.id) as has_project_link,
          (SELECT p.partner FROM projects p WHERE p.active_client_id = c.id LIMIT 1) as project_name,
          COALESCE(
            (SELECT SUM(r.value) FROM fin_receivables r WHERE r.customer_id = fp_link.asaas_id AND r.status = 'OVERDUE'),
            (SELECT r.value FROM fin_receivables r WHERE r.customer_id = fp_link.asaas_id AND r.status = 'PENDING' ORDER BY r.due_date ASC LIMIT 1),
            fs.value,
            0
          ) as valor_display,
          (SELECT CURRENT_DATE - MIN(r.due_date) FROM fin_receivables r WHERE r.customer_id = fp_link.asaas_id AND r.status = 'OVERDUE') as dias_atraso,
          (SELECT MIN(r.due_date) FROM fin_receivables r WHERE r.customer_id = fp_link.asaas_id AND r.status = 'PENDING') as proxima_cobranca,
          CASE 
            WHEN EXISTS (SELECT 1 FROM fin_receivables r WHERE r.customer_id = fp_link.asaas_id AND r.status = 'OVERDUE') THEN 'atrasada'
            WHEN EXISTS (SELECT 1 FROM fin_receivables r WHERE r.customer_id = fp_link.asaas_id AND r.status = 'PENDING' AND r.due_date <= CURRENT_DATE + interval '7 days') THEN 'vence_em_breve'
            ELSE 'em_dia'
          END as payment_status,
          CASE WHEN fs.id IS NOT NULL THEN true ELSE false END as has_active_subscription,
          fs.value as subscription_value,
          fs.next_due_date as subscription_next_due,
          fs.billing_type as subscription_billing_type,
          fs.cycle as subscription_cycle
        FROM clients c
        LEFT JOIN fin_people fp_link ON fp_link.grapehub_client_id = c.id
        LEFT JOIN fin_subscriptions fs ON 
          (c.fin_subscription_id IS NOT NULL AND fs.id::text = c.fin_subscription_id) OR
          (c.fin_subscription_id IS NULL AND fs.customer_id = fp_link.asaas_id AND fs.status = 'ACTIVE')
        ${whereClause}
        ORDER BY c.name ASC
      `, params);
      
      const clients = result.rows.map(row => {
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
          product: row.product,
          valorDisplay: row.valor_display ? parseFloat(row.valor_display) : 0,
          diasAtraso: row.dias_atraso,
          proximaCobranca: row.proxima_cobranca,
          paymentStatus: row.payment_status,
          aviso_previo_date: row.aviso_previo_date,
          hasActiveSubscription: row.has_active_subscription,
          subscriptionValue: row.subscription_value ? parseFloat(row.subscription_value) : null,
          subscriptionNextDue: row.subscription_next_due,
          subscriptionBillingType: row.subscription_billing_type,
          subscriptionCycle: row.subscription_cycle,
          finPeopleGuid: row.fin_people_guid_resolved || row.fin_people_guid,
          finSubscriptionId: row.fin_subscription_id
        };
      });
      res.json(clients);
    } catch (err) {
      console.error("Error fetching clients:", err);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // GET /api/clients/stats — KPI cards da página Clientes Ativos
  app.get("/api/clients/stats", async (req, res) => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const startOfMonth = `${year}-${month}-01`;
      const endOfMonth = new Date(year, now.getMonth() + 1, 0).toISOString().slice(0, 10);

      const [activeRes, tcvRes, feeRes, entryRes, churnRes] = await Promise.all([
        // Ativos
        pool.query(`SELECT COUNT(*) FROM clients WHERE status = 'Ativo'`),
        // TCV
        pool.query(`SELECT COUNT(*) FROM clients WHERE status = 'Ativo' AND product = 'TCV'`),
        // FEE (Recorrência Mensal)
        pool.query(`SELECT COUNT(*) FROM clients WHERE status = 'Ativo' AND product = 'Recorrência Mensal'`),
        // Entradas do mês — fechamentos do comercial
        pool.query(`SELECT COUNT(*) FROM fechamentos WHERE day >= $1 AND day <= $2`, [startOfMonth, endOfMonth]),
        // Churn do mês — tabela churn
        pool.query(`SELECT COUNT(*) FROM churn WHERE "day_exit" >= $1 AND "day_exit" <= $2::date + interval '1 day'`, [startOfMonth, endOfMonth]),
      ]);

      res.json({
        ativos:   parseInt(activeRes.rows[0].count || '0', 10),
        tcv:      parseInt(tcvRes.rows[0].count || '0', 10),
        fee:      parseInt(feeRes.rows[0].count || '0', 10),
        entradas: parseInt(entryRes.rows[0].count || '0', 10),
        churn:    parseInt(churnRes.rows[0].count || '0', 10),
      });
    } catch (err) {
      console.error("Error fetching client stats:", err);
      res.status(500).json({ error: "Failed to fetch client stats" });
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
      // ENTRADA: Clientes com fatura em atraso há 6+ dias (por due_date) que não estão em coluna manual
      const entradaResult = await pool.query(`
        UPDATE clients c
        SET crm_status = 'inadimplente_asaas'
        FROM fin_people fp
        WHERE fp.grapehub_client_id = c.id
        AND EXISTS (
          SELECT 1 FROM fin_receivables r
          WHERE r.customer_id = fp.asaas_id
          AND r.status IN ('PENDING', 'OVERDUE')
          AND r.due_date IS NOT NULL
          AND (CURRENT_DATE - r.due_date) >= 6
        )
        AND (
          c.crm_status IS NULL
          OR c.crm_status NOT IN ('inadimplente_asaas', 'pedido_finalizacao', 'negociacao', 'aviso_30_dias', 'processo_saida', 'arquivado')
        )
        RETURNING c.id
      `);
      const added = entradaResult.rowCount || 0;

      // SAÍDA: Clientes inadimplentes que não têm mais faturas com 6+ dias de atraso
      const saidaResult = await pool.query(`
        UPDATE clients c
        SET crm_status = NULL
        FROM fin_people fp
        WHERE fp.grapehub_client_id = c.id
        AND c.crm_status = 'inadimplente_asaas'
        AND NOT EXISTS (
          SELECT 1 FROM fin_receivables r
          WHERE r.customer_id = fp.asaas_id
          AND r.status IN ('PENDING', 'OVERDUE')
          AND r.due_date IS NOT NULL
          AND (CURRENT_DATE - r.due_date) >= 6
        )
        RETURNING c.id
      `);
      const removed = saidaResult.rowCount || 0;

      res.json({ added, removed });
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
          `INSERT INTO clients (id, name, email, phone, status, start_date, location, squad, tags, contracts, crm_status, product, fin_subscription_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
             crm_status = EXCLUDED.crm_status,
             product = EXCLUDED.product,
             fin_subscription_id = EXCLUDED.fin_subscription_id`,
          [c.id, c.name, c.email, c.phone, c.status, c.startDate, c.location, c.squad, c.tags, c.contracts, c.crmStatus, c.product, c.finSubscriptionId]
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
    const { crm_status, status, aviso_previo_date, contracts, product, fin_people_guid, fin_subscription_id, tags } = req.body;
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
      if (contracts !== undefined) {
        updates.push(`contracts = $${i++}`);
        values.push(contracts);
      }
      if (product !== undefined) {
        updates.push(`product = $${i++}`);
        values.push(product);
      }
      if (fin_people_guid !== undefined) {
        updates.push(`fin_people_guid = $${i++}`);
        values.push(fin_people_guid);
      }
      if (fin_subscription_id !== undefined) {
        updates.push(`fin_subscription_id = $${i++}`);
        values.push(fin_subscription_id);
      }
      if (tags !== undefined) {
        updates.push(`tags = $${i++}`);
        values.push(tags);
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

  // Search fin_people with asaas_id for subscription linking
  app.get("/api/fin-people/asaas-search", async (req, res) => {
    const { q } = req.query;
    try {
      const result = await pool.query(
        `SELECT guid, name, cnpjcpf, asaas_id
         FROM fin_people
         WHERE LOWER(name) LIKE LOWER('%' || $1 || '%')
         AND asaas_id IS NOT NULL
         ORDER BY name
         LIMIT 10`,
        [q || '']
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error searching fin_people:", err);
      res.status(500).json({ error: "Failed to search" });
    }
  });

  // --- Churn Table Insert ---
  app.post("/api/churn", async (req, res) => {
    const { client_id, client_name, churn_type, exit_reasons, squad, start_date, gestor, comments } = req.body;
    try {
      // Calculate LTV in days
      const startD = start_date ? new Date(start_date) : null;
      const exitD = new Date();
      let ltv = '';
      if (startD) {
        const diffDays = Math.round((exitD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
        ltv = String(diffDays);
      }

      const exitDateStr = exitD.toISOString().split('T')[0];
      const startDateStr = startD ? startD.toISOString().split('T')[0] : null;
      const reasonsStr = Array.isArray(exit_reasons) ? exit_reasons.join(', ') : (exit_reasons || '');

      await pool.query(
        `INSERT INTO churn ("CLIENTE", "day_exit", "Evitavel - inevitavel", "gestor", "LTV", "SQUAD", "Motivo de saída", "day", "comments")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [client_name, exitDateStr, churn_type || null, gestor || null, ltv, squad || null, reasonsStr || null, startDateStr, comments || null]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error inserting into churn table:", err);
      res.status(500).json({ error: "Failed to insert churn record", details: String(err) });
    }
  });

  app.get("/api/churn/:clientName", async (req, res) => {
    const { clientName } = req.params;
    try {
      const result = await pool.query(
        `SELECT * FROM churn WHERE "CLIENTE" = $1 ORDER BY day_exit DESC LIMIT 1`,
        [clientName]
      );
      if (result.rows.length > 0) {
        res.json(result.rows[0]);
      } else {
        res.json(null);
      }
    } catch (err) {
      console.error("Error fetching churn data:", err);
      res.status(500).json({ error: "Failed to fetch churn data" });
    }
  });

  app.patch("/api/churn/:id", async (req, res) => {
    const { id } = req.params;
    const { churn_type, exit_reasons, comments } = req.body;
    try {
      const reasonsStr = Array.isArray(exit_reasons) ? exit_reasons.join(', ') : (exit_reasons || '');
      await pool.query(
        `UPDATE churn SET "Evitavel - inevitavel" = $1, "Motivo de saída" = $2, "comments" = $3 WHERE id = $4`,
        [churn_type || null, reasonsStr || null, comments || null, id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating churn:", err);
      res.status(500).json({ error: "Failed to update churn" });
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
        `SELECT c.*, u.email as user_email, u.name as user_name, COALESCE(c.user_picture, u.picture) as user_picture, u.role as user_role
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

  // ── Diagnóstico Asaas (temporário) ──
  app.get("/api/financeiro/debug-asaas", async (_req, res) => {
    const key = process.env.ASAAS_API_KEY;
    const hasKey = !!key;
    const keyPreview = key ? `${key.substring(0, 12)}...${key.substring(key.length - 4)}` : 'EMPTY';
    
    let apiResult: any = null;
    let apiError: string | null = null;
    
    try {
      apiResult = await asaasFetch('/finance/balance');
    } catch (err: any) {
      apiError = err.message;
    }
    
    res.json({
      has_key: hasKey,
      key_preview: keyPreview,
      key_length: key?.length || 0,
      api_result: apiResult,
      api_error: apiError,
      node_version: process.version,
    });
  });

  // Resumo financeiro do mês
  app.get("/api/financeiro/resumo", async (req, res) => {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy, fm] = mes.split('-').map(Number);
      const fn = fm === 12 ? 1 : fm + 1; const ny = fm === 12 ? fy + 1 : fy;
      const fim = `${ny}-${String(fn).padStart(2,'0')}-01`;

      // 1) Saldo do caixa — API real do Asaas (com fallback para cálculo via banco)
      let saldo_caixa = 0;
      const balanceData = await asaasFetch('/finance/balance');
      if (balanceData?.balance !== undefined) {
        saldo_caixa = parseFloat(balanceData.balance);
      } else {
        const saldoRes = await pool.query(`
          SELECT
            COALESCE(SUM(CASE WHEN type = 1 THEN value ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN type = -1 THEN value ELSE 0 END), 0) AS saldo
          FROM fin_movements_asaas WHERE account = 'asaas'
        `);
        saldo_caixa = parseFloat(saldoRes.rows[0].saldo);
      }

      // 2) Entradas realizadas (recebido)
      const entradasRes = await pool.query(`
        SELECT COALESCE(SUM(value), 0) AS total
        FROM fin_movements_asaas
        WHERE transaction_date >= $1 AND transaction_date < $2
          AND type = 1 AND account = 'asaas' AND is_anticipation_pair = false
      `, [inicio, fim]);
      const recebido = parseFloat(entradasRes.rows[0].total);

      // 3) Saídas realizadas (pago)
      const saidasRes = await pool.query(`
        SELECT COALESCE(SUM(value), 0) AS total
        FROM fin_movements_asaas
        WHERE transaction_date >= $1 AND transaction_date < $2
          AND type = -1 AND account = 'asaas' AND is_anticipation_pair = false
      `, [inicio, fim]);
      const pago = parseFloat(saidasRes.rows[0].total);

      // 4) A receber (pendentes em fin_receivables)
      const aReceberRes = await pool.query(`
        SELECT COALESCE(SUM(value), 0) AS total
        FROM fin_receivables
        WHERE due_date >= $1 AND due_date < $2
          AND status IN ('Pendente', 'PENDING')
      `, [inicio, fim]);
      const a_receber = parseFloat(aReceberRes.rows[0].total);

      // 5) A pagar (provisões pendentes)
      const aPagarRes = await pool.query(`
        SELECT COALESCE(SUM(expected_value), 0) AS total
        FROM fin_recurring_bill_entries
        WHERE reference_month = $1::date AND status = 'pending'
      `, [inicio]);
      const a_pagar = parseFloat(aPagarRes.rows[0].total);

      // Calculados
      const faturamento_total = recebido + a_receber;
      const despesas_total = pago + a_pagar;
      const saldo_periodo = recebido - pago;
      const previsto_fim_mes = saldo_caixa + a_receber - a_pagar;

      res.json({
        // Novos campos
        saldo_caixa,
        previsto_fim_mes,
        recebido,
        a_receber,
        faturamento_total,
        pago,
        a_pagar,
        despesas_total,
        saldo_periodo,
        // Retrocompatibilidade com Extrato
        caixa_realizado: String(recebido),
        saidas_operacionais: String(pago),
        distribuicao: '0',
        despesas_previstas: String(a_pagar),
      });
    } catch (err) {
      console.error("Error fetching financeiro resumo:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Fluxo diário do mês
  app.get("/api/financeiro/fluxo-diario", async (req, res) => {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy2, fm2] = mes.split('-').map(Number);
      const fn2 = fm2 === 12 ? 1 : fm2 + 1; const ny2 = fm2 === 12 ? fy2 + 1 : fy2;
      const fim = `${ny2}-${String(fn2).padStart(2,'0')}-01`;

      // 1) Buscar saldo atual real via API Asaas
      let saldoAtual = 0;
      const balData = await asaasFetch('/finance/balance');
      if (balData?.balance !== undefined) {
        saldoAtual = parseFloat(balData.balance);
      } else {
        const saldoRes = await pool.query(`
          SELECT
            COALESCE(SUM(CASE WHEN type = 1 THEN value ELSE 0 END), 0) -
            COALESCE(SUM(CASE WHEN type = -1 THEN value ELSE 0 END), 0) AS saldo
          FROM fin_movements_asaas WHERE account = 'asaas'
        `);
        saldoAtual = parseFloat(saldoRes.rows[0].saldo);
      }

      // 2) Buscar net de movimentações APÓS o mês de referência (para meses passados)
      //    Inclui Sicredi cujo dia de pagamento (dia 18) caia após o mês
      const netAposRes = await pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 1 THEN value ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN type = -1 THEN value ELSE 0 END), 0) AS net
        FROM (
          SELECT type, value FROM fin_movements_asaas
          WHERE account = 'asaas' AND transaction_date >= $1

          UNION ALL

          SELECT type, value FROM fin_movements_asaas
          WHERE account = 'sicredi' AND sicredi_status = 'realizado'
            AND (billing_month || '-18')::date >= $1
        ) AS combined
      `, [fim]);
      const netAposMes = parseFloat(netAposRes.rows[0].net);

      // 3) Net do mês de referência (todas as movimentações, incluindo pares de antecipação)
      //    Inclui Sicredi cujo dia 18 caia dentro do mês
      const netMesRes = await pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 1 THEN value ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN type = -1 THEN value ELSE 0 END), 0) AS net
        FROM (
          SELECT type, value FROM fin_movements_asaas
          WHERE account = 'asaas'
            AND transaction_date >= $1 AND transaction_date < $2

          UNION ALL

          SELECT type, value FROM fin_movements_asaas
          WHERE account = 'sicredi' AND sicredi_status = 'realizado'
            AND (billing_month || '-18')::date >= $1
            AND (billing_month || '-18')::date < $2
        ) AS combined
      `, [inicio, fim]);
      const netMes = parseFloat(netMesRes.rows[0].net);

      // 4) Saldo no início do mês = saldo atual - movimentos do mês - movimentos após o mês
      const saldoAnterior = saldoAtual - netMes - netAposMes;

      // 5) Realizado diário — Asaas por transaction_date + Sicredi no dia 18 do billing_month
      //    Mesma lógica do endpoint /api/financeiro/extrato para consistência total
      const realizadoRes = await pool.query(`
        SELECT
          TO_CHAR(effective_date, 'DD/MM') AS dia,
          EXTRACT(DAY FROM effective_date) AS dia_numero,
          COALESCE(SUM(CASE WHEN type = 1  AND is_anticipation_pair = false THEN value ELSE 0 END), 0) AS entradas_realizadas,
          COALESCE(SUM(CASE WHEN type = -1 AND is_anticipation_pair = false THEN value ELSE 0 END), 0) AS saidas_realizadas
        FROM (
          -- Asaas: usa transaction_date real, excluindo transferências entre contas
          SELECT type, value, is_anticipation_pair, transaction_date AS effective_date
          FROM fin_movements_asaas
          WHERE account = 'asaas'
            AND transaction_date >= $1 AND transaction_date < $2
            AND LOWER(COALESCE(custom_category, '')) NOT IN ('transferencia entre contas', 'transferência entre contas')

          UNION ALL

          -- Sicredi cartão: aparece no dia 18 do mês seguinte ao billing_month
          -- Ex: billing_month='2026-03' → effective_date = 2026-04-18
          SELECT type, value, COALESCE(is_anticipation_pair, false) AS is_anticipation_pair,
                 (billing_month || '-18')::date AS effective_date
          FROM fin_movements_asaas
          WHERE account = 'sicredi'
            AND sicredi_status = 'realizado'
            AND (billing_month || '-18')::date >= $1
            AND (billing_month || '-18')::date < $2
        ) AS combined
        GROUP BY effective_date
        ORDER BY effective_date
      `, [inicio, fim]);



      // 6) Previsto entradas — Contas a Receber (fin_receivables pendentes por due_date)
      const prevEntRes = await pool.query(`
        SELECT TO_CHAR(due_date, 'DD/MM') AS dia,
               COALESCE(SUM(value), 0) AS entradas_previstas
        FROM fin_receivables
        WHERE due_date >= $1 AND due_date < $2
          AND status IN ('Pendente', 'PENDING')
        GROUP BY due_date
      `, [inicio, fim]);

      // 7) Previsto saídas — Contas a Pagar:
      //    a) Despesas recorrentes pendentes (fin_recurring_bill_entries) por due_date
      //    b) Sicredi cartão pendente do billing_month → aparece no dia 18 do próprio mês
      //       Ex: billing_month='2026-05' → dia 18/05
      const prevSaiRes = await pool.query(`
        SELECT dia, COALESCE(SUM(saidas_previstas), 0) AS saidas_previstas
        FROM (
          -- Despesas recorrentes por due_date
          SELECT TO_CHAR(due_date, 'DD/MM') AS dia,
                 COALESCE(SUM(expected_value), 0) AS saidas_previstas
          FROM fin_recurring_bill_entries
          WHERE reference_month = $1::date AND status = 'pending'
          GROUP BY due_date

          UNION ALL

          -- Sicredi pendente: soma total do billing_month aparece no dia 18
          SELECT TO_CHAR(($1::date + interval '17 days'), 'DD/MM') AS dia,
                 COALESCE(SUM(ABS(value::numeric)), 0) AS saidas_previstas
          FROM fin_movements_asaas
          WHERE account = 'sicredi'
            AND sicredi_status = 'pendente'
            AND billing_month = $2
        ) AS combined
        GROUP BY dia
      `, [inicio, mes]);


      // Merge all days
      const dayMap: Record<string, any> = {};
      for (const r of realizadoRes.rows) {
        dayMap[r.dia] = { dia: r.dia, dia_numero: parseInt(r.dia_numero), entradas_realizadas: parseFloat(r.entradas_realizadas), saidas_realizadas: parseFloat(r.saidas_realizadas), entradas_previstas: 0, saidas_previstas: 0, tem_realizado: true };
      }
      for (const p of prevEntRes.rows) {
        if (!dayMap[p.dia]) dayMap[p.dia] = { dia: p.dia, dia_numero: parseInt(p.dia.split('/')[0]), entradas_realizadas: 0, saidas_realizadas: 0, entradas_previstas: 0, saidas_previstas: 0, tem_realizado: false };
        dayMap[p.dia].entradas_previstas = parseFloat(p.entradas_previstas);
      }
      for (const p of prevSaiRes.rows) {
        if (!dayMap[p.dia]) dayMap[p.dia] = { dia: p.dia, dia_numero: parseInt(p.dia.split('/')[0]), entradas_realizadas: 0, saidas_realizadas: 0, entradas_previstas: 0, saidas_previstas: 0, tem_realizado: false };
        dayMap[p.dia].saidas_previstas = parseFloat(p.saidas_previstas);
      }

      const diario = Object.values(dayMap).sort((a: any, b: any) => a.dia_numero - b.dia_numero);

      res.json({ saldo_anterior: saldoAnterior, diario });
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
        WHERE source NOT IN ('transfer_in', 'transfer_out')
          AND ((movement_date >= $1 AND movement_date < $2)
           OR (expiration_date >= $1 AND expiration_date < $2))
        GROUP BY semana
        ORDER BY semana
      `, [inicio, fim]);

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching fluxo semanal:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Clientes recentes (últimos pagamentos recebidos no mês)
  app.get("/api/financeiro/clientes-recentes", async (req, res) => {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy3, fm3] = mes.split('-').map(Number);
      const fn3 = fm3 === 12 ? 1 : fm3 + 1; const ny3 = fm3 === 12 ? fy3 + 1 : fy3;
      const fim = `${ny3}-${String(fn3).padStart(2,'0')}-01`;

      const result = await pool.query(`
        SELECT
          COALESCE(p.name, r.customer_name, r.description) AS name,
          p.name AS fantasy_name,
          r.value AS valor,
          r.billing_type AS payment_method,
          r.status,
          '' AS installment_number,
          r.payment_date AS movement_date
        FROM fin_receivables r
        LEFT JOIN fin_people p ON p.asaas_id = r.customer_id
        WHERE r.status = 'Recebido'
          AND r.payment_date >= $1 AND r.payment_date < $2
        ORDER BY r.payment_date DESC
        LIMIT 10
      `, [inicio, fim]);

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching clientes recentes:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Inadimplentes (cobranças vencidas não pagas)
  app.get("/api/financeiro/inadimplentes", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          COALESCE(p.name, r.customer_name) AS name,
          p.name AS fantasy_name,
          r.value AS valor,
          r.billing_type AS payment_method,
          r.description,
          '' AS installment_number,
          r.due_date AS expiration_date,
          CURRENT_DATE - r.due_date::date AS dias_atraso
        FROM fin_receivables r
        LEFT JOIN fin_people p ON p.asaas_id = r.customer_id
        WHERE r.status IN ('Confirmado', 'OVERDUE')
          AND r.due_date < CURRENT_DATE
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
      const [fy4, fm4] = mes.split('-').map(Number);
      const fn4 = fm4 === 12 ? 1 : fm4 + 1; const ny4 = fm4 === 12 ? fy4 + 1 : fy4;
      const fim = `${ny4}-${String(fn4).padStart(2,'0')}-01`;

      // A receber
      const recRes = await pool.query(`
        SELECT COALESCE(SUM(value), 0) AS total
        FROM fin_receivables
        WHERE due_date >= $1 AND due_date < $2
          AND status IN ('Pendente', 'PENDING')
      `, [inicio, fim]);
      const entradas_previstas = parseFloat(recRes.rows[0].total);

      // A pagar
      const pagRes = await pool.query(`
        SELECT COALESCE(SUM(expected_value), 0) AS total
        FROM fin_recurring_bill_entries
        WHERE reference_month = $1::date AND status = 'pending'
      `, [inicio]);
      const despesas_previstas = parseFloat(pagRes.rows[0].total);

      res.json({
        entradas_previstas: String(entradas_previstas),
        despesas_previstas: String(despesas_previstas),
        saldo_projetado: String(entradas_previstas - despesas_previstas),
      });
    } catch (err) {
      console.error("Error fetching previsto:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Despesas do mês (fin_movements_asaas — outgoing / value < 0)
  app.get("/api/financeiro/despesas", async (req, res) => {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy5, fm5] = mes.split('-').map(Number);
      const fn5 = fm5 === 12 ? 1 : fm5 + 1; const ny5 = fm5 === 12 ? fy5 + 1 : fy5;
      const fim = `${ny5}-${String(fn5).padStart(2,'0')}-01`;

      const result = await pool.query(`
        SELECT
          m.id,
          COALESCE(m.custom_description, m.description) as description,
          ABS(m.value) as movement_value,
          ABS(m.value) as value,
          m.transaction_date as movement_date,
          m.transaction_date as expiration_date,
          'Realizado' as status,
          m.type as type_column,
          NULL as category_l1_ext_id,
          NULL as category_l2_ext_id,
          NULL as category_l3_ext_id,
          m.transaction_type as payment_method,
          m.asaas_id as document_code,
          COALESCE(m.custom_category, m.grapehub_category) as grapehub_category
        FROM fin_movements_asaas m
        WHERE m.value < 0
          AND m.transaction_date >= $1 AND m.transaction_date < $2
        ORDER BY m.transaction_date DESC
      `, [inicio, fim]);

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching financeiro despesas:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // ── DRE (Demonstração do Resultado do Exercício) ──────────
  // GET /api/financeiro/dre/detalhes — individual movements for a category/month
  app.get("/api/financeiro/dre/detalhes", async (req, res) => {
    try {
      const category = req.query.category as string;
      const month = parseInt(req.query.month as string);
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      if (!category || isNaN(month)) return res.status(400).json({ error: 'category and month required' });

      const mesStr = `${year}-${String(month).padStart(2, '0')}`;
      const inicio = `${mesStr}-01`;
      const [fy, fm] = [year, month];
      const fn = fm === 12 ? 1 : fm + 1;
      const ny = fm === 12 ? fy + 1 : fy;
      const fim = `${ny}-${String(fn).padStart(2, '0')}-01`;

      // Find category name from fin_categories by structure code
      const catRes = await pool.query('SELECT id, description FROM fin_categories WHERE structure = $1', [category]);
      const catName = catRes.rows[0]?.description || '';

      // Get movements matching this category for the month
      const result = await pool.query(`
        SELECT id, description, value, type, transaction_type, transaction_date,
               custom_description, custom_category, grapehub_category,
               COALESCE(custom_description, description) AS display_description
        FROM fin_movements_asaas
        WHERE (
          (account = 'asaas' AND transaction_date >= $1 AND transaction_date < $2)
          OR (account = 'sicredi' AND sicredi_status = 'realizado' AND billing_month = $3)
        )
          AND COALESCE(is_anticipation_pair, false) = false
          AND (
            LOWER(COALESCE(custom_category, '')) = LOWER($4)
            OR LOWER(COALESCE(grapehub_category, '')) = LOWER($4)
          )
        ORDER BY transaction_date ASC, id ASC
      `, [inicio, fim, mesStr, catName]);

      const items = result.rows.map((r: any) => ({
        id: r.id,
        date: r.transaction_date,
        description: r.display_description || r.description,
        value: Math.abs(parseFloat(r.value || '0')),
        type: r.type,
        transaction_type: r.transaction_type,
      }));

      res.json({ category, category_name: catName, month, year, items, total: items.reduce((s: number, i: any) => s + i.value, 0) });
    } catch (err) {
      console.error("Error fetching DFC details:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  app.get("/api/financeiro/dre", async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const inicio = `${year}-01-01`;
      const fim = `${year}-12-31`;

      // Get Asaas movements for the year (by transaction_date)
      const asaasMovRes = await pool.query(
        `SELECT id, description, value, type, transaction_type,
                grapehub_category, custom_category, custom_category_id,
                is_anticipation_pair,
                EXTRACT(MONTH FROM transaction_date)::int AS mes
         FROM fin_movements_asaas
         WHERE transaction_date BETWEEN $1 AND $2
           AND COALESCE(is_anticipation_pair, false) = false
           AND account = 'asaas'
         ORDER BY transaction_date`,
        [inicio, fim]
      );

      // Get Sicredi paid items for the year (by billing_month — regime de caixa)
      const sicrediMovRes = await pool.query(
        `SELECT id, description, value, type, transaction_type,
                grapehub_category, custom_category, custom_category_id,
                is_anticipation_pair,
                EXTRACT(MONTH FROM (billing_month || '-01')::date)::int AS mes
         FROM fin_movements_asaas
         WHERE billing_month >= $1 AND billing_month <= $2
           AND account = 'sicredi'
           AND sicredi_status = 'realizado'
         ORDER BY billing_month`,
        [`${year}-01`, `${year}-12`]
      );

      const movRes = { rows: [...asaasMovRes.rows, ...sicrediMovRes.rows] };

      // Get all categories
      const catRes = await pool.query('SELECT id, external_id, structure, description, level FROM fin_categories ORDER BY structure');
      const categories = catRes.rows;
      const catByName: Record<string, any> = {};
      for (const c of categories) {
        catByName[c.description.toLowerCase()] = c;
      }

      // DRE node: monthly values array [0..11] for Jan..Dec
      const emptyMonths = () => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      // Build tree: code -> { values: number[12], children }
      const nodeMap: Record<string, { code: string; name: string; level: number; type: string; values: number[]; childCodes: string[] }> = {};

      for (const cat of categories) {
        const isReceita = cat.structure.startsWith('01') || cat.structure.startsWith('03');
        nodeMap[cat.structure] = {
          code: cat.structure,
          name: cat.description,
          level: cat.level,
          type: isReceita ? 'receita' : 'despesa',
          values: emptyMonths(),
          childCodes: [],
        };
      }

      // Link children
      for (const cat of categories) {
        if (cat.level === 2) {
          const l1Key = cat.structure.split('.')[0];
          if (nodeMap[l1Key]) nodeMap[l1Key].childCodes.push(cat.structure);
        }
        if (cat.level === 3) {
          const parts = cat.structure.split('.');
          const l2Key = `${parts[0]}.${parts[1]}`;
          if (nodeMap[l2Key]) nodeMap[l2Key].childCodes.push(cat.structure);
        }
      }

      // Map movements to leaf categories
      for (const mov of movRes.rows) {
        const catName = (mov.custom_category || mov.grapehub_category || '').toLowerCase().trim();
        if (catName === 'transferencia entre contas') continue;

        const found = catByName[catName];
        if (!found || !nodeMap[found.structure]) continue;

        const valor = Math.abs(parseFloat(mov.value || '0'));
        const mi = (mov.mes || 1) - 1; // 0-indexed month
        const parts = found.structure.split('.');

        // Add to the matched level
        nodeMap[found.structure].values[mi] += valor;

        // Bubble up to parents
        if (found.level === 3) {
          const l2Key = `${parts[0]}.${parts[1]}`;
          const l1Key = parts[0];
          if (nodeMap[l2Key]) nodeMap[l2Key].values[mi] += valor;
          if (nodeMap[l1Key]) nodeMap[l1Key].values[mi] += valor;
        } else if (found.level === 2) {
          const l1Key = parts[0];
          if (nodeMap[l1Key]) nodeMap[l1Key].values[mi] += valor;
        }
      }

      // ── Override Jan/Fev/Mar 2026 com dados do sistema legado ──
      if (year === 2026) {
        // Dados exatos do sistema anterior (código → [Jan, Fev, Mar])
        const legacyData: Record<string, [number, number, number]> = {
          // 01 - Receitas
          '01.01.01': [89512.95, 85891.54, 96901.76],
          '01.01.02': [0, 0, 0],
          // 02.01 - Impostos
          '02.01.01': [10271.69, 10699.98, 11147.28],
          // 02.02 - Prestação de Serviço
          '02.02.06': [5793.38, 4674.35, 5252.32],
          '02.02.07': [80.00, 40.00, 280.00],
          '02.02.09': [1084.93, 1021.75, 2699.90],
          '02.02.10': [435.19, 1753.25, 987.55],
          '02.02.99': [1247.44, 1191.30, 0],
          // 02.03 - Salários
          '02.03.03': [23960.91, 23483.91, 26794.57],
          '02.03.04': [1944.26, 1463.23, 2795.00],
          '02.03.09': [765.92, 789.90, 799.99],
          '02.03.11': [1658.21, 1658.21, 1658.21],
          '02.03.12': [556.40, 0, 0],
          // 02.05 - Marketing
          '02.05.01': [0, 0, 0],
          '02.05.02': [0, 0, 0],
          '02.05.08': [14917.52, 18309.73, 14730.47],
          // 02.06 - Administrativas
          '02.06.02': [0, 0, 4000.00],
          '02.06.05': [2384.81, 2384.81, 2389.79],
          '02.06.06': [182.27, 176.41, 259.54],
          '02.06.07': [159.90, 139.90, 139.90],
          '02.06.08': [0, 0, 0],
          '02.06.10': [340.71, 0, 1474.15],
          '02.06.12': [350.00, 380.00, 380.00],
          '02.06.14': [283.73, 866.30, 284.86],
          '02.06.15': [0, 128.30, 0],
          '02.06.16': [180.00, 180.00, 205.00],
          '02.06.17': [128.00, 0, 0],
          '02.06.99': [0, 2464.94, 60.00],
          // 02.07 - Financeiras
          '02.07.02': [212.74, 265.03, 259.29],
          '02.07.03': [311.86, 278.80, 517.58],
          '02.07.04': [119.97, 89.60, 302.89],
          // 03 - Receitas Não Operacionais
          '03.04.07': [0, 250.00, 0],
          // 04 - Despesas Não Operacionais
          '04.01.01': [2172.29, 2125.96, 0],
          '04.04.06': [0, 0, 5000.00],
          '04.04.99': [0, 250.00, 0],
          // 05 - Distribuição de Lucros
          '05.01.03': [13997.96, 22404.62, 21457.31],
          '05.01.04': [2702.04, 2885.38, 1442.69],
          '05.01.05': [333.96, 356.62, 178.31],
        };

        // 1) Limpar meses 0-2 de todos os nós
        for (const code in nodeMap) {
          for (let m = 0; m < 3; m++) {
            nodeMap[code].values[m] = 0;
          }
        }

        // 2) Setar valores legados nos nós folha
        for (const [code, vals] of Object.entries(legacyData)) {
          if (!nodeMap[code]) continue;
          for (let m = 0; m < 3; m++) {
            nodeMap[code].values[m] = vals[m];
          }
        }

        // 3) Re-calcular pais (L2 e L1) para meses 0-2
        for (const cat of categories) {
          if (cat.level !== 3) continue;
          const parts = cat.structure.split('.');
          const l2Key = `${parts[0]}.${parts[1]}`;
          const l1Key = parts[0];
          for (let m = 0; m < 3; m++) {
            const val = nodeMap[cat.structure]?.values[m] || 0;
            if (nodeMap[l2Key]) nodeMap[l2Key].values[m] += val;
            if (nodeMap[l1Key]) nodeMap[l1Key].values[m] += val;
          }
        }
        // L2 nodes that don't have L3 children (standalone L2)
        for (const cat of categories) {
          if (cat.level !== 2) continue;
          if (nodeMap[cat.structure]?.childCodes?.length === 0) {
            const parts = cat.structure.split('.');
            const l1Key = parts[0];
            for (let m = 0; m < 3; m++) {
              const val = nodeMap[cat.structure]?.values[m] || 0;
              if (nodeMap[l1Key]) nodeMap[l1Key].values[m] += val;
            }
          }
        }
      }

      // Build flat rows (only categories that have data somewhere in the year)
      const hasData = (code: string): boolean => {
        const n = nodeMap[code];
        if (!n) return false;
        if (n.values.some(v => v > 0)) return true;
        return n.childCodes.some(cc => hasData(cc));
      };

      const rows: Array<{
        code: string;
        name: string;
        level: number;
        values: number[];
        total: number;
        type: string;
        isGroup: boolean;
      }> = [];

      // L1 sorted by code
      const l1Codes = categories.filter(c => c.level === 1).map(c => c.structure).sort();
      for (const l1Code of l1Codes) {
        const l1 = nodeMap[l1Code];
        if (!l1 || !hasData(l1Code)) continue;

        const l1Total = l1.values.reduce((s, v) => s + v, 0);
        rows.push({ code: l1.code, name: l1.name, level: 1, values: [...l1.values], total: l1Total, type: l1.type, isGroup: true });

        // L2 sorted by code
        const l2Codes = [...l1.childCodes].sort();
        for (const l2Code of l2Codes) {
          const l2 = nodeMap[l2Code];
          if (!l2 || !hasData(l2Code)) continue;

          const l2Total = l2.values.reduce((s, v) => s + v, 0);
          rows.push({ code: l2.code, name: l2.name, level: 2, values: [...l2.values], total: l2Total, type: l2.type, isGroup: l2.childCodes.length > 0 });

          // L3 sorted by code
          const l3Codes = [...l2.childCodes].sort();
          for (const l3Code of l3Codes) {
            const l3 = nodeMap[l3Code];
            if (!l3 || !l3.values.some(v => v > 0)) continue;

            const l3Total = l3.values.reduce((s, v) => s + v, 0);
            rows.push({ code: l3.code, name: l3.name, level: 3, values: [...l3.values], total: l3Total, type: l3.type, isGroup: false });
          }
        }
      }

      // Monthly summaries
      const monthlyReceitas = emptyMonths();
      const monthlyDespesas = emptyMonths();
      const monthlyDistribuicao = emptyMonths();
      for (let m = 0; m < 12; m++) {
        monthlyReceitas[m] = (nodeMap['01']?.values[m] || 0) + (nodeMap['03']?.values[m] || 0);
        monthlyDespesas[m] = (nodeMap['02']?.values[m] || 0) + (nodeMap['04']?.values[m] || 0);
        monthlyDistribuicao[m] = nodeMap['05']?.values[m] || 0;
      }

      const totalReceitas = monthlyReceitas.reduce((s, v) => s + v, 0);
      const totalDespesas = monthlyDespesas.reduce((s, v) => s + v, 0);
      const totalDistribuicao = monthlyDistribuicao.reduce((s, v) => s + v, 0);
      const geracaoCaixa = totalReceitas - totalDespesas;
      const saldoFinal = geracaoCaixa - totalDistribuicao;

      // Geração de caixa per month
      const monthlyGeracaoCaixa = emptyMonths();
      const monthlySaldoFinal = emptyMonths();
      for (let m = 0; m < 12; m++) {
        monthlyGeracaoCaixa[m] = monthlyReceitas[m] - monthlyDespesas[m];
        monthlySaldoFinal[m] = monthlyGeracaoCaixa[m] - monthlyDistribuicao[m];
      }

      res.json({
        year,
        rows,
        summary: {
          monthly_receitas: monthlyReceitas,
          monthly_despesas: monthlyDespesas,
          monthly_distribuicao: monthlyDistribuicao,
          monthly_geracao_caixa: monthlyGeracaoCaixa,
          monthly_saldo_final: monthlySaldoFinal,
          total_receitas: totalReceitas,
          total_despesas: totalDespesas,
          geracao_caixa: geracaoCaixa,
          distribuicao_lucros: totalDistribuicao,
          saldo_final: saldoFinal,
        },
      });
    } catch (err) {
      console.error("Error fetching DRE:", err);
      res.status(500).json({ error: "Failed to fetch DRE data" });
    }
  });

  // Contas a Pagar (fin_movements_asaas — outgoing)
  app.get("/api/financeiro/contas-a-pagar", async (req, res) => {
    try {
      const mes = (req.query.month as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy, fm] = mes.split('-').map(Number);
      const fn = fm === 12 ? 1 : fm + 1; const ny = fm === 12 ? fy + 1 : fy;
      const fim = `${ny}-${String(fn).padStart(2,'0')}-01`;

      const TRANSACTION_LABELS: Record<string, string> = {
        'PAYMENT_FEE': 'Despesas Financeiras',
        'TRANSFER': 'Distribuição de Lucros',
        'BILL_PAYMENT': 'Despesas Operacionais',
        'RECEIVABLE_ANTICIPATION_DEBIT': 'Antecipação Débito',
        'PAYMENT_REVERSAL': 'Estorno',
      };

      const result = await pool.query(`
        SELECT
          id,
          asaas_id,
          type,
          transaction_type,
          value,
          transaction_date,
          description,
          balance,
          payment_id,
          custom_description,
          custom_category,
          COALESCE(custom_description, description) AS display_description,
          COALESCE(custom_category, grapehub_category) AS display_category
        FROM fin_movements_asaas
        WHERE type = -1
          AND is_anticipation_pair = false
          AND LOWER(COALESCE(custom_category, grapehub_category, '')) NOT IN ('transferencia entre contas', 'transferência entre contas', 'transferência')
          AND transaction_date >= $1
          AND transaction_date < $2
        ORDER BY transaction_date DESC, id DESC
      `, [inicio, fim]);

      // Map to BillItem format expected by frontend
      const rows = result.rows.map((r: any) => {
        const val = Math.abs(parseFloat(r.value || '0'));
        // display_category = COALESCE(custom_category, grapehub_category) from DB
        // Only use it for grapehub_category if the user explicitly set it
        const userCategory = r.display_category || null;
        const fallbackLabel = TRANSACTION_LABELS[r.transaction_type] || 'Outros';

        // Extract person name from display_description
        const desc = r.display_description || '';
        let personName: string | null = null;
        if (desc) {
          const match = desc.match(/\d+\s+(.+)$/);
          if (match) personName = match[1].trim();
          else {
            const dashIdx = desc.lastIndexOf(' - ');
            if (dashIdx >= 0) {
              const after = desc.slice(dashIdx + 3).trim();
              if (after && !/^fatura|^rec|^Taxa/i.test(after)) personName = after;
            }
          }
        }
        if (r.transaction_type === 'TRANSFER' && desc) {
          const transferMatch = desc.match(/para\s+(.+)/i);
          if (transferMatch) personName = transferMatch[1].trim();
        }

        return {
          id: r.id,
          doc_description: r.display_description || fallbackLabel,
          movement_value: (-val).toFixed(2),
          original_value: val.toFixed(2),
          payment_date: r.transaction_date,
          expiration_date: r.transaction_date,
          status: 'Conciliado',
          type_column: 'realizado',
          payment_method: r.transaction_type === 'TRANSFER' ? 'transferência' :
                          r.transaction_type === 'BILL_PAYMENT' ? 'pagamento' :
                          r.transaction_type === 'PAYMENT_FEE' ? 'taxa' : 'outros',
          document_code: r.asaas_id || '',
          grapehub_category: userCategory,
          people_name: personName,
          people_cnpjcpf: null,
          category_l1_desc: null as string | null,
          category_l2_desc: null as string | null,
          category_l3_desc: null as string | null,
          category_structure: null as string | null,
          is_edited: !!(r.custom_description || r.custom_category),
        };
      });

      // ── Enrich with fin_categories hierarchy ──
      const catResult = await pool.query('SELECT id, structure, description, level FROM fin_categories ORDER BY structure');
      const allCats = catResult.rows;
      // Build lookup: description (lowercase) → category record
      const catByName: Record<string, any> = {};
      const catByStructure: Record<string, any> = {};
      for (const c of allCats) {
        catByName[c.description.toLowerCase()] = c;
        catByStructure[c.structure] = c;
      }

      for (const row of rows) {
        const catName = (row.grapehub_category || '').toLowerCase().trim();
        let found = catByName[catName];

        // If no match from grapehub_category, try fallback based on transaction_type
        if (!found && !catName) {
          // Try to match the TRANSACTION_LABELS fallback against fin_categories
          const fallback = TRANSACTION_LABELS[row.payment_method === 'taxa' ? 'PAYMENT_FEE' : ''] || '';
          if (fallback) {
            found = catByName[fallback.toLowerCase()];
          }
        }

        if (found) {
          const parts = found.structure.split('.');
          row.category_structure = found.structure;
          if (found.level === 3) {
            row.category_l3_desc = found.description;
            const l2Key = `${parts[0]}.${parts[1]}`;
            const l1Key = parts[0];
            row.category_l2_desc = catByStructure[l2Key]?.description || null;
            row.category_l1_desc = catByStructure[l1Key]?.description || null;
          } else if (found.level === 2) {
            row.category_l2_desc = found.description;
            const l1Key = parts[0];
            row.category_l1_desc = catByStructure[l1Key]?.description || null;
          } else if (found.level === 1) {
            row.category_l1_desc = found.description;
          }
        } else {
          // Fallback: use grapehub_category as L1 if set, otherwise 'Outros'
          row.category_l1_desc = row.grapehub_category || 'Outros';
        }
      }
      // ── Inject individual Sicredi items as previstas/pagas ──
      const sicrediRes = await pool.query(`
        SELECT id, value, transaction_date, description, custom_description,
               custom_category, grapehub_category, sicredi_status,
               COALESCE(custom_description, description) AS display_description,
               COALESCE(custom_category, grapehub_category) AS display_category
        FROM fin_movements_asaas
        WHERE account = 'sicredi' AND billing_month = $1
        ORDER BY transaction_date DESC, id DESC
      `, [mes]);

      for (const si of sicrediRes.rows) {
        const val = Math.abs(parseFloat(si.value || '0'));
        const isPaid = si.sicredi_status === 'realizado';
        const catName = si.display_category || null;

        // Find category hierarchy
        let cat_l1 = 'Despesas Operacionais', cat_l2 = null as string | null, cat_l3 = null as string | null, cat_structure = null as string | null;
        if (catName) {
          const found = catByName[catName.toLowerCase()];
          if (found) {
            cat_structure = found.structure;
            const parts = found.structure.split('.');
            if (found.level >= 3) {
              cat_l3 = found.description;
              cat_l2 = catByStructure[`${parts[0]}.${parts[1]}`]?.description || null;
              cat_l1 = catByStructure[parts[0]]?.description || 'Despesas Operacionais';
            } else if (found.level >= 2) {
              cat_l2 = found.description;
              cat_l1 = catByStructure[parts[0]]?.description || 'Despesas Operacionais';
            } else {
              cat_l1 = found.description;
            }
          }
        }

        rows.push({
          id: si.id,
          doc_description: si.display_description || si.description,
          movement_value: (-val).toFixed(2),
          original_value: val.toFixed(2),
          payment_date: isPaid ? si.transaction_date : null,
          expiration_date: si.transaction_date,
          status: isPaid ? 'Conciliado' : 'Pendente',
          type_column: isPaid ? 'realizado' : 'previsto',
          payment_method: 'cartão de crédito',
          document_code: '',
          grapehub_category: catName,
          people_name: null,
          people_cnpjcpf: null,
          category_l1_desc: cat_l1,
          category_l2_desc: cat_l2,
          category_l3_desc: cat_l3,
          category_structure: cat_structure,
          is_edited: false,
          _source: 'sicredi',
        });
      }

      const ja_pago = rows.filter((r: any) => ['Conciliado', 'Quitado'].includes(r.status)).reduce((s: number, r: any) => s + parseFloat(r.original_value || '0'), 0);
      const total_previsto = rows.filter((r: any) => ['Pendente', 'Atrasado', 'Vence Hoje'].includes(r.status)).reduce((s: number, r: any) => s + parseFloat(r.original_value || '0'), 0);

      const summary = {
        total_previsto,
        ja_pago,
        total_mes: ja_pago + total_previsto,
        vence_hoje_amanha: 0,
      };

      res.json({ summary, items: rows });
    } catch (err) {
      console.error("Error fetching contas a pagar:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // ── Contas a Pagar — Sicredi ───────────────────────────

  // GET /api/financeiro/contas-a-pagar/sicredi — get Sicredi card items for a month
  app.get("/api/financeiro/contas-a-pagar/sicredi", async (req, res) => {
    try {
      const mes = (req.query.month as string) || new Date().toISOString().slice(0, 7);

      const result = await pool.query(`
        SELECT id, asaas_id, type, transaction_type, value, transaction_date, description,
               custom_description, custom_category, custom_category_id, sicredi_status, grapehub_category,
               COALESCE(custom_description, description) AS display_description,
               COALESCE(custom_category, grapehub_category) AS display_category
        FROM fin_movements_asaas
        WHERE account = 'sicredi'
          AND billing_month = $1
        ORDER BY transaction_date DESC, id DESC
      `, [mes]);

      // Enrich with categories
      const catResult = await pool.query('SELECT id, structure, description, level FROM fin_categories ORDER BY structure');
      const catByName: Record<string, any> = {};
      const catByStructure: Record<string, any> = {};
      for (const c of catResult.rows) {
        catByName[c.description.toLowerCase()] = c;
        catByStructure[c.structure] = c;
      }

      const items = result.rows.map((r: any) => {
        const val = Math.abs(parseFloat(r.value || '0'));
        const catName = (r.display_category || '').toLowerCase().trim();
        const found = catByName[catName];

        let category_l1_desc = null, category_l2_desc = null, category_structure = null;
        if (found) {
          category_structure = found.structure;
          const parts = found.structure.split('.');
          if (found.level >= 2) {
            category_l2_desc = found.description;
            category_l1_desc = catByStructure[parts[0]]?.description || null;
          } else if (found.level === 1) {
            category_l1_desc = found.description;
          }
        }

        return {
          id: r.id,
          description: r.display_description || r.description,
          original_description: r.description,
          custom_category: r.custom_category || null,
          custom_category_id: r.custom_category_id || null,
          value: val,
          date: r.transaction_date,
          status: r.sicredi_status || 'pendente',
          category_l1_desc,
          category_l2_desc,
          category_structure,
          grapehub_category: r.display_category || null,
        };
      });

      const totalFatura = items.reduce((s: number, i: any) => s + i.value, 0);
      const categorized = items.filter((i: any) => i.custom_category).length;
      const allPaid = items.length > 0 && items.every((i: any) => i.status === 'realizado');

      res.json({ items, summary: { total: totalFatura, count: items.length, categorized, allPaid } });
    } catch (err) {
      console.error("Error fetching sicredi contas:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // POST /api/financeiro/contas-a-pagar/sicredi/pagar — mark all Sicredi items in month as paid
  app.post("/api/financeiro/contas-a-pagar/sicredi/pagar", async (req, res) => {
    try {
      const mes = (req.body.month as string) || new Date().toISOString().slice(0, 7);

      const result = await pool.query(`
        UPDATE fin_movements_asaas
        SET sicredi_status = 'realizado'
        WHERE account = 'sicredi'
          AND billing_month = $1
          AND sicredi_status = 'pendente'
      `, [mes]);

      // ── Also mark the Sicredi provision entry as paid ──
      try {
        const billRes = await pool.query(
          `SELECT id FROM fin_recurring_bills WHERE LOWER(name) LIKE '%sicredi%' AND LOWER(name) LIKE '%cart%' LIMIT 1`
        );
        if (billRes.rows.length > 0) {
          const billId = billRes.rows[0].id;
          const refMonth = mes + '-01';

          // Get the actual total paid
          const totalRes = await pool.query(
            `SELECT COALESCE(SUM(ABS(value::numeric)), 0) AS total
             FROM fin_movements_asaas
             WHERE account = 'sicredi' AND billing_month = $1`,
            [mes]
          );
          const faturaTotal = parseFloat(totalRes.rows[0].total) || 0;

          await pool.query(
            `UPDATE fin_recurring_bill_entries
             SET status = 'paid', actual_value = $1, updated_at = NOW()
             WHERE recurring_bill_id = $2 AND reference_month = $3`,
            [faturaTotal, billId, refMonth]
          );
        }
      } catch (provErr: any) {
        console.error('Provision update on pay (non-fatal):', provErr.message);
      }

      res.json({ updated: result.rowCount });
    } catch (err) {
      console.error("Error paying sicredi:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // ── Contas Recorrentes ──────────────────────────────────

  // --- Bills (cadastro master) ---

  app.get("/api/financeiro/recorrentes/bills", async (_req, res) => {
    try {
      const r = await pool.query(`
        SELECT b.*, c.description AS category_name, c.structure AS category_structure
        FROM fin_recurring_bills b
        LEFT JOIN fin_categories c ON c.id = b.category_id
        ORDER BY b.is_active DESC, b.name
      `);
      res.json(r.rows);
    } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
  });

  app.post("/api/financeiro/recorrentes/bills", async (req, res) => {
    try {
      const { name, description, due_day, category_id, account_name, default_value } = req.body;
      const r = await pool.query(
        `INSERT INTO fin_recurring_bills (name, description, due_day, category_id, account_name, is_active, default_value)
         VALUES ($1, $2, $3, $4, $5, true, $6) RETURNING *`,
        [name, description || null, due_day || null, category_id || null, account_name || null, parseFloat(default_value) || 0]
      );
      const bill = r.rows[0];
      const expectedVal = parseFloat(default_value) || 0;

      // Auto-provision entries from current month through Dec of current year
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth(); // 0-indexed
      for (let m = curMonth; m <= 11; m++) {
        const refMonth = `${curYear}-${String(m + 1).padStart(2, '0')}-01`;
        const dueDate = bill.due_day ? `${curYear}-${String(m + 1).padStart(2, '0')}-${String(bill.due_day).padStart(2, '0')}` : null;
        const source = (account_name || '').toLowerCase().includes('asaas') ? 'asaas' : 'manual';
        await pool.query(
          `INSERT INTO fin_recurring_bill_entries (recurring_bill_id, reference_month, expected_value, actual_value, due_date, source, status)
           VALUES ($1, $2, $3, 0, $4, $5, 'pending')
           ON CONFLICT DO NOTHING`,
          [bill.id, refMonth, expectedVal, dueDate, source]
        );
      }

      res.json(bill);
    } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
  });

  app.put("/api/financeiro/recorrentes/bills/:id", async (req, res) => {
    try {
      const { name, description, due_day, category_id, account_name, is_active, default_value } = req.body;
      const r = await pool.query(
        `UPDATE fin_recurring_bills SET name=$1, description=$2, due_day=$3, category_id=$4, account_name=$5, is_active=$6, default_value=$7, updated_at=NOW()
         WHERE id=$8 RETURNING *`,
        [name, description || null, due_day || null, category_id || null, account_name || null, is_active ?? true, parseFloat(default_value) || 0, req.params.id]
      );
      res.json(r.rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
  });

  app.delete("/api/financeiro/recorrentes/bills/:id", async (req, res) => {
    try {
      const hard = req.query.hard === 'true';
      if (hard) {
        // Hard delete: remove items → entries → bill
        await pool.query(`DELETE FROM fin_recurring_bill_items WHERE entry_id IN (SELECT id FROM fin_recurring_bill_entries WHERE recurring_bill_id = $1)`, [req.params.id]);
        await pool.query(`DELETE FROM fin_recurring_bill_entries WHERE recurring_bill_id = $1`, [req.params.id]);
        await pool.query(`DELETE FROM fin_recurring_bills WHERE id = $1`, [req.params.id]);
      } else {
        // Soft delete (inactivate)
        await pool.query(`UPDATE fin_recurring_bills SET is_active=false, updated_at=NOW() WHERE id=$1`, [req.params.id]);
        // Remove pending future entries (keep paid ones)
        const today = new Date().toISOString().slice(0, 7) + '-01';
        await pool.query(
          `DELETE FROM fin_recurring_bill_entries WHERE recurring_bill_id = $1 AND status = 'pending' AND reference_month >= $2`,
          [req.params.id, today]
        );
      }
      res.json({ ok: true });
    } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
  });

  // --- Entries (provisões mensais) ---

  app.get("/api/financeiro/recorrentes/entries", async (req, res) => {
    try {
      const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
      const refMonth = `${month}-01`;
      const [ym, mm] = month.split('-').map(Number);

      // Auto-provision: create missing entries for active bills
      const activeBills = await pool.query(`SELECT * FROM fin_recurring_bills WHERE is_active = true`);
      for (const bill of activeBills.rows) {
        const exists = await pool.query(
          `SELECT id FROM fin_recurring_bill_entries WHERE recurring_bill_id = $1 AND reference_month = $2`,
          [bill.id, refMonth]
        );
        if (exists.rows.length === 0) {
          const dueDate = bill.due_day ? `${ym}-${String(mm).padStart(2, '0')}-${String(bill.due_day).padStart(2, '0')}` : null;
          const source = (bill.account_name || '').toLowerCase().includes('asaas') ? 'asaas' : 'manual';
          await pool.query(
            `INSERT INTO fin_recurring_bill_entries (recurring_bill_id, reference_month, expected_value, actual_value, due_date, source, status)
             VALUES ($1, $2, 0, 0, $3, $4, 'pending')`,
            [bill.id, refMonth, dueDate, source]
          );
        }
      }

      // Now fetch all entries for the month
      const r = await pool.query(`
        SELECT e.*, b.name AS bill_name, b.account_name, b.due_day,
               c.description AS category_name, c.structure AS category_structure
        FROM fin_recurring_bill_entries e
        JOIN fin_recurring_bills b ON b.id = e.recurring_bill_id
        LEFT JOIN fin_categories c ON c.id = b.category_id
        WHERE e.reference_month = $1
        ORDER BY e.due_date, b.name
      `, [refMonth]);
      res.json(r.rows);
    } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
  });

  app.post("/api/financeiro/recorrentes/entries", async (req, res) => {
    try {
      const { recurring_bill_id, reference_month, expected_value, due_date, source, notes } = req.body;
      // Normalize reference_month to day 01
      const refMonth = reference_month ? reference_month.slice(0, 7) + '-01' : new Date().toISOString().slice(0, 7) + '-01';
      const r = await pool.query(
        `INSERT INTO fin_recurring_bill_entries (recurring_bill_id, reference_month, expected_value, actual_value, due_date, source, status, notes)
         VALUES ($1, $2, $3, 0, $4, $5, 'pending', $6) RETURNING *`,
        [recurring_bill_id, refMonth, expected_value || 0, due_date || null, source || 'manual', notes || null]
      );
      res.json(r.rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
  });

  app.put("/api/financeiro/recorrentes/entries/:id", async (req, res) => {
    try {
      const { expected_value, actual_value, status, due_date, notes } = req.body;
      const r = await pool.query(
        `UPDATE fin_recurring_bill_entries SET expected_value=COALESCE($1, expected_value), actual_value=COALESCE($2, actual_value),
         status=COALESCE($3, status), due_date=COALESCE($4, due_date), notes=COALESCE($5, notes), updated_at=NOW()
         WHERE id=$6 RETURNING *`,
        [expected_value, actual_value, status, due_date, notes, req.params.id]
      );
      res.json(r.rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
  });

  app.put("/api/financeiro/recorrentes/entries/:id/vincular", async (req, res) => {
    try {
      const { movement_asaas_id } = req.body;
      const movId = parseInt(movement_asaas_id);
      // Get the movement value and asaas_id (the FK references asaas_id, not id)
      const movRes = await pool.query(`SELECT asaas_id, value FROM fin_movements_asaas WHERE id = $1`, [movId]);
      if (movRes.rows.length === 0) return res.status(404).json({ error: "Movement not found" });
      const asaasId = movRes.rows[0].asaas_id;
      const actualValue = Math.abs(parseFloat(movRes.rows[0].value || '0'));

      // Update the entry
      const r = await pool.query(
        `UPDATE fin_recurring_bill_entries SET movement_asaas_id=$1, actual_value=$2, status='paid', updated_at=NOW()
         WHERE id=$3 RETURNING *`,
        [asaasId, actualValue, req.params.id]
      );
      const entry = r.rows[0];

      // Get the bill name and category to update the extrato
      const billRes = await pool.query(
        `SELECT b.name, c.description AS category_name, b.category_id
         FROM fin_recurring_bills b
         LEFT JOIN fin_categories c ON c.id = b.category_id
         WHERE b.id = $1`,
        [entry.recurring_bill_id]
      );
      if (billRes.rows.length > 0) {
        const bill = billRes.rows[0];
        await pool.query(
          `UPDATE fin_movements_asaas SET custom_description = $1, custom_category = $2, custom_category_id = $3, edited_at = NOW()
           WHERE id = $4`,
          [bill.name, bill.category_name || null, bill.category_id || null, movId]
        );
      }

      res.json(entry);
    } catch (err: any) { console.error("Vincular error:", err.message); res.status(500).json({ error: "Failed", detail: err.message }); }
  });

  // Desvincular — revert entry to pending and clear extrato customizations
  app.put("/api/financeiro/recorrentes/entries/:id/desvincular", async (req, res) => {
    try {
      // Get the current entry to find the linked movement
      const entryRes = await pool.query(`SELECT movement_asaas_id FROM fin_recurring_bill_entries WHERE id = $1`, [req.params.id]);
      if (entryRes.rows.length === 0) return res.status(404).json({ error: "Entry not found" });
      const asaasId = entryRes.rows[0].movement_asaas_id;

      // Revert the extrato movement (clear custom fields)
      if (asaasId) {
        await pool.query(
          `UPDATE fin_movements_asaas SET custom_description = NULL, custom_category = NULL, custom_category_id = NULL, edited_at = NOW()
           WHERE asaas_id = $1`,
          [asaasId]
        );
      }

      // Reset the entry
      const r = await pool.query(
        `UPDATE fin_recurring_bill_entries SET movement_asaas_id = NULL, actual_value = 0, status = 'pending', updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [req.params.id]
      );
      res.json(r.rows[0]);
    } catch (err: any) { console.error("Desvincular error:", err.message); res.status(500).json({ error: "Failed", detail: err.message }); }
  });

  // --- Items (itens de fatura manual) ---

  app.get("/api/financeiro/recorrentes/entries/:id/items", async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT i.*, c.description AS category_name
         FROM fin_recurring_bill_items i
         LEFT JOIN fin_categories c ON c.id = i.category_id
         WHERE i.entry_id = $1 ORDER BY i.id`,
        [req.params.id]
      );
      res.json(r.rows);
    } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
  });

  app.post("/api/financeiro/recorrentes/entries/:id/items", async (req, res) => {
    try {
      const { name, category_id, expected_value, notes } = req.body;
      const r = await pool.query(
        `INSERT INTO fin_recurring_bill_items (entry_id, name, category_id, expected_value, actual_value, status, notes)
         VALUES ($1, $2, $3, $4, 0, 'pending', $5) RETURNING *`,
        [req.params.id, name, category_id || null, expected_value || 0, notes || null]
      );
      // Recalculate entry expected_value from items
      await pool.query(
        `UPDATE fin_recurring_bill_entries SET expected_value = (SELECT COALESCE(SUM(expected_value), 0) FROM fin_recurring_bill_items WHERE entry_id = $1), updated_at=NOW() WHERE id = $1`,
        [req.params.id]
      );
      res.json(r.rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
  });

  app.put("/api/financeiro/recorrentes/items/:id", async (req, res) => {
    try {
      const { name, category_id, expected_value, actual_value, status, notes } = req.body;
      const r = await pool.query(
        `UPDATE fin_recurring_bill_items SET name=COALESCE($1,name), category_id=COALESCE($2,category_id),
         expected_value=COALESCE($3,expected_value), actual_value=COALESCE($4,actual_value),
         status=COALESCE($5,status), notes=COALESCE($6,notes), updated_at=NOW()
         WHERE id=$7 RETURNING *`,
        [name, category_id, expected_value, actual_value, status, notes, req.params.id]
      );
      // Recalculate parent entry actual_value
      if (r.rows[0]) {
        const entryId = r.rows[0].entry_id;
        await pool.query(
          `UPDATE fin_recurring_bill_entries SET actual_value = (SELECT COALESCE(SUM(actual_value), 0) FROM fin_recurring_bill_items WHERE entry_id = $1), updated_at=NOW() WHERE id = $1`,
          [entryId]
        );
      }
      res.json(r.rows[0]);
    } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
  });

  app.delete("/api/financeiro/recorrentes/items/:id", async (req, res) => {
    try {
      // Get entry_id before deleting
      const item = await pool.query(`SELECT entry_id FROM fin_recurring_bill_items WHERE id = $1`, [req.params.id]);
      await pool.query(`DELETE FROM fin_recurring_bill_items WHERE id = $1`, [req.params.id]);
      // Recalculate parent entry
      if (item.rows[0]) {
        const entryId = item.rows[0].entry_id;
        await pool.query(
          `UPDATE fin_recurring_bill_entries SET expected_value = (SELECT COALESCE(SUM(expected_value), 0) FROM fin_recurring_bill_items WHERE entry_id = $1),
           actual_value = (SELECT COALESCE(SUM(actual_value), 0) FROM fin_recurring_bill_items WHERE entry_id = $1), updated_at=NOW() WHERE id = $1`,
          [entryId]
        );
      }
      res.json({ ok: true });
    } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
  });

  // Contas a Receber (fin_receivables + fin_movements_asaas)
  app.get("/api/fin-receivables", async (req, res) => {
    try {
      const mes = (req.query.month as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy, fm] = mes.split('-').map(Number);
      const fn = fm === 12 ? 1 : fm + 1; const ny = fm === 12 ? fy + 1 : fy;
      const fim = `${ny}-${String(fn).padStart(2, '0')}-01`;

      // 1) A Receber — fin_receivables com status Pendente ou Confirmado (não pagos)
      const aReceberResult = await pool.query(`
        SELECT
          r.id,
          r.asaas_id,
          COALESCE(p.name, r.customer_name) AS customer_name,
          COALESCE(p.cnpjcpf, r.customer_cpfcnpj) AS customer_cpfcnpj,
          r.billing_type,
          r.status,
          r.value,
          r.net_value,
          r.due_date,
          r.payment_date,
          r.description,
          r.customer_id,
          r.invoice_url
        FROM fin_receivables r
        LEFT JOIN fin_people p ON p.asaas_id = r.customer_id
        WHERE r.due_date >= $1 AND r.due_date < $2
          AND r.status IN ('Pendente', 'PENDING')
        ORDER BY r.due_date ASC
      `, [inicio, fim]);

      const aReceber = aReceberResult.rows;
      const pendentes = aReceber.filter((r: any) => r.status === 'Pendente' || r.status === 'PENDING');
      const vencidos = aReceber.filter((r: any) => r.status === 'Confirmado' || r.status === 'OVERDUE');
      const total_a_receber = aReceber.reduce((s: number, r: any) => s + parseFloat(r.value || '0'), 0);

      // 2) Já Recebido — fin_movements_asaas (entradas, excluindo pares de antecipação e antecipações)
      const recebidoResult = await pool.query(`
        SELECT
          asaas_id,
          transaction_type,
          value,
          transaction_date,
          description,
          payment_id
        FROM fin_movements_asaas
        WHERE type = 1
          AND transaction_date >= $1
          AND transaction_date < $2
          AND is_anticipation_pair = false
          AND transaction_type NOT IN ('RECEIVABLE_ANTICIPATION', 'RECEIVABLE_ANTICIPATION_GROSS_CREDIT')
          AND account = 'asaas'
        ORDER BY transaction_date DESC
      `, [inicio, fim]);

      const recebidos = recebidoResult.rows;
      const total_recebido = recebidos.reduce((s: number, r: any) => s + parseFloat(r.value || '0'), 0);

      // 3) Antecipações — fin_movements_asaas (RECEIVABLE_ANTICIPATION_GROSS_CREDIT = crédito real do adiantamento)
      const antecipResult = await pool.query(`
        SELECT
          asaas_id,
          transaction_type,
          value,
          transaction_date,
          description,
          payment_id
        FROM fin_movements_asaas
        WHERE transaction_type = 'RECEIVABLE_ANTICIPATION_GROSS_CREDIT'
          AND transaction_date >= $1
          AND transaction_date < $2
          AND account = 'asaas'
        ORDER BY transaction_date DESC
      `, [inicio, fim]);

      const antecipacoes = antecipResult.rows;
      const total_antecipacoes = antecipacoes.reduce((s: number, r: any) => s + parseFloat(r.value || '0'), 0);

      // 4) Total do mês = Já Recebido + Antecipações
      const total_mes = total_recebido + total_antecipacoes;

      res.json({
        summary: {
          total_recebido,
          total_antecipacoes,
          total_a_receber,
          total_mes,
        },
        a_receber: {
          pendentes,
          vencidos,
        },
        recebidos,
        antecipacoes,
      });
    } catch (err) {
      console.error("Error fetching fin-receivables:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Receitas do mês (fin_receivables)
  app.get("/api/financeiro/receitas", async (req, res) => {
    try {
      const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy6, fm6] = mes.split('-').map(Number);
      const fn6 = fm6 === 12 ? 1 : fm6 + 1; const ny6 = fm6 === 12 ? fy6 + 1 : fy6;
      const fim = `${ny6}-${String(fn6).padStart(2,'0')}-01`;

      const result = await pool.query(`
        SELECT
          r.description,
          r.value as movement_value,
          r.net_value as value,
          r.payment_date as movement_date,
          r.due_date as expiration_date,
          r.status,
          r.billing_type as type_column,
          NULL as category_l1_ext_id,
          NULL as category_l2_ext_id,
          NULL as category_l3_ext_id,
          r.billing_type as payment_method,
          r.asaas_id as document_code
        FROM fin_receivables r
        WHERE r.due_date >= $1 AND r.due_date < $2
        ORDER BY r.due_date DESC
      `, [inicio, fim]);

      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching financeiro receitas:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // Extrato completo do mês (fin_movements_asaas)
  app.get("/api/financeiro/extrato", async (req, res) => {
    try {
      let inicio: string;
      let fim: string;

      if (req.query.start && req.query.end) {
        inicio = req.query.start as string;
        const endDate = new Date(req.query.end as string);
        endDate.setDate(endDate.getDate() + 1);
        fim = endDate.toISOString().slice(0, 10);
      } else {
        const mes = (req.query.mes as string) || new Date().toISOString().slice(0, 7);
        inicio = `${mes}-01`;
        const [fy, fm] = mes.split('-').map(Number);
        const fn = fm === 12 ? 1 : fm + 1; const ny = fm === 12 ? fy + 1 : fy;
        fim = `${ny}-${String(fn).padStart(2,'0')}-01`;
      }

      // Transaction type labels for categories
      const TRANSACTION_LABELS: Record<string, string> = {
        'PAYMENT_RECEIVED': 'Cobrança Recebida',
        'PAYMENT_FEE': 'Despesas Financeiras',
        'TRANSFER': 'Transferência',
        'BILL_PAYMENT': 'Pagamento de Conta',
        'RECEIVABLE_ANTICIPATION_GROSS_CREDIT': 'Antecipação Recebível',
        'RECEIVABLE_ANTICIPATION_DEBIT': 'Antecipação Débito',
        'PAYMENT_REVERSAL': 'Estorno',
      };

      // Account filter
      const accountParam = (req.query.account as string) || 'all';
      let accountClause = '';
      const queryParams: any[] = [inicio, fim];
      if (accountParam === 'asaas') { accountClause = ` AND account = $3`; queryParams.push('asaas'); }
      else if (accountParam === 'sicredi') { accountClause = ` AND account = $3`; queryParams.push('sicredi'); }

      const isDayFilter = !!(req.query.start && req.query.end);

      // Para filtro por dia: Sicredi aparece apenas no dia 18 do mês seguinte ao billing_month
      // Para filtro por mês: Sicredi aparece todos os itens do billing_month (comportamento atual)
      let sicrediClause: string;
      let sicrediParams: any[];

      if (isDayFilter) {
        // Verifica se o dia filtrado é dia 18 de algum mês. Se sim, mostra itens do billing_month anterior.
        // Ex: filtro 2026-04-18 → mostra itens com billing_month = '2026-03'
        // billing_month do item = mês anterior ao dia de pagamento
        sicrediClause = `(account = 'sicredi' AND sicredi_status = 'realizado'
          AND (billing_month || '-18')::date >= $1
          AND (billing_month || '-18')::date < $2)`;
        sicrediParams = [];
      } else {
        // Modo mês: mostra todos os itens do billing_month selecionado
        sicrediClause = `(account = 'sicredi' AND billing_month = $${queryParams.length + 1} AND sicredi_status = 'realizado')`;
        sicrediParams = [inicio.slice(0, 7)];
      }

      const result = await pool.query(`
        SELECT
          id,
          asaas_id,
          type,
          transaction_type,
          value,
          CASE
            WHEN account = 'sicredi' AND $${queryParams.length + sicrediParams.length + 1}
              THEN (billing_month || '-18')::date
            ELSE transaction_date
          END AS transaction_date,
          description,
          balance,
          payment_id,
          custom_description,
          custom_category,
          custom_category_id,
          user_comment,
          edited_at,
          edited_by,
          is_anticipation_pair,
          account,
          sicredi_status,
          billing_month,
          COALESCE(custom_description, description) AS display_description,
          COALESCE(custom_category, grapehub_category) AS display_category
        FROM fin_movements_asaas
        WHERE (
          (account != 'sicredi' AND transaction_date >= $1 AND transaction_date < $2)
          OR
          ${sicrediClause}
        )
          AND LOWER(COALESCE(custom_category, '')) NOT IN ('transferencia entre contas', 'transferência entre contas')
          ${accountClause}
        ORDER BY transaction_date DESC, id DESC
      `, [...queryParams, ...sicrediParams, isDayFilter]);


      // Map to ExtratoItem format expected by frontend
      const rows = result.rows.map((r: any) => {
        const val = Math.abs(parseFloat(r.value || '0'));
        const isEntrada = r.type === 1;
        const autoCategory = TRANSACTION_LABELS[r.transaction_type] || r.transaction_type;
        const catLabel = r.display_category || autoCategory;

        // Extract person name from display_description (which is custom or original)
        const desc = r.display_description || '';
        let personName: string | null = null;
        if (desc) {
          const match = desc.match(/\d+\s+(.+)$/);
          if (match) personName = match[1].trim();
          else {
            const dashIdx = desc.lastIndexOf(' - ');
            if (dashIdx >= 0) {
              const after = desc.slice(dashIdx + 3).trim();
              if (after && !/^fatura|^rec|^Taxa/i.test(after)) personName = after;
            }
          }
        }
        // For TRANSFER type, extract name from description
        if (r.transaction_type === 'TRANSFER' && desc) {
          const transferMatch = desc.match(/para\s+(.+)/i) || desc.match(/chave\s+para\s+(.+)/i);
          if (transferMatch) personName = transferMatch[1].trim();
        }

        const isEdited = !!(r.custom_description || r.custom_category);
        const isSicredi = r.account === 'sicredi';
        const sicrediPending = isSicredi && (r.sicredi_status === 'pendente');

        return {
          id: r.id,
          description: r.display_description || catLabel,
          original_description: r.description,
          custom_description: r.custom_description || null,
          movement_value: isEntrada ? val.toFixed(2) : (-val).toFixed(2),
          value: val.toFixed(2),
          movement_date: r.transaction_date,
          expiration_date: r.transaction_date,
          status: sicrediPending ? 'Pendente' : 'Realizado',
          type_column: sicrediPending ? 'previsto' : 'realizado',
          source: r.transaction_type === 'PAYMENT_RECEIVED' ? 'bills_to_receive' :
                  r.transaction_type === 'BILL_PAYMENT' ? 'bills_to_pay' :
                  r.transaction_type === 'TRANSFER' ? (isEntrada ? 'transfer_in' : 'transfer_out') :
                  r.transaction_type,
          type: isEntrada ? 1 : -1,
          payment_method: r.transaction_type === 'PAYMENT_RECEIVED' ? 'cobrança' :
                          r.transaction_type === 'TRANSFER' ? 'transferência' :
                          r.transaction_type === 'BILL_PAYMENT' ? 'pagamento' :
                          r.transaction_type === 'PAYMENT_FEE' ? 'taxa' : 'outros',
          document_code: r.asaas_id || '',
          grapehub_category: catLabel,
          custom_category: r.custom_category || null,
          custom_category_id: r.custom_category_id || null,
          person_name: personName,
          person_fantasy_name: null,
          comments: r.user_comment || null,
          is_edited: isEdited,
          edited_at: r.edited_at || null,
          edited_by: r.edited_by || null,
          is_anticipation_pair: r.is_anticipation_pair || false,
          account: r.account || 'asaas',
        };
      });

      res.json(rows);
    } catch (err) {
      console.error("Error fetching financeiro extrato:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // GET /api/financeiro/extrato/last-import — get last import date for an account
  app.get("/api/financeiro/extrato/last-import", async (req, res) => {
    try {
      const account = (req.query.account as string) || 'sicredi';
      const r = await pool.query(`SELECT MAX(synced_at) AS last_import FROM fin_movements_asaas WHERE account = $1`, [account]);
      res.json({ last_import: r.rows[0]?.last_import || null });
    } catch (err) { console.error(err); res.status(500).json({ error: "Failed" }); }
  });

  // POST /api/financeiro/extrato/importar — import OFX or CSV file
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  app.post("/api/financeiro/extrato/importar-ofx", upload.single('file'), async (req: any, res) => {
    try {
      const account = (req.body.account as string) || 'sicredi';
      const billingMonth = (req.body.billing_month as string) || null;
      const fileBuffer = req.file?.buffer;
      if (!fileBuffer) return res.status(400).json({ error: 'No file uploaded' });

      const content = fileBuffer.toString('utf-8');
      const fileName = (req.file?.originalname || '').toLowerCase();
      const isCSV = fileName.endsWith('.csv') || (!fileName.endsWith('.ofx') && content.includes(';'));

      const transactions: { fitid: string; trntype: string; trnamt: number; dtposted: string; memo: string }[] = [];

      if (isCSV) {
        // ── CSV Parser — Sicredi credit card statement format ──
        // The file has metadata at the top, then one or more card sections.
        // Each card section starts with a "Cartão" row, then a header row:
        //   Data | Descrição | Parcela | Valor | Valor em Dólar
        // Followed by transaction rows until the next blank or "Cartão" row.

        const lines = content.split(/\r?\n/);
        if (lines.length < 2) return res.status(400).json({ error: 'CSV vazio ou inválido' });

        // Detect delimiter
        const semiCount = (content.match(/;/g) || []).length;
        const commaCount = (content.match(/,/g) || []).length;
        const tabCount = (content.match(/\t/g) || []).length;
        const delimiter = tabCount > semiCount && tabCount > commaCount ? '\t' : semiCount > commaCount ? ';' : ',';

        const normalize = (s: string) => s.trim().replace(/^["']|["']$/g, '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const parseBRValue = (str: string): number => {
          if (!str) return 0;
          let s = str.replace(/["']/g, '').trim();
          if (!s || s === '-') return 0;
          // Remove R$, U$, etc prefix
          s = s.replace(/^-?\s*[RU]\$\s*/i, (match) => match.startsWith('-') ? '-' : '');
          // If it was negative: -R$ 22.941,65
          if (str.trim().startsWith('-')) s = '-' + s.replace('-', '');
          // Brazilian format: 1.234,56
          if (s.includes(',')) {
            s = s.replace(/\./g, '').replace(',', '.');
          }
          return parseFloat(s) || 0;
        };

        const parseBRDate = (str: string): string | null => {
          if (!str) return null;
          const s = str.replace(/["']/g, '').trim();
          const brMatch = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
          if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`;
          const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
          const brShort = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);
          if (brShort) {
            const yr = parseInt(brShort[3]) > 50 ? `19${brShort[3]}` : `20${brShort[3]}`;
            return `${yr}-${brShort[2].padStart(2, '0')}-${brShort[1].padStart(2, '0')}`;
          }
          return null;
        };

        let currentCardLabel = '';
        let inTransactions = false;
        let dateCol = -1, descCol = -1, parcelaCol = -1, valorCol = -1;
        let rowIdx = 0;

        for (let i = 0; i < lines.length; i++) {
          const raw = lines[i];
          if (!raw.trim()) { inTransactions = false; continue; }

          const cols = raw.split(delimiter).map((c: string) => c.trim().replace(/^["']|["']$/g, ''));

          // Detect "Cartão" row — marks a new card section
          if (normalize(cols[0]) === 'cartao') {
            currentCardLabel = cols[1] || '';
            inTransactions = false;
            continue;
          }

          // Detect header row: first col is "Data", second is "Descrição"
          if (normalize(cols[0]) === 'data' && cols.length >= 3) {
            dateCol = 0;
            descCol = -1; parcelaCol = -1; valorCol = -1;
            for (let c = 1; c < cols.length; c++) {
              const h = normalize(cols[c]);
              if (h.includes('descricao') || h.includes('historico')) descCol = c;
              else if (h.includes('parcela')) parcelaCol = c;
              else if (h === 'valor' || h.includes('valor') && !h.includes('dolar')) valorCol = c;
            }
            if (descCol === -1) descCol = 1; // fallback
            if (valorCol === -1) valorCol = cols.length >= 4 ? 3 : 2; // fallback
            inTransactions = true;
            continue;
          }

          // Parse transaction rows
          if (!inTransactions || dateCol === -1) continue;

          const dateStr = parseBRDate(cols[dateCol] || '');
          if (!dateStr) continue; // Skip rows that don't start with a valid date

          const description = (descCol >= 0 ? cols[descCol] : '') || 'Sem descrição';
          const parcela = parcelaCol >= 0 ? cols[parcelaCol] || '' : '';
          const amount = valorCol >= 0 ? parseBRValue(cols[valorCol]) : 0;

          if (amount === 0) continue;

          // Skip payment items ("Pag Fat Deb Cc" etc.) — these are credit card bill payments
          const descLower = description.toLowerCase();
          if (descLower.startsWith('pag fat') || descLower.startsWith('pagamento fatura') || descLower.includes('pag fat deb')) continue;

          // Build full description with parcela info
          const fullDesc = parcela ? `${description} ${parcela}` : description;

          // Generate unique ID from date + description + value + card + row
          const rawId = `${dateStr}_${fullDesc}_${amount.toFixed(2)}_${currentCardLabel}_${rowIdx}`;
          const fitid = crypto.createHash('md5').update(rawId).digest('hex').slice(0, 16);
          rowIdx++;

          // Credit card items are all expenses (negative) except payments (which are negative in the CSV = credit)
          const isPayment = amount < 0; // Negative values like "Pag Fat Deb Cc" = payment
          transactions.push({
            fitid,
            trntype: isPayment ? 'CREDIT' : 'DEBIT',
            trnamt: isPayment ? Math.abs(amount) : -Math.abs(amount), // expenses = negative, payments = positive
            dtposted: dateStr,
            memo: fullDesc,
          });
        }
      } else {
        // ── OFX Parser ──
        const trnRegex = /<STMTTRN>[\s\S]*?<\/STMTTRN>/gi;
        const matches = content.match(trnRegex) || [];

        for (const block of matches) {
          const getTag = (tag: string) => {
            const xmlMatch = block.match(new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i'));
            if (xmlMatch) return xmlMatch[1].trim();
            const sgmlMatch = block.match(new RegExp(`<${tag}>(.+)`, 'i'));
            return sgmlMatch ? sgmlMatch[1].trim() : '';
          };

          const fitid = getTag('FITID');
          const trntype = getTag('TRNTYPE');
          const trnamtStr = getTag('TRNAMT');
          const dtposted = getTag('DTPOSTED');
          const memo = getTag('MEMO') || getTag('NAME') || 'Sem descrição';

          if (!fitid || !trnamtStr) continue;

          const trnamt = parseFloat(trnamtStr.replace(',', '.'));
          const dateStr = dtposted.length >= 8 ? `${dtposted.slice(0,4)}-${dtposted.slice(4,6)}-${dtposted.slice(6,8)}` : new Date().toISOString().slice(0,10);

          transactions.push({ fitid, trntype, trnamt, dtposted: dateStr, memo });
        }
      }

      if (transactions.length === 0) {
        return res.status(400).json({ error: 'Nenhuma transação encontrada no arquivo. Verifique o formato.' });
      }

      let inserted = 0;
      let skipped = 0;

      for (const tx of transactions) {
        const asaasId = `${account}_${tx.fitid}`;
        const type = tx.trnamt >= 0 ? 1 : -1;
        const value = Math.abs(tx.trnamt);
        const txType = tx.trntype || (type === 1 ? 'CREDIT' : 'DEBIT');

        const r = await pool.query(
          `INSERT INTO fin_movements_asaas (asaas_id, type, transaction_type, value, transaction_date, description, account, sicredi_status, billing_month, synced_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           ON CONFLICT (asaas_id) DO UPDATE SET billing_month = COALESCE(EXCLUDED.billing_month, fin_movements_asaas.billing_month)
           RETURNING id, (xmax = 0) AS was_inserted`,
          [asaasId, type, txType, value, tx.dtposted, tx.memo, account, account === 'sicredi' ? 'pendente' : 'realizado', billingMonth]
        );
        if (r.rows.length > 0 && r.rows[0].was_inserted) inserted++;
        else skipped++;
      }

      // ── Auto-provision: create/update recurring bill entry for Sicredi card ──
      if (account === 'sicredi' && billingMonth) {
        try {
          // Find or create the "Cartão Sicredi" recurring bill
          let billRes = await pool.query(
            `SELECT id FROM fin_recurring_bills WHERE LOWER(name) LIKE '%sicredi%' AND LOWER(name) LIKE '%cart%' LIMIT 1`
          );
          let billId: number;
          if (billRes.rows.length === 0) {
            // Auto-create the bill
            const newBill = await pool.query(
              `INSERT INTO fin_recurring_bills (name, description, due_day, is_active, default_value)
               VALUES ('Cartão Sicredi', 'Fatura do cartão de crédito Sicredi', 18, true, 0) RETURNING id`
            );
            billId = newBill.rows[0].id;
          } else {
            billId = billRes.rows[0].id;
          }

          // Calculate total of Sicredi items for this billing month
          const totalRes = await pool.query(
            `SELECT COALESCE(SUM(ABS(value::numeric)), 0) AS total
             FROM fin_movements_asaas
             WHERE account = 'sicredi' AND billing_month = $1`,
            [billingMonth]
          );
          const faturaTotal = parseFloat(totalRes.rows[0].total) || 0;

          // Check current status of Sicredi items
          const statusRes = await pool.query(
            `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE sicredi_status = 'realizado') AS paid
             FROM fin_movements_asaas WHERE account = 'sicredi' AND billing_month = $1`,
            [billingMonth]
          );
          const allPaid = statusRes.rows[0].total > 0 && statusRes.rows[0].total === statusRes.rows[0].paid;

          const refMonth = billingMonth + '-01';
          const [bY, bM] = billingMonth.split('-').map(Number);
          const dueDate = `${bY}-${String(bM).padStart(2, '0')}-18`;

          // Check if entry already exists
          const existingEntry = await pool.query(
            `SELECT id, status FROM fin_recurring_bill_entries WHERE recurring_bill_id = $1 AND reference_month = $2`,
            [billId, refMonth]
          );

          if (existingEntry.rows.length > 0) {
            // Update existing — but don't overwrite if already paid
            const entry = existingEntry.rows[0];
            if (entry.status !== 'paid') {
              await pool.query(
                `UPDATE fin_recurring_bill_entries SET expected_value = $1, updated_at = NOW() WHERE id = $2`,
                [faturaTotal, entry.id]
              );
            }
          } else {
            // Create new entry
            await pool.query(
              `INSERT INTO fin_recurring_bill_entries (recurring_bill_id, reference_month, expected_value, actual_value, due_date, source, status)
               VALUES ($1, $2, $3, 0, $4, 'manual', 'pending')`,
              [billId, refMonth, faturaTotal, dueDate]
            );
          }
        } catch (provErr: any) {
          console.error('Auto-provision Sicredi error (non-fatal):', provErr.message);
        }
      }

      res.json({ inserted, skipped, total: transactions.length });
    } catch (err: any) {
      console.error('Import error:', err.message);
      res.status(500).json({ error: 'Failed to import file', detail: err.message });
    }
  });

  // PATCH /api/financeiro/extrato/:id — unified edit endpoint for fin_movements_asaas
  app.patch("/api/financeiro/extrato/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { custom_description, custom_category, custom_category_id, user_comment, edited_by } = req.body;

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      if (custom_description !== undefined) {
        setClauses.push(`custom_description = $${paramIdx++}`);
        values.push(custom_description || null);
      }
      if (custom_category !== undefined) {
        setClauses.push(`custom_category = $${paramIdx++}`);
        values.push(custom_category || null);
        // Also sync grapehub_category for backward compat
        setClauses.push(`grapehub_category = $${paramIdx++}`);
        values.push(custom_category || null);
      }
      if (custom_category_id !== undefined) {
        setClauses.push(`custom_category_id = $${paramIdx++}`);
        values.push(custom_category_id || null);
      }
      if (user_comment !== undefined) {
        setClauses.push(`user_comment = $${paramIdx++}`);
        values.push(user_comment || null);
        // Also sync comments for backward compat
        setClauses.push(`comments = $${paramIdx++}`);
        values.push(user_comment || null);
      }

      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      setClauses.push(`edited_at = NOW()`);
      if (edited_by) {
        setClauses.push(`edited_by = $${paramIdx++}`);
        values.push(edited_by);
      }

      values.push(id);
      const result = await pool.query(
        `UPDATE fin_movements_asaas SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING id, custom_description, custom_category, custom_category_id, user_comment, edited_at, edited_by`,
        values
      );

      if (result.rowCount === 0) return res.status(404).json({ error: 'Movement not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating movement:", err);
      res.status(500).json({ error: "Failed to update" });
    }
  });

  // Backward compat: PATCH /api/financeiro/extrato/:id/category
  app.patch("/api/financeiro/extrato/:id/category", async (req, res) => {
    try {
      const { id } = req.params;
      const { category } = req.body as { category: string | null };
      const result = await pool.query(
        'UPDATE fin_movements_asaas SET custom_category = $1, grapehub_category = $1, edited_at = NOW() WHERE id = $2 RETURNING id, custom_category',
        [category || null, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Movement not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating category:", err);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  // ═══════════════════════════════════════════════════════
  // Financial Categories CRUD
  // ═══════════════════════════════════════════════════════

  // GET /api/fin-categories — returns the full category tree
  app.get("/api/fin-categories", async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, external_id, structure, description, level FROM fin_categories ORDER BY structure ASC'
      );
      const all = result.rows;

      // Build tree: level 1 → children (level 2) → children (level 3)
      const tree: any[] = [];
      const mapL1: Record<string, any> = {};
      const mapL2: Record<string, any> = {};

      for (const row of all) {
        const node = { ...row, children: [] };
        const parts = row.structure.split('.');

        if (row.level === 1) {
          mapL1[parts[0]] = node;
          tree.push(node);
        } else if (row.level === 2) {
          mapL2[`${parts[0]}.${parts[1]}`] = node;
          const parent = mapL1[parts[0]];
          if (parent) parent.children.push(node);
          else tree.push(node);
        } else if (row.level === 3) {
          const parent = mapL2[`${parts[0]}.${parts[1]}`];
          if (parent) parent.children.push(node);
          else {
            const grandparent = mapL1[parts[0]];
            if (grandparent) grandparent.children.push(node);
            else tree.push(node);
          }
        }
      }

      res.json({ tree, flat: all });
    } catch (err) {
      console.error("Error fetching fin-categories:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // POST /api/fin-categories — add a new subcategory
  app.post("/api/fin-categories", async (req, res) => {
    try {
      const { parent_structure, description } = req.body;
      if (!parent_structure || !description) {
        return res.status(400).json({ error: 'parent_structure and description required' });
      }

      // Determine the level and next structure code
      const parentParts = parent_structure.split('.');
      const newLevel = parentParts.length + 1;
      if (newLevel > 3) {
        return res.status(400).json({ error: 'Maximum 3 levels allowed' });
      }

      // Find existing children to determine next code
      const siblings = await pool.query(
        `SELECT structure FROM fin_categories WHERE structure LIKE $1 AND level = $2`,
        [`${parent_structure}.%`, newLevel]
      );

      let nextCode: string;
      if (siblings.rowCount && siblings.rowCount > 0) {
        // Extract the numeric suffix from each sibling and find the max
        let maxNum = 0;
        for (const row of siblings.rows) {
          const parts = row.structure.split('.');
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
        // Skip 99 (reserved for "Outros/Outras") — place before it
        const next = maxNum >= 99 ? maxNum + 1 : maxNum + 1;
        nextCode = next < 10 ? `0${next}` : String(next);
      } else {
        nextCode = '01';
      }

      const newStructure = `${parent_structure}.${nextCode}`;
      const maxId = await pool.query('SELECT COALESCE(MAX(external_id), 900000) + 1 AS next FROM fin_categories');
      const nextExternalId = maxId.rows[0].next;

      const result = await pool.query(
        `INSERT INTO fin_categories (external_id, structure, description, level) VALUES ($1, $2, $3, $4) RETURNING *`,
        [nextExternalId, newStructure, description, newLevel]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating fin-category:", err);
      res.status(500).json({ error: "Failed to create" });
    }
  });

  // PATCH /api/fin-categories/:id — update description
  app.patch("/api/fin-categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { description } = req.body;
      if (!description) return res.status(400).json({ error: 'description required' });

      const result = await pool.query(
        'UPDATE fin_categories SET description = $1 WHERE id = $2 RETURNING *',
        [description, id]
      );

      if (result.rowCount === 0) return res.status(404).json({ error: 'Category not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating fin-category:", err);
      res.status(500).json({ error: "Failed to update" });
    }
  });

  // POST /api/fin-categories/root — add a new root-level (level 1) category
  app.post("/api/fin-categories/root", async (req, res) => {
    try {
      const { description } = req.body;
      if (!description) return res.status(400).json({ error: 'description required' });

      // Find the next root structure code
      const lastRoot = await pool.query(
        `SELECT structure FROM fin_categories WHERE level = 1 ORDER BY structure DESC LIMIT 1`
      );
      let nextCode: string;
      if (lastRoot.rowCount && lastRoot.rowCount > 0) {
        const lastNum = parseInt(lastRoot.rows[0].structure, 10);
        nextCode = String(lastNum + 1).padStart(2, '0');
      } else {
        nextCode = '01';
      }

      const maxId = await pool.query('SELECT COALESCE(MAX(external_id), 900000) + 1 AS next FROM fin_categories');
      const nextExternalId = maxId.rows[0].next;

      const result = await pool.query(
        `INSERT INTO fin_categories (external_id, structure, description, level) VALUES ($1, $2, $3, 1) RETURNING *`,
        [nextExternalId, nextCode, description]
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating root fin-category:", err);
      res.status(500).json({ error: "Failed to create" });
    }
  });

  // ═══════════════════════════════════════════════════════
  // Reconciliation Rules Engine
  // ═══════════════════════════════════════════════════════

  // GET /api/fin-reconciliation-rules — list all rules
  app.get("/api/fin-reconciliation-rules", async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT r.*, c.structure AS category_structure FROM fin_reconciliation_rules r LEFT JOIN fin_categories c ON r.category_id = c.id ORDER BY r.priority ASC, r.created_at ASC'
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching reconciliation rules:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // GET /api/fin-reconciliation-rules/stats — pending count
  app.get("/api/fin-reconciliation-rules/stats", async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT COUNT(*) AS pending FROM fin_movements_asaas WHERE custom_category IS NULL AND (grapehub_category IS NULL OR grapehub_category = '')"
      );
      res.json({ pending: parseInt(result.rows[0].pending, 10) });
    } catch (err) {
      console.error("Error fetching reconciliation stats:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // POST /api/fin-reconciliation-rules — create rule
  app.post("/api/fin-reconciliation-rules", async (req, res) => {
    try {
      const { name, match_text, match_type, category_id, category_name, priority, created_by } = req.body;
      if (!name || !match_text) return res.status(400).json({ error: 'name and match_text required' });

      const result = await pool.query(
        `INSERT INTO fin_reconciliation_rules (name, match_text, match_type, category_id, category_name, priority, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, match_text, match_type || 'contains', category_id || null, category_name || null, priority || 0, created_by || null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating reconciliation rule:", err);
      res.status(500).json({ error: "Failed to create" });
    }
  });

  // PUT /api/fin-reconciliation-rules/:id — update rule
  app.put("/api/fin-reconciliation-rules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, match_text, match_type, category_id, category_name, is_active, priority } = req.body;

      const result = await pool.query(
        `UPDATE fin_reconciliation_rules 
         SET name = COALESCE($1, name), 
             match_text = COALESCE($2, match_text), 
             match_type = COALESCE($3, match_type),
             category_id = $4,
             category_name = $5,
             is_active = COALESCE($6, is_active),
             priority = COALESCE($7, priority)
         WHERE id = $8 RETURNING *`,
        [name, match_text, match_type, category_id ?? null, category_name ?? null, is_active, priority, id]
      );

      if (result.rowCount === 0) return res.status(404).json({ error: 'Rule not found' });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating reconciliation rule:", err);
      res.status(500).json({ error: "Failed to update" });
    }
  });

  // DELETE /api/fin-reconciliation-rules/:id — delete rule
  app.delete("/api/fin-reconciliation-rules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM fin_reconciliation_rules WHERE id = $1 RETURNING id', [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: 'Rule not found' });
      res.json({ deleted: true, id: parseInt(id) });
    } catch (err) {
      console.error("Error deleting reconciliation rule:", err);
      res.status(500).json({ error: "Failed to delete" });
    }
  });

  // ── Helper: apply anticipation pairing logic ──
  async function applyAnticipationPairing(): Promise<{ pairsFound: number; updated: number; reset: number }> {
    // Step 1: Reset ALL is_anticipation_pair to false (clean slate)
    const resetResult = await pool.query(`
      UPDATE fin_movements_asaas
      SET is_anticipation_pair = false
      WHERE is_anticipation_pair = true
      RETURNING id
    `);
    const reset = resetResult.rowCount || 0;

    // Step 2: Match pairs by invoice number ("fatura nr. XXXXX") in description
    // 'Cobranca recebida' + 'Baixa da antecipacao' with same invoice number → both marked as pair
    // ONLY protect RECEIVABLE_ANTICIPATION itself (the real cash advance entry that should always show)
    // RECEIVABLE_ANTICIPATION_DEBIT = "Baixa da antecipacao" → SHOULD be marked as pair
    const pairsResult = await pool.query(`
      SELECT
        cr.id as cobranca_id,
        ba.id as baixa_id
      FROM fin_movements_asaas cr
      JOIN fin_movements_asaas ba
        ON ba.description ILIKE 'Baixa da antecipacao%'
        AND SUBSTRING(ba.description FROM 'fatura nr[.] ?([0-9]+)')
          = SUBSTRING(cr.description FROM 'fatura nr[.] ?([0-9]+)')
      WHERE cr.description ILIKE 'Cobranca recebida%'
        AND SUBSTRING(cr.description FROM 'fatura nr[.] ?([0-9]+)') IS NOT NULL
        AND cr.transaction_type != 'RECEIVABLE_ANTICIPATION'
    `);

    const pairs = pairsResult.rows;
    let updated = 0;

    for (const pair of pairs) {
      const result = await pool.query(`
        UPDATE fin_movements_asaas
        SET is_anticipation_pair = true,
            custom_category = 'Baixa da antecipação Asaas',
            custom_category_id = 92,
            grapehub_category = 'Baixa da antecipação Asaas',
            edited_at = NOW(),
            edited_by = 'conciliacao-auto'
        WHERE id IN ($1, $2)
          AND transaction_type != 'RECEIVABLE_ANTICIPATION'
        RETURNING id
      `, [pair.cobranca_id, pair.baixa_id]);
      updated += result.rowCount || 0;
    }

    // Step 3: Also mark any standalone 'Baixa da antecipacao' that didn't match a pair
    // These are always anticipation-related and should be hidden
    const standaloneResult = await pool.query(`
      UPDATE fin_movements_asaas
      SET is_anticipation_pair = true,
          custom_category = 'Baixa da antecipação Asaas',
          custom_category_id = 92,
          grapehub_category = 'Baixa da antecipação Asaas',
          edited_at = NOW(),
          edited_by = 'conciliacao-auto'
      WHERE description ILIKE 'Baixa da antecipacao%'
        AND is_anticipation_pair = false
        AND transaction_type != 'RECEIVABLE_ANTICIPATION'
      RETURNING id
    `);
    updated += standaloneResult.rowCount || 0;

    return { pairsFound: pairs.length, updated, reset };
  }

  // POST /api/fin-reconciliation-rules/apply-anticipation — only apply anticipation pairing
  app.post("/api/fin-reconciliation-rules/apply-anticipation", async (_req, res) => {
    try {
      const result = await applyAnticipationPairing();
      res.json(result);
    } catch (err) {
      console.error("Error applying anticipation pairing:", err);
      res.status(500).json({ error: "Failed to apply anticipation pairing" });
    }
  });

  // GET /api/financeiro/extrato/anticipation-stats — anticipation summary for a period
  app.get("/api/financeiro/extrato/anticipation-stats", async (req, res) => {
    try {
      const start = req.query.start as string;
      const end = req.query.end as string;
      if (!start || !end) return res.status(400).json({ error: 'start and end required' });

      const endDate = new Date(end);
      endDate.setDate(endDate.getDate() + 1);
      const fim = endDate.toISOString().slice(0, 10);

      // Total antecipado bruto (Antecipacao entries = credit type=1)
      const brutoResult = await pool.query(`
        SELECT COALESCE(SUM(ABS(value::numeric)), 0) as total, COUNT(*) as count
        FROM fin_movements_asaas
        WHERE description ILIKE 'Antecipacao%'
          AND type = 1
          AND transaction_date >= $1 AND transaction_date < $2
      `, [start, fim]);

      // Total taxas de antecipação
      const taxasResult = await pool.query(`
        SELECT COALESCE(SUM(ABS(value::numeric)), 0) as total, COUNT(*) as count
        FROM fin_movements_asaas
        WHERE description ILIKE 'Taxa de antecipacao%'
          AND transaction_date >= $1 AND transaction_date < $2
      `, [start, fim]);

      // Pairs count
      const pairsResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM fin_movements_asaas
        WHERE is_anticipation_pair = true
          AND transaction_date >= $1 AND transaction_date < $2
      `, [start, fim]);

      const bruto = parseFloat(brutoResult.rows[0].total);
      const taxas = parseFloat(taxasResult.rows[0].total);

      res.json({
        antecipado_bruto: bruto,
        taxas_antecipacao: taxas,
        liquido: bruto - taxas,
        count_antecipacoes: parseInt(brutoResult.rows[0].count),
        count_taxas: parseInt(taxasResult.rows[0].count),
        count_pares: parseInt(pairsResult.rows[0].count),
      });
    } catch (err) {
      console.error("Error fetching anticipation stats:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  // POST /api/fin-reconciliation-rules/apply — apply anticipation + text rules
  app.post("/api/fin-reconciliation-rules/apply", async (req, res) => {
    try {
      const details: { rule: string; applied: number }[] = [];
      let totalApplied = 0;

      // ── Step 1: Apply anticipation pairing first ──
      const anticipation = await applyAnticipationPairing();
      if (anticipation.updated > 0) {
        totalApplied += anticipation.updated;
        details.push({ rule: '🔗 Pares de Antecipação', applied: anticipation.updated });
      }

      // ── Step 2: Apply text-matching rules on uncategorized items ──
      const rulesResult = await pool.query(
        "SELECT * FROM fin_reconciliation_rules WHERE is_active = true ORDER BY priority ASC, created_at ASC"
      );
      const rules = rulesResult.rows;

      for (const rule of rules) {
        const matchText = rule.match_text;
        let pattern: string;
        switch (rule.match_type) {
          case 'starts_with':
            pattern = `${matchText}%`;
            break;
          case 'exact':
            pattern = matchText;
            break;
          default:
            pattern = `%${matchText}%`;
            break;
        }

        const updateResult = await pool.query(
          `UPDATE fin_movements_asaas
           SET custom_category = $2,
               custom_category_id = $3,
               grapehub_category = $2,
               edited_at = NOW(),
               edited_by = 'regra-auto'
           WHERE custom_category IS NULL
             AND (grapehub_category IS NULL OR grapehub_category = '')
             AND is_anticipation_pair = false
             AND description ILIKE $1
           RETURNING id`,
          [pattern, rule.category_name, rule.category_id]
        );

        const count = updateResult.rowCount || 0;
        if (count > 0) {
          totalApplied += count;
          details.push({ rule: rule.name, applied: count });
        }
      }

      res.json({ applied: totalApplied, details, anticipation });
    } catch (err) {
      console.error("Error applying reconciliation rules:", err);
      res.status(500).json({ error: "Failed to apply rules" });
    }
  });

  // ── Auto-apply: roda as regras de conciliação automaticamente ──
  let isAutoApplying = false;
  async function autoApplyReconciliationRules() {
    if (isAutoApplying) return;
    isAutoApplying = true;
    try {
      // Verifica se existem itens não categorizados
      const pendingCheck = await pool.query(`
        SELECT COUNT(*) as count FROM fin_movements_asaas
        WHERE custom_category IS NULL
          AND (grapehub_category IS NULL OR grapehub_category = '')
          AND is_anticipation_pair = false
      `);
      const pending = parseInt(pendingCheck.rows[0].count);
      if (pending === 0) {
        isAutoApplying = false;
        return;
      }

      // 1) Anticipation pairing
      await applyAnticipationPairing();

      // 2) Text-matching rules
      const rulesResult = await pool.query(
        "SELECT * FROM fin_reconciliation_rules WHERE is_active = true ORDER BY priority ASC, created_at ASC"
      );
      let totalApplied = 0;
      for (const rule of rulesResult.rows) {
        const matchText = rule.match_text;
        let pattern: string;
        switch (rule.match_type) {
          case 'starts_with': pattern = `${matchText}%`; break;
          case 'exact': pattern = matchText; break;
          default: pattern = `%${matchText}%`; break;
        }
        const updateResult = await pool.query(
          `UPDATE fin_movements_asaas
           SET custom_category = $2,
               custom_category_id = $3,
               grapehub_category = $2,
               edited_at = NOW(),
               edited_by = 'regra-auto'
           WHERE custom_category IS NULL
             AND (grapehub_category IS NULL OR grapehub_category = '')
             AND is_anticipation_pair = false
             AND description ILIKE $1
           RETURNING id`,
          [pattern, rule.category_name, rule.category_id]
        );
        totalApplied += updateResult.rowCount || 0;
      }
      if (totalApplied > 0) {
        console.log(`[Auto-Reconciliation] Applied ${totalApplied} rules to ${pending} pending items`);
      }
    } catch (err) {
      console.error("[Auto-Reconciliation] Error:", err);
    } finally {
      isAutoApplying = false;
    }
  }

  // Rodar na inicialização e a cada 5 minutos
  setTimeout(() => autoApplyReconciliationRules(), 5000);
  setInterval(() => autoApplyReconciliationRules(), 5 * 60 * 1000);

  // GET /api/fin-people - retorna todos os registros de fin_people onde is_client = true
  app.get("/api/fin-people", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT DISTINCT ON (UPPER(TRIM(REGEXP_REPLACE(name, '^[^a-zA-ZÀ-ÿ]+', '', 'g'))))
          id, guid, name, cnpjcpf, grapehub_client_id, asaas_id 
        FROM fin_people 
        WHERE is_client = true AND asaas_id IS NOT NULL
        ORDER BY UPPER(TRIM(REGEXP_REPLACE(name, '^[^a-zA-ZÀ-ÿ]+', '', 'g'))), LENGTH(cnpjcpf) DESC
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

  // GET /api/fin-people/:id/movements - retorna o histórico financeiro de uma pessoa (via fin_receivables)
  app.get("/api/fin-people/:id/movements", async (req, res) => {
    const { id } = req.params;
    try {
      // First get the asaas_id for this fin_people record
      const personRes = await pool.query('SELECT asaas_id FROM fin_people WHERE id = $1', [id]);
      if (personRes.rowCount === 0 || !personRes.rows[0].asaas_id) {
        return res.json([]);
      }
      const asaasId = personRes.rows[0].asaas_id;

      const result = await pool.query(`
        SELECT 
          r.description,
          r.value::text as movement_value,
          r.net_value::text as value,
          r.payment_date as movement_date,
          r.due_date as expiration_date,
          CASE 
            WHEN r.status = 'RECEIVED' OR r.status = 'CONFIRMED' THEN 'Conciliado'
            WHEN r.status = 'OVERDUE' THEN 'Atrasado'
            WHEN r.status = 'PENDING' THEN 'Pendente'
            ELSE r.status
          END as status,
          r.billing_type as payment_method
        FROM fin_receivables r
        WHERE r.customer_id = $1
        ORDER BY r.due_date DESC
      `, [asaasId]);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching fin_people movements:", err);
      res.status(500).json({ error: "Failed to fetch movements" });
    }
  });

  // GET /api/fin-people/:id/subscriptions - retorna as assinaturas financeiras do Asaas vinculadas a pessoa
  app.get("/api/fin-people/:id/subscriptions", async (req, res) => {
    const { id } = req.params;
    try {
      const personRes = await pool.query('SELECT asaas_id FROM fin_people WHERE id = $1', [id]);
      if (personRes.rowCount === 0 || !personRes.rows[0].asaas_id) {
        return res.json([]);
      }
      const asaasId = personRes.rows[0].asaas_id;

      const result = await pool.query(`
        SELECT 
          id,
          customer_id,
          billing_type,
          value,
          next_due_date,
          status,
          cycle,
          description
        FROM fin_subscriptions
        WHERE customer_id = $1 AND status = 'ACTIVE'
        ORDER BY next_due_date ASC
      `, [asaasId]);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching fin_people subscriptions:", err);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
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

  app.patch("/api/crm-comercial/kanbans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { nome } = req.body;
      const result = await pool.query(
        "UPDATE crm_comercial_kanbans SET nome = $1 WHERE id = $2 RETURNING *",
        [nome, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Kanban not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating kanban:", err);
      res.status(500).json({ error: "Failed to update kanban" });
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
      const { kanban_id, title, color, order_index, icon } = req.body;
      const result = await pool.query(
        `INSERT INTO crm_comercial_columns (kanban_id, title, color, order_index, icon) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [kanban_id, title, color || 'orange', order_index || 0, icon || 'LayoutGrid']
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating column:", err);
      res.status(500).json({ error: "Failed to create column" });
    }
  });

  app.patch("/api/crm-comercial/columns/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, color, icon } = req.body;
      
      const result = await pool.query(
        "UPDATE crm_comercial_columns SET title = $1, color = $2, icon = $3 WHERE id = $4 RETURNING *",
        [title, color, icon || 'LayoutGrid', id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Column not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating column:", err);
      res.status(500).json({ error: "Failed to update column" });
    }
  });

  app.delete("/api/crm-comercial/columns/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Update leads in this column to be orphaned or handled. 
      // For simplicity here, we'll just delete the column. Leads without a column will be auto-recovered or disappear.
      await pool.query("DELETE FROM crm_comercial_columns WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting column:", err);
      res.status(500).json({ error: "Failed to delete column" });
    }
  });

  // ==========================================
  // CRM PESSOAS
  // ==========================================
  app.get("/api/crm-pessoas/list", async (req, res) => {
    try {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: "user_id is required" });
      
      const query = `
        SELECT 
          p.id, p.nome, p.email, p.telefone, p.cargo, p.empresa, p.created_at, p.responsavel_id,
          u.name as responsavel_name, u.email as responsavel_email,
          (
            SELECT COUNT(1) 
            FROM crm_comercial_leads l 
            WHERE l.telefone = p.telefone AND l.telefone IS NOT NULL AND l.telefone != ''
          ) as negocios_count
        FROM crm_pessoas p
        LEFT JOIN users u ON p.responsavel_id = u.email
        WHERE p.user_id = $1
        ORDER BY p.created_at DESC
      `;
      const result = await pool.query(query, [user_id]);
      res.json(result.rows);
    } catch(e: any) {
      console.error("[crm-pessoas/list] Error:", e.message);
      res.status(500).json({ error: "Failed to fetch pessoas", details: e.message });
    }
  });

  app.post("/api/crm-pessoas", async (req, res) => {
    try {
      const { user_id, nome, email, telefone, cargo, empresa, responsavel_id } = req.body;
      if (!user_id || !nome) return res.status(400).json({ error: "user_id and nome required" });
      
      const result = await pool.query(`
        INSERT INTO crm_pessoas (user_id, nome, email, telefone, cargo, empresa, responsavel_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id, telefone) DO UPDATE 
        SET nome = EXCLUDED.nome, email = EXCLUDED.email, cargo = EXCLUDED.cargo, empresa = EXCLUDED.empresa
        RETURNING *
      `, [user_id, nome, email, telefone, cargo, empresa, responsavel_id]);
      
      res.status(201).json(result.rows[0]);
    } catch(e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to create pessoa", details: e.message || String(e) });
    }
  });

  // ==========================================
  // CRM EMPRESAS
  // ==========================================
  app.get("/api/crm-empresas/list", async (req, res) => {
    try {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: "user_id is required" });
      const result = await pool.query(`
        SELECT 
          e.id, e.nome, e.site, e.setor, e.telefone, e.email, e.cidade, e.created_at, e.responsavel_id,
          u.name as responsavel_name, u.email as responsavel_email,
          (
            SELECT COUNT(1) FROM crm_pessoas p 
            WHERE LOWER(TRIM(p.empresa)) = LOWER(TRIM(e.nome)) AND p.user_id = e.user_id
          ) as pessoas_count,
          0 as negocios_count
        FROM crm_empresas e
        LEFT JOIN users u ON e.responsavel_id = u.email
        WHERE e.user_id = $1
        ORDER BY e.created_at DESC
      `, [user_id]);
      res.json(result.rows);
    } catch(e: any) {
      console.error("[crm-empresas/list] Error:", e.message);
      res.status(500).json({ error: "Failed to fetch empresas", details: e.message });
    }
  });

  app.post("/api/crm-empresas", async (req, res) => {
    try {
      const { user_id, nome, site, setor, telefone, email, cidade, responsavel_id } = req.body;
      if (!user_id || !nome) return res.status(400).json({ error: "user_id and nome required" });
      const result = await pool.query(`
        INSERT INTO crm_empresas (user_id, nome, site, setor, telefone, email, cidade, responsavel_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [user_id, nome, site || null, setor || null, telefone || null, email || null, cidade || null, responsavel_id || null]);
      res.status(201).json(result.rows[0]);
    } catch(e: any) {
      console.error("[crm-empresas] Error:", e.message);
      res.status(500).json({ error: "Failed to create empresa", details: e.message });
    }
  });

  // ==========================================
  // MARKETING DASHBOARD
  // ==========================================
  app.get("/api/marketing-dashboard", async (req, res) => {
    try {
      const { month, start, end } = req.query;

      // Build a generic WHERE clause usable by facebook & formulario tables
      // Supports: ?start=YYYY-MM-DD&end=YYYY-MM-DD  OR  legacy ?month=YYYY-MM
      let dateFilter = '';
      let dateParams: any[] = [];
      let startDate = '';
      let endDate   = '';

      if (start && end) {
        startDate = start as string;
        endDate   = end as string;
        dateFilter = `WHERE day >= $1 AND day <= $2`;
        dateParams = [startDate, endDate];
      } else if (month) {
        const [y, m] = (month as string).split('-');
        const firstDay = new Date(parseInt(y), parseInt(m) - 1, 1);
        const lastDay  = new Date(parseInt(y), parseInt(m), 0);
        startDate = firstDay.toISOString().slice(0, 10);
        endDate   = lastDay.toISOString().slice(0, 10);
        dateFilter = `WHERE day >= $1 AND day <= $2`;
        dateParams = [startDate, endDate];
      }

      // ── Facebook Ads ──────────────────────────────────────────
      const fbResult = await pool.query(
        `SELECT
          COALESCE(SUM(spend), 0)::float       AS total_spend,
          COALESCE(SUM(clicks), 0)::int        AS total_clicks,
          COALESCE(SUM(impressions), 0)::int   AS total_impressions,
          COUNT(DISTINCT campaign_name)::int   AS total_campaigns
         FROM facebook
         ${dateFilter}`,
        dateParams
      );

      // Daily spend for chart
      const fbDailyResult = await pool.query(
        `SELECT
          TO_CHAR(day, 'YYYY-MM-DD') AS date,
          SUM(spend)::float          AS spend
         FROM facebook
         ${dateFilter}
         GROUP BY day ORDER BY day`,
        dateParams
      );

      // Per-campaign breakdown
      const fbCampaignResult = await pool.query(
        `SELECT
          campaign_name,
          SUM(spend)::float      AS spend,
          SUM(clicks)::int       AS clicks,
          SUM(impressions)::int  AS impressions
         FROM facebook
         ${dateFilter}
         GROUP BY campaign_name
         ORDER BY spend DESC`,
        dateParams
      );

      // ── Formulario (Leads) ────────────────────────────────────
      const formResult = await pool.query(
        `SELECT
          COUNT(*)::int                                                                        AS total_leads,
          COUNT(*) FILTER (WHERE TRIM("FATURAMENTO") <> 'Menos de R$ 10 mil' AND "FATURAMENTO" IS NOT NULL AND TRIM("FATURAMENTO") <> '')::int AS leads_qualificados
         FROM formulario
         ${dateFilter}`,
        dateParams
      );

      // Daily leads for chart
      const formDailyResult = await pool.query(
        `SELECT
          TO_CHAR(day, 'YYYY-MM-DD')    AS date,
          COUNT(*)::int                  AS leads,
          COUNT(*) FILTER (WHERE TRIM("FATURAMENTO") <> 'Menos de R$ 10 mil' AND "FATURAMENTO" IS NOT NULL AND TRIM("FATURAMENTO") <> '')::int AS qualificados
         FROM formulario
         ${dateFilter}
         GROUP BY day ORDER BY day`,
        dateParams
      );

      // Leads by nicho
      const nichoResult = await pool.query(
        `SELECT
          "NICHO"        AS nicho,
          COUNT(*)::int  AS total
         FROM formulario
         ${dateFilter}
         GROUP BY "NICHO"
         ORDER BY total DESC`,
        dateParams
      );

      // ── Reuniões (from reunioes table) ────
      let reunioesTotal = 0;
      try {
        const reunCols = await pool.query(
          `SELECT column_name FROM information_schema.columns WHERE table_name='reunioes' ORDER BY ordinal_position`
        );
        const rCols = reunCols.rows.map((r: any) => r.column_name);
        const rRealizadas = rCols.find((c: string) => c.toLowerCase().includes('realiz')) || rCols[5] || 'id';
        const rDay        = rCols.find((c: string) => c.toLowerCase() === 'day') || rCols[1] || 'id';

        let reuniaoSQL = `
          SELECT COALESCE(SUM(CAST(COALESCE(NULLIF("${rRealizadas}",''), '0') AS INTEGER)), 0)::int AS total
          FROM reunioes`;
        let reuniaoParams: any[] = [];

        if (startDate && endDate) {
          reuniaoSQL += ` WHERE "${rDay}" >= $1 AND "${rDay}" <= $2`;
          reuniaoParams = [startDate, endDate];
        }

        const reuniaoResult = await pool.query(reuniaoSQL, reuniaoParams);
        reunioesTotal = reuniaoResult.rows[0]?.total || 0;
      } catch (e: any) {
        console.error('[marketing-dashboard] reunioes error:', e.message);
        reunioesTotal = 0;
      }


      const fb = fbResult.rows[0];
      const form = formResult.rows[0];

      const totalLeads = form.total_leads || 0;
      const totalQualificados = form.leads_qualificados || 0;
      const totalSpend = fb.total_spend || 0;

      res.json({
        kpis: {
          total_spend: totalSpend,
          total_leads: totalLeads,
          leads_qualificados: totalQualificados,
          reunioes: reunioesTotal,
          custo_por_lead: totalLeads > 0 ? totalSpend / totalLeads : 0,
          custo_por_qualificado: totalQualificados > 0 ? totalSpend / totalQualificados : 0,
          custo_por_reuniao: reunioesTotal > 0 ? totalSpend / reunioesTotal : 0,
          taxa_qualificacao: totalLeads > 0 ? (totalQualificados / totalLeads) * 100 : 0,
          taxa_reuniao: totalQualificados > 0 ? (reunioesTotal / totalQualificados) * 100 : 0,
          total_clicks: fb.total_clicks || 0,
          total_impressions: fb.total_impressions || 0,
          total_campaigns: fb.total_campaigns || 0,
        },
        daily_spend: fbDailyResult.rows,
        daily_leads: formDailyResult.rows,
        campaigns: fbCampaignResult.rows,
        nichos: nichoResult.rows,
      });
    } catch (e: any) {
      console.error("[marketing-dashboard]", e.message);
      res.status(500).json({ error: "Failed to load marketing dashboard", details: e.message });
    }
  });

  // ==========================================
  // MARKETING AÇÕES
  // ==========================================
  pool.query(`
    CREATE TABLE IF NOT EXISTS marketing_acoes (
      page_id    TEXT PRIMARY KEY,
      data       JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(console.error);

  app.get("/api/marketing-acoes", async (req, res) => {
    const { page_id } = req.query;
    if (!page_id) return res.status(400).json({ error: "page_id required" });
    try {
      const result = await pool.query(
        `SELECT data FROM marketing_acoes WHERE page_id = $1`, [page_id]
      );
      res.json({ campaigns: result.rows[0]?.data || [] });
    } catch (e: any) {
      console.error("[marketing-acoes GET]", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/marketing-acoes", async (req, res) => {
    const { page_id, campaigns } = req.body;
    if (!page_id) return res.status(400).json({ error: "page_id required" });
    try {
      await pool.query(
        `INSERT INTO marketing_acoes (page_id, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (page_id) DO UPDATE SET data = $2, updated_at = NOW()`,
        [page_id, JSON.stringify(campaigns || [])]
      );
      res.json({ ok: true });
    } catch (e: any) {
      console.error("[marketing-acoes POST]", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ==========================================
  // CRM METAS

  // ==========================================
  app.get("/api/crm-metas", async (req, res) => {
    try {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: "user_id required" });

      const metas = await pool.query(
        `SELECT * FROM crm_metas WHERE user_id = $1 ORDER BY created_at DESC`,
        [user_id]
      );

      const now = new Date();

      const result = await Promise.all(metas.rows.map(async (meta) => {
        let valorAtual = 0;

        // ── Calcular janela de datas ──────────────────────────────────
        let dataInicio: Date;
        let dataFim: Date;

        if (meta.data_inicio) {
          dataInicio = new Date(meta.data_inicio);
          dataFim = meta.data_fim ? new Date(meta.data_fim) : new Date(now);
          dataFim.setHours(23, 59, 59, 999);
        } else {
          dataFim = new Date(now);
          dataFim.setHours(23, 59, 59, 999);
          dataInicio = new Date(now);

          if (meta.periodo === 'semanal') {
            const day = now.getDay(); // 0=domingo
            dataInicio.setDate(now.getDate() - day);
            dataInicio.setHours(0, 0, 0, 0);
          } else if (meta.periodo === 'mensal') {
            dataInicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          } else if (meta.periodo === 'trimestral') {
            const startMonth = Math.floor(now.getMonth() / 3) * 3;
            dataInicio = new Date(now.getFullYear(), startMonth, 1, 0, 0, 0, 0);
          } else if (meta.periodo === 'anual') {
            dataInicio = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
          } else {
            dataInicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          }
        }

        try {
          // ──────────────────────────────────────────────────────────────
          // NEGÓCIOS ADICIONADOS
          // Leads criados no período. Filtros opcionais: kanban, responsavel.
          // ──────────────────────────────────────────────────────────────
          if (meta.tipo === 'negocios_adicionados') {
            const params: any[] = [dataInicio, dataFim];
            let where = `WHERE created_at >= $1 AND created_at <= $2`;

            if (meta.kanban_id) {
              params.push(meta.kanban_id);
              where += ` AND kanban_id = $${params.length}`;
            }
            if (meta.responsavel_id) {
              params.push(meta.responsavel_id);
              where += ` AND responsavel_id = $${params.length}`;
            }

            const agg = meta.metrica === 'valor'
              ? 'COALESCE(SUM(valor), 0)'
              : 'COUNT(*)';

            const q = await pool.query(
              `SELECT ${agg} AS total FROM crm_comercial_leads ${where}`,
              params
            );
            valorAtual = Number(q.rows[0]?.total || 0);

          // ──────────────────────────────────────────────────────────────
          // NEGÓCIOS EM ANDAMENTO
          // Conta leads que passaram por uma etapa no período,
          // mesmo que já tenham saído dela.
          // Usa crm_comercial_history.to_coluna para rastrear entrada na etapa.
          // ──────────────────────────────────────────────────────────────
          } else if (meta.tipo === 'negocios_andamento') {
            let valorAtualAndamento = 0;

            if (meta.coluna_id) {
              // ── Etapa específica: usa o HISTÓRICO ──────────────────────
              // Conta leads DISTINTOS que entraram (to_coluna) nessa etapa no período,
              // independente de onde o lead está hoje.
              const params: any[] = [dataInicio, dataFim, meta.coluna_id];
              let whereHistory = `
                WHERE h.to_coluna = $3
                  AND h.created_at >= $1
                  AND h.created_at <= $2
              `;

              if (meta.kanban_id || meta.responsavel_id) {
                whereHistory += ` AND EXISTS (
                  SELECT 1 FROM crm_comercial_leads l2
                  WHERE l2.id = h.lead_id
                `;
                if (meta.kanban_id) {
                  params.push(meta.kanban_id);
                  whereHistory += ` AND l2.kanban_id = $${params.length}`;
                }
                if (meta.responsavel_id) {
                  params.push(meta.responsavel_id);
                  whereHistory += ` AND l2.responsavel_id = $${params.length}`;
                }
                whereHistory += `)`;
              }

              const agg = meta.metrica === 'valor'
                ? `COALESCE((SELECT SUM(l3.valor) FROM crm_comercial_leads l3 WHERE l3.id = ANY(ARRAY_AGG(DISTINCT h.lead_id))), 0)`
                : `COUNT(DISTINCT h.lead_id)`;

              const q = await pool.query(
                `SELECT ${agg} AS total
                 FROM crm_comercial_history h
                 ${whereHistory}`,
                params
              );
              valorAtualAndamento = Number(q.rows[0]?.total || 0);

            } else {
              // ── Qualquer etapa ativa: usa o HISTÓRICO de todas as etapas não-terminais ──
              const params: any[] = [dataInicio, dataFim];
              let whereHistory = `
                WHERE h.to_coluna IS NOT NULL
                  AND h.created_at >= $1
                  AND h.created_at <= $2
                  AND EXISTS (
                    SELECT 1 FROM crm_comercial_columns c
                    WHERE c.id::text = h.to_coluna
                      AND (c.color NOT IN ('green', 'red'))
                      AND LOWER(COALESCE(c.title,'')) NOT LIKE '%ganho%'
                      AND LOWER(COALESCE(c.title,'')) NOT LIKE '%fechado%'
                      AND LOWER(COALESCE(c.title,'')) NOT LIKE '%perd%'
                      AND LOWER(COALESCE(c.title,'')) NOT LIKE '%lost%'
                  )
              `;

              if (meta.kanban_id || meta.responsavel_id) {
                whereHistory += ` AND EXISTS (
                  SELECT 1 FROM crm_comercial_leads l2
                  WHERE l2.id = h.lead_id
                `;
                if (meta.kanban_id) {
                  params.push(meta.kanban_id);
                  whereHistory += ` AND l2.kanban_id = $${params.length}`;
                }
                if (meta.responsavel_id) {
                  params.push(meta.responsavel_id);
                  whereHistory += ` AND l2.responsavel_id = $${params.length}`;
                }
                whereHistory += `)`;
              }

              const q = await pool.query(
                `SELECT COUNT(DISTINCT h.lead_id) AS total
                 FROM crm_comercial_history h
                 ${whereHistory}`,
                params
              );
              valorAtualAndamento = Number(q.rows[0]?.total || 0);
            }

            valorAtual = valorAtualAndamento;

          // ──────────────────────────────────────────────────────────────
          // NEGÓCIOS GANHOS
          // Leads que estão em colunas terminais (color=green / título
          // contém "fechado" ou "ganho") e foram movidos para lá no período.
          // Usa etapa_updated_at — quando o lead foi movido para a coluna.
          // ──────────────────────────────────────────────────────────────
          } else if (meta.tipo === 'negocios_ganhos') {
            const params: any[] = [dataInicio, dataFim];
            // Usa etapa_updated_at (quando moveu para a coluna) ou updated_at como fallback
            let where = `
              WHERE (c.color = 'green'
                     OR LOWER(c.title) LIKE '%fechado%'
                     OR LOWER(c.title) LIKE '%ganho%')
                AND COALESCE(l.etapa_updated_at, l.updated_at, l.created_at) >= $1
                AND COALESCE(l.etapa_updated_at, l.updated_at, l.created_at) <= $2
            `;

            if (meta.kanban_id) {
              params.push(meta.kanban_id);
              where += ` AND l.kanban_id = $${params.length}`;
            }
            if (meta.responsavel_id) {
              params.push(meta.responsavel_id);
              where += ` AND l.responsavel_id = $${params.length}`;
            }

            const agg = meta.metrica === 'valor'
              ? 'COALESCE(SUM(l.valor), 0)'
              : 'COUNT(*)';

            const q = await pool.query(
              `SELECT ${agg} AS total
               FROM crm_comercial_leads l
               JOIN crm_comercial_columns c ON c.id::text = l.coluna
               ${where}`,
              params
            );
            valorAtual = Number(q.rows[0]?.total || 0);

          // ──────────────────────────────────────────────────────────────
          // RECEITA
          // Soma o valor (R$) dos leads nas colunas terminais no período.
          // Sempre usa SUM(valor) — sem opção de métrica quantidade.
          // ──────────────────────────────────────────────────────────────
          } else if (meta.tipo === 'receita') {
            const params: any[] = [dataInicio, dataFim];
            let where = `
              WHERE (c.color = 'green'
                     OR LOWER(c.title) LIKE '%fechado%'
                     OR LOWER(c.title) LIKE '%ganho%')
                AND COALESCE(l.etapa_updated_at, l.updated_at, l.created_at) >= $1
                AND COALESCE(l.etapa_updated_at, l.updated_at, l.created_at) <= $2
            `;

            if (meta.kanban_id) {
              params.push(meta.kanban_id);
              where += ` AND l.kanban_id = $${params.length}`;
            }
            if (meta.responsavel_id) {
              params.push(meta.responsavel_id);
              where += ` AND l.responsavel_id = $${params.length}`;
            }

            const q = await pool.query(
              `SELECT COALESCE(SUM(l.valor), 0) AS total
               FROM crm_comercial_leads l
               JOIN crm_comercial_columns c ON c.id::text = l.coluna
               ${where}`,
              params
            );
            valorAtual = Number(q.rows[0]?.total || 0);
          // ──────────────────────────────────────────────────────────────
          // ATIVIDADES
          // Conta tarefas concluídas (completed=true) no período,
          // usando completed_at como referência de data.
          // Filtros opcionais: activity_type (tipo) e responsavel_id.
          // ──────────────────────────────────────────────────────────────
          } else if (meta.tipo === 'atividades') {
            const params: any[] = [dataInicio, dataFim];
            let where = `
              WHERE t.completed = true
                AND t.completed_at >= $1
                AND t.completed_at <= $2
            `;

            if (meta.activity_type) {
              params.push(meta.activity_type);
              where += ` AND t.type = $${params.length}`;
            }
            if (meta.responsavel_id) {
              params.push(meta.responsavel_id);
              where += ` AND t.responsible_id::text = $${params.length}`;
            }

            const q = await pool.query(
              `SELECT COUNT(*) AS total
               FROM crm_comercial_tasks t
               ${where}`,
              params
            );
            valorAtual = Number(q.rows[0]?.total || 0);
          }
        } catch (err: any) {
          console.error(`[crm-metas] calc error for tipo=${meta.tipo}:`, err.message);
          valorAtual = 0;
        }

        const percentual = meta.alvo > 0
          ? Math.min(100, Math.round((valorAtual / Number(meta.alvo)) * 100))
          : 0;

        return { ...meta, valor_atual: valorAtual, percentual };
      }));

      res.json(result);
    } catch(e: any) {
      console.error("[crm-metas] Error:", e.message);
      res.status(500).json({ error: "Failed to fetch metas", details: e.message });
    }
  });

  app.post("/api/crm-metas", async (req, res) => {
    try {
      const { user_id, nome, tipo, metrica, periodo, alvo, kanban_id, coluna_id, activity_type, responsavel_id, data_inicio, data_fim } = req.body;
      if (!user_id || !nome || !tipo) return res.status(400).json({ error: "user_id, nome e tipo são obrigatórios" });
      const result = await pool.query(
        `INSERT INTO crm_metas (user_id, nome, tipo, metrica, periodo, alvo, kanban_id, coluna_id, activity_type, responsavel_id, data_inicio, data_fim)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [user_id, nome, tipo, metrica || 'quantidade', periodo || 'mensal', Number(alvo) || 10,
         kanban_id || null, coluna_id || null, activity_type || null, responsavel_id || null, data_inicio || null, data_fim || null]
      );
      res.status(201).json(result.rows[0]);
    } catch(e: any) {
      console.error("[crm-metas] POST Error:", e.message);
      res.status(500).json({ error: "Failed to create meta", details: e.message });
    }
  });



  app.delete("/api/crm-metas/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM crm_metas WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch(e: any) {
      res.status(500).json({ error: "Failed to delete meta" });
    }
  });

  app.patch("/api/crm-metas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, tipo, metrica, periodo, alvo, kanban_id, coluna_id, activity_type, responsavel_id, data_inicio, data_fim } = req.body;
      await pool.query(
        `UPDATE crm_metas SET
          nome = COALESCE($1, nome),
          tipo = COALESCE($2, tipo),
          metrica = COALESCE($3, metrica),
          periodo = COALESCE($4, periodo),
          alvo = COALESCE($5, alvo),
          kanban_id = $6,
          coluna_id = $7,
          activity_type = $8,
          responsavel_id = $9,
          data_inicio = $10,
          data_fim = $11
        WHERE id = $12`,
        [nome, tipo, metrica, periodo, alvo, kanban_id || null, coluna_id || null, activity_type || null, responsavel_id || null, data_inicio || null, data_fim || null, id]
      );
      res.json({ success: true });
    } catch(e: any) {
      res.status(500).json({ error: "Failed to update meta", details: e.message });
    }
  });

  // ==========================================
  // CRM COMERCIAL - LEADS
  // ==========================================
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
      const { nome, telefone, origem, responsavel_id, valor, observacoes, kanban_id, coluna } = req.body;
      
      // Se não foi passada uma coluna, busca a primeira coluna do kanban automaticamente
      let colunaId = coluna || null;
      if (!colunaId && kanban_id) {
        const firstColResult = await pool.query(
          "SELECT id FROM crm_comercial_columns WHERE kanban_id = $1 ORDER BY order_index ASC LIMIT 1",
          [kanban_id]
        );
        if (firstColResult.rows.length > 0) {
          colunaId = firstColResult.rows[0].id;
        }
      }

      const result = await pool.query(
        `INSERT INTO crm_comercial_leads (nome, telefone, origem, responsavel_id, valor, observacoes, kanban_id, coluna) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [nome, telefone, origem || 'Outro', responsavel_id, valor || 0, observacoes, kanban_id, colunaId]
      );
      
      // Sincronizar com Pessoas
      if (telefone && telefone.trim() !== '') {
        try {
          const kanbanUserRes = await pool.query("SELECT user_id FROM crm_comercial_kanbans WHERE id = $1", [kanban_id]);
          if (kanbanUserRes.rows.length > 0) {
             const tenant_id = kanbanUserRes.rows[0].user_id;
             await pool.query(`
               INSERT INTO crm_pessoas (user_id, nome, telefone, responsavel_id)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT (user_id, telefone) DO NOTHING
             `, [tenant_id, nome || 'Desconhecido', telefone, responsavel_id]);
          }
        } catch(personErr) {
          console.error("Error syncing person from lead:", personErr);
        }
      }

      // ── Dispara automações de 'lead_created' ──
      setImmediate(() => runAutomations('lead_created', result.rows[0]));

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
      const { 
        coluna, valor, responsavel_id, moved_by, kanban_id, previsao, tags, origem, instagram, nicho, tempo_oab, faturamento,
        reunion_date, office_location, monthly_closings, closing_goal, reunion_link,
        utm_platform, utm_campaign, utm_set, utm_creative, utm_position,
        nome, telefone, observacoes
      } = req.body;
      
      const currentResult = await pool.query("SELECT coluna, kanban_id FROM crm_comercial_leads WHERE id = $1", [id]);
      if (currentResult.rows.length === 0) {
        console.log(`[PATCH] Lead not found: ${id}`);
        return res.status(404).json({ error: "Lead not found" });
      }
      
      const currentColuna = currentResult.rows[0].coluna;
      
      const updates = [];
      const params = [];
      let paramIdx = 1;
      
      if (kanban_id !== undefined) {
        // Moving to a new kanban: find its first column automatically
        const firstColResult = await pool.query(
          "SELECT id FROM crm_comercial_columns WHERE kanban_id = $1 ORDER BY order_index ASC LIMIT 1",
          [kanban_id]
        );
        const firstColId = firstColResult.rows[0]?.id || null;
        updates.push(`kanban_id = $${paramIdx++}`);
        params.push(kanban_id);
        if (firstColId) {
          updates.push(`coluna = $${paramIdx++}`);
          params.push(firstColId);
          updates.push(`etapa_updated_at = NOW()`);
        }
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, from_coluna, to_coluna, moved_by) VALUES ($1, $2, $3, $4)`,
          [id, currentColuna, firstColId || 'outro-kanban', moved_by || 'Sistema']
        );
      } else if (coluna !== undefined) {
        updates.push(`coluna = $${paramIdx++}`);
        params.push(coluna);
        if (coluna !== currentColuna) {
          updates.push(`etapa_updated_at = NOW()`);
        }
      }
      if (valor !== undefined) {
        updates.push(`valor = $${paramIdx++}`);
        params.push(valor);
      }
      if (responsavel_id !== undefined) {
        updates.push(`responsavel_id = $${paramIdx++}`);
        params.push(responsavel_id);
      }
      if (previsao !== undefined) {
        updates.push(`previsao = $${paramIdx++}`);
        params.push(previsao || null);
      }
      if (tags !== undefined) {
        updates.push(`tags = $${paramIdx++}`);
        params.push(JSON.stringify(tags));
      }
      if (origem !== undefined) {
        updates.push(`origem = $${paramIdx++}`);
        params.push(origem);
      }
      if (instagram !== undefined) {
        updates.push(`instagram = $${paramIdx++}`);
        params.push(instagram);
      }
      if (nicho !== undefined) {
        updates.push(`nicho = $${paramIdx++}`);
        params.push(nicho);
      }
      if (tempo_oab !== undefined) {
        updates.push(`tempo_oab = $${paramIdx++}`);
        params.push(tempo_oab);
      }
      if (faturamento !== undefined) {
        updates.push(`faturamento = $${paramIdx++}`);
        params.push(faturamento);
      }
      if (reunion_date !== undefined) { updates.push(`reunion_date = $${paramIdx++}`); params.push(reunion_date); }
      if (office_location !== undefined) { updates.push(`office_location = $${paramIdx++}`); params.push(office_location); }
      if (monthly_closings !== undefined) { updates.push(`monthly_closings = $${paramIdx++}`); params.push(monthly_closings); }
      if (closing_goal !== undefined) { updates.push(`closing_goal = $${paramIdx++}`); params.push(closing_goal); }
      if (reunion_link !== undefined) { updates.push(`reunion_link = $${paramIdx++}`); params.push(reunion_link); }
      if (utm_platform !== undefined) { updates.push(`utm_platform = $${paramIdx++}`); params.push(utm_platform); }
      if (utm_campaign !== undefined) { updates.push(`utm_campaign = $${paramIdx++}`); params.push(utm_campaign); }
      if (utm_set !== undefined) { updates.push(`utm_set = $${paramIdx++}`); params.push(utm_set); }
      if (utm_creative !== undefined) { updates.push(`utm_creative = $${paramIdx++}`); params.push(utm_creative); }
      if (utm_position !== undefined) { updates.push(`utm_position = $${paramIdx++}`); params.push(utm_position); }

      const { is_lost, loss_reason_id } = req.body;
      if (is_lost !== undefined) { updates.push(`is_lost = $${paramIdx++}`); params.push(is_lost); }
      if (loss_reason_id !== undefined) { updates.push(`loss_reason_id = $${paramIdx++}`); params.push(loss_reason_id); }
      if (nome !== undefined) { updates.push(`nome = $${paramIdx++}`); params.push(nome); }
      if (telefone !== undefined) { updates.push(`telefone = $${paramIdx++}`); params.push(telefone); }
      if (observacoes !== undefined) { updates.push(`observacoes = $${paramIdx++}`); params.push(observacoes); }
      
      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        params.push(id);
        console.log(`[PATCH] Updating lead ${id} with params:`, params);
        const result = await pool.query(
          `UPDATE crm_comercial_leads SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
          params
        );
        
        if (!kanban_id && coluna !== undefined && coluna !== currentColuna) {
          await pool.query(
            `INSERT INTO crm_comercial_history (lead_id, from_coluna, to_coluna, moved_by) VALUES ($1, $2, $3, $4)`,
            [id, currentColuna, coluna, moved_by || 'Sistema']
          );

          // ── Auto-insert em fechamentos quando lead vai para coluna terminal ──
          try {
            // Verifica se a coluna destino é terminal (ganho/fechado)
            const destColResult = await pool.query(
              `SELECT title FROM crm_comercial_columns WHERE id = $1`,
              [coluna]
            );
            const destTitle = (destColResult.rows[0]?.title || '').toLowerCase();
            const isTerminal = destTitle.includes('ganho') || destTitle.includes('fechado');

            if (isTerminal) {
              // Pega todos os dados necessários do lead
              const leadFull = await pool.query(
                `SELECT nome, form_nome_fantasia, valor, origem, faturamento, form_cidade FROM crm_comercial_leads WHERE id = $1`,
                [id]
              );
              const lf = leadFull.rows[0];
              if (lf) {
                const nomeInsert     = lf.form_nome_fantasia || lf.nome || '';
                const valorInsert    = lf.valor != null ? String(Math.round(Number(lf.valor))) : '0';
                const origemRaw      = (lf.origem || '').toLowerCase();
                const origemInsert   = origemRaw.includes('indica') ? 'indicação' : 'campanhas';
                const faturInsert    = lf.faturamento || '';
                const cidadeInsert   = lf.form_cidade || '';
                const dayInsert      = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

                // Descobre nomes reais das colunas (evita hardcode com acentos)
                const colInfoRes = await pool.query(
                  `SELECT column_name FROM information_schema.columns WHERE table_name='fechamentos' ORDER BY ordinal_position`
                );
                const fcols = colInfoRes.rows.map((r: any) => r.column_name);
                const cNome    = fcols.find((c: string) => c.toLowerCase() === 'nome')    || 'Nome';
                const cValor   = fcols.find((c: string) => c.toLowerCase().includes('valor'))  || 'Valor';
                const cOrigem  = fcols.find((c: string) => c.toLowerCase().includes('indica') || c.toLowerCase().includes('campa') || c.toLowerCase().includes('origem')) || fcols[4] || 'id';
                const cFat     = fcols.find((c: string) => c.toLowerCase().includes('fatura')) || fcols[5] || 'id';
                const cCidade  = fcols.find((c: string) => c.toLowerCase().includes('cidade')) || fcols[6] || 'id';

                await pool.query(
                  `INSERT INTO fechamentos (day, "${cNome}", "${cValor}", "${cOrigem}", "${cFat}", "${cCidade}")
                   VALUES ($1, $2, $3, $4, $5, $6)`,
                  [dayInsert, nomeInsert, valorInsert, origemInsert, faturInsert, cidadeInsert]
                );
                console.log(`[FECHAMENTO] Auto-inserted fechamento for lead ${id} → coluna "${destTitle}"`);
              }
            }
          } catch (fErr: any) {
            // Erro no insert de fechamento não deve quebrar o fluxo principal
            console.error(`[FECHAMENTO] Erro ao inserir em fechamentos para lead ${id}:`, fErr.message);
          }
          // ── Fim do auto-insert ──────────────────────────────────────────

          // ── Dispara automações de 'stage_changed' ──
          setImmediate(() => runAutomations('stage_changed', { ...result.rows[0], _previous_coluna: currentColuna }));

          // Se foi para coluna terminal → também dispara 'lead_won'
          try {
            const destColCheck = await pool.query(`SELECT title FROM crm_comercial_columns WHERE id = $1`, [coluna]);
            const dt = (destColCheck.rows[0]?.title || '').toLowerCase();
            if (dt.includes('ganho') || dt.includes('fechado')) {
              setImmediate(() => runAutomations('lead_won', result.rows[0]));
            }
          } catch (_) {}
        }

        // 'lead_updated' para qualquer atualização de campo
        if (is_lost === true) {
          setImmediate(() => runAutomations('lead_lost', result.rows[0]));
        } else if (coluna === undefined) {
          // Atualização de campo (não é movimentação de coluna)
          setImmediate(() => runAutomations('lead_updated', result.rows[0]));
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

  // ── Reabrir lead (remove ganho e perda) ──────────────────────────────────
  app.patch('/api/crm-comercial/leads/:id/reopen', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { moved_by } = req.body ?? {};
    try {
      // 1. Busca dados atuais do lead (coluna atual + nome para remover fechamento)
      const leadRes = await pool.query(
        `SELECT l.coluna, l.nome, l.form_nome_fantasia, l.kanban_id, l.is_lost
         FROM crm_comercial_leads l WHERE l.id = $1`, [id]
      );
      if (!leadRes.rows.length) return res.status(404).json({ error: 'Lead not found' });
      const lead = leadRes.rows[0];

      // 2. Descobre a primeira coluna não-terminal do kanban
      const colsRes = await pool.query(
        `SELECT id, title FROM crm_comercial_columns WHERE kanban_id = $1 ORDER BY order_index ASC`,
        [lead.kanban_id]
      );
      const firstNonTerminal = colsRes.rows.find((c: any) => {
        const t = (c.title || '').toLowerCase();
        return !t.includes('ganho') && !t.includes('fechado') && !t.includes('perd') && !t.includes('descart');
      });
      const targetColuna = firstNonTerminal?.id || colsRes.rows[0]?.id || lead.coluna;

      // 3. Atualiza lead: zera is_lost, loss_reason_id e move para coluna inicial
      await pool.query(
        `UPDATE crm_comercial_leads SET is_lost = false, loss_reason_id = NULL, coluna = $2 WHERE id = $1`,
        [id, targetColuna]
      );

      // 4. Remove registro da tabela fechamentos (ganho) pelo nome
      try {
        const nomeFech = lead.form_nome_fantasia || lead.nome || '';
        if (nomeFech) {
          await pool.query(`DELETE FROM fechamentos WHERE "Nome" = $1`, [nomeFech]);
        }
      } catch (fErr: any) {
        console.warn('[REOPEN] Não foi possível remover fechamento:', fErr.message);
      }

      // 5. Registra no histórico
      await pool.query(
        `INSERT INTO crm_comercial_history (lead_id, from_coluna, to_coluna, moved_by)
         VALUES ($1, $2, $3, $4)`,
        [id, lead.coluna, targetColuna, moved_by || 'Sistema']
      );
      await pool.query(
        `INSERT INTO crm_comercial_lead_history (lead_id, action_type, description, user_name)
         VALUES ($1, 'reaberto', '🔄 Lead reaberto e status de perda/ganho removido', $2)`,
        [id, moved_by || 'Sistema']
      ).catch(() => {});

      res.json({ ok: true, coluna: targetColuna });
    } catch (err) {
      console.error('[REOPEN] Error:', err);
      res.status(500).json({ error: 'Failed to reopen lead' });
    }
  });


  // --- Tags (Globais do Kanban) ---
  app.get("/api/crm-comercial/tags", async (_req, res) => {
    try {
      const result = await pool.query("SELECT * FROM crm_comercial_tags ORDER BY name ASC");
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching tags:", err);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.post("/api/crm-comercial/tags", async (req, res) => {
    try {
      const { name, color } = req.body;
      if (!name || !color) return res.status(400).json({ error: "Name and color required" });
      const result = await pool.query(
        "INSERT INTO crm_comercial_tags (name, color) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color RETURNING *",
        [name, color]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating tag:", err);
      res.status(500).json({ error: "Failed to create tag", details: err instanceof Error ? err.message : String(err)  });
    }
  });
  
  app.delete("/api/crm-comercial/tags/:name", async (req, res) => {
    try {
      const { name } = req.params;
      const result = await pool.query("DELETE FROM crm_comercial_tags WHERE name = $1 RETURNING *", [name]);
      if (result.rowCount === 0) return res.status(404).json({ error: "Tag not found" });
      res.json({ message: "Tag deleted" });
    } catch (err) {
      console.error("Error deleting tag:", err);
      res.status(500).json({ error: "Failed to delete tag", details: err instanceof Error ? err.message : String(err)  });
    }
  });

  app.delete("/api/crm-comercial/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // Delete related data first (cascade)
      await pool.query("DELETE FROM crm_comercial_tasks WHERE lead_id = $1", [id]);
      await pool.query("DELETE FROM crm_comercial_comments WHERE lead_id = $1", [id]);
      await pool.query("DELETE FROM crm_comercial_files WHERE lead_id = $1", [id]);
      await pool.query("DELETE FROM crm_comercial_leads WHERE id = $1", [id]);
      res.json({ message: "Lead deleted" });
    } catch (err) {
      console.error("Error deleting lead:", err);
      res.status(500).json({ error: "Failed to delete lead" });
    }
  });

  // All CRM Comercial Activities (across all leads)
  app.get("/api/crm-comercial/activities", async (req, res) => {
    try {
      const { type, completed, responsible_id } = req.query;
      let conditions: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      if (type && type !== 'all') {
        conditions.push(`t.type = $${paramIdx++}`);
        params.push(type);
      }
      if (completed !== undefined && completed !== 'all') {
        conditions.push(`t.completed = $${paramIdx++}`);
        params.push(completed === 'true');
      }
      if (responsible_id && responsible_id !== 'all') {
        conditions.push(`t.responsible_id = $${paramIdx++}`);
        params.push(responsible_id);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await pool.query(
        `SELECT 
           t.id, t.lead_id, t.title, t.type, t.priority, t.due_date, t.start_time,
           t.end_time, t.responsible_id, t.observations, t.completed, t.completed_at, t.created_at,
           k.nome as lead_name,
           kb.id as kanban_id,
           kb.nome as kanban_name
         FROM crm_comercial_tasks t
         LEFT JOIN crm_comercial_leads k ON t.lead_id::text = k.id::text
         LEFT JOIN crm_comercial_kanbans kb ON k.kanban_id::text = kb.id::text
         ${whereClause}
         ORDER BY 
           CASE WHEN t.due_date IS NULL THEN 1 ELSE 0 END,
           t.due_date ASC,
           t.created_at DESC`,
        params
      );
      res.json(result.rows);
    } catch (err: any) {
      console.error("Error fetching all activities:", err?.message || err);
      res.status(500).json({ error: "Failed to fetch activities", detail: String(err?.message) });
    }
  });

  // CRM Comercial Tasks
  app.get("/api/crm-comercial/kanbans/:kanban_id/tasks", async (req, res) => {
    try {
      const { kanban_id } = req.params;
      const result = await pool.query(
        `SELECT ct.* FROM crm_comercial_tasks ct
         JOIN crm_comercial_leads cl ON ct.lead_id = cl.id
         WHERE cl.kanban_id = $1 AND ct.completed = false
         ORDER BY ct.due_date ASC, ct.start_time ASC`,
        [kanban_id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching kanban tasks:", err);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // ── Loss Reasons ──────────────────────────────────────────────────────────
  app.get("/api/crm-comercial/loss-reasons", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM crm_comercial_loss_reasons ORDER BY order_index ASC, created_at ASC");
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch loss reasons" });
    }
  });

  app.post("/api/crm-comercial/loss-reasons", async (req, res) => {
    try {
      const { name, description, color } = req.body;
      const countResult = await pool.query("SELECT COUNT(*) FROM crm_comercial_loss_reasons");
      const order_index = parseInt(countResult.rows[0].count);
      const result = await pool.query(
        "INSERT INTO crm_comercial_loss_reasons (name, description, color, order_index) VALUES ($1, $2, $3, $4) RETURNING *",
        [name, description || null, color || '#6b7280', order_index]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to create loss reason" });
    }
  });

  app.patch("/api/crm-comercial/loss-reasons/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, color } = req.body;
      const result = await pool.query(
        "UPDATE crm_comercial_loss_reasons SET name = COALESCE($1, name), description = COALESCE($2, description), color = COALESCE($3, color) WHERE id = $4 RETURNING *",
        [name, description, color, id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to update loss reason" });
    }
  });

  app.delete("/api/crm-comercial/loss-reasons/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM crm_comercial_loss_reasons WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete loss reason" });
    }
  });

  // ── Sequências de Cadência ────────────────────────────────────────────────

  // Todas as sequências (sem filtro de kanban) — usado no builder de automações
  app.get("/api/crm-comercial/sequences/all", async (req: Request, res: Response) => {
    try {
      const seqs = await pool.query(
        `SELECT * FROM crm_sequences ORDER BY name ASC`
      );
      const steps = await pool.query(
        `SELECT * FROM crm_sequence_steps ORDER BY sequence_id, order_index ASC`
      );

      const stepsMap: Record<number, any[]> = {};
      for (const step of steps.rows) {
        if (!stepsMap[step.sequence_id]) stepsMap[step.sequence_id] = [];
        stepsMap[step.sequence_id].push(step);
      }

      const result = seqs.rows.map(seq => ({
        ...seq,
        steps: stepsMap[seq.id] || [],
      }));

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch all sequences" });
    }
  });

  app.get("/api/crm-comercial/sequences", async (req: Request, res: Response) => {
    try {
      const { kanban_id } = req.query;
      const seqs = await pool.query(
        `SELECT * FROM crm_sequences WHERE kanban_id = $1 ORDER BY id ASC`, [kanban_id]
      );
      const steps = await pool.query(
        `SELECT s.* FROM crm_sequence_steps s
         JOIN crm_sequences seq ON seq.id = s.sequence_id
         WHERE seq.kanban_id = $1
         ORDER BY s.sequence_id, s.order_index`, [kanban_id]
      );
      const stepsBySeq: Record<number, any[]> = {};
      for (const step of steps.rows) {
        if (!stepsBySeq[step.sequence_id]) stepsBySeq[step.sequence_id] = [];
        stepsBySeq[step.sequence_id].push(step);
      }
      const result = seqs.rows.map((seq: any) => ({ ...seq, steps: stepsBySeq[seq.id] || [] }));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch sequences" });
    }
  });

  app.post("/api/crm-comercial/sequences", async (req: Request, res: Response) => {
    try {
      const { kanban_id, name, description, skip_weekends, steps } = req.body;
      const seqRes = await pool.query(
        `INSERT INTO crm_sequences (kanban_id, name, description, skip_weekends) VALUES ($1,$2,$3,$4) RETURNING *`,
        [kanban_id, name, description || null, skip_weekends ?? true]
      );
      const seq = seqRes.rows[0];
      if (steps?.length) {
        for (let i = 0; i < steps.length; i++) {
          const s = steps[i];
          await pool.query(
            `INSERT INTO crm_sequence_steps (sequence_id, order_index, type, title, observations, day_offset)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [seq.id, i, s.type, s.title || '', s.observations || '', s.day_offset ?? 1]
          );
        }
      }
      res.json({ ...seq, steps: steps || [] });
    } catch (err) {
      res.status(500).json({ error: "Failed to create sequence" });
    }
  });

  app.put("/api/crm-comercial/sequences/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, skip_weekends, steps } = req.body;
      const seqRes = await pool.query(
        `UPDATE crm_sequences SET name=$1, description=$2, skip_weekends=$3 WHERE id=$4 RETURNING *`,
        [name, description || null, skip_weekends ?? true, id]
      );
      await pool.query(`DELETE FROM crm_sequence_steps WHERE sequence_id = $1`, [id]);
      if (steps?.length) {
        for (let i = 0; i < steps.length; i++) {
          const s = steps[i];
          await pool.query(
            `INSERT INTO crm_sequence_steps (sequence_id, order_index, type, title, observations, day_offset)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [id, i, s.type, s.title || '', s.observations || '', s.day_offset ?? 1]
          );
        }
      }
      res.json({ ...seqRes.rows[0], steps: steps || [] });
    } catch (err) {
      res.status(500).json({ error: "Failed to update sequence" });
    }
  });

  app.delete("/api/crm-comercial/sequences/:id", async (req: Request, res: Response) => {
    try {
      await pool.query(`DELETE FROM crm_sequences WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete sequence" });
    }
  });
  // ── Fim Sequências ────────────────────────────────────────────────────────

  // ── Automações ────────────────────────────────────────────────────────────

  // GET /api/automations — list all with steps
  // Endpoint: buscar logs de execução de automações
  app.get("/api/automations/logs", async (req: Request, res: Response) => {
    try {
      const limit = Number(req.query.limit) || 100;
      const automation_id = req.query.automation_id;
      let query = `SELECT * FROM automation_logs`;
      const params: any[] = [];
      if (automation_id) {
        query += ` WHERE automation_id = $1`;
        params.push(automation_id);
      }
      query += ` ORDER BY executed_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch automation logs" });
    }
  });

  app.get("/api/automations", async (req: Request, res: Response) => {
    try {
      const aRes = await pool.query(`SELECT * FROM automations ORDER BY created_at DESC`);
      const automations = await Promise.all(aRes.rows.map(async (a) => {
        const sRes = await pool.query(
          `SELECT * FROM automation_steps WHERE automation_id = $1 ORDER BY order_index ASC`,
          [a.id]
        );
        return { ...a, steps: sRes.rows.map(s => ({ ...s, config: s.config })) };
      }));
      res.json(automations);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch automations" });
    }
  });

  // POST /api/automations — create with steps
  app.post("/api/automations", async (req: Request, res: Response) => {
    try {
      const { name, description, steps = [] } = req.body;
      const aRes = await pool.query(
        `INSERT INTO automations (name, description) VALUES ($1, $2) RETURNING *`,
        [name, description || null]
      );
      const automation = aRes.rows[0];
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await pool.query(
          `INSERT INTO automation_steps (automation_id, type, order_index, config) VALUES ($1, $2, $3, $4)`,
          [automation.id, s.type, i, JSON.stringify(s.config || {})]
        );
      }
      // Return with steps
      const sRes = await pool.query(`SELECT * FROM automation_steps WHERE automation_id = $1 ORDER BY order_index`, [automation.id]);
      res.json({ ...automation, steps: sRes.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create automation" });
    }
  });

  // PUT /api/automations/:id — update name/description/steps
  app.put("/api/automations/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, steps = [] } = req.body;
      await pool.query(
        `UPDATE automations SET name=$1, description=$2, updated_at=NOW() WHERE id=$3`,
        [name, description || null, id]
      );
      // Replace steps
      await pool.query(`DELETE FROM automation_steps WHERE automation_id = $1`, [id]);
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await pool.query(
          `INSERT INTO automation_steps (automation_id, type, order_index, config) VALUES ($1, $2, $3, $4)`,
          [id, s.type, i, JSON.stringify(s.config || {})]
        );
      }
      const aRes = await pool.query(`SELECT * FROM automations WHERE id = $1`, [id]);
      const sRes = await pool.query(`SELECT * FROM automation_steps WHERE automation_id = $1 ORDER BY order_index`, [id]);
      res.json({ ...aRes.rows[0], steps: sRes.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update automation" });
    }
  });

  // PATCH /api/automations/:id/toggle — toggle active
  app.patch("/api/automations/:id/toggle", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `UPDATE automations SET active = NOT active, updated_at=NOW() WHERE id=$1 RETURNING *`,
        [id]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to toggle automation" });
    }
  });

  // DELETE /api/automations/:id
  app.delete("/api/automations/:id", async (req: Request, res: Response) => {
    try {
      await pool.query(`DELETE FROM automations WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete automation" });
    }
  });

  // ── Fim Automações ────────────────────────────────────────────────────────

  app.get("/api/crm-comercial/leads/:id/tasks", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "SELECT * FROM crm_comercial_tasks WHERE lead_id = $1 ORDER BY due_date ASC, created_at ASC",
        [id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.post("/api/crm-comercial/leads/:id/tasks", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, type, priority, due_date, start_time, end_time, responsible_id, observations, user_name } = req.body;
      const result = await pool.query(
        `INSERT INTO crm_comercial_tasks 
         (lead_id, title, type, priority, due_date, start_time, end_time, responsible_id, observations) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [id, title, type, priority, due_date, start_time || null, end_time || null, responsible_id || null, observations || null]
      );

      // Record in activity history
      await pool.query(
        `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name, task_type, created_at) 
         VALUES ($1, 'task_created', $2, $3, $4, NOW())`,
        [id, `Tarefa criada: "${title}"`, user_name || 'Sistema', type]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating task:", err);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/crm-comercial/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { user_name, ...bodyRest } = req.body;
      const updates = [];
      const params = [];
      let paramIdx = 1;

      Object.entries(bodyRest).forEach(([key, value]) => {
        if (['title', 'type', 'priority', 'due_date', 'start_time', 'end_time', 'responsible_id', 'observations', 'completed', 'completed_at'].includes(key)) {
          updates.push(`${key} = $${paramIdx}`);
          params.push(value);
          paramIdx++;
        }
      });

      if (updates.length === 0) return res.status(400).json({ error: "No valid updates provided" });

      params.push(id);
      const result = await pool.query(
        `UPDATE crm_comercial_tasks SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
        params
      );
      const task = result.rows[0];

      // Record completion/reopen in history
      if (bodyRest.completed !== undefined) {
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name, task_type, created_at) 
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            task.lead_id,
            bodyRest.completed ? 'task_completed' : 'task_reopened',
            bodyRest.completed ? `Tarefa concluída: "${task.title}"` : `Tarefa reaberta: "${task.title}"`,
            user_name || 'Sistema',
            task.type
          ]
        );
      }

      res.json(task);
    } catch (err) {
      console.error("Error updating task:", err);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/crm-comercial/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const taskRes = await pool.query("SELECT lead_id, title FROM crm_comercial_tasks WHERE id = $1", [id]);
      await pool.query("DELETE FROM crm_comercial_tasks WHERE id = $1", [id]);

      if (taskRes.rows.length > 0) {
        const { lead_id, title, type } = taskRes.rows[0];
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name, task_type, created_at) 
           VALUES ($1, 'task_deleted', $2, 'Sistema', $3, NOW())`,
          [lead_id, `Tarefa excluída: "${title}"`, type]
        );
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting task:", err);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.get("/api/crm-comercial/task-templates", async (req, res) => {
    try {
      const templatesRes = await pool.query("SELECT * FROM crm_comercial_task_templates ORDER BY id ASC");
      const itemsRes = await pool.query("SELECT * FROM crm_comercial_task_template_items ORDER BY template_id ASC, order_index ASC");
      
      const templates = templatesRes.rows.map(t => ({
        ...t,
        items: itemsRes.rows.filter(i => i.template_id === t.id)
      }));
      
      res.json(templates);
    } catch (err) {
      console.error("Error fetching templates:", err);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post("/api/crm-comercial/task-templates", async (req, res) => {
    try {
      const { name, description, items } = req.body;
      const templateRes = await pool.query(
        "INSERT INTO crm_comercial_task_templates (name, description) VALUES ($1, $2) RETURNING *",
        [name, description || '']
      );
      const template = templateRes.rows[0];

      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await pool.query(
            `INSERT INTO crm_comercial_task_template_items (template_id, title, type, priority, due_days_offset, order_index) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [template.id, item.title, item.type || 'Tarefa', item.priority || 'Normal', item.due_days_offset || 0, i]
          );
        }
      }

      // Return with items
      const itemsRes = await pool.query(
        "SELECT * FROM crm_comercial_task_template_items WHERE template_id = $1 ORDER BY order_index ASC",
        [template.id]
      );
      res.status(201).json({ ...template, items: itemsRes.rows });
    } catch (err) {
      console.error("Error creating template:", err);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.put("/api/crm-comercial/task-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, items } = req.body;

      await pool.query(
        "UPDATE crm_comercial_task_templates SET name = $1, description = $2 WHERE id = $3",
        [name, description || '', id]
      );

      // Replace all items
      await pool.query("DELETE FROM crm_comercial_task_template_items WHERE template_id = $1", [id]);
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await pool.query(
            `INSERT INTO crm_comercial_task_template_items (template_id, title, type, priority, due_days_offset, order_index) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, item.title, item.type || 'Tarefa', item.priority || 'Normal', item.due_days_offset || 0, i]
          );
        }
      }

      const itemsRes = await pool.query(
        "SELECT * FROM crm_comercial_task_template_items WHERE template_id = $1 ORDER BY order_index ASC",
        [id]
      );
      const templateRes = await pool.query("SELECT * FROM crm_comercial_task_templates WHERE id = $1", [id]);
      res.json({ ...templateRes.rows[0], items: itemsRes.rows });
    } catch (err) {
      console.error("Error updating template:", err);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/crm-comercial/task-templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM crm_comercial_task_templates WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting template:", err);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  app.post("/api/crm-comercial/leads/:id/apply-template", async (req, res) => {
    try {
      const { id } = req.params;
      const { template_id } = req.body;
      
      const itemsRes = await pool.query(
        "SELECT * FROM crm_comercial_task_template_items WHERE template_id = $1 ORDER BY order_index ASC",
        [template_id]
      );

      const templateRes = await pool.query("SELECT * FROM crm_comercial_task_templates WHERE id = $1", [template_id]);
      const templateName = templateRes.rows[0]?.name || 'Modelo';

      const tasks = [];
      for (const item of itemsRes.rows) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (item.due_days_offset || 0));
        
        const taskRes = await pool.query(
          `INSERT INTO crm_comercial_tasks (lead_id, title, type, priority, due_date) 
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [id, item.title, item.type, item.priority, dueDate.toISOString()]
        );
        tasks.push(taskRes.rows[0]);
      }

      // Record in history
      await pool.query(
        `INSERT INTO crm_comercial_history (lead_id, action_type, description, task_type, created_at) 
         VALUES ($1, 'template_applied', $2, 'Tarefa', NOW())`,
        [id, `Modelo "${templateName}" aplicado com ${tasks.length} tarefa(s)`]
      );
      
      res.status(201).json(tasks);
    } catch (err) {
      console.error("Error applying template:", err);
      res.status(500).json({ error: "Failed to apply template" });
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

  app.get("/api/crm-comercial/meetings", async (req, res) => {
    try {
      const { lead_id } = req.query;
      if (!lead_id) return res.status(400).json({ error: "lead_id required" });
      const result = await pool.query(
        "SELECT * FROM crm_comercial_meetings WHERE lead_id = $1 ORDER BY meeting_date DESC",
        [lead_id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching meetings:", err);
      res.status(500).json({ error: "Failed to fetch meetings" });
    }
  });

  app.post("/api/crm-comercial/meetings", async (req, res) => {
    try {
      const { lead_id, title, meeting_date, responsible_name, notes, office_location, reunion_link, reunion_niche, monthly_closings, closing_goal } = req.body;
      if (!lead_id || !title || !meeting_date || !responsible_name) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const result = await pool.query(
        `INSERT INTO crm_comercial_meetings (lead_id, title, meeting_date, responsible_name, notes, office_location, reunion_link, reunion_niche, monthly_closings, closing_goal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [lead_id, title, meeting_date, responsible_name, notes, office_location, reunion_link, reunion_niche, monthly_closings, closing_goal]
      );
      
      // Also log it into the general history
      await pool.query(
        `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
         VALUES ($1, 'meeting_created', $2, $3)`,
        [lead_id, `Reunião agendada: ${title}`, responsible_name]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating meeting:", err);
      res.status(500).json({ error: "Failed to create meeting" });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NOTES ENDPOINTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  app.get("/api/crm-comercial/notes", async (req, res) => {
    try {
      const { lead_id } = req.query;
      if (!lead_id) return res.status(400).json({ error: "Missing lead_id" });

      const result = await pool.query(
        "SELECT * FROM crm_comercial_notes WHERE lead_id = $1 ORDER BY created_at DESC",
        [lead_id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching notes:", err);
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  app.post("/api/crm-comercial/notes", async (req, res) => {
    try {
      const { lead_id, content, user_name } = req.body;
      if (!lead_id || !content) return res.status(400).json({ error: "Missing lead_id or content" });

      const result = await pool.query(
        `INSERT INTO crm_comercial_notes (lead_id, content, user_name)
         VALUES ($1, $2, $3) RETURNING *`,
        [lead_id, content, user_name || 'Sistema']
      );
      
      // Also log it into the general history with full content
      await pool.query(
        `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
         VALUES ($1, 'note_created', $2, $3)`,
        [lead_id, content, user_name || 'Sistema']
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating note:", err);
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  // ========== CRM COMERCIAL FILES ENDPOINTS ==========
  app.get("/api/crm-comercial/files", async (req, res) => {
    try {
      const { lead_id } = req.query;
      if (!lead_id) return res.status(400).json({ error: "Missing lead_id" });

      const result = await pool.query(
        "SELECT * FROM crm_comercial_files WHERE lead_id = $1 ORDER BY created_at DESC",
        [lead_id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching files:", err);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.post("/api/crm-comercial/files", async (req, res) => {
    try {
      const { lead_id, name, size, url, sender } = req.body;
      if (!lead_id || !name || !url) return res.status(400).json({ error: "Missing required fields" });

      const result = await pool.query(
        `INSERT INTO crm_comercial_files (lead_id, name, size, url, sender)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [lead_id, name, size, url, sender || 'Agência']
      );

      // Also log it into the general history
      await pool.query(
        `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
         VALUES ($1, 'note_created', $2, $3)`,
        [lead_id, `Fez upload do arquivo: ${name} (${size || ''})`, sender || 'Sistema']
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating file record:", err);
      res.status(500).json({ error: "Failed to create file record" });
    }
  });

  app.delete("/api/crm-comercial/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM crm_comercial_files WHERE id = $1", [id]);
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("Error deleting file:", err);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // API4COM — Telephony Integration
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Helper: make a request to api4com using native https module
  const api4comRequest = (method: string, path: string, token: string, body?: object): Promise<{ status: number, data: any }> => {
    return new Promise((resolve, reject) => {
      const bodyStr = body ? JSON.stringify(body) : undefined;
      const options = {
        hostname: 'api.api4com.com',
        port: 443,
        path: `/api/v1${path}`,
        method,
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
        }
      };
      const req = https.request(options, (resp) => {
        let rawData = '';
        resp.on('data', (chunk) => { rawData += chunk; });
        resp.on('end', () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : {};
            resolve({ status: resp.statusCode || 0, data: parsed });
          } catch {
            resolve({ status: resp.statusCode || 0, data: rawData });
          }
        });
      });
      req.on('error', reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  };

  // GET /api/api4com/settings — fetch settings for a user (token is masked)
  app.get("/api/api4com/settings", async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    try {
      const result = await pool.query(
        'SELECT * FROM crm_api4com_settings WHERE user_id = $1',
        [user_id]
      );
      if (result.rows.length === 0) {
        return res.json({ configured: false });
      }
      const row = result.rows[0];
      res.json({
        configured: !!(row.api4com_token && row.sip_extension),
        api4com_token: row.api4com_token ? '••••••••' + row.api4com_token.slice(-6) : '',
        api4com_domain: row.api4com_domain || '',
        sip_extension: row.sip_extension || '',
        sip_password: row.sip_password || '',   // returned unmasked — needed for WebRTC SIP registration
        sip_server: row.sip_server || ''
      });
    } catch (err) {
      console.error('Error fetching api4com settings:', err);
      res.status(500).json({ error: 'Failed to fetch api4com settings' });
    }
  });

  // POST /api/api4com/settings — save/update settings for a user
  app.post("/api/api4com/settings", async (req, res) => {
    const { user_id, api4com_token, api4com_domain, sip_extension, sip_password, sip_server } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    try {
      // Only update non-masked fields
      const existing = await pool.query('SELECT * FROM crm_api4com_settings WHERE user_id = $1', [user_id]);
      const current = existing.rows[0] || {};
      const finalToken = api4com_token && !api4com_token.startsWith('••••') ? api4com_token : current.api4com_token;
      const finalPassword = sip_password && !sip_password.startsWith('••••') ? sip_password : current.sip_password;

      await pool.query(
        `INSERT INTO crm_api4com_settings (user_id, api4com_token, api4com_domain, sip_extension, sip_password, sip_server, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           api4com_token = EXCLUDED.api4com_token,
           api4com_domain = EXCLUDED.api4com_domain,
           sip_extension = EXCLUDED.sip_extension,
           sip_password = EXCLUDED.sip_password,
           sip_server = EXCLUDED.sip_server,
           updated_at = NOW()`,
        [user_id, finalToken, api4com_domain, sip_extension, finalPassword, sip_server]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Error saving api4com settings:', err);
      res.status(500).json({ error: 'Failed to save api4com settings' });
    }
  });

  // GET /api/crm/settings/webhooks
  app.get("/api/crm/settings/webhooks", async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    try {
      const result = await pool.query('SELECT form_webhook_url, whatsapp_webhook_url, inbound_token, inbound_kanban_id, inbound_coluna FROM crm_webhook_settings WHERE user_id = $1', [user_id]);
      
      let settings = result.rows[0];
      if (settings && !settings.inbound_token) {
        const token = crypto.randomUUID();
        await pool.query('UPDATE crm_webhook_settings SET inbound_token = $1 WHERE user_id = $2', [token, user_id]);
        settings.inbound_token = token;
      } else if (!settings) {
        const token = crypto.randomUUID();
        await pool.query('INSERT INTO crm_webhook_settings (user_id, inbound_token) VALUES ($1, $2)', [user_id, token]);
        settings = { form_webhook_url: '', whatsapp_webhook_url: '', inbound_token: token, inbound_kanban_id: '', inbound_coluna: '' };
      }
      
      res.json(settings);
    } catch (err) {
      console.error('Error fetching webhook settings:', err);
      res.status(500).json({ error: 'Failed to fetch webhook settings' });
    }
  });

  app.post("/api/crm/settings/webhooks", async (req, res) => {
    const { user_id, form_webhook_url, whatsapp_webhook_url, inbound_kanban_id, inbound_coluna, inbound_token } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    try {
      await pool.query(
        `INSERT INTO crm_webhook_settings (user_id, form_webhook_url, whatsapp_webhook_url, inbound_kanban_id, inbound_coluna, inbound_token, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           form_webhook_url = EXCLUDED.form_webhook_url,
           whatsapp_webhook_url = EXCLUDED.whatsapp_webhook_url,
           inbound_kanban_id = EXCLUDED.inbound_kanban_id,
           inbound_coluna = EXCLUDED.inbound_coluna,
           inbound_token = EXCLUDED.inbound_token,
           updated_at = NOW()`,
        [user_id, form_webhook_url || '', whatsapp_webhook_url || '', inbound_kanban_id || '', inbound_coluna || '', inbound_token || '']
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Error saving webhook settings:', err);
      res.status(500).json({ error: 'Failed to save webhook settings' });
    }
  });

  // POST /api/public/webhooks/inbound/:token
  app.post("/api/public/webhooks/inbound/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const body = req.body || {};

      const nome = body.nome || body.NOME || body.name || '';
      if (!nome) return res.status(400).json({ error: "Campo 'nome' é obrigatório" });

      const hookSettings = await pool.query(`
        SELECT ws.inbound_kanban_id, ws.inbound_coluna, u.id as user_id 
        FROM crm_webhook_settings ws 
        JOIN users u ON u.email = ws.user_id 
        WHERE ws.inbound_token = $1
      `, [token]);

      if (hookSettings.rows.length === 0) {
        return res.status(404).json({ error: "Token de webhook inválido ou não encontrado." });
      }

      const { inbound_kanban_id, inbound_coluna, user_id } = hookSettings.rows[0];

      if (!inbound_kanban_id || !inbound_coluna) {
        return res.status(400).json({ error: "Destino do lead (Kanban e Coluna) não foi configurado pelo proprietário deste token nas configurações do CRM." });
      }

      // Resolver o ID real da coluna (inbound_coluna pode ser nome ou UUID)
      let resolvedColuna = inbound_coluna;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inbound_coluna);
      if (!isUUID) {
        // É um nome de coluna — buscar o ID correspondente
        const colResult = await pool.query(
          `SELECT id FROM crm_comercial_columns WHERE kanban_id = $1 AND LOWER(title) = LOWER($2) LIMIT 1`,
          [inbound_kanban_id, inbound_coluna]
        );
        if (colResult.rows.length > 0) {
          resolvedColuna = colResult.rows[0].id;
        } else {
          // Fallback: usar a primeira coluna do kanban
          const firstCol = await pool.query(
            `SELECT id FROM crm_comercial_columns WHERE kanban_id = $1 ORDER BY order_index ASC LIMIT 1`,
            [inbound_kanban_id]
          );
          if (firstCol.rows.length > 0) resolvedColuna = firstCol.rows[0].id;
        }
      }

      // Mapa de campos conhecidos: { coluna_db: valor_do_body }
      // Qualquer campo extra enviado pelo form é ignorado automaticamente.
      const finalCampaign = body.utm_campaign || body.umt_campaign || '';
      const utmPlatform   = body.utm_source || body.utm_platform || '';
      // Auto-origem: se a plataforma for FacebookAds → "Meta ads"
      const autoOrigem    = utmPlatform.toLowerCase() === 'facebookads' ? 'Meta ads' : '';
      const finalOrigem   = body.origem || autoOrigem || body.formulario || body.source || 'Inbound Webhook';
      const tags          = body.tags;


      const knownFields: Record<string, any> = {
        nome,
        telefone:       body.telefone || body.TELEFONE || body.phone || '',
        nicho:          body.nicho    || body.NICHO    || '',
        origem:         finalOrigem,
        responsavel_id: user_id,
        instagram:      body.instagram || '',
        forma_pagamento:body.forma_pagamento || '',
        valor:          Number(body.valor) || 0,
        tags:           JSON.stringify(Array.isArray(tags) ? tags : []),
        kanban_id:      inbound_kanban_id,
        coluna:         resolvedColuna,
        email:          body.email    || body.EMAIL    || '',
        faturamento:    body.faturamento || body.FATURAMENTO || '',
        tempo_oab:      body.tempo_oab || body.tempo_advocacia || body['TEMPO DE ADV'] || '',
        investimento:   body.investimento || body.INVESTIMENTO || '',
        // UTMs: campo_body → coluna_db (exibição no CRM)
        utm_platform:   body.utm_source  || body.utm_platform  || '',  // Plataforma
        utm_campaign:   finalCampaign,                                  // Campanha
        utm_set:        body.utm_medium  || body.utm_set       || '',  // Conjunto
        utm_creative:   body.utm_content  || body.utm_creative  || '',  // Criativo    ← utm_content
        utm_position:   body.utm_term     || body.utm_position  || '',  // Posicionamento ← utm_term
      };

      const columns = Object.keys(knownFields);
      const values  = Object.values(knownFields);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

      const insertResult = await pool.query(
        `INSERT INTO crm_comercial_leads (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );

      const newLead = insertResult.rows[0];

      try {
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
           VALUES ($1, 'whatsapp_trigger', $2, $3)`,
          [newLead.id, 'Recebido via Webhook CRM 📥', 'Automação Inbound']
        );
      } catch (e: any) {
        console.error("Erro inserindo historico de inbound webhook:", e.message);
      }

      res.status(201).json({ success: true, lead: newLead });
    } catch (err) {
      console.error("Falha no inbound webhook:", err instanceof Error ? err.message : String(err));
      res.status(500).json({ error: "Erro interno no processamento do webhook", detail: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /api/crm/webhooks/trigger/whatsapp/:id
  app.post("/api/crm/webhooks/trigger/whatsapp/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[Webhook Trigger] Request for lead id: ${id}`);
      
      const leadRes = await pool.query('SELECT * FROM crm_comercial_leads WHERE id = $1', [id]);
      if (leadRes.rows.length === 0) {
        console.log(`[Webhook Trigger] Lead not found`);
        return res.status(404).json({ error: 'Lead not found' });
      }
      const lead = leadRes.rows[0];

      if (!lead.form_nome_completo || !lead.form_nome_fantasia) {
        return res.status(400).json({ error: 'Preencha o formulário do lead (Nome Completo e Nome Fantasia devem estar preenchidos) para criar o grupo.' });
      }

      const user_email = req.query.user_email as string;
      let targetEmail = user_email;

      // Tenta 1: usuário logado (quem clicou o botão — quem configurou o webhook)
      // Tenta 2: responsável do lead
      // Tenta 3: qualquer configuração existente no banco
      let webhookUrl = '';

      if (user_email) {
        const r = await pool.query(`SELECT whatsapp_webhook_url FROM crm_webhook_settings WHERE user_id = $1`, [user_email]);
        if (r.rows[0]?.whatsapp_webhook_url) {
          webhookUrl = r.rows[0].whatsapp_webhook_url;
          targetEmail = user_email;
        }
      }

      if (!webhookUrl && lead.responsavel_id) {
        const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [lead.responsavel_id]);
        const respEmail = userRes.rows[0]?.email;
        if (respEmail) {
          const r = await pool.query(`SELECT whatsapp_webhook_url FROM crm_webhook_settings WHERE user_id = $1`, [respEmail]);
          if (r.rows[0]?.whatsapp_webhook_url) {
            webhookUrl = r.rows[0].whatsapp_webhook_url;
            targetEmail = respEmail;
          }
        }
      }

      if (!webhookUrl) {
        // Último recurso: qualquer webhook configurado
        const r = await pool.query(`SELECT user_id, whatsapp_webhook_url FROM crm_webhook_settings WHERE whatsapp_webhook_url IS NOT NULL AND whatsapp_webhook_url != '' LIMIT 1`);
        if (r.rows[0]?.whatsapp_webhook_url) {
          webhookUrl = r.rows[0].whatsapp_webhook_url;
          targetEmail = r.rows[0].user_id;
        }
      }

      if (!webhookUrl) {
        console.log(`[Webhook Trigger] Nenhum webhook configurado para: ${user_email}`);
        return res.status(400).json({ error: 'URL do Webhook do WhatsApp não configurada na aba Webhook.' });
      }

      console.log(`[Webhook Trigger] Usando webhook de: ${targetEmail} → ${webhookUrl}`);

      // Busca dados completos do lead para garantir todos os campos
      const leadFullRes = await pool.query(
        `SELECT nome, telefone, origem, valor, nicho, instagram, tempo_oab, faturamento, observacoes, tags,
                form_nome_completo, form_nome_fantasia, form_telefone_whatsapp, form_cnpj_cpf,
                form_cep, form_cidade, form_estado,
                utm_platform, utm_campaign, utm_set, utm_creative, utm_position,
                responsavel_id
         FROM crm_comercial_leads WHERE id = $1`,
        [lead.id]
      );
      const ld = leadFullRes.rows[0] || lead;

      // Fire and keep track
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'whatsapp_group_requested',
          // Dados principais
          lead_id:        ld.id || lead.id,
          nome:           ld.nome,
          telefone:       ld.telefone,
          valor:          ld.valor,
          origem:         ld.origem,
          responsavel_id: ld.responsavel_id,
          // Informações do contato
          nicho:          ld.nicho,
          instagram:      ld.instagram,
          tempo_oab:      ld.tempo_oab,
          faturamento:    ld.faturamento,
          observacoes:    ld.observacoes,
          tags:           ld.tags,
          // Dados do formulário
          formulario: {
            nome_completo:       ld.form_nome_completo,
            nome_fantasia:       ld.form_nome_fantasia,
            telefone_whatsapp:   ld.form_telefone_whatsapp,
            cnpj_cpf:            ld.form_cnpj_cpf,
            cep:                 ld.form_cep,
            cidade:              ld.form_cidade,
            estado:              ld.form_estado,
          },
          // UTMs
          utms: {
            platform: ld.utm_platform,
            campaign: ld.utm_campaign,
            set:      ld.utm_set,
            creative: ld.utm_creative,
            position: ld.utm_position,
          },
        })
      }).catch(e => console.error("Error firing whatsapp webhook:", e.message));

      // Log no histórico
      try {
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
           VALUES ($1, 'whatsapp_trigger', $2, $3)`,
          [lead.id, 'Grupo do Whatsapp Criado ✅', 'Sistema']
        );
      } catch (logErr) {
        console.error("Error logging whatsapp group creation to history:", logErr);
      }

      res.json({ success: true, message: 'Webhook disparado' });
    } catch (err) {
      console.error('Error triggering whatsapp webhook:', err);
      res.status(500).json({ error: 'Falha interna ao disparar webhook' });
    }
  });


  // GET /api/api4com/test-connection — validate the token by calling the Api4Com API
  app.get("/api/api4com/test-connection", async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, message: 'user_id é obrigatório' });
    try {
      const result = await pool.query('SELECT api4com_token, api4com_domain FROM crm_api4com_settings WHERE user_id = $1', [user_id]);
      if (result.rows.length === 0 || !result.rows[0].api4com_token) {
        return res.json({ success: false, message: 'Token não configurado. Salve as configurações primeiro.' });
      }
      const token = result.rows[0].api4com_token;
      let apiResult: { status: number, data: any };
      try {
        apiResult = await api4comRequest('GET', '/users/me', token);
      } catch (fetchErr) {
        console.error('[API4COM] External request failed:', fetchErr);
        return res.json({ success: false, message: 'Não foi possível contactar a Api4Com. Verifique a conectividade.' });
      }
      if (apiResult.status >= 200 && apiResult.status < 300) {
        const data = apiResult.data;
        return res.json({ success: true, message: `✓ Conectado — ${data.email || data.username || 'conta verificada'}` });
      } else {
        return res.json({ success: false, message: `Token inválido ou sem permissão (HTTP ${apiResult.status})` });
      }
    } catch (err) {
      console.error('Error in test-connection:', err);
      return res.json({ success: false, message: 'Erro interno. Tente novamente.' });
    }
  });

  // GET /api/api4com/extensions — list extensions from Api4Com account
  app.get("/api/api4com/extensions", async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    try {
      const result = await pool.query('SELECT api4com_token, api4com_domain FROM crm_api4com_settings WHERE user_id = $1', [user_id as string]);
      if (result.rows.length === 0 || !result.rows[0].api4com_token) {
        return res.status(400).json({ error: 'Token não configurado' });
      }
      const { api4com_token, api4com_domain } = result.rows[0];
      const extResult = await api4comRequest('GET', `/extensions?domain=${encodeURIComponent(api4com_domain)}`, api4com_token);
      console.log('[API4COM] Extensions:', JSON.stringify(extResult.data));
      res.json(extResult.data);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch extensions' });
    }
  });

  // GET /api/api4com/sip-credentials — fetch WebRTC/SIP credentials from Api4Com API
  // This returns the correct WSS server URL and SIP settings as provided by Api4Com
  app.get("/api/api4com/sip-credentials", async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });
    try {
      const result = await pool.query('SELECT * FROM crm_api4com_settings WHERE user_id = $1', [user_id]);
      if (result.rows.length === 0 || !result.rows[0].api4com_token) {
        return res.status(404).json({ error: 'Token não configurado' });
      }
      const { api4com_token, api4com_domain, sip_extension, sip_password, sip_server } = result.rows[0];

      // Try to get SIP/WebRTC credentials from Api4Com API
      let wssServer = sip_server || `wss://${api4com_domain}`;
      let sipDomain = api4com_domain;
      let sipUser = sip_extension;
      let sipPass = sip_password;

      try {
        // Try /extensions endpoint to get SIP extension details
        const extResult = await api4comRequest('GET', `/extensions/${sip_extension}`, api4com_token);
        console.log('[SIP CREDS] /extensions response:', extResult.status, JSON.stringify(extResult.data).slice(0, 300));
        if (extResult.status === 200 && extResult.data) {
          const d = extResult.data;
          // Extract WSS server from api4com response if present
          if (d.wss_server) wssServer = d.wss_server;
          else if (d.websocket_server) wssServer = d.websocket_server;
          else if (d.sip_server) wssServer = d.sip_server;
          if (d.sip_domain || d.domain) sipDomain = d.sip_domain || d.domain;
          if (d.sip_user || d.username) sipUser = d.sip_user || d.username || sip_extension;
          if (d.sip_password || d.password) sipPass = d.sip_password || d.password || sip_password;
        }
      } catch (e) {
        console.warn('[SIP CREDS] Could not fetch extension details:', e);
      }

      // Try /me or /users/me for account-level wss info
      try {
        const meResult = await api4comRequest('GET', '/users/me', api4com_token);
        console.log('[SIP CREDS] /users/me response:', meResult.status, JSON.stringify(meResult.data).slice(0, 300));
        if (meResult.status === 200 && meResult.data) {
          const d = meResult.data;
          if (d.wss_server && !wssServer.includes(':8089')) wssServer = d.wss_server;
          if (d.sip_domain) sipDomain = d.sip_domain;
        }
      } catch (e) {}

      res.json({
        extension: sipUser,
        password: sipPass,
        domain: sipDomain,
        wss_server: wssServer,
        raw_sip_server: sip_server
      });
    } catch (err) {
      console.error('[SIP CREDS] Error:', err);
      res.status(500).json({ error: 'Erro ao buscar credenciais SIP' });
    }
  });

  // POST /api/api4com/call/initiate — trigger a call via Api4Com Dialer
  app.post("/api/api4com/call/initiate", async (req, res) => {
    const { user_id, phone, lead_id } = req.body;
    console.log('[DIALER DEBUG] Request body:', JSON.stringify(req.body));
    if (!user_id || !phone) return res.status(400).json({ error: 'user_id and phone are required' });
    try {
      console.log('[DIALER DEBUG] Querying DB for user:', user_id);
      const result = await pool.query('SELECT * FROM crm_api4com_settings WHERE user_id = $1', [user_id]);
      console.log('[DIALER DEBUG] DB rows found:', result.rows.length);
      if (result.rows.length === 0 || !result.rows[0].api4com_token || !result.rows[0].sip_extension) {
        console.log('[DIALER DEBUG] Missing token or extension:', result.rows[0]);
        return res.status(400).json({ error: 'Telefonia não configurada para este usuário' });
      }
      const { api4com_token, sip_extension } = result.rows[0];
      console.log('[DIALER DEBUG] Using extension:', sip_extension, 'token length:', api4com_token?.length);

      // Normalize phone number to international format (+55XXXXXXXXXXX)
      let normalizedPhone = phone.replace(/\D/g, ''); // strip non-digits
      if (!normalizedPhone.startsWith('55')) {
        normalizedPhone = '55' + normalizedPhone;
      }
      normalizedPhone = '+' + normalizedPhone;

      console.log(`[API4COM] Initiating call: extension=${sip_extension}, phone=${normalizedPhone}`);

      let dialerResult: { status: number, data: any };
      try {
        dialerResult = await api4comRequest('POST', '/dialer', api4com_token, {
          extension: sip_extension,
          phone: normalizedPhone,
          metadata: { gateway: 'grapehub-crm', userId: user_id, entityId: lead_id }
        });
      } catch (fetchErr) {
        console.error('[API4COM] Dialer request failed:', fetchErr);
        return res.status(500).json({ error: 'Falha de conexão com a Api4Com' });
      }

      console.log(`[API4COM] Dialer response: status=${dialerResult.status}`, JSON.stringify(dialerResult.data));

      if (dialerResult.status < 200 || dialerResult.status >= 300) {
        const errMsg = dialerResult.data?.message || dialerResult.data?.error || JSON.stringify(dialerResult.data);
        return res.status(400).json({ error: 'Falha ao iniciar chamada', details: dialerResult.data, message: errMsg });
      }

      // Log call initiation in the lead history
      if (lead_id && lead_id !== 'test123') {
        try {
          await pool.query(
            `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name, from_coluna, to_coluna)
             VALUES ($1, 'call_initiated', $2, $3, '', '')`,
            [lead_id, `📞 Chamada iniciada para ${phone}`, req.body.user_name || 'Sistema']
          );
        } catch (histErr) {
          console.warn('[DIALER] Could not log history:', histErr);
        }
      }

      res.json({ success: true, call_id: dialerResult.data?.id });
    } catch (err) {
      console.error('[DIALER DEBUG] FATAL error:', err);
      res.status(500).json({ error: 'Erro interno ao iniciar chamada', detail: String(err) });
    }
  });

  // POST /api/api4com/webhook — receive call hangup from Api4Com (v1.4 payload)
  app.post("/api/api4com/webhook", async (req, res) => {
    try {
      const body = req.body;
      console.log('[API4COM WEBHOOK] Received:', JSON.stringify(body).slice(0, 300));

      const eventType = body.eventType;
      const metadata = body.metadata || {};
      const caller = body.caller;
      const called = body.called;
      const duration = body.duration || 0;
      const answeredAt = body.answeredAt;
      const hangupCause = body.hangupCause || body.hangup_cause;
      const recordUrl = body.recordUrl || body.record_url;
      const direction = body.direction || 'outbound';

      if (eventType === 'channel-hangup' && metadata?.entityId) {
        const leadId = metadata.entityId;
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        const durationStr = mins > 0 ? `${mins}min ${secs}s` : `${secs}s`;
        const answered = !!answeredAt && hangupCause === 'NORMAL_CLEARING';

        const description = answered
          ? `📞 Ligação ${direction === 'inbound' ? 'recebida de' : 'para'} ${called} — Duração: ${durationStr}${recordUrl ? ` — 🎧 Gravação disponível` : ''}`
          : `📞 Ligação para ${called} — Não atendida (${hangupCause || 'sem resposta'})`;

        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name, from_coluna, to_coluna)
           VALUES ($1, 'call_completed', $2, $3, '', '')`,
          [leadId, description, `Ramal ${caller}`]
        );
        console.log(`[API4COM WEBHOOK] Logged call for lead ${leadId}: ${answered ? 'answered' : 'not answered'}`);
      }
      res.json({ received: true });
    } catch (err) {
      console.error('Error processing api4com webhook:', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // POST /api/api4com/register-webhook — register our webhook URL in Api4Com integrations
  app.post("/api/api4com/register-webhook", async (req, res) => {
    try {
      const { user_id } = req.body;
      if (!user_id) return res.status(400).json({ error: 'user_id required' });

      const settingsRes = await pool.query(
        `SELECT api4com_token, api4com_domain FROM crm_api4com_settings WHERE user_id = $1`,
        [user_id]
      );
      if (!settingsRes.rows.length || !settingsRes.rows[0].api4com_token) {
        return res.status(404).json({ error: 'Api4Com not configured' });
      }
      const { api4com_token } = settingsRes.rows[0];

      const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:3000';
      const protocol = req.headers['x-forwarded-proto'] || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
      const webhookUrl = `${protocol}://${host}/api/api4com/webhook`;

      console.log(`[WEBHOOK REGISTER] Registering webhook at: ${webhookUrl}`);

      const apiRes = await fetch('https://api.api4com.com/api/v1/integrations', {
        method: 'PATCH',
        headers: { 'Authorization': api4com_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway: 'grapehub-crm',
          webhook: true,
          webhookConstraint: { metadata: { gateway: 'grapehub-crm' } },
          metadata: {
            webhookUrl,
            webhookVersion: 'v1.4',
            webhookTypes: ['channel-hangup']
          }
        })
      });

      const data = await apiRes.json();
      if (!apiRes.ok) {
        return res.status(apiRes.status).json({ error: 'Failed to register webhook', detail: data });
      }
      res.json({ success: true, webhookUrl, data });
    } catch (err) {
      console.error('[WEBHOOK REGISTER] Error:', err);
      res.status(500).json({ error: 'Erro ao registrar webhook', detail: String(err) });
    }
  });

  // GET /api/api4com/calls — fetch call history from Api4Com API (filtered by phone)
  app.get("/api/api4com/calls", async (req, res) => {
    try {
      const { user_id, phone, page = '1', limit = '20', started_after, started_before } = req.query as Record<string, string>;
      if (!user_id) return res.status(400).json({ error: 'user_id required' });

      const settingsRes = await pool.query(
        `SELECT api4com_token, api4com_domain FROM crm_api4com_settings WHERE user_id = $1`,
        [user_id]
      );
      if (!settingsRes.rows.length || !settingsRes.rows[0].api4com_token) {
        return res.status(404).json({ error: 'Api4Com not configured' });
      }
      const { api4com_token } = settingsRes.rows[0];

      // Build filter: if phone provided, filter by 'to' field (the destination number)
      const filter: any = {};
      if (phone) {
        // Try the full number and also without country code variants
        const cleanPhone = String(phone).replace(/\D/g, '');
        filter.where = { or: [
          { to: phone },
          { to: cleanPhone },
          { to: { like: `%${cleanPhone.slice(-9)}%` } }
        ]};
      }

      if (started_after || started_before) {
         if (!filter.where) filter.where = {};
         filter.where.started_at = {};
         if (started_after) filter.where.started_at.gte = started_after;
         if (started_before) filter.where.started_at.lte = started_before;
      }
      filter.order = 'started_at DESC';
      filter.limit = parseInt(limit, 10);

      const filterStr = encodeURIComponent(JSON.stringify(filter));
      const url = `https://api.api4com.com/api/v1/calls?page=${page}&filter=${filterStr}`;

      const apiRes = await fetch(url, {
        headers: {
          'Authorization': api4com_token,
          'Content-Type': 'application/json'
        }
      });
      let data = await apiRes.json();
      
      // DECODE: Match api4com numbers to internal CRM Leads to extract real owner name
      let enrichedData = Array.isArray(data) ? data : data.data || [];
      if (enrichedData.length > 0) {
        const phonesSet = new Set<string>();
        enrichedData.forEach((c: any) => {
          const phone = c.call_type === 'inbound' ? c.caller_id_number : c.to;
          if (phone) {
             const clean = String(phone).replace(/\D/g, '');
             phonesSet.add(clean);
             if (clean.length > 10) {
               phonesSet.add(clean.slice(-10));
               phonesSet.add(clean.slice(-11));
             }
          }
        });
        
        const phonesArray = Array.from(phonesSet);
        if (phonesArray.length > 0) {
          try {
            // Find leads with these phones and get their owner's name
            const leadsRes = await pool.query(
               `SELECT l.telefone, u.name as responsavel_name, u.email as responsavel_email 
                FROM crm_comercial_leads l 
                LEFT JOIN users u ON u.email = l.responsavel_id 
                WHERE regexp_replace(l.telefone, '\\D', '', 'g') = ANY($1)`,
               [phonesArray]
            );
            
            const leadMap = new Map();
            leadsRes.rows.forEach(r => {
               const clean = String(r.telefone).replace(/\D/g, '');
               leadMap.set(clean, r.responsavel_name || r.responsavel_email);
            });
            
            enrichedData = enrichedData.map((c: any) => {
               const phone = c.call_type === 'inbound' ? c.caller_id_number : c.to;
               const clean = phone ? String(phone).replace(/\D/g, '') : '';
               const owner = leadMap.get(clean) || leadMap.get('55' + clean) || (clean.length >= 10 ? leadMap.get(clean.slice(-10)) : null) || (clean.length >= 11 ? leadMap.get(clean.slice(-11)) : null);
               if (owner) {
                  c.crm_responsavel = owner;
               }
               return c;
            });
          } catch(errMap) {
            console.error('Error enriching api4com data:', errMap);
          }
        }
      }
      
      if (Array.isArray(data)) {
        data = enrichedData;
      } else {
        data.data = enrichedData;
      }
      
      if (Array.isArray(data) && data.length > 0) {
        console.log('[API4COM CALLS DEBUG] first started_at:', data[0].started_at, '| type:', typeof data[0].started_at);
      } else if (data?.data?.length > 0) {
        console.log('[API4COM CALLS DEBUG] first started_at:', data.data[0].started_at, '| type:', typeof data.data[0].started_at);
      }
      res.json(data);

    } catch (err) {
      console.error('[API4COM CALLS]', err);
      res.status(500).json({ error: 'Erro ao buscar histórico de ligações' });
    }
  });

  // Public Form Endpoints
  app.get('/api/public/lead-form/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "SELECT form_nome_completo, form_nome_fantasia, form_telefone_whatsapp, form_cnpj_cpf, form_cep, form_cidade, form_estado FROM crm_comercial_leads WHERE id = $1",
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("GET public leadform error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });

  app.post('/api/public/lead-form/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        form_nome_completo, 
        form_nome_fantasia, 
        form_telefone_whatsapp, 
        form_cnpj_cpf,
        form_cep, 
        form_cidade, 
        form_estado 
      } = req.body;
      
      const result = await pool.query(
        `UPDATE crm_comercial_leads 
         SET form_nome_completo = $1, 
             form_nome_fantasia = $2, 
             form_telefone_whatsapp = $3, 
             form_cnpj_cpf = $4,
             form_cep = $5, 
             form_cidade = $6, 
             form_estado = $7
         WHERE id = $8 RETURNING *`,
        [form_nome_completo, form_nome_fantasia, form_telefone_whatsapp, form_cnpj_cpf, form_cep, form_cidade, form_estado, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const updatedLead = result.rows[0];

      // Log it into the general history
      try {
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
           VALUES ($1, 'whatsapp_trigger', $2, $3)`,
          [id, 'Formulário Preenchido ✅', 'Sistema']
        );
      } catch (logErr) {
        console.error("Error logging form submission to history:", logErr);
      }

      res.json({ success: true, id });

      // After responding successfully to the client, silently trigger webhook
      try {
        if (updatedLead.responsavel_id) {
          const webhookRes = await pool.query(`
            SELECT ws.form_webhook_url 
            FROM crm_webhook_settings ws
            JOIN users u ON u.email = ws.user_id
            WHERE u.id = $1
          `, [updatedLead.responsavel_id]);
          
          if (webhookRes.rows.length > 0 && webhookRes.rows[0].form_webhook_url) {
            const webhookUrl = webhookRes.rows[0].form_webhook_url;
            
            // Fire and forget
            fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'form_submitted',
                lead_id: id,
                nome: updatedLead.nome,
                telefone: updatedLead.telefone,
                nicho: updatedLead.nicho,
                responsavel_id: updatedLead.responsavel_id,
                formData: {
                  form_nome_completo,
                  form_nome_fantasia,
                  form_telefone_whatsapp,
                  form_cep,
                  form_cidade,
                  form_estado
                }
              })
            }).catch(e => console.error("Error firing webhook:", e.message));
          }
        }
      } catch (webhookErr) {
        console.error("Error in webhook logic:", webhookErr);
      }

    } catch (err) {
      console.error("POST public leadform error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // CRM MÉTRICAS DASHBOARD
  // Agrega dados de fechamentos + reunioes para o dashboard de comercial
  // ══════════════════════════════════════════════════════════════════
  app.get("/api/crm-metricas-dashboard", async (req, res) => {
    try {
      const { month } = req.query;
      const selectedMonth = typeof month === 'string' && month ? month : new Date().toISOString().slice(0, 7);
      const [year, mon] = selectedMonth.split('-').map(Number);
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(year, mon, 0).toISOString().slice(0, 10);

      // Descobrir nomes reais das colunas de fechamentos
      const fechCols = await pool.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name='fechamentos' ORDER BY ordinal_position
      `);
      const colNames = fechCols.rows.map((r: any) => r.column_name);
      // Encontrar coluna de origem (INDICAÇÃO/CAMPANHAS)
      const origemCol = colNames.find((c: string) =>
        c.toLowerCase().includes('indica') || c.toLowerCase().includes('campa') || c.toLowerCase().includes('origem')
      ) || colNames[4] || 'id';
      // Encontrar coluna de valor
      const valorCol = colNames.find((c: string) =>
        c.toLowerCase() === 'valor' || c.toLowerCase().includes('valor')
      ) || colNames[3] || 'id';
      // Encontrar coluna nome
      const nomeCol = colNames.find((c: string) => c.toLowerCase() === 'nome') || colNames[2] || 'id';
      // Encontrar coluna faturamento
      const fatCol = colNames.find((c: string) => c.toLowerCase().includes('fatura')) || origemCol;
      // Encontrar coluna cidade
      const cidadeCol = colNames.find((c: string) => c.toLowerCase().includes('cidade')) || 'id';

      // Fechamentos do mês selecionado
      const fechamentosMonth = await pool.query(`
        SELECT id, day, "${nomeCol}" as "Nome", "${valorCol}" as "Valor", "${origemCol}" as origem, "${cidadeCol}" as "Cidade"
        FROM fechamentos
        WHERE day >= $1 AND day <= $2
        ORDER BY day DESC
      `, [startDate, endDate]);

      // Fechamentos por mês (ano corrente)
      const fechamentosYear = await pool.query(`
        SELECT
          EXTRACT(MONTH FROM day) AS mes,
          COUNT(*) AS quantidade,
          SUM(CAST(REPLACE(REPLACE(REPLACE(COALESCE("${valorCol}", '0'), 'R$', ''), ',', '.'), ' ', '') AS NUMERIC)) AS total_valor
        FROM fechamentos
        WHERE EXTRACT(YEAR FROM day) = $1
        GROUP BY EXTRACT(MONTH FROM day)
        ORDER BY mes ASC
      `, [year]);

      // Descobrir nomes reais das colunas de reunioes
      const reunCols = await pool.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name='reunioes' ORDER BY ordinal_position
      `);
      const rCols = reunCols.rows.map((r: any) => r.column_name);
      const rMarcadas   = rCols.find((c: string) => c.toLowerCase().includes('marca')) || rCols[2] || 'id';
      const rRealizadas = rCols.find((c: string) => c.toLowerCase().includes('realiz')) || rCols[5] || 'id';
      const rNoshow     = rCols.find((c: string) => c.toLowerCase().includes('noshow') || c.toLowerCase().includes('no-show') || c.toLowerCase() === 'noshow') || rCols[3] || 'id';
      const rReagend    = rCols.find((c: string) => c.toLowerCase().includes('reagend')) || rCols[4] || 'id';
      const rDay        = rCols.find((c: string) => c.toLowerCase() === 'day') || rCols[1] || 'id';

      // Reuniões por mês (ano corrente)
      const reunioesYear = await pool.query(`
        SELECT
          EXTRACT(MONTH FROM TO_DATE("${rDay}", 'YYYY-MM-DD')) AS mes,
          SUM(CAST(COALESCE(NULLIF("${rMarcadas}",''), '0') AS INTEGER)) AS marcadas,
          SUM(CAST(COALESCE(NULLIF("${rRealizadas}",''), '0') AS INTEGER)) AS realizadas,
          SUM(CAST(COALESCE(NULLIF("${rNoshow}",''), '0') AS INTEGER)) AS noshow,
          SUM(CAST(COALESCE(NULLIF("${rReagend}",''), '0') AS INTEGER)) AS reagendamento
        FROM reunioes
        WHERE EXTRACT(YEAR FROM TO_DATE("${rDay}", 'YYYY-MM-DD')) = $1
        GROUP BY EXTRACT(MONTH FROM TO_DATE("${rDay}", 'YYYY-MM-DD'))
        ORDER BY mes ASC
      `, [year]);

      // Totais de reuniões do mês
      const reunioesMonth = await pool.query(`
        SELECT
          SUM(CAST(COALESCE(NULLIF("${rMarcadas}",''), '0') AS INTEGER)) AS marcadas,
          SUM(CAST(COALESCE(NULLIF("${rRealizadas}",''), '0') AS INTEGER)) AS realizadas,
          SUM(CAST(COALESCE(NULLIF("${rNoshow}",''), '0') AS INTEGER)) AS noshow,
          SUM(CAST(COALESCE(NULLIF("${rReagend}",''), '0') AS INTEGER)) AS reagendamento
        FROM reunioes
        WHERE "${rDay}" >= $1 AND "${rDay}" <= $2
      `, [startDate, endDate]);

      // KPIs do mês anterior (para comparativo)
      const prevDate = new Date(year, mon - 2, 1); // mês anterior
      const prevYear = prevDate.getFullYear();
      const prevMon  = prevDate.getMonth() + 1;
      const prevStart = `${prevYear}-${String(prevMon).padStart(2,'0')}-01`;
      const prevEnd   = new Date(prevYear, prevMon, 0).toISOString().slice(0, 10);

      const kpisPrev = await pool.query(`
        SELECT
          COUNT(*) AS vendas,
          COALESCE(SUM(CAST(REPLACE(REPLACE(REPLACE(COALESCE("${valorCol}", '0'), 'R$', ''), ',', '.'), ' ', '') AS NUMERIC)), 0) AS receita_total,
          COALESCE(AVG(CAST(REPLACE(REPLACE(REPLACE(COALESCE("${valorCol}", '0'), 'R$', ''), ',', '.'), ' ', '') AS NUMERIC)), 0) AS ticket_medio,
          COUNT(*) FILTER (WHERE LOWER(COALESCE("${origemCol}",'')) LIKE '%campa%') AS total_campanhas,
          COUNT(*) FILTER (WHERE LOWER(COALESCE("${origemCol}",'')) LIKE '%indica%') AS total_indicacao
        FROM fechamentos
        WHERE day >= $1 AND day <= $2
      `, [prevStart, prevEnd]);

      // KPIs do mês atual
      const kpisMonth = await pool.query(`
        SELECT
          COUNT(*) AS vendas,
          COALESCE(SUM(CAST(REPLACE(REPLACE(REPLACE(COALESCE("${valorCol}", '0'), 'R$', ''), ',', '.'), ' ', '') AS NUMERIC)), 0) AS receita_total,
          COALESCE(AVG(CAST(REPLACE(REPLACE(REPLACE(COALESCE("${valorCol}", '0'), 'R$', ''), ',', '.'), ' ', '') AS NUMERIC)), 0) AS ticket_medio,
          COUNT(*) FILTER (WHERE LOWER(COALESCE("${origemCol}",'')) LIKE '%campa%') AS total_campanhas,
          COUNT(*) FILTER (WHERE LOWER(COALESCE("${origemCol}",'')) LIKE '%indica%') AS total_indicacao,
          SUM(CAST(REPLACE(REPLACE(REPLACE(COALESCE("${valorCol}", '0'), 'R$', ''), ',', '.'), ' ', '') AS NUMERIC))
            FILTER (WHERE LOWER(COALESCE("${origemCol}",'')) LIKE '%campa%') AS receita_campanhas,
          SUM(CAST(REPLACE(REPLACE(REPLACE(COALESCE("${valorCol}", '0'), 'R$', ''), ',', '.'), ' ', '') AS NUMERIC))
            FILTER (WHERE LOWER(COALESCE("${origemCol}",'')) LIKE '%indica%') AS receita_indicacao
        FROM fechamentos
        WHERE day >= $1 AND day <= $2
      `, [startDate, endDate]);

      // Motivos de Perda do mês
      const lossReasonsMonth = await pool.query(`
        SELECT
          COALESCE(lr.name, 'Sem motivo') AS name,
          COUNT(cl.id) AS total
        FROM crm_comercial_leads cl
        LEFT JOIN crm_comercial_loss_reasons lr ON cl.loss_reason_id = lr.id
        WHERE cl.is_lost = true
          AND cl.updated_at >= $1 AND cl.updated_at <= ($2::date + interval '1 day')
        GROUP BY lr.name
        ORDER BY total DESC
      `, [startDate, endDate]);

      const totalPerdas = lossReasonsMonth.rows.reduce((s: number, r: any) => s + Number(r.total), 0);

      res.json({
        month: selectedMonth,
        kpis: kpisMonth.rows[0],
        kpis_prev: kpisPrev.rows[0],
        fechamentos_list: fechamentosMonth.rows,
        fechamentos_year: fechamentosYear.rows,
        reunioes_year: reunioesYear.rows,
        reunioes_month: reunioesMonth.rows[0],
        loss_reasons_month: lossReasonsMonth.rows,
        total_perdas: totalPerdas,
        _debug_cols: { fechamentos: colNames, reunioes: rCols },
      });
    } catch (err: any) {
      console.error("[crm-metricas-dashboard] Error:", err.message);
      res.status(500).json({ error: "Failed to load dashboard", detail: err.message });
    }
  });

  // ── POST /api/ai/chat — Fred, o Sócio Virtual (Claude AI) ──────────────────
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        return res.status(503).json({ error: 'ANTHROPIC_API_KEY não configurada no servidor.' });
      }

      const { messages, pageContext, personalityConfig } = req.body;
      const activeTheme: string = pageContext?.theme || 'dark';

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages é obrigatório.' });
      }

      // ── Contexto por seção ──
      const activeSection: string = pageContext?.section || 'general';
      let sectionContext: any = null;

      // ── CRM ──
      if (activeSection === 'crm') {
        try {
          const [statusRes, inadimRes, leadsRes] = await Promise.all([
            pool.query(`
              SELECT crm_status, COUNT(*) AS qtd
              FROM clients
              WHERE crm_status IS NOT NULL AND crm_status != ''
              GROUP BY crm_status ORDER BY qtd DESC
            `),
            pool.query(`
              SELECT
                COALESCE(fp.name, r.customer_name) AS name,
                c.crm_status,
                CURRENT_DATE - MIN(r.due_date) AS dias_atraso,
                SUM(r.value)::numeric(14,2) AS valor_em_aberto
              FROM fin_receivables r
              JOIN fin_people fp ON fp.asaas_id = r.customer_id
              LEFT JOIN clients c ON c.fin_people_guid = fp.guid
              WHERE r.status = 'OVERDUE'
              GROUP BY fp.name, r.customer_name, c.crm_status
              ORDER BY valor_em_aberto DESC LIMIT 10
            `),
            pool.query(`
              SELECT
                nome, telefone, origem, valor, coluna, tags,
                created_at::date AS criado_em
              FROM crm_comercial_leads
              ORDER BY created_at DESC LIMIT 20
            `),
          ]);
          sectionContext = {
            secao: 'CRM',
            clientes_por_status: statusRes.rows,
            inadimplentes_top10: inadimRes.rows,
            leads_recentes: leadsRes.rows,
            gerado_em: new Date().toISOString(),
          };
        } catch (e) {
          console.error('[AI Chat] Erro contexto CRM:', e);
          sectionContext = { secao: 'CRM', erro: 'Não foi possível carregar dados CRM.' };
        }
      }

      // ── Atividades / Pessoas / Empresas ──
      if (activeSection === 'atividades') {
        try {
          const [tarefasRes, pessoasRes] = await Promise.all([
            pool.query(`
              SELECT
                t.title, t.status, t.priority, t.due_date::date AS vencimento,
                u.name AS responsavel
              FROM todos t
              LEFT JOIN users u ON u.id::text = t.assigned_to::text
              WHERE t.status != 'done'
              ORDER BY t.due_date ASC NULLS LAST LIMIT 30
            `),
            pool.query(`
              SELECT name, email, phone, company, role
              FROM crm_pessoas
              ORDER BY created_at DESC LIMIT 20
            `),
          ]);
          sectionContext = {
            secao: 'Atividades',
            tarefas_pendentes: tarefasRes.rows,
            pessoas_recentes: pessoasRes.rows,
            gerado_em: new Date().toISOString(),
          };
        } catch (e) {
          console.error('[AI Chat] Erro contexto Atividades:', e);
          sectionContext = { secao: 'Atividades', erro: 'Não foi possível carregar dados de atividades.' };
        }
      }

      // ── Marketing ──
      if (activeSection === 'marketing') {
        try {
          const campanhasRes = await pool.query(`
            SELECT title, status, type, start_date::date, end_date::date, budget, notes
            FROM marketing_campaigns
            ORDER BY start_date DESC LIMIT 20
          `).catch(() => ({ rows: [] as any[] }));
          sectionContext = {
            secao: 'Marketing',
            campanhas: campanhasRes.rows,
            gerado_em: new Date().toISOString(),
          };
        } catch (e) {
          sectionContext = { secao: 'Marketing', erro: 'Não foi possível carregar dados de marketing.' };
        }
      }

      // ── Operacional (Gestor / Projetos / Tasks) ──
      if (activeSection === 'operacional') {
        try {
          const [projetosRes, tasksRes] = await Promise.all([
            pool.query(`
              SELECT name, status, partner, started_at::date, updated_at::date
              FROM projects
              WHERE status != 'concluido' AND status != 'cancelado'
              ORDER BY updated_at DESC LIMIT 15
            `),
            pool.query(`
              SELECT title, status, priority, due_date::date AS vencimento
              FROM todos
              WHERE status != 'done' AND (priority = 'high' OR due_date <= NOW() + INTERVAL '7 days')
              ORDER BY due_date ASC NULLS LAST LIMIT 20
            `),
          ]);
          sectionContext = {
            secao: 'Operacional',
            projetos_em_andamento: projetosRes.rows,
            tarefas_criticas: tasksRes.rows,
            gerado_em: new Date().toISOString(),
          };
        } catch (e) {
          console.error('[AI Chat] Erro contexto Operacional:', e);
          sectionContext = { secao: 'Operacional', erro: 'Não foi possível carregar dados operacionais.' };
        }
      }

      // ── Contexto financeiro (apenas para páginas financeiras) ──
      let financialContext: any = null;
      if (pageContext?.includeFinancial) {
        try {
          const mesAtual = `DATE_TRUNC('month', NOW())`;
          const [receitasRes, despesasRes, aReceberRes, topClientesRes, saldoRes, extratoRes] = await Promise.all([
            pool.query(`
              SELECT
                TO_CHAR(DATE_TRUNC('month', COALESCE(movement_date, expiration_date)), 'YYYY-MM') AS mes,
                SUM(value)::numeric(14,2) AS total_receita,
                COUNT(*) AS qtd_recebimentos
              FROM fin_movements
              WHERE type = 1
                AND type_column = 'realizado'
                AND status = 'Conciliado'
                AND source NOT IN ('transfer_in', 'transfer_out')
                AND COALESCE(movement_date, expiration_date) >= NOW() - INTERVAL '6 months'
              GROUP BY 1 ORDER BY 1 DESC
            `),
            pool.query(`
              SELECT
                COALESCE(custom_category, grapehub_category, 'Não categorizado') AS categoria,
                SUM(ABS(value))::numeric(14,2) AS total,
                COUNT(*) AS qtd
              FROM fin_movements_asaas
              WHERE value < 0
                AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', NOW())
              GROUP BY 1 ORDER BY 2 DESC
            `),
            pool.query(`
              SELECT
                COUNT(*) AS qtd,
                SUM(value)::numeric(14,2) AS valor_total
              FROM fin_receivables
              WHERE status IN ('PENDING', 'OVERDUE')
                AND due_date <= NOW() + INTERVAL '30 days'
            `),
            pool.query(`
              SELECT
                COALESCE(fp.name, r.customer_name, 'Desconhecido') AS cliente,
                SUM(r.value)::numeric(14,2) AS total_recebido
              FROM fin_receivables r
              JOIN fin_people fp ON fp.asaas_id = r.customer_id
              WHERE r.status IN ('RECEIVED', 'CONFIRMED')
                AND DATE_TRUNC('month', r.payment_date) = DATE_TRUNC('month', NOW())
              GROUP BY fp.name, r.customer_name ORDER BY 2 DESC LIMIT 5
            `),
            pool.query(`
              SELECT
                SUM(CASE WHEN value > 0 THEN value ELSE 0 END)::numeric(14,2) AS entradas_realizadas,
                SUM(CASE WHEN value < 0 THEN ABS(value) ELSE 0 END)::numeric(14,2) AS saidas_realizadas,
                SUM(value)::numeric(14,2) AS saldo_periodo
              FROM fin_movements_asaas
              WHERE DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', NOW())
            `),
            pool.query(`
              SELECT
                m.id,
                COALESCE(m.custom_description, m.description) AS description,
                '' AS contraparte,
                COALESCE(m.custom_category, m.grapehub_category) AS categoria_manual,
                CASE WHEN m.value > 0 THEN 1 ELSE -1 END AS type,
                'realizado' AS type_column,
                'Realizado' AS status,
                m.transaction_date::date AS data,
                m.value::numeric(14,2) AS valor,
                CASE
                  WHEN m.custom_category IS NOT NULL AND m.custom_category != '' THEN m.custom_category
                  WHEN m.grapehub_category IS NOT NULL AND m.grapehub_category != '' THEN m.grapehub_category
                  WHEN lower(m.description) LIKE '%cartão de crédito%' OR lower(m.description) LIKE '%cartao de credito%' OR lower(m.description) LIKE '%cartão de cred%' THEN 'Cartão de Crédito'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%simples nacional%','%iss%','%irpj%','%imposto%','%das %','%pis%','%cofins%','%csll%','%taxa municipal%','%alvará%']) THEN 'Impostos'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%remuneração%','%salário%','%bonificação%','%business partner%','%fgts%','%irrf%','%folha%','%férias%','%13º%','%rescisão%','%benefício%','%vale %','%plano de saúde%','%odonto%','%seguro de vida%']) THEN 'Salários e Pessoal'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%ferramenta%','%software%','%vps%','%domínio%','%hospedagem%','%aws%','%google cloud%','%vercel%','%openai%','%claude%','%github%','%cursor%','%slack%','%zoom%','%canva%','%adobe%','%figma%','%notion%','%trello%','%jira%','%elevenlabs%','%typeform%','%hostinger%','%microsoft%','%gather%','%htm fech%']) THEN 'Cartão de Crédito'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%comissão%','%tráfego pago%','%facebook ads%','%google ads%','%meta ads%','%marketing%','%publicidade%','%rd station%','%hubspot%','%activecamp%']) THEN 'Marketing e Vendas'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%aluguel%','%condomínio%','%energia%','%internet%','%assessoria%','%contabilidade%','%limpeza%','%escritório%','%material%','%seguro%','%água%','%telefone%','%correios%','%copel%']) THEN 'Administrativo'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%taxa%','%tarifa%','%juros%','%iof%','%banco%','%anuidade%','%ted%','%boleto%']) THEN 'Despesas Financeiras'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%pró-labore%','%pro-labore%','%dividendo%','%inss%','%retirada%','%lucro%','%sócio%','%distribuição%']) THEN 'Distribuição de Lucros'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%facebk%','%facebook%']) THEN 'Cartão de Crédito > Facebook'
                  ELSE 'Outros'
                END AS categoria_efetiva
              FROM fin_movements_asaas m
              WHERE DATE_TRUNC('month', m.transaction_date) = DATE_TRUNC('month', NOW())
              ORDER BY m.transaction_date DESC
              LIMIT 300
            `),
          ]);

          // Agrupa extrato por categoria usando a categoria efetiva (manual ou auto-detectada)
          const extratoRows = extratoRes.rows;
          const categoriaMap: Record<string, { total: number; itens: any[] }> = {};
          for (const row of extratoRows) {
            const cat = row.categoria_efetiva || 'Outros';
            if (!categoriaMap[cat]) categoriaMap[cat] = { total: 0, itens: [] };
            const val = parseFloat(row.valor) * row.type;
            categoriaMap[cat].total += val;
            categoriaMap[cat].itens.push({
              descricao: row.description,
              contraparte: row.contraparte,
              data: row.data,
              status: row.status,
              tipo: row.type_column,
              categoria_manual: row.categoria_manual || null,
              valor: val,
            });
          }
          // Aplicativos = Cartão de Crédito sem Facebook
          if (categoriaMap['Cartão de Crédito']) {
            const isFacebook = (d: string) => /facebook|facebk/i.test(d || '');
            const cartao = categoriaMap['Cartão de Crédito'].itens;
            if (!categoriaMap['Cartão de Crédito > Facebook']) {
              categoriaMap['Cartão de Crédito > Facebook'] = {
                total: cartao.filter(i => isFacebook(i.descricao)).reduce((s, i) => s + i.valor, 0),
                itens: cartao.filter(i => isFacebook(i.descricao)),
              };
            }
            categoriaMap['Cartão de Crédito > Aplicativos'] = {
              total: cartao.filter(i => !isFacebook(i.descricao)).reduce((s, i) => s + i.valor, 0),
              itens: cartao.filter(i => !isFacebook(i.descricao)),
            };
          }

          financialContext = {
            receitas_6meses: receitasRes.rows,
            despesas_mes_atual: despesasRes.rows,
            a_receber_proximos_30_dias: aReceberRes.rows[0],
            top_5_clientes: topClientesRes.rows,
            resumo_mes_atual: saldoRes.rows[0],
            extrato_mes_atual: extratoRows,
            extrato_por_categoria: Object.entries(categoriaMap).map(([cat, data]) => ({
              categoria: cat,
              total: data.total.toFixed(2),
              qtd_itens: data.itens.length,
              itens: data.itens.slice(0, 30),
            })),
            gerado_em: new Date().toISOString(),
          };
        } catch (dbErr) {
          console.error('[AI Chat] Erro ao buscar contexto financeiro:', dbErr);
          financialContext = { erro: 'Não foi possível carregar os dados financeiros neste momento.' };
        }
      }

      // ── Personalidade ──
      const p = personalityConfig || {};
      const nome = p.nome || 'Fred';
      const humor = p.humor || 'direto e levemente irônico, sem ser grosseiro';
      const personalidade = p.personalidade || 'sócio conservador que prioriza saúde financeira, mas nunca perde o olhar para crescimento sustentável. Especialista em comercial, operacional e relacionamento com clientes.';
      const instrucoes_extras = p.instrucoes_extras || '';

      const financialSection = financialContext
        ? `
## 📊 DADOS FINANCEIROS EM TEMPO REAL (NeonDB — Grape Mídia)
> Dados carregados agora do banco de dados. Use como base para análise.

### Receita — Últimos 6 meses
${JSON.stringify(financialContext.receitas_6meses, null, 2)}

### Despesas do mês atual por categoria
${JSON.stringify(financialContext.despesas_mes_atual, null, 2)}

### A receber nos próximos 30 dias
${JSON.stringify(financialContext.a_receber_proximos_30_dias, null, 2)}

### Resumo do mês atual (entradas / saídas / saldo)
${JSON.stringify(financialContext.resumo_mes_atual, null, 2)}

### Top 5 clientes por valor recebido
${JSON.stringify(financialContext.top_5_clientes, null, 2)}

### Extrato do mês atual — por categoria e subcategoria
> Cada item tem: descrição, contraparte, data, status (realizado/previsto), valor (negativo = saída, positivo = entrada)
> Categoria "Cartão de Crédito > Facebook" = gastos com Facebook/Facebk; "Cartão de Crédito > Aplicativos" = demais apps
${JSON.stringify(financialContext.extrato_por_categoria, null, 2)}

> Gerado em: ${financialContext.gerado_em}
`
        : `
## ⚠️ Contexto financeiro não disponível nesta página
Você pode responder perguntas gerais sobre gestão, estratégia e negócios.
Para análise financeira detalhada, o usuário deve acessar o Dashboard Financeiro ou Extrato.
`;

      const sectionSection = sectionContext
        ? (() => {
          const s = sectionContext;
          if (s.erro) return `\n## ⚠️ Contexto ${s.secao}: ${s.erro}\n`;
          if (s.secao === 'CRM') return `
## 🤝 DADOS DO CRM EM TEMPO REAL
> Dados carregados agora do banco. Use como base para análise de carteira.

### Clientes por status CRM
${JSON.stringify(s.clientes_por_status, null, 2)}

### Top inadimplentes
${JSON.stringify(s.inadimplentes_top10, null, 2)}

### Leads recentes (últimos 20)
${JSON.stringify(s.leads_recentes, null, 2)}

> Gerado em: ${s.gerado_em}
`;
          if (s.secao === 'Atividades') return `
## 📋 DADOS DE ATIVIDADES EM TEMPO REAL
> Tarefas pendentes e pessoas cadastradas.

### Tarefas pendentes (próximas 30)
${JSON.stringify(s.tarefas_pendentes, null, 2)}

### Pessoas recentes no CRM
${JSON.stringify(s.pessoas_recentes, null, 2)}

> Gerado em: ${s.gerado_em}
`;
          if (s.secao === 'Marketing') return `
## 📣 DADOS DE MARKETING EM TEMPO REAL
> Campanhas e ações de marketing da Grape Mídia.

### Campanhas (recentes)
${JSON.stringify(s.campanhas, null, 2)}

> Gerado em: ${s.gerado_em}
`;
          if (s.secao === 'Operacional') return `
## ⚙️ DADOS OPERACIONAIS EM TEMPO REAL
> Projetos em andamento e tarefas críticas.

### Projetos em andamento
${JSON.stringify(s.projetos_em_andamento, null, 2)}

### Tarefas críticas / com prazo próximo
${JSON.stringify(s.tarefas_criticas, null, 2)}

> Gerado em: ${s.gerado_em}
`;
          return '';
        })()
        : '';

      const fredMode: string = pageContext?.fredMode || 'grape';

      const FRED_IDENTITIES: Record<string, string> = {
        comercial: `
Você está operando como **Especialista Comercial** da Grape Mídia.
Seu foco AGORA é pipeline de vendas, relacionamento com leads, churn, prospecção ativa, upsell e renovações.
Pense como um Head of Sales experiente: orientado a número, obstinado em conversão, mas respeitoso com o posicionamento boutique da Grape.
Lembre: o gargalo histórico da Grape é GERAÇÃO DE LEADS, não conversão. Todo conselho deve considerar isso.
Dados de CRM injetados no contexto representam a carteira e pipeline atual — use-os para análises diretas.`,

        marketing: `
Você está operando como **Especialista em Marketing** da Grape Mídia.
Seu foco AGORA é campanhas, tráfego pago, conteúdo, geração de demanda e posicionamento de marca.
A Grape atua em marketing jurídico — nicho de alta exigência, onde credibilidade supera volume.
Pense como um CMO criterioso: ROI de campanhas, custo por lead, diferenciação no mercado jurídico.
Dados de marketing injetados no contexto representam as ações em andamento — use-os para análises diretas.`,

        financeiro: `
Você está operando como **Especialista Financeiro** da Grape Mídia.
Seu foco AGORA é caixa, receitas, despesas, inadimplência, margens e projeções.
Pense como CFO conservador: prefira caixa a crescimento alavancado, questione toda despesa sem retorno claro.
Dados financeiros injetados no contexto (extrato, receitas, despesas por categoria) são REAIS e carregados agora do banco.`,

        operacional: `
Você está operando como **Especialista Operacional** da Grape Mídia.
Seu foco AGORA é processos internos, gestão do time (~9 colaboradores), entregas de projetos e capacidade produtiva.
Pense como COO que identifica gargalos antes de ser perguntado.
Dados operacionais injetados representam projetos e tarefas críticas em andamento — use-os.`,

        grape: `
Você está no modo **Sócio Grape** — visão 360° da empresa.
Você conhece profundamente a Grape Mídia: agência de marketing jurídico, clientes advogados e escritórios, time enxuto, posicionamento boutique.
Sua expertise cobre todos os pilares: Financeiro, Comercial, Operacional e Relacionamento.
Responda com a visão integrada de quem está no negócio junto — não apenas um consultor externo.`,
      };

      const identidadeAtual = FRED_IDENTITIES[fredMode] || FRED_IDENTITIES.grape;


      const systemPrompt = `
# IDENTIDADE

Você é **${nome}**, o sócio virtual da Grape Mídia dentro do GrapeHub.
Seu humor é ${humor}.
Sua personalidade: ${personalidade}

${identidadeAtual}

# PRINCÍPIOS INEGOCIÁVEIS
1. **Sinceridade absoluta** — Nunca resposta vaga para agradar. Se os números mostram problema, fale. Com respeito, sem rodeios.
2. **Conservadorismo financeiro** — Prefira caixa a crescimento alavancado. Questione despesas antes de aprová-las mentalmente.
3. **Visão de crescimento** — Sempre pergunte: o que precisamos fazer para esse número melhorar em 3 meses?
4. **Fale como sócio** — Use "nosso caixa", "nossa carteira" quando fizer sentido. Você está no negócio junto.
5. **Nunca invente dados** — Se não souber, diga. Nunca projete sem base explícita.

# FORMATO
- Respostas curtas para perguntas diretas
- Respostas estruturadas (seções) para análises complexas
- Português brasileiro, linguagem de negócios acessível
- Emojis com moderação — só quando reforçam a mensagem
- Quando der opinião, deixe claro que é sua leitura dos dados

Tema ativo do GrapeHub: ${activeTheme}

${financialSection}
${sectionSection}

# GRÁFICOS HTML — REGRAS OBRIGATÓRIAS
Quando o usuário pedir gráficos, visualizações ou charts, responda SEMPRE com HTML completo e funcional usando Chart.js carregado via CDN (https://cdn.jsdelivr.net/npm/chart.js).

Regras obrigatórias para gráficos:
- Retorne APENAS o HTML puro, sem markdown, sem explicações antes ou depois, sem blocos de código
- O HTML deve ser completo (com <html>, <head>, <body>)
- Use Chart.js via CDN para todos os gráficos
- O canvas deve ocupar 100% da largura disponível
- Sempre inclua título descritivo no gráfico
- Quando tiver dados reais injetados no contexto, use-os. Quando não tiver, deixe claro no título que são dados de exemplo
- Labels do eixo X sempre horizontais (maxRotation: 0), fonte tamanho 11
- Container do canvas deve ter height: 300px explícito
- Após o fechamento do </html>, adicione obrigatoriamente um parágrafo curto de análise em português corrido (máx 3 linhas, sem título markdown)

Temas visuais — o campo "Tema ativo do GrapeHub" indica o tema ativo:

TEMA CLARO (light):
- body background: #ffffff
- Texto e labels dos eixos: #1a1a1a
- Gridlines: rgba(0,0,0,0.08)
- Título do gráfico: #111111

TEMA ESCURO (dark):
- body background: #1a1a2e
- Texto e labels dos eixos: #e2e8f0
- Gridlines: rgba(255,255,255,0.1)
- Título do gráfico: #ffffff

TEMA ESCURO PROFUNDO (deep):
- body background: #0a0a0f
- Texto e labels dos eixos: #a0aec0
- Gridlines: rgba(255,255,255,0.05)
- Título do gráfico: #e2e8f0

Cores dos gráficos (usar em todos os temas):
- Roxo Grape: #7C3AED
- Magenta: #D946EF
- Verde positivo: #10B981
- Cinza: #6B7280

${instrucoes_extras ? `# INSTRUÇÕES ADICIONAIS\n${instrucoes_extras}` : ''}
`.trim();

      // ── Chama Claude ──
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages,
      });

      const firstContent = response.content[0];
      const reply = firstContent.type === 'text' ? firstContent.text : 'Não consegui gerar uma resposta.';

      res.json({ reply });
    } catch (err: any) {
      console.error('[AI Chat] Erro:', err?.message || err);
      res.status(500).json({ error: err?.message || 'Erro interno ao processar mensagem de IA.' });
    }
  });

  // ── TODO Staff API ─────────────────────────────────────────────────────────

  // Tasks CRUD
  app.get("/api/todo-staff/tasks", async (_req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM to_do_staff ORDER BY created_at DESC");
      const items = rows.map(r => ({
        id: r.id, title: r.title, description: r.description || undefined,
        priority: r.priority, status: r.status, tags: r.tags || [],
        assignee: r.assignee || undefined, dueDate: r.due_date || undefined,
        subtasks: r.subtasks || [], comments: r.comments || [],
        createdAt: r.created_at?.toISOString(), doneAt: r.done_at?.toISOString() || undefined,
      }));
      res.json(items);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/todo-staff/tasks", async (req, res) => {
    try {
      const { id, title, description, priority, status, tags, assignee, dueDate, subtasks, comments, doneAt } = req.body;
      await pool.query(
        `INSERT INTO to_do_staff (id, title, description, priority, status, tags, assignee, due_date, subtasks, comments, done_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [id, title, description || null, priority || 'medium', status || 'todo',
         JSON.stringify(tags || []), assignee || null, dueDate || null,
         JSON.stringify(subtasks || []), JSON.stringify(comments || []),
         doneAt || null]
      );
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/todo-staff/tasks/:id", async (req, res) => {
    try {
      const { title, description, priority, status, tags, assignee, dueDate, subtasks, comments, doneAt } = req.body;
      await pool.query(
        `UPDATE to_do_staff SET title=$1, description=$2, priority=$3, status=$4, tags=$5,
         assignee=$6, due_date=$7, subtasks=$8, comments=$9, done_at=$10 WHERE id=$11`,
        [title, description || null, priority, status,
         JSON.stringify(tags || []), assignee || null, dueDate || null,
         JSON.stringify(subtasks || []), JSON.stringify(comments || []),
         doneAt || null, req.params.id]
      );
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/todo-staff/tasks/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM to_do_staff WHERE id=$1", [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Recurring CRUD
  app.get("/api/todo-staff/recurring", async (_req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM to_do_staff_recurring ORDER BY created_at DESC");
      const items = rows.map(r => ({
        id: r.id, title: r.title, assignee: r.assignee || undefined,
        tags: r.tags || [], frequency: r.frequency,
        dayOfWeek: r.day_of_week || undefined, createdAt: r.created_at?.toISOString(),
      }));
      res.json(items);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/todo-staff/recurring", async (req, res) => {
    try {
      const { id, title, assignee, tags, frequency, dayOfWeek } = req.body;
      await pool.query(
        `INSERT INTO to_do_staff_recurring (id, title, assignee, tags, frequency, day_of_week) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, title, assignee || null, JSON.stringify(tags || []), frequency, dayOfWeek || null]
      );
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/todo-staff/recurring/:id", async (req, res) => {
    try {
      const { title, assignee, tags, frequency, dayOfWeek } = req.body;
      await pool.query(
        `UPDATE to_do_staff_recurring SET title=$1, assignee=$2, tags=$3, frequency=$4, day_of_week=$5 WHERE id=$6`,
        [title, assignee || null, JSON.stringify(tags || []), frequency, dayOfWeek || null, req.params.id]
      );
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/todo-staff/recurring/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM to_do_staff_recurring WHERE id=$1", [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Ideas CRUD
  app.get("/api/todo-staff/ideas", async (_req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM to_do_staff_ideas ORDER BY created_at DESC");
      const items = rows.map(r => ({
        id: r.id, title: r.title, description: r.description || undefined,
        status: r.status, tags: r.tags || [], comments: r.comments || [],
        createdAt: r.created_at?.toISOString(),
      }));
      res.json(items);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/todo-staff/ideas", async (req, res) => {
    try {
      const { id, title, description, status, tags, comments } = req.body;
      await pool.query(
        `INSERT INTO to_do_staff_ideas (id, title, description, status, tags, comments) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, title, description || null, status || 'nova', JSON.stringify(tags || []), JSON.stringify(comments || [])]
      );
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.put("/api/todo-staff/ideas/:id", async (req, res) => {
    try {
      const { title, description, status, tags, comments } = req.body;
      await pool.query(
        `UPDATE to_do_staff_ideas SET title=$1, description=$2, status=$3, tags=$4, comments=$5 WHERE id=$6`,
        [title, description || null, status, JSON.stringify(tags || []), JSON.stringify(comments || []), req.params.id]
      );
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.delete("/api/todo-staff/ideas/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM to_do_staff_ideas WHERE id=$1", [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Hiring / Contratação API ────────────────────────────────────────────────

  // GET all folders
  app.get("/api/hiring/folders", async (_req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM hiring_folders ORDER BY created_at DESC");
      res.json(rows);
    } catch (err: any) {
      console.error("[hiring] GET folders error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST create folder
  app.post("/api/hiring/folders", async (req, res) => {
    try {
      const { nome, cargo, cols } = req.body;
      const { rows } = await pool.query(
        "INSERT INTO hiring_folders (nome, cargo, cols) VALUES ($1, $2, $3) RETURNING *",
        [nome, cargo || null, JSON.stringify(cols || [])]
      );
      res.json(rows[0]);
    } catch (err: any) {
      console.error("[hiring] POST folder error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT update folder
  app.put("/api/hiring/folders/:id", async (req, res) => {
    try {
      const { nome, cargo, cols, form_fields } = req.body;
      const { rows } = await pool.query(
        "UPDATE hiring_folders SET nome = $1, cargo = $2, cols = $3, form_fields = $4 WHERE id = $5 RETURNING *",
        [nome, cargo || null, JSON.stringify(cols || []), form_fields !== undefined ? JSON.stringify(form_fields) : null, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Folder not found" });
      res.json(rows[0]);
    } catch (err: any) {
      console.error("[hiring] PUT folder error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE folder (cascade deletes candidates)
  app.delete("/api/hiring/folders/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM hiring_folders WHERE id = $1", [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[hiring] DELETE folder error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET candidates for a folder
  app.get("/api/hiring/candidates", async (req, res) => {
    try {
      const folderId = req.query.folder_id;
      if (!folderId) return res.status(400).json({ error: "folder_id required" });
      const { rows } = await pool.query(
        "SELECT * FROM hiring_candidates WHERE folder_id = $1 ORDER BY created_at ASC",
        [folderId]
      );
      res.json(rows);
    } catch (err: any) {
      console.error("[hiring] GET candidates error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST create candidate
  app.post("/api/hiring/candidates", async (req, res) => {
    try {
      const { folder_id, nome, contato, acao, data_acao, col } = req.body;
      const { rows } = await pool.query(
        "INSERT INTO hiring_candidates (folder_id, nome, contato, acao, data_acao, col, form_data) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [folder_id, nome, contato || null, acao || null, data_acao || null, col, req.body.form_data || '{}']
      );
      res.json(rows[0]);
    } catch (err: any) {
      console.error("[hiring] POST candidate error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Public candidate application routes (no auth required)
  app.get("/api/hiring/public/folders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query("SELECT id, nome, cargo, cols, form_fields FROM hiring_folders WHERE id = $1", [id]);
      if (rows.length === 0) return res.status(404).json({ error: "Vaga não encontrada" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/hiring/public/apply", async (req, res) => {
    try {
      const { folder_id, nome, contato, form_data } = req.body;
      // Get the default column for this folder (the first column)
      const folderRes = await pool.query("SELECT cols FROM hiring_folders WHERE id = $1", [folder_id]);
      if (folderRes.rows.length === 0) return res.status(404).json({ error: "Folder not found" });
      
      const cols = folderRes.rows[0].cols || [];
      const col = cols.length > 0 ? cols[0] : 'Inscritos'; // Default fallback

      const { rows } = await pool.query(
        "INSERT INTO hiring_candidates (folder_id, nome, contato, col, form_data) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [folder_id, nome, contato, col, form_data]
      );
      // Auto history entry
      await pool.query(
        "INSERT INTO hiring_candidate_history (candidate_id, action, details, user_name) VALUES ($1, $2, $3, $4)",
        [rows[0].id, 'Formulário preenchido', 'Candidato preencheu o formulário de inscrição da vaga.', nome]
      );
      res.json(rows[0]);
    } catch (err: any) {
      console.error("[hiring] POST public apply error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // PUT update candidate (also used for column moves via drag & drop)
  app.put("/api/hiring/candidates/:id", async (req, res) => {
    try {
      const { nome, contato, acao, data_acao, col } = req.body;
      const { rows } = await pool.query(
        "UPDATE hiring_candidates SET nome = COALESCE($1, nome), contato = COALESCE($2, contato), acao = $3, data_acao = $4, col = COALESCE($5, col) WHERE id = $6 RETURNING *",
        [nome, contato, acao !== undefined ? acao : null, data_acao !== undefined ? data_acao : null, col, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Candidate not found" });
      res.json(rows[0]);
    } catch (err: any) {
      console.error("[hiring] PUT candidate error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE candidate
  app.delete("/api/hiring/candidates/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM hiring_candidates WHERE id = $1", [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[hiring] DELETE candidate error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Saboteur Results ────────────────────────────────────────────────────────

  app.get("/api/hiring/candidates/:id/saboteurs", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT saboteur_key, score FROM hiring_saboteur_results WHERE candidate_id = $1 ORDER BY saboteur_key",
        [req.params.id]
      );
      res.json(rows);
    } catch (err: any) {
      console.error("[hiring] GET saboteurs error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/hiring/candidates/:id/saboteurs", async (req, res) => {
    try {
      const { results } = req.body; // Array of { saboteur_key, score }
      if (!Array.isArray(results)) return res.status(400).json({ error: "results must be an array" });
      for (const r of results) {
        await pool.query(
          `INSERT INTO hiring_saboteur_results (candidate_id, saboteur_key, score)
           VALUES ($1, $2, $3)
           ON CONFLICT (candidate_id, saboteur_key)
           DO UPDATE SET score = $3, updated_at = NOW()`,
          [req.params.id, r.saboteur_key, r.score || 0]
        );
      }
      const { rows } = await pool.query(
        "SELECT saboteur_key, score FROM hiring_saboteur_results WHERE candidate_id = $1 ORDER BY saboteur_key",
        [req.params.id]
      );
      res.json(rows);
      // Auto history entry
      await pool.query(
        "INSERT INTO hiring_candidate_history (candidate_id, action, details, user_name) VALUES ($1, $2, $3, $4)",
        [req.params.id, 'Teste de Sabotadores concluído', 'Candidato completou a avaliação de Sabotadores (Inteligência Positiva).', 'Sistema']
      );
    } catch (err: any) {
      console.error("[hiring] PUT saboteurs error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── DISC Profile Results ──────────────────────────────────────────────────
  app.get("/api/hiring/candidates/:id/disc", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT d_score, i_score, s_score, c_score FROM hiring_disc_results WHERE candidate_id = $1",
        [req.params.id]
      );
      res.json(rows[0] || { d_score: 0, i_score: 0, s_score: 0, c_score: 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/hiring/candidates/:id/disc", async (req, res) => {
    try {
      const { d_score, i_score, s_score, c_score } = req.body;
      const { rows } = await pool.query(
        `INSERT INTO hiring_disc_results (candidate_id, d_score, i_score, s_score, c_score)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (candidate_id) DO UPDATE SET d_score=$2, i_score=$3, s_score=$4, c_score=$5, updated_at=NOW()
         RETURNING *`,
        [req.params.id, d_score || 0, i_score || 0, s_score || 0, c_score || 0]
      );
      // Auto history entry
      await pool.query(
        "INSERT INTO hiring_candidate_history (candidate_id, action, details, user_name) VALUES ($1, $2, $3, $4)",
        [req.params.id, 'Teste DISC concluído', 'Candidato completou a avaliação de Perfil Comportamental DISC.', 'Sistema']
      );
      res.json(rows[0]);
    } catch (err: any) {
      console.error("[hiring] PUT disc error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Hiring Documents CRUD ───────────────────────────────────────────────────
  app.get("/api/hiring/documents", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM hiring_documents ORDER BY updated_at DESC");
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/hiring/documents", async (req, res) => {
    try {
      const { title, content, created_by, section } = req.body;
      const { rows } = await pool.query(
        "INSERT INTO hiring_documents (title, content, created_by, section) VALUES ($1, $2, $3, $4) RETURNING *",
        [title || 'Sem título', content || '', created_by || 'Sistema', section || '']
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/hiring/documents/:id", async (req, res) => {
    try {
      const { title, content, section } = req.body;
      const { rows } = await pool.query(
        "UPDATE hiring_documents SET title = COALESCE($1, title), content = COALESCE($2, content), section = COALESCE($3, section), updated_at = NOW() WHERE id = $4 RETURNING *",
        [title, content, section, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Document not found" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/hiring/documents/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM hiring_documents WHERE id = $1", [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Hiring Contracts CRUD ─────────────────────────────────────────────────

  app.get("/api/hiring/contracts", async (_req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT id, name, description, file_name, file_type, file_size, uploaded_by, updated_at, created_at FROM hiring_contracts ORDER BY created_at DESC"
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/hiring/contracts", express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { name, description, file_name, file_data, file_type, file_size, uploaded_by } = req.body;
      if (!file_data || !file_name) return res.status(400).json({ error: "file_data and file_name are required" });
      const { rows } = await pool.query(
        "INSERT INTO hiring_contracts (name, description, file_name, file_data, file_type, file_size, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, description, file_name, file_type, file_size, uploaded_by, updated_at, created_at",
        [name || file_name, description || '', file_name, file_data, file_type || 'application/octet-stream', file_size || 0, uploaded_by || 'Sistema']
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/hiring/contracts/:id/download", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT file_name, file_data, file_type FROM hiring_contracts WHERE id = $1", [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: "Contract not found" });
      const { file_name, file_data, file_type } = rows[0];
      const buffer = Buffer.from(file_data, 'base64');
      res.setHeader('Content-Type', file_type);
      res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/hiring/contracts/:id", async (req, res) => {
    try {
      const { name, description } = req.body;
      const { rows } = await pool.query(
        "UPDATE hiring_contracts SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = NOW() WHERE id = $3 RETURNING id, name, description, file_name, file_type, file_size, uploaded_by, updated_at, created_at",
        [name, description, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Contract not found" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/hiring/contracts/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM hiring_contracts WHERE id = $1", [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Hiring Candidate Notes ──────────────────────────────────────────────────

  app.get("/api/hiring/candidates/:id/notes", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM hiring_candidate_notes WHERE candidate_id = $1 ORDER BY created_at DESC",
        [req.params.id]
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/hiring/candidates/:id/notes", async (req, res) => {
    try {
      const { content, user_name } = req.body;
      const { rows } = await pool.query(
        "INSERT INTO hiring_candidate_notes (candidate_id, content, user_name) VALUES ($1, $2, $3) RETURNING *",
        [req.params.id, content, user_name || 'Sistema']
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/hiring/candidates/notes/:noteId", async (req, res) => {
    try {
      await pool.query("DELETE FROM hiring_candidate_notes WHERE id = $1", [req.params.noteId]);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Hiring Candidate History ────────────────────────────────────────────────

  app.get("/api/hiring/candidates/:id/history", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM hiring_candidate_history WHERE candidate_id = $1 ORDER BY created_at DESC",
        [req.params.id]
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/hiring/candidates/:id/history", async (req, res) => {
    try {
      const { action, details, user_name } = req.body;
      const { rows } = await pool.query(
        "INSERT INTO hiring_candidate_history (candidate_id, action, details, user_name) VALUES ($1, $2, $3, $4) RETURNING *",
        [req.params.id, action, details, user_name || 'Sistema']
      );
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Collection Routes (Regua de Cobranca) ─────────────────────────────────
  setupCollectionRoutes(app, pool);

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

    // Sync inadimplentes ao iniciar e a cada 1 hora
    const syncInadimplentes = async () => {
      try {
        const entradaResult = await pool.query(`
          UPDATE clients c
          SET crm_status = 'inadimplente_asaas'
          FROM fin_people fp
          WHERE fp.grapehub_client_id = c.id
          AND EXISTS (
            SELECT 1 FROM fin_receivables r
            WHERE r.customer_id = fp.asaas_id
            AND r.status IN ('PENDING', 'OVERDUE')
            AND r.due_date IS NOT NULL
            AND (CURRENT_DATE - r.due_date) >= 6
          )
          AND (
            c.crm_status IS NULL
            OR c.crm_status NOT IN ('inadimplente_asaas', 'pedido_finalizacao', 'negociacao', 'aviso_30_dias', 'processo_saida', 'arquivado')
          )
          RETURNING c.id
        `);
        const saidaResult = await pool.query(`
          UPDATE clients c
          SET crm_status = NULL
          FROM fin_people fp
          WHERE fp.grapehub_client_id = c.id
          AND c.crm_status = 'inadimplente_asaas'
          AND NOT EXISTS (
            SELECT 1 FROM fin_receivables r
            WHERE r.customer_id = fp.asaas_id
            AND r.status IN ('PENDING', 'OVERDUE')
            AND r.due_date IS NOT NULL
            AND (CURRENT_DATE - r.due_date) >= 6
          )
          RETURNING c.id
        `);
        const added = entradaResult.rowCount || 0;
        const removed = saidaResult.rowCount || 0;
        if (added > 0 || removed > 0) {
          console.log(`[sync-inadimplentes] +${added} adicionados, -${removed} removidos`);
        }
      } catch (err) {
        console.error('[sync-inadimplentes] Erro ao sincronizar:', err);
      }
    };

    syncInadimplentes(); // executa imediatamente ao iniciar
    setInterval(syncInadimplentes, 60 * 60 * 1000); // repete a cada 1 hora
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
