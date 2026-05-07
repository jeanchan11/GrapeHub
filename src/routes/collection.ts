import { Express } from 'express';
import { Pool } from 'pg';

export function setupCollectionRoutes(app: Express, pool: Pool) {
  // 1. List rules
  app.get('/api/fin/collection/rules', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT * FROM fin_collection_rules 
        ORDER BY day_offset ASC
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('[fin_collection_rules] GET error:', err);
      res.status(500).json({ error: 'Failed to fetch collection rules' });
    }
  });

  // 2. Update rule
  app.put('/api/fin/collection/rules/:id', async (req, res) => {
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
        return res.status(404).json({ error: 'Rule not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('[fin_collection_rules] PUT error:', err);
      res.status(500).json({ error: 'Failed to update rule' });
    }
  });

  // 3. Toggle rule
  app.patch('/api/fin/collection/rules/:id/toggle', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(`
        UPDATE fin_collection_rules 
        SET is_active = NOT is_active, updated_at = now()
        WHERE id = $1
        RETURNING *
      `, [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Rule not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('[fin_collection_rules] PATCH toggle error:', err);
      res.status(500).json({ error: 'Failed to toggle rule' });
    }
  });

  // 8a. Queue stats
  app.get('/api/fin/collection/events/stats', async (req, res) => {
    try {
      const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
      const [year, mon] = month.split('-').map(Number);
      const startDate = `${year}-${String(mon).padStart(2, '0')}-01`;
      const endDate = mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, '0')}-01`;

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
        hoje: parseInt(row.hoje || '0', 10),
        ultimos7dias: parseInt(row.ultimos7dias || '0', 10),
        agendados: parseInt(row.agendados || '0', 10),
      });
    } catch (err) {
      console.error('[fin_collection_events] Stats GET error:', err);
      res.status(500).json({ error: 'Failed to get queue stats' });
    }
  });

  // 8b. Queue unificada — registrado ANTES do /:customerAsaasId
  app.get('/api/fin/collection/events/queue', async (req, res) => {
    try {
      const fetchAll = req.query.all === 'true';
      const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
      const [year, mon] = month.split('-').map(Number);
      const startDate = `${year}-${String(mon).padStart(2, '0')}-01`;
      const endDate = mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, '0')}-01`;

      // Build date filter clauses conditionally
      const dateFilter = fetchAll ? '' : `AND fr.due_date >= $1::date AND fr.due_date < $2::date`;
      const pendingDateFilter = fetchAll ? '' : `AND r.due_date >= $1::date AND r.due_date < $2::date`;
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
      console.error('[fin_collection_events] Queue GET error:', err);
      res.status(500).json({ error: 'Failed to get collection queue' });
    }
  });

  // 4. Get events by customer
  app.get('/api/fin/collection/events/:customerAsaasId', async (req, res) => {
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
      console.error('[fin_collection_events] GET error:', err);
      res.status(500).json({ error: 'Failed to fetch collection events' });
    }
  });

  // 5. Create event
  app.post('/api/fin/collection/events', async (req, res) => {
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
      console.error('[fin_collection_events] POST error:', err);
      res.status(500).json({ error: 'Failed to create event' });
    }
  });

  // 6. Webhook n8n
  app.post('/api/fin/collection/webhook/n8n', async (req, res) => {
    const { rule_id, receivable_asaas_id, customer_asaas_id, channel, status, note } = req.body;
    try {
      await pool.query(`
        INSERT INTO fin_collection_events 
        (rule_id, receivable_asaas_id, customer_asaas_id, channel, status, note)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [rule_id, receivable_asaas_id, customer_asaas_id, channel, status, note]);
      res.json({ ok: true });
    } catch (err) {
      console.error('[fin_collection_events] Webhook error:', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // 6b. Manual mark as sent (replaces automation)
  app.post('/api/fin/collection/events/mark-sent', async (req, res) => {
    const { rule_id, receivable_asaas_id, customer_asaas_id, event_id, client_name, value, due_date, rule_label, message } = req.body;
    try {
      // 1. If there's an existing event (pending), update it
      if (event_id) {
        await pool.query(
          `UPDATE fin_collection_events SET status = 'sent', triggered_at = NOW() WHERE id = $1`,
          [event_id]
        );
      } else {
        // 2. Create new event as sent
        await pool.query(`
          INSERT INTO fin_collection_events 
          (rule_id, receivable_asaas_id, customer_asaas_id, channel, status, triggered_at)
          VALUES ($1, $2, $3, 'whatsapp', 'sent', NOW())
        `, [rule_id || null, receivable_asaas_id, customer_asaas_id]);
      }

      // 3. Insert comment in crm_comments (same as automation)
      const commentContent = `Mensagem de cobrança enviada:\n${message || rule_label || 'Cobrança manual'}`;
      
      // Find the grapehub client_id from customer_asaas_id
      const clientRes = await pool.query(
        `SELECT grapehub_client_id FROM fin_people WHERE asaas_id = $1 AND grapehub_client_id IS NOT NULL LIMIT 1`,
        [customer_asaas_id]
      );
      
      if (clientRes.rows.length > 0 && clientRes.rows[0].grapehub_client_id) {
        const clientId = clientRes.rows[0].grapehub_client_id;
        await pool.query(`
          INSERT INTO crm_comments (client_id, user_id, type, content, created_at, user_picture)
          VALUES ($1, 'sistema', 'cobranca', $2, NOW(), 
            'data:image/svg+xml,' || encode(('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%2322c55e"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="18" font-weight="bold">✓</text></svg>')::bytea, 'escape'))
        `, [clientId, commentContent]);
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('[fin_collection_events] Manual send error:', err);
      res.status(500).json({ error: 'Failed to mark as sent' });
    }
  });

  // 7. Summary — conta faturas por faixa de fase
  app.get('/api/fin/collection/summary', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(CASE WHEN (CURRENT_DATE - due_date) BETWEEN -5 AND -1 THEN 1 END) as preventivo,
          COUNT(CASE WHEN (CURRENT_DATE - due_date) = 0  THEN 1 END) as vencimento,
          COUNT(CASE WHEN (CURRENT_DATE - due_date) BETWEEN 1 AND 10 THEN 1 END) as reativo,
          COUNT(CASE WHEN (CURRENT_DATE - due_date) > 10 THEN 1 END) as humano
        FROM fin_receivables
        WHERE status IN ('PENDING', 'OVERDUE')
          AND due_date IS NOT NULL
      `);
      
      const row = result.rows[0] || { preventivo: 0, vencimento: 0, reativo: 0, humano: 0 };
      
      res.json({
        preventivo: parseInt(row.preventivo || '0', 10),
        vencimento: parseInt(row.vencimento || '0', 10),
        reativo: parseInt(row.reativo || '0', 10),
        humano: parseInt(row.humano || '0', 10)
      });
    } catch (err) {
      console.error('[fin_collection] Summary GET error:', err);
      res.status(500).json({ error: 'Failed to generate summary' });
    }
  });

  // 9. Summary detail by phase — lista clientes de uma fase
  app.get('/api/fin/collection/summary/:phase', async (req, res) => {
    const { phase } = req.params;
    const conditions: Record<string, string> = {
      preventivo: '(CURRENT_DATE - due_date) BETWEEN -5 AND -1',
      vencimento: '(CURRENT_DATE - due_date) = 0',
      reativo:    '(CURRENT_DATE - due_date) BETWEEN 1 AND 10',
      humano:     '(CURRENT_DATE - due_date) > 10',
    };
    const where = conditions[phase];
    if (!where) return res.status(400).json({ error: 'Invalid phase' });

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
        WHERE r.status IN ('PENDING', 'OVERDUE')
          AND r.due_date IS NOT NULL
          AND (CURRENT_DATE - r.due_date) ${phase === 'preventivo' ? 'BETWEEN -5 AND -1' : phase === 'vencimento' ? '= 0' : phase === 'reativo' ? 'BETWEEN 1 AND 10' : '> 10'}
        ORDER BY r.due_date ASC
        LIMIT 100
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('[fin_collection] Summary detail GET error:', err);
      res.status(500).json({ error: 'Failed to get phase details' });
    }
  });
}
