import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, Scale } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
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

  // Visual refeito em 09/10/2026 (mesmos números): tooltip que acompanha o tema,
  // eixo com valor curto ("R$ 8 mil"), legenda como etiquetas no cabeçalho do card.
  const eixoY = (v: number) => {
    const a = Math.abs(v);
    return a >= 1000 ? `${v < 0 ? '−' : ''}R$ ${(a / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
  };
  const eixo = { fontSize: 10, fill: '#94a3b8' };
  const Dica = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-card shadow-xl px-3 py-2 text-xs min-w-[200px]">
        <p className="font-bold text-slate-900 dark:text-white mb-1">{`${label}/${year}`}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <span className="w-2 h-2 rounded-sm" style={{ background: p.dataKey === 'resultado' ? '#8b5cf6' : p.color }} />
              {p.dataKey === 'resultado' ? 'Resultado' : p.name}
            </span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{brlFull(Number(p.value))}</span>
          </p>
        ))}
      </div>
    );
  };
  const Chip = ({ cor, r }: { cor: string; r: string }) => (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: cor }} />
      {r}
    </span>
  );

  const Card: React.FC<{ label: string; valor: string; sub?: string; Icone: any; cor: string; alerta?: boolean }> = ({ label, valor, sub, Icone, cor, alerta }) => (
    <div className={`px-5 py-4 rounded-2xl border ${alerta ? 'bg-rose-500/[0.06] border-rose-500/20' : 'bg-white dark:bg-dark-card/60 border-slate-200 dark:border-white/5'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cor}1a`, color: cor }}><Icone size={14} /></div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${alerta ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>{valor}</p>
      {sub && <p className={`text-[11px] mt-0.5 leading-snug ${alerta ? 'text-rose-400' : 'text-slate-500'}`}>{sub}</p>}
    </div>
  );

  if (loading) return <div className="py-20 text-center text-sm text-slate-500">Carregando…</div>;
  if (!data) return <div className="py-20 text-center text-sm text-slate-500">Não foi possível carregar o DFC.</div>;

  return (
    <div className="space-y-5">
      {/* Cabeçalho + seletor de ano */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Dashboard do DFC</h2>
          <p className="text-[11px] text-slate-500">
            Faturamento e custos por mês · <span className="text-amber-500">meses em destaque</span> = calculado pelo GrapeHub
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ano</p>
          <div className="h-10 flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
            <button onClick={() => setYear(y => y - 1)} title="Ano anterior" className="w-9 h-full flex items-center justify-center rounded-l-xl text-slate-400 hover:text-violet-500 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-bold text-slate-900 dark:text-white w-12 text-center tabular-nums">{year}</span>
            <button onClick={() => setYear(y => y + 1)} title="Próximo ano" className="w-9 h-full flex items-center justify-center rounded-r-xl text-slate-400 hover:text-violet-500 transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {serie.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-dark-card/60 py-20 text-center text-sm text-slate-500">
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
              Icone={TrendingUp}
              cor="#10b981"
            />
            <Card
              label="Custo operacional"
              valor={brl(totais.custoOperacional)}
              sub={totais.faturamento > 0 ? `${((totais.custoOperacional / totais.faturamento) * 100).toFixed(1).replace('.', ',')}% do faturamento` : undefined}
              Icone={TrendingDown}
              cor="#f59e0b"
            />
            <Card
              label="Custo total"
              valor={brl(totais.custoTotal)}
              sub="Operacional + não operacional + distribuição"
              Icone={Wallet}
              cor="#f43f5e"
            />
            <Card
              label="Resultado"
              valor={brl(resultado)}
              sub={`Geração de caixa do período · margem ${margem.toFixed(1).replace('.', ',')}%`}
              Icone={Scale}
              cor="#7c3aed"
              alerta={resultado < 0}
            />
          </div>

          {/* Evolução mensal */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-dark-card/60 p-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
              <div className="mr-auto">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Faturamento x Custos</h3>
                <p className="text-[11px] text-slate-500">Evolução mês a mês em {year}</p>
              </div>
              <Chip cor="#2ecc8f" r="Faturamento total" />
              <Chip cor="#f74c4c" r="Custo total" />
              <Chip cor="#f59e0b" r="Custo operacional" />
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={serie} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(150, 150, 150, 0.12)" />
                <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} dy={6} />
                <YAxis tickFormatter={eixoY} tick={eixo} axisLine={false} tickLine={false} width={70} />
                <RechartsTooltip content={<Dica />} cursor={{ stroke: '#8b5cf6', strokeOpacity: 0.25 }} />
                <Area type="monotone" dataKey="faturamento" name="Faturamento total" stroke="#2ecc8f" fill="#2ecc8f" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="custoTotal" name="Custo total" stroke="#f74c4c" fill="#f74c4c" fillOpacity={0.12} strokeWidth={2} />
                <Area type="monotone" dataKey="custoOperacional" name="Custo operacional" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.10} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Resultado por mês */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-dark-card/60 p-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
              <div className="mr-auto">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Resultado por mês</h3>
                <p className="text-[11px] text-slate-500">Todas as entradas menos todas as saídas — mesmo número da Geração de Caixa do Período</p>
              </div>
              <Chip cor="#8b5cf6" r="Resultado" />
              <Chip cor="#f43f5e" r="Resultado negativo" />
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={serie} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(150, 150, 150, 0.12)" />
                <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} dy={6} />
                <YAxis tickFormatter={eixoY} tick={eixo} axisLine={false} tickLine={false} width={70} />
                <RechartsTooltip content={<Dica />} cursor={{ fill: 'rgba(124,58,237,0.06)' }} />
                <Bar dataKey="resultado" name="Resultado" radius={[6, 6, 0, 0]} fill="#8b5cf6">
                  {/* Mês com resultado negativo em rosa — só cor, o valor é o mesmo */}
                  {serie.map(l => <Cell key={l.refMonth} fill={l.resultado < 0 ? '#f43f5e' : '#8b5cf6'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detalhe mensal */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-dark-card/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Detalhe mensal</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5">
                    <th className="text-left px-5 py-3 font-bold">Mês</th>
                    <th className="text-right px-5 py-3 font-bold">Faturamento</th>
                    <th className="text-right px-5 py-3 font-bold">Custo operacional</th>
                    <th className="text-right px-5 py-3 font-bold">Custo total</th>
                    <th className="text-right px-5 py-3 font-bold">Resultado</th>
                    <th className="text-right px-5 py-3 font-bold">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {serie.map(l => {
                    const mg = l.faturamento > 0 ? (l.resultado / l.faturamento) * 100 : 0;
                    return (
                      <tr key={l.refMonth} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                        <td className={`px-5 py-3 font-semibold ${l.historico ? 'text-slate-900 dark:text-white' : 'text-amber-500'}`}>{l.mes}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{brlFull(l.faturamento)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">{brlFull(l.custoOperacional)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-rose-500 dark:text-rose-400">{brlFull(l.custoTotal)}</td>
                        <td className={`px-5 py-3 text-right tabular-nums font-bold ${l.resultado >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>{brlFull(l.resultado)}</td>
                        <td className={`px-5 py-3 text-right tabular-nums ${mg >= 0 ? 'text-slate-500 dark:text-slate-400' : 'text-rose-500 dark:text-rose-400'}`}>{mg.toFixed(1).replace('.', ',')}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-violet-500/[0.06] font-bold">
                    <td className="px-5 py-3 text-slate-900 dark:text-white">Total</td>
                    <td className="px-5 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{brlFull(totais.faturamento)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{brlFull(totais.custoOperacional)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-rose-500 dark:text-rose-400">{brlFull(totais.custoTotal)}</td>
                    <td className={`px-5 py-3 text-right tabular-nums ${resultado >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>{brlFull(resultado)}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">{margem.toFixed(1).replace('.', ',')}%</td>
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
