import { Express } from 'express';
import { Pool } from 'pg';

// ── Scheduler state ──────────────────────────────────────────
let schedulerTimer: ReturnType<typeof setTimeout> | null = null;
let isBatchRunning = false; // prevents concurrent batch runs

function nowBRT(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function todayBRT(): string {
  const d = nowBRT();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function sendViaN8n(webhookUrl: string, payload: object): Promise<any> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    return await res.json().catch(() => ({ success: true }));
  } catch (err: any) {
    clearTimeout(timeout);
    throw new Error(err?.message || 'Timeout or network error');
  }
}

/**
 * Roda o batch diário completo:
 * - Verifica se já foi disparado hoje (last_batch_date)
 * - Verifica se o horário configurado já chegou
 * - Se tudo ok, dispara todos os AGENDADO de hoje sequencialmente com intervalo
 * - Marca last_batch_date = today no banco ao final
 */
async function runDailyBatchIfNeeded(pool: Pool) {
  if (isBatchRunning) return;

  const cfgRes = await pool.query('SELECT * FROM fin_dispatch_config LIMIT 1');
  const cfg = cfgRes.rows[0];
  if (!cfg || !cfg.dispatch_enabled) return;
  if (!cfg.n8n_webhook_url) return;

  const today = todayBRT();

  // ── GUARD: já disparou hoje? ──────────────────────────────
  const lastBatch = cfg.last_batch_date
    ? String(cfg.last_batch_date).slice(0, 10)
    : null;
  if (lastBatch === today) {
    // Batch de hoje já foi executado — não faz nada
    return;
  }

  // ── GUARD: horário configurado ainda não chegou? ──────────
  const now = nowBRT();
  const [dispH, dispM] = String(cfg.dispatch_time).slice(0, 5).split(':').map(Number);
  const dispatchMinutes = dispH * 60 + dispM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < dispatchMinutes) {
    // Ainda não chegou o horário
    return;
  }

  // ── EXECUTA O BATCH ───────────────────────────────────────
  isBatchRunning = true;
  console.log(`[dispatch-scheduler] Iniciando batch diário para ${today}`);

  try {
    // Marca imediatamente para evitar dupla execução em caso de restart
    await pool.query(
      `UPDATE fin_dispatch_config SET last_batch_date = $1, updated_at = NOW()`,
      [today]
    );

    const qRes = await pool.query(
      `SELECT * FROM fin_dispatch_queue WHERE status = 'AGENDADO' AND scheduled_date = $1 ORDER BY created_at ASC`,
      [today]
    );
    const items = qRes.rows;
    console.log(`[dispatch-scheduler] ${items.length} item(s) a enviar`);

    const intervalMs = (cfg.dispatch_interval_seconds || 60) * 1000;

    for (const item of items) {
      await pool.query(
        `UPDATE fin_dispatch_queue SET status = 'ENVIANDO', updated_at = NOW() WHERE id = $1`,
        [item.id]
      );
      try {
        const payload = {
          telefone: item.customer_phone,
          mensagem: item.message_rendered || item.message_template || '',
          nome: item.customer_name,
          email: '',
          dispatch_id: item.id,
        };
        const resp = await sendViaN8n(cfg.n8n_webhook_url, payload);
        await pool.query(
          `UPDATE fin_dispatch_queue SET status = 'ENVIADO', sent_at = NOW(), updated_at = NOW(),
           n8n_ticket_id = $2, n8n_contato_id = $3, n8n_contato_novo = $4, n8n_ticket_novo = $5
           WHERE id = $1`,
          [item.id, resp?.ticket_id || null, resp?.contato_id || null, resp?.contato_novo ?? null, resp?.ticket_novo ?? null]
        );
        console.log(`[dispatch-scheduler] ✅ Enviado: ${item.customer_name} (${item.id})`);
      } catch (err: any) {
        await pool.query(
          `UPDATE fin_dispatch_queue SET status = 'ERRO', error_message = $2, updated_at = NOW() WHERE id = $1`,
          [item.id, err?.message || 'Erro desconhecido']
        );
        console.warn(`[dispatch-scheduler] ❌ Erro: ${item.customer_name} — ${err?.message}`);
      }
      // Aguarda intervalo entre mensagens (anti-flood WhatsApp)
      if (items.indexOf(item) < items.length - 1) {
        await new Promise(r => setTimeout(r, intervalMs));
      }
    }

    console.log(`[dispatch-scheduler] Batch concluído para ${today}`);
  } catch (e) {
    console.error('[dispatch-scheduler] Erro no batch:', e);
  } finally {
    isBatchRunning = false;
  }
}

function startScheduler(pool: Pool) {
  // Migração: adiciona last_batch_date se não existir
  pool.query(`ALTER TABLE fin_dispatch_config ADD COLUMN IF NOT EXISTS last_batch_date DATE`)
    .catch(() => {});

  // Verifica a cada 5 minutos se é hora de disparar
  const tick = async () => {
    try { await runDailyBatchIfNeeded(pool); } catch (e) { console.error('[dispatch-scheduler]', e); }
    schedulerTimer = setTimeout(tick, 5 * 60_000); // a cada 5 min
  };
  schedulerTimer = setTimeout(tick, 60_000); // primeira verificação após 1min do boot
  console.log('[dispatch-scheduler] started — verifica a cada 5 minutos');
}


// ── Route setup ──────────────────────────────────────────────
export function setupDispatchRoutes(app: Express, pool: Pool) {
  startScheduler(pool);

  // GET config
  app.get('/api/finance/dispatch/config', async (_req, res) => {
    try {
      const r = await pool.query('SELECT * FROM fin_dispatch_config LIMIT 1');
      res.json(r.rows[0] || {});
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch config' });
    }
  });

  // PUT config
  app.put('/api/finance/dispatch/config', async (req, res) => {
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
      res.status(500).json({ error: 'Failed to update config' });
    }
  });

  // GET queue (com filtros)
  app.get('/api/finance/dispatch/queue', async (req, res) => {
    try {
      const { status, date, limit = '100', offset = '0' } = req.query as Record<string, string>;
      const conds: string[] = [];
      const params: any[] = [];
      if (status) { params.push(status); conds.push(`status = $${params.length}`); }
      if (date)   { params.push(date);   conds.push(`scheduled_date = $${params.length}`); }
      const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
      params.push(parseInt(limit), parseInt(offset));
      const r = await pool.query(
        `SELECT * FROM fin_dispatch_queue ${where} ORDER BY scheduled_date ASC, created_at ASC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      res.json(r.rows);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch queue' });
    }
  });

  // GET stats
  app.get('/api/finance/dispatch/queue/stats', async (_req, res) => {
    try {
      const r = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM fin_dispatch_queue WHERE scheduled_date = CURRENT_DATE AND status IN ('ENVIADO','ENVIANDO')) as disparos_hoje,
          (SELECT COUNT(*) FROM fin_dispatch_queue WHERE status = 'ENVIADO' AND sent_at >= NOW() - interval '7 days') as concluidos_7_dias,
          (SELECT COUNT(*) FROM fin_dispatch_queue WHERE status = 'AGENDADO') as agendados_pendentes
      `);
      const row = r.rows[0];
      res.json({
        disparos_hoje: parseInt(row.disparos_hoje || '0'),
        concluidos_7_dias: parseInt(row.concluidos_7_dias || '0'),
        agendados_pendentes: parseInt(row.agendados_pendentes || '0'),
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // POST send manual (individual)
  app.post('/api/finance/dispatch/queue/:id/send', async (req, res) => {
    const { id } = req.params;
    try {
      const itemRes = await pool.query('SELECT * FROM fin_dispatch_queue WHERE id = $1', [id]);
      if (!itemRes.rows.length) return res.status(404).json({ error: 'Item not found' });
      const item = itemRes.rows[0];
      if (['ENVIANDO', 'ENVIADO'].includes(item.status)) {
        return res.status(409).json({ error: `Item já está com status ${item.status}` });
      }

      const cfgRes = await pool.query('SELECT * FROM fin_dispatch_config LIMIT 1');
      const cfg = cfgRes.rows[0];
      if (!cfg?.n8n_webhook_url) return res.status(400).json({ error: 'Webhook n8n não configurado' });

      await pool.query(`UPDATE fin_dispatch_queue SET status = 'ENVIANDO', updated_at = NOW() WHERE id = $1`, [id]);
      res.json({ ok: true, status: 'ENVIANDO' }); // responde antes de aguardar

      // Envia assíncronamente
      try {
        const payload = { telefone: item.customer_phone, mensagem: item.message_rendered || item.message_template || '', nome: item.customer_name, email: '', dispatch_id: id };
        const resp = await sendViaN8n(cfg.n8n_webhook_url, payload);
        await pool.query(`UPDATE fin_dispatch_queue SET status = 'ENVIADO', sent_at = NOW(), updated_at = NOW(), n8n_ticket_id = $2, n8n_contato_id = $3, n8n_contato_novo = $4, n8n_ticket_novo = $5 WHERE id = $1`,
          [id, resp?.ticket_id || null, resp?.contato_id || null, resp?.contato_novo ?? null, resp?.ticket_novo ?? null]);
      } catch (err: any) {
        await pool.query(`UPDATE fin_dispatch_queue SET status = 'ERRO', error_message = $2, updated_at = NOW() WHERE id = $1`, [id, err?.message]);
      }
    } catch (e) {
      res.status(500).json({ error: 'Failed to send' });
    }
  });

  // POST cancel
  app.post('/api/finance/dispatch/queue/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
      const r = await pool.query(`UPDATE fin_dispatch_queue SET status = 'CANCELADO', updated_at = NOW() WHERE id = $1 AND status = 'AGENDADO' RETURNING *`, [id]);
      if (!r.rows.length) return res.status(409).json({ error: 'Só é possível cancelar itens AGENDADOS' });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Failed to cancel' });
    }
  });

  // POST reopen — volta status para AGENDADO (reagendar para hoje)
  app.post('/api/finance/dispatch/queue/:id/reopen', async (req, res) => {
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
      if (!r.rows.length) return res.status(404).json({ error: 'Item não encontrado' });
      res.json({ ok: true, item: r.rows[0] });
    } catch (e) {
      res.status(500).json({ error: 'Failed to reopen' });
    }
  });

  // POST send-all (disparo manual de todos agendados de hoje)
  app.post('/api/finance/dispatch/queue/send-all', async (req, res) => {
    try {
      const cfgRes = await pool.query('SELECT * FROM fin_dispatch_config LIMIT 1');
      const cfg = cfgRes.rows[0];
      if (!cfg?.n8n_webhook_url) return res.status(400).json({ error: 'Webhook n8n não configurado' });

      const today = nowBRT().toISOString().split('T')[0];
      const qRes = await pool.query(`SELECT * FROM fin_dispatch_queue WHERE status = 'AGENDADO' AND scheduled_date = $1 ORDER BY created_at ASC`, [today]);
      const items = qRes.rows;
      res.json({ ok: true, total: items.length });

      // Dispara sequencialmente com intervalo
      const intervalMs = (cfg.dispatch_interval_seconds || 60) * 1000;
      for (const item of items) {
        await pool.query(`UPDATE fin_dispatch_queue SET status = 'ENVIANDO', updated_at = NOW() WHERE id = $1`, [item.id]);
        try {
          const payload = { telefone: item.customer_phone, mensagem: item.message_rendered || item.message_template || '', nome: item.customer_name, email: '', dispatch_id: item.id };
          const resp = await sendViaN8n(cfg.n8n_webhook_url, payload);
          await pool.query(`UPDATE fin_dispatch_queue SET status = 'ENVIADO', sent_at = NOW(), updated_at = NOW(), n8n_ticket_id = $2, n8n_contato_id = $3, n8n_contato_novo = $4, n8n_ticket_novo = $5 WHERE id = $1`,
            [item.id, resp?.ticket_id || null, resp?.contato_id || null, resp?.contato_novo ?? null, resp?.ticket_novo ?? null]);
        } catch (err: any) {
          await pool.query(`UPDATE fin_dispatch_queue SET status = 'ERRO', error_message = $2, updated_at = NOW() WHERE id = $1`, [item.id, err?.message]);
        }
        await new Promise(r => setTimeout(r, intervalMs));
      }
    } catch (e) {
      if (!res.headersSent) res.status(500).json({ error: 'Failed to send-all' });
    }
  });

  // POST callback n8n — confirmação de envio bem-sucedido
  app.post('/api/finance/dispatch/callback', async (req, res) => {
    // Aceita dispatch_id tanto no body quanto na query string (flexibilidade n8n)
    const dispatch_id = req.body?.dispatch_id || req.query?.dispatch_id;
    const { ticket_id, contato_id, contato_novo, ticket_novo } = req.body || {};

    // Normaliza success: aceita boolean true, string "true", número 1
    const raw = req.body?.success ?? req.query?.success;
    const success = raw === true || raw === 'true' || raw === 1 || raw === '1';

    if (!dispatch_id) return res.status(400).json({ error: 'dispatch_id required (body or query)' });

    console.log(`[dispatch-callback] id=${dispatch_id} success=${success} ticket=${ticket_id || '-'}`);

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
        `, [dispatch_id, ticket_id || null, contato_id || null, contato_novo ?? null, ticket_novo ?? null]);
      } else {
        const errMsg = req.body?.error_message || req.body?.message || 'Falha reportada pelo n8n';
        await pool.query(`
          UPDATE fin_dispatch_queue
          SET status = 'ERRO', error_message = $2, updated_at = NOW()
          WHERE id = $1
        `, [dispatch_id, errMsg]);
      }
      res.json({ ok: true, dispatch_id, success });
    } catch (e: any) {
      console.error('[dispatch-callback] Error:', e?.message);
      res.status(500).json({ error: 'Callback failed' });
    }
  });

  // POST — popular fila a partir da queue existente (conversão de itens pending→dispatch)
  app.post('/api/finance/dispatch/queue/populate', async (_req, res) => {
    try {
      const r = await pool.query(`
        INSERT INTO fin_dispatch_queue (
          customer_name, customer_phone, amount, due_date,
          day_offset,
          rule_triggered, channel, message_template, message_rendered,
          scheduled_date, receivable_asaas_id, customer_asaas_id, invoice_url
        )
        SELECT
          COALESCE(fp.name, fr.customer_name, 'Desconhecido'),
          COALESCE(NULLIF(c.phone,''), fp.phone, ''),
          fr.value,
          fr.due_date,
          fcr.day_offset,
          fcr.label,
          'WHATSAPP',
          fcr.message_template,
          fcr.message_template,
          CURRENT_DATE,
          fr.asaas_id,
          fr.customer_id,
          fr.invoice_url
        FROM fin_receivables fr
        LEFT JOIN fin_people fp ON fp.asaas_id = fr.customer_id
        LEFT JOIN clients c ON c.id = fp.grapehub_client_id
        JOIN (
          SELECT DISTINCT ON (fr2.asaas_id)
            fr2.asaas_id,
            COALESCE(
              (SELECT id FROM fin_collection_rules WHERE day_offset = (CURRENT_DATE - fr2.due_date) AND is_active = true LIMIT 1),
              (SELECT id FROM fin_collection_rules WHERE day_offset <= (CURRENT_DATE - fr2.due_date) AND is_active = true ORDER BY day_offset DESC LIMIT 1)
            ) as rule_id
          FROM fin_receivables fr2
          WHERE fr2.status IN ('PENDING','OVERDUE') AND fr2.due_date IS NOT NULL
        ) matched ON matched.asaas_id = fr.asaas_id
        JOIN fin_collection_rules fcr ON fcr.id = matched.rule_id
        WHERE fr.status IN ('PENDING','OVERDUE')
          AND fr.due_date IS NOT NULL
          AND COALESCE(fp.phone, c.phone, '') != ''
          AND NOT EXISTS (
            SELECT 1 FROM fin_dispatch_queue dq
            WHERE dq.receivable_asaas_id = fr.asaas_id
              AND dq.scheduled_date = CURRENT_DATE
              AND dq.status NOT IN ('CANCELADO','ERRO')
          )
        LIMIT 200
        ON CONFLICT DO NOTHING
      `);
      res.json({ ok: true, inserted: r.rowCount });
    } catch (e: any) {
      console.error('[dispatch populate]', e);
      res.status(500).json({ error: e?.message });
    }
  });
}

