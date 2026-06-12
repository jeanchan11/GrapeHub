import React, { useState, useEffect, useCallback, useRef } from 'react';
import SplitHeadline from '../components/SplitHeadline';
import { useAuth } from '../contexts/AuthContext';
import {
  Phone, Mail, Users, CheckSquare, Calendar, Clock, Filter,
  Plus, RefreshCw, ChevronDown, Circle, CheckCircle2,
  Zap, MessageSquare, Video, FileText, ExternalLink,
  List, Instagram, Linkedin, X, Search, User, AlignLeft,
  SlidersHorizontal, ChevronLeft, ChevronRight, Trash2, Pencil, UserCircle
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Activity {
  id: number;
  lead_id: string;
  lead_name?: string;
  lead_company?: string;
  kanban_id?: string;
  kanban_name?: string;
  title: string;
  type: string;
  priority?: string;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  responsible_id?: string;
  observations?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
}

export interface Lead {
  id: string;
  nome: string;
  empresa?: string;
}

// ─── Tipo Config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  'Ligação':      { icon: Phone,         label: 'Ligação' },
  'Reunião':      { icon: Users,         label: 'Reunião' },
  'Videochamada': { icon: Video,         label: 'Videochamada' },
  'Email':        { icon: Mail,          label: 'Email' },
  'WhatsApp':     { icon: MessageSquare, label: 'WhatsApp' },
  'Instagram':    { icon: Instagram,     label: 'Instagram' },
  'LinkedIn':     { icon: Linkedin,      label: 'LinkedIn' },
  'Outros':       { icon: FileText,      label: 'Outros' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { icon: Zap, label: type || 'Atividade' };
}

function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  const dateOnly = dateString.split('T')[0];
  return new Date(dateOnly + 'T12:00:00');
}

function formatDateTime(due_date?: string, start_time?: string): string {
  if (!due_date) return '';
  const d = parseLocalDate(due_date);
  const day = d.getDate().toString().padStart(2, '0');
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const mon = months[d.getMonth()];
  const time = start_time ? start_time.slice(0, 5) : '00:00';
  return `${day} de ${mon}. ${time}`;
}

function groupActivitiesByDate(activities: Activity[]): { label: string; key: string; items: Activity[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + 7);

  const groups: Record<string, Activity[]> = {
    overdue: [], today: [], tomorrow: [], week: [], later: [], no_date: [],
  };

  activities.forEach(a => {
    if (!a.due_date) { groups.no_date.push(a); return; }
    const d = parseLocalDate(a.due_date);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day < today)        groups.overdue.push(a);
    else if (+day === +today)    groups.today.push(a);
    else if (+day === +tomorrow) groups.tomorrow.push(a);
    else if (day <= endOfWeek)   groups.week.push(a);
    else                         groups.later.push(a);
  });

  return [
    { key: 'overdue',  label: 'VENCIDAS',        items: groups.overdue },
    { key: 'today',    label: 'HOJE',             items: groups.today },
    { key: 'tomorrow', label: 'AMANHÃ',           items: groups.tomorrow },
    { key: 'week',     label: 'ESTA SEMANA',      items: groups.week },
    { key: 'later',    label: 'PRÓXIMAS SEMANAS', items: groups.later },
    { key: 'no_date',  label: 'SEM DATA',         items: groups.no_date },
  ].filter(g => g.items.length > 0);
}

// ─── Nova Atividade Modal ─────────────────────────────────────────────────────
export interface NovaAtividadeModalProps {
  onClose: () => void;
  onSave: () => void;
  initialLead?: Lead;
  initialTask?: any;
}

export const NovaAtividadeModal: React.FC<NovaAtividadeModalProps> = ({ onClose, onSave, initialLead, initialTask }) => {
  const { userData } = useAuth();
  const [selectedType, setSelectedType] = useState(initialTask?.type || 'Ligação');
  const [title, setTitle] = useState(initialTask?.title || '');
  const [datetime, setDatetime] = useState(() => {
    if (initialTask?.due_date) {
      const datePart = initialTask.due_date.split('T')[0];
      const timePart = initialTask.start_time ? initialTask.start_time.substring(0, 5) : '00:00';
      return `${datePart}T${timePart}`;
    }
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const ho = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yr}-${mo}-${da}T${ho}:${mi}`;
  });
  const [leadSearch, setLeadSearch] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(initialLead || null);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [notes, setNotes] = useState(initialTask?.observations || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const leadRef = useRef<HTMLDivElement>(null);

  // Auto-fill title based on type
  useEffect(() => {
    if (!title || Object.values(TYPE_CONFIG).some(c => c.label === title)) {
      setTitle(TYPE_CONFIG[selectedType]?.label || selectedType);
    }
  }, [selectedType]);

  useEffect(() => {
    fetch('/api/crm-comercial/leads')
      .then(r => r.json())
      .then((data: any[]) => setLeads(data.map(l => ({ id: l.id, nome: l.nome, empresa: l.empresa }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!leadSearch.trim()) { setFilteredLeads(leads.slice(0, 8)); return; }
    setFilteredLeads(leads.filter(l =>
      l.nome.toLowerCase().includes(leadSearch.toLowerCase()) ||
      (l.empresa && l.empresa.toLowerCase().includes(leadSearch.toLowerCase()))
    ).slice(0, 8));
  }, [leadSearch, leads]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (leadRef.current && !leadRef.current.contains(e.target as Node)) {
        setShowLeadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSave = async () => {
    if (!title.trim()) { setError('Título é obrigatório'); return; }
    if (!selectedLead) { setError('Selecione um negócio'); return; }
    setSaving(true);
    setError('');
    try {
      const [datePart, timePart] = datetime.split('T');
      const due_date = datePart;
      const start_time = timePart ? timePart.slice(0, 5) : '00:00';
      
      const endpoint = initialTask 
        ? `/api/crm-comercial/tasks/${initialTask.id}`
        : `/api/crm-comercial/leads/${selectedLead.id}/tasks`;
      const method = initialTask ? 'PATCH' : 'POST';

      await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type: selectedType,
          due_date,
          start_time,
          observations: notes,
          // Auto-assign the current user as responsible so notifications work correctly
          ...((!initialTask && userData?.id) ? { responsible_id: String(userData.id) } : {}),
        }),
      });
      onSave();
      onClose();
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const typeButtons = Object.keys(TYPE_CONFIG);

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal — segue o padrão de glassmorphism do Design System */}
      <div className="relative w-full max-w-lg bg-white dark:bg-dark-bg/80 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-7 pb-5">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{initialTask ? 'Editar Atividade' : 'Nova Atividade'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="px-7 pb-7 space-y-5">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2.5">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {typeButtons.map(t => {
                const cfg = getTypeConfig(t);
                const Icon = cfg.icon;
                const active = selectedType === t;
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                      active
                        ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-violet-400/50 hover:text-violet-500'
                    }`}
                  >
                    <Icon size={13} />
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Título <span className="text-violet-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Ligação de apresentação"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400 dark:focus:border-violet-500/50 transition-all"
            />
          </div>

          {/* Data e hora */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Data e hora</label>
            <input
              type="datetime-local"
              value={datetime}
              onChange={e => setDatetime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400 transition-all"
            />
          </div>

          {/* Negócio */}
          <div ref={leadRef}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Negócio <span className="text-violet-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                disabled={!!initialLead}
                value={selectedLead ? selectedLead.nome : leadSearch}
                onChange={e => {
                  setLeadSearch(e.target.value);
                  setSelectedLead(null);
                  setShowLeadDropdown(true);
                }}
                onFocus={() => setShowLeadDropdown(true)}
                placeholder="Buscar negócio..."
                className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400 transition-all ${!!initialLead ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
              />
              {showLeadDropdown && filteredLeads.length > 0 && !selectedLead && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 max-h-44 overflow-y-auto">
                  {filteredLeads.map(l => (
                    <button
                      key={l.id}
                      onClick={() => { setSelectedLead(l); setLeadSearch(''); setShowLeadDropdown(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-violet-50 dark:hover:bg-violet-500/10 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <ExternalLink size={12} className="text-slate-400 shrink-0" />
                      <span className="font-medium truncate">{l.nome}</span>
                      {l.empresa && <span className="text-xs text-slate-400 truncate">· {l.empresa}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Notas</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observações opcionais..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400 resize-none transition-all"
            />
          </div>

          {/* Error */}
          {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
          >
            {saving ? 'Salvando...' : 'Salvar Atividade'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Activity Card ────────────────────────────────────────────────────────────
const ActivityCard = ({
  activity,
  onToggle,
  onDelete,
  onEdit,
}: {
  activity: Activity;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (activity: Activity) => void;
}) => {
  const cfg = getTypeConfig(activity.type);
  const Icon = cfg.icon;
  const isOverdue = (() => {
    if (activity.completed || !activity.due_date) return false;
    const d = parseLocalDate(activity.due_date);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return day < today;
  })();
  const dateLabel = formatDateTime(activity.due_date, activity.start_time);

  return (
    <div className={`group flex items-center gap-4 px-5 py-3.5 bg-white dark:bg-slate-800/60 border rounded-xl transition-all duration-200 ${
      activity.completed
        ? 'border-slate-100 dark:border-white/5 opacity-55'
        : 'border-slate-200/70 dark:border-white/10 hover:border-violet-300/60 dark:hover:border-violet-500/30 hover:shadow-md hover:shadow-violet-500/5'
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(activity.id, !activity.completed)}
        className="shrink-0 transition-transform hover:scale-110"
      >
        {activity.completed
          ? <CheckCircle2 size={20} className="text-violet-500" />
          : <Circle size={20} className="text-slate-300 dark:text-slate-600 group-hover:text-violet-400 transition-colors" />
        }
      </button>

      {/* Type Icon */}
      <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5">
        <Icon size={15} className="text-slate-500 dark:text-slate-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {activity.start_time && (
            <span className="text-sm font-semibold text-slate-700 dark:text-white">
              {activity.start_time.slice(0, 5)} -
            </span>
          )}
          <span className={`text-sm font-semibold ${activity.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
            {activity.title}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {dateLabel && (
            <span className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? 'text-rose-500' : 'text-violet-500 dark:text-violet-400'}`}>
              <Calendar size={11} />
              {dateLabel}
            </span>
          )}
          {activity.lead_name && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-500 dark:text-violet-400 truncate max-w-[180px]">
              <UserCircle size={11} className="shrink-0" />
              {activity.lead_name}
            </span>
          )}
         </div>
      </div>

      {/* Kanban — right side */}
      {activity.kanban_name && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
            {activity.kanban_name}
          </span>
        </div>
      )}

      {/* Botões de ação — visíveis no hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(activity)}
          title="Editar atividade"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(activity.id)}
          title="Excluir atividade"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Type badge */}
      <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
        {cfg.label}
      </span>
    </div>
  );
};

// ─── Calendar View ────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  'Ligação':      { bg: 'bg-violet-100 dark:bg-violet-500/20', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  'WhatsApp':     { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  'Email':        { bg: 'bg-sky-100 dark:bg-sky-500/20', text: 'text-sky-700 dark:text-sky-300', dot: 'bg-sky-500' },
  'Reunião':      { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  'Videochamada': { bg: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-700 dark:text-pink-300', dot: 'bg-pink-500' },
  'Instagram':    { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  'LinkedIn':     { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  'Outros':       { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
};

function getTypeColor(type: string) {
  return TYPE_COLORS[type] || TYPE_COLORS['Outros'];
}

const CalendarView: React.FC<{ activities: Activity[]; onToggle: (id: number, completed: boolean) => void }> = ({ activities, onToggle }) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Build cells: prev month padding + current month + next month padding
  const cells: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
  }

  // Map activities by date key
  const byDate: Record<string, Activity[]> = {};
  activities.forEach(a => {
    if (!a.due_date) return;
    const key = a.due_date.split('T')[0];
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(a);
  });

  const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const todayKey = toKey(today);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedActivities = selectedDay ? (byDate[selectedDay] || []) : [];

  return (
    <div className="space-y-4">
      {/* Calendar Card */}
      <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-bold text-slate-800 dark:text-white capitalize">
            {monthNames[month]} de {year}
          </h2>
          <button
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-white/[0.06]">
          {weekDays.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {cells.map((cell, idx) => {
            const key = toKey(cell.date);
            const dayActivities = byDate[key] || [];
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;
            const maxVisible = 2;
            const overflow = dayActivities.length - maxVisible;

            return (
              <div
                key={idx}
                onClick={() => setSelectedDay(isSelected ? null : key)}
                className={`min-h-[90px] border-b border-r border-slate-100 dark:border-white/5 p-1.5 cursor-pointer transition-all ${
                  !cell.isCurrentMonth ? 'bg-slate-50/50 dark:bg-white/[0.01]' : 'hover:bg-violet-50/30 dark:hover:bg-violet-500/5'
                } ${
                  isSelected ? 'bg-violet-50 dark:bg-violet-500/10 ring-1 ring-inset ring-violet-300 dark:ring-violet-500/30' : ''
                }`}
              >
                {/* Day number */}
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mb-1 ${
                  isToday
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                    : cell.isCurrentMonth
                      ? 'text-slate-700 dark:text-slate-200'
                      : 'text-slate-300 dark:text-slate-600'
                }`}>
                  {cell.date.getDate()}
                </div>

                {/* Activity chips */}
                <div className="space-y-0.5">
                  {dayActivities.slice(0, maxVisible).map(a => {
                    const colors = getTypeColor(a.type);
                    return (
                      <div
                        key={a.id}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${
                          colors.bg
                        } ${
                          a.completed ? 'opacity-40 line-through' : ''
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                        <span className={`truncate ${colors.text}`}>
                          {a.start_time ? a.start_time.slice(0,5) + ' ' : ''}{a.title}
                        </span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div className="text-[10px] font-semibold text-violet-500 dark:text-violet-400 px-1.5">
                      +{overflow} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
              <X size={14} />
            </button>
          </div>
          {selectedActivities.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhuma atividade neste dia.</p>
          ) : (
            <div className="space-y-2">
              {selectedActivities.map(a => (
                <ActivityCard key={a.id} activity={a} onToggle={onToggle} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const Atividades: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [kanbanFilter, setKanbanFilter] = useState('all');
  const [kanbans, setKanbans] = useState<{id: string; nome: string}[]>([]);
  const [showKanbanDropdown, setShowKanbanDropdown] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const kanbanDropdownRef = useRef<HTMLDivElement>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const allTypes = ['all', ...Object.keys(TYPE_CONFIG)];

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('completed', statusFilter === 'completed' ? 'true' : 'false');
      const res = await fetch(`/api/crm-comercial/activities?${params}`);
      if (res.ok) setActivities(await res.json());
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  // Fetch kanbans for filter
  useEffect(() => {
    fetch('/api/crm-comercial/kanbans')
      .then(r => r.json())
      .then(data => setKanbans(data))
      .catch(() => {});
  }, []);

  // Close type dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target as Node)) {
        setShowTypeDropdown(false);
      }
      if (kanbanDropdownRef.current && !kanbanDropdownRef.current.contains(e.target as Node)) {
        setShowKanbanDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = async (id: number, completed: boolean) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, completed } : a));
    try {
      await fetch(`/api/crm-comercial/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed, completed_at: completed ? new Date().toISOString() : null }),
      });
    } catch {
      fetchActivities();
    }
  };

  const handleDelete = async (id: number) => {
    setActivities(prev => prev.filter(a => a.id !== id));
    try {
      await fetch(`/api/crm-comercial/tasks/${id}`, { method: 'DELETE' });
    } catch {
      fetchActivities();
    }
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
  };

  const filteredByKanban = kanbanFilter === 'all' 
    ? activities 
    : activities.filter(a => a.kanban_id === kanbanFilter);
  const grouped = groupActivitiesByDate(filteredByKanban);
  const totalCount = filteredByKanban.length;

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <style>{`
        @keyframes rowFadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sectionExpand {
          from { opacity: 0; max-height: 0; }
          to   { opacity: 1; max-height: 2000px; }
        }
      `}</style>

      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-dark-bg/95 border-b border-slate-200/70 dark:border-white/[0.06] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-3">

          {/* Left — título */}
          <div>
            <SplitHeadline text="Ativi" highlight="dades" className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none" />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {loading ? 'Carregando...' : `${totalCount} atividade${totalCount !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* Right — controles */}
          <div className="flex items-center gap-2">

            {/* View toggle: Lista / Calendário */}
            <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-xl p-0.5 gap-0.5 border border-slate-200/80 dark:border-white/[0.06]">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <List size={13} /> Lista
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white dark:bg-white/10 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <Calendar size={13} /> Calendário
              </button>
            </div>

            {/* Status tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/[0.06] rounded-xl p-0.5 gap-0.5">
              {([
                { key: 'pending',   label: 'Pendentes' },
                { key: 'completed', label: 'Concluídas' },
                { key: 'all',       label: 'Todas' },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    statusFilter === opt.key
                      ? 'text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                  }`}
                  style={statusFilter === opt.key ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Type filter */}
            <div className="relative" ref={typeDropdownRef}>
              <button
                onClick={() => setShowTypeDropdown(v => !v)}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/[0.06] rounded-xl hover:border-violet-300/60 dark:hover:border-violet-500/30 transition-all"
              >
                <SlidersHorizontal size={13} />
                {typeFilter === 'all' ? 'Todos' : typeFilter}
                <ChevronDown size={12} />
              </button>
              {showTypeDropdown && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                  {allTypes.map(t => {
                    const cfg = t === 'all' ? null : getTypeConfig(t);
                    const TIcon = cfg?.icon;
                    return (
                      <button
                        key={t}
                        onClick={() => { setTypeFilter(t); setShowTypeDropdown(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10 ${
                          typeFilter === t ? 'text-violet-600 dark:text-violet-400 font-semibold' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {TIcon ? <TIcon size={14} /> : <Filter size={14} />}
                        {t === 'all' ? 'Todos os tipos' : t}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Kanban filter */}
            <div className="relative" ref={kanbanDropdownRef}>
              <button
                onClick={() => setShowKanbanDropdown(v => !v)}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-white dark:bg-white/5 border rounded-xl transition-all ${
                  kanbanFilter !== 'all' 
                    ? 'text-emerald-600 dark:text-emerald-400 border-emerald-300/60 dark:border-emerald-500/30' 
                    : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/[0.06] hover:border-violet-300/60 dark:hover:border-violet-500/30'
                }`}
              >
                <Filter size={13} />
                {kanbanFilter === 'all' ? 'Funil' : kanbans.find(k => k.id === kanbanFilter)?.nome || 'Funil'}
                <ChevronDown size={12} />
              </button>
              {showKanbanDropdown && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                  <button
                    onClick={() => { setKanbanFilter('all'); setShowKanbanDropdown(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10 ${
                      kanbanFilter === 'all' ? 'text-violet-600 dark:text-violet-400 font-semibold' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Filter size={14} />
                    Todos os funis
                  </button>
                  {kanbans.map(k => (
                    <button
                      key={k.id}
                      onClick={() => { setKanbanFilter(k.id); setShowKanbanDropdown(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-violet-50 dark:hover:bg-violet-500/10 ${
                        kanbanFilter === k.id ? 'text-violet-600 dark:text-violet-400 font-semibold' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <ExternalLink size={14} />
                      {k.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={fetchActivities}
              className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/[0.06] hover:text-violet-500 hover:border-violet-300/60 transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Nova Atividade */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg hover:shadow-violet-500/25 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            >
              <Plus size={15} />
              Nova Atividade
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Carregando atividades...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="p-6 rounded-2xl bg-violet-50 dark:bg-violet-500/10">
              <CheckCircle2 size={40} className="text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-600 dark:text-slate-300">Nenhuma atividade encontrada</p>
              <p className="text-sm text-slate-400 mt-1">
                {statusFilter === 'pending' ? 'Nenhuma atividade pendente.' : 'Tente ajustar os filtros.'}
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white mx-auto transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                <Plus size={14} />
                Criar atividade
              </button>
            </div>
          </div>
        ) : viewMode === 'calendar' ? (
          <CalendarView activities={activities} onToggle={handleToggle} />
        ) : (
          <div className="space-y-7">
            {grouped.map(group => {
              const isCollapsed = collapsedSections[group.key] || false;
              return (
                <div key={group.key}>
                  {/* Group header — clickable to toggle */}
                  <button
                    onClick={() => setCollapsedSections(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                    className="flex items-center gap-3 mb-3 w-full group/header"
                  >
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 dark:text-slate-500 transition-transform duration-300 ${
                        isCollapsed ? '-rotate-90' : 'rotate-0'
                      }`}
                    />
                    <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${
                      group.key === 'overdue'
                        ? 'text-rose-400'
                        : 'text-slate-400 dark:text-slate-500 group-hover/header:text-violet-400'
                    }`}>
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-slate-100 dark:bg-white/[0.06]" />
                    <span className="text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                      {group.items.length}
                    </span>
                  </button>

                  {/* Cards — collapsible with animation */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isCollapsed ? 'max-h-0 opacity-0' : 'opacity-100'
                    }`}
                    style={!isCollapsed ? { maxHeight: `${group.items.length * 120 + 100}px` } : undefined}
                  >
                    <div className="space-y-2">
                      {group.items.map((activity, idx) => (
                        <div
                          key={activity.id}
                          style={{ animation: 'rowFadeIn 0.3s ease both', animationDelay: `${idx * 0.04}s` }}
                        >
                          <ActivityCard
                            activity={activity}
                            onToggle={handleToggle}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Nova Atividade Modal ── */}
      {showModal && (
        <NovaAtividadeModal
          onClose={() => setShowModal(false)}
          onSave={fetchActivities}
        />
      )}

      {/* ── Editar Atividade Modal ── */}
      {editingActivity && (
        <NovaAtividadeModal
          onClose={() => setEditingActivity(null)}
          onSave={() => { fetchActivities(); setEditingActivity(null); }}
          initialLead={editingActivity.lead_id ? { id: editingActivity.lead_id, nome: editingActivity.lead_name || editingActivity.lead_id } : undefined}
          initialTask={editingActivity}
        />
      )}
    </div>
  );
};

export default Atividades;
