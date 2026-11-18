import React, { useState, useEffect, useCallback, useRef } from 'react';
import SplitHeadline from '../components/SplitHeadline';
import { Cartao, CartaoKpi, DivisaoDoKpi, LinhaComBolinha, LinhasNoTempo, ListaDeBarras } from '../components/graficos';
import {
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  DollarSign, Users, UserCheck, Video, RefreshCw,
  Calendar, ChevronDown, MousePointerClick, Eye, Megaphone,
  BarChart2, Target, AlertCircle, TrendingUp, FileSignature
} from 'lucide-react';
import { CarregandoBloco } from '../components/LoadingSpinner';

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
  total_vendas: number;
  vendas_trafego?: number;
  receita_trafego?: number;
  cac: number;
}
interface DashData {
  kpis: Kpis;
  daily_spend: any[];
  daily_leads: any[];
  campaigns: any[];
  nichos: any[];
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



// ── Day format helper ─────────────────────────────────────────────────────
function getDay(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
}

// ── Main Component ────────────────────────────────────────────────────────
/**
 * `embutido`: usado como aba "Marketing" dentro de Comercial › Métricas. Nesse
 * modo o período vem de fora (o seletor da própria página de Métricas), o
 * cabeçalho some e `versao` pede uma nova busca quando o usuário clica em
 * atualizar lá em cima.
 */
export default function MarketingDashboard({ embutido = false, range: rangeExterno, versao = 0 }: {
  embutido?: boolean; range?: DateRange; versao?: number;
} = {}) {
  const today = new Date();
  const defaultRange = (): DateRange => {
    const y = today.getFullYear(), m = today.getMonth() + 1;
    const start = `${y}-${String(m).padStart(2,'0')}-01`;
    const end   = `${y}-${String(m).padStart(2,'0')}-${String(daysInMonth(y, m)).padStart(2,'0')}`;
    return { start, end };
  };

  const [rangeProprio, setRange] = useState<DateRange>(defaultRange);
  const range = embutido && rangeExterno ? rangeExterno : rangeProprio;
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

  useEffect(() => { fetchData(range); }, [range.start, range.end, fetchData]);
  // Botão de atualizar da página que embute (Métricas): busca sem esconder a tela.
  useEffect(() => { if (versao > 0) fetchData(range, true); }, [versao]);

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
  const valVendas = kpis.total_vendas || 0;
  const valCAC = kpis.cac || 0;
  const valVendasTrafego = kpis.vendas_trafego || 0;
  const valReceitaTrafego = kpis.receita_trafego || 0;

  const dailySpend = (data?.daily_spend || []).map(d => ({ ...d, day: getDay(d.date) }));
  const dailyLeads = (data?.daily_leads || []).map(d => ({ ...d, day: getDay(d.date) }));
  const campanhas  = data?.campaigns || [];
  const nichos     = data?.nichos || [];

  return (
    <div className={embutido ? '' : 'min-h-screen bg-dark-bg transition-colors duration-300'}>
      
      {/* ── Header ───────────────────────────────────────────────────────── */}
      {!embutido && (
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4 flex-wrap gap-4">
        <div>
          <SplitHeadline text="Dashboard " highlight="Marketing" />
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
            {rangeLabel ? rangeLabel : 'Visão geral de performance de tráfego'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker range={range} onChange={setRange} />
          <button
            onClick={() => fetchData(range, true)}
            className={`w-9 h-9 rounded-xl bg-dark-card border border-black/10 dark:border-white/10 hover:bg-dark-card-hover flex items-center justify-center transition-colors ${spinning ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={14} className="text-slate-400" />
          </button>
        </div>
      </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-6 md:mx-8 mb-4 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {loading && !data ? (
        <CarregandoBloco className="h-64" />
      ) : data && (
        <div className="px-6 md:px-8 pb-10 space-y-5">

          {/* ── Indicadores (desenho do Dashboard Operacional) ─────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <CartaoKpi
              titulo="Investimento"
              pilula={dailySpend.length ? `${fmtCurrency(valSpend / dailySpend.length)}/dia` : undefined}
              valor={fmtCurrency(valSpend)}
              apoio={`Custo por lead: ${fmtCurrency(valLeads > 0 ? valSpend / valLeads : 0)}`}
            />
            <CartaoKpi
              titulo="Reuniões marcadas"
              pilula={`${pct(valReuniMarcadas, valLeads)} dos leads`}
              valor={fmtInt(valReuniMarcadas)}
              apoio={`Custo por marcada: ${fmtCurrency(valReuniMarcadas > 0 ? valSpend / valReuniMarcadas : 0)}`}
              visual={<DivisaoDoKpi partes={[
                { rotulo: 'Realizadas', valor: valReuniRealizadas, cor: '#10b981' },
                { rotulo: 'Não realizadas', valor: Math.max(0, valReuniMarcadas - valReuniRealizadas), cor: 'rgb(var(--accent-color) / .3)' },
              ]} />}
            />
            {/* Contratos fechados que vieram do tráfego — origem "campanhas" no fechamento. Indicação fica fora. */}
            <CartaoKpi
              titulo="Contratos do tráfego"
              pilula={`${pct(valVendasTrafego, valReuniRealizadas)} das realizadas`}
              valor={fmtInt(valVendasTrafego)}
              apoio={<>Receita {fmtCurrency(valReceitaTrafego)}{valVendas > valVendasTrafego ? ` · ${fmtInt(valVendas - valVendasTrafego)} de outras origens fora` : ''}</>}
              visual={<DivisaoDoKpi partes={[
                { rotulo: 'Tráfego', valor: valVendasTrafego, cor: 'rgb(var(--accent-color))' },
                { rotulo: 'Outras origens', valor: Math.max(0, valVendas - valVendasTrafego), cor: '#ec4899' },
              ]} />}
            />
            {/* CAC por último: fecha a leitura (verba → reunião → contrato → custo do contrato). */}
            <CartaoKpi
              titulo="CAC"
              pilula="só tráfego"
              valor={fmtCurrency(valCAC)}
              apoio={valSpend > 0 && valReceitaTrafego > 0 ? `Receita = ${(valReceitaTrafego / valSpend).toFixed(1).replace('.', ',')}× o investido` : 'Verba ÷ contratos do tráfego'}
            />
          </div>

          {/* ── Investimento e leads por dia ───────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Cartao titulo="Investimento por dia" legenda={`Gasto em anúncios — ${rangeLabel}`}>
              {dailySpend.length > 1
                ? <LinhasNoTempo id="mk-gasto" series={[{ rotulo: 'Gasto', cor: 'rgb(var(--accent-color))', valores: dailySpend.map(d => Number(d.spend) || 0) }]} rotulos={dailySpend.map(d => d.day)} formato={v => `R$ ${Math.round(v).toLocaleString('pt-BR')}`} suave={1} />
                : <p className="py-10 text-center text-sm text-slate-500">Sem dados</p>}
            </Cartao>
            <Cartao titulo="Leads por dia" legenda={`${fmtInt(valLeads)} leads no período`}>
              {dailyLeads.length > 1
                ? <LinhasNoTempo id="mk-leads" series={[{ rotulo: 'Leads', cor: '#10b981', valores: dailyLeads.map(d => Number(d.leads) || 0) }]} rotulos={dailyLeads.map(d => d.day)} formato={v => String(Math.round(v))} suave={1} />
                : <p className="py-10 text-center text-sm text-slate-500">Sem dados</p>}
            </Cartao>
          </div>

          {/* ── Tráfego + Leads por nicho ──────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <Cartao className="lg:col-span-5" titulo="Tráfego" legenda="Do anúncio à reunião">
              {[
                { cor: '#06b6d4', t: 'Impressões', d: kpis.total_impressions ? `CPM ${fmtCurrency((valSpend / kpis.total_impressions) * 1000)}` : '', v: fmtInt(kpis.total_impressions) },
                { cor: '#f59e0b', t: 'Cliques', d: `CTR ${kpis.total_impressions ? pct(kpis.total_clicks, kpis.total_impressions) : '0%'}${kpis.total_clicks ? ` · CPC ${fmtCurrency(valSpend / kpis.total_clicks)}` : ''}`, v: fmtInt(kpis.total_clicks) },
                { cor: 'rgb(var(--accent-color))', t: 'Leads', d: `Custo por lead ${fmtCurrency(valLeads > 0 ? valSpend / valLeads : 0)}`, v: fmtInt(valLeads) },
                { cor: '#ec4899', t: 'Reuniões marcadas', d: `${pct(valReuniMarcadas, valLeads)} dos leads`, v: fmtInt(valReuniMarcadas) },
                { cor: '#10b981', t: 'Reuniões realizadas', d: `${pct(valReuniRealizadas, valReuniMarcadas)} das marcadas · ${fmtCurrency(valReuniRealizadas > 0 ? valSpend / valReuniRealizadas : 0)} cada`, v: fmtInt(valReuniRealizadas) },
              ].map(l => <LinhaComBolinha key={l.t} cor={l.cor} titulo={l.t} detalhe={l.d} valor={<span className="text-[13px] text-dark-text">{l.v}</span>} />)}
            </Cartao>
            <Cartao className="lg:col-span-7" titulo="Leads por nicho" legenda={`Nichos mais frequentes — ${rangeLabel}`}>
              {nichos.length === 0
                ? <p className="py-10 text-center text-sm text-slate-500">Nenhum lead com nicho</p>
                : (() => {
                  const total = nichos.reduce((s2: number, n: any) => s2 + Number(n.total), 0);
                  return <ListaDeBarras limite={8} itens={nichos.map((n: any) => ({ rotulo: n.nicho || 'Não preenchido', valor: Number(n.total), cor: '#10b981' }))} detalhe={it => pct(it.valor, total)} />;
                })()}
            </Cartao>
          </div>

          {/* ── Campanhas ──────────────────────────────────────────────── */}
          <Cartao
            titulo={<span className="flex items-center gap-2">Campanhas <span className="pilula-cartao">{kpis.total_campaigns} ativas</span></span>}
            legenda="Ordenadas pelo valor gasto no período"
          >
            {campanhas.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">Nenhuma campanha neste período</p>
            ) : (() => {
              const maior = Math.max(1, ...campanhas.map((c: any) => Number(c.spend) || 0));
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-black/5 dark:border-white/5">
                        <th className="pb-3 pr-4 font-medium">Campanha</th>
                        <th className="pb-3 pr-4 font-medium text-right">Impressões</th>
                        <th className="pb-3 pr-4 font-medium text-right">Cliques</th>
                        <th className="pb-3 pr-4 font-medium text-right">CTR</th>
                        <th className="pb-3 font-medium text-right">Gasto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campanhas.map((c: any, i: number) => (
                        <tr key={i} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-violet-500/5 transition-colors">
                          <td className="py-2.5 pr-4">
                            <p className="text-[13px] font-medium text-dark-text line-clamp-1" title={c.campaign_name}>{c.campaign_name || '—'}</p>
                            <span className="gf-trilho mt-1.5 block max-w-[320px]"><i style={{ width: `${((Number(c.spend) || 0) / maior) * 100}%` }} /></span>
                          </td>
                          <td className="py-2.5 pr-4 numero text-[12.5px] text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">{fmtInt(c.impressions)}</td>
                          <td className="py-2.5 pr-4 numero text-[12.5px] text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">{fmtInt(c.clicks)}</td>
                          <td className="py-2.5 pr-4 numero text-[12.5px] text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">{Number(c.impressions) ? pct(Number(c.clicks), Number(c.impressions)) : '—'}</td>
                          <td className="py-2.5 numero text-[13px] text-dark-text text-right whitespace-nowrap">{fmtCurrency(c.spend)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </Cartao>

        </div>
      )}
    </div>
  );
}
