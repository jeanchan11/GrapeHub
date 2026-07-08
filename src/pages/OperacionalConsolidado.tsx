import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Briefcase, CheckCircle2, AlertTriangle, DollarSign, Users, RefreshCw, ShieldAlert, UserMinus, Layers, TrendingDown, Calendar, UserX, LayoutDashboard } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import SplitHeadline from '../components/SplitHeadline';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProjectRow {
  id: string;
  partner: string;
  status: string;
  investment: string;
  projectResult?: string;
  squad?: string;
  responsible: string;
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
  'resultado bom': '#b84cf7',
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
function squadStats(projects: ProjectRow[], squad: string): SquadStat {
  const list = projects.filter(p => (p.squad || '').toLowerCase() === squad.toLowerCase());
  const counts: Record<string, number> = {};
  for (const p of list) { const r = resultOf(p); counts[r] = (counts[r] || 0) + 1; }
  const results = Object.entries(counts)
    .map(([label, count]) => ({ label, count, color: getResultColor(label) }))
    .sort((a, b) => b.count - a.count);
  return {
    squad,
    total: list.length,
    rodando: list.filter(isRodando).length,
    gargalo: list.filter(isGargalo).length,
    ruim: list.filter(p => resultOf(p) === 'resultado ruim').length,
    investment: list.reduce((a, p) => a + parseCurrency(p.investment), 0),
    results,
  };
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

const SquadCard = ({ s }: { s: SquadStat }) => {
  const accent = SQUAD_ACCENT[s.squad] || '#64748b';
  const rodandoPct = s.total > 0 ? Math.round((s.rodando / s.total) * 100) : 0;
  return (
    <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}22`, color: accent }}>
            <Users size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-dark-text">Squad {s.squad}</p>
            <p className="text-[11px] text-slate-500">{s.total} projeto{s.total === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Investimento</p>
          <p className="text-sm font-black text-dark-text">{fmtBRL(s.investment)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/[0.03] rounded-xl px-2.5 py-2">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Rodando</p>
          <p className="text-base font-black text-emerald-400">{s.rodando} <span className="text-[10px] text-slate-500">({rodandoPct}%)</span></p>
        </div>
        <div className="bg-white/[0.03] rounded-xl px-2.5 py-2">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Gargalo</p>
          <p className={`text-base font-black ${s.gargalo > 0 ? 'text-amber-400' : 'text-dark-text'}`}>{s.gargalo}</p>
        </div>
        <div className="bg-white/[0.03] rounded-xl px-2.5 py-2">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Result. Ruim</p>
          <p className={`text-base font-black ${s.ruim > 0 ? 'text-rose-400' : 'text-dark-text'}`}>{s.ruim}</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Resultados</p>
        <ResultBar results={s.results} total={s.total} />
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {s.results.slice(0, 5).map(r => (
            <span key={r.label} className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
              {prettyResult(r.label)} <span className="font-bold text-slate-300">{r.count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Churn ─────────────────────────────────────────────────────────────────────
interface ChurnRow {
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

const RankBar = ({ items, max, color }: { items: { label: string; count: number }[]; max: number; color?: string }) => {
  const sum = items.reduce((a, i) => a + i.count, 0);
  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-xs text-slate-500 py-2">Sem dados.</p>}
      {items.map(it => {
        const pct = sum > 0 ? Math.round((it.count / sum) * 100) : 0;
        return (
          <div key={it.label} className="flex items-center gap-3" title={`${it.label}: ${it.count} churn${it.count === 1 ? '' : 's'} · ${pct}%`}>
            <span className="text-xs text-slate-300 w-32 shrink-0 truncate">{it.label}</span>
            <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${max > 0 ? (it.count / max) * 100 : 0}%`, background: color || (SQUAD_ACCENT[it.label] || '#f74c4c') }} />
            </div>
            <span className="text-xs font-bold text-dark-text w-7 text-right">{it.count}</span>
            <span className="text-[10px] font-semibold text-slate-500 w-9 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
};

const ChurnTab = ({ churns, activeCount }: { churns: ChurnRow[]; activeCount: number }) => {
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
  const bySquad: Record<string, number> = {};
  const byGestor: Record<string, number> = {};
  let ltvSum = 0, ltvCount = 0;
  let evitavel = 0, inevitavel = 0;
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYear = String(now.getFullYear());
  const currentMonthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  for (const c of churns) {
    const mk = monthKey(c.day_exit);
    countByMonth[mk] = (countByMonth[mk] || 0) + 1;
    // Squad/Gestor rankings consideram apenas o mês atual
    if (mk === currentKey) {
      const sq = c.squad || 'Sem squad';
      bySquad[sq] = (bySquad[sq] || 0) + 1;
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

  const squadItems = Object.entries(bySquad).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  const squadMax = Math.max(1, ...squadItems.map(s => s.count));
  const gestorItems = Object.entries(byGestor).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  const gestorMax = Math.max(1, ...gestorItems.map(s => s.count));

  const monthDelta = currentMonthTotal - prevMonthTotal;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<UserX size={16} className="text-white" />} accent="bg-rose-600" label="Churns no mês" value={String(currentMonthTotal)}
          sub={monthDelta === 0 ? 'igual ao mês anterior' : `${monthDelta > 0 ? '+' : ''}${monthDelta} vs mês anterior`}
          subColor={monthDelta > 0 ? 'text-rose-400' : monthDelta < 0 ? 'text-emerald-400' : 'text-slate-500'} />
        <KpiCard icon={<Calendar size={16} className="text-white" />} accent="bg-violet-600" label={`Churns em ${currentYear}`} value={String(yearTotal)} sub="acumulado no ano" subColor="text-violet-400" />
        <KpiCard icon={<TrendingDown size={16} className="text-white" />} accent="bg-amber-600" label="LTV médio" value={`${(avgLtv / 30).toFixed(1).replace('.', ',')} meses`} sub={`${avgLtv} dias de casa`} subColor="text-amber-400" />
        <KpiCard icon={<ShieldAlert size={16} className="text-white" />} accent="bg-blue-600" label="% Evitável" value={`${evitavelPct}%`} sub={`${evitavel} evit. · ${inevitavel} inevit.`} subColor="text-blue-400" />
      </div>

      {/* Line chart: churns per month */}
      <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-dark-text mb-1">Churns por mês</h2>
        <p className="text-xs text-slate-500 mb-4">Saídas registradas nos últimos 12 meses · passe o mouse para ver a taxa (%)</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={lineData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
            <RechartsTooltip
              contentStyle={{ background: '#14082e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: '#cbd5e1' }}
              formatter={(v: any, _n: any, p: any) => [`${v} churn(s) · ${String(p?.payload?.taxa ?? 0).replace('.', ',')}% da base`, 'Saídas']}
            />
            <Line type="monotone" dataKey="churns" stroke="#f74c4c" strokeWidth={2.5} dot={{ r: 3, fill: '#f74c4c' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* By squad + by gestor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-dark-text mb-1">Churn por Squad</h2>
          <p className="text-xs text-slate-500 mb-4 capitalize">Saídas em {currentMonthLabel}</p>
          <RankBar items={squadItems} max={squadMax} />
        </div>
        <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-dark-text mb-1">Churn por Gestor</h2>
          <p className="text-xs text-slate-500 mb-4 capitalize">Gestores com saídas em {currentMonthLabel}</p>
          <RankBar items={gestorItems} max={gestorMax} color="#f74c4c" />
        </div>
      </div>

      {/* Recent churns */}
      <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-dark-text mb-1">Saídas recentes</h2>
        <p className="text-xs text-slate-500 mb-4">Últimos churns registrados</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[680px]">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                <th className="text-left pb-2 pr-2">Cliente</th>
                <th className="text-left pb-2 pr-2">Squad</th>
                <th className="text-left pb-2 pr-2">Gestor</th>
                <th className="text-left pb-2 pr-2">Tipo</th>
                <th className="text-left pb-2 pr-2">LTV</th>
                <th className="text-left pb-2">Saída</th>
              </tr>
            </thead>
            <tbody>
              {churns.slice(0, 12).map(c => {
                const sqColor = SQUAD_ACCENT[c.squad || ''] || '#64748b';
                const isEvit = (c.tipo || '').toUpperCase().includes('INEVIT') ? false : (c.tipo || '').toUpperCase().includes('EVIT');
                return (
                  <tr key={c.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                    <td className="py-2.5 pr-2 font-bold text-dark-text truncate max-w-[200px]" title={c.cliente}>{c.cliente}</td>
                    <td className="py-2.5 pr-2"><span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${sqColor}22`, color: sqColor }}>{c.squad || '—'}</span></td>
                    <td className="py-2.5 pr-2 text-slate-400 truncate max-w-[140px]">{c.gestor || '—'}</td>
                    <td className="py-2.5 pr-2">
                      {c.tipo
                        ? <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isEvit ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400'}`}>{c.tipo}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-2.5 pr-2 text-slate-300">{c.ltv ? `${c.ltv}d` : '—'}</td>
                    <td className="py-2.5 text-slate-400">{c.day_exit ? new Date(String(c.day_exit).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
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

const RiscoDeChurnTab = ({ projects }: { projects: ProjectRow[] }) => {
  const [squadFilter, setSquadFilter] = useState<'all' | 'Able' | 'Baker'>('all');
  const [snap, setSnap] = useState<ChurnSnap | null>(null);

  // Busca a série por squad (reflete no gráfico de evolução e nos deltas).
  useEffect(() => {
    let alive = true;
    const q = squadFilter === 'all' ? '' : `&squad=${squadFilter}`;
    fetch(`/api/churn-snapshots?days=90${q}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (alive) setSnap(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [squadFilter]);

  const fp = squadFilter === 'all' ? projects : projects.filter(p => (p.squad || '') === squadFilter);
  const squadCounts = {
    all: projects.length,
    Able: projects.filter(p => p.squad === 'Able').length,
    Baker: projects.filter(p => p.squad === 'Baker').length,
  };

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

  // Deltas vs baseline (~7 dias). Só mostra quando já há histórico com 7+ dias.
  const baseline = snap?.baseline || {};
  const hasBaseline = Object.keys(baseline).length > 0;
  const baseEmRisco = fp.filter(p => (baseline[p.id] ?? 0) >= 4).length;
  const baseAlto = fp.filter(p => (baseline[p.id] ?? 0) >= 7).length;
  const dEmRisco = emRisco.length - baseEmRisco;
  const dAlto = alto.length - baseAlto;

  const series = snap?.series || [];
  const trendReady = series.length >= 2;
  const deltaTxt = (d: number) => d === 0 ? 'estável' : d > 0 ? `▲ +${d} vs 7d` : `▼ ${d} vs 7d`;
  const deltaColor = (d: number) => d > 0 ? 'text-rose-400' : d < 0 ? 'text-emerald-400' : 'text-slate-500';

  const squadPills: { key: 'all' | 'Able' | 'Baker'; label: string; accent: string }[] = [
    { key: 'all', label: 'Todos', accent: '#a78bfa' },
    { key: 'Able', label: 'Squad Able', accent: SQUAD_ACCENT.Able },
    { key: 'Baker', label: 'Squad Baker', accent: SQUAD_ACCENT.Baker },
  ];

  return (
    <div className="space-y-6">
      {/* Filtro por squad */}
      <div className="flex flex-wrap items-center gap-3">
        {squadPills.map(pill => {
          const active = squadFilter === pill.key;
          return (
            <button key={pill.key} onClick={() => setSquadFilter(pill.key)}
              className={`flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-2xl border transition-all ${
                active ? 'bg-violet-600/10 border-violet-500/60' : 'bg-dark-card border-white/10 hover:border-white/25'}`}>
              <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${pill.accent}22`, color: pill.accent }}>
                <Users size={17} />
              </span>
              <span className="text-left">
                <span className={`block text-sm font-black leading-tight ${active ? 'text-violet-300' : 'text-dark-text'}`}>{pill.label}</span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">{squadCounts[pill.key]} parceiros</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<ShieldAlert size={16} className="text-white" />} accent="bg-amber-600" label="Parceiros em risco"
          value={String(emRisco.length)} sub={hasBaseline ? deltaTxt(dEmRisco) : 'Médio + Alto'} subColor={hasBaseline ? deltaColor(dEmRisco) : 'text-amber-400'} />
        <KpiCard icon={<AlertTriangle size={16} className="text-white" />} accent="bg-rose-600" label="Risco alto"
          value={String(alto.length)} sub={hasBaseline ? deltaTxt(dAlto) : '7+ sinais'} subColor={hasBaseline ? deltaColor(dAlto) : 'text-rose-400'} />
        <KpiCard icon={<DollarSign size={16} className="text-white" />} accent="bg-blue-600" label="R$/mês em risco"
          value={fmtBRL(rAtRisco)} sub="Investimento Médio+Alto" subColor="text-blue-400" />
        <KpiCard icon={<Users size={16} className="text-white" />} accent="bg-violet-600" label="% base com sinais"
          value={total > 0 ? `${Math.round((withSignals.length / total) * 100)}%` : '—'} sub={`${withSignals.length} de ${total} parceiros`} subColor="text-violet-400" />
      </div>

      {/* Distribuição + Evolução */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-dark-text mb-1">Distribuição de risco</h2>
          <p className="text-xs text-slate-500 mb-4">Todos os parceiros por nível de sinais</p>
          <div className="flex w-full h-3 rounded-full overflow-hidden bg-white/5">
            {total === 0 ? <div className="w-full" /> : buckets.map(b => b.n > 0 && (
              <div key={b.key} title={`${b.label}: ${b.n}`} style={{ width: `${(b.n / total) * 100}%`, background: b.hex }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
            {buckets.map(b => (
              <div key={b.key} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.hex }} /> {b.label}
                </span>
                <span className="text-xs font-black text-dark-text">{b.n} <span className="text-[10px] text-slate-500 font-semibold">{total > 0 ? `${Math.round((b.n / total) * 100)}%` : ''}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-dark-text mb-1">Evolução do risco</h2>
          <p className="text-xs text-slate-500 mb-4">Parceiros em risco (Médio+Alto) e risco alto ao longo do tempo</p>
          {trendReady ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={series} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(d: string) => d.slice(5).split('-').reverse().join('/')} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <RechartsTooltip contentStyle={{ background: '#14082e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#e2e8f0' }} />
                <Line type="monotone" dataKey="emRisco" name="Em risco" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="alto" name="Alto" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center text-center gap-2 py-12 text-slate-500">
              <TrendingDown size={30} className="opacity-30" />
              <p className="text-sm font-medium text-slate-400">Começamos a registrar o risco hoje.</p>
              <p className="text-xs">O gráfico de evolução aparece assim que houver alguns dias de histórico.</p>
            </div>
          )}
        </div>
      </div>

      {/* Watchlist */}
      <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-dark-text">Watchlist — agir agora</h2>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{withSignals.length} parceiro{withSignals.length === 1 ? '' : 's'} com sinais</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">Ordenado do maior risco para o menor. Os chips mostram os sinais marcados de cada parceiro.</p>
        {withSignals.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-10">Nenhum parceiro com sinais de churn. 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/10">
                  <th className="text-left py-2 pr-2">Parceiro</th>
                  <th className="text-left py-2 pr-2">Squad</th>
                  <th className="text-left py-2 pr-2">Gestor</th>
                  <th className="text-left py-2 pr-2">Resultado</th>
                  <th className="text-right py-2 pr-2">Investimento</th>
                  <th className="text-center py-2 pr-2">Sinais</th>
                  <th className="text-center py-2">Δ 7d</th>
                </tr>
              </thead>
              <tbody>
                {withSignals.map(({ p, count }) => {
                  const risk = churnRisk(count);
                  const marked = CHURN_TEMPLATE.flatMap(g => g.items).filter(it => p.churnChecklist?.[it.id]);
                  const base = baseline[p.id];
                  const d = base === undefined ? null : count - base;
                  const resHex = getResultColor(p.projectResult);
                  return (
                    <tr key={p.id} className="border-b border-white/[0.04] align-top">
                      <td className="py-3 pr-3 min-w-[200px]">
                        <p className="font-semibold text-dark-text">{p.partner}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {marked.map(m => {
                            const c = CAT_COLOR[CHURN_LABELS[m.id]?.cat] || '#64748b';
                            return <span key={m.id} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${c}1f`, color: c }}>{m.label}</span>;
                          })}
                        </div>
                      </td>
                      <td className="py-3 pr-2 whitespace-nowrap">
                        <span className="text-xs font-bold" style={{ color: SQUAD_ACCENT[p.squad || ''] || '#94a3b8' }}>{p.squad || '—'}</span>
                      </td>
                      <td className="py-3 pr-2 text-slate-300 whitespace-nowrap text-xs">{p.responsible || '—'}</td>
                      <td className="py-3 pr-2 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                          <span className="w-2 h-2 rounded-full" style={{ background: resHex }} />{prettyResult(resultOf(p))}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-right text-slate-300 font-medium whitespace-nowrap">{fmtBRL(parseCurrency(p.investment))}</td>
                      <td className="py-3 pr-2 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: `${risk.hex}1f`, color: risk.hex }}>
                          {count}/{CHURN_TOTAL} · {risk.label}
                        </span>
                      </td>
                      <td className="py-3 text-center whitespace-nowrap">
                        {d === null || !hasBaseline
                          ? <span className="text-[11px] text-slate-600">—</span>
                          : <span className={`text-[11px] font-bold ${deltaColor(d)}`}>{d === 0 ? '=' : d > 0 ? `▲ +${d}` : `▼ ${d}`}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
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

  // ── Consolidated metrics (both squads) ──
  const total = projects.length;
  const rodando = projects.filter(isRodando).length;
  const gargalo = projects.filter(isGargalo).length;
  const investmentTotal = projects.reduce((a, p) => a + parseCurrency(p.investment), 0);

  const able = squadStats(projects, 'Able');
  const baker = squadStats(projects, 'Baker');
  const outros = total - able.total - baker.total;

  // Result distribution (all projects)
  const distCounts: Record<string, number> = {};
  for (const p of projects) { const r = resultOf(p); distCounts[r] = (distCounts[r] || 0) + 1; }
  const resultDist = Object.entries(distCounts)
    .map(([label, count]) => ({ label, count, color: getResultColor(label) }))
    .sort((a, b) => b.count - a.count);

  // Client health
  const cliAtivos = clients.filter(c => c.status === 'Ativo' && !parseTags(c.tags).includes('quarentena'));
  const cliQuarentena = clients.filter(c => c.status === 'Ativo' && parseTags(c.tags).includes('quarentena'));
  const cliChurn = clients.filter(c => c.status === 'Inativo');

  // Attention radar (both squads), ordered by urgency
  const atencao = projects
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
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Visão consolidada do time — Squads Able + Baker e saúde da base de clientes</p>
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
      {/* Consolidated KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard icon={<Briefcase size={16} className="text-white" />} accent="bg-violet-600" label="Total Projetos" value={String(total)} sub={`${outros > 0 ? `${outros} fora dos squads · ` : ''}Able + Baker`} subColor="text-violet-400" />
        <KpiCard icon={<CheckCircle2 size={16} className="text-white" />} accent="bg-emerald-600" label="Rodando" value={String(rodando)} sub={total > 0 ? `${Math.round((rodando / total) * 100)}% do total` : '—'} subColor="text-emerald-400" />
        <KpiCard icon={<AlertTriangle size={16} className="text-white" />} accent="bg-amber-600" label="Gargalo" value={String(gargalo)} sub={gargalo > 0 ? 'Atenção' : 'Nenhum'} subColor={gargalo > 0 ? 'text-amber-400' : 'text-slate-500'} />
        <KpiCard icon={<DollarSign size={16} className="text-white" />} accent="bg-blue-600" label="Investimento Total" value={fmtBRL(investmentTotal)} sub="Soma dos squads" subColor="text-blue-400" />
        <KpiCard icon={<Users size={16} className="text-white" />} accent="bg-teal-600" label="Clientes Ativos" value={String(cliAtivos.length)} sub={`${cliQuarentena.length} em quarentena`} subColor="text-teal-400" />
      </div>

      {/* Squad comparison */}
      <div>
        <h2 className="text-sm font-black text-dark-text uppercase tracking-widest mb-3 flex items-center gap-2">
          <Layers size={14} className="text-violet-400" /> Comparativo por Squad
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SquadCard s={able} />
          <SquadCard s={baker} />
        </div>
      </div>

      {/* Result distribution + Client health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut */}
        <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-dark-text mb-1">Distribuição de Resultados</h2>
          <p className="text-xs text-slate-500 mb-4">Todos os projetos (Able + Baker) por resultado atual</p>
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
              { label: 'Quarentena', value: cliQuarentena.length, color: '#f5c842', icon: <ShieldAlert size={16} /> },
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
          {/* split by squad */}
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Clientes ativos por squad</p>
          <div className="space-y-2">
            {['Able', 'Baker'].map(sq => {
              const n = cliAtivos.filter(c => (c.squad || '').toLowerCase() === sq.toLowerCase()).length;
              const pct = cliAtivos.length > 0 ? (n / cliAtivos.length) * 100 : 0;
              const accent = SQUAD_ACCENT[sq];
              return (
                <div key={sq} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-14">{sq}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent }} />
                  </div>
                  <span className="text-xs font-bold text-dark-text w-6 text-right">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Attention radar */}
      <div className="bg-dark-card border border-white/10 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-dark-text mb-1">Radar de Atenção</h2>
        <p className="text-xs text-slate-500 mb-4">Projetos críticos dos dois squads, ordenados por urgência</p>
        {atencao.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-10">Nenhum projeto crítico 🎉</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  <th className="text-left pb-2 pr-2">Parceiro</th>
                  <th className="text-left pb-2 pr-2">Squad</th>
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
                  const sq = p.squad || '—';
                  const sqColor = SQUAD_ACCENT[sq] || '#64748b';
                  return (
                    <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                      <td className="py-2.5 pr-2 font-bold text-dark-text truncate max-w-[160px]">{p.partner}</td>
                      <td className="py-2.5 pr-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${sqColor}22`, color: sqColor }}>{sq}</span>
                      </td>
                      <td className="py-2.5 pr-2 text-slate-400 truncate max-w-[120px]">{p.responsible || '—'}</td>
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
