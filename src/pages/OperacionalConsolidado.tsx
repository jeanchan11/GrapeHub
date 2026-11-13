import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Briefcase, CheckCircle2, AlertTriangle, DollarSign, Users, RefreshCw, ShieldAlert, UserMinus, TrendingDown, Calendar, UserX, LayoutDashboard } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import SplitHeadline from '../components/SplitHeadline';
import ThemedDropdown from '../components/ui/ThemedDropdown';
import { Anel, BarrasDoKpi, Cartao, CartaoKpi, DivisaoDoKpi, LinhaComBolinha, LinhaDoKpi, LinhasNoTempo, ListaDeBarras } from '../components/graficos';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProjectRow {
  id: string;
  partner: string;
  status: string;
  investment: string;
  projectResult?: string;
  squad?: string;
  responsible: string;
  page_id?: string;
  churnChecklist?: Record<string, boolean>;
}
interface ClientRow {
  id: string;
  name: string;
  status: string; // 'Ativo' | 'Inativo'
  squad?: string;
  tags?: string;
}

// ── Result colors (same map used across the app) ──────────────────────────────
const RESULT_COLOR_MAP: Record<string, string> = {
  'resultado ok': '#2ecc8f',
  'resultado ruim': '#f74c4c',
  'resultado bom': '#059669',   // verde fechado — Bom é melhor que Ok, que usa o menta #2ecc8f
  'campanha pausada': '#f5c842',
  'testando': '#4c8ef7',
  'aguardando criativos': '#94a3b8',
  'aguardando artigo': '#94a3b8',
  'aguardando lp': '#94a3b8',
  'subir campanha': '#f97316',
  '-': '#475569',
};
const getResultColor = (label?: string | null) =>
  !label ? '#475569' : (RESULT_COLOR_MAP[label.toLowerCase()] || '#64748b');

const prettyResult = (label: string) =>
  label === '-' ? 'Sem resultado' : label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseCurrency = (s?: string): number => {
  if (!s) return 0;
  const clean = String(s).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.');
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
};
const fmtBRL = (n: number) =>
  `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const RODANDO = new Set(['operacional', 'ativo', 'active', 'rodando']);
const isRodando = (p: ProjectRow) => RODANDO.has((p.status || '').toLowerCase());
const isGargalo = (p: ProjectRow) =>
  (p.status || '').toLowerCase() === 'gargalo' || (p.projectResult || '').toLowerCase() === 'gargalo';
const resultOf = (p: ProjectRow) => (p.projectResult || '-').toLowerCase();

const parseTags = (t?: string): string[] => {
  try { return Array.isArray(t) ? t : JSON.parse(t || '[]'); } catch { return []; }
};

interface SquadStat {
  squad: string;
  total: number;
  rodando: number;
  gargalo: number;
  ruim: number;
  investment: number;
  results: { label: string; count: number; color: string }[];
}

// ── Small UI bits ─────────────────────────────────────────────────────────────
const KpiCard = ({ icon, accent, label, value, sub, subColor }: {
  icon: React.ReactNode; accent: string; label: string; value: string; sub?: string; subColor?: string;
}) => (
  <div className="bg-dark-card border border-white/10 rounded-2xl px-4 py-3 flex flex-col gap-2 hover:border-white/20 transition-all">
    <div className="flex items-center justify-between">
      <div className={`p-1.5 rounded-lg ${accent}`}>{icon}</div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
    <div>
      <p className="text-2xl font-black text-dark-text tracking-tight leading-tight">{value}</p>
      {sub && <p className={`text-[11px] mt-0.5 font-semibold ${subColor || 'text-slate-500'}`}>{sub}</p>}
    </div>
  </div>
);

// Stacked thin bar showing the result distribution of a squad
const ResultBar = ({ results, total }: { results: SquadStat['results']; total: number }) => (
  <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-white/5">
    {total === 0
      ? <div className="w-full bg-white/5" />
      : results.map(r => (
          <div key={r.label} title={`${prettyResult(r.label)}: ${r.count}`}
            style={{ width: `${(r.count / total) * 100}%`, background: r.color }} />
        ))}
  </div>
);

const SQUAD_ACCENT: Record<string, string> = {
  Able: '#2dd4bf',
  Baker: '#a78bfa',
};


// ── Churn ─────────────────────────────────────────────────────────────────────
export interface ChurnRow {
  id: number;
  cliente: string;
  day_exit: string;
  tipo: string | null;       // EVITÁVEL | INEVITÁVEL
  gestor: string | null;
  ltv: string | null;        // days
  squad: string | null;
  motivo: string | null;
}

const monthKey = (d?: string) => String(d || '').slice(0, 7); // 'YYYY-MM'

export const ChurnTab = ({ churns, activeCount }: { churns: ChurnRow[]; activeCount: number }) => {
  const now = new Date();
  // last 12 months
  const months: { key: string; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    });
  }
  const countByMonth: Record<string, number> = {};
  const byGestor: Record<string, number> = {};
  let ltvSum = 0, ltvCount = 0;
  let evitavel = 0, inevitavel = 0;
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYear = String(now.getFullYear());
  const currentMonthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  for (const c of churns) {
    const mk = monthKey(c.day_exit);
    countByMonth[mk] = (countByMonth[mk] || 0) + 1;
    // Ranking por gestor considera apenas o mês atual
    if (mk === currentKey) {
      const g = (c.gestor && c.gestor.trim()) ? c.gestor : 'Sem gestor';
      byGestor[g] = (byGestor[g] || 0) + 1;
    }
    const ltv = parseInt(String(c.ltv || ''), 10);
    if (!isNaN(ltv)) { ltvSum += ltv; ltvCount++; }
    const t = (c.tipo || '').toUpperCase();
    if (t.includes('INEVIT')) inevitavel++; else if (t.includes('EVIT')) evitavel++;
  }

  // Taxa de churn por mês = churns do mês ÷ base ativa no início do mês.
  // Base estimada = clientes ativos hoje + churns desse mês em diante (que estavam ativos então).
  const lineData = months.map((m, i) => {
    const churnsM = countByMonth[m.key] || 0;
    const churnsFromHere = months.slice(i).reduce((a, mm) => a + (countByMonth[mm.key] || 0), 0);
    const base = activeCount + churnsFromHere;
    const taxa = base > 0 ? +((churnsM / base) * 100).toFixed(1) : 0;
    return { mes: m.label, taxa, churns: churnsM };
  });
  const currentMonthTotal = countByMonth[currentKey] || 0;
  const prevKey = months[months.length - 2]?.key;
  const prevMonthTotal = prevKey ? (countByMonth[prevKey] || 0) : 0;
  const yearTotal = churns.filter(c => monthKey(c.day_exit).startsWith(currentYear)).length;
  const avgLtv = ltvCount > 0 ? Math.round(ltvSum / ltvCount) : 0;
  const totalTyped = evitavel + inevitavel;
  const evitavelPct = totalTyped > 0 ? Math.round((evitavel / totalTyped) * 100) : 0;

  const gestorItems = Object.entries(byGestor).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  const monthDelta = currentMonthTotal - prevMonthTotal;
  const taxaAtual = lineData[lineData.length - 1]?.taxa ?? 0;
  const taxaTxt = (t: number) => `${String(t).replace('.', ',')}%`;

  return (
    <div className="space-y-5">
      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CartaoKpi
          titulo="Churns no mês"
          pilula={`${taxaTxt(taxaAtual)} da base`}
          alerta={monthDelta > 0}
          valor={currentMonthTotal}
          apoio={<span className={monthDelta > 0 ? 'text-rose-500' : monthDelta < 0 ? 'text-emerald-500' : ''}>{monthDelta === 0 ? 'Igual ao mês anterior' : `${monthDelta > 0 ? '+' : ''}${monthDelta} vs mês anterior`}</span>}
          visual={<BarrasDoKpi valores={lineData.map(m => m.churns)} rotulos={lineData.map(m => m.mes)} unidade="saídas" />}
        />
        <CartaoKpi
          titulo={`Churns em ${currentYear}`}
          valor={yearTotal}
          apoio={`Média de ${(yearTotal / (now.getMonth() + 1)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} por mês`}
        />
        <CartaoKpi
          titulo="LTV médio"
          pilula={`${avgLtv} dias`}
          valor={`${(avgLtv / 30).toFixed(1).replace('.', ',')} meses`}
          apoio="Tempo de casa de quem saiu"
        />
        <CartaoKpi
          titulo="Evitáveis"
          pilula={`${totalTyped} classificados`}
          alerta={evitavelPct >= 50}
          valor={`${evitavelPct}%`}
          apoio="Saídas que dava para segurar"
          visual={totalTyped > 0 && (
            <DivisaoDoKpi partes={[
              { rotulo: 'Evitável', valor: evitavel, cor: '#f59e0b' },
              { rotulo: 'Inevitável', valor: inevitavel, cor: '#94a3b8' },
            ]} />
          )}
        />
      </div>

      {/* Saídas por mês + por gestor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Cartao titulo="Churns por mês" legenda="Saídas dos últimos 12 meses · passe o mouse para ver a taxa sobre a base" className="lg:col-span-8">
          <div className="h-[260px]">
            <LinhasNoTempo
              id="churn-mes"
              suave={0}
              marcasX={12}
              rotulos={lineData.map(m => m.mes)}
              formato={n => String(Math.round(n))}
              series={[{ rotulo: 'Saídas', cor: '#f43f5e', valores: lineData.map(m => m.churns), detalhe: i => `${taxaTxt(lineData[i].taxa)} da base` }]}
            />
          </div>
        </Cartao>
        <Cartao titulo="Churn por gestor" legenda={<span className="capitalize">Saídas em {currentMonthLabel}</span>} className="lg:col-span-4">
          {gestorItems.length === 0 ? (
            <p className="py-10 text-center text-[12.5px] text-emerald-500">Nenhuma saída neste mês.</p>
          ) : (
            <ListaDeBarras itens={gestorItems.map(g => ({ rotulo: g.label, valor: g.count, cor: '#f43f5e' }))} limite={8} />
          )}
        </Cartao>
      </div>

      {/* Saídas recentes */}
      <Cartao titulo="Saídas recentes" legenda="Últimos 12 churns registrados">
        {churns.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-slate-500">Nenhuma saída registrada.</p>
        ) : (
          <div className="-mx-2.5 grid grid-cols-1 md:grid-cols-2 gap-x-6">
            {churns.slice(0, 12).map(c => {
              const t = (c.tipo || '').toUpperCase();
              const evit = !t.includes('INEVIT') && t.includes('EVIT');
              return (
                <LinhaComBolinha
                  key={c.id}
                  cor={c.tipo ? (evit ? '#f59e0b' : '#94a3b8') : '#64748b'}
                  titulo={c.cliente}
                  dica={c.motivo || c.cliente}
                  detalhe={[c.gestor, c.tipo ? (evit ? 'Evitável' : 'Inevitável') : null, c.ltv ? `${c.ltv} dias de casa` : null].filter(Boolean).join(' · ') || undefined}
                  valor={c.day_exit ? new Date(String(c.day_exit).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : '—'}
                />
              );
            })}
          </div>
        )}
      </Cartao>
    </div>
  );
};

// ── Risco de Churn ────────────────────────────────────────────────────────────
// Espelha o template de ProjectsModule.tsx (ids estáveis). Mantido local p/ desacoplar.
const CHURN_TEMPLATE: { group: string; cat: string; items: { id: string; label: string }[] }[] = [
  { group: 'Insatisfação', cat: 'insat', items: [
    { id: 'insat_volume', label: 'Volume de leads' },
    { id: 'insat_qualidade', label: 'Qualidade de leads' },
    { id: 'insat_contratos', label: 'Contratos fechados' },
    { id: 'insat_crm', label: 'Erro de CRM' },
    { id: 'insat_ia', label: 'Erro de IA' },
  ]},
  { group: 'Aderência', cat: 'ader', items: [
    { id: 'ader_semresposta', label: 'Não responde grupo' },
    { id: 'ader_naoatende', label: 'Não atende leads' },
    { id: 'ader_naocrm', label: 'Não usa o CRM' },
    { id: 'ader_sugestoes', label: 'Baixa aderência a sugestões' },
    { id: 'ader_noshow', label: 'No-show em reuniões' },
  ]},
  { group: 'Problemas internos', cat: 'int', items: [
    { id: 'int_operacional', label: 'Problemas operacionais' },
    { id: 'int_atraso', label: 'Atraso no pagamento' },
    { id: 'int_financeiro', label: 'Problema financeiro' },
  ]},
  { group: 'Plataforma', cat: 'plat', items: [
    { id: 'plat_pausa', label: 'Pausa constante' },
    { id: 'plat_bloqueios', label: 'Bloqueios (BM/WhatsApp/Redes)' },
  ]},
];
const CHURN_TOTAL = CHURN_TEMPLATE.reduce((n, g) => n + g.items.length, 0);
const CHURN_LABELS: Record<string, { label: string; cat: string }> = {};
for (const g of CHURN_TEMPLATE) for (const it of g.items) CHURN_LABELS[it.id] = { label: it.label, cat: g.cat };
const CAT_COLOR: Record<string, string> = { insat: '#f43f5e', ader: '#f59e0b', int: '#fb923c', plat: '#a78bfa' };

const churnCount = (p: ProjectRow): number =>
  CHURN_TEMPLATE.reduce((n, g) => n + g.items.filter(it => p.churnChecklist?.[it.id]).length, 0);
const churnRisk = (c: number): { label: string; hex: string } =>
  c === 0 ? { label: 'Sem sinais', hex: '#10b981' }
  : c <= 3 ? { label: 'Baixo', hex: '#84cc16' }
  : c <= 6 ? { label: 'Médio', hex: '#f59e0b' }
  : { label: 'Alto', hex: '#f43f5e' };

interface ChurnSnap { series: { date: string; comSinais: number; emRisco: number; alto: number; totalSinais: number }[]; baseline: Record<string, number>; }

type HeadOption = { id: string; name: string; picture?: string | null };

export const RiscoDeChurnTab = ({ projects, heads = [] }: { projects: ProjectRow[]; heads?: HeadOption[] }) => {
  // Filtro por Head de Operações. A atribuição é pela página de projetos do head
  // (page_id) — o mesmo critério usado na Visão Geral.
  const [headFilter, setHeadFilter] = useState<string>('all');
  const [snap, setSnap] = useState<ChurnSnap | null>(null);
  // Faixa escolhida no anel — filtra a watchlist
  const [faixa, setFaixa] = useState<string | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [verTodos, setVerTodos] = useState(false);

  const projectsOf = (headId: string) =>
    headId === 'all' ? projects : projects.filter(p => p.page_id === headId);

  // Série do gráfico e baseline seguem o head selecionado.
  useEffect(() => {
    let alive = true;
    const ids = headFilter === 'all' ? null : projectsOf(headFilter).map(p => p.id);
    const q = ids && ids.length > 0 ? `&projects=${encodeURIComponent(ids.join(','))}` : '';
    fetch(`/api/churn-snapshots?days=90${q}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive) setSnap(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [headFilter, projects]);

  const fp = projectsOf(headFilter);

  const total = fp.length;
  const rows = fp.map(p => ({ p, count: churnCount(p) })).sort((a, b) => b.count - a.count);
  const withSignals = rows.filter(r => r.count >= 1);
  const emRisco = rows.filter(r => r.count >= 4);      // Médio + Alto
  const alto = rows.filter(r => r.count >= 7);
  const rAtRisco = emRisco.reduce((a, r) => a + parseCurrency(r.p.investment), 0);
  const buckets = [
    { key: 'sem', label: 'Sem sinais', hex: '#10b981', n: rows.filter(r => r.count === 0).length },
    { key: 'baixo', label: 'Baixo', hex: '#84cc16', n: rows.filter(r => r.count >= 1 && r.count <= 3).length },
    { key: 'medio', label: 'Médio', hex: '#f59e0b', n: rows.filter(r => r.count >= 4 && r.count <= 6).length },
    { key: 'alto', label: 'Alto', hex: '#f43f5e', n: alto.length },
  ];
  const faixaDe = (c: number) => c === 0 ? 'sem' : c <= 3 ? 'baixo' : c <= 6 ? 'medio' : 'alto';

  // Deltas vs baseline (~7 dias). Só mostra quando já há histórico com 7+ dias.
  const baseline = snap?.baseline || {};
  const hasBaseline = Object.keys(baseline).length > 0;
  const baseEmRisco = fp.filter(p => (baseline[p.id] ?? 0) >= 4).length;
  const baseAlto = fp.filter(p => (baseline[p.id] ?? 0) >= 7).length;
  const dEmRisco = emRisco.length - baseEmRisco;
  const dAlto = alto.length - baseAlto;

  const series = snap?.series || [];
  const trendReady = series.length >= 2;
  const rotuloDia = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  const deltaTxt = (d: number) => d === 0 ? 'estável na semana' : d > 0 ? `+${d} na semana` : `${d} na semana`;
  const deltaColor = (d: number) => d > 0 ? 'text-rose-500' : d < 0 ? 'text-emerald-500' : '';

  const lista = faixa ? rows.filter(r => faixaDe(r.count) === faixa) : withSignals;
  const faixaAtual = buckets.find(b => b.key === faixa);

  return (
    <div className="space-y-5">
      {/* Filtro por Head de Operações — mesmo desenho dos botões da Visão Geral */}
      <div className="flex flex-wrap gap-3">
        {[{ id: 'all', name: 'Todos', picture: null as string | null }, ...heads].map(h => {
          const active = headFilter === h.id;
          const n = projectsOf(h.id).length;
          const firstName = h.id === 'all' ? h.name : String(h.name).trim().split(/\s+/)[0];
          return (
            <button key={h.id} onClick={() => setHeadFilter(h.id)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all ${
                active
                  ? 'bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/30 shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                  : 'bg-white dark:bg-dark-card border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
              <span className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 border border-slate-200 dark:border-white/10">
                {h.picture
                  ? <img src={h.picture} alt={firstName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  : <Users size={14} />}
              </span>
              <span className="text-left">
                <span className={`block text-sm font-bold leading-tight ${active ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-white'}`}>{firstName}</span>
                <span className="block text-[10px] uppercase tracking-widest text-slate-500">{n} parceiros</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CartaoKpi
          titulo="Parceiros em risco"
          pilula="Médio + Alto"
          valor={emRisco.length}
          apoio={hasBaseline ? <span className={deltaColor(dEmRisco)}>{deltaTxt(dEmRisco)}</span> : '4 ou mais sinais'}
          visual={trendReady && <LinhaDoKpi id="em-risco" cor="#f59e0b" valores={series.map(s => s.emRisco)} rotulos={series.map(s => rotuloDia(s.date))} formato={v => `${v} parceiros`} />}
        />
        <CartaoKpi
          titulo="Risco alto"
          pilula="7+ sinais"
          alerta={alto.length > 0}
          valor={alto.length}
          apoio={hasBaseline ? <span className={deltaColor(dAlto)}>{deltaTxt(dAlto)}</span> : 'Parceiros com 7 ou mais sinais'}
          visual={trendReady && <LinhaDoKpi id="risco-alto" cor="#f43f5e" valores={series.map(s => s.alto)} rotulos={series.map(s => rotuloDia(s.date))} formato={v => `${v} parceiros`} />}
        />
        <CartaoKpi
          titulo="Verba em risco"
          pilula="por mês"
          valor={fmtBRL(rAtRisco)}
          apoio="Investimento dos parceiros Médio + Alto"
        />
        <CartaoKpi
          titulo="Base com sinais"
          pilula={`${withSignals.length} de ${total}`}
          valor={total > 0 ? `${Math.round((withSignals.length / total) * 100)}%` : '—'}
          apoio="Parceiros com ao menos 1 sinal"
          visual={total > 0 && <DivisaoDoKpi partes={buckets.map(b => ({ rotulo: b.label, valor: b.n, cor: b.hex }))} />}
        />
      </div>

      {/* Distribuição + Evolução */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Cartao titulo="Distribuição de risco" legenda="Clique numa faixa para filtrar a lista abaixo" className="lg:col-span-5">
          <div className="h-[240px]">
            <Anel
              segmentos={buckets.filter(b => b.n > 0).map(b => ({ rotulo: b.label, valor: b.n, cor: b.hex, chave: b.key }))}
              centro={total}
              legendaDoCentro="parceiros"
              aoClicar={k => setFaixa(faixa === k ? null : k)}
            />
          </div>
        </Cartao>
        <Cartao titulo="Evolução do risco" legenda="Parceiros em risco (Médio + Alto) e em risco alto, dia a dia" className="lg:col-span-7">
          {trendReady ? (
            <div className="h-[260px]">
              <LinhasNoTempo
                id="risco"
                suave={2}
                rotulos={series.map(s => rotuloDia(s.date))}
                formato={n => String(Math.round(n))}
                series={[
                  { rotulo: 'Em risco', cor: '#f59e0b', valores: series.map(s => s.emRisco) },
                  { rotulo: 'Alto', cor: '#f43f5e', valores: series.map(s => s.alto) },
                ]}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center gap-2 py-12 text-slate-500">
              <TrendingDown size={30} className="opacity-30" />
              <p className="text-sm font-medium text-slate-400">Começamos a registrar o risco hoje.</p>
              <p className="text-xs">O gráfico de evolução aparece assim que houver alguns dias de histórico.</p>
            </div>
          )}
        </Cartao>
      </div>

      {/* Watchlist — uma linha por parceiro; os sinais viram uma régua de 15 casas por categoria.
          Clicar na linha abre os sinais por nome. */}
      <Cartao
        titulo={faixaAtual ? `Watchlist — risco ${faixaAtual.label.toLowerCase()}` : 'Watchlist — agir agora'}
        legenda={faixaAtual ? `${lista.length} parceiro(s) nesta faixa` : `${withSignals.length} parceiro(s) com sinais, do maior risco para o menor`}
        acao={faixa ? <button onClick={() => setFaixa(null)} className="text-[12px] text-slate-400 hover:text-dark-text">Ver todos</button> : undefined}
      >
        {lista.length === 0 ? (
          <p className="text-[12.5px] text-emerald-500 text-center py-8">Nenhum parceiro aqui.</p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-slate-500 dark:text-slate-400">
              {CHURN_TEMPLATE.map(g => (
                <span key={g.cat} className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: CAT_COLOR[g.cat] }} />{g.group}</span>
              ))}
            </div>
            <div className="-mx-2.5">
              {(verTodos ? lista : lista.slice(0, 10)).map(({ p, count }) => {
                const risk = churnRisk(count);
                const marked = CHURN_TEMPLATE.flatMap(g => g.items).filter(it => p.churnChecklist?.[it.id]);
                const base = baseline[p.id];
                const d = base === undefined || !hasBaseline ? null : count - base;
                const exp = abertoId === p.id;
                return (
                  <div key={p.id} className="border-t border-slate-200/70 first:border-t-0 dark:border-white/5">
                    <button
                      onClick={() => setAbertoId(exp ? null : p.id)}
                      className={`gf-item flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left ${exp ? 'bg-violet-500/5' : 'hover:bg-violet-500/5'}`}
                    >
                      <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: risk.hex, boxShadow: `0 0 0 4px color-mix(in srgb, ${risk.hex} 18%, transparent)` }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-dark-text" title={p.partner}>{p.partner}</span>
                        <span className="block truncate text-[11.5px] text-slate-500 dark:text-slate-400">{p.responsible || 'Sem gestor'} · <span className="numero">{fmtBRL(parseCurrency(p.investment))}</span></span>
                      </span>
                      {/* Régua: 15 casas, agrupadas por categoria; cheia = sinal marcado */}
                      <span className="hidden sm:flex shrink-0 items-center gap-1.5" title={marked.map(m => m.label).join(', ')}>
                        {CHURN_TEMPLATE.map(g => (
                          <span key={g.cat} className="flex gap-[2px]">
                            {g.items.map(it => (
                              <i key={it.id} className="h-3.5 w-1.5 rounded-sm" style={{ background: p.churnChecklist?.[it.id] ? CAT_COLOR[g.cat] : 'rgb(148 163 184 / .18)' }} />
                            ))}
                          </span>
                        ))}
                      </span>
                      <span className="w-[120px] shrink-0 text-right">
                        <span className="numero whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-medium" style={{ color: risk.hex, background: `color-mix(in srgb, ${risk.hex} 12%, transparent)` }}>
                          {count}/{CHURN_TOTAL} · {risk.label}
                        </span>
                      </span>
                      <span className={`numero w-8 shrink-0 text-right text-[11px] ${d ? deltaColor(d) : 'text-slate-400'}`} title="Variação de sinais na semana">
                        {d ? (d > 0 ? `+${d}` : d) : ''}
                      </span>
                    </button>
                    {exp && (
                      <div className="gf-troca flex flex-wrap gap-1 px-2.5 pb-3 pl-[34px]">
                        {marked.map(m => {
                          const c = CAT_COLOR[CHURN_LABELS[m.id]?.cat] || '#64748b';
                          return <span key={m.id} className="rounded-full px-2 py-0.5 text-[10.5px]" style={{ background: `color-mix(in srgb, ${c} 12%, transparent)`, color: c }}>{m.label}</span>;
                        })}
                        <span className="ml-1 inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          · <i className="h-1.5 w-1.5 rounded-full" style={{ background: getResultColor(p.projectResult) }} />{prettyResult(resultOf(p))}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {lista.length > 10 && (
              <button onClick={() => setVerTodos(v => !v)} className="mt-3 self-start text-[12.5px] font-medium text-violet-600 hover:text-violet-500 dark:text-violet-400">
                {verTodos ? 'Mostrar só os 10 primeiros' : `Mostrar todos (${lista.length})`}
              </button>
            )}
          </>
        )}
      </Cartao>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function OperacionalConsolidado() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [churns, setChurns] = useState<ChurnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'geral' | 'churn' | 'risco'>('geral');
  const [selectedGestor, setSelectedGestor] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, cRes, chRes] = await Promise.all([fetch('/api/projects'), fetch('/api/clients'), fetch('/api/churn')]);
      if (!pRes.ok) throw new Error('Falha ao carregar projetos');
      const proj = await pRes.json();
      const cli = cRes.ok ? await cRes.json() : [];
      const ch = chRes.ok ? await chRes.json() : [];
      setProjects(Array.isArray(proj) ? proj : []);
      setClients(Array.isArray(cli) ? cli : []);
      setChurns(Array.isArray(ch) ? ch : []);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
    // Registra o snapshot do risco de hoje (idempotente). A série é buscada dentro da aba (por squad).
    try { await fetch('/api/churn-snapshots/capture', { method: 'POST' }); } catch { /* silencioso */ }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Seletor por gestor ──
  // Opções: "Toda a operação" + cada gestor que tem projeto(s). Ordena por carteira.
  const gestorNames = Array.from(new Set(projects.map(p => (p.responsible || '').trim()).filter(Boolean)));
  const gestorCounts = new Map<string, number>();
  for (const p of projects) { const g = (p.responsible || '').trim(); if (g) gestorCounts.set(g, (gestorCounts.get(g) || 0) + 1); }
  const gestorOptions = [
    { value: 'all', label: 'Toda a operação' },
    ...gestorNames.sort((a, b) => (gestorCounts.get(b)! - gestorCounts.get(a)!) || a.localeCompare(b))
      .map(n => ({ value: n, label: `${n} · ${gestorCounts.get(n)} cliente${gestorCounts.get(n) === 1 ? '' : 's'}` })),
  ];

  // Projetos da visão atual (todos ou filtrados por gestor)
  const viewProjects = selectedGestor === 'all'
    ? projects
    : projects.filter(p => (p.responsible || '').trim() === selectedGestor);

  // Métricas da visão atual
  const total = viewProjects.length;
  const rodando = viewProjects.filter(isRodando).length;
  const gargalo = viewProjects.filter(isGargalo).length;
  const investmentTotal = viewProjects.reduce((a, p) => a + parseCurrency(p.investment), 0);
  const gestoresCount = gestorNames.length;
  const semGestor = projects.filter(p => !(p.responsible || '').trim()).length;

  // Distribuição de resultados da visão atual
  const distCounts: Record<string, number> = {};
  for (const p of viewProjects) { const r = resultOf(p); distCounts[r] = (distCounts[r] || 0) + 1; }
  const resultDist = Object.entries(distCounts)
    .map(([label, count]) => ({ label, count, color: getResultColor(label) }))
    .sort((a, b) => b.count - a.count);

  // Saúde da base (sempre a base completa — churn/retenção são métricas da empresa)
  const cliAtivos = clients.filter(c => c.status === 'Ativo' && !parseTags(c.tags).includes('quarentena'));
  const cliQuarentena = clients.filter(c => c.status === 'Ativo' && parseTags(c.tags).includes('quarentena'));
  const cliChurn = clients.filter(c => c.status === 'Inativo');

  // Radar de atenção da visão atual, ordenado por urgência
  const atencao = viewProjects
    .filter(p => isGargalo(p) || resultOf(p) === 'resultado ruim' || resultOf(p) === 'testando')
    .map(p => ({ p, pri: isGargalo(p) ? 0 : resultOf(p) === 'resultado ruim' ? 1 : 2 }))
    .sort((a, b) => a.pri - b.pri);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-rose-400 font-bold text-lg">Erro ao carregar o painel</p>
        <p className="text-slate-500 text-sm">{error}</p>
        <button onClick={fetchData} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-colors">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg px-6 md:px-8 pt-8 pb-12 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <SplitHeadline text="Dashboard " highlight="Operacional" className="text-3xl font-black tracking-tight text-dark-text" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Visão consolidada do time operacional por gestor e saúde da base de clientes</p>
        </div>
        <button onClick={fetchData} className="w-10 h-10 rounded-xl bg-dark-card border border-white/10 hover:border-violet-500/60 flex items-center justify-center text-slate-400 hover:text-violet-400 transition-all">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/10">
        {([['geral', 'Visão Geral', LayoutDashboard], ['risco', 'Risco de Churn', ShieldAlert], ['churn', 'Churn', UserX]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px ${
              tab === key ? 'border-violet-400 text-violet-400' : 'border-transparent text-slate-500 hover:text-dark-text'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'geral' && (
      <>
      {/* Seletor de visão: toda a operação ou um gestor */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Visão</span>
        <ThemedDropdown
          value={selectedGestor}
          onChange={setSelectedGestor}
          options={gestorOptions}
          className="w-[280px]"
          title="Filtrar por gestor"
        />
        {selectedGestor !== 'all' && (
          <button onClick={() => setSelectedGestor('all')} className="text-[11px] font-semibold text-violet-400 hover:text-violet-300 transition-colors">
            limpar filtro
          </button>
        )}
      </div>

      {/* KPIs (respeitam o seletor) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard icon={<Briefcase size={16} className="text-white" />} accent="bg-violet-600" label="Total Projetos" value={String(total)} sub={selectedGestor === 'all' ? `${gestoresCount} gestor${gestoresCount === 1 ? '' : 'es'}${semGestor > 0 ? ` · ${semGestor} sem gestor` : ''}` : selectedGestor} subColor="text-violet-400" />
        <KpiCard icon={<CheckCircle2 size={16} className="text-white" />} accent="bg-emerald-600" label="Rodando" value={String(rodando)} sub={total > 0 ? `${Math.round((rodando / total) * 100)}% do total` : '—'} subColor="text-emerald-400" />
        <KpiCard icon={<AlertTriangle size={16} className="text-white" />} accent="bg-amber-600" label="Gargalo" value={String(gargalo)} sub={gargalo > 0 ? 'Atenção' : 'Nenhum'} subColor={gargalo > 0 ? 'text-amber-400' : 'text-slate-500'} />
        <KpiCard icon={<DollarSign size={16} className="text-white" />} accent="bg-blue-600" label="Investimento" value={fmtBRL(investmentTotal)} sub={selectedGestor === 'all' ? 'Soma da operação' : 'Carteira do gestor'} subColor="text-blue-400" />
        <KpiCard icon={<Users size={16} className="text-white" />} accent="bg-teal-600" label={selectedGestor === 'all' ? 'Clientes Ativos' : 'Clientes'} value={selectedGestor === 'all' ? String(cliAtivos.length) : String(total)} sub={selectedGestor === 'all' ? `${cliQuarentena.length} em retenção` : 'na carteira'} subColor="text-teal-400" />
      </div>

      {/* Result distribution + Client health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut */}
        <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-dark-text mb-1">Distribuição de Resultados</h2>
          <p className="text-xs text-slate-500 mb-4">{selectedGestor === 'all' ? 'Todos os projetos por resultado atual' : `Projetos de ${selectedGestor} por resultado atual`}</p>
          {total === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">Nenhum projeto encontrado.</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative shrink-0">
                <PieChart width={200} height={200}>
                  <Pie data={resultDist} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none">
                    {resultDist.map((r, i) => <Cell key={i} fill={r.color} />)}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ background: '#14082e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                    formatter={(v: any, n: any) => [v, prettyResult(String(n))]}
                  />
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-dark-text">{total}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Projetos</span>
                </div>
              </div>
              <div className="flex-1 w-full space-y-2">
                {resultDist.map(r => (
                  <div key={r.label} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-xs text-slate-300 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                      <span className="truncate">{prettyResult(r.label)}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-dark-text">{r.count}</span>
                      <span className="text-[10px] text-slate-500 w-9 text-right">{Math.round((r.count / total) * 100)}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Client health */}
        <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-dark-text mb-1">Saúde da Base de Clientes</h2>
          <p className="text-xs text-slate-500 mb-4">Status atual dos clientes do operacional</p>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Ativos', value: cliAtivos.length, color: '#2ecc8f', icon: <CheckCircle2 size={16} /> },
              { label: 'Retenção', value: cliQuarentena.length, color: '#f5c842', icon: <ShieldAlert size={16} /> },
              { label: 'Churn', value: cliChurn.length, color: '#f74c4c', icon: <UserMinus size={16} /> },
            ].map(c => (
              <div key={c.label} className="bg-white/[0.03] border border-white/5 rounded-xl px-3 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg" style={{ background: `${c.color}22`, color: c.color }}>{c.icon}</div>
                </div>
                <p className="text-2xl font-black text-dark-text">{c.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: c.color }}>{c.label}</p>
              </div>
            ))}
          </div>
          {/* Carteira por gestor — nº de clientes (projetos) que cada gestor cuida */}
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Carteira por gestor</p>
          <div className="space-y-2">
            {(() => {
              const items = Array.from(gestorCounts.entries()).sort((a, b) => b[1] - a[1]);
              const maxCarteira = Math.max(1, ...items.map(([, n]) => n));
              if (items.length === 0) return <p className="text-xs text-slate-500 py-1">Sem gestores.</p>;
              return items.map(([name, n]) => (
                <button key={name} onClick={() => setSelectedGestor(name)}
                  className={`w-full flex items-center gap-3 group ${selectedGestor === name ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
                  title={`Ver ${name}`}>
                  <span className={`text-xs font-bold w-28 shrink-0 truncate text-left ${selectedGestor === name ? 'text-violet-400' : 'text-slate-400 group-hover:text-slate-200'}`}>{name}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all bg-violet-500" style={{ width: `${(n / maxCarteira) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-dark-text w-6 text-right">{n}</span>
                </button>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Attention radar */}
      <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-dark-text mb-1">Radar de Atenção</h2>
        <p className="text-xs text-slate-500 mb-4">Projetos críticos do operacional, ordenados por urgência</p>
        {atencao.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-10">Nenhum projeto crítico 🎉</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  <th className="text-left pb-2 pr-2">Parceiro</th>
                  <th className="text-left pb-2 pr-2">Gestor</th>
                  <th className="text-left pb-2 pr-2">Investimento</th>
                  <th className="text-left pb-2">Critério</th>
                </tr>
              </thead>
              <tbody>
                {atencao.map(({ p }) => {
                  const badges: string[] = [];
                  if (isGargalo(p)) badges.push('Gargalo');
                  if (resultOf(p) === 'resultado ruim') badges.push('Resultado Ruim');
                  if (resultOf(p) === 'testando') badges.push('Testando');
                  const badgeColor: Record<string, { bg: string; c: string }> = {
                    'Gargalo': { bg: '#f59e0b22', c: '#f59e0b' },
                    'Resultado Ruim': { bg: '#f74c4c22', c: '#f74c4c' },
                    'Testando': { bg: '#4c8ef722', c: '#4c8ef7' },
                  };
                  return (
                    <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 pr-2 font-bold text-dark-text truncate max-w-[160px]">{p.partner}</td>
                      <td className="py-2.5 pr-2 text-slate-400 truncate max-w-[140px]">{p.responsible || '—'}</td>
                      <td className="py-2.5 pr-2 text-slate-300 font-medium">{fmtBRL(parseCurrency(p.investment))}</td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {badges.map(b => (
                            <span key={b} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: badgeColor[b].bg, color: badgeColor[b].c }}>{b}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {tab === 'risco' && <RiscoDeChurnTab projects={projects} />}

      {tab === 'churn' && <ChurnTab churns={churns} activeCount={clients.filter(c => c.status === 'Ativo').length} />}
    </div>
  );
}
