// ── Fatura de cartão: conferência do PDF e importação reversível ─────────────
//
// 1) CONFERÊNCIA. A leitura do PDF é feita por IA; uma linha perdida passaria em
//    silêncio e a fatura entraria no DFC menor do que é. A extração já devolve o
//    total impresso — antes de gravar, a soma dos itens precisa bater com ele.
//    Se não bater, a importação NÃO grava e devolve 409 com a diferença; a pessoa
//    decide importar mesmo assim (reenvio com `forcar_conferencia`). O reenvio usa
//    a extração guardada em memória por 30 min — não paga uma segunda leitura.
//
// 2) VERSÕES. Importar faz *prune*: apaga do mês/cartão tudo o que não está no
//    arquivo novo, e move de mês o que já existia em outro. Antes de escrever,
//    guardamos uma FOTO das linhas afetadas (as do mês + as do arquivo em
//    qualquer mês) e a data de pagamento da fatura. "Desfazer" devolve o banco a
//    essa foto. Só a importação mais recente de cada cartão/mês pode ser
//    desfeita — desfazer uma do meio atropelaria a de cima.
//
//    A restauração é por UPSERT pelo id, não DELETE + INSERT: 50 linhas de
//    `fin_recurring_bill_entries` apontam para lançamentos (FK sem cascade), e
//    apagar-e-recriar quebraria esse vínculo.
import type { Express } from 'express';
import type { Pool, PoolClient } from 'pg';
import crypto from 'crypto';
import { syncSicrediBillEntry, CARD_ACCOUNTS } from './bills';
import { mesFechado, msgMesFechado } from './fechamento';
import type { FaturaPDF } from './fatura-pdf';

export const TOLERANCIA_CONFERENCIA = 0.05; // R$ — arredondamento de centavos

// ── Cache da extração (para o "importar mesmo assim" não reler o PDF) ─────────
const cacheExtracao = new Map<string, { fatura: FaturaPDF; em: number }>();
const VALIDADE_CACHE = 30 * 60 * 1000;

export function hashArquivo(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}
export function extracaoGuardada(hash: string): FaturaPDF | null {
  const c = cacheExtracao.get(hash);
  if (!c || Date.now() - c.em > VALIDADE_CACHE) { cacheExtracao.delete(hash); return null; }
  return c.fatura;
}
export function guardarExtracao(hash: string, fatura: FaturaPDF) {
  for (const [k, v] of cacheExtracao) if (Date.now() - v.em > VALIDADE_CACHE) cacheExtracao.delete(k);
  cacheExtracao.set(hash, { fatura, em: Date.now() });
}

export interface Conferencia {
  status: 'ok' | 'divergente' | 'sem_total' | 'nao_aplica';
  soma: number | null;
  total_impresso: number | null;
  diferenca: number | null;
  itens: number;
}

/** Soma dos itens (despesa +, crédito −) contra o total impresso na fatura. */
export function conferirFatura(f: FaturaPDF): Conferencia {
  const soma = Math.round(f.items.reduce((s, i) => s + i.amount, 0) * 100) / 100;
  if (f.total === null || !Number.isFinite(f.total)) {
    return { status: 'sem_total', soma, total_impresso: null, diferenca: null, itens: f.items.length };
  }
  const diferenca = Math.round((f.total - soma) * 100) / 100;
  return {
    status: Math.abs(diferenca) <= TOLERANCIA_CONFERENCIA ? 'ok' : 'divergente',
    soma, total_impresso: f.total, diferenca, itens: f.items.length,
  };
}

// ── Tabela de versões ─────────────────────────────────────────────────────────
export async function migrateFaturaVersoes(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fin_card_imports (
      id SERIAL PRIMARY KEY,
      account TEXT NOT NULL,
      billing_month TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by TEXT,
      file_name TEXT,
      formato TEXT,
      itens INT,
      inserted INT, skipped INT, pruned INT, moved INT,
      soma NUMERIC, total_impresso NUMERIC,
      conferencia TEXT,
      asaas_ids TEXT[] NOT NULL DEFAULT '{}',
      snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
      invoice_snapshot JSONB,
      undone_at TIMESTAMPTZ,
      undone_by TEXT
    )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_fin_card_imports_conta_mes ON fin_card_imports (account, billing_month, id DESC)`);
}

/** Foto do que a importação vai tocar. Chamar ANTES de qualquer escrita. */
export async function fotografar(pool: Pool, account: string, month: string, asaasIds: string[]) {
  const linhas = await pool.query(
    `SELECT COALESCE(jsonb_agg(to_jsonb(m)), '[]'::jsonb) AS snap
       FROM fin_movements_asaas m
      WHERE m.account = $1 AND (m.billing_month = $2 OR m.asaas_id = ANY($3))`,
    [account, month, asaasIds],
  );
  const fatura = await pool.query(
    `SELECT to_jsonb(i) AS inv FROM fin_sicredi_invoice i WHERE billing_month = $1 AND account = $2`,
    [month, account],
  ).catch(() => ({ rows: [] as any[] }));
  return { snapshot: linhas.rows[0].snap, invoice: fatura.rows[0]?.inv || null };
}

export async function registrarImportacao(pool: Pool, d: {
  account: string; month: string; by: string | null; fileName: string; formato: string;
  itens: number; inserted: number; skipped: number; pruned: number; moved: number;
  conferencia: Conferencia | null; asaasIds: string[]; snapshot: any; invoice: any;
}): Promise<number | null> {
  const r = await pool.query(
    `INSERT INTO fin_card_imports (account, billing_month, created_by, file_name, formato, itens, inserted, skipped, pruned, moved,
                                   soma, total_impresso, conferencia, asaas_ids, snapshot, invoice_snapshot)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
    [d.account, d.month, d.by, d.fileName, d.formato, d.itens, d.inserted, d.skipped, d.pruned, d.moved,
     d.conferencia?.soma ?? null, d.conferencia?.total_impresso ?? null, d.conferencia?.status ?? 'nao_aplica',
     d.asaasIds, JSON.stringify(d.snapshot), d.invoice ? JSON.stringify(d.invoice) : null],
  );
  return r.rows[0]?.id ?? null;
}

async function colunasMovimentos(c: PoolClient): Promise<string[]> {
  const r = await c.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'fin_movements_asaas' AND column_name <> 'id'`);
  return r.rows.map((x: any) => x.column_name);
}

export function setupFaturaVersoesRoutes(app: Express, pool: Pool) {
  migrateFaturaVersoes(pool).catch(e => console.error('[fatura-versoes] migrate:', e.message));

  // Histórico de importações de um cartão/mês (sem a foto, que é pesada).
  app.get('/api/fin/cartao/importacoes', async (req: any, res) => {
    const account = String(req.query.account || '');
    const month = String(req.query.month || '');
    if (!(CARD_ACCOUNTS as readonly string[]).includes(account) || !/^[0-9]{4}-[0-9]{2}$/.test(month)) {
      return res.status(400).json({ error: 'account/month inválidos' });
    }
    try {
      const r = await pool.query(
        `SELECT i.id, i.created_at, i.created_by, i.file_name, i.formato, i.itens, i.inserted, i.skipped, i.pruned, i.moved,
                i.soma, i.total_impresso, i.conferencia, i.undone_at, i.undone_by,
                -- lançamentos editados à mão DEPOIS desta importação: o desfazer os perderia
                (SELECT COUNT(*)::int FROM fin_movements_asaas m
                  WHERE m.account = i.account AND (m.billing_month = i.billing_month OR m.asaas_id = ANY(i.asaas_ids))
                    AND m.edited_at > i.created_at) AS edicoes_depois
           FROM fin_card_imports i
          WHERE i.account = $1 AND i.billing_month = $2
          ORDER BY i.id DESC LIMIT 10`,
        [account, month],
      );
      const ultimaAtiva = r.rows.find((x: any) => !x.undone_at)?.id ?? null;
      res.json({ importacoes: r.rows.map((x: any) => ({ ...x, pode_desfazer: x.id === ultimaAtiva })) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Desfaz uma importação: devolve as linhas e a data de pagamento à foto.
  app.post('/api/fin/cartao/importacoes/:id/desfazer', async (req: any, res) => {
    const id = Number(req.params.id);
    const quem = req.user?.email || null;
    const c = await pool.connect();
    try {
      const imp = (await c.query(`SELECT * FROM fin_card_imports WHERE id = $1`, [id])).rows[0];
      if (!imp) return res.status(404).json({ error: 'Importação não encontrada.' });
      if (imp.undone_at) return res.status(409).json({ error: 'Esta importação já foi desfeita.' });
      if (await mesFechado(pool, imp.billing_month)) return res.status(423).json({ error: msgMesFechado(imp.billing_month) });
      const maisNova = (await c.query(
        `SELECT id FROM fin_card_imports WHERE account = $1 AND billing_month = $2 AND undone_at IS NULL ORDER BY id DESC LIMIT 1`,
        [imp.account, imp.billing_month])).rows[0];
      if (maisNova && maisNova.id !== id) {
        return res.status(409).json({ error: 'Desfaça primeiro a importação mais recente deste mês.' });
      }

      await c.query('BEGIN');
      const cols = await colunasMovimentos(c);
      const alvo = `m.account = $1 AND (m.billing_month = $2 OR m.asaas_id = ANY($3))`;

      // Linhas que a importação CRIOU (não estão na foto) saem. Se alguma já foi
      // ligada a uma conta recorrente, a FK barra — melhor parar do que quebrar.
      const novas = await c.query(
        `SELECT m.id FROM fin_movements_asaas m
          WHERE ${alvo} AND m.id NOT IN (SELECT (e->>'id')::int FROM jsonb_array_elements($4::jsonb) e)`,
        [imp.account, imp.billing_month, imp.asaas_ids, JSON.stringify(imp.snapshot)]);
      const idsNovas = novas.rows.map((x: any) => x.id);
      if (idsNovas.length) {
        const ref = await c.query(`SELECT COUNT(*)::int n FROM fin_recurring_bill_entries WHERE movement_asaas_id = ANY($1)`, [idsNovas]);
        if (ref.rows[0].n > 0) {
          await c.query('ROLLBACK');
          return res.status(409).json({ error: `${ref.rows[0].n} lançamento(s) desta importação já estão vinculados a contas recorrentes. Desvincule antes de desfazer.` });
        }
        await c.query(`DELETE FROM fin_movements_asaas WHERE id = ANY($1)`, [idsNovas]);
      }

      // Linhas da foto voltam ao estado anterior (as apagadas pelo prune são recriadas com o mesmo id).
      const lista = cols.map(k => `"${k}"`).join(', ');
      const sets = cols.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
      const up = await c.query(
        `INSERT INTO fin_movements_asaas (id, ${lista})
         SELECT id, ${lista} FROM jsonb_populate_recordset(NULL::fin_movements_asaas, $1::jsonb)
         ON CONFLICT (id) DO UPDATE SET ${sets}`,
        [JSON.stringify(imp.snapshot)]);

      // Data de pagamento da fatura como era antes.
      if (imp.invoice_snapshot) {
        await c.query(
          `UPDATE fin_sicredi_invoice SET payment_date = ($3::jsonb->>'payment_date')::date, updated_at = NOW()
            WHERE billing_month = $1 AND account = $2`,
          [imp.billing_month, imp.account, JSON.stringify(imp.invoice_snapshot)]);
      } else {
        await c.query(`DELETE FROM fin_sicredi_invoice WHERE billing_month = $1 AND account = $2`, [imp.billing_month, imp.account]);
      }

      await c.query(`UPDATE fin_card_imports SET undone_at = NOW(), undone_by = $2 WHERE id = $1`, [id, quem]);
      await c.query('COMMIT');

      // Provisão no Contas a Pagar acompanha o total restaurado.
      await syncSicrediBillEntry(pool, imp.billing_month, imp.account).catch(() => {});
      res.json({ ok: true, removidas: idsNovas.length, restauradas: up.rowCount || 0 });
    } catch (e: any) {
      await c.query('ROLLBACK').catch(() => {});
      console.error('[fatura-versoes] desfazer:', e.message);
      res.status(500).json({ error: 'Falha ao desfazer: ' + e.message });
    } finally {
      c.release();
    }
  });
}
