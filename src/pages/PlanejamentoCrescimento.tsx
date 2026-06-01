import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Users, Target, DollarSign, CalendarDays, Edit2, RefreshCw, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer 
} from 'recharts';

interface GrowthMonthData {
  id?: number;
  year: number;
  month: number;
  initial_clients: number;
  churn_rate: string | number;
  churn_count: number;
  new_clients: number;
  traffic_budget: string | number;
  cac: string | number;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PlanejamentoCrescimento() {
  const [year] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // Defaults to June (6)
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [projections, setProjections] = useState<GrowthMonthData[]>([]);
  const [realized, setRealized] = useState<GrowthMonthData[]>([]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'projections' | 'realized'>('projections');
  const [editMonth, setEditMonth] = useState<number>(6);
  const [initialClients, setInitialClients] = useState(0);
  const [churnRate, setChurnRate] = useState(0);
  const [churnCount, setChurnCount] = useState(0);
  const [newClients, setNewClients] = useState(0);
  const [trafficBudget, setTrafficBudget] = useState(0);
  const [cac, setCac] = useState(0);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setSpinning(true);
    try {
      const res = await fetch(`/api/growth-planning?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        // Sort arrays by month to ensure chronologic order
        const sortedProjections = (data.projections || []).sort((a: any, b: any) => a.month - b.month);
        const sortedRealized = (data.realized || []).sort((a: any, b: any) => a.month - b.month);
        setProjections(sortedProjections);
        setRealized(sortedRealized);
      }
    } catch (err) {
      console.error('Error fetching growth data:', err);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year]);

  // Open modal and pre-fill form
  const openEditModal = (type: 'projections' | 'realized', m: number) => {
    setModalType(type);
    setEditMonth(m);
    const dataList = type === 'projections' ? projections : realized;
    const monthData = dataList.find(item => item.month === m);
    
    if (monthData) {
      setInitialClients(monthData.initial_clients || 0);
      setChurnRate(parseFloat(String(monthData.churn_rate)) || 0);
      setChurnCount(monthData.churn_count || 0);
      setNewClients(monthData.new_clients || 0);
      setTrafficBudget(parseFloat(String(monthData.traffic_budget)) || 0);
      setCac(parseFloat(String(monthData.cac)) || 0);
    } else {
      setInitialClients(0);
      setChurnRate(0);
      setChurnCount(0);
      setNewClients(0);
      setTrafficBudget(0);
      setCac(0);
    }
    setIsModalOpen(true);
  };

  // Submit edit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalOpen(false);
    setLoading(true);
    try {
      const endpoint = `/api/growth-planning/${modalType}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year,
          month: editMonth,
          initial_clients: initialClients,
          churn_rate: churnRate,
          churn_count: churnCount,
          new_clients: newClients,
          traffic_budget: trafficBudget,
          cac
        })
      });

      if (res.ok) {
        await fetchData(true);
      } else {
        console.error('Failed to update growth data');
      }
    } catch (err) {
      console.error('Error updating data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Chart data calculation: Accumulate base clients month-by-month
  const chartData = useMemo(() => {
    if (projections.length === 0) return [];
    
    return MESES.map((label, idx) => {
      const mNum = idx + 1;
      const proj = projections.find(p => p.month === mNum);
      const real = realized.find(r => r.month === mNum);

      // Accumulative client calculation for chart line
      // projection cumulative = initial + new - churn
      const projBase = proj ? (proj.initial_clients + proj.new_clients - proj.churn_count) : 0;
      
      // For realized: only show if initial or new exists (meaning it has been filled/updated)
      const hasRealValue = real && (real.initial_clients > 0 || real.new_clients > 0 || real.churn_count > 0 || real.traffic_budget > 0);
      const realBase = hasRealValue && real ? (real.initial_clients + real.new_clients - real.churn_count) : null;

      return {
        name: `Mês ${mNum}`,
        "Projeção Base": projBase,
        "Realizado Base": realBase,
        monthLabel: label
      };
    });
  }, [projections, realized]);

  // Derived KPIs based on year-end / averages
  const kpis = useMemo(() => {
    // Projeção Meta Clientes (Dec)
    const decProj = projections.find(p => p.month === 12);
    const metaClientesDec = decProj ? (decProj.initial_clients + decProj.new_clients - decProj.churn_count) : 127;

    // Average monthly new clients in projections
    const avgNewProj = projections.length > 0
      ? Math.round(projections.reduce((sum, p) => sum + p.new_clients, 0) / projections.length)
      : 15;

    // Average monthly budget
    const avgBudgetProj = projections.length > 0
      ? projections.reduce((sum, p) => sum + parseFloat(String(p.traffic_budget)), 0) / projections.length
      : 20000;

    // Average CAC
    const avgCACProj = projections.length > 0
      ? projections.reduce((sum, p) => sum + parseFloat(String(p.cac)), 0) / projections.length
      : 1300;

    return {
      metaClientesDec,
      avgNewProj,
      avgBudgetProj,
      avgCACProj
    };
  }, [projections]);

  // Current selected month status metrics
  const monthStatus = useMemo(() => {
    const proj = projections.find(p => p.month === selectedMonth);
    const real = realized.find(r => r.month === selectedMonth);

    const hasRealValue = real && (real.initial_clients > 0 || real.new_clients > 0 || real.churn_count > 0 || real.traffic_budget > 0);

    const metaNew = proj ? proj.new_clients : 0;
    const realNew = hasRealValue && real ? real.new_clients : null;
    const devNew = realNew !== null ? realNew - metaNew : null;

    const metaChurnCnt = proj ? proj.churn_count : 0;
    const realChurnCnt = hasRealValue && real ? real.churn_count : null;
    const devChurnCnt = realChurnCnt !== null ? realChurnCnt - metaChurnCnt : null;

    const metaChurnRate = proj ? parseFloat(String(proj.churn_rate)) : 0;
    const realChurnRate = hasRealValue && real ? parseFloat(String(real.churn_rate)) : null;
    const devChurnRate = realChurnRate !== null ? realChurnRate - metaChurnRate : null;

    const metaBudget = proj ? parseFloat(String(proj.traffic_budget)) : 0;
    const realBudget = hasRealValue && real ? parseFloat(String(real.traffic_budget)) : null;
    const devBudget = realBudget !== null ? realBudget - metaBudget : null;

    const metaCac = proj ? parseFloat(String(proj.cac)) : 0;
    const realCac = hasRealValue && real ? parseFloat(String(real.cac)) : null;
    const devCac = realCac !== null ? realCac - metaCac : null;

    return {
      monthLabel: MESES[selectedMonth - 1],
      hasRealValue,
      newCl: { meta: metaNew, real: realNew, dev: devNew },
      churnCnt: { meta: metaChurnCnt, real: realChurnCnt, dev: devChurnCnt },
      churnRate: { meta: metaChurnRate, real: realChurnRate, dev: devChurnRate },
      budget: { meta: metaBudget, real: realBudget, dev: devBudget },
      cac: { meta: metaCac, real: realCac, dev: devCac }
    };
  }, [projections, realized, selectedMonth]);

  // Premium loading view
  if (loading && projections.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-bg">
        <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg p-8 font-sans text-dark-text transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* ── Page Header ─────────────────────────────────────────── */}
        <PageHeader 
          title="Planejamento de" 
          titleAccent="Crescimento" 
          subtitle="ACOMPANHAMENTO DE METAS VS RESULTADOS REAIS DE 2026"
        >
          <div className="flex items-center gap-3">
            {/* Month select dropdown */}
            <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 bg-dark-card border border-white/10">
              <CalendarDays size={14} className="text-violet-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-dark-text focus:outline-none cursor-pointer pr-1"
              >
                {MESES.map((m, idx) => (
                  <option key={idx} value={idx + 1} className="bg-[#11111b] text-dark-text">
                    {m} {year}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Refresh button */}
            <button
              onClick={() => fetchData(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5 bg-dark-card border border-white/10"
            >
              <RefreshCw size={14} className={`text-slate-400 ${spinning ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </PageHeader>

        {/* ── KPI Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI 1: Meta Clientes */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col gap-2 min-w-0 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Meta Clientes (Dez)</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10">
                <Users size={16} className="text-violet-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-dark-text tracking-tight">{kpis.metaClientesDec}</div>
            <div className="text-[10px] text-slate-500">Base total prevista para fim do ano</div>
          </div>

          {/* KPI 2: Meta Novos/Mês */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col gap-2 min-w-0 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Meta Novos / Mês</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10">
                <TrendingUp size={16} className="text-violet-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-dark-text tracking-tight">+{kpis.avgNewProj}</div>
            <div className="text-[10px] text-slate-500">Média de novos clientes por mês</div>
          </div>

          {/* KPI 3: Budget Mensal */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col gap-2 min-w-0 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Budget Mensal</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10">
                <DollarSign size={16} className="text-violet-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-dark-text tracking-tight">{fmtBRL(kpis.avgBudgetProj)}</div>
            <div className="text-[10px] text-slate-500">Verba de tráfego média mensal</div>
          </div>

          {/* KPI 4: Meta CAC */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col gap-2 min-w-0 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Meta CAC</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10">
                <Target size={16} className="text-violet-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-dark-text tracking-tight">{fmtBRL(kpis.avgCACProj)}</div>
            <div className="text-[10px] text-slate-500">Custo de Aquisição planejado</div>
          </div>

        </div>

        {/* ── Main Growth Chart & Side Status ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Big Chart Card */}
          <div className="lg:col-span-2 bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-dark-text">Crescimento de Base: Projeção vs Real</h2>
              <p className="text-xs text-slate-500 mb-5 mt-0.5">Evolução acumulativa da base total de clientes ao longo do ano</p>
            </div>
            
            <div className="w-full h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2936" vertical={false} />
                  <XAxis dataKey="name" stroke="#6c6a85" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6c6a85" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#11111b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <RechartsLegend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="Projeção Base" stroke="#7c3aed" strokeWidth={3} fillOpacity={1} fill="url(#colorProj)" />
                  <Area type="monotone" dataKey="Realizado Base" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorReal)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Month Status Card */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} className="text-violet-400" />
                <h2 className="text-sm font-bold text-dark-text">Status de {monthStatus.monthLabel}</h2>
              </div>
              <p className="text-xs text-slate-500 mb-6">Comparação direta das métricas projetadas vs reais no mês selecionado</p>
              
              <div className="space-y-4">
                
                {/* Headers */}
                <div className="grid grid-cols-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-white/5">
                  <span className="col-span-1">Métrica</span>
                  <span className="text-right">Meta</span>
                  <span className="text-right">Real</span>
                  <span className="text-right">Desvio</span>
                </div>

                {/* Metric 1: Novos Clientes */}
                <div className="grid grid-cols-4 text-xs py-1 items-center">
                  <span className="font-semibold text-slate-300 col-span-1">Novos</span>
                  <span className="text-right font-medium text-slate-400">{monthStatus.newCl.meta}</span>
                  <span className="text-right font-medium text-dark-text">{monthStatus.newCl.real !== null ? monthStatus.newCl.real : '—'}</span>
                  <span className={`text-right font-bold ${
                    monthStatus.newCl.dev === null ? 'text-slate-500' :
                    monthStatus.newCl.dev >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {monthStatus.newCl.dev !== null ? `${monthStatus.newCl.dev >= 0 ? '+' : ''}${monthStatus.newCl.dev}` : '—'}
                  </span>
                </div>

                {/* Metric 2: Saída (Churn) */}
                <div className="grid grid-cols-4 text-xs py-1 items-center">
                  <span className="font-semibold text-slate-300 col-span-1">Saídas</span>
                  <span className="text-right font-medium text-slate-400">{monthStatus.churnCnt.meta}</span>
                  <span className="text-right font-medium text-dark-text">{monthStatus.churnCnt.real !== null ? monthStatus.churnCnt.real : '—'}</span>
                  <span className={`text-right font-bold ${
                    monthStatus.churnCnt.dev === null ? 'text-slate-500' :
                    monthStatus.churnCnt.dev <= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {monthStatus.churnCnt.dev !== null ? `${monthStatus.churnCnt.dev >= 0 ? '+' : ''}${monthStatus.churnCnt.dev}` : '—'}
                  </span>
                </div>

                {/* Metric 3: Churn % */}
                <div className="grid grid-cols-4 text-xs py-1 items-center">
                  <span className="font-semibold text-slate-300 col-span-1">Churn %</span>
                  <span className="text-right font-medium text-slate-400">{monthStatus.churnRate.meta.toFixed(1)}%</span>
                  <span className="text-right font-medium text-dark-text">{monthStatus.churnRate.real !== null ? `${monthStatus.churnRate.real.toFixed(1)}%` : '—'}</span>
                  <span className={`text-right font-bold ${
                    monthStatus.churnRate.dev === null ? 'text-slate-500' :
                    monthStatus.churnRate.dev <= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {monthStatus.churnRate.dev !== null ? `${monthStatus.churnRate.dev >= 0 ? '+' : ''}${monthStatus.churnRate.dev.toFixed(1)}%` : '—'}
                  </span>
                </div>

                {/* Metric 4: Investimento */}
                <div className="grid grid-cols-4 text-xs py-1 items-center">
                  <span className="font-semibold text-slate-300 col-span-1">Tráfego</span>
                  <span className="text-right font-medium text-slate-400">{fmtBRL(monthStatus.budget.meta)}</span>
                  <span className="text-right font-medium text-dark-text">{monthStatus.budget.real !== null ? fmtBRL(monthStatus.budget.real) : '—'}</span>
                  <span className={`text-right font-bold ${
                    monthStatus.budget.dev === null ? 'text-slate-500' :
                    monthStatus.budget.dev <= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {monthStatus.budget.dev !== null ? `${monthStatus.budget.dev >= 0 ? '+' : ''}${fmtBRL(monthStatus.budget.dev)}` : '—'}
                  </span>
                </div>

                {/* Metric 5: CAC */}
                <div className="grid grid-cols-4 text-xs py-1 items-center">
                  <span className="font-semibold text-slate-300 col-span-1">CAC</span>
                  <span className="text-right font-medium text-slate-400">{fmtBRL(monthStatus.cac.meta)}</span>
                  <span className="text-right font-medium text-dark-text">{monthStatus.cac.real !== null ? fmtBRL(monthStatus.cac.real) : '—'}</span>
                  <span className={`text-right font-bold ${
                    monthStatus.cac.dev === null ? 'text-slate-500' :
                    monthStatus.cac.dev <= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {monthStatus.cac.dev !== null ? `${monthStatus.cac.dev >= 0 ? '+' : ''}${fmtBRL(monthStatus.cac.dev)}` : '—'}
                  </span>
                </div>

              </div>
            </div>

            {/* Strategic Callout Box */}
            <div className="mt-6 p-4 rounded-xl border border-[#7c3aed]/10 bg-[#7c3aed]/5 text-xs text-[#b392f0]">
              "O planejamento estratégico é a base para o crescimento sustentável. Acompanhe os desvios mensalmente para ajustar a rota de marketing e vendas."
            </div>
          </div>

        </div>

        {/* ── Table Sections ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Table 1: Projections */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-dark-text">PROJEÇÃO {year}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Planejamento e metas estimadas</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-violet-500/20 text-violet-400 uppercase tracking-widest">Planejado</span>
                <button
                  onClick={() => openEditModal('projections', selectedMonth)}
                  className="px-3 py-1 rounded-lg border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors flex items-center gap-1"
                >
                  <Edit2 size={10} /> Editar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                    <th className="pb-2">Mês</th>
                    <th className="pb-2 text-right">Início</th>
                    <th className="pb-2 text-right">Churn %</th>
                    <th className="pb-2 text-right">Saídas</th>
                    <th className="pb-2 text-right">Novos</th>
                    <th className="pb-2 text-right">Tráfego</th>
                    <th className="pb-2 text-right">CAC</th>
                  </tr>
                </thead>
                <tbody>
                  {projections.map((p) => (
                    <tr 
                      key={p.month}
                      onClick={() => setSelectedMonth(p.month)}
                      className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                        selectedMonth === p.month ? 'bg-violet-500/5' : ''
                      }`}
                    >
                      <td className="py-2.5 font-bold">{p.month}</td>
                      <td className="py-2.5 text-right font-medium text-slate-400">{p.initial_clients}</td>
                      <td className="py-2.5 text-right text-slate-400">{parseFloat(String(p.churn_rate)).toFixed(1)}%</td>
                      <td className="py-2.5 text-right text-rose-400">{p.churn_count}</td>
                      <td className="py-2.5 text-right text-emerald-400">+{p.new_clients}</td>
                      <td className="py-2.5 text-right text-slate-400">{fmtBRL(parseFloat(String(p.traffic_budget)))}</td>
                      <td className="py-2.5 text-right text-slate-400">{fmtBRL(parseFloat(String(p.cac)))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table 2: Realized */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-dark-text">REALIZADO {year}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Resultados reais de performance obtidos</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-400 uppercase tracking-widest">Atualizado</span>
                <button
                  onClick={() => openEditModal('realized', selectedMonth)}
                  className="px-3 py-1 rounded-lg border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/5 transition-colors flex items-center gap-1"
                >
                  <Edit2 size={10} /> Editar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                    <th className="pb-2">Mês</th>
                    <th className="pb-2 text-right">Início</th>
                    <th className="pb-2 text-right">Churn %</th>
                    <th className="pb-2 text-right">Saídas</th>
                    <th className="pb-2 text-right">Novos</th>
                    <th className="pb-2 text-right">Tráfego</th>
                    <th className="pb-2 text-right">CAC</th>
                  </tr>
                </thead>
                <tbody>
                  {realized.map((r) => {
                    const hasData = r.initial_clients > 0 || r.new_clients > 0 || r.churn_count > 0 || parseFloat(String(r.traffic_budget)) > 0;
                    return (
                      <tr 
                        key={r.month}
                        onClick={() => setSelectedMonth(r.month)}
                        className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                          selectedMonth === r.month ? 'bg-emerald-500/5' : ''
                        }`}
                      >
                        <td className="py-2.5 font-bold">{r.month}</td>
                        <td className="py-2.5 text-right font-medium text-slate-400">{hasData ? r.initial_clients : '—'}</td>
                        <td className="py-2.5 text-right text-slate-400">{hasData ? `${parseFloat(String(r.churn_rate)).toFixed(1)}%` : '—'}</td>
                        <td className="py-2.5 text-right text-rose-400">{hasData ? r.churn_count : '—'}</td>
                        <td className="py-2.5 text-right text-emerald-400">{hasData ? `+${r.new_clients}` : '—'}</td>
                        <td className="py-2.5 text-right text-slate-400">{hasData ? fmtBRL(parseFloat(String(r.traffic_budget))) : '—'}</td>
                        <td className="py-2.5 text-right text-slate-400">{hasData ? fmtBRL(parseFloat(String(r.cac))) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* ── Glassmorphic Modal Editor ───────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 transition-opacity">
          <div className="relative w-full max-w-lg bg-white/95 dark:bg-[#11111b]/95 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-6">
            
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-dark-text">
                  Editar {modalType === 'projections' ? 'Meta/Projeção' : 'Resultado Realizado'}
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                  Mês {editMonth} ({MESES[editMonth - 1]} {year})
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-dark-text text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                
                {/* Initial Clients */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clientes Início</label>
                  <input
                    type="number"
                    value={initialClients}
                    onChange={(e) => setInitialClients(Number(e.target.value))}
                    className="rounded-xl px-3 py-2 text-sm bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-white/10 text-slate-900 dark:text-dark-text focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* New Clients */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Novos Clientes</label>
                  <input
                    type="number"
                    value={newClients}
                    onChange={(e) => setNewClients(Number(e.target.value))}
                    className="rounded-xl px-3 py-2 text-sm bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-white/10 text-slate-900 dark:text-dark-text focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Churn % */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Churn %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={churnRate}
                    onChange={(e) => setChurnRate(Number(e.target.value))}
                    className="rounded-xl px-3 py-2 text-sm bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-white/10 text-slate-900 dark:text-dark-text focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Churn Count */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Saídas (Qtd)</label>
                  <input
                    type="number"
                    value={churnCount}
                    onChange={(e) => setChurnCount(Number(e.target.value))}
                    className="rounded-xl px-3 py-2 text-sm bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-white/10 text-slate-900 dark:text-dark-text focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Traffic Budget */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tráfego (R$)</label>
                  <input
                    type="number"
                    value={trafficBudget}
                    onChange={(e) => setTrafficBudget(Number(e.target.value))}
                    className="rounded-xl px-3 py-2 text-sm bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-white/10 text-slate-900 dark:text-dark-text focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* CAC */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CAC (R$)</label>
                  <input
                    type="number"
                    value={cac}
                    onChange={(e) => setCac(Number(e.target.value))}
                    className="rounded-xl px-3 py-2 text-sm bg-slate-100 dark:bg-dark-bg border border-slate-200 dark:border-white/10 text-slate-900 dark:text-dark-text focus:outline-none focus:border-violet-500"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-violet-600 hover:bg-violet-700 hover:shadow-lg transition-all"
                >
                  Salvar Alterações
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
