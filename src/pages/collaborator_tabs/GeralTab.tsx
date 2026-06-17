import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarClock, TrendingUp, Users, MessageSquare, Target,
  BrainCircuit, Smile, Frown, Meh, SmilePlus, Calendar, Clock,
  ChevronRight, Info, Award, CheckCircle2, AlertCircle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import LoadingSpinner from '../../components/LoadingSpinner';
import { auth } from '../../firebase';

// Helper: fetch autenticado com token Firebase
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string> || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Proximo1on1 {
  id: number;
  data: string;
  horario: string;
  observacao: string | null;
  criado_por_nome: string | null;
}

interface ProximaAvaliacao {
  id: number;
  data: string;
  horario: string;
  observacao: string | null;
  criado_por_nome: string | null;
}

interface DesempenhoResumo {
  media_geral: number;
  media_campanhas: number;
  media_grapehub: number;
  media_reunioes: number;
  media_tmr: number;
}

interface Meta {
  id: number;
  nome: string;
  responsavel_id: string | null;
  alvo: number;
  valor_atual: number;
  percentual: number;
  periodo: string;
}

interface Feedback {
  id: number;
  nota: number;
  texto: string;
  para_collaborator_id: number;
}

interface PDI {
  id: number;
  titulo: string;
  status: string;
  prazo: string;
  etapas?: { concluida: boolean }[];
}

interface PulseRecord {
  id: number;
  data: string;
  humor: 'otimo' | 'bem' | 'ok' | 'dificil' | 'pesado';
}

interface GeralTabProps {
  collaboratorId: string;
  isAdmin: boolean;
  isSelf: boolean;
  collaboratorEmail?: string | null;
}

// ── Mapeamento de Humor ───────────────────────────────────────────────────────
const moodValues: Record<string, number> = {
  otimo: 5,
  bem: 4,
  ok: 3,
  dificil: 2,
  pesado: 1
};

const moodLabels: Record<number, string> = {
  5: 'Ótimo',
  4: 'Bem',
  3: 'OK',
  2: 'Difícil',
  1: 'Pesado'
};

const moodEmojis: Record<string, string> = {
  otimo: '😁',
  bem: '🙂',
  ok: '😐',
  dificil: '🙁',
  pesado: '😭'
};

const moodColors: Record<string, string> = {
  otimo: 'text-emerald-500 dark:text-emerald-400',
  bem: 'text-teal-500 dark:text-teal-400',
  ok: 'text-amber-500 dark:text-amber-400',
  dificil: 'text-orange-500 dark:text-orange-400',
  pesado: 'text-red-500 dark:text-red-400'
};

const moodBgs: Record<string, string> = {
  otimo: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
  bem: 'bg-teal-500/10 border-teal-500/20 text-teal-500',
  ok: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
  dificil: 'bg-orange-500/10 border-orange-500/20 text-orange-500',
  pesado: 'bg-red-500/10 border-red-500/20 text-red-500'
};

export default function GeralTab({ collaboratorId, isAdmin, isSelf, collaboratorEmail }: GeralTabProps) {
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [proximo1on1, setProximo1on1] = useState<Proximo1on1 | null>(null);
  const [proximaAvaliacao, setProximaAvaliacao] = useState<ProximaAvaliacao | null>(null);
  const [resumoDesempenho, setResumoDesempenho] = useState<DesempenhoResumo | null>(null);
  const [total1on1s, setTotal1on1s] = useState<number>(0);
  const [metasInfo, setMetasInfo] = useState<{ concluidas: number; total: number; progressoMede: number }>({ concluidas: 0, total: 0, progressoMede: 0 });
  const [totalFeedbacks, setTotalFeedbacks] = useState<number>(0);
  const [pdiInfo, setPdiInfo] = useState<{ ativos: number; total: number }>({ ativos: 0, total: 0 });
  const [pulseHistory, setPulseHistory] = useState<PulseRecord[]>([]);
  const [submittingPulse, setSubmittingPulse] = useState(false);
  const [todayPulse, setTodayPulse] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        prox1Res,
        proxAvalRes,
        resumoDesRes,
        onesRes,
        metasRes,
        feedbacksRes,
        pdiRes,
        pulseRes
      ] = await Promise.all([
        authFetch(`/api/collaborators/${collaboratorId}/proximo-1on1`),
        authFetch(`/api/colaboradores/${collaboratorId}/proxima-avaliacao`),
        authFetch(`/api/colaboradores/${collaboratorId}/desempenho/resumo`),
        authFetch(`/api/collaborators/${collaboratorId}/one-on-ones`),
        authFetch(`/api/crm-metas`),
        authFetch(`/api/collaborators/${collaboratorId}/feedbacks`),
        authFetch(`/api/collaborators/${collaboratorId}/pdi`),
        authFetch(`/api/colaboradores/${collaboratorId}/pulso-diario/historico?dias=30`)
      ]);

      // 1. Proximo 1:1
      if (prox1Res.ok) setProximo1on1(await prox1Res.json());
      else setProximo1on1(null);

      // 2. Proxima Avaliacao
      if (proxAvalRes.ok) setProximaAvaliacao(await proxAvalRes.json());
      else setProximaAvaliacao(null);

      // 3. Resumo Desempenho
      if (resumoDesRes.ok) setResumoDesempenho(await resumoDesRes.json());
      else setResumoDesempenho(null);

      // 4. One-on-Ones count
      if (onesRes.ok) {
        const list = await onesRes.json();
        setTotal1on1s(Array.isArray(list) ? list.length : 0);
      }

      // 5. Metas filter
      if (metasRes.ok && collaboratorEmail) {
        const list: Meta[] = await metasRes.json();
        const userMetas = list.filter(m => m.responsavel_id === collaboratorEmail);
        const concluidas = userMetas.filter(m => m.percentual >= 100).length;
        const total = userMetas.length;
        const progressoMede = total > 0 
          ? Math.round(userMetas.reduce((acc, m) => acc + Math.min(m.percentual, 100), 0) / total)
          : 0;
        setMetasInfo({ concluidas, total, progressoMede });
      }

      // 6. Feedbacks count
      if (feedbacksRes.ok) {
        const list: Feedback[] = await feedbacksRes.json();
        // Feedbacks recebidos por esse colaborador
        const recebidos = list.filter(f => String(f.para_collaborator_id) === String(collaboratorId));
        setTotalFeedbacks(recebidos.length);
      }

      // 7. PDI count
      if (pdiRes.ok) {
        const list: PDI[] = await pdiRes.json();
        const ativos = list.filter(p => p.status !== 'Concluído' && p.status !== 'Cancelado').length;
        setPdiInfo({ ativos, total: list.length });
      }

      // 8. Pulse History
      if (pulseRes.ok) {
        const list: PulseRecord[] = await pulseRes.json();
        setPulseHistory(list);
        
        // Verificar se ja respondeu hoje
        const hojeFmt = new Date().toISOString().split('T')[0];
        const hojePulse = list.find(item => item.data.split('T')[0] === hojeFmt);
        if (hojePulse) {
          setTodayPulse(hojePulse.humor);
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard overview data:', error);
    } finally {
      setLoading(false);
    }
  }, [collaboratorId, collaboratorEmail]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Enviar pulso
  const handleSendPulse = async (humor: 'otimo' | 'bem' | 'ok' | 'dificil' | 'pesado') => {
    setSubmittingPulse(true);
    try {
      const res = await authFetch(`/api/colaboradores/${collaboratorId}/pulso-diario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ humor })
      });
      if (res.ok) {
        setTodayPulse(humor);
        // Atualizar historico de pulso
        const pulseRes = await authFetch(`/api/colaboradores/${collaboratorId}/pulso-diario/historico?dias=30`);
        if (pulseRes.ok) {
          setPulseHistory(await pulseRes.json());
        }
      }
    } catch (e) {
      console.error('Erro ao enviar pulso diário:', e);
    } finally {
      setSubmittingPulse(false);
    }
  };

  // Helper para datas robustas
  const parseDate = (dateStr: string) => {
    const cleanDate = dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00';
    return new Date(cleanDate);
  };

  // Helper para contagem regressiva
  const getDaysRemaining = (dateStr: string) => {
    const eventDate = parseDate(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  // Preparar dados do grafico
  const chartData = [...pulseHistory]
    .reverse()
    .map(item => {
      const d = new Date(item.data.includes('T') ? item.data : item.data + 'T12:00:00');
      return {
        date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        fullDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        value: moodValues[item.humor] || 3,
        humor: item.humor
      };
    });

  return (
    <div className="space-y-6">

      {/* ── 1. Painel de Próximos Eventos ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Card 1: Próximo 1:1 */}
        <div className="bg-slate-50 dark:bg-dark-bg/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between min-h-[140px] hover:border-violet-500/20 transition-all duration-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-colors pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-500 shrink-0">
              <CalendarClock size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Próximo 1:1</span>
                {proximo1on1 && (() => {
                  const dias = getDaysRemaining(proximo1on1.data);
                  const isPast = dias < 0;
                  const isToday = dias === 0;
                  return (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      isPast ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      isToday ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' :
                      'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    }`}>
                      {isPast ? `${Math.abs(dias)}d atrás` : isToday ? 'Hoje' : `em ${dias}d`}
                    </span>
                  );
                })()}
              </div>

              {proximo1on1 ? (
                <>
                  <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight">
                    {parseDate(proximo1on1.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={12} /> {proximo1on1.horario.slice(0, 5)}</span>
                    {proximo1on1.observacao && <span className="truncate max-w-[180px] italic">"{proximo1on1.observacao}"</span>}
                  </div>
                </>
              ) : (
                <div className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                  Nenhum 1:1 agendado
                </div>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-white/5 flex justify-end">
              <button 
                onClick={() => {
                  // Apenas muda de aba
                  const url = new URL(window.location.href);
                  url.searchParams.set('aba', '1-1s');
                  window.history.replaceState(null, '', url.toString());
                  window.location.reload();
                }}
                className="text-xs font-bold text-violet-500 hover:text-violet-400 flex items-center gap-1 transition-colors"
              >
                Gerenciar 1:1s <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Card 2: Próxima Avaliação */}
        <div className="bg-slate-50 dark:bg-dark-bg/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between min-h-[140px] hover:border-violet-500/20 transition-all duration-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-colors pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-500 shrink-0">
              <TrendingUp size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Avaliação de Desempenho</span>
                {proximaAvaliacao && (() => {
                  const dias = getDaysRemaining(proximaAvaliacao.data);
                  const isPast = dias < 0;
                  const isToday = dias === 0;
                  return (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      isPast ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      isToday ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse' :
                      'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    }`}>
                      {isPast ? `${Math.abs(dias)}d atrás` : isToday ? 'Hoje' : `em ${dias}d`}
                    </span>
                  );
                })()}
              </div>

              {proximaAvaliacao ? (
                <>
                  <h3 className="text-base font-black text-slate-800 dark:text-white leading-tight">
                    {parseDate(proximaAvaliacao.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={12} /> {proximaAvaliacao.horario.slice(0, 5)}</span>
                    {proximaAvaliacao.observacao && <span className="truncate max-w-[180px] italic">"{proximaAvaliacao.observacao}"</span>}
                  </div>
                </>
              ) : (
                <div className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                  Nenhuma avaliação agendada
                </div>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-white/5 flex justify-end">
              <button 
                onClick={() => {
                  // Apenas muda de aba
                  const url = new URL(window.location.href);
                  url.searchParams.set('aba', 'desempenho');
                  window.history.replaceState(null, '', url.toString());
                  window.location.reload();
                }}
                className="text-xs font-bold text-violet-500 hover:text-violet-400 flex items-center gap-1 transition-colors"
              >
                Ver avaliações <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ── 2. Grid de KPIs de Resumo ───────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
          Resumo das Categorias
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          
          {/* KPI 1: Desempenho */}
          <div className="bg-slate-50 dark:bg-dark-bg/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-2 transition-all hover:border-violet-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Desempenho</span>
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500"><Award size={16} /></div>
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {resumoDesempenho && resumoDesempenho.media_geral > 0
                ? `${Number(resumoDesempenho.media_geral).toFixed(1)} / 5.0`
                : '—'}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">
              Média do último ciclo
            </div>
          </div>

          {/* KPI 2: 1:1s */}
          <div className="bg-slate-50 dark:bg-dark-bg/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-2 transition-all hover:border-violet-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Reuniões 1:1</span>
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-500"><Users size={16} /></div>
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {total1on1s}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">
              Reuniões registradas
            </div>
          </div>

          {/* KPI 3: Metas */}
          <div className="bg-slate-50 dark:bg-dark-bg/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-2 transition-all hover:border-violet-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Metas CRM</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Target size={16} /></div>
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {metasInfo.total > 0 ? `${metasInfo.concluidas} / ${metasInfo.total}` : '0 / 0'}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">
              {metasInfo.total > 0 ? `${metasInfo.progressoMede}% progresso médio` : 'Sem metas ativas'}
            </div>
          </div>

          {/* KPI 4: Feedbacks */}
          <div className="bg-slate-50 dark:bg-dark-bg/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-2 transition-all hover:border-violet-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Feedbacks</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500"><MessageSquare size={16} /></div>
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {totalFeedbacks}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">
              Recebidos neste ano
            </div>
          </div>

          {/* KPI 5: PDI */}
          <div className="bg-slate-50 dark:bg-dark-bg/40 border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-2 transition-all hover:border-violet-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Plano PDI</span>
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500"><BrainCircuit size={16} /></div>
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {pdiInfo.ativos}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">
              Objetivos ativos ({pdiInfo.total} total)
            </div>
          </div>

        </div>
      </div>

      {/* ── 3. Histórico de Humor (Bottom Row) ─────────────────────────────────── */}
      <div className="bg-slate-50 dark:bg-dark-bg/40 border border-slate-200 dark:border-white/10 rounded-2xl p-6 transition-all relative overflow-hidden">
        
        {/* Header da Seção de Humor */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200/50 dark:border-white/5">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Respostas de Humor</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Acompanhamento de pulso e bem-estar (últimos 30 dias)</p>
          </div>

          {/* Seletor Rápido de Humor Diário */}
          {isSelf && (
            <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Como você está hoje?</span>
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200 dark:border-white/5">
                {(['pesado', 'dificil', 'ok', 'bem', 'otimo'] as const).map((mood) => (
                  <button
                    key={mood}
                    disabled={submittingPulse}
                    onClick={() => handleSendPulse(mood)}
                    title={moodLabels[moodValues[mood]]}
                    className={`w-7 h-7 text-base rounded-lg flex items-center justify-center transition-all ${
                      todayPulse === mood 
                        ? moodBgs[mood] + ' border scale-110 shadow-sm'
                        : 'hover:bg-slate-200 dark:hover:bg-white/5 opacity-40 hover:opacity-100'
                    }`}
                  >
                    {moodEmojis[mood]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Render do Gráfico */}
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
            <Smile size={48} className="mb-3 opacity-30 text-violet-500" />
            <h4 className="font-bold text-sm mb-1">Nenhum dado de humor registrado</h4>
            <p className="text-xs text-center max-w-xs opacity-75">
              {isSelf 
                ? 'Registre seu humor diário usando os emojis acima para começar a acompanhar seu bem-estar.'
                : 'Este colaborador ainda não registrou respostas de humor nos últimos 30 dias.'}
            </p>
          </div>
        ) : (
          <div className="h-[230px] w-full pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#888', fontSize: 10, fontWeight: 'bold' }} 
                />
                <YAxis 
                  domain={[1, 5]} 
                  ticks={[1, 2, 3, 4, 5]} 
                  tickFormatter={(val) => moodLabels[val] || ''}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#888', fontSize: 9, fontWeight: 'bold' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-[#11111b] border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-xl flex flex-col gap-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{data.fullDate}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">{moodEmojis[data.humor]}</span>
                            <span className={`text-xs font-black ${moodColors[data.humor]}`}>
                              Humor: {moodLabels[data.value]}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#7c3aed" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                  dot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#7c3aed', stroke: '#fff', strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>

    </div>
  );
}
