import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { toPng } from 'html-to-image';
import {
  Calculator, TrendingUp, Target, DollarSign,
  Info, Zap, FileDown, CheckCircle2,
  Activity, Award, FileSignature,
} from 'lucide-react';
import SplitHeadline from '../components/SplitHeadline';

// ─────────────────────────────────────────────────────────────────────────────
// Calculadora de remuneração com a meta em CONTRATOS FECHADOS.
//
// É a irmã da Calculadora Closer, que mede a meta em reais vendidos. A regra de
// bônus é a mesma (70% libera metade, 100% libera o integral), mas o percentual
// de atingimento sai de contratos ÷ meta de contratos.
//
// Contrato é unidade inteira: o gatilho de 70% de uma meta de 10 não é 7,0 e sim
// 7 contratos — arredondado para CIMA, senão a tela prometeria um bônus que a
// regra não paga.
// ─────────────────────────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, title, value, subtitle, colorClass, statusLabel }: {
  icon: any, title: string, value: string, subtitle?: string, colorClass: string, statusLabel?: string
}) => (
  <div className="p-6 rounded-2xl shadow-sm border transition-all relative overflow-hidden bg-light-card dark:bg-dark-card border-slate-200 dark:border-white/5">
    {statusLabel && (
      <div className="absolute top-2 right-2 px-2 py-0.5 bg-violet-600 text-white text-[8px] font-bold rounded-full uppercase tracking-tighter">
        {statusLabel}
      </div>
    )}
    <div className={`p-2 w-fit rounded-lg ${colorClass}`}>
      <Icon size={20} className="text-white" />
    </div>
    <p className="text-sm font-medium mt-3 text-slate-500 dark:text-slate-400">{title}</p>
    <h3 className="text-2xl font-bold text-light-text dark:text-white">{value}</h3>
    {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
  </div>
);

const InputField = ({ label, value, onChange, prefix, suffix, min = 0, step = 1, helper }: {
  label: string, value: number, onChange: (val: number) => void, prefix?: string, suffix?: string, min?: number, step?: number, helper?: string
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
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`w-full bg-slate-100 dark:bg-dark-card-hover border border-slate-200 dark:border-white/5 rounded-xl py-2.5 transition-all focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-light-text dark:text-white font-medium no-print ${prefix ? 'pl-8' : 'pl-4'} ${suffix ? 'pr-20' : 'pr-4'}`}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm no-print">{suffix}</span>}
    </div>
  </div>
);

const ContratosCalculator: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState({
    baseSalary: 2500,
    contractsTarget: 10,
    bonusValue: 800,
    averageTicket: 2500,
    commissionPerContract: 250,
    contractsClosed: 0,
  });

  useEffect(() => {
    fetch('/api/calculadora-contratos')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setData(d); })
      .catch(err => console.error('Falha ao carregar a calculadora de contratos:', err));
  }, []);

  // Salva 1 s depois da última tecla: a tela é um simulador e cada dígito
  // digitado dispararia uma escrita.
  useEffect(() => {
    const t = setTimeout(() => {
      fetch('/api/calculadora-contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(err => console.error('Falha ao salvar a calculadora de contratos:', err));
    }, 1000);
    return () => clearTimeout(t);
  }, [data]);

  const results = useMemo(() => {
    const meta = data.contractsTarget;
    const atingimento = meta > 0 ? (data.contractsClosed / meta) * 100 : 0;

    // Valor vendido é derivado: contratos × ticket médio. Ele não entra na
    // comissão — serve para mostrar quanto o fechamento representa em receita.
    const volume = data.contractsClosed * data.averageTicket;
    // Comissão é valor FIXO por contrato: quem fecha sabe de cabeça quanto
    // ganha por assinatura, sem depender do tamanho do contrato.
    const comissao = data.contractsClosed * data.commissionPerContract;

    let bonus = 0;
    let bonusPercent = 0;
    if (atingimento >= 100) { bonus = data.bonusValue; bonusPercent = 100; }
    else if (atingimento >= 70) { bonus = data.bonusValue * 0.5; bonusPercent = 50; }

    const total = data.baseSalary + comissao + bonus;

    // Projeções
    const comissao100 = meta * data.commissionPerContract;
    const total100 = data.baseSalary + comissao100 + data.bonusValue;

    const metaParcial = Math.ceil(meta * 0.7);
    const comissaoParcial = metaParcial * data.commissionPerContract;
    const totalParcial = data.baseSalary + comissaoParcial + data.bonusValue * 0.5;

    return {
      atingimento, volume, comissao, bonus, bonusPercent, total,
      total100, metaParcial, totalParcial,
      faltamParaParcial: Math.max(0, metaParcial - data.contractsClosed),
      faltamParaTotal: Math.max(0, meta - data.contractsClosed),
    };
  }, [data]);

  const moeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const contratos = (n: number) => `${n} ${n === 1 ? 'contrato' : 'contratos'}`;

  const handleExportPNG = async () => {
    if (reportRef.current === null) return;
    try {
      const dataUrl = await toPng(reportRef.current, { cacheBust: true, backgroundColor: '#0f0f1a' });
      const link = document.createElement('a');
      link.download = `calculadora-contratos-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar PNG:', err);
    }
  };

  const chartData = [
    { name: 'Salário Fixo', value: data.baseSalary, color: '#7c4dff' },
    { name: 'Comissão', value: results.comissao, color: '#10b981' },
    { name: 'Bonificação', value: results.bonus, color: '#ff7043' },
  ].filter(item => item.value > 0);

  return (
    <div ref={reportRef} className="min-h-screen text-light-text dark:text-white pb-20 transition-colors duration-300">
      <header className="pt-12 pb-20 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="flex-1">
            <SplitHeadline
              text="Calculadora de "
              highlight="Contratos"
              className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1"
            />
            <p className="text-slate-500 text-sm max-w-2xl">
              A meta é medida em <span className="text-violet-600 dark:text-violet-400 font-medium">contratos fechados</span>, não em valor vendido.
              O bônus é progressivo: <span className="text-violet-600 dark:text-violet-400 font-medium">70% da meta libera metade</span> e{' '}
              <span className="text-violet-600 dark:text-violet-400 font-medium">100% libera o valor integral</span>.
            </p>
          </div>

          <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col items-center min-w-[240px] shadow-2xl relative transition-colors duration-300">
            <div className="absolute -top-3 -right-3 bg-violet-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <CheckCircle2 size={10} /> META {results.atingimento.toFixed(0)}% ATINGIDA
            </div>

            <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-1">RENDA TOTAL MENSAL</span>
            <span className="text-4xl font-bold text-light-text dark:text-white">{moeda(results.total)}</span>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-2 font-medium">
              <Target size={12} className="text-amber-500 dark:text-amber-400" />
              <span>Meta: <span className="text-light-text dark:text-white">{contratos(data.contractsTarget)}</span></span>
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
                  onChange={(v) => setData(p => ({ ...p, baseSalary: v }))}
                  prefix="R$"
                />

                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="META (100%)"
                    value={data.contractsTarget}
                    onChange={(v) => setData(p => ({ ...p, contractsTarget: Math.max(0, Math.round(v)) }))}
                    suffix="contratos"
                    helper="Quantos contratos fechados representam 100% da meta do mês."
                  />
                  <InputField
                    label="VALOR DO BÔNUS"
                    value={data.bonusValue}
                    onChange={(v) => setData(p => ({ ...p, bonusValue: v }))}
                    prefix="R$"
                    helper="Bônus integral, pago ao atingir 100% da meta."
                  />
                </div>

                <InputField
                  label="TICKET MÉDIO DO CONTRATO"
                  value={data.averageTicket}
                  onChange={(v) => setData(p => ({ ...p, averageTicket: v }))}
                  prefix="R$"
                  helper="Valor médio de cada contrato. É sobre ele que a comissão incide."
                />

                <InputField
                  label="COMISSÃO POR CONTRATO"
                  value={data.commissionPerContract}
                  onChange={(v) => setData(p => ({ ...p, commissionPerContract: v }))}
                  prefix="R$"
                  step={50}
                  helper="Valor fixo pago por contrato fechado, independente do tamanho dele."
                />

                <InputField
                  label="CONTRATOS FECHADOS (1º MÊS)"
                  value={data.contractsClosed}
                  onChange={(v) => setData(p => ({ ...p, contractsClosed: Math.max(0, Math.round(v)) }))}
                  suffix="contratos"
                  helper="Quantidade de contratos assinados no mês."
                />

                <div className="p-4 bg-violet-600/5 rounded-2xl border border-violet-500/10">
                  <div className="flex gap-3">
                    <Info size={16} className="text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      <span className="text-violet-600 dark:text-violet-400 font-bold">Regra de Bônus:</span> para o bônus parcial (50%),
                      feche <span className="text-light-text dark:text-white font-bold">{contratos(results.metaParcial)}</span>.
                      Para o bônus total (100%), feche <span className="text-light-text dark:text-white font-bold">{contratos(data.contractsTarget)}</span>.
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
                icon={FileSignature}
                title="CONTRATOS FECHADOS"
                value={String(data.contractsClosed)}
                subtitle={`de ${contratos(data.contractsTarget)} · ${moeda(results.volume)} vendidos`}
                colorClass="bg-slate-700"
              />
              <StatCard
                icon={DollarSign}
                title="COMISSÃO TOTAL"
                value={moeda(results.comissao)}
                subtitle={`${moeda(data.commissionPerContract)} por contrato fechado`}
                colorClass="bg-emerald-600"
              />
              <StatCard
                icon={Award}
                title="BONIFICAÇÃO"
                value={moeda(results.bonus)}
                subtitle={results.bonusPercent > 0 ? `Parcial (${results.bonusPercent}%) liberada!` : 'Abaixo do gatilho'}
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
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80}
                        paddingAngle={5} dataKey="value" stroke="none">
                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => moeda(value)}
                        contentStyle={{ backgroundColor: 'var(--dark-tooltip)', borderRadius: '12px', border: 'none', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend verticalAlign="bottom" height={36}
                        wrapperStyle={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
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
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        Se fechar {contratos(data.contractsTarget)} (100%)
                      </p>
                      <p className="text-lg font-bold text-light-text dark:text-white">{moeda(results.total100)}</p>
                    </div>
                    <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full">
                      Bônus Integral
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-dark-card-hover rounded-2xl border border-slate-200 dark:border-white/5 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        Meta parcial (70% — {contratos(results.metaParcial)})
                      </p>
                      <p className="text-lg font-bold text-light-text dark:text-white">{moeda(results.totalParcial)}</p>
                    </div>
                    <div className="bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-bold px-3 py-1 rounded-full">
                      Bônus {moeda(data.bonusValue * 0.5)}
                    </div>
                  </div>

                  <div className="mt-4 p-6 bg-slate-100 dark:bg-dark-input rounded-2xl border border-slate-200 dark:border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Variável (com bônus)</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{moeda(results.comissao + results.bonus)}</p>
                        {results.bonusPercent > 0 && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                            BÔNUS: {results.bonusPercent}%
                          </span>
                        )}
                      </div>

                      <div className="mt-6">
                        <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Faturamento Final Previsto</p>
                        <p className="text-4xl font-bold text-light-text dark:text-white">{moeda(results.total)}</p>
                      </div>

                      <div className="mt-6 space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                          <span>Fixo</span>
                          <span>Performance</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden flex">
                          <div className="h-full bg-violet-500"
                            style={{ width: `${results.total > 0 ? (data.baseSalary / results.total) * 100 : 0}%` }} />
                          <div className="h-full bg-emerald-500"
                            style={{ width: `${results.total > 0 ? ((results.comissao + results.bonus) / results.total) * 100 : 0}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>Status: {data.contractsClosed}/{data.contractsTarget} contratos</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{results.atingimento.toFixed(0)}% da meta</span>
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
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                    <h4 className="text-xs font-bold text-light-text dark:text-white uppercase tracking-wider">Impacto do Bônus Proporcional</h4>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    O primeiro porto seguro é fechar <span className="text-light-text dark:text-white font-bold">{contratos(results.metaParcial)}</span>.
                    Só isso já soma <span className="text-light-text dark:text-white font-bold">{moeda(data.bonusValue * 0.5)}</span> ao mês.
                  </p>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-dark-card-hover/50 rounded-2xl border border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <h4 className="text-xs font-bold text-light-text dark:text-white uppercase tracking-wider">Próximo Nível</h4>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {results.atingimento >= 100
                      ? 'Meta batida e bônus no teto. Daqui para frente, cada contrato novo é comissão pura, sem limite.'
                      : results.atingimento >= 70
                        ? `Bônus parcial garantido. Faltam ${contratos(results.faltamParaTotal)} para dobrar o bônus para ${moeda(data.bonusValue)}.`
                        : `Faltam ${contratos(results.faltamParaParcial)} para liberar o primeiro gatilho, de ${moeda(data.bonusValue * 0.5)}.`}
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

export default ContratosCalculator;
