import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Trophy, TrendingUp, TrendingDown, DollarSign,
  Activity, Target, CheckCircle2, Clock, AlertCircle, X,
  ChevronRight, ChevronLeft, BarChart3, RefreshCw, Pencil
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

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
];

const PERIODOS = [
  { id: 'semanal', label: 'Semanal' },
  { id: 'mensal', label: 'Mensal' },
  { id: 'trimestral', label: 'Trimestral' },
  { id: 'anual', label: 'Anual' },
  { id: 'personalizado', label: 'Personalizado' },
];

const formatValue = (tipo: string, metrica: string, value: number) => {
  if (tipo === 'receita' || metrica === 'valor') {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
  }
  return String(Math.round(value));
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
// COMPONENTE PRINCIPAL
// ============================================================
export default function CrmMetas() {
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

  const ACTIVITY_TYPES = [
    { id: 'Ligação', label: 'Ligação' },
    { id: 'WhatsApp', label: 'WhatsApp' },
    { id: 'Tarefa', label: 'Tarefa' },
    { id: 'Reunião', label: 'Reunião' },
  ];

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
      const res = await fetch(`/api/crm-metas?user_id=${user.email}`);
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

  useEffect(() => { fetchMetas(); fetchAuxData(); }, [fetchMetas, fetchAuxData]);

  // Carrega colunas do pipeline quando kanban muda (só para negocios_andamento)
  useEffect(() => {
    if (form.tipo !== 'negocios_andamento' || !form.kanban_id) {
      setColumns([]);
      return;
    }
    fetch(`/api/crm-comercial/columns?kanban_id=${form.kanban_id}`)
      .then(r => r.ok ? r.json() : [])
      .then((cols: any[]) => {
        // Filtra apenas colunas que são claramente terminais pelo TÍTULO.
        // NÃO filtra por cor, pois colunas como "Reunião Marcada" usam
        // verde como cor de exibição mas não são terminais.
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-light-bg dark:bg-dark-bg text-slate-900 dark:text-slate-100 p-8 font-sans overflow-y-auto w-full">
      
      {/* HEADER */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target size={22} className="text-violet-500" />
            Metas
          </h1>
          <p className="text-sm text-slate-500 mt-1">Acompanhe o progresso das suas metas de vendas</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchMetas(true)}
            disabled={refreshing}
            className="p-2 border border-slate-200 dark:border-white/10 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            title="Atualizar progresso"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openModal}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Nova Meta
          </button>
        </div>
      </div>

      {/* CARDS GRID */}
      {metas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {metas.map(meta => {
            const tipoConfig = TIPOS_META.find(t => t.id === meta.tipo);
            const Icon = tipoConfig?.icon || BarChart3;
            const status = getStatusLabel(meta.percentual);
            const StatusIcon = status.icon;
            const barColor = getProgressColor(meta.percentual);
            const periodoLabel = PERIODOS.find(p => p.id === meta.periodo)?.label || meta.periodo;

            return (
              <div
                key={meta.id}
                className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
              >
                {/* Header do card */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${tipoConfig?.bg || 'bg-slate-100 dark:bg-white/5'}`}>
                      <Icon size={18} className={tipoConfig?.color || 'text-slate-500'} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{meta.nome}</p>
                      <p className="text-xs text-slate-400">{tipoConfig?.label} | {periodoLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
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

                {/* Valor atual */}
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-black">
                    {formatValue(meta.tipo, meta.metrica, meta.valor_atual)}
                  </span>
                  <span className="text-sm text-slate-400">
                    de {formatValue(meta.tipo, meta.metrica, meta.alvo)}
                  </span>
                </div>

                {/* Barra de progresso */}
                <div className="space-y-2">
                  <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${meta.percentual}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-1 text-xs ${status.color}`}>
                      <StatusIcon size={12} />
                      {status.label}
                    </div>
                    <span className="text-xs font-bold" style={{ color: barColor }}>
                      {meta.percentual}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL — 2 passos                                                  */}
      {/* ================================================================ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#1C1F26] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
            
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
                <h2 className="text-lg font-bold">{editingMeta ? 'Editar Meta' : 'Nova Meta'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editingMeta ? 'Atualize os dados da meta' : `Passo ${step} de 2`}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* ---- PASSO 1: selecionar tipo ---- */}
            {step === 1 && (
              <div className="px-6 pb-6">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">
                  Que tipo de meta você quer acompanhar?
                </p>
                <div className="space-y-2.5">
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
                          <p className={`font-semibold text-sm ${selected ? tipo.color : ''}`}>{tipo.label}</p>
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

            {/* ---- PASSO 2: configurar meta ---- */}
            {step === 2 && (
              <div className="px-6 pb-6 space-y-4">
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
                    placeholder={selectedTipo?.label}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Métrica — oculta para atividades e receita (que é sempre valor R$) */}
                  {form.tipo !== 'atividades' && form.tipo !== 'receita' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Métrica</label>
                      <select
                        value={form.metrica}
                        onChange={e => setForm(f => ({ ...f, metrica: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                      >
                        <option value="quantidade">Quantidade</option>
                        {form.tipo !== 'negocios_andamento' && <option value="valor">Valor (R$)</option>}
                      </select>
                    </div>
                  )}
                  <div className={form.tipo === 'atividades' || form.tipo === 'receita' ? 'col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Período</label>
                    <select
                      value={form.periodo}
                      onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                    >
                      {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                    {(form.tipo === 'receita' || form.metrica === 'valor') ? 'Valor alvo (R$)' : 'Quantidade alvo'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.alvo}
                    onChange={e => setForm(f => ({ ...f, alvo: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                </div>

                {kanbans.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Pipeline (opcional)</label>
                    <select
                      value={form.kanban_id}
                      onChange={e => setForm(f => ({ ...f, kanban_id: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                    >
                      <option value="">Todos os pipelines</option>
                      {kanbans.map(k => <option key={k.id} value={k.id}>{k.nome}</option>)}
                    </select>
                  </div>
                )}

                {/* Etapa alvo — apenas para Negócios em Andamento */}
                {form.tipo === 'negocios_andamento' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Etapa alvo</label>
                    <select
                      value={form.coluna_id}
                      onChange={e => setForm(f => ({ ...f, coluna_id: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
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

                {/* Tipo de atividade — apenas para Atividades */}
                {form.tipo === 'atividades' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Tipo de atividade (opcional)</label>
                    <select
                      value={form.activity_type}
                      onChange={e => setForm(f => ({ ...f, activity_type: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
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
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
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
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Data fim (opcional)</label>
                    <input
                      type="date"
                      value={form.data_fim}
                      onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40"
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
          </div>
        </div>
      )}
    </div>
  );
}
