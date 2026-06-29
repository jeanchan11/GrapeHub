import { Express } from 'express';
import { Pool } from 'pg';

// ── Categorias fixas padrão ──────────────────────────────────────────────────
export const DEFAULT_CATEGORIES = [
  'Salários', 'Aluguel', 'Software', 'Marketing', 'Impostos',
  'Serviços', 'Fornecedores', 'Utilidades', 'Equipamentos', 'Outros',
];

// ── Palavras-chave para categorização automática do Sicredi ─────────────────
const SICREDI_AUTO_CATEGORIES: { keywords: string[]; category: string }[] = [
  { keywords: ['google', 'gsuite', 'workspace'], category: 'Software' },
  { keywords: ['meta ', 'facebook', 'instagram ads'], category: 'Marketing' },
  { keywords: ['aws', 'amazon', 'azure', 'cloud'], category: 'Software' },
  { keywords: ['uber', 'taxi', '99 pop'], category: 'Serviços' },
  { keywords: ['ifood', 'rappi', 'restaurante', 'lanche'], category: 'Outros' },
  { keywords: ['posto', 'combustivel', 'gasolina', 'shell', 'ipiranga'], category: 'Outros' },
  { keywords: ['mercado', 'supermercado', 'carrefour', 'extra'], category: 'Outros' },
  { keywords: ['luz', 'energia', 'cpfl', 'enel', 'equatorial'], category: 'Utilidades' },
  { keywords: ['agua ', 'sabesp', 'saneamento'], category: 'Utilidades' },
  { keywords: ['telefone', 'vivo', 'claro', 'tim', 'oi ', 'internet'], category: 'Utilidades' },
  { keywords: ['folha', 'salario', 'rh ', 'gupy', 'recrutamento'], category: 'Salários' },
  { keywords: ['irpj', 'csll', 'simples', 'das ', 'pgfn', 'inss', 'fgts'], category: 'Impostos' },
  { keywords: ['aluguel', 'condominio', 'iptu'], category: 'Aluguel' },
];

function autoCategory(description: string): string | null {
  const lower = (description || '').toLowerCase();
  for (const rule of SICREDI_AUTO_CATEGORIES) {
    if (rule.keywords.some(k => lower.includes(k))) return rule.category;
  }
  return null;
}

export function setupBillsRoutes(app: Express, pool: Pool) {

  // ─────────────────────────────────────────────────────────────────────────
  // CATEGORIAS
  // ─────────────────────────────────────────────────────────────────────────

  // GET /api/fin/bills/categories — lista todas as categorias (fixas + customizadas)
  app.get('/api/fin/bills/categories', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT DISTINCT category FROM fin_bills WHERE category IS NOT NULL ORDER BY category`
      );
      const custom = result.rows.map(r => r.category);
      const all = Array.from(new Set([...DEFAULT_CATEGORIES, ...custom])).sort();
      res.json(all);
    } catch (err) {
      console.error('[bills-categories-error]', err);
      // Fallback: return default categories so the form doesn't break
      res.json(DEFAULT_CATEGORIES);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CONTAS RECORRENTES (fin_bills)
  // ─────────────────────────────────────────────────────────────────────────

  // GET /api/fin/bills — lista todas as contas recorrentes ativas
  app.get('/api/fin/bills', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM fin_bills WHERE is_active = true ORDER BY name ASC`
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch bills' });
    }
  });

  // POST /api/fin/bills — cria nova conta recorrente
  app.post('/api/fin/bills', async (req, res) => {
    const { name, category, value, recurrence, due_day, due_date, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
      const result = await pool.query(
        `INSERT INTO fin_bills (name, category, value, recurrence, due_day, due_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, category || 'Outros', value || null, recurrence || 'monthly', due_day || null, due_date || null, notes || null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create bill' });
    }
  });

  // PUT /api/fin/bills/:id — edita conta recorrente
  app.put('/api/fin/bills/:id', async (req, res) => {
    const { id } = req.params;
    const { name, category, value, recurrence, due_day, due_date, notes } = req.body;
    try {
      const result = await pool.query(
        `UPDATE fin_bills SET name=$1, category=$2, value=$3, recurrence=$4, due_day=$5, due_date=$6, notes=$7, updated_at=NOW()
         WHERE id=$8 RETURNING *`,
        [name, category, value || null, recurrence || 'monthly', due_day || null, due_date || null, notes || null, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update bill' });
    }
  });

  // DELETE /api/fin/bills/:id — soft delete
  app.delete('/api/fin/bills/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query(`UPDATE fin_bills SET is_active=false, updated_at=NOW() WHERE id=$1`, [id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete bill' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PARCELAS DO MÊS (fin_bill_entries)
  // ─────────────────────────────────────────────────────────────────────────

  // GET /api/fin/bills/entries?month=YYYY-MM — lista parcelas; auto-gera se não existir
  app.get('/api/fin/bills/entries', async (req, res) => {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    try {
      // Auto-provisionar: para cada conta recorrente ativa do tipo monthly, garante entrada no mês
      const monthlyBills = await pool.query(`SELECT * FROM fin_bills WHERE is_active=true AND recurrence='monthly'`);
      for (const bill of monthlyBills.rows) {
        const dueDay = bill.due_day || 10;
        const dueDate = `${month}-${String(dueDay).padStart(2, '0')}`;
        await pool.query(
          `INSERT INTO fin_bill_entries (bill_id, reference_month, due_date, expected_value, status)
           VALUES ($1, $2, $3, $4, 'pending')
           ON CONFLICT (bill_id, reference_month) DO NOTHING`,
          [bill.id, month, dueDate, bill.value]
        );
      }

      // Auto-provisionar contas únicas (once) que vencem neste mês
      const onceBills = await pool.query(
        `SELECT * FROM fin_bills WHERE is_active=true AND recurrence='once' AND TO_CHAR(due_date, 'YYYY-MM') = $1`,
        [month]
      );
      for (const bill of onceBills.rows) {
        const dueDateStr = bill.due_date instanceof Date
          ? bill.due_date.toISOString().slice(0, 10)
          : String(bill.due_date).slice(0, 10);
        await pool.query(
          `INSERT INTO fin_bill_entries (bill_id, reference_month, due_date, expected_value, status)
           VALUES ($1, $2, $3, $4, 'pending')
           ON CONFLICT (bill_id, reference_month) DO NOTHING`,
          [bill.id, month, dueDateStr, bill.value]
        );
      }

      // Auto-provisionar contas anuais (yearly) que vencem neste mês (independente do ano)
      const targetMonthPart = month.split('-')[1]; // e.g. '07'
      const yearlyBills = await pool.query(
        `SELECT * FROM fin_bills WHERE is_active=true AND recurrence='yearly' AND TO_CHAR(due_date, 'MM') = $1`,
        [targetMonthPart]
      );
      for (const bill of yearlyBills.rows) {
        const dueDayStr = bill.due_date instanceof Date
          ? String(bill.due_date.getDate()).padStart(2, '0')
          : String(bill.due_date).split('-')[2].slice(0, 2);
        const dueDate = `${month}-${dueDayStr}`;
        await pool.query(
          `INSERT INTO fin_bill_entries (bill_id, reference_month, due_date, expected_value, status)
           VALUES ($1, $2, $3, $4, 'pending')
           ON CONFLICT (bill_id, reference_month) DO NOTHING`,
          [bill.id, month, dueDate, bill.value]
        );
      }

      // Busca todas as entradas do mês com dados da conta + vínculo extrato
      const entries = await pool.query(
        `SELECT e.*, b.name as bill_name, b.category, b.recurrence,
                m.description as linked_description,
                m.transaction_date as linked_date,
                m.value as linked_value
         FROM fin_bill_entries e
         JOIN fin_bills b ON b.id = e.bill_id
         LEFT JOIN fin_movements_asaas m ON m.id = e.linked_movement_id
         WHERE e.reference_month = $1
         ORDER BY e.due_date ASC, b.name ASC`,
        [month]
      );

      // Summary
      const rows = entries.rows;
      const total_previsto = rows.reduce((s: number, r: any) => s + parseFloat(r.expected_value || '0'), 0);
      const total_pago = rows.filter((r: any) => r.status === 'paid').reduce((s: number, r: any) => s + parseFloat(r.actual_value || r.expected_value || '0'), 0);
      const total_pendente = rows.filter((r: any) => r.status !== 'paid' && r.status !== 'cancelled').reduce((s: number, r: any) => s + parseFloat(r.expected_value || '0'), 0);

      const today = new Date().toISOString().slice(0, 10);
      const vence_7_dias = rows.filter((r: any) => {
        if (r.status === 'paid') return false;
        const diff = Math.ceil((new Date(r.due_date + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000);
        return diff >= 0 && diff <= 7;
      }).length;

      res.json({ entries: rows, summary: { total_previsto, total_pago, total_pendente, vence_7_dias, total: rows.length } });
    } catch (err) {
      console.error('[fin/bills/entries] GET error:', err);
      res.status(500).json({ error: 'Failed to fetch entries' });
    }
  });

  // POST /api/fin/bills/reconcile — força reconciliação manual
  app.post('/api/fin/bills/reconcile', async (req, res) => {
    try {
      const { reconcileBills } = require('./asaas-sync');
      const result = await reconcileBills(pool);
      res.json({ ok: true, matched: result.matched });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reconcile' });
    }
  });

  // GET /api/fin/bills/entries/:id/candidates — busca candidatos do extrato para vínculo manual
  app.get('/api/fin/bills/entries/:id/candidates', async (req, res) => {
    const { id } = req.params;
    try {
      const entry = await pool.query(
        `SELECT e.*, b.name FROM fin_bill_entries e JOIN fin_bills b ON b.id = e.bill_id WHERE e.id = $1`, [id]
      );
      if (!entry.rows.length) return res.status(404).json({ error: 'Entry not found' });
      const e = entry.rows[0];
      const val = parseFloat(e.expected_value) || 0;

      // Busca saídas do extrato no mês da entry, sem vínculo, ordenadas por proximidade de valor
      const [year, month] = e.reference_month.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(Number(year), Number(month), 0).toISOString().slice(0, 10);

      const candidates = await pool.query(`
        SELECT id, asaas_id, value, transaction_date, description, transaction_type,
               linked_bill_entry_id
        FROM fin_movements_asaas
        WHERE account = 'asaas'
          AND type = -1
          AND transaction_date >= $1::date - INTERVAL '15 days'
          AND transaction_date <= $2::date + INTERVAL '15 days'
        ORDER BY ABS(value - $3) ASC, transaction_date ASC
        LIMIT 30
      `, [startDate, endDate, val]);

      res.json({ entry: e, candidates: candidates.rows });
    } catch (err) {
      console.error('[fin/bills/candidates] error:', err);
      res.status(500).json({ error: 'Failed to fetch candidates' });
    }
  });

  // POST /api/fin/bills/entries/:id/link — vincula manualmente uma entry a um movimento do extrato
  app.post('/api/fin/bills/entries/:id/link', async (req, res) => {
    const { id } = req.params;
    const { movement_id } = req.body;
    try {
      if (!movement_id) return res.status(400).json({ error: 'movement_id required' });

      const movement = await pool.query(
        `SELECT id, value, transaction_date, description FROM fin_movements_asaas WHERE id = $1`, [movement_id]
      );
      if (!movement.rows.length) return res.status(404).json({ error: 'Movement not found' });
      const m = movement.rows[0];

      // Desvincula o movimento de outra entry se já estava vinculado
      if (m.linked_bill_entry_id) {
        await pool.query(
          `UPDATE fin_bill_entries SET linked_movement_id = NULL, status = 'pending', actual_value = NULL, paid_at = NULL WHERE id = $1`,
          [m.linked_bill_entry_id]
        );
      }

      // Vincula
      await pool.query(`
        UPDATE fin_bill_entries
        SET status = 'paid', actual_value = $1, paid_at = $2::date, linked_movement_id = $3, updated_at = NOW()
        WHERE id = $4
      `, [m.value, m.transaction_date, m.id, id]);

      await pool.query(`
        UPDATE fin_movements_asaas SET linked_bill_entry_id = $1 WHERE id = $2
      `, [id, m.id]);

      res.json({ ok: true, linked: { movement_id: m.id, value: m.value, description: m.description } });
    } catch (err) {
      console.error('[fin/bills/link] error:', err);
      res.status(500).json({ error: 'Failed to link' });
    }
  });

  // POST /api/fin/bills/entries/:id/unlink — desvincula manualmente
  app.post('/api/fin/bills/entries/:id/unlink', async (req, res) => {
    const { id } = req.params;
    try {
      const entry = await pool.query(`SELECT linked_movement_id FROM fin_bill_entries WHERE id = $1`, [id]);
      if (!entry.rows.length) return res.status(404).json({ error: 'Entry not found' });
      const movId = entry.rows[0].linked_movement_id;

      await pool.query(`
        UPDATE fin_bill_entries SET status = 'pending', actual_value = NULL, paid_at = NULL, linked_movement_id = NULL, updated_at = NOW()
        WHERE id = $1
      `, [id]);

      if (movId) {
        await pool.query(`UPDATE fin_movements_asaas SET linked_bill_entry_id = NULL WHERE id = $1`, [movId]);
      }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to unlink' });
    }
  });

  // PATCH /api/fin/bills/entries/:id — atualiza status/valor de uma parcela
  app.patch('/api/fin/bills/entries/:id', async (req, res) => {
    const { id } = req.params;
    const { status, actual_value, paid_at, notes } = req.body;
    try {
      const result = await pool.query(
        `UPDATE fin_bill_entries
         SET status=COALESCE($1, status),
             actual_value=COALESCE($2, actual_value),
             paid_at=COALESCE($3, paid_at),
             notes=COALESCE($4, notes),
             updated_at=NOW()
         WHERE id=$5 RETURNING *`,
        [status, actual_value, paid_at, notes, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update entry' });
    }
  });

  // DELETE /api/fin/bills/entries/:id — cancela (exclui) uma parcela do mês
  app.delete('/api/fin/bills/entries/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query(
        `UPDATE fin_bill_entries SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [id]
      );
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete entry' });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SICREDI — lançamentos com categorização automática
  // ─────────────────────────────────────────────────────────────────────────

  // GET /api/fin/bills/sicredi?month=YYYY-MM — lançamentos do cartão Sicredi
  app.get('/api/fin/bills/sicredi', async (req, res) => {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    try {
      const result = await pool.query(
        `SELECT id, asaas_id, description, custom_description, value, transaction_date,
                type, grapehub_category, custom_category, user_comment, sicredi_status, billing_month
         FROM fin_movements_asaas
         WHERE account = 'sicredi' AND billing_month = $1
         ORDER BY transaction_date ASC`,
        [month]
      );

      const rows = result.rows;
      // Auto-categoriza itens sem categoria
      const toUpdate: { id: number; cat: string }[] = [];
      for (const row of rows) {
        if (!row.grapehub_category && !row.custom_category) {
          const cat = autoCategory(row.description || '');
          if (cat) toUpdate.push({ id: row.id, cat });
        }
      }
      if (toUpdate.length > 0) {
        for (const u of toUpdate) {
          await pool.query(`UPDATE fin_movements_asaas SET grapehub_category=$1 WHERE id=$2`, [u.cat, u.id]);
        }
        // Atualiza no array local
        for (const row of rows) {
          const upd = toUpdate.find(u => u.id === row.id);
          if (upd) row.grapehub_category = upd.cat;
        }
      }

      const total = rows.filter((r: any) => r.type === -1).reduce((s: number, r: any) => s + parseFloat(r.value || '0'), 0);
      const categorized = rows.filter((r: any) => r.grapehub_category || r.custom_category).length;

      res.json({ items: rows, summary: { total, total_items: rows.length, categorized } });
    } catch (err) {
      console.error('[fin/bills/sicredi] GET error:', err);
      res.status(500).json({ error: 'Failed to fetch sicredi items' });
    }
  });

  // PATCH /api/fin/bills/sicredi/:id — edita descrição e categoria de um lançamento
  app.patch('/api/fin/bills/sicredi/:id', async (req, res) => {
    const { id } = req.params;
    const { custom_description, custom_category, user_comment } = req.body;
    try {
      const result = await pool.query(
        `UPDATE fin_movements_asaas
         SET custom_description=COALESCE($1, custom_description),
             custom_category=COALESCE($2, custom_category),
             user_comment=COALESCE($3, user_comment),
             edited_at=NOW()
         WHERE id=$4 AND account='sicredi' RETURNING *`,
        [custom_description, custom_category, user_comment, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update sicredi item' });
    }
  });
}
