import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SplitHeadline from '../components/SplitHeadline';
import { createPortal } from 'react-dom';
import { Plus, ChevronDown, ChevronRight, Calendar, Users, Tag, MoreHorizontal, Circle, CheckCircle2, Loader2, X, Trash2, GripVertical, Settings, FileText, Link as LinkIcon, Save, Heading1, Heading2, Heading3, Type, List, ListOrdered, CheckSquare, Check, Paperclip, Upload, MessageCircle, Clock, Image as ImageIcon, Download, Eye, Edit2, Palette, Flag, Ban } from 'lucide-react';
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
  responsavel_projeto_id?: string | null;
  responsavel_projeto_name?: string | null;
  responsavel_projeto_avatar?: string | null;
  hospedagem?: string | null;
  entregavel?: string | null;
  prioridade?: string | null;
}

interface Comment {
  id: number;
  task_id: number;
  author_name: string | null;
  author_email: string | null;
  author_avatar: string | null;
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

// ── Column Config Context ─────────────────────────────────
interface ColumnOption {
  label: string;
  color: string;
}

interface ColumnConfig {
  entregavel: ColumnOption[];
  hospedagem: ColumnOption[];
  squad: ColumnOption[];
}

const COLOR_PALETTE = [
  { id: 'sky',     hex: '#38bdf8', bg: 'rgba(56,189,248,0.15)',  border: 'rgba(56,189,248,0.3)' },
  { id: 'blue',    hex: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.3)' },
  { id: 'violet',  hex: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)' },
  { id: 'fuchsia', hex: '#e879f9', bg: 'rgba(232,121,249,0.15)', border: 'rgba(232,121,249,0.3)' },
  { id: 'rose',    hex: '#fb7185', bg: 'rgba(251,113,133,0.15)', border: 'rgba(251,113,133,0.3)' },
  { id: 'orange',  hex: '#fb923c', bg: 'rgba(251,146,60,0.15)',  border: 'rgba(251,146,60,0.3)' },
  { id: 'amber',   hex: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.3)' },
  { id: 'lime',    hex: '#a3e635', bg: 'rgba(163,230,53,0.15)',  border: 'rgba(163,230,53,0.3)' },
  { id: 'emerald', hex: '#34d399', bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.3)' },
  { id: 'teal',    hex: '#2dd4bf', bg: 'rgba(45,212,191,0.15)',  border: 'rgba(45,212,191,0.3)' },
  { id: 'cyan',    hex: '#22d3ee', bg: 'rgba(34,211,238,0.15)',  border: 'rgba(34,211,238,0.3)' },
  { id: 'slate',   hex: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)' },
];

const getColorStyle = (hex: string) => {
  const c = COLOR_PALETTE.find(p => p.hex === hex);
  if (c) return { bg: c.bg, border: c.border, text: c.hex };
  // fallback for custom hex
  return { bg: `${hex}26`, border: `${hex}4D`, text: hex };
};

const DEFAULT_COLUMN_CONFIG: ColumnConfig = {
  entregavel: [
    { label: 'Site', color: '#38bdf8' },
    { label: 'Landing Page', color: '#a78bfa' },
    { label: 'E-commerce', color: '#fb923c' },
    { label: 'Blog', color: '#34d399' },
    { label: 'App', color: '#e879f9' },
  ],
  hospedagem: [
    { label: 'Hostinger', color: '#fb923c' },
    { label: 'Vercel', color: '#94a3b8' },
    { label: 'AWS', color: '#fbbf24' },
    { label: 'GoDaddy', color: '#34d399' },
    { label: 'Locaweb', color: '#60a5fa' },
  ],
  squad: [
    { label: 'Squad Able', color: '#60a5fa' },
    { label: 'Squad Baker', color: '#e879f9' },
  ],
};

const migrateOptions = (arr: any[], defaults: ColumnOption[]): ColumnOption[] => {
  if (!Array.isArray(arr)) return defaults;
  return arr.map((item, i) => {
    if (typeof item === 'string') {
      // migrate old string format → object with color
      const defaultColor = COLOR_PALETTE[i % COLOR_PALETTE.length].hex;
      return { label: item, color: defaultColor };
    }
    if (item && typeof item === 'object' && item.label) {
      return { label: item.label, color: item.color || COLOR_PALETTE[0].hex };
    }
    return defaults[i] || { label: String(item), color: COLOR_PALETTE[0].hex };
  });
};

const loadColumnConfig = (): ColumnConfig => {
  try {
    const saved = localStorage.getItem('visualhub-column-config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        entregavel: migrateOptions(parsed.entregavel, DEFAULT_COLUMN_CONFIG.entregavel),
        hospedagem: migrateOptions(parsed.hospedagem, DEFAULT_COLUMN_CONFIG.hospedagem),
        squad: migrateOptions(parsed.squad, DEFAULT_COLUMN_CONFIG.squad),
      };
    }
  } catch { /* silent */ }
  return DEFAULT_COLUMN_CONFIG;
};

const ColumnConfigContext = React.createContext<ColumnConfig>(DEFAULT_COLUMN_CONFIG);

// ── Status Groups Context ─────────────────────────────────
type StatusGroupDef = Omit<StatusGroup, 'tasks'>;
const StatusGroupsContext = React.createContext<StatusGroupDef[]>([]);

const STATUS_COLOR_PALETTE = [
  '#7c3aed', '#6d28d9', '#8b5cf6', '#a78bfa',
  '#ea580c', '#f97316', '#ef4444', '#f43f5e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#d946ef', '#ec4899',
  '#84cc16', '#eab308', '#f59e0b', '#78716c',
  '#52525b', '#3f3f46', '#94a3b8', '#64748b',
];

const STATUS_EMOJI_OPTIONS = ['🔵', '🟠', '🟢', '🔴', '🟡', '🟣', '⚪', '⬜', '⏳', '🚀', '✅', '📝', '🎯', '🔧', '📋', '💡'];

// helper to find an option's color by label
const findOptionColor = (options: ColumnOption[], label: string | null | undefined): ReturnType<typeof getColorStyle> | null => {
  if (!label) return null;
  const opt = options.find(o => o.label === label);
  return opt ? getColorStyle(opt.color) : null;
};

// ── Column Config Modal ──────────────────────────────────
const COLUMN_LABELS: Record<keyof ColumnConfig, string> = {
  entregavel: 'Entregável',
  hospedagem: 'Hospedagem',
  squad: 'Squad',
};

const TAB_COLORS: Record<keyof ColumnConfig, { bg: string; text: string; border: string }> = {
  entregavel: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30' },
  hospedagem: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  squad: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30' },
};

const ColumnConfigModal = ({ config, onSave, onClose }: { config: ColumnConfig; onSave: (c: ColumnConfig) => void; onClose: () => void }) => {
  const [draft, setDraft] = useState<ColumnConfig>({
    entregavel: config.entregavel.map(o => ({ ...o })),
    hospedagem: config.hospedagem.map(o => ({ ...o })),
    squad: config.squad.map(o => ({ ...o })),
  });
  const [activeTab, setActiveTab] = useState<keyof ColumnConfig>('entregavel');
  const [newOption, setNewOption] = useState('');
  const [newColor, setNewColor] = useState(COLOR_PALETTE[0].hex);
  const [editingColorIdx, setEditingColorIdx] = useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addOption = () => {
    const val = newOption.trim();
    if (!val || draft[activeTab].some(o => o.label === val)) return;
    setDraft(prev => ({ ...prev, [activeTab]: [...prev[activeTab], { label: val, color: newColor }] }));
    setNewOption('');
    setNewColor(COLOR_PALETTE[(draft[activeTab].length + 1) % COLOR_PALETTE.length].hex);
    inputRef.current?.focus();
  };

  const removeOption = (idx: number) => {
    setDraft(prev => ({ ...prev, [activeTab]: prev[activeTab].filter((_, i) => i !== idx) }));
    if (editingColorIdx === idx) setEditingColorIdx(null);
  };

  const changeColor = (idx: number, hex: string) => {
    setDraft(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map((o, i) => i === idx ? { ...o, color: hex } : o),
    }));
    setEditingColorIdx(null);
  };

  const handleSave = () => {
    localStorage.setItem('visualhub-column-config', JSON.stringify(draft));
    onSave(draft);
    onClose();
  };

  const tabs: (keyof ColumnConfig)[] = ['entregavel', 'hospedagem', 'squad'];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5">
          <div>
            <h2 className="text-base font-bold text-dark-text flex items-center gap-2">
              <Settings size={18} className="text-violet-500" />
              Configurar Colunas
            </h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Defina as opções e cores dos dropdowns das colunas</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4 pb-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            const c = TAB_COLORS[tab];
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setNewOption(''); setEditingColorIdx(null); }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                  isActive
                    ? `${c.bg} ${c.text} border ${c.border}`
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {COLUMN_LABELS[tab]}
                <span className={`ml-1.5 px-1 py-0 rounded text-[9px] ${isActive ? 'bg-white/10' : 'bg-white/5'}`}>
                  {draft[tab].length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Options list */}
        <div className="flex-1 overflow-y-auto px-6 py-3 max-h-[340px]">
          {draft[activeTab].length === 0 ? (
            <p className="text-center text-slate-600 text-xs py-6">Nenhuma opção definida</p>
          ) : (
            <div className="space-y-1.5">
              {draft[activeTab].map((opt, idx) => {
                const cs = getColorStyle(opt.color);
                const isEditing = editingColorIdx === idx;
                return (
                  <div key={`${opt.label}-${idx}`}>
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border group transition-all"
                      style={{ background: cs.bg, borderColor: cs.border }}
                    >
                      {/* Color dot — click to toggle picker */}
                      <button
                        onClick={() => setEditingColorIdx(isEditing ? null : idx)}
                        className="w-4 h-4 rounded-full shrink-0 border-2 transition-transform hover:scale-125"
                        style={{ backgroundColor: opt.color, borderColor: cs.border }}
                        title="Alterar cor"
                      />
                      <span className="flex-1 text-xs font-semibold" style={{ color: cs.text }}>{opt.label}</span>
                      <button
                        onClick={() => removeOption(idx)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {/* Inline color picker */}
                    {isEditing && (
                      <div className="flex items-center gap-1.5 px-3 py-2 mt-0.5 bg-white/[0.03] rounded-xl border border-white/5">
                        {COLOR_PALETTE.map(c => (
                          <button
                            key={c.id}
                            onClick={() => changeColor(idx, c.hex)}
                            className="w-5 h-5 rounded-full border-2 transition-all hover:scale-125"
                            style={{
                              backgroundColor: c.hex,
                              borderColor: opt.color === c.hex ? '#fff' : 'transparent',
                              boxShadow: opt.color === c.hex ? `0 0 0 2px ${c.hex}` : 'none',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add new option */}
        <div className="px-6 py-3 border-t border-white/5">
          <div className="flex items-center gap-2">
            {/* Color preview for new option */}
            <button
              onClick={() => {
                const curIdx = COLOR_PALETTE.findIndex(c => c.hex === newColor);
                const next = COLOR_PALETTE[(curIdx + 1) % COLOR_PALETTE.length];
                setNewColor(next.hex);
              }}
              className="w-6 h-6 rounded-full shrink-0 border-2 border-white/20 transition-transform hover:scale-110"
              style={{ backgroundColor: newColor }}
              title="Clique para trocar a cor"
            />
            <input
              ref={inputRef}
              type="text"
              value={newOption}
              onChange={e => setNewOption(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addOption()}
              placeholder={`Nova opção para ${COLUMN_LABELS[activeTab]}...`}
              className="flex-1 bg-white/5 border border-white/10 focus:border-violet-500/50 rounded-xl px-3 py-2 text-xs text-dark-text placeholder-slate-600 focus:outline-none transition-all"
            />
            <button
              onClick={addOption}
              disabled={!newOption.trim()}
              className="px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
            >
              <Plus size={12} />
              Adicionar
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/5">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Save size={12} />
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const DEFAULT_STATUS_GROUPS: Omit<StatusGroup, 'tasks'>[] = [
  { id: 'revisao-iii',        label: 'REVISÃO III',         color: '#7c3aed', emoji: '🔵' },
  { id: 'alteracao-ii',       label: 'ALTERAÇÃO II',        color: '#6d28d9', emoji: '🔵' },
  { id: 'revisao-ii',         label: 'REVISÃO II',          color: '#7c3aed', emoji: '🔵' },
  { id: 'alteracao-i',        label: 'ALTERAÇÃO I',         color: '#6d28d9', emoji: '🔵' },
  { id: 'revisao-i',          label: 'REVISÃO I',           color: '#7c3aed', emoji: '🔵' },
  { id: 'em-desenvolvimento', label: 'EM DESENVOLVIMENTO',  color: '#ea580c', emoji: '🟠' },
  { id: 'a-desenvolver',      label: 'A DESENVOLVER',       color: '#52525b', emoji: '⬜' },
  { id: 'aguardando-copy',    label: 'AGUARDANDO COPY',     color: '#3f3f46', emoji: '⏳' },
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

  // Validate: must be YYYY-MM-DD
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
// ── Inline file cell + fullscreen preview ──────────────────────
const TaskFilesCell = ({ taskId }: { taskId: number }) => {
  const [files, setFiles] = React.useState<TaskFile[]>([]);
  const [previewFile, setPreviewFile] = React.useState<TaskFile | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetch(`/api/visual-hub-files?task_id=${taskId}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setFiles(data))
      .catch(() => {});
  }, [taskId]);

  const uploadFile = (file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const type: TaskFile['type'] = isImg ? 'image' : isPdf ? 'doc' : 'link';
      try {
        const res = await fetch('/api/visual-hub-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: taskId, name: file.name, url: base64, type }),
        });
        if (res.ok) { const f = await res.json(); setFiles(prev => [...prev, f]); }
      } catch { /**/ } finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const isImg = (f: TaskFile) => f.type === 'image' || f.url?.startsWith('data:image');
  const isPdf = (f: TaskFile) => f.type === 'doc' || f.url?.startsWith('data:application/pdf');

  const deleteFile = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/visual-hub-files/${id}`, { method: 'DELETE' });
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <>
      <div
        className={`shrink-0 w-24 flex items-center gap-1 relative group/fc transition-all ${
          isDragOver ? 'bg-violet-500/10 rounded-lg' : ''
        }`}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => {
          e.preventDefault(); setIsDragOver(false);
          Array.from(e.dataTransfer.files).forEach(uploadFile);
        }}
      >
        <input
          ref={fileInputRef}
          type="file" className="hidden"
          accept="image/*,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
          multiple
          onChange={e => { Array.from(e.target.files || []).forEach(uploadFile); e.target.value = ''; }}
        />

        {/* Thumbnails */}
        <div className="flex items-center gap-1 flex-wrap">
          {files.slice(0, 3).map(f => (
            <div key={f.id} className="group/thumb relative cursor-pointer" onClick={() => setPreviewFile(f)}>
              {isImg(f) ? (
                <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/10 hover:border-violet-500/60 transition-colors bg-black/20">
                  <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className={`w-7 h-7 rounded-lg border border-white/10 hover:border-violet-500/60 transition-colors flex items-center justify-center ${isPdf(f) ? 'bg-rose-500/15 text-rose-400' : 'bg-violet-500/15 text-violet-400'}`}>
                  <FileText size={12} />
                </div>
              )}
              <button
                onClick={e => deleteFile(f.id, e)}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-all"
              >
                <X size={7} />
              </button>
            </div>
          ))}
          {files.length > 3 && (
            <span className="text-[9px] text-slate-500 font-bold">+{files.length - 3}</span>
          )}
        </div>

        {/* Add button — visible on row hover */}
        <button
          onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
          className={`w-5 h-5 rounded-md border border-dashed border-slate-700 hover:border-violet-500/60 text-slate-700 hover:text-violet-400 flex items-center justify-center transition-all shrink-0 ${
            files.length === 0 ? 'opacity-40 group-hover/fc:opacity-100' : 'opacity-0 group-hover/fc:opacity-100'
          }`}
          title="Adicionar arquivo"
        >
          {uploading
            ? <div className="w-2.5 h-2.5 border border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            : <Plus size={9} />
          }
        </button>
      </div>

      {/* Fullscreen preview */}
      {previewFile && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl" onClick={() => setPreviewFile(null)}>
          <div
            className="bg-[#0d0d14] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: '92vw', height: '92vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isImg(previewFile) ? 'bg-violet-500/15 text-violet-400' : isPdf(previewFile) ? 'bg-rose-500/15 text-rose-400' : 'bg-violet-500/15 text-violet-400'
                }`}>
                  <FileText size={14} />
                </div>
                <span className="text-sm font-bold text-white truncate">{previewFile.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Navigate arrows */}
                {files.length > 1 && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); const idx = files.findIndex(f => f.id === previewFile.id); setPreviewFile(files[(idx - 1 + files.length) % files.length]); }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <span className="text-[10px] text-slate-600">{files.findIndex(f => f.id === previewFile.id) + 1} / {files.length}</span>
                    <button
                      onClick={e => { e.stopPropagation(); const idx = files.findIndex(f => f.id === previewFile.id); setPreviewFile(files[(idx + 1) % files.length]); }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </>
                )}
                <a
                  href={previewFile.url} download={previewFile.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Baixar
                </a>
                <button onClick={() => setPreviewFile(null)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {isImg(previewFile) ? (
                <div className="w-full h-full flex items-center justify-center bg-black/40 p-6">
                  <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                </div>
              ) : isPdf(previewFile) ? (
                <iframe src={previewFile.url} className="w-full h-full border-none" title={previewFile.name} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-5 text-slate-500">
                  <FileText size={80} className="opacity-10" />
                  <p className="text-base">Visualização não disponível para este tipo de arquivo.</p>
                  <a href={previewFile.url} download={previewFile.name} className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-colors">
                    Baixar arquivo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

// ── Priority Config & Picker ──────────────────────────────
const PRIORITY_OPTIONS = [
  { value: 'Urgente', label: 'Urgente', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
  { value: 'Alta',    label: 'Alta',    color: '#f97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)' },
  { value: 'Normal',  label: 'Normal',  color: '#eab308', bg: 'rgba(234,179,8,0.15)',  border: 'rgba(234,179,8,0.3)' },
  { value: 'Baixa',   label: 'Baixa',   color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
] as const;

const getPriorityConfig = (value: string | null | undefined) =>
  PRIORITY_OPTIONS.find(p => p.value === value) || null;

const PriorityFlag = ({ color, size = 13 }: { color: string; size?: number }) => (
  <Flag size={size} fill={color} stroke={color} strokeWidth={1.5} />
);

const PriorityPicker = ({ value, onChange, compact = false }: {
  value: string | null | undefined;
  onChange: (val: string | null) => void;
  compact?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const cfg = getPriorityConfig(value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 rounded-lg transition-all cursor-pointer ${
          compact
            ? 'px-2 py-1 text-[10px] font-bold uppercase tracking-wider border hover:bg-white/5'
            : 'px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border hover:bg-white/5'
        }`}
        style={cfg ? {
          background: cfg.bg,
          color: cfg.color,
          borderColor: cfg.border,
        } : {
          background: 'transparent',
          borderColor: compact ? 'transparent' : 'rgba(255,255,255,0.1)',
          color: '#94a3b8',
        }}
      >
        {cfg ? <PriorityFlag color={cfg.color} size={compact ? 11 : 12} /> : null}
        {cfg ? cfg.label : (compact ? 'Prior.' : '—')}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-dark-card border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Prioridade</div>
          {PRIORITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-dark-text hover:bg-white/5 transition-colors"
            >
              <PriorityFlag color={opt.color} size={14} />
              <span className="flex-1 text-left font-medium">{opt.label}</span>
              {value === opt.value && <Check size={14} className="text-slate-400 shrink-0" />}
            </button>
          ))}
          <div className="border-t border-white/5 mt-1 pt-1">
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-500 hover:bg-white/5 transition-colors"
            >
              <Ban size={14} className="text-slate-600" />
              <span className="flex-1 text-left font-medium">Limpar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TaskRow = ({ task, onUpdate, onOpenDetail, onOpenSubtask }: { 
  task: OnboardingTask; 
  onUpdate: () => void; 
  onOpenDetail: (t: OnboardingTask) => void;
  onOpenSubtask: (s: Subtask, t: OnboardingTask) => void;
}) => {
  const columnConfig = React.useContext(ColumnConfigContext);
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
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(task.client_name);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const [projRespPicker, setProjRespPicker] = useState(false);
  const [projRespPos, setProjRespPos] = useState({ top: 0, left: 0 });
  const statusRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const respRef = React.useRef<HTMLDivElement>(null);
  const taskRespRef = React.useRef<HTMLButtonElement>(null);
  const projRespRef = React.useRef<HTMLButtonElement>(null);

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
    if (!projRespPicker) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-proj-resp-portal]') && !target.closest('[data-proj-resp-btn]')) {
        setProjRespPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [projRespPicker]);

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

  const handleProjResponsible = async (userId: string, userName: string, userAvatar: string) => {
    setProjRespPicker(false);
    try {
      await fetch(`/api/onboarding-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsavel_projeto_id: userId, responsavel_projeto_name: userName, responsavel_projeto_avatar: userAvatar }),
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

  const statusGroups = React.useContext(StatusGroupsContext);
  const currentGroup = statusGroups.find(g => g.id === task.status_group);
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
                {statusGroups.map(sg => {
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
        <div className="flex-1 min-w-[200px] flex items-center gap-2 flex-wrap">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={editNameValue}
              onChange={e => setEditNameValue(e.target.value)}
              onBlur={async () => {
                const trimmed = editNameValue.trim();
                if (trimmed && trimmed !== task.client_name) {
                  try {
                    await fetch(`/api/onboarding-tasks/${task.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ client_name: trimmed }),
                    });
                    onUpdate();
                  } catch { /* silent */ }
                }
                setEditingName(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') { setEditNameValue(task.client_name); setEditingName(false); }
              }}
              className="text-sm font-semibold text-dark-text bg-transparent border-b border-violet-500/50 outline-none w-full max-w-[280px] py-0"
              autoFocus
            />
          ) : (
            <span
              onClick={() => onOpenDetail(task)}
              onDoubleClick={(e) => { e.stopPropagation(); setEditNameValue(task.client_name); setEditingName(true); }}
              className="text-sm font-semibold text-dark-text truncate cursor-pointer hover:text-violet-400 transition-colors"
              title="Clique para detalhes · Duplo-clique para renomear"
            >{task.client_name}</span>
          )}
          {task.subtask_count > 0 && (
            <span className="text-[10px] text-slate-500 font-mono bg-white/5 px-1.5 py-0.5 rounded">
              ↳ {task.subtask_count}
            </span>
          )}
          {task.tags.map(t => <TagBadge key={t} label={t} />)}
        </div>

        {/* Entregável */}
        <div className="shrink-0 w-28">
          {(() => {
            const cs = findOptionColor(columnConfig.entregavel, task.entregavel);
            return (
              <select
                value={task.entregavel || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  fetch(`/api/onboarding-tasks/${task.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ entregavel: val }),
                  });
                  onUpdate();
                }}
                className="w-full border rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none"
                style={cs ? {
                  background: cs.bg,
                  color: cs.text,
                  borderColor: cs.border,
                } : {
                  background: 'transparent',
                  borderColor: 'transparent',
                  color: '#94a3b8',
                }}
              >
                <option value="" className="bg-dark-bg text-slate-400">Adicionar...</option>
                {columnConfig.entregavel.map(opt => (
                  <option key={opt.label} value={opt.label} className="bg-dark-bg text-dark-text">{opt.label}</option>
                ))}
              </select>
            );
          })()}
        </div>

        {/* Prioridade */}
        <div className="shrink-0 w-20">
          <PriorityPicker
            value={task.prioridade}
            compact
            onChange={(val) => {
              fetch(`/api/onboarding-tasks/${task.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prioridade: val }),
              });
              onUpdate();
            }}
          />
        </div>

        {/* Hospedagem */}
        <div className="shrink-0 w-28">
          {(() => {
            const cs = findOptionColor(columnConfig.hospedagem, task.hospedagem);
            return (
              <select
                value={task.hospedagem || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  fetch(`/api/onboarding-tasks/${task.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hospedagem: val }),
                  });
                  onUpdate();
                }}
                className="w-full border rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none"
                style={cs ? {
                  background: cs.bg,
                  color: cs.text,
                  borderColor: cs.border,
                } : {
                  background: 'transparent',
                  borderColor: 'transparent',
                  color: '#94a3b8',
                }}
              >
                <option value="" className="bg-dark-bg text-slate-400">Adicionar...</option>
                {columnConfig.hospedagem.map(opt => (
                  <option key={opt.label} value={opt.label} className="bg-dark-bg text-dark-text">{opt.label}</option>
                ))}
              </select>
            );
          })()}
        </div>

        {/* Squad */}
        <div className="shrink-0 w-32">
          {(() => {
            const cs = findOptionColor(columnConfig.squad, squad);
            return (
              <select value={squad} onChange={e => handleSquadChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none"
                style={cs ? {
                  background: cs.bg,
                  color: cs.text,
                  borderColor: cs.border,
                } : {
                  background: 'transparent',
                  borderColor: 'transparent',
                  color: '#94a3b8',
                }}
              >
                <option value="" className="bg-dark-bg text-slate-400">SQUAD</option>
                {columnConfig.squad.map(s => <option key={s.label} value={s.label} className="bg-dark-bg text-dark-text">{s.label}</option>)}
              </select>
            );
          })()}
        </div>

        {/* Responsável */}
        <div className="shrink-0 w-16 flex items-center justify-center gap-1">
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

        {/* Docs column */}
        <TaskFilesCell taskId={task.id} />

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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
                Concluir Cliente
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

const GroupBlock = ({ group, onUpdate, onAddTask, onOpenDetail, onOpenSubtask, onRenameGroup, onUpdateGroup, onDeleteGroup, onDragStart, onDragOver, onDrop, isDragOver }: {
  group: StatusGroup;
  onUpdate: () => void;
  onAddTask: (groupId: string) => void;
  onOpenDetail: (t: OnboardingTask) => void;
  onOpenSubtask: (s: Subtask, t: OnboardingTask) => void;
  onRenameGroup?: (id: string, label: string) => void;
  onUpdateGroup?: (id: string, fields: { color?: string; emoji?: string }) => void;
  onDeleteGroup?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragOver?: (e: React.DragEvent, id: string) => void;
  onDrop?: (id: string) => void;
  isDragOver?: boolean;
}) => {
  const [expanded, setExpanded] = useState(group.tasks.length > 0);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(group.label);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Keep expanded in sync when tasks arrive after initial mount
  const prevLenRef = React.useRef(group.tasks.length);
  React.useEffect(() => {
    if (prevLenRef.current === 0 && group.tasks.length > 0) {
      setExpanded(true);
    }
    prevLenRef.current = group.tasks.length;
  }, [group.tasks.length]);

  // Close menu on outside click
  React.useEffect(() => {
    if (!showGroupMenu) { setConfirmDel(false); return; }
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowGroupMenu(false);
        setShowColorPicker(false);
        setShowEmojiPicker(false);
        setConfirmDel(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showGroupMenu]);

  // Focus input on edit mode
  React.useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleSaveLabel = () => {
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== group.label && onRenameGroup) {
      onRenameGroup(group.id, trimmed.toUpperCase());
    }
    setEditing(false);
  };

  const handleDelete = () => {
    if (!confirmDel) { setConfirmDel(true); return; }
    onDeleteGroup?.(group.id);
    setShowGroupMenu(false);
    setConfirmDel(false);
  };

  // Shared header badge (collapsed & expanded)
  const renderBadge = (compact: boolean) => (
    <div
      className={`${compact ? 'px-2.5 py-0.5' : 'px-3 py-1.5'} rounded-${compact ? 'md' : 'lg'} text-[${compact ? '10' : '11'}px] font-black uppercase tracking-widest flex items-center gap-${compact ? '1.5' : '2'} transition-transform`}
      style={{ background: `${group.color}${compact ? '10' : '15'}`, color: compact ? `${group.color}80` : group.color, border: `1px solid ${group.color}${compact ? '15' : '30'}` }}
    >
      <span>{group.emoji}</span>
      {editing ? (
        <input
          ref={inputRef}
          value={editLabel}
          onChange={e => setEditLabel(e.target.value)}
          onBlur={handleSaveLabel}
          onKeyDown={e => { if (e.key === 'Enter') handleSaveLabel(); if (e.key === 'Escape') { setEditLabel(group.label); setEditing(false); } }}
          onClick={e => e.stopPropagation()}
          className="bg-transparent border-b border-current text-current font-black uppercase tracking-widest outline-none w-40 text-inherit"
          style={{ fontSize: 'inherit' }}
        />
      ) : (
        <span
          onDoubleClick={(e) => { e.stopPropagation(); setEditLabel(group.label); setEditing(true); }}
          title="Duplo-clique para renomear"
        >{group.label}</span>
      )}
      <span className={`ml-${compact ? '0.5' : '1'} px-${compact ? '1' : '1.5'} py-0.5 rounded-md bg-white/${compact ? '5' : '10'} text-[9px]`}>{group.tasks.length}</span>
    </div>
  );

  // Context menu for editing group
  const renderGroupMenu = () => (
    <div ref={menuRef} className="relative" onClick={e => e.stopPropagation()}>
      <button
        onClick={(e) => { e.stopPropagation(); setShowGroupMenu(v => !v); }}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors opacity-0 group-hover/header:opacity-100"
      >
        <MoreHorizontal size={14} />
      </button>
      {showGroupMenu && (
        <div className="absolute top-8 left-0 z-50 w-56 bg-dark-card border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="py-1">
            {/* Rename */}
            <button
              onClick={() => { setShowGroupMenu(false); setEditLabel(group.label); setEditing(true); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 transition-colors"
            >
              <Edit2 size={13} className="text-slate-500" />
              Renomear etapa
            </button>

            {/* Color picker */}
            <div className="relative">
              <button
                onClick={() => { setShowColorPicker(v => !v); setShowEmojiPicker(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 transition-colors"
              >
                <Palette size={13} className="text-slate-500" />
                Alterar cor
                <div className="ml-auto w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
              </button>
              {showColorPicker && (
                <div className="px-3 pb-3 pt-1">
                  <div className="grid grid-cols-8 gap-1">
                    {STATUS_COLOR_PALETTE.map(c => (
                      <button
                        key={c}
                        onClick={() => { onUpdateGroup?.(group.id, { color: c }); setShowColorPicker(false); }}
                        className={`w-5 h-5 rounded-full transition-transform hover:scale-125 ${c === group.color ? 'ring-2 ring-white/50 ring-offset-1 ring-offset-dark-card' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Emoji picker */}
            <div className="relative">
              <button
                onClick={() => { setShowEmojiPicker(v => !v); setShowColorPicker(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 transition-colors"
              >
                <span className="text-[13px] w-[13px] text-center">{group.emoji}</span>
                Alterar emoji
              </button>
              {showEmojiPicker && (
                <div className="px-3 pb-3 pt-1">
                  <div className="grid grid-cols-8 gap-1">
                    {STATUS_EMOJI_OPTIONS.map(em => (
                      <button
                        key={em}
                        onClick={() => { onUpdateGroup?.(group.id, { emoji: em }); setShowEmojiPicker(false); }}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm transition-transform hover:scale-125 hover:bg-white/10 ${em === group.emoji ? 'bg-white/15 ring-1 ring-white/20' : ''}`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 my-1" />

            {/* Delete */}
            <button
              onClick={handleDelete}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-colors ${confirmDel ? 'text-rose-400 bg-rose-500/10 font-bold' : 'text-rose-400/70 hover:bg-rose-500/5'}`}
            >
              <Trash2 size={13} />
              {confirmDel ? 'Confirmar exclusão' : 'Excluir etapa'}
            </button>
            {confirmDel && group.tasks.length > 0 && (
              <p className="px-4 pb-2 text-[10px] text-rose-400/60">
                {group.tasks.length} tarefa(s) serão movidas para "A Desenvolver"
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Empty group — compact single-line
  if (group.tasks.length === 0 && !expanded) {
    return (
      <div
        className={`mb-1 transition-all ${isDragOver ? 'border-t-2 border-violet-500 pt-1' : ''}`}
        onDragOver={e => { e.preventDefault(); onDragOver?.(e, group.id); }}
        onDrop={e => { e.preventDefault(); onDrop?.(group.id); }}
      >
        <div className="w-full flex items-center gap-2.5 px-4 py-2 rounded-xl hover:bg-white/[0.03] transition-colors group/header">
          <div
            draggable
            onDragStart={() => onDragStart?.(group.id)}
            className="cursor-grab active:cursor-grabbing text-slate-700 hover:text-slate-400 opacity-0 group-hover/header:opacity-100 transition-opacity shrink-0"
          >
            <GripVertical size={12} />
          </div>
          <button onClick={() => setExpanded(true)} className="flex items-center gap-2 flex-1">
            <ChevronRight size={12} className="text-slate-700 group-hover/header:text-slate-500 transition-colors shrink-0" />
            {renderBadge(true)}
          </button>
          {renderGroupMenu()}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mb-6 transition-all ${isDragOver ? 'border-t-2 border-violet-500 pt-1' : ''}`}
      onDragOver={e => { e.preventDefault(); onDragOver?.(e, group.id); }}
      onDrop={e => { e.preventDefault(); onDrop?.(group.id); }}
    >
      {/* Group header */}
      <div className="flex items-center gap-3 px-2 py-2 sticky top-0 z-10 group/header">
        <div
          draggable
          onDragStart={() => onDragStart?.(group.id)}
          className="cursor-grab active:cursor-grabbing text-slate-700 hover:text-slate-400 opacity-0 group-hover/header:opacity-100 transition-opacity shrink-0"
        >
          <GripVertical size={14} />
        </div>
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 group flex-1">
          {renderBadge(false)}
          {expanded
            ? <ChevronDown size={14} className="text-slate-500 ml-2" />
            : <ChevronRight size={14} className="text-slate-500 ml-2" />
          }
        </button>
        {renderGroupMenu()}
      </div>

      {/* Column headers */}
      {expanded && (
        <>
          <div className="flex items-center gap-2 px-8 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-black/[0.07] dark:border-white/5">
            <div className="w-[14px] shrink-0" />
            <div className="w-4 shrink-0" />
            <div className="flex-1 min-w-[200px]">Nome</div>
            <div className="shrink-0 w-28">Entregável</div>
            <div className="shrink-0 w-20">Prioridade</div>
            <div className="shrink-0 w-28">Hospedagem</div>
            <div className="shrink-0 w-32">Squad</div>
            <div className="shrink-0 w-16 text-center">Resp.</div>
            <div className="shrink-0 w-24">Data Iníc.</div>
            <div className="shrink-0 w-28">Vencimento</div>
            <div className="shrink-0 w-24">Docs</div>
            <div className="shrink-0 w-[22px]" />
          </div>

          <div className="flex flex-col">
            {group.tasks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-medium">Nenhum cliente neste grupo.</div>
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
  const columnConfig = React.useContext(ColumnConfigContext);

  const handleSave = async () => {
    if (!clientName.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/onboarding-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: clientName.trim(), squad: squad || null, start_date: startDate || null, due_date: dueDate || null, status_group: groupId, type: 'visual-hub' }),
      });
      onSaved();
      onClose();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-dark-text mb-4">Adicionar Cliente ao VisualHub</h3>
        <div className="space-y-3">
          <input
            value={clientName} onChange={e => setClientName(e.target.value)}
            placeholder="Nome do cliente *"
            className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
          />
          <select value={squad} onChange={e => setSquad(e.target.value)}
            className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500/50">
            <option value="">— Squad —</option>
            {columnConfig.squad.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
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
    fetch('/api/onboarding-template?type=visual-hub')
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
        body: JSON.stringify({ items: items.map(i => ({ title: i.title, description: i.description || null, internal_doc: i.internal_doc || null })), type: 'visual-hub' }),
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
                    Modelo de subtarefa — o conteúdo aqui será copiado para cada novo cliente
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
                      O conteúdo adicionado aqui (documento interno) será automaticamente copiado para cada subtarefa quando um novo cliente for criado.
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
};// ── Task Detail Modal ─────────────────────────────────────

interface TaskFile {
  id: number;
  name: string;
  url: string;
  type: 'link' | 'image' | 'doc';
  created_at: string;
}

const TaskDetailModal = ({ task, onClose, onUpdate }: { task: OnboardingTask; onClose: () => void; onUpdate: () => void }) => {
  const columnConfig = React.useContext(ColumnConfigContext);
  const { user, userData } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [description, setDescription] = useState(task.meeting_info || '');
  const [editingDesc, setEditingDesc] = useState(false);
  const [savingDesc, setSavingDesc] = useState(false);

  // Files state
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<TaskFile | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const commentEndRef = React.useRef<HTMLDivElement>(null);

  // Editable name
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(task.client_name);

  const handleSaveName = async () => {
    const trimmed = editNameValue.trim();
    if (trimmed && trimmed !== task.client_name) {
      try {
        await fetch(`/api/onboarding-tasks/${task.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: trimmed }),
        });
        onUpdate();
      } catch { /* silent */ }
    }
    setEditingName(false);
  };

  useEffect(() => {
    fetch(`/api/onboarding-tasks/${task.id}/comments`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setComments(data); setLoadingComments(false); })
      .catch(() => setLoadingComments(false));

    fetch(`/api/visual-hub-files?task_id=${task.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setFiles(data); setLoadingFiles(false); })
      .catch(() => setLoadingFiles(false));
  }, [task.id]);

  useEffect(() => {
    if (!loadingComments && commentEndRef.current) {
      commentEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length, loadingComments]);

  const addComment = async () => {
    if (!newComment.trim()) return;
    const authorName = userData?.name || user?.displayName || null;
    const authorEmail = userData?.email || user?.email || null;
    const authorAvatar = userData?.picture || user?.photoURL || null;
    try {
      const res = await fetch(`/api/onboarding-tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newComment,
          author_name: authorName,
          author_email: authorEmail,
          author_avatar: authorAvatar,
        }),
      });
      if (res.ok) {
        const c = await res.json();
        setComments(prev => [c, ...prev]);
        setNewComment('');
      }
    } catch { /* silent */ }
  };

  const saveDescription = async () => {
    setSavingDesc(true);
    try {
      await fetch(`/api/onboarding-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_info: description }),
      });
      setEditingDesc(false);
      onUpdate();
    } catch { /* silent */ }
    setSavingDesc(false);
  };

  const uploadFile = (file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      const type: TaskFile['type'] = isImg ? 'image' : isPdf ? 'doc' : 'link';
      try {
        const res = await fetch('/api/visual-hub-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: task.id, name: file.name, url: base64, type }),
        });
        if (res.ok) { const f = await res.json(); setFiles(prev => [...prev, f]); }
      } catch { /**/ } finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const deleteFile = async (id: number) => {
    await fetch(`/api/visual-hub-files/${id}`, { method: 'DELETE' });
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const isImg = (f: TaskFile) => f.type === 'image' || f.url?.startsWith('data:image');
  const isPdf = (f: TaskFile) => f.type === 'doc' || f.url?.startsWith('data:application/pdf');

  const getFileIcon = (f: TaskFile) => {
    if (isImg(f)) return <ImageIcon size={16} />;
    if (isPdf(f)) return <FileText size={16} />;
    return <Paperclip size={16} />;
  };

  const getFileSize = (f: TaskFile) => {
    if (f.url?.startsWith('data:')) {
      const sizeBytes = Math.round((f.url.length * 3) / 4);
      if (sizeBytes > 1048576) return `${(sizeBytes / 1048576).toFixed(1)} MB`;
      return `${Math.round(sizeBytes / 1024)} KB`;
    }
    return '';
  };

  const statusGroups = React.useContext(StatusGroupsContext);
  const currentGroup = statusGroups.find(g => g.id === task.status_group);
  const entregavelColor = findOptionColor(columnConfig.entregavel, task.entregavel);
  const hospedagemColor = findOptionColor(columnConfig.hospedagem, task.hospedagem);
  const squadColor = findOptionColor(columnConfig.squad, task.squad);

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
        style={{ height: '90vh', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ─── Top Header ─── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: currentGroup?.color || '#64748b' }}
            />
            <div className="min-w-0">
              {editingName ? (
                <input
                  value={editNameValue}
                  onChange={e => setEditNameValue(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={e => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') { setEditNameValue(task.client_name); setEditingName(false); }
                  }}
                  className="text-lg font-bold text-dark-text bg-transparent border-b border-violet-500/50 outline-none w-full"
                  autoFocus
                />
              ) : (
                <h2
                  onClick={() => { setEditNameValue(task.client_name); setEditingName(true); }}
                  className="text-lg font-bold text-dark-text truncate cursor-pointer hover:text-violet-400 transition-colors"
                  title="Clique para renomear"
                >{task.client_name}</h2>
              )}
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: (currentGroup?.color || '#64748b') + '26',
                    color: currentGroup?.color || '#64748b',
                  }}
                >
                  {currentGroup?.label || task.status_group}
                </span>
                {task.prioridade && (() => {
                  const pc = getPriorityConfig(task.prioridade);
                  return pc ? (
                    <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
                      style={{ background: pc.bg, color: pc.color }}
                    >
                      <PriorityFlag color={pc.color} size={9} />
                      {pc.label}
                    </span>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                fetch(`/api/onboarding-tasks/${task.id}/archive`, { method: 'POST' })
                  .then(() => { onUpdate(); onClose(); });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-xs font-bold rounded-lg transition-colors border border-emerald-500/20"
            >
              <Check size={13} />
              Concluir
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-dark-text hover:bg-white/10 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ─── Two-Column Body ─── */}
        <div className="flex flex-1 min-h-0">

          {/* ─── LEFT PANEL: Metadata + Description + Files ─── */}
          <div className="flex-1 border-r border-white/5 overflow-y-auto">
            <div className="p-6 space-y-6">

              {/* ── Campos / Metadata Grid ── */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Settings size={14} className="text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Campos</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {/* Squad */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider w-20 shrink-0">Squad</span>
                    {(() => {
                      const cs = findOptionColor(columnConfig.squad, task.squad);
                      return (
                        <select
                          value={task.squad || ''}
                          onChange={async (e) => {
                            const val = e.target.value;
                            await fetch(`/api/onboarding-tasks/${task.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ squad: val || null }),
                            });
                            onUpdate();
                          }}
                          className="border rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                          style={cs ? {
                            background: cs.bg,
                            color: cs.text,
                            borderColor: cs.border,
                          } : {
                            background: 'transparent',
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                          }}
                        >
                          <option value="" className="bg-dark-bg text-slate-400">—</option>
                          {columnConfig.squad.map(opt => (
                            <option key={opt.label} value={opt.label} className="bg-dark-bg text-dark-text">{opt.label}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                  {/* Entregável */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider w-20 shrink-0">Entregável</span>
                    {(() => {
                      const cs = findOptionColor(columnConfig.entregavel, task.entregavel);
                      return (
                        <select
                          value={task.entregavel || ''}
                          onChange={async (e) => {
                            const val = e.target.value;
                            await fetch(`/api/onboarding-tasks/${task.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ entregavel: val || null }),
                            });
                            onUpdate();
                          }}
                          className="border rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                          style={cs ? {
                            background: cs.bg,
                            color: cs.text,
                            borderColor: cs.border,
                          } : {
                            background: 'transparent',
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                          }}
                        >
                          <option value="" className="bg-dark-bg text-slate-400">—</option>
                          {columnConfig.entregavel.map(opt => (
                            <option key={opt.label} value={opt.label} className="bg-dark-bg text-dark-text">{opt.label}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                  {/* Hospedagem */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider w-20 shrink-0">Hospedagem</span>
                    {(() => {
                      const cs = findOptionColor(columnConfig.hospedagem, task.hospedagem);
                      return (
                        <select
                          value={task.hospedagem || ''}
                          onChange={async (e) => {
                            const val = e.target.value;
                            await fetch(`/api/onboarding-tasks/${task.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ hospedagem: val || null }),
                            });
                            onUpdate();
                          }}
                          className="border rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                          style={cs ? {
                            background: cs.bg,
                            color: cs.text,
                            borderColor: cs.border,
                          } : {
                            background: 'transparent',
                            borderColor: 'rgba(255,255,255,0.1)',
                            color: '#94a3b8',
                          }}
                        >
                          <option value="" className="bg-dark-bg text-slate-400">—</option>
                          {columnConfig.hospedagem.map(opt => (
                            <option key={opt.label} value={opt.label} className="bg-dark-bg text-dark-text">{opt.label}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                  {/* Responsável */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider w-20 shrink-0">Responsável</span>
                    {task.responsible_name ? (
                      <div className="flex items-center gap-1.5">
                        {task.responsible_avatar ? (
                          <img src={task.responsible_avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-[8px] font-bold uppercase">
                            {task.responsible_name.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs text-dark-text font-medium">{task.responsible_name}</span>
                      </div>
                    ) : <span className="text-[10px] text-slate-600">—</span>}
                  </div>
                  {/* Prioridade */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider w-20 shrink-0">Prioridade</span>
                    <PriorityPicker
                      value={task.prioridade}
                      onChange={async (val) => {
                        await fetch(`/api/onboarding-tasks/${task.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ prioridade: val }),
                        });
                        onUpdate();
                      }}
                    />
                  </div>
                  {/* Status */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider w-20 shrink-0">Status</span>
                    <select
                      value={task.status_group || ''}
                      onChange={async (e) => {
                        const val = e.target.value;
                        await fetch(`/api/onboarding-tasks/${task.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status_group: val }),
                        });
                        onUpdate();
                      }}
                      className="border rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                      style={{
                        background: (currentGroup?.color || '#64748b') + '26',
                        color: currentGroup?.color || '#64748b',
                        borderColor: (currentGroup?.color || '#64748b') + '4D',
                      }}
                    >
                      {statusGroups.map(sg => (
                        <option key={sg.id} value={sg.id} className="bg-dark-bg text-dark-text">{sg.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Data Início */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider w-20 shrink-0">Data Início</span>
                    <div className="flex items-center gap-1">
                      <Calendar size={11} className="text-slate-600 shrink-0" />
                      <input
                        type="date"
                        value={task.start_date ? new Date(task.start_date).toISOString().split('T')[0] : ''}
                        onChange={async (e) => {
                          await fetch(`/api/onboarding-tasks/${task.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ start_date: e.target.value || null }),
                          });
                          onUpdate();
                        }}
                        className="bg-transparent text-xs text-slate-400 border-none outline-none cursor-pointer focus:text-dark-text transition-colors [color-scheme:dark]"
                      />
                    </div>
                  </div>
                  {/* Vencimento */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider w-20 shrink-0">Vencimento</span>
                    <div className="flex items-center gap-1">
                      <Calendar size={11} className="text-slate-600 shrink-0" />
                      <input
                        type="date"
                        value={task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : ''}
                        onChange={async (e) => {
                          await fetch(`/api/onboarding-tasks/${task.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ due_date: e.target.value || null }),
                          });
                          onUpdate();
                        }}
                        className={`bg-transparent text-xs border-none outline-none cursor-pointer transition-colors [color-scheme:dark] ${
                          task.due_date && fmtDate(task.due_date) && typeof fmtDate(task.due_date) === 'object' && (fmtDate(task.due_date) as any).color === 'text-rose-400'
                            ? 'text-rose-400 font-semibold'
                            : 'text-slate-400 focus:text-dark-text'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Descrição ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição</span>
                  </div>
                  {!editingDesc && (
                    <button onClick={() => setEditingDesc(true)} className="text-[10px] text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                      Editar
                    </button>
                  )}
                </div>
                {editingDesc ? (
                  <div className="space-y-2">
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Adicione uma descrição ou escreva com IA..."
                      rows={4}
                      className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveDescription} disabled={savingDesc}
                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5">
                        {savingDesc ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Salvar
                      </button>
                      <button onClick={() => { setEditingDesc(false); setDescription(task.meeting_info || ''); }}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white font-bold transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingDesc(true)}
                    className="cursor-pointer bg-dark-bg border border-white/5 rounded-xl px-4 py-3 min-h-[60px] hover:border-white/10 transition-colors"
                  >
                    {description ? (
                      <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{description}</p>
                    ) : (
                      <p className="text-sm text-slate-600 italic">Clique para adicionar uma descrição...</p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Anexos / Arquivos ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Paperclip size={14} className="text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Anexos</span>
                    <span className="text-[9px] bg-white/5 text-slate-500 px-1.5 py-0.5 rounded font-bold">{files.length}</span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 font-semibold transition-colors"
                  >
                    <Upload size={11} />
                    Upload
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.json,.txt,.png,.jpg,.jpeg,.webp,.gif,.svg,.xls,.xlsx,.ppt,.pptx,.zip"
                  multiple
                  onChange={e => { Array.from(e.target.files || []).forEach(uploadFile); e.target.value = ''; }}
                />

                {/* Drop zone */}
                <div
                  className={`border-2 border-dashed rounded-xl transition-all ${
                    isDragOver
                      ? 'border-violet-500/50 bg-violet-500/5'
                      : 'border-white/5 hover:border-white/10'
                  }`}
                  onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setIsDragOver(false);
                    Array.from(e.dataTransfer.files).forEach(uploadFile);
                  }}
                >
                  {loadingFiles ? (
                    <div className="flex justify-center py-8">
                      <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                    </div>
                  ) : files.length === 0 && !uploading ? (
                    <div
                      className="flex flex-col items-center justify-center py-8 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
                        <Upload size={18} className="text-slate-600" />
                      </div>
                      <p className="text-xs text-slate-500 font-medium">Solte os arquivos aqui para <span className="text-violet-400 underline">upload</span></p>
                      <p className="text-[10px] text-slate-600 mt-1">PDF, imagens, docs, JSON e mais</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-2">
                      {/* File grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {files.map(f => (
                          <div
                            key={f.id}
                            className="group flex items-center gap-2.5 bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-xl px-3 py-2.5 cursor-pointer transition-all"
                            onClick={() => setPreviewFile(f)}
                          >
                            {/* Thumbnail or icon */}
                            {isImg(f) ? (
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/20">
                                <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                isPdf(f) ? 'bg-rose-500/15 text-rose-400' : 'bg-violet-500/15 text-violet-400'
                              }`}>
                                {getFileIcon(f)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-dark-text truncate">{f.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] text-slate-600">{getFileSize(f)}</span>
                                {f.created_at && (
                                  <span className="text-[9px] text-slate-600">
                                    {new Date(f.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                              <button
                                onClick={e => { e.stopPropagation(); setPreviewFile(f); }}
                                className="p-1 text-slate-500 hover:text-violet-400 transition-colors"
                                title="Visualizar"
                              >
                                <Eye size={12} />
                              </button>
                              {f.url && (
                                <a
                                  href={f.url} download={f.name}
                                  onClick={e => e.stopPropagation()}
                                  className="p-1 text-slate-500 hover:text-emerald-400 transition-colors"
                                  title="Baixar"
                                >
                                  <Download size={12} />
                                </a>
                              )}
                              <button
                                onClick={e => { e.stopPropagation(); deleteFile(f.id); }}
                                className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                title="Remover"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Upload progress */}
                      {uploading && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-violet-500/5 border border-violet-500/20 rounded-xl">
                          <Loader2 size={14} className="animate-spin text-violet-400" />
                          <span className="text-[10px] text-violet-400 font-medium">Enviando arquivo...</span>
                        </div>
                      )}
                      {/* Add more button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] text-slate-500 hover:text-violet-400 font-semibold rounded-lg hover:bg-white/[0.03] transition-all"
                      >
                        <Plus size={11} />
                        Adicionar mais arquivos
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT PANEL: Activity / Comments ─── */}
          <div className="w-[360px] shrink-0 flex flex-col bg-dark-bg/50">
            {/* Activity header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle size={14} className="text-violet-400" />
                <span className="text-xs font-bold text-dark-text">Atividade</span>
              </div>
              <span className="text-[9px] bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full font-bold">
                {comments.length}
              </span>
            </div>

            {/* Comments feed */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {loadingComments ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                  <MessageCircle size={32} className="mb-3 opacity-20" />
                  <p className="text-sm font-medium">Nenhum comentário</p>
                  <p className="text-xs mt-1 opacity-60">Seja o primeiro a comentar!</p>
                </div>
              ) : (
                [...comments].reverse().map(c => (
                  <div key={c.id} className="flex gap-2.5">
                    {c.author_avatar ? (
                      <img src={c.author_avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-[10px] shrink-0 mt-0.5 uppercase">
                        {(c.author_name || 'U').charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-bold text-dark-text">{c.author_name || 'Usuário'}</span>
                        <span className="text-[9px] text-slate-600 flex items-center gap-0.5">
                          <Clock size={8} />
                          {new Date(c.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="bg-dark-card border border-white/5 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                        <p className="text-[13px] text-slate-300 whitespace-pre-wrap leading-relaxed break-words">{c.text}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentEndRef} />
            </div>

            {/* Comment input */}
            <div className="border-t border-white/5 px-4 py-3 bg-dark-card/80 shrink-0">
              <div className="bg-dark-bg border border-white/10 rounded-xl focus-within:border-violet-500/50 transition-colors overflow-hidden">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                  placeholder="Escreva um comentário..."
                  rows={3}
                  className="w-full px-4 py-3 text-sm text-dark-text placeholder-slate-600 focus:outline-none resize-none bg-transparent"
                  style={{ minHeight: '72px', maxHeight: '140px' }}
                  onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 140) + 'px'; }}
                />
                <div className="flex items-center justify-between px-3 py-2 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 text-slate-500 hover:text-violet-400 hover:bg-white/5 rounded-lg transition-colors"
                      title="Anexar arquivo"
                    >
                      <Paperclip size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-600">Enter enviar · Shift+Enter nova linha</span>
                    <button
                      onClick={addComment}
                      disabled={!newComment.trim()}
                      className="px-3 py-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Fullscreen file preview ─── */}
      {previewFile && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl" onClick={() => setPreviewFile(null)}>
          <div
            className="bg-[#0d0d14] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: '92vw', height: '92vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Preview header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isImg(previewFile) ? 'bg-violet-500/15 text-violet-400' : isPdf(previewFile) ? 'bg-rose-500/15 text-rose-400' : 'bg-violet-500/15 text-violet-400'
                }`}>
                  {getFileIcon(previewFile)}
                </div>
                <span className="text-sm font-bold text-white truncate">{previewFile.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {files.length > 1 && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); const idx = files.findIndex(f => f.id === previewFile.id); setPreviewFile(files[(idx - 1 + files.length) % files.length]); }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ChevronRight size={16} className="rotate-180" />
                    </button>
                    <span className="text-[10px] text-slate-600">{files.findIndex(f => f.id === previewFile.id) + 1} / {files.length}</span>
                    <button
                      onClick={e => { e.stopPropagation(); const idx = files.findIndex(f => f.id === previewFile.id); setPreviewFile(files[(idx + 1) % files.length]); }}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
                <a
                  href={previewFile.url} download={previewFile.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <Download size={12} />
                  Baixar
                </a>
                <button onClick={() => setPreviewFile(null)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* Preview content */}
            <div className="flex-1 overflow-hidden">
              {isImg(previewFile) ? (
                <div className="w-full h-full flex items-center justify-center bg-black/40 p-6">
                  <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                </div>
              ) : isPdf(previewFile) ? (
                <iframe src={previewFile.url} className="w-full h-full border-none" title={previewFile.name} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  <FileText size={64} className="mb-4 opacity-30" />
                  <p className="text-lg font-semibold">{previewFile.name}</p>
                  <a href={previewFile.url} download={previewFile.name}
                    className="mt-3 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-lg transition-colors">
                    Baixar arquivo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
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


const ATA_TEMPLATE = `<h1>ATA DA REUNIÃO</h1>

<hr>
<h3><strong>APRESENTAÇÃO</strong></h3>
<h3>🍇| Bom dia/Boa tarde/Boa noite aos participantes da reunião;</h3>
<h3>🍇| Perguntar do lado pessoal, final de semana e como foi o dia;</h3>
<h3>🍇| Apresente-se (Qual a tua função);</h3>
<hr>
<h2>PÚBLICO</h2>
<p>🍇| VERBA para INVESTIMENTO em anúncios</p>
<p>🍇| Qual AÇÃO e PLATAFORMA iremos iniciar</p>
<p>🍇| Quais são as CARACTERÍSTICAS DO PÚBLICO</p>
<p>🍇| DETALHES Adicionais do Projeto</p>
<p>🍇| Local para rodar as campanhas</p>

<h2>NOVOS ENCONTROS</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Explicar o motivo de dividir as reuniões desta maneira</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Agendar a Criação/Coleta de Acessos</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Agendar o treinamento comercial</p></div></li>
</ul>

<hr>
<h2>ACESSOS CRM + IA</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Faz sentido utiliza-lo?</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Teremos IA no atendimento</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Quantas contas (Limite 4) e para Quais E-mails podemos criar os acessos:</p></div></li>
</ul>

<hr>
<h2>ALINHAMENTOS DE EXPECTATIVAS</h2>
<ul>
  <li>Criativos
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Criativos em vídeo no Facebook Ads [Importância na qualificação do público]</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Faremos Criativos de Imagem e Edição nos Vídeos</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Adicionaremos legendas, faremos cortes pontuais e melhoraremos o áudio - Edições simples conectam muito melhor com um público mais simples</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Link do Google Drive na Descrição (Tudo que forem nos enviar, precisa estar lá para termos salvo e manter a qualidade das imagens)</p></div></li>
    </ul>
  </li>
  <li>Campanhas
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Processo para Início das Campanhas: DEPOIS DO TREINAMENTO COMERCIAL - QUANTO ANTES NOS ENVIAREM OS MATERIAIS QUANTO ANTES INICIAMOS</p></div></li>
    </ul>
  </li>
  <li>Financeiro
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Explicar sobre a Marvee - A empresa terceirizada que cuida do nosso Financeiro</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Quem ficará responsável pelo Financeiro do escritório + Número do Responsável?</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Por onde será a comunicação financeira (Campanhas/anúncio)</p></div></li>
    </ul>
  </li>
</ul>

<p>Gostariam de receber as nossas faturas por:</p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>E-mail</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>WhatsApp</p></div></li>
</ul>

<p>A data do pagamento ficou alinhada com o seu fluxo de caixa do seu escritório?</p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>A data é sempre a do mesmo dia que o primeiro pagamento foi feito</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Caso não, qual outro dia fica melhor dentro do mesmo mês?</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>NÃO HÁ POSSIBILIDADE DE PAGAMENTO PROPORCIONAL (SE ELE PERGUNTAR)</p></div></li>
</ul>

<p>Não é necessário enviar o comprovante de depósito dos nossos honorários:</p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Assas contabiliza certinho (nosso banco digital) e temos um financeiro trabalhando nessas demandas diariamente</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>O grupo somente para assuntos de campanhas</p></div></li>
</ul>

<ul>
  <li>Comunicação
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Canais oficiais de comunicação da Grape Mídia: Grupo do WhatsApp + WhatsApp da Direção (Jean) e Gerência (Seu WhatsApp)</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Feedback de Campanhas + Ajustes no Funil + CRM é com o número do squad/gestor de tráfego</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Honorários Grape é diretamente com a Marvee</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Demais assuntos é diretamente com a Liderança da Grape</p></div></li>
    </ul>
  </li>
  <li>Alinhamento de contratos
    <p>Quantos contratos fechados te deixaria feliz neste primeiro momento: (META PROGRESSIVA)</p>
  </li>
</ul>

<p>Nossa principal missão será descobrir: <strong>O CAC da nossa operação</strong></p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Trazendo muito mais previsibilidade ao escritório de aportar mais dinheiro vs retorno em contratos</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Nós baseamos nosso CAC na régua do mercado, contabilizando apenas o valor de investimento em anúncio</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Relatório semanal Padrão Grape Mídia [PDF]</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Falar que: "Nosso contato será diário no WhatsApp"</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Feedback do Advogado [Frisar importância e faturamento como aumenta]</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Reunião de Alinhamento Quinzenal [Frisar importância e faturamento como aumenta]</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Explicar sobre o SIG - Sistema de Indicação Grape</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Cada indicação que fechar conosco um contrato de pelo menos 4 meses</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Faremos um Pix no valor de R$500.00 ou abateremos R$500.00 no próximo honorário da nossa empresa</p></div></li>
</ul>

<hr>
<h2>FEEDBACK REVERSO + GOOGLE MEU NEGÓCIO</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>O que você espera dos nossos serviços e como a Grape Mídia conseguirá ajudar na fase atual</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Qual foi o maior diferencial que identificou na nossa empresa que foi o motivo da contratação?</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>NPS Mensal - Nos ajudará como Empresa e a Melhorar no nosso projeto - Ganha Ganha</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Gostaríamos muito de ter esse feedback positivo dentro do nosso Google Meu Negócio</p></div></li>
</ul>

<p>SEU RESULTADO: É NOSSO COMPROMISSO E RESPONSABILIDADE TOTAL<br>
POR ISSO PREZAMOS PELOS ALINHAMENTOS INICIAIS COMERCIAIS</p>
<hr>`;

const SubtaskDetailModal = ({ subtask, task, onClose, onUpdate }: { subtask: any; task: any; onClose: () => void; onUpdate: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  
  const [description, setDescription] = useState(subtask.description || '');
  const [descSaving, setDescSaving] = useState(false);

  // Use saved content from DB, or empty for new subtasks
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
                  placeholder="Escreva a ata, anotações ou dados importantes aqui... Pressione '/' para comandos" 
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
export default function VisualHub() {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [detailTask, setDetailTask] = useState<OnboardingTask | null>(null);
  const [detailSubtask, setDetailSubtask] = useState<{subtask: Subtask, task: OnboardingTask} | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [columnConfig, setColumnConfig] = useState<ColumnConfig>(loadColumnConfig);
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [formDropdownOpen, setFormDropdownOpen] = useState(false);
  const [briefingLinkCopied, setBriefingLinkCopied] = useState(false);
  const formDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close form dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (formDropdownRef.current && !formDropdownRef.current.contains(e.target as Node)) {
        setFormDropdownOpen(false);
      }
    };
    if (formDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [formDropdownOpen]);

  // Dynamic status groups
  const [statusGroups, setStatusGroups] = useState<StatusGroupDef[]>(DEFAULT_STATUS_GROUPS);
  const [addingNewGroup, setAddingNewGroup] = useState(false);
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const newGroupRef = React.useRef<HTMLInputElement>(null);

  const fetchStatusGroups = async () => {
    try {
      const res = await fetch('/api/visual-hub-status-groups');
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) setStatusGroups(data);
      }
    } catch { /* fallback to defaults */ }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/onboarding-tasks?type=visual-hub');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchStatusGroups().then(() => fetchTasks()); }, []);

  // Focus new group input
  React.useEffect(() => {
    if (addingNewGroup && newGroupRef.current) newGroupRef.current.focus();
  }, [addingNewGroup]);

  // ── Status group CRUD handlers ──
  const handleAddGroup = async () => {
    const label = newGroupLabel.trim().toUpperCase();
    if (!label) { setAddingNewGroup(false); return; }
    const id = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    if (statusGroups.some(g => g.id === id)) { setAddingNewGroup(false); setNewGroupLabel(''); return; }
    try {
      const res = await fetch('/api/visual-hub-status-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, label, color: '#7c3aed', emoji: '🔵', order_index: statusGroups.length }),
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
      await fetch(`/api/visual-hub-status-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
    } catch { /* silent */ }
  };

  const handleUpdateGroup = async (id: string, fields: { color?: string; emoji?: string }) => {
    setStatusGroups(prev => prev.map(g => g.id === id ? { ...g, ...fields } : g));
    try {
      await fetch(`/api/visual-hub-status-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
    } catch { /* silent */ }
  };

  const handleDeleteGroup = async (id: string) => {
    setStatusGroups(prev => prev.filter(g => g.id !== id));
    try {
      await fetch(`/api/visual-hub-status-groups/${id}`, { method: 'DELETE' });
      fetchTasks(); // refresh tasks since they may have been moved
    } catch { /* silent */ }
  };

  // ── Drag & Drop reorder ──
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const handleGroupDragStart = (id: string) => {
    setDraggingGroupId(id);
  };

  const handleGroupDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggingGroupId && targetId !== draggingGroupId) {
      setDragOverGroupId(targetId);
    }
  };

  const handleGroupDrop = async (targetId: string) => {
    if (!draggingGroupId || draggingGroupId === targetId) {
      setDraggingGroupId(null);
      setDragOverGroupId(null);
      return;
    }
    const fromIdx = statusGroups.findIndex(g => g.id === draggingGroupId);
    const toIdx = statusGroups.findIndex(g => g.id === targetId);
    if (fromIdx === -1 || toIdx === -1) { setDraggingGroupId(null); setDragOverGroupId(null); return; }

    const reordered = [...statusGroups];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setStatusGroups(reordered);
    setDraggingGroupId(null);
    setDragOverGroupId(null);

    try {
      await fetch('/api/visual-hub-status-groups/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: reordered.map((g, i) => ({ id: g.id, order_index: i })) }),
      });
    } catch { /* silent */ }
  };

  const activeGroups = showCompleted 
    ? [{ id: 'arquivado', label: 'CONCLUÍDO', color: '#10b981', emoji: '🏆' }, ...statusGroups]
    : statusGroups;

  const groups: StatusGroup[] = activeGroups.map(sg => ({
    ...sg,
    tasks: tasks.filter(t => t.status_group === sg.id),
  }));

  return (
    <ColumnConfigContext.Provider value={columnConfig}>
    <StatusGroupsContext.Provider value={statusGroups}>
    <div className="min-h-screen bg-dark-bg">
      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-4 flex items-start justify-between">
        <div>
          <SplitHeadline text="Visual" highlight="Hub" className="text-2xl font-black tracking-tight text-dark-text" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            Gestão de criação de conteúdo
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Formulário dropdown */}
          <div className="relative" ref={formDropdownRef}>
            <button
              onClick={() => setFormDropdownOpen(!formDropdownOpen)}
              className={`flex items-center gap-2 px-4 py-2 bg-dark-card border text-[11px] font-bold rounded-xl transition-colors ${
                formDropdownOpen
                  ? 'border-fuchsia-500/30 text-fuchsia-400'
                  : 'border-black/10 dark:border-white/10 hover:border-fuchsia-500/30 text-dark-text'
              }`}
            >
              <FileText size={14} className="text-fuchsia-400" />
              Formulário
              <ChevronDown size={12} className={`transition-transform ${formDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {formDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-dark-card border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                <button
                  onClick={async () => {
                    try {
                      // Check if briefing already exists (use first task as default)
                      let briefingId: number | null = null;
                      const resExisting = await fetch('/api/briefings');
                      if (resExisting.ok) {
                        const all = await resExisting.json();
                        if (all.length > 0) briefingId = all[0].id;
                      }
                      if (!briefingId) {
                        // Create a new briefing
                        const resCreate = await fetch('/api/briefings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: 'Briefing Identidade Visual' }),
                        });
                        if (resCreate.ok) {
                          const data = await resCreate.json();
                          briefingId = data.id;
                        }
                      }
                      if (briefingId) {
                        const baseUrl = window.location.origin;
                        navigator.clipboard.writeText(`${baseUrl}/?briefing=${briefingId}`);
                        setBriefingLinkCopied(true);
                        setTimeout(() => setBriefingLinkCopied(false), 2000);
                      }
                    } catch { /* silent */ }
                    setFormDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <LinkIcon size={13} className="text-fuchsia-400" />
                  {briefingLinkCopied ? '✓ Link copiado!' : 'Link do formulário'}
                </button>
                <button
                  onClick={async () => {
                    try {
                      let briefingId: number | null = null;
                      const resExisting = await fetch('/api/briefings');
                      if (resExisting.ok) {
                        const all = await resExisting.json();
                        if (all.length > 0) briefingId = all[0].id;
                      }
                      if (!briefingId) {
                        const resCreate = await fetch('/api/briefings', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ title: 'Briefing Identidade Visual' }),
                        });
                        if (resCreate.ok) {
                          const data = await resCreate.json();
                          briefingId = data.id;
                        }
                      }
                      if (briefingId) {
                        const baseUrl = window.location.origin;
                        window.open(`${baseUrl}/?briefing=${briefingId}`, '_blank');
                      }
                    } catch { /* silent */ }
                    setFormDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs text-slate-300 hover:bg-white/5 hover:text-white transition-colors border-t border-white/5"
                >
                  <Edit2 size={13} className="text-fuchsia-400" />
                  Editar formulário
                </button>
              </div>
            )}
          </div>
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
            onClick={() => setShowColumnConfig(true)}
            className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-black/10 dark:border-white/10 hover:border-sky-500/30 text-dark-text text-[11px] font-bold rounded-xl transition-colors"
          >
            <Tag size={14} className="text-sky-400" />
            Configurar Colunas
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
          <div onDragEnd={() => { setDraggingGroupId(null); setDragOverGroupId(null); }}>
          {groups.map(group => (
            <GroupBlock
              key={group.id}
              group={group}
              onUpdate={fetchTasks}
              onAddTask={setAddingToGroup}
              onOpenSubtask={(s, t) => setDetailSubtask({subtask: s, task: t})}
              onOpenDetail={setDetailTask}
              onRenameGroup={handleRenameGroup}
              onUpdateGroup={handleUpdateGroup}
              onDeleteGroup={handleDeleteGroup}
              onDragStart={handleGroupDragStart}
              onDragOver={handleGroupDragOver}
              onDrop={handleGroupDrop}
              isDragOver={dragOverGroupId === group.id}
            />
          ))}
          </div>

          {/* New status button / inline form */}
          {addingNewGroup ? (
            <div className="flex items-center gap-2 mt-4 px-4 py-2">
              <div className="w-3 h-3 rounded-full bg-violet-500/40" />
              <input
                ref={newGroupRef}
                value={newGroupLabel}
                onChange={e => setNewGroupLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddGroup(); if (e.key === 'Escape') { setAddingNewGroup(false); setNewGroupLabel(''); } }}
                onBlur={handleAddGroup}
                placeholder="Nome da nova etapa..."
                className="bg-transparent border-b border-violet-500/40 text-dark-text text-xs font-bold uppercase tracking-widest outline-none w-64 py-1 placeholder-slate-600"
              />
              <button
                onClick={handleAddGroup}
                className="text-[10px] text-violet-400 hover:text-violet-300 font-bold transition-colors"
              >
                Salvar
              </button>
              <button
                onClick={() => { setAddingNewGroup(false); setNewGroupLabel(''); }}
                className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingNewGroup(true)}
              className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 transition-colors mt-4 px-4 py-2"
            >
              <Plus size={14} />
              Novo status
            </button>
          )}
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

      {/* Column Config Modal */}
      {showColumnConfig && (
        <ColumnConfigModal
          config={columnConfig}
          onSave={setColumnConfig}
          onClose={() => setShowColumnConfig(false)}
        />
      )}
    </div>
    </StatusGroupsContext.Provider>
    </ColumnConfigContext.Provider>
  );
}

