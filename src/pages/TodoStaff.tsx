import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, X, Check, Clock, AlertCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Trash2, Edit3, MoreHorizontal, Search, RefreshCw, Repeat,
  Circle, CheckCircle2, Tag, CalendarDays, MessageSquare, ListChecks, Send, GripVertical,
  Lightbulb, Star, Sparkles
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status = 'todo' | 'in_progress' | 'done';

interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
}

interface TodoItem {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  tags: string[];
  assignee?: string;
  dueDate?: string;   // YYYY-MM-DD
  subtasks: Subtask[];
  comments: Comment[];
  createdAt: string;
  doneAt?: string;
}

interface RecurringItem {
  id: string;
  title: string;
  assignee?: string;
  tags: string[];
  frequency: 'diario' | 'semanal' | 'mensal';
  dayOfWeek?: string;   // só para semanal
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { id: Status; label: string; color: string; icon: React.ReactNode }[] = [
  { id: 'todo',        label: 'A Fazer',      color: 'from-slate-500/20 to-slate-600/10',     icon: <Clock size={13} />       },
  { id: 'in_progress', label: 'Em Progresso',  color: 'from-violet-500/20 to-violet-600/10',   icon: <AlertCircle size={13} /> },
  { id: 'done',        label: 'Concluído',     color: 'from-emerald-500/20 to-emerald-600/10', icon: <Check size={13} />       },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string }> = {
  low:    { label: 'Baixa',   color: 'text-slate-400',  dot: 'bg-slate-400'  },
  medium: { label: 'Média',   color: 'text-amber-400',  dot: 'bg-amber-400'  },
  high:   { label: 'Alta',    color: 'text-orange-400', dot: 'bg-orange-400' },
  urgent: { label: 'Urgente', color: 'text-red-400',    dot: 'bg-red-400'    },
};

const FREQ_CONFIG: Record<RecurringItem['frequency'], { label: string; color: string }> = {
  diario:   { label: 'Diário',   color: 'bg-blue-500/15 text-blue-400 border-blue-500/20'   },
  semanal:  { label: 'Semanal',  color: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  mensal:   { label: 'Mensal',   color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
};

const MEMBERS = ['Jean', 'Ana', 'Carlos', 'Mariana', 'Felipe', 'Lucia'];
const AVAILABLE_TAGS = ['Marketing', 'Financeiro', 'RH', 'Operacional', 'Comercial', 'Tech', 'Reunião', 'Urgente'];

const STORAGE_KEY   = 'grapehub_todo_staff';
const STORAGE_REC   = 'grapehub_recurring_staff';
const STORAGE_TAGS  = 'grapehub_todo_staff_tags';
const STORAGE_IDEAS = 'grapehub_ideas_staff';

// ── Ideas system types ────────────────────────────────────────────────────────

type IdeaStatus = 'nova' | 'analise' | 'aprovada' | 'favorita';

interface IdeaItem {
  id: string;
  title: string;
  description?: string;
  status: IdeaStatus;
  tags: string[];
  comments: Comment[];
  createdAt: string;
}

const IDEA_COLUMNS: { id: IdeaStatus; label: string; color: string; icon: React.ReactNode; accent: string }[] = [
  { id: 'nova',     label: 'Novas Ideias', color: 'from-violet-500/20 to-violet-600/10',  icon: <Lightbulb size={13} />,  accent: 'hover:text-violet-500 hover:bg-violet-500/10'   },
  { id: 'analise',  label: 'Em Análise',   color: 'from-amber-500/20 to-amber-600/10',    icon: <Search size={13} />,     accent: 'hover:text-amber-400 hover:bg-amber-500/10'     },
  { id: 'aprovada', label: 'Aprovadas',    color: 'from-emerald-500/20 to-emerald-600/10',icon: <Check size={13} />,      accent: 'hover:text-emerald-400 hover:bg-emerald-500/10' },
  { id: 'favorita', label: 'Favoritas',    color: 'from-pink-500/20 to-pink-600/10',      icon: <Star size={13} />,       accent: 'hover:text-pink-400 hover:bg-pink-500/10'       },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).substring(2, 11);

function load<T>(key: string): T[] {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch { return []; }
}
function save<T>(key: string, data: T[]) { localStorage.setItem(key, JSON.stringify(data)); }

// Global tag list (string array, saved to localStorage)
const loadGlobalTags = (): string[] => {
  try { const r = localStorage.getItem(STORAGE_TAGS); return r ? JSON.parse(r) : [...AVAILABLE_TAGS]; } catch { return [...AVAILABLE_TAGS]; }
};
const saveGlobalTags = (tags: string[]) => localStorage.setItem(STORAGE_TAGS, JSON.stringify(tags));

// ─── Priority Dot ─────────────────────────────────────────────────────────────

const PriorityDot = ({ priority }: { priority: Priority }) => {
  const cfg = PRIORITY_CONFIG[priority];
  return <span title={cfg.label} className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />;
};

const TagPill = ({ label, onRemove }: { label: string; onRemove?: () => void }) => (
  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/15 text-violet-500 border border-violet-500/25">
    {label}
    {onRemove && <button onClick={onRemove} className="hover:text-red-400 transition-colors"><X size={9} /></button>}
  </span>
);

// Drag-and-drop insert indicator
const DropLine = () => (
  <div className="relative flex items-center my-0.5 mx-1">
    <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 -ml-1" />
    <div className="flex-1 h-0.5 bg-violet-500 rounded-full shadow-sm shadow-violet-500/40" />
  </div>
);

// ─── DatePicker Calendar ──────────────────────────────────────────────────────

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT   = ['D','S','T','Q','Q','S','S'];

const toYMD = (d: Date) => d.toISOString().split('T')[0];

interface DatePickerProps {
  value: string;          // YYYY-MM-DD or ''
  onChange: (v: string) => void;
  placeholder?: string;
}

const DatePickerCalendar: React.FC<DatePickerProps> = ({ value, onChange, placeholder = 'Selecionar data' }) => {
  const [open, setOpen] = useState(false);
  const ref  = useRef<HTMLDivElement>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parsed   = value ? new Date(value + 'T12:00:00') : null;
  const [view, setView] = useState<Date>(parsed ?? new Date());
  const viewYear  = view.getFullYear();
  const viewMonth = view.getMonth();

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];

  const select = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    onChange(toYMD(d));
    setOpen(false);
  };

  const shortcut = (offset: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    onChange(toYMD(d));
    setOpen(false);
  };

  const prevMonth = () => setView(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setView(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const displayLabel = parsed
    ? parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : placeholder;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={`w-full flex items-center gap-2 bg-dark-card border rounded-xl px-3 py-2.5 text-sm transition-all ${
          open ? 'border-violet-500/50 bg-violet-500/5' : 'border-dark-text/10 hover:border-dark-text/20'
        }`}
      >
        <CalendarDays size={13} className={value ? 'text-violet-500' : 'text-dark-text/40'} />
        <span className={value ? 'text-dark-text' : 'text-dark-text/40'}>{displayLabel}</span>
        {value && (
          <button
            type="button"
            onMouseDown={e => { e.stopPropagation(); onChange(''); }}
            className="ml-auto text-dark-text/40 hover:text-red-400 transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-dark-card border border-dark-text/10 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
          {/* Shortcuts */}
          <div className="px-4 pt-3 pb-2 border-b border-dark-text/5">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Atalho rápido</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Hoje',         offset: 0 },
                { label: 'Amanhã',       offset: 1 },
                { label: 'Em 3 dias',    offset: 3 },
                { label: 'Próx. semana', offset: 7 },
              ].map(s => (
                <button
                  key={s.label}
                  onMouseDown={e => { e.preventDefault(); shortcut(s.offset); }}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-dark-text/5 text-dark-text/50 hover:bg-violet-500/15 hover:text-violet-500 border border-dark-text/5 transition-all"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <button onMouseDown={e => { e.preventDefault(); prevMonth(); }} className="w-6 h-6 rounded-lg flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-all">
              <ChevronLeft size={13} />
            </button>
            <span className="text-xs font-bold text-dark-text">{MONTHS_PT[viewMonth]} {viewYear}</span>
            <button onMouseDown={e => { e.preventDefault(); nextMonth(); }} className="w-6 h-6 rounded-lg flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-all">
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 mb-1">
            {DAYS_PT.map((d, i) => (
              <div key={i} className="text-center text-[9px] font-bold text-dark-text/40 uppercase py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const cellDate = new Date(viewYear, viewMonth, day);
              const isSelected = value === toYMD(cellDate);
              const isToday    = toYMD(cellDate) === toYMD(today);
              const isPast     = cellDate < today;
              return (
                <button
                  key={i}
                  onMouseDown={e => { e.preventDefault(); select(day); }}
                  className={`w-full aspect-square rounded-full text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                      : isToday
                      ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                      : isPast
                      ? 'text-dark-text/30 hover:bg-dark-text/5'
                      : 'text-dark-text hover:bg-violet-500/10 hover:text-violet-500'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── TODO Modal ───────────────────────────────────────────────────────────────

interface TodoModalProps {
  initial?: Partial<TodoItem>;
  allColumns: typeof COLUMNS;
  globalTags: string[];
  onTagCreated: (tag: string) => void;
  onSave: (item: Omit<TodoItem, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const TodoModal: React.FC<TodoModalProps> = ({ initial, allColumns, globalTags, onTagCreated, onSave, onClose }) => {
  const [title, setTitle]         = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriority]   = useState<Priority>(initial?.priority ?? 'medium');
  const [status, setStatus]       = useState<Status>(initial?.status ?? 'todo');
  const [dueDate, setDueDate]     = useState(initial?.dueDate ?? '');
  const [tags, setTags]           = useState<string[]>(initial?.tags ?? []);
  const [subtasks, setSubtasks]   = useState<Subtask[]>(initial?.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState('');
  const [subDragFrom, setSubDragFrom] = useState<number | null>(null);
  const [subDragOver, setSubDragOver] = useState<number | null>(null);
  const [tagSearch, setTagSearch] = useState('');
  const [tagDropOpen, setTagDropOpen] = useState(false);
  const tagDropRef = useRef<HTMLDivElement>(null);

  const addSubtask = () => {
    const v = newSubtask.trim();
    if (!v) return;
    setSubtasks(p => [...p, { id: uid(), title: v, done: false }]);
    setNewSubtask('');
  };

  const removeSubtask = (id: string) => setSubtasks(p => p.filter(s => s.id !== id));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagDropRef.current && !tagDropRef.current.contains(e.target as Node)) setTagDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTag = (t: string) =>
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const createAndAdd = () => {
    const v = tagSearch.trim();
    if (!v) return;
    if (!globalTags.includes(v)) onTagCreated(v);
    if (!tags.includes(v)) setTags(prev => [...prev, v]);
    setTagSearch('');
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim() || undefined, priority, status, tags, dueDate: dueDate || undefined, subtasks: subtasks.filter(s => s.title.trim()), comments: initial?.comments ?? [] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-dark-bg rounded-3xl border border-dark-text/10 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-dark-text">{initial?.id ? 'Editar ' : 'Nova '}<span className="text-violet-500">Tarefa</span></h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-all"><X size={16} /></button>
        </div>

        <div>
          <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Título *</label>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="O que precisa ser feito?"
            className="w-full bg-dark-card border border-dark-text/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/50 transition-all" />
        </div>

        <div>
          <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Descrição</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes opcionais..." rows={2}
            className="w-full bg-dark-card border border-dark-text/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/50 transition-all resize-none" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Prioridade</label>
            <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
              className="w-full bg-dark-card border border-dark-text/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer">
              {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => <option key={p} value={p} className="bg-dark-bg">{PRIORITY_CONFIG[p].label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as Status)}
              className="w-full bg-dark-card border border-dark-text/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer">
              {allColumns.map(c => <option key={c.id} value={c.id} className="bg-dark-bg">{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Prazo</label>
            <DatePickerCalendar value={dueDate} onChange={setDueDate} placeholder="Sem prazo" />
          </div>
        </div>

        {/* Tags — dropdown estilo CRM Comercial */}
        <div ref={tagDropRef} className="relative">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Tags</label>

          {/* Selected pills */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map(t => <TagPill key={t} label={t} onRemove={() => toggleTag(t)} />)}
            </div>
          )}

          {/* Input trigger */}
          <div
            className="flex items-center gap-2 bg-dark-card border border-dark-text/10 rounded-xl px-3 py-2 cursor-text focus-within:border-violet-500/50 transition-all"
            onClick={() => setTagDropOpen(true)}
          >
            <Tag size={13} className="text-dark-text/40 flex-shrink-0" />
            <input
              value={tagSearch}
              onChange={e => { setTagSearch(e.target.value); setTagDropOpen(true); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createAndAdd(); } }}
              placeholder="Buscar ou criar tag..."
              className="bg-transparent text-sm text-dark-text placeholder-dark-text/30 focus:outline-none flex-1"
            />
          </div>

          {/* Dropdown */}
          {tagDropOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-dark-card border border-dark-text/10 rounded-xl shadow-2xl overflow-hidden">
              {/* Create new */}
              {tagSearch.trim() !== '' && !globalTags.some(t => t.toLowerCase() === tagSearch.toLowerCase()) && (
                <button
                  onMouseDown={e => { e.preventDefault(); createAndAdd(); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-violet-500 hover:bg-violet-500/10 transition-colors border-b border-dark-text/5"
                >
                  <Plus size={13} /> Criar "{tagSearch.trim()}"
                </button>
              )}

              {/* List */}
              <div className="max-h-44 overflow-y-auto">
                {globalTags
                  .filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()))
                  .map(t => {
                    const selected = tags.includes(t);
                    return (
                      <button
                        key={t}
                        onMouseDown={e => { e.preventDefault(); toggleTag(t); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-dark-text/5 transition-colors"
                      >
                        {selected
                          ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                          : <Circle size={14} className="text-dark-text/20 flex-shrink-0" />
                        }
                        <span className="text-sm text-dark-text">{t}</span>
                      </button>
                    );
                  })}
                {globalTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase())).length === 0 && tagSearch === '' && (
                  <p className="px-4 py-3 text-xs text-dark-text/30 italic">Nenhuma tag criada ainda</p>
                )}
              </div>

              <button
                onMouseDown={e => { e.preventDefault(); setTagDropOpen(false); }}
                className="w-full py-2 text-[11px] text-dark-text/40 hover:text-dark-text/70 border-t border-dark-text/5 transition-colors"
              >
                Fechar
              </button>
            </div>
          )}
        </div>

        {/* Subtarefas */}
        <div>
          <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-2 block">Subtarefas</label>
          <div className="space-y-0 mb-2">
            {subtasks.map((s, i) => (
              <React.Fragment key={s.id}>
                {subDragOver === i && subDragFrom !== i && <DropLine />}
                <div
                  draggable
                  onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('subtask-idx', String(i)); setSubDragFrom(i); setSubDragOver(null); }}
                  onDragOver={e => { e.preventDefault(); if (subDragOver !== i) setSubDragOver(i); }}
                  onDragLeave={() => setSubDragOver(null)}
                  onDrop={e => {
                    e.preventDefault();
                    const from = Number(e.dataTransfer.getData('subtask-idx'));
                    if (from !== i) {
                      setSubtasks(p => {
                        const arr = [...p];
                        const [moved] = arr.splice(from, 1);
                        arr.splice(i, 0, moved);
                        return arr;
                      });
                    }
                    setSubDragFrom(null); setSubDragOver(null);
                  }}
                  onDragEnd={() => { setSubDragFrom(null); setSubDragOver(null); }}
                  className="flex items-center gap-2 group/sub cursor-default py-0.5"
                >
                  <span className="text-dark-text/20 cursor-grab active:cursor-grabbing flex-shrink-0"><GripVertical size={12} /></span>
                  <button type="button" onClick={() => setSubtasks(p => p.map((x, j) => j === i ? { ...x, done: !x.done } : x))}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                      s.done ? 'bg-emerald-500 border-emerald-500' : 'border-dark-text/20 hover:border-violet-400'
                    }`}>
                    {s.done && <Check size={9} className="text-white" />}
                  </button>
                  <span className={`text-sm flex-1 text-dark-text ${s.done ? 'line-through opacity-40' : ''}`}>{s.title}</span>
                  <button type="button" onClick={() => removeSubtask(s.id)}
                    className="opacity-0 group-hover/sub:opacity-100 text-dark-text/30 hover:text-red-400 transition-all">
                    <X size={11} />
                  </button>
                </div>
              </React.Fragment>
            ))}
            {/* Drop indicator at the end */}
            {subDragOver === subtasks.length && <DropLine />}
          </div>
          <div className="flex gap-2">
            <input
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
              placeholder="Adicionar subtarefa... (Enter)"
              className="flex-1 bg-dark-card border border-dark-text/10 rounded-xl px-3 py-2 text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-dark-text/10 text-sm font-semibold text-dark-text/50 hover:bg-dark-text/5 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={!title.trim()} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-white transition-all">
            {initial?.id ? 'Salvar' : 'Criar Tarefa'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Task Detail Modal ────────────────────────────────────────────────────────

interface TaskDetailModalProps {
  item: TodoItem;
  allColumns: typeof COLUMNS;
  onEdit: () => void;
  onClose: () => void;
  onSubtaskToggle: (taskId: string, subtaskId: string) => void;
  onSubtasksReorder: (taskId: string, subtasks: Subtask[]) => void;
  onAddComment: (taskId: string, text: string) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ item, allColumns, onEdit, onClose, onSubtaskToggle, onSubtasksReorder, onAddComment }) => {
  const [newComment, setNewComment] = useState('');
  const [subDragFrom, setSubDragFrom] = useState<number | null>(null);
  const [subDragOver, setSubDragOver] = useState<number | null>(null);

  const submitComment = () => {
    const v = newComment.trim();
    if (!v) return;
    onAddComment(item.id, v);
    setNewComment('');
  };

  const pCfg = PRIORITY_CONFIG[item.priority];
  const col   = allColumns.find(c => c.id === item.status);
  const today = new Date().toISOString().split('T')[0];
  const overdue = item.dueDate && item.dueDate < today && item.status !== 'done';
  const isToday = item.dueDate === today;
  const doneCount = item.subtasks.filter(s => s.done).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-dark-bg rounded-3xl border border-dark-text/10 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-dark-text/[0.06]">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pCfg.dot}`} />
            <h2 className="text-base font-bold text-dark-text leading-tight">{item.title}</h2>
          </div>
          <div className="flex items-center gap-1.5 ml-3">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 text-violet-500 text-xs font-bold border border-violet-500/20 transition-all"
            >
              <Edit3 size={11} /> Editar
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-all">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto scrollbar-hide">
          {/* Meta */}
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-card border border-dark-text/[0.06] text-xs text-dark-text/60">
              {col?.icon}<span>{col?.label}</span>
            </span>
            <span className={`px-2.5 py-1 rounded-lg bg-dark-card border border-dark-text/[0.06] text-xs font-semibold ${pCfg.color}`}>
              {pCfg.label}
            </span>
            {item.dueDate && (
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-card border border-dark-text/[0.06] text-xs font-semibold ${
                overdue ? 'text-red-400' : isToday ? 'text-amber-400' : 'text-dark-text/60'
              }`}>
                <CalendarDays size={11} />
                {new Date(item.dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
            {item.tags.map(t => (
              <span key={t} className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-500">{t}</span>
            ))}
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <p className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1.5">Descrição</p>
              <p className="text-sm text-dark-text/70 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Subtasks */}
          {item.subtasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest flex items-center gap-1.5">
                  <ListChecks size={11} /> Subtarefas
                </p>
                <span className="text-[10px] font-semibold text-dark-text/40">{doneCount}/{item.subtasks.length}</span>
              </div>
              {/* Progress bar */}
              <div className="h-1 bg-dark-card rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${item.subtasks.length > 0 ? (doneCount / item.subtasks.length) * 100 : 0}%` }}
                />
              </div>
              <div className="space-y-1.5">
                {item.subtasks.map((s, i) => (
                  <React.Fragment key={s.id}>
                    {subDragOver === i && subDragFrom !== i && <DropLine />}
                    <div
                      draggable
                      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('sub-idx', String(i)); setSubDragFrom(i); setSubDragOver(null); }}
                      onDragOver={e => { e.preventDefault(); if (subDragOver !== i) setSubDragOver(i); }}
                      onDragLeave={() => setSubDragOver(null)}
                      onDrop={e => {
                        e.preventDefault();
                        const from = Number(e.dataTransfer.getData('sub-idx'));
                        if (from !== i) {
                          const arr = [...item.subtasks];
                          const [moved] = arr.splice(from, 1);
                          arr.splice(i, 0, moved);
                          onSubtasksReorder(item.id, arr);
                        }
                        setSubDragFrom(null); setSubDragOver(null);
                      }}
                      onDragEnd={() => { setSubDragFrom(null); setSubDragOver(null); }}
                      className="flex items-center gap-2 group/sub"
                    >
                      <span className="text-dark-text/20 cursor-grab active:cursor-grabbing flex-shrink-0"><GripVertical size={12} /></span>
                      <button
                        onClick={() => onSubtaskToggle(item.id, s.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-dark-card border border-dark-text/[0.06] hover:border-violet-500/20 transition-all group/check flex-1`}
                      >
                        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                          s.done ? 'bg-emerald-500 border-emerald-500' : 'border-dark-text/20 group-hover/check:border-violet-400'
                        }`}>
                          {s.done && <Check size={9} className="text-white" />}
                        </div>
                        <span className={`text-sm text-left ${s.done ? 'line-through text-dark-text/30' : 'text-dark-text/80'}`}>
                          {s.title}
                        </span>
                      </button>
                    </div>
                  </React.Fragment>
                ))}
                {subDragOver === item.subtasks.length && <DropLine />}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <p className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <MessageSquare size={11} /> Comentários {item.comments.length > 0 && `(${item.comments.length})`}
            </p>
            <div className="space-y-2 mb-3">
              {item.comments.length === 0 && (
                <p className="text-xs text-dark-text/30 italic px-1">Nenhum comentário ainda.</p>
              )}
              {item.comments.map(c => (
                <div key={c.id} className="bg-dark-card border border-dark-text/[0.06] rounded-xl px-3 py-2.5">
                  <p className="text-sm text-dark-text/80 leading-relaxed">{c.text}</p>
                  <p className="text-[10px] text-dark-text/30 mt-1">
                    {new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
            {/* New comment */}
            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitComment(); } }}
                placeholder="Adicionar um comentário..."
                className="flex-1 bg-dark-card border border-dark-text/10 rounded-xl px-3 py-2 text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/50 transition-all"
              />
              <button
                onClick={submitComment}
                disabled={!newComment.trim()}
                className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-all"
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Recurring Modal ──────────────────────────────────────────────────────────

interface RecModalProps {
  initial?: Partial<RecurringItem>;
  onSave: (item: Omit<RecurringItem, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const DAYS_OF_WEEK = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const RecModal: React.FC<RecModalProps> = ({ initial, onSave, onClose }) => {
  const [title, setTitle]           = useState(initial?.title ?? '');
  const [assignee, setAssignee]     = useState(initial?.assignee ?? '');
  const [frequency, setFrequency]   = useState<RecurringItem['frequency']>(initial?.frequency ?? 'semanal');
  const [dayOfWeek, setDayOfWeek]   = useState(initial?.dayOfWeek ?? '');
  const [tags, setTags]             = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput]     = useState('');

  const addTag = (t: string) => { const v = t.trim(); if (v && !tags.includes(v)) setTags(p => [...p, v]); setTagInput(''); };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), assignee: assignee || undefined, frequency, dayOfWeek: frequency === 'semanal' ? dayOfWeek || undefined : undefined, tags });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-md bg-dark-bg rounded-3xl border border-dark-text/10 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-dark-text">Nova <span className="text-blue-500">Recorrente</span></h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-all"><X size={16} /></button>
        </div>

        <div>
          <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Título *</label>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Ex: Relatório semanal de métricas"
            className="w-full bg-dark-card border border-dark-text/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-blue-400/50 transition-all" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Frequência</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value as RecurringItem['frequency'])}
              className="w-full bg-dark-card border border-dark-text/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-blue-400/50 transition-all appearance-none cursor-pointer">
              {(Object.keys(FREQ_CONFIG) as RecurringItem['frequency'][]).map(f => <option key={f} value={f} className="bg-dark-bg">{FREQ_CONFIG[f].label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Responsável</label>
            <select value={assignee} onChange={e => setAssignee(e.target.value)}
              className="w-full bg-dark-card border border-dark-text/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-blue-400/50 transition-all appearance-none cursor-pointer">
              <option value="" className="bg-dark-bg">Sem responsável</option>
              {MEMBERS.map(m => <option key={m} value={m} className="bg-dark-bg">{m}</option>)}
            </select>
          </div>
        </div>

        {/* Dia da semana — só para frequência Semanal */}
        {frequency === 'semanal' && (
          <div>
            <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Dia da Semana</label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS_OF_WEEK.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDayOfWeek(prev => prev === d ? '' : d)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    dayOfWeek === d
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-dark-text/5 border-dark-text/10 text-dark-text/50 hover:border-blue-400/40 hover:text-blue-500'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Tags</label>
          <div className="flex flex-wrap gap-1 mb-2">{tags.map(t => <TagPill key={t} label={t} onRemove={() => setTags(p => p.filter(x => x !== t))} />)}</div>
          <div className="flex gap-2">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
              placeholder="Digite e Enter" className="flex-1 bg-dark-card border border-dark-text/10 rounded-xl px-3 py-2 text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-blue-400/50 transition-all" />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-dark-text/10 text-sm font-semibold text-dark-text/50 hover:bg-dark-text/5 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={!title.trim()} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold text-white transition-all">
            {initial?.id ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Idea Modal ───────────────────────────────────────────────────────────────

interface IdeaModalProps {
  initial?: Partial<IdeaItem>;
  globalTags: string[];
  onTagCreated: (tag: string) => void;
  onSave: (data: Omit<IdeaItem, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const IdeaModal: React.FC<IdeaModalProps> = ({ initial, globalTags, onTagCreated, onSave, onClose }) => {
  const [title, setTitle]       = useState(initial?.title ?? '');
  const [description, setDesc]  = useState(initial?.description ?? '');
  const [status, setStatus]     = useState<IdeaStatus>(initial?.status ?? 'nova');
  const [tags, setTags]         = useState<string[]>(initial?.tags ?? []);
  const [tagSearch, setTagSearch] = useState('');
  const [tagDropOpen, setTagDropOpen] = useState(false);
  const tagDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (tagDropRef.current && !tagDropRef.current.contains(e.target as Node)) setTagDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggleTag = (t: string) => setTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const createAndAddTag = () => {
    const v = tagSearch.trim();
    if (!v) return;
    if (!globalTags.includes(v)) onTagCreated(v);
    if (!tags.includes(v)) setTags(p => [...p, v]);
    setTagSearch(''); setTagDropOpen(false);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim() || undefined, status, tags, comments: initial?.comments ?? [] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-dark-bg rounded-3xl border border-dark-text/10 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-dark-text">{initial?.id ? 'Editar ' : 'Nova '}<span className="text-violet-500">Ideia</span></h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-all"><X size={16} /></button>
        </div>

        <div>
          <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Título *</label>
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Qual é a ideia?"
            className="w-full bg-dark-card border border-dark-text/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/50 transition-all" />
        </div>

        <div>
          <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Descrição</label>
          <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="Descreva a ideia com mais detalhes..." rows={3}
            className="w-full bg-dark-card border border-dark-text/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/50 transition-all resize-none" />
        </div>

        <div>
          <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as IdeaStatus)}
            className="w-full bg-dark-card border border-dark-text/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer">
            {IDEA_COLUMNS.map(c => <option key={c.id} value={c.id} className="bg-dark-bg">{c.label}</option>)}
          </select>
        </div>

        {/* Tags */}
        <div ref={tagDropRef} className="relative">
          <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Tags</label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.map(t => <TagPill key={t} label={t} onRemove={() => toggleTag(t)} />)}
            </div>
          )}
          <div className="flex items-center gap-2 bg-dark-card border border-dark-text/10 rounded-xl px-3 py-2 cursor-text focus-within:border-violet-500/50 transition-all" onClick={() => setTagDropOpen(true)}>
            <Tag size={13} className="text-dark-text/40 flex-shrink-0" />
            <input value={tagSearch} onChange={e => { setTagSearch(e.target.value); setTagDropOpen(true); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createAndAddTag(); } }}
              placeholder="Buscar ou criar tag..."
              className="bg-transparent text-sm text-dark-text placeholder-dark-text/30 focus:outline-none flex-1" />
          </div>
          {tagDropOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-dark-card border border-dark-text/10 rounded-xl shadow-2xl overflow-hidden">
              {tagSearch.trim() !== '' && !globalTags.some(t => t.toLowerCase() === tagSearch.toLowerCase()) && (
                <button onMouseDown={e => { e.preventDefault(); createAndAddTag(); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-violet-500 hover:bg-violet-500/10 transition-colors border-b border-dark-text/5">
                  <Plus size={13} /> Criar "{tagSearch.trim()}"
                </button>
              )}
              <div className="max-h-40 overflow-y-auto">
                {globalTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase())).map(t => {
                  const sel = tags.includes(t);
                  return (
                    <button key={t} onMouseDown={e => { e.preventDefault(); toggleTag(t); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-dark-text/5 transition-colors">
                      {sel ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" /> : <Circle size={14} className="text-dark-text/20 flex-shrink-0" />}
                      <span className="text-sm text-dark-text">{t}</span>
                    </button>
                  );
                })}
              </div>
              <button onMouseDown={e => { e.preventDefault(); setTagDropOpen(false); }}
                className="w-full py-2 text-[11px] text-dark-text/40 hover:text-dark-text/70 border-t border-dark-text/5 transition-colors">Fechar</button>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-dark-text/10 text-sm font-semibold text-dark-text/50 hover:bg-dark-text/5 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={!title.trim()} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm font-bold text-white transition-all">
            {initial?.id ? 'Salvar' : 'Criar Ideia'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Idea Card ────────────────────────────────────────────────────────────────

interface IdeaCardProps {
  idea: IdeaItem;
  onView: (idea: IdeaItem) => void;
  onEdit: (idea: IdeaItem) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: IdeaStatus) => void;
}

const IdeaCard: React.FC<IdeaCardProps> = ({ idea, onView, onEdit, onDelete, onStatusChange }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const col = IDEA_COLUMNS.find(c => c.id === idea.status);

  return (
    <div className="group bg-dark-card border border-white/[0.06] rounded-xl px-3 py-2.5 hover:border-violet-500/25 transition-all duration-150">
      {/* Title row */}
      <div className="flex items-start gap-2">
        <Lightbulb size={13} className="mt-0.5 text-violet-400/60 flex-shrink-0" />
        <span onClick={() => onView(idea)}
          className="text-sm text-dark-text flex-1 truncate cursor-pointer hover:text-violet-400 transition-colors font-medium">
          {idea.title}
        </span>
        {/* Menu */}
        <div className="relative flex-shrink-0" ref={ref}>
          <button onClick={() => setMenuOpen(p => !p)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-dark-text/30 opacity-0 group-hover:opacity-100 hover:bg-dark-text/10 hover:text-dark-text/70 transition-all">
            <MoreHorizontal size={13} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 w-40 bg-dark-card border border-dark-text/10 rounded-xl shadow-2xl py-1 overflow-hidden">
              <button onClick={() => { onEdit(idea); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-text/70 hover:bg-dark-text/5 transition-colors">
                <Edit3 size={11} /> Editar
              </button>
              {IDEA_COLUMNS.filter(c => c.id !== idea.status).map(c => (
                <button key={c.id} onClick={() => { onStatusChange(idea.id, c.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-text/70 hover:bg-dark-text/5 transition-colors">
                  {c.icon} {c.label}
                </button>
              ))}
              <div className="border-t border-dark-text/5 my-0.5" />
              <button onClick={() => { onDelete(idea.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors">
                <Trash2 size={11} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Description snippet */}
      {idea.description && (
        <p className="text-xs text-dark-text/40 mt-1 ml-5 line-clamp-2 leading-relaxed">{idea.description}</p>
      )}
      {/* Footer */}
      {(idea.tags.length > 0 || idea.comments.length > 0) && (
        <div className="flex items-center gap-2 mt-2 ml-5">
          {idea.tags.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/15">
              {idea.tags[0]}{idea.tags.length > 1 ? ` +${idea.tags.length - 1}` : ''}
            </span>
          )}
          {idea.comments.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-dark-text/30">
              <MessageSquare size={10} />{idea.comments.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Idea Detail Modal ────────────────────────────────────────────────────────

interface IdeaDetailModalProps {
  idea: IdeaItem;
  onEdit: () => void;
  onClose: () => void;
  onAddComment: (id: string, text: string) => void;
}

const IdeaDetailModal: React.FC<IdeaDetailModalProps> = ({ idea, onEdit, onClose, onAddComment }) => {
  const [newComment, setNewComment] = useState('');
  const col = IDEA_COLUMNS.find(c => c.id === idea.status);

  const submit = () => {
    const v = newComment.trim();
    if (!v) return;
    onAddComment(idea.id, v);
    setNewComment('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl bg-dark-bg rounded-3xl border border-dark-text/10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-dark-text/[0.06]">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-violet-400 flex-shrink-0" />
            <h2 className="text-base font-bold text-dark-text leading-tight">{idea.title}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 text-violet-500 text-xs font-bold border border-violet-500/20 transition-all">
              <Edit3 size={11} /> Editar
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-all"><X size={15} /></button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto scrollbar-hide">
          {/* Status badge */}
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-card border border-dark-text/[0.06] text-xs text-dark-text/60">
              {col?.icon} {col?.label}
            </span>
            {idea.tags.map(t => (
              <span key={t} className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-500">{t}</span>
            ))}
          </div>

          {/* Description */}
          {idea.description && (
            <div>
              <p className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1.5">Descrição</p>
              <p className="text-sm text-dark-text/70 leading-relaxed">{idea.description}</p>
            </div>
          )}

          {/* Comments */}
          <div>
            <p className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <MessageSquare size={11} /> Comentários {idea.comments.length > 0 && `(${idea.comments.length})`}
            </p>
            <div className="space-y-2 mb-3">
              {idea.comments.length === 0 && <p className="text-xs text-dark-text/30 italic px-1">Nenhum comentário ainda.</p>}
              {idea.comments.map(c => (
                <div key={c.id} className="bg-dark-card border border-dark-text/[0.06] rounded-xl px-3 py-2.5">
                  <p className="text-sm text-dark-text/80 leading-relaxed">{c.text}</p>
                  <p className="text-[10px] text-dark-text/30 mt-1">{new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                placeholder="Adicionar um comentário..."
                className="flex-1 bg-dark-card border border-dark-text/10 rounded-xl px-3 py-2 text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/50 transition-all" />
              <button onClick={submit} disabled={!newComment.trim()}
                className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-all">
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Compact Todo Row ─────────────────────────────────────────────────────────

interface RowProps {
  item: TodoItem;
  allColumns: typeof COLUMNS;
  onView: (item: TodoItem) => void;
  onEdit: (item: TodoItem) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: () => void;
  isDragOver?: boolean;
}

const TodoRow: React.FC<RowProps> = ({ item, allColumns, onView, onEdit, onDelete, onStatusChange, onDragStart, onDragOver, onDrop, isDragOver }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(item.id); }}
      onDragOver={e => { e.preventDefault(); onDragOver(item.id); }}
      onDrop={e => { e.preventDefault(); onDrop(); }}
      onDragEnd={() => onDrop()}
      className="group flex items-center gap-3 px-3 py-2 rounded-xl bg-dark-card border border-white/[0.06] hover:border-violet-500/25 transition-all duration-150"
    >
      {/* Check circle */}
      <button
        onClick={e => { e.stopPropagation(); onStatusChange(item.id, item.status === 'done' ? 'todo' : 'done'); }}
        className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
          item.status === 'done'
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-dark-text/20 hover:border-violet-400'
        }`}
      >
        {item.status === 'done' && <Check size={9} className="text-white" />}
      </button>

      {/* Grip handle */}
      <span className="text-dark-text/20 cursor-grab active:cursor-grabbing flex-shrink-0"><GripVertical size={12} /></span>

      {/* Priority dot */}
      <PriorityDot priority={item.priority} />

      {/* Content block */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onView(item)}>
        {/* Title */}
        <span
          className={`text-sm text-dark-text block truncate hover:text-violet-400 transition-colors ${item.status === 'done' ? 'line-through opacity-40' : ''}`}
        >
          {item.title}
        </span>

        {/* Tag + Date row */}
        {(item.tags.length > 0 || item.dueDate) && (
          <div className="flex items-center gap-2 mt-1">
            {item.tags.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/15">
                {item.tags[0]}{item.tags.length > 1 ? ` +${item.tags.length - 1}` : ''}
              </span>
            )}
            {item.dueDate && (() => {
              const today = new Date().toISOString().split('T')[0];
              const overdue = item.dueDate < today && item.status !== 'done';
              const isToday = item.dueDate === today;
              const d = new Date(item.dueDate + 'T12:00:00');
              const fmt = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
              return (
                <span className={`text-[9px] font-semibold ${
                  overdue ? 'text-red-400' : isToday ? 'text-amber-400' : 'text-dark-text/30'
                }`}>
                  {fmt}
                </span>
              );
            })()}
          </div>
        )}
      </div>


      {/* Menu */}
      <div className="relative" ref={ref}>
        <button
          onClick={() => setMenuOpen(p => !p)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-dark-text/30 opacity-0 group-hover:opacity-100 hover:bg-dark-text/10 hover:text-dark-text/70 transition-all"
        >
          <MoreHorizontal size={13} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 z-20 w-36 bg-dark-card border border-dark-text/10 rounded-xl shadow-2xl py-1 overflow-hidden">
            <button onClick={() => { onEdit(item); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-text/70 hover:bg-dark-text/5 transition-colors">
              <Edit3 size={11} /> Editar
            </button>
            {allColumns.filter(c => c.id !== item.status).map(c => (
              <button key={c.id} onClick={() => { onStatusChange(item.id, c.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-text/70 hover:bg-dark-text/5 transition-colors">
                {c.icon} {c.label}
              </button>
            ))}
            <div className="border-t border-dark-text/5 my-0.5" />
            <button onClick={() => { onDelete(item.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors">
              <Trash2 size={11} /> Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Compact Recurring Row ────────────────────────────────────────────────────

interface RecRowProps {
  item: RecurringItem;
  onEdit: (item: RecurringItem) => void;
  onDelete: (id: string) => void;
}

const RecRow: React.FC<RecRowProps> = ({ item, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const freq = FREQ_CONFIG[item.frequency];

  return (
    <div className="group flex items-center gap-3 px-3 py-2 rounded-xl bg-dark-card border border-white/[0.06] hover:border-blue-400/25 transition-all duration-150">
      {/* Repeat icon */}
      <Repeat size={12} className="text-blue-400 flex-shrink-0" />

      {/* Title */}
      <span className="text-sm text-dark-text flex-1 truncate">{item.title}</span>

      {/* Frequency badge + day */}
      <span className={`hidden sm:flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0 ${freq.color}`}>
        {freq.label}{item.dayOfWeek ? ` · ${item.dayOfWeek}` : ''}
      </span>

      {/* Assignee avatar */}
      {item.assignee && (
        <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 text-[9px] font-bold flex-shrink-0">
          {item.assignee.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Menu */}
      <div className="relative" ref={ref}>
        <button onClick={() => setMenuOpen(p => !p)} className="w-6 h-6 rounded-lg flex items-center justify-center text-dark-text/30 opacity-0 group-hover:opacity-100 hover:bg-dark-text/10 hover:text-dark-text/70 transition-all">
          <MoreHorizontal size={13} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 z-20 w-32 bg-dark-card border border-dark-text/10 rounded-xl shadow-2xl py-1 overflow-hidden">
            <button onClick={() => { onEdit(item); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-text/70 hover:bg-dark-text/5 transition-colors">
              <Edit3 size={11} /> Editar
            </button>
            <div className="border-t border-dark-text/5 my-0.5" />
            <button onClick={() => { onDelete(item.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors">
              <Trash2 size={11} /> Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Column Header ────────────────────────────────────────────────────────────

interface ColHeaderProps {
  label: string;
  count: number;
  color: string;
  icon: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  onAdd: () => void;
  accentClass?: string;
}

const ColHeader: React.FC<ColHeaderProps> = ({ label, count, color, icon, collapsed, onToggle, onAdd, accentClass = 'hover:text-violet-500 hover:bg-violet-500/10' }) => (
  <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r ${color} border border-white/[0.06]`}>
    <div className="flex items-center gap-2">
      <span className="text-dark-text/40">{icon}</span>
      <span className="text-[11px] font-bold text-dark-text uppercase tracking-widest">{label}</span>
      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-dark-text/10 flex items-center justify-center text-[10px] font-black text-dark-text/50">{count}</span>
    </div>
    <div className="flex items-center gap-0.5">
      <button onClick={onAdd} className={`w-6 h-6 rounded-lg flex items-center justify-center text-dark-text/40 ${accentClass} transition-all`}><Plus size={13} /></button>
      <button onClick={onToggle} className="w-6 h-6 rounded-lg flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-all">
        {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
      </button>
    </div>
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyCol = ({ onAdd, label }: { onAdd: () => void; label: string }) => (
  <div className="flex flex-col items-center justify-center py-6 rounded-xl border border-dashed border-dark-text/10 text-dark-text/40 gap-1.5">
    <span className="text-xl opacity-25">📋</span>
    <span className="text-[11px]">Nenhum item</span>
    <button onClick={onAdd} className="text-[11px] text-violet-500 hover:text-violet-600 font-semibold transition-colors">+ {label}</button>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const TodoStaff: React.FC = () => {
  const [todos,      setTodos]      = useState<TodoItem[]>([]);
  const [recurring,  setRecurring]  = useState<RecurringItem[]>([]);
  const [ideas,      setIdeas]      = useState<IdeaItem[]>([]);
  const [globalTags, setGlobalTags] = useState<string[]>([...AVAILABLE_TAGS]);
  const [activeTab,  setActiveTab]  = useState<'tarefas' | 'ideias'>('tarefas');
  const [todoModal,  setTodoModal]  = useState(false);
  const [recModal,   setRecModal]   = useState(false);
  const [ideaModal,  setIdeaModal]  = useState(false);
  const [editing,    setEditing]    = useState<TodoItem | undefined>();
  const [editingRec, setEditingRec] = useState<RecurringItem | undefined>();
  const [editingIdea, setEditingIdea] = useState<IdeaItem | undefined>();
  const [viewingTodo, setViewingTodo] = useState<TodoItem | undefined>();
  const [viewingIdea, setViewingIdea] = useState<IdeaItem | undefined>();
  const [search,     setSearch]     = useState('');
  const [activeTag,  setActiveTag]  = useState<string>('');
  const [collapsed,  setCollapsed]  = useState<Record<string, boolean>>({});
  const [defaultStatus, setDefaultStatus] = useState<Status>('todo');
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const tagFilterRef = useRef<HTMLDivElement>(null);
  const [dbLoaded, setDbLoaded] = useState(false);

  // ── Load data from API on mount ──
  useEffect(() => {
    Promise.all([
      fetch('/api/todo-staff/tasks').then(r => r.ok ? r.json() : []),
      fetch('/api/todo-staff/recurring').then(r => r.ok ? r.json() : []),
      fetch('/api/todo-staff/ideas').then(r => r.ok ? r.json() : []),
    ]).then(([tasks, recs, ideasData]) => {
      setTodos(tasks);
      setRecurring(recs);
      setIdeas(ideasData);
      // Merge tags from tasks
      const allUsedTags = new Set<string>([...AVAILABLE_TAGS, ...tasks.flatMap((t: TodoItem) => t.tags)]);
      setGlobalTags(Array.from(allUsedTags));
      setDbLoaded(true);
    }).catch(err => {
      console.error('[TodoStaff] Failed to load from DB:', err);
      setDbLoaded(true);
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagFilterRef.current && !tagFilterRef.current.contains(e.target as Node)) setTagFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // All unique tags used in todos (for the filter bar)
  const allTags = Array.from(new Set(todos.flatMap(t => t.tags))).sort();

  // Handler to create a new global tag
  const handleTagCreated = (tag: string) => {
    setGlobalTags(prev => prev.includes(tag) ? prev : [...prev, tag]);
  };

  // ── API helper ──
  const apiCall = async (method: string, url: string, body?: any) => {
    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (err) { console.error('[TodoStaff] API error:', err); }
  };

  const todoToApi = (t: TodoItem) => ({
    id: t.id, title: t.title, description: t.description, priority: t.priority,
    status: t.status, tags: t.tags, assignee: t.assignee, dueDate: t.dueDate,
    subtasks: t.subtasks, comments: t.comments, doneAt: t.doneAt,
  });

  // Handlers — todos
  const createTodo = (data: Omit<TodoItem, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const item: TodoItem = { ...data, subtasks: data.subtasks ?? [], comments: data.comments ?? [], id: uid(), createdAt: now, doneAt: data.status === 'done' ? now : undefined };
    setTodos(p => [item, ...p]);
    apiCall('POST', '/api/todo-staff/tasks', todoToApi(item));
  };
  const updateTodo = (data: Omit<TodoItem, 'id' | 'createdAt'>) => {
    if (!editing) return;
    const updated = { ...editing, ...data };
    setTodos(p => p.map(t => t.id === editing.id ? updated : t));
    setEditing(undefined);
    apiCall('PUT', `/api/todo-staff/tasks/${editing.id}`, todoToApi(updated));
  };
  const deleteTodo = (id: string) => {
    setTodos(p => p.filter(t => t.id !== id));
    apiCall('DELETE', `/api/todo-staff/tasks/${id}`);
  };
  const changeStatus = (id: string, status: Status) => {
    const doneAt = status === 'done' ? new Date().toISOString() : undefined;
    setTodos(p => p.map(t => t.id === id ? { ...t, status, doneAt: doneAt ?? t.doneAt } : t));
    const item = todos.find(t => t.id === id);
    if (item) apiCall('PUT', `/api/todo-staff/tasks/${id}`, todoToApi({ ...item, status, doneAt: doneAt ?? item.doneAt }));
  };

  // drag-and-drop state for task rows
  const dragFromId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);
  const [dragOverState, setDragOverState] = useState<string | null>(null);

  const handleTaskDragStart = (id: string) => { dragFromId.current = id; };
  const handleTaskDragOver  = (id: string) => { dragOverId.current = id; setDragOverState(id); };
  const handleTaskDrop = () => {
    const fromId = dragFromId.current;
    const toId   = dragOverId.current;
    if (!fromId || !toId || fromId === toId) { dragFromId.current = null; dragOverId.current = null; setDragOverState(null); return; }
    setTodos(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(t => t.id === fromId);
      const toIdx   = arr.findIndex(t => t.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
    dragFromId.current = null;
    dragOverId.current = null;
    setDragOverState(null);
  };

  const reorderSubtasks = (taskId: string, newSubtasks: Subtask[]) => {
    setTodos(p => p.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks } : t));
    setViewingTodo(prev => prev?.id === taskId ? { ...prev, subtasks: newSubtasks } : prev);
    const item = todos.find(t => t.id === taskId);
    if (item) apiCall('PUT', `/api/todo-staff/tasks/${taskId}`, todoToApi({ ...item, subtasks: newSubtasks }));
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    setTodos(p => p.map(t => t.id === taskId
      ? { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s) }
      : t
    ));
    setViewingTodo(prev => prev?.id === taskId
      ? { ...prev, subtasks: prev.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s) }
      : prev
    );
    const item = todos.find(t => t.id === taskId);
    if (item) {
      const updatedSubs = item.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s);
      apiCall('PUT', `/api/todo-staff/tasks/${taskId}`, todoToApi({ ...item, subtasks: updatedSubs }));
    }
  };

  const addComment = (taskId: string, text: string) => {
    const comment: Comment = { id: uid(), text, createdAt: new Date().toISOString() };
    setTodos(p => p.map(t => t.id === taskId ? { ...t, comments: [...t.comments, comment] } : t));
    setViewingTodo(prev => prev?.id === taskId ? { ...prev, comments: [...prev.comments, comment] } : prev);
    const item = todos.find(t => t.id === taskId);
    if (item) apiCall('PUT', `/api/todo-staff/tasks/${taskId}`, todoToApi({ ...item, comments: [...item.comments, comment] }));
  };

  // Handlers — recurring
  const createRec = (data: Omit<RecurringItem, 'id' | 'createdAt'>) => {
    const item: RecurringItem = { ...data, id: uid(), createdAt: new Date().toISOString() };
    setRecurring(p => [item, ...p]);
    apiCall('POST', '/api/todo-staff/recurring', item);
  };
  const updateRec = (data: Omit<RecurringItem, 'id' | 'createdAt'>) => {
    if (!editingRec) return;
    const updated = { ...editingRec, ...data };
    setRecurring(p => p.map(r => r.id === editingRec.id ? updated : r));
    setEditingRec(undefined);
    apiCall('PUT', `/api/todo-staff/recurring/${editingRec.id}`, updated);
  };
  const deleteRec = (id: string) => {
    setRecurring(p => p.filter(r => r.id !== id));
    apiCall('DELETE', `/api/todo-staff/recurring/${id}`);
  };

  // Handlers — ideas
  const createIdea = (data: Omit<IdeaItem, 'id' | 'createdAt'>) => {
    const item: IdeaItem = { ...data, comments: data.comments ?? [], id: uid(), createdAt: new Date().toISOString() };
    setIdeas(p => [item, ...p]);
    apiCall('POST', '/api/todo-staff/ideas', item);
  };
  const updateIdea = (data: Omit<IdeaItem, 'id' | 'createdAt'>) => {
    if (!editingIdea) return;
    const updated = { ...editingIdea, ...data };
    setIdeas(p => p.map(i => i.id === editingIdea.id ? updated : i));
    setEditingIdea(undefined);
    apiCall('PUT', `/api/todo-staff/ideas/${editingIdea.id}`, updated);
  };
  const deleteIdea = (id: string) => {
    setIdeas(p => p.filter(i => i.id !== id));
    apiCall('DELETE', `/api/todo-staff/ideas/${id}`);
  };
  const changeIdeaStatus = (id: string, status: IdeaStatus) => {
    setIdeas(p => p.map(i => i.id === id ? { ...i, status } : i));
    const item = ideas.find(i => i.id === id);
    if (item) apiCall('PUT', `/api/todo-staff/ideas/${id}`, { ...item, status });
  };
  const addIdeaComment = (ideaId: string, text: string) => {
    const comment: Comment = { id: uid(), text, createdAt: new Date().toISOString() };
    setIdeas(p => p.map(i => i.id === ideaId ? { ...i, comments: [...i.comments, comment] } : i));
    setViewingIdea(prev => prev?.id === ideaId ? { ...prev, comments: [...prev.comments, comment] } : prev);
    const item = ideas.find(i => i.id === ideaId);
    if (item) apiCall('PUT', `/api/todo-staff/ideas/${ideaId}`, { ...item, comments: [...item.comments, comment] });
  };

  const openNewTodo = (status: Status) => { setDefaultStatus(status); setEditing(undefined); setTodoModal(true); };
  const openNewRec  = () => { setEditingRec(undefined); setRecModal(true); };

  // Filter
  const filtered = todos.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    const matchTag    = !activeTag || t.tags.includes(activeTag);
    return matchSearch && matchTag;
  });
  const byStatus = (s: Status) => filtered.filter(t => t.status === s);
  const filteredRec = recurring.filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()));

  const stats = {
    total:  todos.length,
    done:   todos.filter(t => t.status === 'done').length,
    urgent: todos.filter(t => t.priority === 'urgent' && t.status !== 'done').length,
  };

  const toggleCol = (id: string) => setCollapsed(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">

      {/* ── Header ─── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dark-text">TODO <span className="text-violet-500">Staff</span></h1>
          <p className="text-[10px] font-bold text-dark-text/30 uppercase tracking-widest mt-0.5">Organização interna do time · seção grape</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'tarefas' ? (
            <>
              <button onClick={openNewRec} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-500 text-xs font-bold border border-blue-500/20 transition-all">
                <RefreshCw size={13} /> Recorrente
              </button>
              <button onClick={() => { setEditing(undefined); setDefaultStatus('todo'); setTodoModal(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/20">
                <Plus size={13} /> Nova Tarefa
              </button>
            </>
          ) : (
            <button onClick={() => { setEditingIdea(undefined); setIdeaModal(true); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/20">
              <Plus size={13} /> Nova Ideia
            </button>
          )}
        </div>
      </div>

      {/* ── Tab switcher ─── */}
      <div className="px-6 md:px-8 mb-5">
        <div className="inline-flex items-center gap-1 bg-dark-card border border-white/[0.06] rounded-2xl p-1">
          <button
            onClick={() => setActiveTab('tarefas')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'tarefas'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                : 'text-dark-text/50 hover:text-dark-text/80'
            }`}
          >
            <ListChecks size={13} /> Tarefas
          </button>
          <button
            onClick={() => setActiveTab('ideias')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ideias'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                : 'text-dark-text/50 hover:text-dark-text/80'
            }`}
          >
            <Lightbulb size={13} /> Ideias
          </button>
        </div>
      </div>

      {/* ── Tarefas tab content ─── */}
      {activeTab === 'tarefas' && (<>
      <div className="px-6 md:px-8 mb-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: stats.total, sub: 'tarefas', valueClass: 'text-dark-text' },
            { label: 'Concluídas', value: stats.done, sub: stats.total > 0 ? `${Math.round((stats.done / stats.total) * 100)}%` : '—', valueClass: 'text-emerald-400' },
            { label: 'Urgentes', value: stats.urgent, sub: 'pendentes', valueClass: stats.urgent > 0 ? 'text-red-400' : 'text-dark-text' },
          ].map(k => (
            <div key={k.label} className="bg-dark-card border border-white/[0.07] rounded-2xl px-4 py-3 flex items-center gap-4 transition-colors duration-200">
              <div>
                <span className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest block">{k.label}</span>
                <span className={`text-xl font-black ${k.valueClass}`}>{k.value}</span>
              </div>
              <span className="text-xs text-dark-text/40">{k.sub}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search + Tag filters ─── */}
      <div className="px-6 md:px-8 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-dark-card border border-white/[0.07] rounded-xl px-3 py-2">
          <Search size={13} className="text-dark-text/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tarefas..."
            className="bg-transparent text-sm text-dark-text placeholder-dark-text/30 focus:outline-none w-44" />
        </div>

        {/* Tag dropdown filter */}
        {allTags.length > 0 && (
          <div className="relative" ref={tagFilterRef}>
            <button
              onClick={() => setTagFilterOpen(p => !p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                tagFilterOpen || activeTag
                  ? 'bg-violet-600/15 border-violet-500/40 text-violet-500'
                  : 'bg-dark-card border-white/[0.07] text-dark-text/60 hover:border-violet-400/30 hover:text-violet-500'
              }`}
            >
              <Tag size={12} />
              <span>{activeTag || 'Todas as tags'}</span>
              <ChevronDown size={11} className={`transition-transform ${tagFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {tagFilterOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-30 w-48 bg-dark-card border border-dark-text/10 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
                {/* Todas */}
                <button
                  onClick={() => { setActiveTag(''); setTagFilterOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors ${
                    activeTag === ''
                      ? 'bg-violet-600/15 text-violet-500 font-bold'
                      : 'text-dark-text/70 hover:bg-dark-text/5'
                  }`}
                >
                  {activeTag === '' ? <CheckCircle2 size={13} className="text-violet-500" /> : <Circle size={13} className="text-dark-text/20" />}
                  Todas
                </button>
                <div className="border-t border-dark-text/5" />
                {/* Tag list */}
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => { setActiveTag(prev => prev === tag ? '' : tag); setTagFilterOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors ${
                      activeTag === tag
                        ? 'bg-violet-600/15 text-violet-500 font-bold'
                        : 'text-dark-text/70 hover:bg-dark-text/5'
                    }`}
                  >
                    {activeTag === tag
                      ? <CheckCircle2 size={13} className="text-violet-500" />
                      : <Circle size={13} className="text-dark-text/20" />}
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Board: 4 colunas ─── */}
      <div className="px-6 md:px-8 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

          {/* ── 3 colunas de status ─── */}
          {COLUMNS.map(col => {
            const items = byStatus(col.id);
            const isCollapsed = collapsed[col.id];
            return (
              <div key={col.id} className="flex flex-col gap-2">
                <ColHeader
                  label={col.label} count={items.length} color={col.color} icon={col.icon}
                  collapsed={isCollapsed} onToggle={() => toggleCol(col.id)}
                  onAdd={() => openNewTodo(col.id)}
                />
                {!isCollapsed && (
                  <div className="flex flex-col gap-1.5">
                    {items.length === 0
                      ? <EmptyCol onAdd={() => openNewTodo(col.id)} label="Adicionar" />
                      : items.map((item, idx) => (
                        <React.Fragment key={item.id}>
                          {dragOverState === item.id && <DropLine />}
                          <TodoRow
                            item={item} allColumns={COLUMNS}
                            onView={item => setViewingTodo(item)}
                            onEdit={item => { setEditing(item); setTodoModal(true); }}
                            onDelete={deleteTodo}
                            onStatusChange={changeStatus}
                            onDragStart={handleTaskDragStart}
                            onDragOver={handleTaskDragOver}
                            onDrop={handleTaskDrop}
                            isDragOver={false}
                          />
                        </React.Fragment>
                      ))
                    }
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Coluna Recorrentes ─── */}
          <div className="flex flex-col gap-2">
            <ColHeader
              label="Recorrentes" count={filteredRec.length}
              color="from-blue-500/20 to-blue-600/10"
              icon={<Repeat size={13} />}
              collapsed={!!collapsed['recurring']} onToggle={() => toggleCol('recurring')}
              onAdd={openNewRec}
              accentClass="hover:text-blue-400 hover:bg-blue-500/10"
            />
            {!collapsed['recurring'] && (
              <div className="flex flex-col gap-1.5">
                {filteredRec.length === 0
                  ? <EmptyCol onAdd={openNewRec} label="Adicionar" />
                  : filteredRec.map(item => (
                    <RecRow
                      key={item.id} item={item}
                      onEdit={item => { setEditingRec(item); setRecModal(true); }}
                      onDelete={deleteRec}
                    />
                  ))
                }
              </div>
            )}
          </div>

        </div>
      </div>
      </>)}

      {/* ── Ideias tab content ─── */}
      {activeTab === 'ideias' && (
        <div className="px-6 md:px-8 pb-10">
          {/* Ideias KPIs */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total', value: ideas.length, sub: 'ideias', valueClass: 'text-dark-text' },
              { label: 'Aprovadas', value: ideas.filter(i => i.status === 'aprovada').length, sub: 'ideias', valueClass: 'text-emerald-400' },
              { label: 'Favoritas', value: ideas.filter(i => i.status === 'favorita').length, sub: 'ideias', valueClass: 'text-pink-400' },
            ].map(k => (
              <div key={k.label} className="bg-dark-card border border-white/[0.07] rounded-2xl px-4 py-3 flex items-center gap-4">
                <div>
                  <span className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest block">{k.label}</span>
                  <span className={`text-xl font-black ${k.valueClass}`}>{k.value}</span>
                </div>
                <span className="text-xs text-dark-text/40">{k.sub}</span>
              </div>
            ))}
          </div>
          {/* Ideias board */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {IDEA_COLUMNS.map(col => {
              const colIdeas = ideas.filter(i => i.status === col.id);
              return (
                <div key={col.id} className="flex flex-col gap-2">
                  <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r ${col.color} border border-white/[0.06]`}>
                    <div className="flex items-center gap-2">
                      <span className="text-dark-text/40">{col.icon}</span>
                      <span className="text-[11px] font-bold text-dark-text uppercase tracking-widest">{col.label}</span>
                      <span className="text-[10px] font-bold text-dark-text/40 bg-dark-text/10 px-1.5 py-0.5 rounded-full">{colIdeas.length}</span>
                    </div>
                    <button onClick={() => { setEditingIdea({ status: col.id } as IdeaItem); setIdeaModal(true); }}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-dark-text/40 ${col.accent} transition-all`}>
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {colIdeas.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 rounded-xl border border-dashed border-dark-text/10 text-dark-text/40 gap-1.5">
                        <span className="text-xl opacity-25">💡</span>
                        <span className="text-[11px]">Nenhuma ideia</span>
                        <button onClick={() => { setEditingIdea({ status: col.id } as IdeaItem); setIdeaModal(true); }}
                          className="text-[11px] text-violet-500 hover:text-violet-600 font-semibold transition-colors">+ Adicionar</button>
                      </div>
                    ) : colIdeas.map(idea => (
                      <IdeaCard
                        key={idea.id} idea={idea}
                        onView={i => setViewingIdea(i)}
                        onEdit={i => { setEditingIdea(i); setIdeaModal(true); }}
                        onDelete={deleteIdea}
                        onStatusChange={changeIdeaStatus}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modals ─── */}
      {viewingTodo && (
        <TaskDetailModal
          item={viewingTodo}
          allColumns={COLUMNS}
          onEdit={() => { setEditing(viewingTodo); setViewingTodo(undefined); setTodoModal(true); }}
          onClose={() => setViewingTodo(undefined)}
          onSubtaskToggle={toggleSubtask}
          onSubtasksReorder={reorderSubtasks}
          onAddComment={addComment}
        />
      )}
      {todoModal && (
        <TodoModal
          initial={editing ?? { status: defaultStatus }}
          allColumns={COLUMNS}
          globalTags={globalTags}
          onTagCreated={handleTagCreated}
          onSave={editing ? updateTodo : createTodo}
          onClose={() => { setTodoModal(false); setEditing(undefined); }}
        />
      )}
      {recModal && (
        <RecModal
          initial={editingRec}
          onSave={editingRec ? updateRec : createRec}
          onClose={() => { setRecModal(false); setEditingRec(undefined); }}
        />
      )}
      {viewingIdea && (
        <IdeaDetailModal
          idea={viewingIdea}
          onEdit={() => { setEditingIdea(viewingIdea); setViewingIdea(undefined); setIdeaModal(true); }}
          onClose={() => setViewingIdea(undefined)}
          onAddComment={addIdeaComment}
        />
      )}
      {ideaModal && (
        <IdeaModal
          initial={editingIdea}
          globalTags={globalTags}
          onTagCreated={handleTagCreated}
          onSave={editingIdea?.id ? updateIdea : createIdea}
          onClose={() => { setIdeaModal(false); setEditingIdea(undefined); }}
        />
      )}
    </div>
  );
};

export default TodoStaff;
