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

  // 8a. Queue stats — registrado ANTES do /:customerAsaasId para não ser capturado como parâmetro
  app.get('/api/fin/collection/events/stats', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          (
            SELECT COUNT(*)
            FROM fin_collection_events fce
            JOIN fin_receivables fr ON fr.asaas_id = fce.receivable_asaas_id
            WHERE DATE(fce.triggered_at) = CURRENT_DATE
              AND (CURRENT_DATE - fr.due_date) < 10
          ) as hoje,
          (
            SELECT COUNT(*)
            FROM fin_collection_events fce
            JOIN fin_receivables fr ON fr.asaas_id = fce.receivable_asaas_id
            WHERE fce.triggered_at >= CURRENT_DATE - interval '7 days'
              AND (CURRENT_DATE - fr.due_date) < 10
          ) as ultimos7dias,
          (
            SELECT COUNT(*)
            FROM fin_receivables
            WHERE status IN ('PENDING', 'OVERDUE')
              AND due_date IS NOT NULL
              AND (CURRENT_DATE - due_date) BETWEEN -5 AND -1
          ) as agendados
      `);
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
      const result = await pool.query(`
        SELECT 
          fp.name as client_name,
          fr.value,
          fr.due_date,
          fcr.label as rule_label,
          fcr.day_offset,
          fce.channel,
          DATE(fce.triggered_at) as scheduled_date,
          fce.status,
          fce.triggered_at,
          'event' as row_type
        FROM fin_collection_events fce
        JOIN fin_collection_rules fcr ON fcr.id = fce.rule_id
        JOIN fin_receivables fr ON fr.asaas_id = fce.receivable_asaas_id
        JOIN fin_people fp ON fp.asaas_id = fce.customer_asaas_id
        WHERE (CURRENT_DATE - fr.due_date) < 10

        UNION ALL

        SELECT
          COALESCE(p.name, r.customer_name, 'Desconhecido') as client_name,
          r.value,
          r.due_date,
          'Preventivo agendado' as rule_label,
          (CURRENT_DATE - r.due_date) as day_offset,
          'whatsapp' as channel,
          r.due_date as scheduled_date,
          'pending' as status,
          NULL::timestamptz as triggered_at,
          'pending' as row_type
        FROM fin_receivables r
        LEFT JOIN fin_people p ON p.asaas_id = r.customer_id
        WHERE r.status IN ('PENDING', 'OVERDUE')
          AND r.due_date IS NOT NULL
          AND (CURRENT_DATE - r.due_date) BETWEEN -5 AND -1

        ORDER BY triggered_at DESC NULLS LAST, scheduled_date ASC
        LIMIT 100;
      `);
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
