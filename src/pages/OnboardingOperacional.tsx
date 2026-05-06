import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronDown, ChevronRight, Calendar, Users, Tag, MoreHorizontal, Circle, CheckCircle2, Loader2, X, Trash2, GripVertical, Settings } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────
interface OnboardingTask {
  id: number;
  client_name: string;
  squad: string | null;
  responsible_id: string | null;
  responsible_name: string | null;
  responsible_avatar: string | null;
  start_date: string | null;
  due_date: string | null;
  status_group: string;
  tags: string[];
  subtask_count: number;
  created_at: string;
  nome_completo: string | null;
  nome_fantasia: string | null;
  telefone_whatsapp: string | null;
  cnpj_cpf: string | null;
  cep: string | null;
  cidade: string | null;
  uf: string | null;
}

interface Comment {
  id: number;
  task_id: number;
  author_name: string | null;
  author_email: string | null;
  text: string;
  created_at: string;
}

interface Subtask {
  id: number;
  task_id: number;
  title: string;
  completed: boolean;
  order_index: number;
  description?: string;
  due_date?: string;
  responsible_id?: string;
  responsible_name?: string;
  responsible_avatar?: string;
  internal_doc?: string;
}

interface SubtaskComment {
  id: number;
  subtask_id: number;
  author_name: string | null;
  author_avatar: string | null;
  text: string;
  created_at: string;
}

interface SubtaskFile {
  id: number;
  subtask_id: number;
  name: string;
  type: 'pdf' | 'doc' | 'link';
  url?: string;
  content?: string;
  created_at: string;
}

interface TemplateItem {
  id: number;
  title: string;
  order_index: number;
}

interface StatusGroup {
  id: string;
  label: string;
  color: string;
  emoji: string;
  tasks: OnboardingTask[];
}

// ── Helpers ───────────────────────────────────────────────
const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const formatted = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  if (diff < 0) return { text: `${Math.abs(diff)} dias atrás`, color: 'text-rose-400', formatted };
  if (diff === 0) return { text: 'Hoje', color: 'text-amber-400', formatted };
  return { text: formatted, color: 'text-slate-400', formatted };
};

const formatDate = (iso: string | null) => {
  if (!iso) return <span className="text-slate-600">—</span>;
  const result = fmtDate(iso);
  if (typeof result === 'object') {
    const isOverdue = result.color === 'text-rose-400';
    return (
      <span className={`text-xs font-semibold ${result.color} ${isOverdue ? 'bg-rose-500/10 px-2 py-0.5 rounded-lg' : ''}`}>
        {isOverdue ? result.text : result.formatted}
      </span>
    );
  }
  return <span className="text-xs text-slate-400">{result}</span>;
};

const SQUAD_OPTIONS = ['Squad Able', 'Squad Baker'];

const STATUS_GROUPS: Omit<StatusGroup, 'tasks'>[] = [
  { id: 'briefing-realizado', label: 'BRIEFING REALIZADO', color: '#10b981', emoji: '✅' },
  { id: 'a-fazer-briefing', label: 'A FAZER BRIEFING', color: '#f59e0b', emoji: '📋' },
];

// ── Tag Badge ─────────────────────────────────────────────
const TagBadge = ({ label }: { label: string }) => {
  const colors: Record<string, string> = {
    'coletar conta de anúncio': 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    'pendência do advogado': 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    'crm': 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  };
  const cls = colors[label.toLowerCase()] || 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
      {label}
    </span>
  );
};

// ── Avatar ────────────────────────────────────────────────
const Avatar = ({ name, url, size = 6 }: { name?: string | null; url?: string | null; size?: number }) => {
  const initials = (name || '??').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const sz = `w-${size} h-${size}`;
  if (url) return <img src={url} alt={name || ''} className={`${sz} rounded-full object-cover border border-white/10`} />;
  return (
    <div className={`${sz} rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-[9px] font-bold text-violet-300`}>
      {initials}
    </div>
  );
};

// ── Task Row ──────────────────────────────────────────────
const TaskRow = ({ task, onUpdate, onOpenDetail, onOpenSubtask }: { 
  task: OnboardingTask; 
  onUpdate: () => void; 
  onOpenDetail: (t: OnboardingTask) => void;
  onOpenSubtask: (s: Subtask, t: OnboardingTask) => void;
}) => {
  const [squad, setSquad] = useState(task.squad || '');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const statusRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showStatusPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setShowStatusPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showStatusPicker]);

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  const toggleExpand = async () => {
    if (!expanded && subtasks.length === 0) {
      setLoadingSubs(true);
      try {
        const res = await fetch(`/api/onboarding-tasks/${task.id}/subtasks`);
        if (res.ok) setSubtasks(await res.json());
      } catch { /* silent */ } finally { setLoadingSubs(false); }
    }
    setExpanded(v => !v);
  };

  const toggleSubtask = async (sub: Subtask) => {
    const newVal = !sub.completed;
    setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, completed: newVal } : s));
    try {
      await fetch(`/api/onboarding-subtasks/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newVal }),
      });
    } catch { /* silent */ }
  };

  const handleSquadChange = async (newSquad: string) => {
    setSquad(newSquad);
    try {
      await fetch(`/api/onboarding-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squad: newSquad }),
      });
    } catch { /* silent */ }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === task.status_group) { setShowStatusPicker(false); return; }
    setShowStatusPicker(false);
    try {
      await fetch(`/api/onboarding-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_group: newStatus }),
      });
      onUpdate();
    } catch { /* silent */ }
  };

  const handleArchive = async () => {
    setShowMenu(false);
    try {
      await fetch(`/api/onboarding-tasks/${task.id}/archive`, { method: 'POST' });
      onUpdate();
    } catch { /* silent */ }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    if (!window.confirm(`Excluir "${task.client_name}" permanentemente? Esta ação não pode ser desfeita.`)) return;
    try {
      await fetch(`/api/onboarding-tasks/${task.id}`, { method: 'DELETE' });
      onUpdate();
    } catch { /* silent */ }
  };

  const currentGroup = STATUS_GROUPS.find(g => g.id === task.status_group);
  const circleColor = currentGroup?.color || '#64748b';
  const completedCount = subtasks.filter(s => s.completed).length;

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
        {/* Expand toggle */}
        <button onClick={toggleExpand} className="shrink-0 text-slate-600 hover:text-slate-400 transition-all">
          <ChevronRight size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        </button>

        {/* Status circle */}
        <div className="relative shrink-0" ref={statusRef}>
          <button
            onClick={() => setShowStatusPicker(v => !v)}
            className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all hover:scale-125"
            style={{ borderColor: circleColor }}
            title="Alterar status"
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: circleColor }} />
          </button>
          {showStatusPicker && (
            <div className="absolute top-6 left-0 z-50 w-56 bg-dark-card border border-black/10 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden">
              <div className="px-3 pt-3 pb-2 border-b border-black/5 dark:border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</p>
              </div>
              <div className="py-1.5">
                {STATUS_GROUPS.map(sg => {
                  const isActive = sg.id === task.status_group;
                  return (
                    <button key={sg.id} onClick={() => handleStatusChange(sg.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${isActive ? 'bg-black/5 dark:bg-white/5' : 'hover:bg-black/5 dark:hover:bg-white/[0.04]'}`}>
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sg.color }} />
                      <span className={`text-xs font-semibold flex-1 ${isActive ? 'text-dark-text' : 'text-slate-400'}`}>{sg.label}</span>
                      {isActive && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Client Name + subtask count */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span onClick={() => onOpenDetail(task)} className="text-sm font-semibold text-dark-text truncate cursor-pointer hover:text-violet-400 transition-colors">{task.client_name}</span>
          {task.subtask_count > 0 && (
            <span className="text-[10px] text-slate-500 font-mono bg-white/5 px-1.5 py-0.5 rounded">
              ↳ {task.subtask_count}
            </span>
          )}
          {task.tags.map(t => <TagBadge key={t} label={t} />)}
        </div>

        {/* Squad */}
        <div className="shrink-0 w-36">
          <select value={squad} onChange={e => handleSquadChange(e.target.value)}
            className="w-full bg-dark-bg border border-white/10 rounded-lg px-2 py-1 text-xs text-dark-text focus:outline-none focus:border-violet-500/50 transition-colors">
            <option value="">— Squad —</option>
            {SQUAD_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Responsável */}
        <div className="shrink-0 w-20 flex items-center justify-center gap-1">
          {task.responsible_name
            ? <Avatar name={task.responsible_name} url={task.responsible_avatar} size={6} />
            : <div className="w-6 h-6 rounded-full border border-dashed border-slate-600 flex items-center justify-center"><Plus size={10} className="text-slate-600" /></div>}
        </div>

        {/* Data Inicial */}
        <div className="shrink-0 w-24 text-xs text-slate-400">
          {task.start_date ? new Date(task.start_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
        </div>

        {/* Data de vencimento */}
        <div className="shrink-0 w-28">{formatDate(task.due_date)}</div>

        {/* More — dropdown com Arquivar e Excluir */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setShowMenu(v => !v)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-white/10"
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-7 z-50 w-44 bg-dark-card border border-black/10 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden">
              <button
                onClick={handleArchive}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs text-dark-text hover:bg-black/5 dark:hover:bg-white/[0.06] transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>
                Arquivar
              </button>
              <div className="h-px bg-black/5 dark:bg-white/5 mx-2" />
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 size={13} />
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subtasks panel */}
      {expanded && (
        <div className="bg-black/[0.01] dark:bg-white/[0.01] border-b border-black/5 dark:border-white/5">
          {loadingSubs ? (
            <div className="flex items-center gap-2 px-12 py-3 text-xs text-slate-600">
              <Loader2 size={12} className="animate-spin" /> Carregando subtarefas...
            </div>
          ) : subtasks.length === 0 ? (
            <div className="px-12 py-3 text-xs text-slate-600">Nenhuma subtarefa.</div>
          ) : (
            <div>
              <div className="px-12 py-2 flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  Subtarefas
                </span>
                <span className="text-[10px] text-slate-600">
                  {completedCount}/{subtasks.length}
                </span>
                <div className="flex-1 h-1 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden ml-1">
                  <div className="h-full bg-violet-500 rounded-full transition-all duration-300"
                    style={{ width: `${subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0}%` }} />
                </div>
              </div>
              {subtasks.map(sub => (
                <div key={sub.id}
                  className="w-full flex items-center gap-3 px-12 py-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                  <button onClick={() => toggleSubtask(sub)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${sub.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                    {sub.completed && <CheckCircle2 size={10} className="text-white" />}
                  </button>
                  <button onClick={() => onOpenSubtask(sub, task)}
                    className={`flex-1 text-left text-xs hover:text-violet-500 transition-colors ${sub.completed ? 'text-slate-600 line-through' : 'text-dark-text'}`}>
                    {sub.title}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Group Block ───────────────────────────────────────────

const GroupBlock = ({ group, onUpdate, onAddTask, onOpenDetail, onOpenSubtask }: {
  group: StatusGroup;
  onUpdate: () => void;
  onAddTask: (groupId: string) => void;
  onOpenDetail: (t: OnboardingTask) => void;
  onOpenSubtask: (s: Subtask, t: OnboardingTask) => void;
}) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-6">
      {/* Group header */}
      <div className="flex items-center gap-3 px-4 py-2 sticky top-0 bg-dark-bg z-10">
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 group">
          <div
            className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
            style={{ background: `${group.color}20`, color: group.color, border: `1px solid ${group.color}40` }}
          >
            <span>{group.emoji}</span>
            <span>{group.label}</span>
            <span className="ml-1 opacity-60">{group.tasks.length}</span>
          </div>
          {expanded
            ? <ChevronDown size={14} className="text-slate-500" />
            : <ChevronRight size={14} className="text-slate-500" />
          }
        </button>
      </div>

      {/* Column headers */}
      {expanded && (
        <>
          <div className="flex items-center gap-2 px-10 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest border-b border-black/5 dark:border-white/5">
            <div className="flex-1">Nome</div>
            <div className="w-36">Squad</div>
            <div className="w-20 text-center">Responsável</div>
            <div className="w-24">Data Inicial</div>
            <div className="w-28">Data de Vencimento</div>
            <div className="w-6" />
          </div>

          {/* Task rows */}
          <div className="bg-dark-card/20 rounded-b-xl border-x border-b border-black/5 dark:border-white/5">
            {group.tasks.length === 0 ? (
              <div className="py-8 text-center text-slate-600 text-sm">Nenhum cliente neste grupo.</div>
            ) : (
              group.tasks.map(task => (
                <TaskRow key={task.id} task={task} onUpdate={onUpdate} onOpenDetail={onOpenDetail} onOpenSubtask={onOpenSubtask} />
              ))
            )}
            {/* Add task row */}
            <button
              onClick={() => onAddTask(group.id)}
              className="flex items-center gap-2 px-10 py-3 text-xs text-slate-500 hover:text-dark-text hover:bg-black/[0.02] dark:hover:bg-white/[0.02] w-full transition-colors"
            >
              <Plus size={12} />
              Adicionar Tarefa
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ── Add Task Modal ────────────────────────────────────────
const AddTaskModal = ({ groupId, onClose, onSaved }: { groupId: string; onClose: () => void; onSaved: () => void }) => {
  const [clientName, setClientName] = useState('');
  const [squad, setSquad] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!clientName.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/onboarding-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: clientName, squad, start_date: startDate || null, due_date: dueDate || null, status_group: groupId }),
      });
      onSaved();
      onClose();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-dark-text mb-4">Adicionar Cliente ao Onboarding</h3>
        <div className="space-y-3">
          <input
            value={clientName} onChange={e => setClientName(e.target.value)}
            placeholder="Nome do cliente *"
            className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
          />
          <select value={squad} onChange={e => setSquad(e.target.value)}
            className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500/50">
            <option value="">— Squad —</option>
            {SQUAD_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Data Inicial</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 block">Vencimento</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-violet-500/50" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-slate-400 hover:bg-white/5 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !clientName.trim()}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm font-bold text-white transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Template Modal ────────────────────────────────────────
const TemplateModal = ({ onClose }: { onClose: () => void }) => {
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    fetch('/api/onboarding-template')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addItem = () => {
    if (!newTitle.trim()) return;
    setItems(prev => [...prev, { id: Date.now(), title: newTitle.trim(), order_index: prev.length }]);
    setNewTitle('');
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const moveItem = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= items.length) return;
    setItems(prev => {
      const arr = [...prev];
      [arr[from], arr[to]] = [arr[to], arr[from]];
      return arr;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/onboarding-template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(i => ({ title: i.title })) }),
      });
      onClose();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/5 dark:border-white/5">
          <div>
            <h2 className="text-base font-bold text-dark-text flex items-center gap-2">
              <Settings size={18} className="text-violet-500" />
              Modelo Padrão
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Subtarefas criadas automaticamente para cada novo cliente</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-slate-600 text-sm py-8">Nenhuma subtarefa no modelo ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {items.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex items-center gap-2 px-3 py-2.5 bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-xl group hover:border-black/10 dark:hover:border-white/10 transition-colors">
                  <span className="text-[10px] font-bold text-slate-600 w-5 text-center shrink-0">{idx + 1}</span>
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                      className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors p-0.5">
                      <ChevronDown size={10} className="rotate-180" />
                    </button>
                    <button onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}
                      className="text-slate-600 hover:text-slate-300 disabled:opacity-20 transition-colors p-0.5">
                      <ChevronDown size={10} />
                    </button>
                  </div>
                  <span className="flex-1 text-sm text-dark-text truncate">{item.title}</span>
                  <button onClick={() => removeItem(idx)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition-all p-1 rounded">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new item */}
          <div className="mt-4 flex gap-2">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
              placeholder="Nova subtarefa..."
              className="flex-1 bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <button onClick={addItem} disabled={!newTitle.trim()}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5">
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
          <p className="text-[10px] text-slate-600">{items.length} subtarefa{items.length !== 1 ? 's' : ''} no modelo</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-black/10 dark:border-white/10 text-sm text-slate-500 hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm font-bold text-white transition-colors flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Salvar Modelo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};// ── Task Detail Modal ─────────────────────────────────────
const TaskDetailModal = ({ task, onClose, onUpdate }: { task: OnboardingTask; onClose: () => void; onUpdate: () => void }) => {
  const [form, setForm] = useState({
    nome_completo: task.nome_completo || '',
    nome_fantasia: task.nome_fantasia || '',
    telefone_whatsapp: task.telefone_whatsapp || '',
    cnpj_cpf: task.cnpj_cpf || '',
    cep: task.cep || '',
    cidade: task.cidade || '',
    uf: task.uf || '',
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formDirty, setFormDirty] = useState(false);

  useEffect(() => {
    fetch(`/api/onboarding-tasks/${task.id}/comments`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setComments(data); setLoadingComments(false); })
      .catch(() => setLoadingComments(false));
  }, [task.id]);

  const updateField = (key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setFormDirty(true);
  };

  const saveForm = async () => {
    setSaving(true);
    try {
      await fetch(`/api/onboarding-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setFormDirty(false);
      onUpdate();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`/api/onboarding-tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments(prev => [c, ...prev]);
        setNewComment('');
      }
    } catch { /* silent */ }
  };

  const FIELDS = [
    { key: 'nome_completo', label: 'Nome Completo' },
    { key: 'nome_fantasia', label: 'Nome Fantasia' },
    { key: 'telefone_whatsapp', label: 'Telefone (WhatsApp)' },
    { key: 'cnpj_cpf', label: 'CNPJ / CPF' },
    { key: 'cep', label: 'CEP' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'uf', label: 'UF' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/5 dark:border-white/5">
          <div>
            <h2 className="text-base font-bold text-dark-text">{task.client_name}</h2>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">Detalhes do cliente</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-dark-text hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Form section */}
          <div className="px-6 py-4 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Formulário</p>
              {formDirty && (
                <button onClick={saveForm} disabled={saving}
                  className="text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
                  {saving ? <Loader2 size={10} className="animate-spin" /> : null}
                  Salvar
                </button>
              )}
            </div>
            <div className="space-y-2">
              {FIELDS.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <label className="text-xs text-slate-500 w-36 shrink-0 text-right">{f.label}</label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={e => updateField(f.key, e.target.value)}
                    className="flex-1 bg-dark-bg border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Comments section */}
          <div className="px-6 py-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Comentários</p>

            {/* New comment */}
            <div className="flex gap-2 mb-4">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
                placeholder="Escreva um comentário..."
                className="flex-1 bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
              <button onClick={addComment} disabled={!newComment.trim()}
                className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white text-xs font-semibold rounded-xl transition-colors">
                Enviar
              </button>
            </div>

            {/* Comments list */}
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 size={16} className="animate-spin text-slate-600" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-center text-slate-600 text-xs py-4">Nenhum comentário ainda.</p>
            ) : (
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-500">
                        {c.author_name || 'Usuário'}
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DocEditorModal = ({ file, onSave, onClose }: { file: any; onSave: (id: number, content: string) => Promise<void>; onClose: () => void }) => {
  const [content, setContent] = useState(file.content || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(file.id, content);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
          <div>
            <h2 className="text-base font-bold text-dark-text flex items-center gap-2">
              <FileText size={18} className="text-violet-500" />
              {file.name}
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">Editor de Documento</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Salvar
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-dark-text hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Comece a digitar seu documento aqui..."
            className="flex-1 w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl p-4 text-sm text-dark-text placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none transition-colors"
          />
        </div>
      </div>
    </div>
  );
};


const ATA_TEMPLATE = `# ATA DA REUNIÃO

### ____________________________________________________
### **APRESENTAÇÃO**
### 🍇| Bom dia/Boa tarde/Boa noite aos participantes da reunião;
### 🍇| Perguntar do lado pessoal, final de semana e como foi o dia;
### 🍇| Apresente-se (Qual a tua função);
_________________________________________________________________________________
## PÚBLICO
 🍇| VERBA para INVESTIMENTO em anúncios

🍇| Qual AÇÃO e PLATAFORMA iremos iniciar

🍇| Quais são as CARACTERÍSTICAS DO PÚBLICO

🍇| DETALHES Adicionais do Projeto

🍇| Local para rodar as campanhas

## NOVOS ENCONTROS
- [ ] Explicar o motivo de dividir as reuniões desta maneira
- [ ] Agendar a Criação/Coleta de Acessos
- [ ] Agendar o treinamento comercial

_________________________________________________________________________________
## ACESSOS CRM + IA

- [ ] Faz sentido utiliza-lo?

- [ ] Teremos IA no atendimento

- [ ] Quantas contas (Limite 4) e para Quais E-mails podemos criar os acessos:

_________________________________________________________________________________
## ALINHAMENTOS DE EXPECTATIVAS
*   Criativos
    - [ ] Criativos em vídeo no Facebook Ads [Importância na qualificação do público]
    - [ ] Faremos Criativos de Imagem e Edição nos Vídeos
    - [ ] Adicionaremos legendas, faremos cortes pontuais e melhoraremos o áudio - Edições simples conectam muito melhor com um público mais simples
    - [ ] Link do Google Drive na Descrição (Tudo que forem nos enviar, precisa estar lá para termos salvo e manter a qualidade das imagens)
    
*   Campanhas
    - [ ] Processo para Início das Campanhas: DEPOIS DO TREINAMENTO COMERCIAL - QUANTO ANTES NOS ENVIAREM OS MATERIAIS QUANTO ANTES INICIAMOS
    
*   Financeiro
    - [ ] Explicar sobre a Marvee - A empresa terceirizada que cuida do nosso Financeiro (Eles farão as cobranças porém o boleto chegará em nome da Grape Mídia com nossos dados)
    - [ ] Quem ficará responsável pelo Financeiro do escritório + Número do Responsável?
    - [ ] Por onde será a comunicação financeira (Campanhas/anúncio)
    

Gostariam de receber as nossas faturas por:

- [ ] E-mail
- [ ] WhatsApp

  

A data do pagamento ficou alinhada com o seu fluxo de caixa do seu escritório?

- [ ] A data é sempre a do mesmo dia que o primeiro pagamento foi feito
- [ ] Caso não, qual outro dia fica melhor dentro do mesmo mês?
- [ ] NÃO HÁ POSSIBILIDADE DE PAGAMENTO PROPORCIONAL (SE ELE PERGUNTAR)

  

Não é necessário enviar o comprovante de depósito dos nossos honorários:

- [ ] Assas contabiliza certinho (nosso banco digital) e temos um financeiro trabalhando nessas demandas diariamente
- [ ] O grupo somente para assuntos de campanhas

  

*   Comunicação
    - [ ] Canais oficiais de comunicação da Grape Mídia: Grupo do WhatsApp + WhatsApp da Direção (Jean) e Gerência (Seu WhatsApp)
    - [ ] Feedback de Campanhas + Ajustes no Funil + CRM é com o número do squad/gestor de tráfego
    - [ ] Honorários Grape é diretamente com a Marvee
    - [ ] Demais assuntos é diretamente com a Liderança da Grape
    
      
    
*    Alinhamento de contratos
    
    Quantos contratos fechados te deixaria feliz neste primeiro momento: (META PROGRESSIVA - ALINHAR QUE PODEMOS NÃO FECHAR CONTRATOS NESTE PRIMEIRO MOMENTO)
    

Nossa principal missão será descobrir: **O CAC da nossa operação**
- [ ] Trazendo muito mais previsibilidade ao escritório de aportar mais dinheiro vs retorno em contratos
- [ ] Nós baseamos nosso CAC na régua do mercado, contabilizando apenas o valor de investimento em anúncio visto que os honorários da Grape são referente a nossa mão de obra apenas
- [ ] Relatório semanal Padrão Grape Mídia [PDF]
- [ ] Falar que: "Nosso contato será diário no WhatsApp"
- [ ] Feedback do Advogado [Frisar importância e faturamento como aumenta]
- [ ] Reunião de Alinhamento Quinzenal [Frisar importância e faturamento como aumenta]

  

- [ ] Explicar sobre o SIG - Sistema de Indicação Grape
- [ ] Cada indicação que fechar conosco um contrato de pelo menos 4 meses
- [ ] Faremos um Pix no valor de R$500.00 ou abateremos R$500.00 no próximo honorário da nossa empresa

### ____________________________________________________
## FEEDBACK REVERSO + GOOGLE MEU NEGÓCIO
- [ ]  O que você espera dos nossos serviços e como a Grape Mídia conseguirá ajudar na fase atual - Além da rentabilidade, contratos fechados e novas oportunidades:

- [ ] Qual foi o maior diferencial que identificou na nossa empresa que foi o motivo da contratação?

- [ ] NPS Mensal - Nos ajudará como Empresa e a Melhorar no nosso projeto - Ganha Ganha

- [ ]     Gostaríamos muito de ter esse feedback positivo dentro do nosso Google Meu Negócio
    - [ ] Consegue nos ajudar deixando esse feedback na nossa vitrine?
    - [ ] ENVIAR O LINK DO NOSSO GOOGLE MEU NEGÓCIO ABAIXO NO GRUPO DO WHATSAPP: http://bit.ly/44YP1O2

SEU RESULTADO: É NOSSO COMPROMISSO E RESPONSABILIDADE TOTAL
POR ISSO PREZAMOS PELOS ALINHAMENTOS INICIAIS COMERCIAIS
### ______________________________________________________________________________________`;

const SubtaskDetailModal = ({ subtask, task, onClose, onUpdate }: { subtask: any; task: any; onClose: () => void; onUpdate: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  
  const [description, setDescription] = useState(subtask.description || '');
  const [descSaving, setDescSaving] = useState(false);

  const [internalDoc, setInternalDoc] = useState(subtask.internal_doc || ATA_TEMPLATE);
  const [internalDocSaving, setInternalDocSaving] = useState(false);

  // File Add State
  const [showAddFile, setShowAddFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'pdf' | 'doc' | 'link'>('doc');
  const [newFileUrl, setNewFileUrl] = useState('');
  const [addingFile, setAddingFile] = useState(false);

  // Editor State
  const [editingDoc, setEditingDoc] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cRes, fRes] = await Promise.all([
        fetch(`/api/onboarding-subtasks/${subtask.id}/comments`),
        fetch(`/api/onboarding-subtasks/${subtask.id}/files`)
      ]);
      if (cRes.ok) setComments(await cRes.json());
      if (fRes.ok) setFiles(await fRes.json());
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [subtask.id]);

  const handleSaveDescription = async () => {
    setDescSaving(true);
    try {
      await fetch(`/api/onboarding-subtasks/${subtask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      onUpdate();
    } catch { /* silent */ } finally { setDescSaving(false); }
  };

  const handleSaveInternalDoc = async () => {
    setInternalDocSaving(true);
    try {
      await fetch(`/api/onboarding-subtasks/${subtask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_doc: internalDoc })
      });
      onUpdate();
    } catch { /* silent */ } finally { setInternalDocSaving(false); }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    setCommenting(true);
    try {
      await fetch(`/api/onboarding-subtasks/${subtask.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment, author_name: 'Equipe Grape' })
      });
      setNewComment('');
      fetchData();
    } catch { /* silent */ } finally { setCommenting(false); }
  };

  const addFile = async () => {
    if (!newFileName.trim()) return;
    setAddingFile(true);
    try {
      await fetch(`/api/onboarding-subtasks/${subtask.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFileName, type: newFileType, url: newFileUrl || null })
      });
      setShowAddFile(false);
      setNewFileName('');
      setNewFileUrl('');
      fetchData();
    } catch { /* silent */ } finally { setAddingFile(false); }
  };

  const handleSaveDocContent = async (fileId: number, content: string) => {
    try {
      await fetch(`/api/onboarding-subtask-files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      fetchData();
    } catch { /* silent */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${subtask.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
              {subtask.completed && <CheckCircle2 size={12} className="text-white" />}
            </div>
            <div>
              <h2 className={`text-lg font-bold ${subtask.completed ? 'text-slate-500 line-through' : 'text-dark-text'}`}>
                {subtask.title}
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">
                Subtarefa de <span className="font-bold text-violet-400">{task.client_name}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-dark-text hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Layout Duplo */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Lado Esquerdo: Informações e Arquivos */}
          <div className="w-[60%] flex flex-col border-r border-black/5 dark:border-white/5 overflow-y-auto">
            <div className="p-6">
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição</h3>
                  {description !== (subtask.description || '') && (
                    <button onClick={handleSaveDescription} disabled={descSaving} className="text-[10px] font-bold text-violet-400 hover:text-violet-300">
                      {descSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  )}
                </div>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Adicione uma descrição detalhada para esta subtarefa..."
                  className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-dark-text placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-y min-h-[120px] transition-colors"
                />
              </div>

              {/* Arquivos e Docs */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    Arquivos e Documentos
                    <span className="bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-400">{files.length}</span>
                  </h3>
                  <button onClick={() => setShowAddFile(!showAddFile)} className="flex items-center gap-1 text-[10px] font-bold text-violet-500 hover:text-violet-400">
                    <Plus size={12} /> {showAddFile ? 'Cancelar' : 'Adicionar'}
                  </button>
                </div>

                {showAddFile && (
                  <div className="bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl p-4 mb-4">
                    <div className="flex gap-2 mb-3">
                      {(['doc', 'pdf', 'link'] as const).map(t => (
                        <button key={t} onClick={() => setNewFileType(t)}
                          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${newFileType === t ? 'bg-violet-600 text-white' : 'bg-dark-bg border border-black/10 dark:border-white/10 text-slate-500'}`}>
                          {t.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <input value={newFileName} onChange={e => setNewFileName(e.target.value)} placeholder={`Nome do ${newFileType.toUpperCase()}`} className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text" />
                      {newFileType !== 'doc' && (
                        <input value={newFileUrl} onChange={e => setNewFileUrl(e.target.value)} placeholder="URL / Link Externo" className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-dark-text" />
                      )}
                      <button onClick={addFile} disabled={!newFileName || addingFile} className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors">
                        Adicionar {newFileType.toUpperCase()}
                      </button>
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando arquivos...</div>
                ) : files.length === 0 && !showAddFile ? (
                  <div className="py-8 text-center text-slate-600 text-xs border border-dashed border-black/10 dark:border-white/10 rounded-xl">Nenhum arquivo anexado.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {files.map(f => (
                      <div key={f.id} onClick={() => f.type === 'doc' ? setEditingDoc(f) : window.open(f.url, '_blank')} className="bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl p-3 flex items-start gap-3 cursor-pointer hover:border-violet-500/50 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                        <div className="w-10 h-10 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
                          {f.type === 'doc' ? <FileText size={18} className="text-blue-400" /> : f.type === 'pdf' ? <FileText size={18} className="text-rose-400" /> : <LinkIcon size={18} className="text-emerald-400" />}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-xs font-bold text-dark-text truncate group-hover:text-violet-400 transition-colors">{f.name}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{f.type === 'doc' ? 'Documento Interno' : f.type === 'pdf' ? 'Arquivo PDF' : 'Link Externo'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Internal Doc Editor */}
              <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={12} className="text-violet-500" />
                    Documento Interno
                  </h3>
                  {internalDoc !== (subtask.internal_doc || ATA_TEMPLATE) && (
                    <button onClick={handleSaveInternalDoc} disabled={internalDocSaving} className="text-[10px] font-bold text-violet-400 hover:text-violet-300">
                      {internalDocSaving ? 'Salvando...' : 'Salvar Documento'}
                    </button>
                  )}
                </div>
                <textarea
                  value={internalDoc}
                  onChange={e => setInternalDoc(e.target.value)}
                  placeholder="Escreva a ata, anotações ou dados importantes aqui..."
                  className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-4 py-4 text-sm text-dark-text placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-y min-h-[400px] transition-colors font-mono"
                />
              </div>

            </div>
          </div>

          {/* Lado Direito: Comentários */}
          <div className="w-[40%] flex flex-col bg-black/[0.01] dark:bg-white/[0.01]">
            <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 bg-dark-card sticky top-0 z-10 shadow-sm">
               <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 Atividade <span className="bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-400">{comments.length}</span>
               </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-slate-500" /></div>
              ) : comments.length === 0 ? (
                <div className="py-10 text-center text-slate-600 text-xs">Nenhum comentário.</div>
              ) : (
                <div className="space-y-4">
                  {comments.map(c => (
                    <div key={c.id} className="bg-dark-card border border-black/5 dark:border-white/5 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-dark-text">{c.author_name || 'Usuário'}</span>
                        <span className="text-[10px] text-slate-600">{new Date(c.created_at).toLocaleDateString('pt-BR', { hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-dark-text whitespace-pre-wrap">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-black/5 dark:border-white/5 bg-dark-card shrink-0">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-dark-text placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none h-24 mb-3 transition-colors"
              />
              <div className="flex justify-end">
                <button onClick={addComment} disabled={!newComment.trim() || commenting} className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2">
                  {commenting ? <Loader2 size={12} className="animate-spin" /> : null}
                  Responder
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {editingDoc && (
        <DocEditorModal file={editingDoc} onSave={handleSaveDocContent} onClose={() => setEditingDoc(null)} />
      )}
    </div>
  );
};


// ── Main Component ────────────────────────────────────────
export default function OnboardingOperacional() {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [detailTask, setDetailTask] = useState<OnboardingTask | null>(null);
  const [detailSubtask, setDetailSubtask] = useState<{subtask: Subtask, task: OnboardingTask} | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding-tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const groups: StatusGroup[] = STATUS_GROUPS.map(sg => ({
    ...sg,
    tasks: tasks.filter(t => t.status_group === sg.id),
  }));

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dark-text">
            Onboarding <span className="text-violet-500">Operacional</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            Gestão de onboarding de clientes
          </p>
        </div>
        <button
          onClick={() => setShowTemplate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Settings size={15} />
          Modelo Padrão
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-8 pb-12">
          {groups.map(group => (
            <GroupBlock
              key={group.id}
              group={group}
              onUpdate={fetchTasks}
              onAddTask={setAddingToGroup}
              onOpenSubtask={(s, t) => setDetailSubtask({subtask: s, task: t})}
              onOpenDetail={setDetailTask}
            />
          ))}

          {/* New status button */}
          <button className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 transition-colors mt-4 px-4 py-2">
            <Plus size={14} />
            Novo status
          </button>
        </div>
      )}

      {/* Add Task Modal */}
      {addingToGroup && (
        <AddTaskModal
          groupId={addingToGroup}
          onClose={() => setAddingToGroup(null)}
          onSaved={fetchTasks}
        />
      )}

      {/* Template Modal */}
      {showTemplate && (
        <TemplateModal onClose={() => setShowTemplate(false)} />
      )}

      {/* Subtask Detail Modal */}
      {detailSubtask && (
        <SubtaskDetailModal
          subtask={detailSubtask.subtask}
          task={detailSubtask.task}
          onClose={() => setDetailSubtask(null)}
          onUpdate={fetchTasks}
        />
      )}

      {/* Task Detail Modal */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onUpdate={fetchTasks}
        />
      )}
    </div>
  );
}
