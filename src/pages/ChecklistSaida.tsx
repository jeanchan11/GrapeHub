import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ChevronDown, ChevronRight, Calendar, Users, Tag, MoreHorizontal, Circle, CheckCircle2, Loader2, X, Trash2, GripVertical, Settings, FileText, Link as LinkIcon, Save, Heading1, Heading2, Heading3, Type, List, ListOrdered, CheckSquare, Check } from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';

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
  meeting_info: string | null;
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
  description?: string;
  internal_doc?: string;
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
  { id: 'saida', label: 'Saída', color: '#8b5cf6', emoji: '🚪' },
  { id: 'realizada',  label: 'Realizada',  color: '#10b981', emoji: '✅' },
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
const Avatar = ({ url, name, size = 6 }: { url?: string; name?: string; size?: number }) => {
  const [error, setError] = React.useState(false);
  const initials = (name || '??').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const sz = `w-${size} h-${size}`;
  if (url && !error) {
    return <img src={url} alt={name || ''} onError={() => setError(true)} className={`${sz} rounded-full object-cover border border-white/10`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-[9px] font-bold text-violet-300`}>
      {initials}
    </div>
  );
};

// ── SingleDatePicker ──────────────────────────────────────
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEK_DAYS  = ['D','S','T','Q','Q','S','S'];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m - 1, 1).getDay(); }

function SingleDatePicker({ value, onChange, placeholder = '—', align = 'right', checkOverdue = false }: { value?: string | null, onChange: (iso: string) => void, placeholder?: string, align?: 'left' | 'right' | 'center', checkOverdue?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const btnRef = React.useRef<HTMLButtonElement>(null);

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const safeValue = (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10)))
    ? value.slice(0, 10) : '';

  const [viewYear, setViewYear] = React.useState<number>(() => {
    if (safeValue) { const y = parseInt(safeValue.slice(0, 4)); if (!isNaN(y)) return y; }
    return today.getFullYear();
  });
  const [viewMonth, setViewMonth] = React.useState<number>(() => {
    if (safeValue) { const m = parseInt(safeValue.slice(5, 7)); if (!isNaN(m) && m >= 1 && m <= 12) return m; }
    return today.getMonth() + 1;
  });

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest('[data-sdp-portal]') && !target.closest('[data-sdp-trigger]')) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const popupW = 264;
      let left = align === 'right' ? rect.right - popupW : rect.left;
      if (left < 8) left = 8;
      if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
      const popupH = 320;
      const top = (window.innerHeight - rect.bottom) < popupH ? rect.top - popupH - 4 : rect.bottom + 4;
      setPos({ top, left });
    }
    setOpen(o => !o);
  }

  function stepMonth(dir: 1 | -1) {
    let m = viewMonth + dir, y = viewYear;
    if (m > 12) { m = 1; y++; }
    else if (m < 1) { m = 12; y--; }
    setViewYear(y);
    setViewMonth(m);
  }

  const numDays = Math.max(1, daysInMonth(viewYear, viewMonth));
  const firstDay = Math.max(0, Math.min(6, firstDayOfMonth(viewYear, viewMonth)));
  const cells: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: numDays }, (_, i) => isoDate(viewYear, viewMonth, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const displayVal = safeValue
    ? new Date(safeValue + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : placeholder;

  const isOverdue = checkOverdue && safeValue ? safeValue < todayIso : false;

  const popup = open ? (
    <div
      data-sdp-portal
      onClick={e => e.stopPropagation()}
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, width: 264 }}
      className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-4"
    >
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between">
        <span>Selecionar Data</span>
        {safeValue && (
          <button onClick={() => { onChange(''); setOpen(false); }} className="text-rose-400 hover:text-rose-300 normal-case text-[10px]">Limpar</button>
        )}
      </p>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => stepMonth(-1)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
          <ChevronDown size={13} className="text-slate-400 rotate-90" />
        </button>
        <span className="text-sm font-bold text-dark-text">{MESES_FULL[viewMonth - 1]} {viewYear}</span>
        <button onClick={() => stepMonth(1)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
          <ChevronDown size={13} className="text-slate-400 -rotate-90" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map((d, i) => <div key={i} className="text-center text-[10px] font-bold text-slate-500 pb-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((iso, idx) => {
          if (!iso) return <div key={`empty-${idx}`} />;
          const isSelected = iso === safeValue;
          const isToday = iso === todayIso;
          return (
            <button key={iso}
              onClick={() => { onChange(iso); setOpen(false); }}
              className={`relative h-8 w-full text-xs font-semibold transition-all rounded-full
                ${isSelected ? 'text-white' : 'text-dark-text hover:text-violet-600 hover:bg-white/5'}`}
            >
              <span className={`absolute inset-0.5 flex items-center justify-center rounded-full text-xs
                ${isSelected ? 'bg-violet-600 shadow-md shadow-violet-500/30' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-violet-500/60' : ''}`}>
                {parseInt(iso.slice(8))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button ref={btnRef} data-sdp-trigger onClick={toggleOpen}
        className={`w-full text-left focus:outline-none transition-colors font-semibold
          ${isOverdue
            ? 'text-rose-500 hover:text-rose-400'
            : 'text-slate-400 hover:text-violet-400 font-normal'
          }`}
      >
        {isOverdue && safeValue ? (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            {displayVal}
          </span>
        ) : displayVal}
      </button>
      {typeof document !== 'undefined' && createPortal(popup, document.body)}
    </>
  );
}

let cachedUsers: any[] = [];
let fetchUsersPromise: Promise<void> | null = null;
const fetchUsersOnce = () => {
  if (fetchUsersPromise) return fetchUsersPromise;
  fetchUsersPromise = fetch('/api/users').then(r => r.json()).then(data => { cachedUsers = data; }).catch(() => {});
  return fetchUsersPromise;
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [subtaskRespPicker, setSubtaskRespPicker] = useState<number | null>(null);
  const [taskRespPicker, setTaskRespPicker] = useState(false);
  const [taskRespPos, setTaskRespPos] = useState({ top: 0, left: 0 });
  const [subtaskRespPos, setSubtaskRespPos] = useState({ top: 0, left: 0 });
  const statusRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const respRef = React.useRef<HTMLDivElement>(null);
  const taskRespRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => { fetchUsersOnce(); }, []);

  useEffect(() => {
    if (!taskRespPicker) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-task-resp-portal]') && !target.closest('[data-task-resp-btn]')) {
        setTaskRespPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [taskRespPicker]);

  useEffect(() => {
    if (!subtaskRespPicker) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-sub-resp-portal]') && !target.closest('[data-sub-resp-btn]')) {
        setSubtaskRespPicker(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [subtaskRespPicker]);

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
        setConfirmDelete(false);
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

  const handleSubtaskResponsible = async (subId: number, userId: string, userName: string, userAvatar: string) => {
    setSubtaskRespPicker(null);
    setSubtasks(prev => prev.map(s => s.id === subId ? { ...s, responsible_id: userId, responsible_name: userName, responsible_avatar: userAvatar } : s));
    try {
      await fetch(`/api/onboarding-subtasks/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsible_id: userId, responsible_name: userName, responsible_avatar: userAvatar }),
      });
    } catch { /* silent */ }
  };

  const handleTaskResponsible = async (userId: string, userName: string, userAvatar: string) => {
    setTaskRespPicker(false);
    try {
      await fetch(`/api/onboarding-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsible_id: userId, responsible_name: userName, responsible_avatar: userAvatar }),
      });
      onUpdate();
    } catch { /* silent */ }
  };

  const handleTaskDate = async (field: 'start_date' | 'due_date', val: string) => {
    try {
      await fetch(`/api/onboarding-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: val }),
      });
      onUpdate();
    } catch { /* silent */ }
  };

  const handleSubtaskDate = async (subId: number, field: 'start_date' | 'due_date', val: string) => {
    setSubtasks(prev => prev.map(s => s.id === subId ? { ...s, [field]: val } : s));
    try {
      await fetch(`/api/onboarding-subtasks/${subId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: val }),
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
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setShowMenu(false);
    setConfirmDelete(false);
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
      <div className="flex items-center gap-2 px-8 py-3 border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
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

        {/* Client/Collaborator Name + subtask count */}
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
            className={`w-[calc(100%+0.75rem)] -ml-3 border rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none ${
              squad === 'Squad Able' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30 focus:border-blue-500/50' :
              squad === 'Squad Baker' ? 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30 focus:border-fuchsia-500/50' :
              'bg-white/5 text-slate-400 border-white/10 focus:border-white/20'
            }`}
          >
            <option value="" className="bg-dark-bg text-slate-400">— SQUAD —</option>
            {SQUAD_OPTIONS.map(s => <option key={s} value={s} className="bg-dark-bg text-dark-text">{s}</option>)}
          </select>
        </div>

        {/* Responsável */}
        <div className="shrink-0 w-20 flex items-center justify-center gap-1">
          {task.responsible_name ? (
            <button
              ref={taskRespRef}
              data-task-resp-btn
              onClick={(e) => {
                e.stopPropagation();
                if (!taskRespPicker && taskRespRef.current) {
                  const rect = taskRespRef.current.getBoundingClientRect();
                  setTaskRespPos({ top: rect.bottom + 4, left: rect.left - 140 });
                }
                setTaskRespPicker(v => !v);
              }}
              className="focus:outline-none hover:scale-110 transition-transform"
            >
              <Avatar name={task.responsible_name} url={task.responsible_avatar} size={6} />
            </button>
          ) : (
            <button
              ref={taskRespRef}
              data-task-resp-btn
              onClick={(e) => {
                e.stopPropagation();
                if (!taskRespPicker && taskRespRef.current) {
                  const rect = taskRespRef.current.getBoundingClientRect();
                  setTaskRespPos({ top: rect.bottom + 4, left: rect.left - 140 });
                }
                setTaskRespPicker(v => !v);
              }}
              className="w-6 h-6 rounded-full border border-dashed border-slate-600 flex items-center justify-center hover:border-violet-500 hover:text-violet-500 transition-colors"
            >
              <Plus size={10} className="text-slate-600 hover:text-violet-500" />
            </button>
          )}
          {taskRespPicker && createPortal(
            <div
              data-task-resp-portal
              onClick={e => e.stopPropagation()}
              style={{ position: 'fixed', top: taskRespPos.top, left: taskRespPos.left, zIndex: 9999, width: 192 }}
              className="bg-dark-card border border-black/10 dark:border-white/10 rounded-xl shadow-2xl p-1 max-h-48 overflow-y-auto"
            >
              <div className="px-2 py-1.5 border-b border-white/5 mb-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Selecionar Responsável</span>
              </div>
              {cachedUsers.map(u => (
                <button key={u.id} onClick={(e) => { e.stopPropagation(); handleTaskResponsible(u.id, u.name, u.picture); }} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg text-left transition-colors">
                  <Avatar name={u.name} url={u.picture} size={5} />
                  <span className="text-xs text-dark-text truncate">{u.name}</span>
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>

        {/* Data Inicial */}
        <div className="shrink-0 w-24 text-xs text-slate-400 font-medium">
          <SingleDatePicker value={task.start_date || undefined} onChange={(v) => handleTaskDate('start_date', v)} align="left" />
        </div>

        {/* Data de vencimento */}
        <div className="shrink-0 w-28 text-xs text-slate-400 font-medium">
          <SingleDatePicker value={task.due_date || undefined} onChange={(v) => handleTaskDate('due_date', v)} align="right" checkOverdue />
        </div>

        {/* More */}
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                Concluir Colaborador
              </button>
              <div className="h-px bg-black/5 dark:bg-white/5 mx-2" />
              {confirmDelete ? (
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors"
                >
                  <Trash2 size={13} />
                  Confirmar exclusão?
                </button>
              ) : (
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 size={13} />
                  Excluir
                </button>
              )}
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
                  className="w-full flex items-center gap-2 px-8 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors border-b border-black/[0.06] dark:border-white/[0.06] last:border-none">
                  <div className="w-[14px] shrink-0" />
                  <div className="w-4 shrink-0 flex items-center justify-center">
                    <button onClick={() => toggleSubtask(sub)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${sub.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                      {sub.completed && <CheckCircle2 size={10} className="text-white" />}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0 flex items-center pl-1">
                    <button onClick={() => onOpenSubtask(sub, task)}
                      className={`text-left text-xs hover:text-violet-500 transition-colors truncate ${sub.completed ? 'text-slate-600 line-through' : 'text-dark-text'}`}>
                      {sub.title}
                    </button>
                  </div>
                  <div className="shrink-0 w-36" />
                  
                  {/* Responsável da Subtarefa */}
                  <div className="shrink-0 w-20 flex items-center justify-center gap-1">
                    {sub.responsible_name ? (
                      <button
                        data-sub-resp-btn
                        onClick={(e) => {
                          e.stopPropagation();
                          if (subtaskRespPicker !== sub.id) {
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            setSubtaskRespPos({ top: rect.bottom + 4, left: rect.left - 140 });
                          }
                          setSubtaskRespPicker(subtaskRespPicker === sub.id ? null : sub.id);
                        }}
                        className="focus:outline-none hover:scale-110 transition-transform"
                      >
                        <Avatar name={sub.responsible_name} url={sub.responsible_avatar} size={5} />
                      </button>
                    ) : (
                      <button
                        data-sub-resp-btn
                        onClick={(e) => {
                          e.stopPropagation();
                          if (subtaskRespPicker !== sub.id) {
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                            setSubtaskRespPos({ top: rect.bottom + 4, left: rect.left - 140 });
                          }
                          setSubtaskRespPicker(subtaskRespPicker === sub.id ? null : sub.id);
                        }}
                        className="w-5 h-5 rounded-full border border-dashed border-slate-600 flex items-center justify-center hover:border-violet-500 hover:text-violet-500 transition-colors"
                      >
                        <Plus size={8} className="text-slate-600 hover:text-violet-500" />
                      </button>
                    )}
                    {subtaskRespPicker === sub.id && createPortal(
                      <div
                        data-sub-resp-portal
                        onClick={e => e.stopPropagation()}
                        style={{ position: 'fixed', top: subtaskRespPos.top, left: subtaskRespPos.left, zIndex: 9999, width: 192 }}
                        className="bg-dark-card border border-black/10 dark:border-white/10 rounded-xl shadow-2xl p-1 max-h-48 overflow-y-auto"
                      >
                        <div className="px-2 py-1.5 border-b border-white/5 mb-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Selecionar Responsável</span>
                        </div>
                        {cachedUsers.map(u => (
                          <button key={u.id} onClick={() => handleSubtaskResponsible(sub.id, u.id, u.name, u.picture)} className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg text-left transition-colors">
                            <Avatar name={u.name} url={u.picture} size={5} />
                            <span className="text-xs text-dark-text truncate">{u.name}</span>
                          </button>
                        ))}
                      </div>,
                      document.body
                    )}
                  </div>
                  
                  <div className="shrink-0 w-24" />
                  <div className="shrink-0 w-28 text-xs text-slate-500 text-left pl-2 font-medium">
                    <SingleDatePicker value={sub.due_date || undefined} onChange={(v) => handleSubtaskDate(sub.id, 'due_date', v)} align="right" checkOverdue />
                  </div>
                  <div className="shrink-0 w-[22px]" />
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
  const [expanded, setExpanded] = useState(group.tasks.length > 0);

  return (
    <div className="mb-6 bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
      {/* Group header */}
      <div className="flex items-center gap-3 px-6 py-4 bg-dark-card border-b border-black/8 dark:border-white/5 sticky top-0 z-10">
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 group flex-1">
          <div
            className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-transform group-hover:scale-105"
            style={{ background: `${group.color}15`, color: group.color, border: `1px solid ${group.color}30` }}
          >
            <span>{group.emoji}</span>
            <span>{group.label}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/10">{group.tasks.length}</span>
          </div>
          {expanded
            ? <ChevronDown size={14} className="text-slate-500 ml-2" />
            : <ChevronRight size={14} className="text-slate-500 ml-2" />
          }
        </button>
      </div>

      {/* Column headers */}
      {expanded && (
        <>
          <div className="flex items-center gap-2 px-8 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-black/[0.04] dark:bg-black/20 border-b border-black/[0.07] dark:border-white/5">
            <div className="w-[14px] shrink-0" />
            <div className="w-4 shrink-0" />
            <div className="flex-1">Nome</div>
            <div className="shrink-0 w-36">Squad</div>
            <div className="shrink-0 w-20 text-center">Resp.</div>
            <div className="shrink-0 w-24">Data Inicial</div>
            <div className="shrink-0 w-28">Vencimento</div>
            <div className="shrink-0 w-[22px]" />
          </div>

          <div className="flex flex-col">
            {group.tasks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-medium">Nenhum colaborador neste grupo.</div>
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
              Adicionar Colaborador
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
        body: JSON.stringify({ 
          client_name: clientName, 
          squad, 
          start_date: startDate || null, 
          due_date: dueDate || null, 
          status_group: groupId,
          type: 'saida'
        }),
      });
      onSaved();
      onClose();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-dark-text mb-4">Adicionar Colaborador ao Checklist</h3>
        <div className="space-y-3">
          <input
            value={clientName} onChange={e => setClientName(e.target.value)}
            placeholder="Nome do colaborador *"
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
    fetch('/api/onboarding-template?type=saida')
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
        body: JSON.stringify({ 
          items: items.map(i => ({ title: i.title, description: i.description || null, internal_doc: i.internal_doc || null })),
          type: 'saida'
        }),
      });
      onClose();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const [selectedItem, setSelectedItem] = useState<TemplateItem | null>(null);

  const updateItem = (idx: number, updates: Partial<TemplateItem>) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
    if (selectedItem && items[idx]?.id === selectedItem.id) {
      setSelectedItem(prev => prev ? { ...prev, ...updates } : prev);
    }
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
            <p className="text-[10px] text-slate-500 mt-0.5">Subtarefas criadas automaticamente para cada novo colaborador</p>
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
                <div key={`${item.id}-${idx}`} className="flex items-center gap-2 px-3 py-2.5 bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 rounded-xl group hover:border-violet-500/30 dark:hover:border-violet-500/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedItem({ ...item, order_index: idx })}>
                  <span className="text-[10px] font-bold text-slate-600 w-5 text-center shrink-0">{idx + 1}</span>
                  <div className="flex flex-col gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
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
                  {item.internal_doc && (
                    <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-400 text-[8px] font-bold rounded uppercase tracking-widest shrink-0">Com conteúdo</span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
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

      {/* Template Item Detail Modal */}
      {selectedItem && (() => {
        const itemIdx = items.findIndex(i => i.id === selectedItem.id);
        if (itemIdx === -1) return null;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
            <div className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                <div>
                  <h2 className="text-lg font-bold text-dark-text">{selectedItem.title}</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">
                    Modelo de subtarefa — o conteúdo aqui será copiado para cada novo colaborador
                  </p>
                </div>
                <button onClick={() => setSelectedItem(null)} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-[1fr_300px] gap-6">
                {/* Left column */}
                <div className="space-y-6">
                  {/* Internal Document */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <FileText size={12} className="text-violet-500" /> Documento Interno
                      </h3>
                    </div>
                    <div className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl min-h-[300px] overflow-hidden">
                      <RichTextEditor
                        content={items[itemIdx]?.internal_doc || ''}
                        onChange={(html) => updateItem(itemIdx, { internal_doc: html })}
                      />
                    </div>
                  </div>
                </div>

                {/* Right column - Info */}
                <div className="space-y-4">
                  <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl">
                    <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-2">ℹ️ Sobre o modelo</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      O conteúdo adicionado aqui (documento interno) será automaticamente copiado para cada subtarefa quando um novo colaborador for criado.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/5 flex items-center justify-end gap-3">
                <button onClick={() => setSelectedItem(null)}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-bold text-white transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ── Task Detail Modal ─────────────────────────────────────
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
  const [meetingInfo, setMeetingInfo] = useState(task.meeting_info || '');
  const [meetingInfoSaving, setMeetingInfoSaving] = useState(false);
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
    { key: 'telefone_whatsapp', label: 'Telefone (WhatsApp)' },
    { key: 'cnpj_cpf', label: 'CPF' },
    { key: 'cep', label: 'CEP' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'uf', label: 'UF' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/5 dark:border-white/5">
          <div>
            <h2 className="text-base font-bold text-dark-text">{task.client_name}</h2>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest">Detalhes do colaborador</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetch(`/api/onboarding-tasks/${task.id}/archive`, { method: 'POST' })
                  .then(() => { onUpdate(); onClose(); });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-bold rounded-lg transition-colors border border-emerald-500/20"
            >
              <Check size={14} />
              Concluir Saída
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-dark-text hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column: Form Fields */}
          <div className="w-[50%] flex flex-col border-r border-black/5 dark:border-white/5 overflow-y-auto p-6">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
              <List size={14} className="text-violet-500" />
              Ficha do Colaborador
            </h3>
            <div className="space-y-4">
              {FIELDS.map(f => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">{f.label}</label>
                  <input
                    value={(form as any)[f.key]}
                    onChange={e => updateField(f.key, e.target.value)}
                    placeholder={`Digite o ${f.label.toLowerCase()}`}
                    className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
              ))}
              {formDirty && (
                <button onClick={saveForm} disabled={saving} className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Salvar Alterações
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Comments & Notes */}
          <div className="w-[50%] flex flex-col overflow-y-auto p-6 bg-black/[0.01] dark:bg-white/[0.01]">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckSquare size={14} className="text-violet-500" />
              Anotações e Observações
            </h3>

            {/* New comment */}
            <div className="flex gap-2 mb-6">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
                placeholder="Escreva uma anotação..."
                className="flex-1 bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
              <button onClick={addComment} disabled={!newComment.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 text-white text-xs font-bold rounded-xl transition-colors">
                Enviar
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <Loader2 size={16} className="animate-spin text-slate-600" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-slate-600 text-xs py-8 border border-dashed border-black/10 dark:border-white/10 rounded-xl">Nenhuma anotação ainda.</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="bg-dark-bg border border-black/5 dark:border-white/5 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-violet-400">
                        {c.author_name || 'Usuário'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{c.text}</p>
                  </div>
                ))
              )}
            </div>
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

const SubtaskDetailModal = ({ subtask, task, onClose, onUpdate }: { subtask: any; task: any; onClose: () => void; onUpdate: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  
  const [description, setDescription] = useState(subtask.description || '');
  const [descSaving, setDescSaving] = useState(false);

  const rawDoc = subtask.internal_doc || '';
  const isOldMarkdown = rawDoc.trim().startsWith('#') || rawDoc.includes('- [ ]');
  const [internalDoc, setInternalDoc] = useState(isOldMarkdown ? '' : rawDoc);
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
      <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
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
              {/* Internal Doc Editor */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={12} className="text-violet-500" />
                    Documento Interno
                  </h3>
                  {internalDoc !== (subtask.internal_doc || '') && (
                    <button onClick={handleSaveInternalDoc} disabled={internalDocSaving} className="text-[10px] font-bold text-violet-400 hover:text-violet-300">
                      {internalDocSaving ? 'Salvando...' : 'Salvar Documento'}
                    </button>
                  )}
                </div>
                <RichTextEditor 
                  content={internalDoc} 
                  onChange={setInternalDoc} 
                  placeholder="Escreva anotações ou dados importantes aqui... Pressione '/' para comandos" 
                />
              </div>

              {/* Arquivos e Docs */}
              <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5">
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
export default function ChecklistSaida() {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [detailTask, setDetailTask] = useState<OnboardingTask | null>(null);
  const [detailSubtask, setDetailSubtask] = useState<{subtask: Subtask, task: OnboardingTask} | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding-tasks?type=saida');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchTasks(); }, []);

  const activeGroups = showCompleted 
    ? [{ id: 'arquivado', label: 'CONCLUÍDO', color: '#10b981', emoji: '🏆' }, ...STATUS_GROUPS]
    : STATUS_GROUPS;

  const groups: StatusGroup[] = activeGroups.map(sg => ({
    ...sg,
    tasks: tasks.filter(t => t.status_group === sg.id),
  }));

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dark-text">
            Checklist de <span className="text-violet-500">Saída</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            Gestão e checklist de saída de colaboradores
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-4 py-2 text-[11px] font-bold rounded-xl transition-colors border flex items-center gap-2 ${
              showCompleted 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-dark-card text-slate-400 border-black/10 dark:border-white/10 hover:bg-black/20 dark:hover:bg-white/5'
            }`}
          >
            <Check size={14} />
            {showCompleted ? 'Ocultar Concluídos' : 'Mostrar Concluídos'}
          </button>
          <button
            onClick={() => setShowTemplate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-black/10 dark:border-white/10 hover:border-violet-500/30 text-dark-text text-[11px] font-bold rounded-xl transition-colors"
          >
            <Settings size={14} className="text-violet-500" />
            Editar Modelo Padrão
          </button>
        </div>
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
