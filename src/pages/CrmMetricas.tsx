import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, PieChart, Pie, Cell
} from 'recharts';
import {
  Calendar, TrendingUp, DollarSign, Users, Target, RefreshCw,
  ChevronDown, Award, PhoneCall, UserCheck, RotateCcw
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

// ── MonthPicker ───────────────────────────────────────────────────────────
const ANOS = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];

function MonthPicker({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [yStr, mStr] = month.split('-');
  const selYear  = parseInt(yStr);
  const selMonth = parseInt(mStr); // 1-12
  const [pickerYear, setPickerYear] = useState(selYear);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function selectMonth(m: number) {
    const mm = String(m).padStart(2, '0');
    onChange(`${pickerYear}-${mm}`);
    setOpen(false);
  }

  const label = `${MESES_FULL[selMonth - 1]} ${yStr}`;

  function stepMonth(dir: 1 | -1) {
    let y = selYear;
    let m = selMonth + dir;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1)  { m = 12; y -= 1; }
    onChange(`${y}-${String(m).padStart(2, '0')}`);
  }

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      {/* Seta esquerda */}
      <button
        onClick={() => stepMonth(-1)}
        className="w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:border-violet-500/60 flex items-center justify-center transition-all hover:bg-dark-card-hover"
        title="Mês anterior"
      >
        <ChevronDown size={14} className="text-slate-400 rotate-90" />
      </button>

      {/* Trigger button */}
      <button
        onClick={() => { setPickerYear(selYear); setOpen(o => !o); }}
        className="flex items-center gap-2.5 bg-dark-card border border-violet-500/60 rounded-xl px-4 py-2.5 transition-all hover:border-violet-500"
      >
        <Calendar size={14} className="text-violet-500" />
        <span className="text-sm font-bold text-dark-text">{label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Seta direita */}
      <button
        onClick={() => stepMonth(1)}
        className="w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:border-violet-500/60 flex items-center justify-center transition-all hover:bg-dark-card-hover"
        title="Próximo mês"
      >
        <ChevronDown size={14} className="text-slate-400 -rotate-90" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Selecionar Período</p>

          {/* Ano */}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ano</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {ANOS.map(a => (
              <button
                key={a}
                onClick={() => {
                  setPickerYear(a);
                  // Atualiza imediatamente os gráficos com o novo ano (mesmo mês)
                  const mm = String(selMonth).padStart(2, '0');
                  onChange(`${a}-${mm}`);
                }}
                className={`flex-1 min-w-[72px] py-2 rounded-xl text-sm font-bold transition-all ${
                  a === pickerYear
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-dark-bg text-slate-400 hover:bg-dark-card-hover hover:text-dark-text'
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          {/* Mês */}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mês</p>
          <div className="grid grid-cols-3 gap-2">
            {MESES.map((m, i) => {
              const isSelected = i + 1 === selMonth && pickerYear === selYear;
              return (
                <button
                  key={m}
                  onClick={() => selectMonth(i + 1)}
                  className={`py-2 rounded-xl text-sm font-bold transition-all ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                      : 'bg-dark-bg text-slate-400 hover:bg-dark-card-hover hover:text-dark-text'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
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
  const [month, setMonth]   = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const fetchData = useCallback(async (m: string, silent = false) => {
    if (!silent) setLoading(true);
    setSpinning(true);
    setError(null);
    try {
      const res = await fetch(`/api/crm-metricas-dashboard?month=${m}`);
      if (!res.ok) throw new Error((await res.json()).detail || 'Erro ao carregar dados');
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  }, []);

  useEffect(() => { fetchData(month); }, [month, fetchData]);

  const [yStr, mStr]  = month.split('-');
  const monthLabel     = `${MESES_FULL[parseInt(mStr) - 1]} ${yStr}`;

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

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dark-text">Comercial</h1>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Performance de Vendas</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} onChange={setMonth} />
          <button
            onClick={() => fetchData(month, true)}
            className={`w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:bg-dark-card-hover flex items-center justify-center transition-colors ${spinning ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={14} className="text-slate-400" />
          </button>
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
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 mt-0.5">Distribuição por motivo — {monthLabel}</p>

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

          {/* ── Sessão de Reuniões ──────────────────────────────────────── */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Sessão de Reuniões</p>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SessaoCard
                iconBg="bg-violet-500/15"
                icon={<Calendar size={17} className="text-violet-500" />}
                label="Reuniões Marcadas"
                value={marcadas}
                sub={`Taxa de agendamento: ${pct(marcadas, marcadas + noshow)}`}
              />
              <SessaoCard
                iconBg="bg-emerald-500/15"
                icon={<UserCheck size={17} className="text-emerald-500" />}
                label="Reuniões Realizadas"
                value={realizadas}
                sub={`Taxa de comparecimento: ${pct(realizadas, marcadas)}`}
              />
              <SessaoCard
                iconBg="bg-orange-500/15"
                icon={<PhoneCall size={17} className="text-orange-500" />}
                label="No-Show"
                value={noshow}
                sub={`Taxa de no-show: ${pct(noshow, marcadas)}`}
              />
              <SessaoCard
                iconBg="bg-cyan-500/15"
                icon={<RotateCcw size={17} className="text-cyan-500" />}
                label="Reagendamento"
                value={reagend}
                sub={`Taxa: ${pct(reagend, marcadas)}`}
              />
            </div>
          </div>

          {/* ── Lista de Fechamentos ────────────────────────────────────── */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-dark-text">Lista de Fechamentos — {monthLabel}</h2>
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
