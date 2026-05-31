import React, { useState, useRef, useEffect } from 'react';
import {
  Plus, X, Check, Clock, AlertCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Trash2, Edit3, MoreHorizontal, Search, RefreshCw, Repeat, Filter, ArrowUpDown,
  Circle, CheckCircle2, Tag, CalendarDays, MessageSquare, ListChecks, Send, GripVertical,
  Lightbulb, Star, Sparkles, LayoutGrid, AlignJustify, FileText, Loader2, Save
} from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';

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
  last_completed?: string;
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

const TagPill = ({ label, onRemove, color }: { label: string; onRemove?: () => void; color?: string }) => {
  const style = color
    ? { backgroundColor: color + '22', color, borderColor: color + '55' }
    : undefined;
  return (
    <span
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
        color ? '' : 'bg-violet-500/15 text-violet-500 border-violet-500/25'
      }`}
      style={style}
    >
      {label}
      {onRemove && <button onClick={onRemove} className="hover:opacity-60 transition-opacity"><X size={9} /></button>}
    </span>
  );
};

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

// ─── Colored Tag types ────────────────────────────────────────────────────────

interface ColoredTag {
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

// ─── Tags Manager Modal ───────────────────────────────────────────────────────

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-dark-bg rounded-3xl border border-dark-text/10 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-dark-text">Gerenciar <span className="text-violet-500">Tags</span></h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-all"><X size={16} /></button>
        </div>

        {/* Create new tag */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest block">Nova Tag</label>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Nome da tag..."
            className="w-full bg-dark-card border border-dark-text/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/50 transition-all"
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
                      className="bg-transparent border-b border-dark-text/20 text-sm text-dark-text focus:outline-none py-0.5"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {TAG_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-5 h-5 rounded-full transition-all ${editColor === c ? 'ring-2 ring-offset-1 ring-offset-dark-card ring-white scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="flex-1 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-[11px] font-bold text-white transition-all">Salvar</button>
                      <button onClick={() => setEditId(null)} className="flex-1 py-1 rounded-lg border border-dark-text/10 text-[11px] text-dark-text/50 hover:bg-dark-text/5 transition-all">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-dark-text/5 group transition-colors">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="flex-1 text-sm text-dark-text">{t.name}</span>
                    <button onClick={() => startEdit(t)} className="opacity-0 group-hover:opacity-100 text-dark-text/40 hover:text-violet-400 transition-all"><Edit3 size={12} /></button>
                    <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100 text-dark-text/40 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
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

// ─── Image utilities ─────────────────────────────────────────────────────────

const compressImage = (file: File | Blob, maxW = 1200, quality = 0.82): Promise<string> =>
  new Promise(resolve => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = url;
  });

interface RichTextAreaProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  enableImages?: boolean;
}

const RichTextArea: React.FC<RichTextAreaProps> = ({ value, onChange, placeholder = '', rows = 3, className = '', enableImages = false }) => {
  const ref      = useRef<HTMLDivElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);
  const lastVal  = useRef(value);

  // Sync external value → DOM only when it changes from outside
  // Initialize content on mount
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = value;
      lastVal.current = value;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. modal reset)
  useEffect(() => {
    if (ref.current && value !== lastVal.current) {
      ref.current.innerHTML = value;
      lastVal.current = value;
    }
  }, [value]);

  const emit = () => {
    const html = ref.current?.innerHTML ?? '';
    lastVal.current = html;
    onChange(html);
  };

  const insertImg = async (file: File | Blob) => {
    const src = await compressImage(file);
    document.execCommand('insertHTML', false, `<img src="${src}" style="max-width:100%;border-radius:8px;margin:4px 0;display:block" />`);
    emit();
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imgItem = items.find(i => i.type.startsWith('image/'));
    if (imgItem && enableImages) {
      e.preventDefault();
      const blob = imgItem.getAsFile();
      if (blob) await insertImg(blob);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { ref.current?.focus(); await insertImg(file); }
    e.target.value = '';
  };

  const isEmpty = !value || value === '<br>' || value === '';

  return (
    <div className={`relative ${className}`}>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onPaste={handlePaste}
        style={{ minHeight: `${rows * 1.6}em` }}
        className={`w-full bg-dark-card border border-dark-text/10 rounded-xl px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500/50 transition-all overflow-auto rich-text-content`}
      />
      {isEmpty && (
        <span className="absolute top-2.5 left-4 text-sm text-dark-text/30 pointer-events-none select-none">{placeholder}</span>
      )}
      {enableImages && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg text-dark-text/30 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
            title="Anexar imagem"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  );
};

// ─── TODO Modal ───────────────────────────────────────────────────────────────

interface TodoModalProps {
  initial?: Partial<TodoItem>;
  allColumns: typeof COLUMNS;
  globalTags: string[];
  coloredTagDefs?: ColoredTag[];
  enableImageUpload?: boolean;
  onTagCreated: (tag: string) => void;
  onSave: (item: Omit<TodoItem, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const TodoModal: React.FC<TodoModalProps> = ({ initial, allColumns, globalTags, coloredTagDefs, enableImageUpload, onTagCreated, onSave, onClose }) => {
  const [title, setTitle]         = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [priority, setPriority]   = useState<Priority>(initial?.priority ?? 'medium');
  const [status, setStatus]       = useState<Status>(initial?.status ?? 'todo');
  const [dueDate, setDueDate]     = useState(initial?.dueDate ?? '');
  const [tags, setTags]           = useState<string[]>(initial?.tags ?? []);
  const [subtasks, setSubtasks]   = useState<Subtask[]>(initial?.subtasks ?? []);
  const [newSubtask, setNewSubtask] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
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
  const renameSubtask = (id: string, title: string) => setSubtasks(p => p.map(s => s.id === id ? { ...s, title } : s));

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
          {enableImageUpload ? (
            <RichTextArea
              value={description}
              onChange={setDescription}
              placeholder="Detalhes opcionais... Cole imagens com Ctrl+V"
              rows={3}
              enableImages
            />
          ) : (
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes opcionais..." rows={2}
              className="w-full bg-dark-card border border-dark-text/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/50 transition-all resize-none" />
          )}
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
              {tags.map(t => {
                const ctag = coloredTagDefs?.find(c => c.name.trim().toLowerCase() === t.trim().toLowerCase());
                return <TagPill key={t} label={t} color={ctag?.color} onRemove={() => toggleTag(t)} />;
              })}
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

              {/* List — colored tags when available, else plain tags */}
              <div className="max-h-44 overflow-y-auto">
                {coloredTagDefs && coloredTagDefs.length > 0 ? (
                  coloredTagDefs
                    .filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                    .map(ct => {
                      const selected = tags.includes(ct.name);
                      return (
                        <button
                          key={ct.id}
                          onMouseDown={e => { e.preventDefault(); toggleTag(ct.name); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-dark-text/5 transition-colors"
                        >
                          {selected
                            ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                            : <Circle size={14} className="text-dark-text/20 flex-shrink-0" />
                          }
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ct.color }} />
                          <span className="text-sm text-dark-text">{ct.name}</span>
                        </button>
                      );
                    })
                ) : (
                  globalTags
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
                    })
                  )}
                {(coloredTagDefs ? coloredTagDefs : globalTags).filter(t => {
                  const name = typeof t === 'string' ? t : (t as ColoredTag).name;
                  return name.toLowerCase().includes(tagSearch.toLowerCase());
                }).length === 0 && tagSearch === '' && (
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
                  {editingSubId === s.id ? (
                    <input
                      autoFocus
                      value={s.title}
                      onChange={e => renameSubtask(s.id, e.target.value)}
                      onBlur={() => setEditingSubId(null)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setEditingSubId(null); } }}
                      className="flex-1 bg-transparent border-b border-violet-500/50 text-sm text-dark-text focus:outline-none py-0.5"
                    />
                  ) : (
                    <span
                      className={`text-sm flex-1 text-dark-text cursor-text ${s.done ? 'line-through opacity-40' : ''}`}
                      onDoubleClick={() => !s.done && setEditingSubId(s.id)}
                      title="Clique duplo para editar"
                    >{s.title}</span>
                  )}
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
  coloredTagDefs?: ColoredTag[];
  enableImageUpload?: boolean;
  onEdit: () => void;
  onClose: () => void;
  onSubtaskToggle: (taskId: string, subtaskId: string) => void;
  onSubtasksReorder: (taskId: string, subtasks: Subtask[]) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onAddComment: (taskId: string, text: string) => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ item, allColumns, coloredTagDefs, enableImageUpload, onEdit, onClose, onSubtaskToggle, onSubtasksReorder, onAddSubtask, onAddComment }) => {
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
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
            {item.tags.map(t => {
              const ctag = coloredTagDefs?.find(c => c.name.trim().toLowerCase() === t.trim().toLowerCase());
              const tagStyle = ctag ? { backgroundColor: ctag.color + '22', color: ctag.color, borderColor: ctag.color + '55' } : undefined;
              return (
                <span key={t} className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                  ctag ? '' : 'bg-violet-500/10 border-violet-500/20 text-violet-500'
                }`} style={tagStyle}>{t}</span>
              );
            })}
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <p className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1.5">Descrição</p>
              {enableImageUpload ? (
                <div
                  className="text-sm text-dark-text/70 leading-relaxed rich-text-content"
                  dangerouslySetInnerHTML={{ __html: item.description }}
                />
              ) : (
                <p className="text-sm text-dark-text/70 leading-relaxed">{item.description}</p>
              )}
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

          {/* Add new subtask inline */}
          <div className="mt-2 flex items-center gap-2">
            <input
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newSubtask.trim()) {
                  onAddSubtask(item.id, newSubtask.trim());
                  setNewSubtask('');
                }
              }}
              placeholder="Adicionar subtarefa e pressionar Enter..."
              className="w-full bg-dark-bg border border-dark-text/10 rounded-xl px-3 py-2 text-xs text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/50 transition-all"
            />
            {newSubtask.trim() && (
              <button
                onClick={() => {
                  onAddSubtask(item.id, newSubtask.trim());
                  setNewSubtask('');
                }}
                className="shrink-0 w-8 h-8 flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

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
                  {enableImageUpload ? (
                    <div className="text-sm text-dark-text/80 leading-relaxed rich-text-content" dangerouslySetInnerHTML={{ __html: c.text }} />
                  ) : (
                    <p className="text-sm text-dark-text/80 leading-relaxed">{c.text}</p>
                  )}
                  <p className="text-[10px] text-dark-text/30 mt-1">
                    {new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
            {/* New comment */}
            <div className="flex gap-2 items-end">
              {enableImageUpload ? (
                <RichTextArea
                  value={newComment}
                  onChange={setNewComment}
                  placeholder="Adicionar um comentário... Cole imagens com Ctrl+V"
                  rows={2}
                  enableImages
                  className="flex-1"
                />
              ) : (
                <input
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitComment(); } }}
                  placeholder="Adicionar um comentário..."
                  className="flex-1 bg-dark-card border border-dark-text/10 rounded-xl px-3 py-2 text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/50 transition-all"
                />
              )}
              <button
                onClick={submitComment}
                disabled={!newComment.replace(/<[^>]*>/g,'').trim() && !newComment.includes('<img')}
                className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-all flex-shrink-0"
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

        <div>
          <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-1 block">Frequência</label>
          <select value={frequency} onChange={e => setFrequency(e.target.value as RecurringItem['frequency'])}
            className="w-full bg-dark-card border border-dark-text/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-blue-400/50 transition-all appearance-none cursor-pointer">
            {(Object.keys(FREQ_CONFIG) as RecurringItem['frequency'][]).map(f => <option key={f} value={f} className="bg-dark-bg">{FREQ_CONFIG[f].label}</option>)}
          </select>
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
  coloredTagDefs?: ColoredTag[];
  onView: (item: TodoItem) => void;
  onEdit: (item: TodoItem) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Status) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (e?: React.DragEvent) => void;
  isDragOver?: boolean;
}

const TodoRow: React.FC<RowProps> = ({ item, allColumns, coloredTagDefs, onView, onEdit, onDelete, onStatusChange, onDragStart, onDragOver, onDrop, isDragOver }) => {
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
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); onDragOver(item.id); }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); onDrop(e); }}
      onDragEnd={() => {}}
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
        {/* Title row: title on left, tag pill on right */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`flex-1 text-sm text-dark-text truncate hover:text-violet-400 transition-colors ${item.status === 'done' ? 'line-through opacity-40' : ''}`}
          >
            {item.title}
          </span>
          {item.tags.length > 0 && (() => {
            const ctag = coloredTagDefs?.find(c => c.name.trim().toLowerCase() === item.tags[0].trim().toLowerCase());
            const tagStyle = ctag
              ? { backgroundColor: ctag.color + '26', color: ctag.color, borderColor: ctag.color + '66' }
              : undefined;
            return (
              <span
                className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
                  ctag ? '' : 'bg-violet-500/10 text-violet-400 border-violet-500/15'
                }`}
                style={tagStyle}
              >
                {item.tags[0]}{item.tags.length > 1 ? ` +${item.tags.length - 1}` : ''}
              </span>
            );
          })()}
        </div>

        {/* Second row: date + subtasks only */}
        {(item.dueDate || item.subtasks.length > 0) && (
          <div className="flex items-center gap-2 mt-0.5">
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
            {item.subtasks.length > 0 && (() => {
              const done = item.subtasks.filter(s => s.done).length;
              const all = item.subtasks.length;
              const allDone = done === all;
              return (
                <span className={`flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${
                  allDone
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-dark-text/5 text-dark-text/40 border-dark-text/10'
                }`}>
                  <ListChecks size={9} />
                  {done}/{all}
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
  onToggle: (item: RecurringItem) => void;
}

const RecRow: React.FC<RecRowProps> = ({ item, onEdit, onDelete, onToggle }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const freq = FREQ_CONFIG[item.frequency];
  const isCompletedToday = item.last_completed && new Date(item.last_completed).toDateString() === new Date().toDateString();

  return (
    <div
      onClick={() => onEdit(item)}
      className={`group flex items-center gap-3 px-3 py-2 rounded-xl border transition-all duration-150 cursor-pointer ${
        isCompletedToday
          ? 'bg-dark-card/50 border-white/[0.02] opacity-50'
          : 'bg-dark-card border-white/[0.06] hover:border-blue-400/25'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(item);
        }}
        className="shrink-0 transition-transform hover:scale-110"
      >
        {isCompletedToday
          ? <CheckCircle2 size={16} className="text-blue-500" />
          : <Circle size={16} className="text-dark-text/30 group-hover:text-blue-400 transition-colors" />
        }
      </button>

      {/* Repeat icon */}
      <Repeat size={12} className="text-blue-400 flex-shrink-0" />

      {/* Title */}
      <span className={`text-sm flex-1 truncate ${isCompletedToday ? 'text-dark-text/50 line-through' : 'text-dark-text'}`}>
        {item.title}
      </span>

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
        <button onClick={(e) => { e.stopPropagation(); setMenuOpen(p => !p); }} className="w-6 h-6 rounded-lg flex items-center justify-center text-dark-text/30 opacity-0 group-hover:opacity-100 hover:bg-dark-text/10 hover:text-dark-text/70 transition-all">
          <MoreHorizontal size={13} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 z-20 w-32 bg-dark-card border border-dark-text/10 rounded-xl shadow-2xl py-1 overflow-hidden">
            <button onClick={(e) => { e.stopPropagation(); onEdit(item); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-text/70 hover:bg-dark-text/5 transition-colors">
              <Edit3 size={11} /> Editar
            </button>
            <div className="border-t border-dark-text/5 my-0.5" />
            <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors">
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

const TodoStaff: React.FC<{ activePage?: string; pageTitle?: string; pageSubtitle?: string; hideRecurring?: boolean; hideDocument?: boolean; enableColoredTags?: boolean; enableImageUpload?: boolean }> = ({ activePage, pageTitle, pageSubtitle, hideRecurring = false, hideDocument = false, enableColoredTags = false, enableImageUpload = false }) => {
  const [todos,      setTodos]      = useState<TodoItem[]>([]);
  const [recurring,  setRecurring]  = useState<RecurringItem[]>([]);
  const [ideas,      setIdeas]      = useState<IdeaItem[]>([]);
  const [globalTags, setGlobalTags] = useState<string[]>([...AVAILABLE_TAGS]);
  const [activeTab,  setActiveTab]  = useState<'tarefas' | 'ideias'>('tarefas');
  const [viewMode,   setViewMode]   = useState<'kanban' | 'list' | 'document'>('kanban');
  const [notesHtml,  setNotesHtml]  = useState<string>('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);

  // Document pages state
  const [docPages, setDocPages] = useState<{ id: string; page_id: string; title: string; content: string; sort_order: number; created_at: string; updated_at: string }[]>([]);
  const [activeDocPageId, setActiveDocPageId] = useState<string | null>(null);
  const [docPageDirty, setDocPageDirty] = useState(false);
  const [docPageSaving, setDocPageSaving] = useState(false);
  const [editingDocTitle, setEditingDocTitle] = useState<string | null>(null);
  const [docTitleInput, setDocTitleInput] = useState('');
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
  const [activePriority, setActivePriority] = useState<Priority | ''>('');
  const [activeDate, setActiveDate] = useState<string>('');
  const [collapsed,  setCollapsed]  = useState<Record<string, boolean>>({});
  const [todoSort, setTodoSort] = useState<'manual' | 'date' | 'priority' | 'tag'>('manual');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<Status>('todo');
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const tagFilterRef = useRef<HTMLDivElement>(null);
  const [dbLoaded, setDbLoaded] = useState(false);
  // Colored tags
  const [coloredTagDefs, setColoredTagDefs] = useState<ColoredTag[]>(() =>
    enableColoredTags ? loadColoredTags(activePage || 'default') : []
  );
  const [tagsModal, setTagsModal] = useState(false);

  // ── Load data from API on mount ──
  useEffect(() => {
    const queryStr = activePage ? `?page_id=${encodeURIComponent(activePage)}` : '';
    Promise.all([
      fetch(`/api/todo-staff/tasks${queryStr}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`/api/todo-staff/recurring${queryStr}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`/api/todo-staff/ideas${queryStr}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`/api/todo-staff/notes${queryStr}`).then(r => r.ok ? r.json() : { content: '' }).catch(() => ({ content: '' })),
      fetch(`/api/todo-staff/doc-pages${queryStr}`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([tasks, recs, ideasData, notesData, docPagesData]) => {
      setTodos(tasks);
      setRecurring(recs);
      setIdeas(ideasData);
      setNotesHtml(notesData.content || '');
      setDocPages(docPagesData);
      if (docPagesData.length > 0) setActiveDocPageId(docPagesData[0].id);
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

  // Persist colored tags on change
  useEffect(() => {
    if (enableColoredTags) saveColoredTags(activePage || 'default', coloredTagDefs);
  }, [coloredTagDefs, activePage, enableColoredTags]);

  // All unique tags used in todos (for the filter bar)
  const allTags = Array.from(new Set(todos.flatMap(t => t.tags))).sort();

  // Handler to create a new global tag
  const handleTagCreated = (tag: string) => {
    setGlobalTags(prev => prev.includes(tag) ? prev : [...prev, tag]);
  };

  const saveNotes = async () => {
    setNotesSaving(true);
    const queryStr = activePage ? `?page_id=${encodeURIComponent(activePage)}` : '';
    await apiCall('POST', `/api/todo-staff/notes${queryStr}`, { content: notesHtml });
    setNotesDirty(false);
    setNotesSaving(false);
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
    subtasks: t.subtasks, comments: t.comments, doneAt: t.doneAt, page_id: activePage || 'default'
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

  const addSubtask = (taskId: string, title: string) => {
    const newSub: Subtask = { id: uid(), title, done: false };
    setTodos(p => p.map(t => t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), newSub] } : t));
    setViewingTodo(prev => prev?.id === taskId ? { ...prev, subtasks: [...(prev.subtasks || []), newSub] } : prev);
    const item = todos.find(t => t.id === taskId);
    if (item) apiCall('PUT', `/api/todo-staff/tasks/${taskId}`, todoToApi({ ...item, subtasks: [...(item.subtasks || []), newSub] }));
  };

  // drag-and-drop state for task rows
  const dragFromId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);
  const [dragOverState, setDragOverState] = useState<string | null>(null);

  const handleTaskDragStart = (id: string) => { dragFromId.current = id; };
  const handleTaskDragOver  = (id: string) => { dragOverId.current = id; setDragOverState(id); };
  const handleTaskDrop = (e?: React.DragEvent) => {
    if (e) e.stopPropagation();
    const fromId = dragFromId.current;
    const toId   = dragOverId.current;
    if (!fromId || !toId || fromId === toId) { dragFromId.current = null; dragOverId.current = null; setDragOverState(null); return; }
    
    setTodos(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(t => t.id === fromId);
      const toIdx   = arr.findIndex(t => t.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      
      const toStatus = arr[toIdx].status;
      const [moved] = arr.splice(fromIdx, 1);
      
      if (moved.status !== toStatus) {
        moved.status = toStatus;
        if (toStatus === 'done') moved.doneAt = new Date().toISOString();
        else moved.doneAt = undefined;
        apiCall('PUT', `/api/todo-staff/tasks/${moved.id}`, todoToApi(moved));
      }
      
      arr.splice(toIdx, 0, moved);
      return arr;
    });
    dragFromId.current = null;
    dragOverId.current = null;
    setDragOverState(null);
  };

  const handleColDrop = (colId: Status, e: React.DragEvent) => {
    e.preventDefault();
    const fromId = dragFromId.current;
    if (!fromId) return;
    
    // If dropping on column space explicitly or dragOverId is clear
    if (dragOverState === `col-${colId}` || !dragOverId.current) {
      setTodos(prev => {
        const arr = [...prev];
        const fromIdx = arr.findIndex(t => t.id === fromId);
        if (fromIdx < 0) return prev;
        
        const [moved] = arr.splice(fromIdx, 1);
        if (moved.status !== colId) {
          moved.status = colId;
          if (colId === 'done') moved.doneAt = new Date().toISOString();
          else moved.doneAt = undefined;
          apiCall('PUT', `/api/todo-staff/tasks/${moved.id}`, todoToApi(moved));
        }
        
        arr.push(moved);
        return arr;
      });
    }
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
    apiCall('POST', '/api/todo-staff/recurring', { ...item, page_id: activePage || 'default' });
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
  const toggleRec = async (item: RecurringItem) => {
    const isCompletedToday = item.last_completed && new Date(item.last_completed).toDateString() === new Date().toDateString();
    const updated = { ...item, last_completed: isCompletedToday ? null : new Date().toISOString() };
    setRecurring(prev => prev.map(r => r.id === item.id ? updated : r));
    await apiCall('PUT', `/api/todo-staff/recurring/${item.id}`, updated);
  };

  // Handlers — ideas
  const createIdea = (data: Omit<IdeaItem, 'id' | 'createdAt'>) => {
    const item: IdeaItem = { ...data, comments: data.comments ?? [], id: uid(), createdAt: new Date().toISOString() };
    setIdeas(p => [item, ...p]);
    apiCall('POST', '/api/todo-staff/ideas', { ...item, page_id: activePage || 'default' });
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
    const matchPriority = !activePriority || t.priority === activePriority;
    const matchDate = !activeDate || (t.dueDate && t.dueDate === activeDate);
    return matchSearch && matchTag && matchPriority && matchDate;
  });
  const byStatus = (s: Status) => filtered.filter(t => t.status === s);

  // Map JS getDay() (0=Sun) to Portuguese day names used in DAYS_OF_WEEK
  const todayDayName = (() => {
    const map = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return map[new Date().getDay()];
  })();

  const filteredRec = recurring.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;

    // Diário: always show
    if (r.frequency === 'diario') return true;

    // Semanal: only show on the configured day
    if (r.frequency === 'semanal') {
      if (!r.dayOfWeek) return true; // no day configured = show always
      return r.dayOfWeek === todayDayName;
    }

    // Mensal: always show (or could add day-of-month logic later)
    return true;
  });

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
          <h1 className="text-2xl font-black tracking-tight text-dark-text">{pageTitle ? pageTitle.replace(/\s+(\S+)$/, '') : 'TODO'} <span className="text-violet-500">{pageTitle ? pageTitle.match(/\S+$/)?.[0] : 'Staff'}</span></h1>
          <p className="text-[10px] font-bold text-dark-text/30 uppercase tracking-widest mt-0.5">{pageSubtitle || 'Organização interna do time · seção grape'}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'tarefas' ? (
            <>
              {!hideRecurring && (
                <button onClick={openNewRec} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-500 text-xs font-bold border border-blue-500/20 transition-all">
                  <RefreshCw size={13} /> Recorrente
                </button>
              )}
              {enableColoredTags && (
                <button onClick={() => setTagsModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-dark-card hover:bg-dark-card/80 text-dark-text/60 hover:text-dark-text text-xs font-bold border border-white/[0.07] transition-all">
                  <Tag size={13} /> Tags
                </button>
              )}
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

        {/* Filters dropdown */}
        <div className="relative" ref={tagFilterRef}>
          <button
            onClick={() => setTagFilterOpen(p => !p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              tagFilterOpen || activeTag || activePriority || activeDate
                ? 'bg-violet-600/15 border-violet-500/40 text-violet-500'
                : 'bg-dark-card border-white/[0.07] text-dark-text/60 hover:border-violet-400/30 hover:text-violet-500'
            }`}
          >
            <Filter size={12} />
            <span>Filtros</span>
            {(activeTag || activePriority || activeDate) && (
              <span className="bg-violet-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px]">
                {[activeTag, activePriority, activeDate].filter(Boolean).length}
              </span>
            )}
            <ChevronDown size={11} className={`transition-transform ${tagFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {tagFilterOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-30 w-56 bg-dark-card border border-dark-text/10 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden flex flex-col p-2 gap-3">
              {/* Prioridade */}
              <div>
                <span className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest px-2 mb-1.5 block">Prioridade</span>
                <div className="flex flex-wrap gap-1 px-1">
                  {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => (
                    <button key={p} onClick={() => setActivePriority(prev => prev === p ? '' : p)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                        activePriority === p
                          ? 'bg-violet-500 text-white border-violet-500'
                          : 'bg-dark-text/5 text-dark-text/60 border-transparent hover:bg-dark-text/10'
                      }`}>
                      {PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data */}
              <div>
                <span className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest px-2 mb-1.5 block">Data</span>
                <div className="px-2">
                  <input
                    type="date"
                    value={activeDate}
                    onChange={(e) => setActiveDate(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-text/10 rounded-lg px-2 py-1.5 text-xs text-dark-text focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
                  />
                  {activeDate && (
                    <button onClick={() => setActiveDate('')} className="text-[10px] text-red-400 hover:text-red-300 mt-1">
                      Limpar data
                    </button>
                  )}
                </div>
              </div>

              {/* Tags */}
              {allTags.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest px-2 mb-1.5 block">Tags</span>
                  <div className="max-h-32 overflow-y-auto custom-scrollbar px-1">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setActiveTag(prev => prev === tag ? '' : tag)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-colors ${
                          activeTag === tag
                            ? 'bg-violet-600/15 text-violet-500 font-bold'
                            : 'text-dark-text/70 hover:bg-dark-text/5'
                        }`}
                      >
                        {activeTag === tag ? <CheckCircle2 size={12} className="text-violet-500" /> : <Circle size={12} className="text-dark-text/20" />}
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(activeTag || activePriority || activeDate) && (
                <div className="px-1 pt-1 mt-1 border-t border-dark-text/10">
                  <button onClick={() => { setActiveTag(''); setActivePriority(''); setActiveDate(''); }} className="w-full py-1.5 text-[10px] font-bold text-dark-text/40 hover:text-dark-text/80 transition-colors">
                    Limpar todos
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto inline-flex items-center gap-1 bg-dark-card border border-white/[0.06] rounded-xl p-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'kanban'
                ? 'bg-violet-600/15 text-violet-500'
                : 'text-dark-text/50 hover:text-dark-text/80'
            }`}
          >
            <LayoutGrid size={13} /> Kanban
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-violet-600/15 text-violet-500'
                : 'text-dark-text/50 hover:text-dark-text/80'
            }`}
          >
            <AlignJustify size={13} /> Lista
          </button>
          {!hideDocument && (
            <button
              onClick={() => setViewMode('document')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'document'
                  ? 'bg-violet-600/15 text-violet-500'
                  : 'text-dark-text/50 hover:text-dark-text/80'
              }`}
            >
              <FileText size={13} /> Documento
            </button>
          )}
        </div>
      </div>

      {viewMode === 'document' ? (
        <div className="px-6 md:px-8 pb-10">
          <div className="flex gap-0 bg-dark-card border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl" style={{ minHeight: '70vh' }}>
            {/* Sidebar */}
            <div className="w-56 flex-shrink-0 border-r border-white/[0.06] flex flex-col">
              <div className="px-4 py-4 border-b border-white/[0.06]">
                <p className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest">Páginas</p>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar py-2 px-2 space-y-0.5">
                {docPages.map(page => (
                  <div
                    key={page.id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${
                      activeDocPageId === page.id
                        ? 'bg-violet-600/15 text-violet-400'
                        : 'text-dark-text/60 hover:bg-white/[0.04] hover:text-dark-text'
                    }`}
                    onClick={() => {
                      // Save current page before switching
                      if (docPageDirty && activeDocPageId) {
                        const currentPage = docPages.find(p => p.id === activeDocPageId);
                        if (currentPage) {
                          apiCall('PUT', `/api/todo-staff/doc-pages/${activeDocPageId}`, { title: currentPage.title, content: currentPage.content });
                        }
                      }
                      setActiveDocPageId(page.id);
                      setDocPageDirty(false);
                    }}
                  >
                    <FileText size={13} className="flex-shrink-0 opacity-50" />
                    {editingDocTitle === page.id ? (
                      <input
                        autoFocus
                        value={docTitleInput}
                        onChange={e => setDocTitleInput(e.target.value)}
                        onBlur={() => {
                          if (docTitleInput.trim()) {
                            setDocPages(prev => prev.map(p => p.id === page.id ? { ...p, title: docTitleInput.trim() } : p));
                            apiCall('PUT', `/api/todo-staff/doc-pages/${page.id}`, { title: docTitleInput.trim(), content: page.content });
                          }
                          setEditingDocTitle(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditingDocTitle(null);
                        }}
                        className="flex-1 min-w-0 bg-transparent text-xs font-medium text-dark-text outline-none border-b border-violet-500"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="flex-1 min-w-0 text-xs font-medium truncate"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingDocTitle(page.id);
                          setDocTitleInput(page.title);
                        }}
                      >{page.title}</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Excluir esta página?')) {
                          const newPages = docPages.filter(p => p.id !== page.id);
                          setDocPages(newPages);
                          if (activeDocPageId === page.id) {
                            setActiveDocPageId(newPages.length > 0 ? newPages[0].id : null);
                          }
                          apiCall('DELETE', `/api/todo-staff/doc-pages/${page.id}`);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md text-dark-text/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-2 py-3 border-t border-white/[0.06]">
                <button
                  onClick={() => {
                    const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
                    const today = new Date();
                    const title = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getFullYear()).slice(2)}`;
                    const newPage = {
                      id: newId,
                      page_id: activePage || 'default',
                      title,
                      content: '',
                      sort_order: docPages.length,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    };
                    setDocPages(prev => [...prev, newPage]);
                    setActiveDocPageId(newId);
                    setDocPageDirty(false);
                    apiCall('POST', '/api/todo-staff/doc-pages', newPage);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-dark-text/40 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                >
                  <Plus size={13} />
                  Adicionar página
                </button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col min-w-0">
              {activeDocPageId && docPages.find(p => p.id === activeDocPageId) ? (
                <>
                  {/* Page Header */}
                  <div className="px-8 pt-6 pb-4 border-b border-white/[0.06]">
                    <input
                      value={docPages.find(p => p.id === activeDocPageId)?.title || ''}
                      onChange={e => {
                        setDocPages(prev => prev.map(p => p.id === activeDocPageId ? { ...p, title: e.target.value } : p));
                        setDocPageDirty(true);
                      }}
                      className="text-2xl font-black text-dark-text bg-transparent outline-none w-full placeholder:text-dark-text/20"
                      placeholder="Título da página..."
                    />
                    <p className="text-[10px] text-dark-text/30 mt-1">
                      Atualizado por último {new Date(docPages.find(p => p.id === activeDocPageId)?.updated_at || '').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {/* Editor */}
                  <div className="flex-1 px-8 py-6 overflow-y-auto custom-scrollbar">
                    <RichTextEditor
                      key={activeDocPageId}
                      content={docPages.find(p => p.id === activeDocPageId)?.content || ''}
                      onChange={html => {
                        setDocPages(prev => prev.map(p => p.id === activeDocPageId ? { ...p, content: html, updated_at: new Date().toISOString() } : p));
                        setDocPageDirty(true);
                      }}
                    />
                  </div>
                  {/* Save bar */}
                  {docPageDirty && (
                    <div className="px-8 py-3 border-t border-white/[0.06] flex justify-end">
                      <button
                        onClick={async () => {
                          setDocPageSaving(true);
                          const page = docPages.find(p => p.id === activeDocPageId);
                          if (page) {
                            await apiCall('PUT', `/api/todo-staff/doc-pages/${activeDocPageId}`, { title: page.title, content: page.content });
                          }
                          setDocPageDirty(false);
                          setDocPageSaving(false);
                        }}
                        disabled={docPageSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        {docPageSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-dark-text/30 gap-3">
                  <FileText size={40} className="opacity-20" />
                  <p className="text-sm font-medium">Selecione uma página ou crie uma nova</p>
                  <button
                    onClick={() => {
                      const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
                      const today = new Date();
                      const title = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getFullYear()).slice(2)}`;
                      const newPage = {
                        id: newId,
                        page_id: activePage || 'default',
                        title,
                        content: '',
                        sort_order: docPages.length,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      };
                      setDocPages(prev => [...prev, newPage]);
                      setActiveDocPageId(newId);
                      apiCall('POST', '/api/todo-staff/doc-pages', newPage);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    <Plus size={13} /> Criar primeira página
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 md:px-8 pb-10">
          <div className={viewMode === 'kanban' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" : "flex flex-col gap-6"}>

          {/* ── 3 colunas de status ─── */}
          {COLUMNS.map(col => {
            let items = byStatus(col.id);
            
            // Sort "A Fazer" items
            if (col.id === 'todo' && todoSort !== 'manual') {
              items = [...items].sort((a, b) => {
                if (todoSort === 'date') {
                  if (!a.dueDate && !b.dueDate) return 0;
                  if (!a.dueDate) return 1;
                  if (!b.dueDate) return -1;
                  return a.dueDate.localeCompare(b.dueDate);
                }
                if (todoSort === 'priority') {
                  const order: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
                  return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
                }
                if (todoSort === 'tag') {
                  const orderMap: Record<string, number> = {
                    'erros': 0,
                    'otimização': 1,
                    'otimizacao': 1,
                    'desenvolvimento': 2
                  };
                  const tagA = a.tags[0]?.toLowerCase() || 'zzzz';
                  const tagB = b.tags[0]?.toLowerCase() || 'zzzz';
                  const orderA = orderMap[tagA] ?? 99;
                  const orderB = orderMap[tagB] ?? 99;
                  if (orderA !== orderB) return orderA - orderB;
                  return tagA.localeCompare(tagB);
                }
                return 0;
              });
            }
            
            const isCollapsed = collapsed[col.id];
            return (
              <div key={col.id} className="flex flex-col gap-2">
                <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r ${col.color} border border-white/[0.06]`}>
                  <div className="flex items-center gap-2">
                    <span className="text-dark-text/40">{col.icon}</span>
                    <span className="text-[11px] font-bold text-dark-text uppercase tracking-widest">{col.label}</span>
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-dark-text/10 flex items-center justify-center text-[10px] font-black text-dark-text/50">{items.length + (col.id === 'todo' ? filteredRec.length : 0)}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {col.id === 'todo' && (
                      <div className="relative">
                        <button 
                          onClick={() => setSortDropdownOpen(p => !p)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${todoSort !== 'manual' ? 'text-violet-400 bg-violet-500/15' : 'text-dark-text/40 hover:text-violet-500 hover:bg-violet-500/10'}`}
                        >
                          <ArrowUpDown size={12} />
                        </button>
                        {sortDropdownOpen && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-dark-bg border border-dark-text/10 rounded-xl shadow-2xl shadow-black/30 z-30 overflow-hidden">
                            {([['manual', 'Manual'], ['date', 'Data'], ['priority', 'Prioridade'], ['tag', 'Tag']] as const).map(([key, label]) => (
                              <button
                                key={key}
                                onClick={() => { setTodoSort(key); setSortDropdownOpen(false); }}
                                className={`w-full px-3 py-2 text-left text-[11px] font-semibold transition-colors ${
                                  todoSort === key ? 'text-violet-400 bg-violet-500/10' : 'text-dark-text/60 hover:bg-dark-text/5 hover:text-dark-text'
                                }`}
                              >
                                {todoSort === key && <Check size={10} className="inline mr-1.5" />}{label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={() => openNewTodo(col.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-dark-text/40 hover:text-violet-500 hover:bg-violet-500/10 transition-all"><Plus size={13} /></button>
                    <button onClick={() => toggleCol(col.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-all">
                      {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    </button>
                  </div>
                </div>
                {!isCollapsed && (
                  <div
                    className={`flex flex-col gap-1.5 min-h-[100px] p-1 -m-1 rounded-2xl transition-colors ${dragOverState === `col-${col.id}` ? 'bg-white/5 border border-dashed border-white/10' : ''}`}
                    onDragOver={e => {
                      e.preventDefault();
                      setDragOverState(`col-${col.id}`);
                    }}
                    onDragLeave={() => {
                      if (dragOverState === `col-${col.id}`) setDragOverState(null);
                    }}
                    onDrop={e => handleColDrop(col.id, e)}
                  >
                    {/* Recurring items inside A Fazer */}
                    {col.id === 'todo' && filteredRec.length > 0 && (
                      <>
                        {filteredRec.map(item => (
                          <RecRow
                            key={item.id} item={item}
                            onEdit={item => { setEditingRec(item); setRecModal(true); }}
                            onDelete={deleteRec}
                            onToggle={toggleRec}
                          />
                        ))}
                      </>
                    )}
                    {items.length === 0 && (col.id !== 'todo' || filteredRec.length === 0)
                      ? <EmptyCol onAdd={() => openNewTodo(col.id)} label="Adicionar" />
                      : items.map((item, idx) => (
                        <React.Fragment key={item.id}>
                          {dragOverState === item.id && <DropLine />}
                          <TodoRow
                            item={item} allColumns={COLUMNS}
                            coloredTagDefs={enableColoredTags ? coloredTagDefs : undefined}
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

        </div>
      </div>
      )}
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
          coloredTagDefs={enableColoredTags ? coloredTagDefs : undefined}
          enableImageUpload={enableImageUpload}
          onEdit={() => { setEditing(viewingTodo); setViewingTodo(undefined); setTodoModal(true); }}
          onClose={() => setViewingTodo(undefined)}
          onSubtaskToggle={toggleSubtask}
          onSubtasksReorder={reorderSubtasks}
          onAddSubtask={addSubtask}
          onAddComment={addComment}
        />
      )}
      {todoModal && (
        <TodoModal
          initial={editing ?? { status: defaultStatus }}
          allColumns={COLUMNS}
          globalTags={globalTags}
          coloredTagDefs={enableColoredTags ? coloredTagDefs : undefined}
          enableImageUpload={enableImageUpload}
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
      {tagsModal && enableColoredTags && (
        <TagsManagerModal
          tags={coloredTagDefs}
          onChange={setColoredTagDefs}
          onClose={() => setTagsModal(false)}
        />
      )}
    </div>
  );
};

export default TodoStaff;
