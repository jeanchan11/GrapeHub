
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { toPng } from 'html-to-image';
import { 
  Calculator, TrendingUp, UserCheck, 
  Target, DollarSign, Wallet, 
  Info, AlertCircle, Briefcase, Zap, FileDown, Trophy, Medal, Star, CheckCircle2,
  Users, BarChart3, Activity, ShieldAlert, Award, Check, X, ClipboardList, CalendarDays, ListTodo
} from 'lucide-react';
import { TrafficManagerData, TrafficManagerResults } from '../../types';

// Components
const StatCard = ({ icon: Icon, title, value, subtitle, colorClass, highlighted = false, statusLabel }: { 
  icon: any, title: string, value: string, subtitle?: string, colorClass: string, highlighted?: boolean, statusLabel?: string
}) => (
  <div className={`p-6 rounded-2xl shadow-sm border transition-all relative overflow-hidden ${highlighted ? 'bg-slate-100 dark:bg-dark-card-hover border-violet-500/30 ring-1 ring-violet-500/20 shadow-lg shadow-violet-500/5' : 'bg-light-card dark:bg-dark-card border-slate-200 dark:border-white/5'}`}>
    {statusLabel && (
      <div className="absolute top-2 right-2 px-2 py-0.5 bg-violet-600 text-white text-[8px] font-bold rounded-full uppercase tracking-tighter">
        {statusLabel}
      </div>
    )}
    <div className={`p-2 w-fit rounded-lg ${colorClass}`}>
      <Icon size={20} className="text-white" />
    </div>
    <p className={`text-sm font-medium mt-3 ${highlighted ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'}`}>{title}</p>
    <h3 className="text-2xl font-bold text-light-text dark:text-white">{value}</h3>
    {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
  </div>
);

const InputField = ({ label, value, onChange, prefix, suffix, min = 0, step = 1, helper, max }: {
  label: string, value: number, onChange: (val: number) => void, prefix?: string, suffix?: string, min?: number, step?: number, helper?: string, max?: number
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
      {label}
      {helper && (
        <div className="group relative no-print">
          <Info size={14} className="text-slate-400 dark:text-slate-500 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {helper}
          </div>
        </div>
      )}
    </label>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{prefix}</span>}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`w-full bg-slate-100 dark:bg-dark-card-hover border border-slate-200 dark:border-white/5 rounded-xl py-2.5 transition-all focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-light-text dark:text-white font-medium no-print ${prefix ? 'pl-8' : 'pl-4'} ${suffix ? 'pr-8' : 'pr-4'}`}
      />
      <div className="hidden print:block font-bold text-slate-800 py-1">
        {prefix}{value}{suffix}
      </div>
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm no-print">{suffix}</span>}
    </div>
  </div>
);

const ToggleField = ({ label, checked, onChange, helper, icon: Icon }: {
  label: string, checked: boolean, onChange: (val: boolean) => void, helper?: string, icon?: any
}) => (
  <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-dark-card-hover rounded-xl border border-slate-200 dark:border-white/5 hover:border-violet-500/30 transition-colors cursor-pointer group" onClick={() => onChange(!checked)}>
    <div className="flex items-center gap-3">
      {Icon && <Icon size={18} className={checked ? "text-rose-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"} />}
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        {helper && <p className="text-[10px] text-slate-400 dark:text-slate-500">{helper}</p>}
      </div>
    </div>
    <div className={`w-10 h-5 rounded-full transition-all relative ${checked ? 'bg-rose-500/20 border-rose-500/50' : 'bg-emerald-500/20 border-emerald-500/50'} border`}>
      <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all flex items-center justify-center ${checked ? 'right-1 bg-rose-500' : 'left-1 bg-emerald-500'}`}>
        {checked ? <X size={8} className="text-white" /> : <Check size={8} className="text-white" />}
      </div>
    </div>
  </div>
);

const GestorCalculator: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<TrafficManagerData>({
    baseSalary: 3000,
    maxBonus: 2000,
    meetingDelay: false,
    reportDelay: false,
    taskDelays: [false, false, false],
    activeClients: 10,
    okResultClients: 10
  });

  // Fetch data from Neon DB via API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/gestor-data');
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (err) {
        console.error("Failed to fetch gestor data:", err);
      }
    };
    fetchData();
  }, []);

  // Save data to Neon DB via API (debounced or on change)
  useEffect(() => {
    const saveData = async () => {
      try {
        await fetch('/api/gestor-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } catch (err) {
        console.error("Failed to save gestor data:", err);
      }
    };
    
    const timeoutId = setTimeout(saveData, 1000); // Save after 1s of inactivity
    return () => clearTimeout(timeoutId);
  }, [data]);

  const results = useMemo<TrafficManagerResults>(() => {
    const maxBonus = data.maxBonus;
    
    // Entrega (30% total)
    const meetingBonus = data.meetingDelay ? 0 : (maxBonus * 0.10);
    const reportBonus = data.reportDelay ? 0 : (maxBonus * 0.10);
    
    const taskDelayCount = data.taskDelays.filter(d => d).length;
    const taskBonus = taskDelayCount >= 3 ? 0 : (maxBonus * 0.10);
    
    const deliveryScore = ((meetingBonus + reportBonus + taskBonus) / (maxBonus * 0.30)) * 30;

    // Resultado Ok/Bom (70% total)
    const resultScore = data.activeClients > 0 ? (data.okResultClients / data.activeClients) : 0;
    const resultBonus = (maxBonus * 0.70) * resultScore;

    const totalBonus = meetingBonus + reportBonus + taskBonus + resultBonus;
    const totalEarnings = data.baseSalary + totalBonus;
    
    return {
      meetingBonus,
      reportBonus,
      taskBonus,
      resultBonus,
      totalBonus,
      totalEarnings,
      resultScore: resultScore * 100,
      deliveryScore
    };
  }, [data]);

  const chartData = [
    { name: 'Salário Fixo', value: data.baseSalary, color: '#7c4dff' },
    { name: 'Bônus Entrega', value: results.meetingBonus + results.reportBonus + results.taskBonus, color: '#10b981' },
    { name: 'Bônus Resultado', value: results.resultBonus, color: '#ff7043' },
  ].filter(item => item.value > 0);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleExportPNG = async () => {
    if (reportRef.current === null) {
      return;
    }

    try {
      // Small delay to ensure UI is stable
      const dataUrl = await toPng(reportRef.current, { 
        cacheBust: true,
        backgroundColor: '#0f0f1a',
        style: {
          borderRadius: '0'
        }
      });
      
      const link = document.createElement('a');
      link.download = `relatorio-bonificacao-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar PNG:', err);
    }
  };

  const updateTaskDelay = (index: number, val: boolean) => {
    const newDelays = [...data.taskDelays];
    newDelays[index] = val;
    setData(p => ({...p, taskDelays: newDelays}));
  };

  return (
    <div ref={reportRef} className="min-h-screen text-light-text dark:text-white pb-20 transition-colors duration-300">
      <header className="pt-12 pb-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="flex-1">
            <h1 className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1">
              Calculadora de <span className="text-violet-500">Bonificação</span>
            </h1>
            <p className="text-slate-500 text-sm max-w-2xl">
              Calcule sua remuneração baseada em <span className="text-violet-600 dark:text-violet-400 font-medium">critérios de entrega (30%)</span> e <span className="text-violet-600 dark:text-violet-400 font-medium">resultado de clientes (70%)</span>.
            </p>
          </div>

          <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center min-w-[240px] shadow-2xl relative">
            {results.totalBonus === data.maxBonus ? (
              <div className="absolute -top-3 -right-3 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-bounce">
                <Star size={10} fill="currentColor" /> BÔNUS 100% ATINGIDO
              </div>
            ) : results.totalBonus > 0 ? (
              <div className="absolute -top-3 -right-3 bg-violet-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                <CheckCircle2 size={10} /> BÔNUS PARCIAL
              </div>
            ) : null}
            
            <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">RENDA TOTAL ESTIMADA</span>
            <span className="text-4xl font-bold text-violet-600 dark:text-violet-400">
              {formatCurrency(results.totalEarnings)}
            </span>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-2 font-medium">
              <Award size={12} className={results.totalBonus > 0 ? "text-amber-500 dark:text-amber-400 fill-current" : "text-slate-400 dark:text-slate-600"} /> 
              <span>Bônus Máximo: <span className="text-light-text dark:text-white">{formatCurrency(data.maxBonus)}</span></span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sidebar - Inputs */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <section className="bg-light-card dark:bg-dark-card p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-white/5 h-fit sticky top-6">
              <div className="flex items-center gap-2 mb-8 border-b border-slate-200 dark:border-white/5 pb-4">
                <Calculator className="text-violet-600 dark:text-violet-500" size={20} />
                <h2 className="text-xl font-bold text-light-text dark:text-white">Parâmetros de Cálculo</h2>
              </div>
              
              <div className="space-y-6">
                <InputField 
                  label="Salário Fixo" 
                  value={data.baseSalary} 
                  onChange={(v) => setData(p => ({...p, baseSalary: v}))}
                  prefix="R$"
                  helper="Valor fixo mensal acordado em contrato."
                />

                <InputField 
                  label="Bonificação Máxima" 
                  value={data.maxBonus} 
                  onChange={(v) => setData(p => ({...p, maxBonus: v}))}
                  prefix="R$"
                  helper="Valor total possível se atingir 100% dos critérios."
                />

                <div className="h-[1px] bg-slate-200 dark:bg-white/5 my-2"></div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Critérios de Entrega (30%)</p>
                  <ToggleField 
                    label="Atraso/Falta em Reunião" 
                    checked={data.meetingDelay} 
                    onChange={(v) => setData(p => ({...p, meetingDelay: v}))}
                    helper="Desconta 10% da bonificação total"
                    icon={CalendarDays}
                  />
                  <ToggleField 
                    label="Atraso no Relatório" 
                    checked={data.reportDelay} 
                    onChange={(v) => setData(p => ({...p, reportDelay: v}))}
                    helper="Desconta 10% da bonificação total"
                    icon={ClipboardList}
                  />
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <ListTodo size={12} /> Atraso de Tarefas (3x para perder 10%)
                    </p>
                    <div className="flex gap-2">
                      {data.taskDelays.map((delayed, i) => (
                        <button 
                          key={i}
                          onClick={() => updateTaskDelay(i, !delayed)}
                          className={`flex-1 py-2 rounded-lg border transition-all flex items-center justify-center ${delayed ? 'bg-rose-500/20 border-rose-500 text-rose-500 dark:text-rose-400' : 'bg-slate-100 dark:bg-dark-card-hover border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500 hover:border-violet-500/30'}`}
                        >
                          {delayed ? <X size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-slate-200 dark:bg-white/5 my-2"></div>

                <div className="space-y-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Resultado Ok/Bom (70%)</p>
                  <InputField 
                    label="Total de Clientes Ativos" 
                    value={data.activeClients} 
                    onChange={(v) => setData(p => ({...p, activeClients: v}))}
                    suffix="Clientes"
                  />
                  <InputField 
                    label="Clientes com Resultado Ok/Bom" 
                    value={data.okResultClients} 
                    onChange={(v) => setData(p => ({...p, okResultClients: v}))}
                    suffix="Clientes"
                    max={data.activeClients}
                  />
                </div>
              </div>

              <button 
                onClick={handleExportPNG}
                className="w-full mt-8 px-6 py-3 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 no-print"
              >
                <FileDown size={18} /> Exportar PNG
              </button>
            </section>
          </div>

          {/* Main Content - Results */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard 
                icon={CheckCircle2} 
                title="Status Entrega" 
                value={`${results.deliveryScore.toFixed(0)}%`}
                subtitle={`${results.deliveryScore === 30 ? "Entrega Perfeita!" : "Atrasos Identificados"}`}
                colorClass={results.deliveryScore === 30 ? "bg-emerald-500" : results.deliveryScore >= 20 ? "bg-amber-500" : "bg-rose-500"}
                statusLabel="Peso 30%"
              />
              <StatCard 
                icon={BarChart3} 
                title="Resultado Clientes" 
                value={`${results.resultScore.toFixed(0)}%`}
                subtitle={`${data.okResultClients} de ${data.activeClients} ativos`}
                colorClass={results.resultScore >= 80 ? "bg-violet-600" : results.resultScore >= 50 ? "bg-blue-500" : "bg-slate-600"}
                statusLabel="Peso 70%"
              />
              <StatCard 
                icon={DollarSign} 
                title="Bônus Total" 
                value={formatCurrency(results.totalBonus)}
                subtitle={`${((results.totalBonus / (data.maxBonus || 1)) * 100).toFixed(0)}% do potencial`}
                colorClass="bg-emerald-600"
                highlighted={results.totalBonus === data.maxBonus}
              />
              <StatCard 
                icon={Wallet} 
                title="Renda Final" 
                value={formatCurrency(results.totalEarnings)}
                subtitle="Fixo + Bonificação"
                colorClass="bg-slate-700"
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* Composition Chart */}
              <div className="bg-light-card dark:bg-dark-card p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/5">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-light-text dark:text-white flex items-center gap-2">
                    <TrendingUp size={20} className="text-violet-600 dark:text-violet-400" />
                    Composição da Renda
                  </h3>
                  <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Fixo vs Bônus</div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'var(--dark-tooltip)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94a3b8' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="bg-light-card dark:bg-dark-card p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/5 flex flex-col">
                 <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-light-text dark:text-white flex items-center gap-2">
                    <Zap size={20} className="text-violet-600 dark:text-violet-400" />
                    Detalhamento dos Pesos
                  </h3>
                </div>
                
                <div className="space-y-4 mb-8">
                   <div className="p-4 bg-slate-100 dark:bg-dark-card-hover rounded-2xl flex justify-between items-center border border-slate-200 dark:border-white/5">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Entrega (Peso 30%)</p>
                        <p className="text-lg font-bold text-light-text dark:text-white">
                          {formatCurrency(results.meetingBonus + results.reportBonus + results.taskBonus)}
                        </p>
                      </div>
                      <div className={`text-sm font-bold ${results.deliveryScore === 30 ? 'text-emerald-600 dark:text-emerald-400' : results.deliveryScore >= 20 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        Score: {results.deliveryScore.toFixed(0)}%
                      </div>
                   </div>
                   <div className="p-4 bg-slate-100 dark:bg-dark-card-hover rounded-2xl flex justify-between items-center border border-slate-200 dark:border-white/5">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Resultado (Peso 70%)</p>
                        <p className="text-lg font-bold text-light-text dark:text-white">
                          {formatCurrency(results.resultBonus)}
                        </p>
                      </div>
                      <div className="text-violet-600 dark:text-violet-400 text-sm font-bold">Score: {results.resultScore.toFixed(0)}%</div>
                   </div>
                </div>

                <div className="flex-1 bg-slate-50 dark:bg-dark-input rounded-3xl p-6 text-light-text dark:text-white flex flex-col justify-between relative overflow-hidden min-h-[220px] border border-slate-200 dark:border-white/5">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                  
                  <div className="flex flex-col gap-5">
                    <div className="space-y-4">
                      <div className="flex justify-between items-end border-b border-slate-200 dark:border-white/5 pb-3">
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase tracking-widest font-bold block mb-1">Total Bonificação</span>
                          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 leading-none">{formatCurrency(results.totalBonus)}</div>
                        </div>
                        <div className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-2 py-1 rounded">
                          {((results.totalBonus / (data.maxBonus || 1)) * 100).toFixed(0)}% DO MÁXIMO
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase tracking-widest font-bold block mb-1">Faturamento Final</span>
                        <div className="text-4xl font-bold text-light-text dark:text-white leading-none">{formatCurrency(results.totalEarnings)}</div>
                      </div>
                    </div>

                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <span>Fixo</span>
                        <span>Variável</span>
                      </div>
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex relative">
                        <div 
                          className="h-full bg-violet-500 transition-all duration-500" 
                          style={{ width: `${(data.baseSalary / results.totalEarnings) * 100}%` }}
                        ></div>
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                          style={{ width: `${(results.totalBonus / results.totalEarnings) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Section */}
            <div className="bg-light-card dark:bg-dark-card p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/5">
              <h3 className="font-bold text-light-text dark:text-white mb-6 flex items-center gap-2">
                <Activity size={20} className="text-violet-600 dark:text-violet-400" />
                Análise de Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-dark-card-hover/30 rounded-2xl hover:border-violet-500/30 transition-colors">
                  <div className="font-bold text-light-text dark:text-white mb-2 flex items-center gap-2 text-sm uppercase tracking-tight">
                    <ShieldAlert size={16} className="text-rose-500 dark:text-rose-400" />
                    Status da Entrega
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed space-y-2">
                    <p className={data.meetingDelay ? "text-rose-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                      • Reuniões: {data.meetingDelay ? "Atraso identificado (-10%)" : "Em dia (+10%)"}
                    </p>
                    <p className={data.reportDelay ? "text-rose-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                      • Relatórios: {data.reportDelay ? "Falta de envio (-10%)" : "Em dia (+10%)"}
                    </p>
                    <p className={data.taskDelays.filter(d => d).length >= 3 ? "text-rose-500 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                      • Tarefas: {data.taskDelays.filter(d => d).length >= 3 ? "3+ atrasos identificados (-10%)" : `Atrasos: ${data.taskDelays.filter(d => d).length}/3 (+10%)`}
                    </p>
                  </div>
                </div>
                <div className="p-5 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-dark-card-hover/30 rounded-2xl hover:border-violet-500/30 transition-colors">
                  <div className="font-bold text-light-text dark:text-white mb-2 flex items-center gap-2 text-sm uppercase tracking-tight">
                    <Award size={16} className="text-amber-500 dark:text-amber-400" />
                    Qualidade de Resultado
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Seu aproveitamento de clientes com resultado Ok/Bom é de <strong>{results.resultScore.toFixed(0)}%</strong>. 
                    Isso representa <strong>{formatCurrency(results.resultBonus)}</strong> da sua bonificação total (Peso 70%).
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default GestorCalculator;
