import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Calendar, TrendingUp, DollarSign, Users, Target, RefreshCw,
  ChevronDown, Award, PhoneCall, UserCheck, RotateCcw,
  Filter, ChevronRight, PieChart as PieChartIcon, Phone, Clock, Globe, Share2
} from 'lucide-react';

const MESES       = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function fmtCurrency(val: number | string | null | undefined) {
  const n = Number(val) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pct(part: number, total: number) {
  if (!total) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

function buildChartData(yearData: any[], key: string) {
  return MESES.map((label, i) => {
    const row = yearData.find((r: any) => Number(r.mes) === i + 1);
    return { mes: label, valor: row ? Number(row[key]) || 0 : 0 };
  });
}

// ── Tooltip personalizado ──────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, prefix = '' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-card border border-white/10 rounded-xl px-3 py-2 shadow-xl text-sm">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="font-bold text-dark-text">{prefix}{payload[0]?.value?.toLocaleString('pt-BR')}</p>
    </div>
  );
}

// ── Tooltip Motivos de Perda ───────────────────────────────────────────────
function LossTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-dark-card border border-white/10 rounded-xl px-3 py-2 shadow-2xl text-sm pointer-events-none">
      <p className="font-bold text-dark-text text-sm">{d.name}</p>
      <p className="text-red-400 font-semibold mt-0.5">{d.total} {d.total === 1 ? 'perda' : 'perdas'}</p>
    </div>
  );
}

// ── DateRangePicker ─────────────────────────────────────────────────────
const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function formatDateBR(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function firstDayOfMonth(y: number, m: number) {
  return new Date(y, m - 1, 1).getDay();
}

interface DateRange { start: string; end: string; }

function DateRangePicker({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState('');
  const [selecting, setSelecting] = useState<string>(''); // first click chosen
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSelecting('');
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function stepMonth(dir: 1 | -1) {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setViewYear(y); setViewMonth(m);
  }

  function handleDayClick(iso: string) {
    if (!selecting) {
      // First click: set start
      setSelecting(iso);
    } else {
      // Second click: set end
      const s = selecting < iso ? selecting : iso;
      const e = selecting < iso ? iso : selecting;
      onChange({ start: s, end: e });
      setSelecting('');
      setOpen(false);
    }
  }

  function isInRange(iso: string) {
    const lo = selecting ? Math.min(...[selecting, hovered || selecting].map(d => +new Date(d))) : +new Date(range.start);
    const hi = selecting ? Math.max(...[selecting, hovered || selecting].map(d => +new Date(d))) : +new Date(range.end);
    const v  = +new Date(iso);
    return v > lo && v < hi;
  }

  function isStart(iso: string) {
    return selecting ? iso === selecting : iso === range.start;
  }
  function isEnd(iso: string) {
    if (selecting) return hovered ? iso === (selecting < hovered ? hovered : selecting) : false;
    return iso === range.end;
  }

  const days = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const cells: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: days }, (_, i) => isoDate(viewYear, viewMonth, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const label = range.start && range.end
    ? range.start === range.end
      ? formatDateBR(range.start)
      : `${formatDateBR(range.start)} → ${formatDateBR(range.end)}`
    : 'Selecionar período';

  // Quick presets
  function preset(label: string, start: string, end: string) {
    return (
      <button
        key={label}
        onClick={() => { onChange({ start, end }); setOpen(false); setSelecting(''); }}
        className="text-xs text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 px-2 py-1 rounded-lg transition-colors text-left whitespace-nowrap"
      >{label}</button>
    );
  }

  const todayIso  = today.toISOString().slice(0, 10);
  const d7 = new Date(today); d7.setDate(today.getDate() - 6);
  const d30 = new Date(today); d30.setDate(today.getDate() - 29);
  const mStart = isoDate(today.getFullYear(), today.getMonth() + 1, 1);
  const mEnd   = isoDate(today.getFullYear(), today.getMonth() + 1, daysInMonth(today.getFullYear(), today.getMonth() + 1));
  const pmStart = (() => { const d = new Date(today.getFullYear(), today.getMonth() - 1, 1); return isoDate(d.getFullYear(), d.getMonth() + 1, 1); })();
  const pmEnd   = (() => { const d = new Date(today.getFullYear(), today.getMonth(), 0); return d.toISOString().slice(0,10); })();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 bg-dark-card border border-violet-500/60 rounded-xl px-4 py-2.5 transition-all hover:border-violet-500"
      >
        <Calendar size={14} className="text-violet-500" />
        <span className="text-sm font-bold text-dark-text">{label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-4" style={{ minWidth: 320 }}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            {selecting ? 'Clique na data final' : 'Selecionar Período'}
          </p>

          {/* Presets */}
          <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-white/10">
            {preset('Hoje', todayIso, todayIso)}
            {preset('Últ. 7 dias', d7.toISOString().slice(0,10), todayIso)}
            {preset('Últ. 30 dias', d30.toISOString().slice(0,10), todayIso)}
            {preset('Este mês', mStart, mEnd)}
            {preset('Mês passado', pmStart, pmEnd)}
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => stepMonth(-1)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
              <ChevronDown size={13} className="text-slate-400 rotate-90" />
            </button>
            <span className="text-sm font-bold text-dark-text">{MESES_FULL[viewMonth - 1]} {viewYear}</span>
            <button onClick={() => stepMonth(1)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
              <ChevronDown size={13} className="text-slate-400 -rotate-90" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEK_DAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-slate-500 pb-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((iso, idx) => {
              if (!iso) return <div key={idx} />;
              const start  = isStart(iso);
              const end    = isEnd(iso);
              const inRng  = isInRange(iso);
              const isToday = iso === todayIso;
              return (
                <button
                  key={iso}
                  onClick={() => handleDayClick(iso)}
                  onMouseEnter={() => selecting && setHovered(iso)}
                  onMouseLeave={() => selecting && setHovered('')}
                  className={`relative h-8 w-full text-xs font-semibold transition-all
                    ${start || end ? 'text-white z-10' : inRng ? 'text-violet-700 dark:text-violet-200' : 'text-dark-text hover:text-violet-600'}
                    ${inRng ? 'bg-violet-500/15' : ''}
                    ${start ? 'rounded-l-full' : ''}
                    ${end ? 'rounded-r-full' : ''}
                    ${!start && !end ? 'rounded-full' : ''}
                  `}
                >
                  <span className={`absolute inset-0.5 flex items-center justify-center rounded-full text-xs
                    ${start || end ? 'bg-violet-600 shadow-md shadow-violet-500/30' : ''}
                    ${isToday && !start && !end ? 'ring-1 ring-violet-500/60' : ''}
                  `}>
                    {parseInt(iso.slice(8))}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {range.start && range.end && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-500">{formatDateBR(range.start)} → {formatDateBR(range.end)}</span>
              <button
                onClick={() => { onChange({ start: mStart, end: mEnd }); setSelecting(''); }}
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >Limpar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ icon, iconBg, label, value, sub, extra }: {
  icon: React.ReactNode; iconBg: string; label: string;
  value: string; sub?: React.ReactNode; extra?: React.ReactNode;
}) {
  return (
    <div className="bg-dark-card dark:bg-dark-card border border-white/10 light:border-gray-200 rounded-2xl p-5 flex flex-col gap-2 min-w-0 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
      </div>
      <div className="text-2xl font-black text-dark-text leading-tight">{value}</div>
      {sub && <div className="text-xs text-slate-400 dark:text-slate-500">{sub}</div>}
      {extra}
    </div>
  );
}

// ── Sessão Card ───────────────────────────────────────────────────────────
function SessaoCard({ icon, iconBg, label, value, sub }: {
  icon: React.ReactNode; iconBg: string; label: string; value: string | number; sub?: string;
}) {
  return (
    <div className="bg-dark-card border border-white/10 rounded-2xl p-4 flex items-center gap-4 transition-colors duration-200">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div>
        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">{label}</div>
        <div className="text-2xl font-black text-dark-text">{value}</div>
        {sub && <div className="text-xs text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function CrmMetricas() {
  const today = new Date();
  const defaultRange = (): DateRange => {
    const y = today.getFullYear(), m = today.getMonth() + 1;
    const start = `${y}-${String(m).padStart(2,'0')}-01`;
    const end   = `${y}-${String(m).padStart(2,'0')}-${String(daysInMonth(y, m)).padStart(2,'0')}`;
    return { start, end };
  };

  const [range, setRange]       = useState<DateRange>(defaultRange);
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pre-vendas' | 'vendas'>('pre-vendas');

  const fetchData = useCallback(async (r: DateRange, silent = false) => {
    if (!silent) setLoading(true);
    setSpinning(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm-metricas-dashboard?start=${r.start}&end=${r.end}`);
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao carregar dados');
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  const rangeLabel = range.start && range.end
    ? range.start === range.end
      ? formatDateBR(range.start)
      : `${formatDateBR(range.start)} → ${formatDateBR(range.end)}`
    : '';
  
  const [yStr] = range.start ? range.start.split('-') : [new Date().getFullYear().toString()];

  const kpis              = data?.kpis || {};
  const vendas            = Number(kpis.vendas) || 0;
  const receitaTotal      = Number(kpis.receita_total) || 0;
  const ticketMedio       = Number(kpis.ticket_medio) || 0;
  const campanhas         = Number(kpis.total_campanhas) || 0;
  const indicacao         = Number(kpis.total_indicacao) || 0;
  const receitaCampanhas  = Number(kpis.receita_campanhas) || 0;
  const receitaIndicacao  = Number(kpis.receita_indicacao) || 0;

  const reunM             = data?.reunioes_month || {};
  const marcadas          = Number(reunM.marcadas) || 0;
  const realizadas        = Number(reunM.realizadas) || 0;
  const noshow            = Number(reunM.noshow) || 0;
  const reagend           = Number(reunM.reagendamento) || 0;

  const leadsMonth         = Number(data?.leads_month) || 0;
  const leadsPrev          = Number(data?.leads_prev) || 0;

  const reunPrev           = data?.reunioes_prev || {};
  const prevMarcadas       = Number(reunPrev.marcadas) || 0;
  const prevRealizadas     = Number(reunPrev.realizadas) || 0;
  const prevNoshow         = Number(reunPrev.noshow) || 0;
  const prevReagend        = Number(reunPrev.reagendamento) || 0;

  const fechamentosChart  = buildChartData(data?.fechamentos_year || [], 'quantidade');
  const valoresChart      = buildChartData(data?.fechamentos_year || [], 'total_valor');
  const fechamentosList: any[] = data?.fechamentos_list || [];
  const lossReasonsData: { name: string; total: number }[] = data?.loss_reasons_month || [];
  const totalPerdas: number = Number(data?.total_perdas) || 0;

  // Mês anterior
  const kpPrev          = data?.kpis_prev || {};
  const prevVendas      = Number(kpPrev.vendas) || 0;
  const prevReceita     = Number(kpPrev.receita_total) || 0;
  const prevTicket      = Number(kpPrev.ticket_medio) || 0;
  const prevCampanhas   = Number(kpPrev.total_campanhas) || 0;
  const prevIndicacao   = Number(kpPrev.total_indicacao) || 0;

  // Helper: variação percentual
  function delta(curr: number, prev: number) {
    if (!prev) return null;
    const p = ((curr - prev) / prev) * 100;
    return p;
  }
  function DeltaBadge({ curr, prev, inverted = false }: { curr: number; prev: number; inverted?: boolean }) {
    const d = delta(curr, prev);
    if (d === null) return <span className="text-[10px] text-slate-500">—</span>;
    const positive = inverted ? d < 0 : d > 0;
    const color = positive ? 'text-emerald-500' : d === 0 ? 'text-slate-400' : 'text-red-400';
    const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '→';
    return (
      <span className={`text-[11px] font-bold ${color}`}>
        {arrow} {Math.abs(d).toFixed(1)}%
      </span>
    );
  }

  const TABS = [
    { id: 'pre-vendas' as const, label: 'Pré vendas' },
    { id: 'vendas' as const, label: 'Vendas' },
  ];

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dark-text">Comercial</h1>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Performance de Vendas</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker range={range} onChange={setRange} />
          <button
            onClick={() => fetchData(range, true)}
            className={`w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:bg-dark-card-hover flex items-center justify-center transition-colors ${spinning ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-8 mb-5">
        <div className="flex gap-1 bg-dark-card border border-white/10 rounded-xl p-1 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-6 md:mx-8 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 dark:text-red-300 text-sm">
          ⚠ {error}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {loading && !data ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : activeTab === 'pre-vendas' ? (
        /* ── PRÉ VENDAS TAB ─────────────────────────────────────────────── */
        <div className="px-6 md:px-8 pb-10 space-y-5">

          {/* ── KPI Cards Pré vendas ──────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard
              iconBg="bg-violet-500/15"
              icon={<Users size={17} className="text-violet-500" />}
              label="Número de Leads"
              value={String(leadsMonth)}
              sub="Leads recebidos no mês"
              extra={<div className="text-[10px] text-slate-500 mt-0.5">vs. anterior: <DeltaBadge curr={leadsMonth} prev={leadsPrev} /></div>}
            />
            <KpiCard
              iconBg="bg-emerald-500/15"
              icon={<Calendar size={17} className="text-emerald-500" />}
              label="Reuniões Marcadas"
              value={String(marcadas)}
              sub={`Taxa de agendamento: ${pct(marcadas, leadsMonth)}`}
              extra={<div className="text-[10px] text-slate-500 mt-0.5">vs. anterior: <DeltaBadge curr={marcadas} prev={prevMarcadas} /></div>}
            />
            <KpiCard
              iconBg="bg-cyan-500/15"
              icon={<UserCheck size={17} className="text-cyan-500" />}
              label="Reuniões Realizadas"
              value={String(realizadas)}
              sub={`Taxa de comparecimento: ${pct(realizadas, marcadas)}`}
              extra={<div className="text-[10px] text-slate-500 mt-0.5">vs. anterior: <DeltaBadge curr={realizadas} prev={prevRealizadas} /></div>}
            />
            <KpiCard
              iconBg="bg-orange-500/15"
              icon={<PhoneCall size={17} className="text-orange-500" />}
              label="No-Show"
              value={String(noshow)}
              sub={`Taxa de no-show: ${pct(noshow, marcadas)}`}
              extra={<div className="text-[10px] text-slate-500 mt-0.5">vs. anterior: <DeltaBadge curr={noshow} prev={prevNoshow} inverted /></div>}
            />
            <KpiCard
              iconBg="bg-pink-500/15"
              icon={<RotateCcw size={17} className="text-pink-500" />}
              label="Reagendamento"
              value={String(reagend)}
              sub={`Taxa: ${pct(reagend, marcadas)}`}
              extra={<div className="text-[10px] text-slate-500 mt-0.5">vs. anterior: <DeltaBadge curr={reagend} prev={prevReagend} inverted /></div>}
            />
          </div>

          {/* ── Leads por Dia (gráfico de área — alinhado aos 3 primeiros cards) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3">
            {(() => {
              const rawDays: { dia: string; total: string | number }[] = data?.leads_per_day || [];
              const chartData = [];
              if (range.start && range.end) {
                const currD = new Date(range.start + "T12:00:00");
                const targetD = new Date(range.end + "T12:00:00");
                
                while (currD <= targetD) {
                  const y = currD.getFullYear();
                  const m = String(currD.getMonth() + 1).padStart(2, '0');
                  const d = String(currD.getDate()).padStart(2, '0');
                  const dayStr = `${y}-${m}-${d}`;
                  
                  const match = rawDays.find(r => (r.dia || '').slice(0, 10) === dayStr);
                  chartData.push({
                    dia: `${d}/${m}`,
                    leads: match ? Number(match.total) : 0,
                  });
                  currD.setDate(currD.getDate() + 1);
                }
              }
              return (
                <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 h-full">
                  <h2 className="text-sm font-bold text-dark-text">Leads por Dia</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 mt-0.5">
                    Evolução de leads recebidos — {rangeLabel}
                  </p>
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(var(--accent-color))" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="rgb(var(--accent-color))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,120,0.15)" vertical={false} />
                      <XAxis
                        dataKey="dia"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        interval={Math.max(0, Math.floor(daysInMonth / 8) - 1)}
                      />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="leads"
                        stroke="rgb(var(--accent-color))"
                        strokeWidth={2.5}
                        fill="url(#leadsFill)"
                        dot={false}
                        activeDot={{ r: 5, fill: 'rgb(var(--accent-color))', stroke: '#1a1a2e', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}
            </div>

            {/* ── Motivos de Perda Pré-vendas (donut — 2 colunas) ────── */}
            <div className="lg:col-span-2">
              {(() => {
                const pvLossData: { name: string; total: number }[] = (data?.loss_reasons_pre_vendas || []).map((r: any) => ({ ...r, total: Number(r.total) }));
                const RED_SHADES = ['#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d','#fca5a5','#fecaca'];
                const totalNum = pvLossData.reduce((s, r) => s + r.total, 0);
                const topMotivo = pvLossData[0];
                const topPct = totalNum && topMotivo ? Math.round((topMotivo.total / totalNum) * 100) : 0;

                return (
                  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 h-full flex flex-col" style={{ minHeight: 260 }}>
                    <h2 className="text-sm font-bold text-dark-text">Motivos de Perda</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 mt-0.5">Pré-vendas — {rangeLabel}</p>

                    {pvLossData.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                        <span className="text-4xl opacity-30">❌</span>
                        <p className="text-sm text-slate-500">Nenhuma perda neste período</p>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-between gap-4">
                        <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
                          <PieChart width={180} height={180}>
                            <Pie
                              data={pvLossData}
                              cx={85} cy={85}
                              innerRadius={55} outerRadius={82}
                              dataKey="total"
                              strokeWidth={0}
                              paddingAngle={pvLossData.length > 1 ? 3 : 0}
                              startAngle={90} endAngle={-270}
                              isAnimationActive={true}
                            >
                              {pvLossData.map((_: any, idx: number) => (
                                <Cell key={idx} fill={RED_SHADES[idx % RED_SHADES.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<LossTooltip />} />
                          </PieChart>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-dark-text">{topPct}%</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center leading-tight px-4">{topMotivo?.name}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
                          {pvLossData.map((r: any, idx: number) => (
                            <div key={r.name} className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: RED_SHADES[idx % RED_SHADES.length] }} />
                              <span className="text-xs text-slate-400">{r.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              );
            })()}
            </div>
          </div>

          {/* ── SEGUNDA LINHA: Funil e Origens ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Funil */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-1 text-dark-text">
                <div className="bg-violet-500/20 p-1.5 rounded-lg">
                  <Filter size={16} className="text-violet-500" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider">Funil de Pré-vendas</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Progressão de leads no período</p>
              
              {(() => {
                const rawFunnel = data?.funil_pre_vendas || [];
                if (rawFunnel.length === 0) return (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[200px]">
                    <Filter size={32} className="opacity-20 text-slate-400" />
                    <span className="text-sm text-slate-500">Sem dados para o período</span>
                  </div>
                );
                const funilColors = ['bg-violet-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-teal-500', 'bg-amber-500', 'bg-pink-500'];
                const maxVal = Math.max(...rawFunnel.map((x: any) => Number(x.total)), 1);

                return (
                  <div className="flex-1 flex items-end justify-between gap-1 overflow-x-auto pb-2 min-h-[200px]">
                    {rawFunnel.map((item: any, idx: number) => {
                      const val = Number(item.total);
                      const barHeight = Math.max((val / maxVal) * 120, 24); // Máximo de 120px, mínimo de 24px
                      const nextItem = rawFunnel[idx + 1];
                      const nextVal = nextItem ? Number(nextItem.total) : 0;
                      const conversion = val > 0 ? Math.round((nextVal / val) * 100) : 0;
                      const color = funilColors[idx % funilColors.length];
                      
                      return (
                        <React.Fragment key={item.title}>
                          <div className="flex flex-col items-center flex-1 min-w-[60px] max-w-[120px]">
                            <div className="text-xl font-bold text-dark-text mb-2">{val}</div>
                            <div 
                              className={`w-full rounded-t-lg transition-all duration-500 ${color} opacity-90`}
                              style={{ height: `${barHeight}px` }}
                            />
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide text-center mt-3 h-8 flex items-start justify-center">
                              {item.title}
                            </div>
                          </div>
                          {idx < rawFunnel.length - 1 && (
                            <div className="flex flex-col items-center justify-center mb-12 px-1">
                              <span className="text-[10px] font-bold text-slate-500 mb-1">{conversion}%</span>
                              <ChevronRight size={14} className="text-slate-600" />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Origem */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-1 text-dark-text">
                <div className="bg-emerald-500/20 p-1.5 rounded-lg">
                  <PieChartIcon size={16} className="text-emerald-500" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider">Conversão por Origem</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Fontes de aquisição dos leads</p>

              {(() => {
                const rawOrigem = data?.origem_pre_vendas || [];
                const totalOrigem = rawOrigem.reduce((s: number, r: any) => s + Number(r.total), 0);
                if (totalOrigem === 0) return (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[200px]">
                    <PieChartIcon size={32} className="opacity-20 text-slate-400" />
                    <span className="text-sm text-slate-500">Sem dados para o período</span>
                  </div>
                );
                
                return (
                  <div className="flex-1 flex flex-col gap-4 justify-center min-h-[200px]">
                    {rawOrigem.slice(0, 6).map((item: any, idx: number) => {
                      const val = Number(item.total);
                      const pctStr = pct(val, totalOrigem);
                      const isMeta = item.origem.toLowerCase().includes('meta') || item.origem.toLowerCase().includes('facebook') || item.origem.toLowerCase().includes('instagram');
                      const isGoogle = item.origem.toLowerCase().includes('google');
                      const isIndic = item.origem.toLowerCase().includes('indica');
                      let Icon = Globe;
                      if (isMeta) Icon = Share2; 
                      if (isGoogle) Icon = Target;
                      if (isIndic) Icon = Users;
                      
                      return (
                        <div key={item.origem} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 w-32 shrink-0">
                            <div className="bg-white/5 p-1.5 rounded text-slate-400">
                              <Icon size={14} />
                            </div>
                            <span className="text-xs font-bold text-slate-300 truncate" title={item.origem}>{item.origem}</span>
                          </div>
                          <div className="flex-1 bg-white/5 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: pctStr }} />
                          </div>
                          <div className="flex items-center justify-end gap-2 w-16 shrink-0">
                            <span className="text-sm font-bold text-dark-text">{val}</span>
                            <span className="text-[10px] text-slate-500 w-8 text-right">{pctStr}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── TERCEIRA LINHA: Tentativas e Aging ───────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tentativas */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-1 text-dark-text">
                <div className="bg-cyan-500/20 p-1.5 rounded-lg">
                  <Phone size={16} className="text-cyan-500" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider">Tentativas de Contato</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Esforço necessário por lead no período</p>

              {(() => {
                const rawTent = data?.tentativas_contato || [];
                if (rawTent.length === 0) return (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[160px]">
                    <Phone size={32} className="opacity-20 text-slate-400" />
                    <span className="text-sm text-slate-500">Sem contatos registrados</span>
                  </div>
                );
                
                let t1=0, t2=0, t3=0, t4=0, total=0;
                rawTent.forEach((r: any) => {
                  const a = Number(r.attempts);
                  total += a;
                  if (a===1) t1++;
                  else if (a===2) t2++;
                  else if (a===3) t3++;
                  else if (a>=4) t4++;
                });
                const avg = (total / rawTent.length).toFixed(1);

                const rawPrev = data?.tentativas_prev || [];
                const prevTotal = rawPrev.reduce((s: number, r: any) => s + Number(r.attempts), 0);
                const prevAvg = rawPrev.length ? (prevTotal / rawPrev.length).toFixed(1) : '0.0';

                return (
                  <div className="flex-1 flex flex-col justify-between gap-6 min-h-[160px]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white/5 border border-emerald-500/20 rounded-xl p-3 text-center flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">1ª TENT.</span>
                        <span className="text-xl font-black text-dark-text">{t1}</span>
                      </div>
                      <div className="bg-white/5 border border-cyan-500/20 rounded-xl p-3 text-center flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest">2ª TENT.</span>
                        <span className="text-xl font-black text-dark-text">{t2}</span>
                      </div>
                      <div className="bg-white/5 border border-amber-500/20 rounded-xl p-3 text-center flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">3ª TENT.</span>
                        <span className="text-xl font-black text-dark-text">{t3}</span>
                      </div>
                      <div className="bg-white/5 border border-red-500/20 rounded-xl p-3 text-center flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">4+ TENT.</span>
                        <span className="text-xl font-black text-dark-text">{t4}</span>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg py-3 px-4 flex items-center justify-center gap-3">
                      <span className="text-sm font-medium text-slate-300">Média de tentativas:</span>
                      <span className="text-lg font-black text-dark-text">{avg} / lead</span>
                      {Number(prevAvg) > 0 && (
                        <div className="text-[10px] text-slate-500 ml-2 border-l border-white/10 pl-3">vs. {prevAvg} prev.</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Aging */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-1 text-dark-text">
                <div className="bg-amber-500/20 p-1.5 rounded-lg">
                  <Clock size={16} className="text-amber-500" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider">Aging dos Leads</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Tempo desde a última interação (leads abertos)</p>

              {(() => {
                const rawAging = data?.aging_leads || [];
                const totalAging = rawAging.length;
                if (totalAging === 0) return (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-[160px]">
                    <Clock size={32} className="opacity-20 text-slate-400" />
                    <span className="text-sm text-slate-500">Sem leads em andamento</span>
                  </div>
                );

                let a0=0, a1_2=0, a3_5=0, a6_10=0, a10=0;
                rawAging.forEach((r: any) => {
                  const dias = Number(r.dias) || 0;
                  if (dias === 0) a0++;
                  else if (dias <= 2) a1_2++;
                  else if (dias <= 5) a3_5++;
                  else if (dias <= 10) a6_10++;
                  else a10++;
                });

                const agingData = [
                  { label: 'Hoje', val: a0, color: 'bg-emerald-500' },
                  { label: '1-2 dias', val: a1_2, color: 'bg-cyan-500' },
                  { label: '3-5 dias', val: a3_5, color: 'bg-amber-500' },
                  { label: '6-10 dias', val: a6_10, color: 'bg-orange-500' },
                  { label: '10+ dias', val: a10, color: 'bg-red-500' },
                ];
                const maxVal = Math.max(...agingData.map(x => x.val), 1);

                return (
                  <div className="flex-1 flex flex-col gap-3 justify-center min-h-[160px]">
                    {agingData.map((item) => {
                      const pctStr = pct(item.val, totalAging);
                      const wPct = Math.max((item.val / maxVal) * 100, 2);
                      return (
                        <div key={item.label} className="flex items-center gap-3">
                          <div className="w-16 shrink-0 text-right text-xs font-bold text-slate-400">{item.label}</div>
                          <div className="flex-1 h-6 bg-white/5 rounded-r overflow-hidden relative group">
                            <div className={`h-full ${item.color} transition-all duration-500 flex items-center px-2`} style={{ width: `${wPct}%` }}>
                              {item.val > 0 && <span className="text-[10px] font-bold text-white/90 drop-shadow-md">{item.val}</span>}
                            </div>
                          </div>
                          <div className="w-10 shrink-0 text-right text-[10px] text-slate-500">{pctStr}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      ) : (
        <div className="px-6 md:px-8 pb-10 space-y-5">

          {/* ── KPI Cards ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard
              iconBg="bg-violet-500/15"
              icon={<DollarSign size={17} className="text-violet-500" />}
              label="Receita Total"
              value={fmtCurrency(receitaTotal)}
              sub="Receita do mês"
              extra={<div className="text-[10px] text-slate-500 mt-0.5">vs. anterior: <DeltaBadge curr={receitaTotal} prev={prevReceita} /></div>}
            />
            <KpiCard
              iconBg="bg-emerald-500/15"
              icon={<Target size={17} className="text-emerald-500" />}
              label="Vendas"
              value={String(vendas)}
              sub={
                <span>
                  Fechamentos no mês ·{' '}
                  <span className="text-emerald-500 font-bold">
                    {realizadas > 0 ? `${((vendas / realizadas) * 100).toFixed(1)}% conv.` : '—'}
                  </span>
                </span>
              }
              extra={<div className="text-[10px] text-slate-500 mt-0.5">vs. anterior: <DeltaBadge curr={vendas} prev={prevVendas} /></div>}
            />
            <KpiCard
              iconBg="bg-cyan-500/15"
              icon={<TrendingUp size={17} className="text-cyan-500" />}
              label="Ticket Médio"
              value={fmtCurrency(ticketMedio)}
              sub="Média por venda"
              extra={<div className="text-[10px] text-slate-500 mt-0.5">vs. anterior: <DeltaBadge curr={ticketMedio} prev={prevTicket} /></div>}
            />
            <KpiCard
              iconBg="bg-orange-500/15"
              icon={<Users size={17} className="text-orange-500" />}
              label="Campanhas"
              value={String(campanhas)}
              sub={`${pct(campanhas, vendas)} das vendas`}
              extra={<div className="text-[10px] text-slate-500 mt-0.5">vs. anterior: <DeltaBadge curr={campanhas} prev={prevCampanhas} /></div>}
            />
            <KpiCard
              iconBg="bg-pink-500/15"
              icon={<Award size={17} className="text-pink-500" />}
              label="Indicação"
              value={String(indicacao)}
              sub={`${pct(indicacao, vendas)} das vendas`}
              extra={<div className="text-[10px] text-slate-500 mt-0.5">vs. anterior: <DeltaBadge curr={indicacao} prev={prevIndicacao} /></div>}
            />
          </div>

          {/* ── Charts ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Fechamentos por mês */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
              <h2 className="text-sm font-bold text-dark-text">Fechamentos por Mês ({yStr})</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 mt-0.5">Quantidade de negócios fechados</p>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={fechamentosChart} margin={{ top: 8, right: 0, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,120,0.15)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" fill="rgb(var(--accent-color))" radius={[6,6,0,0]} maxBarSize={36} opacity={0.85} />
                  <Line type="monotone" dataKey="valor" stroke="rgb(var(--accent-color))" strokeWidth={2}
                    dot={{ fill: 'rgb(var(--accent-color))', strokeWidth: 2, r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Valores por mês */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
              <h2 className="text-sm font-bold text-dark-text">Valores Vendidos por Mês ({yStr})</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 mt-0.5">Receita acumulada por mês</p>
              <ResponsiveContainer width="100%" height={210}>
                <ComposedChart data={valoresChart} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,120,0.15)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip prefix="R$ " />} />
                  <Bar dataKey="valor" fill="#10b981" radius={[6,6,0,0]} maxBarSize={36} opacity={0.85} />
                  <Line type="monotone" dataKey="valor" stroke="#34d399" strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Origem/Volume + Motivos de Perda ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">

            {/* Origem da Receita + Volume de Vendas — card unificado (ESQUERDA) */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
              <div className="grid grid-cols-2 gap-0 h-full">

                {/* Origem da Receita */}
                <div className="pr-6">
                  <h2 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Origem da Receita</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                        <TrendingUp size={17} className="text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Campanhas</div>
                        <div className="text-lg font-black text-dark-text">{fmtCurrency(receitaCampanhas)}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{campanhas} fechamentos · {pct(campanhas, vendas)}</div>
                      </div>
                    </div>
                    <div className="h-px" style={{ background: 'rgba(100,100,120,0.15)' }} />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-pink-500/15 flex items-center justify-center shrink-0">
                        <Users size={17} className="text-pink-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Indicação</div>
                        <div className="text-lg font-black text-dark-text">{fmtCurrency(receitaIndicacao)}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{indicacao} fechamentos · {pct(indicacao, vendas)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Separador vertical */}
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: 'rgba(100,100,120,0.15)' }} />
                  {/* Volume de Vendas */}
                  <div className="pl-6">
                    <h2 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Volume de Vendas</h2>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-end justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                              <Target size={13} className="text-violet-500" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Campanhas</div>
                              <div className="text-xl font-black text-dark-text">{campanhas}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-violet-500">{pct(campanhas, vendas)}</div>
                            <div className="text-xs text-slate-500">do total</div>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(100,100,120,0.15)' }}>
                          <div className="h-full bg-violet-500 rounded-full transition-all duration-500"
                            style={{ width: vendas ? `${(campanhas / vendas) * 100}%` : '0%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-end justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-pink-500/15 flex items-center justify-center shrink-0">
                              <Award size={13} className="text-pink-500" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Indicação</div>
                              <div className="text-xl font-black text-dark-text">{indicacao}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-pink-500">{pct(indicacao, vendas)}</div>
                            <div className="text-xs text-slate-500">do total</div>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(100,100,120,0.15)' }}>
                          <div className="h-full bg-pink-500 rounded-full transition-all duration-500"
                            style={{ width: vendas ? `${(indicacao / vendas) * 100}%` : '0%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Motivos de Perda — donut grande (DIREITA) */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col" style={{ minHeight: 260 }}>
              <h2 className="text-sm font-bold text-dark-text">Motivos de Perda</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 mt-0.5">Distribuição por motivo — {rangeLabel}</p>

              {lossReasonsData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                  <span className="text-4xl opacity-30">❌</span>
                  <p className="text-sm text-slate-500">Nenhuma perda neste período</p>
                </div>
              ) : (() => {
                const RED_SHADES = ['#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d','#fca5a5','#fecaca'];
                // Converte total para number (PostgreSQL retorna BigInt como string)
                const pieData = lossReasonsData.map(r => ({ ...r, total: Number(r.total) }));
                const totalNum = pieData.reduce((s, r) => s + r.total, 0);
                const topMotivo = pieData[0];
                const topPct = totalNum ? Math.round((topMotivo.total / totalNum) * 100) : 0;
                

                return (
                  <div className="flex-1 flex flex-col items-center justify-between gap-4">
                    {/* Donut centralizado */}
                    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
                      <PieChart width={200} height={200}>
                        <Pie
                          data={pieData}
                          cx={95} cy={95}
                          innerRadius={62} outerRadius={92}
                          dataKey="total"
                          strokeWidth={0}
                          paddingAngle={pieData.length > 1 ? 3 : 0}
                          startAngle={90} endAngle={-270}
                          isAnimationActive={true}
                        >
                          {pieData.map((_: any, idx: number) => (
                            <Cell key={idx} fill={RED_SHADES[idx % RED_SHADES.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<LossTooltip />} />
                      </PieChart>
                      {/* Texto central */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-dark-text">{topPct}%</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center leading-tight px-4">{topMotivo.name}</span>
                      </div>
                    </div>
                    {/* Legenda */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
                      {pieData.map((r: any, idx: number) => (
                        <div key={r.name} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: RED_SHADES[idx % RED_SHADES.length] }} />
                          <span className="text-xs text-slate-400">{r.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>


          {/* ── Lista de Fechamentos ────────────────────────────────────── */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-dark-text">Lista de Fechamentos — {rangeLabel}</h2>
              <span className="bg-violet-500/15 text-violet-500 text-[10px] font-bold px-3 py-1 rounded-full">
                {fechamentosList.length} Fechamentos
              </span>
            </div>

            {fechamentosList.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-10 text-sm">
                Nenhum fechamento neste período
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left" style={{ borderColor: 'rgba(100,100,120,0.2)' }}>
                      <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 pr-4">Cliente</th>
                      <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 pr-4">Data</th>
                      <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 pr-4">Origem</th>
                      <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fechamentosList.map((f: any, i: number) => {
                      const origem    = (f.origem || '').toLowerCase();
                      const isIndica  = origem.includes('indica');
                      const isCamp    = origem.includes('campa');
                      const day       = f.day ? new Date(f.day).toLocaleDateString('pt-BR') : '—';
                      const valorNum  = Number(String(f.Valor || '0').replace(/[R$\s]/g, '').replace(',','.')) || 0;
                      const initials  = (f.Nome || '?').trim().charAt(0).toUpperCase();
                      return (
                        <tr key={f.id ?? i}
                          className="border-b hover:bg-dark-card-hover transition-colors"
                          style={{ borderColor: 'rgba(100,100,120,0.1)' }}>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-500 text-xs font-bold shrink-0">
                                {initials}
                              </div>
                              <span className="text-dark-text font-medium text-sm line-clamp-1">{f.Nome || '—'}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">{day}</td>
                          <td className="py-3 pr-4">
                            {isIndica ? (
                              <span className="bg-violet-500/15 text-violet-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Indicação</span>
                            ) : isCamp ? (
                              <span className="bg-pink-500/15 text-pink-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Campanhas</span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full bg-white/5 uppercase tracking-wide">
                                {f.origem || '—'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right font-bold text-emerald-500 text-sm whitespace-nowrap">
                            {fmtCurrency(valorNum || Number(f.Valor) || 0)}
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
      )}
    </div>
  );
}
