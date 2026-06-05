
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { toPng } from 'html-to-image';
import { 
  Calculator, TrendingUp, Target, DollarSign, Wallet, 
  Info, Zap, FileDown, Star, CheckCircle2,
  BarChart3, Activity, Award, Check, X, 
  ArrowUpRight, Percent, ShoppingBag, Coins
} from 'lucide-react';
import SplitHeadline from '../components/SplitHeadline';

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
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm no-print">{suffix}</span>}
    </div>
  </div>
);

const CloserCalculator: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState({
    baseSalary: 2500,
    salesTarget: 35000,
    bonusValue: 1000,
    commissionRate: 10, // 10%
    totalSold: 3500,
  });

  // Fetch data from Neon DB via API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/closer-data');
        if (response.ok) {
          const result = await response.json();
          // Sanitize: ensure all values are valid numbers (API may return null/string)
          setData({
            baseSalary:      parseFloat(result.baseSalary)      || 2500,
            salesTarget:     parseFloat(result.salesTarget)     || 35000,
            bonusValue:      parseFloat(result.bonusValue)      || 1000,
            commissionRate:  parseFloat(result.commissionRate)  || 10,
            totalSold:       parseFloat(result.totalSold)       || 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch closer data:", err);
      }
    };
    fetchData();
  }, []);

  // Save data to Neon DB via API (debounced or on change)
  useEffect(() => {
    const saveData = async () => {
      try {
        await fetch('/api/closer-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } catch (err) {
        console.error("Failed to save closer data:", err);
      }
    };
    
    const timeoutId = setTimeout(saveData, 1000); // Save after 1s of inactivity
    return () => clearTimeout(timeoutId);
  }, [data]);

  const results = useMemo(() => {
    const targetAchievement = (data.totalSold / data.salesTarget) * 100;
    
    const totalCommission = data.totalSold * (data.commissionRate / 100);
    
    let bonusEarned = 0;
    let bonusPercent = 0;
    if (targetAchievement >= 100) {
      bonusEarned = data.bonusValue;
      bonusPercent = 100;
    } else if (targetAchievement >= 70) {
      bonusEarned = data.bonusValue * 0.5;
      bonusPercent = 50;
    }

    const totalEarnings = data.baseSalary + totalCommission + bonusEarned;

    // Projections
    const target100Sales = data.salesTarget;
    const target100Commission = target100Sales * (data.commissionRate / 100);
    const target100Total = data.baseSalary + target100Commission + data.bonusValue;

    // Partial Target (70%)
    const partialSalesTarget = data.salesTarget * 0.7;
    const partialCommission = partialSalesTarget * (data.commissionRate / 100);
    const partialTotal = data.baseSalary + partialCommission + (data.bonusValue * 0.5);

    return {
      targetAchievement,
      totalCommission,
      bonusEarned,
      bonusPercent,
      totalEarnings,
      target100Total,
      partialSalesTarget,
      partialTotal,
    };
  }, [data]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleExportPNG = async () => {
    if (reportRef.current === null) return;
    try {
      const dataUrl = await toPng(reportRef.current, { 
        cacheBust: true,
        backgroundColor: '#0f0f1a',
      });
      const link = document.createElement('a');
      link.download = `relatorio-comercial-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar PNG:', err);
    }
  };

  const chartData = [
    { name: 'Salário Fixo', value: data.baseSalary, color: '#7c4dff' },
    { name: 'Comissão', value: results.totalCommission, color: '#10b981' },
    { name: 'Bonificação', value: results.bonusEarned, color: '#ff7043' },
  ].filter(item => item.value > 0);

  return (
    <div ref={reportRef} className="min-h-screen text-light-text dark:text-white pb-20 transition-colors duration-300">
      <header className="pt-12 pb-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="flex-1">
            <SplitHeadline
              text="Calculadora "
              highlight="Comercial"
              className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1"
            />
            <p className="text-slate-500 text-sm max-w-2xl">
              Projete sua remuneração com bônus progressivo: <span className="text-violet-600 dark:text-violet-400 font-medium">70% da meta libera metade do bônus</span> e <span className="text-violet-600 dark:text-violet-400 font-medium">100% da meta libera o valor integral</span>.
            </p>
          </div>

          <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center min-w-[240px] shadow-2xl relative transition-colors duration-300">
            <div className="absolute -top-3 -right-3 bg-violet-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <CheckCircle2 size={10} /> META {results.targetAchievement.toFixed(0)}% ATINGIDA
            </div>
            
            <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">RENDA TOTAL MENSAL</span>
            <span className="text-4xl font-bold text-light-text dark:text-white">
              {formatCurrency(results.totalEarnings)}
            </span>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-2 font-medium">
              <Target size={12} className="text-amber-500 dark:text-amber-400" /> 
              <span>Meta Principal: <span className="text-light-text dark:text-white">{formatCurrency(data.salesTarget)}</span></span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 -mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 flex flex-col gap-6">
            <section className="bg-light-card dark:bg-dark-card p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-white/5 h-fit sticky top-6 transition-colors duration-300">
              <div className="flex items-center gap-2 mb-8 border-b border-slate-200 dark:border-white/5 pb-4">
                <Calculator className="text-violet-600 dark:text-violet-500" size={20} />
                <h2 className="text-xl font-bold text-light-text dark:text-white uppercase tracking-tight text-sm">Seus Parâmetros</h2>
              </div>
              
              <div className="space-y-6">
                <InputField 
                  label="SALÁRIO FIXO" 
                  value={data.baseSalary} 
                  onChange={(v) => setData(p => ({...p, baseSalary: v}))}
                  prefix="R$"
                />

                <div className="grid grid-cols-2 gap-4">
                  <InputField 
                    label="META (100%)" 
                    value={data.salesTarget} 
                    onChange={(v) => setData(p => ({...p, salesTarget: v}))}
                    prefix="R$"
                    helper="Valor total de vendas para atingir 100% da meta."
                  />
                  <InputField 
                    label="VALOR DO BÔNUS" 
                    value={data.bonusValue} 
                    onChange={(v) => setData(p => ({...p, bonusValue: v}))}
                    prefix="R$"
                    helper="Valor total do bônus ao atingir 100% da meta."
                  />
                </div>

                <InputField 
                  label="COMISSÃO POR VENDA" 
                  value={data.commissionRate} 
                  onChange={(v) => setData(p => ({...p, commissionRate: v}))}
                  suffix="%"
                />

                <InputField 
                  label="VALOR TOTAL VENDIDO (1º MÊS)" 
                  value={data.totalSold} 
                  onChange={(v) => setData(p => ({...p, totalSold: v}))}
                  prefix="R$"
                  helper="Soma total dos contratos fechados no mês."
                />

                <div className="p-4 bg-violet-600/5 rounded-2xl border border-violet-500/10">
                  <div className="flex gap-3">
                    <Info size={16} className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      <span className="text-violet-600 dark:text-violet-400 font-bold">Regra de Bônus:</span> Para bônus parcial (50%), venda <span className="text-light-text dark:text-white font-bold">{formatCurrency(results.partialSalesTarget)}</span>. Para bônus total (100%), venda <span className="text-light-text dark:text-white font-bold">{formatCurrency(data.salesTarget)}</span>.
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleExportPNG}
                className="w-full mt-8 px-6 py-3 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 no-print"
              >
                <FileDown size={18} /> Exportar Projeção
              </button>
            </section>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard 
                icon={ShoppingBag} 
                title="VOLUME DE VENDAS" 
                value={formatCurrency(data.totalSold)}
                subtitle="Valor total vendido"
                colorClass="bg-slate-700"
              />
              <StatCard 
                icon={DollarSign} 
                title="COMISSÃO TOTAL" 
                value={formatCurrency(results.totalCommission)}
                subtitle="Sua parte variável"
                colorClass="bg-emerald-600"
              />
              <StatCard 
                icon={Award} 
                title="BONIFICAÇÃO" 
                value={formatCurrency(results.bonusEarned)}
                subtitle={results.bonusPercent > 0 ? `Parcial (${results.bonusPercent}%) Liberada!` : "Abaixo do gatilho"}
                colorClass="bg-violet-600"
                statusLabel={results.bonusPercent > 0 ? `${results.bonusPercent}%` : undefined}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-light-card dark:bg-dark-card p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/5">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-light-text dark:text-white flex items-center gap-2 uppercase tracking-tight text-sm">
                    <TrendingUp size={18} className="text-violet-600 dark:text-violet-400" />
                    Composição da Renda
                  </h3>
                  <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Fixo vs Performance</div>
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
                        contentStyle={{ backgroundColor: 'var(--dark-tooltip)', borderRadius: '12px', border: 'none', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-light-card dark:bg-dark-card p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/5 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-light-text dark:text-white flex items-center gap-2 uppercase tracking-tight text-sm">
                    <Zap size={18} className="text-violet-600 dark:text-violet-400" />
                    Potencial de Escala
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-dark-card-hover rounded-2xl border border-slate-200 dark:border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Se atingir 100% da Meta</p>
                      <p className="text-lg font-bold text-light-text dark:text-white">{formatCurrency(results.target100Total)}</p>
                    </div>
                    <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full">
                      Bônus Integral
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-dark-card-hover rounded-2xl border border-slate-200 dark:border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Meta Parcial (70% - {formatCurrency(results.partialSalesTarget)})</p>
                      <p className="text-lg font-bold text-light-text dark:text-white">{formatCurrency(results.partialTotal)}</p>
                    </div>
                    <div className="bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-bold px-3 py-1 rounded-full">
                      Bônus R$ {data.bonusValue * 0.5}
                    </div>
                  </div>

                  <div className="mt-4 p-6 bg-slate-100 dark:bg-dark-input rounded-2xl border border-slate-200 dark:border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Variável (com bônus)</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(results.totalCommission + results.bonusEarned)}</p>
                        {results.bonusPercent > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">BÔNUS: {results.bonusPercent}%</span>
                        )}
                      </div>
                      
                      <div className="mt-6">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Faturamento Final Previsto</p>
                        <p className="text-4xl font-bold text-light-text dark:text-white">{formatCurrency(results.totalEarnings)}</p>
                      </div>

                      <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                          <span>Fixo</span>
                          <span>Performance</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden flex">
                          <div className="h-full bg-violet-500" style={{ width: `${(data.baseSalary / results.totalEarnings) * 100}%` }}></div>
                          <div className="h-full bg-emerald-500" style={{ width: `${((results.totalCommission + results.bonusEarned) / results.totalEarnings) * 100}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>Status: {formatCurrency(data.totalSold)}/{formatCurrency(data.salesTarget)}</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{results.targetAchievement.toFixed(0)}% da meta principal</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-light-card dark:bg-dark-card p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/5">
              <h3 className="font-bold text-light-text dark:text-white mb-8 flex items-center gap-2 uppercase tracking-tight text-sm">
                <Activity size={18} className="text-violet-600 dark:text-violet-400" />
                Dicas de Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 dark:bg-dark-card-hover/50 rounded-2xl border border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                    <h4 className="text-xs font-bold text-light-text dark:text-white uppercase tracking-wider">Impacto do Bônus Proporcional</h4>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    A meta de 70% é seu primeiro porto seguro. Ao atingi-la, você já adiciona <span className="text-light-text dark:text-white font-bold">{formatCurrency(data.bonusValue * 0.5)}</span> ao seu faturamento total. Não pare até lá!
                  </p>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-dark-card-hover/50 rounded-2xl border border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <h4 className="text-xs font-bold text-light-text dark:text-white uppercase tracking-wider">Próximo Nível</h4>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {results.targetAchievement >= 100 
                      ? "Parabéns! Você atingiu o teto da bonificação. Continue performando para aumentar sua comissão variável ilimitada."
                      : results.targetAchievement >= 70
                        ? `Bônus parcial garantido! Faltam apenas ${formatCurrency(data.salesTarget - data.totalSold)} em vendas para dobrar o bônus para ${formatCurrency(data.bonusValue)}.`
                        : `Faltam ${formatCurrency(results.partialSalesTarget - data.totalSold)} em vendas para liberar o primeiro gatilho de bônus de ${formatCurrency(data.bonusValue * 0.5)}.`}
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

export default CloserCalculator;
