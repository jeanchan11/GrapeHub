import React from 'react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';

// Rasteriza cada página [data-report-page] do documento e monta um PDF A4 retrato (1 página cada).
// Usa JPEG (fundo branco, qualidade alta) — mantém nitidez e reduz drasticamente o tamanho do arquivo.
export async function exportMetaReportPdf(container: HTMLElement, fileName: string) {
  const pages = Array.from(container.querySelectorAll<HTMLElement>('[data-report-page]'));
  if (pages.length === 0) return;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const W = 210, H = 297;
  const PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  let added = 0;
  for (let i = 0; i < pages.length; i++) {
    try {
      const dataUrl = await toJpeg(pages[i], {
        pixelRatio: 2, quality: 0.9, backgroundColor: '#ffffff', width: 794, height: 1123, cacheBust: true,
        imagePlaceholder: PLACEHOLDER, // pixel transparente se alguma imagem falhar (nunca quebra o PDF)
      });
      if (added > 0) pdf.addPage();
      pdf.addImage(dataUrl, 'JPEG', 0, 0, W, H);
      added++;
    } catch (e) {
      console.error(`[relatório] falha ao rasterizar página ${i + 1}:`, e);
    }
  }
  if (added === 0) throw new Error('Nenhuma página do relatório pôde ser gerada.');
  pdf.save(fileName);
}

// ─────────────────────────────────────────────────────────────────────────────
// Relatório de Performance — Meta Ads (documento A4, 4 páginas, tema claro).
// Renderizado fora da tela e rasterizado página a página para PDF (ver exportMetaReportPdf).
// ─────────────────────────────────────────────────────────────────────────────

interface Campaign {
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  leads: number;
  messages: number;
  cost_per_result: number | null;
}
interface Kpis {
  spend: number; impressions: number; clicks: number; leads: number;
  messages: number; ctr: number; primary_metric: 'messages' | 'leads'; cost_per_result: number | null;
}
interface Creative {
  ad_id: string;
  ad_name: string;
  thumbnail_url: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  messages: number;
  leads: number;
}
interface RegionRow {
  region: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  leads: number;
  messages: number;
}
export interface MetaReportData {
  partnerName: string;
  range: { start: string; end: string };
  kpis: Kpis | null;
  campaigns: Campaign[];
  creatives?: Creative[];
  regions?: RegionRow[];
}

// ── Formatação ──
const brl = (v: number | null | undefined) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const brlShort = (v: number | null | undefined) =>
  `R$ ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const int = (v: number | null | undefined) => (Number(v) || 0).toLocaleString('pt-BR');
const pct = (v: number | null | undefined) => `${(Number(v) || 0).toFixed(2)}%`;

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_FULL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function dm(iso: string) { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${d} ${MESES[m - 1]}`; }
function dmFull(iso: string) { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${d} de ${MESES_FULL[m - 1]} de ${y}`; }
function yearOf(iso: string) { return iso?.split('-')[0] || ''; }

// ── Cores ──
const C = {
  ink: '#1b1630', body: '#3f3a52', mut: '#6b7280', faint: '#9ca3af',
  purple: '#6d28d9', purpleD: '#5b21b6', purpleL: '#8b5cf6',
  bgSoft: '#f5f3ff', bgSoft2: '#ede9fe', line: '#e9e6f2', track: '#e5e1f5',
  green: '#059669', greenBg: '#ecfdf5', amber: '#b45309',
};

// ── Motor de insights ──
function short(name: string) {
  const clean = (s: string) => s
    .replace(/[\[\]]/g, ' ')                       // colchetes soltos
    .replace(/[^0-9A-Za-zÀ-ÿ .\-]/g, ' ')          // emojis/símbolos (✕, ●, etc.)
    .replace(/\s+/g, ' ').trim();
  const dateTok = (name.match(/(\d{2})\.(\d{2})(?:\.(\d{2}))?\b/) || [])[0] || '';
  let base = clean(name.replace(/\[[^\]]*\]/g, ' ').replace(/\d{2}\.\d{2}(?:\.\d{2})?/g, ' '));
  if (!base) {
    // Nome só de tags [ ]: escolhe o rótulo mais descritivo (ignora tags técnicas curtas).
    const TAG = /^(cbo|abo|ig|fb|rs|sc|pr|sp|mt|sul|wpp|wa|whats|msg|leads?)$/i;
    const parts = (name.match(/\[([^\]]+)\]/g) || []).map(x => clean(x)).filter(Boolean);
    base = parts.filter(p => p.length > 3 && !TAG.test(p)).sort((a, b) => b.length - a.length)[0] || parts[0] || '';
  }
  if (base.length > 24) base = base.slice(0, 24).trim() + '…';
  return (base + (dateTok ? ` ${dateTok}` : '')).trim() || clean(name).slice(0, 24) || 'Campanha';
}
function family(name: string) {
  return name.replace(/\[[^\]]*\]/g, ' ').replace(/\d{2}\.\d{2}(?:\.\d{2})?/g, ' ')
    .replace(/[-–|·.,/()]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}
function dateKey(name: string) {
  const m = name.match(/(\d{2})\.(\d{2})(?:\.(\d{2}))?/);
  if (!m) return 0;
  const [_, d, mo, y] = m;
  return (y ? 2000 + Number(y) : 2000) * 10000 + Number(mo) * 100 + Number(d);
}

interface Insight { tag: string; title: string; titleAccent?: string; body: React.ReactNode; chart?: { label: string; value: string; v: number; hot?: boolean }[]; chartCaption?: string; }
interface Rec { title: string; body: string; }

function buildAnalysis(campaigns: Campaign[], isPM: boolean) {
  const convOf = (c: Campaign) => (isPM ? c.messages : c.leads) || 0;
  const cpcOf = (c: Campaign) => c.cost_per_result;
  const totalConv = campaigns.reduce((s, c) => s + convOf(c), 0);
  const withConv = campaigns.filter(c => convOf(c) > 0 && cpcOf(c) != null);
  const noun = isPM ? 'conversa' : 'lead';
  const nounP = isPM ? 'conversas' : 'leads';

  const insights: Insight[] = [];
  const recs: Rec[] = [];

  const byVol = [...campaigns].sort((a, b) => convOf(b) - convOf(a));
  const top = byVol[0];
  if (top && convOf(top) > 0) {
    const share = totalConv > 0 ? Math.round((convOf(top) / totalConv) * 100) : 0;
    insights.push({
      tag: 'Motor de captação',
      title: `${short(top.campaign_name)} concentra o volume`,
      body: <>Sozinha, responde por <b>{int(convOf(top))} {nounP} — {share}% de todos os {nounP}</b> do período, a {brl(cpcOf(top))} cada. É a base mais estável e escalável da conta.</>,
    });
    recs.push({ title: `Escalar a campanha ${short(top.campaign_name)}`, body: `Melhor combinação de volume e custo. Aumento gradual de orçamento (15–20%/semana) monitorando o custo por ${noun}.` });
  }

  const byEff = [...withConv].sort((a, b) => (cpcOf(a)! - cpcOf(b)!));
  const cheapest = byEff[0];
  if (cheapest && cheapest !== top) {
    insights.push({
      tag: 'Melhor eficiência',
      title: `A campanha mais eficiente do período`,
      body: <>{short(cheapest.campaign_name)} entrega {nounP} a <b>{brl(cpcOf(cheapest))}</b> — o menor custo por {noun} entre todas as campanhas ativas. Deve servir de referência de criativo e copy.</>,
    });
    recs.push({ title: `Reforçar ${short(cheapest.campaign_name)} e replicar o formato`, body: `Por ter o menor custo por ${noun} (${brl(cpcOf(cheapest))}), deve receber mais verba e virar modelo de criativo/copy para novas campanhas.` });
  }

  // Tendência por "família" (mesma linha, versões em datas diferentes)
  const groups: Record<string, Campaign[]> = {};
  for (const c of withConv) { const k = family(c.campaign_name); if (k) (groups[k] ||= []).push(c); }
  const trendFam = Object.values(groups)
    .filter(g => g.length >= 2)
    .map(g => [...g].sort((a, b) => dateKey(a.campaign_name) - dateKey(b.campaign_name)))
    .find(g => g.length >= 2 && dateKey(g[0].campaign_name) > 0);
  if (trendFam) {
    const first = cpcOf(trendFam[0])!, last = cpcOf(trendFam[trendFam.length - 1])!;
    const change = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
    const cheaper = change < 0;
    const famName = short(trendFam[0].campaign_name).replace(/\s*\d{2}\.\d{2}.*$/, '').trim() || 'a linha';
    const maxCpc = Math.max(...trendFam.map(c => cpcOf(c)!));
    insights.push({
      tag: 'Otimização em curso',
      title: `Linha "${famName}" ficou`,
      titleAccent: `${Math.abs(change)}% ${cheaper ? 'mais barata' : 'mais cara'}`,
      body: <>A cada nova versão da campanha, o custo por {noun} {cheaper ? 'caiu' : 'subiu'} de forma consistente:</>,
      chart: trendFam.map((c, i) => ({
        label: (c.campaign_name.match(/(\d{2}\.\d{2})/) || [])[1] || `v${i + 1}`,
        value: brlShort(cpcOf(c)),
        v: maxCpc > 0 ? (cpcOf(c)! / maxCpc) : 0,
        hot: i === trendFam.length - 1 && cheaper,
      })),
      chartCaption: `Custo por ${noun} nas ${trendFam.length} versões da linha`,
    });
    if (cheaper) recs.push({ title: `Manter o formato mais recente da linha "${famName}"`, body: `A versão mais nova tem o menor custo por ${noun} (${brl(last)}). Aprender com ela e evitar reativar as versões antigas mais caras.` });
  }

  // Saúde de engajamento (CTR)
  const totClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totImp = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const avgCtr = totImp > 0 ? (totClicks / totImp) * 100 : 0;
  insights.push({
    tag: 'Saúde da entrega',
    title: `Engajamento consistente`,
    body: <>O CTR médio ficou em <b>{pct(avgCtr)}</b> com {int(totClicks)} cliques em {int(totImp)} impressões. {avgCtr >= 0.8 ? 'Boa taxa de interesse — há espaço para escalar sem desgaste rápido dos criativos.' : 'Há espaço para testar novos criativos e elevar a taxa de interesse.'}</>,
  });

  recs.push({ title: 'Testar novos criativos e públicos', body: `Abrir 1–2 testes A/B de criativo por semana para diversificar a entrada de ${nounP} e proteger a escala das campanhas principais.` });

  return { insights: insights.slice(0, 4), recs: recs.slice(0, 4) };
}

// ── Sub-componentes visuais ──
const Page: React.FC<{ children: React.ReactNode; pad?: number }> = ({ children, pad = 60 }) => (
  <div data-report-page style={{ width: 794, minHeight: 1123, height: 1123, background: '#ffffff', boxSizing: 'border-box', padding: pad, fontFamily: 'Inter, -apple-system, Helvetica, Arial, sans-serif', color: C.ink, position: 'relative', overflow: 'hidden' }}>
    {children}
  </div>
);

const SectionHead: React.FC<{ num: string; title: string; badge?: string }> = ({ num, title, badge = 'GRAPE MÍDIA' }) => (
  <>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
        <span style={{ color: C.purpleL }}>{num}.</span> <span style={{ color: C.ink }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.faint, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em' }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: `linear-gradient(135deg, ${C.purpleL}, ${C.purple})` }} />
        {badge}
      </div>
    </div>
    <div style={{ height: 3, background: `linear-gradient(90deg, ${C.purple}, ${C.track})`, borderRadius: 2, marginTop: 14 }} />
  </>
);

const Footer: React.FC<{ left: string }> = ({ left }) => (
  <div style={{ position: 'absolute', left: 60, right: 60, bottom: 34, display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: C.faint, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
    <span>{left}</span><span>Grape Mídia · Marketing Jurídico</span>
  </div>
);

const KpiBox: React.FC<{ label: string; value: string; sub: string; hot?: boolean }> = ({ label, value, sub, hot }) => (
  <div style={{
    border: hot ? 'none' : `1px solid ${C.line}`, borderRadius: 14, padding: '18px 20px',
    background: hot ? `linear-gradient(135deg, ${C.purple}, ${C.purpleD})` : '#fff', minHeight: 118, boxSizing: 'border-box',
  }}>
    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em', color: hot ? 'rgba(255,255,255,0.75)' : C.faint }}>{label}</div>
    <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 8, color: hot ? '#fff' : C.ink }}>{value}</div>
    <div style={{ fontSize: 11, marginTop: 6, color: hot ? 'rgba(255,255,255,0.7)' : C.mut }}>{sub}</div>
  </div>
);

const HBar: React.FC<{ label: string; v: number; value: string; hot?: boolean }> = ({ label, v, value, hot }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
    <div style={{ width: 118, fontSize: 9.5, color: C.mut, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
    <div style={{ flex: 1, height: 15, background: C.track, borderRadius: 8, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max(4, v * 100)}%`, background: hot === false ? C.track : `linear-gradient(90deg, ${C.purpleL}, ${C.purple})`, borderRadius: 8 }} />
    </div>
    <div style={{ width: 58, fontSize: 10, fontWeight: 700, color: C.ink }}>{value}</div>
  </div>
);

// ── Documento ──
const MetaAdsReport = React.forwardRef<HTMLDivElement, { data: MetaReportData }>(({ data }, ref) => {
  const { partnerName, range, kpis, campaigns } = data;
  const isPM = (kpis?.primary_metric || 'messages') === 'messages';
  const noun = isPM ? 'conversa' : 'lead';
  const nounP = isPM ? 'conversas' : 'leads';
  const convTitle = isPM ? 'Conversas iniciadas' : 'Leads gerados';
  const convOf = (c: Campaign) => (isPM ? c.messages : c.leads) || 0;

  const totalConv = isPM ? (kpis?.messages || 0) : (kpis?.leads || 0);
  const spend = kpis?.spend || 0;
  const cpr = kpis?.cost_per_result ?? (totalConv > 0 ? spend / totalConv : 0);
  const periodChip = `${dm(range.start)} — ${dm(range.end)} ${yearOf(range.end)}`;
  const footerLeft = `${partnerName} · Relatório de Performance`;

  const sorted = [...campaigns].sort((a, b) => convOf(b) - convOf(a));
  const tableRows = sorted.slice(0, 8);
  const maxConv = Math.max(1, ...sorted.map(convOf));
  const cpcCamps = sorted.filter(c => convOf(c) > 0 && c.cost_per_result != null);
  const maxCpc = Math.max(1, ...cpcCamps.map(c => c.cost_per_result!));

  // Criativos com desempenho (imagem via proxy same-origin p/ rasterizar)
  const creatives = [...(data.creatives || [])]
    .filter(c => ((isPM ? c.messages : c.leads) || 0) > 0 || (c.spend || 0) > 0)
    .sort((a, b) => ((isPM ? b.messages : b.leads) || 0) - ((isPM ? a.messages : a.leads) || 0) || (b.spend || 0) - (a.spend || 0))
    .slice(0, 11);
  const hasCr = creatives.length > 0;

  // Resultados por estado (região) — página 04, condicional
  const regionsAll = [...(data.regions || [])].sort((a, b) => (b.spend || 0) - (a.spend || 0));
  const regions = regionsAll.slice(0, 18);
  const hasRegions = regions.length > 0;
  const regionHasConv = regions.some(r => ((isPM ? r.messages : r.leads) || 0) > 0);

  return (
    <div ref={ref} style={{ position: 'fixed', left: -99999, top: 0, width: 794, background: '#fff' }}>
      {/* ══ PÁGINA 1 — CAPA ══ */}
      <div data-report-page style={{ width: 794, height: 1123, boxSizing: 'border-box', position: 'relative', overflow: 'hidden', fontFamily: 'Inter, -apple-system, Helvetica, Arial, sans-serif', background: `linear-gradient(150deg, #3b1178 0%, ${C.purpleD} 45%, ${C.purple} 100%)` }}>
        <div style={{ position: 'absolute', top: -120, right: -120, width: 420, height: 420, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -160, left: -100, width: 360, height: 360, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', inset: 0, padding: 72, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
          <div style={{ width: 96, height: 96, borderRadius: 22, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logobranca.png" crossOrigin="anonymous" style={{ width: 62, height: 62, objectFit: 'contain' }} />
          </div>

          <div style={{ marginTop: 'auto' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', color: 'rgba(255,255,255,0.62)' }}>RELATÓRIO DE PERFORMANCE · MÍDIA PAGA</div>
            <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.03em', color: '#fff', marginTop: 14, lineHeight: 1.02 }}>Campanhas<br />Meta Ads</div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.82)', marginTop: 16, fontWeight: 500 }}>
              Facebook &amp; Instagram — {isPM ? 'Objetivo de Mensagens (WhatsApp)' : 'Geração de Leads'}
            </div>

            <div style={{ display: 'flex', gap: 14, marginTop: 40, flexWrap: 'wrap' }}>
              {[
                { l: 'CLIENTE', v: partnerName },
                { l: 'PERÍODO', v: periodChip },
                { l: isPM ? 'CONVERSAS GERADAS' : 'LEADS GERADOS', v: int(totalConv) },
                { l: 'INVESTIMENTO', v: brl(spend) },
              ].map((c, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 12, padding: '12px 16px', minWidth: 150 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.6)' }}>{c.l}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 5 }}>{c.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 40, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.14)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.62)' }}>
            <span>Elaborado por <b style={{ color: '#fff' }}>Grape Mídia</b> — Especialistas em Marketing Jurídico</span>
            <span>{int(totalConv)} {nounP} · {brl(cpr)} / {noun}</span>
          </div>
        </div>
      </div>

      {/* ══ PÁGINA 2 — RESUMO EXECUTIVO ══ */}
      <Page>
        <SectionHead num="01" title="Resumo Executivo" />
        <p style={{ fontSize: 13, lineHeight: 1.7, color: C.body, marginTop: 22 }}>
          No período de <b>{dmFull(range.start)} a {dmFull(range.end)}</b>, foram veiculadas {campaigns.length} campanha{campaigns.length !== 1 ? 's' : ''} de {isPM ? 'mensagens' : 'geração de leads'} no Facebook e Instagram, gerando <b>{int(totalConv)} {nounP}</b> com potenciais clientes a um custo médio de <b>{brl(cpr)} por {noun}</b>. Abaixo, os indicadores consolidados do período.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 24 }}>
          <KpiBox hot label={(isPM ? 'CONVERSAS INICIADAS' : 'LEADS GERADOS')} value={int(totalConv)} sub={isPM ? 'Contatos via WhatsApp / Messenger' : 'Cadastros gerados no período'} />
          <KpiBox label="INVESTIMENTO TOTAL" value={brl(spend)} sub="Valor aplicado no período" />
          <KpiBox label={`CUSTO POR ${noun.toUpperCase()}`} value={brl(cpr)} sub="Média ponderada" />
          <KpiBox label="IMPRESSÕES" value={int(kpis?.impressions)} sub="Total de exibições dos anúncios" />
          <KpiBox label="CLIQUES" value={int(kpis?.clicks)} sub="Interações nos anúncios" />
          <KpiBox label="CTR MÉDIO" value={pct(kpis?.ctr)} sub="Taxa de cliques por impressão" />
        </div>

        <div style={{ marginTop: 26, background: C.bgSoft, borderLeft: `4px solid ${C.purple}`, borderRadius: 10, padding: '16px 20px' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>Como ler este relatório: </span>
          <span style={{ fontSize: 12.5, lineHeight: 1.65, color: C.body }}>
            {isPM
              ? <>cada “conversa iniciada” representa um lead que abriu uma conversa no WhatsApp/Messenger a partir do anúncio. É o indicador central de captação — quanto menor o custo por conversa, mais eficiente a campanha.</>
              : <>cada “lead” representa um cadastro gerado a partir do anúncio. É o indicador central de captação — quanto menor o custo por lead, mais eficiente a campanha.</>}
          </span>
        </div>
        <Footer left={footerLeft} />
      </Page>

      {/* ══ PÁGINA 3 — DESEMPENHO POR CAMPANHA ══ */}
      <Page>
        <SectionHead num="02" title="Desempenho por Campanha" />
        <p style={{ fontSize: 12.5, lineHeight: 1.6, color: C.body, marginTop: 20, marginBottom: 18 }}>
          Detalhamento das {campaigns.length} campanhas do período, ordenadas por volume de {nounP} {isPM ? 'iniciadas' : 'gerados'}.
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: `linear-gradient(90deg, ${C.purpleD}, ${C.purple})`, color: '#fff' }}>
              <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 9.5, letterSpacing: '0.06em', borderRadius: '8px 0 0 0' }}>CAMPANHA</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 9.5 }}>{isPM ? 'CONV.' : 'LEADS'}</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 9.5 }}>CUSTO/{isPM ? 'CONV' : 'LEAD'}</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 9.5 }}>INVESTIDO</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 9.5 }}>IMPR.</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 9.5 }}>CLIQUES</th>
              <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 9.5, borderRadius: '0 8px 0 0' }}>CTR</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((c, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td style={{ padding: '10px 12px', maxWidth: 230 }}>
                  <div style={{ fontWeight: 700, color: C.ink, fontSize: 10.5, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{short(c.campaign_name)}</div>
                  <div style={{ fontSize: 8.5, color: C.faint, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{c.campaign_name}</div>
                </td>
                <td style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 700, color: C.ink }}>{int(convOf(c))}</td>
                <td style={{ textAlign: 'right', padding: '10px 8px', color: C.body }}>{c.cost_per_result != null ? brl(c.cost_per_result) : '—'}</td>
                <td style={{ textAlign: 'right', padding: '10px 8px', color: C.body }}>{brl(c.spend)}</td>
                <td style={{ textAlign: 'right', padding: '10px 8px', color: C.body }}>{int(c.impressions)}</td>
                <td style={{ textAlign: 'right', padding: '10px 8px', color: C.body }}>{int(c.clicks)}</td>
                <td style={{ textAlign: 'right', padding: '10px 12px', color: C.body }}>{pct(c.ctr)}</td>
              </tr>
            ))}
            <tr style={{ background: C.bgSoft }}>
              <td style={{ padding: '11px 12px', fontWeight: 800, color: C.ink, fontSize: 11, borderRadius: '0 0 0 8px' }}>TOTAL DO PERÍODO</td>
              <td style={{ textAlign: 'right', padding: '11px 8px', fontWeight: 800, color: C.purple }}>{int(totalConv)}</td>
              <td style={{ textAlign: 'right', padding: '11px 8px', fontWeight: 800, color: C.purple }}>{brl(cpr)}</td>
              <td style={{ textAlign: 'right', padding: '11px 8px', fontWeight: 800, color: C.purple }}>{brl(spend)}</td>
              <td style={{ textAlign: 'right', padding: '11px 8px', fontWeight: 800, color: C.purple }}>{int(kpis?.impressions)}</td>
              <td style={{ textAlign: 'right', padding: '11px 8px', fontWeight: 800, color: C.purple }}>{int(kpis?.clicks)}</td>
              <td style={{ textAlign: 'right', padding: '11px 12px', fontWeight: 800, color: C.purple, borderRadius: '0 0 8px 0' }}>{pct(kpis?.ctr)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 26 }}>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{isPM ? 'Conversas' : 'Leads'} por campanha</div>
            <div style={{ fontSize: 10, color: C.faint, marginBottom: 14 }}>Volume de {nounP} no período</div>
            {sorted.slice(0, 5).map((c, i) => (
              <HBar key={i} label={short(c.campaign_name)} v={convOf(c) / maxConv} value={int(convOf(c))} />
            ))}
          </div>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>Custo por {noun}</div>
            <div style={{ fontSize: 10, color: C.faint, marginBottom: 14 }}>Eficiência — quanto menor, melhor</div>
            {cpcCamps.slice(0, 5).map((c, i) => (
              <HBar key={i} label={short(c.campaign_name)} v={c.cost_per_result! / maxCpc} value={brlShort(c.cost_per_result)} />
            ))}
          </div>
        </div>
        <Footer left={footerLeft} />
      </Page>

      {/* ══ PÁGINA — CRIATIVOS (condicional) ══ */}
      {hasCr && (
        <Page>
          <SectionHead num="03" title="Criativos por Desempenho" />
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: C.body, marginTop: 20, marginBottom: 16 }}>
            Anúncios ordenados por volume de {nounP} {isPM ? 'iniciadas' : 'gerados'}. A imagem é a prévia do criativo veiculado.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: `linear-gradient(90deg, ${C.purpleD}, ${C.purple})`, color: '#fff' }}>
                <th style={{ textAlign: 'left', padding: '9px 12px', fontSize: 9.5, borderRadius: '8px 0 0 0' }} colSpan={2}>CRIATIVO</th>
                <th style={{ textAlign: 'right', padding: '9px 8px', fontSize: 9.5 }}>{isPM ? 'CONV.' : 'LEADS'}</th>
                <th style={{ textAlign: 'right', padding: '9px 8px', fontSize: 9.5 }}>CLIQUES</th>
                <th style={{ textAlign: 'right', padding: '9px 8px', fontSize: 9.5 }}>IMPR.</th>
                <th style={{ textAlign: 'right', padding: '9px 8px', fontSize: 9.5 }}>CTR</th>
                <th style={{ textAlign: 'right', padding: '9px 8px', fontSize: 9.5 }}>CUSTO/{isPM ? 'CONV' : 'LEAD'}</th>
                <th style={{ textAlign: 'right', padding: '9px 12px', fontSize: 9.5, borderRadius: '0 8px 0 0' }}>INVESTIDO</th>
              </tr>
            </thead>
            <tbody>
              {creatives.map((c, i) => {
                const conv = (isPM ? c.messages : c.leads) || 0;
                const cpc = conv > 0 ? c.spend / conv : null;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ padding: '8px 0 8px 12px', width: 46 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: C.bgSoft2, overflow: 'hidden', border: `1px solid ${C.line}` }}>
                        {c.thumbnail_url ? <img src={c.thumbnail_url} style={{ width: 40, height: 40, objectFit: 'cover', display: 'block' }} /> : null}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', maxWidth: 180 }}>
                      <div style={{ fontWeight: 700, color: C.ink, fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 175 }}>{(c.ad_name || '').replace(/^[^0-9A-Za-zÀ-ÿ]+/, '').trim() || 'Sem nome'}</div>
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px', fontWeight: 700, color: C.ink }}>{int(conv)}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: C.body }}>{int(c.clicks)}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: C.body }}>{int(c.impressions)}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: C.body }}>{pct(c.ctr)}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: C.body }}>{cpc != null ? brl(cpc) : '—'}</td>
                    <td style={{ textAlign: 'right', padding: '8px 12px', color: C.body }}>{brl(c.spend)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(data.creatives?.length || 0) > creatives.length && (
            <p style={{ fontSize: 10, color: C.faint, marginTop: 12 }}>+ {(data.creatives!.length - creatives.length)} outros criativos com menor volume no período.</p>
          )}
          <Footer left={footerLeft} />
        </Page>
      )}

      {/* ══ PÁGINA — RESULTADOS POR ESTADO (condicional) ══ */}
      {hasRegions && (
        <Page>
          <SectionHead num={hasCr ? '04' : '03'} title="Resultados por Estado" />
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: C.body, marginTop: 20, marginBottom: 16 }}>
            Distribuição geográfica do investimento no período, ordenada por valor investido.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: `linear-gradient(90deg, ${C.purpleD}, ${C.purple})`, color: '#fff' }}>
                <th style={{ textAlign: 'left', padding: '9px 12px', fontSize: 9.5, borderRadius: '8px 0 0 0' }}>ESTADO</th>
                {regionHasConv && <th style={{ textAlign: 'right', padding: '9px 8px', fontSize: 9.5 }}>{isPM ? 'CONV.' : 'LEADS'}</th>}
                <th style={{ textAlign: 'right', padding: '9px 8px', fontSize: 9.5 }}>CLIQUES</th>
                <th style={{ textAlign: 'right', padding: '9px 8px', fontSize: 9.5 }}>IMPR.</th>
                <th style={{ textAlign: 'right', padding: '9px 8px', fontSize: 9.5 }}>CTR</th>
                <th style={{ textAlign: 'right', padding: '9px 12px', fontSize: 9.5, borderRadius: '0 8px 0 0' }}>INVESTIDO</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((r, i) => {
                const conv = (isPM ? r.messages : r.leads) || 0;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.line}` }}>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: C.ink }}>{r.region}</td>
                    {regionHasConv && <td style={{ textAlign: 'right', padding: '9px 8px', fontWeight: 700, color: C.ink }}>{int(conv)}</td>}
                    <td style={{ textAlign: 'right', padding: '9px 8px', color: C.body }}>{int(r.clicks)}</td>
                    <td style={{ textAlign: 'right', padding: '9px 8px', color: C.body }}>{int(r.impressions)}</td>
                    <td style={{ textAlign: 'right', padding: '9px 8px', color: C.body }}>{pct(r.ctr)}</td>
                    <td style={{ textAlign: 'right', padding: '9px 12px', color: C.body }}>{brl(r.spend)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {regionsAll.length > regions.length && (
            <p style={{ fontSize: 10, color: C.faint, marginTop: 12 }}>+ {regionsAll.length - regions.length} outros estados com menor investimento no período.</p>
          )}
          <Footer left={footerLeft} />
        </Page>
      )}

    </div>
  );
});

MetaAdsReport.displayName = 'MetaAdsReport';
export default MetaAdsReport;
