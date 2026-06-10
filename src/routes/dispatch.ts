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

/** Substitui variáveis do template e converte \n para quebra de linha real */
function renderMessage(template: string, item: Record<string, any>): string {
  const hora = nowBRT().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  const valor = item.amount != null
    ? Number(item.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '';

  // due_date pode vir como Date (objeto JS) ou string 'YYYY-MM-DD' do PostgreSQL
  const dueDateStr = item.due_date instanceof Date
    ? item.due_date.toISOString().slice(0, 10)
    : String(item.due_date || '').slice(0, 10);

  const vencimento = dueDateStr
    ? new Date(dueDateStr + 'T12:00:00').toLocaleDateString('pt-BR')
    : '';

  return template
    .replace(/\\n/g, '\n')          // \n literal → quebra de linha real
    .replace(/{{saudacao}}/gi, saudacao)
    .replace(/{{nome}}/gi,     item.customer_name || '')
    .replace(/{{valor}}/gi,    valor)
    .replace(/{{vencimento}}/gi, vencimento)
    .replace(/{{link}}/gi,     item.invoice_url || '')
    .replace(/{{telefone}}/gi, item.customer_phone || '');
}

/** Salva o envio como comentário COBRANÇA no histórico do cliente (crm_comments) */
async function saveDispatchComment(pool: Pool, item: Record<string, any>, mensagem: string): Promise<void> {
  try {
    if (!item.grapehub_client_id) return;
    await pool.query(
      `INSERT INTO crm_comments (client_id, user_id, type, content, images)
       VALUES ($1, 'sistema', 'COBRANÇA', $2, '{}')`,
      [item.grapehub_client_id, `Mensagem de cobrança enviada:\n${mensagem}`]
    );
  } catch (e) {
    console.warn('[dispatch] Falha ao salvar comentário no histórico:', e);
  }
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

  // ── GUARD: já disparou hoje? (leitura rápida antes do lock) ─
  const lastBatch = cfg.last_batch_date
    ? String(cfg.last_batch_date).slice(0, 10)
    : null;
  if (lastBatch === today) {
    return;
  }

  // ── GUARD: horário configurado ainda não chegou? ──────────
  const now = nowBRT();
  const [dispH, dispM] = String(cfg.dispatch_time).slice(0, 5).split(':').map(Number);
  const dispatchMinutes = dispH * 60 + dispM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < dispatchMinutes) {
    return;
  }

  // ── LOCK ATÔMICO via PostgreSQL ────────────────────────────
  // Usa UPDATE...WHERE para garantir que APENAS UM worker execute o batch.
  // Se outro worker já atualizou last_batch_date para hoje, rowCount = 0.
  const lockRes = await pool.query(
    `UPDATE fin_dispatch_config SET last_batch_date = $1, updated_at = NOW() WHERE last_batch_date IS DISTINCT FROM $1 RETURNING *`,
    [today]
  );
  if (lockRes.rowCount === 0) {
    console.log(`[dispatch-scheduler] Batch já reivindicado por outro processo — ignorando.`);
    return;
  }

  isBatchRunning = true;
  console.log(`[dispatch-scheduler] Lock adquirido — iniciando batch diário para ${today}`);

  try {

    // ── AUTO-POPULATE ─────────────────────────────────────────
    // 1) Corrige datas erradas
    await pool.query(`
      UPDATE fin_dispatch_queue dq
      SET scheduled_date = dq.due_date::date + dq.day_offset, updated_at = NOW()
      WHERE dq.status = 'AGENDADO'
        AND dq.due_date IS NOT NULL
        AND dq.scheduled_date != dq.due_date::date + dq.day_offset
    `);
    // 1a) Corrige canal e telefone dos itens existentes com base no cadastro do cliente
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
    // 2) Cancela itens de clientes no CRM Financeiro
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
    // 3) Cancela itens de faturas já pagas (RECEIVED / CONFIRMED / RECEIVED_IN_CASH)
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
    // 4) Remove itens AGENDADOS além da janela de 15 dias
    await pool.query(`
      DELETE FROM fin_dispatch_queue
      WHERE status = 'AGENDADO'
        AND scheduled_date > CURRENT_DATE + INTERVAL '15 days'
    `);
    // 5) Cancela regras automáticas (day_offset < 10) para clientes de cartão de crédito
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
        -- Só insere dentro da janela de 15 dias
        AND fr.due_date::date + fcr.day_offset >= CURRENT_DATE
        AND fr.due_date::date + fcr.day_offset <= CURRENT_DATE + INTERVAL '15 days'
        -- Cartão de crédito só entra a partir do Contato Humano
        AND NOT (fr.billing_type = 'CREDIT_CARD' AND fcr.day_offset < 10)
        AND NOT (c.crm_status IS NOT NULL AND c.crm_status != '')
        -- Evita duplicar: 1 disparo por CLIENTE por regra (não por fatura)
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
    // ─────────────────────────────────────────────────────────

    // ── LIMIT: máximo 1 disparo por cliente por dia ─────────────
    const qRes = await pool.query(
      `SELECT DISTINCT ON (customer_asaas_id) *
       FROM fin_dispatch_queue
       WHERE status = 'AGENDADO' AND scheduled_date <= $1
       ORDER BY customer_asaas_id, scheduled_date ASC, created_at ASC`,
      [today]
    );
    const items = qRes.rows;
    console.log(`[dispatch-scheduler] ${items.length} item(s) a enviar (1 por cliente/dia)`);

    // Reagenda itens excedentes do mesmo cliente para o próximo dia
    if (items.length > 0) {
      const sentIds = items.map(i => i.id);
      await pool.query(
        `UPDATE fin_dispatch_queue
         SET scheduled_date = CURRENT_DATE + 1, updated_at = NOW()
         WHERE status = 'AGENDADO'
           AND scheduled_date <= $1
           AND id != ALL($2::uuid[])`,
        [today, sentIds]
      );
    }

    const intervalMs = (cfg.dispatch_interval_seconds || 60) * 1000;

    for (const item of items) {
      // Claim atômico: só prossegue se o item ainda está AGENDADO.
      // Previne que múltiplos workers enviem o mesmo item.
      const claim = await pool.query(
        `UPDATE fin_dispatch_queue SET status = 'ENVIANDO', updated_at = NOW() WHERE id = $1 AND status = 'AGENDADO' RETURNING id`,
        [item.id]
      );
      if (claim.rowCount === 0) {
        console.log(`[dispatch-scheduler] Item ${item.id} já foi reivindicado por outro processo — pulando.`);
        continue;
      }
      try {
        // Busca o telefone e canal mais atualizados (prioriza billing_phone do cadastro)
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
        const resolvedPhone = row?.phone || item.customer_phone || '';
        const resolvedCanal = row?.canal || 'Whatsapp';
        const resolvedEmail = row?.email || '';
        // Atualiza o customer_phone na fila com o valor correto
        if (resolvedPhone !== item.customer_phone) {
          await pool.query(`UPDATE fin_dispatch_queue SET customer_phone = $2 WHERE id = $1`, [item.id, resolvedPhone]);
          item.customer_phone = resolvedPhone;
        }
        const mensagem = renderMessage(item.message_template || '', item);
        // Atualiza message_rendered no banco para exibição correta no UI
        await pool.query(`UPDATE fin_dispatch_queue SET message_rendered = $2 WHERE id = $1`, [item.id, mensagem]);
        const payload = {
          telefone: resolvedPhone,
          mensagem,
          nome: item.customer_name,
          email: resolvedEmail,
          metodo: resolvedCanal,
          dispatch_id: item.id,
        };
        const resp = await sendViaN8n(cfg.n8n_webhook_url, payload);
        await pool.query(
          `UPDATE fin_dispatch_queue SET status = 'ENVIADO', sent_at = NOW(), updated_at = NOW(),
           n8n_ticket_id = $2, n8n_contato_id = $3, n8n_contato_novo = $4, n8n_ticket_novo = $5
           WHERE id = $1`,
          [item.id, resp?.ticket_id || null, resp?.contato_id || null, resp?.contato_novo ?? null, resp?.ticket_novo ?? null]
        );
        await saveDispatchComment(pool, item, mensagem);
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
        // Busca o telefone e canal mais atualizados (prioriza billing_phone do cadastro)
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
        const resolvedPhone = row?.phone || item.customer_phone || '';
        const resolvedCanal = row?.canal || 'Whatsapp';
        const resolvedEmail = row?.email || '';
        if (resolvedPhone !== item.customer_phone) {
          await pool.query(`UPDATE fin_dispatch_queue SET customer_phone = $2 WHERE id = $1`, [id, resolvedPhone]);
        }
        const mensagem = renderMessage(item.message_template || '', item);
        await pool.query(`UPDATE fin_dispatch_queue SET message_rendered = $2 WHERE id = $1`, [id, mensagem]);
        const payload = { telefone: resolvedPhone, mensagem, nome: item.customer_name, email: resolvedEmail, metodo: resolvedCanal, dispatch_id: id };
        const resp = await sendViaN8n(cfg.n8n_webhook_url, payload);
        await pool.query(`UPDATE fin_dispatch_queue SET status = 'ENVIADO', sent_at = NOW(), updated_at = NOW(), n8n_ticket_id = $2, n8n_contato_id = $3, n8n_contato_novo = $4, n8n_ticket_novo = $5 WHERE id = $1`,
          [id, resp?.ticket_id || null, resp?.contato_id || null, resp?.contato_novo ?? null, resp?.ticket_novo ?? null]);
        await saveDispatchComment(pool, item, mensagem);
      } catch (err: any) {
        await pool.query(`UPDATE fin_dispatch_queue SET status = 'ERRO', error_message = $2, updated_at = NOW() WHERE id = $1`, [id, err?.message]);
      }
    } catch (e) {
      res.status(500).json({ error: 'Failed to send' });
    }
  });

  // POST mark manual (no webhook)
  app.post('/api/finance/dispatch/queue/:id/mark-manual', async (req, res) => {
    const { id } = req.params;
    try {
      const itemRes = await pool.query('SELECT * FROM fin_dispatch_queue WHERE id = $1', [id]);
      if (!itemRes.rows.length) return res.status(404).json({ error: 'Item not found' });
      const item = itemRes.rows[0];

      if (['ENVIANDO', 'ENVIADO'].includes(item.status)) {
        return res.status(409).json({ error: `Item já está com status ${item.status}` });
      }

      const mensagem = renderMessage(item.message_template || '', item);
      await pool.query(
        `UPDATE fin_dispatch_queue 
         SET status = 'ENVIADO', sent_at = NOW(), updated_at = NOW(), n8n_ticket_id = 'MANUAL', message_rendered = $2 
         WHERE id = $1`,
        [id, mensagem]
      );
      await saveDispatchComment(pool, item, mensagem);

      res.json({ ok: true, status: 'ENVIADO' });
    } catch (e) {
      console.error('[mark-manual error]', e);
      res.status(500).json({ error: 'Failed to mark as manual' });
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
      // 1 disparo por cliente por dia
      const qRes = await pool.query(
        `SELECT DISTINCT ON (customer_asaas_id) *
         FROM fin_dispatch_queue
         WHERE status = 'AGENDADO' AND scheduled_date <= $1
         ORDER BY customer_asaas_id, scheduled_date ASC, created_at ASC`,
        [today]
      );
      const items = qRes.rows;
      res.json({ ok: true, total: items.length });

      // Reagenda itens excedentes do mesmo cliente para o próximo dia
      if (items.length > 0) {
        const sentIds = items.map(i => i.id);
        await pool.query(
          `UPDATE fin_dispatch_queue
           SET scheduled_date = CURRENT_DATE + 1, updated_at = NOW()
           WHERE status = 'AGENDADO'
             AND scheduled_date <= $1
             AND id != ALL($2::uuid[])`,
          [today, sentIds]
        );
      }

      // Dispara sequencialmente com intervalo
      const intervalMs = (cfg.dispatch_interval_seconds || 60) * 1000;
      for (const item of items) {
        await pool.query(`UPDATE fin_dispatch_queue SET status = 'ENVIANDO', updated_at = NOW() WHERE id = $1`, [item.id]);
        try {
          // Busca o telefone e canal mais atualizados (prioriza billing_phone do cadastro)
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
          const resolvedPhone = row?.phone || item.customer_phone || '';
          const resolvedCanal = row?.canal || 'Whatsapp';
          const resolvedEmail = row?.email || '';
          if (resolvedPhone !== item.customer_phone) {
            await pool.query(`UPDATE fin_dispatch_queue SET customer_phone = $2 WHERE id = $1`, [item.id, resolvedPhone]);
          }
          const mensagem = renderMessage(item.message_template || '', item);
          await pool.query(`UPDATE fin_dispatch_queue SET message_rendered = $2 WHERE id = $1`, [item.id, mensagem]);
          const payload = { telefone: resolvedPhone, mensagem, nome: item.customer_name, email: resolvedEmail, metodo: resolvedCanal, dispatch_id: item.id };
          const resp = await sendViaN8n(cfg.n8n_webhook_url, payload);
          await pool.query(`UPDATE fin_dispatch_queue SET status = 'ENVIADO', sent_at = NOW(), updated_at = NOW(), n8n_ticket_id = $2, n8n_contato_id = $3, n8n_contato_novo = $4, n8n_ticket_novo = $5 WHERE id = $1`,
            [item.id, resp?.ticket_id || null, resp?.contato_id || null, resp?.contato_novo ?? null, resp?.ticket_novo ?? null]);
          await saveDispatchComment(pool, item, mensagem);
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

    // Se é um dispatch de teste, responde OK sem tocar no banco
    if (String(dispatch_id).startsWith('test_')) {
      console.log(`[dispatch-callback] Test callback received — id=${dispatch_id} success=${success}`);
      return res.json({ ok: true, dispatch_id, success, _test: true });
    }

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

  // POST — test webhook connectivity
  app.post('/api/finance/dispatch/test-webhook', async (req, res) => {
    const { webhook_url, canal } = req.body;
    if (!webhook_url) return res.status(400).json({ success: false, error: 'webhook_url é obrigatório' });

    const isEmail = canal === 'Email' || canal === 'E-mail' || canal === 'EMAIL';
    const testPayload = {
      telefone: isEmail ? '' : '5541996168921',
      mensagem: isEmail
        ? '🔔 Teste GrapeHub — Esta é uma mensagem de teste de E-MAIL para validar a conectividade do webhook.'
        : '🔔 Teste GrapeHub — Esta é uma mensagem de teste de WHATSAPP para validar a conectividade do webhook.',
      nome: 'Teste GrapeHub',
      email: isEmail ? 'jeanchan@grapemidia.com' : '',
      metodo: isEmail ? 'E-mail' : 'Whatsapp',
      dispatch_id: 'test_' + Date.now(),
      _test: true,
    };

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 15000);

    try {
      const response = await fetch(webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
        signal: ctrl.signal,
      });
      clearTimeout(timeout);

      const statusCode = response.status;
      let body: any = null;
      try { body = await response.json(); } catch { try { body = await response.text(); } catch {} }

      if (statusCode >= 200 && statusCode < 300) {
        res.json({ success: true, status_code: statusCode, response: body });
      } else {
        res.json({ success: false, status_code: statusCode, error: `Webhook retornou HTTP ${statusCode}`, response: body });
      }
    } catch (err: any) {
      clearTimeout(timeout);
      const message = err?.name === 'AbortError'
        ? 'Timeout — webhook não respondeu em 15 segundos'
        : (err?.message || 'Erro de conexão');
      res.json({ success: false, error: message });
    }
  });

  // POST — popular fila a partir da queue existente (conversão de itens pending→dispatch)
  app.post('/api/finance/dispatch/queue/populate', async (_req, res) => {
    try {
      // 1) Corrige itens já existentes com data errada (scheduled_date != due_date + day_offset)
      const fix = await pool.query(`
        UPDATE fin_dispatch_queue dq
        SET scheduled_date = dq.due_date::date + dq.day_offset,
            updated_at = NOW()
        WHERE dq.status = 'AGENDADO'
          AND dq.due_date IS NOT NULL
          AND dq.scheduled_date != dq.due_date::date + dq.day_offset
      `);

      // 1a) Corrige canal e telefone dos itens existentes com base no cadastro do cliente
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

      // 1b) Sync rápido: verifica status atual no Asaas para faturas AGENDADAS
      //     Garante que pagamentos recentes sejam detectados sem esperar sync completo
      const asaasKey = process.env.ASAAS_API_KEY?.replace(/\\\$/g, '$');
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
              { headers: { 'access_token': asaasKey } }
            );
            if (resp.ok) {
              const data = await resp.json() as { status?: string; paymentDate?: string };
              if (data?.status) {
                await pool.query(
                  `UPDATE fin_receivables SET status = $1 WHERE asaas_id = $2`,
                  [data.status, row.receivable_asaas_id]
                );
              }
            }
          } catch { /* ignora erros individuais */ }
        }
      }

      // Cancela itens AGENDADOS cujo cliente está no CRM Financeiro
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

      // Cancela itens AGENDADOS de faturas já pagas (RECEIVED / CONFIRMED / RECEIVED_IN_CASH)
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

      // Remove itens AGENDADOS com scheduled_date além da janela de 15 dias
      await pool.query(`
        DELETE FROM fin_dispatch_queue
        WHERE status = 'AGENDADO'
          AND scheduled_date > CURRENT_DATE + INTERVAL '15 days'
      `);

      // Cancela regras automáticas (day_offset < 10) para clientes de cartão de crédito
      // Cartão só entra a partir do Contato Humano (day_offset >= 10)
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
          -- Só popula regras cuja data de envio é hoje ou nos próximos 15 dias
          AND fr.due_date::date + fcr.day_offset >= CURRENT_DATE
          AND fr.due_date::date + fcr.day_offset <= CURRENT_DATE + INTERVAL '15 days'
          -- Exclui clientes que estão no CRM Financeiro (têm crm_status preenchido)
          AND NOT (
            c.crm_status IS NOT NULL AND c.crm_status != ''
          )
          -- Cartão de crédito: só entra a partir do Contato Humano (day_offset >= 10)
          AND NOT (
            fr.billing_type = 'CREDIT_CARD' AND fcr.day_offset < 10
          )
          -- Evita duplicar: 1 disparo por CLIENTE por regra (não por fatura)
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
    } catch (e: any) {
      console.error('[dispatch populate]', e);
      res.status(500).json({ error: e?.message });
    }
  });
}




