import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from 'recharts';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface DreRow { structure: string; description: string; level: number; values: Record<string, number>; total: number; }
interface DreData { year: string; months: string[]; historicalMonths: string[]; rows: DreRow[]; }

/**
 * Dashboard do DRE — leitura visual do mesmo dado da aba DRE / Fluxo de Caixa.
 *
 * Convenções (todas derivadas dos grupos de nível 1 do plano de contas):
 *   Faturamento total  = 01 Receitas Operacionais
 *   Custo operacional  = 02 Despesas Operacionais
 *   Custo total        = 02 + 04 Despesas Não Operacionais + 05 Distribuição de Lucros
 * Custos são exibidos em magnitude (positivos) para a leitura do gráfico.
 */
const DreDashboard: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<DreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/financeiro/dre?year=${year}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year]);

  const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const brlFull = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

  const serie = useMemo(() => {
    if (!data) return [];
    const rowOf = (s: string) => data.rows.find(r => r.structure === s);
    const receitas = rowOf('01');
    const despOper = rowOf('02');
    const despNaoOper = rowOf('04');
    const distribuicao = rowOf('05');

    const recNaoOper = rowOf('03');

    const linhas = data.months.map((m, i) => {
      const faturamento = receitas?.values[m] || 0;
      const naoOperacional = recNaoOper?.values[m] || 0;
      const custoOperacional = Math.abs(despOper?.values[m] || 0);
      const custoTotal = custoOperacional
        + Math.abs(despNaoOper?.values[m] || 0)
        + Math.abs(distribuicao?.values[m] || 0);
      return {
        mes: MESES[i],
        refMonth: m,
        historico: data.historicalMonths.includes(m),
        faturamento,
        naoOperacional,
        custoOperacional,
        custoTotal,
        // Entradas menos saídas de todos os grupos = "Geração de Caixa do Período" do DRE
        resultado: faturamento + naoOperacional - custoTotal,
      };
    });

    // Corta os meses do fim do ano que ainda não têm lançamento nenhum
    let ultimo = -1;
    linhas.forEach((l, i) => { if (l.faturamento !== 0 || l.custoTotal !== 0) ultimo = i; });
    return ultimo < 0 ? [] : linhas.slice(0, ultimo + 1);
  }, [data]);

  const totais = useMemo(() => serie.reduce((acc, l) => ({
    faturamento: acc.faturamento + l.faturamento,
    naoOperacional: acc.naoOperacional + l.naoOperacional,
    custoOperacional: acc.custoOperacional + l.custoOperacional,
    custoTotal: acc.custoTotal + l.custoTotal,
  }), { faturamento: 0, naoOperacional: 0, custoOperacional: 0, custoTotal: 0 }), [serie]);

  const resultado = totais.faturamento + totais.naoOperacional - totais.custoTotal;
  const margem = totais.faturamento > 0 ? (resultado / totais.faturamento) * 100 : 0;
  const mediaMensal = serie.length > 0 ? totais.faturamento / serie.length : 0;

  const tooltipStyle = {
    background: '#1a1625',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    fontSize: 12,
  };
  const eixoY = (v: number) => `${Math.round(v / 1000)}k`;

  const Card: React.FC<{ label: string; valor: string; sub?: string; cor?: string }> = ({ label, valor, sub, cor }) => (
    <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
      <p className={`text-2xl font-black leading-none ${cor || 'text-dark-text'}`}>{valor}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-2 leading-tight">{sub}</p>}
    </div>
  );

  if (loading) return <div className="py-20 text-center text-sm text-slate-500">Carregando…</div>;
  if (!data) return <div className="py-20 text-center text-sm text-slate-500">Não foi possível carregar o DRE.</div>;

  return (
    <div className="space-y-5">
      {/* Cabeçalho + seletor de ano */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-dark-text">Dashboard do DRE</h2>
          <p className="text-xs text-slate-500">
            Faturamento e custos por mês · <span className="text-amber-400">meses em destaque</span> = calculado pelo GrapeHub
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ano</p>
          <div className="flex items-center gap-1 bg-dark-card border border-white/10 rounded-xl px-1 py-0.5">
            <button onClick={() => setYear(y => y - 1)} className="p-1.5 text-slate-400 hover:text-violet-400 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-bold text-dark-text px-1 tabular-nums">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="p-1.5 text-slate-400 hover:text-violet-400 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {serie.length === 0 ? (
        <div className="bg-dark-card border border-white/10 rounded-2xl py-20 text-center text-sm text-slate-500">
          Nenhum lançamento em {year}.
        </div>
      ) : (
        <>
          {/* Totalizadores do ano */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              label="Faturamento total"
              valor={brl(totais.faturamento)}
              sub={`${serie.length} ${serie.length === 1 ? 'mês' : 'meses'} · média ${brl(mediaMensal)}/mês`}
              cor="text-emerald-400"
            />
            <Card
              label="Custo operacional"
              valor={brl(totais.custoOperacional)}
              sub={totais.faturamento > 0 ? `${((totais.custoOperacional / totais.faturamento) * 100).toFixed(1).replace('.', ',')}% do faturamento` : undefined}
              cor="text-rose-400"
            />
            <Card
              label="Custo total"
              valor={brl(totais.custoTotal)}
              sub="Operacional + não operacional + distribuição"
              cor="text-rose-400"
            />
            <Card
              label="Resultado"
              valor={brl(resultado)}
              sub={`Geração de caixa do período · margem ${margem.toFixed(1).replace('.', ',')}%`}
              cor={resultado >= 0 ? 'text-emerald-400' : 'text-rose-400'}
            />
          </div>

          {/* Evolução mensal */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-dark-text mb-1">Faturamento x Custos</h3>
            <p className="text-xs text-slate-500 mb-4">Evolução mês a mês em {year}</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={serie} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={eixoY} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
                <RechartsTooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: any, n: any) => [brlFull(Number(v)), n]}
                  labelFormatter={(l: any) => `${l}/${year}`}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                <Area type="monotone" dataKey="faturamento" name="Faturamento total" stroke="#2ecc8f" fill="#2ecc8f" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="custoTotal" name="Custo total" stroke="#f74c4c" fill="#f74c4c" fillOpacity={0.12} strokeWidth={2} />
                <Area type="monotone" dataKey="custoOperacional" name="Custo operacional" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.10} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Resultado por mês */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-dark-text mb-1">Resultado por mês</h3>
            <p className="text-xs text-slate-500 mb-4">Todas as entradas menos todas as saídas — mesmo número da Geração de Caixa do Período</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={serie} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={eixoY} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
                <RechartsTooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  formatter={(v: any) => [brlFull(Number(v)), 'Resultado']}
                  labelFormatter={(l: any) => `${l}/${year}`}
                />
                <Bar dataKey="resultado" name="Resultado" radius={[6, 6, 0, 0]} fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detalhe mensal */}
          <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-5 pb-3">
              <h3 className="text-sm font-bold text-dark-text">Detalhe mensal</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                    <th className="text-left px-5 py-2 font-bold">Mês</th>
                    <th className="text-right px-5 py-2 font-bold">Faturamento</th>
                    <th className="text-right px-5 py-2 font-bold">Custo operacional</th>
                    <th className="text-right px-5 py-2 font-bold">Custo total</th>
                    <th className="text-right px-5 py-2 font-bold">Resultado</th>
                    <th className="text-right px-5 py-2 font-bold">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {serie.map(l => {
                    const mg = l.faturamento > 0 ? (l.resultado / l.faturamento) * 100 : 0;
                    return (
                      <tr key={l.refMonth} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className={`px-5 py-2 font-semibold ${l.historico ? 'text-dark-text' : 'text-amber-400'}`}>{l.mes}</td>
                        <td className="px-5 py-2 text-right tabular-nums text-emerald-400">{brlFull(l.faturamento)}</td>
                        <td className="px-5 py-2 text-right tabular-nums text-slate-400">{brlFull(l.custoOperacional)}</td>
                        <td className="px-5 py-2 text-right tabular-nums text-rose-400">{brlFull(l.custoTotal)}</td>
                        <td className={`px-5 py-2 text-right tabular-nums font-bold ${l.resultado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{brlFull(l.resultado)}</td>
                        <td className={`px-5 py-2 text-right tabular-nums ${mg >= 0 ? 'text-slate-400' : 'text-rose-400'}`}>{mg.toFixed(1).replace('.', ',')}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-violet-500/[0.07] font-bold">
                    <td className="px-5 py-2.5 text-dark-text">Total</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-emerald-400">{brlFull(totais.faturamento)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-slate-300">{brlFull(totais.custoOperacional)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-rose-400">{brlFull(totais.custoTotal)}</td>
                    <td className={`px-5 py-2.5 text-right tabular-nums ${resultado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{brlFull(resultado)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-slate-300">{margem.toFixed(1).replace('.', ',')}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DreDashboard;
