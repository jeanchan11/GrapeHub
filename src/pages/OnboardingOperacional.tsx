import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, Calendar, Users, Tag, MoreHorizontal, Circle, CheckCircle2, Loader2 } from 'lucide-react';

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
  { id: 'em-onboarding', label: 'EM ONBOARDING', color: '#6366f1', emoji: '🚀' },
  { id: 'concluido', label: 'CONCLUÍDO', color: '#8b5cf6', emoji: '🎉' },
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
const TaskRow = ({ task, onUpdate }: { task: OnboardingTask; onUpdate: () => void }) => {
  const [squad, setSquad] = useState(task.squad || '');

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

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
      {/* Expand toggle (decorative) */}
      <button className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors">
        <ChevronRight size={14} />
      </button>

      {/* Status circle */}
      <div className="shrink-0 w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-slate-600" />
      </div>

      {/* Client Name + tags */}
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-dark-text truncate">{task.client_name}</span>
        {task.subtask_count > 0 && (
          <span className="text-[10px] text-slate-500 font-mono bg-white/5 px-1.5 py-0.5 rounded">
            ↳ {task.subtask_count}
          </span>
        )}
        {task.tags.map(t => <TagBadge key={t} label={t} />)}
      </div>

      {/* Squad selector */}
      <div className="shrink-0 w-36">
        <select
          value={squad}
          onChange={e => handleSquadChange(e.target.value)}
          className="w-full bg-dark-bg border border-white/10 rounded-lg px-2 py-1 text-xs text-dark-text focus:outline-none focus:border-violet-500/50 transition-colors"
        >
          <option value="">— Squad —</option>
          {SQUAD_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Responsável */}
      <div className="shrink-0 w-20 flex items-center justify-center gap-1">
        {task.responsible_name
          ? <Avatar name={task.responsible_name} url={task.responsible_avatar} size={6} />
          : <div className="w-6 h-6 rounded-full border border-dashed border-slate-600 flex items-center justify-center"><Plus size={10} className="text-slate-600" /></div>
        }
      </div>

      {/* Data Inicial */}
      <div className="shrink-0 w-24 text-xs text-slate-400">
        {task.start_date ? new Date(task.start_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
      </div>

      {/* Data de vencimento */}
      <div className="shrink-0 w-28">
        {formatDate(task.due_date)}
      </div>

      {/* More */}
      <button className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-slate-300 p-1 rounded">
        <MoreHorizontal size={14} />
      </button>
    </div>
  );
};

// ── Group Block ───────────────────────────────────────────
const GroupBlock = ({ group, onUpdate, onAddTask }: {
  group: StatusGroup;
  onUpdate: () => void;
  onAddTask: (groupId: string) => void;
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
              group.tasks.map(task => <TaskRow key={task.id} task={task} onUpdate={onUpdate} />)
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

// ── Main Component ────────────────────────────────────────
export default function OnboardingOperacional() {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);

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
      <div className="px-8 pt-8 pb-4">
        <h1 className="text-2xl font-black tracking-tight text-dark-text">
          Onboarding <span className="text-violet-500">Operacional</span>
        </h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
          Gestão de onboarding de clientes
        </p>
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
            />
          ))}

          {/* New status button */}
          <button className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 transition-colors mt-4 px-4 py-2">
            <Plus size={14} />
            Novo status
          </button>
        </div>
      )}

      {/* Modal */}
      {addingToGroup && (
        <AddTaskModal
          groupId={addingToGroup}
          onClose={() => setAddingToGroup(null)}
          onSaved={fetchTasks}
        />
      )}
    </div>
  );
}
