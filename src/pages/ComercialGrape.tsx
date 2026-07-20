
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
  <div className="flex flex-col gap-1.5">
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
        className={`w-full bg-slate-100 dark:bg-dark-card-hover border border-slate-200 dark:border-white/5 rounded-xl py-3 transition-all focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none text-light-text dark:text-white font-bold ${prefix ? 'pl-8' : 'pl-4'} ${suffix ? 'pr-12' : 'pr-4'}`}
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-bold no-print">{suffix}</span>}
    </div>
  </div>
);

const ComercialGrape: React.FC = () => {
  const reportRef = useRef<HTMLDivElement>(null);
  // Funil com SDR: a mídia gera LEADS, o SDR converte lead em reunião agendada.
  const [data, setData] = useState({
    targetSales: 168000,
    leadCost: 12,             // Custo por lead (CPL) — o que a mídia entrega
    leadToMeetingRate: 20,    // Taxa Lead → Reunião agendada (trabalho do SDR)
    noShowRate: 20,           // Taxa de No-Show (%)
    meetingToClosingRate: 25, // Taxa Reunião realizada → Fechamento (closer)
    averageTicket: 14000,
    meetingsPerSdr: 60,       // Capacidade: reuniões agendadas por SDR/mês
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
            targetSales:          result.targetSales          ?? prev.targetSales,
            leadCost:             result.leadCost             ?? prev.leadCost,
            leadToMeetingRate:    result.leadToMeetingRate    ?? prev.leadToMeetingRate,
            meetingToClosingRate: result.meetingToClosingRate ?? prev.meetingToClosingRate,
            averageTicket:        result.averageTicket        ?? prev.averageTicket,
            noShowRate:           result.noShowRate           ?? prev.noShowRate,
            meetingsPerSdr:       result.meetingsPerSdr       ?? prev.meetingsPerSdr,
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
    // Funil calculado de trás pra frente: meta → contratos → reuniões → agendamentos → leads
    const targetContracts = data.averageTicket > 0 ? Math.ceil(data.targetSales / data.averageTicket) : 0;
    // Reuniões REALIZADAS necessárias (trabalho do closer)
    const meetingsNeeded = data.meetingToClosingRate > 0
      ? Math.ceil(targetContracts / (data.meetingToClosingRate / 100))
      : 0;
    // Agendamentos = reuniões realizadas / (1 - no-show)
    const noshowMultiplier = data.noShowRate >= 100 ? 1 : 1 / (1 - data.noShowRate / 100);
    const scheduledMeetings = Math.ceil(meetingsNeeded * noshowMultiplier);
    const noshowCount = scheduledMeetings - meetingsNeeded;
    // Leads = agendamentos / taxa de agendamento do SDR
    const leadsNeeded = data.leadToMeetingRate > 0
      ? Math.ceil(scheduledMeetings / (data.leadToMeetingRate / 100))
      : 0;
    // Investimento = só mídia (custo por lead × leads). Custo do time de SDR fica de fora.
    const requiredInvestment = leadsNeeded * data.leadCost;
    // Capacidade: quantos SDRs para dar conta dos agendamentos
    const sdrsNeeded = data.meetingsPerSdr > 0 ? Math.ceil(scheduledMeetings / data.meetingsPerSdr) : 0;

    const fmr = targetContracts * (data.averageTicket / 4);
    const tcv = targetContracts * data.averageTicket;
    const cac = targetContracts > 0 ? requiredInvestment / targetContracts : 0;
    const roi = requiredInvestment > 0 ? fmr / requiredInvestment : 0;
    // Custo por reunião agendada vira RESULTADO (antes era entrada)
    const costPerMeeting = scheduledMeetings > 0 ? requiredInvestment / scheduledMeetings : 0;

    return {
      leadsNeeded,
      meetingsNeeded,
      scheduledMeetings,
      noshowCount,
      sdrsNeeded,
      costPerMeeting,
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

  return (
    <div ref={reportRef} className="min-h-screen text-light-text dark:text-white pb-20 font-sans transition-colors duration-300">
      <header className="pt-12 pb-16 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div className="flex-1">
            <SplitHeadline
              text="Calculadora Comercial "
              highlight="Grape"
              className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1"
            />
            <p className="text-slate-500 text-sm max-w-3xl">
              Planeje sua operação de vendas com base em reuniões qualificadas agendadas diretamente. Projete contratos, receita e ROI com precisão.
            </p>
          </div>

          <div className="bg-light-card dark:bg-dark-card p-8 rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col items-center min-w-[280px] shadow-2xl relative transition-colors duration-300">
            <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-2">ROI (EM VEZES)</span>
            <span className="text-6xl font-bold text-emerald-600 dark:text-[#10b981] mb-2">
              {results.roi.toFixed(1)}x
            </span>
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-500">
              <Zap size={14} fill="currentColor" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Multiplicador de Capital</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Sidebar */}
          <div className="lg:col-span-3">
            <section className="bg-light-card dark:bg-dark-card p-8 rounded-3xl border border-slate-200 dark:border-white/5 space-y-8 sticky top-8 transition-colors duration-300">
              <div className="flex items-center gap-3 mb-2">
                <Calculator className="text-violet-600 dark:text-violet-500" size={20} />
                <h2 className="text-sm font-bold text-light-text dark:text-white uppercase tracking-widest">Parâmetros do Funil</h2>
              </div>

              <div className="space-y-6">
                <InputField
                  label="Meta de Vendas"
                  value={data.targetSales}
                  onChange={(v) => setData(p => ({...p, targetSales: v}))}
                  prefix="R$"
                />

                <InputField
                  label="Custo por Lead (CPL)"
                  value={data.leadCost}
                  onChange={(v) => setData(p => ({...p, leadCost: v}))}
                  prefix="R$"
                  helper="Quanto a mídia paga por lead gerado"
                />

                <InputField
                  label="Taxa Lead → Reunião (SDR)"
                  value={data.leadToMeetingRate}
                  onChange={(v) => setData(p => ({...p, leadToMeetingRate: Math.min(100, Math.max(1, v))}))}
                  suffix="%"
                  helper="Dos leads recebidos, quantos o SDR consegue agendar"
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
                  label="Ticket Médio do Contrato"
                  value={data.averageTicket}
                  onChange={(v) => setData(p => ({...p, averageTicket: v}))}
                  prefix="R$"
                  helper="Valor total do contrato vendido (ex: 4 meses)"
                />

                <InputField
                  label="Reuniões por SDR / mês"
                  value={data.meetingsPerSdr}
                  onChange={(v) => setData(p => ({...p, meetingsPerSdr: Math.max(1, v)}))}
                  helper="Capacidade de agendamento de 1 SDR — define quantos SDRs são necessários"
                />

                <div className="p-5 bg-violet-600/5 rounded-2xl border border-violet-500/10">
                  <div className="flex gap-3">
                    <Info size={16} className="text-violet-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      <span className="text-violet-400 font-bold">Dica Pro:</span> para {results.meetingsNeeded} reuniões realizadas, o SDR precisa agendar <span className="text-light-text dark:text-white font-bold">{results.scheduledMeetings}</span> (no-show de {data.noShowRate}%), o que exige <span className="text-light-text dark:text-white font-bold">{results.leadsNeeded}</span> leads a {data.leadToMeetingRate}% de agendamento.
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-white/5 space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Investimento em Mídia</p>
                    <p className="text-3xl font-bold text-light-text dark:text-white">{formatCurrency(results.requiredInvestment)}</p>
                    <p className="text-[10px] text-slate-500 mt-1 italic">{results.leadsNeeded} leads × {formatCurrency(data.leadCost)} · não inclui custo do time</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">SDRs Necessários</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{results.sdrsNeeded} <span className="text-xs font-medium text-slate-500 lowercase tracking-normal">{results.sdrsNeeded === 1 ? 'SDR' : 'SDRs'}</span></p>
                    <p className="text-[10px] text-slate-500 mt-1 italic">{results.scheduledMeetings} agendamentos ÷ {data.meetingsPerSdr} por SDR</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Meta de Contratos</p>
                    <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">{results.targetContracts} <span className="text-xs font-medium text-slate-500 lowercase tracking-normal">contratos</span></p>
                    <p className="text-[10px] text-slate-500 mt-1 italic">Para atingir {formatCurrency(data.targetSales)}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleExportPNG}
                className="w-full mt-4 px-6 py-4 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 no-print"
              >
                <FileDown size={18} /> Exportar Projeção
              </button>
            </section>
          </div>

          {/* Main Dashboard */}
          <div className="lg:col-span-9 space-y-6">

            {/* Top Cards — funil com SDR: Leads, Agendamentos, Reuniões e Contratos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-5 transition-colors duration-300">
                <div className="p-3 bg-[#3b82f6] rounded-xl">
                  <Users size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Leads</p>
                  <h3 className="text-3xl font-bold text-light-text dark:text-white">{results.leadsNeeded}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Gerados pela mídia</p>
                </div>
              </div>

              <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-5 transition-colors duration-300">
                <div className="p-3 bg-[#ef4444] rounded-xl">
                  <CalendarDays size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Agendamentos</p>
                  <h3 className="text-3xl font-bold text-light-text dark:text-white">{results.scheduledMeetings}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {results.noshowCount > 0 ? <span className="text-rose-500">{results.noshowCount} no-shows previstos</span> : 'Sem no-shows'}
                  </p>
                </div>
              </div>

              <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-5 transition-colors duration-300">
                <div className="p-3 bg-[#f59e0b] rounded-xl">
                  <CalendarDays size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reuniões Realizadas</p>
                  <h3 className="text-3xl font-bold text-light-text dark:text-white">{results.meetingsNeeded}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Após {data.noShowRate}% no-show</p>
                </div>
              </div>

              <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-5 transition-colors duration-300">
                <div className="p-3 bg-violet-600 rounded-xl">
                  <Target size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Contratos</p>
                  <h3 className="text-3xl font-bold text-light-text dark:text-white">{results.targetContracts}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Novos clientes ativos</p>
                </div>
              </div>
            </div>

            {/* CAC and Revenue Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-5 transition-colors duration-300">
                <div className="p-3 bg-blue-600 rounded-xl">
                  <MousePointer2 size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">CAC</p>
                  <h3 className="text-3xl font-bold text-light-text dark:text-white">{formatCurrency(results.cac)}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Custo de Aquisição</p>
                </div>
              </div>

              <div className="bg-light-card dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-5 transition-colors duration-300">
                <div className="p-3 bg-slate-700 rounded-xl">
                  <DollarSign size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">TCV Estimado</p>
                  <h3 className="text-3xl font-bold text-light-text dark:text-white">{formatCurrency(results.tcv)}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Valor total dos contratos (4 meses)</p>
                </div>
              </div>
            </div>

            {/* Funnel and Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Funnel Visualization — 3 etapas: Agendamentos → Reuniões → Contratos */}
              <div className="lg:col-span-7 bg-light-card dark:bg-dark-card p-10 rounded-3xl border border-slate-200 dark:border-white/5 transition-colors duration-300">
                <div className="flex items-center justify-between mb-10">
                  <h3 className="font-bold text-light-text dark:text-white flex items-center gap-2 uppercase tracking-widest text-xs">
                    <ArrowDownWideNarrow size={18} className="text-violet-600 dark:text-violet-400" />
                    Visualização do Funil
                  </h3>
                  <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Volume por Etapa</div>
                </div>

                <div className="relative flex flex-col items-center">
                  <div className="relative w-full max-w-[420px]">
                    {/* Funil de 4 etapas: Leads → Agendamentos → Reuniões → Contratos */}
                    <svg viewBox="0 0 400 420" className="w-full h-auto">
                      <defs>
                        <linearGradient id="funnelGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="33%" stopColor="#ef4444" />
                          <stop offset="66%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                        <filter id="glow3" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="6" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* Dashed Lines — 4 etapas */}
                      <line x1="20" y1="40" x2="380" y2="40" stroke="currentColor" className="text-slate-200 dark:text-white/5" strokeDasharray="4 4" />
                      <line x1="20" y1="153" x2="380" y2="153" stroke="currentColor" className="text-slate-200 dark:text-white/5" strokeDasharray="4 4" />
                      <line x1="20" y1="266" x2="380" y2="266" stroke="currentColor" className="text-slate-200 dark:text-white/5" strokeDasharray="4 4" />
                      <line x1="20" y1="380" x2="380" y2="380" stroke="currentColor" className="text-slate-200 dark:text-white/5" strokeDasharray="4 4" />

                      {/* Funnel Shape — 4 stages */}
                      <path
                        d="M 60,40
                           C 60,110 140,120 145,153
                           C 150,200 165,215 172,266
                           L 178,380
                           L 222,380
                           L 228,266
                           C 235,215 250,200 255,153
                           C 260,120 340,110 340,40
                           Z"
                        fill="url(#funnelGradient3)"
                        filter="url(#glow3)"
                        className="opacity-85"
                      />

                      {/* Labels Left */}
                      <text x="20" y="30" className="fill-slate-500" fontSize="10" fontWeight="700">LEADS</text>
                      <text x="20" y="145" className="fill-slate-500" fontSize="10" fontWeight="700">AGENDAMENTOS</text>
                      <text x="20" y="258" className="fill-slate-500" fontSize="10" fontWeight="700">REUNIÕES</text>
                      <text x="20" y="372" className="fill-slate-500" fontSize="10" fontWeight="700">CONTRATOS</text>

                      {/* Pills — valores */}
                      <rect x="160" y="25" width="80" height="30" rx="15" className="fill-slate-100 dark:fill-dark-input stroke-slate-200 dark:stroke-white/10" />
                      <text x="200" y="45" textAnchor="middle" className="fill-light-text dark:fill-white" fontSize="15" fontWeight="bold">{results.leadsNeeded}</text>

                      <rect x="160" y="138" width="80" height="30" rx="15" className="fill-slate-100 dark:fill-dark-input stroke-slate-200 dark:stroke-white/10" />
                      <text x="200" y="158" textAnchor="middle" className="fill-light-text dark:fill-white" fontSize="15" fontWeight="bold">{results.scheduledMeetings}</text>

                      <rect x="160" y="251" width="80" height="30" rx="15" className="fill-slate-100 dark:fill-dark-input stroke-slate-200 dark:stroke-white/10" />
                      <text x="200" y="271" textAnchor="middle" className="fill-light-text dark:fill-white" fontSize="15" fontWeight="bold">{results.meetingsNeeded}</text>

                      <rect x="160" y="365" width="80" height="30" rx="15" className="fill-slate-100 dark:fill-dark-input stroke-slate-200 dark:stroke-white/10" />
                      <text x="200" y="385" textAnchor="middle" className="fill-light-text dark:fill-white" fontSize="15" fontWeight="bold">{results.targetContracts}</text>

                      {/* Conversion Circles */}
                      <g transform="translate(352, 96)">
                        <circle r="26" className="fill-blue-50 dark:fill-blue-900/20 stroke-blue-200 dark:stroke-blue-500/20" />
                        <text y="-2" textAnchor="middle" className="fill-blue-600 dark:fill-blue-400" fontSize="11" fontWeight="bold">{data.leadToMeetingRate}%</text>
                        <text y="11" textAnchor="middle" className="fill-slate-500" fontSize="8" fontWeight="bold">SDR</text>
                      </g>

                      <g transform="translate(352, 209)">
                        <circle r="26" className="fill-rose-50 dark:fill-rose-900/20 stroke-rose-200 dark:stroke-rose-500/20" />
                        <text y="-2" textAnchor="middle" className="fill-rose-500" fontSize="11" fontWeight="bold">{data.noShowRate}%</text>
                        <text y="11" textAnchor="middle" className="fill-slate-500" fontSize="8" fontWeight="bold">NO-SHOW</text>
                      </g>

                      <g transform="translate(352, 322)">
                        <circle r="26" className="fill-slate-100 dark:fill-dark-input stroke-slate-200 dark:stroke-white/10" />
                        <text y="-2" textAnchor="middle" className="fill-violet-600 dark:fill-violet-400" fontSize="11" fontWeight="bold">{data.meetingToClosingRate}%</text>
                        <text y="11" textAnchor="middle" className="fill-slate-500" fontSize="8" fontWeight="bold">CONV.</text>
                      </g>
                    </svg>
                  </div>

                  {/* Summary table below the funnel */}
                  <div className="w-full mt-6 space-y-3">
                    <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-dark-input rounded-2xl border border-slate-200 dark:border-white/5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Leads</span>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-light-text dark:text-white">{results.leadsNeeded}</span>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg uppercase tracking-widest">CPL {formatCurrency(data.leadCost)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-dark-input rounded-2xl border border-slate-200 dark:border-white/5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Agendamentos</span>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-light-text dark:text-white">{results.scheduledMeetings}</span>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg uppercase tracking-widest">{data.noShowRate}% no-show</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-dark-input rounded-2xl border border-slate-200 dark:border-white/5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Reuniões</span>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-light-text dark:text-white">{results.meetingsNeeded}</span>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg uppercase tracking-widest">{results.sdrsNeeded} {results.sdrsNeeded === 1 ? 'SDR' : 'SDRs'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-dark-input rounded-2xl border border-slate-200 dark:border-white/5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Contratos</span>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-light-text dark:text-white">{results.targetContracts}</span>
                        <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-lg uppercase tracking-widest">{data.meetingToClosingRate}% conv.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Efficiency and Projections */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-light-card dark:bg-dark-card p-8 rounded-3xl border border-slate-200 dark:border-white/5 transition-colors duration-300">
                  <h3 className="font-bold text-light-text dark:text-white flex items-center gap-2 uppercase tracking-widest text-xs mb-8">
                    <BarChart3 size={18} className="text-violet-600 dark:text-violet-400" />
                    Métricas de Eficiência
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-50 dark:bg-dark-input rounded-2xl border border-slate-200 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Custo / Reunião</p>
                      <p className="text-xl font-bold text-light-text dark:text-white">{formatCurrency(results.costPerMeeting)}</p>
                    </div>
                    <div className="p-5 bg-slate-50 dark:bg-dark-input rounded-2xl border border-slate-200 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Taxa Fechamento</p>
                      <p className="text-xl font-bold text-light-text dark:text-white">{data.meetingToClosingRate}%</p>
                    </div>
                    <div className="p-5 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-200 dark:border-rose-500/20">
                      <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mb-1">No-Show</p>
                      <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{data.noShowRate}% <span className="text-xs font-medium text-rose-400">({results.noshowCount} faltas)</span></p>
                    </div>
                    <div className="p-5 bg-slate-50 dark:bg-dark-input rounded-2xl border border-slate-200 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">CAC (Aquisição)</p>
                      <p className="text-xl font-bold text-light-text dark:text-white">{formatCurrency(results.cac)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-light-card dark:bg-dark-card p-8 rounded-3xl border border-slate-200 dark:border-white/5 transition-colors duration-300">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Total Contract Value (TCV)</p>
                  <div className="flex items-center gap-4">
                    <h3 className="text-5xl font-bold text-emerald-600 dark:text-[#10b981] tracking-tighter">
                      {formatCurrency(results.tcv)}
                    </h3>
                    <div className="bg-[#10b981]/10 text-emerald-600 dark:text-[#10b981] text-[9px] font-bold px-3 py-2 rounded-lg border border-[#10b981]/20 uppercase tracking-widest leading-tight">
                      Projeção<br/>4 Meses
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/5">
                    <p className="text-[9px] text-slate-500 italic">* Valor total do contrato considerando o período de 4 meses.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Strategic Insights */}
            <div className="bg-light-card dark:bg-dark-card p-10 rounded-3xl border border-slate-200 dark:border-white/5 transition-colors duration-300">
              <h3 className="font-bold text-light-text dark:text-white mb-10 flex items-center gap-2 uppercase tracking-widest text-xs">
                <Lightbulb size={18} className="text-violet-600 dark:text-violet-400" />
                Insights Estratégicos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-slate-50 dark:bg-dark-input rounded-2xl border border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-2.5 h-2.5 rounded-full bg-violet-500"></div>
                    <h4 className="text-xs font-bold text-light-text dark:text-white uppercase tracking-widest">Alavanca de Conversão</h4>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Se você aumentar sua taxa de <span className="text-light-text dark:text-white font-bold">Reunião → Contrato</span> para 30%, seu faturamento passaria para <span className="text-rose-500 dark:text-rose-400 font-bold">{formatCurrency(results.meetingsNeeded * 0.3 * (data.averageTicket / 4))}</span>, elevando seu ROI para <span className="text-violet-600 dark:text-violet-400 font-bold">{( (results.meetingsNeeded * 0.3 * (data.averageTicket / 4)) / results.requiredInvestment ).toFixed(1)}x</span>.
                  </p>
                </div>
                <div className="p-8 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-200 dark:border-rose-500/20">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                    <h4 className="text-xs font-bold text-light-text dark:text-white uppercase tracking-widest">Impacto do No-Show</h4>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {(() => {
                      // Cenário com no-show em 10%: recalcula agendamentos → leads → investimento
                      const sched10 = Math.ceil(results.meetingsNeeded / 0.9);
                      const leads10 = data.leadToMeetingRate > 0 ? Math.ceil(sched10 / (data.leadToMeetingRate / 100)) : 0;
                      const invest10 = leads10 * data.leadCost;
                      const economia = Math.max(0, results.requiredInvestment - invest10);
                      return (
                        <>
                          Com {data.noShowRate}% de no-show, você perde <span className="text-rose-500 font-bold">{results.noshowCount} reuniões</span> — o SDR precisa agendar a mais, o que custa <span className="text-rose-500 font-bold">{formatCurrency(results.noshowCount * results.costPerMeeting)}</span> em mídia por ciclo. Reduzir o no-show para 10% economizaria <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(economia)}</span> em investimento.
                        </>
                      );
                    })()}
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

export default ComercialGrape;
