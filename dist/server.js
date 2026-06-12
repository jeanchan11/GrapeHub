// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import https from "https";
import pg from "pg";
import dotenv from "dotenv";
import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import admin from "firebase-admin";

// src/routes/collection.ts
function setupCollectionRoutes(app, pool) {
  app.get("/api/fin/collection/rules", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT * FROM fin_collection_rules 
        ORDER BY day_offset ASC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("[fin_collection_rules] GET error:", err);
      res.status(500).json({ error: "Failed to fetch collection rules" });
    }
  });
  app.put("/api/fin/collection/rules/:id", async (req, res) => {
    const { id } = req.params;
    const { label, channels, message_template, is_active } = req.body;
    try {
      const result = await pool.query(`
        UPDATE fin_collection_rules 
        SET label = $1, channels = $2, message_template = $3, is_active = $4, updated_at = now()
        WHERE id = $5
        RETURNING *
      `, [label, channels, message_template, is_active, id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Rule not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("[fin_collection_rules] PUT error:", err);
      res.status(500).json({ error: "Failed to update rule" });
    }
  });
  app.patch("/api/fin/collection/rules/:id/toggle", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(`
        UPDATE fin_collection_rules 
        SET is_active = NOT is_active, updated_at = now()
        WHERE id = $1
        RETURNING *
      `, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Rule not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("[fin_collection_rules] PATCH toggle error:", err);
      res.status(500).json({ error: "Failed to toggle rule" });
    }
  });
  app.get("/api/fin/collection/events/stats", async (req, res) => {
    try {
      const month = req.query.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const [year, mon] = month.split("-").map(Number);
      const startDate = `${year}-${String(mon).padStart(2, "0")}-01`;
      const endDate = mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, "0")}-01`;
      const result = await pool.query(`
        SELECT
          (
            SELECT COUNT(*)
            FROM fin_collection_events fce
            JOIN fin_receivables fr ON fr.asaas_id = fce.receivable_asaas_id
            WHERE DATE(fce.triggered_at) = CURRENT_DATE
              AND fce.status = 'sent'
              AND fr.due_date >= $1::date AND fr.due_date < $2::date
          ) as hoje,
          (
            SELECT COUNT(*)
            FROM fin_collection_events fce
            JOIN fin_receivables fr ON fr.asaas_id = fce.receivable_asaas_id
            WHERE fce.triggered_at >= CURRENT_DATE - interval '7 days'
              AND fce.status = 'sent'
              AND fr.due_date >= $1::date AND fr.due_date < $2::date
          ) as ultimos7dias,
          (
            SELECT COUNT(*)
            FROM fin_receivables
            WHERE status IN ('PENDING', 'OVERDUE')
              AND due_date IS NOT NULL
              AND due_date >= $1::date AND due_date < $2::date
          ) as agendados
      `, [startDate, endDate]);
      const row = result.rows[0] || { hoje: 0, ultimos7dias: 0, agendados: 0 };
      res.json({
        hoje: parseInt(row.hoje || "0", 10),
        ultimos7dias: parseInt(row.ultimos7dias || "0", 10),
        agendados: parseInt(row.agendados || "0", 10)
      });
    } catch (err) {
      console.error("[fin_collection_events] Stats GET error:", err);
      res.status(500).json({ error: "Failed to get queue stats" });
    }
  });
  app.get("/api/fin/collection/events/queue", async (req, res) => {
    try {
      const fetchAll = req.query.all === "true";
      const month = req.query.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const [year, mon] = month.split("-").map(Number);
      const startDate = `${year}-${String(mon).padStart(2, "0")}-01`;
      const endDate = mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, "0")}-01`;
      const dateFilter = fetchAll ? "" : `AND fr.due_date >= $1::date AND fr.due_date < $2::date`;
      const pendingDateFilter = fetchAll ? "" : `AND r.due_date >= $1::date AND r.due_date < $2::date`;
      const params = fetchAll ? [] : [startDate, endDate];
      const result = await pool.query(`
        WITH sent_events AS (
          SELECT 
            fp.name as client_name,
            COALESCE(NULLIF(c.phone, ''), fp.phone) as client_phone,
            fr.value,
            fr.due_date,
            fcr.label as rule_label,
            fcr.day_offset,
            fce.channel,
            DATE(fce.triggered_at) as scheduled_date,
            fce.status,
            fce.triggered_at,
            fce.receivable_asaas_id,
            fce.customer_asaas_id,
            fce.rule_id,
            fcr.message_template,
            fce.id as event_id,
            fr.invoice_url,
            'event' as row_type
          FROM fin_collection_events fce
          JOIN fin_collection_rules fcr ON fcr.id = fce.rule_id
          JOIN fin_receivables fr ON fr.asaas_id = fce.receivable_asaas_id
          JOIN fin_people fp ON fp.asaas_id = fce.customer_asaas_id
          LEFT JOIN clients c ON c.id = fp.grapehub_client_id
          WHERE 1=1 AND COALESCE(fr.billing_type, '') != 'CREDIT_CARD'
            AND (c.crm_status IS NULL OR c.crm_status = '')
            ${dateFilter}
        ),
        pending_receivables AS (
          SELECT
            COALESCE(p.name, r.customer_name, 'Desconhecido') as client_name,
            COALESCE(NULLIF(c.phone, ''), p.phone) as client_phone,
            r.value,
            r.due_date,
            r.asaas_id as receivable_asaas_id,
            r.customer_id as customer_asaas_id,
            r.invoice_url,
            (CURRENT_DATE - r.due_date) as current_day_offset
          FROM fin_receivables r
          LEFT JOIN fin_people p ON p.asaas_id = r.customer_id
          LEFT JOIN clients c ON c.id = p.grapehub_client_id
          WHERE r.status IN ('PENDING', 'OVERDUE')
            AND r.due_date IS NOT NULL
            AND COALESCE(r.billing_type, '') != 'CREDIT_CARD'
            AND (c.crm_status IS NULL OR c.crm_status = '')
            ${pendingDateFilter}
        ),
        matched AS (
          SELECT
            pr.*,
            COALESCE(
              (SELECT id FROM fin_collection_rules WHERE day_offset = pr.current_day_offset AND is_active = true LIMIT 1),
              (SELECT id FROM fin_collection_rules WHERE day_offset <= pr.current_day_offset AND is_active = true ORDER BY day_offset DESC LIMIT 1),
              (SELECT id FROM fin_collection_rules WHERE day_offset > pr.current_day_offset AND is_active = true ORDER BY day_offset ASC LIMIT 1)
            ) as best_rule_id
          FROM pending_receivables pr
        )
        SELECT * FROM sent_events

        UNION ALL

        SELECT
          m.client_name,
          m.client_phone,
          m.value,
          m.due_date,
          fcr.label as rule_label,
          fcr.day_offset,
          'whatsapp' as channel,
          (m.due_date + fcr.day_offset * interval '1 day')::date as scheduled_date,
          CASE 
            WHEN m.current_day_offset >= fcr.day_offset THEN 'manual'
            ELSE 'pending'
          END as status,
          NULL::timestamptz as triggered_at,
          m.receivable_asaas_id,
          m.customer_asaas_id,
          fcr.id as rule_id,
          fcr.message_template,
          NULL::int as event_id,
          m.invoice_url,
          'pending' as row_type
        FROM matched m
        JOIN fin_collection_rules fcr ON fcr.id = m.best_rule_id
        WHERE NOT EXISTS (
          SELECT 1 FROM fin_collection_events e
          WHERE e.receivable_asaas_id = m.receivable_asaas_id
            AND e.rule_id = m.best_rule_id
            AND e.status = 'sent'
        )

        ORDER BY scheduled_date ASC, triggered_at DESC NULLS LAST
        LIMIT 200;
      `, params);
      res.json(result.rows);
    } catch (err) {
      console.error("[fin_collection_events] Queue GET error:", err);
      res.status(500).json({ error: "Failed to get collection queue" });
    }
  });
  app.get("/api/fin/collection/overdue-clients", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          COALESCE(fp.name, r.customer_name, 'Desconhecido') as customer_name,
          COALESCE(NULLIF(c.phone, ''), NULLIF(fp.phone, ''), '') as customer_phone,
          r.value as amount,
          r.due_date,
          r.asaas_id as receivable_asaas_id,
          r.customer_id as customer_asaas_id,
          r.invoice_url,
          (CURRENT_DATE - r.due_date) as days_past,
          CASE
            WHEN (CURRENT_DATE - r.due_date) >= 15 THEN 'suspensao'
            ELSE 'humano'
          END as stage
        FROM fin_receivables r
        LEFT JOIN fin_people fp ON fp.asaas_id = r.customer_id
        LEFT JOIN clients c ON c.id = fp.grapehub_client_id
        WHERE r.status IN ('PENDING', 'OVERDUE')
          AND r.due_date IS NOT NULL
          AND COALESCE(r.billing_type, '') != 'CREDIT_CARD'
          AND (CURRENT_DATE - r.due_date) >= 10
        ORDER BY r.due_date ASC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("[fin_collection] Overdue clients GET error:", err);
      res.status(500).json({ error: "Failed to get overdue clients" });
    }
  });
  app.get("/api/fin/collection/events/:customerAsaasId", async (req, res) => {
    const { customerAsaasId } = req.params;
    try {
      const result = await pool.query(`
        SELECT e.*, r.label, r.phase 
        FROM fin_collection_events e
        LEFT JOIN fin_collection_rules r ON e.rule_id = r.id
        WHERE e.customer_asaas_id = $1
        ORDER BY e.triggered_at DESC
      `, [customerAsaasId]);
      res.json(result.rows);
    } catch (err) {
      console.error("[fin_collection_events] GET error:", err);
      res.status(500).json({ error: "Failed to fetch collection events" });
    }
  });
  app.post("/api/fin/collection/events", async (req, res) => {
    const { rule_id, receivable_asaas_id, customer_asaas_id, channel, status, note } = req.body;
    try {
      const result = await pool.query(`
        INSERT INTO fin_collection_events 
        (rule_id, receivable_asaas_id, customer_asaas_id, channel, status, note)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [rule_id, receivable_asaas_id, customer_asaas_id, channel, status, note]);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("[fin_collection_events] POST error:", err);
      res.status(500).json({ error: "Failed to create event" });
    }
  });
  app.post("/api/fin/collection/webhook/n8n", async (req, res) => {
    const { rule_id, receivable_asaas_id, customer_asaas_id, channel, status, note } = req.body;
    try {
      await pool.query(`
        INSERT INTO fin_collection_events 
        (rule_id, receivable_asaas_id, customer_asaas_id, channel, status, note)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [rule_id, receivable_asaas_id, customer_asaas_id, channel, status, note]);
      res.json({ ok: true });
    } catch (err) {
      console.error("[fin_collection_events] Webhook error:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
  app.post("/api/fin/collection/events/mark-sent", async (req, res) => {
    const { rule_id, receivable_asaas_id, customer_asaas_id, event_id, client_name, value, due_date, rule_label, message } = req.body;
    try {
      if (event_id) {
        await pool.query(
          `UPDATE fin_collection_events SET status = 'sent', triggered_at = NOW() WHERE id = $1`,
          [event_id]
        );
      } else {
        await pool.query(`
          INSERT INTO fin_collection_events 
          (rule_id, receivable_asaas_id, customer_asaas_id, channel, status, triggered_at)
          VALUES ($1, $2, $3, 'whatsapp', 'sent', NOW())
        `, [rule_id || null, receivable_asaas_id, customer_asaas_id]);
      }
      const commentContent = `Mensagem de cobran\xE7a enviada:
${message || rule_label || "Cobran\xE7a manual"}`;
      const clientRes = await pool.query(
        `SELECT grapehub_client_id FROM fin_people WHERE asaas_id = $1 AND grapehub_client_id IS NOT NULL LIMIT 1`,
        [customer_asaas_id]
      );
      if (clientRes.rows.length > 0 && clientRes.rows[0].grapehub_client_id) {
        const clientId = clientRes.rows[0].grapehub_client_id;
        await pool.query(`
          INSERT INTO crm_comments (client_id, user_id, type, content, created_at, user_picture)
          VALUES ($1, 'sistema', 'cobranca', $2, NOW(), 
            'data:image/svg+xml,' || encode(('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%2322c55e"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="18" font-weight="bold">\u2713</text></svg>')::bytea, 'escape'))
        `, [clientId, commentContent]);
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[fin_collection_events] Manual send error:", err);
      res.status(500).json({ error: "Failed to mark as sent" });
    }
  });
  app.get("/api/fin/collection/summary", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(CASE WHEN (CURRENT_DATE - r.due_date) BETWEEN -5 AND -1 THEN 1 END) as preventivo,
          COUNT(CASE WHEN (CURRENT_DATE - r.due_date) = 0  THEN 1 END) as vencimento,
          COUNT(CASE WHEN (CURRENT_DATE - r.due_date) BETWEEN 1 AND 9 THEN 1 END) as reativo,
          COUNT(CASE WHEN (CURRENT_DATE - r.due_date) BETWEEN 10 AND 14 THEN 1 END) as humano,
          COUNT(CASE WHEN (CURRENT_DATE - r.due_date) >= 15 THEN 1 END) as suspensao
        FROM fin_receivables r
        LEFT JOIN fin_people fp ON fp.asaas_id = r.customer_id
        LEFT JOIN clients c ON c.id = fp.grapehub_client_id
        WHERE r.status IN ('PENDING', 'OVERDUE')
          AND r.due_date IS NOT NULL
          AND COALESCE(r.billing_type, '') != 'CREDIT_CARD'
          AND (c.crm_status IS NULL OR c.crm_status = '')
      `);
      const row = result.rows[0] || { preventivo: 0, vencimento: 0, reativo: 0, humano: 0, suspensao: 0 };
      res.json({
        preventivo: parseInt(row.preventivo || "0", 10),
        vencimento: parseInt(row.vencimento || "0", 10),
        reativo: parseInt(row.reativo || "0", 10),
        humano: parseInt(row.humano || "0", 10),
        suspensao: parseInt(row.suspensao || "0", 10)
      });
    } catch (err) {
      console.error("[fin_collection] Summary GET error:", err);
      res.status(500).json({ error: "Failed to generate summary" });
    }
  });
  app.get("/api/fin/collection/summary/:phase", async (req, res) => {
    const { phase } = req.params;
    const conditions = {
      preventivo: "(CURRENT_DATE - r.due_date) BETWEEN -5 AND -1",
      vencimento: "(CURRENT_DATE - r.due_date) = 0",
      reativo: "(CURRENT_DATE - r.due_date) BETWEEN 1 AND 9",
      humano: "(CURRENT_DATE - r.due_date) BETWEEN 10 AND 14",
      suspensao: "(CURRENT_DATE - r.due_date) >= 15"
    };
    const where = conditions[phase];
    if (!where) return res.status(400).json({ error: "Invalid phase" });
    try {
      const result = await pool.query(`
        SELECT 
          COALESCE(p.name, r.customer_name, 'Desconhecido') as customer_name,
          r.value,
          r.due_date,
          r.status,
          (CURRENT_DATE - r.due_date) as days_offset
        FROM fin_receivables r
        LEFT JOIN fin_people p ON p.asaas_id = r.customer_id
        LEFT JOIN clients c ON c.id = p.grapehub_client_id
        WHERE r.status IN ('PENDING', 'OVERDUE')
          AND r.due_date IS NOT NULL
          AND COALESCE(r.billing_type, '') != 'CREDIT_CARD'
          AND (c.crm_status IS NULL OR c.crm_status = '')
          AND ${where}
        ORDER BY r.due_date ASC
        LIMIT 100
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("[fin_collection] Summary detail GET error:", err);
      res.status(500).json({ error: "Failed to get phase details" });
    }
  });
}

// src/routes/dispatch.ts
var schedulerTimer = null;
var isBatchRunning = false;
function nowBRT() {
  return new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}
function todayBRT() {
  const d = nowBRT();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function renderMessage(template, item) {
  const hora = nowBRT().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const valor = item.amount != null ? Number(item.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
  const dueDateStr = item.due_date instanceof Date ? item.due_date.toISOString().slice(0, 10) : String(item.due_date || "").slice(0, 10);
  const vencimento = dueDateStr ? (/* @__PURE__ */ new Date(dueDateStr + "T12:00:00")).toLocaleDateString("pt-BR") : "";
  return template.replace(/\\n/g, "\n").replace(/{{saudacao}}/gi, saudacao).replace(/{{nome}}/gi, item.customer_name || "").replace(/{{valor}}/gi, valor).replace(/{{vencimento}}/gi, vencimento).replace(/{{link}}/gi, item.invoice_url || "").replace(/{{telefone}}/gi, item.customer_phone || "");
}
async function saveDispatchComment(pool, item, mensagem) {
  try {
    if (!item.grapehub_client_id) return;
    await pool.query(
      `INSERT INTO crm_comments (client_id, user_id, type, content, images)
       VALUES ($1, 'sistema', 'COBRAN\xC7A', $2, '{}')`,
      [item.grapehub_client_id, `Mensagem de cobran\xE7a enviada:
${mensagem}`]
    );
  } catch (e) {
    console.warn("[dispatch] Falha ao salvar coment\xE1rio no hist\xF3rico:", e);
  }
}
async function sendViaN8n(webhookUrl, payload) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 3e4);
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    clearTimeout(timeout);
    return await res.json().catch(() => ({ success: true }));
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(err?.message || "Timeout or network error");
  }
}
async function runDailyBatchIfNeeded(pool) {
  if (isBatchRunning) return;
  const cfgRes = await pool.query("SELECT * FROM fin_dispatch_config LIMIT 1");
  const cfg = cfgRes.rows[0];
  if (!cfg || !cfg.dispatch_enabled) return;
  if (!cfg.n8n_webhook_url) return;
  const today = todayBRT();
  const lastBatch = cfg.last_batch_date ? String(cfg.last_batch_date).slice(0, 10) : null;
  if (lastBatch === today) {
    return;
  }
  const now = nowBRT();
  const [dispH, dispM] = String(cfg.dispatch_time).slice(0, 5).split(":").map(Number);
  const dispatchMinutes = dispH * 60 + dispM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < dispatchMinutes) {
    return;
  }
  const lockRes = await pool.query(
    `UPDATE fin_dispatch_config SET last_batch_date = $1, updated_at = NOW() WHERE last_batch_date IS DISTINCT FROM $1 RETURNING *`,
    [today]
  );
  if (lockRes.rowCount === 0) {
    console.log(`[dispatch-scheduler] Batch j\xE1 reivindicado por outro processo \u2014 ignorando.`);
    return;
  }
  isBatchRunning = true;
  console.log(`[dispatch-scheduler] Lock adquirido \u2014 iniciando batch di\xE1rio para ${today}`);
  try {
    await pool.query(`
      UPDATE fin_dispatch_queue dq
      SET scheduled_date = dq.due_date::date + dq.day_offset, updated_at = NOW()
      WHERE dq.status = 'AGENDADO'
        AND dq.due_date IS NOT NULL
        AND dq.scheduled_date != dq.due_date::date + dq.day_offset
    `);
    await pool.query(`
      UPDATE fin_dispatch_queue dq
      SET channel = CASE WHEN UPPER(COALESCE(c.billing_method,'')) IN ('E-MAIL','EMAIL') THEN 'EMAIL' ELSE 'WHATSAPP' END,
          customer_phone = COALESCE(NULLIF(c.billing_phone,''), NULLIF(c.phone,''), NULLIF(fp.phone,''), dq.customer_phone),
          updated_at = NOW()
      FROM fin_people fp
      JOIN clients c ON c.id = fp.grapehub_client_id
      WHERE dq.status = 'AGENDADO'
        AND fp.asaas_id = dq.customer_asaas_id
        AND (
          dq.channel != CASE WHEN UPPER(COALESCE(c.billing_method,'')) IN ('E-MAIL','EMAIL') THEN 'EMAIL' ELSE 'WHATSAPP' END
          OR dq.customer_phone != COALESCE(NULLIF(c.billing_phone,''), NULLIF(c.phone,''), NULLIF(fp.phone,''), dq.customer_phone)
        )
    `);
    await pool.query(`
      UPDATE fin_dispatch_queue dq
      SET status = 'CANCELADO', updated_at = NOW()
      WHERE dq.status = 'AGENDADO'
        AND EXISTS (
          SELECT 1 FROM fin_people fp
          JOIN clients c ON c.id = fp.grapehub_client_id
          WHERE fp.asaas_id = dq.customer_asaas_id
            AND c.crm_status IS NOT NULL AND c.crm_status != ''
        )
    `);
    await pool.query(`
      UPDATE fin_dispatch_queue dq
      SET status = 'CANCELADO', updated_at = NOW()
      WHERE dq.status = 'AGENDADO'
        AND EXISTS (
          SELECT 1 FROM fin_receivables fr
          WHERE fr.asaas_id = dq.receivable_asaas_id
            AND fr.status IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
        )
    `);
    await pool.query(`
      DELETE FROM fin_dispatch_queue
      WHERE status = 'AGENDADO'
        AND scheduled_date > CURRENT_DATE + INTERVAL '15 days'
    `);
    await pool.query(`
      UPDATE fin_dispatch_queue dq
      SET status = 'CANCELADO', updated_at = NOW()
      WHERE dq.status = 'AGENDADO'
        AND dq.day_offset < 10
        AND EXISTS (
          SELECT 1 FROM fin_receivables fr
          WHERE fr.asaas_id = dq.receivable_asaas_id
            AND fr.billing_type = 'CREDIT_CARD'
        )
    `);
    const populated = await pool.query(`
      INSERT INTO fin_dispatch_queue (
        customer_name, customer_phone, amount, due_date, day_offset,
        rule_triggered, channel, message_template, message_rendered,
        scheduled_date, receivable_asaas_id, customer_asaas_id, invoice_url
      )
      SELECT DISTINCT ON (fr.customer_id, fcr.day_offset)
        COALESCE(fp.name, fr.customer_name, 'Desconhecido'),
        COALESCE(NULLIF(c.billing_phone,''), NULLIF(c.phone,''), NULLIF(fp.phone,''), ''),
        fr.value, fr.due_date, fcr.day_offset, fcr.label,
        CASE WHEN UPPER(COALESCE(c.billing_method,'')) IN ('E-MAIL','EMAIL') THEN 'EMAIL' ELSE 'WHATSAPP' END,
        fcr.message_template, fcr.message_template,
        fr.due_date::date + fcr.day_offset,
        fr.asaas_id, fr.customer_id, fr.invoice_url
      FROM fin_receivables fr
      JOIN fin_collection_rules fcr ON fcr.is_active = true
      LEFT JOIN fin_people fp ON fp.asaas_id = fr.customer_id
      LEFT JOIN clients c ON c.id = fp.grapehub_client_id
      WHERE fr.status IN ('PENDING','OVERDUE')
        AND fr.due_date IS NOT NULL
        -- S\xF3 insere dentro da janela de 15 dias
        AND fr.due_date::date + fcr.day_offset >= CURRENT_DATE
        AND fr.due_date::date + fcr.day_offset <= CURRENT_DATE + INTERVAL '15 days'
        -- Cart\xE3o de cr\xE9dito s\xF3 entra a partir do Contato Humano
        AND NOT (fr.billing_type = 'CREDIT_CARD' AND fcr.day_offset < 10)
        AND NOT (c.crm_status IS NOT NULL AND c.crm_status != '')
        -- Evita duplicar: 1 disparo por CLIENTE por regra (n\xE3o por fatura)
        AND NOT EXISTS (
          SELECT 1 FROM fin_dispatch_queue dq
          WHERE dq.customer_asaas_id = fr.customer_id
            AND dq.day_offset = fcr.day_offset
            AND dq.status NOT IN ('CANCELADO','ERRO')
        )
      ORDER BY fr.customer_id, fcr.day_offset, fr.due_date ASC
      LIMIT 500
      ON CONFLICT DO NOTHING
    `);
    console.log(`[dispatch-scheduler] Auto-populate: ${populated.rowCount} item(s) inserido(s)`);
    const qRes = await pool.query(
      `SELECT DISTINCT ON (customer_asaas_id) *
       FROM fin_dispatch_queue
       WHERE status = 'AGENDADO' AND scheduled_date <= $1
       ORDER BY customer_asaas_id, scheduled_date ASC, created_at ASC`,
      [today]
    );
    const items = qRes.rows;
    console.log(`[dispatch-scheduler] ${items.length} item(s) a enviar (1 por cliente/dia)`);
    if (items.length > 0) {
      const sentIds = items.map((i) => i.id);
      await pool.query(
        `UPDATE fin_dispatch_queue
         SET scheduled_date = CURRENT_DATE + 1, updated_at = NOW()
         WHERE status = 'AGENDADO'
           AND scheduled_date <= $1
           AND id != ALL($2::uuid[])`,
        [today, sentIds]
      );
    }
    const intervalMs = (cfg.dispatch_interval_seconds || 60) * 1e3;
    for (const item of items) {
      const claim = await pool.query(
        `UPDATE fin_dispatch_queue SET status = 'ENVIANDO', updated_at = NOW() WHERE id = $1 AND status = 'AGENDADO' RETURNING id`,
        [item.id]
      );
      if (claim.rowCount === 0) {
        console.log(`[dispatch-scheduler] Item ${item.id} j\xE1 foi reivindicado por outro processo \u2014 pulando.`);
        continue;
      }
      try {
        const freshData = await pool.query(`
          SELECT
            COALESCE(NULLIF(c.billing_phone,''), NULLIF(c.phone,''), NULLIF(fp.phone,''), dq.customer_phone) as phone,
            COALESCE(NULLIF(c.billing_method,''), 'Whatsapp') as canal,
            COALESCE(NULLIF(c.billing_email,''), NULLIF(c.email,''), '') as email
          FROM fin_dispatch_queue dq
          LEFT JOIN fin_people fp ON fp.asaas_id = dq.customer_asaas_id
          LEFT JOIN clients c ON c.id = fp.grapehub_client_id
          WHERE dq.id = $1
        `, [item.id]);
        const row = freshData.rows[0];
        const resolvedPhone = row?.phone || item.customer_phone || "";
        const resolvedCanal = row?.canal || "Whatsapp";
        const resolvedEmail = row?.email || "";
        if (resolvedPhone !== item.customer_phone) {
          await pool.query(`UPDATE fin_dispatch_queue SET customer_phone = $2 WHERE id = $1`, [item.id, resolvedPhone]);
          item.customer_phone = resolvedPhone;
        }
        const mensagem = renderMessage(item.message_template || "", item);
        await pool.query(`UPDATE fin_dispatch_queue SET message_rendered = $2 WHERE id = $1`, [item.id, mensagem]);
        const payload = {
          telefone: resolvedPhone,
          mensagem,
          nome: item.customer_name,
          email: resolvedEmail,
          metodo: resolvedCanal,
          dispatch_id: item.id
        };
        const resp = await sendViaN8n(cfg.n8n_webhook_url, payload);
        await pool.query(
          `UPDATE fin_dispatch_queue SET status = 'ENVIADO', sent_at = NOW(), updated_at = NOW(),
           n8n_ticket_id = $2, n8n_contato_id = $3, n8n_contato_novo = $4, n8n_ticket_novo = $5
           WHERE id = $1`,
          [item.id, resp?.ticket_id || null, resp?.contato_id || null, resp?.contato_novo ?? null, resp?.ticket_novo ?? null]
        );
        await saveDispatchComment(pool, item, mensagem);
        console.log(`[dispatch-scheduler] \u2705 Enviado: ${item.customer_name} (${item.id})`);
      } catch (err) {
        await pool.query(
          `UPDATE fin_dispatch_queue SET status = 'ERRO', error_message = $2, updated_at = NOW() WHERE id = $1`,
          [item.id, err?.message || "Erro desconhecido"]
        );
        console.warn(`[dispatch-scheduler] \u274C Erro: ${item.customer_name} \u2014 ${err?.message}`);
      }
      if (items.indexOf(item) < items.length - 1) {
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    }
    console.log(`[dispatch-scheduler] Batch conclu\xEDdo para ${today}`);
  } catch (e) {
    console.error("[dispatch-scheduler] Erro no batch:", e);
  } finally {
    isBatchRunning = false;
  }
}
function startScheduler(pool) {
  pool.query(`ALTER TABLE fin_dispatch_config ADD COLUMN IF NOT EXISTS last_batch_date DATE`).catch(() => {
  });
  const tick = async () => {
    try {
      await runDailyBatchIfNeeded(pool);
    } catch (e) {
      console.error("[dispatch-scheduler]", e);
    }
    schedulerTimer = setTimeout(tick, 5 * 6e4);
  };
  schedulerTimer = setTimeout(tick, 6e4);
  console.log("[dispatch-scheduler] started \u2014 verifica a cada 5 minutos");
}
function setupDispatchRoutes(app, pool) {
  startScheduler(pool);
  app.get("/api/finance/dispatch/config", async (_req, res) => {
    try {
      const r = await pool.query("SELECT * FROM fin_dispatch_config LIMIT 1");
      res.json(r.rows[0] || {});
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });
  app.put("/api/finance/dispatch/config", async (req, res) => {
    const { dispatch_enabled, dispatch_time, dispatch_interval_seconds, n8n_webhook_url } = req.body;
    try {
      const r = await pool.query(`
        UPDATE fin_dispatch_config
        SET dispatch_enabled = $1, dispatch_time = $2,
            dispatch_interval_seconds = $3, n8n_webhook_url = $4, updated_at = NOW()
        RETURNING *
      `, [dispatch_enabled, dispatch_time, dispatch_interval_seconds, n8n_webhook_url]);
      res.json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: "Failed to update config" });
    }
  });
  app.get("/api/finance/dispatch/queue", async (req, res) => {
    try {
      const { status, date, limit = "100", offset = "0" } = req.query;
      const conds = [];
      const params = [];
      if (status) {
        params.push(status);
        conds.push(`status = $${params.length}`);
      }
      if (date) {
        params.push(date);
        conds.push(`scheduled_date = $${params.length}`);
      }
      const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
      params.push(parseInt(limit), parseInt(offset));
      const r = await pool.query(
        `SELECT * FROM fin_dispatch_queue ${where} ORDER BY scheduled_date ASC, created_at ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      res.json(r.rows);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch queue" });
    }
  });
  app.get("/api/finance/dispatch/queue/stats", async (_req, res) => {
    try {
      const r = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM fin_dispatch_queue WHERE scheduled_date = CURRENT_DATE AND status IN ('ENVIADO','ENVIANDO')) as disparos_hoje,
          (SELECT COUNT(*) FROM fin_dispatch_queue WHERE status = 'ENVIADO' AND sent_at >= NOW() - interval '7 days') as concluidos_7_dias,
          (SELECT COUNT(*) FROM fin_dispatch_queue WHERE status = 'AGENDADO') as agendados_pendentes
      `);
      const row = r.rows[0];
      res.json({
        disparos_hoje: parseInt(row.disparos_hoje || "0"),
        concluidos_7_dias: parseInt(row.concluidos_7_dias || "0"),
        agendados_pendentes: parseInt(row.agendados_pendentes || "0")
      });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });
  app.post("/api/finance/dispatch/queue/:id/send", async (req, res) => {
    const { id } = req.params;
    try {
      const itemRes = await pool.query("SELECT * FROM fin_dispatch_queue WHERE id = $1", [id]);
      if (!itemRes.rows.length) return res.status(404).json({ error: "Item not found" });
      const item = itemRes.rows[0];
      if (["ENVIANDO", "ENVIADO"].includes(item.status)) {
        return res.status(409).json({ error: `Item j\xE1 est\xE1 com status ${item.status}` });
      }
      const cfgRes = await pool.query("SELECT * FROM fin_dispatch_config LIMIT 1");
      const cfg = cfgRes.rows[0];
      if (!cfg?.n8n_webhook_url) return res.status(400).json({ error: "Webhook n8n n\xE3o configurado" });
      await pool.query(`UPDATE fin_dispatch_queue SET status = 'ENVIANDO', updated_at = NOW() WHERE id = $1`, [id]);
      res.json({ ok: true, status: "ENVIANDO" });
      try {
        const freshData = await pool.query(`
          SELECT
            COALESCE(NULLIF(c.billing_phone,''), NULLIF(c.phone,''), NULLIF(fp.phone,''), dq.customer_phone) as phone,
            COALESCE(NULLIF(c.billing_method,''), 'Whatsapp') as canal,
            COALESCE(NULLIF(c.billing_email,''), NULLIF(c.email,''), '') as email
          FROM fin_dispatch_queue dq
          LEFT JOIN fin_people fp ON fp.asaas_id = dq.customer_asaas_id
          LEFT JOIN clients c ON c.id = fp.grapehub_client_id
          WHERE dq.id = $1
        `, [id]);
        const row = freshData.rows[0];
        const resolvedPhone = row?.phone || item.customer_phone || "";
        const resolvedCanal = row?.canal || "Whatsapp";
        const resolvedEmail = row?.email || "";
        if (resolvedPhone !== item.customer_phone) {
          await pool.query(`UPDATE fin_dispatch_queue SET customer_phone = $2 WHERE id = $1`, [id, resolvedPhone]);
        }
        const mensagem = renderMessage(item.message_template || "", item);
        await pool.query(`UPDATE fin_dispatch_queue SET message_rendered = $2 WHERE id = $1`, [id, mensagem]);
        const payload = { telefone: resolvedPhone, mensagem, nome: item.customer_name, email: resolvedEmail, metodo: resolvedCanal, dispatch_id: id };
        const resp = await sendViaN8n(cfg.n8n_webhook_url, payload);
        await pool.query(
          `UPDATE fin_dispatch_queue SET status = 'ENVIADO', sent_at = NOW(), updated_at = NOW(), n8n_ticket_id = $2, n8n_contato_id = $3, n8n_contato_novo = $4, n8n_ticket_novo = $5 WHERE id = $1`,
          [id, resp?.ticket_id || null, resp?.contato_id || null, resp?.contato_novo ?? null, resp?.ticket_novo ?? null]
        );
        await saveDispatchComment(pool, item, mensagem);
      } catch (err) {
        await pool.query(`UPDATE fin_dispatch_queue SET status = 'ERRO', error_message = $2, updated_at = NOW() WHERE id = $1`, [id, err?.message]);
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to send" });
    }
  });
  app.post("/api/finance/dispatch/queue/:id/mark-manual", async (req, res) => {
    const { id } = req.params;
    try {
      const itemRes = await pool.query("SELECT * FROM fin_dispatch_queue WHERE id = $1", [id]);
      if (!itemRes.rows.length) return res.status(404).json({ error: "Item not found" });
      const item = itemRes.rows[0];
      if (["ENVIANDO", "ENVIADO"].includes(item.status)) {
        return res.status(409).json({ error: `Item j\xE1 est\xE1 com status ${item.status}` });
      }
      const mensagem = renderMessage(item.message_template || "", item);
      await pool.query(
        `UPDATE fin_dispatch_queue 
         SET status = 'ENVIADO', sent_at = NOW(), updated_at = NOW(), n8n_ticket_id = 'MANUAL', message_rendered = $2 
         WHERE id = $1`,
        [id, mensagem]
      );
      await saveDispatchComment(pool, item, mensagem);
      res.json({ ok: true, status: "ENVIADO" });
    } catch (e) {
      console.error("[mark-manual error]", e);
      res.status(500).json({ error: "Failed to mark as manual" });
    }
  });
  app.post("/api/finance/dispatch/queue/:id/cancel", async (req, res) => {
    const { id } = req.params;
    try {
      const r = await pool.query(`UPDATE fin_dispatch_queue SET status = 'CANCELADO', updated_at = NOW() WHERE id = $1 AND status = 'AGENDADO' RETURNING *`, [id]);
      if (!r.rows.length) return res.status(409).json({ error: "S\xF3 \xE9 poss\xEDvel cancelar itens AGENDADOS" });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to cancel" });
    }
  });
  app.post("/api/finance/dispatch/queue/:id/reopen", async (req, res) => {
    const { id } = req.params;
    try {
      const r = await pool.query(`
        UPDATE fin_dispatch_queue
        SET status = 'AGENDADO',
            scheduled_date = CURRENT_DATE,
            sent_at = NULL,
            error_message = NULL,
            n8n_ticket_id = NULL,
            n8n_contato_id = NULL,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);
      if (!r.rows.length) return res.status(404).json({ error: "Item n\xE3o encontrado" });
      res.json({ ok: true, item: r.rows[0] });
    } catch (e) {
      res.status(500).json({ error: "Failed to reopen" });
    }
  });
  app.post("/api/finance/dispatch/queue/send-all", async (req, res) => {
    try {
      const cfgRes = await pool.query("SELECT * FROM fin_dispatch_config LIMIT 1");
      const cfg = cfgRes.rows[0];
      if (!cfg?.n8n_webhook_url) return res.status(400).json({ error: "Webhook n8n n\xE3o configurado" });
      const today = nowBRT().toISOString().split("T")[0];
      const qRes = await pool.query(
        `SELECT DISTINCT ON (customer_asaas_id) *
         FROM fin_dispatch_queue
         WHERE status = 'AGENDADO' AND scheduled_date <= $1
         ORDER BY customer_asaas_id, scheduled_date ASC, created_at ASC`,
        [today]
      );
      const items = qRes.rows;
      res.json({ ok: true, total: items.length });
      if (items.length > 0) {
        const sentIds = items.map((i) => i.id);
        await pool.query(
          `UPDATE fin_dispatch_queue
           SET scheduled_date = CURRENT_DATE + 1, updated_at = NOW()
           WHERE status = 'AGENDADO'
             AND scheduled_date <= $1
             AND id != ALL($2::uuid[])`,
          [today, sentIds]
        );
      }
      const intervalMs = (cfg.dispatch_interval_seconds || 60) * 1e3;
      for (const item of items) {
        await pool.query(`UPDATE fin_dispatch_queue SET status = 'ENVIANDO', updated_at = NOW() WHERE id = $1`, [item.id]);
        try {
          const freshData = await pool.query(`
            SELECT
              COALESCE(NULLIF(c.billing_phone,''), NULLIF(c.phone,''), NULLIF(fp.phone,''), dq.customer_phone) as phone,
              COALESCE(NULLIF(c.billing_method,''), 'Whatsapp') as canal,
              COALESCE(NULLIF(c.billing_email,''), NULLIF(c.email,''), '') as email
            FROM fin_dispatch_queue dq
            LEFT JOIN fin_people fp ON fp.asaas_id = dq.customer_asaas_id
            LEFT JOIN clients c ON c.id = fp.grapehub_client_id
            WHERE dq.id = $1
          `, [item.id]);
          const row = freshData.rows[0];
          const resolvedPhone = row?.phone || item.customer_phone || "";
          const resolvedCanal = row?.canal || "Whatsapp";
          const resolvedEmail = row?.email || "";
          if (resolvedPhone !== item.customer_phone) {
            await pool.query(`UPDATE fin_dispatch_queue SET customer_phone = $2 WHERE id = $1`, [item.id, resolvedPhone]);
          }
          const mensagem = renderMessage(item.message_template || "", item);
          await pool.query(`UPDATE fin_dispatch_queue SET message_rendered = $2 WHERE id = $1`, [item.id, mensagem]);
          const payload = { telefone: resolvedPhone, mensagem, nome: item.customer_name, email: resolvedEmail, metodo: resolvedCanal, dispatch_id: item.id };
          const resp = await sendViaN8n(cfg.n8n_webhook_url, payload);
          await pool.query(
            `UPDATE fin_dispatch_queue SET status = 'ENVIADO', sent_at = NOW(), updated_at = NOW(), n8n_ticket_id = $2, n8n_contato_id = $3, n8n_contato_novo = $4, n8n_ticket_novo = $5 WHERE id = $1`,
            [item.id, resp?.ticket_id || null, resp?.contato_id || null, resp?.contato_novo ?? null, resp?.ticket_novo ?? null]
          );
          await saveDispatchComment(pool, item, mensagem);
        } catch (err) {
          await pool.query(`UPDATE fin_dispatch_queue SET status = 'ERRO', error_message = $2, updated_at = NOW() WHERE id = $1`, [item.id, err?.message]);
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    } catch (e) {
      if (!res.headersSent) res.status(500).json({ error: "Failed to send-all" });
    }
  });
  app.post("/api/finance/dispatch/callback", async (req, res) => {
    console.log(`[dispatch-callback] Body recebido:`, JSON.stringify(req.body));
    console.log(`[dispatch-callback] Query recebida:`, JSON.stringify(req.query));
    const dispatch_id = req.body?.dispatch_id || req.query?.dispatch_id;
    const { ticket_id, contato_id, contato_novo, ticket_novo } = req.body || {};
    const raw = req.body?.success ?? req.query?.success;
    const isExplicitError = raw === false || raw === "false" || raw === 0 || raw === "0";
    const success = !isExplicitError;
    if (!dispatch_id) return res.status(400).json({ error: "dispatch_id required (body or query)" });
    if (String(dispatch_id).startsWith("test_")) {
      console.log(`[dispatch-callback] Test callback received \u2014 id=${dispatch_id} success=${success}`);
      return res.json({ ok: true, dispatch_id, success, _test: true });
    }
    const resolvedTicketId = ticket_id || "CALLBACK_OK";
    console.log(`[dispatch-callback] id=${dispatch_id} success=${success} ticket=${resolvedTicketId}`);
    try {
      if (success) {
        await pool.query(`
          UPDATE fin_dispatch_queue
          SET status = 'ENVIADO',
              sent_at = COALESCE(sent_at, NOW()),
              n8n_ticket_id = $2,
              n8n_contato_id = $3,
              n8n_contato_novo = $4,
              n8n_ticket_novo = $5,
              updated_at = NOW()
          WHERE id = $1
        `, [dispatch_id, resolvedTicketId, contato_id || null, contato_novo ?? null, ticket_novo ?? null]);
      } else {
        const errMsg = req.body?.error_message || req.body?.message || "Falha reportada pelo n8n";
        await pool.query(`
          UPDATE fin_dispatch_queue
          SET status = 'ERRO', error_message = $2, updated_at = NOW()
          WHERE id = $1
        `, [dispatch_id, errMsg]);
      }
      res.json({ ok: true, dispatch_id, success });
    } catch (e) {
      console.error("[dispatch-callback] Error:", e?.message);
      res.status(500).json({ error: "Callback failed" });
    }
  });
  app.post("/api/finance/dispatch/test-webhook", async (req, res) => {
    const { webhook_url, canal } = req.body;
    if (!webhook_url) return res.status(400).json({ success: false, error: "webhook_url \xE9 obrigat\xF3rio" });
    const isEmail = canal === "Email" || canal === "E-mail" || canal === "EMAIL";
    const testPayload = {
      telefone: isEmail ? "" : "5541996168921",
      mensagem: isEmail ? "\u{1F514} Teste GrapeHub \u2014 Esta \xE9 uma mensagem de teste de E-MAIL para validar a conectividade do webhook." : "\u{1F514} Teste GrapeHub \u2014 Esta \xE9 uma mensagem de teste de WHATSAPP para validar a conectividade do webhook.",
      nome: "Teste GrapeHub",
      email: isEmail ? "jeanchan@grapemidia.com" : "",
      metodo: isEmail ? "E-mail" : "Whatsapp",
      dispatch_id: "test_" + Date.now(),
      _test: true
    };
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15e3);
    try {
      const response = await fetch(webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
        signal: ctrl.signal
      });
      clearTimeout(timeout);
      const statusCode = response.status;
      let body = null;
      try {
        body = await response.json();
      } catch {
        try {
          body = await response.text();
        } catch {
        }
      }
      if (statusCode >= 200 && statusCode < 300) {
        res.json({ success: true, status_code: statusCode, response: body });
      } else {
        res.json({ success: false, status_code: statusCode, error: `Webhook retornou HTTP ${statusCode}`, response: body });
      }
    } catch (err) {
      clearTimeout(timeout);
      const message = err?.name === "AbortError" ? "Timeout \u2014 webhook n\xE3o respondeu em 15 segundos" : err?.message || "Erro de conex\xE3o";
      res.json({ success: false, error: message });
    }
  });
  app.post("/api/finance/dispatch/queue/populate", async (_req, res) => {
    try {
      const fix = await pool.query(`
        UPDATE fin_dispatch_queue dq
        SET scheduled_date = dq.due_date::date + dq.day_offset,
            updated_at = NOW()
        WHERE dq.status = 'AGENDADO'
          AND dq.due_date IS NOT NULL
          AND dq.scheduled_date != dq.due_date::date + dq.day_offset
      `);
      const fixChannel = await pool.query(`
        UPDATE fin_dispatch_queue dq
        SET channel = CASE WHEN UPPER(COALESCE(c.billing_method,'')) IN ('E-MAIL','EMAIL') THEN 'EMAIL' ELSE 'WHATSAPP' END,
            customer_phone = COALESCE(NULLIF(c.billing_phone,''), NULLIF(c.phone,''), NULLIF(fp.phone,''), dq.customer_phone),
            updated_at = NOW()
        FROM fin_people fp
        JOIN clients c ON c.id = fp.grapehub_client_id
        WHERE dq.status = 'AGENDADO'
          AND fp.asaas_id = dq.customer_asaas_id
          AND (
            dq.channel != CASE WHEN UPPER(COALESCE(c.billing_method,'')) IN ('E-MAIL','EMAIL') THEN 'EMAIL' ELSE 'WHATSAPP' END
            OR dq.customer_phone != COALESCE(NULLIF(c.billing_phone,''), NULLIF(c.phone,''), NULLIF(fp.phone,''), dq.customer_phone)
          )
      `);
      console.log(`[dispatch populate] Canal/telefone corrigido: ${fixChannel.rowCount} item(s)`);
      const asaasKey = process.env.ASAAS_API_KEY?.replace(/\\\$/g, "$");
      if (asaasKey) {
        const agendados = await pool.query(`
          SELECT DISTINCT receivable_asaas_id FROM fin_dispatch_queue
          WHERE status = 'AGENDADO' AND receivable_asaas_id IS NOT NULL
          LIMIT 100
        `);
        for (const row of agendados.rows) {
          try {
            const resp = await fetch(
              `https://api.asaas.com/v3/payments/${row.receivable_asaas_id}`,
              { headers: { "access_token": asaasKey } }
            );
            if (resp.ok) {
              const data = await resp.json();
              if (data?.status) {
                await pool.query(
                  `UPDATE fin_receivables SET status = $1 WHERE asaas_id = $2`,
                  [data.status, row.receivable_asaas_id]
                );
              }
            }
          } catch {
          }
        }
      }
      const cancel = await pool.query(`
        UPDATE fin_dispatch_queue dq
        SET status = 'CANCELADO', updated_at = NOW()
        WHERE dq.status = 'AGENDADO'
          AND EXISTS (
            SELECT 1
            FROM fin_people fp
            JOIN clients c ON c.id = fp.grapehub_client_id
            WHERE fp.asaas_id = dq.customer_asaas_id
              AND c.crm_status IS NOT NULL
              AND c.crm_status != ''
          )
      `);
      const cancelPaid = await pool.query(`
        UPDATE fin_dispatch_queue dq
        SET status = 'CANCELADO', updated_at = NOW()
        WHERE dq.status = 'AGENDADO'
          AND EXISTS (
            SELECT 1 FROM fin_receivables fr
            WHERE fr.asaas_id = dq.receivable_asaas_id
              AND fr.status IN ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')
          )
      `);
      await pool.query(`
        DELETE FROM fin_dispatch_queue
        WHERE status = 'AGENDADO'
          AND scheduled_date > CURRENT_DATE + INTERVAL '15 days'
      `);
      await pool.query(`
        UPDATE fin_dispatch_queue dq
        SET status = 'CANCELADO', updated_at = NOW()
        WHERE dq.status = 'AGENDADO'
          AND dq.day_offset < 10
          AND EXISTS (
            SELECT 1 FROM fin_receivables fr
            WHERE fr.asaas_id = dq.receivable_asaas_id
              AND fr.billing_type = 'CREDIT_CARD'
          )
      `);
      const r = await pool.query(`
        INSERT INTO fin_dispatch_queue (
          customer_name, customer_phone, amount, due_date,
          day_offset,
          rule_triggered, channel, message_template, message_rendered,
          scheduled_date, receivable_asaas_id, customer_asaas_id, invoice_url
        )
        SELECT DISTINCT ON (fr.customer_id, fcr.day_offset)
          COALESCE(fp.name, fr.customer_name, 'Desconhecido'),
          COALESCE(NULLIF(c.billing_phone,''), NULLIF(c.phone,''), NULLIF(fp.phone,''), ''),
          fr.value,
          fr.due_date,
          fcr.day_offset,
          fcr.label,
          CASE WHEN UPPER(COALESCE(c.billing_method,'')) IN ('E-MAIL','EMAIL') THEN 'EMAIL' ELSE 'WHATSAPP' END,
          fcr.message_template,
          fcr.message_template,
          -- Data correta: vencimento + offset da regra (D-5 = 5 dias antes, D+2 = 2 dias depois)
          fr.due_date::date + fcr.day_offset,
          fr.asaas_id,
          fr.customer_id,
          fr.invoice_url
        FROM fin_receivables fr
        -- Uma entrada por regra ativa
        JOIN fin_collection_rules fcr ON fcr.is_active = true
        LEFT JOIN fin_people fp ON fp.asaas_id = fr.customer_id
        LEFT JOIN clients c ON c.id = fp.grapehub_client_id
        WHERE fr.status IN ('PENDING','OVERDUE')
          AND fr.due_date IS NOT NULL
          -- S\xF3 popula regras cuja data de envio \xE9 hoje ou nos pr\xF3ximos 15 dias
          AND fr.due_date::date + fcr.day_offset >= CURRENT_DATE
          AND fr.due_date::date + fcr.day_offset <= CURRENT_DATE + INTERVAL '15 days'
          -- Exclui clientes que est\xE3o no CRM Financeiro (t\xEAm crm_status preenchido)
          AND NOT (
            c.crm_status IS NOT NULL AND c.crm_status != ''
          )
          -- Cart\xE3o de cr\xE9dito: s\xF3 entra a partir do Contato Humano (day_offset >= 10)
          AND NOT (
            fr.billing_type = 'CREDIT_CARD' AND fcr.day_offset < 10
          )
          -- Evita duplicar: 1 disparo por CLIENTE por regra (n\xE3o por fatura)
          AND NOT EXISTS (
            SELECT 1 FROM fin_dispatch_queue dq
            WHERE dq.customer_asaas_id = fr.customer_id
              AND dq.day_offset = fcr.day_offset
              AND dq.status NOT IN ('CANCELADO','ERRO')
          )
        ORDER BY fr.customer_id, fcr.day_offset, fr.due_date ASC
        LIMIT 500
        ON CONFLICT DO NOTHING
      `);
      res.json({ ok: true, inserted: r.rowCount, corrected: fix.rowCount, cancelled_crm: cancel.rowCount });
    } catch (e) {
      console.error("[dispatch populate]", e);
      res.status(500).json({ error: e?.message });
    }
  });
}

// server.ts
import rateLimit from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
console.log("-----------------------------------------");
console.log(`[BOOT] ${(/* @__PURE__ */ new Date()).toISOString()}: Node.js process starting...`);
console.log(`[BOOT] Current Directory: ${process.cwd()}`);
console.log(`[BOOT] Node Version: ${process.version}`);
console.log("-----------------------------------------");
process.on("uncaughtException", (err) => {
  console.error("[CRITICAL] Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("[CRITICAL] Unhandled Rejection at:", promise, "reason:", reason);
});
dotenv.config();
var FIREBASE_STORAGE_BUCKET = (process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || "").replace(/^gs:\/\//, "");
var FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "";
var firebaseAdminReady = false;
if (FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      }),
      storageBucket: FIREBASE_STORAGE_BUCKET || `${FIREBASE_PROJECT_ID}.appspot.com`
    });
    firebaseAdminReady = true;
    console.log("[BOOT] Firebase Admin SDK initialized (Storage dispon\xEDvel).");
  } catch (firebaseInitError) {
    console.warn("[BOOT] Firebase Admin SDK n\xE3o inicializado (Storage indispon\xEDvel):", firebaseInitError.message);
  }
} else {
  console.log("[BOOT] Firebase Admin SDK n\xE3o configurado \u2014 usando verifica\xE7\xE3o JWT p\xFAblica.");
}
var _cachedPublicKeys = {};
var _cacheExpiry = 0;
async function getFirebasePublicKeys() {
  if (Date.now() < _cacheExpiry && Object.keys(_cachedPublicKeys).length > 0) {
    return _cachedPublicKeys;
  }
  const res = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  const cc = res.headers.get("Cache-Control") || "";
  const maxAge = parseInt(cc.match(/max-age=(\d+)/)?.[1] || "3600", 10);
  _cachedPublicKeys = await res.json();
  _cacheExpiry = Date.now() + maxAge * 1e3;
  return _cachedPublicKeys;
}
var _verifiedTokens = /* @__PURE__ */ new Map();
var VERIFIED_TOKENS_MAX = 300;
function _tokenCacheKey(token) {
  return token.length > 40 ? token.slice(0, 20) + token.slice(-20) : token;
}
function getCachedVerifiedToken(token) {
  const key = _tokenCacheKey(token);
  const entry = _verifiedTokens.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _verifiedTokens.delete(key);
    return null;
  }
  return entry.payload;
}
function cacheVerifiedToken(token, payload) {
  if (_verifiedTokens.size >= VERIFIED_TOKENS_MAX) {
    const firstKey = _verifiedTokens.keys().next().value;
    if (firstKey) _verifiedTokens.delete(firstKey);
  }
  const expiresAt = payload.exp ? payload.exp * 1e3 - 6e4 : Date.now() + 55 * 6e4;
  _verifiedTokens.set(_tokenCacheKey(token), { payload, expiresAt });
}
async function verifyFirebaseToken(token) {
  const cached = getCachedVerifiedToken(token);
  if (cached) return cached;
  if (firebaseAdminReady) {
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      cacheVerifiedToken(token, decoded);
      return decoded;
    } catch (adminErr) {
      console.warn("[Auth] Firebase Admin verifyIdToken falhou, tentando verifica\xE7\xE3o manual:", adminErr.message);
    }
  }
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Token JWT inv\xE1lido");
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  const now = Math.floor(Date.now() / 1e3);
  const CLOCK_SKEW = 30;
  if (payload.exp < now - CLOCK_SKEW) throw new Error("Token expirado");
  if (payload.iat > now + 300 + CLOCK_SKEW) throw new Error("Token do futuro");
  if (payload.aud !== FIREBASE_PROJECT_ID) throw new Error("Audience inv\xE1lido");
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) throw new Error("Issuer inv\xE1lido");
  let keys = await getFirebasePublicKeys();
  let publicKey = keys[header.kid];
  if (!publicKey) {
    console.warn(`[Auth] kid "${header.kid}" n\xE3o encontrado no cache \u2014 for\xE7ando refresh das chaves p\xFAblicas...`);
    _cacheExpiry = 0;
    keys = await getFirebasePublicKeys();
    publicKey = keys[header.kid];
    if (!publicKey) {
      for (const delay of [3e3, 5e3]) {
        console.warn(`[Auth] kid "${header.kid}" ainda n\xE3o encontrado \u2014 aguardando ${delay / 1e3}s para propaga\xE7\xE3o do CDN...`);
        await new Promise((r) => setTimeout(r, delay));
        _cacheExpiry = 0;
        keys = await getFirebasePublicKeys();
        publicKey = keys[header.kid];
        if (publicKey) break;
      }
      if (!publicKey) throw new Error("Chave p\xFAblica n\xE3o encontrada para kid: " + header.kid);
    }
  }
  const signatureInput = parts[0] + "." + parts[1];
  const signature = Buffer.from(parts[2], "base64url");
  const verify = crypto.createVerify("RSA-SHA256");
  verify.update(signatureInput);
  const valid = verify.verify(publicKey, signature);
  if (!valid) throw new Error("Assinatura JWT inv\xE1lida");
  cacheVerifiedToken(token, payload);
  return payload;
}
var PUBLIC_ROUTES = [
  { pattern: /^\/api\/health$/ },
  { pattern: /^\/api\/nps\/submit$/, method: "POST" },
  { pattern: /^\/api\/crm-comercial\/webhook$/, method: "POST" },
  { pattern: /^\/api\/public\// },
  { pattern: /^\/api\/crm\/webhooks\/trigger\/whatsapp\// },
  { pattern: /^\/api\/api4com\/webhook$/, method: "POST" },
  { pattern: /^\/api\/hiring\/public\// },
  { pattern: /^\/api\/hiring\/candidates\/\d+\/saboteurs$/ },
  { pattern: /^\/api\/hiring\/candidates\/\d+\/disc$/ },
  { pattern: /^\/api\/onboarding\/submit$/, method: "POST" },
  { pattern: /^\/api\/finance\/dispatch\/callback$/, method: "POST" },
  { pattern: /^\/api\/briefings\/public\// }
];
function isPublicRoute(method, path2) {
  return PUBLIC_ROUTES.some((r) => {
    if (r.method && r.method !== method) return false;
    return r.pattern.test(path2);
  });
}
async function authenticateToken(req, res, next) {
  if (isPublicRoute(req.method, req.path) || !req.path.startsWith("/api/")) {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autentica\xE7\xE3o ausente." });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decoded = await verifyFirebaseToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.warn("[Auth] Token inv\xE1lido:", err.message);
    return res.status(401).json({ error: "Token de autentica\xE7\xE3o inv\xE1lido." });
  }
}
function asaasFetch(endpoint) {
  let key = process.env.ASAAS_API_KEY;
  if (!key) return Promise.resolve(null);
  key = key.replace(/\\\$/g, "$");
  return new Promise((resolve) => {
    const req = https.request(`https://api.asaas.com/v3${endpoint}`, {
      method: "GET",
      headers: { "access_token": key }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          console.warn("Asaas API parse error:", data.substring(0, 100));
          resolve(null);
        }
      });
    });
    req.on("error", (err) => {
      console.warn("Asaas API network error:", err.message);
      resolve(null);
    });
    req.setTimeout(1e4, () => {
      req.destroy();
      console.warn("Asaas API timeout");
      resolve(null);
    });
    req.end();
  });
}
var { Pool } = pg;
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
  }));
  const allowedOrigins = [
    "https://hub.grapemidia.com.br",
    "https://n8n.srv942411.hstgr.cloud",
    "http://localhost:5173",
    "http://localhost:3000"
  ];
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Origem n\xE3o permitida pelo CORS"));
      }
    },
    credentials: true
  }));
  const isDevMode = process.env.NODE_ENV !== "production" && process.env.VITE_USER_NODE_ENV !== "production";
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    // 15 minutos
    max: isDevMode ? 2e3 : 600,
    message: { error: "Muitas requisi\xE7\xF5es. Tente novamente em alguns minutos." },
    standardHeaders: true,
    legacyHeaders: false
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    max: 20,
    message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use("/api", globalLimiter);
  app.use("/api/auth", authLimiter);
  const PORT = process.env.PORT || 3e3;
  const isProduction = process.env.NODE_ENV === "production" || process.env.VITE_USER_NODE_ENV === "production";
  console.log(`Starting server in ${isProduction ? "production" : "development"} mode...`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  const dbUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  const dbHost = process.env.PGHOST || process.env.VITE_PGHOST;
  const dbName = process.env.PGDATABASE || process.env.VITE_PGDATABASE;
  const dbUser = process.env.PGUSER || process.env.VITE_PGUSER;
  const dbPass = process.env.PGPASSWORD || process.env.VITE_PGPASSWORD;
  const dbSSL = process.env.PGSSLMODE || process.env.VITE_PGSSLMODE;
  const isPlaceholderHost = dbHost === "base" || dbUrl && dbUrl.includes("@base:");
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
  const poolConfig = dbUrl ? { connectionString: dbUrl } : {
    host: dbHost,
    database: dbName,
    user: dbUser,
    password: dbPass,
    port: 5432
  };
  if (dbUrl) {
    try {
      const url = new URL(dbUrl);
      console.log(`[DB] Connecting to host: ${url.hostname}`);
      if (url.hostname === "base") {
        console.error("[DB] ERROR: DATABASE_URL contains placeholder host 'base'. Please replace it with your actual Neon DB host.");
      }
    } catch (e) {
      console.warn("[DB] Could not parse DATABASE_URL for logging");
    }
  } else if (dbHost) {
    console.log(`[DB] Connecting to host: ${dbHost}`);
  }
  if (dbUrl?.includes("neon.tech") || dbHost?.includes("neon.tech") || dbSSL === "require") {
    poolConfig.ssl = { rejectUnauthorized: false };
  }
  const pool = new Pool(poolConfig);
  pool.on("error", (err, client) => {
    console.error("Unexpected error on idle client", err);
  });
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
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

      -- Backfill squad from linked client for existing projects
      UPDATE projects p
      SET squad = c.squad
      FROM clients c
      WHERE p.active_client_id = c.id
        AND p.squad IS NULL
        AND c.squad IS NOT NULL;
      
      CREATE TABLE IF NOT EXISTS nps_responses (
        id SERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        office TEXT,
        grape_satisfaction INTEGER,
        response_time_score INTEGER,
        project_result_score INTEGER,
        paid_traffic_score INTEGER,
        operations_manager_score INTEGER,
        improvements TEXT,
        other_services TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sort_order INTEGER DEFAULT 0
      );
      
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS aviso_previo_date TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

      ALTER TABLE churn ADD COLUMN IF NOT EXISTS comments TEXT;

      -- Checklist block support
      ALTER TABLE crm_checklist ADD COLUMN IF NOT EXISTS block TEXT DEFAULT 'diretoria';
      ALTER TABLE crm_checklist_template ADD COLUMN IF NOT EXISTS block TEXT DEFAULT 'diretoria';

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
      
      ALTER TABLE menu_pages ADD COLUMN IF NOT EXISTS responsavel_id TEXT;

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
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS manager_id TEXT;

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
            ('COBRAN\xC7A \u2013 Informar a Marvee para retirar do Asaas e Plataforma Marvee', 0),
            ('RETIRAR \u2013 Planilha Marvee Parceiros Ativos', 1),
            ('RETIRAR \u2013 Parceiros Ativos', 2),
            ('RETIRAR \u2013 Painel Gestor', 3),
            ('ARQUIVAR \u2013 Pasta Google Drive (Dentro de Operacional \u2192 Parceiros)', 4),
            ('ARQUIVAR \u2013 Pasta Google Data Studio', 5),
            ('ARQUIVAR \u2013 Contrato Authentique', 6),
            ('PAUSAR \u2013 Campanhas gerenciadas pela Grape M\xEDdia', 7),
            ('SAIR \u2013 BM Facebook Ads (Pessoas e Parceiro All Grape M\xEDdia) + Conta Google Ads', 8),
            ('DESATIVAR \u2013 LP dentro do WordPress', 9),
            ('DESATIVAR \u2013 CRM Padr\xE3o Grape', 10),
            ('RETIRAR \u2013 Planilha Acesso CRM', 11),
            ('RELAT\xD3RIO DE SA\xCDDA (Motivos da Sa\xEDda)', 12),
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
      ALTER TABLE products ADD COLUMN IF NOT EXISTS ai_keyword TEXT;
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
        created_at TIMESTAMP DEFAULT NOW(),
        last_completed TIMESTAMP
      );
      ALTER TABLE to_do_staff_recurring ADD COLUMN IF NOT EXISTS last_completed TIMESTAMP;

      CREATE TABLE IF NOT EXISTS to_do_staff_ideas (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'nova',
        tags JSONB DEFAULT '[]',
        comments JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS to_do_staff_notes (
        page_id TEXT PRIMARY KEY,
        content TEXT
      );

      CREATE TABLE IF NOT EXISTS to_do_staff_doc_pages (
        id TEXT PRIMARY KEY,
        page_id TEXT NOT NULL DEFAULT 'default',
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
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
            ('Pr\xE9-vendas 1', 'Pr\xE9-vendas 1'),
            ('Pr\xE9-vendas 2', 'Pr\xE9-vendas 2');
          
          -- Comercial items
          INSERT INTO crm_comercial_task_template_items (template_id, title, type, priority, due_days_offset, order_index) VALUES
            (1, 'DIA 1 - WhatsApp \u{1F534}', 'WhatsApp', 'Urgente', 0, 0),
            (1, 'DIA 1 - Liga\xE7\xE3o \u{1F534}', 'Liga\xE7\xE3o', 'Urgente', 0, 1),
            (1, 'Proposta Comercial \u{1F4DD}', 'Tarefa', 'Normal', 1, 2);

          -- Pr\xE9-vendas 1 items
          INSERT INTO crm_comercial_task_template_items (template_id, title, type, priority, due_days_offset, order_index) VALUES
            (2, 'Primeiro Contato', 'WhatsApp', 'Normal', 0, 0),
            (2, 'Qualifica\xE7\xE3o', 'Liga\xE7\xE3o', 'Alta', 1, 1);
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

      CREATE TABLE IF NOT EXISTS crm_comercial_checklist_template (
        id SERIAL PRIMARY KEY,
        item TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Seed checklist de entrada padr\xE3o (conta apenas rows ativas)
      DO $$
      DECLARE
        active_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO active_count FROM crm_comercial_checklist_template WHERE active = true;
        IF active_count = 0 THEN
          -- Limpar rows inativas \xF3rf\xE3s antes de re-seed
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
            ('Arquivar contrato ap\xF3s as assinaturas', 8);
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

      CREATE TABLE IF NOT EXISTS task_attachments (
        id SERIAL PRIMARY KEY,
        task_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        uploaded_by TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS task_comments (
        id SERIAL PRIMARY KEY,
        task_id TEXT NOT NULL,
        author_name TEXT NOT NULL,
        author_avatar TEXT,
        content TEXT NOT NULL,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Migration for todos table
      ALTER TABLE todos ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;
      ALTER TABLE todos ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]';
      ALTER TABLE todos ADD COLUMN IF NOT EXISTS page_id TEXT;
      ALTER TABLE todos ADD COLUMN IF NOT EXISTS project_id TEXT;
      ALTER TABLE todos ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE todos ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
      ALTER TABLE todos ADD COLUMN IF NOT EXISTS section_id TEXT;

      -- Backfill: set completed_at for existing completed tasks that don't have it
      UPDATE todos SET completed_at = created_at WHERE status = 'completed' AND completed_at IS NULL;

      -- Todo sections (agrupamentos dentro de cada projeto)
      CREATE TABLE IF NOT EXISTS todo_sections (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id TEXT NOT NULL,
        page_id TEXT,
        name TEXT NOT NULL,
        order_index INTEGER DEFAULT 0,
        is_default BOOLEAN DEFAULT FALSE,
        is_fixed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Migrations: ensure all columns exist
      ALTER TABLE todo_sections ADD COLUMN IF NOT EXISTS page_id TEXT;
      ALTER TABLE todo_sections ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
      ALTER TABLE todo_sections ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT FALSE;

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
      ALTER TABLE menu_pages ADD COLUMN IF NOT EXISTS manager_id TEXT;

      -- Migration: Add status/type_column to fin_movements_asaas for Sicredi payment tracking
      ALTER TABLE fin_movements_asaas ADD COLUMN IF NOT EXISTS sicredi_status VARCHAR(30) DEFAULT 'realizado';
      ALTER TABLE fin_movements_asaas ADD COLUMN IF NOT EXISTS billing_month VARCHAR(7);

      -- Dispatch Queue tables
      CREATE TABLE IF NOT EXISTS fin_dispatch_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        receivable_asaas_id VARCHAR(100),
        customer_asaas_id VARCHAR(100),
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(30) NOT NULL,
        amount DECIMAL(10,2),
        due_date DATE,
        day_offset INTEGER DEFAULT 0,
        rule_triggered VARCHAR(100),
        channel VARCHAR(20) DEFAULT 'WHATSAPP',
        message_template TEXT,
        message_rendered TEXT,
        scheduled_date DATE NOT NULL,
        scheduled_time TIME DEFAULT '09:00',
        status VARCHAR(20) DEFAULT 'AGENDADO',
        sent_at TIMESTAMP,
        error_message TEXT,
        n8n_ticket_id VARCHAR(100),
        n8n_contato_id VARCHAR(100),
        n8n_contato_novo BOOLEAN,
        n8n_ticket_novo BOOLEAN,
        invoice_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      ALTER TABLE fin_dispatch_queue ADD COLUMN IF NOT EXISTS day_offset INTEGER DEFAULT 0;
      CREATE INDEX IF NOT EXISTS idx_dispatch_queue_status ON fin_dispatch_queue(status);
      CREATE INDEX IF NOT EXISTS idx_dispatch_queue_scheduled ON fin_dispatch_queue(scheduled_date, scheduled_time);
      -- Dedup index migrado para bloco separado (agora por CLIENTE, n\xE3o por fatura).

      CREATE TABLE IF NOT EXISTS fin_dispatch_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        dispatch_enabled BOOLEAN DEFAULT true,
        dispatch_time TIME DEFAULT '09:00',
        dispatch_interval_seconds INTEGER DEFAULT 60,
        n8n_webhook_url VARCHAR(500) DEFAULT '',
        updated_at TIMESTAMP DEFAULT NOW()
      );
      INSERT INTO fin_dispatch_config (dispatch_enabled, dispatch_time, dispatch_interval_seconds, n8n_webhook_url)
        SELECT true, '09:00', 60, ''
        WHERE NOT EXISTS (SELECT 1 FROM fin_dispatch_config);
      ALTER TABLE fin_dispatch_config ADD COLUMN IF NOT EXISTS last_batch_date DATE;
    `);
    console.log("Database tables initialized successfully.");
    try {
      await pool.query(`DROP INDEX IF EXISTS idx_dispatch_queue_dedup`);
      await pool.query(`
        UPDATE fin_dispatch_queue SET status = 'CANCELADO', updated_at = NOW()
        WHERE id IN (
          SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER(PARTITION BY customer_asaas_id, day_offset ORDER BY created_at ASC) as rn
            FROM fin_dispatch_queue WHERE status NOT IN ('CANCELADO', 'ERRO')
          ) sub WHERE sub.rn > 1
        )
      `);
      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_dispatch_queue_dedup_client
        ON fin_dispatch_queue (customer_asaas_id, day_offset)
        WHERE status NOT IN ('CANCELADO', 'ERRO')
      `);
    } catch (e) {
      console.warn("[migration] dispatch dedup index:", e?.message);
    }
    await pool.query(`
      INSERT INTO menu_pages (id, subsession_id, label, icon, template, order_index)
      VALUES ('crm-financeiro', 'painel-admin', 'CRM Financeiro', 'CreditCard', 'crm-financeiro', 2)
      ON CONFLICT (id) DO NOTHING
    `);
    await pool.query(`
      UPDATE users 
      SET allowed_pages = allowed_pages || '["crm-financeiro"]'::jsonb
      WHERE allowed_pages @> '["active-clients"]'::jsonb 
      AND NOT allowed_pages @> '["crm-financeiro"]'::jsonb
    `);
    await pool.query(`ALTER TABLE crm_comercial_history ADD COLUMN IF NOT EXISTS action_type VARCHAR(50)`);
    await pool.query(`ALTER TABLE crm_comercial_history ADD COLUMN IF NOT EXISTS description TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_history ADD COLUMN IF NOT EXISTS user_name TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_history ADD COLUMN IF NOT EXISTS task_type VARCHAR(50)`);
    try {
      await pool.query(`ALTER TABLE crm_comercial_history ALTER COLUMN created_at TYPE TIMESTAMPTZ`);
    } catch (e) {
    }
    try {
      await pool.query(`ALTER TABLE crm_comercial_leads ALTER COLUMN created_at TYPE TIMESTAMPTZ`);
    } catch (e) {
    }
    try {
      await pool.query(`ALTER TABLE crm_comercial_leads ALTER COLUMN updated_at TYPE TIMESTAMPTZ`);
    } catch (e) {
    }
    try {
      await pool.query(`ALTER TABLE crm_comercial_tasks ALTER COLUMN created_at TYPE TIMESTAMPTZ`);
    } catch (e) {
    }
    try {
      await pool.query(`ALTER TABLE crm_comercial_tasks ALTER COLUMN completed_at TYPE TIMESTAMPTZ`);
    } catch (e) {
    }
    try {
      await pool.query(`ALTER TABLE crm_comercial_tasks ALTER COLUMN due_date TYPE TIMESTAMPTZ`);
    } catch (e) {
    }
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
    await pool.query(`ALTER TABLE crm_webhook_settings ADD COLUMN IF NOT EXISTS inbound_token TEXT`);
    await pool.query(`ALTER TABLE crm_webhook_settings ADD COLUMN IF NOT EXISTS inbound_kanban_id TEXT`);
    await pool.query(`ALTER TABLE crm_webhook_settings ADD COLUMN IF NOT EXISTS inbound_coluna TEXT`);
    await pool.query(`ALTER TABLE crm_webhook_settings ADD COLUMN IF NOT EXISTS inbound_responsavel_id TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS squad TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS previsao DATE`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS etapa_updated_at TIMESTAMPTZ DEFAULT NOW()`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS instagram TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS nicho TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS tempo_oab TEXT`);
    await pool.query(`ALTER TABLE crm_comercial_leads ADD COLUMN IF NOT EXISTS faturamento TEXT`);
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
    } catch (e) {
      if (!e.message.includes("already exists")) {
        console.warn("Constraint unique add warning:", e.message);
      }
    }
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
    await pool.query(`ALTER TABLE crm_metas ADD COLUMN IF NOT EXISTS coluna_id TEXT`);
    await pool.query(`ALTER TABLE crm_metas ADD COLUMN IF NOT EXISTS activity_type TEXT`);
    await pool.query(`UPDATE menu_pages SET template = 'crm-metas' WHERE LOWER(label) LIKE '%metas%' AND (template IS NULL OR template = 'blank')`);
    await pool.query(`UPDATE menu_pages SET template = 'crm-metricas' WHERE LOWER(label) LIKE '%m\xE9tricas%' OR LOWER(label) LIKE '%metricas%'`);
    await pool.query(`UPDATE menu_pages SET template = 'marketing-dashboard' WHERE LOWER(label) LIKE '%dashboard marketing%' AND (template IS NULL OR template = 'blank')`);
    await pool.query(`UPDATE menu_pages SET template = 'marketing-acoes' WHERE LOWER(label) LIKE '%a\xE7\xF5es%' AND (template IS NULL OR template = 'blank')`);
    const comercialSection = await pool.query(`SELECT id FROM menu_sections WHERE LOWER(title) = 'comercial' LIMIT 1`);
    const comercialSectionId = comercialSection.rows[0]?.id;
    if (comercialSectionId) {
      await pool.query(`
        UPDATE menu_pages 
        SET label = 'Leads', 
            template = 'crm-leads', 
            icon = 'UserSearch',
            section_id = $1,
            subsession_id = NULL,
            subsubsession_id = NULL
        WHERE LOWER(label) = 'pessoas' AND template IN ('crm-pessoas', 'blank', 'default')
      `, [comercialSectionId]);
      await pool.query(`
        UPDATE menu_pages SET template = 'crm-leads'
        WHERE LOWER(label) = 'leads' AND (template IS NULL OR template = 'blank')
      `);
      await pool.query(`DELETE FROM menu_pages WHERE LOWER(label) = 'empresas' AND template IN ('crm-empresas', 'blank', 'default')`);
      await pool.query(`
        DELETE FROM menu_subsessions 
        WHERE LOWER(label) = 'contatos'
          AND NOT EXISTS (SELECT 1 FROM menu_pages WHERE subsession_id = menu_subsessions.id)
      `);
    }
    try {
      await pool.query(`ALTER TABLE crm_comercial_kanbans ADD COLUMN IF NOT EXISTS user_id TEXT`);
    } catch (e) {
    }
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
    try {
      await pool.query(`
        INSERT INTO menu_pages (id, subsession_id, label, icon, template, order_index)
        VALUES ('crm-ligacoes', 'comercial', 'Liga\xE7\xF5es', 'Phone', 'ligacoes-dashboard', 3)
        ON CONFLICT (id) DO UPDATE SET template = EXCLUDED.template;
      `);
    } catch (errMenu) {
      console.log("Skipping ligacoes menu injection: ", errMenu.message);
    }
    await pool.query(`
      UPDATE users 
      SET allowed_pages = allowed_pages || '["crm-ligacoes"]'::jsonb
      WHERE allowed_pages @> '["crm-comercial"]'::jsonb 
      AND NOT allowed_pages @> '["crm-ligacoes"]'::jsonb
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_comercial_tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        color VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
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
      ADD COLUMN IF NOT EXISTS closing_goal TEXT,
      ADD COLUMN IF NOT EXISTS responsible_avatar TEXT;
    `).catch((e) => console.error("Error migrating crm_comercial_meetings columns", e));
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
    const templateCount = await pool.query("SELECT COUNT(*) FROM crm_comercial_task_templates");
    if (parseInt(templateCount.rows[0].count) === 0) {
      const t1 = await pool.query(
        "INSERT INTO crm_comercial_task_templates (name, description) VALUES ($1, $2) RETURNING id",
        ["Comercial", "Fluxo de vendas"]
      );
      const t2 = await pool.query(
        "INSERT INTO crm_comercial_task_templates (name, description) VALUES ($1, $2) RETURNING id",
        ["Pr\xE9-vendas", "Fluxo de pr\xE9-vendas"]
      );
      await pool.query(
        `INSERT INTO crm_comercial_task_template_items (template_id, title, type, priority, due_days_offset, order_index) VALUES
         ($1, 'DIA 1 - WhatsApp \u{1F534}', 'WhatsApp', 'Urgente', 0, 0),
         ($1, 'DIA 1 - Liga\xE7\xE3o \u{1F534}', 'Liga\xE7\xE3o', 'Urgente', 0, 1),
         ($1, 'Proposta Comercial \u{1F4DD}', 'Tarefa', 'Normal', 1, 2)`,
        [t1.rows[0].id]
      );
      await pool.query(
        `INSERT INTO crm_comercial_task_template_items (template_id, title, type, priority, due_days_offset, order_index) VALUES
         ($1, 'Primeiro Contato', 'WhatsApp', 'Normal', 0, 0),
         ($1, 'Qualifica\xE7\xE3o', 'Liga\xE7\xE3o', 'Alta', 1, 1)`,
        [t2.rows[0].id]
      );
      console.log("[SEED] CRM task templates criados com sucesso.");
    }
    try {
      await pool.query("ALTER TABLE crm_comercial_columns ADD COLUMN IF NOT EXISTS icon varchar(50) DEFAULT 'LayoutGrid'");
    } catch (err) {
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS passwords (
        id SERIAL PRIMARY KEY,
        page_id TEXT NOT NULL,
        service_name TEXT NOT NULL,
        login TEXT,
        password TEXT,
        url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE passwords ADD COLUMN IF NOT EXISTS url TEXT;`).catch((e) => console.error("Error migrating passwords columns", e));
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_tokens (
        id SERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        service_name TEXT NOT NULL,
        token_value TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
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
    await pool.query(`ALTER TABLE hiring_saboteur_results ALTER COLUMN score TYPE NUMERIC(4,1)`);
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hiring_documents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'Sem t\xEDtulo',
        content TEXT DEFAULT '',
        section TEXT DEFAULT '',
        created_by TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE hiring_documents ADD COLUMN IF NOT EXISTS section TEXT DEFAULT '';`);
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
    try {
      await pool.query(`
        INSERT INTO menu_pages (id, section_id, label, icon, template, order_index)
        VALUES ('contratacao', 'operacional', 'Contrata\xE7\xE3o', 'Users', 'contratacao', 10)
        ON CONFLICT (id) DO NOTHING;
      `);
    } catch (e) {
      console.log("Skipping contratacao menu injection:", e.message);
    }
    try {
      await pool.query(`
        INSERT INTO menu_pages (id, section_id, label, icon, template, order_index)
        VALUES ('contas-a-pagar', 'financeiro', 'Contas a Pagar', 'FileText', 'contas-a-pagar', 2)
        ON CONFLICT (id) DO NOTHING;
      `);
      await pool.query(`UPDATE menu_pages SET order_index = 3 WHERE id = 'crm-financeiro' AND section_id = 'financeiro'`);
    } catch (e) {
      console.log("Skipping contas-a-pagar menu injection:", e.message);
    }
    try {
      await pool.query(`
        INSERT INTO menu_pages (id, section_id, label, icon, template, order_index)
        VALUES ('contas-a-receber', 'financeiro', 'Contas a Receber', 'ArrowDownLeft', 'contas-a-receber', 3)
        ON CONFLICT (id) DO NOTHING;
      `);
      await pool.query(`UPDATE menu_pages SET order_index = 4 WHERE id = 'crm-financeiro' AND section_id = 'financeiro'`);
    } catch (e) {
      console.log("Skipping contas-a-receber menu injection:", e.message);
    }
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS growth_projections (
          id SERIAL PRIMARY KEY,
          year INTEGER NOT NULL,
          month INTEGER NOT NULL,
          initial_clients INTEGER DEFAULT 0,
          churn_rate NUMERIC(5,2) DEFAULT 0.00,
          churn_count INTEGER DEFAULT 0,
          new_clients INTEGER DEFAULT 0,
          traffic_budget NUMERIC(12,2) DEFAULT 0.00,
          cac NUMERIC(10,2) DEFAULT 0.00,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(year, month)
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS growth_realized (
          id SERIAL PRIMARY KEY,
          year INTEGER NOT NULL,
          month INTEGER NOT NULL,
          initial_clients INTEGER DEFAULT 0,
          churn_rate NUMERIC(5,2) DEFAULT 0.00,
          churn_count INTEGER DEFAULT 0,
          new_clients INTEGER DEFAULT 0,
          traffic_budget NUMERIC(12,2) DEFAULT 0.00,
          cac NUMERIC(10,2) DEFAULT 0.00,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(year, month)
        );
      `);
      const baselineProjections = [
        { m: 1, init: 64, churn: 10, churnCnt: 0, newCl: 15, traffic: 2e4, cac: 1300 },
        { m: 2, init: 79, churn: 10, churnCnt: 8, newCl: 15, traffic: 2e4, cac: 1300 },
        { m: 3, init: 86, churn: 10, churnCnt: 9, newCl: 15, traffic: 2e4, cac: 1300 },
        { m: 4, init: 92, churn: 10, churnCnt: 9, newCl: 15, traffic: 2e4, cac: 1300 },
        { m: 5, init: 98, churn: 10, churnCnt: 10, newCl: 15, traffic: 2e4, cac: 1300 },
        { m: 6, init: 103, churn: 10, churnCnt: 10, newCl: 15, traffic: 2e4, cac: 1300 },
        { m: 7, init: 108, churn: 10, churnCnt: 11, newCl: 15, traffic: 2e4, cac: 1300 },
        { m: 8, init: 112, churn: 10, churnCnt: 11, newCl: 15, traffic: 2e4, cac: 1300 },
        { m: 9, init: 116, churn: 10, churnCnt: 12, newCl: 15, traffic: 2e4, cac: 1300 },
        { m: 10, init: 119, churn: 10, churnCnt: 12, newCl: 15, traffic: 2e4, cac: 1300 },
        { m: 11, init: 122, churn: 10, churnCnt: 12, newCl: 15, traffic: 2e4, cac: 1300 },
        { m: 12, init: 125, churn: 10, churnCnt: 13, newCl: 15, traffic: 2e4, cac: 1300 }
      ];
      for (const p of baselineProjections) {
        await pool.query(`
          INSERT INTO growth_projections (year, month, initial_clients, churn_rate, churn_count, new_clients, traffic_budget, cac)
          VALUES (2026, $1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (year, month) DO NOTHING
        `, [p.m, p.init, p.churn, p.churnCnt, p.newCl, p.traffic, p.cac]);
        await pool.query(`
          INSERT INTO growth_realized (year, month, initial_clients, churn_rate, churn_count, new_clients, traffic_budget, cac)
          VALUES (2026, $1, 0, 0, 0, 0, 0, 0)
          ON CONFLICT (year, month) DO NOTHING
        `, [p.m]);
      }
      await pool.query(`
        INSERT INTO menu_pages (id, section_id, label, icon, template, order_index)
        VALUES ('planejamento-crescimento', 'financeiro', 'Planejamento', 'TrendingUp', 'planejamento-crescimento', 5)
        ON CONFLICT (id) DO NOTHING
      `);
      await pool.query(`
        UPDATE users 
        SET allowed_pages = allowed_pages || '["planejamento-crescimento"]'::jsonb
        WHERE allowed_pages @> '["contas-a-pagar"]'::jsonb 
        AND NOT allowed_pages @> '["planejamento-crescimento"]'::jsonb
      `);
      console.log("[DB] Growth planning structures initialized and populated.");
    } catch (e) {
      console.error("[DB] Error running growth planning migrations:", e.message);
    }
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS career_plan_docs (
          id TEXT PRIMARY KEY,
          page_id TEXT NOT NULL DEFAULT 'default',
          title TEXT NOT NULL DEFAULT 'Novo Plano',
          content TEXT DEFAULT '',
          sort_order INTEGER DEFAULT 0,
          created_by TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE career_plan_docs ADD COLUMN IF NOT EXISTS allowed_users JSONB DEFAULT '[]'::jsonb;
      `);
      await pool.query(`
        INSERT INTO menu_pages (id, section_id, label, icon, template, order_index)
        VALUES ('planos-de-carreira', 'operacional', 'Planos de Carreira', 'Award', 'planos-de-carreira', 12)
        ON CONFLICT (id) DO NOTHING
      `);
      console.log("[DB] Career plan docs table initialized.");
    } catch (e) {
      console.error("[DB] Error running career plans migrations:", e.message);
    }
  } catch (err) {
    console.error("Error initializing database tables:", err);
  }
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));
  app.use(authenticateToken);
  app.get("/api/project-comments/:projectId", async (req, res) => {
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
      console.error("Error fetching project comments:", err);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });
  app.post("/api/project-comments/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const { author, author_photo, text, is_internal } = req.body;
      if (!author || !text) return res.status(400).json({ error: "author and text are required" });
      const result = await pool.query(
        `INSERT INTO project_comments (project_id, author, author_photo, text, is_internal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, project_id, author, author_photo, text, is_internal, created_at`,
        [projectId, author, author_photo || null, text, is_internal || false]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error saving project comment:", err);
      res.status(500).json({ error: "Failed to save comment" });
    }
  });
  app.post("/api/nps/submit", async (req, res) => {
    try {
      const {
        project_id,
        office,
        grape_satisfaction,
        response_time_score,
        project_result_score,
        paid_traffic_score,
        operations_manager_score,
        improvements,
        other_services
      } = req.body;
      if (!project_id) return res.status(400).json({ error: "project_id is required" });
      const result = await pool.query(
        `INSERT INTO nps_responses 
         (project_id, office, grape_satisfaction, response_time_score, project_result_score, paid_traffic_score, operations_manager_score, improvements, other_services)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [project_id, office, grape_satisfaction, response_time_score, project_result_score, paid_traffic_score, operations_manager_score, improvements, other_services]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error saving NPS response:", err);
      res.status(500).json({ error: "Failed to save NPS response" });
    }
  });
  app.get("/api/nps/:projectId", async (req, res) => {
    try {
      const { projectId } = req.params;
      const result = await pool.query(
        `SELECT * FROM nps_responses WHERE project_id = $1 ORDER BY created_at DESC`,
        [projectId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching NPS responses:", err);
      res.status(500).json({ error: "Failed to fetch NPS responses" });
    }
  });
  app.delete("/api/project-comments/:commentId", async (req, res) => {
    try {
      const { commentId } = req.params;
      await pool.query(`DELETE FROM project_comments WHERE id = $1`, [commentId]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting project comment:", err);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });
  app.use((req, res, next) => {
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] ${req.method} ${req.url}`);
    next();
  });
  async function runAutomations(event, lead) {
    try {
      const autoRes = await pool.query(`SELECT * FROM automations WHERE active = TRUE`);
      for (const automation of autoRes.rows) {
        const stepsRes = await pool.query(
          `SELECT * FROM automation_steps WHERE automation_id = $1 ORDER BY order_index ASC`,
          [automation.id]
        );
        const steps = stepsRes.rows.map((s) => ({
          ...s,
          // Garante que config seja sempre objeto (JSONB pode vir como string em alguns drivers)
          config: typeof s.config === "string" ? JSON.parse(s.config) : s.config || {}
        }));
        console.log(`[Automa\xE7\xE3o] Verificando "${automation.name}" (${steps.length} passos) para evento "${event}"`);
        const triggerStep = steps.find((s) => s.type === "trigger");
        if (!triggerStep) {
          console.log(`[Automa\xE7\xE3o] "${automation.name}": sem trigger, pulando`);
          continue;
        }
        const triggerEvent = triggerStep.config?.event;
        console.log(`[Automa\xE7\xE3o] "${automation.name}": trigger.config.event = "${triggerEvent}", esperado = "${event}"`);
        if (triggerEvent !== event) continue;
        const conditions = steps.filter((s) => s.type === "condition");
        let conditionsPassed = true;
        for (const cond of conditions) {
          const rules = cond.config?.rules || [];
          for (const rule of rules) {
            const field = rule.field;
            const op = rule.op;
            const value = rule.value;
            const leadVal = field === "Kanban" ? String(lead.kanban_id || "").toLowerCase() : field === "Etapa do funil" ? String(lead.coluna || "").toLowerCase() : String(lead[field] || lead[field?.toLowerCase()] || "").toLowerCase();
            const ruleVal = String(value || "").toLowerCase();
            console.log(`[Automa\xE7\xE3o] Condi\xE7\xE3o: field="${field}" op="${op}" leadVal="${leadVal}" ruleVal="${ruleVal}"`);
            if (op === "\xE9" && leadVal !== ruleVal) {
              conditionsPassed = false;
              break;
            }
            if (op === "mudou para" && leadVal !== ruleVal) {
              conditionsPassed = false;
              break;
            }
            if (op === "n\xE3o \xE9" && leadVal === ruleVal) {
              conditionsPassed = false;
              break;
            }
            if (op === "cont\xE9m" && !leadVal.includes(ruleVal)) {
              conditionsPassed = false;
              break;
            }
            if (op === "n\xE3o cont\xE9m" && leadVal.includes(ruleVal)) {
              conditionsPassed = false;
              break;
            }
            if (op === "maior que" && !(Number(leadVal) > Number(ruleVal))) {
              conditionsPassed = false;
              break;
            }
            if (op === "menor que" && !(Number(leadVal) < Number(ruleVal))) {
              conditionsPassed = false;
              break;
            }
            if (op === "est\xE1 preenchido" && !leadVal) {
              conditionsPassed = false;
              break;
            }
            if (op === "est\xE1 vazio" && leadVal) {
              conditionsPassed = false;
              break;
            }
          }
          if (!conditionsPassed) break;
        }
        console.log(`[Automa\xE7\xE3o] "${automation.name}": condi\xE7\xF5es ${conditionsPassed ? "PASSARAM \u2713" : "FALHARAM \u2717"}`);
        if (!conditionsPassed) continue;
        const actions = steps.filter((s) => s.type === "action");
        console.log(`[Automa\xE7\xE3o] "${automation.name}": ${actions.length} a\xE7\xE3o(\xF5es) a executar`);
        for (const action of actions) {
          const cfg = action.config || {};
          const actionType = cfg.action_type;
          const leadId = lead.id;
          console.log(`[Automa\xE7\xE3o] "${automation.name}": executando a\xE7\xE3o "${actionType}" cfg=`, JSON.stringify(cfg));
          try {
            if (actionType === "create_task") {
              const dayOffset = cfg.day_offset ?? 1;
              const dueDate = /* @__PURE__ */ new Date();
              dueDate.setDate(dueDate.getDate() + dayOffset);
              await pool.query(
                `INSERT INTO crm_comercial_tasks (lead_id, title, type, due_date, observations, responsible_id)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                  leadId,
                  cfg.title || "Atividade autom\xE1tica",
                  cfg.task_type || "Liga\xE7\xE3o",
                  dueDate.toISOString().slice(0, 10),
                  cfg.observations || null,
                  lead.responsavel_id || null
                ]
              );
            } else if (actionType === "create_note") {
              await pool.query(
                `INSERT INTO crm_comercial_messages (lead_id, content, user_name, created_at)
                 VALUES ($1, $2, $3, NOW())`,
                [leadId, cfg.note || "", "Automa\xE7\xE3o"]
              );
            } else if (actionType === "add_tag") {
              if (cfg.tag) {
                const currentTags = await pool.query(
                  `SELECT tags FROM crm_comercial_leads WHERE id = $1`,
                  [leadId]
                );
                const existingTags = currentTags.rows[0]?.tags || [];
                if (!existingTags.includes(cfg.tag)) {
                  await pool.query(
                    `UPDATE crm_comercial_leads SET tags = array_append(COALESCE(tags, '{}'), $2) WHERE id = $1`,
                    [leadId, cfg.tag]
                  );
                }
              }
            } else if (actionType === "assign_responsible") {
              if (cfg.responsible_id) {
                await pool.query(
                  `UPDATE crm_comercial_leads SET responsavel_id = $2 WHERE id = $1`,
                  [leadId, cfg.responsible_id]
                );
              }
            } else if (actionType === "mark_won") {
              const colRes = await pool.query(
                `SELECT id FROM crm_comercial_columns WHERE kanban_id = $1 AND (LOWER(title) LIKE '%ganho%' OR LOWER(title) LIKE '%fechado%') LIMIT 1`,
                [lead.kanban_id]
              );
              if (colRes.rows.length > 0) {
                await pool.query(`UPDATE crm_comercial_leads SET coluna = $2 WHERE id = $1`, [leadId, colRes.rows[0].id]);
              }
            } else if (actionType === "mark_lost") {
              await pool.query(`UPDATE crm_comercial_leads SET is_lost = TRUE WHERE id = $1`, [leadId]);
            } else if (actionType === "move_stage") {
              if (cfg.column_id) {
                await pool.query(`UPDATE crm_comercial_leads SET coluna = $2 WHERE id = $1`, [leadId, cfg.column_id]);
              }
            } else if (actionType === "create_lead") {
              if (cfg.kanban_id) {
                await pool.query(
                  `INSERT INTO crm_comercial_leads (nome, telefone, origem, responsavel_id, valor, observacoes, kanban_id, coluna)
                   SELECT nome, telefone, origem, responsavel_id, valor, observacoes, $2, $3 FROM crm_comercial_leads WHERE id = $1`,
                  [leadId, cfg.kanban_id, cfg.column_id || null]
                );
              }
            } else if (actionType === "duplicate_lead") {
              await pool.query(
                `INSERT INTO crm_comercial_leads (nome, telefone, origem, responsavel_id, valor, observacoes, kanban_id, coluna)
                 SELECT nome, telefone, origem, responsavel_id, valor, observacoes, kanban_id, coluna FROM crm_comercial_leads WHERE id = $1`,
                [leadId]
              );
            } else if (actionType === "send_webhook") {
              if (cfg.webhook_url) {
                fetch(cfg.webhook_url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ event, lead, automation_id: automation.id })
                }).catch((e) => console.error("[Webhook] Failed:", e.message));
              }
            } else if (actionType === "start_sequence") {
              if (cfg.sequence_id) {
                const seqSteps = await pool.query(
                  `SELECT * FROM crm_sequence_steps WHERE sequence_id = $1 ORDER BY order_index ASC`,
                  [cfg.sequence_id]
                );
                for (const step of seqSteps.rows) {
                  const dueDate = /* @__PURE__ */ new Date();
                  dueDate.setDate(dueDate.getDate() + (step.day_offset || 1));
                  await pool.query(
                    `INSERT INTO crm_comercial_tasks (lead_id, title, type, due_date, observations)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [leadId, step.title || "", step.type || "Tarefa", dueDate.toISOString().slice(0, 10), step.observations || null]
                  );
                }
              }
            } else if (actionType === "clear_open_tasks") {
              const deleted = await pool.query(
                `DELETE FROM crm_comercial_tasks WHERE lead_id = $1 AND completed = FALSE RETURNING id`,
                [leadId]
              );
              console.log(`[Automa\xE7\xE3o] clear_open_tasks: ${deleted.rowCount} atividade(s) removida(s) do lead ${leadId}`);
            } else if (actionType === "create_client") {
              const clientName = lead.form_nome_fantasia || lead.nome || lead.form_nome_completo || "Novo Cliente";
              const clientPhone = lead.telefone || lead.form_telefone_whatsapp || "";
              const clientEmail = lead.email || "";
              const clientLocation = lead.form_cidade || lead.office_location || "";
              const clientId = `lead-${leadId}-${Date.now()}`;
              const startDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
              const existingClient = await pool.query(
                `SELECT id FROM clients WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
                [clientName]
              );
              if (existingClient.rows.length > 0) {
                console.log(`[Automa\xE7\xE3o] create_client: cliente "${clientName}" j\xE1 existe (id: ${existingClient.rows[0].id}), pulando cria\xE7\xE3o`);
              } else {
                await pool.query(
                  `INSERT INTO clients (id, name, email, phone, status, start_date, location)
                   VALUES ($1, $2, $3, $4, 'Ativo', $5, $6)`,
                  [clientId, clientName, clientEmail, clientPhone, startDate, clientLocation]
                );
                console.log(`[Automa\xE7\xE3o] create_client: cliente "${clientName}" criado com id ${clientId}`);
              }
            } else if (actionType === "create_onboarding") {
              const clientName = lead.form_nome_fantasia || lead.nome || lead.form_nome_completo || "Novo Cliente";
              const nomeCompleto = lead.form_nome_completo || null;
              const telefone = lead.telefone || lead.form_telefone_whatsapp || null;
              const cidade = lead.form_cidade || lead.office_location || null;
              const tags = Array.isArray(lead.tags) ? lead.tags : [];
              const produtoTag = tags.length > 0 ? tags[0] : null;
              const result = await pool.query(
                `INSERT INTO onboarding_tasks (client_name, nome_completo, telefone_whatsapp, cidade, produto, status_group, type)
                 VALUES ($1, $2, $3, $4, $5, 'briefing-realizado', 'operacional') RETURNING *`,
                [clientName, nomeCompleto, telefone, cidade, produtoTag]
              );
              const newTask = result.rows[0];
              const template = await pool.query(
                "SELECT title, order_index, description, internal_doc FROM onboarding_template_items WHERE type = 'operacional' ORDER BY order_index ASC"
              );
              if (template.rows.length > 0) {
                const values = [];
                const params = [];
                let idx = 1;
                for (const item of template.rows) {
                  values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
                  params.push(newTask.id, item.title, item.order_index, item.description || null, item.internal_doc || null);
                }
                await pool.query(
                  `INSERT INTO onboarding_subtasks (task_id, title, order_index, description, internal_doc) VALUES ${values.join(", ")}`,
                  params
                );
                await pool.query(
                  `UPDATE onboarding_tasks SET subtask_count = $1 WHERE id = $2`,
                  [template.rows.length, newTask.id]
                );
              }
              console.log(`[Automa\xE7\xE3o] create_onboarding: tarefa operacional criada para lead ${leadId}`);
            }
            console.log(`[Automa\xE7\xE3o] "${automation.name}" \u2192 a\xE7\xE3o "${actionType}" executada para lead ${leadId}`);
            await pool.query(
              `INSERT INTO automation_logs (automation_id, automation_name, lead_id, lead_nome, event, action_type, status, message)
               VALUES ($1, $2, $3, $4, $5, $6, 'success', $7)`,
              [
                automation.id,
                automation.name,
                leadId,
                lead.nome || lead.id,
                event,
                actionType,
                `A\xE7\xE3o "${actionType}" executada com sucesso`
              ]
            ).catch(() => {
            });
          } catch (actionErr) {
            console.error(`[Automa\xE7\xE3o] Erro na a\xE7\xE3o "${actionType}" para lead ${leadId}:`, actionErr.message);
            await pool.query(
              `INSERT INTO automation_logs (automation_id, automation_name, lead_id, lead_nome, event, action_type, status, message)
               VALUES ($1, $2, $3, $4, $5, $6, 'error', $7)`,
              [
                automation.id,
                automation.name,
                leadId,
                lead.nome || lead.id,
                event,
                actionType,
                actionErr.message || "Erro desconhecido"
              ]
            ).catch(() => {
            });
          }
        }
        await pool.query(`UPDATE automations SET runs = runs + 1, last_run_at = NOW() WHERE id = $1`, [automation.id]);
        const actionLabels = actions.map((a) => a.config?.action_type || "").filter(Boolean).join(", ");
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
           VALUES ($1, 'automacao', $2, 'Sistema')`,
          [lead.id, `\u26A1 Automa\xE7\xE3o "${automation.name}" executada \u2014 A\xE7\xF5es: ${actionLabels}`]
        ).catch(() => {
        });
      }
    } catch (err) {
      console.error("[Motor de Automa\xE7\xF5es] Erro geral:", err.message);
    }
  }
  app.get("/api/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", env: process.env.NODE_ENV, db: "connected" });
    } catch (err) {
      res.status(500).json({ status: "error", env: process.env.NODE_ENV, db: "disconnected", error: String(err) });
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
      res.status(500).json({
        status: "error",
        message: "Failed to connect to Neon DB"
      });
    }
  });
  app.get("/api/projects/by-subsession/:subsessionId", async (req, res) => {
    try {
      const { subsessionId } = req.params;
      const pageIdsResult = await pool.query(`
        SELECT mp.id as page_id
        FROM menu_pages mp
        WHERE mp.subsession_id = $1
        UNION
        SELECT mp.id as page_id
        FROM menu_pages mp
        JOIN menu_subsubsessions mss ON mss.id = mp.subsubsession_id
        WHERE mss.subsession_id = $1
      `, [subsessionId]);
      const pageIds = pageIdsResult.rows.map((r) => r.page_id);
      if (pageIds.length === 0) {
        return res.json([]);
      }
      const placeholders = pageIds.map((_, i) => `$${i + 1}`).join(", ");
      const projectsResult = await pool.query(`
        SELECT p.*, mp.manager_id as page_manager_id, u.name as page_manager_name, u.picture as page_manager_picture,
        (SELECT date FROM meetings WHERE project_id = p.id ORDER BY date DESC LIMIT 1) as last_meeting_date
        FROM projects p
        LEFT JOIN menu_pages mp ON mp.id = p.page_id
        LEFT JOIN users u ON u.id::text = mp.manager_id
        WHERE p.page_id IN (${placeholders})
        ORDER BY p.sort_order ASC, p.partner ASC
      `, pageIds);
      const projects = [];
      for (const row of projectsResult.rows) {
        const productsResult = await pool.query("SELECT * FROM products WHERE project_id = $1", [row.id]);
        const products = [];
        for (const prodRow of productsResult.rows) {
          const optimizationsResult = await pool.query("SELECT * FROM optimizations WHERE product_id = $1 ORDER BY date DESC", [prodRow.id]);
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
            aiKeyword: prodRow.ai_keyword,
            bottleneck: prodRow.bottleneck,
            history: prodRow.history,
            balance: prodRow.balance,
            projectResult: prodRow.project_result,
            optimizations: optimizationsResult.rows
          });
        }
        projects.push({
          id: row.id,
          partner: row.partner,
          responsible: row.responsible,
          group: row.group_name,
          status: row.status,
          investment: row.investment,
          lastUpdate: row.last_update,
          projectResult: row.project_result,
          page_id: row.page_id,
          squad: row.squad,
          lastMeetingDate: row.last_meeting_date,
          products
        });
      }
      res.json(projects);
    } catch (e) {
      console.error("Error in /api/projects/by-subsession:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.get("/api/projects", async (req, res) => {
    try {
      const { page_id } = req.query;
      let projectQuery = `
        SELECT p.*, mp.manager_id as page_manager_id, u.name as page_manager_name, u.picture as page_manager_picture,
        (SELECT date FROM meetings WHERE project_id = p.id ORDER BY date DESC LIMIT 1) as last_meeting_date
        FROM projects p
        LEFT JOIN menu_pages mp ON mp.id = p.page_id
        LEFT JOIN users u ON u.id::text = mp.manager_id
      `;
      const projectParams = [];
      if (page_id) {
        projectQuery += " WHERE p.page_id = $1";
        projectParams.push(page_id);
      }
      projectQuery += " ORDER BY p.sort_order ASC, p.partner ASC";
      const projectsResult = await pool.query(projectQuery, projectParams);
      const projectIds = projectsResult.rows.map((r) => r.id);
      if (projectIds.length === 0) {
        return res.json([]);
      }
      const [productsResult, optimizationsResult] = await Promise.all([
        pool.query("SELECT * FROM products WHERE project_id = ANY($1)", [projectIds]),
        pool.query("SELECT * FROM optimizations WHERE product_id = ANY(SELECT id FROM products WHERE project_id = ANY($1)) ORDER BY date DESC", [projectIds])
      ]);
      const optsByProduct = /* @__PURE__ */ new Map();
      for (const opt of optimizationsResult.rows) {
        const pid = opt.product_id;
        if (!optsByProduct.has(pid)) optsByProduct.set(pid, []);
        optsByProduct.get(pid).push({
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
        });
      }
      const prodsByProject = /* @__PURE__ */ new Map();
      for (const prodRow of productsResult.rows) {
        const projId = prodRow.project_id;
        if (!prodsByProject.has(projId)) prodsByProject.set(projId, []);
        prodsByProject.get(projId).push({
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
          aiKeyword: prodRow.ai_keyword,
          bottleneck: prodRow.bottleneck,
          history: prodRow.history,
          balance: prodRow.balance,
          paymentMethod: prodRow.payment_method,
          projectResult: prodRow.project_result,
          cpaGoal: prodRow.cpa_goal,
          leadsGoal: prodRow.leads_goal,
          cacGoal: prodRow.cac_goal,
          fechamentosGoal: prodRow.fechamentos_goal,
          optimizations: optsByProduct.get(prodRow.id) || []
        });
      }
      const projects = projectsResult.rows.map((row) => ({
        id: row.id,
        partner: row.partner,
        product: row.partner,
        status: row.status,
        roi: row.roi,
        investment: row.investment,
        responsible: row.page_manager_name || row.responsible,
        responsiblePicture: row.page_manager_picture || null,
        lastUpdate: row.last_update,
        activeClientId: row.active_client_id,
        page_id: row.page_id,
        page_manager_id: row.page_manager_id,
        group: row.group,
        projectResult: row.project_result,
        squad: row.squad,
        lastMeetingDate: row.last_meeting_date,
        files: (() => {
          if (typeof row.files === "string") {
            try {
              return JSON.parse(row.files);
            } catch (e) {
              return [];
            }
          }
          return row.files || [];
        })(),
        sortOrder: row.sort_order,
        products: prodsByProject.get(row.id) || []
      }));
      res.json(projects);
    } catch (err) {
      console.error("Error fetching projects:", err);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });
  app.patch("/api/menu-pages/:id/manager", async (req, res) => {
    const { id } = req.params;
    const { manager_id } = req.body;
    try {
      const uid = req.user?.uid;
      if (uid) {
        const userRes = await pool.query("SELECT role FROM users WHERE uid = $1", [uid]);
        const role = userRes.rows[0]?.role;
        if (role !== "superadmin" && role !== "admin") {
          return res.status(403).json({ error: "Acesso negado. Apenas administradores podem alterar o gestor da p\xE1gina." });
        }
      }
      await pool.query("UPDATE menu_pages SET manager_id = $1 WHERE id = $2", [manager_id || null, id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating page manager:", err);
      res.status(500).json({ error: "Failed to update page manager" });
    }
  });
  app.post("/api/projects", async (req, res) => {
    const projects = req.body;
    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: "Expected an array of projects" });
    }
    const MAX_RETRIES = 3;
    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        console.log(`Recebida solicita\xE7\xE3o para salvar ${projects.length} projetos (tentativa ${retries + 1})`);
        projects.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
        await pool.query("BEGIN");
        for (const p of projects) {
          console.log(`[SAVE] Iniciando processamento do projeto ${p.id} (${p.partner})`);
          try {
            let squadValue = p.squad || null;
            if (!squadValue && p.activeClientId) {
              const clientRes = await pool.query("SELECT squad FROM clients WHERE id = $1", [p.activeClientId]);
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
          if (p.products && Array.isArray(p.products)) {
            console.log(`[SAVE] Processando ${p.products.length} produtos para o projeto ${p.id}`);
            const currentProductIdsResult = await pool.query("SELECT id FROM products WHERE project_id = $1", [p.id]);
            const currentProductIds = currentProductIdsResult.rows.map((r) => r.id);
            const incomingProductIds = p.products.map((prod) => prod.id);
            const productsToDelete = currentProductIds.filter((id) => !incomingProductIds.includes(id));
            if (productsToDelete.length > 0) {
              await pool.query("DELETE FROM products WHERE id = ANY($1)", [productsToDelete]);
            }
            for (const prod of p.products) {
              try {
                await pool.query(
                  `INSERT INTO products (id, project_id, name, icon, cac, results, kpis, budget, platform, status, delivery, ai_service, ai_keyword, bottleneck, history, balance, payment_method, project_result, cpa_goal, leads_goal, cac_goal, fechamentos_goal)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
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
                     ai_keyword = EXCLUDED.ai_keyword,
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
                    prod.id,
                    p.id,
                    prod.name,
                    prod.icon,
                    prod.cac,
                    prod.results,
                    prod.kpis,
                    prod.budget,
                    prod.platform,
                    prod.status,
                    prod.delivery,
                    prod.aiService,
                    prod.aiKeyword,
                    prod.bottleneck,
                    prod.history,
                    prod.balance,
                    prod.paymentMethod,
                    prod.projectResult,
                    prod.cpaGoal,
                    prod.leadsGoal,
                    prod.cacGoal,
                    prod.fechamentosGoal
                  ]
                );
              } catch (err) {
                console.error(`[SAVE ERROR] Erro ao salvar produto ${prod.id} do projeto ${p.id}:`, err);
                throw err;
              }
              if (prod.optimizations && Array.isArray(prod.optimizations)) {
                console.log(`[SAVE] Processando ${prod.optimizations.length} otimiza\xE7\xF5es para o produto ${prod.id}`);
                const currentOptIdsResult = await pool.query("SELECT id FROM optimizations WHERE product_id = $1", [prod.id]);
                const currentOptIds = currentOptIdsResult.rows.map((r) => r.id);
                const incomingOptIds = prod.optimizations.map((o) => o.id);
                const optsToDelete = currentOptIds.filter((id) => !incomingOptIds.includes(id));
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
                    console.error(`[SAVE ERROR] Erro ao salvar otimiza\xE7\xE3o ${opt.id} do produto ${prod.id}:`, err);
                    throw err;
                  }
                }
                console.log(`[SAVE] Otimiza\xE7\xF5es para produto ${prod.id} salvas.`);
              }
            }
            console.log(`[SAVE] Produtos para projeto ${p.id} salvos.`);
          }
        }
        await pool.query("COMMIT");
        console.log("Projetos e dados relacionados salvos com sucesso");
        res.json({ status: "success" });
        return;
      } catch (err) {
        try {
          await pool.query("ROLLBACK");
        } catch (rollbackErr) {
          console.error("Error rolling back transaction:", rollbackErr);
        }
        const isDeadlock = err instanceof Error && err.message.includes("deadlock detected");
        if (isDeadlock && retries < MAX_RETRIES - 1) {
          retries++;
          console.warn(`Deadlock detected, retrying (${retries}/${MAX_RETRIES})...`);
          await new Promise((resolve) => setTimeout(resolve, 100 * retries));
          continue;
        }
        console.error("Error saving projects:", err);
        res.status(500).json({ error: "Failed to save projects", details: err instanceof Error ? err.message : String(err) });
        return;
      }
    }
  });
  app.post("/api/projects/reorder", async (req, res) => {
    try {
      const { projects } = req.body;
      if (!Array.isArray(projects)) return res.status(400).json({ error: "Invalid payload" });
      await pool.query("BEGIN");
      for (const p of projects) {
        if (!p.id || typeof p.sort_order !== "number") continue;
        await pool.query("UPDATE projects SET sort_order = $1 WHERE id = $2", [p.sort_order, p.id]);
      }
      await pool.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error("Failed to reorder projects:", err);
      res.status(500).json({ error: "Failed to reorder" });
    }
  });
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[DELETE] Tentando excluir projeto com ID: ${id}`);
      await pool.query("BEGIN");
      await pool.query(`
        DELETE FROM optimizations 
        WHERE product_id IN (SELECT id FROM products WHERE project_id = $1)
      `, [id]);
      await pool.query("DELETE FROM products WHERE project_id = $1", [id]);
      await pool.query("DELETE FROM meetings WHERE project_id = $1", [id]);
      const result = await pool.query("DELETE FROM projects WHERE id = $1", [id]);
      await pool.query("COMMIT");
      console.log(`[DELETE] Resultado da exclus\xE3o: ${result.rowCount} linhas afetadas`);
      res.json({ success: true, deletedCount: result.rowCount });
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error("Error deleting project:", err);
      res.status(500).json({ error: "Failed to delete project", details: err instanceof Error ? err.message : String(err) });
    }
  });
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[DELETE PRODUCT] Tentando excluir produto com ID: ${id}`);
      await pool.query("BEGIN");
      await pool.query("DELETE FROM optimizations WHERE product_id = $1", [id]);
      const result = await pool.query("DELETE FROM products WHERE id = $1", [id]);
      await pool.query("COMMIT");
      console.log(`[DELETE PRODUCT] Resultado: ${result.rowCount} linhas afetadas`);
      res.json({ success: true, deletedCount: result.rowCount });
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error("Error deleting product:", err);
      res.status(500).json({ error: "Failed to delete product", details: err instanceof Error ? err.message : String(err) });
    }
  });
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
        res.json({
          targetSales: 168e3,
          leadCost: 12,
          leadToMeetingRate: 20,
          meetingToClosingRate: 25,
          averageTicket: 14e3
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
  app.get("/api/gestor-data", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM gestor_data ORDER BY updated_at DESC LIMIT 1");
      if (result.rows.length > 0) {
        res.json(result.rows[0].data);
      } else {
        res.json({
          baseSalary: 3e3,
          maxBonus: 2e3,
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
  app.get("/api/closer-data", async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM closer_data ORDER BY updated_at DESC LIMIT 1");
      if (result.rows.length > 0) {
        const raw = result.rows[0].data || {};
        res.json({
          baseSalary: parseFloat(raw.baseSalary) || 3e3,
          salesTarget: parseFloat(raw.salesTarget) || 35e3,
          bonusValue: parseFloat(raw.bonusValue) || 1e3,
          commissionRate: parseFloat(raw.commissionRate) || 10,
          totalSold: parseFloat(raw.totalSold) || 0
        });
      } else {
        res.json({
          baseSalary: 3e3,
          salesTarget: 35e3,
          bonusValue: 1e3,
          commissionRate: 10,
          totalSold: 0
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
      const existing = await pool.query("SELECT id FROM closer_data ORDER BY updated_at DESC LIMIT 1");
      if (existing.rows.length > 0) {
        await pool.query("UPDATE closer_data SET data = $1, updated_at = NOW() WHERE id = $2", [data, existing.rows[0].id]);
      } else {
        await pool.query("INSERT INTO closer_data (data) VALUES ($1)", [data]);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving closer data:", err);
      res.status(500).json({ error: "Failed to save closer data" });
    }
  });
  app.get("/api/menu", async (req, res) => {
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
      const menu = sections.map((section) => {
        const sectionSubSubSessions = subsubsessions.filter((sss) => sss.section_id === section.id && !sss.subsession_id).map((sss) => ({
          id: sss.id,
          label: sss.label,
          icon: sss.icon,
          icon_color: sss.icon_color,
          pages: pages.filter((p) => p.subsubsession_id === sss.id).map((p) => ({
            id: p.id,
            label: p.label,
            icon: p.icon,
            icon_color: p.icon_color,
            template: p.template,
            manager_id: p.manager_id
          }))
        }));
        return {
          id: section.id,
          title: section.title,
          icon: section.icon,
          icon_color: section.icon_color,
          pages: pages.filter((p) => p.section_id === section.id && p.subsession_id === null && p.subsubsession_id === null).map((p) => ({
            id: p.id,
            label: p.label,
            icon: p.icon,
            icon_color: p.icon_color,
            template: p.template,
            manager_id: p.manager_id
          })),
          subSubSessions: sectionSubSubSessions,
          subSessions: subsessions.filter((ss) => ss.section_id === section.id).map((ss) => {
            return {
              id: ss.id,
              label: ss.label,
              icon: ss.icon,
              icon_color: ss.icon_color,
              subSubSessions: subsubsessions.filter((sss) => sss.subsession_id === ss.id).map((sss) => {
                return {
                  id: sss.id,
                  label: sss.label,
                  icon: sss.icon,
                  icon_color: sss.icon_color,
                  pages: pages.filter((p) => p.subsubsession_id === sss.id).map((p) => ({
                    id: p.id,
                    label: p.label,
                    icon: p.icon,
                    icon_color: p.icon_color,
                    template: p.template,
                    manager_id: p.manager_id
                  }))
                };
              }),
              pages: pages.filter((p) => p.subsession_id === ss.id && p.subsubsession_id === null).map((p) => ({
                id: p.id,
                label: p.label,
                icon: p.icon,
                icon_color: p.icon_color,
                template: p.template,
                manager_id: p.manager_id
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
        [id, subsubsession_id || null, subsession_id || null, section_id || null, label, icon, icon_color || "#64748b", template || id]
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
      console.log(`[PUT] Atualizando p\xE1gina ${id}:`, { subsubsession_id, subsession_id, section_id, label });
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
        [subsubsession_id || null, subsession_id || null, section_id || null, label, icon || "FileText", icon_color || "#64748b", template, id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating menu page:", err);
      res.status(500).json({ error: "Failed to update menu page", details: err instanceof Error ? err.message : String(err) });
    }
  });
  app.put("/api/menu/pages/:id/responsavel", async (req, res) => {
    try {
      const { id } = req.params;
      const { responsavel_id } = req.body;
      await pool.query("UPDATE menu_pages SET responsavel_id = $1 WHERE id = $2", [responsavel_id || null, id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating page responsible:", err);
      res.status(500).json({ error: "Failed to update page responsible" });
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
        [id, title, icon || "Folder", icon_color || "#64748b"]
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
        [id, section_id, label, icon || "Folder", icon_color || "#64748b"]
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
        return res.status(400).json({ error: "subsession_id ou section_id \xE9 obrigat\xF3rio" });
      }
      const parentClause = subsession_id ? "WHERE subsession_id = $2" : "WHERE section_id = $2";
      const parentValue = subsession_id || section_id;
      await pool.query(
        `INSERT INTO menu_subsubsessions (id, subsession_id, section_id, label, icon, icon_color, order_index) VALUES ($1, $3, $4, $5, $6, $7, (SELECT COALESCE(MAX(order_index) + 1, 0) FROM menu_subsubsessions ${parentClause}))`,
        [id, parentValue, subsession_id || null, section_id || null, label, icon || "FolderOpen", icon_color || "#64748b"]
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
      await pool.query("UPDATE menu_sections SET title = $1, icon = $2, icon_color = $3 WHERE id = $4", [title, icon || "Folder", icon_color || "#64748b", id]);
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
        [section_id, label, icon || "Folder", icon_color || "#64748b", id]
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
        [subsession_id || null, section_id || null, label, icon || "FolderOpen", icon_color || "#64748b", id]
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
      const { type, items } = req.body;
      let tableName = "";
      if (type === "sections") tableName = "menu_sections";
      else if (type === "subsessions") tableName = "menu_subsessions";
      else if (type === "subsubsessions") tableName = "menu_subsubsessions";
      else if (type === "pages") tableName = "menu_pages";
      else return res.status(400).json({ error: "Invalid type" });
      await pool.query("BEGIN");
      for (const item of items) {
        await pool.query(`UPDATE ${tableName} SET order_index = $1 WHERE id = $2`, [item.order_index, item.id]);
      }
      await pool.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error("Error reordering menu items:", err);
      res.status(500).json({ error: "Failed to reorder menu items" });
    }
  });
  app.get("/api/users", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM users ORDER BY email ASC");
      res.json(result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        picture: row.picture,
        role: row.role,
        allowedPages: row.allowed_pages || [],
        phone: row.phone,
        bio: row.bio
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
          allowedPages: row.allowed_pages || [],
          phone: row.phone,
          bio: row.bio
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
    const { email, role, allowedPages, name, picture, uid, phone, bio } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required", message: "Email \xE9 obrigat\xF3rio" });
    const userUid = uid || email.toLowerCase().replace(/[^a-z0-9]/g, "_");
    try {
      await pool.query(
        "INSERT INTO users (uid, email, name, picture, role, allowed_pages, phone, bio) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name), picture = COALESCE(EXCLUDED.picture, users.picture), role = EXCLUDED.role, allowed_pages = EXCLUDED.allowed_pages, phone = COALESCE(EXCLUDED.phone, users.phone), bio = COALESCE(EXCLUDED.bio, users.bio)",
        [userUid, email.toLowerCase().trim(), name || null, picture || null, role || "user", JSON.stringify(allowedPages || []), phone || null, bio || null]
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
    const { role, allowedPages, name, picture, squad, phone, bio } = req.body;
    try {
      await pool.query(
        "UPDATE users SET role = COALESCE($1, role), allowed_pages = COALESCE($2, allowed_pages), name = COALESCE($3, name), picture = COALESCE($4, picture), squad = COALESCE($5, squad), phone = COALESCE($6, phone), bio = COALESCE($7, bio) WHERE id = $8",
        [role, allowedPages ? JSON.stringify(allowedPages) : null, name, picture, squad, phone, bio, id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating user:", err);
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to update user", message: msg });
    }
  });
  app.delete("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM users WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting user:", err);
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: "Failed to delete user", message: msg });
    }
  });
  app.get("/api/daily-tasks", async (req, res) => {
    try {
      const { date, end_date, group, status, page_id } = req.query;
      let query = `
        SELECT t.*, p.partner as project_name, p.group as project_group
        FROM todos t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE 1=1
      `;
      const params = [];
      if (date && end_date) {
        params.push(date);
        params.push(end_date);
        query += ` AND ((t.due_date::date >= $1::date AND t.due_date::date <= $2::date) OR t.due_date IS NULL OR (t.due_date::date < $1::date AND t.status != 'completed'))`;
      } else if (date) {
        params.push(date);
        query += ` AND (t.due_date::date = $1::date OR t.due_date IS NULL OR (t.due_date::date < $1::date AND t.status != 'completed'))`;
      }
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
      query += ` ORDER BY t.order_index ASC, t.created_at DESC`;
      const result = await pool.query(query, params);
      const tasks = result.rows;
      if (tasks.length > 0) {
        const taskIds = tasks.map((t) => t.id);
        const subtasksResult = await pool.query(
          `SELECT * FROM task_subtasks WHERE task_id = ANY($1)`,
          [taskIds]
        );
        const subtasksByTaskId = {};
        for (const st of subtasksResult.rows) {
          if (!subtasksByTaskId[st.task_id]) subtasksByTaskId[st.task_id] = [];
          subtasksByTaskId[st.task_id].push(st);
        }
        for (const t of tasks) {
          t.subtasks_list = subtasksByTaskId[t.id] || [];
        }
      }
      const mappedTasks = tasks.map((t) => ({
        ...t,
        dueDate: t.due_date,
        createdAt: t.created_at,
        createdBy: t.created_by,
        assignedTo: t.assigned_to
      }));
      res.json(mappedTasks);
    } catch (err) {
      console.error("Error fetching daily tasks:", err);
      res.status(500).json({ error: "Failed to fetch daily tasks" });
    }
  });
  app.post("/api/task-batches", async (req, res) => {
    const { template_id, client_ids, date, user_id, page_id } = req.body;
    try {
      await pool.query("BEGIN");
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
            [taskId, item.title, item.description || "", "pending", user_id, projectId, date, page_id]
          );
        }
      }
      await pool.query("COMMIT");
      res.json({ success: true, batchId });
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error("Error creating task batch:", err);
      res.status(500).json({ error: "Failed to create task batch" });
    }
  });
  app.get("/api/tasks", async (req, res) => {
    try {
      const { project_id } = req.query;
      let query = "SELECT * FROM todos";
      const params = [];
      if (project_id) {
        query += " WHERE project_id = $1";
        params.push(project_id);
      }
      query += " ORDER BY order_index ASC, due_date ASC NULLS LAST, created_at DESC";
      const result = await pool.query(query, params);
      res.json(result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
        dueDate: row.due_date,
        createdBy: row.created_by,
        assignedTo: row.assigned_to,
        project_id: row.project_id,
        priority: row.priority,
        tags: row.tags || [],
        section_id: row.section_id || null
      })));
    } catch (err) {
      console.error("Error fetching tasks:", err);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });
  app.post("/api/tasks", async (req, res) => {
    const { id, title, description, status, createdBy, assignedTo, dueDate, project_id, priority, subtasks, page_id, tags, section_id } = req.body;
    try {
      const taskId = id || Date.now().toString();
      const finalProjectId = project_id === "" ? null : project_id;
      await pool.query(
        `INSERT INTO todos (id, title, description, status, created_by, assigned_to, due_date, project_id, priority, subtasks, page_id, tags, section_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET 
           title = EXCLUDED.title, 
           description = EXCLUDED.description, 
           status = EXCLUDED.status, 
           assigned_to = EXCLUDED.assigned_to,
           due_date = EXCLUDED.due_date,
           project_id = EXCLUDED.project_id,
           priority = EXCLUDED.priority,
           subtasks = EXCLUDED.subtasks,
           page_id = EXCLUDED.page_id,
           tags = EXCLUDED.tags,
           section_id = EXCLUDED.section_id`,
        [taskId, title, description, status || "pending", createdBy, assignedTo, dueDate, finalProjectId, priority || "M\xE9dia", JSON.stringify(subtasks || []), page_id, JSON.stringify(tags || []), section_id || null]
      );
      if (!id) {
        await pool.query(
          `INSERT INTO task_history (task_id, user_id, action, new_value) VALUES ($1, $2, $3, $4)`,
          [taskId, createdBy, "Tarefa criada", title]
        );
      }
      res.json({ success: true, id: taskId });
    } catch (err) {
      console.error("Error saving task:", err);
      res.status(500).json({ error: "Failed to save task" });
    }
  });
  app.patch("/api/tasks/reorder", async (req, res) => {
    try {
      const { tasks } = req.body;
      if (!Array.isArray(tasks)) return res.status(400).json({ error: "Invalid payload" });
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const task of tasks) {
          await client.query(
            "UPDATE todos SET section_id = $1, order_index = $2 WHERE id = $3",
            [task.section_id, task.order_index, task.id]
          );
        }
        await client.query("COMMIT");
        res.json({ success: true });
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("Error reordering tasks:", err);
      res.status(500).json({ error: "Failed to reorder tasks" });
    }
  });
  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM task_attachments WHERE task_id = $1", [id]);
      await pool.query("DELETE FROM task_comments WHERE task_id = $1", [id]);
      await pool.query("DELETE FROM task_subtasks WHERE task_id = $1", [id]);
      await pool.query("DELETE FROM todos WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });
  app.patch("/api/tasks/:id", async (req, res) => {
    const { id } = req.params;
    const { user_id, ...updates } = req.body;
    const authenticatedUid = req.user?.uid || user_id;
    try {
      const ALLOWED_COLUMNS = {
        title: "title",
        description: "description",
        status: "status",
        priority: "priority",
        dueDate: "due_date",
        assignedTo: "assigned_to",
        project_id: "project_id",
        page_id: "page_id",
        due_date: "due_date",
        assigned_to: "assigned_to",
        tags: "tags",
        section_id: "section_id"
      };
      const keys = Object.keys(updates).filter((k) => k in ALLOWED_COLUMNS);
      if (keys.length === 0) return res.json({ success: true });
      const oldTaskRes = await pool.query("SELECT * FROM todos WHERE id = $1", [id]);
      const oldTask = oldTaskRes.rows[0];
      const setClause = keys.map((key, i) => {
        return `${ALLOWED_COLUMNS[key]} = $${i + 2}`;
      }).join(", ");
      const values = keys.map((key) => key === "tags" || key === "subtasks" ? JSON.stringify(updates[key]) : updates[key]);
      await pool.query(
        `UPDATE todos SET ${setClause} WHERE id = $1`,
        [id, ...values]
      );
      if (updates.status && updates.status !== oldTask?.status) {
        if (updates.status === "completed") {
          await pool.query(`UPDATE todos SET completed_at = NOW() WHERE id = $1`, [id]);
        } else {
          await pool.query(`UPDATE todos SET completed_at = NULL WHERE id = $1`, [id]);
        }
      }
      if (authenticatedUid) {
        if (updates.status && oldTask.status !== updates.status) {
          await pool.query(`INSERT INTO task_history (task_id, user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)`, [id, authenticatedUid, "Status alterado", oldTask.status, updates.status]);
        }
        if (updates.dueDate !== void 0 && oldTask.due_date !== updates.dueDate) {
          await pool.query(`INSERT INTO task_history (task_id, user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)`, [id, authenticatedUid, "Data de vencimento alterada", oldTask.due_date, updates.dueDate]);
        }
        if (updates.assignedTo !== void 0 && oldTask.assigned_to !== updates.assignedTo) {
          await pool.query(`INSERT INTO task_history (task_id, user_id, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)`, [id, authenticatedUid, "Respons\xE1vel alterado", oldTask.assigned_to, updates.assignedTo]);
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
    const { completed } = req.body;
    const authenticatedUid = req.user?.uid;
    try {
      const result = await pool.query(
        `UPDATE task_subtasks SET completed = $1, completed_at = CASE WHEN $1 = true THEN NOW() ELSE NULL END WHERE id = $2 RETURNING *`,
        [completed, id]
      );
      if (authenticatedUid && completed) {
        await pool.query(`INSERT INTO task_history (task_id, user_id, action, new_value) VALUES ($1, $2, $3, $4)`, [result.rows[0].task_id, authenticatedUid, "Subtarefa conclu\xEDda", result.rows[0].title]);
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
      await pool.query("BEGIN");
      const tRes = await pool.query(
        `INSERT INTO task_templates (name, description, created_by) VALUES ($1, $2, $3) RETURNING id`,
        [name, description, created_by]
      );
      const templateId = tRes.rows[0].id;
      if (items && items.length > 0) {
        const idMap = /* @__PURE__ */ new Map();
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const parentId = item.parent_item_id ? idMap.get(item.parent_item_id) || item.parent_item_id : null;
          const iRes = await pool.query(
            `INSERT INTO task_template_items (template_id, title, parent_item_id, assignee, due_days_offset, order_index) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [templateId, item.title, parentId, item.assignee || null, item.due_days_offset || 0, i]
          );
          idMap.set(item.id, iRes.rows[0].id);
        }
      }
      await pool.query("COMMIT");
      res.json({ success: true, id: templateId });
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error("Error saving template:", err);
      res.status(500).json({ error: "Failed to save template" });
    }
  });
  app.delete("/api/task-templates/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("BEGIN");
      await pool.query("DELETE FROM task_template_items WHERE template_id = $1", [id]);
      await pool.query("DELETE FROM task_templates WHERE id = $1", [id]);
      await pool.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error("Error deleting template:", err);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });
  app.put("/api/task-templates/:id", async (req, res) => {
    const { id } = req.params;
    const { name, description, items } = req.body;
    try {
      await pool.query("BEGIN");
      await pool.query(
        "UPDATE task_templates SET name = $1, description = $2 WHERE id = $3",
        [name, description, id]
      );
      await pool.query("DELETE FROM task_template_items WHERE template_id = $1", [id]);
      if (items && items.length > 0) {
        const idMap = /* @__PURE__ */ new Map();
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const parentId = item.parent_item_id ? idMap.get(item.parent_item_id) || item.parent_item_id : null;
          const iRes = await pool.query(
            `INSERT INTO task_template_items (template_id, title, parent_item_id, assignee, due_days_offset, order_index) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [id, item.title, parentId, item.assignee || null, item.due_days_offset || 0, i]
          );
          idMap.set(item.id, iRes.rows[0].id);
        }
      }
      await pool.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error("Error updating template:", err);
      res.status(500).json({ error: "Failed to update template" });
    }
  });
  app.post("/api/task-templates/:id/apply", async (req, res) => {
    const { id } = req.params;
    const { project_id } = req.query;
    const user_id = req.user?.uid || req.query.user_id;
    try {
      const itemsRes = await pool.query("SELECT * FROM task_template_items WHERE template_id = $1 ORDER BY order_index ASC", [id]);
      const items = itemsRes.rows;
      const templateRes = await pool.query("SELECT * FROM task_templates WHERE id = $1", [id]);
      const templateName = templateRes.rows[0]?.name || "Modelo";
      const parentMap = /* @__PURE__ */ new Map();
      for (let item of items) {
        const dueDate = /* @__PURE__ */ new Date();
        dueDate.setDate(dueDate.getDate() + (item.due_days_offset || 0));
        if (!item.parent_item_id) {
          const taskId = Date.now().toString() + Math.random().toString(36).substring(7);
          await pool.query(
            `INSERT INTO todos (id, title, status, created_by, assigned_to, due_date, project_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [taskId, item.title, "pending", user_id, item.assignee || "all", dueDate, project_id]
          );
          parentMap.set(item.id, taskId);
          await pool.query(
            `INSERT INTO task_history (task_id, user_id, action, new_value) VALUES ($1, $2, $3, $4)`,
            [taskId, user_id, "Modelo aplicado", templateName]
          );
        } else {
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
  app.get("/api/todo-sections", async (req, res) => {
    try {
      const { project_id, page_id, auto_create } = req.query;
      if (!project_id) return res.status(400).json({ error: "project_id required" });
      let query = "SELECT * FROM todo_sections WHERE project_id = $1";
      const params = [project_id];
      if (page_id) {
        query += " AND (page_id = $2 OR page_id IS NULL)";
        params.push(page_id);
      }
      query += " ORDER BY order_index ASC, created_at ASC";
      const result = await pool.query(query, params);
      if (result.rows.length === 0 && auto_create === "true") {
        const DEFAULT_SECTIONS = ["CAMPANHA", "CRM"];
        const finalPageId = page_id || null;
        const insertedRows = [];
        for (let i = 0; i < DEFAULT_SECTIONS.length; i++) {
          const newId = crypto.randomUUID();
          const ins = await pool.query(
            `INSERT INTO todo_sections (id, project_id, page_id, name, is_default, order_index)
             VALUES ($1, $2, $3, $4, true, $5) RETURNING *`,
            [newId, project_id, finalPageId, DEFAULT_SECTIONS[i], i]
          );
          insertedRows.push(ins.rows[0]);
        }
        console.log(`[TODO-SECTIONS] Auto-created ${insertedRows.length} default sections for project ${project_id}`);
        return res.json(insertedRows);
      }
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching todo sections:", err);
      res.status(500).json({ error: "Failed to fetch todo sections" });
    }
  });
  app.post("/api/todo-sections", async (req, res) => {
    try {
      const { project_id, page_id, name, is_fixed, is_default, order_index } = req.body;
      console.log("[TODO-SECTIONS POST] body:", { project_id, page_id, name, is_default, order_index });
      if (!project_id || !name) return res.status(400).json({ error: "project_id and name required" });
      const newId = crypto.randomUUID();
      const finalPageId = page_id || null;
      const result = await pool.query(
        `INSERT INTO todo_sections (id, project_id, page_id, name, is_default, order_index) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [newId, project_id, finalPageId, name, is_default ?? is_fixed ?? false, order_index ?? 0]
      );
      console.log("[TODO-SECTIONS POST] Created:", result.rows[0].id, result.rows[0].name);
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating todo section:", err);
      res.status(500).json({ error: "Failed to create todo section" });
    }
  });
  app.patch("/api/todo-sections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, order_index } = req.body;
      const updates = [];
      const values = [];
      if (name !== void 0) {
        updates.push(`name = $${values.length + 2}`);
        values.push(name);
      }
      if (order_index !== void 0) {
        updates.push(`order_index = $${values.length + 2}`);
        values.push(order_index);
      }
      if (updates.length === 0) return res.json({ success: true });
      const result = await pool.query(
        `UPDATE todo_sections SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
        [id, ...values]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Section not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating todo section:", err);
      res.status(500).json({ error: "Failed to update todo section" });
    }
  });
  app.delete("/api/todo-sections/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("UPDATE todos SET section_id = NULL WHERE section_id = $1", [id]);
      await pool.query("DELETE FROM todo_sections WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting todo section:", err);
      res.status(500).json({ error: "Failed to delete todo section" });
    }
  });
  const taskUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  app.post("/api/tasks/:id/attachments", taskUpload.single("file"), async (req, res) => {
    try {
      const { id } = req.params;
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file provided" });
      let fileUrl = "";
      const fileName = `task-attachments/${id}/${Date.now()}-${file.originalname}`;
      if (firebaseAdminReady) {
        const bucket = admin.storage().bucket();
        const blob = bucket.file(fileName);
        await blob.save(file.buffer, {
          metadata: { contentType: file.mimetype }
        });
        await blob.makePublic();
        fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } else {
        const base64 = file.buffer.toString("base64");
        fileUrl = `data:${file.mimetype};base64,${base64}`;
      }
      const result = await pool.query(
        `INSERT INTO task_attachments (task_id, file_name, file_url, file_type, file_size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [id, file.originalname, fileUrl, file.mimetype, file.size, req.body.uploaded_by || "system"]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("[task-attachments] upload error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/tasks/:id/attachments", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "SELECT * FROM task_attachments WHERE task_id = $1 ORDER BY created_at DESC",
        [id]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/tasks/attachments/:attachmentId", async (req, res) => {
    try {
      const { attachmentId } = req.params;
      const att = await pool.query("SELECT * FROM task_attachments WHERE id = $1", [attachmentId]);
      if (att.rows.length > 0 && firebaseAdminReady && att.rows[0].file_url.startsWith("https://storage.googleapis.com")) {
        try {
          const bucket = admin.storage().bucket();
          const filePath = att.rows[0].file_url.split(`${bucket.name}/`)[1];
          if (filePath) await bucket.file(filePath).delete().catch(() => {
          });
        } catch (e) {
        }
      }
      await pool.query("DELETE FROM task_attachments WHERE id = $1", [attachmentId]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/tasks/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const { author_name, author_avatar, content, attachments } = req.body;
      if (!content?.trim()) return res.status(400).json({ error: "Content required" });
      const result = await pool.query(
        `INSERT INTO task_comments (task_id, author_name, author_avatar, content, attachments)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, author_name || "An\xF4nimo", author_avatar || null, content, JSON.stringify(attachments || [])]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("[task-comments] error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/tasks/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC",
        [id]
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/tasks/comments/:commentId", async (req, res) => {
    try {
      const { commentId } = req.params;
      await pool.query("DELETE FROM task_comments WHERE id = $1", [commentId]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
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
      res.json(result.rows.map((row) => ({
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
  app.delete("/api/meetings/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM meetings WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting meeting:", err);
      res.status(500).json({ error: "Failed to delete meeting" });
    }
  });
  app.post("/api/meetings/:id/like", async (req, res) => {
    const { id } = req.params;
    const { userIdentifier } = req.body;
    try {
      const current = await pool.query("SELECT likes FROM meetings WHERE id = $1", [id]);
      if (current.rows.length === 0) return res.status(404).json({ error: "Not found" });
      let likes = current.rows[0].likes || [];
      if (likes.includes(userIdentifier)) {
        likes = likes.filter((e) => e !== userIdentifier);
      } else {
        likes.push(userIdentifier);
      }
      await pool.query("UPDATE meetings SET likes = $1 WHERE id = $2", [JSON.stringify(likes), id]);
      res.json({ success: true, likes });
    } catch (err) {
      console.error("Error toggling meeting like:", err);
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });
  app.post("/api/meetings/:id/reply", async (req, res) => {
    const { id } = req.params;
    const { reply } = req.body;
    try {
      const current = await pool.query("SELECT replies FROM meetings WHERE id = $1", [id]);
      if (current.rows.length === 0) return res.status(404).json({ error: "Not found" });
      const replies = current.rows[0].replies || [];
      replies.push(reply);
      await pool.query("UPDATE meetings SET replies = $1 WHERE id = $2", [JSON.stringify(replies), id]);
      res.json({ success: true, replies });
    } catch (err) {
      console.error("Error adding meeting reply:", err);
      res.status(500).json({ error: "Failed to add reply" });
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
  app.get("/api/clients", async (req, res) => {
    try {
      const { crm_status } = req.query;
      let whereClause = "";
      const params = [];
      if (crm_status === "true") {
        whereClause = "WHERE c.crm_status IS NOT NULL AND c.crm_status != ''";
      }
      const result = await pool.query(`
        WITH receivable_agg AS (
          SELECT 
            r.customer_id,
            SUM(CASE WHEN r.status = 'OVERDUE' THEN r.value ELSE 0 END) as overdue_total,
            MIN(CASE WHEN r.status = 'OVERDUE' THEN r.due_date END) as oldest_overdue,
            MIN(CASE WHEN r.status = 'PENDING' THEN r.due_date END) as next_pending_date,
            (SELECT r2.value FROM fin_receivables r2 WHERE r2.customer_id = r.customer_id AND r2.status = 'PENDING' ORDER BY r2.due_date ASC LIMIT 1) as first_pending_value,
            bool_or(r.status = 'OVERDUE') as has_overdue,
            bool_or(r.status = 'PENDING' AND r.due_date <= CURRENT_DATE + interval '7 days') as has_due_soon
          FROM fin_receivables r
          WHERE r.status IN ('OVERDUE', 'PENDING')
          GROUP BY r.customer_id
        )
        SELECT 
          c.*,
          fp_link.id IS NOT NULL as has_financial_link,
          fp_link.guid as fin_people_guid_resolved,
          EXISTS(SELECT 1 FROM projects p WHERE p.active_client_id = c.id) as has_project_link,
          (SELECT p.partner FROM projects p WHERE p.active_client_id = c.id LIMIT 1) as project_name,
          COALESCE(
            NULLIF(ra.overdue_total, 0),
            ra.first_pending_value,
            fs.value,
            0
          ) as valor_display,
          CASE WHEN ra.oldest_overdue IS NOT NULL THEN CURRENT_DATE - ra.oldest_overdue END as dias_atraso,
          ra.next_pending_date as proxima_cobranca,
          CASE 
            WHEN ra.has_overdue THEN 'atrasada'
            WHEN ra.has_due_soon THEN 'vence_em_breve'
            ELSE 'em_dia'
          END as payment_status,
          CASE WHEN fs.id IS NOT NULL THEN true ELSE false END as has_active_subscription,
          fs.value as subscription_value,
          fs.next_due_date as subscription_next_due,
          fs.billing_type as subscription_billing_type,
          fs.cycle as subscription_cycle,
          fs.status as subscription_status
        FROM clients c
        LEFT JOIN LATERAL (
          SELECT fp.id, fp.guid, fp.asaas_id, fp.grapehub_client_id
          FROM fin_people fp
          WHERE fp.grapehub_client_id = c.id
             OR (c.fin_people_guid IS NOT NULL AND fp.guid = c.fin_people_guid)
          LIMIT 1
        ) fp_link ON true
        LEFT JOIN fin_subscriptions fs ON 
          (c.fin_subscription_id IS NOT NULL AND fs.id::text = c.fin_subscription_id) OR
          (c.fin_subscription_id IS NULL AND fs.customer_id = fp_link.asaas_id AND fs.status = 'ACTIVE')
        LEFT JOIN receivable_agg ra ON ra.customer_id = fp_link.asaas_id
        ${whereClause}
        ORDER BY c.sort_order ASC, c.name ASC
      `, params);
      const clients = result.rows.map((row) => {
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
          billingName: row.billing_name,
          billingEmail: row.billing_email,
          billingPhone: row.billing_phone,
          billingMethod: row.billing_method,
          billingNotes: row.billing_notes,
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
          finSubscriptionId: row.fin_subscription_id,
          subscriptionStatus: row.subscription_status || null,
          managerId: row.manager_id || null,
          sortOrder: row.sort_order
        };
      });
      res.json(clients);
    } catch (err) {
      console.error("Error fetching clients:", err);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });
  app.get("/api/clients/stats", async (req, res) => {
    try {
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const startOfMonth = `${year}-${month}-01`;
      const endOfMonth = new Date(year, now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const [activeRes, tcvRes, feeRes, entryRes, churnRes] = await Promise.all([
        // Ativos
        pool.query(`SELECT COUNT(*) FROM clients WHERE status = 'Ativo'`),
        // TCV
        pool.query(`SELECT COUNT(*) FROM clients WHERE status = 'Ativo' AND product = 'TCV'`),
        // FEE (Recorrência Mensal)
        pool.query(`SELECT COUNT(*) FROM clients WHERE status = 'Ativo' AND product = 'Recorr\xEAncia Mensal'`),
        // Entradas do mês — fechamentos do comercial
        pool.query(`SELECT COUNT(*) FROM fechamentos WHERE day >= $1 AND day <= $2`, [startOfMonth, endOfMonth]),
        // Churn do mês — tabela churn
        pool.query(`SELECT COUNT(*) FROM churn WHERE "day_exit" >= $1 AND "day_exit" <= $2::date + interval '1 day'`, [startOfMonth, endOfMonth])
      ]);
      res.json({
        ativos: parseInt(activeRes.rows[0].count || "0", 10),
        tcv: parseInt(tcvRes.rows[0].count || "0", 10),
        fee: parseInt(feeRes.rows[0].count || "0", 10),
        entradas: parseInt(entryRes.rows[0].count || "0", 10),
        churn: parseInt(churnRes.rows[0].count || "0", 10)
      });
    } catch (err) {
      console.error("Error fetching client stats:", err);
      res.status(500).json({ error: "Failed to fetch client stats" });
    }
  });
  app.post("/api/upload", express.json({ limit: "30mb" }), async (req, res) => {
    try {
      if (!firebaseAdminReady) {
        return res.status(503).json({ error: "Upload de imagens indispon\xEDvel: Firebase Admin n\xE3o configurado. Configure FIREBASE_PRIVATE_KEY nas vari\xE1veis de ambiente." });
      }
      const { fileData, mimeType, fileName } = req.body;
      if (!fileData) return res.status(400).json({ error: "Nenhum arquivo enviado." });
      if (!mimeType?.startsWith("image/")) return res.status(400).json({ error: "Apenas imagens s\xE3o permitidas." });
      const fileBuffer = Buffer.from(fileData, "base64");
      if (fileBuffer.length === 0) return res.status(400).json({ error: "Arquivo vazio." });
      const bucketName = FIREBASE_STORAGE_BUCKET || `${FIREBASE_PROJECT_ID}.appspot.com`;
      const bucket = admin.storage().bucket(bucketName);
      const uid = req.user?.uid || "anonymous";
      const safeFileName = (fileName || "upload.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = "optimizations/" + uid + "/" + Date.now() + "_" + safeFileName;
      const fileRef = bucket.file(filePath);
      await fileRef.save(fileBuffer, { metadata: { contentType: mimeType } });
      const [signedUrl] = await fileRef.getSignedUrl({
        action: "read",
        expires: Date.now() + 1e3 * 60 * 60 * 24 * 365 * 10
      });
      res.json({ url: signedUrl });
    } catch (err) {
      console.error("[Upload] Error:", err);
      res.status(500).json({ error: "Falha no upload: " + (err.message || "Erro desconhecido") });
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
      res.json(result.rows.map((row) => ({
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
          `INSERT INTO clients (id, name, email, phone, status, start_date, location, squad, tags, contracts, crm_status, product, fin_subscription_id, billing_name, billing_email, billing_phone, billing_method) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
             fin_subscription_id = EXCLUDED.fin_subscription_id,
             billing_name = EXCLUDED.billing_name,
             billing_email = EXCLUDED.billing_email,
             billing_phone = EXCLUDED.billing_phone,
             billing_method = EXCLUDED.billing_method`,
          [c.id, c.name, c.email, c.phone, c.status, c.startDate, c.location, c.squad, c.tags, c.contracts, c.crmStatus, c.product, c.finSubscriptionId, c.billingName, c.billingEmail, c.billingPhone, c.billingMethod]
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
  app.post("/api/clients/reorder", async (req, res) => {
    try {
      const { clients } = req.body;
      if (!Array.isArray(clients)) return res.status(400).json({ error: "Invalid payload" });
      await pool.query("BEGIN");
      for (const client of clients) {
        if (!client.id || typeof client.sort_order !== "number") continue;
        await pool.query("UPDATE clients SET sort_order = $1 WHERE id = $2", [client.sort_order, client.id]);
      }
      await pool.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error("Failed to reorder clients:", err);
      res.status(500).json({ error: "Failed to reorder" });
    }
  });
  app.delete("/api/clients/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM crm_comments WHERE client_id = $1", [id]);
      await pool.query("DELETE FROM crm_checklist WHERE client_id = $1", [id]);
      await pool.query("DELETE FROM crm_exit_data WHERE client_id = $1", [id]);
      await pool.query("UPDATE fin_people SET grapehub_client_id = NULL WHERE grapehub_client_id = $1", [id]);
      await pool.query("DELETE FROM clients WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting client:", err);
      res.status(500).json({ error: "Failed to delete client" });
    }
  });
  app.patch("/api/clients/:id", async (req, res) => {
    const { id } = req.params;
    const {
      crm_status,
      status,
      aviso_previo_date,
      contracts,
      product,
      fin_people_guid,
      fin_subscription_id,
      tags,
      manager_id,
      name,
      start_date,
      location,
      squad,
      email,
      phone,
      billing_name,
      billing_email,
      billing_phone,
      billing_method,
      billing_notes
    } = req.body;
    try {
      console.log(`[CLIENT PATCH] ID: ${id}, Body:`, req.body);
      if (crm_status === "processo_saida") {
        const currentClient = await pool.query("SELECT crm_status FROM clients WHERE id = $1", [id]);
        if (currentClient.rows.length > 0 && currentClient.rows[0].crm_status !== "processo_saida") {
          console.log(`[CLIENT PATCH] Generating checklist for ${id}`);
          const templateItems = await pool.query("SELECT item FROM crm_checklist_template WHERE active = TRUE ORDER BY order_index ASC");
          if (templateItems.rows.length > 0) {
            const existingChecklist = await pool.query("SELECT id FROM crm_checklist WHERE client_id = $1", [id]);
            if (existingChecklist.rows.length === 0) {
              const insertQuery = `
                INSERT INTO crm_checklist (client_id, item)
                VALUES ${templateItems.rows.map((_, i2) => `($1, $${i2 + 2})`).join(", ")}
              `;
              const values2 = [id, ...templateItems.rows.map((row) => row.item)];
              await pool.query(insertQuery, values2);
            }
          }
        }
      }
      const updates = [];
      const values = [];
      let i = 1;
      if (crm_status !== void 0) {
        updates.push(`crm_status = $${i++}`);
        values.push(crm_status);
      }
      if (status !== void 0) {
        updates.push(`status = $${i++}`);
        values.push(status);
      }
      if (aviso_previo_date !== void 0) {
        updates.push(`aviso_previo_date = $${i++}`);
        values.push(aviso_previo_date);
        console.log(`[CLIENT PATCH] Updating aviso_previo_date to: ${aviso_previo_date}`);
      }
      if (contracts !== void 0) {
        updates.push(`contracts = $${i++}`);
        values.push(contracts);
      }
      if (product !== void 0) {
        updates.push(`product = $${i++}`);
        values.push(product);
      }
      if (fin_people_guid !== void 0) {
        updates.push(`fin_people_guid = $${i++}`);
        values.push(fin_people_guid);
      }
      if (fin_subscription_id !== void 0) {
        updates.push(`fin_subscription_id = $${i++}`);
        values.push(fin_subscription_id);
      }
      if (tags !== void 0) {
        updates.push(`tags = $${i++}`);
        values.push(tags);
      }
      if (manager_id !== void 0) {
        updates.push(`manager_id = $${i++}`);
        values.push(manager_id);
      }
      if (name !== void 0) {
        updates.push(`name = $${i++}`);
        values.push(name);
      }
      if (start_date !== void 0) {
        updates.push(`start_date = $${i++}`);
        values.push(start_date);
      }
      if (location !== void 0) {
        updates.push(`location = $${i++}`);
        values.push(location);
      }
      if (squad !== void 0) {
        updates.push(`squad = $${i++}`);
        values.push(squad);
      }
      if (email !== void 0) {
        updates.push(`email = $${i++}`);
        values.push(email);
      }
      if (phone !== void 0) {
        updates.push(`phone = $${i++}`);
        values.push(phone);
      }
      if (billing_name !== void 0) {
        updates.push(`billing_name = $${i++}`);
        values.push(billing_name);
      }
      if (billing_email !== void 0) {
        updates.push(`billing_email = $${i++}`);
        values.push(billing_email);
      }
      if (billing_phone !== void 0) {
        updates.push(`billing_phone = $${i++}`);
        values.push(billing_phone);
      }
      if (billing_method !== void 0) {
        updates.push(`billing_method = $${i++}`);
        values.push(billing_method);
      }
      if (billing_notes !== void 0) {
        updates.push(`billing_notes = $${i++}`);
        values.push(billing_notes);
      }
      if (updates.length > 0) {
        values.push(id);
        const query = `UPDATE clients SET ${updates.join(", ")} WHERE id = $${i}`;
        console.log(`[CLIENT PATCH] Executing query: ${query} params:`, values);
        await pool.query(query, values);
        console.log(`[CLIENT PATCH] Successfully updated client ${id}`);
      }
      if (manager_id !== void 0) {
        try {
          const clientRes = await pool.query(`SELECT name FROM clients WHERE id = $1`, [id]);
          if (clientRes.rows.length > 0) {
            const clientName = clientRes.rows[0].name;
            let gestorName = null;
            if (manager_id) {
              const userRes = await pool.query(`SELECT name FROM users WHERE id = $1`, [manager_id]);
              if (userRes.rows.length > 0) {
                gestorName = userRes.rows[0].name;
              }
            }
            const churnUpdate = await pool.query(
              `UPDATE churn SET "gestor" = $1 WHERE "CLIENTE" = $2`,
              [gestorName, clientName]
            );
            console.log(`[CLIENT PATCH] Synced gestor "${gestorName}" to ${churnUpdate.rowCount} churn record(s) for client "${clientName}"`);
          }
        } catch (churnErr) {
          console.warn(`[CLIENT PATCH] Could not sync gestor to churn table:`, churnErr);
        }
      }
      if (fin_subscription_id !== void 0) {
        await pool.query(`UPDATE fin_people SET grapehub_client_id = NULL WHERE grapehub_client_id = $1`, [id]);
        if (fin_subscription_id) {
          const subRes = await pool.query(`SELECT customer_id FROM fin_subscriptions WHERE id::text = $1`, [fin_subscription_id]);
          if (subRes.rows.length > 0) {
            const customerId = subRes.rows[0].customer_id;
            await pool.query(
              `UPDATE fin_people SET grapehub_client_id = $1 WHERE asaas_id = $2`,
              [id, customerId]
            );
            console.log(`[CLIENT PATCH] Auto-linked fin_people (asaas_id: ${customerId}) to client ${id}`);
          }
        } else {
          console.log(`[CLIENT PATCH] Unlinked fin_people from client ${id}`);
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error("[CLIENT PATCH ERROR] Error updating client:", err);
      res.status(500).json({ error: "Failed to update client", details: String(err) });
    }
  });
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
        [q || ""]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error searching fin_people:", err);
      res.status(500).json({ error: "Failed to search" });
    }
  });
  app.post("/api/churn", async (req, res) => {
    const { client_id, client_name, churn_type, exit_reasons, squad, start_date, gestor, comments } = req.body;
    try {
      const startD = start_date ? new Date(start_date) : null;
      const exitD = /* @__PURE__ */ new Date();
      let ltv = "";
      if (startD) {
        const diffDays = Math.round((exitD.getTime() - startD.getTime()) / (1e3 * 60 * 60 * 24));
        ltv = String(diffDays);
      }
      const exitDateStr = exitD.toISOString().split("T")[0];
      const startDateStr = startD ? startD.toISOString().split("T")[0] : null;
      const reasonsStr = Array.isArray(exit_reasons) ? exit_reasons.join(", ") : exit_reasons || "";
      await pool.query(
        `INSERT INTO churn ("CLIENTE", "day_exit", "Evitavel - inevitavel", "gestor", "LTV", "SQUAD", "Motivo de sa\xEDda", "day", "comments")
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
      const reasonsStr = Array.isArray(exit_reasons) ? exit_reasons.join(", ") : exit_reasons || "";
      await pool.query(
        `UPDATE churn SET "Evitavel - inevitavel" = $1, "Motivo de sa\xEDda" = $2, "comments" = $3 WHERE id = $4`,
        [churn_type || null, reasonsStr || null, comments || null, id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating churn:", err);
      res.status(500).json({ error: "Failed to update churn" });
    }
  });
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
      const params = [];
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
    const { item, order_index, block } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO crm_checklist_template (item, order_index, block) VALUES ($1, $2, $3) RETURNING *",
        [item, order_index, block || "diretoria"]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error adding checklist template item:", err);
      res.status(500).json({ error: "Failed to add checklist template item" });
    }
  });
  app.patch("/api/crm-checklist-template/:id", async (req, res) => {
    const { id } = req.params;
    const { item, order_index, active, block, notes } = req.body;
    try {
      const updates = [];
      const values = [];
      let paramCount = 1;
      if (item !== void 0) {
        updates.push(`item = $${paramCount}`);
        values.push(item);
        paramCount++;
      }
      if (order_index !== void 0) {
        updates.push(`order_index = $${paramCount}`);
        values.push(order_index);
        paramCount++;
      }
      if (active !== void 0) {
        updates.push(`active = $${paramCount}`);
        values.push(active);
        paramCount++;
      }
      if (block !== void 0) {
        updates.push(`block = $${paramCount}`);
        values.push(block);
        paramCount++;
      }
      if (notes !== void 0) {
        updates.push(`notes = $${paramCount}`);
        values.push(notes);
        paramCount++;
      }
      if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
      values.push(id);
      const query = `UPDATE crm_checklist_template SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`;
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
    const { client_id, item, block, notes } = req.body;
    try {
      const result = await pool.query(
        "INSERT INTO crm_checklist (client_id, item, block, notes) VALUES ($1, $2, $3, $4) RETURNING *",
        [client_id, item, block || "diretoria", notes || null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating crm_checklist item:", err);
      res.status(500).json({ error: "Failed to create checklist item" });
    }
  });
  app.patch("/api/crm-checklist/:id", async (req, res) => {
    const { id } = req.params;
    const { completed, completed_by, completed_at, block, item, notes } = req.body;
    try {
      const updates = [];
      const values = [];
      let p = 1;
      if (completed !== void 0) {
        updates.push(`completed = $${p++}`);
        values.push(completed);
      }
      if (completed_by !== void 0) {
        updates.push(`completed_by = $${p++}`);
        values.push(completed_by);
      }
      if (completed_at !== void 0) {
        updates.push(`completed_at = $${p++}`);
        values.push(completed_at);
      }
      if (block !== void 0) {
        updates.push(`block = $${p++}`);
        values.push(block);
      }
      if (item !== void 0) {
        updates.push(`item = $${p++}`);
        values.push(item);
      }
      if (notes !== void 0) {
        updates.push(`notes = $${p++}`);
        values.push(notes);
      }
      if (updates.length === 0) return res.status(400).json({ error: "No fields" });
      values.push(id);
      const result = await pool.query(`UPDATE crm_checklist SET ${updates.join(", ")} WHERE id = $${p} RETURNING *`, values);
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating crm_checklist item:", err);
      res.status(500).json({ error: "Failed to update checklist item" });
    }
  });
  app.delete("/api/crm-checklist/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM crm_checklist WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Error deleting checklist item:", err);
      res.status(500).json({ error: "Failed to delete checklist item" });
    }
  });
  app.post("/api/crm-checklist/apply-template/:client_id", async (req, res) => {
    const { client_id } = req.params;
    try {
      await pool.query("DELETE FROM crm_checklist WHERE client_id = $1", [client_id]);
      const tmpl = await pool.query("SELECT * FROM crm_checklist_template WHERE active = TRUE ORDER BY order_index ASC");
      const created = [];
      for (const t of tmpl.rows) {
        const result = await pool.query(
          "INSERT INTO crm_checklist (client_id, item, block, notes) VALUES ($1, $2, $3, $4) RETURNING *",
          [client_id, t.item, t.block || "diretoria", t.notes || null]
        );
        created.push(result.rows[0]);
      }
      res.json(created);
    } catch (err) {
      console.error("Error applying template to client:", err);
      res.status(500).json({ error: "Failed to apply template" });
    }
  });
  app.get("/api/financeiro/resumo", async (req, res) => {
    try {
      const mes = req.query.mes || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy, fm] = mes.split("-").map(Number);
      const fn = fm === 12 ? 1 : fm + 1;
      const ny = fm === 12 ? fy + 1 : fy;
      const fim = `${ny}-${String(fn).padStart(2, "0")}-01`;
      let saldo_caixa = 0;
      const balanceData = await asaasFetch("/finance/balance");
      if (balanceData?.balance !== void 0) {
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
      const entradasRes = await pool.query(`
        SELECT COALESCE(SUM(value), 0) AS total
        FROM fin_receivables
        WHERE due_date >= $1 AND due_date < $2
          AND (
            status IN ('Confirmado', 'CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH')
            OR (raw_json->>'anticipated')::boolean = true
          )
      `, [inicio, fim]);
      const recebido = parseFloat(entradasRes.rows[0].total);
      const saidasRes = await pool.query(`
        SELECT COALESCE(SUM(value), 0) AS total
        FROM fin_movements_asaas
        WHERE transaction_date >= $1 AND transaction_date < $2
          AND type = -1 AND account = 'asaas' AND is_anticipation_pair = false
          AND transaction_type != 'RECEIVABLE_ANTICIPATION_DEBIT'
      `, [inicio, fim]);
      const pago = parseFloat(saidasRes.rows[0].total);
      const aReceberRes = await pool.query(`
        SELECT COALESCE(SUM(value), 0) AS total
        FROM fin_receivables
        WHERE due_date >= $1 AND due_date < $2
          AND status IN ('Pendente', 'PENDING')
          AND COALESCE((raw_json->>'anticipated')::boolean, false) = false
      `, [inicio, fim]);
      const a_receber = parseFloat(aReceberRes.rows[0].total);
      const aPagarRes = await pool.query(`
        SELECT COALESCE(SUM(fp.value), 0) AS total
        FROM fin_payables fp
        WHERE fp.due_date >= $1 AND fp.due_date < $2
          AND fp.status = 'Pendente'
          AND NOT EXISTS (
            SELECT 1 FROM fin_movements_asaas m
            WHERE m.type = -1
              AND m.account = 'asaas'
              AND ABS(m.value - fp.value) / NULLIF(fp.value, 0) < 0.05
              AND m.transaction_date BETWEEN fp.due_date - INTERVAL '3 days'
                                        AND fp.due_date + INTERVAL '3 days'
          )
      `, [inicio, fim]);
      const a_pagar = parseFloat(aPagarRes.rows[0].total);
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
        distribuicao: "0",
        despesas_previstas: String(a_pagar)
      });
    } catch (err) {
      console.error("Error fetching financeiro resumo:", err);
      res.status(500).json({ error: "Failed" });
    }
  });
  app.get("/api/financeiro/fluxo-diario", async (req, res) => {
    try {
      const mes = req.query.mes || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy2, fm2] = mes.split("-").map(Number);
      const fn2 = fm2 === 12 ? 1 : fm2 + 1;
      const ny2 = fm2 === 12 ? fy2 + 1 : fy2;
      const fim = `${ny2}-${String(fn2).padStart(2, "0")}-01`;
      let saldoAtual = 0;
      const balData = await asaasFetch("/finance/balance");
      if (balData?.balance !== void 0) {
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
      const netAposRes = await pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 1 THEN value ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN type = -1 THEN value ELSE 0 END), 0) AS net
        FROM fin_movements_asaas
        WHERE account = 'asaas' AND transaction_date >= $1
      `, [fim]);
      const netAposMes = parseFloat(netAposRes.rows[0].net);
      const netMesRes = await pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 1 THEN value ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN type = -1 THEN value ELSE 0 END), 0) AS net
        FROM fin_movements_asaas
        WHERE account = 'asaas'
          AND transaction_date >= $1 AND transaction_date < $2
      `, [inicio, fim]);
      const netMes = parseFloat(netMesRes.rows[0].net);
      let saldoAnterior = saldoAtual - netMes - netAposMes;
      const todayIso = new Date((/* @__PURE__ */ new Date()).getTime() - (/* @__PURE__ */ new Date()).getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
      if (inicio > todayIso) {
        const prevEntAteInicioRes = await pool.query(`
          SELECT COALESCE(SUM(value), 0) as val
          FROM fin_receivables
          WHERE due_date >= $1 AND due_date < $2 AND status IN ('Pendente', 'PENDING')
        `, [todayIso, inicio]);
        const prevSaiAteInicioRes = await pool.query(`
          SELECT COALESCE(SUM(fp.value), 0) as val
          FROM fin_payables fp
          WHERE fp.due_date >= $1 AND fp.due_date < $2 AND fp.status = 'Pendente'
            AND NOT EXISTS (
              SELECT 1 FROM fin_movements_asaas m
              WHERE m.type = -1 AND m.account = 'asaas'
                AND ABS(m.value - fp.value) / NULLIF(fp.value, 0) < 0.05
                AND m.transaction_date BETWEEN fp.due_date - INTERVAL '3 days' AND fp.due_date + INTERVAL '3 days'
            )
        `, [todayIso, inicio]);
        saldoAnterior += parseFloat(prevEntAteInicioRes.rows[0].val) - parseFloat(prevSaiAteInicioRes.rows[0].val);
      }
      const realizadoRes = await pool.query(`
        SELECT
          TO_CHAR(transaction_date, 'DD/MM') AS dia,
          EXTRACT(DAY FROM transaction_date) AS dia_numero,
          COALESCE(SUM(CASE WHEN type = 1  AND is_anticipation_pair = false THEN value ELSE 0 END), 0) AS entradas_realizadas,
          COALESCE(SUM(CASE WHEN type = -1 AND is_anticipation_pair = false THEN value ELSE 0 END), 0) AS saidas_realizadas
        FROM fin_movements_asaas
        WHERE account = 'asaas'
          AND transaction_date >= $1 AND transaction_date < $2
          AND LOWER(COALESCE(custom_category, '')) NOT IN ('transferencia entre contas', 'transfer\xEAncia entre contas')
        GROUP BY transaction_date
        ORDER BY transaction_date
      `, [inicio, fim]);
      const prevEntRes = await pool.query(`
        SELECT TO_CHAR(due_date, 'DD/MM') AS dia,
               COALESCE(SUM(value), 0) AS entradas_previstas
        FROM fin_receivables
        WHERE due_date >= $1 AND due_date < $2
          AND status IN ('Pendente', 'PENDING')
        GROUP BY due_date
      `, [inicio, fim]);
      const prevSaiRes = await pool.query(`
        SELECT TO_CHAR(fp.due_date, 'DD/MM') AS dia,
               COALESCE(SUM(fp.value), 0) AS saidas_previstas
        FROM fin_payables fp
        WHERE fp.due_date >= $1 AND fp.due_date < $2
          AND fp.status = 'Pendente'
          AND NOT EXISTS (
            SELECT 1 FROM fin_movements_asaas m
            WHERE m.type = -1
              AND m.account = 'asaas'
              AND ABS(m.value - fp.value) / NULLIF(fp.value, 0) < 0.05
              AND m.transaction_date BETWEEN fp.due_date - INTERVAL '3 days'
                                        AND fp.due_date + INTERVAL '3 days'
          )
        GROUP BY fp.due_date
      `, [inicio, fim]);
      const dayMap = {};
      for (const r of realizadoRes.rows) {
        dayMap[r.dia] = { dia: r.dia, dia_numero: parseInt(r.dia_numero), entradas_realizadas: parseFloat(r.entradas_realizadas), saidas_realizadas: parseFloat(r.saidas_realizadas), entradas_previstas: 0, saidas_previstas: 0, tem_realizado: true };
      }
      for (const p of prevEntRes.rows) {
        if (!dayMap[p.dia]) dayMap[p.dia] = { dia: p.dia, dia_numero: parseInt(p.dia.split("/")[0]), entradas_realizadas: 0, saidas_realizadas: 0, entradas_previstas: 0, saidas_previstas: 0, tem_realizado: false };
        dayMap[p.dia].entradas_previstas = parseFloat(p.entradas_previstas);
      }
      for (const p of prevSaiRes.rows) {
        if (!dayMap[p.dia]) dayMap[p.dia] = { dia: p.dia, dia_numero: parseInt(p.dia.split("/")[0]), entradas_realizadas: 0, saidas_realizadas: 0, entradas_previstas: 0, saidas_previstas: 0, tem_realizado: false };
        dayMap[p.dia].saidas_previstas = parseFloat(p.saidas_previstas);
      }
      const diario = Object.values(dayMap).sort((a, b) => a.dia_numero - b.dia_numero);
      res.json({ saldo_anterior: saldoAnterior, diario });
    } catch (err) {
      console.error("Error fetching fluxo diario:", err);
      res.status(500).json({ error: "Failed" });
    }
  });
  app.get("/api/financeiro/fluxo-semanal", async (req, res) => {
    try {
      const mes = req.query.mes || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
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
  app.get("/api/financeiro/clientes-recentes", async (req, res) => {
    try {
      const mes = req.query.mes || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy3, fm3] = mes.split("-").map(Number);
      const fn3 = fm3 === 12 ? 1 : fm3 + 1;
      const ny3 = fm3 === 12 ? fy3 + 1 : fy3;
      const fim = `${ny3}-${String(fn3).padStart(2, "0")}-01`;
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
  app.get("/api/financeiro/previsto", async (req, res) => {
    try {
      const mes = req.query.mes || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy4, fm4] = mes.split("-").map(Number);
      const fn4 = fm4 === 12 ? 1 : fm4 + 1;
      const ny4 = fm4 === 12 ? fy4 + 1 : fy4;
      const fim = `${ny4}-${String(fn4).padStart(2, "0")}-01`;
      const recRes = await pool.query(`
        SELECT COALESCE(SUM(value), 0) AS total
        FROM fin_receivables
        WHERE due_date >= $1 AND due_date < $2
          AND status IN ('Pendente', 'PENDING')
      `, [inicio, fim]);
      const entradas_previstas = parseFloat(recRes.rows[0].total);
      const pagRes = await pool.query(`
        SELECT COALESCE(SUM(fp.value), 0) AS total
        FROM fin_payables fp
        WHERE fp.due_date >= $1 AND fp.due_date < $2
          AND fp.status = 'Pendente'
          AND NOT EXISTS (
            SELECT 1 FROM fin_movements_asaas m
            WHERE m.type = -1
              AND m.account = 'asaas'
              AND ABS(m.value - fp.value) / NULLIF(fp.value, 0) < 0.05
              AND m.transaction_date BETWEEN fp.due_date - INTERVAL '3 days'
                                        AND fp.due_date + INTERVAL '3 days'
          )
      `, [inicio, fim]);
      const despesas_previstas = parseFloat(pagRes.rows[0].total);
      res.json({
        entradas_previstas: String(entradas_previstas),
        despesas_previstas: String(despesas_previstas),
        saldo_projetado: String(entradas_previstas - despesas_previstas)
      });
    } catch (err) {
      console.error("Error fetching previsto:", err);
      res.status(500).json({ error: "Failed" });
    }
  });
  app.get("/api/financeiro/despesas", async (req, res) => {
    try {
      const mes = req.query.mes || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy5, fm5] = mes.split("-").map(Number);
      const fn5 = fm5 === 12 ? 1 : fm5 + 1;
      const ny5 = fm5 === 12 ? fy5 + 1 : fy5;
      const fim = `${ny5}-${String(fn5).padStart(2, "0")}-01`;
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
  app.get("/api/fin-payables", async (req, res) => {
    try {
      const tab = req.query.tab || "contas";
      const accountName = tab === "sicredi" ? "Sicredi" : "Asaas";
      const getYYYYMMDD = (d) => {
        if (!d) return "";
        if (d instanceof Date) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        }
        return String(d).slice(0, 10);
      };
      const now = /* @__PURE__ */ new Date();
      let startDate;
      let endDate;
      if (req.query.month) {
        const m = req.query.month;
        const [y, mo] = m.split("-").map(Number);
        startDate = `${m}-01`;
        const lastDay = new Date(y, mo, 0).getDate();
        endDate = `${y}-${String(mo).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      } else {
        const startY = now.getFullYear();
        const startM = now.getMonth() + 1;
        startDate = `${startY}-${String(startM).padStart(2, "0")}-01`;
        const tempDate = new Date(startY, startM + 3, 0);
        const lastDay = tempDate.getDate();
        const y = tempDate.getFullYear();
        const mo = tempDate.getMonth() + 1;
        endDate = `${y}-${String(mo).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      }
      const result = await pool.query(
        `SELECT * FROM fin_payables
         WHERE account_name = $1
           AND due_date >= $2::date
           AND due_date <= $3::date
         ORDER BY due_date ASC`,
        [accountName, startDate, endDate]
      );
      const items = result.rows;
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const in7Days = new Date(today);
      in7Days.setDate(in7Days.getDate() + 7);
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      let vence7dias = 0;
      let totalPrevisto = 0;
      let totalMesAtual = 0;
      for (const item of items) {
        const val = parseFloat(item.value) || 0;
        totalPrevisto += val;
        const dateStr = getYYYYMMDD(item.due_date);
        const dd = /* @__PURE__ */ new Date(dateStr + "T12:00:00");
        dd.setHours(0, 0, 0, 0);
        if (dd >= today && dd <= in7Days) vence7dias += val;
        const itemMonth = dateStr.slice(0, 7);
        if (itemMonth === currentMonthKey) totalMesAtual += val;
      }
      const MESES = ["Janeiro", "Fevereiro", "Mar\xE7o", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const itemsByMonth = {};
      for (const item of items) {
        const dateStr = getYYYYMMDD(item.due_date);
        const [y, mo] = dateStr.split("-").map(Number);
        const key = dateStr.slice(0, 7);
        if (!itemsByMonth[key]) {
          itemsByMonth[key] = { label: `${MESES[mo - 1]} ${y}`, total: 0, items: [] };
        }
        const val = parseFloat(item.value) || 0;
        itemsByMonth[key].total += val;
        item.due_date = dateStr;
        if (item.payment_date) item.payment_date = getYYYYMMDD(item.payment_date);
        if (item.generation_date) item.generation_date = getYYYYMMDD(item.generation_date);
        itemsByMonth[key].items.push(item);
      }
      res.json({
        summary: {
          vence_7_dias: vence7dias,
          total_previsto: totalPrevisto,
          total_mes_atual: totalMesAtual,
          total_items: items.length
        },
        items_by_month: itemsByMonth
      });
    } catch (err) {
      console.error("Error fetching fin_payables:", err);
      res.status(500).json({ error: "Failed to fetch payables" });
    }
  });
  app.get("/api/fin-payables/categories", async (req, res) => {
    try {
      const tab = req.query.tab || "contas";
      const accountName = tab === "sicredi" ? "Sicredi" : "Asaas";
      const now = /* @__PURE__ */ new Date();
      let startDate;
      let endDate;
      if (req.query.month) {
        const m = req.query.month;
        const [y, mo] = m.split("-").map(Number);
        startDate = `${m}-01`;
        const lastDay = new Date(y, mo, 0).getDate();
        endDate = `${y}-${String(mo).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      } else {
        const startY = now.getFullYear();
        const startM = now.getMonth() + 1;
        startDate = `${startY}-${String(startM).padStart(2, "0")}-01`;
        const tempDate = new Date(startY, startM + 3, 0);
        const lastDay = tempDate.getDate();
        const y = tempDate.getFullYear();
        const mo = tempDate.getMonth() + 1;
        endDate = `${y}-${String(mo).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      }
      const result = await pool.query(
        `SELECT
           category_l2_desc,
           COUNT(*)::int as count,
           SUM(value)::numeric as total
         FROM fin_payables
         WHERE account_name = $1
           AND due_date >= $2::date
           AND due_date <= $3::date
         GROUP BY category_l2_desc
         ORDER BY total DESC`,
        [accountName, startDate, endDate]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching fin_payables categories:", err);
      res.status(500).json({ error: "Failed" });
    }
  });
  app.get("/api/financeiro/contas-a-pagar", (_req, res) => {
    res.status(410).json({ error: "Deprecated. Use /api/fin-payables instead." });
  });
  app.get("/api/financeiro/contas-a-pagar/sicredi", (_req, res) => {
    res.status(410).json({ error: "Deprecated. Use /api/fin-payables?tab=sicredi instead." });
  });
  app.post("/api/financeiro/contas-a-pagar/sicredi/pagar", (_req, res) => {
    res.status(410).json({ error: "Deprecated." });
  });
  app.get("/api/financeiro/recorrentes/bills", (_req, res) => {
    res.status(410).json({ error: "Deprecated." });
  });
  app.get("/api/growth-planning", async (req, res) => {
    try {
      const year = parseInt(req.query.year, 10) || 2026;
      const projResult = await pool.query(
        "SELECT * FROM growth_projections WHERE year = $1 ORDER BY month ASC",
        [year]
      );
      const realResult = await pool.query(
        "SELECT * FROM growth_realized WHERE year = $1 ORDER BY month ASC",
        [year]
      );
      res.json({
        projections: projResult.rows,
        realized: realResult.rows
      });
    } catch (err) {
      console.error("Error fetching growth planning data:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/growth-planning/projections", async (req, res) => {
    try {
      const {
        year,
        month,
        initial_clients,
        churn_rate,
        churn_count,
        new_clients,
        traffic_budget,
        cac
      } = req.body;
      if (!year || !month) {
        return res.status(400).json({ error: "Ano e M\xEAs s\xE3o campos obrigat\xF3rios." });
      }
      await pool.query(
        `INSERT INTO growth_projections (year, month, initial_clients, churn_rate, churn_count, new_clients, traffic_budget, cac, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (year, month) DO UPDATE SET
           initial_clients = EXCLUDED.initial_clients,
           churn_rate = EXCLUDED.churn_rate,
           churn_count = EXCLUDED.churn_count,
           new_clients = EXCLUDED.new_clients,
           traffic_budget = EXCLUDED.traffic_budget,
           cac = EXCLUDED.cac,
           updated_at = NOW()`,
        [
          parseInt(year, 10),
          parseInt(month, 10),
          parseInt(initial_clients, 10) || 0,
          parseFloat(churn_rate) || 0,
          parseInt(churn_count, 10) || 0,
          parseInt(new_clients, 10) || 0,
          parseFloat(traffic_budget) || 0,
          parseFloat(cac) || 0
        ]
      );
      res.json({ ok: true });
    } catch (err) {
      console.error("Error updating growth projections:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/growth-planning/realized", async (req, res) => {
    try {
      const {
        year,
        month,
        initial_clients,
        churn_rate,
        churn_count,
        new_clients,
        traffic_budget,
        cac
      } = req.body;
      if (!year || !month) {
        return res.status(400).json({ error: "Ano e M\xEAs s\xE3o campos obrigat\xF3rios." });
      }
      await pool.query(
        `INSERT INTO growth_realized (year, month, initial_clients, churn_rate, churn_count, new_clients, traffic_budget, cac, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (year, month) DO UPDATE SET
           initial_clients = EXCLUDED.initial_clients,
           churn_rate = EXCLUDED.churn_rate,
           churn_count = EXCLUDED.churn_count,
           new_clients = EXCLUDED.new_clients,
           traffic_budget = EXCLUDED.traffic_budget,
           cac = EXCLUDED.cac,
           updated_at = NOW()`,
        [
          parseInt(year, 10),
          parseInt(month, 10),
          parseInt(initial_clients, 10) || 0,
          parseFloat(churn_rate) || 0,
          parseInt(churn_count, 10) || 0,
          parseInt(new_clients, 10) || 0,
          parseFloat(traffic_budget) || 0,
          parseFloat(cac) || 0
        ]
      );
      res.json({ ok: true });
    } catch (err) {
      console.error("Error updating growth realized data:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/financeiro/recorrentes/entries", (_req, res) => {
    res.status(410).json({ error: "Deprecated." });
  });
  app.get("/api/fin-receivables", async (req, res) => {
    try {
      const mes = req.query.month || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy, fm] = mes.split("-").map(Number);
      const fn = fm === 12 ? 1 : fm + 1;
      const ny = fm === 12 ? fy + 1 : fy;
      const fim = `${ny}-${String(fn).padStart(2, "0")}-01`;
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
          r.invoice_url,
          r.raw_json
        FROM fin_receivables r
        LEFT JOIN fin_people p ON p.asaas_id = r.customer_id
        WHERE r.due_date >= $1 AND r.due_date < $2
          AND r.status IN ('Pendente', 'PENDING', 'OVERDUE')
        ORDER BY r.due_date ASC
      `, [inicio, fim]);
      const aReceber = aReceberResult.rows.filter((r) => r.raw_json?.anticipated !== true && r.raw_json?.anticipated !== "true");
      const pendentes = aReceber.filter((r) => r.status === "Pendente" || r.status === "PENDING");
      const vencidos = aReceber.filter((r) => r.status === "OVERDUE");
      const total_a_receber = aReceber.reduce((s, r) => s + parseFloat(r.value || "0"), 0);
      const recebidoResult = await pool.query(`
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
          r.invoice_url,
          r.raw_json->>'anticipated' AS anticipated
        FROM fin_receivables r
        LEFT JOIN fin_people p ON p.asaas_id = r.customer_id
        WHERE r.due_date >= $1 AND r.due_date < $2
          AND (
            r.status IN ('Confirmado', 'CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH')
            OR (r.raw_json->>'anticipated')::boolean = true
          )
        ORDER BY r.due_date ASC
      `, [inicio, fim]);
      const recebidos = recebidoResult.rows;
      const recebidas = recebidos.filter((r) => r.status === "RECEIVED" || r.status === "RECEIVED_IN_CASH");
      const confirmadas = recebidos.filter((r) => r.status === "CONFIRMED" || r.status === "Confirmado" || r.anticipated === "true");
      const total_recebidas = recebidas.reduce((s, r) => s + parseFloat(r.value || "0"), 0);
      const total_confirmadas = confirmadas.reduce((s, r) => s + parseFloat(r.value || "0"), 0);
      const total_recebido = total_recebidas + total_confirmadas;
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
      const total_antecipacoes = antecipacoes.reduce((s, r) => s + parseFloat(r.value || "0"), 0);
      const total_mes = total_recebido;
      res.json({
        summary: {
          total_recebido,
          total_recebidas,
          total_confirmadas,
          total_antecipacoes,
          total_a_receber,
          total_mes
        },
        a_receber: {
          pendentes,
          vencidos
        },
        recebidos,
        recebidas,
        confirmadas,
        antecipacoes
      });
    } catch (err) {
      console.error("Error fetching fin-receivables:", err);
      res.status(500).json({ error: "Failed" });
    }
  });
  app.get("/api/fin/inadimplentes", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          r.customer_id,
          COALESCE(p.name, r.customer_name) AS customer_name,
          p.phone,
          p.cnpjcpf,
          p.email,
          -- Link GrapeHub client if any
          c.id AS client_id,
          c.name AS client_name_internal,
          c.squad,
          -- Aggregated data
          COUNT(r.id) AS total_charges,
          SUM(r.value::numeric) AS total_value,
          MIN(r.due_date) AS oldest_due_date,
          MAX(r.due_date) AS latest_due_date,
          (CURRENT_DATE - MIN(r.due_date)) AS max_days_overdue,
          -- Raw charges as JSON
          json_agg(json_build_object(
            'id', r.id,
            'asaas_id', r.asaas_id,
            'value', r.value,
            'due_date', r.due_date,
            'billing_type', r.billing_type,
            'status', r.status,
            'description', r.description,
            'invoice_url', r.invoice_url
          ) ORDER BY r.due_date ASC) AS charges
        FROM fin_receivables r
        LEFT JOIN fin_people p ON p.asaas_id = r.customer_id
        LEFT JOIN clients c ON c.id = p.grapehub_client_id
        WHERE r.status = 'OVERDUE'
        GROUP BY r.customer_id, p.name, r.customer_name, p.phone, p.cnpjcpf, p.email, c.id, c.name, c.squad
        ORDER BY max_days_overdue DESC, total_value DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching inadimplentes:", err);
      res.status(500).json({ error: "Failed to fetch inadimplentes" });
    }
  });
  app.get("/api/financeiro/receitas", async (req, res) => {
    try {
      const mes = req.query.mes || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const inicio = `${mes}-01`;
      const [fy6, fm6] = mes.split("-").map(Number);
      const fn6 = fm6 === 12 ? 1 : fm6 + 1;
      const ny6 = fm6 === 12 ? fy6 + 1 : fy6;
      const fim = `${ny6}-${String(fn6).padStart(2, "0")}-01`;
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
  app.get("/api/financeiro/previsto-dia", async (req, res) => {
    try {
      const dia = req.query.dia;
      if (!dia) return res.status(400).json({ error: "dia obrigat\xF3rio" });
      const recRes = await pool.query(`
        SELECT
          r.id,
          r.description,
          r.value,
          r.due_date,
          COALESCE(p.name, r.customer_name, '') AS person_name
        FROM fin_receivables r
        LEFT JOIN fin_people p ON p.asaas_id = r.customer_id
        WHERE r.due_date = $1
          AND r.status IN ('Pendente', 'PENDING')
        ORDER BY r.value DESC
      `, [dia]);
      const pagRes = await pool.query(`
        SELECT
          fp.id,
          fp.description,
          fp.value,
          fp.due_date,
          COALESCE(fp.supplier_fantasy_name, fp.supplier_name, '') AS person_name
        FROM fin_payables fp
        WHERE fp.due_date = $1
          AND fp.status = 'Pendente'
          AND NOT EXISTS (
            SELECT 1 FROM fin_movements_asaas m
            WHERE m.type = -1
              AND m.account = 'asaas'
              AND ABS(m.value - fp.value) / NULLIF(fp.value, 0) < 0.05
              AND m.transaction_date BETWEEN fp.due_date - INTERVAL '3 days'
                                        AND fp.due_date + INTERVAL '3 days'
          )
        ORDER BY fp.value DESC
      `, [dia]);
      const recebimentos = recRes.rows.map((r) => ({
        id: r.id,
        description: r.description || "A receber",
        value: parseFloat(r.value),
        due_date: r.due_date,
        person_name: r.person_name || null,
        type: 1,
        type_column: "previsto",
        status: "Previsto"
      }));
      const pagamentos = pagRes.rows.map((r) => ({
        id: r.id,
        description: r.description || "Provis\xE3o",
        value: parseFloat(r.value),
        due_date: r.due_date,
        person_name: r.person_name || null,
        type: -1,
        type_column: "previsto",
        status: "Previsto"
      }));
      res.json({ recebimentos, pagamentos });
    } catch (err) {
      console.error("Error fetching previsto-dia:", err);
      res.status(500).json({ error: "Failed" });
    }
  });
  app.get("/api/financeiro/extrato", async (req, res) => {
    try {
      let inicio;
      let fim;
      if (req.query.start && req.query.end) {
        inicio = req.query.start;
        const endDate = new Date(req.query.end);
        endDate.setDate(endDate.getDate() + 1);
        fim = endDate.toISOString().slice(0, 10);
      } else {
        const mes = req.query.mes || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
        inicio = `${mes}-01`;
        const [fy, fm] = mes.split("-").map(Number);
        const fn = fm === 12 ? 1 : fm + 1;
        const ny = fm === 12 ? fy + 1 : fy;
        fim = `${ny}-${String(fn).padStart(2, "0")}-01`;
      }
      const TRANSACTION_LABELS = {
        "PAYMENT_RECEIVED": "Cobran\xE7a Recebida",
        "PAYMENT_FEE": "Despesas Financeiras",
        "TRANSFER": "Transfer\xEAncia",
        "BILL_PAYMENT": "Pagamento de Conta",
        "RECEIVABLE_ANTICIPATION_GROSS_CREDIT": "Antecipa\xE7\xE3o Receb\xEDvel",
        "RECEIVABLE_ANTICIPATION_DEBIT": "Antecipa\xE7\xE3o D\xE9bito",
        "PAYMENT_REVERSAL": "Estorno"
      };
      const queryParams = [inicio, fim];
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
          custom_category_id,
          user_comment,
          edited_at,
          edited_by,
          is_anticipation_pair,
          account,
          COALESCE(custom_description, description) AS display_description,
          COALESCE(custom_category, grapehub_category) AS display_category
        FROM fin_movements_asaas
        WHERE account = 'asaas'
          AND transaction_date >= $1 AND transaction_date < $2
          AND LOWER(COALESCE(custom_category, '')) NOT IN ('transferencia entre contas', 'transfer\xEAncia entre contas')
        ORDER BY transaction_date DESC, id DESC
      `, queryParams);
      const rows = result.rows.map((r) => {
        const val = Math.abs(parseFloat(r.value || "0"));
        const isEntrada = r.type === 1;
        const autoCategory = TRANSACTION_LABELS[r.transaction_type] || r.transaction_type;
        const catLabel = r.display_category || autoCategory;
        const desc = r.display_description || "";
        let personName = null;
        if (desc) {
          const match = desc.match(/\d+\s+(.+)$/);
          if (match) personName = match[1].trim();
          else {
            const dashIdx = desc.lastIndexOf(" - ");
            if (dashIdx >= 0) {
              const after = desc.slice(dashIdx + 3).trim();
              if (after && !/^fatura|^rec|^Taxa/i.test(after)) personName = after;
            }
          }
        }
        if (r.transaction_type === "TRANSFER" && desc) {
          const transferMatch = desc.match(/para\s+(.+)/i) || desc.match(/chave\s+para\s+(.+)/i);
          if (transferMatch) personName = transferMatch[1].trim();
        }
        const isEdited = !!r.custom_description;
        return {
          id: r.id,
          description: r.display_description || catLabel,
          original_description: r.description,
          custom_description: r.custom_description || null,
          movement_value: isEntrada ? val.toFixed(2) : (-val).toFixed(2),
          value: val.toFixed(2),
          movement_date: r.transaction_date,
          expiration_date: r.transaction_date,
          status: "Realizado",
          type_column: "realizado",
          source: r.transaction_type === "PAYMENT_RECEIVED" ? "bills_to_receive" : r.transaction_type === "BILL_PAYMENT" ? "bills_to_pay" : r.transaction_type === "TRANSFER" ? isEntrada ? "transfer_in" : "transfer_out" : r.transaction_type,
          type: isEntrada ? 1 : -1,
          payment_method: r.transaction_type === "PAYMENT_RECEIVED" ? "cobran\xE7a" : r.transaction_type === "TRANSFER" ? "transfer\xEAncia" : r.transaction_type === "BILL_PAYMENT" ? "pagamento" : r.transaction_type === "PAYMENT_FEE" ? "taxa" : "outros",
          document_code: r.asaas_id || "",
          grapehub_category: catLabel,
          custom_category: r.custom_category || null,
          raw_grapehub_category: r.display_category || null,
          // null when truly uncategorized in DB
          custom_category_id: r.custom_category_id || null,
          person_name: personName,
          person_fantasy_name: null,
          comments: r.user_comment || null,
          is_edited: isEdited,
          edited_at: r.edited_at || null,
          edited_by: r.edited_by || null,
          is_anticipation_pair: r.is_anticipation_pair || false,
          account: r.account || "asaas"
        };
      });
      res.json(rows);
    } catch (err) {
      console.error("Error fetching financeiro extrato:", err);
      res.status(500).json({ error: "Failed" });
    }
  });
  app.get("/api/financeiro/extrato/last-import", async (req, res) => {
    try {
      const account = req.query.account || "sicredi";
      const r = await pool.query(`SELECT MAX(synced_at) AS last_import FROM fin_movements_asaas WHERE account = $1`, [account]);
      res.json({ last_import: r.rows[0]?.last_import || null });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed" });
    }
  });
  app.post("/api/financeiro/extrato/importar-ofx", express.json({ limit: "15mb" }), async (req, res) => {
    try {
      const account = req.body.account || "sicredi";
      const billingMonth = req.body.billing_month || null;
      let content;
      let fileName;
      if (req.body.fileData) {
        const buf = Buffer.from(req.body.fileData, "base64");
        content = buf.toString("utf-8");
        fileName = (req.body.fileName || "import.ofx").toLowerCase();
      } else if (req.body.content) {
        content = req.body.content;
        fileName = (req.body.fileName || "import.ofx").toLowerCase();
      } else {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const isCSV = fileName.endsWith(".csv") || !fileName.endsWith(".ofx") && content.includes(";");
      const transactions = [];
      if (isCSV) {
        const lines = content.split(/\r?\n/);
        if (lines.length < 2) return res.status(400).json({ error: "CSV vazio ou inv\xE1lido" });
        const semiCount = (content.match(/;/g) || []).length;
        const commaCount = (content.match(/,/g) || []).length;
        const tabCount = (content.match(/\t/g) || []).length;
        const delimiter = tabCount > semiCount && tabCount > commaCount ? "	" : semiCount > commaCount ? ";" : ",";
        const normalize = (s) => s.trim().replace(/^["']|["']$/g, "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const parseBRValue = (str) => {
          if (!str) return 0;
          let s = str.replace(/["']/g, "").trim();
          if (!s || s === "-") return 0;
          s = s.replace(/^-?\s*[RU]\$\s*/i, (match) => match.startsWith("-") ? "-" : "");
          if (str.trim().startsWith("-")) s = "-" + s.replace("-", "");
          if (s.includes(",")) {
            s = s.replace(/\./g, "").replace(",", ".");
          }
          return parseFloat(s) || 0;
        };
        const parseBRDate = (str) => {
          if (!str) return null;
          const s = str.replace(/["']/g, "").trim();
          const brMatch = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
          if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, "0")}-${brMatch[1].padStart(2, "0")}`;
          const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
          const brShort = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);
          if (brShort) {
            const yr = parseInt(brShort[3]) > 50 ? `19${brShort[3]}` : `20${brShort[3]}`;
            return `${yr}-${brShort[2].padStart(2, "0")}-${brShort[1].padStart(2, "0")}`;
          }
          return null;
        };
        let currentCardLabel = "";
        let inTransactions = false;
        let dateCol = -1, descCol = -1, parcelaCol = -1, valorCol = -1;
        let rowIdx = 0;
        for (let i = 0; i < lines.length; i++) {
          const raw = lines[i];
          if (!raw.trim()) {
            inTransactions = false;
            continue;
          }
          const cols = raw.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
          if (normalize(cols[0]) === "cartao") {
            currentCardLabel = cols[1] || "";
            inTransactions = false;
            continue;
          }
          if (normalize(cols[0]) === "data" && cols.length >= 3) {
            dateCol = 0;
            descCol = -1;
            parcelaCol = -1;
            valorCol = -1;
            for (let c = 1; c < cols.length; c++) {
              const h = normalize(cols[c]);
              if (h.includes("descricao") || h.includes("historico")) descCol = c;
              else if (h.includes("parcela")) parcelaCol = c;
              else if (h === "valor" || h.includes("valor") && !h.includes("dolar")) valorCol = c;
            }
            if (descCol === -1) descCol = 1;
            if (valorCol === -1) valorCol = cols.length >= 4 ? 3 : 2;
            inTransactions = true;
            continue;
          }
          if (!inTransactions || dateCol === -1) continue;
          const dateStr = parseBRDate(cols[dateCol] || "");
          if (!dateStr) continue;
          const description = (descCol >= 0 ? cols[descCol] : "") || "Sem descri\xE7\xE3o";
          const parcela = parcelaCol >= 0 ? cols[parcelaCol] || "" : "";
          const amount = valorCol >= 0 ? parseBRValue(cols[valorCol]) : 0;
          if (amount === 0) continue;
          const descLower = description.toLowerCase();
          if (descLower.startsWith("pag fat") || descLower.startsWith("pagamento fatura") || descLower.includes("pag fat deb")) continue;
          const fullDesc = parcela ? `${description} ${parcela}` : description;
          const rawId = `${dateStr}_${fullDesc}_${amount.toFixed(2)}_${currentCardLabel}_${rowIdx}`;
          const fitid = crypto.createHash("md5").update(rawId).digest("hex").slice(0, 16);
          rowIdx++;
          const isPayment = amount < 0;
          transactions.push({
            fitid,
            trntype: isPayment ? "CREDIT" : "DEBIT",
            trnamt: isPayment ? Math.abs(amount) : -Math.abs(amount),
            // expenses = negative, payments = positive
            dtposted: dateStr,
            memo: fullDesc
          });
        }
      } else {
        const trnRegex = /<STMTTRN>[\s\S]*?<\/STMTTRN>/gi;
        const matches = content.match(trnRegex) || [];
        for (const block of matches) {
          const getTag = (tag) => {
            const xmlMatch = block.match(new RegExp(`<${tag}>([^<]+)</${tag}>`, "i"));
            if (xmlMatch) return xmlMatch[1].trim();
            const sgmlMatch = block.match(new RegExp(`<${tag}>(.+)`, "i"));
            return sgmlMatch ? sgmlMatch[1].trim() : "";
          };
          const fitid = getTag("FITID");
          const trntype = getTag("TRNTYPE");
          const trnamtStr = getTag("TRNAMT");
          const dtposted = getTag("DTPOSTED");
          const memo = getTag("MEMO") || getTag("NAME") || "Sem descri\xE7\xE3o";
          if (!fitid || !trnamtStr) continue;
          const trnamt = parseFloat(trnamtStr.replace(",", "."));
          const dateStr = dtposted.length >= 8 ? `${dtposted.slice(0, 4)}-${dtposted.slice(4, 6)}-${dtposted.slice(6, 8)}` : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
          transactions.push({ fitid, trntype, trnamt, dtposted: dateStr, memo });
        }
      }
      if (transactions.length === 0) {
        return res.status(400).json({ error: "Nenhuma transa\xE7\xE3o encontrada no arquivo. Verifique o formato." });
      }
      let inserted = 0;
      let skipped = 0;
      for (const tx of transactions) {
        const asaasId = `${account}_${tx.fitid}`;
        const type = tx.trnamt >= 0 ? 1 : -1;
        const value = Math.abs(tx.trnamt);
        const txType = tx.trntype || (type === 1 ? "CREDIT" : "DEBIT");
        const r = await pool.query(
          `INSERT INTO fin_movements_asaas (asaas_id, type, transaction_type, value, transaction_date, description, account, sicredi_status, billing_month, synced_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
           ON CONFLICT (asaas_id) DO UPDATE SET billing_month = COALESCE(EXCLUDED.billing_month, fin_movements_asaas.billing_month)
           RETURNING id, (xmax = 0) AS was_inserted`,
          [asaasId, type, txType, value, tx.dtposted, tx.memo, account, account === "sicredi" ? "pendente" : "realizado", billingMonth]
        );
        if (r.rows.length > 0 && r.rows[0].was_inserted) inserted++;
        else skipped++;
      }
      if (account === "sicredi" && billingMonth) {
        try {
          let billRes = await pool.query(
            `SELECT id FROM fin_recurring_bills WHERE LOWER(name) LIKE '%sicredi%' AND LOWER(name) LIKE '%cart%' LIMIT 1`
          );
          let billId;
          if (billRes.rows.length === 0) {
            const newBill = await pool.query(
              `INSERT INTO fin_recurring_bills (name, description, due_day, is_active, default_value)
               VALUES ('Cart\xE3o Sicredi', 'Fatura do cart\xE3o de cr\xE9dito Sicredi', 18, true, 0) RETURNING id`
            );
            billId = newBill.rows[0].id;
          } else {
            billId = billRes.rows[0].id;
          }
          const totalRes = await pool.query(
            `SELECT COALESCE(SUM(ABS(value::numeric)), 0) AS total
             FROM fin_movements_asaas
             WHERE account = 'sicredi' AND billing_month = $1`,
            [billingMonth]
          );
          const faturaTotal = parseFloat(totalRes.rows[0].total) || 0;
          const statusRes = await pool.query(
            `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE sicredi_status = 'realizado') AS paid
             FROM fin_movements_asaas WHERE account = 'sicredi' AND billing_month = $1`,
            [billingMonth]
          );
          const allPaid = statusRes.rows[0].total > 0 && statusRes.rows[0].total === statusRes.rows[0].paid;
          const refMonth = billingMonth + "-01";
          const [bY, bM] = billingMonth.split("-").map(Number);
          const dueDate = `${bY}-${String(bM).padStart(2, "0")}-18`;
          const existingEntry = await pool.query(
            `SELECT id, status FROM fin_recurring_bill_entries WHERE recurring_bill_id = $1 AND reference_month = $2`,
            [billId, refMonth]
          );
          if (existingEntry.rows.length > 0) {
            const entry = existingEntry.rows[0];
            if (entry.status !== "paid") {
              await pool.query(
                `UPDATE fin_recurring_bill_entries SET expected_value = $1, updated_at = NOW() WHERE id = $2`,
                [faturaTotal, entry.id]
              );
            }
          } else {
            await pool.query(
              `INSERT INTO fin_recurring_bill_entries (recurring_bill_id, reference_month, expected_value, actual_value, due_date, source, status)
               VALUES ($1, $2, $3, 0, $4, 'manual', 'pending')`,
              [billId, refMonth, faturaTotal, dueDate]
            );
          }
        } catch (provErr) {
          console.error("Auto-provision Sicredi error (non-fatal):", provErr.message);
        }
      }
      res.json({ inserted, skipped, total: transactions.length });
    } catch (err) {
      console.error("Import error:", err.message);
      res.status(500).json({ error: "Failed to import file", detail: err.message });
    }
  });
  app.patch("/api/financeiro/extrato/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { custom_description, custom_category, custom_category_id, user_comment, edited_by } = req.body;
      const setClauses = [];
      const values = [];
      let paramIdx = 1;
      if (custom_description !== void 0) {
        setClauses.push(`custom_description = $${paramIdx++}`);
        values.push(custom_description || null);
      }
      if (custom_category !== void 0) {
        setClauses.push(`custom_category = $${paramIdx++}`);
        values.push(custom_category || null);
        setClauses.push(`grapehub_category = $${paramIdx++}`);
        values.push(custom_category || null);
      }
      if (custom_category_id !== void 0) {
        setClauses.push(`custom_category_id = $${paramIdx++}`);
        values.push(custom_category_id || null);
      }
      if (user_comment !== void 0) {
        setClauses.push(`user_comment = $${paramIdx++}`);
        values.push(user_comment || null);
        setClauses.push(`comments = $${paramIdx++}`);
        values.push(user_comment || null);
      }
      if (setClauses.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }
      setClauses.push(`edited_at = NOW()`);
      if (edited_by) {
        setClauses.push(`edited_by = $${paramIdx++}`);
        values.push(edited_by);
      }
      values.push(id);
      const result = await pool.query(
        `UPDATE fin_movements_asaas SET ${setClauses.join(", ")} WHERE id = $${paramIdx} RETURNING id, custom_description, custom_category, custom_category_id, user_comment, edited_at, edited_by`,
        values
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Movement not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating movement:", err);
      res.status(500).json({ error: "Failed to update" });
    }
  });
  app.patch("/api/financeiro/extrato/:id/category", async (req, res) => {
    try {
      const { id } = req.params;
      const { category } = req.body;
      const result = await pool.query(
        "UPDATE fin_movements_asaas SET custom_category = $1, grapehub_category = $1, edited_at = NOW() WHERE id = $2 RETURNING id, custom_category",
        [category || null, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Movement not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating category:", err);
      res.status(500).json({ error: "Failed to update category" });
    }
  });
  app.get("/api/fin-categories", async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT id, external_id, structure, description, level FROM fin_categories ORDER BY structure ASC"
      );
      const all = result.rows;
      const tree = [];
      const mapL1 = {};
      const mapL2 = {};
      for (const row of all) {
        const node = { ...row, children: [] };
        const parts = row.structure.split(".");
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
  app.post("/api/fin-categories", async (req, res) => {
    try {
      const { parent_structure, description } = req.body;
      if (!parent_structure || !description) {
        return res.status(400).json({ error: "parent_structure and description required" });
      }
      const parentParts = parent_structure.split(".");
      const newLevel = parentParts.length + 1;
      if (newLevel > 3) {
        return res.status(400).json({ error: "Maximum 3 levels allowed" });
      }
      const siblings = await pool.query(
        `SELECT structure FROM fin_categories WHERE structure LIKE $1 AND level = $2`,
        [`${parent_structure}.%`, newLevel]
      );
      let nextCode;
      if (siblings.rowCount && siblings.rowCount > 0) {
        let maxNum = 0;
        for (const row of siblings.rows) {
          const parts = row.structure.split(".");
          const num = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
        const next = maxNum >= 99 ? maxNum + 1 : maxNum + 1;
        nextCode = next < 10 ? `0${next}` : String(next);
      } else {
        nextCode = "01";
      }
      const newStructure = `${parent_structure}.${nextCode}`;
      const maxId = await pool.query("SELECT COALESCE(MAX(external_id), 900000) + 1 AS next FROM fin_categories");
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
  app.patch("/api/fin-categories/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { description } = req.body;
      if (!description) return res.status(400).json({ error: "description required" });
      const result = await pool.query(
        "UPDATE fin_categories SET description = $1 WHERE id = $2 RETURNING *",
        [description, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Category not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating fin-category:", err);
      res.status(500).json({ error: "Failed to update" });
    }
  });
  app.post("/api/fin-categories/root", async (req, res) => {
    try {
      const { description } = req.body;
      if (!description) return res.status(400).json({ error: "description required" });
      const lastRoot = await pool.query(
        `SELECT structure FROM fin_categories WHERE level = 1 ORDER BY structure DESC LIMIT 1`
      );
      let nextCode;
      if (lastRoot.rowCount && lastRoot.rowCount > 0) {
        const lastNum = parseInt(lastRoot.rows[0].structure, 10);
        nextCode = String(lastNum + 1).padStart(2, "0");
      } else {
        nextCode = "01";
      }
      const maxId = await pool.query("SELECT COALESCE(MAX(external_id), 900000) + 1 AS next FROM fin_categories");
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
  app.get("/api/fin-reconciliation-rules", async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT r.*, c.structure AS category_structure FROM fin_reconciliation_rules r LEFT JOIN fin_categories c ON r.category_id = c.id ORDER BY r.priority ASC, r.created_at ASC"
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching reconciliation rules:", err);
      res.status(500).json({ error: "Failed" });
    }
  });
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
  app.post("/api/fin-reconciliation-rules", async (req, res) => {
    try {
      const { name, match_text, match_type, category_id, category_name, priority, created_by } = req.body;
      if (!name || !match_text) return res.status(400).json({ error: "name and match_text required" });
      const result = await pool.query(
        `INSERT INTO fin_reconciliation_rules (name, match_text, match_type, category_id, category_name, priority, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, match_text, match_type || "contains", category_id || null, category_name || null, priority || 0, created_by || null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error creating reconciliation rule:", err);
      res.status(500).json({ error: "Failed to create" });
    }
  });
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
      if (result.rowCount === 0) return res.status(404).json({ error: "Rule not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating reconciliation rule:", err);
      res.status(500).json({ error: "Failed to update" });
    }
  });
  app.delete("/api/fin-reconciliation-rules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query("DELETE FROM fin_reconciliation_rules WHERE id = $1 RETURNING id", [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: "Rule not found" });
      res.json({ deleted: true, id: parseInt(id) });
    } catch (err) {
      console.error("Error deleting reconciliation rule:", err);
      res.status(500).json({ error: "Failed to delete" });
    }
  });
  async function applyAnticipationPairing() {
    const resetResult = await pool.query(`
      UPDATE fin_movements_asaas
      SET is_anticipation_pair = false
      WHERE is_anticipation_pair = true
      RETURNING id
    `);
    const reset = resetResult.rowCount || 0;
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
            custom_category = 'Baixa da antecipa\xE7\xE3o Asaas',
            custom_category_id = 92,
            grapehub_category = 'Baixa da antecipa\xE7\xE3o Asaas',
            edited_at = NOW(),
            edited_by = 'conciliacao-auto'
        WHERE id IN ($1, $2)
          AND transaction_type != 'RECEIVABLE_ANTICIPATION'
        RETURNING id
      `, [pair.cobranca_id, pair.baixa_id]);
      updated += result.rowCount || 0;
    }
    const standaloneResult = await pool.query(`
      UPDATE fin_movements_asaas
      SET is_anticipation_pair = true,
          custom_category = 'Baixa da antecipa\xE7\xE3o Asaas',
          custom_category_id = 92,
          grapehub_category = 'Baixa da antecipa\xE7\xE3o Asaas',
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
  app.post("/api/fin-reconciliation-rules/apply-anticipation", async (_req, res) => {
    try {
      const result = await applyAnticipationPairing();
      res.json(result);
    } catch (err) {
      console.error("Error applying anticipation pairing:", err);
      res.status(500).json({ error: "Failed to apply anticipation pairing" });
    }
  });
  app.get("/api/financeiro/extrato/anticipation-stats", async (req, res) => {
    try {
      const start = req.query.start;
      const end = req.query.end;
      if (!start || !end) return res.status(400).json({ error: "start and end required" });
      const endDate = new Date(end);
      endDate.setDate(endDate.getDate() + 1);
      const fim = endDate.toISOString().slice(0, 10);
      const brutoResult = await pool.query(`
        SELECT COALESCE(SUM(ABS(value::numeric)), 0) as total, COUNT(*) as count
        FROM fin_movements_asaas
        WHERE description ILIKE 'Antecipacao%'
          AND type = 1
          AND transaction_date >= $1 AND transaction_date < $2
      `, [start, fim]);
      const taxasResult = await pool.query(`
        SELECT COALESCE(SUM(ABS(value::numeric)), 0) as total, COUNT(*) as count
        FROM fin_movements_asaas
        WHERE description ILIKE 'Taxa de antecipacao%'
          AND transaction_date >= $1 AND transaction_date < $2
      `, [start, fim]);
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
        count_pares: parseInt(pairsResult.rows[0].count)
      });
    } catch (err) {
      console.error("Error fetching anticipation stats:", err);
      res.status(500).json({ error: "Failed" });
    }
  });
  app.post("/api/fin-reconciliation-rules/apply", async (req, res) => {
    try {
      const details = [];
      let totalApplied = 0;
      const anticipation = await applyAnticipationPairing();
      if (anticipation.updated > 0) {
        totalApplied += anticipation.updated;
        details.push({ rule: "\u{1F517} Pares de Antecipa\xE7\xE3o", applied: anticipation.updated });
      }
      const rulesResult = await pool.query(
        "SELECT * FROM fin_reconciliation_rules WHERE is_active = true ORDER BY priority ASC, created_at ASC"
      );
      const rules = rulesResult.rows;
      for (const rule of rules) {
        const matchText = rule.match_text;
        let pattern;
        switch (rule.match_type) {
          case "starts_with":
            pattern = `${matchText}%`;
            break;
          case "exact":
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
           WHERE is_anticipation_pair = false
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
  let isAutoApplying = false;
  async function autoApplyReconciliationRules() {
    if (isAutoApplying) return;
    isAutoApplying = true;
    try {
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
      await applyAnticipationPairing();
      const rulesResult = await pool.query(
        "SELECT * FROM fin_reconciliation_rules WHERE is_active = true ORDER BY priority ASC, created_at ASC"
      );
      let totalApplied = 0;
      for (const rule of rulesResult.rows) {
        const matchText = rule.match_text;
        let pattern;
        switch (rule.match_type) {
          case "starts_with":
            pattern = `${matchText}%`;
            break;
          case "exact":
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
  setTimeout(() => autoApplyReconciliationRules(), 5e3);
  setInterval(() => autoApplyReconciliationRules(), 5 * 60 * 1e3);
  app.get("/api/fin-people", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT DISTINCT ON (UPPER(TRIM(REGEXP_REPLACE(fp.name, '^[^a-zA-Z\xC0-\xFF]+', '', 'g'))))
          fp.id, fp.guid, fp.name, fp.cnpjcpf, fp.grapehub_client_id, fp.asaas_id,
          c.name as linked_client_name
        FROM fin_people fp
        LEFT JOIN clients c ON c.id = fp.grapehub_client_id OR (c.fin_people_guid IS NOT NULL AND c.fin_people_guid = fp.guid)
        WHERE fp.is_client = true AND fp.asaas_id IS NOT NULL
        ORDER BY UPPER(TRIM(REGEXP_REPLACE(fp.name, '^[^a-zA-Z\xC0-\xFF]+', '', 'g'))), LENGTH(fp.cnpjcpf) DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching fin_people:", err);
      res.status(500).json({ error: "Failed to fetch financial people" });
    }
  });
  app.post("/api/fin-people/sync-phones", async (_req, res) => {
    try {
      let updated = 0;
      let skipped = 0;
      let page = 0;
      const limit = 100;
      let hasMore = true;
      console.log("[sync-phones] Iniciando sync de telefones do Asaas...");
      while (hasMore) {
        const data = await asaasFetch(`/customers?limit=${limit}&offset=${page * limit}`);
        if (!data || !Array.isArray(data.data)) {
          console.warn("[sync-phones] Resposta inv\xE1lida do Asaas na p\xE1gina", page);
          break;
        }
        for (const customer of data.data) {
          const asaasId = customer.id;
          const phone = customer.mobilePhone || customer.phone || null;
          if (!asaasId || !phone) {
            skipped++;
            continue;
          }
          const result = await pool.query(
            `UPDATE fin_people SET phone = $1 WHERE asaas_id = $2 RETURNING id`,
            [phone, asaasId]
          );
          if ((result.rowCount ?? 0) > 0) updated++;
        }
        hasMore = data.hasMore === true;
        page++;
      }
      console.log(`[sync-phones] Conclu\xEDdo: ${updated} atualizados, ${skipped} sem telefone.`);
      res.json({ ok: true, updated, skipped });
    } catch (err) {
      console.error("[sync-phones] Erro:", err);
      res.status(500).json({ error: "Falha ao sincronizar telefones" });
    }
  });
  app.patch("/api/fin-people/:id", async (req, res) => {
    const { id } = req.params;
    const { grapehub_client_id } = req.body;
    try {
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
  app.get("/api/fin-people/:id/movements", async (req, res) => {
    const { id } = req.params;
    try {
      const personRes = await pool.query("SELECT asaas_id FROM fin_people WHERE id = $1", [id]);
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
  app.get("/api/fin-people/:id/subscriptions", async (req, res) => {
    const { id } = req.params;
    try {
      const personRes = await pool.query("SELECT asaas_id FROM fin_people WHERE id = $1", [id]);
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
  app.get("/api/fin-subscriptions", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          fs.id,
          fs.customer_id,
          fs.billing_type,
          fs.value,
          fs.next_due_date,
          fs.status,
          fs.cycle,
          fs.description,
          fp.name as customer_name,
          fp.cnpjcpf as customer_cnpjcpf,
          fp.grapehub_client_id
        FROM fin_subscriptions fs
        LEFT JOIN fin_people fp ON fp.asaas_id = fs.customer_id
        ORDER BY fp.name ASC, fs.value DESC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching all subscriptions:", err);
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });
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
        [nome, descricao, cor || "blue"]
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
      const kanbanRes = await pool.query("SELECT is_default FROM crm_comercial_kanbans WHERE id = $1", [id]);
      if (kanbanRes.rows.length > 0 && kanbanRes.rows[0].is_default) {
        return res.status(400).json({ error: "Cannot delete default kanban" });
      }
      const leadsRes = await pool.query("SELECT id FROM crm_comercial_leads WHERE kanban_id = $1", [id]);
      const leadIds = leadsRes.rows.map((row) => row.id);
      if (leadIds.length > 0) {
        await pool.query("DELETE FROM crm_comercial_history WHERE lead_id = ANY($1)", [leadIds]);
        await pool.query("DELETE FROM crm_comercial_comments WHERE lead_id = ANY($1)", [leadIds]);
      }
      await pool.query("DELETE FROM crm_comercial_leads WHERE kanban_id = $1", [id]);
      await pool.query("DELETE FROM crm_comercial_columns WHERE kanban_id = $1", [id]);
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
  app.post("/api/crm-comercial/columns/reorder", async (req, res) => {
    try {
      const { kanban_id, columns } = req.body;
      if (!kanban_id || !Array.isArray(columns)) {
        return res.status(400).json({ error: "kanban_id and columns array are required" });
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const col of columns) {
          await client.query(
            "UPDATE crm_comercial_columns SET order_index = $1 WHERE id = $2 AND kanban_id = $3",
            [col.order_index, col.id, kanban_id]
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("Error reordering columns:", err);
      res.status(500).json({ error: "Failed to reorder columns" });
    }
  });
  app.post("/api/crm-comercial/columns", async (req, res) => {
    try {
      const { kanban_id, title, color, order_index, icon, max_days } = req.body;
      const result = await pool.query(
        `INSERT INTO crm_comercial_columns (kanban_id, title, color, order_index, icon, max_days) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [kanban_id, title, color || "orange", order_index || 0, icon || "LayoutGrid", max_days || null]
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
      const { title, color, icon, max_days } = req.body;
      const result = await pool.query(
        "UPDATE crm_comercial_columns SET title = $1, color = $2, icon = $3, max_days = $4 WHERE id = $5 RETURNING *",
        [title, color, icon || "LayoutGrid", max_days || null, id]
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
      await pool.query("DELETE FROM crm_comercial_columns WHERE id = $1", [id]);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting column:", err);
      res.status(500).json({ error: "Failed to delete column" });
    }
  });
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
    } catch (e) {
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
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create pessoa", details: e.message || String(e) });
    }
  });
  app.put("/api/crm-pessoas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, email, telefone, cargo, empresa, responsavel_id } = req.body;
      const result = await pool.query(`
        UPDATE crm_pessoas 
        SET nome = $1, email = $2, telefone = $3, cargo = $4, empresa = $5, responsavel_id = COALESCE($6, responsavel_id), updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `, [nome, email, telefone, cargo, empresa, responsavel_id, id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Pessoa n\xE3o encontrada" });
      res.json(result.rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update pessoa", details: e.message || String(e) });
    }
  });
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
    } catch (e) {
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
    } catch (e) {
      console.error("[crm-empresas] Error:", e.message);
      res.status(500).json({ error: "Failed to create empresa", details: e.message });
    }
  });
  app.put("/api/crm-empresas/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, site, setor, telefone, email, cidade, responsavel_id } = req.body;
      const result = await pool.query(`
        UPDATE crm_empresas 
        SET nome = $1, site = $2, setor = $3, telefone = $4, email = $5, cidade = $6, responsavel_id = COALESCE($7, responsavel_id), updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `, [nome, site, setor, telefone, email, cidade, responsavel_id, id]);
      if (result.rows.length === 0) return res.status(404).json({ error: "Empresa n\xE3o encontrada" });
      res.json(result.rows[0]);
    } catch (e) {
      console.error("[crm-empresas PUT] Error:", e.message);
      res.status(500).json({ error: "Failed to update empresa", details: e.message });
    }
  });
  app.get("/api/marketing-dashboard", async (req, res) => {
    try {
      const { month, start, end } = req.query;
      let dateFilter = "";
      let dateParams = [];
      let startDate = "";
      let endDate = "";
      if (start && end) {
        startDate = start;
        endDate = end;
        dateFilter = `WHERE day >= $1 AND day <= $2`;
        dateParams = [startDate, endDate];
      } else if (month) {
        const [y, m] = month.split("-");
        const firstDay = new Date(parseInt(y), parseInt(m) - 1, 1);
        const lastDay = new Date(parseInt(y), parseInt(m), 0);
        startDate = firstDay.toISOString().slice(0, 10);
        endDate = lastDay.toISOString().slice(0, 10);
        dateFilter = `WHERE day >= $1 AND day <= $2`;
        dateParams = [startDate, endDate];
      }
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
      const fbDailyResult = await pool.query(
        `SELECT
          TO_CHAR(day, 'YYYY-MM-DD') AS date,
          SUM(spend)::float          AS spend
         FROM facebook
         ${dateFilter}
         GROUP BY day ORDER BY day`,
        dateParams
      );
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
      const formResult = await pool.query(
        `SELECT
          COUNT(*)::int                                                                        AS total_leads,
          COUNT(*) FILTER (WHERE TRIM("FATURAMENTO") <> 'Menos de R$ 10 mil' AND "FATURAMENTO" IS NOT NULL AND TRIM("FATURAMENTO") <> '')::int AS leads_qualificados
         FROM formulario
         ${dateFilter}`,
        dateParams
      );
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
      let reunioesMarcadas = 0;
      let reunioesRealizadas = 0;
      let reunioesTotal = 0;
      try {
        const marcadasResult = await pool.query(`
          SELECT COUNT(DISTINCT sub.lead_id)::int AS marcadas
          FROM (
            SELECT h.lead_id
            FROM crm_comercial_history h
            JOIN crm_comercial_columns c ON h.to_coluna = c.id::text
            WHERE (LOWER(c.title) LIKE '%reuni\xE3o marcada%' OR LOWER(c.title) LIKE '%reuniao marcada%')
              ${startDate && endDate ? `AND h.created_at >= $1 AND h.created_at <= ($2::date + interval '1 day')` : ""}
            UNION
            SELECT l.id AS lead_id
            FROM crm_comercial_leads l
            JOIN crm_comercial_columns c ON l.coluna = c.id::text
            WHERE (LOWER(c.title) LIKE '%reuni\xE3o marcada%' OR LOWER(c.title) LIKE '%reuniao marcada%')
              ${startDate && endDate ? `AND l.created_at >= $1 AND l.created_at <= ($2::date + interval '1 day')` : ""}
            UNION
            SELECT h.lead_id
            FROM crm_comercial_history h
            JOIN crm_comercial_columns c ON h.from_coluna = c.id::text
            WHERE (LOWER(c.title) LIKE '%reuni\xE3o marcada%' OR LOWER(c.title) LIKE '%reuniao marcada%')
              ${startDate && endDate ? `AND h.created_at >= $1 AND h.created_at <= ($2::date + interval '1 day')` : ""}
          ) sub
        `, startDate && endDate ? [startDate, endDate] : []);
        reunioesMarcadas = marcadasResult.rows[0]?.marcadas || 0;
      } catch (e) {
        console.error("[marketing-dashboard] marcadas error:", e.message);
      }
      try {
        const realizadasResult = await pool.query(`
          SELECT COUNT(DISTINCT m.lead_id)::int AS realizadas
          FROM crm_comercial_meetings m
          ${startDate && endDate ? `WHERE m.meeting_date >= $1 AND m.meeting_date <= ($2::date + interval '1 day')` : ""}
        `, startDate && endDate ? [startDate, endDate] : []);
        reunioesRealizadas = realizadasResult.rows[0]?.realizadas || 0;
        reunioesTotal = reunioesRealizadas;
      } catch (e) {
        console.error("[marketing-dashboard] realizadas error:", e.message);
      }
      let totalVendas = 0;
      try {
        const vendasResult = await pool.query(`
          SELECT COUNT(*) AS vendas FROM fechamentos
          ${startDate && endDate ? `WHERE day >= $1 AND day <= $2` : ""}
        `, startDate && endDate ? [startDate, endDate] : []);
        totalVendas = Number(vendasResult.rows[0]?.vendas) || 0;
      } catch (e) {
        console.error("[marketing-dashboard] vendas error:", e.message);
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
          reunioes_marcadas: reunioesMarcadas,
          reunioes_realizadas: reunioesRealizadas,
          custo_por_lead: totalLeads > 0 ? totalSpend / totalLeads : 0,
          custo_por_qualificado: totalQualificados > 0 ? totalSpend / totalQualificados : 0,
          custo_por_reuniao: reunioesTotal > 0 ? totalSpend / reunioesTotal : 0,
          taxa_qualificacao: totalLeads > 0 ? totalQualificados / totalLeads * 100 : 0,
          taxa_reuniao: totalQualificados > 0 ? reunioesTotal / totalQualificados * 100 : 0,
          total_clicks: fb.total_clicks || 0,
          total_impressions: fb.total_impressions || 0,
          total_campaigns: fb.total_campaigns || 0,
          total_vendas: totalVendas,
          cac: totalVendas > 0 ? totalSpend / totalVendas : 0
        },
        daily_spend: fbDailyResult.rows,
        daily_leads: formDailyResult.rows,
        campaigns: fbCampaignResult.rows,
        nichos: nichoResult.rows
      });
    } catch (e) {
      console.error("[marketing-dashboard]", e.message);
      res.status(500).json({ error: "Failed to load marketing dashboard", details: e.message });
    }
  });
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
        `SELECT data FROM marketing_acoes WHERE page_id = $1`,
        [page_id]
      );
      res.json({ campaigns: result.rows[0]?.data || [] });
    } catch (e) {
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
    } catch (e) {
      console.error("[marketing-acoes POST]", e.message);
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/crm-metas", async (req, res) => {
    try {
      const metas = await pool.query(
        `SELECT * FROM crm_metas ORDER BY created_at DESC`
      );
      const now = /* @__PURE__ */ new Date();
      const fechCols = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name='fechamentos' ORDER BY ordinal_position`
      );
      const colNames = fechCols.rows.map((r) => r.column_name);
      const fechValorCol = colNames.find(
        (c) => c.toLowerCase() === "valor" || c.toLowerCase().includes("valor")
      ) || colNames[3] || "id";
      const fechOrigemCol = colNames.find(
        (c) => c.toLowerCase().includes("indica") || c.toLowerCase().includes("campa") || c.toLowerCase().includes("origem")
      ) || colNames[4] || "id";
      const result = await Promise.all(metas.rows.map(async (meta) => {
        let valorAtual = 0;
        let dataInicio;
        let dataFim;
        if (meta.data_inicio) {
          dataInicio = new Date(meta.data_inicio);
          dataFim = meta.data_fim ? new Date(meta.data_fim) : new Date(now);
          dataFim.setHours(23, 59, 59, 999);
        } else {
          dataFim = new Date(now);
          dataFim.setHours(23, 59, 59, 999);
          dataInicio = new Date(now);
          if (meta.periodo === "semanal") {
            const day = now.getDay();
            dataInicio.setDate(now.getDate() - day);
            dataInicio.setHours(0, 0, 0, 0);
          } else if (meta.periodo === "mensal") {
            dataInicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          } else if (meta.periodo === "trimestral") {
            const startMonth = Math.floor(now.getMonth() / 3) * 3;
            dataInicio = new Date(now.getFullYear(), startMonth, 1, 0, 0, 0, 0);
          } else if (meta.periodo === "anual") {
            dataInicio = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
          } else {
            dataInicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          }
        }
        try {
          if (meta.tipo === "negocios_adicionados") {
            const params = [dataInicio, dataFim];
            let where = `WHERE created_at >= $1 AND created_at <= $2`;
            if (meta.kanban_id) {
              params.push(meta.kanban_id);
              where += ` AND kanban_id = $${params.length}`;
            }
            if (meta.responsavel_id) {
              params.push(meta.responsavel_id);
              where += ` AND responsavel_id = $${params.length}`;
            }
            const agg = meta.metrica === "valor" ? "COALESCE(SUM(valor), 0)" : "COUNT(*)";
            const q = await pool.query(
              `SELECT ${agg} AS total FROM crm_comercial_leads ${where}`,
              params
            );
            valorAtual = Number(q.rows[0]?.total || 0);
          } else if (meta.tipo === "negocios_andamento") {
            let valorAtualAndamento = 0;
            if (meta.coluna_id) {
              const params = [dataInicio, dataFim, meta.coluna_id];
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
              const agg = meta.metrica === "valor" ? `COALESCE((SELECT SUM(l3.valor) FROM crm_comercial_leads l3 WHERE l3.id = ANY(ARRAY_AGG(DISTINCT h.lead_id))), 0)` : `COUNT(DISTINCT h.lead_id)`;
              const q = await pool.query(
                `SELECT ${agg} AS total
                 FROM crm_comercial_history h
                 ${whereHistory}`,
                params
              );
              valorAtualAndamento = Number(q.rows[0]?.total || 0);
            } else {
              const params = [dataInicio, dataFim];
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
          } else if (meta.tipo === "negocios_ganhos") {
            const startStr = dataInicio.toISOString().slice(0, 10);
            const endStr = dataFim.toISOString().slice(0, 10);
            const agg = meta.metrica === "valor" ? `COALESCE(SUM(CAST(REPLACE(REPLACE(REPLACE(COALESCE("${fechValorCol}", '0'), 'R$', ''), ',', '.'), ' ', '') AS NUMERIC)), 0)` : "COUNT(*)";
            const q = await pool.query(
              `SELECT ${agg} AS total FROM fechamentos WHERE day >= $1 AND day <= $2`,
              [startStr, endStr]
            );
            valorAtual = Number(q.rows[0]?.total || 0);
          } else if (meta.tipo === "receita") {
            const startStr = dataInicio.toISOString().slice(0, 10);
            const endStr = dataFim.toISOString().slice(0, 10);
            const q = await pool.query(
              `SELECT COALESCE(SUM(CAST(REPLACE(REPLACE(REPLACE(COALESCE("${fechValorCol}", '0'), 'R$', ''), ',', '.'), ' ', '') AS NUMERIC)), 0) AS total
               FROM fechamentos WHERE day >= $1 AND day <= $2`,
              [startStr, endStr]
            );
            valorAtual = Number(q.rows[0]?.total || 0);
          } else if (meta.tipo === "atividades") {
            const params = [dataInicio, dataFim];
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
          } else if (meta.tipo === "reunioes_marcadas") {
            const startStr = dataInicio.toISOString().slice(0, 10);
            const endStr = dataFim.toISOString().slice(0, 10);
            const q = await pool.query(
              `SELECT COUNT(DISTINCT sub.lead_id) AS total
               FROM (
                 SELECT h.lead_id
                 FROM crm_comercial_history h
                 JOIN crm_comercial_columns c ON h.to_coluna = c.id::text
                 WHERE (LOWER(c.title) LIKE '%reuni\xE3o marcada%' OR LOWER(c.title) LIKE '%reuniao marcada%')
                   AND h.created_at >= $1 AND h.created_at <= ($2::date + interval '1 day')
                 UNION
                 SELECT l.id AS lead_id
                 FROM crm_comercial_leads l
                 JOIN crm_comercial_columns c ON l.coluna = c.id::text
                 WHERE (LOWER(c.title) LIKE '%reuni\xE3o marcada%' OR LOWER(c.title) LIKE '%reuniao marcada%')
                   AND l.created_at >= $1 AND l.created_at <= ($2::date + interval '1 day')
                 UNION
                 SELECT h.lead_id
                 FROM crm_comercial_history h
                 JOIN crm_comercial_columns c ON h.from_coluna = c.id::text
                 WHERE (LOWER(c.title) LIKE '%reuni\xE3o marcada%' OR LOWER(c.title) LIKE '%reuniao marcada%')
                   AND h.created_at >= $1 AND h.created_at <= ($2::date + interval '1 day')
               ) sub`,
              [startStr, endStr]
            );
            valorAtual = Number(q.rows[0]?.total || 0);
          } else if (meta.tipo === "reunioes_realizadas") {
            const startStr = dataInicio.toISOString().slice(0, 10);
            const endStr = dataFim.toISOString().slice(0, 10);
            const q = await pool.query(
              `SELECT COUNT(DISTINCT m.lead_id) AS total
               FROM crm_comercial_meetings m
               WHERE m.meeting_date >= $1 AND m.meeting_date <= ($2::date + interval '1 day')`,
              [startStr, endStr]
            );
            valorAtual = Number(q.rows[0]?.total || 0);
          } else if (meta.tipo === "taxa_conversao") {
            const startStr = dataInicio.toISOString().slice(0, 10);
            const endStr = dataFim.toISOString().slice(0, 10);
            const qReun = await pool.query(
              `SELECT COUNT(DISTINCT m.lead_id)::int AS total
               FROM crm_comercial_meetings m
               WHERE m.meeting_date >= $1 AND m.meeting_date <= ($2::date + interval '1 day')`,
              [startStr, endStr]
            );
            const reunioes = Number(qReun.rows[0]?.total || 0);
            const qFech = await pool.query(
              `SELECT COUNT(*)::int AS total FROM fechamentos WHERE day >= $1 AND day <= $2`,
              [startStr, endStr]
            );
            const fechamentos = Number(qFech.rows[0]?.total || 0);
            valorAtual = reunioes > 0 ? Math.round(fechamentos / reunioes * 1e3) / 10 : 0;
          }
        } catch (err) {
          console.error(`[crm-metas] calc error for tipo=${meta.tipo}:`, err.message);
          valorAtual = 0;
        }
        const percentual = meta.alvo > 0 ? Math.min(100, Math.round(valorAtual / Number(meta.alvo) * 100)) : 0;
        return { ...meta, valor_atual: valorAtual, percentual };
      }));
      res.json(result);
    } catch (e) {
      console.error("[crm-metas] Error:", e.message);
      res.status(500).json({ error: "Failed to fetch metas", details: e.message });
    }
  });
  app.post("/api/crm-metas", async (req, res) => {
    try {
      const { user_id, nome, tipo, metrica, periodo, alvo, kanban_id, coluna_id, activity_type, responsavel_id, data_inicio, data_fim } = req.body;
      if (!user_id || !nome || !tipo) return res.status(400).json({ error: "user_id, nome e tipo s\xE3o obrigat\xF3rios" });
      const result = await pool.query(
        `INSERT INTO crm_metas (user_id, nome, tipo, metrica, periodo, alvo, kanban_id, coluna_id, activity_type, responsavel_id, data_inicio, data_fim)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          user_id,
          nome,
          tipo,
          metrica || "quantidade",
          periodo || "mensal",
          Number(alvo) || 10,
          kanban_id || null,
          coluna_id || null,
          activity_type || null,
          responsavel_id || null,
          data_inicio || null,
          data_fim || null
        ]
      );
      res.status(201).json(result.rows[0]);
    } catch (e) {
      console.error("[crm-metas] POST Error:", e.message);
      res.status(500).json({ error: "Failed to create meta", details: e.message });
    }
  });
  app.delete("/api/crm-metas/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM crm_metas WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (e) {
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
    } catch (e) {
      res.status(500).json({ error: "Failed to update meta", details: e.message });
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
  app.get("/api/crm-comercial/leads-list", async (req, res) => {
    try {
      const { search, kanban_id, status } = req.query;
      let query = `
        SELECT l.*, 
               c.title as coluna_nome,
               c.color as coluna_color,
               u.name as responsavel_name,
               k.nome as kanban_name
        FROM crm_comercial_leads l
        LEFT JOIN crm_comercial_columns c ON l.coluna::text = c.id::text
        LEFT JOIN users u ON l.responsavel_id = u.email
        LEFT JOIN crm_comercial_kanbans k ON l.kanban_id::text = k.id::text
        WHERE 1=1
      `;
      const params = [];
      let paramIdx = 1;
      if (kanban_id) {
        query += ` AND l.kanban_id::text = $${paramIdx}`;
        params.push(kanban_id);
        paramIdx++;
      }
      if (status === "lost") {
        query += ` AND l.is_lost = true`;
      } else if (status === "active") {
        query += ` AND (l.is_lost IS NULL OR l.is_lost = false)`;
      }
      if (search) {
        query += ` AND (l.nome ILIKE $${paramIdx} OR l.telefone ILIKE $${paramIdx} OR l.email ILIKE $${paramIdx})`;
        params.push(`%${search}%`);
        paramIdx++;
      }
      query += ` ORDER BY l.created_at DESC`;
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching leads list:", err);
      res.status(500).json({ error: "Failed to fetch leads list" });
    }
  });
  app.get("/api/crm-comercial/lead-history/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT h.*, c_from.title as from_coluna_name, c_to.title as to_coluna_name
         FROM crm_comercial_history h
         LEFT JOIN crm_comercial_columns c_from ON h.from_coluna::text = c_from.id::text
         LEFT JOIN crm_comercial_columns c_to ON h.to_coluna::text = c_to.id::text
         WHERE h.lead_id = $1
         ORDER BY h.created_at DESC
         LIMIT 50`,
        [id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching lead history:", err);
      res.status(500).json({ error: "Failed to fetch lead history" });
    }
  });
  app.post("/api/crm-comercial/leads", async (req, res) => {
    try {
      const { nome, email, telefone, origem, responsavel_id, valor, observacoes, kanban_id, coluna } = req.body;
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
        `INSERT INTO crm_comercial_leads (nome, email, telefone, origem, responsavel_id, valor, observacoes, kanban_id, coluna) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [nome, email || null, telefone, origem || "Outro", responsavel_id, valor || 0, observacoes, kanban_id, colunaId]
      );
      if (nome) {
        try {
          const kanbanUserRes = await pool.query("SELECT user_id FROM crm_comercial_kanbans WHERE id = $1", [kanban_id]);
          if (kanbanUserRes.rows.length > 0) {
            const tenant_id = kanbanUserRes.rows[0].user_id;
            const telefoneVal = (telefone || "").trim();
            const emailVal = (email || "").trim();
            let personId = null;
            if (telefoneVal) {
              const check = await pool.query(
                "SELECT id FROM crm_pessoas WHERE user_id = $1 AND telefone = $2 LIMIT 1",
                [tenant_id, telefoneVal]
              );
              if (check.rows.length > 0) personId = check.rows[0].id;
            }
            if (personId) {
              await pool.query(`
                 UPDATE crm_pessoas 
                 SET nome = COALESCE(NULLIF($2, ''), nome), 
                     email = COALESCE(NULLIF($3, ''), email) 
                 WHERE id = $1
               `, [personId, nome, emailVal]);
            } else {
              await pool.query(`
                 INSERT INTO crm_pessoas (user_id, nome, email, telefone, responsavel_id)
                 VALUES ($1, $2, $3, $4, $5)
               `, [tenant_id, nome, emailVal || null, telefoneVal, responsavel_id]);
            }
          }
        } catch (personErr) {
          console.error("Error syncing person from lead:", personErr.message);
        }
      }
      setImmediate(() => runAutomations("lead_created", result.rows[0]));
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
        coluna,
        valor,
        responsavel_id,
        moved_by,
        kanban_id,
        previsao,
        tags,
        origem,
        instagram,
        nicho,
        tempo_oab,
        faturamento,
        reunion_date,
        office_location,
        monthly_closings,
        closing_goal,
        reunion_link,
        utm_platform,
        utm_campaign,
        utm_set,
        utm_creative,
        utm_position,
        nome,
        telefone,
        observacoes,
        form_nome_completo,
        form_nome_fantasia,
        form_telefone_whatsapp,
        form_cnpj_cpf,
        form_cep,
        form_cidade,
        form_estado
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
      if (kanban_id !== void 0) {
        let targetColId = null;
        if (coluna !== void 0) {
          targetColId = coluna;
        } else {
          const firstColResult = await pool.query(
            "SELECT id FROM crm_comercial_columns WHERE kanban_id = $1 ORDER BY order_index ASC LIMIT 1",
            [kanban_id]
          );
          targetColId = firstColResult.rows[0]?.id || null;
        }
        updates.push(`kanban_id = $${paramIdx++}`);
        params.push(kanban_id);
        if (targetColId) {
          updates.push(`coluna = $${paramIdx++}`);
          params.push(targetColId);
          updates.push(`etapa_updated_at = NOW()`);
        }
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, from_coluna, to_coluna, moved_by) VALUES ($1, $2, $3, $4)`,
          [id, currentColuna, targetColId || "outro-kanban", moved_by || "Sistema"]
        );
      } else if (coluna !== void 0) {
        updates.push(`coluna = $${paramIdx++}`);
        params.push(coluna);
        if (coluna !== currentColuna) {
          updates.push(`etapa_updated_at = NOW()`);
        }
      }
      if (valor !== void 0) {
        updates.push(`valor = $${paramIdx++}`);
        params.push(valor);
      }
      if (responsavel_id !== void 0) {
        updates.push(`responsavel_id = $${paramIdx++}`);
        params.push(responsavel_id);
      }
      if (previsao !== void 0) {
        updates.push(`previsao = $${paramIdx++}`);
        params.push(previsao || null);
      }
      if (tags !== void 0) {
        updates.push(`tags = $${paramIdx++}`);
        params.push(JSON.stringify(tags));
      }
      if (origem !== void 0) {
        updates.push(`origem = $${paramIdx++}`);
        params.push(origem);
      }
      if (instagram !== void 0) {
        updates.push(`instagram = $${paramIdx++}`);
        params.push(instagram);
      }
      if (nicho !== void 0) {
        updates.push(`nicho = $${paramIdx++}`);
        params.push(nicho);
      }
      if (tempo_oab !== void 0) {
        updates.push(`tempo_oab = $${paramIdx++}`);
        params.push(tempo_oab);
      }
      if (faturamento !== void 0) {
        updates.push(`faturamento = $${paramIdx++}`);
        params.push(faturamento);
      }
      if (reunion_date !== void 0) {
        updates.push(`reunion_date = $${paramIdx++}`);
        params.push(reunion_date);
      }
      if (office_location !== void 0) {
        updates.push(`office_location = $${paramIdx++}`);
        params.push(office_location);
      }
      if (monthly_closings !== void 0) {
        updates.push(`monthly_closings = $${paramIdx++}`);
        params.push(monthly_closings);
      }
      if (closing_goal !== void 0) {
        updates.push(`closing_goal = $${paramIdx++}`);
        params.push(closing_goal);
      }
      if (reunion_link !== void 0) {
        updates.push(`reunion_link = $${paramIdx++}`);
        params.push(reunion_link);
      }
      if (utm_platform !== void 0) {
        updates.push(`utm_platform = $${paramIdx++}`);
        params.push(utm_platform);
      }
      if (utm_campaign !== void 0) {
        updates.push(`utm_campaign = $${paramIdx++}`);
        params.push(utm_campaign);
      }
      if (utm_set !== void 0) {
        updates.push(`utm_set = $${paramIdx++}`);
        params.push(utm_set);
      }
      if (utm_creative !== void 0) {
        updates.push(`utm_creative = $${paramIdx++}`);
        params.push(utm_creative);
      }
      if (utm_position !== void 0) {
        updates.push(`utm_position = $${paramIdx++}`);
        params.push(utm_position);
      }
      if (form_nome_completo !== void 0) {
        updates.push(`form_nome_completo = $${paramIdx++}`);
        params.push(form_nome_completo);
      }
      if (form_nome_fantasia !== void 0) {
        updates.push(`form_nome_fantasia = $${paramIdx++}`);
        params.push(form_nome_fantasia);
      }
      if (form_telefone_whatsapp !== void 0) {
        updates.push(`form_telefone_whatsapp = $${paramIdx++}`);
        params.push(form_telefone_whatsapp);
      }
      if (form_cnpj_cpf !== void 0) {
        updates.push(`form_cnpj_cpf = $${paramIdx++}`);
        params.push(form_cnpj_cpf);
      }
      if (form_cep !== void 0) {
        updates.push(`form_cep = $${paramIdx++}`);
        params.push(form_cep);
      }
      if (form_cidade !== void 0) {
        updates.push(`form_cidade = $${paramIdx++}`);
        params.push(form_cidade);
      }
      if (form_estado !== void 0) {
        updates.push(`form_estado = $${paramIdx++}`);
        params.push(form_estado);
      }
      const { is_lost, loss_reason_id } = req.body;
      if (is_lost !== void 0) {
        updates.push(`is_lost = $${paramIdx++}`);
        params.push(is_lost);
      }
      if (loss_reason_id !== void 0) {
        updates.push(`loss_reason_id = $${paramIdx++}`);
        params.push(loss_reason_id);
      }
      if (nome !== void 0) {
        updates.push(`nome = $${paramIdx++}`);
        params.push(nome);
      }
      if (telefone !== void 0) {
        updates.push(`telefone = $${paramIdx++}`);
        params.push(telefone);
      }
      if (observacoes !== void 0) {
        updates.push(`observacoes = $${paramIdx++}`);
        params.push(observacoes);
      }
      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        params.push(id);
        console.log(`[PATCH] Updating lead ${id} with params:`, params);
        const result = await pool.query(
          `UPDATE crm_comercial_leads SET ${updates.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
          params
        );
        if (!kanban_id && coluna !== void 0 && coluna !== currentColuna) {
          await pool.query(
            `INSERT INTO crm_comercial_history (lead_id, from_coluna, to_coluna, moved_by) VALUES ($1, $2, $3, $4)`,
            [id, currentColuna, coluna, moved_by || "Sistema"]
          );
          try {
            const destColResult = await pool.query(
              `SELECT title FROM crm_comercial_columns WHERE id = $1`,
              [coluna]
            );
            const destTitle = (destColResult.rows[0]?.title || "").toLowerCase();
            const isTerminal = destTitle.includes("ganho") || destTitle.includes("fechado");
            if (isTerminal) {
              const leadFull = await pool.query(
                `SELECT nome, form_nome_fantasia, valor, origem, faturamento, form_cidade FROM crm_comercial_leads WHERE id = $1`,
                [id]
              );
              const lf = leadFull.rows[0];
              if (lf) {
                const nomeInsert = lf.form_nome_fantasia || lf.nome || "";
                const valorInsert = lf.valor != null ? String(Math.round(Number(lf.valor))) : "0";
                const origemRaw = (lf.origem || "").toLowerCase();
                const origemInsert = origemRaw.includes("indica") ? "indica\xE7\xE3o" : "campanhas";
                const faturInsert = lf.faturamento || "";
                const cidadeInsert = lf.form_cidade || "";
                const dayInsert = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
                const colInfoRes = await pool.query(
                  `SELECT column_name FROM information_schema.columns WHERE table_name='fechamentos' ORDER BY ordinal_position`
                );
                const fcols = colInfoRes.rows.map((r) => r.column_name);
                const cNome = fcols.find((c) => c.toLowerCase() === "nome") || "Nome";
                const cValor = fcols.find((c) => c.toLowerCase().includes("valor")) || "Valor";
                const cOrigem = fcols.find((c) => c.toLowerCase().includes("indica") || c.toLowerCase().includes("campa") || c.toLowerCase().includes("origem")) || fcols[4] || "id";
                const cFat = fcols.find((c) => c.toLowerCase().includes("fatura")) || fcols[5] || "id";
                const cCidade = fcols.find((c) => c.toLowerCase().includes("cidade")) || fcols[6] || "id";
                await pool.query(
                  `INSERT INTO fechamentos (day, "${cNome}", "${cValor}", "${cOrigem}", "${cFat}", "${cCidade}")
                   VALUES ($1, $2, $3, $4, $5, $6)`,
                  [dayInsert, nomeInsert, valorInsert, origemInsert, faturInsert, cidadeInsert]
                );
                console.log(`[FECHAMENTO] Auto-inserted fechamento for lead ${id} \u2192 coluna "${destTitle}"`);
              }
            }
          } catch (fErr) {
            console.error(`[FECHAMENTO] Erro ao inserir em fechamentos para lead ${id}:`, fErr.message);
          }
          setImmediate(() => runAutomations("stage_changed", { ...result.rows[0], _previous_coluna: currentColuna }));
          try {
            const destColCheck = await pool.query(`SELECT title FROM crm_comercial_columns WHERE id = $1`, [coluna]);
            const dt = (destColCheck.rows[0]?.title || "").toLowerCase();
            if (dt.includes("ganho") || dt.includes("fechado")) {
              setImmediate(() => runAutomations("lead_won", result.rows[0]));
              await pool.query(`DELETE FROM crm_comercial_tasks WHERE lead_id = $1 AND completed = false`, [id]);
              console.log(`[TASKS] Open tasks deleted for WON lead ${id}`);
            }
          } catch (_) {
          }
        }
        if (is_lost === true) {
          setImmediate(() => runAutomations("lead_lost", result.rows[0]));
          await pool.query(`DELETE FROM crm_comercial_tasks WHERE lead_id = $1 AND completed = false`, [id]);
          console.log(`[TASKS] Open tasks deleted for LOST lead ${id}`);
        } else if (coluna === void 0) {
          setImmediate(() => runAutomations("lead_updated", result.rows[0]));
        }
        try {
          const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
          let targetReuniaoCol = null;
          if (coluna !== void 0 && coluna !== currentColuna && !kanban_id) {
            const destColResult = await pool.query(`SELECT title FROM crm_comercial_columns WHERE id = $1`, [coluna]);
            const destTitle = (destColResult.rows[0]?.title || "").toLowerCase().trim();
            if (destTitle.includes("reuni\xE3o marcada") || destTitle.includes("reuniao marcada")) targetReuniaoCol = "marcada";
            else if (destTitle.includes("noshow") || destTitle.includes("no-show") || destTitle.includes("no show")) targetReuniaoCol = "noshow";
            else if (destTitle.includes("reagendamento")) targetReuniaoCol = "reagendamento";
          }
          if (kanban_id !== void 0 && kanban_id !== currentResult.rows[0].kanban_id) {
            const kanbansRes = await pool.query(
              "SELECT id, nome FROM crm_comercial_kanbans WHERE id = $1 OR id = $2",
              [currentResult.rows[0].kanban_id, kanban_id]
            );
            let prevK = "", newK = "";
            kanbansRes.rows.forEach((r) => {
              if (r.id === currentResult.rows[0].kanban_id) prevK = r.nome.toLowerCase();
              if (r.id === kanban_id) newK = r.nome.toLowerCase();
            });
            if (prevK.includes("pr\xE9") && (newK.includes("vendas") || newK.includes("comercial"))) {
              targetReuniaoCol = "realizada";
            }
          }
          if (targetReuniaoCol) {
            let shouldSkip = false;
            if (targetReuniaoCol === "realizada") {
              const pastVendas = await pool.query(`
                SELECT h.id FROM crm_comercial_history h
                JOIN crm_comercial_columns c ON h.to_coluna = c.id
                JOIN crm_comercial_kanbans k ON c.kanban_id = k.id
                WHERE h.lead_id = $1 AND (LOWER(k.nome) LIKE '%vendas%' OR LOWER(k.nome) LIKE '%comercial%')
              `, [id]);
              if (pastVendas.rows.length > 1) shouldSkip = true;
            } else {
              const pastCol = await pool.query(`
                SELECT id FROM crm_comercial_history 
                WHERE lead_id = $1 AND to_coluna = $2
              `, [id, coluna]);
              if (pastCol.rows.length > 1) shouldSkip = true;
            }
            if (!shouldSkip) {
              const reunCols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='reunioes' ORDER BY ordinal_position");
              const rCols = reunCols.rows.map((r) => r.column_name);
              const rMarcadas = rCols.find((c) => c.toLowerCase().includes("marca")) || rCols[2];
              const rRealizadas = rCols.find((c) => c.toLowerCase().includes("realiz")) || rCols[5];
              const rNoshow = rCols.find((c) => c.toLowerCase().includes("noshow") || c.toLowerCase().includes("no-show") || c.toLowerCase() === "noshow") || rCols[3];
              const rReagend = rCols.find((c) => c.toLowerCase().includes("reagend")) || rCols[4];
              const rDay = rCols.find((c) => c.toLowerCase() === "day") || rCols[1];
              let colToUpdate = null;
              if (targetReuniaoCol === "marcada") colToUpdate = rMarcadas;
              if (targetReuniaoCol === "realizada") colToUpdate = rRealizadas;
              if (targetReuniaoCol === "noshow") colToUpdate = rNoshow;
              if (targetReuniaoCol === "reagendamento") colToUpdate = rReagend;
              if (colToUpdate) {
                const existing = await pool.query(`SELECT id FROM reunioes WHERE "${rDay}" = $1`, [today]);
                if (existing.rows.length === 0) {
                  await pool.query(
                    `INSERT INTO reunioes ("${rDay}", "${rMarcadas}", "${rRealizadas}", "${rNoshow}", "${rReagend}") VALUES ($1, '0', '0', '0', '0')`,
                    [today]
                  );
                }
                await pool.query(
                  `UPDATE reunioes SET "${colToUpdate}" = (COALESCE(NULLIF("${colToUpdate}", ''), '0')::integer + 1)::text WHERE "${rDay}" = $1`,
                  [today]
                );
                console.log(`[REUNIOES] Auto-incremented "${colToUpdate}" for today (${today}) on lead ${id}`);
              }
            } else {
              console.log(`[REUNIOES] Skipped incrementing "${targetReuniaoCol}" for lead ${id} (already counted in the past)`);
            }
          }
        } catch (rErr) {
          console.error("[REUNIOES] Error auto-populating reunioes:", rErr.message);
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
  app.patch("/api/crm-comercial/leads/:id/reopen", async (req, res) => {
    const { id } = req.params;
    const { moved_by } = req.body ?? {};
    try {
      const leadRes = await pool.query(
        `SELECT l.coluna, l.nome, l.form_nome_fantasia, l.kanban_id, l.is_lost
         FROM crm_comercial_leads l WHERE l.id = $1`,
        [id]
      );
      if (!leadRes.rows.length) return res.status(404).json({ error: "Lead not found" });
      const lead = leadRes.rows[0];
      const colsRes = await pool.query(
        `SELECT id, title FROM crm_comercial_columns WHERE kanban_id = $1 ORDER BY order_index ASC`,
        [lead.kanban_id]
      );
      const firstNonTerminal = colsRes.rows.find((c) => {
        const t = (c.title || "").toLowerCase();
        return !t.includes("ganho") && !t.includes("fechado") && !t.includes("perd") && !t.includes("descart");
      });
      const targetColuna = firstNonTerminal?.id || colsRes.rows[0]?.id || lead.coluna;
      await pool.query(
        `UPDATE crm_comercial_leads SET is_lost = false, loss_reason_id = NULL, coluna = $2 WHERE id = $1`,
        [id, targetColuna]
      );
      try {
        const nomeFech = lead.form_nome_fantasia || lead.nome || "";
        if (nomeFech) {
          await pool.query(`DELETE FROM fechamentos WHERE "Nome" = $1`, [nomeFech]);
        }
      } catch (fErr) {
        console.warn("[REOPEN] N\xE3o foi poss\xEDvel remover fechamento:", fErr.message);
      }
      await pool.query(
        `INSERT INTO crm_comercial_history (lead_id, from_coluna, to_coluna, moved_by)
         VALUES ($1, $2, $3, $4)`,
        [id, lead.coluna, targetColuna, moved_by || "Sistema"]
      );
      await pool.query(
        `INSERT INTO crm_comercial_lead_history (lead_id, action_type, description, user_name)
         VALUES ($1, 'reaberto', '\u{1F504} Lead reaberto e status de perda/ganho removido', $2)`,
        [id, moved_by || "Sistema"]
      ).catch(() => {
      });
      res.json({ ok: true, coluna: targetColuna });
    } catch (err) {
      console.error("[REOPEN] Error:", err);
      res.status(500).json({ error: "Failed to reopen lead" });
    }
  });
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
      res.status(500).json({ error: "Failed to create tag", details: err instanceof Error ? err.message : String(err) });
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
      res.status(500).json({ error: "Failed to delete tag", details: err instanceof Error ? err.message : String(err) });
    }
  });
  app.delete("/api/crm-comercial/leads/:id", async (req, res) => {
    try {
      const { id } = req.params;
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
  app.get("/api/crm-comercial/activities", async (req, res) => {
    try {
      const { type, completed, responsible_id } = req.query;
      let conditions = [];
      const params = [];
      let paramIdx = 1;
      if (type && type !== "all") {
        conditions.push(`t.type = $${paramIdx++}`);
        params.push(type);
      }
      if (completed !== void 0 && completed !== "all") {
        conditions.push(`t.completed = $${paramIdx++}`);
        params.push(completed === "true");
      }
      if (responsible_id && responsible_id !== "all") {
        conditions.push(`t.responsible_id = $${paramIdx++}`);
        params.push(responsible_id);
      }
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
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
    } catch (err) {
      console.error("Error fetching all activities:", err?.message || err);
      res.status(500).json({ error: "Failed to fetch activities", detail: String(err?.message) });
    }
  });
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
        [name, description || null, color || "#6b7280", order_index]
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
  app.get("/api/crm-comercial/sequences/all", async (req, res) => {
    try {
      const seqs = await pool.query(
        `SELECT * FROM crm_sequences ORDER BY name ASC`
      );
      const steps = await pool.query(
        `SELECT * FROM crm_sequence_steps ORDER BY sequence_id, order_index ASC`
      );
      const stepsMap = {};
      for (const step of steps.rows) {
        if (!stepsMap[step.sequence_id]) stepsMap[step.sequence_id] = [];
        stepsMap[step.sequence_id].push(step);
      }
      const result = seqs.rows.map((seq) => ({
        ...seq,
        steps: stepsMap[seq.id] || []
      }));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch all sequences" });
    }
  });
  app.get("/api/crm-comercial/sequences", async (req, res) => {
    try {
      const { kanban_id } = req.query;
      const seqs = await pool.query(
        `SELECT * FROM crm_sequences WHERE kanban_id = $1 ORDER BY id ASC`,
        [kanban_id]
      );
      const steps = await pool.query(
        `SELECT s.* FROM crm_sequence_steps s
         JOIN crm_sequences seq ON seq.id = s.sequence_id
         WHERE seq.kanban_id = $1
         ORDER BY s.sequence_id, s.order_index`,
        [kanban_id]
      );
      const stepsBySeq = {};
      for (const step of steps.rows) {
        if (!stepsBySeq[step.sequence_id]) stepsBySeq[step.sequence_id] = [];
        stepsBySeq[step.sequence_id].push(step);
      }
      const result = seqs.rows.map((seq) => ({ ...seq, steps: stepsBySeq[seq.id] || [] }));
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch sequences" });
    }
  });
  app.post("/api/crm-comercial/sequences", async (req, res) => {
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
            [seq.id, i, s.type, s.title || "", s.observations || "", s.day_offset ?? 1]
          );
        }
      }
      res.json({ ...seq, steps: steps || [] });
    } catch (err) {
      res.status(500).json({ error: "Failed to create sequence" });
    }
  });
  app.put("/api/crm-comercial/sequences/:id", async (req, res) => {
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
            [id, i, s.type, s.title || "", s.observations || "", s.day_offset ?? 1]
          );
        }
      }
      res.json({ ...seqRes.rows[0], steps: steps || [] });
    } catch (err) {
      res.status(500).json({ error: "Failed to update sequence" });
    }
  });
  app.delete("/api/crm-comercial/sequences/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM crm_sequences WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete sequence" });
    }
  });
  app.get("/api/automations/logs", async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 100;
      const automation_id = req.query.automation_id;
      let query = `SELECT * FROM automation_logs`;
      const params = [];
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
  app.get("/api/automations", async (req, res) => {
    try {
      const aRes = await pool.query(`SELECT * FROM automations ORDER BY created_at DESC`);
      const automations = await Promise.all(aRes.rows.map(async (a) => {
        const sRes = await pool.query(
          `SELECT * FROM automation_steps WHERE automation_id = $1 ORDER BY order_index ASC`,
          [a.id]
        );
        return { ...a, steps: sRes.rows.map((s) => ({ ...s, config: s.config })) };
      }));
      res.json(automations);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch automations" });
    }
  });
  app.post("/api/automations", async (req, res) => {
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
      const sRes = await pool.query(`SELECT * FROM automation_steps WHERE automation_id = $1 ORDER BY order_index`, [automation.id]);
      res.json({ ...automation, steps: sRes.rows });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create automation" });
    }
  });
  app.put("/api/automations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, steps = [] } = req.body;
      await pool.query(
        `UPDATE automations SET name=$1, description=$2, updated_at=NOW() WHERE id=$3`,
        [name, description || null, id]
      );
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
  app.patch("/api/automations/:id/toggle", async (req, res) => {
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
  app.delete("/api/automations/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM automations WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete automation" });
    }
  });
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
      await pool.query(
        `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name, task_type, created_at) 
         VALUES ($1, 'task_created', $2, $3, $4, NOW())`,
        [id, `Tarefa criada: "${title}"`, user_name || "Sistema", type]
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
        if (["title", "type", "priority", "due_date", "start_time", "end_time", "responsible_id", "observations", "completed", "completed_at"].includes(key)) {
          updates.push(`${key} = $${paramIdx}`);
          params.push(value);
          paramIdx++;
        }
      });
      if (updates.length === 0) return res.status(400).json({ error: "No valid updates provided" });
      params.push(id);
      const result = await pool.query(
        `UPDATE crm_comercial_tasks SET ${updates.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
        params
      );
      const task = result.rows[0];
      if (bodyRest.completed !== void 0) {
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name, task_type, created_at) 
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            task.lead_id,
            bodyRest.completed ? "task_completed" : "task_reopened",
            bodyRest.completed ? `Tarefa conclu\xEDda: "${task.title}"` : `Tarefa reaberta: "${task.title}"`,
            user_name || "Sistema",
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
          [lead_id, `Tarefa exclu\xEDda: "${title}"`, type]
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
      const templates = templatesRes.rows.map((t) => ({
        ...t,
        items: itemsRes.rows.filter((i) => i.template_id === t.id)
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
        [name, description || ""]
      );
      const template = templateRes.rows[0];
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await pool.query(
            `INSERT INTO crm_comercial_task_template_items (template_id, title, type, priority, due_days_offset, order_index) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [template.id, item.title, item.type || "Tarefa", item.priority || "Normal", item.due_days_offset || 0, i]
          );
        }
      }
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
        [name, description || "", id]
      );
      await pool.query("DELETE FROM crm_comercial_task_template_items WHERE template_id = $1", [id]);
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await pool.query(
            `INSERT INTO crm_comercial_task_template_items (template_id, title, type, priority, due_days_offset, order_index) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, item.title, item.type || "Tarefa", item.priority || "Normal", item.due_days_offset || 0, i]
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
      const templateName = templateRes.rows[0]?.name || "Modelo";
      const tasks = [];
      for (const item of itemsRes.rows) {
        const dueDate = /* @__PURE__ */ new Date();
        dueDate.setDate(dueDate.getDate() + (item.due_days_offset || 0));
        const taskRes = await pool.query(
          `INSERT INTO crm_comercial_tasks (lead_id, title, type, priority, due_date) 
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [id, item.title, item.type, item.priority, dueDate.toISOString()]
        );
        tasks.push(taskRes.rows[0]);
      }
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
        [nome, telefone, origem || "Outro", responsavel_id, valor || 0]
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
      const { lead_id, title, meeting_date, responsible_name, responsible_avatar, notes, office_location, reunion_link, reunion_niche, monthly_closings, closing_goal } = req.body;
      if (!lead_id || !title || !meeting_date || !responsible_name) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const result = await pool.query(
        `INSERT INTO crm_comercial_meetings (lead_id, title, meeting_date, responsible_name, responsible_avatar, notes, office_location, reunion_link, reunion_niche, monthly_closings, closing_goal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [lead_id, title, meeting_date, responsible_name, responsible_avatar || null, notes, office_location, reunion_link, reunion_niche, monthly_closings, closing_goal]
      );
      await pool.query(
        `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
         VALUES ($1, 'meeting_created', $2, $3)`,
        [lead_id, `Reuni\xE3o agendada: ${title}`, responsible_name]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating meeting:", err);
      res.status(500).json({ error: "Failed to create meeting" });
    }
  });
  app.get("/api/crm-comercial/call-status", async (req, res) => {
    try {
      const callIds = req.query.callIds ? req.query.callIds.split(",") : [];
      if (callIds.length === 0) return res.json([]);
      const result = await pool.query(
        "SELECT call_id, is_attended FROM crm_comercial_call_status WHERE call_id = ANY($1)",
        [callIds]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching call status:", err.message);
      res.status(500).json({ error: "Failed to fetch call status" });
    }
  });
  app.post("/api/crm-comercial/call-status", async (req, res) => {
    try {
      const { call_id, is_attended } = req.body;
      if (!call_id) return res.status(400).json({ error: "call_id is required" });
      const result = await pool.query(`
        INSERT INTO crm_comercial_call_status (call_id, is_attended, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (call_id) 
        DO UPDATE SET is_attended = EXCLUDED.is_attended, updated_at = NOW()
        RETURNING *
      `, [call_id, is_attended === true]);
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error saving call status:", err.message);
      res.status(500).json({ error: "Failed to save call status" });
    }
  });
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
        [lead_id, content, user_name || "Sistema"]
      );
      await pool.query(
        `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
         VALUES ($1, 'note_created', $2, $3)`,
        [lead_id, content, user_name || "Sistema"]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Error creating note:", err);
      res.status(500).json({ error: "Failed to create note" });
    }
  });
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
        [lead_id, name, size, url, sender || "Ag\xEAncia"]
      );
      await pool.query(
        `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
         VALUES ($1, 'note_created', $2, $3)`,
        [lead_id, `Fez upload do arquivo: ${name} (${size || ""})`, sender || "Sistema"]
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
  app.get("/api/crm-comercial/checklist", async (req, res) => {
    try {
      const { lead_id } = req.query;
      if (!lead_id) return res.status(400).json({ error: "lead_id required" });
      let result = await pool.query(
        "SELECT * FROM crm_comercial_checklist WHERE lead_id = $1 ORDER BY order_index ASC",
        [lead_id]
      );
      if (result.rows.length === 0) {
        const tpl = await pool.query(
          "SELECT item, order_index FROM crm_comercial_checklist_template WHERE active = true ORDER BY order_index ASC"
        );
        if (tpl.rows.length > 0) {
          const values = [];
          const placeholders = [];
          tpl.rows.forEach((t, i) => {
            const offset = i * 3;
            placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
            values.push(lead_id, t.item, t.order_index);
          });
          await pool.query(
            `INSERT INTO crm_comercial_checklist (lead_id, item, order_index) VALUES ${placeholders.join(", ")}`,
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
  app.put("/api/crm-comercial/checklist/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { completed, completed_by } = req.body;
      const result = await pool.query(
        `UPDATE crm_comercial_checklist 
         SET completed = $1, completed_by = $2, completed_at = $3
         WHERE id = $4 RETURNING *`,
        [completed, completed_by || null, completed ? /* @__PURE__ */ new Date() : null, id]
      );
      if (!result.rows.length) return res.status(404).json({ error: "Item not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Error updating checklist item:", err);
      res.status(500).json({ error: "Failed to update checklist item" });
    }
  });
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
  app.put("/api/crm-comercial/checklist-template", async (req, res) => {
    const client = await pool.connect();
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: "items array required" });
      const validItems = items.filter((t) => t.item && t.item.trim() !== "");
      await client.query("BEGIN");
      await client.query("UPDATE crm_comercial_checklist_template SET active = false");
      if (validItems.length > 0) {
        const values = [];
        const placeholders = [];
        validItems.forEach((t, i) => {
          const offset = i * 2;
          placeholders.push(`($${offset + 1}, $${offset + 2})`);
          values.push(t.item.trim(), i);
        });
        await client.query(
          `INSERT INTO crm_comercial_checklist_template (item, order_index) VALUES ${placeholders.join(", ")}`,
          values
        );
      }
      await client.query("COMMIT");
      const result = await client.query(
        "SELECT * FROM crm_comercial_checklist_template WHERE active = true ORDER BY order_index ASC"
      );
      res.json(result.rows);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {
      });
      console.error("Error updating checklist template:", err);
      res.status(500).json({ error: "Failed to update template" });
    } finally {
      client.release();
    }
  });
  const api4comRequest = (method, path2, token, body) => {
    return new Promise((resolve, reject) => {
      const bodyStr = body ? JSON.stringify(body) : void 0;
      const options = {
        hostname: "api.api4com.com",
        port: 443,
        path: `/api/v1${path2}`,
        method,
        headers: {
          "Authorization": token,
          "Content-Type": "application/json",
          ...bodyStr ? { "Content-Length": Buffer.byteLength(bodyStr) } : {}
        }
      };
      const req = https.request(options, (resp) => {
        let rawData = "";
        resp.on("data", (chunk) => {
          rawData += chunk;
        });
        resp.on("end", () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : {};
            resolve({ status: resp.statusCode || 0, data: parsed });
          } catch {
            resolve({ status: resp.statusCode || 0, data: rawData });
          }
        });
      });
      req.on("error", reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  };
  app.get("/api/api4com/settings", async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    try {
      const result = await pool.query(
        "SELECT * FROM crm_api4com_settings WHERE user_id = $1",
        [user_id]
      );
      if (result.rows.length === 0) {
        return res.json({ configured: false });
      }
      const row = result.rows[0];
      res.json({
        configured: !!(row.api4com_token && row.sip_extension),
        api4com_token: row.api4com_token ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" + row.api4com_token.slice(-6) : "",
        api4com_domain: row.api4com_domain || "",
        sip_extension: row.sip_extension || "",
        sip_password: row.sip_password || "",
        // returned unmasked — needed for WebRTC SIP registration
        sip_server: row.sip_server || ""
      });
    } catch (err) {
      console.error("Error fetching api4com settings:", err);
      res.status(500).json({ error: "Failed to fetch api4com settings" });
    }
  });
  app.post("/api/api4com/settings", async (req, res) => {
    const { user_id, api4com_token, api4com_domain, sip_extension, sip_password, sip_server } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    try {
      const existing = await pool.query("SELECT * FROM crm_api4com_settings WHERE user_id = $1", [user_id]);
      const current = existing.rows[0] || {};
      const finalToken = api4com_token && !api4com_token.startsWith("\u2022\u2022\u2022\u2022") ? api4com_token : current.api4com_token;
      const finalPassword = sip_password && !sip_password.startsWith("\u2022\u2022\u2022\u2022") ? sip_password : current.sip_password;
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
      console.error("Error saving api4com settings:", err);
      res.status(500).json({ error: "Failed to save api4com settings" });
    }
  });
  app.get("/api/crm/settings/webhooks", async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    try {
      const result = await pool.query("SELECT form_webhook_url, whatsapp_webhook_url, inbound_token, inbound_kanban_id, inbound_coluna, inbound_responsavel_id FROM crm_webhook_settings WHERE user_id = $1", [user_id]);
      let settings = result.rows[0];
      if (settings && !settings.inbound_token) {
        const token = crypto.randomUUID();
        await pool.query("UPDATE crm_webhook_settings SET inbound_token = $1 WHERE user_id = $2", [token, user_id]);
        settings.inbound_token = token;
      } else if (!settings) {
        const token = crypto.randomUUID();
        await pool.query("INSERT INTO crm_webhook_settings (user_id, inbound_token) VALUES ($1, $2)", [user_id, token]);
        settings = { form_webhook_url: "", whatsapp_webhook_url: "", inbound_token: token, inbound_kanban_id: "", inbound_coluna: "", inbound_responsavel_id: "" };
      }
      res.json(settings);
    } catch (err) {
      console.error("Error fetching webhook settings:", err);
      res.status(500).json({ error: "Failed to fetch webhook settings" });
    }
  });
  app.post("/api/crm/settings/webhooks", async (req, res) => {
    const { user_id, form_webhook_url, whatsapp_webhook_url, inbound_kanban_id, inbound_coluna, inbound_token, inbound_responsavel_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    try {
      await pool.query(
        `INSERT INTO crm_webhook_settings (user_id, form_webhook_url, whatsapp_webhook_url, inbound_kanban_id, inbound_coluna, inbound_token, inbound_responsavel_id, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           form_webhook_url = EXCLUDED.form_webhook_url,
           whatsapp_webhook_url = EXCLUDED.whatsapp_webhook_url,
           inbound_kanban_id = EXCLUDED.inbound_kanban_id,
           inbound_coluna = EXCLUDED.inbound_coluna,
           inbound_token = EXCLUDED.inbound_token,
           inbound_responsavel_id = EXCLUDED.inbound_responsavel_id,
           updated_at = NOW()`,
        [user_id, form_webhook_url || "", whatsapp_webhook_url || "", inbound_kanban_id || "", inbound_coluna || "", inbound_token || "", inbound_responsavel_id || ""]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error saving webhook settings:", err);
      res.status(500).json({ error: "Failed to save webhook settings" });
    }
  });
  app.post("/api/public/webhooks/inbound/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const body = req.body || {};
      const nome = body.nome || body.NOME || body.name || "";
      if (!nome) return res.status(400).json({ error: "Campo 'nome' \xE9 obrigat\xF3rio" });
      const hookSettings = await pool.query(`
        SELECT ws.inbound_kanban_id, ws.inbound_coluna, ws.inbound_responsavel_id, u.id as user_id 
        FROM crm_webhook_settings ws 
        JOIN users u ON u.email = ws.user_id 
        WHERE ws.inbound_token = $1
      `, [token]);
      if (hookSettings.rows.length === 0) {
        return res.status(404).json({ error: "Token de webhook inv\xE1lido ou n\xE3o encontrado." });
      }
      const { inbound_kanban_id, inbound_coluna, inbound_responsavel_id, user_id } = hookSettings.rows[0];
      if (!inbound_kanban_id || !inbound_coluna) {
        return res.status(400).json({ error: "Destino do lead (Kanban e Coluna) n\xE3o foi configurado pelo propriet\xE1rio deste token nas configura\xE7\xF5es do CRM." });
      }
      let resolvedColuna = inbound_coluna;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inbound_coluna);
      if (!isUUID) {
        const colResult = await pool.query(
          `SELECT id FROM crm_comercial_columns WHERE kanban_id = $1 AND LOWER(title) = LOWER($2) LIMIT 1`,
          [inbound_kanban_id, inbound_coluna]
        );
        if (colResult.rows.length > 0) {
          resolvedColuna = colResult.rows[0].id;
        } else {
          const firstCol = await pool.query(
            `SELECT id FROM crm_comercial_columns WHERE kanban_id = $1 ORDER BY order_index ASC LIMIT 1`,
            [inbound_kanban_id]
          );
          if (firstCol.rows.length > 0) resolvedColuna = firstCol.rows[0].id;
        }
      }
      const finalCampaign = body.utm_campaign || body.umt_campaign || "";
      const utmPlatform = body.utm_platform || body.utm_source || "";
      let autoOrigem = utmPlatform;
      if (autoOrigem) {
        const pLower = autoOrigem.toLowerCase();
        if (pLower === "facebookads" || pLower === "facebook" || pLower === "fb" || pLower === "ig" || pLower === "instagram") {
          autoOrigem = "Meta ads";
        } else if (pLower === "google" || pLower === "googleads" || pLower === "adwords") {
          autoOrigem = "Google ads";
        } else if (pLower === "tiktok" || pLower === "tiktokads") {
          autoOrigem = "TikTok ads";
        } else {
          autoOrigem = autoOrigem.charAt(0).toUpperCase() + autoOrigem.slice(1);
        }
      }
      const finalOrigem = body.origem || autoOrigem || body.formulario || body.source || "";
      const tags = body.tags;
      const knownFields = {
        nome,
        telefone: body.telefone || body.TELEFONE || body.phone || "",
        nicho: body.nicho || body.NICHO || "",
        origem: finalOrigem,
        responsavel_id: inbound_responsavel_id || user_id,
        instagram: body.instagram || "",
        forma_pagamento: body.forma_pagamento || "",
        valor: Number(body.valor) || 0,
        tags: JSON.stringify(Array.isArray(tags) ? tags : []),
        kanban_id: inbound_kanban_id,
        coluna: resolvedColuna,
        email: body.email || body.EMAIL || "",
        faturamento: body.faturamento || body.FATURAMENTO || "",
        tempo_oab: body.tempo_oab || body.tempo_advocacia || body["TEMPO DE ADV"] || "",
        investimento: body.investimento || body.INVESTIMENTO || "",
        // UTMs: campo_body → coluna_db (exibição no CRM)
        utm_platform: body.utm_source || body.utm_platform || "",
        // Plataforma
        utm_campaign: finalCampaign,
        // Campanha
        utm_set: body.utm_medium || body.utm_set || "",
        // Conjunto
        utm_creative: body.utm_content || body.utm_creative || "",
        // Criativo    ← utm_content
        utm_position: body.utm_term || body.utm_position || ""
        // Posicionamento ← utm_term
      };
      const columns = Object.keys(knownFields);
      const values = Object.values(knownFields);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      const insertResult = await pool.query(
        `INSERT INTO crm_comercial_leads (${columns.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      const newLead = insertResult.rows[0];
      if (knownFields.nome) {
        try {
          const telefoneVal = knownFields.telefone.trim();
          const emailVal = knownFields.email.trim();
          let personId = null;
          if (telefoneVal || emailVal) {
            const check = await pool.query(
              `SELECT id FROM crm_pessoas WHERE user_id = $1 AND ((telefone != '' AND telefone = $2) OR (email != '' AND email = $3)) LIMIT 1`,
              [user_id, telefoneVal, emailVal]
            );
            if (check.rows.length > 0) personId = check.rows[0].id;
          }
          if (!personId) {
            await pool.query(
              `INSERT INTO crm_pessoas (user_id, nome, email, telefone, responsavel_id)
               VALUES ($1, $2, $3, $4, $5)`,
              [user_id, knownFields.nome, emailVal, telefoneVal, user_id]
            );
          }
        } catch (contactErr) {
          console.error("Erro ao inserir pessoa via webhook na tabela crm_pessoas:", contactErr.message);
        }
      }
      try {
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
           VALUES ($1, 'whatsapp_trigger', $2, $3)`,
          [newLead.id, "Recebido via Webhook CRM \u{1F4E5}", "Automa\xE7\xE3o Inbound"]
        );
      } catch (e) {
        console.error("Erro inserindo historico de inbound webhook:", e.message);
      }
      res.status(201).json({ success: true, lead: newLead });
    } catch (err) {
      console.error("Falha no inbound webhook:", err instanceof Error ? err.message : String(err));
      res.status(500).json({ error: "Erro interno no processamento do webhook", detail: err instanceof Error ? err.message : String(err) });
    }
  });
  app.post("/api/crm/webhooks/trigger/whatsapp/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[Webhook Trigger] Request for lead id: ${id}`);
      const leadRes = await pool.query("SELECT * FROM crm_comercial_leads WHERE id = $1", [id]);
      if (leadRes.rows.length === 0) {
        console.log(`[Webhook Trigger] Lead not found`);
        return res.status(404).json({ error: "Lead not found" });
      }
      const lead = leadRes.rows[0];
      if (!lead.form_nome_completo || !lead.form_nome_fantasia) {
        return res.status(400).json({ error: "Preencha o formul\xE1rio do lead (Nome Completo e Nome Fantasia devem estar preenchidos) para criar o grupo." });
      }
      const user_email = req.query.user_email;
      let targetEmail = user_email;
      let webhookUrl = "";
      if (user_email) {
        const r = await pool.query(`SELECT whatsapp_webhook_url FROM crm_webhook_settings WHERE user_id = $1`, [user_email]);
        if (r.rows[0]?.whatsapp_webhook_url) {
          webhookUrl = r.rows[0].whatsapp_webhook_url;
          targetEmail = user_email;
        }
      }
      if (!webhookUrl && lead.responsavel_id) {
        const userRes = await pool.query("SELECT email FROM users WHERE id = $1", [lead.responsavel_id]);
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
        const r = await pool.query(`SELECT user_id, whatsapp_webhook_url FROM crm_webhook_settings WHERE whatsapp_webhook_url IS NOT NULL AND whatsapp_webhook_url != '' LIMIT 1`);
        if (r.rows[0]?.whatsapp_webhook_url) {
          webhookUrl = r.rows[0].whatsapp_webhook_url;
          targetEmail = r.rows[0].user_id;
        }
      }
      if (!webhookUrl) {
        console.log(`[Webhook Trigger] Nenhum webhook configurado para: ${user_email}`);
        return res.status(400).json({ error: "URL do Webhook do WhatsApp n\xE3o configurada na aba Webhook." });
      }
      console.log(`[Webhook Trigger] Usando webhook de: ${targetEmail} \u2192 ${webhookUrl}`);
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
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "whatsapp_group_requested",
          // Dados principais
          lead_id: ld.id || lead.id,
          nome: ld.nome,
          telefone: ld.telefone,
          valor: ld.valor,
          origem: ld.origem,
          responsavel_id: ld.responsavel_id,
          // Informações do contato
          nicho: ld.nicho,
          instagram: ld.instagram,
          tempo_oab: ld.tempo_oab,
          faturamento: ld.faturamento,
          observacoes: ld.observacoes,
          tags: ld.tags,
          // Dados do formulário
          formulario: {
            nome_completo: ld.form_nome_completo,
            nome_fantasia: ld.form_nome_fantasia,
            telefone_whatsapp: ld.form_telefone_whatsapp,
            cnpj_cpf: ld.form_cnpj_cpf,
            cep: ld.form_cep,
            cidade: ld.form_cidade,
            estado: ld.form_estado
          },
          // UTMs
          utms: {
            platform: ld.utm_platform,
            campaign: ld.utm_campaign,
            set: ld.utm_set,
            creative: ld.utm_creative,
            position: ld.utm_position
          }
        })
      }).catch((e) => console.error("Error firing whatsapp webhook:", e.message));
      try {
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
           VALUES ($1, 'whatsapp_trigger', $2, $3)`,
          [lead.id, "Grupo do Whatsapp Criado \u2705", "Sistema"]
        );
      } catch (logErr) {
        console.error("Error logging whatsapp group creation to history:", logErr);
      }
      res.json({ success: true, message: "Webhook disparado" });
    } catch (err) {
      console.error("Error triggering whatsapp webhook:", err);
      res.status(500).json({ error: "Falha interna ao disparar webhook" });
    }
  });
  app.get("/api/api4com/test-connection", async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, message: "user_id \xE9 obrigat\xF3rio" });
    try {
      const result = await pool.query("SELECT api4com_token, api4com_domain FROM crm_api4com_settings WHERE user_id = $1", [user_id]);
      if (result.rows.length === 0 || !result.rows[0].api4com_token) {
        return res.json({ success: false, message: "Token n\xE3o configurado. Salve as configura\xE7\xF5es primeiro." });
      }
      const token = result.rows[0].api4com_token;
      let apiResult;
      try {
        apiResult = await api4comRequest("GET", "/users/me", token);
      } catch (fetchErr) {
        console.error("[API4COM] External request failed:", fetchErr);
        return res.json({ success: false, message: "N\xE3o foi poss\xEDvel contactar a Api4Com. Verifique a conectividade." });
      }
      if (apiResult.status >= 200 && apiResult.status < 300) {
        const data = apiResult.data;
        return res.json({ success: true, message: `\u2713 Conectado \u2014 ${data.email || data.username || "conta verificada"}` });
      } else {
        return res.json({ success: false, message: `Token inv\xE1lido ou sem permiss\xE3o (HTTP ${apiResult.status})` });
      }
    } catch (err) {
      console.error("Error in test-connection:", err);
      return res.json({ success: false, message: "Erro interno. Tente novamente." });
    }
  });
  app.get("/api/api4com/extensions", async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    try {
      const result = await pool.query("SELECT api4com_token, api4com_domain FROM crm_api4com_settings WHERE user_id = $1", [user_id]);
      if (result.rows.length === 0 || !result.rows[0].api4com_token) {
        return res.status(400).json({ error: "Token n\xE3o configurado" });
      }
      const { api4com_token, api4com_domain } = result.rows[0];
      const extResult = await api4comRequest("GET", `/extensions?domain=${encodeURIComponent(api4com_domain)}`, api4com_token);
      console.log("[API4COM] Extensions:", JSON.stringify(extResult.data));
      res.json(extResult.data);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch extensions" });
    }
  });
  app.get("/api/api4com/sip-credentials", async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });
    try {
      const result = await pool.query("SELECT * FROM crm_api4com_settings WHERE user_id = $1", [user_id]);
      if (result.rows.length === 0 || !result.rows[0].api4com_token) {
        return res.status(404).json({ error: "Token n\xE3o configurado" });
      }
      const { api4com_token, api4com_domain, sip_extension, sip_password, sip_server } = result.rows[0];
      let wssServer = sip_server || `wss://${api4com_domain}`;
      let sipDomain = api4com_domain;
      let sipUser = sip_extension;
      let sipPass = sip_password;
      try {
        const extResult = await api4comRequest("GET", `/extensions/${sip_extension}`, api4com_token);
        console.log("[SIP CREDS] /extensions response:", extResult.status, JSON.stringify(extResult.data).slice(0, 300));
        if (extResult.status === 200 && extResult.data) {
          const d = extResult.data;
          if (d.wss_server) wssServer = d.wss_server;
          else if (d.websocket_server) wssServer = d.websocket_server;
          else if (d.sip_server) wssServer = d.sip_server;
          if (d.sip_domain || d.domain) sipDomain = d.sip_domain || d.domain;
          if (d.sip_user || d.username) sipUser = d.sip_user || d.username || sip_extension;
          if (d.sip_password || d.password) sipPass = d.sip_password || d.password || sip_password;
        }
      } catch (e) {
        console.warn("[SIP CREDS] Could not fetch extension details:", e);
      }
      try {
        const meResult = await api4comRequest("GET", "/users/me", api4com_token);
        console.log("[SIP CREDS] /users/me response:", meResult.status, JSON.stringify(meResult.data).slice(0, 300));
        if (meResult.status === 200 && meResult.data) {
          const d = meResult.data;
          if (d.wss_server && !wssServer.includes(":8089")) wssServer = d.wss_server;
          if (d.sip_domain) sipDomain = d.sip_domain;
        }
      } catch (e) {
      }
      res.json({
        extension: sipUser,
        password: sipPass,
        domain: sipDomain,
        wss_server: wssServer,
        raw_sip_server: sip_server
      });
    } catch (err) {
      console.error("[SIP CREDS] Error:", err);
      res.status(500).json({ error: "Erro ao buscar credenciais SIP" });
    }
  });
  app.post("/api/api4com/call/initiate", async (req, res) => {
    const { user_id, phone, lead_id } = req.body;
    console.log("[DIALER DEBUG] Request body:", JSON.stringify(req.body));
    if (!user_id || !phone) return res.status(400).json({ error: "user_id and phone are required" });
    try {
      console.log("[DIALER DEBUG] Querying DB for user:", user_id);
      const result = await pool.query("SELECT * FROM crm_api4com_settings WHERE user_id = $1", [user_id]);
      console.log("[DIALER DEBUG] DB rows found:", result.rows.length);
      if (result.rows.length === 0 || !result.rows[0].api4com_token || !result.rows[0].sip_extension) {
        console.log("[DIALER DEBUG] Missing token or extension:", result.rows[0]);
        return res.status(400).json({ error: "Telefonia n\xE3o configurada para este usu\xE1rio" });
      }
      const { api4com_token, sip_extension } = result.rows[0];
      console.log("[DIALER DEBUG] Using extension:", sip_extension, "token length:", api4com_token?.length);
      let normalizedPhone = phone.replace(/\D/g, "");
      if (!normalizedPhone.startsWith("55")) {
        normalizedPhone = "55" + normalizedPhone;
      }
      normalizedPhone = "+" + normalizedPhone;
      console.log(`[API4COM] Initiating call: extension=${sip_extension}, phone=${normalizedPhone}`);
      let dialerResult;
      try {
        dialerResult = await api4comRequest("POST", "/dialer", api4com_token, {
          extension: sip_extension,
          phone: normalizedPhone,
          metadata: { gateway: "grapehub-crm", userId: user_id, entityId: lead_id }
        });
      } catch (fetchErr) {
        console.error("[API4COM] Dialer request failed:", fetchErr);
        return res.status(500).json({ error: "Falha de conex\xE3o com a Api4Com" });
      }
      console.log(`[API4COM] Dialer response: status=${dialerResult.status}`, JSON.stringify(dialerResult.data));
      if (dialerResult.status < 200 || dialerResult.status >= 300) {
        const errMsg = dialerResult.data?.message || dialerResult.data?.error || JSON.stringify(dialerResult.data);
        return res.status(400).json({ error: "Falha ao iniciar chamada", details: dialerResult.data, message: errMsg });
      }
      if (lead_id && lead_id !== "test123") {
        try {
          await pool.query(
            `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name, from_coluna, to_coluna)
             VALUES ($1, 'call_initiated', $2, $3, '', '')`,
            [lead_id, `\u{1F4DE} Chamada iniciada para ${phone}`, req.body.user_name || "Sistema"]
          );
        } catch (histErr) {
          console.warn("[DIALER] Could not log history:", histErr);
        }
      }
      res.json({ success: true, call_id: dialerResult.data?.id });
    } catch (err) {
      console.error("[DIALER DEBUG] FATAL error:", err);
      res.status(500).json({ error: "Erro interno ao iniciar chamada", detail: String(err) });
    }
  });
  app.post("/api/api4com/webhook", async (req, res) => {
    try {
      const body = req.body;
      console.log("[API4COM WEBHOOK] Received:", JSON.stringify(body).slice(0, 300));
      const eventType = body.eventType;
      const metadata = body.metadata || {};
      const caller = body.caller;
      const called = body.called;
      const duration = body.duration || 0;
      const answeredAt = body.answeredAt;
      const hangupCause = body.hangupCause || body.hangup_cause;
      const recordUrl = body.recordUrl || body.record_url;
      const direction = body.direction || "outbound";
      if (eventType === "channel-hangup" && metadata?.entityId) {
        const leadId = metadata.entityId;
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        const durationStr = mins > 0 ? `${mins}min ${secs}s` : `${secs}s`;
        const answered = !!answeredAt && hangupCause === "NORMAL_CLEARING";
        const description = answered ? `\u{1F4DE} Liga\xE7\xE3o ${direction === "inbound" ? "recebida de" : "para"} ${called} \u2014 Dura\xE7\xE3o: ${durationStr}${recordUrl ? ` \u2014 \u{1F3A7} Grava\xE7\xE3o dispon\xEDvel` : ""}` : `\u{1F4DE} Liga\xE7\xE3o para ${called} \u2014 N\xE3o atendida (${hangupCause || "sem resposta"})`;
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name, from_coluna, to_coluna)
           VALUES ($1, 'call_completed', $2, $3, '', '')`,
          [leadId, description, `Ramal ${caller}`]
        );
        console.log(`[API4COM WEBHOOK] Logged call for lead ${leadId}: ${answered ? "answered" : "not answered"}`);
      }
      res.json({ received: true });
    } catch (err) {
      console.error("Error processing api4com webhook:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
  app.post("/api/api4com/register-webhook", async (req, res) => {
    try {
      const { user_id } = req.body;
      if (!user_id) return res.status(400).json({ error: "user_id required" });
      const settingsRes = await pool.query(
        `SELECT api4com_token, api4com_domain FROM crm_api4com_settings WHERE user_id = $1`,
        [user_id]
      );
      if (!settingsRes.rows.length || !settingsRes.rows[0].api4com_token) {
        return res.status(404).json({ error: "Api4Com not configured" });
      }
      const { api4com_token } = settingsRes.rows[0];
      const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost:3000";
      const protocol = req.headers["x-forwarded-proto"] || (process.env.NODE_ENV === "production" ? "https" : "http");
      const webhookUrl = `${protocol}://${host}/api/api4com/webhook`;
      console.log(`[WEBHOOK REGISTER] Registering webhook at: ${webhookUrl}`);
      const apiRes = await fetch("https://api.api4com.com/api/v1/integrations", {
        method: "PATCH",
        headers: { "Authorization": api4com_token, "Content-Type": "application/json" },
        body: JSON.stringify({
          gateway: "grapehub-crm",
          webhook: true,
          webhookConstraint: { metadata: { gateway: "grapehub-crm" } },
          metadata: {
            webhookUrl,
            webhookVersion: "v1.4",
            webhookTypes: ["channel-hangup"]
          }
        })
      });
      const data = await apiRes.json();
      if (!apiRes.ok) {
        return res.status(apiRes.status).json({ error: "Failed to register webhook", detail: data });
      }
      res.json({ success: true, webhookUrl, data });
    } catch (err) {
      console.error("[WEBHOOK REGISTER] Error:", err);
      res.status(500).json({ error: "Erro ao registrar webhook", detail: String(err) });
    }
  });
  app.get("/api/api4com/calls", async (req, res) => {
    try {
      const { user_id, phone, page = "1", limit = "20", started_after, started_before } = req.query;
      if (!user_id) return res.status(400).json({ error: "user_id required" });
      const settingsRes = await pool.query(
        `SELECT api4com_token, api4com_domain FROM crm_api4com_settings WHERE user_id = $1`,
        [user_id]
      );
      if (!settingsRes.rows.length || !settingsRes.rows[0].api4com_token) {
        return res.status(404).json({ error: "Api4Com not configured" });
      }
      const { api4com_token } = settingsRes.rows[0];
      const filter = {};
      if (phone) {
        const cleanPhone = String(phone).replace(/\D/g, "");
        filter.where = { or: [
          { to: phone },
          { to: cleanPhone },
          { to: { like: `%${cleanPhone.slice(-9)}%` } }
        ] };
      }
      if (started_after || started_before) {
        if (!filter.where) filter.where = {};
        filter.where.started_at = {};
        if (started_after) filter.where.started_at.gte = started_after;
        if (started_before) filter.where.started_at.lte = started_before;
      }
      filter.order = "started_at DESC";
      filter.limit = parseInt(limit, 10);
      const filterStr = encodeURIComponent(JSON.stringify(filter));
      const url = `https://api.api4com.com/api/v1/calls?page=${page}&filter=${filterStr}`;
      const apiRes = await fetch(url, {
        headers: {
          "Authorization": api4com_token,
          "Content-Type": "application/json"
        }
      });
      let data = await apiRes.json();
      let enrichedData = Array.isArray(data) ? data : data.data || [];
      if (enrichedData.length > 0) {
        const phonesSet = /* @__PURE__ */ new Set();
        enrichedData.forEach((c) => {
          const phone2 = c.call_type === "inbound" ? c.caller_id_number : c.to;
          if (phone2) {
            const clean = String(phone2).replace(/\D/g, "");
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
            const leadsRes = await pool.query(
              `SELECT l.telefone, u.name as responsavel_name, u.email as responsavel_email 
                FROM crm_comercial_leads l 
                LEFT JOIN users u ON u.email = l.responsavel_id 
                WHERE regexp_replace(l.telefone, '\\D', '', 'g') = ANY($1)`,
              [phonesArray]
            );
            const leadMap = /* @__PURE__ */ new Map();
            leadsRes.rows.forEach((r) => {
              const clean = String(r.telefone).replace(/\D/g, "");
              leadMap.set(clean, r.responsavel_name || r.responsavel_email);
            });
            enrichedData = enrichedData.map((c) => {
              const phone2 = c.call_type === "inbound" ? c.caller_id_number : c.to;
              const clean = phone2 ? String(phone2).replace(/\D/g, "") : "";
              const owner = leadMap.get(clean) || leadMap.get("55" + clean) || (clean.length >= 10 ? leadMap.get(clean.slice(-10)) : null) || (clean.length >= 11 ? leadMap.get(clean.slice(-11)) : null);
              if (owner) {
                c.crm_responsavel = owner;
              }
              return c;
            });
          } catch (errMap) {
            console.error("Error enriching api4com data:", errMap);
          }
        }
      }
      if (Array.isArray(data)) {
        data = enrichedData;
      } else {
        data.data = enrichedData;
      }
      if (Array.isArray(data) && data.length > 0) {
        console.log("[API4COM CALLS DEBUG] first started_at:", data[0].started_at, "| type:", typeof data[0].started_at);
      } else if (data?.data?.length > 0) {
        console.log("[API4COM CALLS DEBUG] first started_at:", data.data[0].started_at, "| type:", typeof data.data[0].started_at);
      }
      res.json(data);
    } catch (err) {
      console.error("[API4COM CALLS]", err);
      res.status(500).json({ error: "Erro ao buscar hist\xF3rico de liga\xE7\xF5es" });
    }
  });
  app.get("/api/public/lead-form/:id", async (req, res) => {
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
  app.post("/api/public/lead-form/:id", async (req, res) => {
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
      try {
        await pool.query(
          `INSERT INTO crm_comercial_history (lead_id, action_type, description, user_name)
           VALUES ($1, 'whatsapp_trigger', $2, $3)`,
          [id, "Formul\xE1rio Preenchido \u2705", "Sistema"]
        );
      } catch (logErr) {
        console.error("Error logging form submission to history:", logErr);
      }
      res.json({ success: true, id });
      try {
        const webhookRes = await pool.query(`
          SELECT form_webhook_url 
          FROM crm_webhook_settings 
          WHERE form_webhook_url IS NOT NULL AND form_webhook_url != ''
          LIMIT 1
        `);
        if (webhookRes.rows.length > 0 && webhookRes.rows[0].form_webhook_url) {
          const webhookUrl = webhookRes.rows[0].form_webhook_url;
          console.log(`[WEBHOOK] Firing form_submitted webhook to: ${webhookUrl} for lead ${id}`);
          fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "form_submitted",
              lead_id: id,
              nome: updatedLead.nome,
              telefone: updatedLead.telefone,
              nicho: updatedLead.nicho,
              responsavel_id: updatedLead.responsavel_id,
              formData: {
                form_nome_completo,
                form_nome_fantasia,
                form_telefone_whatsapp,
                form_cnpj_cpf,
                form_cep,
                form_cidade,
                form_estado
              }
            })
          }).then((r) => console.log(`[WEBHOOK] Response status: ${r.status}`)).catch((e) => console.error("[WEBHOOK] Error firing webhook:", e.message));
        } else {
          console.log(`[WEBHOOK] No form_webhook_url configured, skipping webhook for lead ${id}`);
        }
      } catch (webhookErr) {
        console.error("Error in webhook logic:", webhookErr);
      }
    } catch (err) {
      console.error("POST public leadform error:", err);
      res.status(500).json({ error: "Internal error" });
    }
  });
  app.get("/api/crm-metricas-dashboard", async (req, res) => {
    try {
      const { month, start, end } = req.query;
      let startDate = "";
      let endDate = "";
      let year = (/* @__PURE__ */ new Date()).getFullYear();
      let mon = (/* @__PURE__ */ new Date()).getMonth() + 1;
      if (typeof start === "string" && typeof end === "string" && start && end) {
        startDate = start;
        endDate = end;
        const startObj = new Date(start);
        year = startObj.getFullYear();
        mon = startObj.getMonth() + 1;
      } else {
        const selectedMonth = typeof month === "string" && month ? month : (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
        const [y, m] = selectedMonth.split("-").map(Number);
        year = y;
        mon = m;
        startDate = `${selectedMonth}-01`;
        endDate = new Date(year, mon, 0).toISOString().slice(0, 10);
      }
      const fechCols = await pool.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name='fechamentos' ORDER BY ordinal_position
      `);
      const colNames = fechCols.rows.map((r) => r.column_name);
      const origemCol = colNames.find(
        (c) => c.toLowerCase().includes("indica") || c.toLowerCase().includes("campa") || c.toLowerCase().includes("origem")
      ) || colNames[4] || "id";
      const valorCol = colNames.find(
        (c) => c.toLowerCase() === "valor" || c.toLowerCase().includes("valor")
      ) || colNames[3] || "id";
      const nomeCol = colNames.find((c) => c.toLowerCase() === "nome") || colNames[2] || "id";
      const fatCol = colNames.find((c) => c.toLowerCase().includes("fatura")) || origemCol;
      const cidadeCol = colNames.find((c) => c.toLowerCase().includes("cidade")) || "id";
      const fechamentosMonth = await pool.query(`
        SELECT id, day, "${nomeCol}" as "Nome", "${valorCol}" as "Valor", "${origemCol}" as origem, "${cidadeCol}" as "Cidade"
        FROM fechamentos
        WHERE day >= $1 AND day <= $2
        ORDER BY day DESC
      `, [startDate, endDate]);
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
      const reunCols = await pool.query(`
        SELECT column_name FROM information_schema.columns WHERE table_name='reunioes' ORDER BY ordinal_position
      `);
      const rCols = reunCols.rows.map((r) => r.column_name);
      const rMarcadas = rCols.find((c) => c.toLowerCase().includes("marca")) || rCols[2] || "id";
      const rRealizadas = rCols.find((c) => c.toLowerCase().includes("realiz")) || rCols[5] || "id";
      const rNoshow = rCols.find((c) => c.toLowerCase().includes("noshow") || c.toLowerCase().includes("no-show") || c.toLowerCase() === "noshow") || rCols[3] || "id";
      const rReagend = rCols.find((c) => c.toLowerCase().includes("reagend")) || rCols[4] || "id";
      const rDay = rCols.find((c) => c.toLowerCase() === "day") || rCols[1] || "id";
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
      const preVendasKanban = await pool.query(
        `SELECT id FROM crm_comercial_kanbans WHERE LOWER(nome) LIKE '%pr_-vendas%' OR LOWER(nome) LIKE '%pr__vendas%' OR LOWER(nome) LIKE '%pre vendas%' OR LOWER(nome) LIKE '%pr\xE9 vendas%' LIMIT 1`
      ).catch(() => ({ rows: [] }));
      const preVendasKanbanId = preVendasKanban.rows[0]?.id || null;
      const reunMarcadasMonth = await pool.query(`
        SELECT COUNT(DISTINCT sub.lead_id) AS marcadas
        FROM (
          SELECT h.lead_id
          FROM crm_comercial_history h
          JOIN crm_comercial_columns c ON h.to_coluna = c.id::text
          WHERE (LOWER(c.title) LIKE '%reuni\xE3o marcada%' OR LOWER(c.title) LIKE '%reuniao marcada%')
            AND h.created_at >= $1 AND h.created_at <= ($2::date + interval '1 day')
          UNION
          SELECT l.id AS lead_id
          FROM crm_comercial_leads l
          JOIN crm_comercial_columns c ON l.coluna = c.id::text
          WHERE (LOWER(c.title) LIKE '%reuni\xE3o marcada%' OR LOWER(c.title) LIKE '%reuniao marcada%')
            AND l.created_at >= $1 AND l.created_at <= ($2::date + interval '1 day')
          UNION
          SELECT h.lead_id
          FROM crm_comercial_history h
          JOIN crm_comercial_columns c ON h.from_coluna = c.id::text
          WHERE (LOWER(c.title) LIKE '%reuni\xE3o marcada%' OR LOWER(c.title) LIKE '%reuniao marcada%')
            AND h.created_at >= $1 AND h.created_at <= ($2::date + interval '1 day')
        ) sub
      `, [startDate, endDate]);
      const reunRealizadasMonth = await pool.query(`
        SELECT COUNT(DISTINCT m.lead_id) AS realizadas
        FROM crm_comercial_meetings m
        WHERE m.meeting_date >= $1 AND m.meeting_date <= ($2::date + interval '1 day')
      `, [startDate, endDate]);
      const reunNoshowMonth = await pool.query(`
        SELECT COUNT(DISTINCT h.lead_id) AS noshow
        FROM crm_comercial_history h
        JOIN crm_comercial_columns c ON h.to_coluna = c.id::text
        WHERE (LOWER(c.title) LIKE '%noshow%' OR LOWER(c.title) LIKE '%no-show%' OR LOWER(c.title) LIKE '%no show%')
          AND h.created_at >= $1 AND h.created_at <= ($2::date + interval '1 day')
      `, [startDate, endDate]);
      const reunReagendMonth = await pool.query(`
        SELECT COUNT(DISTINCT h.lead_id) AS reagendamento
        FROM crm_comercial_history h
        JOIN crm_comercial_columns c ON h.to_coluna = c.id::text
        WHERE LOWER(c.title) LIKE '%reagend%'
          AND h.created_at >= $1 AND h.created_at <= ($2::date + interval '1 day')
      `, [startDate, endDate]);
      const reunioesMonthData = {
        marcadas: Number(reunMarcadasMonth.rows[0]?.marcadas) || 0,
        realizadas: Number(reunRealizadasMonth.rows[0]?.realizadas) || 0,
        noshow: Number(reunNoshowMonth.rows[0]?.noshow) || 0,
        reagendamento: Number(reunReagendMonth.rows[0]?.reagendamento) || 0
      };
      let prevStart = "";
      let prevEnd = "";
      if (typeof start === "string" && typeof end === "string" && start && end) {
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
        const diffDays = Math.ceil(diffTime / (1e3 * 60 * 60 * 24)) + 1;
        const prevStartObj = new Date(sDate);
        prevStartObj.setDate(prevStartObj.getDate() - diffDays);
        const prevEndObj = new Date(eDate);
        prevEndObj.setDate(prevEndObj.getDate() - diffDays);
        prevStart = prevStartObj.toISOString().slice(0, 10);
        prevEnd = prevEndObj.toISOString().slice(0, 10);
      } else {
        const prevDate = new Date(year, mon - 2, 1);
        const prevYear = prevDate.getFullYear();
        const prevMon = prevDate.getMonth() + 1;
        prevStart = `${prevYear}-${String(prevMon).padStart(2, "0")}-01`;
        prevEnd = new Date(prevYear, prevMon, 0).toISOString().slice(0, 10);
      }
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
      const comercialKanban = await pool.query(
        `SELECT id FROM crm_comercial_kanbans WHERE LOWER(nome) LIKE '%comercial%' OR (LOWER(nome) LIKE '%vendas%' AND LOWER(nome) NOT LIKE '%pr%') LIMIT 1`
      ).catch(() => ({ rows: [] }));
      const comercialKanbanId = comercialKanban.rows[0]?.id || null;
      const perdidosKanban = await pool.query(
        `SELECT id FROM crm_comercial_kanbans WHERE LOWER(nome) LIKE '%perdido%' LIMIT 1`
      ).catch(() => ({ rows: [] }));
      const perdidosKanbanId = perdidosKanban.rows[0]?.id || null;
      const lossReasonsMonth = comercialKanbanId ? await pool.query(`
        SELECT
          COALESCE(lr.name, 'Sem motivo') AS name,
          COUNT(cl.id) AS total
        FROM crm_comercial_leads cl
        LEFT JOIN crm_comercial_loss_reasons lr ON cl.loss_reason_id = lr.id
        WHERE cl.is_lost = true
          AND (
            cl.kanban_id::text = $3::text
            OR (
              $4::text IS NOT NULL AND cl.kanban_id::text = $4::text 
              AND cl.coluna::text IN (
                SELECT id::text FROM crm_comercial_columns 
                WHERE kanban_id::text = $4::text AND (LOWER(title) LIKE '%venda%' OR LOWER(title) LIKE '%comercial%') AND LOWER(title) NOT LIKE '%pr%'
              )
            )
          )
          AND cl.updated_at >= $1 AND cl.updated_at <= ($2::date + interval '1 day')
        GROUP BY lr.name
        ORDER BY total DESC
      `, [startDate, endDate, comercialKanbanId, perdidosKanbanId]) : { rows: [] };
      const lossReasonsPreVendas = preVendasKanbanId ? await pool.query(`
        SELECT
          COALESCE(lr.name, 'Sem motivo') AS name,
          COUNT(cl.id) AS total
        FROM crm_comercial_leads cl
        LEFT JOIN crm_comercial_loss_reasons lr ON cl.loss_reason_id = lr.id
        WHERE cl.is_lost = true
          AND (
            cl.kanban_id::text = $3::text
            OR (
              $4::text IS NOT NULL AND cl.kanban_id::text = $4::text 
              AND cl.coluna::text IN (
                SELECT id::text FROM crm_comercial_columns 
                WHERE kanban_id::text = $4::text AND (LOWER(title) LIKE '%pr\xE9%' OR LOWER(title) LIKE '%pre%')
              )
            )
          )
          AND cl.updated_at >= $1 AND cl.updated_at <= ($2::date + interval '1 day')
        GROUP BY lr.name
        ORDER BY total DESC
      `, [startDate, endDate, preVendasKanbanId, perdidosKanbanId]) : { rows: [] };
      const leadsMonth = await pool.query(`
        SELECT COUNT(*) AS total
        FROM crm_comercial_leads
        WHERE created_at >= $1 AND created_at <= ($2::date + interval '1 day')
      `, [startDate, endDate]);
      const leadsPrev = await pool.query(`
        SELECT COUNT(*) AS total
        FROM crm_comercial_leads
        WHERE created_at >= $1 AND created_at <= ($2::date + interval '1 day')
      `, [prevStart, prevEnd]);
      const leadsPerDay = await pool.query(`
        SELECT
          created_at::date AS dia,
          COUNT(*) AS total
        FROM crm_comercial_leads
        WHERE created_at >= $1 AND created_at <= ($2::date + interval '1 day')
        GROUP BY created_at::date
        ORDER BY dia ASC
      `, [startDate, endDate]);
      const reunMarcadasPrev = await pool.query(`
        SELECT COUNT(DISTINCT sub.lead_id) AS marcadas
        FROM (
          SELECT h.lead_id
          FROM crm_comercial_history h
          JOIN crm_comercial_columns c ON h.to_coluna = c.id::text
          WHERE (LOWER(c.title) LIKE '%reuni\xE3o marcada%' OR LOWER(c.title) LIKE '%reuniao marcada%')
            AND h.created_at >= $1 AND h.created_at <= ($2::date + interval '1 day')
          UNION
          SELECT l.id AS lead_id
          FROM crm_comercial_leads l
          JOIN crm_comercial_columns c ON l.coluna = c.id::text
          WHERE (LOWER(c.title) LIKE '%reuni\xE3o marcada%' OR LOWER(c.title) LIKE '%reuniao marcada%')
            AND l.created_at >= $1 AND l.created_at <= ($2::date + interval '1 day')
          UNION
          SELECT h.lead_id
          FROM crm_comercial_history h
          JOIN crm_comercial_columns c ON h.from_coluna = c.id::text
          WHERE (LOWER(c.title) LIKE '%reuni\xE3o marcada%' OR LOWER(c.title) LIKE '%reuniao marcada%')
            AND h.created_at >= $1 AND h.created_at <= ($2::date + interval '1 day')
        ) sub
      `, [prevStart, prevEnd]);
      const reunRealizadasPrev = await pool.query(`
        SELECT COUNT(DISTINCT m.lead_id) AS realizadas
        FROM crm_comercial_meetings m
        WHERE m.meeting_date >= $1 AND m.meeting_date <= ($2::date + interval '1 day')
      `, [prevStart, prevEnd]);
      const reunNoshowPrev = await pool.query(`
        SELECT COUNT(DISTINCT h.lead_id) AS noshow
        FROM crm_comercial_history h
        JOIN crm_comercial_columns c ON h.to_coluna = c.id::text
        WHERE (LOWER(c.title) LIKE '%noshow%' OR LOWER(c.title) LIKE '%no-show%' OR LOWER(c.title) LIKE '%no show%')
          AND h.created_at >= $1 AND h.created_at <= ($2::date + interval '1 day')
      `, [prevStart, prevEnd]);
      const reunReagendPrev = await pool.query(`
        SELECT COUNT(DISTINCT h.lead_id) AS reagendamento
        FROM crm_comercial_history h
        JOIN crm_comercial_columns c ON h.to_coluna = c.id::text
        WHERE LOWER(c.title) LIKE '%reagend%'
          AND h.created_at >= $1 AND h.created_at <= ($2::date + interval '1 day')
      `, [prevStart, prevEnd]);
      const reunioesPrevData = {
        marcadas: Number(reunMarcadasPrev.rows[0]?.marcadas) || 0,
        realizadas: Number(reunRealizadasPrev.rows[0]?.realizadas) || 0,
        noshow: Number(reunNoshowPrev.rows[0]?.noshow) || 0,
        reagendamento: Number(reunReagendPrev.rows[0]?.reagendamento) || 0
      };
      const funilPreVendas = preVendasKanbanId ? await pool.query(`
        WITH lead_columns AS (
          SELECT id as lead_id, coluna::text as col_id 
          FROM crm_comercial_leads 
          WHERE kanban_id::text = $3::text AND created_at >= $1 AND created_at <= ($2::date + interval '1 day')
          UNION
          SELECT l.id as lead_id, h.to_coluna::text as col_id 
          FROM crm_comercial_leads l 
          JOIN crm_comercial_history h ON h.lead_id = l.id 
          WHERE l.kanban_id::text = $3::text AND l.created_at >= $1 AND l.created_at <= ($2::date + interval '1 day') AND h.to_coluna IS NOT NULL
          UNION
          SELECT l.id as lead_id, h.from_coluna::text as col_id 
          FROM crm_comercial_leads l 
          JOIN crm_comercial_history h ON h.lead_id = l.id 
          WHERE l.kanban_id::text = $3::text AND l.created_at >= $1 AND l.created_at <= ($2::date + interval '1 day') AND h.from_coluna IS NOT NULL
        )
        SELECT c.title, c.order_index, COUNT(DISTINCT lc.lead_id) as total
        FROM crm_comercial_columns c
        LEFT JOIN lead_columns lc ON lc.col_id = c.id::text
        WHERE c.kanban_id::text = $3::text
        GROUP BY c.id, c.title, c.order_index
        ORDER BY c.order_index ASC
      `, [startDate, endDate, preVendasKanbanId]) : { rows: [] };
      const origemPreVendas = preVendasKanbanId ? await pool.query(`
        SELECT COALESCE(NULLIF(origem, ''), 'Desconhecido') as origem, COUNT(id) as total
        FROM crm_comercial_leads
        WHERE kanban_id::text = $3::text
          AND created_at >= $1 AND created_at <= ($2::date + interval '1 day')
        GROUP BY COALESCE(NULLIF(origem, ''), 'Desconhecido')
        ORDER BY total DESC
      `, [startDate, endDate, preVendasKanbanId]) : { rows: [] };
      const tentativasContato = preVendasKanbanId ? await pool.query(`
        SELECT t.lead_id, count(t.id) as attempts
        FROM crm_comercial_tasks t
        JOIN crm_comercial_leads l ON t.lead_id = l.id
        WHERE t.completed = true 
          AND t.type IN ('WhatsApp', 'Liga\xE7\xE3o')
          AND l.kanban_id::text = $3::text
          AND l.created_at >= $1 AND l.created_at <= ($2::date + interval '1 day')
        GROUP BY t.lead_id
      `, [startDate, endDate, preVendasKanbanId]) : { rows: [] };
      const tentativasPrev = preVendasKanbanId ? await pool.query(`
        SELECT t.lead_id, count(t.id) as attempts
        FROM crm_comercial_tasks t
        JOIN crm_comercial_leads l ON t.lead_id = l.id
        WHERE t.completed = true 
          AND t.type IN ('WhatsApp', 'Liga\xE7\xE3o')
          AND l.kanban_id::text = $3::text
          AND l.created_at >= $1 AND l.created_at <= ($2::date + interval '1 day')
        GROUP BY t.lead_id
      `, [prevStart, prevEnd, preVendasKanbanId]) : { rows: [] };
      const agingLeads = preVendasKanbanId ? await pool.query(`
        SELECT EXTRACT(DAY FROM (NOW() - updated_at)) as dias
        FROM crm_comercial_leads
        WHERE kanban_id::text = $1::text AND is_lost = false
      `, [preVendasKanbanId]) : { rows: [] };
      const totalPerdas = lossReasonsMonth.rows.reduce((s, r) => s + Number(r.total), 0);
      res.json({
        month: startDate.slice(0, 7),
        kpis: kpisMonth.rows[0],
        kpis_prev: kpisPrev.rows[0],
        fechamentos_list: fechamentosMonth.rows,
        fechamentos_year: fechamentosYear.rows,
        reunioes_year: reunioesYear.rows,
        reunioes_month: reunioesMonthData,
        reunioes_prev: reunioesPrevData,
        leads_month: Number(leadsMonth.rows[0]?.total) || 0,
        leads_prev: Number(leadsPrev.rows[0]?.total) || 0,
        leads_per_day: leadsPerDay.rows,
        loss_reasons_month: lossReasonsMonth.rows,
        loss_reasons_pre_vendas: lossReasonsPreVendas.rows,
        funil_pre_vendas: funilPreVendas.rows,
        origem_pre_vendas: origemPreVendas.rows,
        tentativas_contato: tentativasContato.rows,
        tentativas_prev: tentativasPrev.rows,
        aging_leads: agingLeads.rows,
        total_perdas: totalPerdas,
        _debug_cols: { fechamentos: colNames, reunioes: rCols }
      });
    } catch (err) {
      console.error("[crm-metricas-dashboard] Error:", err.message);
      res.status(500).json({ error: "Failed to load dashboard", detail: err.message });
    }
  });
  app.patch("/api/onboarding-tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const fields = req.body;
      const allowed = ["client_name", "squad", "responsible_id", "responsible_name", "responsible_avatar", "start_date", "due_date", "status_group", "tags", "subtask_count", "nome_completo", "nome_fantasia", "telefone_whatsapp", "cnpj_cpf", "cep", "cidade", "uf", "produto", "responsavel_projeto_id", "responsavel_projeto_name", "responsavel_projeto_avatar", "hospedagem", "entregavel", "prioridade"];
      const DATE_FIELDS = ["start_date", "due_date"];
      const sets = [];
      const vals = [];
      let idx = 1;
      for (const key of allowed) {
        if (key in fields) {
          sets.push(`${key} = $${idx++}`);
          const val = DATE_FIELDS.includes(key) && fields[key] === "" ? null : fields[key];
          vals.push(val);
        }
      }
      if (sets.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar." });
      sets.push(`updated_at = NOW()`);
      vals.push(id);
      const result = await pool.query(
        `UPDATE onboarding_tasks SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
        vals
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Tarefa n\xE3o encontrada." });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("PATCH /api/onboarding-tasks error:", err);
      res.status(500).json({ error: "Erro ao atualizar tarefa." });
    }
  });
  app.delete("/api/onboarding-tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query("DELETE FROM onboarding_tasks WHERE id = $1 RETURNING id", [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: "Tarefa n\xE3o encontrada." });
      res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
      console.error("DELETE /api/onboarding-tasks error:", err);
      res.status(500).json({ error: "Erro ao excluir tarefa." });
    }
  });
  app.post("/api/onboarding-tasks/:id/archive", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `UPDATE onboarding_tasks SET status_group = 'arquivado', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Tarefa n\xE3o encontrada." });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("POST /api/onboarding-tasks/archive error:", err);
      res.status(500).json({ error: "Erro ao arquivar tarefa." });
    }
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS onboarding_tasks (
      id SERIAL PRIMARY KEY,
      client_name TEXT NOT NULL,
      squad TEXT,
      responsible_id TEXT,
      responsible_name TEXT,
      responsible_avatar TEXT,
      start_date DATE,
      due_date DATE,
      status_group TEXT NOT NULL DEFAULT 'a-fazer-briefing',
      tags TEXT[] DEFAULT '{}',
      subtask_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  const visualHubCols = ["responsavel_projeto_id", "responsavel_projeto_name", "responsavel_projeto_avatar", "hospedagem", "entregavel", "prioridade"];
  for (const col of visualHubCols) {
    await pool.query(`ALTER TABLE onboarding_tasks ADD COLUMN IF NOT EXISTS ${col} TEXT`).catch((e) => console.error(e));
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS onboarding_template_items (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      order_index INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  for (const col of ["description", "internal_doc"]) {
    await pool.query(`ALTER TABLE onboarding_template_items ADD COLUMN IF NOT EXISTS ${col} TEXT`);
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS onboarding_subtasks (
      id SERIAL PRIMARY KEY,
      task_id INT NOT NULL REFERENCES onboarding_tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT false,
      order_index INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  const formCols = ["nome_completo", "nome_fantasia", "telefone_whatsapp", "cnpj_cpf", "cep", "cidade", "uf", "meeting_info", "produto"];
  for (const col of formCols) {
    await pool.query(`ALTER TABLE onboarding_tasks ADD COLUMN IF NOT EXISTS ${col} TEXT`);
  }
  const subtaskCols = ["description", "due_date", "responsible_id", "responsible_name", "responsible_avatar", "internal_doc"];
  for (const col of subtaskCols) {
    await pool.query(`ALTER TABLE onboarding_subtasks ADD COLUMN IF NOT EXISTS ${col} TEXT`);
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS onboarding_comments (
      id SERIAL PRIMARY KEY,
      task_id INT NOT NULL REFERENCES onboarding_tasks(id) ON DELETE CASCADE,
      author_name TEXT,
      author_email TEXT,
      author_avatar TEXT,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE onboarding_comments ADD COLUMN IF NOT EXISTS author_avatar TEXT`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS onboarding_subtask_comments (
      id SERIAL PRIMARY KEY,
      subtask_id INT NOT NULL REFERENCES onboarding_subtasks(id) ON DELETE CASCADE,
      author_name TEXT,
      author_avatar TEXT,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS onboarding_subtask_files (
      id SERIAL PRIMARY KEY,
      subtask_id INT NOT NULL REFERENCES onboarding_subtasks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'pdf', 'doc', 'link'
      url TEXT,
      content TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ia_status_groups (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#8b5cf6',
      emoji TEXT NOT NULL DEFAULT '\u{1F4CC}',
      order_index INT NOT NULL DEFAULT 0
    )
  `);
  const sgCount = await pool.query("SELECT COUNT(*) FROM ia_status_groups");
  if (parseInt(sgCount.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO ia_status_groups (id, label, color, emoji, order_index) VALUES
        ('alteracoes', 'ALTERA\xC7\xD5ES', '#7c3aed', '\u{1F535}', 0),
        ('testes', 'TESTES', '#f97316', '\u{1F7E0}', 1)
      ON CONFLICT (id) DO NOTHING
    `);
  }
  await pool.query(`ALTER TABLE onboarding_tasks ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'operacional'`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS briefings (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Briefing Identidade Visual',
      task_id INT REFERENCES onboarding_tasks(id) ON DELETE SET NULL,
      task_name TEXT,
      form_data JSONB,
      submitted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visual_hub_files (
      id SERIAL PRIMARY KEY,
      task_id INT NOT NULL REFERENCES onboarding_tasks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'link',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visual_hub_status_groups (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#7c3aed',
      emoji TEXT NOT NULL DEFAULT '\u{1F535}',
      order_index INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  const existingGroups = await pool.query("SELECT COUNT(*) FROM visual_hub_status_groups");
  if (parseInt(existingGroups.rows[0].count) === 0) {
    const defaults = [
      { id: "revisao-iii", label: "REVIS\xC3O III", color: "#7c3aed", emoji: "\u{1F535}", order_index: 0 },
      { id: "alteracao-ii", label: "ALTERA\xC7\xC3O II", color: "#6d28d9", emoji: "\u{1F535}", order_index: 1 },
      { id: "revisao-ii", label: "REVIS\xC3O II", color: "#7c3aed", emoji: "\u{1F535}", order_index: 2 },
      { id: "alteracao-i", label: "ALTERA\xC7\xC3O I", color: "#6d28d9", emoji: "\u{1F535}", order_index: 3 },
      { id: "revisao-i", label: "REVIS\xC3O I", color: "#7c3aed", emoji: "\u{1F535}", order_index: 4 },
      { id: "em-desenvolvimento", label: "EM DESENVOLVIMENTO", color: "#ea580c", emoji: "\u{1F7E0}", order_index: 5 },
      { id: "a-desenvolver", label: "A DESENVOLVER", color: "#52525b", emoji: "\u2B1C", order_index: 6 },
      { id: "aguardando-copy", label: "AGUARDANDO COPY", color: "#3f3f46", emoji: "\u23F3", order_index: 7 }
    ];
    for (const d of defaults) {
      await pool.query(
        "INSERT INTO visual_hub_status_groups (id, label, color, emoji, order_index) VALUES ($1,$2,$3,$4,$5)",
        [d.id, d.label, d.color, d.emoji, d.order_index]
      );
    }
  }
  app.get("/api/visual-hub-status-groups", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM visual_hub_status_groups ORDER BY order_index ASC");
      res.json(result.rows);
    } catch (err) {
      console.error("GET /api/visual-hub-status-groups error:", err);
      res.status(500).json({ error: "Erro ao buscar grupos." });
    }
  });
  app.post("/api/visual-hub-status-groups", async (req, res) => {
    try {
      const { id, label, color, emoji, order_index } = req.body;
      if (!id || !label) return res.status(400).json({ error: "id e label obrigat\xF3rios." });
      const result = await pool.query(
        `INSERT INTO visual_hub_status_groups (id, label, color, emoji, order_index) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [id, label, color || "#7c3aed", emoji || "\u{1F535}", order_index ?? 0]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("POST /api/visual-hub-status-groups error:", err);
      res.status(500).json({ error: "Erro ao criar grupo." });
    }
  });
  app.patch("/api/visual-hub-status-groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const fields = req.body;
      const allowed = ["label", "color", "emoji", "order_index"];
      const sets = [];
      const vals = [];
      let idx = 1;
      for (const key of allowed) {
        if (key in fields) {
          sets.push(`${key} = $${idx++}`);
          vals.push(fields[key]);
        }
      }
      if (sets.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar." });
      vals.push(id);
      const result = await pool.query(
        `UPDATE visual_hub_status_groups SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
        vals
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Grupo n\xE3o encontrado." });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("PATCH /api/visual-hub-status-groups error:", err);
      res.status(500).json({ error: "Erro ao atualizar grupo." });
    }
  });
  app.delete("/api/visual-hub-status-groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query(
        `UPDATE onboarding_tasks SET status_group = 'a-desenvolver' WHERE status_group = $1 AND type = 'visual-hub'`,
        [id]
      );
      await pool.query("DELETE FROM visual_hub_status_groups WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/visual-hub-status-groups error:", err);
      res.status(500).json({ error: "Erro ao deletar grupo." });
    }
  });
  app.put("/api/visual-hub-status-groups/reorder", async (req, res) => {
    try {
      const { groups } = req.body;
      if (!Array.isArray(groups)) return res.status(400).json({ error: "groups array required." });
      for (const g of groups) {
        await pool.query("UPDATE visual_hub_status_groups SET order_index = $1 WHERE id = $2", [g.order_index, g.id]);
      }
      const result = await pool.query("SELECT * FROM visual_hub_status_groups ORDER BY order_index ASC");
      res.json(result.rows);
    } catch (err) {
      console.error("PUT /api/visual-hub-status-groups/reorder error:", err);
      res.status(500).json({ error: "Erro ao reordenar." });
    }
  });
  app.get("/api/ia-status-groups", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM ia_status_groups ORDER BY order_index ASC");
      res.json(result.rows);
    } catch (err) {
      console.error("GET /api/ia-status-groups error:", err);
      res.status(500).json({ error: "Erro ao buscar status." });
    }
  });
  app.post("/api/ia-status-groups", async (req, res) => {
    try {
      const { id, label, color, emoji, order_index } = req.body;
      const result = await pool.query(
        `INSERT INTO ia_status_groups (id, label, color, emoji, order_index)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, label, color, emoji, order_index]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("POST /api/ia-status-groups error:", err);
      res.status(500).json({ error: "Erro ao criar status." });
    }
  });
  app.patch("/api/ia-status-groups/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const fields = req.body;
      const allowed = ["label", "color", "emoji", "order_index"];
      const sets = [];
      const vals = [];
      let idx = 1;
      for (const key of allowed) {
        if (key in fields) {
          sets.push(`${key} = $${idx++}`);
          vals.push(fields[key]);
        }
      }
      if (sets.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar." });
      vals.push(id);
      const result = await pool.query(
        `UPDATE ia_status_groups SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
        vals
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Status n\xE3o encontrado." });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("PATCH /api/ia-status-groups error:", err);
      res.status(500).json({ error: "Erro ao atualizar status." });
    }
  });
  app.delete("/api/ia-status-groups/:id", async (req, res) => {
    try {
      await pool.query("BEGIN");
      await pool.query(
        `UPDATE onboarding_tasks SET status_group = 'a-implementar' WHERE status_group = $1 AND type = 'implementacao-ia'`,
        [req.params.id]
      );
      await pool.query("DELETE FROM ia_status_groups WHERE id = $1", [req.params.id]);
      await pool.query("COMMIT");
      res.json({ success: true });
    } catch (err) {
      await pool.query("ROLLBACK");
      console.error("DELETE /api/ia-status-groups error:", err);
      res.status(500).json({ error: "Erro ao excluir status." });
    }
  });
  app.put("/api/ia-status-groups/reorder", async (req, res) => {
    try {
      const { groups } = req.body;
      if (!Array.isArray(groups)) return res.status(400).json({ error: "groups array required." });
      for (const g of groups) {
        await pool.query("UPDATE ia_status_groups SET order_index = $1 WHERE id = $2", [g.order_index, g.id]);
      }
      const result = await pool.query("SELECT * FROM ia_status_groups ORDER BY order_index ASC");
      res.json(result.rows);
    } catch (err) {
      console.error("PUT /api/ia-status-groups/reorder error:", err);
      res.status(500).json({ error: "Erro ao reordenar." });
    }
  });
  app.get("/api/visual-hub-files", async (req, res) => {
    try {
      const { task_id } = req.query;
      if (!task_id) return res.status(400).json({ error: "task_id required" });
      const result = await pool.query(
        "SELECT * FROM visual_hub_files WHERE task_id = $1 ORDER BY created_at DESC",
        [task_id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("GET /api/visual-hub-files error:", err);
      res.status(500).json({ error: "Erro ao buscar arquivos." });
    }
  });
  app.post("/api/visual-hub-files", async (req, res) => {
    try {
      const { task_id, name, url, type } = req.body;
      if (!task_id || !name || !url) return res.status(400).json({ error: "task_id, name e url obrigat\xF3rios." });
      const result = await pool.query(
        `INSERT INTO visual_hub_files (task_id, name, url, type) VALUES ($1, $2, $3, $4) RETURNING *`,
        [task_id, name, url, type || "link"]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("POST /api/visual-hub-files error:", err);
      res.status(500).json({ error: "Erro ao adicionar arquivo." });
    }
  });
  app.delete("/api/visual-hub-files/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM visual_hub_files WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/visual-hub-files error:", err);
      res.status(500).json({ error: "Erro ao deletar arquivo." });
    }
  });
  app.get("/api/onboarding-tasks", async (req, res) => {
    try {
      const type = req.query.type || "operacional";
      const result = await pool.query(
        "SELECT * FROM onboarding_tasks WHERE type = $1 ORDER BY status_group, created_at DESC",
        [type]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("GET /api/onboarding-tasks error:", err);
      res.status(500).json({ error: "Erro ao buscar tarefas." });
    }
  });
  app.post("/api/onboarding-tasks", async (req, res) => {
    try {
      const { client_name, squad, responsible_id, responsible_name, responsible_avatar, start_date, due_date, status_group, tags, nome_completo, nome_fantasia, telefone_whatsapp, cnpj_cpf, cep, cidade, uf, meeting_info, type, responsavel_projeto_id, responsavel_projeto_name, responsavel_projeto_avatar, hospedagem, entregavel, prioridade } = req.body;
      const taskType = type || "operacional";
      if (!client_name) return res.status(400).json({ error: "client_name \xE9 obrigat\xF3rio." });
      const result = await pool.query(
        `INSERT INTO onboarding_tasks (client_name, squad, responsible_id, responsible_name, responsible_avatar, start_date, due_date, status_group, tags, nome_completo, nome_fantasia, telefone_whatsapp, cnpj_cpf, cep, cidade, uf, meeting_info, produto, type, responsavel_projeto_id, responsavel_projeto_name, responsavel_projeto_avatar, hospedagem, entregavel, prioridade)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25) RETURNING *`,
        [
          client_name,
          squad || null,
          responsible_id || null,
          responsible_name || null,
          responsible_avatar || null,
          start_date || null,
          due_date || null,
          status_group || (taskType === "integracao" ? "reuniao-coleta-acessos" : "briefing-realizado"),
          tags || [],
          nome_completo || null,
          nome_fantasia || null,
          telefone_whatsapp || null,
          cnpj_cpf || null,
          cep || null,
          cidade || null,
          uf || null,
          meeting_info || null,
          req.body.produto || null,
          taskType,
          responsavel_projeto_id || null,
          responsavel_projeto_name || null,
          responsavel_projeto_avatar || null,
          hospedagem || null,
          entregavel || null,
          prioridade || null
        ]
      );
      const newTask = result.rows[0];
      const template = await pool.query(
        "SELECT title, order_index, description, internal_doc FROM onboarding_template_items WHERE type = $1 ORDER BY order_index ASC",
        [taskType]
      );
      if (template.rows.length > 0) {
        const values = [];
        const params = [];
        let idx = 1;
        for (const item of template.rows) {
          values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
          params.push(newTask.id, item.title, item.order_index, item.description || null, item.internal_doc || null);
        }
        await pool.query(
          `INSERT INTO onboarding_subtasks (task_id, title, order_index, description, internal_doc) VALUES ${values.join(", ")}`,
          params
        );
        await pool.query(
          `UPDATE onboarding_tasks SET subtask_count = $1 WHERE id = $2`,
          [template.rows.length, newTask.id]
        );
        newTask.subtask_count = template.rows.length;
      }
      res.status(201).json(newTask);
    } catch (err) {
      console.error("POST /api/onboarding-tasks error:", err);
      res.status(500).json({ error: "Erro ao criar tarefa." });
    }
  });
  app.patch("/api/onboarding-tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const fields = req.body;
      const allowed = ["client_name", "squad", "responsible_id", "responsible_name", "responsible_avatar", "start_date", "due_date", "status_group", "tags", "subtask_count", "nome_completo", "nome_fantasia", "telefone_whatsapp", "cnpj_cpf", "cep", "cidade", "uf", "meeting_info", "produto", "responsavel_projeto_id", "responsavel_projeto_name", "responsavel_projeto_avatar", "hospedagem", "entregavel", "prioridade"];
      const DATE_FIELDS = ["start_date", "due_date"];
      const sets = [];
      const vals = [];
      let idx = 1;
      for (const key of allowed) {
        if (key in fields) {
          sets.push(`${key} = $${idx++}`);
          const val = DATE_FIELDS.includes(key) && fields[key] === "" ? null : fields[key];
          vals.push(val);
        }
      }
      if (sets.length === 0) return res.status(400).json({ error: "Nenhum campo para atualizar." });
      sets.push(`updated_at = NOW()`);
      vals.push(id);
      const result = await pool.query(
        `UPDATE onboarding_tasks SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
        vals
      );
      if (result.rowCount === 0) return res.status(404).json({ error: "Tarefa n\xE3o encontrada." });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("PATCH /api/onboarding-tasks error:", err);
      res.status(500).json({ error: "Erro ao atualizar tarefa." });
    }
  });
  app.get("/api/onboarding-tasks/:id/subtasks", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "SELECT * FROM onboarding_subtasks WHERE task_id = $1 ORDER BY order_index ASC",
        [id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("GET /api/onboarding-subtasks error:", err);
      res.status(500).json({ error: "Erro ao buscar subtarefas." });
    }
  });
  app.patch("/api/onboarding-subtasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const fields = req.body;
      const allowed = ["completed", "title", "description", "due_date", "responsible_id", "responsible_name", "responsible_avatar", "internal_doc"];
      const sets = [];
      const vals = [];
      let idx = 1;
      for (const key of allowed) {
        if (key in fields) {
          sets.push(`${key} = $${idx++}`);
          vals.push(fields[key]);
        }
      }
      if (sets.length === 0) return res.status(400).json({ error: "Nenhum campo." });
      vals.push(id);
      const result = await pool.query(
        `UPDATE onboarding_subtasks SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
        vals
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("PATCH /api/onboarding-subtasks error:", err);
      res.status(500).json({ error: "Erro ao atualizar subtarefa." });
    }
  });
  app.get("/api/onboarding-subtasks/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "SELECT * FROM onboarding_subtask_comments WHERE subtask_id = $1 ORDER BY created_at ASC",
        [id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("GET /api/onboarding-subtasks/comments error:", err);
      res.status(500).json({ error: "Erro ao buscar coment\xE1rios da subtarefa." });
    }
  });
  app.post("/api/onboarding-subtasks/:id/comments", async (req, res) => {
    try {
      const { id } = req.params;
      const { text, author_name, author_avatar } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: "Texto obrigat\xF3rio." });
      const result = await pool.query(
        `INSERT INTO onboarding_subtask_comments (subtask_id, author_name, author_avatar, text) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [id, author_name, author_avatar, text]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("POST /api/onboarding-subtasks/comments error:", err);
      res.status(500).json({ error: "Erro ao adicionar coment\xE1rio." });
    }
  });
  app.get("/api/onboarding-subtasks/:id/files", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        "SELECT * FROM onboarding_subtask_files WHERE subtask_id = $1 ORDER BY created_at ASC",
        [id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("GET /api/onboarding-subtasks/files error:", err);
      res.status(500).json({ error: "Erro ao buscar arquivos da subtarefa." });
    }
  });
  app.post("/api/onboarding-subtasks/:id/files", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, type, url, content } = req.body;
      if (!name) return res.status(400).json({ error: "Nome obrigat\xF3rio." });
      const result = await pool.query(
        `INSERT INTO onboarding_subtask_files (subtask_id, name, type, url, content) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, name, type || "link", url || null, content || null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("POST /api/onboarding-subtasks/files error:", err);
      res.status(500).json({ error: "Erro ao adicionar arquivo." });
    }
  });
  app.patch("/api/onboarding-subtask-files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, url, content } = req.body;
      const sets = [];
      const vals = [];
      let idx = 1;
      if (name !== void 0) {
        sets.push(`name = $${idx++}`);
        vals.push(name);
      }
      if (url !== void 0) {
        sets.push(`url = $${idx++}`);
        vals.push(url);
      }
      if (content !== void 0) {
        sets.push(`content = $${idx++}`);
        vals.push(content);
      }
      if (sets.length === 0) return res.status(400).json({ error: "Nenhum campo." });
      vals.push(id);
      const result = await pool.query(
        `UPDATE onboarding_subtask_files SET ${sets.join(", ")} WHERE id = $${idx} RETURNING *`,
        vals
      );
      res.json(result.rows[0]);
    } catch (err) {
      console.error("PATCH /api/onboarding-subtask-files error:", err);
      res.status(500).json({ error: "Erro ao atualizar arquivo." });
    }
  });
  app.delete("/api/onboarding-subtask-files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query("DELETE FROM onboarding_subtask_files WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/onboarding-subtask-files error:", err);
      res.status(500).json({ error: "Erro ao deletar arquivo." });
    }
  });
  app.get("/api/onboarding-template", async (req, res) => {
    try {
      const type = req.query.type || "operacional";
      const result = await pool.query(
        "SELECT * FROM onboarding_template_items WHERE type = $1 ORDER BY order_index ASC",
        [type]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("GET /api/onboarding-template error:", err);
      res.status(500).json({ error: "Erro ao buscar template." });
    }
  });
  app.post("/api/onboarding-template", async (req, res) => {
    try {
      const { title, type } = req.body;
      const taskType = type || "operacional";
      if (!title?.trim()) return res.status(400).json({ error: "title obrigat\xF3rio." });
      const maxRes = await pool.query(
        "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM onboarding_template_items WHERE type = $1",
        [taskType]
      );
      const nextIdx = maxRes.rows[0].next;
      const result = await pool.query(
        `INSERT INTO onboarding_template_items (title, order_index, type) VALUES ($1, $2, $3) RETURNING *`,
        [title.trim(), nextIdx, taskType]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("POST /api/onboarding-template error:", err);
      res.status(500).json({ error: "Erro ao adicionar item ao template." });
    }
  });
  app.patch("/api/onboarding-template/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, order_index } = req.body;
      const sets = [];
      const vals = [];
      let idx = 1;
      if (title !== void 0) {
        sets.push(`title = $${idx++}`);
        vals.push(title);
      }
      if (order_index !== void 0) {
        sets.push(`order_index = $${idx++}`);
        vals.push(order_index);
      }
      if (sets.length === 0) return res.status(400).json({ error: "Nenhum campo." });
      vals.push(id);
      await pool.query(
        `UPDATE onboarding_template_items SET ${sets.join(", ")} WHERE id = $${idx}`,
        vals
      );
      res.json({ ok: true });
    } catch (err) {
      console.error("PATCH /api/onboarding-template error:", err);
      res.status(500).json({ error: "Erro ao atualizar item do template." });
    }
  });
  app.delete("/api/onboarding-template/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM onboarding_template_items WHERE id = $1", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /api/onboarding-template error:", err);
      res.status(500).json({ error: "Erro ao remover item do template." });
    }
  });
  app.put("/api/onboarding-template", async (req, res) => {
    try {
      const { items, type } = req.body;
      const taskType = type || "operacional";
      if (!Array.isArray(items)) return res.status(400).json({ error: "items deve ser um array." });
      await pool.query("DELETE FROM onboarding_template_items WHERE type = $1", [taskType]);
      if (items.length > 0) {
        const values = [];
        const params = [];
        let idx = 1;
        items.forEach((item, i) => {
          values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
          params.push(item.title, i, item.description || null, item.internal_doc || null, taskType);
        });
        await pool.query(
          `INSERT INTO onboarding_template_items (title, order_index, description, internal_doc, type) VALUES ${values.join(", ")}`,
          params
        );
      }
      const result = await pool.query(
        "SELECT * FROM onboarding_template_items WHERE type = $1 ORDER BY order_index ASC",
        [taskType]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("PUT /api/onboarding-template error:", err);
      res.status(500).json({ error: "Erro ao salvar template." });
    }
  });
  app.get("/api/onboarding-tasks/:id/comments", async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM onboarding_comments WHERE task_id = $1 ORDER BY created_at DESC",
        [req.params.id]
      );
      res.json(result.rows);
    } catch (err) {
      console.error("GET /api/onboarding-comments error:", err);
      res.status(500).json({ error: "Erro ao buscar coment\xE1rios." });
    }
  });
  app.post("/api/onboarding-tasks/:id/comments", async (req, res) => {
    try {
      const { text, author_name, author_email, author_avatar } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: "text obrigat\xF3rio." });
      const result = await pool.query(
        `INSERT INTO onboarding_comments (task_id, text, author_name, author_email, author_avatar) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [req.params.id, text.trim(), author_name || null, author_email || null, author_avatar || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("POST /api/onboarding-comments error:", err);
      res.status(500).json({ error: "Erro ao criar coment\xE1rio." });
    }
  });
  app.post("/api/briefings", async (req, res) => {
    try {
      const { task_id, task_name, title } = req.body;
      const result = await pool.query(
        `INSERT INTO briefings (task_id, task_name, title) VALUES ($1, $2, $3) RETURNING *`,
        [task_id || null, task_name || null, title || "Briefing Identidade Visual"]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("POST /api/briefings error:", err);
      res.status(500).json({ error: "Erro ao criar briefing." });
    }
  });
  app.get("/api/briefings/by-task/:taskId", async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM briefings WHERE task_id = $1 ORDER BY created_at DESC LIMIT 1",
        [req.params.taskId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: "Briefing n\xE3o encontrado." });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("GET /api/briefings/by-task error:", err);
      res.status(500).json({ error: "Erro ao buscar briefing." });
    }
  });
  app.get("/api/briefings/public/:id", async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT id, title, task_id, task_name, submitted_at FROM briefings WHERE id = $1",
        [req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: "Briefing n\xE3o encontrado." });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("GET /api/briefings/public error:", err);
      res.status(500).json({ error: "Erro ao buscar briefing." });
    }
  });
  app.post("/api/briefings/public/:id/submit", async (req, res) => {
    try {
      const { form_data } = req.body;
      const result = await pool.query(
        `UPDATE briefings SET form_data = $1, submitted_at = NOW() WHERE id = $2 RETURNING *`,
        [JSON.stringify(form_data), req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: "Briefing n\xE3o encontrado." });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("POST /api/briefings/public/submit error:", err);
      res.status(500).json({ error: "Erro ao salvar briefing." });
    }
  });
  app.get("/api/briefings", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM briefings ORDER BY created_at DESC");
      res.json(result.rows);
    } catch (err) {
      console.error("GET /api/briefings error:", err);
      res.status(500).json({ error: "Erro ao buscar briefings." });
    }
  });
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (!anthropicKey) {
        return res.status(503).json({ error: "ANTHROPIC_API_KEY n\xE3o configurada no servidor." });
      }
      const { messages, pageContext, personalityConfig } = req.body;
      const activeTheme = pageContext?.theme || "dark";
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "messages \xE9 obrigat\xF3rio." });
      }
      const activeSection = pageContext?.section || "general";
      let sectionContext = null;
      if (activeSection === "crm") {
        try {
          const [
            statusRes,
            inadimRes,
            leadsRes,
            columnsRes,
            tasksRes,
            historyRes,
            meetingsRes,
            notesRes,
            sequencesRes,
            tagsRes,
            lossReasonsRes,
            pessoasRes,
            empresasRes,
            kanbansRes,
            marketingCampaignsRes,
            marketingAcoesRes
          ] = await Promise.all([
            // Clientes por status
            pool.query(`
              SELECT crm_status, COUNT(*) AS qtd
              FROM clients
              WHERE crm_status IS NOT NULL AND crm_status != ''
              GROUP BY crm_status ORDER BY qtd DESC
            `),
            // Inadimplentes
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
            // Leads com detalhes
            pool.query(`
              SELECT
                l.id, l.nome, l.telefone, l.origem, l.valor, l.coluna, l.tags,
                l.responsavel_id, l.observacoes, l.kanban_id,
                l.form_nome_fantasia, l.form_cidade, l.nicho, l.faturamento,
                l.created_at::date AS criado_em,
                u.name AS responsavel_nome,
                c.title AS etapa_funil
              FROM crm_comercial_leads l
              LEFT JOIN users u ON u.id::text = l.responsavel_id::text
              LEFT JOIN crm_comercial_columns c ON c.id::text = l.coluna::text
              ORDER BY l.created_at DESC LIMIT 50
            `),
            // Colunas do pipeline
            pool.query(`
              SELECT c.id, c.title, c.kanban_id, c.order_index,
                     k.nome AS kanban_nome,
                     COUNT(l.id) AS total_leads,
                     COALESCE(SUM(l.valor), 0)::numeric(14,2) AS valor_total
              FROM crm_comercial_columns c
              LEFT JOIN crm_comercial_kanbans k ON k.id = c.kanban_id
              LEFT JOIN crm_comercial_leads l ON l.coluna::text = c.id::text
              GROUP BY c.id, c.title, c.kanban_id, c.order_index, k.nome
              ORDER BY c.kanban_id, c.order_index ASC
            `),
            // Tarefas do CRM (pendentes e recentes)
            pool.query(`
              SELECT t.id, t.lead_id, t.title, t.type, t.priority, t.due_date::date AS vencimento,
                     t.completed, l.nome AS lead_nome
              FROM crm_comercial_tasks t
              LEFT JOIN crm_comercial_leads l ON l.id = t.lead_id
              WHERE t.completed = FALSE
              ORDER BY t.due_date ASC NULLS LAST LIMIT 30
            `),
            // Histórico recente (movimentações de funil, etc)
            pool.query(`
              SELECT h.action_type, h.description, h.user_name, h.created_at::date AS data,
                     l.nome AS lead_nome
              FROM crm_comercial_history h
              LEFT JOIN crm_comercial_leads l ON l.id = h.lead_id
              ORDER BY h.created_at DESC LIMIT 30
            `),
            // Reuniões agendadas
            pool.query(`
              SELECT m.title, m.meeting_date::date AS data, m.responsible_name,
                     m.office_location, m.notes, l.nome AS lead_nome
              FROM crm_comercial_meetings m
              LEFT JOIN crm_comercial_leads l ON l.id = m.lead_id
              WHERE m.meeting_date >= CURRENT_DATE
              ORDER BY m.meeting_date ASC LIMIT 15
            `),
            // Notas recentes
            pool.query(`
              SELECT n.content, n.user_name, n.created_at::date AS data,
                     l.nome AS lead_nome
              FROM crm_comercial_notes n
              LEFT JOIN crm_comercial_leads l ON l.id = n.lead_id
              ORDER BY n.created_at DESC LIMIT 15
            `),
            // Sequências de automação (tabela pode não existir)
            pool.query(`
              SELECT id, name, steps, is_active, created_at::date AS criado_em
              FROM crm_comercial_task_sequences
              ORDER BY created_at DESC
            `).catch(() => ({ rows: [] })),
            // Tags
            pool.query(`
              SELECT name, color FROM crm_comercial_tags ORDER BY name ASC
            `).catch(() => ({ rows: [] })),
            // Motivos de perda
            pool.query(`
              SELECT name, order_index FROM crm_comercial_loss_reasons ORDER BY order_index ASC
            `).catch(() => ({ rows: [] })),
            // Pessoas (contatos)
            pool.query(`
              SELECT nome, email, telefone, cargo, empresa, responsavel_id, created_at::date AS criado_em
              FROM crm_pessoas
              ORDER BY created_at DESC LIMIT 30
            `).catch(() => ({ rows: [] })),
            // Empresas
            pool.query(`
              SELECT nome, site, setor, telefone, email, cidade, responsavel_id, created_at::date AS criado_em
              FROM crm_empresas
              ORDER BY created_at DESC LIMIT 20
            `).catch(() => ({ rows: [] })),
            // Kanbans
            pool.query(`
              SELECT id, nome, is_default, created_at::date AS criado_em
              FROM crm_comercial_kanbans
              ORDER BY created_at ASC
            `).catch(() => ({ rows: [] })),
            // Marketing — Dados gerais (resumo apenas)
            pool.query(`
              SELECT id, created_at::date FROM marketing_data ORDER BY id DESC LIMIT 20
            `).catch(() => ({ rows: [] })),
            // Marketing — Ações (apenas resumo, sem campo data que é muito grande)
            pool.query(`
              SELECT page_id, updated_at::date AS atualizado_em
              FROM marketing_acoes
              ORDER BY updated_at DESC LIMIT 10
            `).catch(() => ({ rows: [] }))
          ]);
          sectionContext = {
            secao: "CRM",
            clientes_por_status: statusRes.rows,
            inadimplentes_top10: inadimRes.rows,
            leads_detalhados: leadsRes.rows,
            pipeline_colunas: columnsRes.rows,
            tarefas_pendentes: tasksRes.rows,
            historico_recente: historyRes.rows,
            reunioes_agendadas: meetingsRes.rows,
            notas_recentes: notesRes.rows,
            sequencias: sequencesRes.rows,
            tags: tagsRes.rows,
            motivos_perda: lossReasonsRes.rows,
            pessoas_contatos: pessoasRes.rows,
            empresas: empresasRes.rows,
            kanbans: kanbansRes.rows,
            marketing_dados: marketingCampaignsRes.rows,
            marketing_acoes: marketingAcoesRes.rows,
            gerado_em: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (e) {
          console.error("[AI Chat] Erro contexto CRM:", e);
          sectionContext = { secao: "CRM", erro: "N\xE3o foi poss\xEDvel carregar dados CRM." };
        }
      }
      if (activeSection === "atividades") {
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
            `)
          ]);
          sectionContext = {
            secao: "Atividades",
            tarefas_pendentes: tarefasRes.rows,
            pessoas_recentes: pessoasRes.rows,
            gerado_em: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (e) {
          console.error("[AI Chat] Erro contexto Atividades:", e);
          sectionContext = { secao: "Atividades", erro: "N\xE3o foi poss\xEDvel carregar dados de atividades." };
        }
      }
      if (activeSection === "marketing") {
        try {
          const campanhasRes = await pool.query(`
            SELECT title, status, type, start_date::date, end_date::date, budget, notes
            FROM marketing_campaigns
            ORDER BY start_date DESC LIMIT 20
          `).catch(() => ({ rows: [] }));
          sectionContext = {
            secao: "Marketing",
            campanhas: campanhasRes.rows,
            gerado_em: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (e) {
          sectionContext = { secao: "Marketing", erro: "N\xE3o foi poss\xEDvel carregar dados de marketing." };
        }
      }
      if (activeSection === "operacional") {
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
            `)
          ]);
          sectionContext = {
            secao: "Operacional",
            projetos_em_andamento: projetosRes.rows,
            tarefas_criticas: tasksRes.rows,
            gerado_em: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (e) {
          console.error("[AI Chat] Erro contexto Operacional:", e);
          sectionContext = { secao: "Operacional", erro: "N\xE3o foi poss\xEDvel carregar dados operacionais." };
        }
      }
      let financialContext = null;
      if (pageContext?.includeFinancial) {
        try {
          const mesAtual = `DATE_TRUNC('month', NOW())`;
          const [receitasRes, despesasRes, aReceberRes, topClientesRes, saldoRes, extratoRes] = await Promise.all([
            // 1) Receitas dos últimos 6 meses
            pool.query(`
              SELECT
                TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS mes,
                SUM(value)::numeric(14,2) AS total_receita,
                COUNT(*) AS qtd_recebimentos
              FROM fin_movements_asaas
              WHERE type = 1
                AND is_anticipation_pair = false
                AND transaction_date >= NOW() - INTERVAL '6 months'
              GROUP BY 1 ORDER BY 1 DESC
            `),
            // 2) Despesas do mês atual por categoria
            pool.query(`
              SELECT
                COALESCE(custom_category, grapehub_category, 'N\xE3o categorizado') AS categoria,
                SUM(ABS(value))::numeric(14,2) AS total,
                COUNT(*) AS qtd
              FROM fin_movements_asaas
              WHERE value < 0
                AND is_anticipation_pair = false
                AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', NOW())
              GROUP BY 1 ORDER BY 2 DESC
            `),
            // 3) A receber nos próximos 30 dias
            pool.query(`
              SELECT
                COUNT(*) AS qtd,
                SUM(value)::numeric(14,2) AS valor_total
              FROM fin_receivables
              WHERE status IN ('PENDING', 'OVERDUE')
                AND due_date <= NOW() + INTERVAL '30 days'
            `),
            // 4) Top 5 clientes por valor recebido no mês
            pool.query(`
              SELECT
                COALESCE(fp.name, r.customer_name, 'Desconhecido') AS cliente,
                SUM(r.value)::numeric(14,2) AS total_recebido
              FROM fin_receivables r
              LEFT JOIN fin_people fp ON fp.asaas_id = r.customer_id
              WHERE r.status IN ('RECEIVED', 'CONFIRMED')
                AND DATE_TRUNC('month', r.payment_date) = DATE_TRUNC('month', NOW())
              GROUP BY fp.name, r.customer_name ORDER BY 2 DESC LIMIT 5
            `),
            // 5) Resumo do mês atual (entradas / saídas / saldo)
            pool.query(`
              SELECT
                SUM(CASE WHEN value > 0 THEN value ELSE 0 END)::numeric(14,2) AS entradas_realizadas,
                SUM(CASE WHEN value < 0 THEN ABS(value) ELSE 0 END)::numeric(14,2) AS saidas_realizadas,
                SUM(value)::numeric(14,2) AS saldo_periodo
              FROM fin_movements_asaas
              WHERE DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', NOW())
                AND is_anticipation_pair = false
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
                  WHEN lower(m.description) LIKE '%cart\xE3o de cr\xE9dito%' OR lower(m.description) LIKE '%cartao de credito%' OR lower(m.description) LIKE '%cart\xE3o de cred%' THEN 'Cart\xE3o de Cr\xE9dito'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%simples nacional%','%iss%','%irpj%','%imposto%','%das %','%pis%','%cofins%','%csll%','%taxa municipal%','%alvar\xE1%']) THEN 'Impostos'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%remunera\xE7\xE3o%','%sal\xE1rio%','%bonifica\xE7\xE3o%','%business partner%','%fgts%','%irrf%','%folha%','%f\xE9rias%','%13\xBA%','%rescis\xE3o%','%benef\xEDcio%','%vale %','%plano de sa\xFAde%','%odonto%','%seguro de vida%']) THEN 'Sal\xE1rios e Pessoal'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%ferramenta%','%software%','%vps%','%dom\xEDnio%','%hospedagem%','%aws%','%google cloud%','%vercel%','%openai%','%claude%','%github%','%cursor%','%slack%','%zoom%','%canva%','%adobe%','%figma%','%notion%','%trello%','%jira%','%elevenlabs%','%typeform%','%hostinger%','%microsoft%','%gather%','%htm fech%']) THEN 'Cart\xE3o de Cr\xE9dito'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%comiss\xE3o%','%tr\xE1fego pago%','%facebook ads%','%google ads%','%meta ads%','%marketing%','%publicidade%','%rd station%','%hubspot%','%activecamp%']) THEN 'Marketing e Vendas'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%aluguel%','%condom\xEDnio%','%energia%','%internet%','%assessoria%','%contabilidade%','%limpeza%','%escrit\xF3rio%','%material%','%seguro%','%\xE1gua%','%telefone%','%correios%','%copel%']) THEN 'Administrativo'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%taxa%','%tarifa%','%juros%','%iof%','%banco%','%anuidade%','%ted%','%boleto%']) THEN 'Despesas Financeiras'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%pr\xF3-labore%','%pro-labore%','%dividendo%','%inss%','%retirada%','%lucro%','%s\xF3cio%','%distribui\xE7\xE3o%']) THEN 'Distribui\xE7\xE3o de Lucros'
                  WHEN lower(m.description) LIKE ANY(ARRAY['%facebk%','%facebook%']) THEN 'Cart\xE3o de Cr\xE9dito > Facebook'
                  ELSE 'Outros'
                END AS categoria_efetiva
              FROM fin_movements_asaas m
              WHERE DATE_TRUNC('month', m.transaction_date) = DATE_TRUNC('month', NOW())
              ORDER BY m.transaction_date DESC
              LIMIT 300
            `)
          ]);
          const extratoRows = extratoRes.rows;
          const categoriaMap = {};
          for (const row of extratoRows) {
            const cat = row.categoria_efetiva || "Outros";
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
              valor: val
            });
          }
          if (categoriaMap["Cart\xE3o de Cr\xE9dito"]) {
            const isFacebook = (d) => /facebook|facebk/i.test(d || "");
            const cartao = categoriaMap["Cart\xE3o de Cr\xE9dito"].itens;
            if (!categoriaMap["Cart\xE3o de Cr\xE9dito > Facebook"]) {
              categoriaMap["Cart\xE3o de Cr\xE9dito > Facebook"] = {
                total: cartao.filter((i) => isFacebook(i.descricao)).reduce((s, i) => s + i.valor, 0),
                itens: cartao.filter((i) => isFacebook(i.descricao))
              };
            }
            categoriaMap["Cart\xE3o de Cr\xE9dito > Aplicativos"] = {
              total: cartao.filter((i) => !isFacebook(i.descricao)).reduce((s, i) => s + i.valor, 0),
              itens: cartao.filter((i) => !isFacebook(i.descricao))
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
              itens: data.itens.slice(0, 30)
            })),
            gerado_em: (/* @__PURE__ */ new Date()).toISOString()
          };
        } catch (dbErr) {
          console.error("[AI Chat] Erro ao buscar contexto financeiro:", dbErr?.message || dbErr);
          financialContext = { erro: `N\xE3o foi poss\xEDvel carregar os dados financeiros: ${dbErr?.message || "erro desconhecido"}` };
        }
      }
      const p = personalityConfig || {};
      const nome = p.nome || "Fred";
      const humor = p.humor || "direto e levemente ir\xF4nico, sem ser grosseiro";
      const personalidade = p.personalidade || "s\xF3cio conservador que prioriza sa\xFAde financeira, mas nunca perde o olhar para crescimento sustent\xE1vel. Especialista em comercial, operacional e relacionamento com clientes.";
      const instrucoes_extras = p.instrucoes_extras || "";
      const financialSection = financialContext ? `
## \u{1F4CA} DADOS FINANCEIROS EM TEMPO REAL (NeonDB \u2014 Grape M\xEDdia)
> Dados carregados agora do banco de dados. Use como base para an\xE1lise.

### Receita \u2014 \xDAltimos 6 meses
${JSON.stringify(financialContext.receitas_6meses, null, 2)}

### Despesas do m\xEAs atual por categoria
${JSON.stringify(financialContext.despesas_mes_atual, null, 2)}

### A receber nos pr\xF3ximos 30 dias
${JSON.stringify(financialContext.a_receber_proximos_30_dias, null, 2)}

### Resumo do m\xEAs atual (entradas / sa\xEDdas / saldo)
${JSON.stringify(financialContext.resumo_mes_atual, null, 2)}

### Top 5 clientes por valor recebido
${JSON.stringify(financialContext.top_5_clientes, null, 2)}

### Extrato do m\xEAs atual \u2014 por categoria e subcategoria
> Cada item tem: descri\xE7\xE3o, contraparte, data, status (realizado/previsto), valor (negativo = sa\xEDda, positivo = entrada)
> Categoria "Cart\xE3o de Cr\xE9dito > Facebook" = gastos com Facebook/Facebk; "Cart\xE3o de Cr\xE9dito > Aplicativos" = demais apps
${JSON.stringify(financialContext.extrato_por_categoria, null, 2)}

> Gerado em: ${financialContext.gerado_em}
` : `
## \u26A0\uFE0F Contexto financeiro n\xE3o dispon\xEDvel nesta p\xE1gina
Voc\xEA pode responder perguntas gerais sobre gest\xE3o, estrat\xE9gia e neg\xF3cios.
Para an\xE1lise financeira detalhada, o usu\xE1rio deve acessar o Dashboard Financeiro ou Extrato.
`;
      const sectionSection = sectionContext ? (() => {
        const s = sectionContext;
        if (s.erro) return `
## \u26A0\uFE0F Contexto ${s.secao}: ${s.erro}
`;
        if (s.secao === "CRM") return `
## \u{1F91D} DADOS DO CRM COMERCIAL + MARKETING EM TEMPO REAL
> Dados carregados agora do banco. Use como base para an\xE1lise de carteira, pipeline, atividades e marketing.

### Kanbans (funis)
${JSON.stringify(s.kanbans, null, 2)}

### Pipeline \u2014 Colunas e distribui\xE7\xE3o de leads
${JSON.stringify(s.pipeline_colunas, null, 2)}

### Clientes por status CRM (financeiro)
${JSON.stringify(s.clientes_por_status, null, 2)}

### Top inadimplentes
${JSON.stringify(s.inadimplentes_top10, null, 2)}

### Leads detalhados (\xFAltimos 50)
> Cada lead tem: nome, telefone, origem, valor, etapa do funil, respons\xE1vel, tags, nicho, faturamento, cidade
${JSON.stringify(s.leads_detalhados, null, 2)}

### Tarefas pendentes do CRM (pr\xF3ximas 30)
${JSON.stringify(s.tarefas_pendentes, null, 2)}

### Hist\xF3rico recente (\xFAltimas 30 a\xE7\xF5es)
> Movimenta\xE7\xF5es de funil, cria\xE7\xE3o de tarefas, notas, etc.
${JSON.stringify(s.historico_recente, null, 2)}

### Reuni\xF5es agendadas
${JSON.stringify(s.reunioes_agendadas, null, 2)}

### Notas recentes
${JSON.stringify(s.notas_recentes, null, 2)}

### Sequ\xEAncias de automa\xE7\xE3o
${JSON.stringify(s.sequencias, null, 2)}

### Tags dispon\xEDveis
${JSON.stringify(s.tags, null, 2)}

### Motivos de perda cadastrados
${JSON.stringify(s.motivos_perda, null, 2)}

### Pessoas / Contatos (\xFAltimos 30)
${JSON.stringify(s.pessoas_contatos, null, 2)}

### Empresas cadastradas (\xFAltimas 20)
${JSON.stringify(s.empresas, null, 2)}

### \u{1F4E3} Marketing \u2014 Dados
${JSON.stringify(s.marketing_dados, null, 2)}

### \u{1F4E3} Marketing \u2014 A\xE7\xF5es recentes
${JSON.stringify(s.marketing_acoes, null, 2)}

> Gerado em: ${s.gerado_em}
`;
        if (s.secao === "Atividades") return `
## \u{1F4CB} DADOS DE ATIVIDADES EM TEMPO REAL
> Tarefas pendentes e pessoas cadastradas.

### Tarefas pendentes (pr\xF3ximas 30)
${JSON.stringify(s.tarefas_pendentes, null, 2)}

### Pessoas recentes no CRM
${JSON.stringify(s.pessoas_recentes, null, 2)}

> Gerado em: ${s.gerado_em}
`;
        if (s.secao === "Marketing") return `
## \u{1F4E3} DADOS DE MARKETING EM TEMPO REAL
> Campanhas e a\xE7\xF5es de marketing da Grape M\xEDdia.

### Campanhas (recentes)
${JSON.stringify(s.campanhas, null, 2)}

> Gerado em: ${s.gerado_em}
`;
        if (s.secao === "Operacional") return `
## \u2699\uFE0F DADOS OPERACIONAIS EM TEMPO REAL
> Projetos em andamento e tarefas cr\xEDticas.

### Projetos em andamento
${JSON.stringify(s.projetos_em_andamento, null, 2)}

### Tarefas cr\xEDticas / com prazo pr\xF3ximo
${JSON.stringify(s.tarefas_criticas, null, 2)}

> Gerado em: ${s.gerado_em}
`;
        return "";
      })() : "";
      const fredMode = pageContext?.fredMode || "grape";
      const FRED_IDENTITIES = {
        comercial: `
Voc\xEA est\xE1 operando como **Especialista Comercial** da Grape M\xEDdia.
Seu foco AGORA \xE9 pipeline de vendas, relacionamento com leads, churn, prospec\xE7\xE3o ativa, upsell e renova\xE7\xF5es.
Pense como um Head of Sales experiente: orientado a n\xFAmero, obstinado em convers\xE3o, mas respeitoso com o posicionamento boutique da Grape.
Lembre: o gargalo hist\xF3rico da Grape \xE9 GERA\xC7\xC3O DE LEADS, n\xE3o convers\xE3o. Todo conselho deve considerar isso.
Dados de CRM injetados no contexto representam a carteira e pipeline atual \u2014 use-os para an\xE1lises diretas.`,
        marketing: `
Voc\xEA est\xE1 operando como **Especialista em Marketing** da Grape M\xEDdia.
Seu foco AGORA \xE9 campanhas, tr\xE1fego pago, conte\xFAdo, gera\xE7\xE3o de demanda e posicionamento de marca.
A Grape atua em marketing jur\xEDdico \u2014 nicho de alta exig\xEAncia, onde credibilidade supera volume.
Pense como um CMO criterioso: ROI de campanhas, custo por lead, diferencia\xE7\xE3o no mercado jur\xEDdico.
Dados de marketing injetados no contexto representam as a\xE7\xF5es em andamento \u2014 use-os para an\xE1lises diretas.`,
        financeiro: `
Voc\xEA est\xE1 operando como **Especialista Financeiro** da Grape M\xEDdia.
Seu foco AGORA \xE9 caixa, receitas, despesas, inadimpl\xEAncia, margens e proje\xE7\xF5es.
Pense como CFO conservador: prefira caixa a crescimento alavancado, questione toda despesa sem retorno claro.
Dados financeiros injetados no contexto (extrato, receitas, despesas por categoria) s\xE3o REAIS e carregados agora do banco.

## \u{1F3D7}\uFE0F ARQUITETURA DO FINANCEIRO GRAPEHUB (conhecimento t\xE9cnico profundo)

### Fontes de dados
- **Asaas**: gateway de cobran\xE7a \u2014 sincronizado manualmente via bot\xE3o "Importar" no Extrato. Consome API \`/financialTransactions\`.
- **Sicredi**: cart\xE3o de cr\xE9dito corporativo \u2014 importado via OFX/CSV mensalmente. Usa campo \`billing_month\` (compet\xEAncia) \u2260 \`transaction_date\` (f\xEDsico).
- **Saldo real**: consultado ao vivo via \`/finance/balance\` do Asaas. N\xE3o \xE9 salvo no banco.

### Tabela central: fin_movements_asaas
Todos os movimentos (Asaas + Sicredi) vivem nesta tabela.
Campos-chave: \`type\` (+1 entrada / -1 sa\xEDda), \`transaction_type\`, \`value\`, \`transaction_date\`, \`description\`, \`account\` ('asaas' ou 'sicredi'), \`grapehub_category\`, \`custom_category\`, \`is_anticipation_pair\`, \`billing_month\`.

### Os 7 m\xF3dulos financeiros
1. **Dashboard** \u2014 vis\xE3o do m\xEAs: saldo real + previsto. Regime misto.
2. **Extrato** \u2014 todas as movimenta\xE7\xF5es brutas, edit\xE1veis. Filtro "Sem categoria" para identificar n\xE3o categorizados.
3. **Contas a Receber** \u2014 cobran\xE7as por data de pagamento do cliente (regime compet\xEAncia).
4. **Contas a Pagar** \u2014 sa\xEDdas Asaas + fatura Sicredi por \`billing_month\`. Exclui "transfer\xEAncia entre contas".

6. **Contas Recorrentes** \u2014 despesas fixas mensais (sal\xE1rio, aluguel). Controle de previsto \xD7 realizado.
7. **Categorias** \u2014 plano de contas L1/L2/L3. Toda a categoriza\xE7\xE3o depende desta tabela.

### L\xF3gica de antecipa\xE7\xF5es
Quando o Asaas antecipa receb\xEDveis:
- \`RECEIVABLE_ANTICIPATION_GROSS_CREDIT\` \u2192 cr\xE9dito bruto real (entra em Receitas Operacionais)
- \`Baixa da antecipacao\` + \`Cobranca recebida\` do mesmo fatura \u2192 marcados \`is_anticipation_pair=true\` \u2192 EXCLU\xCDDOS do extrato
- \`Taxa de antecipacao\` \u2192 despesa independente (entra como sa\xEDda categorizada)

### Diferen\xE7as entre m\xF3dulos (causa raiz)
- **Contas a Pagar**: mostra tudo incluindo "Outros".
- **Contas a Receber**: usa data de pagamento do cliente.
- **Sicredi**: C.A.Pagar usa \`billing_month\` (compet\xEAncia).
- **Gera\xE7\xE3o de Caixa** = Receitas \u2212 Despesas (excluindo distribui\xE7\xE3o). **Saldo Final** = Saldo Inicial + Gera\xE7\xE3o \u2212 Distribui\xE7\xE3o.

### Gaps conhecidos
- ~18 itens sem categoria no extrato, causando subnotifica\xE7\xE3o de despesas.
- Sync do Asaas \xE9 manual \u2192 dados podem estar desatualizados.

- Sicredi sem importa\xE7\xE3o autom\xE1tica \u2192 m\xEAs errado se o CSV n\xE3o for importado.

Quando o usu\xE1rio perguntar sobre discrep\xE2ncias entre m\xF3dulos, use este conhecimento para explicar a causa raiz com precis\xE3o.`,
        operacional: `
Voc\xEA est\xE1 operando como **Especialista Operacional** da Grape M\xEDdia.
Seu foco AGORA \xE9 processos internos, gest\xE3o do time (~9 colaboradores), entregas de projetos e capacidade produtiva.
Pense como COO que identifica gargalos antes de ser perguntado.
Dados operacionais injetados representam projetos e tarefas cr\xEDticas em andamento \u2014 use-os.`,
        grape: `
Voc\xEA est\xE1 no modo **S\xF3cio Grape** \u2014 vis\xE3o 360\xB0 da empresa.
Voc\xEA conhece profundamente a Grape M\xEDdia: ag\xEAncia de marketing jur\xEDdico, clientes advogados e escrit\xF3rios, time enxuto, posicionamento boutique.
Sua expertise cobre todos os pilares: Financeiro, Comercial, Operacional e Relacionamento.
Responda com a vis\xE3o integrada de quem est\xE1 no neg\xF3cio junto \u2014 n\xE3o apenas um consultor externo.`
      };
      const identidadeAtual = FRED_IDENTITIES[fredMode] || FRED_IDENTITIES.grape;
      const systemPrompt = `
# IDENTIDADE

Voc\xEA \xE9 **${nome}**, o s\xF3cio virtual da Grape M\xEDdia dentro do GrapeHub.
Seu humor \xE9 ${humor}.
Sua personalidade: ${personalidade}

${identidadeAtual}

# PRINC\xCDPIOS INEGOCI\xC1VEIS
1. **Sinceridade absoluta** \u2014 Nunca resposta vaga para agradar. Se os n\xFAmeros mostram problema, fale. Com respeito, sem rodeios.
2. **Conservadorismo financeiro** \u2014 Prefira caixa a crescimento alavancado. Questione despesas antes de aprov\xE1-las mentalmente.
3. **Vis\xE3o de crescimento** \u2014 Sempre pergunte: o que precisamos fazer para esse n\xFAmero melhorar em 3 meses?
4. **Fale como s\xF3cio** \u2014 Use "nosso caixa", "nossa carteira" quando fizer sentido. Voc\xEA est\xE1 no neg\xF3cio junto.
5. **Nunca invente dados** \u2014 Se n\xE3o souber, diga. Nunca projete sem base expl\xEDcita.

# FORMATO
- Respostas curtas para perguntas diretas
- Respostas estruturadas (se\xE7\xF5es) para an\xE1lises complexas
- Portugu\xEAs brasileiro, linguagem de neg\xF3cios acess\xEDvel
- Emojis com modera\xE7\xE3o \u2014 s\xF3 quando refor\xE7am a mensagem
- Quando der opini\xE3o, deixe claro que \xE9 sua leitura dos dados

Tema ativo do GrapeHub: ${activeTheme}

${financialSection}
${sectionSection}

# GR\xC1FICOS HTML \u2014 REGRAS OBRIGAT\xD3RIAS
Quando o usu\xE1rio pedir gr\xE1ficos, visualiza\xE7\xF5es ou charts, responda SEMPRE com HTML completo e funcional usando Chart.js carregado via CDN (https://cdn.jsdelivr.net/npm/chart.js).

Regras obrigat\xF3rias para gr\xE1ficos:
- Retorne APENAS o HTML puro, sem markdown, sem explica\xE7\xF5es antes ou depois, sem blocos de c\xF3digo
- O HTML deve ser completo (com <html>, <head>, <body>)
- Use Chart.js via CDN para todos os gr\xE1ficos
- O canvas deve ocupar 100% da largura dispon\xEDvel
- Sempre inclua t\xEDtulo descritivo no gr\xE1fico
- Quando tiver dados reais injetados no contexto, use-os. Quando n\xE3o tiver, deixe claro no t\xEDtulo que s\xE3o dados de exemplo
- Labels do eixo X sempre horizontais (maxRotation: 0), fonte tamanho 11
- Container do canvas deve ter height: 300px expl\xEDcito
- Ap\xF3s o fechamento do </html>, adicione obrigatoriamente um par\xE1grafo curto de an\xE1lise em portugu\xEAs corrido (m\xE1x 3 linhas, sem t\xEDtulo markdown)

Temas visuais \u2014 o campo "Tema ativo do GrapeHub" indica o tema ativo:

TEMA CLARO (light):
- body background: #ffffff
- Texto e labels dos eixos: #1a1a1a
- Gridlines: rgba(0,0,0,0.08)
- T\xEDtulo do gr\xE1fico: #111111

TEMA ESCURO (dark):
- body background: #1a1a2e
- Texto e labels dos eixos: #e2e8f0
- Gridlines: rgba(255,255,255,0.1)
- T\xEDtulo do gr\xE1fico: #ffffff

TEMA ESCURO PROFUNDO (deep):
- body background: #0a0a0f
- Texto e labels dos eixos: #a0aec0
- Gridlines: rgba(255,255,255,0.05)
- T\xEDtulo do gr\xE1fico: #e2e8f0

Cores dos gr\xE1ficos (usar em todos os temas):
- Roxo Grape: #7C3AED
- Magenta: #D946EF
- Verde positivo: #10B981
- Cinza: #6B7280

${instrucoes_extras ? `# INSTRU\xC7\xD5ES ADICIONAIS
${instrucoes_extras}` : ""}
`.trim();
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        messages
      });
      const firstContent = response.content[0];
      const reply = firstContent.type === "text" ? firstContent.text : "N\xE3o consegui gerar uma resposta.";
      res.json({ reply });
    } catch (err) {
      console.error("[AI Chat] Erro:", err?.message || err);
      res.status(500).json({ error: err?.message || "Erro interno ao processar mensagem de IA." });
    }
  });
  app.get("/api/todo-staff/tasks", async (req, res) => {
    try {
      const pageId = req.query.page_id || "default";
      const { rows } = await pool.query("SELECT * FROM to_do_staff WHERE page_id = $1 ORDER BY created_at DESC", [pageId]);
      const items = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description || void 0,
        priority: r.priority,
        status: r.status,
        tags: r.tags || [],
        assignee: r.assignee || void 0,
        dueDate: r.due_date || void 0,
        subtasks: r.subtasks || [],
        comments: r.comments || [],
        createdAt: r.created_at?.toISOString(),
        doneAt: r.done_at?.toISOString() || void 0
      }));
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/todo-staff/tasks", async (req, res) => {
    try {
      const { id, title, description, priority, status, tags, assignee, dueDate, subtasks, comments, doneAt, page_id } = req.body;
      await pool.query(
        `INSERT INTO to_do_staff (id, title, description, priority, status, tags, assignee, due_date, subtasks, comments, done_at, page_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          id,
          title,
          description || null,
          priority || "medium",
          status || "todo",
          JSON.stringify(tags || []),
          assignee || null,
          dueDate || null,
          JSON.stringify(subtasks || []),
          JSON.stringify(comments || []),
          doneAt || null,
          page_id || "default"
        ]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/todo-staff/tasks/:id", async (req, res) => {
    try {
      const { title, description, priority, status, tags, assignee, dueDate, subtasks, comments, doneAt } = req.body;
      await pool.query(
        `UPDATE to_do_staff SET title=$1, description=$2, priority=$3, status=$4, tags=$5,
         assignee=$6, due_date=$7, subtasks=$8, comments=$9, done_at=$10 WHERE id=$11`,
        [
          title,
          description || null,
          priority,
          status,
          JSON.stringify(tags || []),
          assignee || null,
          dueDate || null,
          JSON.stringify(subtasks || []),
          JSON.stringify(comments || []),
          doneAt || null,
          req.params.id
        ]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/todo-staff/tasks/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM to_do_staff WHERE id=$1", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/todo-staff/recurring", async (req, res) => {
    try {
      const pageId = req.query.page_id || "default";
      const { rows } = await pool.query("SELECT * FROM to_do_staff_recurring WHERE page_id = $1 ORDER BY created_at DESC", [pageId]);
      const items = rows.map((r) => ({
        id: r.id,
        title: r.title,
        assignee: r.assignee || void 0,
        tags: r.tags || [],
        frequency: r.frequency,
        dayOfWeek: r.day_of_week || void 0,
        createdAt: r.created_at?.toISOString()
      }));
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/todo-staff/recurring", async (req, res) => {
    try {
      const { id, title, assignee, tags, frequency, dayOfWeek, page_id } = req.body;
      await pool.query(
        `INSERT INTO to_do_staff_recurring (id, title, assignee, tags, frequency, day_of_week, page_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, title, assignee || null, JSON.stringify(tags || []), frequency, dayOfWeek || null, page_id || "default"]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/todo-staff/recurring/:id", async (req, res) => {
    try {
      const { title, assignee, tags, frequency, dayOfWeek, last_completed } = req.body;
      await pool.query(
        `UPDATE to_do_staff_recurring SET title=$1, assignee=$2, tags=$3, frequency=$4, day_of_week=$5, last_completed=$6 WHERE id=$7`,
        [title, assignee || null, JSON.stringify(tags || []), frequency, dayOfWeek || null, last_completed || null, req.params.id]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/todo-staff/recurring/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM to_do_staff_recurring WHERE id=$1", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/todo-staff/ideas", async (req, res) => {
    try {
      const pageId = req.query.page_id || "default";
      const { rows } = await pool.query("SELECT * FROM to_do_staff_ideas WHERE page_id = $1 ORDER BY created_at DESC", [pageId]);
      const items = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description || void 0,
        status: r.status,
        tags: r.tags || [],
        comments: r.comments || [],
        createdAt: r.created_at?.toISOString()
      }));
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/todo-staff/ideas", async (req, res) => {
    try {
      const { id, title, description, status, tags, comments, page_id } = req.body;
      await pool.query(
        `INSERT INTO to_do_staff_ideas (id, title, description, status, tags, comments, page_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, title, description || null, status || "nova", JSON.stringify(tags || []), JSON.stringify(comments || []), page_id || "default"]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/todo-staff/ideas/:id", async (req, res) => {
    try {
      const { title, description, status, tags, comments } = req.body;
      await pool.query(
        `UPDATE to_do_staff_ideas SET title=$1, description=$2, status=$3, tags=$4, comments=$5 WHERE id=$6`,
        [title, description || null, status, JSON.stringify(tags || []), JSON.stringify(comments || []), req.params.id]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/todo-staff/ideas/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM to_do_staff_ideas WHERE id=$1", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/todo-staff/doc-pages", async (req, res) => {
    try {
      const pageId = req.query.page_id || "default";
      const { rows } = await pool.query(
        "SELECT * FROM to_do_staff_doc_pages WHERE page_id = $1 ORDER BY sort_order ASC, created_at ASC",
        [pageId]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/todo-staff/doc-pages", async (req, res) => {
    try {
      const { id, page_id, title, content, sort_order } = req.body;
      await pool.query(
        `INSERT INTO to_do_staff_doc_pages (id, page_id, title, content, sort_order) VALUES ($1,$2,$3,$4,$5)`,
        [id, page_id || "default", title, content || "", sort_order || 0]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/todo-staff/doc-pages/:id", async (req, res) => {
    try {
      const { title, content } = req.body;
      await pool.query(
        `UPDATE to_do_staff_doc_pages SET title=$1, content=$2, updated_at=NOW() WHERE id=$3`,
        [title, content, req.params.id]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/todo-staff/doc-pages/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM to_do_staff_doc_pages WHERE id=$1", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/career-plans/docs", async (req, res) => {
    try {
      const pageId = req.query.page_id || "default";
      const userEmail = req.query.user_email;
      const userRole = req.query.user_role;
      let query = "SELECT * FROM career_plan_docs WHERE page_id = $1";
      let params = [pageId];
      if (userRole?.toLowerCase() !== "admin" && userEmail) {
        query += " AND (allowed_users IS NULL OR jsonb_array_length(allowed_users) = 0 OR allowed_users @> $2::jsonb)";
        params.push(JSON.stringify([userEmail]));
      }
      query += " ORDER BY sort_order ASC, created_at ASC";
      const { rows } = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/career-plans/docs", async (req, res) => {
    try {
      const { id, page_id, title, content, sort_order, created_by, allowed_users } = req.body;
      const allowedUsersJson = allowed_users ? JSON.stringify(allowed_users) : "[]";
      await pool.query(
        `INSERT INTO career_plan_docs (id, page_id, title, content, sort_order, created_by, allowed_users) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, page_id || "default", title || "Novo Plano", content || "", sort_order || 0, created_by || null, allowedUsersJson]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/career-plans/docs/:id", async (req, res) => {
    try {
      const { title, content, allowed_users } = req.body;
      if (allowed_users !== void 0) {
        await pool.query(
          `UPDATE career_plan_docs SET title=$1, content=$2, allowed_users=$3, updated_at=NOW() WHERE id=$4`,
          [title, content, JSON.stringify(allowed_users), req.params.id]
        );
      } else {
        await pool.query(
          `UPDATE career_plan_docs SET title=$1, content=$2, updated_at=NOW() WHERE id=$3`,
          [title, content, req.params.id]
        );
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/career-plans/docs/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM career_plan_docs WHERE id=$1", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/hiring/folders", async (_req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM hiring_folders ORDER BY created_at DESC");
      res.json(rows);
    } catch (err) {
      console.error("[hiring] GET folders error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/hiring/folders", async (req, res) => {
    try {
      const { nome, cargo, cols } = req.body;
      const { rows } = await pool.query(
        "INSERT INTO hiring_folders (nome, cargo, cols) VALUES ($1, $2, $3) RETURNING *",
        [nome, cargo || null, JSON.stringify(cols || [])]
      );
      res.json(rows[0]);
    } catch (err) {
      console.error("[hiring] POST folder error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/hiring/folders/:id", async (req, res) => {
    try {
      const { nome, cargo, cols, form_fields } = req.body;
      const { rows } = await pool.query(
        "UPDATE hiring_folders SET nome = $1, cargo = $2, cols = $3, form_fields = $4 WHERE id = $5 RETURNING *",
        [nome, cargo || null, JSON.stringify(cols || []), form_fields !== void 0 ? JSON.stringify(form_fields) : null, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Folder not found" });
      res.json(rows[0]);
    } catch (err) {
      console.error("[hiring] PUT folder error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/hiring/folders/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM hiring_folders WHERE id = $1", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      console.error("[hiring] DELETE folder error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/hiring/candidates", async (req, res) => {
    try {
      const folderId = req.query.folder_id;
      if (!folderId) return res.status(400).json({ error: "folder_id required" });
      const { rows } = await pool.query(
        "SELECT * FROM hiring_candidates WHERE folder_id = $1 ORDER BY created_at ASC",
        [folderId]
      );
      res.json(rows);
    } catch (err) {
      console.error("[hiring] GET candidates error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/hiring/candidates", async (req, res) => {
    try {
      const { folder_id, nome, contato, acao, data_acao, col } = req.body;
      const { rows } = await pool.query(
        "INSERT INTO hiring_candidates (folder_id, nome, contato, acao, data_acao, col, form_data) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [folder_id, nome, contato || null, acao || null, data_acao || null, col, req.body.form_data || "{}"]
      );
      res.json(rows[0]);
    } catch (err) {
      console.error("[hiring] POST candidate error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/hiring/public/folders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query("SELECT id, nome, cargo, cols, form_fields FROM hiring_folders WHERE id = $1", [id]);
      if (rows.length === 0) return res.status(404).json({ error: "Vaga n\xE3o encontrada" });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/hiring/public/apply", async (req, res) => {
    try {
      const { folder_id, nome, contato, form_data } = req.body;
      const folderRes = await pool.query("SELECT cols FROM hiring_folders WHERE id = $1", [folder_id]);
      if (folderRes.rows.length === 0) return res.status(404).json({ error: "Folder not found" });
      const cols = folderRes.rows[0].cols || [];
      const col = cols.length > 0 ? cols[0] : "Inscritos";
      const { rows } = await pool.query(
        "INSERT INTO hiring_candidates (folder_id, nome, contato, col, form_data) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [folder_id, nome, contato, col, form_data]
      );
      await pool.query(
        "INSERT INTO hiring_candidate_history (candidate_id, action, details, user_name) VALUES ($1, $2, $3, $4)",
        [rows[0].id, "Formul\xE1rio preenchido", "Candidato preencheu o formul\xE1rio de inscri\xE7\xE3o da vaga.", nome]
      );
      res.json(rows[0]);
    } catch (err) {
      console.error("[hiring] POST public apply error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/hiring/candidates/:id", async (req, res) => {
    try {
      const { nome, contato, acao, data_acao, col } = req.body;
      const { rows } = await pool.query(
        "UPDATE hiring_candidates SET nome = COALESCE($1, nome), contato = COALESCE($2, contato), acao = $3, data_acao = $4, col = COALESCE($5, col) WHERE id = $6 RETURNING *",
        [nome, contato, acao !== void 0 ? acao : null, data_acao !== void 0 ? data_acao : null, col, req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Candidate not found" });
      res.json(rows[0]);
    } catch (err) {
      console.error("[hiring] PUT candidate error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/hiring/candidates/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM hiring_candidates WHERE id = $1", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      console.error("[hiring] DELETE candidate error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/hiring/candidates/:id/saboteurs", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT saboteur_key, score FROM hiring_saboteur_results WHERE candidate_id = $1 ORDER BY saboteur_key",
        [req.params.id]
      );
      res.json(rows);
    } catch (err) {
      console.error("[hiring] GET saboteurs error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.put("/api/hiring/candidates/:id/saboteurs", async (req, res) => {
    try {
      const { results } = req.body;
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
      await pool.query(
        "INSERT INTO hiring_candidate_history (candidate_id, action, details, user_name) VALUES ($1, $2, $3, $4)",
        [req.params.id, "Teste de Sabotadores conclu\xEDdo", "Candidato completou a avalia\xE7\xE3o de Sabotadores (Intelig\xEAncia Positiva).", "Sistema"]
      );
    } catch (err) {
      console.error("[hiring] PUT saboteurs error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/hiring/candidates/:id/disc", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT d_score, i_score, s_score, c_score FROM hiring_disc_results WHERE candidate_id = $1",
        [req.params.id]
      );
      res.json(rows[0] || { d_score: 0, i_score: 0, s_score: 0, c_score: 0 });
    } catch (err) {
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
      await pool.query(
        "INSERT INTO hiring_candidate_history (candidate_id, action, details, user_name) VALUES ($1, $2, $3, $4)",
        [req.params.id, "Teste DISC conclu\xEDdo", "Candidato completou a avalia\xE7\xE3o de Perfil Comportamental DISC.", "Sistema"]
      );
      res.json(rows[0]);
    } catch (err) {
      console.error("[hiring] PUT disc error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/hiring/documents", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM hiring_documents ORDER BY updated_at DESC");
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/hiring/documents", async (req, res) => {
    try {
      const { title, content, created_by, section } = req.body;
      const { rows } = await pool.query(
        "INSERT INTO hiring_documents (title, content, created_by, section) VALUES ($1, $2, $3, $4) RETURNING *",
        [title || "Sem t\xEDtulo", content || "", created_by || "Sistema", section || ""]
      );
      res.json(rows[0]);
    } catch (err) {
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
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/hiring/documents/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM hiring_documents WHERE id = $1", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/hiring/contracts", async (_req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT id, name, description, file_name, file_type, file_size, uploaded_by, updated_at, created_at FROM hiring_contracts ORDER BY created_at DESC"
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/hiring/contracts", express.json({ limit: "50mb" }), async (req, res) => {
    try {
      const { name, description, file_name, file_data, file_type, file_size, uploaded_by } = req.body;
      if (!file_data || !file_name) return res.status(400).json({ error: "file_data and file_name are required" });
      const { rows } = await pool.query(
        "INSERT INTO hiring_contracts (name, description, file_name, file_data, file_type, file_size, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, description, file_name, file_type, file_size, uploaded_by, updated_at, created_at",
        [name || file_name, description || "", file_name, file_data, file_type || "application/octet-stream", file_size || 0, uploaded_by || "Sistema"]
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/hiring/contracts/:id/download", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT file_name, file_data, file_type FROM hiring_contracts WHERE id = $1", [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: "Contract not found" });
      const { file_name, file_data, file_type } = rows[0];
      const buffer = Buffer.from(file_data, "base64");
      res.setHeader("Content-Type", file_type);
      res.setHeader("Content-Disposition", `attachment; filename="${file_name}"`);
      res.send(buffer);
    } catch (err) {
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
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/hiring/contracts/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM hiring_contracts WHERE id = $1", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/hiring/candidates/:id/notes", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM hiring_candidate_notes WHERE candidate_id = $1 ORDER BY created_at DESC",
        [req.params.id]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/hiring/candidates/:id/notes", async (req, res) => {
    try {
      const { content, user_name } = req.body;
      const { rows } = await pool.query(
        "INSERT INTO hiring_candidate_notes (candidate_id, content, user_name) VALUES ($1, $2, $3) RETURNING *",
        [req.params.id, content, user_name || "Sistema"]
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.delete("/api/hiring/candidates/notes/:noteId", async (req, res) => {
    try {
      await pool.query("DELETE FROM hiring_candidate_notes WHERE id = $1", [req.params.noteId]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/hiring/candidates/:id/history", async (req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM hiring_candidate_history WHERE candidate_id = $1 ORDER BY created_at DESC",
        [req.params.id]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/hiring/candidates/:id/history", async (req, res) => {
    try {
      const { action, details, user_name } = req.body;
      const { rows } = await pool.query(
        "INSERT INTO hiring_candidate_history (candidate_id, action, details, user_name) VALUES ($1, $2, $3, $4) RETURNING *",
        [req.params.id, action, details, user_name || "Sistema"]
      );
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/org-chart", async (_req, res) => {
    try {
      const { rows } = await pool.query("SELECT data FROM org_chart_state WHERE id = 1");
      res.json(rows[0]?.data || { nodes: [], edges: [] });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/org-chart", async (req, res) => {
    try {
      const { data } = req.body;
      await pool.query(
        "INSERT INTO org_chart_state (id, data) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
        [data]
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/collaborators", async (_req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT c.*,
               u.picture  AS linked_picture,
               u.name     AS linked_user_name,
               u.email    AS linked_user_email
        FROM collaborators c
        LEFT JOIN users u ON u.id = c.linked_user_id
        ORDER BY c.created_at DESC
      `);
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao buscar colaboradores." });
    }
  });
  app.get("/api/system-users", async (_req, res) => {
    try {
      const { rows } = await pool.query(
        "SELECT id, name, email, picture, role FROM users ORDER BY name ASC"
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/collaborator-settings", async (req, res) => {
    try {
      const { rows } = await pool.query("SELECT * FROM collaborator_settings ORDER BY type, name");
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/collaborator-settings", async (req, res) => {
    const { type, name, color } = req.body;
    try {
      const { rows } = await pool.query(
        "INSERT INTO collaborator_settings (type, name, color) VALUES ($1, $2, $3) RETURNING *",
        [type, name, color || "#8b5cf6"]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/collaborator-settings/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM collaborator_settings WHERE id = $1", [req.params.id]);
      res.status(204).end();
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/collaborators", async (req, res) => {
    const { name, group_name, role, seniority_level, pix_key, remuneration, transport_voucher, benefits, birth_date, start_date, end_date, level_junior, level_pleno, level_senior, leadership_role, ai_role, status, form_data, linked_user_id } = req.body;
    try {
      const { rows } = await pool.query(
        `INSERT INTO collaborators (name, group_name, role, seniority_level, pix_key, remuneration, transport_voucher, benefits, birth_date, start_date, end_date, level_junior, level_pleno, level_senior, leadership_role, ai_role, status, form_data, linked_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
        [name, group_name, role, seniority_level, pix_key, remuneration, transport_voucher, benefits, birth_date, start_date, end_date, level_junior || false, level_pleno || false, level_senior || false, leadership_role || false, ai_role || false, status || "Efetivado", form_data || {}, linked_user_id || null]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao criar colaborador." });
    }
  });
  app.put("/api/collaborators/:id", async (req, res) => {
    const id = req.params.id;
    const { name, group_name, role, seniority_level, pix_key, remuneration, transport_voucher, benefits, birth_date, start_date, end_date, level_junior, level_pleno, level_senior, leadership_role, ai_role, status, form_data, linked_user_id } = req.body;
    try {
      const { rows } = await pool.query(
        `UPDATE collaborators
         SET name=$1, group_name=$2, role=$3, seniority_level=$4, pix_key=$5, remuneration=$6, transport_voucher=$7, benefits=$8, birth_date=$9, start_date=$10, end_date=$11, level_junior=$12, level_pleno=$13, level_senior=$14, leadership_role=$15, ai_role=$16, status=$17, form_data=$18, linked_user_id=$19, updated_at=CURRENT_TIMESTAMP
         WHERE id=$20 RETURNING *`,
        [name, group_name, role, seniority_level, pix_key, remuneration, transport_voucher, benefits, birth_date, start_date, end_date, level_junior, level_pleno, level_senior, leadership_role, ai_role, status, form_data, linked_user_id !== void 0 ? linked_user_id : null, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Colaborador n\xE3o encontrado." });
      res.json(rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao atualizar colaborador." });
    }
  });
  app.delete("/api/collaborators/:id", async (req, res) => {
    try {
      await pool.query("DELETE FROM collaborators WHERE id=$1", [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao deletar colaborador." });
    }
  });
  app.post("/api/public/collaborators", async (req, res) => {
    const { name, form_data } = req.body;
    try {
      const { rows } = await pool.query(
        `INSERT INTO collaborators (name, form_data, status) VALUES ($1, $2, 'Efetivado') RETURNING *`,
        [name, form_data || {}]
      );
      res.status(201).json({ success: true, collaborator: rows[0] });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro ao enviar formul\xE1rio." });
    }
  });
  setupCollectionRoutes(app, pool);
  setupDispatchRoutes(app, pool);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meeting_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      page_id TEXT NOT NULL,
      title TEXT NOT NULL,
      meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
      attendees JSONB DEFAULT '[]',
      entries JSONB DEFAULT '[]',
      notes_html TEXT DEFAULT '',
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE meeting_notes ADD COLUMN IF NOT EXISTS notes_html TEXT DEFAULT ''`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meeting_notes_comments (
      id SERIAL PRIMARY KEY,
      session_id UUID REFERENCES meeting_notes(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      author_name TEXT DEFAULT 'Equipe',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      files JSONB DEFAULT '[]'
    )
  `);
  await pool.query(`ALTER TABLE meeting_notes_comments ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'`);
  await pool.query(`ALTER TABLE collaborators ADD COLUMN IF NOT EXISTS linked_user_id TEXT`);
  app.get("/api/meeting-notes/:pageId", async (req, res) => {
    try {
      const { pageId } = req.params;
      const r = await pool.query(
        `SELECT * FROM meeting_notes WHERE page_id = $1 ORDER BY meeting_date DESC, created_at DESC`,
        [pageId]
      );
      res.json(r.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/meeting-notes", async (req, res) => {
    try {
      const { page_id, title, meeting_date, attendees = [], entries = [], notes_html = "", created_by } = req.body;
      const r = await pool.query(
        `INSERT INTO meeting_notes (page_id, title, meeting_date, attendees, entries, notes_html, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [
          page_id,
          title,
          meeting_date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          JSON.stringify(attendees),
          JSON.stringify(entries),
          notes_html,
          created_by
        ]
      );
      res.json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.put("/api/meeting-notes/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { title, meeting_date, attendees, entries, notes_html } = req.body;
      const r = await pool.query(
        `UPDATE meeting_notes SET title=$1, meeting_date=$2, attendees=$3, entries=$4, notes_html=$5, updated_at=NOW()
         WHERE id=$6 RETURNING *`,
        [title, meeting_date, JSON.stringify(attendees), JSON.stringify(entries || []), notes_html || "", id]
      );
      res.json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/meeting-notes/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM meeting_notes WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/meeting-notes/:id/comments", async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT * FROM meeting_notes_comments WHERE session_id = $1 ORDER BY created_at ASC`,
        [req.params.id]
      );
      res.json(r.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/meeting-notes/:id/comments", async (req, res) => {
    try {
      const { text, author_name = "Equipe", files = [] } = req.body;
      const r = await pool.query(
        `INSERT INTO meeting_notes_comments (session_id, text, author_name, files) VALUES ($1,$2,$3,$4) RETURNING *`,
        [req.params.id, text, author_name, JSON.stringify(files)]
      );
      res.json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/meeting-notes/:id/comments/:commentId", async (req, res) => {
    try {
      await pool.query(
        `DELETE FROM meeting_notes_comments WHERE id = $1 AND session_id = $2`,
        [req.params.commentId, req.params.id]
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/passwords", async (req, res) => {
    try {
      const { page_id } = req.query;
      const r = await pool.query(
        `SELECT * FROM passwords WHERE page_id = $1 ORDER BY created_at DESC`,
        [page_id]
      );
      res.json(r.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/passwords", async (req, res) => {
    try {
      const { page_id, service_name, login, password, url } = req.body;
      const r = await pool.query(
        `INSERT INTO passwords (page_id, service_name, login, password, url) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [page_id, service_name, login, password, url]
      );
      res.json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.patch("/api/passwords/:id", async (req, res) => {
    try {
      const { service_name, login, password, url } = req.body;
      const r = await pool.query(
        `UPDATE passwords SET service_name = COALESCE($1, service_name), login = COALESCE($2, login), password = COALESCE($3, password), url = COALESCE($4, url) WHERE id = $5 RETURNING *`,
        [service_name, login, password, url, req.params.id]
      );
      res.json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/passwords/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM passwords WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.get("/api/project-tokens", async (req, res) => {
    try {
      const { project_id } = req.query;
      const r = await pool.query(
        `SELECT * FROM project_tokens WHERE project_id = $1 ORDER BY created_at DESC`,
        [project_id]
      );
      res.json(r.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post("/api/project-tokens", async (req, res) => {
    try {
      const { project_id, service_name, token_value, notes } = req.body;
      const r = await pool.query(
        `INSERT INTO project_tokens (project_id, service_name, token_value, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
        [project_id, service_name, token_value, notes]
      );
      res.json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.patch("/api/project-tokens/:id", async (req, res) => {
    try {
      const { service_name, token_value, notes } = req.body;
      const r = await pool.query(
        `UPDATE project_tokens SET service_name = COALESCE($1, service_name), token_value = COALESCE($2, token_value), notes = COALESCE($3, notes) WHERE id = $4 RETURNING *`,
        [service_name, token_value, notes, req.params.id]
      );
      res.json(r.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete("/api/project-tokens/:id", async (req, res) => {
    try {
      await pool.query(`DELETE FROM project_tokens WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    try {
      console.log("Loading Vite middleware for development...");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "custom"
      });
      app.use(vite.middlewares);
      app.use("*all", async (req, res, next) => {
        try {
          const indexHtmlPath = path.resolve(process.cwd(), "index.html");
          let template = fs.readFileSync(indexHtmlPath, "utf-8");
          template = await vite.transformIndexHtml(req.originalUrl, template);
          const config = {
            FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
            FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
            FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
            FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
            FIREBASE_FIRESTORE_DATABASE_ID: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || process.env.FIREBASE_FIRESTORE_DATABASE_ID || "(default)"
          };
          const injection = `
            <script>
              window.FIREBASE_CONFIG = ${JSON.stringify(config)};
              window.FIREBASE_API_KEY = "${config.FIREBASE_API_KEY || ""}";
              window.FIREBASE_AUTH_DOMAIN = "${config.FIREBASE_AUTH_DOMAIN || ""}";
              window.FIREBASE_PROJECT_ID = "${config.FIREBASE_PROJECT_ID || ""}";
              window.FIREBASE_APP_ID = "${config.FIREBASE_APP_ID || ""}";
            </script>
          `;
          const html = template.replace("</head>", `${injection}</head>`);
          res.status(200).set({ "Content-Type": "text/html" }).end(html);
        } catch (e) {
          console.error("[VITE RENDER ERROR]", e);
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    } catch (e) {
      console.error("Vite setup failed:", e);
      console.warn("Vite not found, falling back to static serving");
      setupStaticServing(app);
    }
  } else {
    console.log("Starting in PRODUCTION mode...");
    setupStaticServing(app);
  }
  app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path}`, err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      error: status < 500 ? err.message : "Erro interno do servidor. Tente novamente mais tarde."
    });
  });
  const portNum = typeof PORT === "string" ? parseInt(PORT, 10) : PORT;
  const server = app.listen(portNum, "0.0.0.0", () => {
    const addr = server.address();
    const bind = typeof addr === "string" ? "pipe " + addr : "port " + addr?.port;
    console.log(`>>> SERVER STARTED SUCCESS! <<<`);
    console.log(`Listening on ${bind}`);
    console.log(`Env: ${process.env.NODE_ENV}`);
    console.log(`CWD: ${process.cwd()}`);
    console.log(`__dirname: ${__dirname}`);
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
        console.error("[sync-inadimplentes] Erro ao sincronizar:", err);
      }
    };
    syncInadimplentes();
    setInterval(syncInadimplentes, 60 * 60 * 1e3);
  });
}
function setupStaticServing(app) {
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
      let html = fs.readFileSync(indexPath, "utf8");
      const config = {
        FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
        FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
        FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
        FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
        FIREBASE_FIRESTORE_DATABASE_ID: process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || process.env.FIREBASE_FIRESTORE_DATABASE_ID || "(default)"
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
          window.FIREBASE_API_KEY = "${config.FIREBASE_API_KEY || ""}";
          window.FIREBASE_AUTH_DOMAIN = "${config.FIREBASE_AUTH_DOMAIN || ""}";
          window.FIREBASE_PROJECT_ID = "${config.FIREBASE_PROJECT_ID || ""}";
          window.FIREBASE_APP_ID = "${config.FIREBASE_APP_ID || ""}";
        </script>
      `;
      html = html.replace("</head>", `${injection}</head>`);
      res.send(html);
    } else {
      res.status(404).send(`Frontend build not found. Searched in: ${distPath}. Please check your deployment.`);
    }
  });
}
startServer().catch((err) => {
  console.error("Error starting server:", err);
});
