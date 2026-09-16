import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { toPng } from 'html-to-image';
import {
  Info, Check, X, FileDown, Target, ShieldAlert, LayoutGrid, Handshake,
  DollarSign, Wallet, TrendingUp, Award,
} from 'lucide-react';
import { HeadOperacaoData, HeadOperacaoResults } from '../../types';
import SplitHeadline from '../components/SplitHeadline';

// Os quatro critérios pesam igual: 25% da bonificação máxima cada.
const PESO = 0.25;

const StatCard = ({ icon: Icon, title, value, subtitle, colorClass, highlighted = false, statusLabel }: {
  icon: any; title: string; value: string; subtitle?: string; colorClass: string; highlighted?: boolean; statusLabel?: string;
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

const InputField = ({ label, value, onChange, prefix, suffix, min = 0, step = 1, helper }: {
  label: string; value: number; onChange: (val: number) => void; prefix?: string; suffix?: string; min?: number; step?: number; helper?: string;
}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
      {label}
      {helper && (
        <div className="group relative no-print">
          <Info size={14} className="text-slate-400 dark:text-slate-500 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            {helper}
          </div>
        </div>
      )}
    </label>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{prefix}</span>}
      <input
        type="number" min={min} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`w-full bg-slate-100 dark:bg-dark-card-hover border border-slate-200 dark:border-white/5 rounded-xl py-2.5 transition-all focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-light-text dark:text-white font-medium no-print ${prefix ? 'pl-8' : 'pl-4'} ${suffix ? 'pr-20' : 'pr-4'}`}
      />
      <div className="hidden print:block font-bold text-slate-800 py-1">{prefix}{value}{suffix}</div>
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm no-print">{suffix}</span>}
    </div>
  </div>
);

// Marcar = falhou no critério, e a fatia daquele critério zera.
const ToggleField = ({ label, checked, onChange, helper, icon: Icon }: {
  label: string; checked: boolean; onChange: (val: boolean) => void; helper?: string; icon?: any;
}) => (
  <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-dark-card-hover rounded-xl border border-slate-200 dark:border-white/5 hover:border-violet-500/30 transition-colors cursor-pointer group no-print" onClick={() => onChange(!checked)}>
    <div className="flex items-center gap-3">
      {Icon && <Icon size={18} className={checked ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} />}
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        {helper && <p className="text-[10px] text-slate-400 dark:text-slate-500">{helper}</p>}
      </div>
    </div>
    <div className={`w-10 h-5 rounded-full transition-all relative border ${checked ? 'bg-rose-500/20 border-rose-500/50' : 'bg-emerald-500/20 border-emerald-500/50'}`}>
      <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all flex items-center justify-center ${checked ? 'right-1 bg-rose-500' : 'left-1 bg-emerald-500'}`}>
        {checked ? <X size={8} className="text-white" /> : <Check size={8} className="text-white" />}
      </div>
    </div>
  </div>
);

const LinhaCriterio = ({ titulo, valor, score, cor }: { titulo: string; valor: string; score: number; cor: string }) => (
  <div className="p-3 bg-slate-100 dark:bg-dark-card-hover rounded-xl border border-slate-200 dark:border-white/5">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{titulo} (25%)</span>
      <span className={`text-xs font-bold ${score >= 100 ? 'text-emerald-500' : score > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
        {Math.round(score)}%
      </span>
    </div>
    <p className="text-lg font-black text-light-text dark:text-white">{valor}</p>
    <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, score))}%`, background: cor }} />
    </div>
  </div>
);

const HeadCalculator: React.FC<{ activePage?: string }> = ({ activePage }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<HeadOperacaoData>({
    baseSalary: 4000,
    maxBonus: 2000,
    totalProjetos: 0,
    projetosOkBom: 0,
    churnNoPeriodo: 0,
    metaChurn: 2,
    falhaGrapehub: false,
    falhaRelacionamento: false,
  });

  // page_id isola os números por página: uma calculadora por head, se for o caso.
  const pageId = activePage || 'calculadora-head-operacao';

  useEffect(() => {
    fetch(`/api/head-data?page_id=${encodeURIComponent(pageId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(prev => ({ ...prev, ...d })); })
      .catch(err => console.error('Failed to fetch head data:', err));
  }, [pageId]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch('/api/head-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, page_id: pageId }),
      }).catch(err => console.error('Failed to save head data:', err));
    }, 1000);
    return () => clearTimeout(t);
  }, [data, pageId]);

  const results = useMemo<HeadOperacaoResults>(() => {
    const fatia = data.maxBonus * PESO;

    // Resultado de projetos: proporção de projetos Ok/Bom na carteira.
    const scoreResultado = data.totalProjetos > 0
      ? Math.min(1, data.projetosOkBom / data.totalProjetos)
      : 0;
    const bonusResultado = fatia * scoreResultado;

    // Churn: dentro da meta, fatia cheia. Acima dela, cai proporcionalmente e zera
    // quando o excedente iguala a meta (ou seja, no dobro da meta).
    // Com meta 0, qualquer churn zera.
    const excedente = Math.max(0, data.churnNoPeriodo - data.metaChurn);
    const scoreChurn = excedente === 0
      ? 1
      : Math.max(0, 1 - excedente / Math.max(1, data.metaChurn));
    const bonusChurn = fatia * scoreChurn;

    // Processo: marcar zera a fatia inteira.
    const bonusGrapehub = data.falhaGrapehub ? 0 : fatia;
    const bonusRelacionamento = data.falhaRelacionamento ? 0 : fatia;

    const totalBonus = bonusResultado + bonusChurn + bonusGrapehub + bonusRelacionamento;

    return {
      bonusResultado, bonusChurn, bonusGrapehub, bonusRelacionamento,
      totalBonus,
      totalEarnings: data.baseSalary + totalBonus,
      scoreResultado: scoreResultado * 100,
      scoreChurn: scoreChurn * 100,
    };
  }, [data]);

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const pctDoMaximo = data.maxBonus > 0 ? (results.totalBonus / data.maxBonus) * 100 : 0;

  const chartData = [
    { name: 'Salário Fixo', value: data.baseSalary, color: '#7c4dff' },
    { name: 'Resultado', value: results.bonusResultado, color: '#10b981' },
    { name: 'Churn', value: results.bonusChurn, color: '#f59e0b' },
    { name: 'GrapeHub', value: results.bonusGrapehub, color: '#38bdf8' },
    { name: 'Relacionamento', value: results.bonusRelacionamento, color: '#ec4899' },
  ].filter(i => i.value > 0);

  const handleExportPNG = async () => {
    if (!reportRef.current) return;
    try {
      await new Promise(r => setTimeout(r, 100));
      const dataUrl = await toPng(reportRef.current, { cacheBust: true, pixelRatio: 2, skipFonts: true });
      const link = document.createElement('a');
      link.download = `bonificacao-head-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar PNG:', err);
    }
  };

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg p-8" ref={reportRef}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <SplitHeadline text="Calculadora de " highlight="Bonificação" className="text-4xl font-black text-slate-900 dark:text-white tracking-tight" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Head de Operação — quatro critérios com <span className="text-violet-500 font-bold">peso igual (25% cada)</span>.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/5 shadow-sm text-center min-w-[260px]">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Renda Total Estimada</p>
          <p className="text-4xl font-black text-violet-500 mt-1">{fmt(results.totalEarnings)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Bônus: <span className="font-bold text-emerald-500">{fmt(results.totalBonus)}</span> de {fmt(data.maxBonus)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Parâmetros */}
        <div className="bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/5 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-light-text dark:text-white">Parâmetros de Cálculo</h2>

          <InputField label="Salário Fixo" value={data.baseSalary} prefix="R$ " step={100}
            onChange={v => setData({ ...data, baseSalary: v })} />
          <InputField label="Bonificação Máxima" value={data.maxBonus} prefix="R$ " step={100}
            helper="Dividida igualmente entre os quatro critérios — 25% para cada."
            onChange={v => setData({ ...data, maxBonus: v })} />

          <div className="pt-2 border-t border-slate-200 dark:border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Resultado de Projetos (25%)</p>
            <div className="space-y-3">
              <InputField label="Total de projetos na carteira" value={data.totalProjetos} suffix="projetos"
                onChange={v => setData({ ...data, totalProjetos: v })} />
              <InputField label="Projetos com resultado Ok/Bom" value={data.projetosOkBom} suffix="projetos"
                helper="A fatia é proporcional: metade da carteira em Ok/Bom paga metade dos 25%."
                onChange={v => setData({ ...data, projetosOkBom: v })} />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Churn (25%)</p>
            <div className="space-y-3">
              <InputField label="Meta de churn aceitável" value={data.metaChurn} suffix="clientes"
                helper="Até esse número, a fatia é paga inteira."
                onChange={v => setData({ ...data, metaChurn: v })} />
              <InputField label="Churn no período" value={data.churnNoPeriodo} suffix="clientes"
                helper="Acima da meta a fatia cai proporcionalmente e zera no dobro da meta."
                onChange={v => setData({ ...data, churnNoPeriodo: v })} />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Processo (25% + 25%)</p>
            <div className="space-y-2">
              <ToggleField label="Falha no GrapeHub" icon={LayoutGrid}
                helper="Marcar zera os 25% deste critério"
                checked={data.falhaGrapehub} onChange={v => setData({ ...data, falhaGrapehub: v })} />
              <ToggleField label="Falha em Relacionamento" icon={Handshake}
                helper="Marcar zera os 25% deste critério"
                checked={data.falhaRelacionamento} onChange={v => setData({ ...data, falhaRelacionamento: v })} />
            </div>
          </div>

          <button onClick={handleExportPNG}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all no-print">
            <FileDown size={16} /> Exportar PNG
          </button>
        </div>

        {/* Resultado */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard icon={Target} title="Resultado" value={fmt(results.bonusResultado)}
              subtitle={`${data.projetosOkBom} de ${data.totalProjetos} projetos`} colorClass="bg-emerald-500" statusLabel="Peso 25%" />
            <StatCard icon={ShieldAlert} title="Churn" value={fmt(results.bonusChurn)}
              subtitle={`${data.churnNoPeriodo} saída(s) · meta ${data.metaChurn}`} colorClass="bg-amber-500" statusLabel="Peso 25%" />
            <StatCard icon={DollarSign} title="Bônus Total" value={fmt(results.totalBonus)}
              subtitle={`${Math.round(pctDoMaximo)}% do potencial`} colorClass="bg-sky-500" />
            <StatCard icon={Wallet} title="Renda Final" value={fmt(results.totalEarnings)}
              subtitle="Fixo + Bonificação" colorClass="bg-violet-600" highlighted />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <TrendingUp size={18} className="text-violet-500" />
                <h2 className="text-lg font-bold text-light-text dark:text-white">Composição da Renda</h2>
              </div>
              <div className="flex-1 min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} stroke="none">
                      {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => fmt(Number(v))}
                      contentStyle={{ backgroundColor: 'var(--dark-tooltip)', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="square" wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/5 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award size={18} className="text-violet-500" />
                <h2 className="text-lg font-bold text-light-text dark:text-white">Detalhamento dos Critérios</h2>
              </div>
              <div className="space-y-3">
                <LinhaCriterio titulo="Resultado de Projetos" valor={fmt(results.bonusResultado)} score={results.scoreResultado} cor="#10b981" />
                <LinhaCriterio titulo="Churn" valor={fmt(results.bonusChurn)} score={results.scoreChurn} cor="#f59e0b" />
                <LinhaCriterio titulo="GrapeHub" valor={fmt(results.bonusGrapehub)} score={data.falhaGrapehub ? 0 : 100} cor="#38bdf8" />
                <LinhaCriterio titulo="Relacionamento" valor={fmt(results.bonusRelacionamento)} score={data.falhaRelacionamento ? 0 : 100} cor="#ec4899" />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total da Bonificação</span>
                <span className="text-xl font-black text-emerald-500">{fmt(results.totalBonus)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeadCalculator;
