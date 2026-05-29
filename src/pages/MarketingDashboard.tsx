import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  DollarSign, Users, UserCheck, Video, RefreshCw,
  Calendar, ChevronDown, MousePointerClick, Eye, Megaphone,
  BarChart2, Target, AlertCircle, TrendingUp
} from 'lucide-react';

const MESES       = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function fmtCurrency(val: number | string | null | undefined) {
  const n = Number(val) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function fmtInt(val: number | string | null | undefined) {
  const n = Number(val) || 0;
  return n.toLocaleString('pt-BR');
}

function pct(part: number, total: number) {
  if (!total) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

// ── Types ─────────────────────────────────────────────────────────────────
interface Kpis {
  total_spend: number;
  total_leads: number;
  leads_qualificados: number;
  reunioes: number;
  reunioes_marcadas: number;
  reunioes_realizadas: number;
  custo_por_lead: number;
  custo_por_qualificado: number;
  custo_por_reuniao: number;
  taxa_qualificacao: number;
  taxa_reuniao: number;
  total_clicks: number;
  total_impressions: number;
  total_campaigns: number;
}
interface DashData {
  kpis: Kpis;
  daily_spend: any[];
  daily_leads: any[];
  campaigns: any[];
  nichos: any[];
}

// ── Tooltips ──────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, prefix = '' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-card border border-white/10 rounded-xl px-3 py-2 shadow-xl text-sm z-50">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold text-dark-text text-sm flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="text-dark-text">{prefix}{p.value?.toLocaleString('pt-BR')}</span>
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-dark-card border border-white/10 rounded-xl px-3 py-2 shadow-2xl text-sm pointer-events-none z-50">
      <p className="font-bold text-dark-text text-sm">{d.campaign_name || d.nicho || d.name}</p>
      <p className="font-semibold mt-0.5" style={{ color: payload[0].fill }}>
        {d.spend ? fmtCurrency(d.spend) : d.total ? `${fmtInt(d.total)} leads` : d.value}
        {d.pct !== undefined && <span className="text-slate-400 font-medium ml-1">({d.pct}%)</span>}
      </p>
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

  function inRange(iso: string) {
    const lo = selecting || range.start;
    const hi = selecting ? hovered : range.end;
    if (!lo || !hi) return false;
    return iso > Math.min(...[lo,hi].map(d=>+new Date(d))/1 as any) && false; // will recalc below
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
    <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col gap-2 min-w-0 transition-colors duration-200">
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
  icon: React.ReactNode; iconBg: string; label: string; value: string | number; sub?: string | React.ReactNode;
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

// ── Day format helper ─────────────────────────────────────────────────────
function getDay(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
}

// ── Main Component ────────────────────────────────────────────────────────
export default function MarketingDashboard() {
  const today = new Date();
  const defaultRange = (): DateRange => {
    const y = today.getFullYear(), m = today.getMonth() + 1;
    const start = `${y}-${String(m).padStart(2,'0')}-01`;
    const end   = `${y}-${String(m).padStart(2,'0')}-${String(daysInMonth(y, m)).padStart(2,'0')}`;
    return { start, end };
  };

  const [range, setRange]       = useState<DateRange>(defaultRange);
  const [data, setData]         = useState<DashData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetchData = useCallback(async (r: DateRange, silent = false) => {
    if (!silent) setLoading(true);
    setSpinning(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketing-dashboard?start=${r.start}&end=${r.end}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao carregar dados');
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

  const kpis = data?.kpis || {} as Kpis;
  const valSpend = kpis.total_spend || 0;
  const valLeads = kpis.total_leads || 0;
  const valQuali = kpis.leads_qualificados || 0;
  const valReuniMarcadas = kpis.reunioes_marcadas || 0;
  const valReuniRealizadas = kpis.reunioes_realizadas || 0;

  const dailySpend = (data?.daily_spend || []).map(d => ({ ...d, day: getDay(d.date) }));
  const dailyLeads = (data?.daily_leads || []).map(d => ({ ...d, day: getDay(d.date) }));
  const campanhas  = data?.campaigns || [];
  const nichos     = data?.nichos || [];

  const VIOLET_SHADES = ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#a78bfa', '#c4b5fd'];
  const EMERALD_SHADES = ['#10b981', '#059669', '#047857', '#065f46', '#34d399', '#6ee7b7'];

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">
      
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dark-text">Dashboard <span className="text-violet-500">Marketing</span></h1>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
            {rangeLabel ? rangeLabel : 'Visão geral de performance de tráfego'}
          </p>
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

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-6 md:mx-8 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && !data ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : data && (
        <div className="px-6 md:px-8 pb-10 space-y-5">

          {/* ── KPI Cards ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard
              iconBg="bg-violet-500/15"
              icon={<DollarSign size={17} className="text-violet-500" />}
              label="Valor Gasto"
              value={fmtCurrency(valSpend)}
              sub={`Custo/Lead: ${fmtCurrency(valLeads > 0 ? valSpend / valLeads : 0)}`}
            />
            <KpiCard
              iconBg="bg-blue-500/15"
              icon={<Users size={17} className="text-blue-500" />}
              label="Leads Gerados"
              value={fmtInt(valLeads)}
              sub="Cadastros únicos no período"
            />
            <KpiCard
              iconBg="bg-emerald-500/15"
              icon={<UserCheck size={17} className="text-emerald-500" />}
              label="Leads Qualificados"
              value={fmtInt(valQuali)}
              sub={
                <span>
                  Taxa de qualificação: <span className="text-emerald-500 font-bold">{pct(valQuali, valLeads)}</span>
                </span>
              }
              extra={<div className="text-[10px] text-slate-500 mt-0.5">Custo/Qualificado: {fmtCurrency(valQuali > 0 ? valSpend / valQuali : 0)}</div>}
            />
            <KpiCard
              iconBg="bg-pink-500/15"
              icon={<Calendar size={17} className="text-pink-500" />}
              label="Reuniões Marcadas"
              value={fmtInt(valReuniMarcadas)}
              sub={
                <span>
                  Taxa de agendamento: <span className="text-pink-500 font-bold">{pct(valReuniMarcadas, valQuali)}</span>
                </span>
              }
              extra={<div className="text-[10px] text-slate-500 mt-0.5">Custo/Marcada: {fmtCurrency(valReuniMarcadas > 0 ? valSpend / valReuniMarcadas : 0)}</div>}
            />
            <KpiCard
              iconBg="bg-cyan-500/15"
              icon={<Video size={17} className="text-cyan-500" />}
              label="Reuniões Realizadas"
              value={fmtInt(valReuniRealizadas)}
              sub={
                <span>
                  Taxa de comparecimento: <span className="text-cyan-500 font-bold">{pct(valReuniRealizadas, valReuniMarcadas)}</span>
                </span>
              }
              extra={<div className="text-[10px] text-slate-500 mt-0.5">Custo/Realizada: {fmtCurrency(valReuniRealizadas > 0 ? valSpend / valReuniRealizadas : 0)}</div>}
            />
          </div>

          {/* ── Charts Grid ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Investimento Diário */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
              <h2 className="text-sm font-bold text-dark-text">Investimento Diário</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 mt-0.5">Evolução de gastos em anúncios — {rangeLabel}</p>
              {dailySpend.length > 0 ? (
                <ResponsiveContainer width="100%" height={210} className="focus:outline-none outline-none" style={{ outline: 'none' }}>
                  <ComposedChart data={dailySpend} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} style={{ outline: 'none' }}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,120,0.15)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                      tickFormatter={v => `R$${(v).toFixed(0)}`} width={50} />
                    <Tooltip content={<CustomTooltip prefix="R$ " />} />
                    <Area type="monotone" dataKey="spend" name="Gasto" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorSpend)" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[210px] flex items-center justify-center text-slate-500 text-sm">Sem dados</div>
              )}
            </div>

            {/* Leads Diários */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
              <h2 className="text-sm font-bold text-dark-text">Leads Diários</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 mt-0.5">Capturas no mês — {rangeLabel}</p>
              {dailyLeads.length > 0 ? (
                <ResponsiveContainer width="100%" height={210} className="focus:outline-none outline-none" style={{ outline: 'none' }}>
                  <ComposedChart data={dailyLeads} margin={{ top: 8, right: 0, left: -24, bottom: 0 }} style={{ outline: 'none' }}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,120,0.15)" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="leads" name="Leads" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)"
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3, stroke: '#1a1827' }}
                      activeDot={{ r: 4, strokeWidth: 0 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[210px] flex items-center justify-center text-slate-500 text-sm">Sem dados</div>
              )}
            </div>
          </div>

          {/* ── Funil & Volumes ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
            {/* Funil de Conversão (ESQUERDA) */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
              <div className="grid grid-cols-2 gap-0 h-full">

                {/* Sec. Funil */}
                <div className="pr-6">
                  <h2 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Métricas de Tráfego</h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                        <MousePointerClick size={17} className="text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Cliques</div>
                        <div className="text-lg font-black text-dark-text">{fmtInt(kpis.total_clicks)}</div>
                        <div className="text-xs text-slate-500 mt-0.5">CTR: {kpis.total_impressions ? pct(kpis.total_clicks, kpis.total_impressions) : '0%'}</div>
                      </div>
                    </div>
                    <div className="h-px" style={{ background: 'rgba(100,100,120,0.15)' }} />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-cyan-700/20 flex items-center justify-center shrink-0">
                        <Eye size={17} className="text-cyan-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Impressões</div>
                        <div className="text-lg font-black text-dark-text">{fmtInt(kpis.total_impressions)}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Aberturas totais estimadas</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Separador vertical */}
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: 'rgba(100,100,120,0.15)' }} />
                  {/* Funil Lead -> Reunião */}
                  <div className="pl-6">
                    <h2 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">Volume (Funil)</h2>
                    <div className="space-y-4">
                      {/* Leads -> Qualificados */}
                      <div>
                        <div className="flex items-end justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                              <Target size={13} className="text-emerald-500" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Qualificados</div>
                              <div className="text-xl font-black text-dark-text">{valQuali}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-emerald-500">{pct(valQuali, valLeads)}</div>
                            <div className="text-xs text-slate-500">dos Leads</div>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(100,100,120,0.15)' }}>
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: valLeads ? `${(valQuali / valLeads) * 100}%` : '0%' }} />
                        </div>
                      </div>
                      {/* Qualificados -> Reuniões Marcadas */}
                      <div>
                        <div className="flex items-end justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-pink-500/15 flex items-center justify-center shrink-0">
                              <Target size={13} className="text-pink-500" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reuniões Marcadas</div>
                              <div className="text-xl font-black text-dark-text">{valReuniMarcadas}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-pink-500">{pct(valReuniMarcadas, valQuali)}</div>
                            <div className="text-xs text-slate-500">dos Qualificados</div>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(100,100,120,0.15)' }}>
                          <div className="h-full bg-pink-500 rounded-full transition-all duration-500"
                            style={{ width: valQuali ? `${(valReuniMarcadas / valQuali) * 100}%` : '0%' }} />
                        </div>
                      </div>
                      {/* Marcadas -> Realizadas */}
                      <div>
                        <div className="flex items-end justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
                              <Target size={13} className="text-cyan-500" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reuniões Realizadas</div>
                              <div className="text-xl font-black text-dark-text">{valReuniRealizadas}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-cyan-500">{pct(valReuniRealizadas, valReuniMarcadas)}</div>
                            <div className="text-xs text-slate-500">das Marcadas</div>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(100,100,120,0.15)' }}>
                          <div className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                            style={{ width: valReuniMarcadas ? `${(valReuniRealizadas / valReuniMarcadas) * 100}%` : '0%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Leads por Nicho (DIREITA) */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col" style={{ minHeight: 260 }}>
              <h2 className="text-sm font-bold text-dark-text">Leads por Nicho</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 mt-0.5">Top Nichos — {rangeLabel}</p>

              {nichos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                  <span className="text-4xl opacity-30">❌</span>
                  <p className="text-sm text-slate-500">Nenhum lead com nicho</p>
                </div>
              ) : (() => {
                const pieDataRaw = nichos.slice(0, 5).map(n => ({ ...n, total: Number(n.total) }));
                const totalNum = pieDataRaw.reduce((s, r) => s + r.total, 0);
                const pieData = pieDataRaw.map(r => ({ ...r, pct: totalNum ? Math.round((r.total / totalNum) * 100) : 0 }));
                const topMotivo = pieData[0];
                const topPct = totalNum ? Math.round((topMotivo.total / totalNum) * 100) : 0;
                
                return (
                  <div className="flex-1 flex flex-col items-center justify-between gap-4">
                    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
                      <PieChart width={200} height={200} style={{ outline: 'none' }}>
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
                            <Cell key={idx} fill={EMERALD_SHADES[idx % EMERALD_SHADES.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                      {/* Centro vazio */}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
                      {pieData.map((r: any, idx: number) => (
                        <div key={r.nicho} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: EMERALD_SHADES[idx % EMERALD_SHADES.length] }} />
                          <span className="text-xs text-slate-400">{r.nicho || 'Não preenchido'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Sessão Campanhas (Lista completa) ───────────────────────── */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <Megaphone size={14} className="text-violet-500" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-dark-text">Top Campanhas</h2>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Ordenado por Custo Total</p>
                </div>
              </div>
              <span className="bg-violet-500/15 text-violet-500 text-[10px] font-bold px-3 py-1 rounded-full">
                {kpis.total_campaigns} Campanhas ativas
              </span>
            </div>

            {campanhas.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-10 text-sm">
                Nenhuma campanha neste período
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left" style={{ borderColor: 'rgba(100,100,120,0.2)' }}>
                      <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 pr-4">Nome da Campanha</th>
                      <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 pr-4 text-right">Cliques</th>
                      <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 pr-4 text-right">Impressões</th>
                      <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 text-right">Valor Gasto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campanhas.map((c: any, i: number) => {
                      return (
                        <tr key={i}
                          className="border-b hover:bg-dark-card-hover transition-colors"
                          style={{ borderColor: 'rgba(100,100,120,0.1)' }}>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <span className="text-dark-text font-medium text-sm line-clamp-1">{c.campaign_name || '—'}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-slate-400 text-right text-sm whitespace-nowrap">{fmtInt(c.clicks)}</td>
                          <td className="py-3 pr-4 text-slate-400 text-right text-sm whitespace-nowrap">{fmtInt(c.impressions)}</td>
                          <td className="py-3 text-right font-bold text-violet-500 text-sm whitespace-nowrap">
                            {fmtCurrency(c.spend)}
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
