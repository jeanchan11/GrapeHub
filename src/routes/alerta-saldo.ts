// ── Popup de saldo baixo para o gestor da página de Projetos ──────────────────
//
// Quem recebe: o responsável pela página (`menu_pages.manager_id`, template
// 'projects'), identificado pelo e-mail do token — nunca pelo corpo da requisição.
// Vê só os projetos da(s) página(s) que ele gere.
//
// O que é "saldo baixo": conta Meta PRÉ-PAGA com
//   • saldo para menos de `dias` dias, pelo gasto médio dos últimos 7 dias
//     (`marketing.meta_insights`), OU
//   • saldo abaixo de `minimo` reais.
// Só o valor fixo não basta: em 06/10/2026, Douglas Silva tinha R$ 389,94 e gastava
// R$ 168/dia (2,3 dias) — passaria batido com o corte em R$ 100.
//
// A regra é POR PÁGINA (`projetos_alerta_saldo`), editada na engrenagem do topo da
// página de Projetos: cada gestor decide quantos dias e quantos reais antes quer ser
// avisado, ou desliga. Página sem linha usa o padrão (3 dias / R$ 100). Sem seed:
// a linha só nasce quando alguém salva.
//
// O saldo vem de `fetchMetaAccountInfo` (cache de 20 min em `meta_account_cache`),
// o mesmo que a coluna Pagamento usa: o número do popup e o da tabela são o mesmo.
import type { Express } from 'express';
import type { Pool } from 'pg';

const PADRAO = { ativo: true, dias: 3, minimo: 100 };

type Regra = { ativo: boolean; dias: number; minimo: number };
type FetchInfo = (projectId: string, force?: boolean) => Promise<any | null>;

export function setupAlertaSaldoRoutes(app: Express, pool: Pool, fetchMetaAccountInfo: FetchInfo) {
  pool.query(`
    CREATE TABLE IF NOT EXISTS projetos_alerta_saldo (
      page_id    TEXT PRIMARY KEY,
      ativo      BOOLEAN NOT NULL DEFAULT true,
      dias       NUMERIC NOT NULL DEFAULT 3,
      minimo     NUMERIC NOT NULL DEFAULT 100,
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`).catch(e => console.error('[alerta-saldo] migração:', e.message));

  const regraDa = async (pageIds: string[]): Promise<Map<string, Regra>> => {
    const rows = (await pool.query(
      `SELECT page_id, ativo, dias, minimo FROM projetos_alerta_saldo WHERE page_id = ANY($1)`, [pageIds])).rows;
    const m = new Map<string, Regra>();
    for (const id of pageIds) m.set(id, { ...PADRAO });
    for (const r of rows) m.set(r.page_id, { ativo: r.ativo, dias: Number(r.dias), minimo: Number(r.minimo) });
    return m;
  };

  // Contas com saldo baixo nas páginas dadas, cada uma pela sua regra
  async function contasBaixas(paginas: { id: string; label: string }[], regras: Map<string, Regra>) {
    const ativas = paginas.filter(p => regras.get(p.id)?.ativo);
    if (ativas.length === 0) return [];
    const projetos = (await pool.query(
      `SELECT p.id, p.partner, p.page_id, regexp_replace(pt.account_id, '^act_', '') AS conta
         FROM projects p
         JOIN project_tokens pt ON pt.project_id = p.id AND pt.platform = 'meta_ads'
                               AND pt.token_encrypted IS NOT NULL AND pt.account_id IS NOT NULL
        WHERE p.page_id = ANY($1)`, [ativas.map(p => p.id)])).rows;
    if (projetos.length === 0) return [];

    // Gasto médio diário dos últimos 7 dias completos, por conta
    const gastos = new Map<string, number>((await pool.query(
      `SELECT regexp_replace(account_id, '^act_', '') AS conta, SUM(spend) / 7.0 AS por_dia
         FROM marketing.meta_insights
        WHERE date >= current_date - 7 AND date < current_date
          AND regexp_replace(account_id, '^act_', '') = ANY($1)
        GROUP BY 1`, [projetos.map(p => p.conta)])).rows.map(r => [r.conta, Number(r.por_dia) || 0]));

    const rotulo = new Map(paginas.map(p => [p.id, p.label]));
    const infos = await Promise.all(projetos.map(p => fetchMetaAccountInfo(p.id).catch(() => null)));

    return projetos.flatMap((p, i) => {
      const info = infos[i];
      if (!info || info.error || !info.prepaid || info.saldo == null) return [];
      const regra = regras.get(p.page_id)!;
      const saldo = Number(info.saldo);
      const porDia = gastos.get(p.conta) || 0;
      const dias = porDia > 0 ? saldo / porDia : null;
      const baixo = saldo < regra.minimo || (dias != null && dias < regra.dias);
      if (!baixo) return [];
      return [{
        project_id: p.id,
        partner: String(p.partner || '').trim(),
        page_id: p.page_id,
        page_label: rotulo.get(p.page_id) || '',
        saldo,
        gasto_dia: Math.round(porDia * 100) / 100,
        dias: dias == null ? null : Math.round(dias * 10) / 10,
        conferido_em: info.checkedAt || null,
      }];
    }).sort((a, b) => a.saldo - b.saldo);
  }

  // Popup: contas baixas das páginas que o usuário logado gere
  app.get('/api/alertas/saldo-baixo', async (req: any, res) => {
    try {
      const email = String(req.user?.email || '').toLowerCase();
      if (!email) return res.json({ itens: [] });
      const paginas = (await pool.query(
        `SELECT mp.id, mp.label FROM menu_pages mp
           JOIN users u ON u.id::text = mp.manager_id
          WHERE mp.template = 'projects' AND lower(u.email) = $1`, [email])).rows;
      if (paginas.length === 0) return res.json({ itens: [], gestor: false });
      const regras = await regraDa(paginas.map(p => p.id));
      const itens = await contasBaixas(paginas, regras);
      // Regra mostrada no texto do popup: a da página, quando ele gere uma só
      const unica = paginas.length === 1 ? regras.get(paginas[0].id) : null;
      res.json({ itens, gestor: true, regra: unica ? { dias: unica.dias, minimo: unica.minimo } : null });
    } catch (e: any) {
      console.error('GET /api/alertas/saldo-baixo:', e.message);
      res.status(500).json({ error: 'Falha ao conferir saldos' });
    }
  });

  // Configuração da página (engrenagem do topo de Projetos)
  app.get('/api/projetos/:pageId/alerta-saldo', async (req: any, res) => {
    try {
      const pageId = String(req.params.pageId);
      const r = (await pool.query(
        `SELECT ativo, dias, minimo, updated_by, updated_at FROM projetos_alerta_saldo WHERE page_id=$1`, [pageId])).rows[0];
      res.json(r ? { ...r, dias: Number(r.dias), minimo: Number(r.minimo), padrao: false } : { ...PADRAO, padrao: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Falha ao ler a configuração' });
    }
  });

  // Quem pode mudar: o gestor da página ou superadmin
  const podeEditar = async (email: string, pageId: string) => {
    const r = (await pool.query(
      `SELECT u.role, (mp.manager_id = u.id::text) AS gestor
         FROM users u LEFT JOIN menu_pages mp ON mp.id = $2
        WHERE lower(u.email) = $1`, [email, pageId])).rows[0];
    return !!r && (r.role === 'superadmin' || r.gestor === true);
  };

  const validar = (b: any): Regra | string => {
    const dias = Number(b?.dias), minimo = Number(b?.minimo);
    if (!Number.isFinite(dias) || dias < 0 || dias > 60) return 'Dias precisa estar entre 0 e 60.';
    if (!Number.isFinite(minimo) || minimo < 0 || minimo > 100000) return 'Valor mínimo precisa estar entre R$ 0 e R$ 100.000.';
    return { ativo: b?.ativo !== false, dias, minimo };
  };

  app.put('/api/projetos/:pageId/alerta-saldo', async (req: any, res) => {
    try {
      const pageId = String(req.params.pageId);
      const email = String(req.user?.email || '').toLowerCase();
      if (!(await podeEditar(email, pageId))) {
        return res.status(403).json({ error: 'Só o responsável pela página ou um superadmin muda o alerta.' });
      }
      const v = validar(req.body);
      if (typeof v === 'string') return res.status(400).json({ error: v });
      const r = (await pool.query(
        `INSERT INTO projetos_alerta_saldo (page_id, ativo, dias, minimo, updated_by, updated_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (page_id) DO UPDATE SET ativo=EXCLUDED.ativo, dias=EXCLUDED.dias, minimo=EXCLUDED.minimo,
           updated_by=EXCLUDED.updated_by, updated_at=NOW()
         RETURNING ativo, dias, minimo, updated_by, updated_at`,
        [pageId, v.ativo, v.dias, v.minimo, email])).rows[0];
      res.json({ ...r, dias: Number(r.dias), minimo: Number(r.minimo), padrao: false });
    } catch (e: any) {
      console.error('PUT alerta-saldo:', e.message);
      res.status(500).json({ error: 'Falha ao salvar' });
    }
  });

  // Prévia: quais contas desta página entrariam no alerta com a regra em edição
  app.get('/api/projetos/:pageId/alerta-saldo/previa', async (req: any, res) => {
    try {
      const pageId = String(req.params.pageId);
      const v = validar({ ativo: true, dias: req.query.dias, minimo: req.query.minimo });
      if (typeof v === 'string') return res.status(400).json({ error: v });
      const pg = (await pool.query(`SELECT id, label FROM menu_pages WHERE id=$1`, [pageId])).rows;
      const itens = pg.length ? await contasBaixas(pg, new Map([[pageId, v]])) : [];
      res.json({ itens });
    } catch (e: any) {
      res.status(500).json({ error: 'Falha na prévia' });
    }
  });
}
