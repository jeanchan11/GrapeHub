import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Trash2, Trophy, TrendingUp, DollarSign,
  Activity, Target, CheckCircle2, Clock, AlertCircle, X,
  ChevronRight, ChevronLeft, BarChart3, RefreshCw, Pencil,
  Calendar, Video, Percent
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

// ============================================================
// TIPOS
// ============================================================
interface Meta {
  id: string;
  nome: string;
  tipo: string;
  metrica: string;
  periodo: string;
  alvo: number;
  kanban_id: string | null;
  responsavel_id: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  valor_atual: number;
  percentual: number;
}

interface Kanban { id: string; nome: string; }
interface User   { id: string; name: string; email: string; }

// ============================================================
// CONFIGURAÇÕES DOS TIPOS DE META
// ============================================================
const TIPOS_META = [
  {
    id: 'negocios_adicionados',
    label: 'Negócios Adicionados',
    desc: 'Quantidade ou valor de negócios criados',
    icon: Plus,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
  },
  {
    id: 'negocios_andamento',
    label: 'Negócios em Andamento',
    desc: 'Negócios que atingiram determinada etapa',
    icon: TrendingUp,
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    border: 'border-violet-200 dark:border-violet-500/30',
  },
  {
    id: 'negocios_ganhos',
    label: 'Negócios Ganhos',
    desc: 'Quantidade ou valor de negócios fechados',
    icon: Trophy,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
  },
  {
    id: 'receita',
    label: 'Receita',
    desc: 'Valor total de receita gerada',
    icon: DollarSign,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
  },
  {
    id: 'atividades',
    label: 'Atividades',
    desc: 'Quantidade de atividades concluídas',
    icon: Activity,
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/30',
  },
  {
    id: 'reunioes_marcadas',
    label: 'Reuniões Marcadas',
    desc: 'Quantidade de reuniões marcadas no período',
    icon: Calendar,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    border: 'border-cyan-200 dark:border-cyan-500/30',
  },
  {
    id: 'reunioes_realizadas',
    label: 'Reuniões Realizadas',
    desc: 'Quantidade de reuniões realizadas no período',
    icon: Video,
    color: 'text-teal-500',
    bg: 'bg-teal-50 dark:bg-teal-500/10',
    border: 'border-teal-200 dark:border-teal-500/30',
  },
  {
    id: 'taxa_conversao',
    label: 'Taxa de Conversão',
    desc: 'Reuniões realizadas ÷ Fechamentos do mês',
    icon: Percent,
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/30',
  },
];

const PERIODOS = [
  { id: 'semanal', label: 'Semanal' },
  { id: 'mensal', label: 'Mensal' },
  { id: 'trimestral', label: 'Trimestral' },
  { id: 'anual', label: 'Anual' },
  { id: 'personalizado', label: 'Personalizado' },
];

const ACTIVITY_TYPES = [
  { id: 'Ligação', label: 'Ligação' },
  { id: 'WhatsApp', label: 'WhatsApp' },
  { id: 'Tarefa', label: 'Tarefa' },
  { id: 'Reunião', label: 'Reunião' },
];

const formatValue = (tipo: string, metrica: string, value: number) => {
  if (tipo === 'taxa_conversao') {
    return `${Number(value || 0).toFixed(1)}%`;
  }
  if (tipo === 'receita' || metrica === 'valor') {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
  }
  return String(Math.round(Number(value || 0)));
};

const getProgressColor = (pct: number) => {
  if (pct >= 100) return '#10b981';
  if (pct >= 60)  return '#f59e0b';
  if (pct >= 30)  return '#8b5cf6';
  return '#ef4444';
};

const getStatusLabel = (pct: number) => {
  if (pct >= 100) return { label: 'Concluída', icon: CheckCircle2, color: 'text-emerald-500' };
  if (pct >= 60)  return { label: 'Em andamento', icon: Clock, color: 'text-amber-500' };
  return { label: 'Em andamento', icon: TrendingUp, color: 'text-violet-500' };
};

// ============================================================
// CIRCULAR PROGRESS COMPONENT (Motion.dev style)
// ============================================================
const CIRCLE_SIZE = 90;
const STROKE_WIDTH = 10;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CircularProgress: React.FC<{ percentage: number; color: string }> = ({ percentage, color }) => {
  const progress = useMotionValue(0);
  const displayPct = useTransform(progress, (v) => Math.round(v));
  const dashOffset = useTransform(progress, (v) => {
    const clamped = Math.min(v, 100);
    return CIRCUMFERENCE - (clamped / 100) * CIRCUMFERENCE;
  });
  const blurFilter = useTransform(progress, (v) => {
    const clamped = Math.min(v, percentage);
    const ratio = percentage > 0 ? clamped / percentage : 1;
    const blur = 8 * (1 - ratio);
    return `blur(${blur}px)`;
  });
  const textOpacity = useTransform(progress, (v) => {
    const clamped = Math.min(v, percentage);
    const ratio = percentage > 0 ? clamped / percentage : 1;
    return 0.3 + 0.7 * ratio;
  });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const clamped = Math.min(percentage, 100);
    const controls = animate(progress, clamped, {
      duration: 2.5,
      ease: [0.16, 1, 0.3, 1],
    });

    const unsubscribe = displayPct.on('change', (v) => setDisplayValue(v));

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [percentage]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}>
      <svg
        width={CIRCLE_SIZE}
        height={CIRCLE_SIZE}
        viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}
        className="transform -rotate-90"
      >
        {/* Track */}
        <circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          className="text-slate-200 dark:text-white/[0.06]"
          strokeWidth={STROKE_WIDTH}
        />
        {/* Progress arc */}
        <motion.circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          style={{ strokeDashoffset: dashOffset }}
        />
      </svg>
      {/* Center label — blur to sharp */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ filter: blurFilter, opacity: textOpacity }}
      >
        <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
          {displayValue}%
        </span>
      </motion.div>
    </div>
  );
};

// ============================================================
// ANIMATED RATE (blur-to-sharp count-up, no circle)
// ============================================================
const AnimatedRate: React.FC<{ value: number; color: string }> = ({ value, color }) => {
  const progress = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState('0.0');
  const blurFilter = useTransform(progress, (v) => {
    const ratio = value > 0 ? Math.min(v / value, 1) : 1;
    return `blur(${8 * (1 - ratio)}px)`;
  });
  const textOpacity = useTransform(progress, (v) => {
    const ratio = value > 0 ? Math.min(v / value, 1) : 1;
    return 0.3 + 0.7 * ratio;
  });

  useEffect(() => {
    const controls = animate(progress, value, {
      duration: 2.5,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsubscribe = progress.on('change', (v) => setDisplayValue(v.toFixed(1)));
    return () => { controls.stop(); unsubscribe(); };
  }, [value]);

  return (
    <motion.div
      className="flex items-center justify-center"
      style={{ filter: blurFilter, opacity: textOpacity, height: CIRCLE_SIZE }}
    >
      <span className="text-4xl font-black tabular-nums" style={{ color }}>
        {displayValue}%
      </span>
    </motion.div>
  );
};

// COMPONENTE POPUP
// ============================================================
interface MetasPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const MetasPopup: React.FC<MetasPopupProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [metas, setMetas]         = useState<Meta[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kanbans, setKanbans]     = useState<Kanban[]>([]);
  const [users, setUsers]         = useState<User[]>([]);
  const [columns, setColumns]     = useState<{ id: string; title: string; color: string }[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  const [step, setStep]           = useState(1);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    tipo: '',
    nome: '',
    metrica: 'quantidade',
    periodo: 'mensal',
    alvo: '10',
    kanban_id: '',
    coluna_id: '',
    activity_type: '',
    responsavel_id: '',
    data_inicio: '',
    data_fim: '',
  });

  const fetchMetas = useCallback(async (silent = false) => {
    if (!user?.email) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch(`/api/crm-metas`);
      if (res.ok) setMetas(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const fetchAuxData = useCallback(async () => {
    if (!user?.email) return;
    const [k, u] = await Promise.all([
      fetch(`/api/crm-comercial/kanbans?user_id=${user.email}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/users`).then(r => r.ok ? r.json() : []),
    ]);
    setKanbans(k);
    setUsers(u);
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchMetas();
      fetchAuxData();
    }
  }, [isOpen, fetchMetas, fetchAuxData]);

  // Carrega colunas do pipeline quando kanban muda
  useEffect(() => {
    if (form.tipo !== 'negocios_andamento' || !form.kanban_id) {
      setColumns([]);
      return;
    }
    fetch(`/api/crm-comercial/columns?kanban_id=${form.kanban_id}`)
      .then(r => r.ok ? r.json() : [])
      .then((cols: any[]) => {
        setColumns(cols.filter(c =>
          !c.title.toLowerCase().includes('ganho') &&
          !c.title.toLowerCase().includes('fechado') &&
          !c.title.toLowerCase().includes('perd') &&
          !c.title.toLowerCase().includes('lost')
        ));
      })
      .catch(() => setColumns([]));
  }, [form.kanban_id, form.tipo]);

  const openModal = () => {
    setForm({ tipo: '', nome: '', metrica: 'quantidade', periodo: 'mensal', alvo: '10', kanban_id: '', coluna_id: '', activity_type: '', responsavel_id: '', data_inicio: '', data_fim: '' });
    setEditingMeta(null);
    setStep(1);
    setSaveError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user?.email || !form.tipo || !form.nome.trim()) return;
    setSaveError(null);
    setSaving(true);
    try {
      const url = editingMeta ? `/api/crm-metas/${editingMeta.id}` : '/api/crm-metas';
      const method = editingMeta ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, user_id: user.email, alvo: Number(form.alvo) }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowModal(false);
        setEditingMeta(null);
        fetchMetas();
      } else {
        setSaveError(data.details || data.error || 'Erro ao salvar meta.');
      }
    } catch { setSaveError('Erro de conexão.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setMetas(prev => prev.filter(m => m.id !== id));
    await fetch(`/api/crm-metas/${id}`, { method: 'DELETE' });
  };

  const openEdit = (meta: Meta) => {
    setForm({
      tipo: meta.tipo,
      nome: meta.nome,
      metrica: meta.metrica,
      periodo: meta.periodo,
      alvo: String(meta.alvo),
      kanban_id: meta.kanban_id || '',
      coluna_id: '',
      activity_type: '',
      responsavel_id: meta.responsavel_id || '',
      data_inicio: meta.data_inicio ? meta.data_inicio.split('T')[0] : '',
      data_fim: meta.data_fim ? meta.data_fim.split('T')[0] : '',
    });
    setEditingMeta(meta);
    setStep(2);
    setSaveError(null);
    setShowModal(true);
  };

  const selectedTipo = TIPOS_META.find(t => t.id === form.tipo);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
          {/* Backdrop */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* Popup panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-4xl max-h-[85vh] bg-white dark:bg-[#13111d] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/[0.06] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-violet-500/10">
                  <Target size={20} className="text-violet-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Metas</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Acompanhe o progresso das suas metas de vendas</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchMetas(true)}
                  disabled={refreshing}
                  className="p-2 border border-slate-200 dark:border-white/10 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  title="Atualizar progresso"
                >
                  <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={openModal}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  <Plus size={15} />
                  Nova Meta
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                  <p className="text-sm text-slate-400">Carregando metas...</p>
                </div>
              ) : metas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
                  <Target size={48} className="opacity-20" />
                  <p className="font-medium">Nenhuma meta cadastrada ainda.</p>
                  <button
                    onClick={openModal}
                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Criar primeira meta
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {metas.map(meta => {
                    const tipoConfig = TIPOS_META.find(t => t.id === meta.tipo);
                    const Icon = tipoConfig?.icon || BarChart3;
                    const status = getStatusLabel(meta.percentual);
                    const StatusIcon = status.icon;
                    const barColor = getProgressColor(meta.percentual);
                    const periodoLabel = PERIODOS.find(p => p.id === meta.periodo)?.label || meta.periodo;

                    return (
                      <motion.div
                        key={meta.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 rounded-2xl p-5 flex flex-col hover:shadow-lg hover:border-violet-500/20 transition-all group"
                      >
                        {/* Header do card — altura fixa */}
                        <div className="flex items-start justify-between min-h-[52px]">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-xl shrink-0 ${tipoConfig?.bg || 'bg-slate-100 dark:bg-white/5'}`}>
                              <Icon size={18} className={tipoConfig?.color || 'text-slate-500'} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{meta.nome}</p>
                              <p className="text-xs text-slate-400 truncate">{tipoConfig?.label} | {periodoLabel}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => openEdit(meta)}
                              className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-violet-500 transition-colors rounded-lg"
                              title="Editar meta"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(meta.id)}
                              className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors rounded-lg"
                              title="Excluir meta"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {meta.tipo === 'taxa_conversao' ? (
                          /* Taxa de Conversão — animated percentage, same height as circle */
                          (() => {
                            const rateColor = Number(meta.valor_atual || 0) >= meta.alvo ? '#10b981' : '#f59e0b';
                            return (
                              <>
                                <div className="flex items-center justify-center py-4">
                                  <AnimatedRate value={Number(meta.valor_atual || 0)} color={rateColor} />
                                </div>
                                <div className="mt-auto pt-4 flex items-baseline justify-between gap-2">
                                  <span className="text-xs text-slate-400">Taxa de conversão</span>
                                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                                    Meta: {formatValue(meta.tipo, meta.metrica, meta.alvo)}
                                  </span>
                                </div>
                              </>
                            );
                          })()
                        ) : (
                          <>
                            {/* Circular progress ring — centro do card */}
                            <div className="flex items-center justify-center py-4">
                              <CircularProgress percentage={meta.percentual} color={barColor} />
                            </div>

                            {/* Valores — empurrados para baixo */}
                            <div className="mt-auto pt-4 flex items-baseline justify-between gap-2">
                              <span className="text-2xl font-black text-slate-900 dark:text-white leading-none truncate">
                                {formatValue(meta.tipo, meta.metrica, meta.valor_atual)}
                              </span>
                              <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                                de {formatValue(meta.tipo, meta.metrica, meta.alvo)}
                              </span>
                            </div>
                          </>
                        )}

                        {/* Status */}
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-white/[0.04]">
                          <div className={`flex items-center gap-1.5 text-xs ${status.color}`}>
                            <StatusIcon size={12} />
                            {status.label}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* ================================================================ */}
          {/* WIZARD MODAL — 2 passos (renderizado sobre o popup)              */}
          {/* ================================================================ */}
          {showModal && (
            <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
              <div className="absolute inset-0" onClick={() => setShowModal(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-lg bg-white dark:bg-[#1C1F26] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
              >
                {/* Barra de progresso do wizard */}
                <div className="h-1 bg-slate-100 dark:bg-white/5">
                  <div
                    className="h-full bg-violet-500 transition-all duration-300"
                    style={{ width: step === 1 ? '50%' : '100%' }}
                  />
                </div>

                {/* Header do modal */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingMeta ? 'Editar Meta' : 'Nova Meta'}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{editingMeta ? 'Atualize os dados da meta' : `Passo ${step} de 2`}</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {/* PASSO 1: selecionar tipo */}
                {step === 1 && (
                  <div className="px-6 pb-6">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">
                      Que tipo de meta você quer acompanhar?
                    </p>
                    <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
                      {TIPOS_META.map(tipo => {
                        const TIcon = tipo.icon;
                        const selected = form.tipo === tipo.id;
                        return (
                          <button
                            key={tipo.id}
                            onClick={() => setForm(f => ({ ...f, tipo: tipo.id, nome: tipo.label }))}
                            className={`
                              w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all
                              ${selected
                                ? `${tipo.bg} ${tipo.border} ring-2 ring-current ${tipo.color}`
                                : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'}
                            `}
                          >
                            <div className={`p-2 rounded-lg ${selected ? tipo.bg : 'bg-slate-100 dark:bg-white/10'}`}>
                              <TIcon size={18} className={selected ? tipo.color : 'text-slate-400'} />
                            </div>
                            <div>
                              <p className={`font-semibold text-sm ${selected ? tipo.color : 'text-slate-700 dark:text-slate-200'}`}>{tipo.label}</p>
                              <p className="text-xs text-slate-400">{tipo.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex justify-end pt-5">
                      <button
                        onClick={() => { if (form.tipo) setStep(2); }}
                        disabled={!form.tipo}
                        className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
                      >
                        Próximo <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* PASSO 2: configurar meta */}
                {step === 2 && (
                  <div className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {saveError && (
                      <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400">
                        <AlertCircle size={15} className="shrink-0" />
                        {saveError}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Nome da meta</label>
                      <input
                        type="text"
                        value={form.nome}
                        onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
                        placeholder={selectedTipo?.label}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {form.tipo !== 'atividades' && form.tipo !== 'receita' && form.tipo !== 'reunioes_marcadas' && form.tipo !== 'reunioes_realizadas' && form.tipo !== 'taxa_conversao' && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Métrica</label>
                          <select
                            value={form.metrica}
                            onChange={e => setForm(f => ({ ...f, metrica: e.target.value }))}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                          >
                            <option value="quantidade">Quantidade</option>
                            {form.tipo !== 'negocios_andamento' && <option value="valor">Valor (R$)</option>}
                          </select>
                        </div>
                      )}
                      <div className={form.tipo === 'atividades' || form.tipo === 'receita' || form.tipo === 'reunioes_marcadas' || form.tipo === 'reunioes_realizadas' || form.tipo === 'taxa_conversao' ? 'col-span-2' : ''}>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Período</label>
                        <select
                          value={form.periodo}
                          onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                        >
                          {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                        {form.tipo === 'taxa_conversao' ? 'Taxa alvo (%)' : (form.tipo === 'receita' || form.metrica === 'valor') ? 'Valor alvo (R$)' : 'Quantidade alvo'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.alvo}
                        onChange={e => setForm(f => ({ ...f, alvo: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                      />
                    </div>

                    {kanbans.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Pipeline (opcional)</label>
                        <select
                          value={form.kanban_id}
                          onChange={e => setForm(f => ({ ...f, kanban_id: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                        >
                          <option value="">Todos os pipelines</option>
                          {kanbans.map(k => <option key={k.id} value={k.id}>{k.nome}</option>)}
                        </select>
                      </div>
                    )}

                    {form.tipo === 'negocios_andamento' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Etapa alvo</label>
                        <select
                          value={form.coluna_id}
                          onChange={e => setForm(f => ({ ...f, coluna_id: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                          disabled={!form.kanban_id}
                        >
                          <option value="">Qualquer etapa</option>
                          {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        {!form.kanban_id && (
                          <p className="text-xs text-slate-400 mt-1">Selecione um pipeline para filtrar por etapa</p>
                        )}
                      </div>
                    )}

                    {form.tipo === 'atividades' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Tipo de atividade (opcional)</label>
                        <select
                          value={form.activity_type}
                          onChange={e => setForm(f => ({ ...f, activity_type: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                        >
                          <option value="">Todos os tipos</option>
                          {ACTIVITY_TYPES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                        </select>
                      </div>
                    )}

                    {users.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Responsável (opcional)</label>
                        <select
                          value={form.responsavel_id}
                          onChange={e => setForm(f => ({ ...f, responsavel_id: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                        >
                          <option value="">Todos os usuários</option>
                          {users.map(u => <option key={u.id} value={u.email}>{u.name}</option>)}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Data início (opcional)</label>
                        <input
                          type="date"
                          value={form.data_inicio}
                          onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Data fim (opcional)</label>
                        <input
                          type="date"
                          value={form.data_fim}
                          onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/40"
                        />
                      </div>
                    </div>

                    {/* Footer do passo 2 */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setStep(1)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <ChevronLeft size={16} /> Voltar
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving || !form.nome.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
                      >
                        {saving ? (
                          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {editingMeta ? 'Salvando...' : 'Criando...'}</>
                        ) : editingMeta ? 'Salvar Alterações' : 'Criar Meta'}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
};

export default MetasPopup;
