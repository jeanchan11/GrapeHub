import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SplitHeadline from '../components/SplitHeadline';
import ListaTaskDetailModal from '../components/ListaTaskDetailModal';
import RichTextEditor from '../components/RichTextEditor';
import { confirmDialog } from '@/src/lib/confirm';
import { Plus, Tag, Loader2, X, Trash2, Settings, Check, Layers, Pencil, TrendingUp, Search, ChevronDown, ChevronRight, Calendar, Users, MoreHorizontal, Circle, CheckCircle2, GripVertical, Edit2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { QuadroPostagens, CalendarioPostagens, NovaPostagemModal, PERFIS, diaDe, hojeISO, eFinal, nomeEtapa } from '../components/PostagensUI';

// ── Types ─────────────────────────────────────────────────
export interface ColoredTag {
  id: string;
  name: string;
  color: string;
}

const TAG_COLORS = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#64748b',
  '#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f472b6',
];

const loadColoredTags = (pageId: string): ColoredTag[] => {
  try { const r = localStorage.getItem(`grapehub_ctags_${pageId}`); return r ? JSON.parse(r) : []; } catch { return []; }
};
const saveColoredTags = (pageId: string, tags: ColoredTag[]) =>
  localStorage.setItem(`grapehub_ctags_${pageId}`, JSON.stringify(tags));

const uid = () => Math.random().toString(36).substr(2, 9);

const isCompletedGroup = (groupId: string, label: string = '') => {
  const idLower = (groupId || '').toLowerCase();
  const labelLower = (label || '').toLowerCase();
  return idLower.includes('concluido') || idLower.includes('postado') || labelLower.includes('concluido') || labelLower.includes('concluído') || labelLower.includes('postado');
};

interface Task {
  id: number;
  client_name: string;
  status_group: string;
  created_at: string;
  subtask_count: number;
  order_index?: number;
  tags?: string[];
  due_date?: string | null;
  produto?: string | null;     // perfil (Jean | Grape)
  entregavel?: string | null;  // formato (Reels | Carrossel | Foto | Story)
  description?: string;
}

interface Subtask {
  id: number;
  task_id: number;
  title: string;
  completed: boolean;
  order_index: number;
}

interface StatusGroupDef {
  id: string;
  page_id: string;
  label: string;
  color: string;
  emoji: string;
  order_index: number;
}

interface StatusGroup extends StatusGroupDef {
  tasks: Task[];
}

interface TagsManagerModalProps {
  tags: ColoredTag[];
  onChange: (tags: ColoredTag[]) => void;
  onClose: () => void;
}

const TagsManagerModal: React.FC<TagsManagerModalProps> = ({ tags, onChange, onClose }) => {
  const [newName, setNewName]   = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const add = () => {
    const v = newName.trim();
    if (!v) return;
    if (tags.some(t => t.name.toLowerCase() === v.toLowerCase())) return;
    onChange([...tags, { id: uid(), name: v, color: newColor }]);
    setNewName('');
  };

  const remove = (id: string) => onChange(tags.filter(t => t.id !== id));

  const startEdit = (t: ColoredTag) => { setEditId(t.id); setEditName(t.name); setEditColor(t.color); };

  const saveEdit = () => {
    const v = editName.trim();
    if (!v || !editId) return;
    onChange(tags.map(t => t.id === editId ? { ...t, name: v, color: editColor } : t));
    setEditId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-dark-bg rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-dark-text">Gerenciar <span className="text-violet-500">Tags</span></h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/10 transition-all"><X size={16} /></button>
        </div>

        {/* Create new tag */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest block">Nova Tag</label>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Nome da tag..."
            className="w-full bg-dark-card border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
          />
          <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full transition-all ${newColor === c ? 'ring-2 ring-offset-2 ring-offset-dark-bg ring-white scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={add}
            disabled={!newName.trim()}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-xs font-bold text-white transition-all"
          >
            <Plus size={13} /> Criar Tag
          </button>
        </div>

        {/* Tag list */}
        {tags.length > 0 && (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest block mb-2">Tags Existentes</label>
            {tags.map(t => (
              <div key={t.id}>
                {editId === t.id ? (
                  <div className="flex flex-col gap-2 p-2 bg-dark-card rounded-xl border border-violet-500/30">
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      className="bg-transparent border-b border-black/10 dark:border-white/20 text-sm text-dark-text focus:outline-none py-0.5"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {TAG_COLORS.map(c => (
                        <button
                          key={c} onClick={() => setEditColor(c)}
                          className={`w-5 h-5 rounded-full transition-all ${editColor === c ? 'ring-2 ring-offset-2 ring-offset-dark-card ring-white scale-110' : 'hover:scale-110'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={saveEdit} className="flex-1 py-1 rounded bg-violet-600 hover:bg-violet-500 text-[10px] font-bold text-white uppercase tracking-wider">Salvar</button>
                      <button onClick={() => setEditId(null)} className="flex-1 py-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 text-[10px] font-bold text-dark-text uppercase tracking-wider">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 group/tagrow">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="text-xs text-dark-text truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/tagrow:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(t)} className="p-1 text-slate-500 hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 rounded"><Edit2 size={11} /></button>
                      <button onClick={() => remove(t.id)} className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded"><Trash2 size={11} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────
export default function ListaPage({ activePage, pageLabel }: { activePage: string; pageLabel?: string }) {
  const pageId = activePage;
  const defaultHeadline = pageLabel || 'Minha Lista';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusGroups, setStatusGroups] = useState<StatusGroupDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [addingNewGroup, setAddingNewGroup] = useState(false);
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const newGroupRef = useRef<HTMLInputElement>(null);

  // Headline editing
  const [headline, setHeadline] = useState(defaultHeadline);
  const [subtitle, setSubtitle] = useState('GESTÃO DE TAREFAS');
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [editHeadlineVal, setEditHeadlineVal] = useState('');

  const [showCompleted, setShowCompleted] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [coloredTagDefs, setColoredTagDefs] = useState<ColoredTag[]>(() => loadColoredTags(activePage));
  const [tagsModal, setTagsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tarefas'>('overview');

  // Rich Text Notes (Esquerda e Direita)
  const [notesHtml, setNotesHtml] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [originalNotesHtml, setOriginalNotesHtml] = useState('');

  const [notesHtmlRight, setNotesHtmlRight] = useState('');
  const [notesDirtyRight, setNotesDirtyRight] = useState(false);
  const [notesSavingRight, setNotesSavingRight] = useState(false);
  const [originalNotesHtmlRight, setOriginalNotesHtmlRight] = useState('');

  const saveNotes = async (leftVal: string, rightVal: string) => {
    const isLeftDirty = leftVal !== originalNotesHtml;
    const isRightDirty = rightVal !== originalNotesHtmlRight;
    if (isLeftDirty) setNotesSaving(true);
    if (isRightDirty) setNotesSavingRight(true);

    try {
      await fetch(`/api/lista-page-settings/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline,
          subtitle,
          notes_html: leftVal,
          notes_html_right: rightVal
        }),
      });
      if (isLeftDirty) {
        setOriginalNotesHtml(leftVal);
        setNotesDirty(false);
      }
      if (isRightDirty) {
        setOriginalNotesHtmlRight(rightVal);
        setNotesDirtyRight(false);
      }
    } catch { /* silent */ } finally {
      setNotesSaving(false);
      setNotesSavingRight(false);
    }
  };

  useEffect(() => {
    setColoredTagDefs(loadColoredTags(pageId));
    setNotesHtml('');
    setOriginalNotesHtml('');
    setNotesDirty(false);
    setNotesHtmlRight('');
    setOriginalNotesHtmlRight('');
    setNotesDirtyRight(false);
  }, [pageId]);

  useEffect(() => {
    if (!notesDirty && !notesDirtyRight) return;
    const timeoutId = setTimeout(() => {
      saveNotes(notesHtml, notesHtmlRight);
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, [notesHtml, notesDirty, notesHtmlRight, notesDirtyRight]);

  const isFirstLoad = useRef(true);

  // ── Fetch ──
  const fetchData = async (silent = false) => {
    const showSpinner = isFirstLoad.current && !silent;
    try {
      if (showSpinner) setLoading(true);
      const [resTasks, resGroups, resSettings] = await Promise.all([
        fetch(`/api/onboarding-tasks?type=lista-${pageId}`),
        fetch(`/api/lista-status-groups?page_id=${pageId}`),
        fetch(`/api/lista-page-settings/${pageId}`),
      ]);
      if (resTasks.ok) setTasks(await resTasks.json());
      if (resGroups.ok) {
        const groups = await resGroups.json();
        if (groups.length > 0) {
          setStatusGroups(groups);
        } else if (isFirstLoad.current) {
          // Create default groups on first load
          const defaults = [
            { id: 'a-fazer', label: 'A FAZER', color: '#64748b', emoji: '⬜', order_index: 0 },
            { id: 'em-andamento', label: 'EM ANDAMENTO', color: '#f59e0b', emoji: '🟡', order_index: 1 },
            { id: 'concluido', label: 'CONCLUÍDO', color: '#10b981', emoji: '✅', order_index: 2 },
          ];
          for (const g of defaults) {
            await fetch('/api/lista-status-groups', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...g, page_id: pageId }),
            });
          }
          setStatusGroups(defaults.map(g => ({ ...g, page_id: pageId })));
        }
      }
      if (resSettings.ok) {
        const settings = await resSettings.json();
        setHeadline(settings.headline || defaultHeadline);
        setSubtitle(settings.subtitle || 'GESTÃO DE TAREFAS');
        setNotesHtml(settings.notes_html || '');
        setOriginalNotesHtml(settings.notes_html || '');
        setNotesDirty(false);
        setNotesHtmlRight(settings.notes_html_right || '');
        setOriginalNotesHtmlRight(settings.notes_html_right || '');
        setNotesDirtyRight(false);
      }
      isFirstLoad.current = false;
    } catch { /* silent */ } finally { if (showSpinner) setLoading(false); }
  };

  useEffect(() => { isFirstLoad.current = true; fetchData(); }, [pageId]);

  // ── Headline save ──
  const saveHeadline = async (newHeadline: string) => {
    setHeadline(newHeadline);
    setEditingHeadline(false);
    try {
      await fetch(`/api/lista-page-settings/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: newHeadline,
          subtitle,
          notes_html: notesHtml,
          notes_html_right: notesHtmlRight
        }),
      });
    } catch { /* silent */ }
  };

  // ── Status Group CRUD ──
  const handleAddGroup = async () => {
    const label = newGroupLabel.trim().toUpperCase();
    if (!label) { setAddingNewGroup(false); return; }
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    try {
      const res = await fetch('/api/lista-status-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, page_id: pageId, label, color: '#7c3aed', emoji: '🔵', order_index: statusGroups.length }),
      });
      if (res.ok) {
        const created = await res.json();
        setStatusGroups(prev => [...prev, created]);
      }
    } catch { /* silent */ }
    setAddingNewGroup(false);
    setNewGroupLabel('');
  };

  const handleRenameGroup = async (id: string, label: string) => {
    setStatusGroups(prev => prev.map(g => g.id === id ? { ...g, label } : g));
    try {
      await fetch(`/api/lista-status-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, page_id: pageId }),
      });
    } catch { /* silent */ }
  };

  const handleUpdateGroup = async (id: string, fields: { color?: string; emoji?: string }) => {
    setStatusGroups(prev => prev.map(g => g.id === id ? { ...g, ...fields } : g));
    try {
      await fetch(`/api/lista-status-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, page_id: pageId }),
      });
    } catch { /* silent */ }
  };

  const handleDeleteGroup = async (id: string) => {
    setStatusGroups(prev => prev.filter(g => g.id !== id));
    try {
      await fetch(`/api/lista-status-groups/${id}?page_id=${pageId}`, { method: 'DELETE' });
      fetchData(true);
    } catch { /* silent */ }
  };

  const handleDeleteTask = async (taskId: number) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await fetch(`/api/onboarding-tasks/${taskId}`, { method: 'DELETE' });
    } catch { /* silent */ }
  };

  // ── Postagem: mover de etapa e trocar perfil/formato (otimista + PATCH) ──
  const patchTask = async (id: number, campos: Record<string, any>) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...campos } : t)));
    try {
      const r = await fetch(`/api/onboarding-tasks/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campos),
      });
      if (!r.ok) throw new Error();
    } catch {
      fetchData(true);
    }
  };

  // Título em duas cores (última palavra destacada)
  const headlineWords = headline.split(' ');
  const lastWord = headlineWords.pop() || '';
  const firstPart = headlineWords.join(' ') + (headlineWords.length > 0 ? ' ' : '');

  // Etapas em ordem (o quadro vai da primeira à última, da esquerda para a direita)
  const etapas = [...statusGroups].sort((a, b) => a.order_index - b.order_index);
  const [aba, setAba] = [activeTab, setActiveTab];
  const [perfilFiltro, setPerfilFiltro] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [novaEm, setNovaEm] = useState<{ etapa?: string; dia?: string } | null>(null);
  const [etapasModal, setEtapasModal] = useState(false);

  const filtradas = tasks.filter(t =>
    (perfilFiltro === 'todos' || (perfilFiltro === 'sem' ? !t.produto : t.produto === perfilFiltro)) &&
    (!busca.trim() || t.client_name.toLowerCase().includes(busca.trim().toLowerCase())));

  // Números da visão geral
  const hoje = hojeISO();
  const em7 = (() => { const d = new Date(); d.setDate(d.getDate() + 6); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const finais = new Set(etapas.filter(eFinal).map(e => e.id));
  const pendentes = tasks.filter(t => !finais.has(t.status_group));
  const semana = pendentes.filter(t => { const d = diaDe(t as any); return !!d && d >= hoje && d <= em7; });
  const atrasadas = pendentes.filter(t => { const d = diaDe(t as any); return !!d && d < hoje; });
  const postadasMes = tasks.filter(t => finais.has(t.status_group) && (diaDe(t as any) || '').startsWith(hoje.slice(0, 7)));
  const semData = pendentes.filter(t => !t.due_date);
  const porPerfil = (lista: Task[]) => PERFIS.map(p => `${lista.filter(t => t.produto === p.id).length} ${p.id}`).join(' · ');
  const proximas = pendentes.filter(t => { const d = diaDe(t as any); return !!d && d >= hoje; })
    .sort((a, b) => (diaDe(a as any) || '').localeCompare(diaDe(b as any) || '')).slice(0, 6);

  const card = 'rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02]';
  const Kpi = ({ rotulo, valor, sub, alerta }: { rotulo: string; valor: number; sub: string; alerta?: boolean }) => (
    <div className={`px-5 py-4 rounded-2xl border ${alerta ? 'bg-rose-500/[0.06] border-rose-500/20' : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/5'}`}>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{rotulo}</p>
      <p className={`text-2xl font-bold mt-1 ${alerta ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>{valor}</p>
      <p className={`text-[11px] mt-0.5 ${alerta ? 'text-rose-400' : 'text-slate-500'}`}>{sub}</p>
    </div>
  );
  const Nota = ({ titulo, cor, html, setHtml, original, setDirty, salvando, sujo }: any) => (
    <div className={`${card} p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full" style={{ background: cor }} />
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{titulo}</p>
        <span className="ml-auto text-[10px] font-semibold">
          {salvando ? <span className="text-violet-500 inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Salvando…</span>
            : sujo ? <span className="text-slate-500">Editado</span> : html ? <span className="text-emerald-500">✓ Salvo</span> : null}
        </span>
      </div>
      <RichTextEditor content={html} minHeight="140px" onChange={(h: string) => { setHtml(h); setDirty(h !== original); }} />
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* ── Cabeçalho ── */}
      <div className="px-8 pt-8 pb-5 flex items-start justify-between gap-4">
        <div className="group/headline">
          {editingHeadline ? (
            <input
              autoFocus value={editHeadlineVal} onChange={e => setEditHeadlineVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveHeadline(editHeadlineVal); if (e.key === 'Escape') setEditingHeadline(false); }}
              onBlur={() => saveHeadline(editHeadlineVal)}
              className="text-2xl font-black tracking-tight text-dark-text bg-transparent border-b-2 border-violet-500 outline-none"
            />
          ) : (
            <div className="flex items-center gap-2">
              <SplitHeadline text={firstPart} highlight={lastWord} className="text-2xl font-black tracking-tight text-dark-text" />
              <button onClick={() => { setEditingHeadline(true); setEditHeadlineVal(headline); }}
                className="opacity-0 group-hover/headline:opacity-100 p-1 text-slate-400 hover:text-violet-400 transition-all"><Pencil size={14} /></button>
            </div>
          )}
          <p className="text-[11px] text-slate-500 mt-0.5">
            {pendentes.length} na produção · {atrasadas.length ? <span className="text-rose-500 font-semibold">{atrasadas.length} atrasada{atrasadas.length > 1 ? 's' : ''}</span> : 'nada atrasado'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTagsModal(true)} className="h-10 px-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-violet-500 hover:bg-violet-500/10 flex items-center gap-1.5">
            <Tag size={14} /> Tags
          </button>
          <button onClick={() => setNovaEm({})} className="h-10 px-4 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 shadow-lg shadow-violet-600/20 flex items-center gap-2">
            <Plus size={16} /> Nova postagem
          </button>
        </div>
      </div>

      {/* ── Abas ── */}
      <div className="px-8 mb-6">
        <div className="flex items-center gap-1 p-1 w-fit rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5">
          {([['overview', 'Visão geral', TrendingUp], ['tarefas', 'Quadro', Layers]] as const).map(([id, rotulo, I]) => (
            <button key={id} onClick={() => setAba(id)}
              className={`h-9 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${aba === id ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
              <I size={14} /> {rotulo}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : aba === 'overview' ? (
        <div className="px-8 pb-12 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi rotulo="Nesta semana" valor={semana.length} sub={semana.length ? porPerfil(semana) : 'nada agendado nos próximos 7 dias'} />
            <Kpi rotulo="Atrasadas" valor={atrasadas.length} sub={atrasadas.length ? 'data passou e não foi postada' : 'nada atrasado'} alerta={atrasadas.length > 0} />
            <Kpi rotulo="Postadas no mês" valor={postadasMes.length} sub={postadasMes.length ? porPerfil(postadasMes) : 'nenhuma ainda'} />
            <Kpi rotulo="Ideias sem data" valor={semData.length} sub={semData.length ? 'na fila, falta agendar' : 'tudo agendado'} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
            <CalendarioPostagens
              postagens={filtradas as any} etapas={etapas}
              onAbrir={(p) => setSelectedTask(tasks.find(t => t.id === p.id) || null)}
              onNovaNoDia={(dia) => setNovaEm({ dia })}
            />
            <div className="space-y-5">
              <div className={`${card} p-5`}>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Produção</p>
                <div className="space-y-1">
                  {etapas.map(e => {
                    const n = tasks.filter(t => t.status_group === e.id).length;
                    const pct = tasks.length ? (n / tasks.length) * 100 : 0;
                    return (
                      <button key={e.id} onClick={() => setAba('tarefas')} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] group">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                          <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">{nomeEtapa(e)}</span>
                          <span className="ml-auto font-bold text-slate-900 dark:text-white">{n}</span>
                        </div>
                        <div className="mt-1 ml-4 h-1 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: e.color }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className={`${card} p-5`}>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Próximas a publicar</p>
                {proximas.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">Nenhuma postagem agendada. Clique num dia do calendário para agendar.</p>
                ) : (
                  <div className="space-y-1">
                    {proximas.map(t => {
                      const d = diaDe(t as any)!;
                      return (
                        <button key={t.id} onClick={() => setSelectedTask(t)} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                          <div className="w-9 shrink-0 text-center">
                            <p className="text-[13px] font-bold leading-none text-slate-900 dark:text-white">{d.slice(8, 10)}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][Number(d.slice(5, 7)) - 1]}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{t.client_name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{[t.produto, t.entregavel, nomeEtapa(etapas.find(e => e.id === t.status_group))].filter(Boolean).join(' · ')}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Linha editorial de cada perfil (antes: "Anotações – esquerda/direita" no topo da lista) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Nota titulo="Linha editorial · Perfil Jean" cor={PERFIS[0].cor} html={notesHtml} setHtml={setNotesHtml} original={originalNotesHtml} setDirty={setNotesDirty} salvando={notesSaving} sujo={notesDirty} />
            <Nota titulo="Linha editorial · Perfil Grape" cor={PERFIS[1].cor} html={notesHtmlRight} setHtml={setNotesHtmlRight} original={originalNotesHtmlRight} setDirty={setNotesDirtyRight} salvando={notesSavingRight} sujo={notesDirtyRight} />
          </div>
        </div>
      ) : (
        <div className="pb-12">
          {/* Barra do quadro */}
          <div className="px-8 mb-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5 h-10 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10">
              {[{ id: 'todos', rotulo: 'Todos', cor: '' }, ...PERFIS.map(p => ({ id: p.id, rotulo: p.id, cor: p.cor })), { id: 'sem', rotulo: 'Sem perfil', cor: '#94a3b8' }].map(o => (
                <button key={o.id} onClick={() => setPerfilFiltro(o.id)}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${perfilFiltro === o.id ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
                  {o.cor && <span className="w-1.5 h-1.5 rounded-full" style={{ background: o.cor }} />}{o.rotulo}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[200px] max-w-[360px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar postagem…"
                className="w-full h-10 pl-9 pr-3 rounded-xl text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-500 outline-none focus:border-violet-500/50" />
            </div>
            <button onClick={() => setShowCompleted(!showCompleted)}
              className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors ${showCompleted ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : 'text-slate-500 border-slate-200 dark:border-white/10 hover:text-slate-800 dark:hover:text-white'}`}>
              <Check size={14} /> {showCompleted ? 'Todas as postadas' : 'Mostrar todas as postadas'}
            </button>
            <button onClick={() => setEtapasModal(true)} className="h-10 px-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5 ml-auto">
              <Settings size={14} /> Etapas
            </button>
          </div>
          <div className="px-8">
            <QuadroPostagens
              postagens={filtradas as any} etapas={etapas} mostrarPostadas={showCompleted}
              onAbrir={(p) => setSelectedTask(tasks.find(t => t.id === p.id) || null)}
              onMover={(id, etapa) => patchTask(id, { status_group: etapa })}
              onCampo={(id, campo, v) => patchTask(id, { [campo]: v })}
              onNova={(etapa) => setNovaEm({ etapa })}
            />
          </div>
        </div>
      )}

      {novaEm && (
        <NovaPostagemModal pageId={pageId} etapas={etapas} etapaInicial={novaEm.etapa} diaInicial={novaEm.dia}
          onFechar={() => setNovaEm(null)} onCriada={() => fetchData(true)} />
      )}

      {etapasModal && (
        <EtapasModal
          etapas={etapas}
          contagem={(id) => tasks.filter(t => t.status_group === id).length}
          onRenomear={(id, label) => handleRenameGroup(id, label)}
          onCor={(id, color) => handleUpdateGroup(id, { color })}
          onApagar={(id) => handleDeleteGroup(id)}
          onCriar={async (label) => { setNewGroupLabel(label); }}
          onConfirmarCriar={handleAddGroup}
          novaLabel={newGroupLabel}
          onFechar={() => setEtapasModal(false)}
        />
      )}

      {selectedTask && (
        <ListaTaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => { fetchData(true); }}
          onDelete={(id) => { handleDeleteTask(id); setSelectedTask(null); }}
        />
      )}

      {tagsModal && (
        <TagsManagerModal
          tags={coloredTagDefs}
          onChange={(newTags) => { setColoredTagDefs(newTags); saveColoredTags(pageId, newTags); }}
          onClose={() => setTagsModal(false)}
        />
      )}
    </div>
  );
}

// ── Etapas (colunas do quadro): renomear, cor, apagar, criar ─────────────────
const CORES_ETAPA = ['#64748b', '#7c3aed', '#3b82f6', '#06b6d4', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#10b981'];

function EtapasModal({ etapas, contagem, onRenomear, onCor, onApagar, onCriar, onConfirmarCriar, novaLabel, onFechar }: {
  etapas: StatusGroupDef[]; contagem: (id: string) => number;
  onRenomear: (id: string, label: string) => void; onCor: (id: string, cor: string) => void; onApagar: (id: string) => void;
  onCriar: (label: string) => void; onConfirmarCriar: () => void; novaLabel: string; onFechar: () => void;
}) {
  const apagar = async (e: StatusGroupDef) => {
    const n = contagem(e.id);
    const ok = await confirmDialog({
      title: 'Apagar etapa',
      message: n ? `"${e.label}" tem ${n} postage${n > 1 ? 'ns' : 'm'}. Elas ficam sem etapa e somem do quadro até você movê-las.` : `Apagar a etapa "${e.label}"?`,
      confirmText: 'Apagar', danger: true,
    });
    if (ok) onApagar(e.id);
  };
  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-[480px] bg-white dark:bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl" onClick={ev => ev.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Etapas</h3>
            <p className="text-[11px] text-slate-500">As colunas do quadro, da esquerda para a direita.</p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"><X size={16} /></button>
        </div>
        <div className="px-4 py-3 space-y-1 max-h-[60vh] overflow-y-auto">
          {etapas.map(e => (
            <div key={e.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03]">
              <div className="relative group/cor">
                <button className="w-4 h-4 rounded-full border border-black/10" style={{ background: e.color }} title="Cor" />
                <div className="absolute left-0 top-6 z-10 hidden group-hover/cor:flex gap-1 p-1.5 rounded-lg bg-white dark:bg-dark-card border border-black/10 dark:border-white/10 shadow-xl">
                  {CORES_ETAPA.map(c => <button key={c} onClick={() => onCor(e.id, c)} className="w-4 h-4 rounded-full" style={{ background: c }} />)}
                </div>
              </div>
              <input defaultValue={e.label} onBlur={ev => { const v = ev.target.value.trim(); if (v && v !== e.label) onRenomear(e.id, v); }}
                className="flex-1 bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-100 px-2 py-1 rounded-md border border-transparent hover:border-slate-200 dark:hover:border-white/10 focus:border-violet-500 outline-none" />
              <span className="text-[11px] text-slate-400 w-6 text-right">{contagem(e.id)}</span>
              <button onClick={() => apagar(e)} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10" title="Apagar"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-6 py-4 border-t border-black/5 dark:border-white/5">
          <input value={novaLabel} onChange={ev => onCriar(ev.target.value)} onKeyDown={ev => ev.key === 'Enter' && onConfirmarCriar()} placeholder="Nova etapa…"
            className="flex-1 px-3 py-2 rounded-lg text-sm modal-input focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          <button onClick={onConfirmarCriar} className="h-9 px-3 rounded-lg text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 flex items-center gap-1"><Plus size={13} /> Criar</button>
        </div>
      </div>
    </div>
  );
}
