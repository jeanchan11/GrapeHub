import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Heart, TrendingUp, AlertTriangle, Calendar, Eye, ChevronRight } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import SplitHeadline from '../../components/SplitHeadline';
import { useAuth } from '../../contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Liderado {
  id: number;
  name: string;
  role: string | null;
  group_name: string | null;
  status: string;
  linked_picture: string | null;
  linked_user_name: string | null;
  tipo: 'direto' | 'indireto';
  profundidade: number;
  pulso_hoje: { humor: string; criado_em: string } | null;
  desempenho: number | null;
}

interface Resumo {
  total: number;
  pulso_respondido: number;
  pulso_total: number;
  media_desempenho: number | null;
}

interface PulsoDistribuicao {
  otimo: number;
  bem: number;
  ok: number;
  dificil: number;
  pesado: number;
}

interface PulsoResposta {
  id: number;
  name: string;
  linked_picture: string | null;
  respondeu: boolean;
  humor: string | null;
  criado_em: string | null;
}

interface Alerta {
  collaborator_id: number;
  name: string;
  linked_picture: string | null;
  motivo: 'pulso_negativo' | 'queda_desempenho' | 'pdi_vencido';
  descricao: string;
}

interface CollaboratorSetting {
  id: number;
  type: 'group' | 'role' | 'seniority';
  name: string;
  color: string;
}

// ── Config ────────────────────────────────────────────────────────────────────
const MOOD_CONFIG: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  otimo:   { emoji: '😁', label: 'Ótimo',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  bem:     { emoji: '😊', label: 'Bem',     color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  ok:      { emoji: '😐', label: 'Ok',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  dificil: { emoji: '😔', label: 'Difícil', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  pesado:  { emoji: '😤', label: 'Pesado',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const ALERT_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  pulso_negativo:   { icon: '😔', color: '#f97316', bg: '#1f1a15', border: '#3a2a20' },
  queda_desempenho: { icon: '📉', color: '#ef4444', bg: '#1f1515', border: '#3a2020' },
  pdi_vencido:      { icon: '📋', color: '#f59e0b', bg: '#1f1a10', border: '#3a2a15' },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function MinhaEquipeTab() {
  const { userData } = useAuth();
  const email = userData?.email;

  const [loading, setLoading] = useState(true);
  const [liderados, setLiderados] = useState<Liderado[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ total: 0, pulso_respondido: 0, pulso_total: 0, media_desempenho: null });
  const [pulsoDistribuicao, setPulsoDistribuicao] = useState<PulsoDistribuicao>({ otimo: 0, bem: 0, ok: 0, dificil: 0, pesado: 0 });
  const [pulsoRespostas, setPulsoRespostas] = useState<PulsoResposta[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [settings, setSettings] = useState<CollaboratorSetting[]>([]);
  const [agenda, setAgenda] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    try {
      const headers = { 'x-user-email': email };
      const [teamRes, pulsoRes, alertaRes, settingsRes, agendaRes] = await Promise.all([
        fetch('/api/colaboradores/minha-equipe', { headers }),
        fetch('/api/colaboradores/minha-equipe/pulso-hoje', { headers }),
        fetch('/api/colaboradores/minha-equipe/alertas', { headers }),
        fetch('/api/collaborator-settings'),
        fetch('/api/colaboradores/minha-equipe/agenda', { headers }),
      ]);

      if (teamRes.ok) {
        const data = await teamRes.json();
        setLiderados(data.liderados || []);
        setResumo(data.resumo || { total: 0, pulso_respondido: 0, pulso_total: 0, media_desempenho: null });
      }
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data);
      }
      if (pulsoRes.ok) {
        const data = await pulsoRes.json();
        setPulsoDistribuicao(data.distribuicao || { otimo: 0, bem: 0, ok: 0, dificil: 0, pesado: 0 });
        setPulsoRespostas(data.respostas || []);
      }
      if (alertaRes.ok) {
        const data = await alertaRes.json();
        setAlertas(data.alertas || []);
      }
      if (agendaRes.ok) {
        const data = await agendaRes.json();
        setAgenda(data || []);
      }
    } catch (e) {
      console.error('MinhaEquipe fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const navigateToProfile = (id: number) => {
    window.location.hash = `#/colaboradores/${id}`;
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours}h`;
    return `há ${Math.floor(hours / 24)}d`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const totalPulso = Object.values(pulsoDistribuicao).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SplitHeadline
            text="Minha "
            highlight="Equipe"
            className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-0"
            subtitle="VISÃO CONSOLIDADA DA LIDERANÇA"
            subtitleClassName="text-slate-500 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1"
          />
          <span className="bg-violet-500/15 text-violet-400 text-xs font-bold px-3 py-1 rounded-full border border-violet-500/20">
            {resumo.total} {resumo.total === 1 ? 'pessoa' : 'pessoas'}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total no Time</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Users size={16} className="text-violet-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{resumo.total}</p>
          <p className="text-xs text-slate-500 mt-1">
            {liderados.filter(l => l.tipo === 'direto').length} diretos · {liderados.filter(l => l.tipo === 'indireto').length} indiretos
          </p>
        </motion.div>

        {/* Pulso respondido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pulso Respondido</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Heart size={16} className="text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            {resumo.pulso_respondido}/{resumo.pulso_total}
          </p>
          <div className="mt-2 w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: resumo.pulso_total > 0 ? `${(resumo.pulso_respondido / resumo.pulso_total) * 100}%` : '0%' }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-emerald-500"
            />
          </div>
        </motion.div>

        {/* Desempenho médio */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Desempenho Médio</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            {resumo.media_desempenho != null ? resumo.media_desempenho.toFixed(1) : '—'}
            {resumo.media_desempenho != null && <span className="text-sm text-slate-500 font-bold"> /5</span>}
          </p>
          <p className="text-xs text-slate-500 mt-1">Último ciclo quinzenal</p>
        </motion.div>

        {/* Alertas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className={`bg-white dark:bg-dark-bg border rounded-2xl p-5 flex flex-col justify-between ${
            alertas.length > 0
              ? 'border-red-500/30 dark:border-red-500/20'
              : 'border-slate-200 dark:border-white/10'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pessoas em Alerta</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              alertas.length > 0 ? 'bg-red-500/10' : 'bg-slate-500/10'
            }`}>
              <AlertTriangle size={16} className={alertas.length > 0 ? 'text-red-400' : 'text-slate-400'} />
            </div>
          </div>
          <p className={`text-2xl font-black ${alertas.length > 0 ? 'text-red-400' : 'text-slate-800 dark:text-white'}`}>
            {alertas.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {alertas.length === 0 ? 'Nenhum alerta ativo' : 'Requerem atenção'}
          </p>
        </motion.div>
      </div>

      {/* Main Content — 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pulso de Hoje */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-5">
            Pulso de Hoje
          </h3>

          {/* Emoji Distribution */}
          <div className="flex items-end justify-between gap-2 mb-6">
            {Object.entries(MOOD_CONFIG).map(([key, cfg]) => {
              const count = pulsoDistribuicao[key as keyof PulsoDistribuicao] || 0;
              const pct = totalPulso > 0 ? (count / totalPulso) * 100 : 0;
              return (
                <div key={key} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">{count}</span>
                  <div className="w-full rounded-lg overflow-hidden" style={{ background: cfg.bg, minHeight: 8 }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: Math.max(pct * 0.8, 4) }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{ background: cfg.color }}
                      className="w-full rounded-lg"
                    />
                  </div>
                  <span className="text-xl">{cfg.emoji}</span>
                  <span className="text-[10px] font-bold text-slate-500">{cfg.label}</span>
                </div>
              );
            })}
          </div>

          {/* Response List */}
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
            {pulsoRespostas.map(r => (
              <div
                key={r.id}
                onClick={() => navigateToProfile(r.id)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.06] border border-transparent hover:border-violet-500/20 transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">
                  {r.linked_picture
                    ? <img src={r.linked_picture} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                    : r.name.charAt(0).toUpperCase()
                  }
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1 truncate">{r.name}</span>
                {r.respondeu ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{MOOD_CONFIG[r.humor!]?.emoji || '❓'}</span>
                    <span className="text-[10px] text-slate-500">{formatTimeAgo(r.criado_em)}</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Pendente
                  </span>
                )}
              </div>
            ))}
            {pulsoRespostas.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Nenhum dado de pulso disponível.</p>
            )}
          </div>
        </motion.div>

        {/* Próximos 1:1 e Análise de Desempenho */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-5">
            Próximos 1:1 e Análise de Desempenho
          </h3>

          {agenda.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500">
              <span className="text-4xl mb-3">📅</span>
              <p className="text-sm font-medium">Nenhum compromisso agendado</p>
              <p className="text-xs text-slate-400 mt-1">Não há 1:1s ou avaliações agendadas no momento</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-hide">
              {agenda.map((item, idx) => {
                const isLeader = item.relation === 'leader';
                
                // Color configuration:
                // - Leader: Violet/indigo theme
                // - Subordinate: Emerald/teal theme
                const borderStyles = isLeader 
                  ? 'border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10'
                  : 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10';
                
                const badgeStyles = isLeader
                  ? 'bg-violet-500/15 text-violet-400 border-violet-500/20'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';

                const typeBadgeLabel = item.type === '1on1' ? '1:1' : 'Avaliação';

                const relationLabel = isLeader ? 'Líder' : 'Liderado';

                const formattedDate = new Date(item.data).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                });
                
                const formattedTime = item.horario ? item.horario.substring(0, 5) : '';

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${borderStyles}`}
                  >
                    {/* User Avatar */}
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">
                      {item.picture
                        ? <img src={item.picture} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                        : item.name.charAt(0).toUpperCase()
                      }
                    </div>
                    
                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.name}</p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${badgeStyles}`}>
                          {relationLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {typeBadgeLabel} · {formattedDate} às {formattedTime}
                        {item.observacao && ` · "${item.observacao}"`}
                      </p>
                    </div>

                    {/* View Profile Button (only for subordinates/liderados) */}
                    {!isLeader && (
                      <button
                        onClick={() => navigateToProfile(item.collabId)}
                        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 transition-all flex items-center gap-1"
                      >
                        <Eye size={12} /> Ver perfil
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Grid de Liderados */}
      <div>
        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4">
          Equipe Completa
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {liderados
            .filter(l => l.status === 'Efetivado')
            .sort((a, b) => {
              // Diretos primeiro, depois por nome
              if (a.tipo !== b.tipo) return a.tipo === 'direto' ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map((l, idx) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.03 }}
              onClick={() => navigateToProfile(l.id)}
              className="group bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 hover:border-violet-500/30 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-violet-500/5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-400 ring-2 ring-white dark:ring-white/10">
                  {l.linked_picture
                    ? <img src={l.linked_picture} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                    : l.name.charAt(0).toUpperCase()
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{l.name}</p>
                  <p className="text-xs text-slate-500 truncate">{l.role || '—'}</p>
                </div>
                {l.pulso_hoje && (
                  <span className="text-xl shrink-0" title={MOOD_CONFIG[l.pulso_hoje.humor]?.label}>
                    {MOOD_CONFIG[l.pulso_hoje.humor]?.emoji || '❓'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  l.tipo === 'direto'
                    ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                }`}>
                  {l.tipo === 'direto' ? 'Direto' : `Indireto`}
                </span>
                {l.group_name && (() => {
                  const groupSetting = settings.find(s => s.type === 'group' && s.name === l.group_name);
                  return groupSetting ? (
                    <span
                      className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: `${groupSetting.color}15`,
                        color: groupSetting.color,
                        borderColor: `${groupSetting.color}30`,
                      }}
                    >
                      {l.group_name}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                      {l.group_name}
                    </span>
                  );
                })()}
                {l.desempenho != null && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-auto">
                    ★ {l.desempenho.toFixed(1)}
                  </span>
                )}
              </div>

              {/* Hover arrow */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                <ChevronRight size={14} />
              </div>
            </motion.div>
          ))}
        </div>
        {liderados.filter(l => l.status === 'Efetivado').length === 0 && (
          <div className="text-center py-10 text-slate-500">
            <Users size={40} className="mx-auto mb-3 text-slate-400" />
            <p className="text-sm font-medium">Nenhum liderado encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Conecte colaboradores no organograma para vê-los aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}
