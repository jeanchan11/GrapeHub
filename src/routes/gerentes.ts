// Gerentes de IA (18/11/2026) — substitui o Fred (`/api/ai/chat`).
//
// Quatro gerentes, cada um com a sua área e as suas ferramentas de LEITURA no banco:
//   • assistente  — exibido como "CEO": junta todas as áreas e faz o resumo das 7h
//   • financeiro  — caixa, previsão, inadimplência, contas a pagar, meses fechados
//   • comercial   — funil, reuniões, fechamentos, leads parados, tarefas atrasadas
//   • operacional — carteira (resultado dos projetos), evolução, retenção
//
// Nenhum gerente altera dado do sistema. A única escrita é `propor_decisao`, que põe um item
// na fila "Para decidir" (`ia_para_decidir`) — quem aprova ou descarta é gente.
//
// Rotina diária: às 7h (São Paulo) cada gerente gera o relatório do dia (Andou / Travou /
// Espera sua decisão). A vaga do dia é reservada com INSERT … ON CONFLICT antes de chamar o
// Claude, então dev e produção (mesmo banco) não geram duas vezes.
//
// Permissão (decidida só aqui, pelo e-mail do token):
//   assistente e financeiro → superadmin
//   comercial  → superadmin, admin, gerente-comercial, diretor-*
//   operacional → superadmin, admin, diretor-operacional, gerente-operacional
import type { Express } from 'express';
import type { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';
import { sqlReunioesMarcadas } from './crm-reunioes';

const MODELO = 'claude-opus-5-5';
const MAX_VOLTAS = 8;

type Area = 'assistente' | 'financeiro' | 'comercial' | 'operacional' | 'marketing';

// ── Ferramentas ─────────────────────────────────────────────────────────────────

type Ferramenta = {
  def: Anthropic.Tool;
  areas: Area[];
  run: (pool: Pool, input: any, ctx: { gerente: Area; email: string; conversaId?: number | null }) => Promise<unknown>;
};

const n = (v: any) => (v == null ? null : Math.round(Number(v) * 100) / 100);
const hojeSP = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const limitar = (v: any, min: number, max: number, padrao: number) => {
  const x = Number(v);
  return Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : padrao;
};
const dataOk = (s: any) => typeof s === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s);

async function saldoAtual(pool: Pool) {
  const r = (await pool.query(
    `SELECT balance, to_char(transaction_date, 'YYYY-MM-DD') AS dia
       FROM fin_movements_asaas WHERE account = 'asaas' AND balance IS NOT NULL
      ORDER BY transaction_date DESC, id DESC LIMIT 1`)).rows[0];
  return { saldo: n(r?.balance), atualizado_em: r?.dia || null };
}

const FERRAMENTAS: Record<string, Ferramenta> = {
  // ── Financeiro ──
  caixa_atual: {
    areas: ['financeiro', 'assistente'],
    def: {
      name: 'caixa_atual',
      description: 'Saldo atual da conta Asaas (caixa da Grape) e o que entrou e saiu da conta no mês corrente até hoje. Valores em reais.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async (pool) => {
      const s = await saldoAtual(pool);
      const mes = (await pool.query(
        `SELECT COALESCE(SUM(value) FILTER (WHERE type = 1), 0) AS entradas,
                COALESCE(SUM(value) FILTER (WHERE type = -1), 0) AS saidas
           FROM fin_movements_asaas
          WHERE account = 'asaas' AND transaction_date >= date_trunc('month', (NOW() AT TIME ZONE 'America/Sao_Paulo')::date)`)).rows[0];
      return { ...s, mes_corrente: { entradas: n(mes.entradas), saidas: n(mes.saidas) } };
    },
  },

  previsao_caixa: {
    areas: ['financeiro', 'assistente'],
    def: {
      name: 'previsao_caixa',
      description: 'Projeção do caixa dia a dia para os próximos N dias: parte do saldo atual, soma as cobranças a receber (PENDING pelo vencimento; cartão já pago pela data prevista de crédito) e subtrai as contas a pagar lançadas. Não conta inadimplentes como entrada. Mostra o menor saldo do período e o dia.',
      input_schema: {
        type: 'object',
        properties: { dias: { type: 'integer', description: 'Horizonte em dias (padrão 30, máx. 90)' } },
        additionalProperties: false,
      },
    },
    run: async (pool, input) => {
      const dias = limitar(input?.dias, 1, 90, 30);
      const s = await saldoAtual(pool);
      const entra = (await pool.query(
        `SELECT to_char(d, 'YYYY-MM-DD') AS dia, SUM(v) AS total FROM (
           SELECT due_date AS d, value AS v FROM fin_receivables
            WHERE status = 'PENDING' AND due_date >= CURRENT_DATE AND due_date <= CURRENT_DATE + $1::int
           UNION ALL
           SELECT COALESCE(estimated_credit_date, credit_date, due_date + 30), COALESCE(net_value, value) FROM fin_receivables
            WHERE status = 'CONFIRMED'
              AND COALESCE(estimated_credit_date, credit_date, due_date + 30) BETWEEN CURRENT_DATE AND CURRENT_DATE + $1::int
         ) x GROUP BY 1`, [dias])).rows;
      const sai = (await pool.query(
        `SELECT to_char(e.due_date, 'YYYY-MM-DD') AS dia, SUM(e.expected_value) AS total,
                string_agg(b.name || ' ' || round(e.expected_value)::text, '; ' ORDER BY e.expected_value DESC) AS itens
           FROM fin_bill_entries e JOIN fin_bills b ON b.id = e.bill_id
          WHERE e.status NOT IN ('paid', 'cancelled') AND e.due_date >= CURRENT_DATE AND e.due_date <= CURRENT_DATE + $1::int
          GROUP BY 1`, [dias])).rows;
      const atrasadas = (await pool.query(
        `SELECT COUNT(*)::int AS qtd, COALESCE(SUM(expected_value), 0) AS total
           FROM fin_bill_entries WHERE status NOT IN ('paid', 'cancelled') AND due_date < CURRENT_DATE`)).rows[0];

      const mapaE = new Map(entra.map((r: any) => [r.dia, Number(r.total)]));
      const mapaS = new Map(sai.map((r: any) => [r.dia, { total: Number(r.total), itens: r.itens }]));
      let saldo = s.saldo || 0;
      let minimo = { saldo, dia: hojeSP() };
      const linhas: any[] = [];
      const base = new Date(hojeSP() + 'T12:00:00');
      for (let i = 0; i <= dias; i++) {
        const d = new Date(base); d.setDate(d.getDate() + i);
        const dia = d.toISOString().slice(0, 10);
        const e = mapaE.get(dia) || 0;
        const sx = mapaS.get(dia);
        if (!e && !sx) continue;
        saldo += e - (sx?.total || 0);
        if (saldo < minimo.saldo) minimo = { saldo, dia };
        linhas.push({ dia, entra: n(e), sai: n(sx?.total || 0), contas: sx?.itens || undefined, saldo: n(saldo) });
      }
      return {
        saldo_hoje: s.saldo, horizonte_dias: dias, dias_com_movimento: linhas,
        saldo_final: n(saldo), menor_saldo: { valor: n(minimo.saldo), dia: minimo.dia },
        contas_a_pagar_vencidas_em_aberto: { qtd: atrasadas.qtd, total: n(atrasadas.total) },
        observacao: 'Entradas = cobranças em aberto pelo vencimento; inadimplentes ficam de fora. Saídas = só o que está lançado em Contas a Pagar (fatura do cartão entra quando lançada).',
      };
    },
  },

  inadimplentes: {
    areas: ['financeiro', 'assistente'],
    def: {
      name: 'inadimplentes',
      description: 'Clientes com cobrança vencida (OVERDUE): valor em aberto, dias de atraso, status no CRM e o último contato registrado no histórico do cliente (cobrança manual, promessa de pagamento, etc.).',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async (pool) => {
      const rows = (await pool.query(
        `SELECT COALESCE(c.name, fp.name, r.customer_name) AS cliente,
                SUM(r.value) AS em_aberto, COUNT(*)::int AS cobrancas,
                (CURRENT_DATE - MIN(r.due_date))::int AS dias_atraso,
                c.crm_status, c.status AS status_cliente, c.id AS client_id
           FROM fin_receivables r
           LEFT JOIN fin_people fp ON fp.asaas_id = r.customer_id
           LEFT JOIN clients c ON c.fin_people_guid = fp.guid
          WHERE r.status = 'OVERDUE'
          GROUP BY 1, c.crm_status, c.status, c.id
          ORDER BY em_aberto DESC`)).rows;
      const ids = rows.map((r: any) => r.client_id).filter(Boolean);
      const contatos = ids.length ? (await pool.query(
        `SELECT DISTINCT ON (client_id) client_id, type, LEFT(content, 160) AS texto,
                to_char(created_at, 'YYYY-MM-DD') AS dia, meta->>'resultado' AS resultado, meta->>'promessa_data' AS promessa
           FROM crm_comments WHERE client_id = ANY($1)
          ORDER BY client_id, created_at DESC`, [ids])).rows : [];
      const porId = new Map(contatos.map((c: any) => [c.client_id, c]));
      return {
        total_em_aberto: n(rows.reduce((s: number, r: any) => s + Number(r.em_aberto), 0)),
        clientes: rows.map((r: any) => {
          const c: any = porId.get(r.client_id);
          return {
            cliente: r.cliente, em_aberto: n(r.em_aberto), cobrancas: r.cobrancas, dias_atraso: r.dias_atraso,
            status_crm: r.crm_status || null, status_cliente: r.status_cliente || null,
            ultimo_registro: c ? { dia: c.dia, tipo: c.type, resultado: c.resultado || undefined, promessa: c.promessa || undefined, texto: c.texto } : null,
          };
        }),
      };
    },
  },

  contas_a_pagar: {
    areas: ['financeiro', 'assistente'],
    def: {
      name: 'contas_a_pagar',
      description: 'Contas a pagar em aberto: as vencidas e as que vencem nos próximos N dias, com nome, categoria, valor e vencimento.',
      input_schema: {
        type: 'object',
        properties: { dias: { type: 'integer', description: 'Janela à frente em dias (padrão 14, máx. 60)' } },
        additionalProperties: false,
      },
    },
    run: async (pool, input) => {
      const dias = limitar(input?.dias, 1, 60, 14);
      const rows = (await pool.query(
        `SELECT b.name AS conta, b.category AS categoria, e.expected_value AS valor,
                to_char(e.due_date, 'YYYY-MM-DD') AS vencimento, (e.due_date < CURRENT_DATE) AS vencida
           FROM fin_bill_entries e JOIN fin_bills b ON b.id = e.bill_id
          WHERE e.status NOT IN ('paid', 'cancelled') AND e.due_date <= CURRENT_DATE + $1::int
          ORDER BY e.due_date, e.expected_value DESC LIMIT 80`, [dias])).rows;
      return {
        janela_dias: dias,
        observacao: 'Vencidas de meses atrás podem já estar pagas sem baixa no sistema — confirme antes de tratar como dívida.',
        total: n(rows.reduce((s: number, r: any) => s + Number(r.valor), 0)),
        contas: rows.map((r: any) => ({ ...r, valor: n(r.valor) })),
      };
    },
  },

  meses_fechados: {
    areas: ['financeiro', 'assistente'],
    def: {
      name: 'meses_fechados',
      description: 'Totais congelados dos meses fechados no DFC (regime de caixa): receitas (grupo 01), custos/despesas (02, 04, 05), transferências (99), geração de caixa e saldos inicial/final. Use para comparar meses e ver tendência.',
      input_schema: {
        type: 'object',
        properties: { meses: { type: 'integer', description: 'Quantos meses fechados, do mais recente para trás (padrão 6, máx. 12)' } },
        additionalProperties: false,
      },
    },
    run: async (pool, input) => {
      const meses = limitar(input?.meses, 1, 12, 6);
      const rows = (await pool.query(
        `SELECT month AS mes, totais FROM fin_month_closings WHERE status = 'fechado' ORDER BY month DESC LIMIT $1`, [meses])).rows;
      return {
        legenda: { '01': 'receitas', '02': 'custos e despesas operacionais', '04': 'investimentos/retiradas', '05': 'despesas financeiras/impostos', '99': 'transferências entre contas e pagamento de fatura (fora do resultado)' },
        meses: rows,
      };
    },
  },

  // ── Comercial ──
  funil_periodo: {
    areas: ['comercial', 'assistente', 'marketing'],
    def: {
      name: 'funil_periodo',
      description: 'Números do funil comercial num período: leads novos (por origem), reuniões marcadas (mesma regra das Métricas), fechamentos (quantidade e valor de contrato) e leads perdidos.',
      input_schema: {
        type: 'object',
        properties: {
          de: { type: 'string', description: 'Data inicial AAAA-MM-DD (padrão: 1º dia do mês corrente)' },
          ate: { type: 'string', description: 'Data final AAAA-MM-DD, inclusiva (padrão: hoje)' },
        },
        additionalProperties: false,
      },
    },
    run: async (pool, input) => {
      const hoje = hojeSP();
      const de = dataOk(input?.de) ? input.de : hoje.slice(0, 8) + '01';
      const ate = dataOk(input?.ate) ? input.ate : hoje;
      const [leads, reun, fech, perd] = await Promise.all([
        pool.query(
          `SELECT COALESCE(NULLIF(origem, ''), 'sem origem') AS origem, COUNT(*)::int AS qtd
             FROM crm_comercial_leads
            WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN $1 AND $2
            GROUP BY 1 ORDER BY 2 DESC`, [de, ate]),
        pool.query(sqlReunioesMarcadas('$1', '$2'), [de, ate]),
        pool.query(
          `SELECT COUNT(*)::int AS qtd,
                  COALESCE(SUM(NULLIF(replace(regexp_replace("Valor", '[^0-9,]', '', 'g'), ',', '.'), '')::numeric), 0) AS valor
             FROM fechamentos WHERE day BETWEEN $1 AND $2`, [de, ate]).catch(() => ({ rows: [{ qtd: null, valor: null }] })),
        pool.query(
          `SELECT COUNT(*)::int AS qtd FROM crm_comercial_leads
            WHERE is_lost = TRUE AND (updated_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN $1 AND $2`, [de, ate]),
      ]);
      const totalLeads = leads.rows.reduce((s: number, r: any) => s + r.qtd, 0);
      return {
        periodo: { de, ate },
        leads_novos: totalLeads, leads_por_origem: leads.rows,
        reunioes_marcadas: reun.rows[0]?.marcadas ?? 0,
        fechamentos: { qtd: fech.rows[0].qtd, valor_contratos: n(fech.rows[0].valor) },
        perdidos_no_periodo: perd.rows[0].qtd,
        observacao: 'Perdidos usa a data da última atualização do lead (aproximação).',
      };
    },
  },

  leads_parados: {
    areas: ['comercial', 'assistente'],
    def: {
      name: 'leads_parados',
      description: 'Leads em aberto (não perdidos) que não mudam de etapa entre N e M dias, com etapa, responsável, valor e dias parado — a faixa ainda recuperável. Traz também quantos leads abertos estão parados há mais de M dias (provavelmente mortos, sem ninguém marcar como perdido).',
      input_schema: {
        type: 'object',
        properties: {
          dias: { type: 'integer', description: 'Dias mínimos sem mudar de etapa (padrão 3)' },
          max_dias: { type: 'integer', description: 'Dias máximos (padrão 30)' },
        },
        additionalProperties: false,
      },
    },
    run: async (pool, input) => {
      const dias = limitar(input?.dias, 1, 365, 3);
      const max = Math.max(dias, limitar(input?.max_dias, 1, 365, 30));
      const resumo = (await pool.query(
        `SELECT c.title AS etapa,
                COUNT(*) FILTER (WHERE COALESCE(l.etapa_updated_at, l.created_at) >= NOW() - ($2::int * interval '1 day')
                                   AND COALESCE(l.etapa_updated_at, l.created_at) < NOW() - ($1::int * interval '1 day'))::int AS na_faixa,
                COUNT(*) FILTER (WHERE COALESCE(l.etapa_updated_at, l.created_at) < NOW() - ($2::int * interval '1 day'))::int AS mais_antigos
           FROM crm_comercial_leads l JOIN crm_comercial_columns c ON c.id::text = l.coluna::text
          WHERE COALESCE(l.is_lost, FALSE) = FALSE AND LOWER(c.title) NOT SIMILAR TO '%(ganho|fechad|perdid)%'
          GROUP BY 1 ORDER BY 2 DESC`, [dias, max])).rows;
      const rows = (await pool.query(
        `SELECT COALESCE(NULLIF(l.form_nome_fantasia, ''), l.nome) AS lead, c.title AS etapa, u.name AS responsavel,
                l.valor, (CURRENT_DATE - COALESCE(l.etapa_updated_at, l.created_at)::date)::int AS dias_parado
           FROM crm_comercial_leads l
           JOIN crm_comercial_columns c ON c.id::text = l.coluna::text
           LEFT JOIN users u ON u.id::text = l.responsavel_id::text
          WHERE COALESCE(l.is_lost, FALSE) = FALSE
            AND LOWER(c.title) NOT SIMILAR TO '%(ganho|fechad|perdid)%'
            AND COALESCE(l.etapa_updated_at, l.created_at) < NOW() - ($1::int * interval '1 day')
            AND COALESCE(l.etapa_updated_at, l.created_at) >= NOW() - ($2::int * interval '1 day')
          ORDER BY dias_parado DESC LIMIT 60`, [dias, max])).rows;
      return { faixa_dias: [dias, max], por_etapa: resumo, leads: rows.map((r: any) => ({ ...r, valor: n(r.valor) })) };
    },
  },

  tarefas_atrasadas: {
    areas: ['comercial', 'assistente'],
    def: {
      name: 'tarefas_atrasadas',
      description: 'Tarefas do CRM comercial não concluídas com prazo vencido nos últimos N dias, com o lead, o tipo, o responsável e os dias de atraso. Traz também quantas mais antigas seguem abertas (provável lixo de follow-up).',
      input_schema: {
        type: 'object',
        properties: { dias: { type: 'integer', description: 'Janela de atraso em dias (padrão 30)' } },
        additionalProperties: false,
      },
    },
    run: async (pool, input) => {
      const dias = limitar(input?.dias, 1, 365, 30);
      const antigas = (await pool.query(
        `SELECT COUNT(*)::int AS qtd FROM crm_comercial_tasks
          WHERE COALESCE(completed, FALSE) = FALSE AND due_date < NOW() - ($1::int * interval '1 day')`, [dias])).rows[0].qtd;
      const rows = (await pool.query(
        `SELECT t.title AS tarefa, t.type AS tipo, COALESCE(NULLIF(l.form_nome_fantasia, ''), l.nome) AS lead,
                u.name AS responsavel, (CURRENT_DATE - t.due_date::date)::int AS dias_atraso
           FROM crm_comercial_tasks t
           LEFT JOIN crm_comercial_leads l ON l.id = t.lead_id
           LEFT JOIN users u ON u.id::text = t.responsible_id::text
          WHERE COALESCE(t.completed, FALSE) = FALSE AND t.due_date < NOW()
            AND t.due_date >= NOW() - ($1::int * interval '1 day')
          ORDER BY t.due_date LIMIT 60`, [dias])).rows;
      const porResp: Record<string, number> = {};
      for (const r of rows) porResp[r.responsavel || 'sem responsável'] = (porResp[r.responsavel || 'sem responsável'] || 0) + 1;
      return { janela_dias: dias, total: rows.length, por_responsavel: porResp, abertas_mais_antigas: antigas, tarefas: rows };
    },
  },

  fechamentos_recentes: {
    areas: ['comercial', 'assistente'],
    def: {
      name: 'fechamentos_recentes',
      description: 'Últimos contratos fechados: data, cliente, valor, origem (campanha ou indicação), faturamento e cidade declarados.',
      input_schema: {
        type: 'object',
        properties: { limite: { type: 'integer', description: 'Quantos (padrão 15, máx. 50)' } },
        additionalProperties: false,
      },
    },
    run: async (pool, input) => {
      const lim = limitar(input?.limite, 1, 50, 15);
      const rows = (await pool.query(`SELECT to_char(day, 'YYYY-MM-DD') AS dia, * FROM fechamentos ORDER BY day DESC, id DESC LIMIT $1`, [lim])).rows;
      return rows.map((r: any) => {
        const o: any = { dia: r.dia };
        for (const [k, v] of Object.entries(r)) if (!['day', 'dia', 'id'].includes(k) && v != null && v !== '') o[k.toLowerCase()] = v;
        return o;
      });
    },
  },

  // ── Marketing (aquisição da própria Grape) ──
  anuncios_grape: {
    areas: ['marketing', 'assistente'],
    def: {
      name: 'anuncios_grape',
      description: 'Anúncios da própria Grape na Meta (conta Captação) num período, por campanha ou por anúncio/criativo: gasto, impressões, cliques no link, visitas à LP (landing_page_view), leads que a Meta contou, e os leads que de fato entraram no CRM com aquela UTM — com CPL calculado sobre os leads do CRM. Com por_dia=true traz também o gasto e as visitas dia a dia (bom para gráfico).',
      input_schema: {
        type: 'object',
        properties: {
          de: { type: 'string', description: 'AAAA-MM-DD (padrão: 1º dia do mês corrente)' },
          ate: { type: 'string', description: 'AAAA-MM-DD, inclusiva (padrão: hoje)' },
          nivel: { type: 'string', enum: ['campanha', 'anuncio'], description: 'Agrupar por campanha (padrão) ou por anúncio/criativo' },
          por_dia: { type: 'boolean', description: 'Incluir a série diária de gasto e visitas' },
        },
        additionalProperties: false,
      },
    },
    run: async (pool, input) => {
      const token = process.env.META_GRAPE_ACCESS_TOKEN;
      if (!token) return { erro: 'Falta o token da conta de anúncio da Grape (META_GRAPE_ACCESS_TOKEN) no servidor.' };
      const conta = String(process.env.META_GRAPE_ACCOUNT_ID || '690496082457749').replace(/^act_/, '');
      const hoje = hojeSP();
      const de = dataOk(input?.de) ? input.de : hoje.slice(0, 8) + '01';
      const ate = dataOk(input?.ate) ? input.ate : hoje;
      const porAnuncio = input?.nivel === 'anuncio';
      const tr = encodeURIComponent(JSON.stringify({ since: de, until: ate }));
      const base = `https://graph.facebook.com/v21.0/act_${conta}/insights?time_range=${tr}&limit=200&access_token=${encodeURIComponent(token)}`;
      const meta = async (url: string) => {
        const r = await fetch(url);
        const j: any = await r.json().catch(() => ({}));
        if (!r.ok || j.error) throw new Error(j?.error?.message || `Meta HTTP ${r.status}`);
        return j.data || [];
      };
      const acao = (row: any, tipo: string) => Number((row.actions || []).find((a: any) => a.action_type === tipo)?.value || 0);
      // Nome sem emoji/espaço para casar a campanha da Meta com a UTM do CRM ("✖️ [CBO] ESCALA" = "🟣 [CBO] ESCALA")
      const chave = (t: any) => String(t || '').normalize('NFD').replace(/[^A-Za-z0-9\[\]]/g, '').toUpperCase();

      const brutas = await meta(`${base}&level=${porAnuncio ? 'ad' : 'campaign'}&fields=campaign_name,ad_name,spend,impressions,inline_link_clicks,actions`);
      // O mesmo criativo pode rodar em duas campanhas: soma por nome antes de casar com o CRM
      const somadas = new Map<string, any>();
      for (const l of brutas) {
        const nome = porAnuncio ? l.ad_name : l.campaign_name;
        const k = chave(nome);
        const a = somadas.get(k);
        const acts = new Map<string, number>();
        for (const x of [...(a?.actions || []), ...(l.actions || [])]) acts.set(x.action_type, (acts.get(x.action_type) || 0) + Number(x.value || 0));
        somadas.set(k, {
          campaign_name: a ? [...new Set([...String(a.campaign_name).split(' + '), l.campaign_name])].join(' + ') : l.campaign_name,
          ad_name: l.ad_name,
          spend: Number(a?.spend || 0) + Number(l.spend || 0),
          impressions: Number(a?.impressions || 0) + Number(l.impressions || 0),
          inline_link_clicks: Number(a?.inline_link_clicks || 0) + Number(l.inline_link_clicks || 0),
          actions: [...acts].map(([action_type, value]) => ({ action_type, value })),
        });
      }
      const linhas = [...somadas.values()];
      const crm = (await pool.query(
        `SELECT COALESCE(NULLIF(${porAnuncio ? 'utm_creative' : 'utm_campaign'}, ''), '(sem UTM)') AS nome, COUNT(*)::int AS leads,
                COUNT(*) FILTER (WHERE is_lost)::int AS perdidos
           FROM crm_comercial_leads
          WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN $1 AND $2
          GROUP BY 1`, [de, ate])).rows;
      const porChave = new Map<string, any>();
      for (const c of crm) porChave.set(chave(c.nome), c);
      const usados = new Set<string>();
      const itens = linhas.map((l: any) => {
        const nome = porAnuncio ? l.ad_name : l.campaign_name;
        const k = chave(nome);
        const c = porChave.get(k);
        if (c) usados.add(k);
        const gasto = Number(l.spend || 0);
        const leadsCrm = c?.leads || 0;
        return {
          nome, campanha: porAnuncio ? l.campaign_name : undefined,
          gasto: n(gasto), impressoes: Number(l.impressions || 0), cliques_link: Number(l.inline_link_clicks || 0),
          visitas_lp: acao(l, 'landing_page_view'), leads_meta: acao(l, 'lead'),
          leads_crm: leadsCrm, perdidos_crm: c?.perdidos || 0,
          cpl_crm: leadsCrm ? n(gasto / leadsCrm) : null,
        };
      }).sort((a: any, b: any) => b.gasto - a.gasto);
      const semMeta = crm.filter((c: any) => !usados.has(chave(c.nome))).map((c: any) => ({ utm: c.nome, leads: c.leads }));
      const total = itens.reduce((t: any, i: any) => ({ gasto: t.gasto + i.gasto, leads_crm: t.leads_crm + i.leads_crm, visitas_lp: t.visitas_lp + i.visitas_lp }), { gasto: 0, leads_crm: 0, visitas_lp: 0 });
      let diario: any[] | undefined;
      if (input?.por_dia) {
        const d = await meta(`${base}&level=account&time_increment=1&fields=spend,actions`);
        diario = d.map((x: any) => ({ dia: x.date_start, gasto: n(x.spend), visitas_lp: acao(x, 'landing_page_view') }));
      }
      return {
        periodo: { de, ate }, nivel: porAnuncio ? 'anuncio' : 'campanha',
        total: { gasto: n(total.gasto), visitas_lp: total.visitas_lp, leads_crm: total.leads_crm, cpl_crm: total.leads_crm ? n(total.gasto / total.leads_crm) : null },
        itens, leads_crm_sem_anuncio_correspondente: semMeta, diario,
        observacao: 'Leads do CRM são casados pelo nome da UTM (sem emoji). Reunião marcada e fechamento por campanha não são rastreados aqui — use funil_periodo para o total.',
      };
    },
  },

  postagens_instagram: {
    areas: ['marketing', 'assistente'],
    def: {
      name: 'postagens_instagram',
      description: 'Postagens planejadas para os Instagrams da Grape e do Jean (página Postagens IG): título, perfil, formato, etapa e data de publicação.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async (pool) => {
      const r = (await pool.query(
        `SELECT client_name AS titulo, produto AS perfil, entregavel AS formato, status_group AS etapa,
                to_char(due_date, 'YYYY-MM-DD') AS publicar_em
           FROM onboarding_tasks WHERE type = 'lista-postagens'
          ORDER BY due_date NULLS LAST LIMIT 60`)).rows;
      return { total: r.length, postagens: r };
    },
  },

  // ── Operacional ──
  carteira: {
    areas: ['operacional', 'assistente'],
    def: {
      name: 'carteira',
      description: 'Situação atual da carteira de projetos (clientes em gestão de tráfego): quantos em cada resultado (BOM, OK, RUIM, TESTANDO, PAUSADA…), quantos em gargalo e por responsável; lista os projetos com resultado ruim ou em gargalo.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async (pool) => {
      const rows = (await pool.query(
        `SELECT partner AS projeto, project_result AS resultado, status, responsible AS responsavel, squad, investment AS investimento, last_update
           FROM projects`)).rows;
      const porResultado: Record<string, number> = {};
      const porResp: Record<string, Record<string, number>> = {};
      for (const r of rows) {
        const res = r.resultado || 'sem resultado';
        porResultado[res] = (porResultado[res] || 0) + 1;
        const resp = r.responsavel || 'sem responsável';
        porResp[resp] = porResp[resp] || {};
        porResp[resp][res] = (porResp[resp][res] || 0) + 1;
      }
      return {
        total: rows.length, por_resultado: porResultado,
        em_gargalo: rows.filter((r: any) => r.status === 'Gargalo').length,
        por_responsavel: porResp,
        atencao: rows.filter((r: any) => r.resultado === 'RESULTADO RUIM' || r.status === 'Gargalo')
          .map((r: any) => ({ projeto: r.projeto, resultado: r.resultado, status: r.status, responsavel: r.responsavel, squad: r.squad })),
      };
    },
  },

  evolucao_carteira: {
    areas: ['operacional', 'assistente'],
    def: {
      name: 'evolucao_carteira',
      description: 'Evolução da carteira semana a semana (fotos diárias dos resultados): quantos projetos Bom+Ok, Ruim e outros, para ver se está melhorando ou piorando.',
      input_schema: {
        type: 'object',
        properties: { dias: { type: 'integer', description: 'Janela em dias (padrão 60, máx. 180)' } },
        additionalProperties: false,
      },
    },
    run: async (pool, input) => {
      const dias = limitar(input?.dias, 7, 180, 60);
      const rows = (await pool.query(
        `WITH f AS (
           SELECT DISTINCT ON (date_trunc('week', snapshot_date), project_id)
                  to_char(date_trunc('week', snapshot_date), 'YYYY-MM-DD') AS semana, project_result
             FROM project_result_snapshots
            WHERE snapshot_date >= CURRENT_DATE - $1::int
            ORDER BY date_trunc('week', snapshot_date), project_id, snapshot_date DESC)
         SELECT semana,
                COUNT(*) FILTER (WHERE project_result IN ('RESULTADO BOM', 'RESULTADO OK'))::int AS bom_ok,
                COUNT(*) FILTER (WHERE project_result = 'RESULTADO RUIM')::int AS ruim,
                COUNT(*) FILTER (WHERE project_result NOT IN ('RESULTADO BOM', 'RESULTADO OK', 'RESULTADO RUIM') OR project_result IS NULL)::int AS outros
           FROM f GROUP BY semana ORDER BY semana`, [dias])).rows;
      return { semanas: rows };
    },
  },

  retencao: {
    areas: ['operacional', 'assistente', 'financeiro'],
    def: {
      name: 'retencao',
      description: 'Clientes em risco: os marcados com a etiqueta "quarentena" (fora do faturamento previsível), os que estão no quadro de Retenção por etapa, e os que deram aviso prévio, com a data.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async (pool) => {
      const quarentena = (await pool.query(
        `SELECT c.name AS cliente, COALESCE(rc.title, c.crm_status) AS etapa_retencao, c.squad FROM clients c
           LEFT JOIN retencao_columns rc ON rc.id = c.crm_status
          WHERE c.status ILIKE 'ativo%' AND c.tags ILIKE '%quarentena%' ORDER BY c.name`)).rows;
      const etapas = (await pool.query(
        `SELECT COALESCE(rc.title, c.crm_status) AS etapa, COUNT(*)::int AS qtd,
                string_agg(c.name || CASE WHEN c.status ILIKE 'ativo%' THEN '' ELSE ' (inativo)' END, ', ' ORDER BY c.name) AS clientes
           FROM clients c LEFT JOIN retencao_columns rc ON rc.id = c.crm_status
          WHERE COALESCE(c.crm_status, '') <> '' AND c.crm_archived_at IS NULL
          GROUP BY 1, rc.order_index ORDER BY rc.order_index NULLS LAST`)).rows;
      const aviso = (await pool.query(
        `SELECT name AS cliente, aviso_previo_date AS aviso_previo, status FROM clients
          WHERE COALESCE(aviso_previo_date, '') <> '' AND status ILIKE 'ativo%' ORDER BY aviso_previo_date`)).rows;
      const ativos = (await pool.query(`SELECT COUNT(*)::int AS qtd FROM clients WHERE status ILIKE 'ativo%'`)).rows[0].qtd;
      return { clientes_ativos: ativos, quarentena, quadro_retencao: etapas, aviso_previo: aviso };
    },
  },

  // ── Fila "Para decidir" (a única escrita) ──
  propor_decisao: {
    areas: ['assistente', 'financeiro', 'comercial', 'operacional', 'marketing'],
    def: {
      name: 'propor_decisao',
      description: 'Coloca um item na fila "Para decidir" do Jean. Use só para algo que precisa de uma decisão humana (gastar, cortar, cobrar, mudar processo, conversar com alguém) e que você sustentou com números das ferramentas. Não repita item igual já pendente.',
      input_schema: {
        type: 'object',
        properties: {
          titulo: { type: 'string', description: 'A decisão em uma frase curta (ex.: "Antecipar R$ 12 mil de recebíveis antes do dia 20")' },
          contexto: { type: 'string', description: 'Os números que justificam, em 2–4 frases' },
          recomendacao: { type: 'string', description: 'O que você faria e por quê, em 1–2 frases' },
          urgencia: { type: 'string', enum: ['alta', 'media', 'baixa'] },
        },
        required: ['titulo', 'contexto', 'recomendacao', 'urgencia'],
        additionalProperties: false,
      },
    },
    run: async (pool, input, ctx) => {
      const titulo = String(input?.titulo || '').trim().slice(0, 200);
      if (!titulo) return { erro: 'titulo vazio' };
      const igual = (await pool.query(
        `SELECT id FROM ia_para_decidir WHERE status = 'pendente' AND LOWER(titulo) = LOWER($1)`, [titulo])).rows[0];
      if (igual) return { ok: false, motivo: 'Já existe um item pendente com esse título', id: igual.id };
      const urg = ['alta', 'media', 'baixa'].includes(input?.urgencia) ? input.urgencia : 'media';
      const r = await pool.query(
        `INSERT INTO ia_para_decidir (gerente, titulo, contexto, recomendacao, urgencia, criado_por)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [ctx.gerente, titulo, String(input?.contexto || '').slice(0, 2000), String(input?.recomendacao || '').slice(0, 1000), urg, ctx.email || 'rotina']);
      return { ok: true, id: r.rows[0].id };
    },
  },

  // ── Memória (vale para todas as conversas e relatórios do gerente) ──
  lembrar: {
    areas: ['assistente', 'financeiro', 'comercial', 'operacional', 'marketing'],
    def: {
      name: 'lembrar',
      description: 'Guarda uma anotação na sua memória permanente. Ela passa a aparecer em todas as suas próximas conversas e relatórios. Use sempre que a pessoa disser algo que deve valer depois: preferência, correção ao seu trabalho, fato da empresa que não está no sistema, decisão tomada, plano, prazo, contexto de um cliente ou pessoa. Escreva uma frase autossuficiente, com data quando importar. Não anote números que mudam todo dia (saldo, leads de hoje).',
      input_schema: {
        type: 'object',
        properties: {
          texto: { type: 'string', description: 'A anotação, em uma ou duas frases (ex.: "Jean prefere não pegar empréstimo; antes, antecipar recebíveis (18/11/2026).")' },
          tipo: { type: 'string', enum: ['preferencia', 'correcao', 'fato', 'decisao', 'plano'] },
        },
        required: ['texto', 'tipo'],
        additionalProperties: false,
      },
    },
    run: async (pool, input, ctx) => {
      const texto = String(input?.texto || '').trim().slice(0, 600);
      if (!texto) return { erro: 'texto vazio' };
      const igual = (await pool.query(
        `SELECT id FROM ia_gerentes_memoria WHERE ativo AND gerente = $1 AND LOWER(texto) = LOWER($2)`, [ctx.gerente, texto])).rows[0];
      if (igual) return { ok: true, id: igual.id, observacao: 'já estava anotado' };
      const tipo = ['preferencia', 'correcao', 'fato', 'decisao', 'plano'].includes(input?.tipo) ? input.tipo : 'fato';
      const r = await pool.query(
        `INSERT INTO ia_gerentes_memoria (gerente, texto, tipo, origem, conversa_id, criado_por)
         VALUES ($1, $2, $3, 'conversa', $4, $5) RETURNING id`,
        [ctx.gerente, texto, tipo, ctx.conversaId || null, ctx.email || 'rotina']);
      return { ok: true, id: r.rows[0].id };
    },
  },

  esquecer: {
    areas: ['assistente', 'financeiro', 'comercial', 'operacional', 'marketing'],
    def: {
      name: 'esquecer',
      description: 'Desativa uma anotação da sua memória que ficou errada ou desatualizada (o id aparece entre colchetes na lista de memória). Se a informação mudou, esqueça a antiga e lembre a nova.',
      input_schema: {
        type: 'object',
        properties: { id: { type: 'integer' } },
        required: ['id'],
        additionalProperties: false,
      },
    },
    run: async (pool, input, ctx) => {
      const r = await pool.query(
        `UPDATE ia_gerentes_memoria SET ativo = FALSE, desativado_por = $3, desativado_em = NOW()
          WHERE id = $1 AND ativo AND ($2 = 'assistente' OR gerente = $2) RETURNING id`,
        [Number(input?.id) || 0, ctx.gerente, ctx.email || 'rotina']);
      return r.rowCount ? { ok: true } : { ok: false, motivo: 'anotação não encontrada na sua memória' };
    },
  },

  buscar_conversas: {
    areas: ['assistente', 'financeiro', 'comercial', 'operacional', 'marketing'],
    def: {
      name: 'buscar_conversas',
      description: 'Procura nas conversas antigas (todas, de todos os gerentes que a pessoa usa) por um termo — para responder "o que eu falei sobre X?" ou retomar um assunto. Devolve trechos com data e gerente.',
      input_schema: {
        type: 'object',
        properties: {
          termo: { type: 'string', description: 'Palavra ou nome a procurar (ex.: "Erick", "empréstimo")' },
          dias: { type: 'integer', description: 'Só nos últimos N dias (padrão: tudo)' },
        },
        required: ['termo'],
        additionalProperties: false,
      },
    },
    run: async (pool, input, ctx) => {
      const termo = String(input?.termo || '').trim().slice(0, 80);
      if (termo.length < 2) return { erro: 'termo curto demais' };
      const dias = input?.dias ? limitar(input.dias, 1, 3650, 30) : null;
      const r = (await pool.query(
        `SELECT c.gerente, c.titulo, m.papel, m.texto, to_char(m.criado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS quando
           FROM ia_gerentes_mensagens m JOIN ia_gerentes_conversas c ON c.id = m.conversa_id
          WHERE m.texto ILIKE '%' || $1 || '%'
            AND ($2 = '' OR c.email = $2)
            AND ($3::int IS NULL OR m.criado_em > NOW() - ($3::int * interval '1 day'))
          ORDER BY m.criado_em DESC LIMIT 15`, [termo, ctx.email || '', dias])).rows;
      return {
        encontrados: r.length,
        trechos: r.map((x: any) => {
          const t = String(x.texto);
          const i = t.toLowerCase().indexOf(termo.toLowerCase());
          const ini = Math.max(0, i - 220);
          return { quando: x.quando, gerente: x.gerente, conversa: x.titulo, quem: x.papel === 'usuario' ? 'pessoa' : 'gerente',
            trecho: (ini > 0 ? '…' : '') + t.slice(ini, i + 380) + (i + 380 < t.length ? '…' : '') };
        }),
      };
    },
  },

  decisoes_pendentes: {
    areas: ['assistente', 'financeiro', 'comercial', 'operacional', 'marketing'],
    def: {
      name: 'decisoes_pendentes',
      description: 'A fila de decisões e tarefas da página: "pendentes" (esperando o Jean decidir), "em_andamento" (aprovadas — viraram tarefa com responsável e prazo; diz se está atrasada), e as concluídas/descartadas dos últimos 14 dias com a observação de quem decidiu.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    run: async (pool) => {
      const r = (await pool.query(
        `SELECT id, gerente, titulo, urgencia, status, observacao, recomendacao,
                to_char(criado_em, 'YYYY-MM-DD') AS criado, to_char(decidido_em, 'YYYY-MM-DD') AS aprovado_ou_decidido,
                responsavel_nome, to_char(prazo, 'YYYY-MM-DD') AS prazo,
                CASE WHEN status = 'aprovado' AND prazo < CURRENT_DATE THEN (CURRENT_DATE - prazo) END AS dias_atrasado,
                to_char(concluido_em, 'YYYY-MM-DD') AS concluido
           FROM ia_para_decidir
          WHERE status IN ('pendente', 'aprovado')
             OR COALESCE(concluido_em, decidido_em) > NOW() - interval '14 days'
          ORDER BY criado_em DESC LIMIT 60`)).rows;
      const de = (st: string[]) => r.filter((x: any) => st.includes(x.status));
      return { pendentes: de(['pendente']), em_andamento: de(['aprovado']), feitos: de(['feito']), descartados: de(['descartado']) };
    },
  },
};

// ── Gerentes ────────────────────────────────────────────────────────────────────

const BASE = `Você trabalha dentro do GrapeHub, o sistema interno da Grape Mídia — agência de tráfego pago para escritórios de advocacia (previdenciário, bancário, trabalhista). O dono é o Jean. Quem conversa com você é alguém do time, identificado abaixo.

Como trabalhar:
- Responda em português do Brasil. Conclusão primeiro, em 1–2 frases. Depois, no máximo três blocos curtos.
- Número antes de opinião. Todo número vem de uma ferramenta chamada nesta conversa; se a ferramenta não tem o dado, diga que não tem — nunca invente nem estime sem avisar.
- Diga a data e a fonte do número quando importar ("saldo do Asaas em 18/11").
- Dê uma recomendação clara, não uma lista de opções ponderadas.
- Você só lê o sistema. Não prometa que vai alterar, cobrar, mover ou enviar nada. Quando algo precisa de uma decisão humana, use propor_decisao e diga que foi para a fila "Para decidir".
- Valores em reais no formato R$ 12.345,67. Datas em DD/MM.
- Formatação: parágrafos curtos, listas com "- " e **negrito** para o número que importa. Sem tabelas largas.
- Ferramentas se usam chamando de verdade (tool use), nunca escrevendo a chamada no texto. Não inclua tags XML internas na resposta.

Memória: tudo o que a pessoa conversa com você fica salvo. Você tem uma memória permanente (lista abaixo, quando houver) que vale acima das suas suposições.
- Sempre que a pessoa disser algo que deve valer depois — preferência, correção ao seu trabalho, fato que o sistema não mostra, decisão, plano, contexto de cliente ou de alguém do time — chame lembrar na hora, sem pedir licença, e diga numa frase curta que anotou.
- Se uma anotação ficou velha ou errada, chame esquecer com o id e lembre a versão nova.
- Para algo falado em conversa antiga que não está na memória, use buscar_conversas.

Gráficos: a tela desenha gráficos. Quando pedirem um gráfico, ou quando uma série no tempo, uma comparação entre itens ou uma composição ficar mais clara desenhada, inclua um bloco assim (JSON válido, sem comentários):
\`\`\`grafico
{"tipo": "linha", "titulo": "Saldo previsto", "unidade": "R$", "x": ["18/11", "20/11", "22/11"], "series": [{"nome": "Saldo", "valores": [36554.65, 6092.42, 1735.9]}]}
\`\`\`
- "tipo": "linha" (evolução no tempo), "area" (evolução de um total), "barras" (comparar itens ou meses; várias séries ficam lado a lado), "barras_empilhadas" (partes de um total por período), "pizza" (composição; uma série só, até 6 fatias).
- "unidade": "R$", "%" ou "" (quantidade). "x" são os rótulos (datas em DD/MM, meses em "set/26"); cada série tem um valor por rótulo, na mesma ordem. Até 4 séries e 40 pontos.
- Opcional: "referencia": {"valor": 0, "rotulo": "zero"} desenha uma linha horizontal (ex.: limite, meta).
- Cor: cada série aceita "cor" ("vermelho", "verde", "amarelo", "laranja", "azul", "roxo", "cinza", "rosa" ou hex como "#f43f5e"); na pizza, "cores" é uma lista na ordem do "x". Sem cor, a tela pinta pelo nome: Ruim/perdido/atrasado = vermelho, Bom/Ok/ganho = verde, Outros/testando/pausado = cinza. Se a pessoa pediu cores (veja a memória), mande "cor" sempre.
- Só números que vieram das ferramentas. Escreva uma frase antes do gráfico dizendo o que ele mostra. No máximo 2 gráficos por resposta.`;

const RELATORIO = `Faça o relatório de hoje da sua área. Chame as ferramentas que precisar. Formato exato, em markdown:

**Andou** — o que melhorou ou foi concluído desde ontem/na semana (2–4 itens com número)
**Travou** — o que está parado, piorando ou em risco (2–4 itens com número e nome)
**Espera sua decisão** — só o que precisa do Jean; para cada item, chame propor_decisao (sem repetir o que já está pendente — confira com decisoes_pendentes)

Acompanhe as tarefas em andamento da sua área (decisoes_pendentes → em_andamento): diga quais estão atrasadas e com quem, e, quando os números permitirem, se o resultado melhorou desde a aprovação.

Se houver uma série ou comparação que conte a história do dia (ex.: saldo previsto, leads por semana, carteira por semana), inclua 1 gráfico logo depois da conclusão.

Seja curto: o Jean lê isso às 7h no celular.`;

type Gerente = { id: Area; nome: string; area: string; descricao: string; papeis: (papel: string) => boolean; prompt: string };

const GERENTES: Gerente[] = [
  {
    id: 'assistente', nome: 'CEO', area: 'Visão geral',
    descricao: 'Junta financeiro, comercial e operacional. Faz o resumo das 7h.',
    papeis: p => p === 'superadmin',
    prompt: `Você é o CEO da Grape Mídia (uma IA que trabalha para o Jean, dono da empresa). Enxerga todas as áreas — financeiro, comercial, marketing e operacional —, cobra os outros gerentes pelo que está atrasado e ajuda o Jean a decidir o que fazer hoje. No relatório, priorize o que pode virar problema de caixa ou perda de cliente nos próximos 15 dias.`,
  },
  {
    id: 'financeiro', nome: 'Financeiro', area: 'Financeiro',
    descricao: 'Caixa, previsão, inadimplência, contas a pagar e meses fechados.',
    papeis: p => p === 'superadmin',
    prompt: `Você é o gerente financeiro da Grape Mídia. Cuida do caixa: saldo, previsão de entradas e saídas, inadimplência e contas a pagar. Regras da casa: o DFC é regime de caixa; pagamento de fatura do cartão e Pix entre contas são transferência (grupo 99), não despesa; a fatura do cartão Sicredi (~R$ 40 mil/mês) junta o tráfego da própria Grape (~R$ 15 mil/mês), ferramentas e outros gastos do mês — é normal ser bem maior que o tráfego, e não dá para segurar nem atrasar; o pró-labore do Jean é R$ 15 mil no dia 1. Antes de recomendar empréstimo, veja se a previsão realmente quebra e em que dia.`,
  },
  {
    id: 'comercial', nome: 'Comercial', area: 'Comercial',
    descricao: 'Funil, reuniões, fechamentos, leads parados e tarefas atrasadas.',
    papeis: p => ['superadmin', 'admin', 'gerente-comercial'].includes(p) || p.startsWith('diretor'),
    prompt: `Você é o gerente comercial da Grape Mídia. Acompanha o funil (lead → reunião marcada → fechamento), o ritmo dos closers e onde os leads param. Leads chegam pelo formulário/anúncio e pelo WhatsApp; a reunião é o principal indicador intermediário. Aponte nomes de lead e de responsável quando houver algo parado.`,
  },
  {
    id: 'operacional', nome: 'Operacional', area: 'Operacional',
    descricao: 'Resultado dos projetos, evolução da carteira e retenção.',
    papeis: p => ['superadmin', 'admin', 'diretor-operacional', 'gerente-operacional'].includes(p),
    prompt: `Você é o gerente operacional da Grape Mídia. Acompanha a carteira de clientes em gestão de tráfego: resultado de cada projeto (BOM, OK, RUIM), gargalos, responsáveis e clientes em risco de sair. Um projeto RUIM por muito tempo costuma virar pedido de saída — aponte quais e de quem são.`,
  },
  {
    id: 'marketing', nome: 'Marketing', area: 'Marketing',
    descricao: 'Anúncios da Grape, CPL por campanha e criativo, funil e postagens.',
    papeis: p => ['superadmin', 'admin', 'gerente-marketing'].includes(p) || p.startsWith('diretor'),
    prompt: `Você é o gerente de marketing da Grape Mídia — cuida da aquisição de clientes da PRÓPRIA Grape (não dos clientes). Os anúncios rodam na Meta (conta Captação), levam para uma LP com botão de agendar; o lead cai no CRM e o closer faz a reunião. Olhe gasto, visitas à LP, leads no CRM, CPL por campanha e por criativo, e cruze com o funil (reuniões e fechamentos) para dizer o que escalar, o que pausar e qual criativo testar. Os leads que a Meta conta e os que entram no CRM diferem — a referência é o CRM. Também acompanha as postagens do Instagram da Grape e do Jean.`,
  },
];

const gerentePorId = (id: string) => GERENTES.find(g => g.id === id);
const ferramentasDe = (g: Area) => Object.values(FERRAMENTAS).filter(f => f.areas.includes(g));

// ── Loop com o Claude ───────────────────────────────────────────────────────────

const TAG_CHAMADA = /<(invoke|function_calls|parameter)\b/i;
const limparTags = (t: string) => t
  .replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, '')
  .replace(/<invoke\b[\s\S]*?<\/invoke>/gi, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

async function rodarGerente(
  pool: Pool, client: Anthropic, g: Gerente,
  historico: Anthropic.MessageParam[], quem: { nome: string; email: string; papel: string; conversaId?: number | null },
) {
  const ferramentas = ferramentasDe(g.id);
  const memoria = (await pool.query(
    `SELECT id, gerente, texto, to_char(criado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YY') AS dia,
            split_part(COALESCE(criado_por, ''), '@', 1) AS autor
       FROM ia_gerentes_memoria
      WHERE ativo AND ($1 = 'assistente' OR gerente = $1)
      ORDER BY criado_em DESC LIMIT 120`, [g.id])).rows.reverse();
  const blocoMemoria = memoria.length
    ? `Sua memória (${memoria.length} anotações; o número entre colchetes é o id):\n` + memoria.map((m: any) =>
      `- [${m.id}] ${m.texto} (${m.dia}${m.autor && m.autor !== 'rotina' ? ', ' + m.autor : ''}${g.id === 'assistente' && m.gerente !== 'assistente' ? ', área ' + m.gerente : ''})`).join('\n')
    : 'Sua memória ainda está vazia.';
  const tools = ferramentas.map(f => f.def);
  const system: Anthropic.TextBlockParam[] = [
    { type: 'text', text: `${BASE}\n\n${g.prompt}`, cache_control: { type: 'ephemeral' } },
    {
      type: 'text',
      text: `Hoje é ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}. Conversando com: ${quem.nome || quem.email} (${quem.papel || 'rotina automática'}).\n\n${blocoMemoria}`,
    },
  ];

  const mensagens: Anthropic.MessageParam[] = [...historico];
  let repetiu = false;
  let textoGuardado = '';
  const usadas: string[] = [];
  const uso = { entrada: 0, saida: 0, cache: 0 };

  for (let volta = 0; volta < MAX_VOLTAS; volta++) {
    const resp = await (client.beta.messages.create as any)({
      model: MODELO,
      max_tokens: 16000,
      system,
      tools,
      messages: mensagens,
      output_config: { effort: 'medium' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    }) as Anthropic.Message;

    uso.entrada += resp.usage?.input_tokens || 0;
    uso.saida += resp.usage?.output_tokens || 0;
    uso.cache += (resp.usage as any)?.cache_read_input_tokens || 0;

    if (resp.stop_reason === 'refusal') {
      return { texto: 'Não consegui responder a esse pedido. Tente reformular.', usadas, uso };
    }

    mensagens.push({ role: 'assistant', content: resp.content as any });

    if (resp.stop_reason === 'pause_turn') continue;

    const chamadas = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (resp.stop_reason !== 'tool_use' || chamadas.length === 0) {
      const bruto = resp.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('\n\n');
      // Às vezes o modelo escreve a chamada da ferramenta como texto (<invoke name=…>) em vez
      // de chamar — a decisão não entra na fila. Pede uma vez para chamar de verdade.
      if (TAG_CHAMADA.test(bruto) && !repetiu) {
        repetiu = true;
        mensagens.push({ role: 'user', content: 'Você escreveu chamadas de ferramenta como texto, e elas não rodaram. Chame as ferramentas de verdade agora (sem repetir o texto do relatório) e, ao terminar, responda só "ok".' });
        textoGuardado = limparTags(bruto);
        continue;
      }
      const final = limparTags(bruto);
      const texto = textoGuardado && (!final || /^ok\.?$/i.test(final)) ? textoGuardado : final;
      return { texto: texto || '(sem resposta)', usadas, uso };
    }

    const resultados: Anthropic.ToolResultBlockParam[] = await Promise.all(chamadas.map(async c => {
      usadas.push(c.name);
      const f = ferramentas.find(x => x.def.name === c.name);
      if (!f) return { type: 'tool_result' as const, tool_use_id: c.id, content: `Ferramenta ${c.name} não disponível para este gerente.`, is_error: true };
      try {
        const out = await f.run(pool, c.input || {}, { gerente: g.id, email: quem.email, conversaId: quem.conversaId });
        return { type: 'tool_result' as const, tool_use_id: c.id, content: JSON.stringify(out) };
      } catch (e: any) {
        console.error(`[gerentes] ferramenta ${c.name}:`, e?.message || e);
        return { type: 'tool_result' as const, tool_use_id: c.id, content: `Erro ao consultar: ${e?.message || 'falha'}`, is_error: true };
      }
    }));
    mensagens.push({ role: 'user', content: resultados });
  }
  return { texto: 'A análise ficou longa demais e parei antes de terminar. Peça de novo com um recorte menor.', usadas, uso };
}

// ── Rotas ───────────────────────────────────────────────────────────────────────

export async function setupGerentesRoutes(app: Express, pool: Pool) {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS ia_gerentes_conversas (
      id SERIAL PRIMARY KEY, gerente TEXT NOT NULL, email TEXT NOT NULL, titulo TEXT,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE INDEX IF NOT EXISTS ia_gerentes_conversas_email ON ia_gerentes_conversas (email, gerente, atualizado_em DESC)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS ia_gerentes_mensagens (
      id SERIAL PRIMARY KEY, conversa_id INTEGER NOT NULL REFERENCES ia_gerentes_conversas(id) ON DELETE CASCADE,
      papel TEXT NOT NULL, texto TEXT NOT NULL, ferramentas TEXT[], uso JSONB,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS ia_gerentes_relatorios (
      id SERIAL PRIMARY KEY, gerente TEXT NOT NULL, dia DATE NOT NULL, status TEXT NOT NULL DEFAULT 'gerando',
      texto TEXT, ferramentas TEXT[], uso JSONB, erro TEXT,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), concluido_em TIMESTAMPTZ, UNIQUE (gerente, dia))`);
    await pool.query(`ALTER TABLE IF EXISTS ia_para_decidir
      ADD COLUMN IF NOT EXISTS responsavel TEXT, ADD COLUMN IF NOT EXISTS responsavel_nome TEXT,
      ADD COLUMN IF NOT EXISTS prazo DATE, ADD COLUMN IF NOT EXISTS concluido_em TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS concluido_por TEXT`).catch(() => {});
    await pool.query(`CREATE TABLE IF NOT EXISTS ia_gerentes_memoria (
      id SERIAL PRIMARY KEY, gerente TEXT NOT NULL, texto TEXT NOT NULL, tipo TEXT, origem TEXT NOT NULL DEFAULT 'conversa',
      conversa_id INTEGER, criado_por TEXT, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ativo BOOLEAN NOT NULL DEFAULT TRUE, desativado_por TEXT, desativado_em TIMESTAMPTZ)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS ia_gerentes_memoria_g ON ia_gerentes_memoria (gerente, ativo)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS ia_para_decidir (
      id SERIAL PRIMARY KEY, gerente TEXT NOT NULL, titulo TEXT NOT NULL, contexto TEXT, recomendacao TEXT,
      urgencia TEXT NOT NULL DEFAULT 'media', status TEXT NOT NULL DEFAULT 'pendente',
      criado_por TEXT, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      decidido_por TEXT, decidido_em TIMESTAMPTZ, observacao TEXT)`);
  } catch (e: any) {
    console.error('[gerentes] migração:', e?.message || e);
  }

  const chave = () => process.env.ANTHROPIC_API_KEY;
  const cliente = () => new Anthropic({ apiKey: chave() });

  const quemE = async (req: any) => {
    const email = String(req.user?.email || '').toLowerCase();
    if (!email) return null;
    const u = (await pool.query('SELECT name, role FROM users WHERE LOWER(email) = $1', [email])).rows[0];
    return { email, nome: u?.name || email, papel: String(u?.role || '') };
  };
  const permitidos = (papel: string) => GERENTES.filter(g => g.papeis(papel));

  // Lista de gerentes que a pessoa enxerga + último relatório + pendências
  app.get('/api/gerentes', async (req, res) => {
    try {
      const quem = await quemE(req);
      if (!quem) return res.status(401).json({ error: 'Sem usuário' });
      const lista = permitidos(quem.papel);
      const ids = lista.map(g => g.id);
      const rel = ids.length ? (await pool.query(
        `SELECT DISTINCT ON (gerente) gerente, to_char(dia, 'YYYY-MM-DD') AS dia, status, concluido_em
           FROM ia_gerentes_relatorios WHERE gerente = ANY($1) ORDER BY gerente, dia DESC`, [ids])).rows : [];
      const pend = ids.length ? (await pool.query(
        `SELECT gerente, COUNT(*)::int AS qtd FROM ia_para_decidir WHERE status = 'pendente' AND gerente = ANY($1) GROUP BY 1`, [ids])).rows : [];
      res.json({
        configurado: !!chave(),
        gerentes: lista.map(g => ({
          id: g.id, nome: g.nome, area: g.area, descricao: g.descricao,
          ultimo_relatorio: rel.find((r: any) => r.gerente === g.id) || null,
          pendentes: pend.find((p: any) => p.gerente === g.id)?.qtd || 0,
        })),
      });
    } catch (e: any) {
      console.error('[gerentes] lista:', e?.message || e);
      res.status(500).json({ error: 'Erro ao carregar gerentes' });
    }
  });

  const exigir = async (req: any, res: any) => {
    const quem = await quemE(req);
    if (!quem) { res.status(401).json({ error: 'Sem usuário' }); return null; }
    const g = gerentePorId(req.params.id);
    if (!g) { res.status(404).json({ error: 'Gerente não encontrado' }); return null; }
    if (!g.papeis(quem.papel)) { res.status(403).json({ error: 'Você não tem acesso a este gerente' }); return null; }
    return { quem, g };
  };

  // Conversas da pessoa com um gerente
  app.get('/api/gerentes/:id/conversas', async (req, res) => {
    try {
      const ok = await exigir(req, res); if (!ok) return;
      const r = await pool.query(
        `SELECT id, titulo, atualizado_em FROM ia_gerentes_conversas WHERE email = $1 AND gerente = $2
          ORDER BY atualizado_em DESC LIMIT 30`, [ok.quem.email, ok.g.id]);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ error: e?.message || 'erro' }); }
  });

  app.get('/api/gerentes/:id/conversas/:cid', async (req, res) => {
    try {
      const ok = await exigir(req, res); if (!ok) return;
      const c = (await pool.query(`SELECT id FROM ia_gerentes_conversas WHERE id = $1 AND email = $2 AND gerente = $3`,
        [req.params.cid, ok.quem.email, ok.g.id])).rows[0];
      if (!c) return res.status(404).json({ error: 'Conversa não encontrada' });
      const m = await pool.query(`SELECT id, papel, texto, ferramentas, criado_em FROM ia_gerentes_mensagens WHERE conversa_id = $1 ORDER BY id`, [c.id]);
      res.json(m.rows.map((x: any) => ({ ...x, texto: limparTags(x.texto || '') })));
    } catch (e: any) { res.status(500).json({ error: e?.message || 'erro' }); }
  });

  app.delete('/api/gerentes/:id/conversas/:cid', async (req, res) => {
    try {
      const ok = await exigir(req, res); if (!ok) return;
      await pool.query(`DELETE FROM ia_gerentes_conversas WHERE id = $1 AND email = $2 AND gerente = $3`, [req.params.cid, ok.quem.email, ok.g.id]);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e?.message || 'erro' }); }
  });

  // Mandar mensagem
  app.post('/api/gerentes/:id/chat', async (req, res) => {
    try {
      const ok = await exigir(req, res); if (!ok) return;
      if (!chave()) return res.status(503).json({ error: 'ANTHROPIC_API_KEY não configurada no servidor.' });
      const texto = String(req.body?.mensagem || '').trim().slice(0, 8000);
      if (!texto) return res.status(400).json({ error: 'Mensagem vazia' });

      let conversaId = Number(req.body?.conversa_id) || null;
      if (conversaId) {
        const c = (await pool.query(`SELECT id FROM ia_gerentes_conversas WHERE id = $1 AND email = $2 AND gerente = $3`,
          [conversaId, ok.quem.email, ok.g.id])).rows[0];
        if (!c) conversaId = null;
      }
      if (!conversaId) {
        conversaId = (await pool.query(
          `INSERT INTO ia_gerentes_conversas (gerente, email, titulo) VALUES ($1, $2, $3) RETURNING id`,
          [ok.g.id, ok.quem.email, texto.slice(0, 80)])).rows[0].id;
      }

      // Histórico em texto (últimas 30 mensagens) + a nova
      const ant = (await pool.query(
        `SELECT papel, texto FROM (SELECT id, papel, texto FROM ia_gerentes_mensagens WHERE conversa_id = $1 ORDER BY id DESC LIMIT 30) x ORDER BY id`,
        [conversaId])).rows;
      const historico: Anthropic.MessageParam[] = ant.map((m: any) => ({ role: m.papel === 'assistente' ? 'assistant' : 'user', content: m.texto }));
      while (historico.length && historico[0].role !== 'user') historico.shift();
      historico.push({ role: 'user', content: texto });

      await pool.query(`INSERT INTO ia_gerentes_mensagens (conversa_id, papel, texto) VALUES ($1, 'usuario', $2)`, [conversaId, texto]);

      const r = await rodarGerente(pool, cliente(), ok.g, historico, { ...ok.quem, conversaId });
      const ferr = [...new Set(r.usadas)];
      await pool.query(
        `INSERT INTO ia_gerentes_mensagens (conversa_id, papel, texto, ferramentas, uso) VALUES ($1, 'assistente', $2, $3, $4)`,
        [conversaId, r.texto, ferr, JSON.stringify(r.uso)]);
      await pool.query(`UPDATE ia_gerentes_conversas SET atualizado_em = NOW() WHERE id = $1`, [conversaId]);
      res.json({ conversa_id: conversaId, resposta: r.texto, ferramentas: ferr });
    } catch (e: any) {
      console.error('[gerentes] chat:', e?.status || '', e?.message || e);
      const msg = e instanceof Anthropic.RateLimitError ? 'Limite de uso da IA atingido. Tente em um minuto.'
        : e instanceof Anthropic.APIError ? `A IA devolveu erro (${e.status ?? 'sem status'}).`
        : 'Erro ao conversar com o gerente.';
      res.status(500).json({ error: msg });
    }
  });

  // Relatórios do dia (os mais recentes do gerente)
  app.get('/api/gerentes/:id/relatorios', async (req, res) => {
    try {
      const ok = await exigir(req, res); if (!ok) return;
      const r = await pool.query(
        `SELECT id, to_char(dia, 'YYYY-MM-DD') AS dia, status, texto, ferramentas, erro, concluido_em
           FROM ia_gerentes_relatorios WHERE gerente = $1 ORDER BY dia DESC LIMIT 14`, [ok.g.id]);
      res.json(r.rows.map((x: any) => ({ ...x, texto: x.texto ? limparTags(x.texto) : x.texto })));
    } catch (e: any) { res.status(500).json({ error: e?.message || 'erro' }); }
  });

  // Gerar o relatório de hoje agora (refaz se já existir)
  app.post('/api/gerentes/:id/relatorios/gerar', async (req, res) => {
    try {
      const ok = await exigir(req, res); if (!ok) return;
      if (!chave()) return res.status(503).json({ error: 'ANTHROPIC_API_KEY não configurada no servidor.' });
      const rel = await gerarRelatorio(ok.g, true, ok.quem);
      res.json(rel);
    } catch (e: any) {
      console.error('[gerentes] gerar:', e?.message || e);
      res.status(500).json({ error: 'Erro ao gerar o relatório.' });
    }
  });

  // Fila "Para decidir" — itens dos gerentes que a pessoa enxerga
  app.get('/api/gerentes-decisoes', async (req, res) => {
    try {
      const quem = await quemE(req);
      if (!quem) return res.status(401).json({ error: 'Sem usuário' });
      const ids = permitidos(quem.papel).map(g => g.id);
      const r = ids.length ? await pool.query(
        `SELECT id, gerente, titulo, contexto, recomendacao, urgencia, status, criado_em, decidido_por, decidido_em, observacao,
                responsavel, responsavel_nome, to_char(prazo, 'YYYY-MM-DD') AS prazo, concluido_em, concluido_por
           FROM ia_para_decidir
          WHERE gerente = ANY($1) AND (status IN ('pendente', 'aprovado') OR COALESCE(concluido_em, decidido_em) > NOW() - interval '30 days')
          ORDER BY (status = 'pendente') DESC,
                   CASE urgencia WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END, criado_em DESC
          LIMIT 100`, [ids]) : { rows: [] };
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ error: e?.message || 'erro' }); }
  });

  app.patch('/api/gerentes-decisoes/:id', async (req, res) => {
    try {
      const quem = await quemE(req);
      if (!quem) return res.status(401).json({ error: 'Sem usuário' });
      const item = (await pool.query(`SELECT gerente FROM ia_para_decidir WHERE id = $1`, [req.params.id])).rows[0];
      if (!item) return res.status(404).json({ error: 'Item não encontrado' });
      const g = gerentePorId(item.gerente);
      if (!g || !g.papeis(quem.papel)) return res.status(403).json({ error: 'Sem acesso' });
      const status = String(req.body?.status || '');
      if (!['aprovado', 'descartado', 'pendente', 'feito'].includes(status)) return res.status(400).json({ error: 'status inválido' });
      const obs = req.body?.observacao != null ? String(req.body.observacao).slice(0, 1000) : null;
      const atual = (await pool.query(`SELECT status FROM ia_para_decidir WHERE id = $1`, [req.params.id])).rows[0];
      // Aprovar = virar tarefa: responsável (e-mail de users) e prazo
      let resp: string | null = null, respNome: string | null = null, prazo: string | null = null;
      if (status === 'aprovado') {
        resp = String(req.body?.responsavel || quem.email).toLowerCase();
        respNome = (await pool.query('SELECT name FROM users WHERE LOWER(email) = $1', [resp])).rows[0]?.name || resp;
        prazo = dataOk(req.body?.prazo) ? req.body.prazo : null;
      }
      // feito ↔ aprovado mexe só na conclusão; o resto mexe na decisão
      const r = status === 'feito' || (status === 'aprovado' && atual?.status === 'feito')
        ? await pool.query(
          `UPDATE ia_para_decidir SET status = $2,
                  concluido_em = CASE WHEN $2 = 'feito' THEN NOW() END,
                  concluido_por = CASE WHEN $2 = 'feito' THEN $3 END,
                  observacao = COALESCE($4, observacao)
            WHERE id = $1 RETURNING *`, [req.params.id, status, quem.email, obs])
        : await pool.query(
          `UPDATE ia_para_decidir
              SET status = $2, observacao = COALESCE($3, observacao),
                  decidido_por = CASE WHEN $2 = 'pendente' THEN NULL ELSE $4 END,
                  decidido_em  = CASE WHEN $2 = 'pendente' THEN NULL ELSE NOW() END,
                  responsavel = $5, responsavel_nome = $6, prazo = $7::date,
                  concluido_em = NULL, concluido_por = NULL
            WHERE id = $1 RETURNING *`, [req.params.id, status, obs, quem.email, resp, respNome, prazo]);
      const d = r.rows[0];
      if (obs && (status === 'aprovado' || status === 'descartado')) {
        await pool.query(
          `INSERT INTO ia_gerentes_memoria (gerente, texto, tipo, origem, criado_por) VALUES ($1, $2, 'decisao', 'decisao', $3)`,
          [d.gerente, `${status === 'aprovado' ? 'Aprovado' : 'Descartado'} em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}: "${d.titulo}". Motivo: ${obs}`, quem.email]);
      }
      res.json(d);
    } catch (e: any) { res.status(500).json({ error: e?.message || 'erro' }); }
  });

  // Memória do gerente (assistente vê a de todos)
  app.get('/api/gerentes/:id/memoria', async (req, res) => {
    try {
      const ok = await exigir(req, res); if (!ok) return;
      const r = await pool.query(
        `SELECT id, gerente, texto, tipo, origem, criado_por, criado_em FROM ia_gerentes_memoria
          WHERE ativo AND ($1 = 'assistente' OR gerente = $1) ORDER BY criado_em DESC LIMIT 200`, [ok.g.id]);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ error: e?.message || 'erro' }); }
  });

  app.post('/api/gerentes/:id/memoria', async (req, res) => {
    try {
      const ok = await exigir(req, res); if (!ok) return;
      const texto = String(req.body?.texto || '').trim().slice(0, 600);
      if (!texto) return res.status(400).json({ error: 'Texto vazio' });
      const r = await pool.query(
        `INSERT INTO ia_gerentes_memoria (gerente, texto, tipo, origem, criado_por) VALUES ($1, $2, 'fato', 'manual', $3) RETURNING *`,
        [ok.g.id, texto, ok.quem.email]);
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e?.message || 'erro' }); }
  });

  app.delete('/api/gerentes/:id/memoria/:mid', async (req, res) => {
    try {
      const ok = await exigir(req, res); if (!ok) return;
      await pool.query(
        `UPDATE ia_gerentes_memoria SET ativo = FALSE, desativado_por = $3, desativado_em = NOW()
          WHERE id = $1 AND ($2 = 'assistente' OR gerente = $2)`, [req.params.mid, ok.g.id, ok.quem.email]);
      res.json({ ok: true });
    } catch (e: any) { res.status(500).json({ error: e?.message || 'erro' }); }
  });

  // ── Rotina das 7h ──
  async function gerarRelatorio(g: Gerente, forcar: boolean, quem?: { nome: string; email: string; papel: string }) {
    const dia = hojeSP();
    if (forcar) {
      await pool.query(
        `INSERT INTO ia_gerentes_relatorios (gerente, dia, status) VALUES ($1, $2, 'gerando')
         ON CONFLICT (gerente, dia) DO UPDATE SET status = 'gerando', erro = NULL, criado_em = NOW()`, [g.id, dia]);
    } else {
      // Vaga presa em 'gerando' (servidor reiniciado no meio) é retomada depois de 15 min
      const vaga = await pool.query(
        `INSERT INTO ia_gerentes_relatorios AS r (gerente, dia, status) VALUES ($1, $2, 'gerando')
         ON CONFLICT (gerente, dia) DO UPDATE SET status = 'gerando', criado_em = NOW(), erro = NULL
           WHERE r.status = 'gerando' AND r.criado_em < NOW() - interval '15 minutes'
         RETURNING id`, [g.id, dia]);
      if (vaga.rowCount === 0) return null; // outro processo já pegou
    }
    try {
      const anterior = (await pool.query(
        `SELECT to_char(dia, 'DD/MM') AS dia, texto FROM ia_gerentes_relatorios
          WHERE gerente = $1 AND dia < $2 AND status = 'pronto' ORDER BY dia DESC LIMIT 1`, [g.id, dia])).rows[0];
      const pedido = anterior?.texto
        ? `${RELATORIO}\n\nSeu relatório anterior (${anterior.dia}), para comparar — diga o que mudou desde então e não repita o que continua igual sem novidade:\n\n${limparTags(anterior.texto).slice(0, 6000)}`
        : RELATORIO;
      const r = await rodarGerente(pool, cliente(), g, [{ role: 'user', content: pedido }],
        quem || { nome: 'Rotina das 7h', email: '', papel: '' });
      const row = (await pool.query(
        `UPDATE ia_gerentes_relatorios SET status = 'pronto', texto = $3, ferramentas = $4, uso = $5, concluido_em = NOW()
          WHERE gerente = $1 AND dia = $2
          RETURNING id, to_char(dia, 'YYYY-MM-DD') AS dia, status, texto, ferramentas, erro, concluido_em`,
        [g.id, dia, r.texto, [...new Set(r.usadas)], JSON.stringify(r.uso)])).rows[0];
      return row;
    } catch (e: any) {
      await pool.query(`UPDATE ia_gerentes_relatorios SET status = 'erro', erro = $3 WHERE gerente = $1 AND dia = $2`,
        [g.id, dia, String(e?.message || e).slice(0, 500)]);
      throw e;
    }
  }

  let rodando = false;
  const verificarRotina = async () => {
    if (rodando || !chave() || process.env.GERENTES_ROTINA === 'off') return;
    const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    if (agora.getHours() < 7) return;
    rodando = true;
    try {
      // Assistente por último: ele lê a fila que os outros acabaram de preencher
      for (const id of ['financeiro', 'comercial', 'marketing', 'operacional', 'assistente'] as Area[]) {
        const g = gerentePorId(id)!;
        try {
          const feito = await gerarRelatorio(g, false);
          if (feito) console.log(`[gerentes] relatório de ${id} gerado (${feito.dia})`);
        } catch (e: any) {
          console.error(`[gerentes] relatório de ${id}:`, e?.message || e);
        }
      }
    } finally {
      rodando = false;
    }
  };
  setInterval(() => { verificarRotina().catch(() => {}); }, 5 * 60 * 1000);
  setTimeout(() => { verificarRotina().catch(() => {}); }, 60 * 1000);
}

// Exportado só para teste (scripts de conferência)
export const _ferramentasGerentes = FERRAMENTAS;
export const _testeGerentes = { rodarGerente, GERENTES };
