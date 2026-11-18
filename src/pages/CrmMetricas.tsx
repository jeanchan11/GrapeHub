import React, { useState, useEffect, useCallback, useRef } from 'react';
import SplitHeadline from '../components/SplitHeadline';
import {
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  Calendar, TrendingUp, DollarSign, Users, Target, RefreshCw,
  ChevronDown, Award, PhoneCall, UserCheck, RotateCcw,
  Filter, ChevronRight, PieChart as PieChartIcon, Phone, Clock, Globe, Share2, UserMinus,
  Megaphone, LineChart as LineChartIcon, AlertTriangle
} from 'lucide-react';
import { Abas } from '../components/ui/Abas';
import { CarregandoBloco } from '../components/LoadingSpinner';
import MarketingDashboard from './MarketingDashboard';
import FunilCompleto from '../components/FunilCompleto';
import FechamentoPopup from '../components/FechamentoPopup';
import { Anel, Cartao, CartaoKpi, DivisaoDoKpi, LinhaComBolinha, LinhaDoKpi, LinhasNoTempo, ListaDeBarras } from '../components/graficos';
import { dataDoBanco } from '../lib/dataBanco';

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
        <div className="absolute right-0 top-full mt-2 z-50 bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-4" style={{ minWidth: 320 }}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            {selecting ? 'Clique na data final' : 'Selecionar Período'}
          </p>

          {/* Presets */}
          <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-black/10 dark:border-white/10">
            {preset('Hoje', todayIso, todayIso)}
            {preset('Últ. 7 dias', d7.toISOString().slice(0,10), todayIso)}
            {preset('Últ. 30 dias', d30.toISOString().slice(0,10), todayIso)}
            {preset('Este mês', mStart, mEnd)}
            {preset('Mês passado', pmStart, pmEnd)}
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => stepMonth(-1)} className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
              <ChevronDown size={13} className="text-slate-400 rotate-90" />
            </button>
            <span className="text-sm font-bold text-dark-text">{MESES_FULL[viewMonth - 1]} {viewYear}</span>
            <button onClick={() => stepMonth(1)} className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
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
            <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
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

// ── VendedorPicker ────────────────────────────────────────────────────────
type Vendedor = { id: string; name: string; picture?: string | null };

function VendedorPicker({ vendedores, value, onChange }: {
  vendedores: Vendedor[]; value: string; onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selected = vendedores.find(v => v.id === value);
  const firstName = (n: string) => n.trim().split(/\s+/)[0];

  const Avatar = ({ v, size = 20 }: { v: Vendedor; size?: number }) =>
    v.picture ? (
      <img src={v.picture} alt={v.name} className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }} />
    ) : (
      <div className="rounded-full bg-violet-500/20 flex items-center justify-center text-violet-500 font-bold shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.45 }}>
        {v.name.trim().charAt(0).toUpperCase()}
      </div>
    );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2.5 bg-dark-card border rounded-xl px-4 py-2.5 transition-all ${
          value ? 'border-violet-500/60 hover:border-violet-500' : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
        }`}
      >
        {selected ? <Avatar v={selected} /> : <UserCheck size={14} className="text-violet-500" />}
        <span className="text-sm font-bold text-dark-text whitespace-nowrap">
          {selected ? firstName(selected.name) : 'Todos os vendedores'}
        </span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-2" style={{ minWidth: 220 }}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 pt-1 pb-2">Vendedor</p>
          <button
            onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              !value ? 'bg-violet-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-dark-text'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
              <Users size={11} />
            </span>
            Todos os vendedores
          </button>
          {vendedores.map(v => (
            <button
              key={v.id}
              onClick={() => { onChange(v.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                value === v.id ? 'bg-violet-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-dark-text'
              }`}
            >
              <Avatar v={v} />
              <span className="whitespace-nowrap">{v.name}</span>
            </button>
          ))}
        </div>
      )}
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
  const [activeTab, setActiveTab] = useState<'pre-vendas' | 'vendas' | 'marketing' | 'funil'>('vendas');
  // Aba Marketing = o Dashboard Marketing embutido; o botão de atualizar da
  // página incrementa isto para ele buscar de novo.
  const [versaoMarketing, setVersaoMarketing] = useState(0);
  const [vendedorFilter, setVendedorFilter] = useState<string>('');
  // Fechamento aberto no popup (clique na linha da Lista de Fechamentos)
  const [fechamentoAberto, setFechamentoAberto] = useState<number | null>(null);

  const fetchData = useCallback(async (r: DateRange, vendedor = '', silent = false) => {
    if (!silent) setLoading(true);
    setSpinning(true);
    setError(null);
    try {
      const vendParam = vendedor ? `&vendedor=${encodeURIComponent(vendedor)}` : '';
      const res = await fetch(`/api/crm-metricas-dashboard?start=${r.start}&end=${r.end}${vendParam}`);
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao carregar dados');
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => { fetchData(range, vendedorFilter); }, [range, vendedorFilter, fetchData]);

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
  const vendedores: Vendedor[] = data?.vendedores || [];
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
  // "+116% vs. anterior" para a pílula dos cartões
  function variacao(curr: number, prev: number) {
    const d = delta(curr, prev);
    if (d === null) return undefined;
    return `${d > 0 ? '+' : ''}${d.toFixed(0)}% vs. anterior`;
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
    { id: 'vendas' as const, label: 'Vendas', Icone: DollarSign },
    { id: 'pre-vendas' as const, label: 'Pré vendas', Icone: PhoneCall },
    { id: 'marketing' as const, label: 'Marketing', Icone: Megaphone },
    { id: 'funil' as const, label: 'Funil', Icone: Filter },
  ];

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4">
        <div>
          <SplitHeadline text="Comer" highlight="cial" />
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Performance de Vendas</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'vendas' && vendedores.length > 0 && (
            <VendedorPicker vendedores={vendedores} value={vendedorFilter} onChange={setVendedorFilter} />
          )}
          <DateRangePicker range={range} onChange={setRange} />
          <button
            onClick={() => (activeTab === 'marketing' || activeTab === 'funil') ? setVersaoMarketing(v => v + 1) : fetchData(range, vendedorFilter, true)}
            className={`w-9 h-9 rounded-xl bg-dark-card border border-black/10 dark:border-white/10 hover:bg-dark-card-hover flex items-center justify-center transition-colors ${spinning ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Abas<typeof activeTab>
        abas={TABS.map(t => ({ id: t.id, rotulo: t.label, Icone: t.Icone }))}
        ativa={activeTab}
        onChange={setActiveTab}
        className="px-6 md:px-8 mb-6"
      />

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && activeTab !== 'marketing' && activeTab !== 'funil' && (
        <div className="mx-6 md:mx-8 mb-4 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {activeTab === 'marketing' ? (
        <MarketingDashboard embutido range={range} versao={versaoMarketing} />
      ) : activeTab === 'funil' ? (
        <FunilCompleto range={range} versao={versaoMarketing} />
      ) : loading && !data ? (
        <CarregandoBloco className="h-64" />
      ) : activeTab === 'pre-vendas' ? (
        /* ── PRÉ VENDAS TAB ─────────────────────────────────────────────── */
        <div className="px-6 md:px-8 pb-10 space-y-5">

          {(() => {
            // Leads por dia no período inteiro (dia sem lead = 0)
            const rawDays: { dia: string; total: string | number }[] = data?.leads_per_day || [];
            const dias: { rotulo: string; leads: number }[] = [];
            if (range.start && range.end) {
              const d = new Date(range.start + 'T12:00:00');
              const fimD = new Date(range.end + 'T12:00:00');
              while (d <= fimD) {
                const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const m = rawDays.find(r => (r.dia || '').slice(0, 10) === iso);
                dias.push({ rotulo: `${iso.slice(8)}/${iso.slice(5, 7)}`, leads: m ? Number(m.total) : 0 });
                d.setDate(d.getDate() + 1);
              }
            }
            const perdasPV: { name: string; total: number }[] = (data?.loss_reasons_pre_vendas || []).map((r: any) => ({ name: r.name, total: Number(r.total) }));
            const totalPerdasPV = perdasPV.reduce((s2, r) => s2 + r.total, 0);
            const funil: any[] = data?.funil_pre_vendas || [];
            const origens: any[] = data?.origem_pre_vendas || [];
            const totalOrigem = origens.reduce((s2: number, r: any) => s2 + Number(r.total), 0);
            // Tentativas de contato por lead
            const tent: any[] = data?.tentativas_contato || [];
            const faixas = [0, 0, 0, 0];
            let somaTent = 0;
            tent.forEach(r => { const a2 = Number(r.attempts) || 0; somaTent += a2; faixas[Math.min(Math.max(a2, 1), 4) - 1]++; });
            const mediaTent = tent.length ? somaTent / tent.length : 0;
            const tentPrev: any[] = data?.tentativas_prev || [];
            const mediaPrev = tentPrev.length ? tentPrev.reduce((s2, r) => s2 + Number(r.attempts), 0) / tentPrev.length : 0;
            // Aging dos leads abertos
            const aging: any[] = data?.aging_leads || [];
            const fx = { hoje: 0, d2: 0, d5: 0, d10: 0, mais: 0 };
            aging.forEach(r => { const n2 = Number(r.dias) || 0; if (n2 === 0) fx.hoje++; else if (n2 <= 2) fx.d2++; else if (n2 <= 5) fx.d5++; else if (n2 <= 10) fx.d10++; else fx.mais++; });
            const variacaoN = (c: number, p2: number) => variacao(c, p2);

            return (<>
              {/* ── Indicadores ───────────────────────────────────────────── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <CartaoKpi
                  titulo="Leads"
                  pilula={variacaoN(leadsMonth, leadsPrev)}
                  valor={leadsMonth}
                  apoio={`Mês anterior: ${leadsPrev}`}
                  visual={<LinhaDoKpi id="leads-pv" valores={dias.map(x => x.leads)} rotulos={dias.map(x => x.rotulo)} formato={v => `${v} leads`} suave={2} />}
                />
                <CartaoKpi
                  titulo="Reuniões marcadas"
                  pilula={`${pct(marcadas, leadsMonth)} dos leads`}
                  valor={marcadas}
                  apoio={<>Mês anterior: {prevMarcadas}{variacao(marcadas, prevMarcadas) ? ` · ${variacao(marcadas, prevMarcadas)}` : ''}</>}
                  visual={<DivisaoDoKpi partes={[
                    { rotulo: 'Realizadas', valor: realizadas, cor: '#10b981' },
                    { rotulo: 'No-show', valor: noshow, cor: '#f43f5e' },
                    { rotulo: 'Reagendadas', valor: reagend, cor: '#f59e0b' },
                    { rotulo: 'Outras', valor: Math.max(0, marcadas - realizadas - noshow - reagend), cor: 'rgb(var(--accent-color) / .3)' },
                  ]} />}
                />
                <CartaoKpi
                  titulo="Comparecimento"
                  pilula={`${realizadas} realizadas`}
                  valor={pct(realizadas, marcadas)}
                  apoio={`Mês anterior: ${pct(prevRealizadas, prevMarcadas)}`}
                />
                <CartaoKpi
                  titulo="No-show"
                  pilula={`${reagend} reagendadas`}
                  alerta={marcadas > 0 && noshow / marcadas >= 0.3}
                  valor={noshow}
                  apoio={`${pct(noshow, marcadas)} das marcadas · mês anterior: ${prevNoshow}`}
                />
              </div>

              {/* ── Leads por dia + Motivos de perda ──────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <Cartao className="lg:col-span-7" titulo="Leads por dia" legenda={`Leads recebidos — ${rangeLabel}`}>
                  {dias.length > 1
                    ? <LinhasNoTempo id="leads-dia" series={[{ rotulo: 'Leads', cor: 'rgb(var(--accent-color))', valores: dias.map(x => x.leads) }]} rotulos={dias.map(x => x.rotulo)} formato={v => String(Math.round(v))} suave={1} />
                    : <p className="py-10 text-center text-sm text-slate-500">Sem dados no período</p>}
                </Cartao>
                <Cartao className="lg:col-span-5" titulo="Motivos de perda" legenda={`Pré-vendas — ${rangeLabel}`}>
                  {perdasPV.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
                      <UserMinus size={26} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-500">Nenhuma perda neste período</p>
                    </div>
                  ) : (
                    <Anel
                      centro={totalPerdasPV}
                      legendaDoCentro={totalPerdasPV === 1 ? 'perda' : 'perdas'}
                      segmentos={perdasPV.map((r, i) => ({ rotulo: r.name, valor: r.total, cor: ['#f43f5e', '#fb7185', '#e11d48', '#fda4af', '#be123c', '#fecdd3'][i % 6] }))}
                    />
                  )}
                </Cartao>
              </div>

              {/* ── Funil e origem ─────────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Cartao titulo="Funil de pré-vendas" legenda="Leads do período por etapa, com a passagem de uma etapa para a próxima">
                  {funil.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Sem dados para o período</p> : (
                    <ListaDeBarras
                      limite={12}
                      itens={funil.map((f: any) => ({ rotulo: f.title, valor: Number(f.total) }))}
                      detalhe={it => {
                        const i = funil.findIndex((f: any) => f.title === it.rotulo);
                        const prox = funil[i + 1];
                        return prox && it.valor > 0 ? `→ ${Math.round((Number(prox.total) / it.valor) * 100)}%` : '';
                      }}
                    />
                  )}
                </Cartao>
                <Cartao titulo="Origem dos leads" legenda="De onde vieram os leads do período">
                  {totalOrigem === 0 ? <p className="py-10 text-center text-sm text-slate-500">Sem dados para o período</p> : (
                    <ListaDeBarras
                      itens={origens.map((o: any) => ({ rotulo: o.origem || 'Sem origem', valor: Number(o.total), cor: '#10b981' }))}
                      detalhe={it => pct(it.valor, totalOrigem)}
                    />
                  )}
                </Cartao>
              </div>

              {/* ── Tentativas e aging ─────────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Cartao
                  titulo="Tentativas de contato"
                  legenda="Quantas tentativas cada lead do período precisou"
                  acao={tent.length ? <span className="pilula-cartao">{mediaTent.toFixed(1).replace('.', ',')} por lead{mediaPrev ? ` · antes ${mediaPrev.toFixed(1).replace('.', ',')}` : ''}</span> : undefined}
                >
                  {tent.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Sem contatos registrados</p> : (
                    <ListaDeBarras
                      itens={[
                        { rotulo: '1ª tentativa', valor: faixas[0], cor: '#10b981' },
                        { rotulo: '2ª tentativa', valor: faixas[1], cor: '#06b6d4' },
                        { rotulo: '3ª tentativa', valor: faixas[2], cor: '#f59e0b' },
                        { rotulo: '4 ou mais', valor: faixas[3], cor: '#f43f5e' },
                      ]}
                      detalhe={it => pct(it.valor, tent.length)}
                    />
                  )}
                </Cartao>
                <Cartao titulo="Aging dos leads" legenda={`Tempo desde a última interação — ${aging.length} leads em andamento`}>
                  {aging.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Sem leads em andamento</p> : (
                    <ListaDeBarras
                      itens={[
                        { rotulo: 'Hoje', valor: fx.hoje, cor: '#10b981' },
                        { rotulo: '1 a 2 dias', valor: fx.d2, cor: '#06b6d4' },
                        { rotulo: '3 a 5 dias', valor: fx.d5, cor: '#f59e0b' },
                        { rotulo: '6 a 10 dias', valor: fx.d10, cor: '#fb923c' },
                        { rotulo: 'Mais de 10 dias', valor: fx.mais, cor: '#f43f5e' },
                      ]}
                      detalhe={it => pct(it.valor, aging.length)}
                    />
                  )}
                </Cartao>
              </div>
            </>);
          })()}

        </div>
      ) : (
        <div className="px-6 md:px-8 pb-10 space-y-5">

          {/* ── Indicadores (desenho do Dashboard Operacional) ─────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <CartaoKpi
              titulo="Receita"
              pilula={variacao(receitaTotal, prevReceita)}
              valor={fmtCurrency(receitaTotal)}
              apoio={<>Mês anterior: {fmtCurrency(prevReceita)}</>}
              visual={<DivisaoDoKpi partes={[
                { rotulo: 'Campanhas', valor: Math.round(receitaCampanhas), cor: 'rgb(var(--accent-color))' },
                { rotulo: 'Indicação', valor: Math.round(receitaIndicacao), cor: '#ec4899' },
              ]} />}
            />
            <CartaoKpi
              titulo="Vendas"
              pilula={variacao(vendas, prevVendas)}
              valor={vendas}
              apoio={realizadas > 0 ? <>{realizadas} reuniões realizadas · {((vendas / realizadas) * 100).toFixed(0)}% de conversão</> : 'Fechamentos no período'}
              visual={<DivisaoDoKpi partes={[
                { rotulo: 'Campanhas', valor: campanhas, cor: 'rgb(var(--accent-color))' },
                { rotulo: 'Indicação', valor: indicacao, cor: '#ec4899' },
              ]} />}
            />
            <CartaoKpi
              titulo="Ticket médio"
              pilula={variacao(ticketMedio, prevTicket)}
              valor={fmtCurrency(ticketMedio)}
              apoio={<>Mês anterior: {fmtCurrency(prevTicket)}</>}
              visual={
                <div className="space-y-1.5 text-[12.5px]">
                  {[['Campanhas', receitaCampanhas, campanhas, 'rgb(var(--accent-color))'], ['Indicação', receitaIndicacao, indicacao, '#ec4899']].map(([rot, rec, qtd, cor]: any) => (
                    <div key={rot} className="flex items-center gap-2">
                      <i className="h-2 w-2 rounded-full" style={{ background: cor }} />
                      <span className="text-slate-500 dark:text-slate-400">{rot}</span>
                      <b className="numero ml-auto font-normal text-dark-text">{qtd ? fmtCurrency(rec / qtd) : '—'}</b>
                    </div>
                  ))}
                </div>
              }
            />
            <CartaoKpi
              titulo="Perdas"
              pilula={vendas + totalPerdas > 0 ? `${Math.round((totalPerdas / (vendas + totalPerdas)) * 100)}% dos encerrados` : undefined}
              alerta={totalPerdas > vendas && totalPerdas > 0}
              valor={totalPerdas}
              apoio={lossReasonsData[0] ? <>Principal: {lossReasonsData[0].name}</> : 'Nenhuma perda no período'}
            />
          </div>

          {/* ── Gráficos do ano: desenho mantido a pedido do Jean (só a moldura é o cartão novo) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Cartao titulo={`Fechamentos por mês (${yStr})`} legenda="Quantidade de negócios fechados">
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
            </Cartao>
            <Cartao titulo={`Valores vendidos por mês (${yStr})`} legenda="Receita somada por mês">
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
            </Cartao>
          </div>

          {/* ── Origem das vendas + Motivos de perda ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Cartao className="lg:col-span-7" titulo="Origem das vendas" legenda={`Campanhas × indicação — ${rangeLabel}`}>
              <div className="mb-4">
                <DivisaoDoKpi partes={[
                  { rotulo: 'Campanhas', valor: campanhas, cor: 'rgb(var(--accent-color))' },
                  { rotulo: 'Indicação', valor: indicacao, cor: '#ec4899' },
                ]} />
              </div>
              {[
                { rot: 'Campanhas', cor: 'rgb(var(--accent-color))', qtd: campanhas, rec: receitaCampanhas, ant: prevCampanhas },
                { rot: 'Indicação', cor: '#ec4899', qtd: indicacao, rec: receitaIndicacao, ant: prevIndicacao },
              ].map(o => (
                <LinhaComBolinha
                  key={o.rot}
                  cor={o.cor}
                  titulo={<>{o.rot} <span className="font-normal text-slate-500 dark:text-slate-400">· {pct(o.qtd, vendas)} das vendas</span></>}
                  detalhe={<>{o.qtd} {o.qtd === 1 ? 'fechamento' : 'fechamentos'} · ticket {o.qtd ? fmtCurrency(o.rec / o.qtd) : '—'} · mês anterior: {o.ant}</>}
                  valor={<span className="text-[13px] text-dark-text">{fmtCurrency(o.rec)}</span>}
                />
              ))}
            </Cartao>

            <Cartao className="lg:col-span-5" titulo="Motivos de perda" legenda={rangeLabel}>
              {lossReasonsData.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
                  <UserMinus size={26} className="text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-500">Nenhuma perda neste período</p>
                </div>
              ) : (
                <Anel
                  centro={totalPerdas}
                  legendaDoCentro={totalPerdas === 1 ? 'perda' : 'perdas'}
                  segmentos={lossReasonsData.map((r, i) => ({
                    rotulo: r.name,
                    valor: Number(r.total),
                    cor: ['#f43f5e', '#fb7185', '#e11d48', '#fda4af', '#be123c', '#fecdd3'][i % 6],
                  }))}
                />
              )}
            </Cartao>
          </div>

          {/* ── Lista de Fechamentos ────────────────────────────────────── */}
          <Cartao
            titulo={<span className="flex items-center gap-2">Fechamentos <span className="pilula-cartao">{fechamentosList.length}</span></span>}
            legenda={`${rangeLabel} · clique num cliente para ver de onde veio, o perfil e a jornada`}
          >

            {fechamentosList.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-10 text-sm">
                Nenhum fechamento neste período
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left" style={{ borderColor: 'rgba(100,100,120,0.2)' }}>
                      <th className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pb-3 pr-4">Cliente</th>
                      <th className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pb-3 pr-4">Data</th>
                      <th className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pb-3 pr-4">Origem</th>
                      <th className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pb-3 pr-4">Vendedor</th>
                      <th className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pb-3 pr-4">Faturamento</th>
                      <th className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pb-3 pr-4">Nicho</th>
                      <th className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pb-3 pr-4">Tempo de Advocacia</th>
                      <th className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pb-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fechamentosList.map((f: any, i: number) => {
                      const origem    = (f.origem || '').toLowerCase();
                      const isIndica  = origem.includes('indica');
                      const isCamp    = origem.includes('campa');
                      // DATE: só AAAA-MM-DD (new Date direto mostrava um dia antes em produção)
                      const day       = f.day ? dataDoBanco(f.day).toLocaleDateString('pt-BR') : '—';
                      const valorNum  = Number(String(f.Valor || '0').replace(/[R$\s]/g, '').replace(',','.')) || 0;
                      const initials  = (f.Nome || '?').trim().charAt(0).toUpperCase();
                      return (
                        <tr key={f.id ?? i}
                          onClick={() => f.id != null && setFechamentoAberto(f.id)}
                          title="Abrir os dados do cliente"
                          className="border-b hover:bg-dark-card-hover transition-colors cursor-pointer"
                          style={{ borderColor: 'rgba(100,100,120,0.1)' }}>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-500 text-xs font-bold shrink-0">
                                {initials}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-dark-text font-medium text-sm line-clamp-1">{f.Nome || '—'}</span>
                                {f.lead_nome && f.lead_nome !== f.Nome && (
                                  <span className="text-[11px] text-slate-500 line-clamp-1">{f.lead_nome}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">{day}</td>
                          <td className="py-3 pr-4">
                            {isIndica ? (
                              <span className="bg-violet-500/15 text-violet-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Indicação</span>
                            ) : isCamp ? (
                              <span className="bg-pink-500/15 text-pink-500 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">Campanhas</span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full bg-black/5 dark:bg-white/5 uppercase tracking-wide">
                                {f.origem || '—'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            {f.vendedor ? (
                              <div className="flex items-center gap-2">
                                {f.vendedor_foto ? (
                                  <img src={f.vendedor_foto} alt={f.vendedor}
                                    className="w-6 h-6 rounded-full object-cover shrink-0" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-500 text-[10px] font-bold shrink-0">
                                    {String(f.vendedor).trim().charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="text-dark-text text-sm whitespace-nowrap">
                                  {String(f.vendedor).trim().split(/\s+/)[0]}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-slate-400 text-sm whitespace-nowrap">{f.faturamento || '—'}</td>
                          <td className="py-3 pr-4 text-slate-400 text-sm whitespace-nowrap">{f.nicho || '—'}</td>
                          <td className="py-3 pr-4 text-slate-400 text-sm whitespace-nowrap">{f.tempo_oab || '—'}</td>
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
          </Cartao>

        </div>
      )}

      {fechamentoAberto != null && (
        <FechamentoPopup
          id={fechamentoAberto}
          onClose={() => setFechamentoAberto(null)}
          onAlterado={() => fetchData(range, vendedorFilter, true)}
        />
      )}
    </div>
  );
}
