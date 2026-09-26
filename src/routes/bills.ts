import { Express } from 'express';
import { Pool } from 'pg';
import { herdarCategoriaNoLancamento, herdarCategoriaDaConta } from './bill-category';
import { foraDeMesFechado, mesFechadoDoLancamento, msgMesFechado } from './fechamento';

// ── Categorias fixas padrão ──────────────────────────────────────────────────
export const DEFAULT_CATEGORIES = [
  'Salários', 'Aluguel', 'Software', 'Marketing', 'Impostos',
  'Serviços', 'Fornecedores', 'Utilidades', 'Equipamentos', 'Outros',
];

// ── Contas de cartão de crédito ─────────────────────────────────────────────
// Fatura fechada: os lançamentos pertencem ao mês em que a fatura é PAGA
// (billing_month), não à data da compra. Vale para todo cartão importado.
export const CARD_ACCOUNTS = ['sicredi', 'asaas_cartao'] as const;
export type CardAccount = typeof CARD_ACCOUNTS[number];

export const CARD_META: Record<string, { label: string; billName: string; dueDay: number }> = {
  sicredi:      { label: 'Sicredi', billName: 'Cartão Sicredi', dueDay: 18 },
  asaas_cartao: { label: 'Asaas',   billName: 'Cartão Asaas',   dueDay: 10 },
};

export function normalizeCardAccount(v: any): string {
  const a = String(v || '').trim().toLowerCase();
  return (CARD_ACCOUNTS as readonly string[]).includes(a) ? a : 'sicredi';
}

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

// Lança/move a fatura do cartão Sicredi no Contas a Pagar (fin_bill_entries) usando a
// DATA DE PAGAMENTO definida para aquela competência. Sem data de pagamento, não lança.
// A parcela é identificada pela nota "Competência MM/AAAA" para poder ser movida/atualizada.
export async function syncSicrediBillEntry(pool: Pool, billingMonth: string, account: string = 'sicredi'): Promise<void> {
  if (!billingMonth) return;
  const acc = normalizeCardAccount(account);
  const meta = CARD_META[acc];
  try {
    let billRes = await pool.query(`SELECT id FROM fin_bills WHERE LOWER(name) = LOWER($1) LIMIT 1`, [meta.billName]);
    let billId: number;
    if (billRes.rows.length === 0) {
      const nb = await pool.query(`INSERT INTO fin_bills (name, category, value, recurrence, due_day, is_active) VALUES ($1,'Cartão de Crédito',NULL,'monthly',$2,false) RETURNING id`, [meta.billName, meta.dueDay]);
      billId = nb.rows[0].id;
    } else billId = billRes.rows[0].id;

    const [bY, bM] = billingMonth.split('-').map(Number);
    const noteTag = `Competência ${String(bM).padStart(2, '0')}/${bY}`;

    // Remove a parcela anterior desta fatura (em qualquer mês), exceto se já paga/cancelada
    await pool.query(`DELETE FROM fin_bill_entries WHERE bill_id=$1 AND notes=$2 AND status NOT IN ('paid','cancelled')`, [billId, noteTag]);

    const pd = await pool.query(`SELECT payment_date FROM fin_sicredi_invoice WHERE billing_month=$1 AND account=$2`, [billingMonth, acc]);
    const payDate = pd.rows[0]?.payment_date;
    if (!payDate) return; // sem data de pagamento -> ainda não lança

    const payIso = new Date(payDate).toISOString().slice(0, 10);
    const refMonth = payIso.slice(0, 7);
    const totalRes = await pool.query(`SELECT COALESCE(SUM(value::numeric),0) AS total FROM fin_movements_asaas WHERE account=$2 AND billing_month=$1 AND type=-1`, [billingMonth, acc]);
    const total = parseFloat(totalRes.rows[0].total) || 0;

    await pool.query(
      `INSERT INTO fin_bill_entries (bill_id, reference_month, due_date, expected_value, status, notes)
       VALUES ($1,$2,$3,$4,'pending',$5)
       ON CONFLICT (bill_id, reference_month)
       DO UPDATE SET due_date=EXCLUDED.due_date, expected_value=EXCLUDED.expected_value, notes=EXCLUDED.notes
       WHERE fin_bill_entries.status NOT IN ('paid','cancelled')`,
      [billId, refMonth, payIso, total, noteTag]
    );
  } catch (e: any) {
    console.warn(`[${acc}] syncSicrediBillEntry:`, e.message);
  }
}

// ── Motor de categorização: mapeia movimentos (Asaas + cartão) ao plano de contas (fin_categories) ──
// Conservador: só categoriza padrões de alta confiança; o resto fica "sem categoria" pra revisão manual.
// Toca apenas movimentos sem categoria ou auto-categorizados (preserva o que foi classificado à mão).
const DRE_RULES: { re: RegExp; s: string }[] = [
  { re: /cobranca recebida/, s: '01.01.01' },
  { re: /taxa.*pix/, s: '02.07.04' }, { re: /taxa.*boleto/, s: '02.07.03' }, { re: /taxa.*cart/, s: '02.07.05' },
  { re: /baixa da antecip/, s: '02.07.07' }, { re: /taxa de antecip/, s: '02.07.06' },
  { re: /tarifa|taxa.*notificac|taxa.*mensageria|taxa.*whatsapp/, s: '02.07.08' },
  // IOF só aparece no cartão, cobrado sobre compra internacional — que aqui é
  // sempre ferramenta (Atlassian, Hostinger, Gather…). Decisão do Jean em 25/09/2026.
  { re: /\biof\b/, s: '02.02.100' },
  { re: /simples nacional/, s: '02.01.01' }, { re: /\bdarf\b|\birpj\b|\bcsll\b/, s: '02.01.05' }, { re: /\biss\b/, s: '02.01.06' },
  { re: /\binss\b/, s: '02.03.99' }, { re: /\bfgts\b/, s: '02.03.07' },
  { re: /seguro/, s: '02.06.14' }, { re: /aluguel|condominio|iptu/, s: '02.06.05' },
  { re: /energia|cpfl|enel|\bagua\b|sabesp/, s: '02.06.06' }, { re: /internet|telefone|\btim\b|\bvivo\b|\bclaro\b/, s: '02.06.07' },
  { re: /contabil|contador/, s: '02.06.03' }, { re: /marvee|assessoria financeira/, s: '02.06.01' }, { re: /honorario|advogad|juridic/, s: '02.06.04' },
  { re: /facebk|facebook|meta ads|instagram ads/, s: '02.05.08' },
  // Google Cloud é API de IA (Gemini etc.), não ferramenta — e tem de vir ANTES
  // da regra genérica de "google", que casaria primeiro. Decisão de 25/09/2026.
  { re: /openai|anthropic|elevenlabs|\bclaude\b|google\s*cloud/, s: '02.02.10' },
  { re: /hostinger|neon|atlassian|clickup|1password|capcut|canva|myhubi|uazapi|pichau|apple\.com|google|gsuite|workspace|dominio|\bvps\b/, s: '02.02.06' },
  { re: /wellhub|gympass/, s: '02.03.09' },
];

export async function categorizeMovements(pool: Pool, opts: { month?: string } = {}): Promise<{ categorized: number; transfers: number; uncategorized: number }> {
  const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const cats = (await pool.query("SELECT id, structure, description FROM fin_categories")).rows;
  const structId: Record<string, number> = {}; const structDesc: Record<string, string> = {};
  for (const c of cats) { structId[c.structure] = c.id; structDesc[c.structure] = c.description; }

  // Nó de transferência (excluído da DRE — não é receita/despesa)
  let transferId: number | undefined = structId['99'];
  if (!transferId) {
    await pool.query("INSERT INTO fin_categories (external_id, structure, description, level) VALUES (999999,'99','Transferências entre Contas / Pagamento de Cartão',1) ON CONFLICT DO NOTHING");
    transferId = (await pool.query("SELECT id FROM fin_categories WHERE structure='99'")).rows[0]?.id;
  }

  const colab = (await pool.query("SELECT DISTINCT name FROM collaborators")).rows.map((r: any) => r.name).filter(Boolean);
  const employees = colab.map((n: string) => { const t = norm(n).split(/\s+/).filter(Boolean); return { first: t[0], second: (t[1] || '').slice(0, 3) }; });

  // Tipo da transação no Asaas manda ANTES do texto. O texto carrega o nome do
  // cliente, e os clientes são escritórios de advocacia: "…Advogados Associados"
  // casava com a regra de honorários e jogava ANTECIPAÇÃO DE FATURA (receita) na
  // despesa 02.06.04. Medido em 25/09/2026: 10 antecipações (R$ 13.229,60) e 7
  // taxas de nota fiscal nessa conta. O tipo não depende de quem é o cliente.
  const POR_TIPO: Record<string, string> = {
    RECEIVABLE_ANTICIPATION_GROSS_CREDIT: '01.01.01', // antecipação de fatura = receita recorrente
    INVOICE_FEE: '02.07.100',                          // taxa de emissão de nota fiscal
  };

  const classify = (desc: string, tipoAsaas?: string): string | null => {
    if (tipoAsaas && POR_TIPO[tipoAsaas]) return POR_TIPO[tipoAsaas];
    const d = norm(desc);
    if (/pix.*para|transferencia/.test(d)) {
      if (d.includes('grape midia')) return '_T';
      if (d.includes('jean') && d.includes('chan')) return '05.01';
      for (const e of employees) if (e.first && d.includes(e.first) && (e.second === '' || d.includes(e.second))) return '02.03.03';
    }
    for (const r of DRE_RULES) if (r.re.test(d)) return r.s;
    return null;
  };

  const where = opts.month ? `AND ((account='asaas' AND to_char(transaction_date,'YYYY-MM')=$1) OR (account = ANY('{${CARD_ACCOUNTS.join(',')}}') AND billing_month=$1))` : '';
  const params: any[] = opts.month ? [opts.month] : [];
  const mv = (await pool.query(
    `SELECT id, transaction_type, type, COALESCE(NULLIF(custom_description,''),description) AS desc FROM fin_movements_asaas
     WHERE is_anticipation_pair = false AND is_reversed_pair = false AND (custom_category_id IS NULL OR edited_by IN ('regra-auto','motor-auto')) ${where}
       AND ${foraDeMesFechado()}`, params
  )).rows;

  let categorized = 0, transfers = 0, uncategorized = 0;
  // Trava de natureza: nenhuma regra de palavra-chave pode pôr dinheiro que
  // ENTROU numa conta de despesa (02, 04, 05), nem dinheiro que SAIU numa de
  // receita (01, 03). Se o texto sugerir isso, o lançamento fica sem categoria e
  // vai para a conciliação manual — errar para "revisar" é melhor que errar
  // calado dentro do DRE.
  const naturezaBate = (estrutura: string, direcao: number) => {
    const g = estrutura.slice(0, 2);
    if (['02', '04', '05'].includes(g)) return direcao === -1;
    if (['01', '03'].includes(g)) return direcao === 1;
    return true;   // 99 (transferência) vale para os dois lados
  };

  for (const m of mv) {
    let s = classify(m.desc, m.transaction_type);
    if (s && s !== '_T' && !naturezaBate(s, Number(m.type))) s = null;
    if (s === '_T') {
      if (transferId) { await pool.query("UPDATE fin_movements_asaas SET custom_category_id=$1, custom_category='Transferência', grapehub_category='Transferência', edited_by='motor-auto' WHERE id=$2", [transferId, m.id]); transfers++; }
      continue;
    }
    if (!s || !structId[s]) { uncategorized++; continue; }
    await pool.query("UPDATE fin_movements_asaas SET custom_category_id=$1, custom_category=$2, grapehub_category=$2, edited_by='motor-auto' WHERE id=$3", [structId[s], structDesc[s] || s, m.id]);
    categorized++;
  }
  return { categorized, transfers, uncategorized };
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
    const { name, category, category_id, value, recurrence, due_day, due_date, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    try {
      const result = await pool.query(
        `INSERT INTO fin_bills (name, category, category_id, value, recurrence, due_day, due_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [name, category || 'Outros', category_id || null, value || null, recurrence || 'monthly', due_day || null, due_date || null, notes || null]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create bill' });
    }
  });

  // PUT /api/fin/bills/:id — edita conta recorrente
  app.put('/api/fin/bills/:id', async (req, res) => {
    const { id } = req.params;
    const { name, category, category_id, value, recurrence, due_day, due_date, notes } = req.body;
    try {
      const antes = await pool.query(`SELECT category_id FROM fin_bills WHERE id=$1`, [id]);
      const result = await pool.query(
        `UPDATE fin_bills SET name=$1, category=$2, value=$3, recurrence=$4, due_day=$5, due_date=$6, notes=$7,
                category_id = CASE WHEN $9::boolean THEN $10::int ELSE category_id END,
                updated_at=NOW()
         WHERE id=$8 RETURNING *`,
        // `category_id` só muda se veio no corpo: uma tela antiga que não conhece
        // o campo não pode zerar o mapeamento que outra pessoa configurou.
        [name, category, value || null, recurrence || 'monthly', due_day || null, due_date || null, notes || null, id,
         category_id !== undefined, category_id || null]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

      // Categoria do DRE definida ou trocada: os pagamentos já conciliados desta
      // conta herdam agora. É o que torna o cadastro retroativo.
      let herdados = 0;
      const novo = result.rows[0].category_id;
      if (novo && novo !== antes.rows[0]?.category_id) {
        herdados = await herdarCategoriaDaConta(pool, Number(id));
      }

      // Propaga a mudança para as parcelas do mês CORRENTE em diante — só as que estão
      // pendentes e NÃO foram editadas à mão (manual_override=false). Nome/categoria já
      // seguem o template via COALESCE; aqui atualizamos valor e vencimento (que são copiados
      // pra parcela na geração). O passado e as pagas ficam intactos.
      const currentMonth = new Date().toISOString().slice(0, 7);
      const affected = await pool.query(
        `SELECT id, reference_month FROM fin_bill_entries
         WHERE bill_id=$1 AND COALESCE(manual_override,false)=false
           AND status NOT IN ('paid','cancelled') AND reference_month >= $2`,
        [id, currentMonth]
      );
      for (const e of affected.rows) {
        // Recalcula o vencimento mensal a partir do dia (com clamp p/ meses curtos)
        let newDue: string | null = null;
        const [yy, mm] = e.reference_month.split('-').map(Number);
        if ((recurrence || 'monthly') === 'monthly' || recurrence === 'weekly') {
          const lastDay = new Date(yy, mm, 0).getDate();
          const day = Math.min(due_day || 10, lastDay);
          newDue = `${e.reference_month}-${String(day).padStart(2, '0')}`;
        }
        await pool.query(
          `UPDATE fin_bill_entries
           SET expected_value=$1, due_date=COALESCE($2::date, due_date), updated_at=NOW()
           WHERE id=$3`,
          [value || null, newDue, e.id]
        );
      }

      res.json({ ...result.rows[0], propagated: affected.rows.length, categoria_herdada: herdados });
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
        `SELECT e.*,
                COALESCE(NULLIF(e.custom_name,''), b.name) as bill_name,
                COALESCE(NULLIF(e.custom_category,''), b.category) as category,
                b.recurrence,
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

      // O lançamento herda a categoria do DRE da conta (se ela tiver uma e se
      // ninguém tiver categorizado o lançamento à mão).
      const herdou = await herdarCategoriaNoLancamento(pool, m.id);

      res.json({ ok: true, herdou_categoria: herdou, linked: { movement_id: m.id, value: m.value, description: m.description } });
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

  // PATCH /api/fin/bills/entries/:id — edita a parcela do mês (apenas esta instância).
  // Aceita status/valor pago (fluxo "pagar") e também edição da conta lançada:
  // expected_value, due_date, custom_name, custom_category — sem tocar a conta cadastrada (fin_bills).
  app.patch('/api/fin/bills/entries/:id', async (req, res) => {
    const { id } = req.params;
    const { status, actual_value, paid_at, notes, expected_value, due_date, custom_name, custom_category, manual_override } = req.body;
    try {
      const result = await pool.query(
        `UPDATE fin_bill_entries
         SET status=COALESCE($1, status),
             actual_value=COALESCE($2, actual_value),
             paid_at=COALESCE($3, paid_at),
             notes=COALESCE($4, notes),
             expected_value=COALESCE($5, expected_value),
             due_date=COALESCE($6, due_date),
             custom_name=COALESCE($7, custom_name),
             custom_category=COALESCE($8, custom_category),
             manual_override=COALESCE($9, manual_override),
             updated_at=NOW()
         WHERE id=$10 RETURNING *`,
        [status, actual_value, paid_at, notes, expected_value, due_date, custom_name, custom_category, manual_override, id]
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
    const account = normalizeCardAccount(req.query.account);
    try {
      const result = await pool.query(
        `SELECT id, asaas_id, description, custom_description, value, transaction_date,
                type, grapehub_category, custom_category, custom_category_id, user_comment, sicredi_status, billing_month
         FROM fin_movements_asaas
         WHERE account = $2 AND billing_month = $1
         ORDER BY transaction_date ASC`,
        [month, account]
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

      // Data de pagamento da fatura (uma por mês de competência)
      let paymentDate: string | null = null;
      try {
        const pd = await pool.query(`SELECT payment_date FROM fin_sicredi_invoice WHERE billing_month = $1 AND account = $2`, [month, account]);
        if (pd.rows.length > 0 && pd.rows[0].payment_date) {
          paymentDate = new Date(pd.rows[0].payment_date).toISOString().slice(0, 10);
        }
      } catch { /* tabela pode não existir ainda */ }

      // Meses que já têm fatura importada — usado para orientar quando o mês
      // selecionado está vazio (a fatura entra no mês do VENCIMENTO, que pode
      // ser diferente do mês que o usuário está olhando).
      const avail = await pool.query(
        `SELECT billing_month, COUNT(*)::int AS itens
           FROM fin_movements_asaas
          WHERE account = $1 AND billing_month IS NOT NULL
          GROUP BY billing_month
          ORDER BY billing_month DESC
          LIMIT 12`, [account]
      ).catch(() => ({ rows: [] as any[] }));

      res.json({
        items: rows,
        summary: { total, total_items: rows.length, categorized, payment_date: paymentDate },
        available_months: avail.rows,
        account,
      });
    } catch (err) {
      console.error('[fin/bills/sicredi] GET error:', err);
      res.status(500).json({ error: 'Failed to fetch sicredi items' });
    }
  });

  // PUT /api/fin/bills/sicredi/payment-date — define a data de pagamento da fatura do mês
  app.put('/api/fin/bills/sicredi/payment-date', async (req, res) => {
    try {
      const { month, payment_date } = req.body;
      if (!month) return res.status(400).json({ error: 'month obrigatório' });
      const account = normalizeCardAccount(req.body.account ?? req.query.account);
      await pool.query(
        `INSERT INTO fin_sicredi_invoice (billing_month, account, payment_date, updated_at)
         VALUES ($1, $3, $2, NOW())
         ON CONFLICT (billing_month, account) DO UPDATE SET payment_date = EXCLUDED.payment_date, updated_at = NOW()`,
        [month, payment_date || null, account]
      );
      // Lança/move a fatura no Contas a Pagar para o mês da data de pagamento
      await syncSicrediBillEntry(pool, month, account);
      res.json({ ok: true });
    } catch (err) {
      console.error('[fin/bills/sicredi] payment-date error:', err);
      res.status(500).json({ error: 'Failed to save payment date' });
    }
  });

  // PATCH /api/fin/bills/sicredi/:id — edita descrição e categoria de um lançamento
  app.patch('/api/fin/bills/sicredi/:id', async (req, res) => {
    const { id } = req.params;
    const { custom_description, custom_category, custom_category_id, user_comment } = req.body;
    try {
      // Mês fechado: categoria/valor travados (o gatilho do banco também barra,
      // mas em silêncio — aqui a pessoa recebe o motivo).
      if (custom_category_id !== undefined || custom_category !== undefined) {
        const fechado = await mesFechadoDoLancamento(pool, id);
        if (fechado) return res.status(423).json({ error: msgMesFechado(fechado), mes_fechado: fechado });
      }
      // A categoria do DRE é o ID (`custom_category_id`) — é por ele que o DRE
      // agrupa. Antes este endpoint gravava só o TEXTO: a categoria aparecia na
      // tela e ficava fora do DRE (12 lançamentos de cartão, R$ 2.463,15, até
      // 25/09/2026). O nome vem do plano de contas, não do corpo da requisição.
      let catId: number | null | undefined = undefined;   // undefined = não mexe
      let catNome: string | null = null;
      if (custom_category_id !== undefined) {
        catId = custom_category_id ? Number(custom_category_id) : null;
      } else if (custom_category) {
        // Cliente antigo mandando só o nome: resolve pelo nome exato, se existir.
        const r = await pool.query(`SELECT id FROM fin_categories WHERE description = $1 LIMIT 1`, [custom_category]);
        catId = r.rows[0]?.id ?? undefined;
      }
      if (catId) {
        const c = await pool.query(`SELECT description FROM fin_categories WHERE id = $1`, [catId]);
        if (!c.rows[0]) return res.status(400).json({ error: 'Categoria não encontrada no plano de contas.' });
        catNome = c.rows[0].description;
      }
      const email = (req as any).user?.email || null;

      const result = await pool.query(
        `UPDATE fin_movements_asaas
         SET custom_description=COALESCE($1, custom_description),
             user_comment=COALESCE($3, user_comment),
             custom_category    = CASE WHEN $5::boolean THEN $6::text ELSE COALESCE($2, custom_category) END,
             grapehub_category  = CASE WHEN $5::boolean THEN $6::text ELSE grapehub_category END,
             custom_category_id = CASE WHEN $5::boolean THEN $7::int  ELSE custom_category_id END,
             -- Escolha de uma pessoa: os motores automáticos não reprocessam mais.
             edited_by = CASE WHEN $5::boolean THEN COALESCE($8, 'edicao-manual') ELSE edited_by END,
             edited_at=NOW()
         WHERE id=$4 AND account = ANY('{${CARD_ACCOUNTS.join(',')}}') RETURNING *`,
        [custom_description, custom_category, user_comment, id,
         catId !== undefined, catNome, catId ?? null, email]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update sicredi item' });
    }
  });
}
