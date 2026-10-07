// ── Etapas do funil que só a Meta conhece: pageview da LP e clique no agendar ──
//
// Levantado com a sessão ML MARKETING em 28/09/2026 (Graph API conferida):
//  • Conta Captação [ATIVA] 690496082457749, pixel/dataset 1865105590542909.
//  • Pageview da LP = `landing_page_view` nas actions do INSIGHTS — clique que
//    virou página carregada, com a mesma atribuição de impressões/cliques/gasto.
//    NÃO usar PageView do dataset: conta orgânico e tem 516 eventos de
//    `localhost` (testes na LP, até 24/09) misturados.
//  • "Clicou no agendamento" = evento personalizado `ClicouAgendar` (pointerdown
//    no botão da LP; ~507 em 28 dias). Só aparece no Insights depois que vira
//    CONVERSÃO PERSONALIZADA (`offsite_conversion.custom.<id>`) — até 28/09 não
//    existia. A rota procura a conversão pela regra; sem ela, devolve null e o
//    motivo, e a tela mostra "—".
//  • Armadilha: a conversão "Reunião marcada" (777593924849494) está morta desde
//    26/08/2025 — regra no calendly.com, e o agendamento hoje é no cal.com. As
//    reuniões do funil vêm do CRM, nunca dela.
//
// Token: a conta da própria Grape não está em `project_tokens` (lá só há contas
// de cliente). Lê `META_GRAPE_ACCESS_TOKEN` do ambiente (token com ads_read).
import type { Express } from 'express';

const CONTA_PADRAO = '690496082457749';
const API = 'https://graph.facebook.com/v21.0';

async function get(url: string): Promise<any> {
  const r = await fetch(url);
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j?.error?.message || `HTTP ${r.status}`);
  return j;
}

// Conversão personalizada do ClicouAgendar, achada pela regra (id não é fixo)
let cacheConversao: { id: string | null; em: number } | null = null;
async function conversaoClicouAgendar(conta: string, token: string): Promise<string | null> {
  if (cacheConversao && Date.now() - cacheConversao.em < 30 * 60 * 1000) return cacheConversao.id;
  const j = await get(`${API}/act_${conta}/customconversions?fields=id,name,rule,custom_event_type&limit=100&access_token=${encodeURIComponent(token)}`);
  const achada = (j.data || []).find((c: any) => String(c.rule || '').includes('ClicouAgendar'));
  cacheConversao = { id: achada?.id || null, em: Date.now() };
  return cacheConversao.id;
}

export function setupFunilMetaRoutes(app: Express) {
  app.get('/api/marketing-funil-meta', async (req: any, res) => {
    const token = process.env.META_GRAPE_ACCESS_TOKEN;
    const conta = String(process.env.META_GRAPE_ACCOUNT_ID || CONTA_PADRAO).replace(/^act_/, '');
    const inicio = String(req.query.start || ''), fim = String(req.query.end || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) {
      return res.status(400).json({ error: 'start/end inválidos (YYYY-MM-DD)' });
    }
    if (!token) {
      return res.json({ pageview_lp: null, clicou_agendar: null, impressoes: null, cliques_link: null, gasto: null,
        motivo: 'Falta o token da conta de anúncio da Grape (META_GRAPE_ACCESS_TOKEN) no servidor.' });
    }
    try {
      const idConv = await conversaoClicouAgendar(conta, token).catch(() => null);
      const ins = await get(`${API}/act_${conta}/insights?level=account&fields=impressions,spend,actions` +
        `&time_range=${encodeURIComponent(JSON.stringify({ since: inicio, until: fim }))}&access_token=${encodeURIComponent(token)}`);
      const acoes: any[] = ins.data?.[0]?.actions || [];
      const valor = (tipo: string) => {
        const a = acoes.find(x => x.action_type === tipo);
        return a ? Number(a.value) : 0;
      };
      // O topo do funil vem daqui também: a tabela `facebook` (n8n) atrasa e conta
      // cliques de outro jeito — em set/2026 tinha 1.206 cliques e R$ 9.083 contra
      // 1.121 cliques no link e R$ 9.752,89 da Meta (parada em 26/09). Misturar as
      // fontes daria "carregou 83%" em vez de 90%.
      const d = ins.data?.[0] || {};
      res.json({
        conta,
        impressoes: Number(d.impressions) || 0,
        cliques_link: valor('link_click'),
        gasto: Number(d.spend) || 0,
        pageview_lp: valor('landing_page_view'),
        clicou_agendar: idConv ? valor(`offsite_conversion.custom.${idConv}`) : null,
        motivo: idConv ? null : 'O evento ClicouAgendar chega no pixel, mas ainda não existe conversão personalizada para ele no Gerenciador — sem ela a Meta não atribui o clique à campanha.',
      });
    } catch (e: any) {
      res.status(502).json({ error: `Meta: ${e.message}` });
    }
  });
}
