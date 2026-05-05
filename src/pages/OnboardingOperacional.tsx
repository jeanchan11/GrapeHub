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
const TaskRow = ({ task, onUpdate, onOpenDetail }: { task: OnboardingTask; onUpdate: () => void; onOpenDetail: (t: OnboardingTask) => void }) => {
  const [squad, setSquad] = useState(task.squad || '');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const statusRef = React.useRef<HTMLDivElement>(null);

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

  const currentGroup = STATUS_GROUPS.find(g => g.id === task.status_group);
  const circleColor = currentGroup?.color || '#64748b';
  const completedCount = subtasks.filter(s => s.completed).length;

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
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
            <div className="absolute top-6 left-0 z-50 w-56 bg-[#1C1F26] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              <div className="px-3 pt-3 pb-2 border-b border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</p>
              </div>
              <div className="py-1.5">
                {STATUS_GROUPS.map(sg => {
                  const isActive = sg.id === task.status_group;
                  return (
                    <button key={sg.id} onClick={() => handleStatusChange(sg.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${isActive ? 'bg-white/5' : 'hover:bg-white/[0.04]'}`}>
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sg.color }} />
                      <span className={`text-xs font-semibold flex-1 ${isActive ? 'text-white' : 'text-slate-400'}`}>{sg.label}</span>
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

        {/* More */}
        <button className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300 p-1 rounded">
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Subtasks panel */}
      {expanded && (
        <div className="bg-white/[0.01] border-b border-white/5">
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
                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden ml-1">
                  <div className="h-full bg-violet-500 rounded-full transition-all duration-300"
                    style={{ width: `${subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0}%` }} />
                </div>
              </div>
              {subtasks.map(sub => (
                <button key={sub.id} onClick={() => toggleSubtask(sub)}
                  className="w-full flex items-center gap-3 px-12 py-2 text-left hover:bg-white/[0.02] transition-colors">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    sub.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                  }`}>
                    {sub.completed && <CheckCircle2 size={10} className="text-white" />}
                  </div>
                  <span className={`text-xs ${sub.completed ? 'text-slate-600 line-through' : 'text-slate-300'}`}>
                    {sub.title}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Group Block ───────────────────────────────────────────
const GroupBlock = ({ group, onUpdate, onAddTask, onOpenDetail }: {
  group: StatusGroup;
  onUpdate: () => void;
  onAddTask: (groupId: string) => void;
  onOpenDetail: (t: OnboardingTask) => void;
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
          <div className="flex items-center gap-2 px-10 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest border-b border-white/5">
            <div className="flex-1">Nome</div>
            <div className="w-36">Squad</div>
            <div className="w-20 text-center">Responsável</div>
            <div className="w-24">Data Inicial</div>
            <div className="w-28">Data de Vencimento</div>
            <div className="w-6" />
          </div>

          {/* Task rows */}
          <div className="bg-dark-card/20 rounded-b-xl border-x border-b border-white/5">
            {group.tasks.length === 0 ? (
              <div className="py-8 text-center text-slate-600 text-sm">Nenhum cliente neste grupo.</div>
            ) : (
              group.tasks.map(task => <TaskRow key={task.id} task={task} onUpdate={onUpdate} onOpenDetail={onOpenDetail} />)
            )}
            {/* Add task row */}
            <button
              onClick={() => onAddTask(group.id)}
              className="flex items-center gap-2 px-10 py-3 text-xs text-slate-600 hover:text-slate-400 hover:bg-white/[0.02] w-full transition-colors"
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
      <div className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
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
      <div className="bg-[#1C1F26] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Settings size={16} className="text-violet-400" />
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
                <div key={`${item.id}-${idx}`} className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border border-white/5 rounded-xl group hover:border-white/10 transition-colors">
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
                  <span className="flex-1 text-sm text-slate-300 truncate">{item.title}</span>
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
              className="flex-1 bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            <button onClick={addItem} disabled={!newTitle.trim()}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5">
              <Plus size={14} /> Adicionar
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
          <p className="text-[10px] text-slate-600">{items.length} subtarefa{items.length !== 1 ? 's' : ''} no modelo</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-400 hover:bg-white/5 transition-colors">
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
      <div className="bg-[#1C1F26] border border-white/10 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-base font-bold text-white">{task.client_name}</h2>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">Detalhes do cliente</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Form section */}
          <div className="px-6 py-4 border-b border-white/5">
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
                    className="flex-1 bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
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
                className="flex-1 bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
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
                  <div key={c.id} className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
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

// ── Main Component ────────────────────────────────────────
export default function OnboardingOperacional() {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [detailTask, setDetailTask] = useState<OnboardingTask | null>(null);

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
