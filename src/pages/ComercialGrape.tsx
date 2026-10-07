
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { 
  Calculator, TrendingUp, Target, DollarSign, Wallet, 
  Info, Zap, FileDown, Star, CheckCircle2,
  BarChart3, Activity, Award, Check, X, 
  ArrowUpRight, Percent, ShoppingBag, Coins,
  Users, CalendarDays, ClipboardList, MousePointer2,
  ArrowDownWideNarrow, Lightbulb
} from 'lucide-react';
import SplitHeadline from '../components/SplitHeadline';
import FunilVisual from '../components/FunilVisual';

// Components
const StatCard = ({ icon: Icon, title, value, subtitle, colorClass, variant = 'default' }: { 
  icon: any, title: string, value: string, subtitle?: string, colorClass: string, variant?: 'default' | 'large'
}) => (
  <div className={`p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 bg-light-card dark:bg-dark-card transition-all relative overflow-hidden`}>
    <div className="flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${colorClass}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{title}</p>
        <h3 className={`${variant === 'large' ? 'text-3xl' : 'text-2xl'} font-bold text-light-text dark:text-white`}>{value}</h3>
        {subtitle && <p className="text-[10px] text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  </div>
);

const InputField = ({ label, value, onChange, prefix, suffix, min = 0, step = 1, helper }: {
  label: string, value: number, onChange: (val: number) => void, prefix?: string, suffix?: string, min?: number, step?: number, helper?: string
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
      {label}
      {helper && (
        <div className="group relative no-print">
          <Info size={12} className="text-slate-400 dark:text-slate-600 cursor-help" />
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
        className={`w-full bg-slate-100 dark:bg-dark-card-hover border border-slate-200 dark:border-white/5 rounded-xl py-2 transition-all focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-light-text dark:text-white font-bold ${prefix ? 'pl-8' : 'pl-4'} ${suffix ? 'pr-12' : 'pr-4'}`}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold no-print">{suffix}</span>}
    </div>
  </div>
);

const ComercialGrape: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  // Funil sem SDR (28/09/2026): o anúncio leva direto para a agenda e o lead marca
  // sozinho. A mídia entrega REUNIÕES AGENDADAS — por isso a entrada é o custo por
  // reunião, não o CPL + taxa de agendamento do SDR.
  // A conta anda PARA A FRENTE (28/09/2026): entra o investimento em anúncios, sai
  // quanto se vende com ele. Antes partia da meta de vendas e calculava a verba.
  const [data, setData] = useState({
    mediaInvestment: 16500,   // Investimento em anúncios no período
    meetingCost: 300,         // Custo por reunião agendada — o que a mídia paga por agendamento
    noShowRate: 20,           // Taxa de No-Show (%)
    meetingToClosingRate: 25, // Taxa Reunião realizada → Fechamento (closer)
    averageTicket: 14000,
  });

  // Fetch data from Neon DB via API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/comercial-data');
        if (response.ok) {
          const result = await response.json();
          setData(prev => ({
            ...prev,
            // Sem investimento salvo ainda (linha do modelo antigo, por meta de vendas):
            // parte da verba que a meta antiga exigia, para a projeção não pular.
            mediaInvestment:      result.mediaInvestment ?? (() => {
              const t = Number(result.targetSales), tk = Number(result.averageTicket), cr = Number(result.meetingToClosingRate),
                    ns = Number(result.noShowRate ?? 20), mc = Number(result.meetingCost ?? prev.meetingCost);
              if (!(t > 0 && tk > 0 && cr > 0 && ns < 100)) return prev.mediaInvestment;
              const contratos = Math.ceil(t / tk), realizadas = Math.ceil(contratos / (cr / 100));
              return Math.ceil(realizadas / (1 - ns / 100)) * mc;
            })(),
            meetingCost:          result.meetingCost          ?? prev.meetingCost,
            meetingToClosingRate: result.meetingToClosingRate ?? prev.meetingToClosingRate,
            averageTicket:        result.averageTicket        ?? prev.averageTicket,
            noShowRate:           result.noShowRate           ?? prev.noShowRate,
          }));
        }
      } catch (err) {
        console.error("Failed to fetch comercial data:", err);
      }
    };
    fetchData();
  }, []);

  // Save data to Neon DB via API (debounced)
  useEffect(() => {
    const saveData = async () => {
      try {
        await fetch('/api/comercial-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } catch (err) {
        console.error("Failed to save comercial data:", err);
      }
    };
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [data]);

  const results = useMemo(() => {
    // Funil para a frente: investimento → agendamentos → reuniões realizadas → contratos → vendas.
    // Arredonda para BAIXO em cada etapa: não existe meio agendamento, e projeção de
    // venda otimista é a que queima verba. (+1e-9 evita 55 × 0,8 = 43,999… virar 43.)
    const piso = (x: number) => Math.floor(x + 1e-9);
    const scheduledMeetings = data.meetingCost > 0 ? piso(data.mediaInvestment / data.meetingCost) : 0;
    const meetingsNeeded = piso(scheduledMeetings * (1 - Math.min(99, data.noShowRate) / 100));   // realizadas
    const noshowCount = scheduledMeetings - meetingsNeeded;
    const targetContracts = piso(meetingsNeeded * (data.meetingToClosingRate / 100));
    // O que se gasta de fato: só agendamentos inteiros (o troco não compra reunião)
    const requiredInvestment = data.mediaInvestment;

    // O ticket é a MENSALIDADE (R$ 2.227 por cliente/mês). FMR = contratos × mensalidade;
    // TCV = FMR × 4 meses de contrato. Até 28/09/2026 a tela tratava o ticket como o
    // contrato inteiro e dividia por 4 — o FMR saía 4× menor.
    const fmr = targetContracts * data.averageTicket;
    const tcv = fmr * 4;
    const cac = targetContracts > 0 ? requiredInvestment / targetContracts : 0;
    const roi = requiredInvestment > 0 ? fmr / requiredInvestment : 0;
    const costPerMeeting = data.meetingCost;
    // Custo por reunião REALIZADA: o agendamento que virou no-show é pago pelas que aconteceram
    const costPerHeldMeeting = meetingsNeeded > 0 ? requiredInvestment / meetingsNeeded : 0;

    return {
      meetingsNeeded,
      scheduledMeetings,
      noshowCount,
      costPerMeeting,
      costPerHeldMeeting,
      targetContracts,
      requiredInvestment,
      fmr,
      cac,
      roi,
      tcv,
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
      link.download = `calculadora-comercial-grape-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao exportar PNG:', err);
    }
  };

  // Insights calculados uma vez (mesmo investimento, outra alavanca)
  const taxaMais5 = Math.min(100, data.meetingToClosingRate + 5);
  const contratosMais5 = Math.floor(results.meetingsNeeded * taxaMais5 / 100 + 1e-9);
  const realizadas10 = Math.floor(results.scheduledMeetings * 0.9 + 1e-9);
  const contratos10 = Math.floor(realizadas10 * data.meetingToClosingRate / 100 + 1e-9);
  const ganhoNoShow = Math.max(0, (contratos10 - results.targetContracts) * data.averageTicket);
  // Mesma conta do funil com R$ 5.000 a mais em anúncios
  const verbaMais = (() => {
    const agendamentos = data.meetingCost > 0 ? Math.floor((data.mediaInvestment + 5000) / data.meetingCost + 1e-9) : 0;
    const realizadas = Math.floor(agendamentos * (1 - Math.min(99, data.noShowRate) / 100) + 1e-9);
    return { agendamentos, contratos: Math.floor(realizadas * data.meetingToClosingRate / 100 + 1e-9) };
  })();

  // Layout pensado para caber numa tela (28/09/2026): saíram as repetições — CAC e TCV
  // em dobro, a tabela que repetia os números do funil, no-show e taxa de fechamento
  // repetidos em "métricas", e o resumo de vendas da lateral (é o card do FMR).
  const Kpi = ({ icon: Icon, cor, titulo, valor, sub }: { icon: any; cor: string; titulo: string; valor: string | number; sub: React.ReactNode }) => (
    <div className="bg-light-card dark:bg-dark-card px-5 py-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-4 transition-colors duration-300">
      <div className={`p-3.5 rounded-2xl shrink-0 ${cor}`}><Icon size={26} className="text-white" /></div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{titulo}</p>
        <h3 className="text-[34px] font-bold text-light-text dark:text-white leading-tight tracking-tight">{valor}</h3>
        <p className="text-[11px] text-slate-500 truncate">{sub}</p>
      </div>
    </div>
  );

  return (
    // Ocupa a altura da tela (lg+): cabeçalho fixo, o resto estica até o rodapé —
    // o funil e os cards crescem com a janela em vez de sobrar faixa vazia embaixo.
    <div ref={reportRef} className="min-h-screen lg:h-screen flex flex-col text-light-text dark:text-white font-sans transition-colors duration-300">
      <header className="pt-6 pb-5 px-6 shrink-0">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
          <div className="min-w-0">
            <SplitHeadline
              text="Calculadora Comercial "
              highlight="Grape"
              className="text-3xl font-black text-light-text dark:text-white tracking-tight"
            />
            <p className="text-slate-500 text-xs mt-1">
              Quanto você vende com o investimento em anúncios — o lead agenda direto pelo anúncio.
            </p>
          </div>
          <div className="bg-light-card dark:bg-dark-card px-7 py-4 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-4 shadow-lg shrink-0 transition-colors duration-300">
            <div className="text-right">
              <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">ROI (em vezes)</p>
              <p className="flex items-center justify-end gap-1 text-violet-600 dark:text-violet-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                <Zap size={11} fill="currentColor" /> Multiplicador de capital
              </p>
            </div>
            <span className="text-5xl font-bold text-emerald-600 dark:text-[#10b981]">{results.roi.toFixed(1)}x</span>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 w-full max-w-[1600px] mx-auto px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:h-full">

          {/* Parâmetros */}
          {/* Altura do próprio conteúdo: esticar até o rodapé deixava o card vazio */}
          <div className="lg:col-span-3 self-start">
            <section className="flex flex-col bg-light-card dark:bg-dark-card p-6 rounded-3xl border border-slate-200 dark:border-white/5 transition-colors duration-300">
              <div>
              <div className="flex items-center gap-2 pb-3">
                <Calculator className="text-violet-600 dark:text-violet-500" size={17} />
                <h2 className="text-xs font-bold text-light-text dark:text-white uppercase tracking-widest">Parâmetros do Funil</h2>
              </div>
              <div className="flex flex-col gap-4">
              <InputField
                label="Investimento em Anúncios"
                value={data.mediaInvestment}
                onChange={(v) => setData(p => ({...p, mediaInvestment: v}))}
                prefix="R$"
                helper="Quanto vai para anúncio no período — não inclui custo do time"
              />
              <InputField
                label="Custo por Reunião"
                value={data.meetingCost}
                onChange={(v) => setData(p => ({...p, meetingCost: v}))}
                prefix="R$"
                helper="Quanto a mídia paga por reunião agendada — o lead marca sozinho pelo anúncio"
              />
              <InputField
                label="Taxa de No-Show"
                value={data.noShowRate}
                onChange={(v) => setData(p => ({...p, noShowRate: Math.min(99, Math.max(0, v))}))}
                suffix="%"
                helper="Percentual de agendados que não comparecem à reunião"
              />
              <InputField
                label="Taxa Reunião → Fechamento"
                value={data.meetingToClosingRate}
                onChange={(v) => setData(p => ({...p, meetingToClosingRate: v}))}
                suffix="%"
                helper="Das reuniões realizadas, quantas o closer converte"
              />
              <InputField
                label="Ticket Médio (mensalidade)"
                value={data.averageTicket}
                onChange={(v) => setData(p => ({...p, averageTicket: v}))}
                prefix="R$"
                helper="Quanto cada cliente paga por mês — o contrato dura 4 meses"
              />
              </div>
              </div>

              {/* Resumo: a resposta da calculadora em uma linha */}
              <div className="pt-5">
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Resumo</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    <span className="font-bold text-light-text dark:text-white">{formatCurrency(data.mediaInvestment)}</span> em anúncios viram{' '}
                    <span className="font-bold text-light-text dark:text-white">{results.targetContracts} contratos</span> e{' '}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(results.fmr)}/mês</span> — ROI de{' '}
                    <span className="font-bold text-light-text dark:text-white">{results.roi.toFixed(1)}x</span>.
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportPNG}
                className="w-full mt-4 shrink-0 px-4 py-3 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 no-print"
              >
                <FileDown size={16} /> Exportar Projeção
              </button>
            </section>
          </div>

          <div className="lg:col-span-9 flex flex-col gap-5 lg:h-full lg:min-h-0">
            {/* Resultado em 4 números */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
              <Kpi icon={CalendarDays} cor="bg-[#ef4444]" titulo="Agendamentos" valor={results.scheduledMeetings}
                sub={<>{formatCurrency(data.meetingCost)} cada · <span className="text-rose-500">{results.noshowCount} no-shows</span></>} />
              <Kpi icon={CalendarDays} cor="bg-[#f59e0b]" titulo="Reuniões Realizadas" valor={results.meetingsNeeded}
                sub={<>{formatCurrency(results.costPerHeldMeeting)} por realizada</>} />
              <Kpi icon={Target} cor="bg-violet-600" titulo="Contratos" valor={results.targetContracts}
                sub={<>{data.meetingToClosingRate}% das realizadas</>} />
              <Kpi icon={MousePointer2} cor="bg-blue-600" titulo="CAC" valor={formatCurrency(results.cac)}
                sub="Investimento ÷ contratos" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
              {/* Funil */}
              <div className="lg:col-span-7 flex flex-col min-h-0 bg-light-card dark:bg-dark-card p-6 rounded-3xl border border-slate-200 dark:border-white/5 transition-colors duration-300">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <h3 className="font-bold text-light-text dark:text-white flex items-center gap-2 uppercase tracking-widest text-xs">
                    <ArrowDownWideNarrow size={16} className="text-violet-600 dark:text-violet-400" />
                    Visualização do Funil
                  </h3>
                  <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Volume por Etapa</div>
                </div>
                <div className="flex-1 min-h-0 flex items-center justify-center">
                <FunilVisual
                  id="planejado"
                  className="w-full h-full min-h-[300px] max-h-[460px]"
                  etapas={[
                    { rotulo: 'Agendamentos', valor: results.scheduledMeetings },
                    { rotulo: 'Reuniões', valor: results.meetingsNeeded },
                    { rotulo: 'Contratos', valor: results.targetContracts },
                  ]}
                  taxas={[
                    { valor: `${data.noShowRate}%`, rotulo: 'NO-SHOW', tom: 'rose' },
                    { valor: `${data.meetingToClosingRate}%`, rotulo: 'CONV.', tom: 'violet' },
                  ]}
                />
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-5 min-h-0">
                {/* FMR em destaque, TCV como apoio */}
                <div className="shrink-0 bg-light-card dark:bg-dark-card p-7 rounded-3xl border border-slate-200 dark:border-white/5 transition-colors duration-300">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Faturamento Mensal Recorrente (FMR)</p>
                  <div className="flex items-center gap-3">
                    <h3 className="text-5xl font-bold text-emerald-600 dark:text-[#10b981] tracking-tighter">{formatCurrency(results.fmr)}</h3>
                    <div className="bg-[#10b981]/10 text-emerald-600 dark:text-[#10b981] text-[9px] font-bold px-2.5 py-1.5 rounded-lg border border-[#10b981]/20 uppercase tracking-widest leading-tight">
                      Por<br/>mês
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-500 italic mt-3">
                    * FMR = {results.targetContracts} contratos × {formatCurrency(data.averageTicket)} por mês.
                  </p>
                </div>

                {/* Onde está a alavanca — mesmo investimento */}
                <div className="flex-1 min-h-0 flex flex-col justify-center gap-5 bg-light-card dark:bg-dark-card p-7 rounded-3xl border border-slate-200 dark:border-white/5 transition-colors duration-300">
                  <h3 className="font-bold text-light-text dark:text-white flex items-center gap-2 uppercase tracking-widest text-xs">
                    <Lightbulb size={16} className="text-violet-600 dark:text-violet-400" />
                    Onde está a alavanca
                  </h3>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0"></div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Fechamento em <span className="text-light-text dark:text-white font-bold">{taxaMais5}%</span>: {contratosMais5} contratos
                      ({contratosMais5 - results.targetContracts >= 0 ? '+' : ''}{contratosMais5 - results.targetContracts}) e{' '}
                      <span className="text-violet-600 dark:text-violet-400 font-bold">{formatCurrency(contratosMais5 * data.averageTicket)}</span> por mês.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 shrink-0"></div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      O no-show de {data.noShowRate}% joga fora <span className="text-rose-500 font-bold">{formatCurrency(results.noshowCount * results.costPerMeeting)}</span> em agendamentos.
                      Com 10%, seriam {realizadas10} reuniões e <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(ganhoNoShow)}</span> a mais por mês.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Com <span className="text-light-text dark:text-white font-bold">{formatCurrency(data.mediaInvestment + 5000)}</span> em anúncios (+R$ 5.000):{' '}
                      {verbaMais.agendamentos} agendamentos, {verbaMais.contratos} contratos ({verbaMais.contratos - results.targetContracts >= 0 ? '+' : ''}{verbaMais.contratos - results.targetContracts}) e{' '}
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(verbaMais.contratos * data.averageTicket)}</span> por mês.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComercialGrape;
