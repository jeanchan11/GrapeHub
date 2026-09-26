// ── Fechamento do mês com trava ──────────────────────────────────────────────
//
// Por quê: todo erro de número achado em 25–26/09/2026 foi achado a olho —
// R$ 13.229,60 de receita em Honorários, R$ 28.644,72 de transferência como
// despesa, a curva do caixa deslocada, 30 lançamentos com categoria só em texto.
// Fechar um mês = rodar as conferências abaixo, travar o mês e congelar os totais.
//
// COMPETÊNCIA de um lançamento (a mesma do DFC): conta Asaas pela data da
// transação; cartões pelo mês da fatura (`billing_month`).
//
// A TRAVA é um gatilho no banco (`fin_trava_mes_fechado`), não só checagem nas
// rotas: são 25 pontos que escrevem em `fin_movements_asaas`, espalhados em 7
// arquivos, e um esquecido furaria o fechamento. O gatilho NÃO dá erro — ele
// desfaz em silêncio a mudança das colunas que mexem no número (categoria, valor,
// tipo, data, mês da fatura, conta, pares) e registra a tentativa em
// `fin_month_lock_log`. Motivo: a produção roda código antigo, e a rotina de
// antecipações zera e remarca os pares de TODOS os meses a cada 5 min — com
// erro, ela quebraria no primeiro mês fechado. As rotas de edição conferem o mês
// antes e devolvem 423 com mensagem clara; o gatilho é a rede de segurança.
//
// O que continua livre num mês fechado: descrição, comentário, vínculo com
// conta a pagar, dados de sync (balance, raw_json). E a entrada de lançamento
// NOVO da conta Asaas (o banco é a verdade): a tela mostra quantos entraram
// depois do fechamento. Lançamento novo de CARTÃO num mês fechado é barrado.
import type { Express } from 'express';
import type { Pool } from 'pg';
// Mesmo conjunto de `CARD_ACCOUNTS` (bills.ts). Não importa de lá porque bills.ts
// importa o filtro daqui — evita dependência circular.
const CARD_ACCOUNTS = ['sicredi', 'asaas_cartao'] as const;

/** Competência (YYYY-MM) de um lançamento, em SQL. `a` = alias com ponto ("m."). */
export const competenciaSql = (a = '') =>
  `(CASE WHEN ${a}account = 'asaas' THEN to_char(${a}transaction_date, 'YYYY-MM') ELSE ${a}billing_month END)`;

/** Filtro para rotinas em lote: pula lançamentos de mês fechado. */
export const foraDeMesFechado = (a = '') =>
  `NOT EXISTS (SELECT 1 FROM fin_month_closings fc WHERE fc.status = 'fechado' AND fc.month = ${competenciaSql(a)})`;

export async function mesFechado(pool: Pool, mes: string | null | undefined): Promise<boolean> {
  if (!mes) return false;
  const r = await pool.query(`SELECT 1 FROM fin_month_closings WHERE month = $1 AND status = 'fechado'`, [mes]);
  return r.rows.length > 0;
}

/** Mês fechado de um lançamento, ou null. */
export async function mesFechadoDoLancamento(pool: Pool, id: number | string): Promise<string | null> {
  const r = await pool.query(
    `SELECT fc.month FROM fin_movements_asaas m
       JOIN fin_month_closings fc ON fc.status = 'fechado' AND fc.month = ${competenciaSql('m.')}
      WHERE m.id = $1`, [id]);
  return r.rows[0]?.month || null;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const nomeMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(0, 4)}`;
export const msgMesFechado = (m: string) =>
  `${nomeMes(m).replace(/^./, c => c.toUpperCase())} está fechado. Para alterar, reabra o mês no DFC › Fechamento.`;

// ── Esquema + gatilho ─────────────────────────────────────────────────────────
export async function migrateFechamento(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fin_month_closings (
      month TEXT PRIMARY KEY,
      status TEXT NOT NULL,                 -- 'fechado' | 'reaberto'
      closed_at TIMESTAMPTZ, closed_by TEXT,
      checks JSONB, totais JSONB,
      max_movement_id INT,                  -- para contar o que entrou depois
      reopened_at TIMESTAMPTZ, reopened_by TEXT, reopen_reason TEXT
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fin_month_closing_log (
      id SERIAL PRIMARY KEY, month TEXT NOT NULL, acao TEXT NOT NULL,
      por TEXT, em TIMESTAMPTZ NOT NULL DEFAULT NOW(), motivo TEXT, checks JSONB, totais JSONB
    )`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fin_month_lock_log (
      month TEXT NOT NULL, movement_id INT NOT NULL, operacao TEXT NOT NULL,
      vezes INT NOT NULL DEFAULT 1, primeira TIMESTAMPTZ NOT NULL DEFAULT NOW(), ultima TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (month, movement_id, operacao)
    )`);
  await pool.query(`
    CREATE OR REPLACE FUNCTION fin_trava_mes_fechado() RETURNS trigger LANGUAGE plpgsql AS $f$
    DECLARE
      m_old TEXT; m_new TEXT; mes TEXT;
    BEGIN
      IF TG_OP IN ('UPDATE', 'DELETE') THEN
        m_old := CASE WHEN OLD.account = 'asaas' THEN to_char(OLD.transaction_date, 'YYYY-MM') ELSE OLD.billing_month END;
      END IF;
      IF TG_OP IN ('UPDATE', 'INSERT') THEN
        m_new := CASE WHEN NEW.account = 'asaas' THEN to_char(NEW.transaction_date, 'YYYY-MM') ELSE NEW.billing_month END;
      END IF;
      SELECT month INTO mes FROM fin_month_closings WHERE status = 'fechado' AND month IN (m_old, m_new) LIMIT 1;
      IF mes IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

      IF TG_OP = 'DELETE' THEN
        INSERT INTO fin_month_lock_log (month, movement_id, operacao) VALUES (mes, OLD.id, 'excluir')
          ON CONFLICT (month, movement_id, operacao) DO UPDATE SET vezes = fin_month_lock_log.vezes + 1, ultima = NOW();
        RETURN NULL;
      END IF;

      IF TG_OP = 'INSERT' THEN
        IF NEW.account = 'asaas' THEN RETURN NEW; END IF;   -- banco é a verdade
        RETURN NULL;                                        -- cartão em mês fechado: não entra
      END IF;

      IF (NEW.custom_category_id, NEW.type, NEW.value, NEW.transaction_date, NEW.billing_month,
          NEW.account, NEW.is_anticipation_pair, NEW.is_reversed_pair)
         IS DISTINCT FROM
         (OLD.custom_category_id, OLD.type, OLD.value, OLD.transaction_date, OLD.billing_month,
          OLD.account, OLD.is_anticipation_pair, OLD.is_reversed_pair) THEN
        INSERT INTO fin_month_lock_log (month, movement_id, operacao) VALUES (mes, OLD.id, 'alterar')
          ON CONFLICT (month, movement_id, operacao) DO UPDATE SET vezes = fin_month_lock_log.vezes + 1, ultima = NOW();
        NEW.custom_category_id := OLD.custom_category_id;
        NEW.custom_category := OLD.custom_category;
        NEW.grapehub_category := OLD.grapehub_category;
        NEW.type := OLD.type;
        NEW.value := OLD.value;
        NEW.transaction_date := OLD.transaction_date;
        NEW.billing_month := OLD.billing_month;
        NEW.account := OLD.account;
        NEW.is_anticipation_pair := OLD.is_anticipation_pair;
        NEW.is_reversed_pair := OLD.is_reversed_pair;
        NEW.edited_at := OLD.edited_at;
        NEW.edited_by := OLD.edited_by;
      END IF;
      RETURN NEW;
    END $f$`);
  await pool.query(`DROP TRIGGER IF EXISTS trg_fin_trava_mes_fechado ON fin_movements_asaas`);
  await pool.query(`
    CREATE TRIGGER trg_fin_trava_mes_fechado
      BEFORE INSERT OR UPDATE OR DELETE ON fin_movements_asaas
      FOR EACH ROW EXECUTE FUNCTION fin_trava_mes_fechado()`);
}

// ── Conferências ──────────────────────────────────────────────────────────────
export type StatusCheck = 'ok' | 'bloqueia' | 'atencao' | 'info';
export interface Check { id: string; titulo: string; status: StatusCheck; detalhe: string; itens?: any[] }

const brl = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const DO_MES = (a = '') => `${competenciaSql(a)} = $1`;
const SEM_PARES = (a = '') => `${a}is_anticipation_pair = false AND ${a}is_reversed_pair = false`;

async function saldoDoMes(pool: Pool, mes: string) {
  // Cadeia de saldos da conta Asaas: cada transação traz o saldo DEPOIS dela
  // (`balance`); o de ANTES é balance − valor. O início do mês é o "antes" que
  // não é "depois" de ninguém; o fim, o "depois" que não é "antes" de ninguém.
  const r = await pool.query(`
    WITH t AS (SELECT balance::numeric depois, balance::numeric - type * value::numeric antes, type * value::numeric v
                 FROM fin_movements_asaas
                WHERE account = 'asaas' AND to_char(transaction_date, 'YYYY-MM') = $1 AND balance IS NOT NULL)
    SELECT (SELECT COUNT(*) FROM t)::int n,
           (SELECT COALESCE(SUM(v), 0) FROM t) soma,
           (SELECT array_agg(antes) FROM t WHERE antes NOT IN (SELECT depois FROM t)) inicios,
           (SELECT array_agg(depois) FROM t WHERE depois NOT IN (SELECT antes FROM t)) fins,
           (SELECT COUNT(*)::int FROM fin_movements_asaas
             WHERE account = 'asaas' AND to_char(transaction_date, 'YYYY-MM') = $1 AND balance IS NULL) sem_balance`, [mes]);
  return r.rows[0];
}

export async function conferirMes(pool: Pool, mes: string): Promise<{ checks: Check[]; totais: any }> {
  const checks: Check[] = [];

  // 1. Sem categoria — fica fora do DFC.
  const semCat = await pool.query(`
    SELECT m.id, m.account, m.transaction_date::date AS data, m.type, m.value::numeric AS valor,
           COALESCE(NULLIF(m.custom_description, ''), m.description) AS descricao
      FROM fin_movements_asaas m
     WHERE ${DO_MES('m.')} AND ${SEM_PARES('m.')} AND m.custom_category_id IS NULL
     ORDER BY m.value::numeric DESC`, [mes]);
  const somaSemCat = semCat.rows.reduce((s: number, x: any) => s + Number(x.valor), 0);
  checks.push({
    id: 'sem_categoria', titulo: 'Todo lançamento tem categoria',
    status: semCat.rows.length ? 'bloqueia' : 'ok',
    detalhe: semCat.rows.length
      ? `${semCat.rows.length} lançamento(s) sem categoria, ${brl(somaSemCat)} fora do DFC. Concilie no Extrato.`
      : 'Nenhum lançamento fora do DFC.',
    itens: semCat.rows.slice(0, 30),
  });

  // 2. Pagamento de fatura de cartão na 99 — senão a fatura conta duas vezes.
  const fat = await pool.query(`
    SELECT m.id, m.transaction_date::date AS data, m.value::numeric AS valor, c.structure, c.description AS categoria,
           COALESCE(NULLIF(m.custom_description, ''), m.description) AS descricao
      FROM fin_movements_asaas m LEFT JOIN fin_categories c ON c.id = m.custom_category_id
     WHERE ${DO_MES('m.')} AND ${SEM_PARES('m.')} AND m.account = 'asaas'
       AND m.transaction_type = 'ASAAS_CARD_BILL_PAYMENT' AND COALESCE(c.structure, '') <> '99'`, [mes]);
  checks.push({
    id: 'fatura_na_99', titulo: 'Pagamento de fatura de cartão está na 99',
    status: fat.rows.length ? 'bloqueia' : 'ok',
    detalhe: fat.rows.length
      ? `${fat.rows.length} pagamento(s) de fatura fora da 99 — a despesa já entra item a item pela fatura, e conta duas vezes.`
      : 'Nenhum pagamento de fatura contando como despesa.',
    itens: fat.rows,
  });

  // 3. Saldo do Asaas fecha com os lançamentos gravados.
  const s = await saldoDoMes(pool, mes);
  const unico = s.inicios?.length === 1 && s.fins?.length === 1;
  const dif = unico ? Math.round((Number(s.fins[0]) - Number(s.inicios[0]) - Number(s.soma)) * 100) / 100 : null;
  checks.push({
    id: 'saldo', titulo: 'Saldo do Asaas bate com os lançamentos',
    status: s.n === 0 ? 'info' : !unico ? 'atencao' : Math.abs(dif as number) > 0.01 ? 'bloqueia' : 'ok',
    detalhe: s.n === 0 ? 'Sem movimentação na conta Asaas no mês.'
      : !unico ? `Não foi possível montar a sequência de saldos (${s.inicios?.length || 0} início(s), ${s.fins?.length || 0} fim(ns)) — confira o extrato do banco.`
      : Math.abs(dif as number) > 0.01
        ? `O banco foi de ${brl(s.inicios[0])} a ${brl(s.fins[0])}, mas os lançamentos gravados somam ${brl(s.soma)}: diferença de ${brl(dif as number)}. Falta ou sobra lançamento — sincronize.`
        : `De ${brl(s.inicios[0])} a ${brl(s.fins[0])}, fechando no centavo com ${s.n} lançamentos.`,
  });

  // 4. Faturas dos cartões importadas.
  const cartoes = await pool.query(`
    SELECT a.account,
      (SELECT COUNT(*)::int FROM fin_movements_asaas WHERE account = a.account AND billing_month = $1) AS itens,
      (SELECT COUNT(*)::int FROM fin_movements_asaas WHERE account = a.account
         AND billing_month = to_char(to_date($1 || '-01', 'YYYY-MM-DD') - INTERVAL '1 month', 'YYYY-MM')) AS itens_mes_anterior,
      (SELECT COALESCE(SUM(value::numeric), 0) FROM fin_movements_asaas WHERE account = 'asaas'
         AND to_char(transaction_date, 'YYYY-MM') = $1 AND transaction_type = 'ASAAS_CARD_BILL_PAYMENT' AND a.account = 'asaas_cartao') AS pago_asaas
    FROM unnest($2::text[]) AS a(account)`, [mes, [...CARD_ACCOUNTS]]);
  const faltando: string[] = []; const talvez: string[] = [];
  for (const c of cartoes.rows) {
    const nome = c.account === 'sicredi' ? 'Sicredi' : 'Asaas';
    if (c.itens === 0 && Number(c.pago_asaas) > 0) faltando.push(`Asaas (fatura de ${brl(c.pago_asaas)} paga no mês)`);
    else if (c.itens === 0 && c.itens_mes_anterior > 0) talvez.push(nome);
  }
  checks.push({
    id: 'faturas', titulo: 'Faturas dos cartões importadas',
    status: faltando.length ? 'bloqueia' : talvez.length ? 'atencao' : 'ok',
    detalhe: faltando.length ? `Fatura não importada: ${faltando.join(', ')}. Os gastos do cartão ficam fora do DFC.`
      : talvez.length ? `Nenhum item de ${talvez.join(' e ')} neste mês, embora houvesse no mês anterior. Confira se a fatura foi importada.`
      : cartoes.rows.map((c: any) => `${c.account === 'sicredi' ? 'Sicredi' : 'Asaas'}: ${c.itens} itens`).join(' · '),
  });

  // 5. Conferência do PDF divergente na última importação.
  const div = await pool.query(`
    SELECT DISTINCT ON (account) account, soma, total_impresso, conferencia FROM fin_card_imports
     WHERE billing_month = $1 AND undone_at IS NULL ORDER BY account, id DESC`, [mes]).catch(() => ({ rows: [] as any[] }));
  const divergentes = div.rows.filter((x: any) => x.conferencia === 'divergente');
  checks.push({
    id: 'conferencia_pdf', titulo: 'Faturas em PDF fecharam com o total impresso',
    status: divergentes.length ? 'atencao' : 'ok',
    detalhe: divergentes.length
      ? divergentes.map((x: any) => `${x.account === 'sicredi' ? 'Sicredi' : 'Asaas'}: soma ${brl(x.soma)} ≠ total ${brl(x.total_impresso)}`).join(' · ')
      : 'Nenhuma importação com diferença.',
  });

  // 6. Natureza invertida: dinheiro que entrou em conta de despesa ou saiu de conta de receita.
  const inv = await pool.query(`
    SELECT m.id, m.transaction_date::date AS data, m.type, m.value::numeric AS valor, c.structure, c.description AS categoria,
           COALESCE(NULLIF(m.custom_description, ''), m.description) AS descricao
      FROM fin_movements_asaas m JOIN fin_categories c ON c.id = m.custom_category_id
     WHERE ${DO_MES('m.')} AND ${SEM_PARES('m.')}
       AND ((m.type = 1 AND left(c.structure, 2) IN ('02', '04', '05')) OR (m.type = -1 AND left(c.structure, 2) IN ('01', '03')))
     ORDER BY m.value::numeric DESC`, [mes]);
  checks.push({
    id: 'natureza', titulo: 'Entradas e saídas na natureza certa',
    status: inv.rows.length ? 'atencao' : 'ok',
    detalhe: inv.rows.length
      ? `${inv.rows.length} lançamento(s) com a direção oposta à da categoria. Estorno de despesa é legítimo; o resto é erro de classificação.`
      : 'Nenhuma entrada em conta de despesa nem saída em conta de receita.',
    itens: inv.rows,
  });

  // 7. Contas a pagar do mês que não foram baixadas.
  const cp = await pool.query(`
    SELECT e.id, b.name AS conta, e.due_date::date AS vencimento, e.expected_value::numeric AS valor
      FROM fin_bill_entries e JOIN fin_bills b ON b.id = e.bill_id
     WHERE to_char(e.due_date, 'YYYY-MM') = $1 AND e.status NOT IN ('paid', 'cancelled')
     ORDER BY e.due_date`, [mes]);
  checks.push({
    id: 'contas_a_pagar', titulo: 'Contas a pagar do mês baixadas',
    status: cp.rows.length ? 'atencao' : 'ok',
    detalhe: cp.rows.length
      ? `${cp.rows.length} conta(s) vencida(s) no mês ainda em aberto (${brl(cp.rows.reduce((s: number, x: any) => s + Number(x.valor || 0), 0))}). Se foram pagas, vincule o pagamento.`
      : 'Todas as contas do mês estão pagas ou canceladas.',
    itens: cp.rows,
  });

  // 8. Inadimplência do mês (informativo — não mexe no realizado).
  const inad = await pool.query(`
    SELECT COUNT(*)::int n, COALESCE(SUM(value), 0) v FROM fin_receivables
     WHERE to_char(due_date, 'YYYY-MM') = $1 AND status IN ('Pendente', 'PENDING', 'OVERDUE')
       AND due_date < CURRENT_DATE   -- só o que já venceu
       AND COALESCE((raw_json->>'anticipated')::boolean, false) = false`, [mes]);
  checks.push({
    id: 'inadimplencia', titulo: 'Recebimentos do mês',
    status: 'info',
    detalhe: inad.rows[0].n ? `${inad.rows[0].n} cobrança(s) vencida(s) no mês sem pagamento: ${brl(inad.rows[0].v)}.` : 'Tudo o que venceu no mês foi recebido.',
  });

  // Totais do DFC no mês (congelados no fechamento).
  const tot = await pool.query(`
    SELECT left(c.structure, 2) AS grupo, SUM(m.value::numeric * m.type) AS valor
      FROM fin_movements_asaas m JOIN fin_categories c ON c.id = m.custom_category_id
     WHERE ${DO_MES('m.')} AND ${SEM_PARES('m.')}
     GROUP BY 1 ORDER BY 1`, [mes]);
  const grupos: Record<string, number> = {};
  for (const r of tot.rows) grupos[r.grupo] = Math.round(Number(r.valor) * 100) / 100;
  const geracao = Object.entries(grupos).filter(([g]) => g !== '99').reduce((s, [, v]) => s + v, 0);
  return {
    checks,
    totais: {
      grupos, geracao: Math.round(geracao * 100) / 100,
      saldo_inicial: unico ? Number(s.inicios[0]) : null, saldo_final: unico ? Number(s.fins[0]) : null,
    },
  };
}

// ── Rotas ─────────────────────────────────────────────────────────────────────
async function ehSuperadmin(pool: Pool, email?: string) {
  if (!email) return false;
  const r = await pool.query(`SELECT role FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
  return r.rows[0]?.role === 'superadmin';
}

export function setupFechamentoRoutes(app: Express, pool: Pool) {
  migrateFechamento(pool).catch(e => console.error('[fechamento] migrate:', e.message));

  // Situação dos meses de um ano.
  app.get('/api/financeiro/fechamento', async (req: any, res) => {
    const ano = String(req.query.ano || new Date().getFullYear());
    try {
      const r = await pool.query(`
        SELECT f.*, (SELECT COUNT(*)::int FROM fin_movements_asaas m
                      WHERE f.max_movement_id IS NOT NULL AND m.id > f.max_movement_id AND ${competenciaSql('m.')} = f.month) AS entraram_depois,
                    (SELECT COALESCE(SUM(vezes), 0)::int FROM fin_month_lock_log l WHERE l.month = f.month) AS bloqueios
          FROM fin_month_closings f WHERE f.month LIKE $1 ORDER BY f.month`, [`${ano}-%`]);
      res.json({ ano, meses: r.rows.map((x: any) => ({ ...x, checks: undefined })), pode_fechar: await ehSuperadmin(pool, req.user?.email) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Conferências de um mês (roda na hora; o fechado também mostra o que foi congelado).
  app.get('/api/financeiro/fechamento/:mes', async (req: any, res) => {
    const mes = String(req.params.mes);
    if (!/^[0-9]{4}-[0-9]{2}$/.test(mes)) return res.status(400).json({ error: 'mês inválido' });
    try {
      const atual = await conferirMes(pool, mes);
      const f = (await pool.query(`SELECT * FROM fin_month_closings WHERE month = $1`, [mes])).rows[0] || null;
      const log = await pool.query(`SELECT acao, por, em, motivo FROM fin_month_closing_log WHERE month = $1 ORDER BY id DESC LIMIT 10`, [mes]);
      res.json({ mes, fechamento: f, ...atual, historico: log.rows, pode_fechar: await ehSuperadmin(pool, req.user?.email) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/financeiro/fechamento/:mes/fechar', async (req: any, res) => {
    const mes = String(req.params.mes);
    const quem = req.user?.email || null;
    if (!/^[0-9]{4}-[0-9]{2}$/.test(mes)) return res.status(400).json({ error: 'mês inválido' });
    if (!(await ehSuperadmin(pool, quem))) return res.status(403).json({ error: 'Só o superadmin fecha o mês.' });
    const hoje = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7);
    if (mes >= hoje) return res.status(400).json({ error: 'Só dá para fechar um mês que já terminou.' });
    try {
      if (await mesFechado(pool, mes)) return res.status(409).json({ error: 'Este mês já está fechado.' });
      const { checks, totais } = await conferirMes(pool, mes);
      const bloqueios = checks.filter(c => c.status === 'bloqueia');
      if (bloqueios.length) return res.status(409).json({ error: 'Há conferências que impedem o fechamento.', checks });
      if (checks.some(c => c.status === 'atencao') && req.body?.confirmar_avisos !== true) {
        return res.status(409).json({ error: 'Há avisos: confirme para fechar mesmo assim.', precisa_confirmar: true, checks });
      }
      const maxId = (await pool.query(`SELECT COALESCE(MAX(id), 0)::int m FROM fin_movements_asaas`)).rows[0].m;
      const semItens = checks.map(({ itens, ...c }) => c);   // a foto guarda o veredito, não as listas
      await pool.query(`
        INSERT INTO fin_month_closings (month, status, closed_at, closed_by, checks, totais, max_movement_id, reopened_at, reopened_by, reopen_reason)
        VALUES ($1, 'fechado', NOW(), $2, $3, $4, $5, NULL, NULL, NULL)
        ON CONFLICT (month) DO UPDATE SET status = 'fechado', closed_at = NOW(), closed_by = $2, checks = $3, totais = $4,
          max_movement_id = $5, reopened_at = NULL, reopened_by = NULL, reopen_reason = NULL`,
        [mes, quem, JSON.stringify(semItens), JSON.stringify(totais), maxId]);
      await pool.query(`INSERT INTO fin_month_closing_log (month, acao, por, checks, totais) VALUES ($1, 'fechar', $2, $3, $4)`,
        [mes, quem, JSON.stringify(semItens), JSON.stringify(totais)]);
      res.json({ ok: true, totais });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/financeiro/fechamento/:mes/reabrir', async (req: any, res) => {
    const mes = String(req.params.mes);
    const quem = req.user?.email || null;
    const motivo = String(req.body?.motivo || '').trim();
    if (!(await ehSuperadmin(pool, quem))) return res.status(403).json({ error: 'Só o superadmin reabre o mês.' });
    if (motivo.length < 5) return res.status(400).json({ error: 'Informe o motivo da reabertura.' });
    try {
      const r = await pool.query(`
        UPDATE fin_month_closings SET status = 'reaberto', reopened_at = NOW(), reopened_by = $2, reopen_reason = $3
         WHERE month = $1 AND status = 'fechado' RETURNING totais`, [mes, quem, motivo]);
      if (!r.rows.length) return res.status(409).json({ error: 'Este mês não está fechado.' });
      await pool.query(`INSERT INTO fin_month_closing_log (month, acao, por, motivo, totais) VALUES ($1, 'reabrir', $2, $3, $4)`,
        [mes, quem, motivo, JSON.stringify(r.rows[0].totais)]);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
