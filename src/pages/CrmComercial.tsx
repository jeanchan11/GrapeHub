import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { 
  Plus, Search, Filter, MessageSquare, Clock, Trash2, 
  ChevronRight, ChevronLeft, Flame, DollarSign, X, Edit2, ChevronDown, Check, Users, LayoutGrid,
  TrendingUp, TrendingDown, MoreHorizontal, ArrowRightLeft, Send, History, Phone, Mail,
  ArrowRight, Calendar, CheckSquare, FileText, Paperclip, Trophy, Star, Eye, EyeOff, Settings, PhoneCall, Loader2, Mic, MicOff,
  CheckCircle2, Circle, Video, Tag, Instagram, Briefcase, Award, Copy,
  Handshake, RefreshCw, XCircle, ClipboardList
} from 'lucide-react';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  useDroppable
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { NovaAtividadeModal } from './Atividades';
import { designSystem } from '../design-system';
import { useAuth } from '../contexts/AuthContext';
import confetti from 'canvas-confetti';
import { useSoftphone, formatCallTime } from '../hooks/useSoftphone';

interface Lead {
  id: string;
  nome: string;
  telefone: string | null;
  origem: string;
  instagram?: string | null;
  nicho?: string | null;
  tempo_oab?: string | null;
  faturamento?: string | null;
  responsavel_id: string | null;
  valor: number;
  coluna: string;
  observacoes: string | null;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  name: string;
  avatar?: string;
  picture?: string;
}

const COLUMN_HEADER_COLORS: Record<string, string> = {
  orange: 'border-orange-500',
  purple: 'border-purple-500',
  blue: 'border-blue-500',
  emerald: 'border-emerald-500',
};

interface CrmTask {
  id: number;
  lead_id: string;
  title: string;
  type: string;
  priority: string;
  due_date: string;
  start_time: string | null;
  end_time: string | null;
  responsible_id: string | null;
  observations: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

interface CrmTaskTemplateItem {
  id: number;
  template_id: number;
  title: string;
  type: string;
  priority: string;
  due_days_offset: number;
  order_index: number;
}

interface CrmTaskTemplate {
  id: number;
  name: string;
  description: string;
  items: CrmTaskTemplateItem[];
}

const ORIGIN_COLORS: Record<string, string> = {
  'Indicação': 'bg-orange-500/10 text-orange-500',
  'TCV': 'bg-purple-500/10 text-purple-500',
  'Mensal': 'bg-emerald-500/10 text-emerald-500',
  'Outro': 'bg-slate-500/10 text-slate-500',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDuration = (start: string, end: string) => {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff <= 0) return 'alguns segundos';
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}min`;
  return `${minutes}min`;
};

export const COLUMN_ICONS = [
  'LayoutGrid', 'MessageSquare', 'Phone', 'Mail', 'Users', 
  'Briefcase', 'Calendar', 'FileText', 'Award', 'Flame', 
  'DollarSign', 'Star', 'Trophy',
  'Handshake', 'RefreshCw', 'XCircle', 'Search', 'ClipboardList'
];

export const RenderIcon = ({ name, size = 20, className = "" }: { name: string, size?: number, className?: string }) => {
  switch (name) {
    case 'MessageSquare': return <MessageSquare size={size} className={className} />;
    case 'Phone': return <Phone size={size} className={className} />;
    case 'Mail': return <Mail size={size} className={className} />;
    case 'Users': return <Users size={size} className={className} />;
    case 'Briefcase': return <Briefcase size={size} className={className} />;
    case 'Calendar': return <Calendar size={size} className={className} />;
    case 'FileText': return <FileText size={size} className={className} />;
    case 'Award': return <Award size={size} className={className} />;
    case 'Flame': return <Flame size={size} className={className} />;
    case 'DollarSign': return <DollarSign size={size} className={className} />;
    case 'Star': return <Star size={size} className={className} />;
    case 'Trophy': return <Trophy size={size} className={className} />;
    case 'Handshake': return <Handshake size={size} className={className} />;
    case 'RefreshCw': return <RefreshCw size={size} className={className} />;
    case 'XCircle': return <XCircle size={size} className={className} />;
    case 'Search': return <Search size={size} className={className} />;
    case 'ClipboardList': return <ClipboardList size={size} className={className} />;
    default: return <LayoutGrid size={size} className={className} />;
  }
};

const isWonColumn = (title?: string) => 
  title?.toLowerCase().includes('ganho') || title?.toLowerCase().includes('fechado');

const isLostColumn = (title?: string) => 
  title?.toLowerCase().includes('perd') || title?.toLowerCase().includes('descart');

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const parseLocalDate = (dateString: string) => {
  if (!dateString) return new Date();
  const dateOnly = dateString.split('T')[0];
  return new Date(dateOnly + 'T12:00:00');
};

const isToday = (dateString: string) => {
  if (!dateString) return false;
  const date = parseLocalDate(dateString);
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

const isPastDate = (dateString: string) => {
  if (!dateString) return false;
  const date = parseLocalDate(dateString);
  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
};

const isTomorrowDate = (dateString: string) => {
  if (!dateString) return false;
  const date = parseLocalDate(dateString);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();
};

const DroppableColumn = ({ id, children }: { id: string, children: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`flex-1 flex flex-col transition-colors duration-200 rounded-2xl ${isOver ? 'bg-gray-100 dark:bg-white/5 ring-2 ring-emerald-500/50' : ''}`}
    >
      {children}
    </div>
  );
};

interface SortableCardProps {
  key?: string;
  lead: Lead;
  users: User[];
  columns: any[];
  tasks: CrmTask[];
  onClick: () => void;
  onMove: (leadId: string, newColumn: string) => void | Promise<void>;
  onDelete: (leadId: string) => void | Promise<void>;
  onEditValue: (leadId: string, newValue: number) => void | Promise<void>;
  onHistory: () => void;
  isOverlay?: boolean;
}

interface LeadDetailModalProps {
  lead: Lead | null;
  users: User[];
  columns: any[];
  kanbans: any[];
  comments: any[];
  history: any[];
  tasks: CrmTask[];
  templates: CrmTaskTemplate[];
  newComment: string;
  setNewComment: (v: string) => void;
  onClose: () => void;
  onAddComment: () => void;
  onDeleteComment: (id: string) => void;
  onMove: (leadId: string, newColumn: string) => void | Promise<void>;
  onDelete: (leadId: string) => void | Promise<void>;
  onWin: (leadId: string) => void;
  onLose: (leadId: string) => void;
  onMoveToKanban: (leadId: string, kanbanId: string) => void | Promise<void>;
  onAddTask: (task: Partial<CrmTask>) => void | Promise<void>;
  onUpdateTask: (id: number, updates: Partial<CrmTask>) => void | Promise<void>;
  onDeleteTask: (id: number) => void | Promise<void>;
  onApplyTemplate: (templateId: number) => void | Promise<void>;
  onManageTemplates: () => void;
  onRefreshTasks: () => void;
  currentKanbanId: string | null;
  api4comSettings: { configured: boolean } | null;
  callingLeadId: string | null;
  onCallLead: (leadId: string, phone: string, leadName?: string) => void;
  onUpdateLeadField: (leadId: string, field: string, value: any) => void;
  tags: any[];
  onRefreshTags: () => void;
}

const SortableCard = (props: SortableCardProps) => {
  const { lead, users, columns, tasks, onClick, onMove, onDelete, onEditValue, onHistory, isOverlay = false } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { type: 'Lead', lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.3 : 1,
  };

  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editValue, setEditValue] = useState(lead.valor.toString());

  const responsavel = users.find(u => u.id === lead.responsavel_id);

  const isWon = isWonColumn(columns.find(c => c.id === lead.coluna)?.title);

  // Próxima atividade pendente
  const leadTasks = tasks.filter(t => t.lead_id === lead.id && !t.completed);
  const nextTask = leadTasks.sort((a, b) => {
    const dateA = new Date(`${a.due_date}T${a.start_time || '00:00'}`).getTime();
    const dateB = new Date(`${b.due_date}T${b.start_time || '00:00'}`).getTime();
    return dateA - dateB;
  })[0] ?? null;

  const getTaskStyle = (task: CrmTask) => {
    if (!task.due_date) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    // Pega só os primeiros 10 chars para evitar timestamps (ex: 2026-04-16T00:00:00Z)
    const dateOnly = task.due_date.substring(0, 10);
    const [y, m, d] = dateOnly.split('-').map(Number);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d);
    if (isNaN(dt.getTime())) return null;
    if (dt < today) return { badge: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400', label: 'Atrasada' };
    if (dt.getTime() === today.getTime()) return { badge: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400', label: 'Hoje' };
    if (dt.getTime() === tomorrow.getTime()) return { badge: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-400', label: 'Amanhã' };
    return { badge: 'text-gray-500 bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-400', label: dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) };
  };
  const taskStyle = nextTask ? getTaskStyle(nextTask) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onClick()}
      className={`rounded-xl p-3 border shadow-sm cursor-pointer relative group transition-all duration-200 ${
        isDragging ? 'ring-2 ring-violet-500 opacity-30' : 
        isWon ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/30 shadow-[0_4px_15px_rgba(16,185,129,0.1)] hover:border-emerald-500/50 hover:shadow-emerald-500/20' :
        'bg-white dark:bg-dark-card border-gray-200 dark:border-white/5 hover:border-violet-500/30 hover:shadow-md'
      }`}
      {...attributes}
      {...listeners}
    >
      {isWon && (
        <div className="absolute -top-2.5 -right-2.5 z-20 bg-emerald-500 text-white p-2 rounded-full shadow-lg border-2 border-white dark:border-dark-card animate-pulse">
          <Trophy size={14} />
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          {lead.origem === 'Indicação' ? (
            <img src="https://ui-avatars.com/api/?name=Yandra+Alves&background=random" alt="Avatar" className="w-8 h-8 rounded-full" />
          ) : lead.origem === 'TCV' ? (
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              {getInitials(lead.nome)}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              {getInitials(lead.nome)}
            </div>
          )}
          <div>
            <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{lead.nome}</h4>
            <div className="flex flex-wrap items-center gap-1 mt-1">
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-slate-300">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  lead.origem === 'Indicação' ? 'bg-orange-500' : 
                  lead.origem === 'TCV' ? 'bg-emerald-500' : 
                  'bg-blue-500'
                }`}></span>
                {lead.origem}
              </span>
              {((lead as any).tags || []).map((tag: any) => (
                <span key={tag.name} className="px-1.5 py-0.5 text-[9px] font-bold rounded-full text-white shadow-sm" style={{ backgroundColor: tag.color }}>
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {responsavel && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold text-gray-600 dark:text-white overflow-hidden" title={responsavel.name}>
            {responsavel.picture ? <img src={responsavel.picture} alt={responsavel.name} className="w-full h-full object-cover" /> : getInitials(responsavel.name)}
          </div>
          <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">{responsavel.name}</span>
        </div>
      )}

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 mb-2">
        <div className="text-sm font-black text-emerald-500">
          {formatCurrency(lead.valor)}
        </div>
      </div>

      {/* Próxima Atividade */}
      {taskStyle && nextTask && (
        <div className={`flex items-center justify-between rounded-lg px-2 py-1.5 border text-xs font-semibold mb-2 ${taskStyle.badge}`}>
          <div className="flex items-center gap-1.5">
            <Clock size={11} />
            <span>{taskStyle.label}: {nextTask.type}</span>
          </div>
          {nextTask.start_time && (
            <span className="font-bold">{nextTask.start_time.slice(0,5)}</span>
          )}
        </div>
      )}



    </div>
  );
};

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead, users, columns, kanbans, comments, history, tasks, templates, newComment,
  setNewComment, onClose, onAddComment, onDeleteComment,
  onMove, onDelete, onWin, onLose, onMoveToKanban, 
  onAddTask, onUpdateTask, onDeleteTask, onApplyTemplate, onManageTemplates,
  onRefreshTasks, currentKanbanId, api4comSettings, callingLeadId, onCallLead, onUpdateLeadField,
  tags, onRefreshTags
}) => {
  const [activeTab, setActiveTab] = useState<'atividades' | 'histórico' | 'notas' | 'ligações' | 'arquivos'>('atividades');
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showKanbanMenu, setShowKanbanMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<CrmTask | null>(null);
  const [isSelectingTemplate, setIsSelectingTemplate] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    type: 'Tarefa',
    priority: 'Normal',
    due_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    responsible_id: '',
    observations: ''
  });

  const moveRef = useRef<HTMLDivElement>(null);
  const kanbanRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moveRef.current && !moveRef.current.contains(e.target as Node)) setShowMoveMenu(false);
      if (kanbanRef.current && !kanbanRef.current.contains(e.target as Node)) setShowKanbanMenu(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!lead) return null;

  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const tagsRef = useRef<HTMLDivElement>(null);
  
  const [sectionsOpen, setSectionsOpen] = useState({
    business: true,
    tags: true,
    contact: true,
    obs: true,
    meeting: false,
    utms: false
  });
  const toggleSection = (sec: keyof typeof sectionsOpen) => setSectionsOpen(p => ({ ...p, [sec]: !p[sec] }));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagsRef.current && !tagsRef.current.contains(e.target as Node)) setShowTagMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const responsavel = users.find(u => u.id === lead.responsavel_id);
  const currentColumn = columns.find(c => c.id === lead.coluna);
  const tabs = ['Atividades', 'Histórico', 'Notas', 'Ligações', 'Arquivos'];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 modal-overlay" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-7xl h-[90vh] modal-container overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b modal-divider shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center font-bold text-violet-600 dark:text-violet-400">
              {getInitials(lead.nome)}
            </div>
            <div>
              <h2 className="font-bold text-lg modal-title">{lead.nome}</h2>
              {lead.telefone && <p className="text-xs text-gray-500 dark:text-slate-400">{lead.telefone}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
          {/* Botão de Ligação (Api4Com) */}
            <button
              title={api4comSettings?.configured && lead.telefone ? 'Ligar para contato' : !lead.telefone ? 'Sem telefone cadastrado' : 'Configure a telefonia primeiro'}
              disabled={!api4comSettings?.configured || !lead.telefone || callingLeadId === lead.id}
              onClick={(e) => { e.stopPropagation(); onCallLead(lead.id, lead.telefone!, lead.nome); }}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${
                api4comSettings?.configured && lead.telefone
                  ? 'border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 active:scale-95'
                  : 'border-gray-600 text-gray-600 opacity-40 cursor-not-allowed'
              }`}
            >
              {callingLeadId === lead.id
                ? <Loader2 size={15} className="animate-spin" />
                : <PhoneCall size={15} />
              }
            </button>

            {/* Ganhar */}
            <button
              onClick={() => { onWin(lead.id); onClose(); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
            >
              <TrendingUp size={15} />
              Ganhar
            </button>

            {/* Perda */}
            <button
              onClick={() => { onLose(lead.id); onClose(); }}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-500/20"
            >
              <TrendingDown size={15} />
              Perda
            </button>

            {/* Mais (+ dropdown) */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => { setShowMoreMenu(v => !v); setShowMoveMenu(false); setShowKanbanMenu(false); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-white rounded-xl text-sm font-bold transition-all"
              >
                <MoreHorizontal size={16} />
                Mais
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 modal-container py-2 z-50 shadow-2xl">
                  {/* Mover de kanban */}
                  <div className="relative" ref={moveRef}>
                    <button
                      onClick={() => setShowMoveMenu(v => !v)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 text-sm text-gray-700 dark:text-slate-200 transition-colors"
                    >
                      <ArrowRightLeft size={15} className="text-violet-500" />
                      Mover de coluna
                      <ChevronLeft size={14} className="ml-auto" />
                    </button>
                    <AnimatePresence>
                      {showMoveMenu && (
                        <motion.div 
                          initial={{ opacity: 0, x: 10, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 10, scale: 0.95 }}
                          className="absolute right-[calc(100%+8px)] top-0 w-56 bg-white/80 dark:bg-[#161420]/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl py-2 z-50 shadow-2xl"
                        >
                          <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">Mover para coluna</span>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
                            {columns.map(col => (
                              <button
                                key={col.id}
                                onClick={() => { onMove(lead.id, col.id); setShowMoveMenu(false); setShowMoreMenu(false); }}
                                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/5 ${
                                  lead.coluna === col.id ? 'text-violet-500 font-bold bg-violet-500/5' : 'text-gray-700 dark:text-slate-300'
                                }`}
                              >
                                <div className={`w-2 h-2 rounded-full ${
                                  col.color === 'orange' ? 'bg-orange-500' :
                                  col.color === 'blue' ? 'bg-blue-500' :
                                  col.color === 'green' ? 'bg-emerald-500' :
                                  col.color === 'pink' ? 'bg-pink-500' :
                                  col.color === 'red' ? 'bg-red-500' : 'bg-slate-500'
                                }`} />
                                {col.title}
                                {lead.coluna === col.id && <Check size={14} className="ml-auto" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Mover de Kanban */}
                  <div className="relative" ref={kanbanRef}>
                    <button
                      onClick={() => setShowKanbanMenu(v => !v)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/5 text-sm text-gray-700 dark:text-slate-200 transition-colors"
                    >
                      <LayoutGrid size={15} className="text-blue-500" />
                      Mover de kanban
                      <ChevronLeft size={14} className="ml-auto" />
                    </button>
                    <AnimatePresence>
                      {showKanbanMenu && (
                        <motion.div 
                          initial={{ opacity: 0, x: 10, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 10, scale: 0.95 }}
                          className="absolute right-[calc(100%+8px)] top-0 w-60 bg-white/80 dark:bg-[#161420]/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl py-2 z-50 shadow-2xl"
                        >
                          <div className="px-4 py-2 border-b border-gray-100 dark:border-white/5 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">Mover para Kanban</span>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
                            {kanbans.map(kb => (
                              <button
                                key={kb.id}
                                onClick={() => { onMoveToKanban(lead.id, kb.id); setShowKanbanMenu(false); setShowMoreMenu(false); onClose(); }}
                                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 hover:bg-gray-100 dark:hover:bg-white/5 ${
                                  kb.id === currentKanbanId ? 'text-violet-500 font-bold bg-violet-500/5' : 'text-gray-700 dark:text-slate-300'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px] uppercase shadow-inner ${
                                  kb.cor === 'blue' ? 'bg-blue-500 shadow-blue-500/50' :
                                  kb.cor === 'green' ? 'bg-emerald-500 shadow-emerald-500/50' :
                                  kb.cor === 'pink' ? 'bg-pink-500 shadow-pink-500/50' :
                                  kb.cor === 'orange' ? 'bg-orange-500 shadow-orange-500/50' :
                                  kb.cor === 'yellow' ? 'bg-yellow-500 shadow-yellow-500/50' :
                                  kb.cor === 'indigo' ? 'bg-indigo-500 shadow-indigo-500/50' : 'bg-violet-500 shadow-violet-500/50'
                                }`}>
                                  {kb.nome.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold">{kb.nome}</span>
                                  {kb.id === currentKanbanId && <span className="text-[9px] text-violet-500">Kanban atual</span>}
                                </div>
                                {kb.id === currentKanbanId && <Check size={14} className="ml-auto text-violet-500" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />

                  <button
                    onClick={() => { onDelete(lead.id); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm text-red-500 transition-colors"
                  >
                    <Trash2 size={15} />
                    Excluir lead
                  </button>
                </div>
              )}
            </div>

            {/* Fechar */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 border-b modal-divider shrink-0">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase() as any)}
              className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 ${
                activeTab === tab.toLowerCase()
                  ? 'modal-tab-active'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Body: two columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: activity/comments */}
          <div className="flex-1 flex flex-col overflow-hidden border-r modal-divider">
            <div className="flex-1 overflow-y-auto flex flex-col h-full bg-slate-50 dark:bg-black/20">
              {activeTab === 'histórico' && (
                <div className="p-6 space-y-4 flex-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Histórico</h3>
                  {history.length === 0 && comments.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-500 text-center py-8">Nenhuma atividade registrada.</p>
                  ) : (
                    <>
                      {history.map((item, index) => {
                        const nextItem = history[index + 1];
                        const prevDate = nextItem ? nextItem.created_at : lead.created_at;
                        const duration = formatDuration(prevDate, item.created_at);
                        const isTaskAction = item.action_type?.startsWith('task_');

                        // Task-specific events get a different style
                        if (isTaskAction || item.action_type === 'template_applied') {
                          const iconMap: Record<string, { icon: any; color: string; bg: string }> = {
                            task_created: { icon: <Plus size={10} />, color: 'text-blue-500', bg: 'bg-blue-500' },
                            task_completed: { icon: <Check size={10} />, color: 'text-emerald-500', bg: 'bg-emerald-500' },
                            task_reopened: { icon: <Clock size={10} />, color: 'text-orange-500', bg: 'bg-orange-500' },
                            task_deleted: { icon: <Trash2 size={10} />, color: 'text-red-500', bg: 'bg-red-500' },
                            template_applied: { icon: <FileText size={10} />, color: 'text-violet-500', bg: 'bg-violet-500' },
                          };

                          const taskTypeIcons: Record<string, any> = {
                            'Tarefa': <CheckSquare size={14} />,
                            'Ligação': <Phone size={14} />,
                            'WhatsApp': <MessageSquare size={14} />,
                            'Email': <Mail size={14} />,
                            'Reunião': <Users size={14} />,
                            'Lembrete': <Clock size={14} />,
                          };

                          const meta = iconMap[item.action_type] || iconMap.task_created;
                          
                          // Fallback for older records: parse type from description or title content
                          let effectiveTaskType = (item.task_type || '').trim();
                          
                          // Split description to show action and title as badges
                          const descParts = item.description.split(':');
                          const action = descParts[0];
                          let title = descParts[1]?.replace(/"/g, '').trim() || '';

                          // Cleanup old metadata from title if present (e.g., "(Tarefa · Normal)")
                          if (title.includes('(')) {
                            const metaMatch = title.match(/\(([^·]+)·/);
                            if (!effectiveTaskType && metaMatch) effectiveTaskType = metaMatch[1].trim();
                            title = title.split('(')[0].trim();
                          }

                          // Smart icon detection by keyword if still no type
                          const lowerTitle = title.toLowerCase();
                          if (!effectiveTaskType || effectiveTaskType === 'Tarefa') {
                             if (lowerTitle.includes('whatsapp') || lowerTitle.includes('wpp')) effectiveTaskType = 'WhatsApp';
                             else if (lowerTitle.includes('ligar') || lowerTitle.includes('ligação') || lowerTitle.includes('call')) effectiveTaskType = 'Ligação';
                             else if (lowerTitle.includes('email') || lowerTitle.includes('e-mail')) effectiveTaskType = 'Email';
                             else if (lowerTitle.includes('reunião') || lowerTitle.includes('meeting')) effectiveTaskType = 'Reunião';
                          }

                          const taskIcon = taskTypeIcons[effectiveTaskType] || taskTypeIcons[effectiveTaskType.charAt(0).toUpperCase() + effectiveTaskType.slice(1)] || taskTypeIcons['Tarefa'];

                          return (
                            <div key={item.id} className="relative pl-6 pb-6 last:pb-0">
                              {index !== history.length - 1 && (
                                <div className="absolute left-[7px] top-[14px] w-[2px] h-full bg-gray-100 dark:bg-white/5" />
                              )}
                              {/* Dot */}
                              <div className={`absolute left-0 top-1 w-[16px] h-[16px] rounded-full ${meta.bg} border-4 border-white dark:border-[#1A1625] shadow-sm z-10`} />
                              
                              <div className="bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 shadow-sm">
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  <span className="px-2.5 py-1 rounded-lg bg-violet-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                                    {action.replace('Tarefa ', '').trim()}
                                  </span>
                                  
                                  {title && (
                                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                      effectiveTaskType === 'WhatsApp' ? 'bg-emerald-100/50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                      (effectiveTaskType === 'Ligação' || effectiveTaskType === 'Lembrete') ? 'bg-blue-100/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                      effectiveTaskType === 'Tarefa' ? 'bg-amber-100/50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                      effectiveTaskType === 'Reunião' ? 'bg-yellow-200/50 dark:bg-yellow-600/20 text-yellow-700 dark:text-yellow-500' :
                                      effectiveTaskType === 'Email' ? 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-slate-400' :
                                      'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-slate-400'
                                    }`}>
                                      {taskIcon}
                                      {title}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                                    <Clock size={12} />
                                    <span>{new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const toColumnTitle = columns.find(c => c.id === item.to_coluna)?.title || item.to_coluna;
                        const isWonMove = isWonColumn(toColumnTitle);

                        return (
                          <div key={item.id} className="relative pl-6 pb-6 last:pb-0">
                            {/* Line connecting items */}
                            {index !== history.length - 1 && (
                              <div className="absolute left-[7px] top-[14px] w-[2px] h-full bg-gray-100 dark:bg-white/5" />
                            )}
                            
                            {/* Dot */}
                            <div className={`absolute left-0 top-1 w-[16px] h-[16px] rounded-full border-4 border-white dark:border-[#1A1625] shadow-sm z-10 flex items-center justify-center ${
                              isWonMove ? 'bg-emerald-500 scale-125' : 'bg-violet-500'
                            }`}>
                              {isWonMove && <Trophy size={6} className="text-white" />}
                            </div>

                            <div className={`rounded-2xl p-4 shadow-sm border transition-all duration-300 ${
                              isWonMove 
                              ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                              : 'bg-white/50 dark:bg-white/5 border-gray-100 dark:border-white/10'
                            }`}>
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                {isWonMove && (
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20">
                                    CONQUISTA! 🏆
                                  </span>
                                )}
                                <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-700 dark:text-slate-300">
                                  {columns.find(c => c.id === item.from_coluna)?.title || 'Sem Coluna'}
                                </span>
                                <ArrowRight size={14} className="text-gray-400" />
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg ${
                                  isWonMove 
                                  ? 'bg-emerald-500 text-white shadow-emerald-500/30' 
                                  : 'bg-violet-500 text-white shadow-violet-500/20'
                                }`}>
                                  {toColumnTitle}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                                  <Clock size={12} />
                                  <span>{new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="text-[11px] text-gray-400 dark:text-slate-500 italic">
                                  Tempo na etapa anterior: {duration}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {comments.map(comment => (
                        <div key={comment.id} className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-violet-600">
                            {getInitials(comment.user_name)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{comment.user_name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 dark:text-slate-500">{new Date(comment.created_at).toLocaleString('pt-BR')}</span>
                                <button onClick={() => onDeleteComment(comment.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
              {activeTab === 'atividades' && (
                <>
                  {/* Header do Design (Limpo) */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 shrink-0">
                    <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Atividades</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsSelectingTemplate(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-lg text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
                      >
                        <FileText size={14} /> Usar Modelo
                      </button>
                      <button 
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-lg text-xs font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-all"
                      >
                        <CheckSquare size={14} /> Aplicar Sequência
                      </button>
                      <button 
                        onClick={() => { setTaskToEdit(null); setIsAddingTask(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-bold shadow-md shadow-violet-500/20 hover:bg-violet-600 transition-all"
                      >
                        <Plus size={14} /> Adicionar
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-black/20">
                    {/* Add/Edit Task Form Modal */}
                    <AnimatePresence>
                      {(isAddingTask || taskToEdit) && (
                        <NovaAtividadeModal
                          initialLead={lead}
                          initialTask={taskToEdit}
                          onClose={() => { setIsAddingTask(false); setTaskToEdit(null); }}
                          onSave={() => {
                            setIsAddingTask(false);
                            setTaskToEdit(null);
                            onRefreshTasks();
                          }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Template Selector Modal */}
                    <AnimatePresence>
                      {isSelectingTemplate && (
                        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
                          <div className="absolute inset-0" onClick={() => setIsSelectingTemplate(false)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-[#1A1625] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xl w-full max-w-lg relative z-10"
                          >
                            <div className="flex items-center justify-between mb-6">
                              <h4 className="text-lg font-bold">Selecione um modelo:</h4>
                              <button onClick={() => setIsSelectingTemplate(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"><X size={20} /></button>
                            </div>
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                              {templates.map(tmp => (
                                <button
                                  key={tmp.id}
                                  onClick={() => { onApplyTemplate(tmp.id); setIsSelectingTemplate(false); }}
                                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl hover:border-violet-500 transition-all group"
                                >
                                  <div className="text-left">
                                    <p className="font-bold text-base text-slate-800 dark:text-slate-200 mb-1">{tmp.name}</p>
                                    <p className="text-sm text-gray-500">{tmp.description}</p>
                                  </div>
                                  <span className="bg-white dark:bg-white/5 px-2.5 py-1 rounded-md text-xs font-bold text-gray-500 border border-slate-200 dark:border-white/10 shadow-sm">
                                    {tmp.items?.length || 0} tarefas
                                  </span>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Task List */}
                    {tasks.length === 0 && !isAddingTask && !taskToEdit && !isSelectingTemplate ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <CheckSquare size={48} className="opacity-10 mb-3" />
                        <p className="text-sm">Nenhuma tarefa para este lead</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {[...tasks].sort((a, b) => {
                          if (a.completed === b.completed) {
                            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                          }
                          return a.completed ? 1 : -1;
                        }).map(task => (
                          <div 
                            key={task.id}
                            className={`group flex items-center gap-4 px-5 py-3.5 bg-white dark:bg-slate-800/60 border rounded-xl transition-all duration-200 ${
                              task.completed
                                ? 'border-slate-100 dark:border-white/5 opacity-55'
                                : 'border-slate-200/70 dark:border-white/10 hover:border-violet-300/60 dark:hover:border-violet-500/30 hover:shadow-md hover:shadow-violet-500/5'
                            }`}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => onUpdateTask(task.id, { completed: !task.completed, completed_at: !task.completed ? new Date().toISOString() : null })}
                              className="shrink-0 transition-transform hover:scale-110"
                            >
                              {task.completed
                                ? <CheckCircle2 size={20} className="text-violet-500" />
                                : <Circle size={20} className="text-slate-300 dark:text-slate-600 group-hover:text-violet-400 transition-colors" />
                              }
                            </button>

                            {/* Type Icon */}
                            <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5">
                              {task.type === 'WhatsApp' ? <MessageSquare size={15} className="text-slate-500 dark:text-slate-400" /> :
                               task.type === 'Ligação' ? <Phone size={15} className="text-slate-500 dark:text-slate-400" /> :
                               task.type === 'Email' ? <Mail size={15} className="text-slate-500 dark:text-slate-400" /> :
                               task.type === 'Reunião' ? <Users size={15} className="text-slate-500 dark:text-slate-400" /> :
                               task.type === 'Videochamada' ? <Video size={15} className="text-slate-500 dark:text-slate-400" /> :
                               <CheckSquare size={15} className="text-slate-500 dark:text-slate-400" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {task.start_time && (
                                  <span className="text-sm font-semibold text-slate-700 dark:text-white">
                                    {task.start_time.slice(0, 5)} -
                                  </span>
                                )}
                                <span className={`text-sm font-semibold ${task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                                  {task.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                {task.due_date && (
                                  <span className={`flex items-center gap-1 text-xs font-medium ${
                                    !task.completed && isPastDate(task.due_date) ? 'text-rose-500' : 'text-violet-500 dark:text-violet-400'
                                  }`}>
                                    <Calendar size={11} />
                                    {parseLocalDate(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}. {task.start_time ? task.start_time.slice(0, 5) : '00:00'}
                                  </span>
                                )}
                                {!task.completed && isPastDate(task.due_date) && (
                                  <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">Atrasada</span>
                                )}
                                {!task.completed && isToday(task.due_date) && (
                                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">Hoje</span>
                                )}
                                {!task.completed && isTomorrowDate(task.due_date) && (
                                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">Amanhã</span>
                                )}
                              </div>
                            </div>

                            {/* Actions + Type badge */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setTaskToEdit(task)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 transition-colors"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => onDeleteTask(task.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {task.type || 'Tarefa'}
                              </span>
                            </div>
                          </div>
                        ))}                      </div>
                    )}
                  </div>
                </>
              )}
              {activeTab === 'notas' && (
                <div className="p-6 space-y-4 flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                  <FileText size={32} className="mb-3 opacity-40" />
                  <p className="text-sm font-medium text-center">Bloco de notas em breve</p>
                </div>
              )}
              {activeTab === 'ligações' && (
                <div className="p-6 space-y-4 flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                  <Phone size={32} className="mb-3 opacity-40" />
                  <p className="text-sm font-medium text-center">Central de ligações em breve</p>
                </div>
              )}
              {activeTab === 'arquivos' && (
                <div className="p-6 space-y-4 flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
                  <Paperclip size={32} className="mb-3 opacity-40" />
                  <p className="text-sm font-medium text-center">Anexo de arquivos em breve</p>
                </div>
              )}
            </div>


          </div>

          {/* Right: lead info */}
          <div className="w-72 shrink-0 overflow-y-auto p-5 space-y-5">
            {/* Informações do negócio */}
            <div>
              <div 
                className="flex items-center justify-between cursor-pointer group mb-3"
                onClick={() => toggleSection('business')}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                  Informações do negócio
                </h4>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${sectionsOpen.business ? 'rotate-180' : ''}`} />
              </div>
              
              {sectionsOpen.business && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5 min-w-max">
                      <DollarSign size={13} /> Valor do negócio
                    </span>
                    <input 
                      type="number"
                      value={lead.valor}
                      onChange={(e) => onUpdateLeadField(lead.id, 'valor', Number(e.target.value))}
                      className="text-right text-sm font-bold text-emerald-500 bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-500/40 rounded px-1 -mr-1 w-full ml-4"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                      <ArrowRightLeft size={13} /> Etapa do funil
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{currentColumn?.title || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Users size={13} /> Responsável
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{responsavel?.name || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock size={13} /> Data de criação
                    </span>
                    <span className="text-sm text-gray-700 dark:text-slate-300">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5 min-w-max">
                      <Calendar size={13} /> Previsão
                    </span>
                    <input 
                      type="date"
                      value={((lead as any).previsao || '').split('T')[0]}
                      onChange={(e) => onUpdateLeadField(lead.id, 'previsao', e.target.value || null)}
                      className="text-sm font-bold text-gray-800 dark:text-slate-200 bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-500/40 rounded px-1 -mr-1"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock size={13} /> Na etapa
                    </span>
                    <span className="text-sm text-gray-700 dark:text-slate-300">
                      {(lead as any).etapa_updated_at 
                        ? Math.max(0, Math.floor((Date.now() - new Date((lead as any).etapa_updated_at).getTime()) / 86400000))
                        : 0} dias
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-gray-100 dark:bg-white/5" />

            {/* Etiquetas */}
            <div className="relative" ref={tagsRef}>
              <div 
                className="flex items-center justify-between cursor-pointer group mb-3"
                onClick={() => toggleSection('tags')}
              >
                <div className="flex flex-center gap-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 flex flex-center gap-1.5"><Tag size={13}/> Etiquetas</h4>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${sectionsOpen.tags ? 'rotate-180' : ''}`} />
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowTagMenu(!showTagMenu); setSectionsOpen(prev => ({...prev, tags: true})); }}
                  className="text-xs font-medium text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                >
                  Editar
                </button>
              </div>
              
              {sectionsOpen.tags && (
                <div className="flex flex-wrap gap-1.5">
                  {((lead as any).tags || []).length > 0 ? (lead as any).tags.map((tag: any) => (
                    <span key={tag.name} className="px-2 py-0.5 text-xs font-bold rounded-full text-white shadow-sm" style={{ backgroundColor: tag.color }}>
                      {tag.name}
                    </span>
                  )) : (
                    <span className="text-xs text-gray-400 dark:text-slate-500 italic">Sem etiquetas</span>
                  )}
                </div>
              )}

              {showTagMenu && sectionsOpen.tags && (
                <div className="absolute top-10 right-0 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-100 dark:border-white/5">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                      <input 
                        type="text" 
                        value={tagSearch}
                        onChange={e => setTagSearch(e.target.value)}
                        placeholder="Buscar etiqueta..." 
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/40"
                      />
                    </div>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto">
                    {/* Botão de adicionar nova (se não existe na busca) */}
                    {tagSearch.trim() !== '' && !tags.some((t:any) => t.name.toLowerCase() === tagSearch.toLowerCase()) && (
                      <div className="p-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                        <p className="text-xs text-slate-500 mb-2">Criar "{tagSearch}" com a cor:</p>
                        <div className="flex items-center gap-2">
                          {['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#ec4899', '#14b8a6'].map(colorHex => (
                            <button 
                              key={colorHex}
                              className="w-5 h-5 rounded-full hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-300 dark:focus:ring-offset-slate-800 border border-black/10 dark:border-white/10"
                              style={{ backgroundColor: colorHex }}
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/crm-comercial/tags', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name: tagSearch, color: colorHex })
                                  });
                                  if (res.ok) {
                                    onRefreshTags();
                                    const newTags = [...((lead as any).tags || []), { name: tagSearch, color: colorHex }];
                                    onUpdateLeadField(lead.id, 'tags', newTags);
                                    setTagSearch('');
                                  }
                                } catch (err) { console.error(err); }
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Lista das Globais */}
                    {tags.filter((t:any) => t.name.toLowerCase().includes(tagSearch.toLowerCase())).map((globalTag: any) => {
                      const isSelected = ((lead as any).tags || []).some((t:any) => t.name === globalTag.name);
                      return (
                        <div key={globalTag.name} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 group cursor-pointer"
                          onClick={() => {
                            let newTags;
                            if (isSelected) {
                              newTags = ((lead as any).tags || []).filter((t:any) => t.name !== globalTag.name);
                            } else {
                              newTags = [...((lead as any).tags || []), { name: globalTag.name, color: globalTag.color }];
                            }
                            onUpdateLeadField(lead.id, 'tags', newTags);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <CheckCircle2 size={15} className="text-emerald-500" />
                            ) : (
                              <Circle size={15} className="text-slate-300 dark:text-slate-600" />
                            )}
                            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{globalTag.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: globalTag.color }} />
                            <button
                              className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if(!window.confirm(`Excluir a etiqueta "${globalTag.name}" globalmente?`)) return;
                                try {
                                  const res = await fetch(`/api/crm-comercial/tags/${encodeURIComponent(globalTag.name)}`, { method: 'DELETE' });
                                  if (res.ok) {
                                    onRefreshTags();
                                    // Remove tag locally from lead as well
                                    if(isSelected) {
                                      const newTags = ((lead as any).tags || []).filter((t:any) => t.name !== globalTag.name);
                                      onUpdateLeadField(lead.id, 'tags', newTags);
                                    }
                                  }
                                } catch (err) { console.error(err); }
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  <button onClick={() => setShowTagMenu(false)} className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40 transition-colors">
                    Fechar
                  </button>
                </div>
              )}
            </div>

            <div className="h-px bg-gray-100 dark:bg-white/5" />

            {/* Informações do contato */}
            <div>
              <div 
                className="flex items-center justify-between cursor-pointer group mb-3"
                onClick={() => toggleSection('contact')}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                  Informações do contato
                </h4>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${sectionsOpen.contact ? 'rotate-180' : ''}`} />
              </div>

              {sectionsOpen.contact && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5 min-w-max">
                      <Users size={13} /> Nome
                    </span>
                    <input 
                      type="text"
                      value={lead.nome}
                      onChange={(e) => onUpdateLeadField(lead.id, 'nome', e.target.value)}
                      placeholder="Nome do contato"
                      className="text-right text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-500/40 rounded px-1 -mr-1 w-full ml-4"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5 min-w-max">
                      <Phone size={13} /> Telefone
                    </span>
                    <input 
                      type="text"
                      value={lead.telefone || ''}
                      onChange={(e) => onUpdateLeadField(lead.id, 'telefone', e.target.value)}
                      placeholder="Adicionar..."
                      className="text-right text-sm text-gray-700 dark:text-slate-300 bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-500/40 rounded px-1 -mr-1 w-full ml-4"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5 min-w-max">
                      <Flame size={13} /> Origem
                    </span>
                    <select 
                      value={lead.origem || 'Outro'}
                      onChange={(e) => onUpdateLeadField(lead.id, 'origem', e.target.value)}
                      className={`text-right text-sm font-semibold bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-500/40 rounded px-1 -mr-1 w-full ml-4 appearance-none cursor-pointer text-right [&>option]:text-left ${
                        lead.origem === 'Indicação' ? 'text-orange-500' :
                        lead.origem === 'Meta ads' ? 'text-blue-500' :
                        lead.origem === 'Google ads' ? 'text-amber-500' :
                        lead.origem === 'Youtube ads' ? 'text-red-500' :
                        lead.origem === 'Linkedin' ? 'text-sky-500' :
                        'text-gray-900 dark:text-white'
                      }`}
                    >
                      <option value="Indicação" className="font-semibold text-orange-500 bg-white dark:bg-slate-800">Indicação</option>
                      <option value="Meta ads" className="font-semibold text-blue-500 bg-white dark:bg-slate-800">Meta ads</option>
                      <option value="Google ads" className="font-semibold text-amber-500 bg-white dark:bg-slate-800">Google ads</option>
                      <option value="Youtube ads" className="font-semibold text-red-500 bg-white dark:bg-slate-800">Youtube ads</option>
                      <option value="Linkedin" className="font-semibold text-sky-500 bg-white dark:bg-slate-800">Linkedin</option>
                      <option value="Outro" className="font-semibold text-gray-900 dark:text-white bg-white dark:bg-slate-800">Outro</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5 min-w-max">
                      <Instagram size={13} /> Instagram
                    </span>
                    <input 
                      type="text"
                      value={lead.instagram || ''}
                      onChange={(e) => onUpdateLeadField(lead.id, 'instagram', e.target.value)}
                      placeholder="Adicionar..."
                      className="text-right text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-500/40 rounded px-1 -mr-1 w-full ml-4"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5 min-w-max">
                      <Briefcase size={13} /> Nicho
                    </span>
                    <input 
                      type="text"
                      value={lead.nicho || ''}
                      onChange={(e) => onUpdateLeadField(lead.id, 'nicho', e.target.value)}
                      placeholder="Adicionar..."
                      className="text-right text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-500/40 rounded px-1 -mr-1 w-full ml-4"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5 min-w-max">
                      <Award size={13} /> Tempo de OAB
                    </span>
                    <input 
                      type="text"
                      value={lead.tempo_oab || ''}
                      onChange={(e) => onUpdateLeadField(lead.id, 'tempo_oab', e.target.value)}
                      placeholder="Adicionar..."
                      className="text-right text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-500/40 rounded px-1 -mr-1 w-full ml-4"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5 min-w-max">
                      <DollarSign size={13} /> Faturamento
                    </span>
                    <input 
                      type="text"
                      value={lead.faturamento || ''}
                      onChange={(e) => onUpdateLeadField(lead.id, 'faturamento', e.target.value)}
                      placeholder="Adicionar..."
                      className="text-right text-sm font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-500/40 rounded px-1 -mr-1 w-full ml-4"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Observações */}
            {lead.observacoes && (
              <>
                <div className="h-px bg-gray-100 dark:bg-white/5" />
                <div>
                  <div 
                    className="flex items-center justify-between cursor-pointer group mb-3"
                    onClick={() => toggleSection('obs')}
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                      Observações
                    </h4>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${sectionsOpen.obs ? 'rotate-180' : ''}`} />
                  </div>
                  {sectionsOpen.obs && (
                    <textarea 
                      value={lead.observacoes}
                      onChange={(e) => onUpdateLeadField(lead.id, 'observacoes', e.target.value)}
                      placeholder="Adicionar..."
                      className="w-full text-sm text-gray-700 dark:text-slate-300 bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-500/40 rounded px-1 -mx-1 min-h-[60px] resize-none"
                    />
                  )}
                </div>
              </>
            )}

            <div className="h-px bg-gray-100 dark:bg-white/5" />

            {/* Informações da Reunião */}
            <div>
              <div 
                className="flex items-center justify-between cursor-pointer group mb-3"
                onClick={() => toggleSection('meeting')}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                  Informações da Reunião
                </h4>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${sectionsOpen.meeting ? 'rotate-180' : ''}`} />
              </div>
              
              {sectionsOpen.meeting && (
                <div className="space-y-3">
                  {[
                    { label: 'Data da reunião', field: 'reunion_date', type: 'date' },
                    { label: 'Local do escritório', field: 'office_location', type: 'text' },
                    { label: 'Nicho de atuação', field: 'reunion_niche', type: 'text' },
                    { label: 'Fechamentos mês', field: 'monthly_closings', type: 'text' },
                    { label: 'Meta de fechamentos', field: 'closing_goal', type: 'text' },
                    { label: 'Link da reunião', field: 'reunion_link', type: 'text' },
                  ].map(({ label, field, type }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500 dark:text-slate-400 shrink-0 min-w-max">{label}</span>
                      <input 
                        type={type}
                        value={(lead as any)[field] || ''}
                        onChange={(e) => onUpdateLeadField(lead.id, field, e.target.value)}
                        placeholder="Adicionar..."
                        title={label === 'Link da reunião' && (lead as any)[field] ? 'Clique duas vezes ou copie para abrir' : ''}
                        className="text-right text-xs font-medium text-gray-800 dark:text-slate-200 bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-500/40 rounded px-1 -mr-1 w-full ml-2 truncate"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px bg-gray-100 dark:bg-white/5" />

            {/* UTMs */}
            <div>
              <div 
                className="flex items-center justify-between cursor-pointer group mb-3"
                onClick={() => toggleSection('utms')}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">
                  UTMs
                </h4>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${sectionsOpen.utms ? 'rotate-180' : ''}`} />
              </div>

              {sectionsOpen.utms && (
                <div className="space-y-3">
                  {[
                    { label: 'Plataforma',     field: 'utm_platform' },
                    { label: 'Campanha',       field: 'utm_campaign' },
                    { label: 'Conjunto',       field: 'utm_set' },
                    { label: 'Criativo',       field: 'utm_creative' },
                    { label: 'Posicionamento', field: 'utm_position' },
                  ].map(({ label, field }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500 dark:text-slate-400 shrink-0 min-w-max">{label}</span>
                      <input 
                        type="text"
                        value={(lead as any)[field] || ''}
                        onChange={(e) => onUpdateLeadField(lead.id, field, e.target.value)}
                        placeholder="Adicionar..."
                        className="text-right text-xs font-medium text-gray-800 dark:text-slate-200 bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-500/40 rounded px-1 -mr-1 w-full ml-2 truncate"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const GerenciarKanbansModal = ({ isOpen, onClose, kanbans, columns, leads, onRename, onDelete }: any) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="fixed inset-0 modal-overlay" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gerenciar Kanbans</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {kanbans.map((kanban: any) => {
            const kanbanColumns = columns.filter((c:any) => c.kanban_id === kanban.id).length;
            const kanbanLeads = leads.filter((l:any) => l.kanban_id === kanban.id).length;
            const colorClass = kanban.cor ? `bg-${kanban.cor}-500/10 text-${kanban.cor}-500` : 'bg-gray-500/10 text-gray-500';
            const iconBg = kanban.cor ? `bg-${kanban.cor}-500` : 'bg-gray-500';

            return (
              <div key={kanban.id} className="border border-gray-100 dark:border-white/10 rounded-xl p-4 flex items-center justify-between bg-white dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg ${iconBg}`}>
                    {kanban.nome?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {editingId === kanban.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              onRename(kanban.id, editName);
                              setEditingId(null);
                            }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onBlur={() => {
                            onRename(kanban.id, editName);
                            setEditingId(null);
                          }}
                          autoFocus
                          className="bg-transparent border-b border-violet-500 outline-none text-base font-bold text-gray-900 dark:text-white pb-0.5 px-1 w-48"
                        />
                      ) : (
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {kanban.nome} {kanban.nome.toLowerCase().includes('comercial') && '🔥'}
                        </h3>
                      )}
                      
                      {kanban.is_default && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500 text-white leading-none">Padrão</span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-500 dark:text-slate-400">
                      {kanbanColumns} colunas • {kanbanLeads} tickets
                    </div>
                  </div>
                </div>

                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                      <MoreHorizontal size={18} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content align="end" sideOffset={5} className="min-w-[180px] bg-white dark:bg-slate-800 border border-gray-100 dark:border-white/10 rounded-xl shadow-xl p-2 z-[1100]">
                      <DropdownMenu.Item className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer outline-none transition-colors opacity-50 cursor-not-allowed">
                        <Copy size={15} />
                        Criar cópia
                      </DropdownMenu.Item>
                      <DropdownMenu.Item 
                        onClick={() => { setEditingId(kanban.id); setEditName(kanban.nome || ''); }}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer outline-none transition-colors"
                      >
                        <Edit2 size={15} />
                        Renomear
                      </DropdownMenu.Item>
                      <DropdownMenu.Item className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer outline-none transition-colors opacity-50 cursor-not-allowed">
                        <Users size={15} />
                        Gerenciar permissões
                      </DropdownMenu.Item>
                      
                      {!kanban.is_default && (
                        <>
                          <DropdownMenu.Separator className="h-px bg-gray-100 dark:bg-white/10 my-1" />
                          <DropdownMenu.Item 
                            onClick={() => onDelete(kanban.id)}
                            className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer outline-none transition-colors"
                          >
                            <Trash2 size={15} />
                            Deletar
                          </DropdownMenu.Item>
                        </>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CrmComercial = () => {
  const { user } = useAuth();
  const kanbanBoardRef = useRef<HTMLDivElement>(null);
  const [celebrationDetails, setCelebrationDetails] = useState<{gif: string, value: number, name: string} | null>(null);

  // --- Api4Com + Softphone state ---
  const [api4comSettings, setApi4comSettings] = useState<{configured: boolean, sip_extension?: string} | null>(null);
  const [isTelefonySettingsOpen, setIsTelefonySettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ api4com_token: '', api4com_domain: '', sip_extension: '', sip_password: '', sip_server: '' });
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'telefonia' | 'webhook' | 'sequencias' | 'motivos-perda'>('telefonia');
  // Loss Reasons state
  const [lossReasons, setLossReasons] = useState<{id: number, name: string, description: string | null, color: string}[]>([]);
  const [newLossReason, setNewLossReason] = useState({ name: '', description: '', color: '#6b7280' });
  const [savingLossReason, setSavingLossReason] = useState(false);
  const [editingLossReason, setEditingLossReason] = useState<number | null>(null);
  const [editLossReasonForm, setEditLossReasonForm] = useState({ name: '', description: '', color: '' });
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);
  const [softphoneCall, setSoftphoneCall] = useState<{leadId: string, leadName: string, phone: string, status: 'connecting' | 'active' | 'error', errorMsg?: string, startedAt?: number} | null>(null);
  const [callElapsed, setCallElapsed] = useState(0);
  // JsSIP Softphone hook
  const softphone = useSoftphone();
  // --- End Api4Com state ---

  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [kanbans, setKanbans] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [allKanbanTasks, setAllKanbanTasks] = useState<CrmTask[]>([]);
  const [activeKanbanId, setActiveKanbanId] = useState<string | null>(() => {
    return localStorage.getItem('activeKanbanId') || null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    nome: '',
    telefone: '',
    origem: 'Outro',
    responsavel_id: '',
    valor: '',
    observacoes: '',
    coluna: ''
  });
  const [isNewKanbanModalOpen, setIsNewKanbanModalOpen] = useState(false);
  const [showWonLeads, setShowWonLeads] = useState(true);
  const [showLostLeads, setShowLostLeads] = useState(true);
  const [newKanbanData, setNewKanbanData] = useState({
    nome: '',
    descricao: '',
    cor: 'blue'
  });
  const [isNewColumnModalOpen, setIsNewColumnModalOpen] = useState(false);
  const [newColumnData, setNewColumnData] = useState({
    title: '',
    color: 'orange',
    icon: 'LayoutGrid'
  });
  
  const [isEditColumnModalOpen, setIsEditColumnModalOpen] = useState(false);
  const [editColumnData, setEditColumnData] = useState<{ id: string, title: string, color: string, icon: string } | null>(null);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

  const handleUpdateColumn = async () => {
    if (!editColumnData?.title.trim()) return;
    try {
      const res = await fetch(`/api/crm-comercial/columns/${editColumnData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editColumnData.title,
          color: editColumnData.color,
          icon: editColumnData.icon
        })
      });
      if (res.ok) {
        const updatedColumn = await res.json();
        setColumns(cols => cols.map(c => c.id === updatedColumn.id ? updatedColumn : c));
        setIsEditColumnModalOpen(false);
        setEditColumnData(null);
      }
    } catch (err) {
      console.error('Error updating column:', err);
    }
  };

  const handleDeleteColumn = async (id: string) => {
    try {
      const res = await fetch(`/api/crm-comercial/columns/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setColumns(cols => cols.filter(c => c.id !== id));
        setColumnToDelete(null);
      } else {
        alert("Erro ao excluir coluna");
      }
    } catch (err) {
      console.error('Error deleting column:', err);
    }
  };

  const KANBAN_COLORS = [
    { id: 'blue', class: 'bg-blue-500' },
    { id: 'green', class: 'bg-emerald-500' },
    { id: 'pink', class: 'bg-pink-500' },
    { id: 'orange', class: 'bg-orange-500' },
    { id: 'yellow', class: 'bg-yellow-500' },
    { id: 'indigo', class: 'bg-indigo-500' },
    { id: 'violet', class: 'bg-violet-500' }
  ];

  const handleCreateKanban = async () => {
    try {
      const res = await fetch('/api/crm-comercial/kanbans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKanbanData)
      });
      if (res.ok) {
        const newKanban = await res.json();
        setKanbans([...kanbans, newKanban]);
        setActiveKanbanId(newKanban.id);
        setIsNewKanbanModalOpen(false);
        setNewKanbanData({ nome: '', descricao: '', cor: 'blue' });
      }
    } catch (err) {
      console.error('Error creating kanban:', err);
    }
  };

  const handleDeleteKanban = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este Kanban e todos os seus leads?")) return;
    try {
      const res = await fetch(`/api/crm-comercial/kanbans/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updatedKanbans = kanbans.filter(k => k.id !== id);
        setKanbans(updatedKanbans);
        if (activeKanbanId === id) {
          setActiveKanbanId(updatedKanbans[0]?.id || null);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir kanban");
      }
    } catch (err) {
      console.error('Error deleting kanban:', err);
    }
  };

  const [isManageKanbansOpen, setIsManageKanbansOpen] = useState(false);
  const handleRenameKanban = async (id: string, newName: string) => {
    try {
      const res = await fetch(`/api/crm-comercial/kanbans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: newName })
      });
      if (res.ok) {
        setKanbans(kanbans.map(k => k.id === id ? { ...k, nome: newName } : k));
      }
    } catch (err) {
      console.error('Error renaming kanban:', err);
    }
  };
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLeadForComments, setSelectedLeadForComments] = useState<Lead | null>(null);
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<Lead | null>(null);
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<Lead | null>(null);
  const [isManageTemplatesOpen, setIsManageTemplatesOpen] = useState(false);
  const [templateEditor, setTemplateEditor] = useState<{
    mode: 'list' | 'edit' | 'create';
    template: CrmTaskTemplate | null;
    form: { name: string; description: string; items: any[] };
  }>({
    mode: 'list',
    template: null,
    form: { name: '', description: '', items: [] }
  });
  const [comments, setComments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [templates, setTemplates] = useState<CrmTaskTemplate[]>([]);
  const [newComment, setNewComment] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchKanbans = async () => {
    try {
      const res = await fetch('/api/crm-comercial/kanbans');
      if (res.ok) {
        const data = await res.json();
        setKanbans(data);
        
        // If no active kanban or active kanban not in list, set to first
        const currentActive = localStorage.getItem('activeKanbanId');
        if (data.length > 0 && (!currentActive || !data.find((k: any) => k.id === currentActive))) {
          setActiveKanbanId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching kanbans:', err);
    }
  };

  const fetchData = async () => {
    if (!activeKanbanId) return;
    try {
      const [leadsRes, usersRes, columnsRes, tagsRes, tasksRes] = await Promise.all([
        fetch(`/api/crm-comercial/leads?kanban_id=${activeKanbanId}`),
        fetch('/api/users'),
        fetch(`/api/crm-comercial/columns?kanban_id=${activeKanbanId}`),
        fetch('/api/crm-comercial/tags'),
        fetch(`/api/crm-comercial/kanbans/${activeKanbanId}/tasks`)
      ]);
      
      if (leadsRes.ok) {
        const data = await leadsRes.json();
        setLeads(data);
      }
      
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data);
      }

      if (columnsRes.ok) {
        const data = await columnsRes.json();
        setColumns(data);
      }
      
      if (tagsRes.ok) {
        const data = await tagsRes.json();
        setTags(data);
      }

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setAllKanbanTasks(data);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };


  useEffect(() => {
    fetchKanbans();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (user?.email) {
      fetchData();
      // Fetch Api4Com settings when user is known
      fetch(`/api/api4com/settings?user_id=${encodeURIComponent(user.email)}`)
        .then(r => r.json())
        .then(data => {
          setApi4comSettings(data);
          if (data.configured || data.api4com_token) {
            const form = {
              api4com_token: data.api4com_token || '',
              api4com_domain: data.api4com_domain || '',
              sip_extension: data.sip_extension || '',
              sip_password: data.sip_password || '',
              sip_server: data.sip_server || ''
            };
            setSettingsForm(form);

            // 🔑 Try to auto-register using credentials stored in sessionStorage
            // (saved there after the last successful manual save)
            try {
              const stored = sessionStorage.getItem('softphone_creds');
              if (stored) {
                const creds = JSON.parse(stored);
                if (creds.extension && creds.password && creds.domain) {
                  console.log('[Softphone] Auto-registering from sessionStorage...');
                  softphone.register({
                    extension: creds.extension,
                    password: creds.password,
                    domain: creds.domain,
                    sipServer: creds.sipServer || `wss://${creds.domain}`
                  });
                }
              }
            } catch (e) { /* sessionStorage may be unavailable */ }
          }
        })
        .catch(() => setApi4comSettings({ configured: false }));
    }
  }, [user?.email, activeKanbanId]);

  // Register SIP UA whenever form has valid SIP creds
  const prevSipKeyRef = useRef('');
  useEffect(() => {
    const { sip_extension, sip_password, sip_server, api4com_domain } = settingsForm;
    const key = `${sip_extension}|${sip_password}|${api4com_domain}`;
    if (sip_extension && sip_password && api4com_domain) {
      if (prevSipKeyRef.current !== key) {
        prevSipKeyRef.current = key;
        const sipServer = sip_server
          ? (sip_server.startsWith('wss://') ? sip_server : `wss://${sip_server}`)
          : `wss://${api4com_domain}`;
        softphone.register({ extension: sip_extension, password: sip_password, domain: api4com_domain, sipServer });
      }
    }
  }, [settingsForm.sip_extension, settingsForm.sip_password, settingsForm.sip_server, settingsForm.api4com_domain]);

  // Elapsed call timer
  useEffect(() => {
    if (softphoneCall?.status === 'active' && softphoneCall.startedAt) {
      setCallElapsed(0);
      const interval = setInterval(() => {
        setCallElapsed(Math.floor((Date.now() - softphoneCall.startedAt!) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [softphoneCall?.status, softphoneCall?.startedAt]);

  const formatCallTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  useEffect(() => {
    if (selectedLeadForDetails) {
      fetchComments(selectedLeadForDetails.id);
      fetchHistory(selectedLeadForDetails.id);
      fetchTasks(selectedLeadForDetails.id);
    } else {
      // Clear data when modal closes
      setTasks([]);
      setHistory([]);
      setComments([]);
    }
  }, [selectedLeadForDetails]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/crm-comercial/task-templates');
      if (res.ok) setTemplates(await res.json());
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const fetchTasks = async (leadId: string) => {
    try {
      const res = await fetch(`/api/crm-comercial/leads/${leadId}/tasks`);
      if (res.ok) setTasks(await res.json());
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const handleAddTask = async (taskData: Partial<CrmTask>) => {
    if (!selectedLeadForDetails) return;
    try {
      const res = await fetch(`/api/crm-comercial/leads/${selectedLeadForDetails.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskData, user_name: user?.name || 'Sistema' })
      });
      if (res.ok) {
        fetchTasks(selectedLeadForDetails.id);
        fetchHistory(selectedLeadForDetails.id);
      }
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const handleUpdateTask = async (id: number, updates: Partial<CrmTask>) => {
    try {
      const res = await fetch(`/api/crm-comercial/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, user_name: user?.name || 'Sistema' })
      });
      if (res.ok && selectedLeadForDetails) {
        fetchTasks(selectedLeadForDetails.id);
        fetchHistory(selectedLeadForDetails.id);
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      const res = await fetch(`/api/crm-comercial/tasks/${id}`, { method: 'DELETE' });
      if (res.ok && selectedLeadForDetails) {
        fetchTasks(selectedLeadForDetails.id);
        fetchHistory(selectedLeadForDetails.id);
        // Atualiza as tarefas dos cards
        if (activeKanbanId) {
          fetch(`/api/crm-comercial/kanbans/${activeKanbanId}/tasks`)
            .then(r => r.json())
            .then(data => setAllKanbanTasks(data))
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleApplyTemplate = async (templateId: number) => {
    if (!selectedLeadForDetails) return;
    try {
      const res = await fetch(`/api/crm-comercial/leads/${selectedLeadForDetails.id}/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId })
      });
      if (res.ok) {
        fetchTasks(selectedLeadForDetails.id);
        fetchHistory(selectedLeadForDetails.id);
      }
    } catch (err) {
      console.error('Error applying template:', err);
    }
  };

  const handleUpdateLeadField = async (leadId: string, field: string, value: any) => {
    try {
      const res = await fetch(`/api/crm-comercial/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, [field]: value } : l));
        if (selectedLeadForDetails?.id === leadId) {
          setSelectedLeadForDetails(prev => prev ? { ...prev, [field]: value } : prev);
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar campo do lead:', err);
    }
  };

  // Template CRUD handlers
  const handleCreateTemplate = async (data: { name: string; description: string; items: any[] }) => {
    try {
      const res = await fetch('/api/crm-comercial/task-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) fetchTemplates();
    } catch (err) {
      console.error('Error creating template:', err);
    }
  };

  const handleUpdateTemplate = async (id: number, data: { name: string; description: string; items: any[] }) => {
    try {
      const res = await fetch(`/api/crm-comercial/task-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) fetchTemplates();
    } catch (err) {
      console.error('Error updating template:', err);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!window.confirm("Excluir este modelo?")) return;
    try {
      const res = await fetch(`/api/crm-comercial/task-templates/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.nome.toLowerCase().includes(lowerQuery) || 
        (l.telefone && l.telefone.toLowerCase().includes(lowerQuery))
      );
    }
    
    if (!showWonLeads) {
      result = result.filter(l => !isWonColumn(columns.find(c => c.id === l.coluna)?.title));
    }
    
    if (!showLostLeads) {
      result = result.filter(l => !isLostColumn(columns.find(c => c.id === l.coluna)?.title));
    }
    
    return result;
  }, [leads, searchQuery, showWonLeads, showLostLeads, columns]);

  const fetchComments = async (leadId: string) => {
    try {
      const res = await fetch(`/api/crm-comercial/comments?lead_id=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const fetchHistory = async (leadId: string) => {
    try {
      const res = await fetch(`/api/crm-comercial/history?lead_id=${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedLeadForComments) return;
    try {
      const res = await fetch('/api/crm-comercial/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLeadForComments.id,
          user_id: user?.id || 'system',
          user_name: user?.name || 'Sistema',
          user_avatar: user?.avatar || '',
          content: newComment,
          is_internal: false
        })
      });
      if (res.ok) {
        setNewComment('');
        fetchComments(selectedLeadForComments.id);
        fetchData(); // Refresh comment count
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`/api/crm-comercial/comments/${commentId}`, {
        method: 'DELETE'
      });
      if (res.ok && selectedLeadForComments) {
        fetchComments(selectedLeadForComments.id);
        fetchData(); // Refresh comment count
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const originalColumnRef = useRef<string | null>(null);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
    const lead = leads.find(l => l.id === event.active.id);
    if (lead) {
      originalColumnRef.current = lead.coluna;
    }
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveLead = active.data.current?.type === 'Lead';
    const isOverLead = over.data.current?.type === 'Lead';
    const isOverColumn = columns.some(c => c.id === overId);

    if (!isActiveLead) return;

    setLeads((prev) => {
      const activeIndex = prev.findIndex((l) => l.id === activeId);
      const overIndex = prev.findIndex((l) => l.id === overId);

      if (activeIndex === -1) return prev;

      let newLeads = [...prev];

      if (isOverLead && overIndex !== -1 && prev[overIndex].coluna && prev[activeIndex].coluna !== prev[overIndex].coluna) {
        newLeads[activeIndex].coluna = prev[overIndex].coluna;
        return arrayMove(newLeads, activeIndex, overIndex);
      }

      if (isOverColumn && prev[activeIndex].coluna !== overId) {
        newLeads[activeIndex].coluna = overId;
        return arrayMove(newLeads, activeIndex, newLeads.length - 1);
      }

      return prev;
    });
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id;
    const overId = over.id;

    // Calcula a nova coluna com segurança, antes do setLeads para evitar problemas de escopo fechado
    let newColumn = originalColumnRef.current || '';
    if (columns.some(c => c.id === overId)) {
      newColumn = overId;
    } else {
      const overLead = leads.find(l => l.id === overId);
      if (overLead && overLead.coluna) {
        newColumn = overLead.coluna;
      }
    }

    if (!newColumn) {
      fetchData(); // Previne corromper o banco e dá refresh caso caia num erro
      return;
    }
    
    setLeads(prev => {
      const activeIndex = prev.findIndex(l => l.id === leadId);
      const overIndex = prev.findIndex(l => l.id === overId);
      
      if (activeIndex === -1) return prev;
      
      let newLeads = [...prev];
      newLeads[activeIndex] = { ...newLeads[activeIndex], coluna: newColumn };
      
      if (overIndex !== -1 && activeIndex !== overIndex) {
         newLeads = arrayMove(newLeads, activeIndex, overIndex);
      }

      return newLeads;
    });

    if (originalColumnRef.current !== newColumn) {
      try {
        await fetch(`/api/crm-comercial/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            coluna: newColumn,
            moved_by: user?.name || 'Sistema'
          })
        });
      } catch (err) {
        console.error('Error moving lead:', err);
        fetchData(); // Revert on error
      }
    }
  };

  const handleMoveLead = async (leadId: string, newColumn: string) => {
    console.log(`Moving lead ${leadId} to ${newColumn}`);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, coluna: newColumn } : l));
    try {
      const response = await fetch(`/api/crm-comercial/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          coluna: newColumn,
          moved_by: user?.name || 'Sistema'
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      console.error('Error moving lead:', err);
      fetchData();
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    setLeads(prev => prev.filter(l => l.id !== leadId));
    try {
      await fetch(`/api/crm-comercial/leads/${leadId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Error deleting lead:', err);
      fetchData();
    }
  };

  const handleWinLead = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    
    // 1. Inicia os confetes mais longos e intensos
    const duration = 8 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 40, spread: 360, ticks: 100, zIndex: 100000, colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#d8b4fe', '#10b981'] };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 80 * (timeLeft / duration);
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.1, 0.4), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.6, 0.9), y: Math.random() - 0.2 }
      });
    }, 200);

    // 2. Seleciona o GIF aleatório (agora cobrindo do 1.gif ao 15.gif) e abre o popup com os dados do lead
    const randomGifNum = Math.floor(Math.random() * 15) + 1;
    setCelebrationDetails({
      gif: `/gifs/${randomGifNum}.gif`,
      value: lead?.valor || 0,
      name: lead?.nome || ''
    });
    
    setTimeout(() => {
      setCelebrationDetails(null);
    }, duration);

    // 3. Efetiva a movimentação de coluna para Fechado/Ganho
    await handleMoveLead(leadId, columns.find(c => c.title?.toLowerCase().includes('ganho') || c.title?.toLowerCase().includes('fechado'))?.id || columns[columns.length - 1]?.id || '');
  };

  const handleCallLead = async (leadId: string, phone: string, leadName?: string) => {
    if (!user?.email) return;
    setCallingLeadId(leadId);

    // If WebRTC softphone is registered, use it directly
    if (softphone.sipStatus === 'registered') {
      softphone.makeCall(phone, leadName || phone);
      setCallingLeadId(null);
      return;
    }

    // Otherwise, use the Api4Com Dialer API (click-to-call via extension)
    if (!api4comSettings?.configured) {
      setSoftphoneCall({
        leadId, leadName: leadName || phone, phone,
        status: 'error',
        errorMsg: 'Configure a telefonia primeiro (⚙ ícone no cabeçalho)'
      });
      setCallingLeadId(null);
      return;
    }

    // Show "dialing" popup immediately
    setSoftphoneCall({
      leadId, leadName: leadName || phone, phone,
      status: 'active',
      startedAt: Date.now(),
      errorMsg: undefined
    });

    try {
      const res = await fetch('/api/api4com/call/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.email, phone, lead_id: leadId, user_name: user.name || user.email })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSoftphoneCall(prev => prev ? {
          ...prev, status: 'error',
          errorMsg: data.error || data.details?.message || 'Falha ao iniciar chamada via ramal'
        } : null);
      } else {
        // Success — keep showing the popup (user will answer their extension)
        setSoftphoneCall(prev => prev ? { ...prev, status: 'active', dialerCallId: data.call_id } : null);
      }
    } catch (e: any) {
      setSoftphoneCall(prev => prev ? {
        ...prev, status: 'error',
        errorMsg: 'Erro de conexão com o servidor de telefonia'
      } : null);
    }

    setCallingLeadId(null);
  };

  const handleTestApi4ComConnection = async () => {
    if (!user?.email) return;
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/api4com/test-connection?user_id=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: 'Erro de rede' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveApi4ComSettings = async () => {
    if (!user?.email) return;
    setSavingSettings(true);
    try {
      const res = await fetch('/api/api4com/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.email, ...settingsForm })
      });
      if (res.ok) {
        setApi4comSettings({ configured: !!(settingsForm.api4com_token && settingsForm.sip_extension) });
        setSettingsSaved(true);
        // ✅ Register SIP immediately with the current form credentials
        if (settingsForm.sip_extension && settingsForm.sip_password && settingsForm.api4com_domain) {
          const sipServer = settingsForm.sip_server
            ? (settingsForm.sip_server.startsWith('wss://') ? settingsForm.sip_server : `wss://${settingsForm.sip_server}`)
            : `wss://${settingsForm.api4com_domain}`;
          softphone.register({
            extension: settingsForm.sip_extension,
            password: settingsForm.sip_password,
            domain: settingsForm.api4com_domain,
            sipServer
          });
        }
        setTimeout(() => { setSettingsSaved(false); setIsTelefonySettingsOpen(false); }, 2000);
      }
    } catch {
      alert('Erro ao salvar configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchLossReasons = async () => {
    try {
      const res = await fetch('/api/crm-comercial/loss-reasons');
      if (res.ok) setLossReasons(await res.json());
    } catch {}
  };

  const handleCreateLossReason = async () => {
    if (!newLossReason.name.trim()) return;
    setSavingLossReason(true);
    try {
      const res = await fetch('/api/crm-comercial/loss-reasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLossReason),
      });
      if (res.ok) {
        setNewLossReason({ name: '', description: '', color: '#6b7280' });
        fetchLossReasons();
      }
    } catch {} finally {
      setSavingLossReason(false);
    }
  };

  const handleDeleteLossReason = async (id: number) => {
    try {
      await fetch(`/api/crm-comercial/loss-reasons/${id}`, { method: 'DELETE' });
      setLossReasons(prev => prev.filter(r => r.id !== id));
    } catch {}
  };

  const handleUpdateLossReason = async (id: number) => {
    try {
      const res = await fetch(`/api/crm-comercial/loss-reasons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editLossReasonForm),
      });
      if (res.ok) { setEditingLossReason(null); fetchLossReasons(); }
    } catch {}
  };

  const handleLoseLead = async (leadId: string) => {
    await handleMoveLead(leadId, columns.find(c => c.title?.toLowerCase().includes('perd') || c.title?.toLowerCase().includes('descart'))?.id || columns[0]?.id || '');
  };

  const handleMoveToKanban = async (leadId: string, kanbanId: string) => {
    // Compare as strings to avoid type mismatch
    if (String(kanbanId) === String(activeKanbanId)) {
      console.log('[MoveKanban] Already in this kanban, skipping.');
      return;
    }
    console.log(`[MoveKanban] Moving lead ${leadId} to kanban ${kanbanId}`);
    setLeads(prev => prev.filter(l => l.id !== leadId));
    try {
      const response = await fetch(`/api/crm-comercial/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kanban_id: kanbanId, moved_by: user?.name || 'Sistema' })
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('[MoveKanban] API error:', data);
        fetchData(); // Revert
      } else {
        console.log('[MoveKanban] Success:', data);
      }
    } catch (err) {
      console.error('[MoveKanban] Network error:', err);
      fetchData();
    }
  };

  const handleEditValue = async (leadId: string, newValue: number) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, valor: newValue } : l));
    try {
      await fetch(`/api/crm-comercial/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valor: newValue })
      });
    } catch (err) {
      console.error('Error updating value:', err);
      fetchData();
    }
  };

  const handleCreateLead = async () => {
    if (!newLeadData.nome || !activeKanbanId) return;
    
    try {
      const res = await fetch('/api/crm-comercial/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLeadData,
          valor: Number(newLeadData.valor) || 0,
          kanban_id: activeKanbanId,
          coluna: newLeadData.coluna || columns[0]?.id || 'follow_up_1'
        })
      });
      
      if (res.ok) {
        setIsNewLeadModalOpen(false);
        setNewLeadData({ nome: '', telefone: '', origem: 'Outro', responsavel_id: '', valor: '', observacoes: '', coluna: '' });
        fetchData();
      }
    } catch (err) {
      console.error('Error creating lead:', err);
    }
  };

  const handleCreateColumn = async () => {
    if (!newColumnData.title || !activeKanbanId) return;
    
    try {
      const res = await fetch('/api/crm-comercial/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newColumnData,
          kanban_id: activeKanbanId,
          order_index: columns.length
        })
      });
      
      if (res.ok) {
        setIsNewColumnModalOpen(false);
        setNewColumnData({ title: '', color: 'orange' });
        fetchData();
      }
    } catch (err) {
      console.error('Error creating column:', err);
    }
  };

  return (
    <div className="p-8 w-full min-h-screen flex flex-col">
      <PageHeader 
        title="CRM" 
        titleAccent={kanbans.find(k => k.id === activeKanbanId)?.nome || 'Comercial'} 
        subtitle="Gestão de leads e negociações"
      >
        <div className="flex items-center gap-3">

          {/* ⚙ Gear icon — Telephony Settings + SIP Status */}
          <button
            id="btn-telefonia-settings"
            title={`Configurações de Telefonia — Ramal: ${
              softphone.sipStatus === 'registered' ? '✓ Registrado' :
              softphone.sipStatus === 'connecting' ? 'Conectando...' :
              softphone.sipStatus === 'error' ? '✗ Falha no registro' : 'Não conectado'
            }`}
            onClick={() => { setTestResult(null); setSettingsTab('telefonia'); fetchLossReasons(); setIsTelefonySettingsOpen(true); }}
            className="relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition-all"
            style={{ borderColor: '#2d2b3d', color: '#9ca3af' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1c1a27'; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; }}
          >
            <Settings size={16} />
            {/* SIP status dot */}
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border" style={{
              borderColor: '#0d0b14',
              background: softphone.sipStatus === 'registered' ? '#22c55e' :
                          softphone.sipStatus === 'connecting' ? '#f59e0b' :
                          softphone.sipStatus === 'error' ? '#ef4444' : '#374151'
            }} />
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <LayoutGrid size={16} />
                {kanbans.find(k => k.id === activeKanbanId)?.nome || 'Carregando...'}
                <span className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white px-1.5 py-0.5 rounded text-xs ml-1">{leads.length}</span>
                <ChevronDown size={16} className="text-gray-500 dark:text-slate-400" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-xl p-2 min-w-[280px] shadow-xl z-50">
                {kanbans.map(kanban => (
                  <DropdownMenu.Item 
                    key={kanban.id}
                    onClick={() => setActiveKanbanId(kanban.id)}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer outline-none group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${KANBAN_COLORS.find(c => c.id === kanban.cor)?.class || 'bg-violet-500'} flex items-center justify-center text-white font-bold text-xs uppercase`}>
                        {kanban.nome.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {kanban.nome}
                          {kanban.is_default && <span className="bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 text-[10px] px-1.5 py-0.5 rounded">Padrão</span>}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-slate-400">{columns.length} colunas</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">

                      {activeKanbanId === kanban.id && <Check size={16} className="text-violet-500" />}
                    </div>
                  </DropdownMenu.Item>
                ))}
                <DropdownMenu.Separator className="h-px bg-gray-200 dark:bg-white/10 my-2" />
                <DropdownMenu.Item 
                  onClick={() => setIsNewKanbanModalOpen(true)}
                  className="flex items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer text-violet-600 dark:text-violet-400 font-bold text-sm outline-none"
                >
                  <Plus size={16} />
                  Novo Kanban
                </DropdownMenu.Item>
                <DropdownMenu.Item 
                  onClick={() => setIsManageKanbansOpen(true)}
                  className="flex items-center gap-2 p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer text-gray-600 dark:text-slate-300 font-bold text-sm outline-none"
                >
                  <Settings size={16} />
                  Gerenciar Kanbans
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          
          <button 
            onClick={() => setIsNewColumnModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <Plus size={16} />
            Nova Coluna
          </button>
          
          <button 
            onClick={() => setIsNewLeadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            <Plus size={16} />
            Novo Lead
          </button>
        </div>
      </PageHeader>

      <div className="flex items-center gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Buscar tickets..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          <Filter size={16} />
          Filtros
        </button>

        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          Selecionar
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="p-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="m-2 min-w-[200px] bg-white dark:bg-[#1A1625] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 p-2 z-[100]" align="end">
              <DropdownMenu.Item 
                onClick={() => setShowWonLeads(!showWonLeads)}
                className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer text-gray-700 dark:text-slate-300 font-medium text-sm outline-none"
              >
                {showWonLeads ? <Eye size={14} className="text-gray-400" /> : <EyeOff size={14} className="text-gray-400" />}
                Mostrar ganhos
              </DropdownMenu.Item>
              <DropdownMenu.Item 
                onClick={() => setShowLostLeads(!showLostLeads)}
                className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer text-gray-700 dark:text-slate-300 font-medium text-sm outline-none"
              >
                {showLostLeads ? <Eye size={14} className="text-gray-400" /> : <EyeOff size={14} className="text-gray-400" />}
                Mostrar perdidos
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-white/5 rounded-full px-4 py-1.5">
          <button 
            onClick={() => kanbanBoardRef.current?.scrollBy({ left: -340, behavior: 'smooth' })}
            className="p-1 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronRight size={14} className="rotate-180" />
          </button>
          <span className="text-xs text-gray-500 dark:text-slate-400">Navegue pelas colunas</span>
          <button 
            onClick={() => kanbanBoardRef.current?.scrollBy({ left: 340, behavior: 'smooth' })}
            className="p-1 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div ref={kanbanBoardRef} className="flex overflow-x-auto pb-4 gap-6 items-stretch snap-x flex-1 scroll-smooth">
          {columns.map(column => {
            const columnLeads = filteredLeads.filter(l => l.coluna === column.id);
            const totalValue = columnLeads.reduce((acc, l) => acc + Number(l.valor || 0), 0);
            
            return (
              <div key={column.id} className="flex flex-col flex-1 min-h-[500px] min-w-[320px] w-[320px] snap-start bg-slate-50/50 dark:bg-white/[0.02] rounded-3xl border border-gray-200 dark:border-white/5 p-2">
                <div className="p-3 flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      column.color === 'orange' ? 'bg-orange-500' :
                      column.color === 'blue' ? 'bg-blue-500' :
                      column.color === 'green' ? 'bg-emerald-500' :
                      column.color === 'pink' ? 'bg-pink-500' :
                      column.color === 'red' ? 'bg-red-500' :
                      column.color === 'cyan' ? 'bg-cyan-500' : 'bg-slate-500'
                    }`}>
                      <RenderIcon name={column.icon || 'LayoutGrid'} size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight">{column.title}</h3>
                      <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{columnLeads.length} tickets</p>
                      <div className="mt-1 text-sm font-black text-emerald-500">
                        {formatCurrency(totalValue)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        setEditColumnData({ id: column.id, title: column.title, color: column.color || 'orange', icon: column.icon || 'LayoutGrid' });
                        setIsEditColumnModalOpen(true);
                      }}
                      className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                    </button>
                    <button 
                      onClick={() => setColumnToDelete(column.id)}
                      className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <DroppableColumn id={column.id}>
                  <SortableContext 
                    id={column.id}
                    items={columnLeads.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex flex-col gap-3 min-h-[100px] flex-1">
                      {columnLeads.length === 0 ? (
                        <div className="flex-1 border border-dashed border-gray-300 dark:border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 p-8">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                          </svg>
                          <p className="font-medium text-sm">Arraste tickets para cá</p>
                          <p className="text-xs opacity-50 mt-1">Solte aqui para adicionar</p>
                        </div>
                      ) : (
                        <>
                          {columnLeads.map(lead => (
                            <SortableCard 
                              key={lead.id} 
                              lead={lead} 
                              users={users}
                              columns={columns}
                              tasks={allKanbanTasks}
                              onClick={() => {
                                setSelectedLeadForDetails(lead);
                                fetchComments(lead.id);
                                fetchHistory(lead.id);
                              }}
                              onMove={handleMoveLead}
                              onDelete={handleDeleteLead}
                              onEditValue={handleEditValue}
                              onHistory={() => {
                                setSelectedLeadForHistory(lead);
                                fetchHistory(lead.id);
                              }}
                            />
                          ))}
                          <div className="border border-dashed border-gray-300 dark:border-white/10 rounded-xl p-4 text-center text-xs text-gray-500 dark:text-slate-500 mt-2">
                            Solte aqui para adicionar
                          </div>
                        </>
                      )}
                    </div>
                  </SortableContext>
                </DroppableColumn>
              </div>
            );
          })}
        </div>
        
        <DragOverlay>
          {activeId ? (
            <SortableCard 
              lead={leads.find(l => l.id === activeId)!} 
              users={users}
              columns={columns}
              tasks={allKanbanTasks}
              onClick={() => {}} 
              onMove={() => {}}
              onDelete={() => {}}
              onEditValue={() => {}}
              onHistory={() => {}}
              isOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Lead Detail Modal */}
      {selectedLeadForDetails && (
        <LeadDetailModal
          lead={selectedLeadForDetails}
          users={users}
          columns={columns}
          kanbans={kanbans}
          comments={comments}
          history={history}
          tasks={tasks}
          templates={templates}
          tags={tags}
          onRefreshTags={fetchData}
          newComment={newComment}
          setNewComment={setNewComment}
          onClose={() => setSelectedLeadForDetails(null)}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onMove={handleMoveLead}
          onDelete={handleDeleteLead}
          onWin={handleWinLead}
          onLose={handleLoseLead}
          onMoveToKanban={handleMoveToKanban}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onRefreshTasks={() => { fetchTasks(selectedLeadForDetails.id); fetchHistory(selectedLeadForDetails.id); }}
          onApplyTemplate={handleApplyTemplate}
          onManageTemplates={() => setIsManageTemplatesOpen(true)}
          currentKanbanId={activeKanbanId}
          api4comSettings={api4comSettings}
          callingLeadId={callingLeadId}
          onCallLead={handleCallLead}
          onUpdateLeadField={handleUpdateLeadField}
        />
      )}

      {/* Template Management Modal */}
      <AnimatePresence>
        {isManageTemplatesOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1A1625] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-3">
                  {templateEditor.mode !== 'list' && (
                    <button onClick={() => setTemplateEditor(p => ({ ...p, mode: 'list' }))} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <h2 className="text-lg font-black">
                    {templateEditor.mode === 'list' ? 'Modelos de Tarefas Recorrentes' :
                     templateEditor.mode === 'create' ? 'Novo Modelo' : 'Editar Modelo'}
                  </h2>
                </div>
                <button onClick={() => { setIsManageTemplatesOpen(false); setTemplateEditor({ mode: 'list', template: null, form: { name: '', description: '', items: [] } }); }} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {templateEditor.mode === 'list' && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setTemplateEditor({ mode: 'create', template: null, form: { name: '', description: '', items: [] } })}
                      className="w-full py-3 px-4 bg-violet-500 hover:bg-violet-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <Plus size={16} /> Novo Modelo
                    </button>
                    {templates.length === 0 ? (
                      <p className="text-center text-gray-400 py-8 text-sm">Nenhum modelo cadastrado</p>
                    ) : (
                      templates.map(tmp => (
                        <div key={tmp.id} className="border border-gray-100 dark:border-white/10 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ChevronDown size={16} className="text-gray-400" />
                              <div>
                                <span className="font-bold text-sm">{tmp.name}</span>
                                <span className="ml-2 text-[10px] bg-gray-100 dark:bg-white/10 text-gray-500 px-2 py-0.5 rounded-full">{tmp.items?.length || 0} tarefas</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setTemplateEditor({ mode: 'edit', template: tmp, form: { name: tmp.name, description: tmp.description || '', items: (tmp.items || []).map(i => ({ ...i })) } })}
                                className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(tmp.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                          {tmp.description && <p className="text-xs text-violet-500 mt-1 ml-7">{tmp.description}</p>}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {(templateEditor.mode === 'create' || templateEditor.mode === 'edit') && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold mb-1.5">Nome do Modelo *</label>
                      <input
                        type="text"
                        value={templateEditor.form.name}
                        onChange={e => setTemplateEditor(p => ({ ...p, form: { ...p.form, name: e.target.value } }))}
                        className="w-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="Ex: Fluxo Comercial"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1.5">Descrição</label>
                      <input
                        type="text"
                        value={templateEditor.form.description}
                        onChange={e => setTemplateEditor(p => ({ ...p, form: { ...p.form, description: e.target.value } }))}
                        className="w-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                        placeholder="Ex: Sequência de vendas"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-bold">Tarefas do Modelo</label>
                        <button
                          onClick={() => setTemplateEditor(p => ({ ...p, form: { ...p.form, items: [...p.form.items, { title: '', type: 'Tarefa', priority: 'Normal', due_days_offset: 0 }] } }))}
                          className="text-xs font-bold text-violet-500 flex items-center gap-1 hover:underline"
                        >
                          <Plus size={12} /> Adicionar Tarefa
                        </button>
                      </div>
                      <div className="space-y-4">
                        {templateEditor.form.items.map((item, idx) => (
                          <div key={idx} className="border border-gray-100 dark:border-white/10 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-400">#{idx + 1}</span>
                              <input
                                type="text"
                                value={item.title}
                                onChange={e => {
                                  const items = [...templateEditor.form.items];
                                  items[idx] = { ...items[idx], title: e.target.value };
                                  setTemplateEditor(p => ({ ...p, form: { ...p.form, items } }));
                                }}
                                placeholder="Título da tarefa"
                                className="flex-1 border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                              />
                              <button onClick={() => {
                                const items = templateEditor.form.items.filter((_, i) => i !== idx);
                                setTemplateEditor(p => ({ ...p, form: { ...p.form, items } }));
                              }} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Tipo</label>
                                <select
                                  value={item.type}
                                  onChange={e => {
                                    const items = [...templateEditor.form.items];
                                    items[idx] = { ...items[idx], type: e.target.value };
                                    setTemplateEditor(p => ({ ...p, form: { ...p.form, items } }));
                                  }}
                                  className="w-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-lg px-2 py-1.5 text-xs"
                                >
                                  {['Tarefa', 'Ligação', 'WhatsApp', 'Email', 'Reunião', 'Lembrete'].map(t => <option key={t}>{t}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Prioridade</label>
                                <select
                                  value={item.priority}
                                  onChange={e => {
                                    const items = [...templateEditor.form.items];
                                    items[idx] = { ...items[idx], priority: e.target.value };
                                    setTemplateEditor(p => ({ ...p, form: { ...p.form, items } }));
                                  }}
                                  className="w-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-lg px-2 py-1.5 text-xs"
                                >
                                  {['Baixa', 'Normal', 'Alta', 'Urgente'].map(p => <option key={p}>{p}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Prazo (D+)</label>
                                <input
                                  type="number"
                                  value={item.due_days_offset}
                                  min={0}
                                  onChange={e => {
                                    const items = [...templateEditor.form.items];
                                    items[idx] = { ...items[idx], due_days_offset: Number(e.target.value) };
                                    setTemplateEditor(p => ({ ...p, form: { ...p.form, items } }));
                                  }}
                                  className="w-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 rounded-lg px-2 py-1.5 text-xs outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setTemplateEditor(p => ({ ...p, mode: 'list' }))}
                        className="flex-1 py-2.5 text-sm font-bold text-gray-500 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          if (!templateEditor.form.name.trim()) return;
                          if (templateEditor.mode === 'create') {
                            await handleCreateTemplate(templateEditor.form);
                          } else if (templateEditor.template) {
                            await handleUpdateTemplate(templateEditor.template.id, templateEditor.form);
                          }
                          setTemplateEditor({ mode: 'list', template: null, form: { name: '', description: '', items: [] } });
                        }}
                        className="flex-1 py-2.5 bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold rounded-xl transition-all"
                      >
                        {templateEditor.mode === 'create' ? 'Criar Modelo' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Lead Modal */}
      <Modal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        title="Novo Lead"
        maxWidth="max-w-md"
        footer={
          <button
            onClick={handleCreateLead}
            disabled={!newLeadData.nome}
            className={designSystem.button.primary}
          >
            Salvar Lead
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={designSystem.input.label}>Nome do Lead *</label>
            <input 
              type="text"
              value={newLeadData.nome}
              onChange={e => setNewLeadData(prev => ({ ...prev, nome: e.target.value }))}
              className={designSystem.input.field}
              placeholder="Nome da empresa ou contato"
            />
          </div>
          
          <div>
            <label className={designSystem.input.label}>Telefone</label>
            <input 
              type="text"
              value={newLeadData.telefone}
              onChange={e => setNewLeadData(prev => ({ ...prev, telefone: e.target.value }))}
              className={designSystem.input.field}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={designSystem.input.label}>Origem</label>
              <select
                value={newLeadData.origem}
                onChange={e => setNewLeadData(prev => ({ ...prev, origem: e.target.value }))}
                className={designSystem.input.field}
              >
                <option value="Indicação" className="text-orange-500 bg-light-sidebar dark:bg-dark-sidebar font-semibold">Indicação</option>
                <option value="Meta ads" className="text-blue-500 bg-light-sidebar dark:bg-dark-sidebar font-semibold">Meta ads</option>
                <option value="Google ads" className="text-amber-500 bg-light-sidebar dark:bg-dark-sidebar font-semibold">Google ads</option>
                <option value="Youtube ads" className="text-red-500 bg-light-sidebar dark:bg-dark-sidebar font-semibold">Youtube ads</option>
                <option value="Linkedin" className="text-sky-500 bg-light-sidebar dark:bg-dark-sidebar font-semibold">Linkedin</option>
                <option value="Outro" className="text-gray-900 dark:text-white bg-light-sidebar dark:bg-dark-sidebar font-semibold">Outro</option>
              </select>
            </div>
            
            <div>
              <label className={designSystem.input.label}>Responsável</label>
              <select
                value={newLeadData.responsavel_id}
                onChange={e => setNewLeadData(prev => ({ ...prev, responsavel_id: e.target.value }))}
                className={designSystem.input.field}
              >
                <option value="" className="bg-light-sidebar dark:bg-dark-sidebar">Selecione...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id} className="bg-light-sidebar dark:bg-dark-sidebar">{u.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className={designSystem.input.label}>Valor do Contrato (R$)</label>
            <input 
              type="number"
              value={newLeadData.valor}
              onChange={e => setNewLeadData(prev => ({ ...prev, valor: e.target.value }))}
              className={designSystem.input.field}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className={designSystem.input.label}>Observações</label>
            <textarea 
              value={newLeadData.observacoes}
              onChange={e => setNewLeadData(prev => ({ ...prev, observacoes: e.target.value }))}
              className={`${designSystem.input.field} resize-none h-24`}
              placeholder="Detalhes adicionais..."
            />
          </div>
        </div>
      </Modal>

      {/* Comments Modal */}
      <Modal
        isOpen={!!selectedLeadForComments}
        onClose={() => setSelectedLeadForComments(null)}
        title="Comentários"
        maxWidth="max-w-lg"
      >
        <div className="flex flex-col h-[60vh]">
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-slate-500">{selectedLeadForComments?.nome}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {comments.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-slate-500 text-sm py-8">Nenhum comentário ainda.</p>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center text-[10px] font-bold">
                        {getInitials(comment.user_name)}
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{comment.user_name}</span>
                      <span className="text-xs text-gray-500 dark:text-slate-500">{new Date(comment.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-gray-400 dark:text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))
            )}
          </div>
          
          <div className="flex gap-2 mt-auto">
            <input 
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              placeholder="Digite um comentário..."
              className={designSystem.input.field}
            />
            <button 
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className={designSystem.button.primary}
            >
              Enviar
            </button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={!!selectedLeadForHistory}
        onClose={() => setSelectedLeadForHistory(null)}
        title="Histórico de Movimentações"
        maxWidth="max-w-lg"
      >
        <div className="flex flex-col h-[60vh]">
          <div className="mb-4">
            <p className="text-sm text-gray-500 dark:text-slate-500">{selectedLeadForHistory?.nome}</p>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {history.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-slate-500 text-sm py-8">Nenhuma movimentação registrada.</p>
            ) : (
              history.map(item => (
                <div key={item.id} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0 mt-1">
                    <Clock size={14} className="text-gray-500 dark:text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-bold">{item.moved_by}</span> moveu de <span className="font-bold text-gray-500 dark:text-slate-500">{columns.find(c => c.id === item.from_coluna)?.title || item.from_coluna}</span> para <span className="font-bold text-violet-500">{columns.find(c => c.id === item.to_coluna)?.title || item.to_coluna}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* New Column Modal */}
      <Modal
        isOpen={isNewColumnModalOpen}
        onClose={() => setIsNewColumnModalOpen(false)}
        title="Nova Coluna"
        maxWidth="max-w-md"
        footer={
          <button 
            onClick={handleCreateColumn}
            disabled={!newColumnData.title}
            className={designSystem.button.primary}
          >
            Criar Coluna
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={designSystem.input.label}>Nome da Coluna *</label>
            <input 
              type="text"
              value={newColumnData.title}
              onChange={e => setNewColumnData(prev => ({ ...prev, title: e.target.value }))}
              className={designSystem.input.field}
              placeholder="Ex: Em negociação"
            />
          </div>
          
          <div>
            <label className={designSystem.input.label}>Cor</label>
            <div className="flex gap-2">
              {KANBAN_COLORS.map(color => (
                <button
                  key={color.id}
                  onClick={() => setNewColumnData(prev => ({ ...prev, color: color.id }))}
                  className={`w-8 h-8 rounded-full ${color.class} flex items-center justify-center transition-transform hover:scale-110 ${newColumnData.color === color.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A0A0A]' : ''}`}
                >
                  {newColumnData.color === color.id && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={designSystem.input.label}>Ícone</label>
            <div className="grid grid-cols-7 gap-2">
              {COLUMN_ICONS.map(iconName => (
                <button
                  key={iconName}
                  onClick={() => setNewColumnData(prev => ({ ...prev, icon: iconName }))}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    newColumnData.icon === iconName 
                    ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 ring-2 ring-violet-500' 
                    : 'bg-gray-50 text-gray-400 dark:bg-white/5 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  <RenderIcon name={iconName} size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Column Modal */}
      <Modal
        isOpen={isEditColumnModalOpen}
        onClose={() => setIsEditColumnModalOpen(false)}
        title="Editar Coluna"
        maxWidth="max-w-md"
        footer={
          <button 
            onClick={handleUpdateColumn}
            disabled={!editColumnData?.title.trim()}
            className={designSystem.button.primary}
          >
            Salvar Alterações
          </button>
        }
      >
        {editColumnData && (
          <div className="space-y-4">
            <div>
              <label className={designSystem.input.label}>Nome da Coluna *</label>
              <input 
                type="text"
                value={editColumnData.title}
                onChange={e => setEditColumnData(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                className={designSystem.input.field}
                placeholder="Ex: Em negociação"
              />
            </div>
            
            <div>
              <label className={designSystem.input.label}>Cor da Coluna</label>
              <div className="flex gap-2">
                {KANBAN_COLORS.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setEditColumnData(prev => prev ? ({ ...prev, color: color.id }) : null)}
                    className={`w-8 h-8 rounded-full ${color.class} flex items-center justify-center transition-transform hover:scale-110 ${editColumnData.color === color.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A0A0A]' : ''}`}
                  >
                    {editColumnData.color === color.id && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={designSystem.input.label}>Ícone</label>
              <div className="grid grid-cols-7 gap-2">
                {COLUMN_ICONS.map(iconName => (
                  <button
                    key={iconName}
                    onClick={() => setEditColumnData(prev => prev ? ({ ...prev, icon: iconName }) : null)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      editColumnData.icon === iconName 
                      ? 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 ring-2 ring-violet-500' 
                      : 'bg-gray-50 text-gray-400 dark:bg-white/5 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <RenderIcon name={iconName} size={18} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Column Modal */}
      <Modal
        isOpen={!!columnToDelete}
        onClose={() => setColumnToDelete(null)}
        title="Excluir Coluna"
        maxWidth="max-w-md"
        footer={
          <div className="flex gap-2 w-full">
            <button 
              onClick={() => setColumnToDelete(null)}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                if (columnToDelete) handleDeleteColumn(columnToDelete);
              }}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
            >
              Excluir
            </button>
          </div>
        }
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir esta Coluna? Os tickets contidos nela <strong>não serão apagados</strong>, mas podem perder a referência visual até serem movidos.
        </p>
      </Modal>

      {/* New Kanban Modal */}
      <Modal
        isOpen={isNewKanbanModalOpen}
        onClose={() => setIsNewKanbanModalOpen(false)}
        title="Novo Kanban"
        maxWidth="max-w-md"
        footer={
          <button 
            onClick={handleCreateKanban}
            disabled={!newKanbanData.nome.trim()}
            className={designSystem.button.primary}
          >
            Criar Kanban
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={designSystem.input.label}>Nome do Kanban</label>
            <input 
              type="text"
              value={newKanbanData.nome}
              onChange={e => setNewKanbanData({...newKanbanData, nome: e.target.value})}
              placeholder="Ex: Vendas, Jurídico, Suporte..."
              className={designSystem.input.field}
              autoFocus
            />
          </div>
          
          <div>
            <label className={designSystem.input.label}>Descrição (opcional)</label>
            <textarea 
              value={newKanbanData.descricao}
              onChange={e => setNewKanbanData({...newKanbanData, descricao: e.target.value})}
              placeholder="Descreva o propósito deste kanban..."
              className={`${designSystem.input.field} resize-none h-24`}
            />
          </div>

          <div>
            <label className={designSystem.input.label}>Cor</label>
            <div className="grid grid-cols-3 gap-3">
              {KANBAN_COLORS.map(color => (
                <button
                  key={color.id}
                  onClick={() => setNewKanbanData({...newKanbanData, cor: color.id})}
                  className={`h-12 rounded-xl ${color.class} transition-all ${newKanbanData.cor === color.id ? 'ring-2 ring-white scale-105 shadow-lg' : 'opacity-80 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* ━━━━━━ SOFTPHONE POPUP (WebRTC) ━━━━━━ */}
      <AnimatePresence>
        {/* === DIALER API POPUP (click-to-call) === */}
        {softphoneCall && !softphone.currentCall && (() => {
          const isError = softphoneCall.status === 'error';
          const isActive = softphoneCall.status === 'active';
          const initials = (softphoneCall.leadName || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
          const accentColor = isError ? '#ef4444' : '#22c55e';
          const elapsed = softphoneCall.startedAt ? Math.floor((Date.now() - softphoneCall.startedAt) / 1000) : 0;

          return (
            <motion.div
              key="softphone-dialer"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="fixed bottom-6 right-6 z-[100000] w-72 rounded-3xl overflow-hidden"
              style={{
                background: isError
                  ? 'linear-gradient(135deg, #1c0a0a 0%, #0d0b14 60%)'
                  : 'linear-gradient(135deg, #064e3b 0%, #0d0b14 60%)',
                border: `1px solid ${accentColor}22`,
                boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${accentColor}15`
              }}
            >
              {/* Avatar */}
              <div className="relative flex flex-col items-center pt-8 pb-4 px-6">
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '20px' }}>
                    <span className="absolute w-24 h-24 rounded-full animate-ping" style={{ background: `${accentColor}20`, animationDuration: '2s' }} />
                    <span className="absolute w-32 h-32 rounded-full animate-ping" style={{ background: `${accentColor}10`, animationDuration: '2s', animationDelay: '0.6s' }} />
                  </div>
                )}

                <div className="relative w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black mb-3 z-10"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)`,
                    border: `2px solid ${accentColor}60`,
                    boxShadow: `0 0 30px ${accentColor}30`
                  }}
                >
                  <span className="text-2xl font-bold" style={{ color: accentColor }}>{initials}</span>
                </div>

                <p className="text-white font-bold text-lg text-center truncate w-full">{softphoneCall.leadName}</p>
                <p className="text-sm font-mono mt-0.5 mb-3" style={{ color: '#6b7280' }}>{softphoneCall.phone}</p>

                {isActive && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
                      <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>Chamada conectada via Api4Com</p>
                    </div>
                    <div className="rounded-xl px-4 py-2.5 w-full text-center mb-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
                      <p className="text-xs font-semibold" style={{ color: '#86efac' }}>📞 Seu ramal <strong>{settingsForm.sip_extension}</strong> vai tocar em instantes</p>
                      <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Atenda o telefone para falar com o cliente</p>
                    </div>
                    <p className="text-4xl font-mono font-black tabular-nums tracking-widest" style={{ color: '#fff', textShadow: '0 0 20px rgba(34,197,94,0.35)' }}>
                      {formatCallTime(callElapsed + elapsed)}
                    </p>
                  </>
                )}

                {isError && (
                  <div className="rounded-xl px-3 py-2.5 w-full" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <p className="text-xs text-red-400 font-semibold">✗ {softphoneCall.errorMsg || 'Falha na chamada'}</p>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4 pb-8 px-6">
                {isError ? (
                  <>
                    <button
                      onClick={() => softphoneCall && handleCallLead(softphoneCall.leadId, softphoneCall.phone, softphoneCall.leadName)}
                      className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all"
                      style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}
                    >
                      Tentar novamente
                    </button>
                    <button
                      onClick={() => setSoftphoneCall(null)}
                      className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280' }}
                    >
                      Fechar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setSoftphoneCall(null)}
                    title="Encerrar"
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 8px 30px rgba(220,38,38,0.5)', color: '#fff' }}
                  >
                    <Phone size={24} style={{ transform: 'rotate(135deg)' }} />
                  </button>
                )}
              </div>

              <p className="text-center pb-4 text-xs" style={{ color: '#374151' }}>
                📞 Ramal {settingsForm.sip_extension} · Api4Com Dialer
              </p>
            </motion.div>
          );
        })()}

        {/* === ACTIVE JSSIP SOFTPHONE === */}
        {softphone.currentCall && (() => {
          const call = softphone.currentCall;
          const status = call.status;
          const initials = call.leadName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

          const isLive = status === 'active';
          const isCalling = status === 'calling' || status === 'ringing';
          const isDone = status === 'ended' || status === 'failed';

          const accentColor = isLive ? '#22c55e' : status === 'ringing' ? '#f59e0b' : isCalling ? '#7c3aed' : isDone ? '#6b7280' : '#ef4444';
          const bgGradient = isLive
            ? 'linear-gradient(135deg, #064e3b 0%, #0d0b14 60%)'
            : isCalling
            ? 'linear-gradient(135deg, #1e1b4b 0%, #0d0b14 60%)'
            : 'linear-gradient(135deg, #1c1917 0%, #0d0b14 60%)';

          return (
            <motion.div
              key="softphone-jssip"
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 280 }}
              className="fixed bottom-6 right-6 z-[100000] w-72 rounded-3xl overflow-hidden"
              style={{ background: bgGradient, border: `1px solid ${accentColor}22`, boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${accentColor}15` }}
            >
              {/* Avatar section */}
              <div className="relative flex flex-col items-center pt-8 pb-4 px-6">
                {/* Pulsing rings for calling state */}
                {isCalling && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '20px' }}>
                    <span className="absolute w-24 h-24 rounded-full animate-ping" style={{ background: `${accentColor}20`, animationDuration: '1.5s' }} />
                    <span className="absolute w-32 h-32 rounded-full animate-ping" style={{ background: `${accentColor}10`, animationDuration: '1.5s', animationDelay: '0.4s' }} />
                    <span className="absolute w-40 h-40 rounded-full animate-ping" style={{ background: `${accentColor}08`, animationDuration: '1.5s', animationDelay: '0.8s' }} />
                  </div>
                )}

                {/* Avatar */}
                <div className="relative w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black mb-3 z-10"
                  style={{ background: `linear-gradient(135deg, ${accentColor}40, ${accentColor}20)`, border: `2px solid ${accentColor}60`, boxShadow: `0 0 30px ${accentColor}30` }}
                >
                  {initials || <Phone size={28} style={{ color: accentColor }} />}
                  <span className="absolute text-2xl font-bold" style={{ color: accentColor }}>{initials}</span>
                  {isLive && <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ background: '#22c55e', borderColor: '#0d0b14' }}>
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  </span>}
                </div>

                {/* Name */}
                <p className="text-white font-bold text-lg text-center truncate w-full leading-tight">{call.leadName}</p>
                <p className="text-sm font-mono mt-0.5 mb-2" style={{ color: '#6b7280' }}>{call.phone}</p>

                {/* Status text */}
                <div className="flex items-center gap-2 mb-1">
                  {isCalling && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accentColor }} />}
                  <p className="text-sm font-semibold" style={{ color: accentColor }}>
                    {status === 'calling' ? 'Chamando...' :
                     status === 'ringing' ? 'Aguardando atender...' :
                     status === 'active' ? 'Em chamada' :
                     status === 'ended' ? 'Chamada encerrada' :
                     call.errorMsg || 'Falha na chamada'}
                  </p>
                </div>

                {/* Timer */}
                {isLive && (
                  <p className="text-4xl font-mono font-black tabular-nums tracking-widest mt-1 mb-1" style={{ color: '#fff', textShadow: '0 0 20px rgba(34,197,94,0.4)' }}>
                    {formatCallTime(softphone.callElapsed)}
                  </p>
                )}

                {/* Sound wave animation when active */}
                {isLive && (
                  <div className="flex items-center gap-1 mt-2 mb-1" style={{ height: '24px' }}>
                    {[0.4, 1, 0.6, 1.2, 0.5, 0.9, 0.3, 1.1, 0.7, 0.4].map((h, i) => (
                      <span key={i} className="rounded-full" style={{
                        width: '3px',
                        height: `${h * 20}px`,
                        background: '#22c55e',
                        opacity: softphone.isMuted ? 0.2 : 0.85,
                        animation: softphone.isMuted ? 'none' : `soundWave 0.8s ease-in-out ${i * 0.08}s infinite alternate`,
                      }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Controls */}
              {!isDone && (
                <div className="flex items-center justify-center gap-4 pb-8 px-6">
                  {/* Mute */}
                  <button
                    onClick={softphone.toggleMute}
                    title={softphone.isMuted ? 'Ativar microfone' : 'Silenciar'}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{
                      background: softphone.isMuted ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.1)',
                      border: `1px solid ${softphone.isMuted ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.15)'}`,
                      color: softphone.isMuted ? '#fbbf24' : '#ffffff'
                    }}
                  >
                    {softphone.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>

                  {/* Hang up — big red button */}
                  <button
                    onClick={softphone.hangUp}
                    title="Encerrar chamada"
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 8px 30px rgba(220,38,38,0.5)', color: '#fff' }}
                  >
                    <Phone size={24} style={{ transform: 'rotate(135deg)' }} />
                  </button>

                  {/* Speaker placeholder (visual balance) */}
                  <button
                    title="Volume"
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: '#ffffff', opacity: 0.5, cursor: 'default' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  </button>
                </div>
              )}

              {/* Done state */}
              {isDone && (
                <div className="pb-6 px-6">
                  <button
                    onClick={() => { softphone.hangUp(); setSoftphoneCall(null); }}
                    className="w-full py-3 rounded-2xl text-sm font-bold transition-all"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#9ca3af' }}
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Ramal label */}
              <p className="text-center pb-4 text-xs" style={{ color: '#374151' }}>
                🎙 Ramal {settingsForm.sip_extension} · WebRTC
              </p>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Sound wave keyframes */}
      <style>{`
        @keyframes soundWave {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1.2); }
        }
      `}</style>




      {/* ━━━━━━ TELEPHONY SETTINGS MODAL (Api4Com) ━━━━━━ */}
      <AnimatePresence>
        {isTelefonySettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsTelefonySettingsOpen(false)}
            className="fixed inset-0 z-[99999] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              className="w-full rounded-xl overflow-hidden flex flex-col"
              style={{ maxWidth: 560, maxHeight: '90vh', background: '#13111a', border: '1px solid #2d2b3d' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid #2d2b3d' }}>
                <h2 className="font-bold text-white text-lg flex items-center gap-2">
                  <Settings size={18} className="text-violet-400" /> Configurações do CRM
                </h2>
                <button onClick={() => setIsTelefonySettingsOpen(false)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 px-4 pt-3 shrink-0" style={{ borderBottom: '1px solid #2d2b3d' }}>
                {([
                  { key: 'telefonia', label: 'Telefonia' },
                  { key: 'webhook', label: 'Webhook' },
                  { key: 'sequencias', label: 'Sequências' },
                  { key: 'motivos-perda', label: 'Motivos de Perda' },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSettingsTab(tab.key)}
                    className="px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px"
                    style={{
                      borderColor: settingsTab === tab.key ? '#7c3aed' : 'transparent',
                      color: settingsTab === tab.key ? '#a78bfa' : '#6b7280',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="overflow-y-auto flex-1 p-6 space-y-6">

                {/* ── TELEFONIA ── */}
                {settingsTab === 'telefonia' && (<>
                  {!api4comSettings?.configured && (
                    <div className="flex items-start gap-3 rounded-lg p-3 text-sm" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', color: '#facc15' }}>
                      <span>⚠</span>
                      <span>Configure suas credenciais para ativar o botão de ligação</span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#6b7280' }}>Credenciais da Conta</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>Token de Acesso (permanente)</label>
                        <input type="password" autoComplete="off" value={settingsForm.api4com_token} onChange={e => setSettingsForm(f => ({ ...f, api4com_token: e.target.value }))} placeholder="YggyHfrLEHAWmKiUFb..."
                          className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all" style={{ background: '#0d0b14', border: '1px solid #2d2b3d' }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#2d2b3d'; e.currentTarget.style.boxShadow = 'none'; }} />
                        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Token com ttl: -1 gerado na Api4Com. Nunca expira.</p>
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>Domínio da empresa</label>
                        <input type="text" value={settingsForm.api4com_domain} onChange={e => setSettingsForm(f => ({ ...f, api4com_domain: e.target.value }))}
                          onBlur={e => { const domain = e.target.value.trim(); if (domain && !settingsForm.sip_server) { setSettingsForm(f => ({ ...f, sip_server: 'wss://' + domain })); } }}
                          placeholder="seudominio.api4com.com" className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all" style={{ background: '#0d0b14', border: '1px solid #2d2b3d' }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }} />
                        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Domínio criado no cadastro da Api4Com</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#6b7280' }}>Ramal SIP do Usuário</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>Número do Ramal</label>
                        <input type="text" value={settingsForm.sip_extension} onChange={e => setSettingsForm(f => ({ ...f, sip_extension: e.target.value }))} placeholder="1000"
                          className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all" style={{ background: '#0d0b14', border: '1px solid #2d2b3d' }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#2d2b3d'; e.currentTarget.style.boxShadow = 'none'; }} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>Senha do Ramal</label>
                        <input type="password" autoComplete="new-password" value={settingsForm.sip_password} onChange={e => setSettingsForm(f => ({ ...f, sip_password: e.target.value }))} placeholder="••••••••"
                          className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all" style={{ background: '#0d0b14', border: '1px solid #2d2b3d' }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#2d2b3d'; e.currentTarget.style.boxShadow = 'none'; }} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5" style={{ color: '#9ca3af' }}>Servidor WSS</label>
                        <input type="text" value={settingsForm.sip_server} onChange={e => setSettingsForm(f => ({ ...f, sip_server: e.target.value }))} placeholder="wss://seudominio.api4com.com"
                          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all" style={{ background: '#0d0b14', border: '1px solid #2d2b3d', color: '#9ca3af' }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#2d2b3d'; e.currentTarget.style.boxShadow = 'none'; }} />
                        <p className="text-xs mt-1 mb-1.5" style={{ color: '#6b7280' }}>Tente formatos comuns:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {settingsForm.api4com_domain && [`wss://${settingsForm.api4com_domain}`, `wss://${settingsForm.api4com_domain}:8089/ws`, `wss://${settingsForm.api4com_domain}/ws`, `wss://${settingsForm.api4com_domain}:443/ws`].map(url => (
                            <button key={url} onClick={() => setSettingsForm(f => ({ ...f, sip_server: url }))} className="text-xs px-2 py-1 rounded-md transition-all"
                              style={{ background: settingsForm.sip_server === url ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${settingsForm.sip_server === url ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`, color: settingsForm.sip_server === url ? '#a78bfa' : '#6b7280', fontFamily: 'monospace', fontSize: '10px' }}>
                              {url.replace(`wss://${settingsForm.api4com_domain}`, '…')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  {testResult && (
                    <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ background: testResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, color: testResult.success ? '#22c55e' : '#ef4444' }}>
                      <span>{testResult.success ? '✓' : '✗'}</span><span>{testResult.message}</span>
                    </div>
                  )}
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.05)' }}>
                    <div className="px-3 py-2.5 flex items-center gap-2" style={{ background: 'rgba(124,58,237,0.1)', borderBottom: '1px solid rgba(124,58,237,0.2)' }}>
                      <span className="text-sm">📞</span>
                      <p className="text-xs font-bold" style={{ color: '#a78bfa' }}>Como funciona o Clique-para-Ligar</p>
                    </div>
                    <div className="px-3 py-3">
                      <p className="text-xs mb-2" style={{ color: '#9ca3af' }}>Ao clicar em 📞 em qualquer lead, o Api4Com vai <strong style={{ color: '#e5e7eb' }}>ligar para o seu ramal</strong> e então conectar ao cliente.</p>
                      <p className="text-xs font-semibold mb-1.5" style={{ color: '#d1d5db' }}>Para funcionar, você precisa de um dos:</p>
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-2"><span className="text-green-400 text-xs mt-0.5">✓</span><p className="text-xs" style={{ color: '#9ca3af' }}><strong style={{ color: '#e5e7eb' }}>Zoiper 5</strong> (gratuito) instalado no PC com ramal {settingsForm.sip_extension || '1000'}{' → '}<a href="https://www.zoiper.com/en/voip-softphone/download/current" target="_blank" rel="noreferrer" className="underline" style={{ color: '#a78bfa' }}>Baixar Zoiper</a></p></div>
                        <div className="flex items-start gap-2"><span className="text-green-400 text-xs mt-0.5">✓</span><p className="text-xs" style={{ color: '#9ca3af' }}><strong style={{ color: '#e5e7eb' }}>Telefone IP</strong> configurado com o ramal {settingsForm.sip_extension || '1000'}</p></div>
                      </div>
                      {settingsForm.sip_extension && settingsForm.sip_password && settingsForm.api4com_domain && (
                        <div className="mt-3 p-2 rounded-lg text-xs font-mono" style={{ background: 'rgba(0,0,0,0.3)', color: '#6b7280' }}>
                          Servidor: <span style={{ color: '#a78bfa' }}>{settingsForm.api4com_domain}</span><br/>
                          Usuário: <span style={{ color: '#a78bfa' }}>{settingsForm.sip_extension}</span><br/>
                          Senha: <span style={{ color: '#a78bfa' }}>{settingsForm.sip_password}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2 flex-wrap">
                    <button onClick={handleSaveApi4ComSettings} disabled={savingSettings} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50" style={{ background: settingsSaved ? '#16a34a' : '#7c3aed' }}>
                      {savingSettings ? <Loader2 size={14} className="animate-spin" /> : null}
                      {settingsSaved ? '✓ Salvo!' : 'Salvar configurações'}
                    </button>
                    <button onClick={handleTestApi4ComConnection} disabled={testingConnection} title="Testa o token salvo no banco de dados" className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50" style={{ border: '1px solid #22c55e', color: '#22c55e', background: 'transparent' }}>
                      {testingConnection ? <Loader2 size={14} className="animate-spin" /> : <PhoneCall size={14} />}
                      Testar Conexão
                    </button>
                    <button onClick={() => setIsTelefonySettingsOpen(false)} className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all" style={{ background: 'transparent', border: '1px solid #2d2b3d', color: '#9ca3af' }}>
                      Cancelar
                    </button>
                  </div>
                </>)}

                {/* ── WEBHOOK ── */}
                {settingsTab === 'webhook' && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                      <span className="text-3xl">🔗</span>
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">Webhooks</p>
                      <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Em desenvolvimento — em breve você poderá configurar webhooks para integrar com outras ferramentas.</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#facc15' }}>Em breve</span>
                  </div>
                )}

                {/* ── SEQUÊNCIAS ── */}
                {settingsTab === 'sequencias' && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                      <span className="text-3xl">⚡</span>
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">Sequências de Cadência</p>
                      <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Em desenvolvimento — automatize sequências de follow-up para seus leads.</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#facc15' }}>Em breve</span>
                  </div>
                )}

                {/* ── MOTIVOS DE PERDA ── */}
                {settingsTab === 'motivos-perda' && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#6b7280' }}>Motivos de Perda</h3>
                      <p className="text-xs" style={{ color: '#4b5563' }}>Cadastre os motivos pelos quais os negócios são perdidos.</p>
                    </div>

                    {/* Add Form */}
                    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2d2b3d' }}>
                      <p className="text-xs font-semibold" style={{ color: '#9ca3af' }}>Novo Motivo</p>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={newLossReason.color}
                          onChange={e => setNewLossReason(f => ({ ...f, color: e.target.value }))}
                          className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0.5"
                          style={{ background: '#0d0b14', border: '1px solid #2d2b3d' }}
                          title="Cor do motivo"
                        />
                        <input
                          type="text"
                          value={newLossReason.name}
                          onChange={e => setNewLossReason(f => ({ ...f, name: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleCreateLossReason()}
                          placeholder="Ex: Preço alto, Concorrência..."
                          className="flex-1 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all"
                          style={{ background: '#0d0b14', border: '1px solid #2d2b3d' }}
                          onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                          onBlur={e => { e.currentTarget.style.borderColor = '#2d2b3d'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                        <button
                          onClick={handleCreateLossReason}
                          disabled={savingLossReason || !newLossReason.name.trim()}
                          className="px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-40 flex items-center gap-1.5"
                          style={{ background: '#7c3aed' }}
                        >
                          {savingLossReason ? <Loader2 size={13} className="animate-spin" /> : '+'}
                          Adicionar
                        </button>
                      </div>
                      <input
                        type="text"
                        value={newLossReason.description}
                        onChange={e => setNewLossReason(f => ({ ...f, description: e.target.value }))}
                        placeholder="Descrição (opcional)"
                        className="w-full rounded-lg px-3.5 py-2 text-sm outline-none transition-all"
                        style={{ background: '#0d0b14', border: '1px solid #2d2b3d', color: '#9ca3af' }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#7c3aed'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#2d2b3d'; }}
                      />
                    </div>

                    {/* List */}
                    {lossReasons.length === 0 ? (
                      <div className="flex flex-col items-center py-10 gap-2 text-center">
                        <span className="text-3xl">📋</span>
                        <p className="text-sm" style={{ color: '#6b7280' }}>Nenhum motivo cadastrado ainda.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {lossReasons.map(reason => (
                          <div key={reason.id} className="rounded-xl px-4 py-3 flex items-center gap-3 group" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2d2b3d' }}>
                            {editingLossReason === reason.id ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input type="color" value={editLossReasonForm.color} onChange={e => setEditLossReasonForm(f => ({ ...f, color: e.target.value }))}
                                  className="w-8 h-8 rounded cursor-pointer p-0.5" style={{ background: '#0d0b14', border: '1px solid #2d2b3d' }} />
                                <input type="text" value={editLossReasonForm.name} onChange={e => setEditLossReasonForm(f => ({ ...f, name: e.target.value }))}
                                  className="flex-1 rounded-lg px-3 py-1.5 text-sm text-white outline-none" style={{ background: '#0d0b14', border: '1px solid #7c3aed' }}
                                  onKeyDown={e => e.key === 'Enter' && handleUpdateLossReason(reason.id)} />
                                <button onClick={() => handleUpdateLossReason(reason.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: '#7c3aed' }}>Salvar</button>
                                <button onClick={() => setEditingLossReason(null)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: '#6b7280' }}>Cancelar</button>
                              </div>
                            ) : (
                              <>
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: reason.color }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">{reason.name}</p>
                                  {reason.description && <p className="text-xs truncate" style={{ color: '#6b7280' }}>{reason.description}</p>}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingLossReason(reason.id); setEditLossReasonForm({ name: reason.name, description: reason.description || '', color: reason.color }); }}
                                    className="p-1.5 rounded-lg text-xs transition-all hover:bg-white/5" style={{ color: '#9ca3af' }} title="Editar">✏️</button>
                                  <button onClick={() => handleDeleteLossReason(reason.id)}
                                    className="p-1.5 rounded-lg text-xs transition-all hover:bg-red-500/10" style={{ color: '#ef4444' }} title="Excluir">🗑</button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <GerenciarKanbansModal
        isOpen={isManageKanbansOpen}
        onClose={() => setIsManageKanbansOpen(false)}
        kanbans={kanbans}
        columns={columns}
        leads={leads}
        onRename={handleRenameKanban}
        onDelete={(id: string) => {
          handleDeleteKanban(id);
          setIsManageKanbansOpen(false);
        }}
      />

      {/* --- Celebration Popup --- */}
      <AnimatePresence>
        {celebrationDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCelebrationDetails(null)}
            className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
          >
             <motion.div
              initial={{ scale: 0.5, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.5, y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
              onClick={e => e.stopPropagation()}
              className="flex flex-col items-center gap-6 p-4"
            >
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 drop-shadow-[0_2px_10px_rgba(139,92,246,0.8)] filter text-center py-2 relative z-20">
                NEGÓCIO GANHO! 🔥
              </h2>
              <div className="relative flex flex-col items-center">
                <div className="absolute inset-0 bg-violet-600 blur-[100px] opacity-40 rounded-full scale-150"></div>
                
                <img 
                  src={celebrationDetails.gif} 
                  alt="Celebration" 
                  className="w-full max-w-xl rounded-[2rem] border-[6px] border-white/10 shadow-3xl relative z-10" 
                />
                
                {/* Valor do Negócio em Verde Saliente */}
                <div className="relative z-20 mt-6 px-10 py-4 items-center flex flex-col justify-center rounded-3xl border border-emerald-500/40 bg-emerald-500/10 backdrop-blur-xl shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                  <span className="text-emerald-400 text-sm font-bold uppercase tracking-[0.2em] mb-1">Valor VENDIDO</span>
                  <span className="text-emerald-400 text-6xl font-black drop-shadow-[0_2px_10px_rgba(16,185,129,0.8)] tracking-tight">
                    {formatCurrency(celebrationDetails.value)}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CrmComercial;
