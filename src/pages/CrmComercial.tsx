import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { 
  Plus, Search, Filter, MessageSquare, Clock, Trash2, 
  ChevronRight, ChevronLeft, Flame, DollarSign, X, Edit2, ChevronDown, Check, Users, LayoutGrid,
  TrendingUp, TrendingDown, MoreHorizontal, ArrowRightLeft, Send, History, Phone, Mail,
  ArrowRight, Calendar, CheckSquare, FileText, Paperclip, Trophy, Star, Eye, EyeOff, Settings, PhoneCall, Loader2, Mic, MicOff,
  CheckCircle2, Circle, Video, Tag, Instagram, Briefcase, Award, Copy,
  Handshake, RefreshCw, XCircle, ClipboardList, Upload, Folder, Download, File, Bot, Zap
} from 'lucide-react';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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

// Format call timestamp from Api4Com.
// Api4Com incorrectly labels BRT (UTC-3) timestamps with Z (UTC), so times are 3h behind.
// Fix: ALWAYS add 3h to the returned timestamp to get the real BRT→UTC reference.
const formatCallRelativeTime = (dateStr: string): string => {
  if (!dateStr) return '';
  // Parse the date as-is (with or without Z), then add 3h to correct BRT mislabeled as UTC
  const raw = new Date(dateStr.replace(' ', 'T')).getTime();
  const ts = raw + 3 * 60 * 60 * 1000;
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `há ${days} dia${days !== 1 ? 's' : ''}`;
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};


const getCallTypeLabel = (call: any): string => {
  if (call.call_type === 'inbound') return 'Recebida';
  if (call.hangup_cause === 'NORMAL_CLEARING') return 'Chamada realizada';
  if (call.hangup_cause === 'NO_ANSWER' || call.hangup_cause === 'ORIGINATOR_CANCEL') return 'Não atendida';
  if (call.hangup_cause === 'USER_BUSY' || call.hangup_cause === 'CALL_REJECTED') return 'Ocupado';
  if (call.answered_at) return 'Chamada realizada';
  return 'Não atendida';
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
  currentUserEmail?: string;
  currentUserName?: string;
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
  tags, onRefreshTags, currentUserEmail, currentUserName
}) => {
  const [activeTab, setActiveTab] = useState<'atividades' | 'histórico' | 'notas' | 'ligações' | 'arquivos'>('atividades');
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [callLogsLoading, setCallLogsLoading] = useState(false);
  const [callLogsFetched, setCallLogsFetched] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showKanbanMenu, setShowKanbanMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [creatingWhatsapp, setCreatingWhatsapp] = useState(false);
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

  const [meetings, setMeetings] = useState<any[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [meetingsFetched, setMeetingsFetched] = useState(false);
  
  const [notes, setNotes] = useState<any[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesFetched, setNotesFetched] = useState(false);

  const handleCreateWhatsappGroup = async () => {
    setCreatingWhatsapp(true);
    try {
      const url = `/api/crm/webhooks/trigger/whatsapp/${lead.id}${currentUserEmail ? `?user_email=${encodeURIComponent(currentUserEmail)}` : ''}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Falha ao disparar webhook do WhatsApp');
      } else {
        setShowMoreMenu(false);
      }
    } catch (e) {
      console.error(e);
      alert('Erro bloqueando tentativa de disparo');
    } finally {
      setCreatingWhatsapp(false);
    }
  };
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    meeting_date: new Date().toISOString().slice(0, 16),
    notes: '',
    office_location: '',
    reunion_niche: '',
    monthly_closings: '',
    closing_goal: '',
    reunion_link: ''
  });
  
  const [files, setFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesFetched, setFilesFetched] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


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
  }, []);  // Reset state when lead changes
  useEffect(() => {
    setCallLogs([]);
    setCallLogsFetched(false);
    setMeetings([]);
    setMeetingsFetched(false);
    setNotes([]);
    setNotesFetched(false);
  }, [lead?.id]);

  // Fetch call history when ligações tab is active
  useEffect(() => {
    if ((activeTab !== 'ligações' && activeTab !== 'histórico') || !lead || callLogsFetched) return;
    setCallLogsLoading(true);
    const phone = encodeURIComponent(lead.telefone || '');
    const userId = encodeURIComponent(currentUserEmail || '');
    fetch(`/api/api4com/calls?user_id=${userId}&phone=${phone}&page=1`)
      .then(r => r.json())
      .then(data => {
        setCallLogs(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
        setCallLogsFetched(true);
      })
      .catch(() => setCallLogs([]))
      .finally(() => setCallLogsLoading(false));
  }, [activeTab, lead?.id, callLogsFetched]);

  // Fetch meetings when reuniões tab is active
  useEffect(() => {
    if (activeTab !== 'reuniões' || !lead || meetingsFetched) return;
    setMeetingsLoading(true);
    fetch(`/api/crm-comercial/meetings?lead_id=${lead.id}`)
      .then(r => r.json())
      .then(data => {
        setMeetings(Array.isArray(data) ? data : []);
        setMeetingsFetched(true);
      })
      .catch(() => setMeetings([]))
      .finally(() => setMeetingsLoading(false));
  }, [activeTab, lead?.id, meetingsFetched]);

  // Fetch notes when notas tab is active
  useEffect(() => {
    if (activeTab !== 'notas' || !lead || notesFetched) return;
    setNotesLoading(true);
    fetch(`/api/crm-comercial/notes?lead_id=${lead.id}`)
      .then(res => res.json())
      .then(data => {
        setNotes(Array.isArray(data) ? data : []);
        setNotesFetched(true);
      })
      .catch(() => setNotes([]))
      .finally(() => setNotesLoading(false));
  }, [activeTab, lead?.id, notesFetched]);

  // Fetch files when arquivos tab is active
  useEffect(() => {
    if (activeTab !== 'arquivos' || !lead || filesFetched) return;
    setFilesLoading(true);
    fetch(`/api/crm-comercial/files?lead_id=${lead.id}`)
      .then(res => res.json())
      .then(data => {
        setFiles(Array.isArray(data) ? data : []);
        setFilesFetched(true);
      })
      .catch(() => setFiles([]))
      .finally(() => setFilesLoading(false));
  }, [activeTab, lead?.id, filesFetched]);

  const handleFileUpload = async (file: File) => {
    if (!lead) return;
    
    setUploadingFiles(true);
    try {
      // Usando path "projects/crm_comercial" para contornar limitações de firebase.rules locais no Storage
      const storageRef = ref(storage, `projects/crm_comercial/${lead.id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      const newFileObj = {
        lead_id: lead.id,
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
        url: downloadURL,
        sender: currentUserName || currentUserEmail || 'Sistema'
      };

      const resp = await fetch('/api/crm-comercial/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFileObj)
      });
      const savedFile = await resp.json();
      setFiles(prev => [savedFile, ...prev]);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert("Erro ao fazer upload do arquivo.");
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFileUpload(event.target.files[0]);
      // Reset input so the same file could be selected again if needed
      event.target.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileUpload(event.dataTransfer.files[0]);
    }
  };

  const handleDeleteFile = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este arquivo?')) return;
    try {
      await fetch(`/api/crm-comercial/files/${id}`, { method: 'DELETE' });
      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (e) {
      console.error('Error deleting file', e);
    }
  };


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

  const handleCreateMeeting = () => {
    if (!meetingForm.title || !meetingForm.meeting_date) return;
    
    // Atualizar dados de Informações da Reunião no Lead
    ['office_location', 'reunion_niche', 'monthly_closings', 'closing_goal', 'reunion_link'].forEach(f => {
      const val = meetingForm[f as keyof typeof meetingForm] as string;
      if (val !== undefined && val !== (lead as any)[f]) {
        onUpdateLeadField(lead.id, f, val);
      }
    });

    if (meetingForm.meeting_date && meetingForm.meeting_date !== (lead as any).reunion_date) {
      onUpdateLeadField(lead.id, 'reunion_date', meetingForm.meeting_date);
    }
    
    setMeetingsLoading(true);
    fetch('/api/crm-comercial/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: lead.id,
        title: meetingForm.title,
        meeting_date: meetingForm.meeting_date,
        responsible_name: currentUserEmail || 'Sistema',
        notes: meetingForm.notes,
        office_location: meetingForm.office_location,
        reunion_link: meetingForm.reunion_link,
        reunion_niche: meetingForm.reunion_niche,
        monthly_closings: meetingForm.monthly_closings,
        closing_goal: meetingForm.closing_goal
      })
    })
    .then(r => r.json())
    .then(newMeeting => {
      setMeetings(prev => [newMeeting, ...prev].sort((a,b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()));
      setShowMeetingModal(false);
      setMeetingForm({ title: '', meeting_date: new Date().toISOString().slice(0, 16), notes: '', office_location: '', reunion_niche: '', monthly_closings: '', closing_goal: '', reunion_link: '' });
      setMeetingsLoading(false);
    })
    .catch(() => setMeetingsLoading(false));
  };

  const handleNoteClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'IMG') {
      setSelectedImage((e.target as HTMLImageElement).src);
    }
  };

  const handleCreateNote = async () => {
    if (!editorRef.current || !editorRef.current.innerHTML.trim() || editorRef.current.innerHTML === '<br>') return;
    const content = editorRef.current.innerHTML;

    // Use the name directly (same pattern as tasks, meetings, etc.)
    const authorName = currentUserName || currentUserEmail || 'Sistema';

    setNotesLoading(true);
    try {
      const res = await fetch('/api/crm-comercial/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          content: content,
          user_name: authorName
        })
      });
      const newNote = await res.json();
      setNotes(prev => [newNote, ...prev].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      editorRef.current.innerHTML = '';
      setNewNoteContent('');
      setNotesLoading(false);
    } catch (e) {
      setNotesLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64String = event.target?.result as string;
            // Create image element and insert at selection
            const img = document.createElement('img');
            img.src = base64String;
            img.style.maxWidth = '100%';
            img.style.borderRadius = '8px';
            img.style.marginTop = '12px';
            img.style.marginBottom = '12px';
            
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(img);
              
              // Move cursor after the image
              range.setStartAfter(img);
              range.setEndAfter(img);
              selection.removeAllRanges();
              selection.addRange(range);
            } else if (editorRef.current) {
              editorRef.current.appendChild(img);
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const responsavel = users.find(u => u.id === lead.responsavel_id);
  const currentColumn = columns.find(c => c.id === lead.coluna);
  const tabs = ['Atividades', 'Histórico', 'Notas', 'Reuniões', 'Ligações', 'Arquivos'];

  return (
    <>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 modal-overlay" onClick={onClose} />
        
        {/* Modal */}
        <div className="relative w-full max-w-7xl h-[90vh] modal-container overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b modal-divider shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center font-bold text-violet-600 dark:text-violet-400">
                {getInitials(lead.nome)}
              </div>
              <div>
                <h2 className="font-bold text-lg modal-title">{lead.nome}</h2>
                {lead.telefone && <p className="text-xs text-gray-500 dark:text-slate-400">{lead.telefone}</p>}
              </div>
            </div>

            {/* Botão de Ligação (Api4Com) */}
            <button
              title={api4comSettings?.configured && lead.telefone ? 'Ligar para contato' : !lead.telefone ? 'Sem telefone cadastrado' : 'Configure a telefonia primeiro'}
              disabled={!api4comSettings?.configured || !lead.telefone || callingLeadId === lead.id}
              onClick={(e) => { e.stopPropagation(); onCallLead(lead.id, lead.telefone!, lead.nome); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg flex-shrink-0 ${
                api4comSettings?.configured && lead.telefone
                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/20 active:scale-95'
                  : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600 shadow-none cursor-not-allowed'
              }`}
            >
              {callingLeadId === lead.id
                ? <Loader2 size={15} className="animate-spin" />
                : <PhoneCall size={15} />
              }
              Ligar
            </button>
          </div>

          <div className="flex items-center gap-2">

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
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/f/${lead.id}`);
                      alert("Link copiado para a área de transferência!");
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-500/10 text-sm text-gray-700 dark:text-slate-200 transition-colors"
                  >
                    <Copy size={15} className="text-violet-500" />
                    Copiar link do Formulário
                  </button>

                  <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />

                  <button
                    onClick={handleCreateWhatsappGroup}
                    disabled={creatingWhatsapp}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-sm text-gray-700 dark:text-slate-200 transition-colors disabled:opacity-50"
                  >
                    {creatingWhatsapp ? (
                      <span className="w-[15px] h-[15px] border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-emerald-500">
                        <path d="M11.996 0A12 12 0 0 0 0 12c0 2.155.565 4.18 1.554 5.955L.032 23.978l6.166-1.616A11.956 11.956 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 11.996 0zm0 21.995c-1.848 0-3.623-.483-5.228-1.39l-.375-.213-3.882 1.017 1.037-3.784-.233-.37A9.972 9.972 0 0 1 2.006 12C2.006 6.486 6.484 2.005 11.996 2.005c5.512 0 9.99 4.481 9.99 9.995s-4.478 9.995-9.99 9.995zm5.49-7.513c-.301-.151-1.782-.879-2.058-.98-.276-.1-.478-.151-.678.151-.2.301-.78 1.011-.954 1.218-.175.207-.35.232-.651.081-1.391-.689-2.39-1.32-3.328-2.923-.243-.414.24-.396.828-1.572.075-.152.038-.284-.038-.435-.075-.151-.678-1.632-.931-2.235-.245-.584-.492-.505-.678-.514-.175-.01-.377-.01-.577-.01s-.527.075-.803.376c-.276.302-1.055 1.031-1.055 2.513s1.08 2.914 1.231 3.115c.151.202 2.126 3.245 5.147 4.549 1.952.84 2.628.71 3.129.591.688-.163 1.782-.728 2.033-1.433.251-.705.251-1.309.176-1.433-.076-.124-.277-.2-.578-.35z" />
                      </svg>
                    )}
                    Criar grupo do Whatsapp
                  </button>

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
                  {history.length === 0 && comments.length === 0 && callLogs.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-slate-500 text-center py-8">Nenhuma atividade registrada.</p>
                  ) : (
                    (() => {
                      const formatCallDuration = (secs: number) => {
                        if (!secs) return '0:00';
                        const m = Math.floor(secs / 60);
                        const s = secs % 60;
                        return `${m}:${String(s).padStart(2, '0')}`;
                      };
                      const formatRelativeTime = formatCallRelativeTime;
                      const isSuccess = (call: any) => call.hangup_cause === 'NORMAL_CLEARING';

                      const parseDateSafe = (dStr?: string) => {
                        if (!dStr) return 0;
                        const t = new Date(dStr.replace(' ', 'T')).getTime();
                        return isNaN(t) ? 0 : t;
                      };

                      const unifiedItems = [
                        ...history
                          .filter(item => item.action_type !== 'call_initiated' && item.action_type !== 'call_completed')
                          .map(item => ({ ...item, _rawType: 'history', _date: parseDateSafe(item.created_at) })),
                        ...comments.map(c => ({ ...c, _rawType: 'comment', _date: parseDateSafe(c.created_at) })),
                        ...callLogs.map(call => ({ ...call, _rawType: 'call', _date: parseDateSafe(call.started_at || call.created_at) }))
                      ].sort((a, b) => b._date - a._date);

                      return (
                        <>
                          {unifiedItems.map((unifiedItem, index) => {
                            if (unifiedItem._rawType === 'call') {
                              const call = unifiedItem;
                              const success = isSuccess(call);
                              const dotColor = success ? 'bg-emerald-500' : 'bg-red-500';
                              
                              return (
                                <div key={`call-${call.id}`} className="relative pl-6 pb-6 last:pb-0">
                                  {/* Timeline Line */}
                                  {index !== unifiedItems.length - 1 && (
                                    <div className="absolute left-[7px] top-[14px] w-[2px] h-full bg-gray-100 dark:bg-white/5" />
                                  )}
                                  
                                  {/* Timeline Dot */}
                                  <div className={`absolute left-0 top-1 w-[16px] h-[16px] rounded-full border-4 border-white dark:border-[#1A1625] shadow-sm z-10 flex items-center justify-center ${dotColor}`} />
                                  
                                  <div className="bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
                                    <div className="flex items-start gap-3">
                                      <div className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)' }}>
                                        <Phone size={18} style={{ color: '#7c3aed' }} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                          <span className="font-semibold text-[13px] text-gray-800 dark:text-slate-100">Ligação</span>
                                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                            style={{ background: success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: success ? '#059669' : '#dc2626' }}>
                                            {success ? '✓' : '✕'} {getCallTypeLabel(call)}
                                          </span>
                                        </div>
                                        <p className="text-[11px]" style={{ color: '#9ca3af' }}>ORIGEM: GrapeHub CRM</p>

                                        {call.duration > 0 && (
                                          <div className="mt-2 text-[11px] text-gray-400 dark:text-slate-500">
                                            ⏱ Duração: <strong className="text-gray-600 dark:text-slate-400">{formatCallDuration(call.duration)}</strong>
                                          </div>
                                        )}

                                        {call.record_url && (
                                          <div className="mt-2.5 rounded-lg p-1.5 flex items-center gap-2 max-w-[350px]" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                            <audio controls src={call.record_url} className="w-full h-7" style={{ minWidth: 0, flex: 1 }} preload="none" />
                                            <a href={call.record_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-1 rounded hover:bg-purple-50 transition-colors" title="Abrir gravação">
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                            </a>
                                          </div>
                                        )}

                                        <div className="flex items-center gap-1.5 mt-2.5">
                                          <Clock size={11} className="text-gray-400" />
                                          <span className="text-[11px]" style={{ color: '#9ca3af' }}>
                                            {formatRelativeTime(call.started_at)}
                                            {(call.first_name || call.last_name) && <> por <strong className="font-medium text-gray-600 dark:text-slate-400">{[call.first_name, call.last_name].filter(Boolean).join(' ')}</strong></>}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            if (unifiedItem._rawType === 'comment') {
                              const comment = unifiedItem;
                              return (
                                <div key={`comment-${comment.id}`} className="relative pl-6 pb-6 last:pb-0">
                                  {/* Timeline Line */}
                                  {index !== unifiedItems.length - 1 && (
                                    <div className="absolute left-[7px] top-[14px] w-[2px] h-full bg-gray-100 dark:bg-white/5" />
                                  )}
                                  
                                  {/* Timeline Dot */}
                                  <div className="absolute left-0 top-1 w-[16px] h-[16px] rounded-full border-4 border-white dark:border-[#1A1625] shadow-sm z-10 flex items-center justify-center bg-violet-400" />

                                  <div className="bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-violet-600">
                                        {getInitials(comment.user_name)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{comment.user_name || 'Nota'}</span>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] text-gray-400 dark:text-slate-500">{new Date(comment.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            <button onClick={() => onDeleteComment(comment.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30">
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{comment.content}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            // else history
                            const item = unifiedItem;
                            
                            const historyIndex = history.findIndex((h) => h.id === item.id);
                            const nextItem = history[historyIndex + 1];
                            const prevDate = nextItem ? nextItem.created_at : lead.created_at;
                            const duration = formatDuration(prevDate, item.created_at);
                            const isTaskAction = item.action_type?.startsWith('task_');

                            const isNoteAction = item.action_type === 'note_created';
                            const isWhatsappTrigger = item.action_type === 'whatsapp_trigger';

                            // Task/meeting/note-specific events get a different style
                            if (isTaskAction || item.action_type === 'template_applied' || item.action_type === 'meeting_created' || isNoteAction || isWhatsappTrigger) {
                              const iconMap: Record<string, { icon: any; color: string; bg: string }> = {
                                task_created: { icon: <Plus size={10} />, color: 'text-blue-500', bg: 'bg-blue-500' },
                                task_completed: { icon: <Check size={10} />, color: 'text-emerald-500', bg: 'bg-emerald-500' },
                                task_reopened: { icon: <Clock size={10} />, color: 'text-orange-500', bg: 'bg-orange-500' },
                                task_deleted: { icon: <Trash2 size={10} />, color: 'text-red-500', bg: 'bg-red-500' },
                                template_applied: { icon: <FileText size={10} />, color: 'text-violet-500', bg: 'bg-violet-500' },
                                meeting_created: { icon: <Calendar size={10} />, color: 'text-violet-500', bg: 'bg-violet-500' },
                                note_created: { icon: <FileText size={10} />, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500' },
                                whatsapp_trigger: { icon: <Bot size={10} />, color: 'text-emerald-500', bg: 'bg-emerald-500' },
                              };
                              const taskTypeIcons: Record<string, any> = {
                                'Tarefa': <CheckSquare size={14} />,
                                'Ligação': <Phone size={14} />,
                                'WhatsApp': <MessageSquare size={14} />,
                                'Email': <Mail size={14} />,
                                'Reunião': <Users size={14} />,
                                'Lembrete': <Clock size={14} />,
                                'Nota Rica': <FileText size={14} />,
                                'Automação': <Bot size={14} />,
                              };

                              const meta = iconMap[item.action_type] || iconMap.task_created;
                              
                              // Fallback for older records: parse type from description or title content
                              let effectiveTaskType = (item.task_type || '').trim();
                              
                              // Split description to show action and title as badges
                              const descParts = item.description.split(':');
                              let action = descParts[0];
                              let title = descParts[1]?.replace(/"/g, '').trim() || '';

                              // Cleanup old metadata from title if present (e.g., "(Tarefa · Normal)")
                              if (title.includes('(')) {
                                const metaMatch = title.match(/\(([^·]+)·/);
                                if (!effectiveTaskType && metaMatch) effectiveTaskType = metaMatch[1].trim();
                                title = title.split('(')[0].trim();
                              }

                              // Smart icon detection by keyword if still no type
                              const lowerTitle = title.toLowerCase();
                              if (item.action_type === 'meeting_created' && !effectiveTaskType) {
                                effectiveTaskType = 'Reunião';
                              } else if (item.action_type === 'note_created') {
                                effectiveTaskType = 'Nota Rica';
                                title = ''; // Content is rendered in a dedicated box below
                                action = '';
                              } else if (item.action_type === 'whatsapp_trigger') {
                                effectiveTaskType = 'Automação';
                                title = '';
                                action = '';
                              } else if (!effectiveTaskType || effectiveTaskType === 'Tarefa') {
                                 if (lowerTitle.includes('whatsapp') || lowerTitle.includes('wpp')) effectiveTaskType = 'WhatsApp';
                                 else if (lowerTitle.includes('ligar') || lowerTitle.includes('ligação') || lowerTitle.includes('call')) effectiveTaskType = 'Ligação';
                                 else if (lowerTitle.includes('email') || lowerTitle.includes('e-mail')) effectiveTaskType = 'Email';
                                 else if (lowerTitle.includes('reunião') || lowerTitle.includes('meeting')) effectiveTaskType = 'Reunião';
                              }

                              const taskIcon = taskTypeIcons[effectiveTaskType] || taskTypeIcons[effectiveTaskType.charAt(0).toUpperCase() + effectiveTaskType.slice(1)] || taskTypeIcons['Tarefa'];
                              const matchMeeting = item.action_type === 'meeting_created' ? meetings.find(m => m.title === title && m.responsible_name === item.user_name) : null;

                              if (item.action_type === 'meeting_created' && matchMeeting) {
                                const dateObj = new Date(matchMeeting.meeting_date);
                                const mMonth = dateObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
                                const mDay = String(dateObj.getDate()).padStart(2, '0');
                                const uResp = users.find(u => u.email === matchMeeting.responsible_name || u.name === matchMeeting.responsible_name);
                                const getInitials = (n?: string) => n ? n.substring(0, 2).toUpperCase() : '??';

                                return (
                                  <div key={item.id} className="relative pl-6 pb-6 last:pb-0">
                                    {index !== unifiedItems.length - 1 && (
                                      <div className="absolute left-[7px] top-[14px] w-[2px] h-full bg-gray-100 dark:bg-white/5" />
                                    )}
                                    <div className={`absolute left-0 top-[28px] w-[16px] h-[16px] rounded-full bg-violet-500 border-4 border-white dark:border-[#1A1625] shadow-sm z-10`} />
                                    
                                    <div className="w-full max-w-[420px]">
                                      <div className="p-5 rounded-2xl border border-indigo-50 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm hover:shadow-md transition-all relative group w-full">
                                        <div className="flex items-start gap-3.5 mb-4">
                                          <div className="w-[52px] h-[52px] rounded-xl flex flex-col items-center justify-center bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0 shadow-inner mt-0.5">
                                            <span className="text-[9px] font-black tracking-widest">{mMonth}.</span>
                                            <span className="text-lg font-bold leading-none mt-0.5">{mDay}</span>
                                          </div>
                                          <div className="flex-1 min-w-0 pr-1">
                                            <div className="flex items-start justify-between gap-2">
                                              <h4 className="font-extrabold text-gray-800 dark:text-slate-100 text-[13px] leading-tight break-words pr-2">{matchMeeting.title}</h4>
                                              <span className="text-[9px] font-medium text-gray-400 shrink-0 mt-0.5">{dateObj.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric'})} às {dateObj.toLocaleString('pt-BR', { hour:'2-digit', minute:'2-digit'})}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-gray-500 font-medium">
                                              {uResp ? (
                                                <>
                                                  {uResp.picture ? (
                                                    <img src={uResp.picture} alt={uResp.name} className="w-4 h-4 rounded-full object-cover" />
                                                  ) : (
                                                    <div className="w-4 h-4 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 flex items-center justify-center font-bold text-[7px]" title={uResp.name}>
                                                      {getInitials(uResp.name)}
                                                    </div>
                                                  )}
                                                  <span className="truncate max-w-[150px]">{uResp.name || uResp.email}</span>
                                                </>
                                              ) : (
                                                <>
                                                  <Users size={11} className="opacity-70" />
                                                  <span className="truncate max-w-[150px]">{matchMeeting.responsible_name || 'Sistema'}</span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {(matchMeeting.office_location || matchMeeting.reunion_link || matchMeeting.reunion_niche || matchMeeting.monthly_closings || matchMeeting.closing_goal || true) && (
                                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 space-y-3">
                                            <h5 className="text-[10px] font-bold text-gray-500/80 uppercase tracking-widest" style={{ color: '#6b7280' }}>Detalhes:</h5>
                                            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                                              <div><span className="text-gray-400 font-medium block text-[9px] uppercase tracking-wider mb-0.5">Local</span><span className="font-semibold text-gray-700 dark:text-slate-300">{matchMeeting.office_location || '-'}</span></div>
                                              <div><span className="text-gray-400 font-medium block text-[9px] uppercase tracking-wider mb-0.5">Link</span>{matchMeeting.reunion_link ? <a href={matchMeeting.reunion_link.startsWith('http') ? matchMeeting.reunion_link : `https://${matchMeeting.reunion_link}`} target="_blank" rel="noreferrer" className="text-violet-500 hover:text-violet-600 font-semibold hover:underline truncate inline-block max-w-[120px]">{matchMeeting.reunion_link}</a> : <span className="font-semibold text-gray-700 dark:text-slate-300">-</span>}</div>
                                              <div><span className="text-gray-400 font-medium block text-[9px] uppercase tracking-wider mb-0.5">Nicho</span><span className="font-semibold text-gray-700 dark:text-slate-300 truncate max-w-[120px] inline-block">{matchMeeting.reunion_niche || '-'}</span></div>
                                              <div><span className="text-gray-400 font-medium block text-[9px] uppercase tracking-wider mb-0.5">Fechamentos Mês</span><span className="font-semibold text-gray-700 dark:text-slate-300">{matchMeeting.monthly_closings || '-'}</span></div>
                                              <div><span className="text-gray-400 font-medium block text-[9px] uppercase tracking-wider mb-0.5">Meta</span><span className="font-semibold text-gray-700 dark:text-slate-300">{matchMeeting.closing_goal || '-'}</span></div>
                                            </div>
                                          </div>
                                        )}
                              
                                        {matchMeeting.notes && (
                                          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                            <h5 className="text-[10px] font-bold text-gray-500/80 uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Informações da Reunião:</h5>
                                            <ul className="space-y-2">
                                              {matchMeeting.notes.split('\n').filter((l:string) => l.trim().length > 0).map((line:string, i:number) => {
                                                const isCheck = line.trim().startsWith('-');
                                                return (
                                                  <li key={i} className="flex items-start gap-2.5 text-[11px] text-gray-600 dark:text-slate-300">
                                                    {isCheck ? (
                                                      <Check size={14} className="text-emerald-500 shrink-0 mt-0.5 opacity-80" />
                                                    ) : (
                                                      <span className="w-1 h-3 mt-1.5 shrink-0" />
                                                    )}
                                                    <span className="leading-relaxed font-medium" style={{ color: '#4b5563' }}>{line.replace(/^- /, '')}</span>
                                                  </li>
                                                );
                                              })}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                                return (
                                  <div key={item.id} className="relative pl-6 pb-6 last:pb-0">
                                  {index !== unifiedItems.length - 1 && (
                                    <div className="absolute left-[7px] top-[14px] w-[2px] h-full bg-gray-100 dark:bg-white/5" />
                                  )}
                                  {/* Dot */}
                                  <div className={`absolute left-0 top-1 w-[16px] h-[16px] rounded-full ${meta.bg} border-4 border-white dark:border-[#1A1625] shadow-sm z-10`} />
                                  
                                  <div className="bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
                                    <div className="flex items-start gap-3">
                                      <div className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: isWhatsappTrigger ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.12)' }}>
                                        {React.cloneElement(taskIcon as React.ReactElement, { size: 18, style: { color: isWhatsappTrigger ? '#10b981' : '#7c3aed' } })}
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                          <span className="px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wider"
                                            style={{
                                              background: action.includes('Concluída') ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.1)',
                                              color: action.includes('Concluída') ? '#059669' : '#7c3aed'
                                            }}
                                          >
                                            {action.replace('Tarefa ', '').trim()}
                                          </span>
                                          {title && (
                                            <span className="font-semibold text-[13px] text-gray-800 dark:text-slate-100">
                                              {title}
                                            </span>
                                          )}
                                        </div>

                                        <p className="text-[11px]" style={{ color: '#9ca3af' }}>
                                          ORIGEM: {effectiveTaskType || 'Atividade'}
                                        </p>

                                        {item.action_type === 'note_created' && (
                                          <div 
                                            className="mt-3 text-sm text-gray-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none prose-img:cursor-zoom-in hover:prose-img:opacity-90 prose-img:transition-opacity prose-img:rounded-xl border border-gray-100 dark:border-white/5 shadow-sm"
                                            style={{ wordBreak: 'break-word', padding: '14px', background: 'rgba(0,0,0,0.015)', borderRadius: '12px' }}
                                            onClick={handleNoteClick}
                                            dangerouslySetInnerHTML={{ __html: item.description?.replace(/style="[^"]*color:[^"]*"/g, '') || '' }}
                                          />
                                        )}
                                        {item.action_type === 'whatsapp_trigger' && (
                                          <div 
                                            className="mt-3 text-[13px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 shadow-sm flex items-center gap-2"
                                            style={{ wordBreak: 'break-word', padding: '12px 14px', borderRadius: '12px' }}
                                          >
                                            <span className="flex-1">{item.description || 'Gatilho de WhatsApp acionado ✅'}</span>
                                          </div>
                                        )}
                                        
                                        <div className="flex items-center gap-1.5 mt-2.5">
                                          <Clock size={11} className="text-gray-400" />
                                          <span className="text-[11px]" style={{ color: '#9ca3af' }}>
                                            {formatRelativeTime(item.created_at)}
                                            {item.user_name && (() => {
                                              const userMatch = users?.find((u:any) => u.email === item.user_name || u.name === item.user_name);
                                              return <> por <strong className="font-medium text-gray-600 dark:text-slate-400">{userMatch?.name || item.user_name}</strong></>;
                                            })()}
                                          </span>
                                        </div>
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
                                {index !== unifiedItems.length - 1 && (
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
                        </>
                      );
                    })()
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
                <div className="space-y-6 flex-1 flex flex-col overflow-y-auto relative bg-[#F8F9FA] dark:bg-[#15121E]">
                  <div className="flex flex-col py-4 px-6 shrink-0 bg-white dark:bg-white/5 border-b border-gray-100 dark:border-white/10 shadow-sm z-20 sticky top-0">
                    <h3 className="font-bold text-gray-700 dark:text-white uppercase text-[11px] tracking-wider mb-3">Editor de Notas Rico</h3>
                    <div className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-inner flex flex-col">
                      <div className="flex gap-2 p-2 bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs text-gray-500 items-center justify-between">
                        <span className="font-medium px-2">Suporta Colagem de Imagens (Ctrl+V)</span>
                        <button
                           onClick={handleCreateNote}
                           disabled={notesLoading}
                           className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-violet-500/20 disabled:opacity-50"
                        >
                           {notesLoading ? <Loader2 size={14} className="animate-spin" /> : 'Salvar Nota'}
                        </button>
                      </div>
                      <div 
                        ref={editorRef}
                        contentEditable
                        onPaste={handlePaste}
                        className="p-4 min-h-[120px] max-h-[300px] overflow-y-auto outline-none text-sm text-gray-700 dark:text-slate-200"
                        style={{ cursor: 'text' }}
                        onInput={(e) => {
                          if (e.currentTarget.innerHTML === '<br>') e.currentTarget.innerHTML = '';
                        }}
                      />
                    </div>
                  </div>

                  <div className="relative flex-1 p-6 z-10 w-full max-w-4xl mx-auto pb-16">
                    {notesLoading && notes.length === 0 ? (
                      <div className="flex flex-col justify-center items-center mt-12 text-gray-400">
                         <Loader2 size={32} className="animate-spin text-violet-500 mb-2" />
                         <span className="text-sm">Carregando anotações...</span>
                      </div>
                    ) : notes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
                        <FileText size={36} className="mb-3 opacity-30" />
                        <p className="text-sm font-medium">Nenhuma nota registrada</p>
                        <p className="text-xs mt-1 opacity-60">Use o editor acima para criar a primeira anotação</p>
                      </div>
                    ) : (
                      <>
                        <div className="absolute left-1/2 top-4 bottom-4 w-[2px] bg-indigo-50/50 dark:bg-white/5 -translate-x-1/2" />
                        
                        <div className="space-y-16 relative">
                          {notes.map((n, idx) => {
                            const isLeft = idx % 2 === 0;
                            const dateObj = new Date(n.created_at || new Date());
                            const nMonth = dateObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
                            const nDay = String(dateObj.getDate()).padStart(2, '0');
                            const uResp = users.find(u => u.name === n.user_name);
                            const getInitials = (num?: string) => num ? num.substring(0, 2).toUpperCase() : '??';

                            return (
                              <div key={n.id || idx} className={`flex items-start w-full relative ${isLeft ? 'justify-start' : 'justify-end'}`}>
                                <div className="absolute left-1/2 top-[34px] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-[3px] border-white dark:border-[#15121E] bg-violet-50 dark:bg-violet-500/20 flex items-center justify-center z-10 shadow-sm">
                                  <FileText size={14} className="text-violet-500" />
                                </div>
                                
                                <div className="w-[45%]">
                                  <div className={`p-5 rounded-2xl border border-indigo-50 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm hover:shadow-md transition-all relative group
                                      ${isLeft ? 'mr-auto' : 'ml-auto'}`}>
                                    
                                    <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-white/5 pb-3">
                                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                                        {uResp ? (
                                          <>
                                            {uResp.picture ? (
                                              <img src={uResp.picture} alt={uResp.name} className="w-5 h-5 rounded-full object-cover" />
                                            ) : (
                                              <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 flex items-center justify-center font-bold text-[8px]" title={uResp.name}>
                                                {getInitials(uResp.name)}
                                              </div>
                                            )}
                                            <span className="truncate max-w-[150px] font-bold text-gray-700 dark:text-slate-300">{uResp.name || uResp.email}</span>
                                          </>
                                        ) : (
                                          <>
                                            <Users size={12} className="opacity-70" />
                                            <span className="truncate max-w-[150px] font-bold text-gray-700 dark:text-slate-300">{n.user_name || 'Sistema'}</span>
                                          </>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-bold text-gray-400">
                                        {!isNaN(dateObj.getTime()) ? `${dateObj.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric'})} às ${dateObj.toLocaleString('pt-BR', { hour:'2-digit', minute:'2-digit'})}` : 'Agora mesmo'}
                                      </span>
                                    </div>
                                    
                                    <div 
                                      className="mt-2 text-sm text-gray-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none prose-img:cursor-zoom-in hover:prose-img:opacity-90 prose-img:transition-opacity prose-img:rounded-xl"
                                      style={{ wordBreak: 'break-word' }}
                                      onClick={handleNoteClick}
                                      dangerouslySetInnerHTML={{ __html: n.content?.replace(/style="[^"]*color:[^"]*"/g, '') || '' }}
                                    />
                                    
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'reuniões' && (
                <div className="space-y-6 flex-1 flex flex-col overflow-y-auto relative bg-[#F8F9FA] dark:bg-[#15121E]">
                  <div className="flex items-center justify-between py-4 px-6 shrink-0 bg-white dark:bg-white/5 border-b border-gray-100 dark:border-white/10 shadow-sm z-20 sticky top-0">
                    <h3 className="font-bold text-gray-700 dark:text-white uppercase text-[11px] tracking-wider">Histórico de Reuniões</h3>
                    <button 
                      onClick={() => {
                        setMeetingForm(p => ({
                          ...p,
                          meeting_date: (lead as any).reunion_date || new Date().toISOString().slice(0, 16),
                          office_location: (lead as any).office_location || '',
                          reunion_niche: (lead as any).reunion_niche || '',
                          monthly_closings: (lead as any).monthly_closings || '',
                          closing_goal: (lead as any).closing_goal || '',
                          reunion_link: (lead as any).reunion_link || ''
                        }));
                        setShowMeetingModal(true);
                      }}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-violet-500/20 flex items-center gap-2">
                      <Plus size={15} /> Adicionar Reunião
                    </button>
                  </div>

                  <div className="relative flex-1 p-6 z-10 w-full max-w-4xl mx-auto pb-16">
                    {meetingsLoading ? (
                      <div className="flex flex-col justify-center items-center mt-12 text-gray-400">
                         <Loader2 size={32} className="animate-spin text-violet-500 mb-2" />
                         <span className="text-sm">Carregando reuniões...</span>
                      </div>
                    ) : meetings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
                        <Users size={36} className="mb-3 opacity-30" />
                        <p className="text-sm font-medium">Nenhuma reunião registrada</p>
                        <p className="text-xs mt-1 opacity-60">As marcações ficarão registradas no nosso histórico vertical</p>
                      </div>
                    ) : (
                      <>
                        <div className="absolute left-1/2 top-4 bottom-4 w-[2px] bg-indigo-50/50 dark:bg-white/5 -translate-x-1/2" />
                        
                        <div className="space-y-16 relative">
                          {meetings.map((m, idx) => {
                            const isLeft = idx % 2 === 0;
                            const dateObj = new Date(m.meeting_date);
                            const mMonth = dateObj.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
                            const mDay = String(dateObj.getDate()).padStart(2, '0');
                            const notesLines = (m.notes || '').split('\n').filter((l:string) => l.trim().length > 0);
                            const uResp = users.find(u => u.email === m.responsible_name || u.name === m.responsible_name);
                            const getInitials = (n?: string) => n ? n.substring(0, 2).toUpperCase() : '??';

                            return (
                              <div key={m.id || idx} className={`flex items-start w-full relative ${isLeft ? 'justify-start' : 'justify-end'}`}>
                                <div className="absolute left-1/2 top-[34px] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-[3px] border-white dark:border-[#15121E] bg-violet-50 dark:bg-violet-500/20 flex items-center justify-center z-10 shadow-sm">
                                  <Check size={14} className="text-violet-500" />
                                </div>
                                
                                <div className="w-[45%]">
                                  <div className={`p-5 rounded-2xl border border-indigo-50 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm hover:shadow-md transition-all relative group
                                      ${isLeft ? 'mr-auto' : 'ml-auto'}`}>
                                    
                                    <div className="flex items-start gap-3.5 mb-4">
                                      <div className="w-[52px] h-[52px] rounded-xl flex flex-col items-center justify-center bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0 shadow-inner mt-0.5">
                                        <span className="text-[9px] font-black tracking-widest">{mMonth}.</span>
                                        <span className="text-lg font-bold leading-none mt-0.5">{mDay}</span>
                                      </div>
                                      
                                      <div className="flex-1 min-w-0 pr-1">
                                        <div className="flex items-start justify-between gap-2">
                                          <h4 className="font-extrabold text-gray-800 dark:text-slate-100 text-[13px] leading-tight break-words pr-2">{m.title}</h4>
                                          <span className="text-[9px] font-medium text-gray-400 shrink-0 mt-0.5">{dateObj.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric'})} às {dateObj.toLocaleString('pt-BR', { hour:'2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-gray-500 font-medium">
                                          {uResp ? (
                                            <>
                                              {uResp.picture ? (
                                                <img src={uResp.picture} alt={uResp.name} className="w-4 h-4 rounded-full object-cover" />
                                              ) : (
                                                <div className="w-4 h-4 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-600 flex items-center justify-center font-bold text-[7px]" title={uResp.name}>
                                                  {getInitials(uResp.name)}
                                                </div>
                                              )}
                                              <span className="truncate max-w-[150px]">{uResp.name || uResp.email}</span>
                                            </>
                                          ) : (
                                            <>
                                              <Users size={11} className="opacity-70" />
                                              <span className="truncate max-w-[150px]">{m.responsible_name || 'Sistema'}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {(m.office_location || m.reunion_link || m.reunion_niche || m.monthly_closings || m.closing_goal || true) && (
                                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 space-y-3">
                                        <h5 className="text-[10px] font-bold text-gray-500/80 uppercase tracking-widest" style={{ color: '#6b7280' }}>Detalhes:</h5>
                                        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                                          <div><span className="text-gray-400 font-medium block text-[9px] uppercase tracking-wider mb-0.5">Local</span><span className="font-semibold text-gray-700 dark:text-slate-300">{m.office_location || '-'}</span></div>
                                          <div><span className="text-gray-400 font-medium block text-[9px] uppercase tracking-wider mb-0.5">Link</span>{m.reunion_link ? <a href={m.reunion_link.startsWith('http') ? m.reunion_link : `https://${m.reunion_link}`} target="_blank" rel="noreferrer" className="text-violet-500 hover:text-violet-600 font-semibold hover:underline truncate inline-block max-w-[120px]">{m.reunion_link}</a> : <span className="font-semibold text-gray-700 dark:text-slate-300">-</span>}</div>
                                          <div><span className="text-gray-400 font-medium block text-[9px] uppercase tracking-wider mb-0.5">Nicho</span><span className="font-semibold text-gray-700 dark:text-slate-300 truncate max-w-[120px] inline-block">{m.reunion_niche || '-'}</span></div>
                                          <div><span className="text-gray-400 font-medium block text-[9px] uppercase tracking-wider mb-0.5">Fechamentos Mês</span><span className="font-semibold text-gray-700 dark:text-slate-300">{m.monthly_closings || '-'}</span></div>
                                          <div><span className="text-gray-400 font-medium block text-[9px] uppercase tracking-wider mb-0.5">Meta</span><span className="font-semibold text-gray-700 dark:text-slate-300">{m.closing_goal || '-'}</span></div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {(notesLines.length > 0) && (
                                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                        <h5 className="text-[10px] font-bold text-gray-500/80 uppercase tracking-widest mb-3" style={{ color: '#6b7280' }}>Informações da Reunião:</h5>
                                        <ul className="space-y-2">
                                          {notesLines.map((line:string, i:number) => {
                                            const isCheck = line.trim().startsWith('-');
                                            return (
                                              <li key={i} className="flex items-start gap-2.5 text-[11px] text-gray-600 dark:text-slate-300">
                                                {isCheck ? (
                                                  <Check size={14} className="text-emerald-500 shrink-0 mt-0.5 opacity-80" />
                                                ) : (
                                                  <span className="w-1 h-3 mt-1.5 shrink-0" />
                                                )}
                                                <span className="leading-relaxed font-medium" style={{ color: '#4b5563' }}>{line.replace(/^- /, '')}</span>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'ligações' && (() => {
                const formatCallDuration = (secs: number) => {
                  if (!secs) return '0:00';
                  const m = Math.floor(secs / 60);
                  const s = secs % 60;
                  return `${m}:${String(s).padStart(2, '0')}`;
                };
                const formatRelativeTime = formatCallRelativeTime;
                const isSuccess = (call: any) => call.hangup_cause === 'NORMAL_CLEARING';

                return (
                  <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Histórico de ligações</p>
                      <button onClick={() => setCallLogsFetched(false)} className="text-xs text-purple-500 hover:text-purple-400 flex items-center gap-1 transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                        Atualizar
                      </button>
                    </div>
                    {callLogsLoading && (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-sm">Carregando ligações...</p>
                      </div>
                    )}
                    {!callLogsLoading && callLogsFetched && callLogs.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-slate-500">
                        <Phone size={36} className="mb-3 opacity-30" />
                        <p className="text-sm font-medium">Nenhuma ligação encontrada</p>
                        <p className="text-xs mt-1 opacity-60">As ligações aparecerão aqui após serem realizadas</p>
                      </div>
                    )}
                    {!callLogsLoading && callLogs.map((call: any, index: number) => {
                      const success = isSuccess(call);
                      const dotColor = success ? 'bg-emerald-500' : 'bg-red-500';
                      
                      return (
                        <div key={call.id} className="relative pl-6 pb-6 last:pb-0">
                          {/* Timeline Line */}
                          {index !== callLogs.length - 1 && (
                            <div className="absolute left-[7px] top-[14px] w-[2px] h-full bg-gray-100 dark:bg-white/5" />
                          )}
                          
                          {/* Timeline Dot */}
                          <div className={`absolute left-0 top-1 w-[16px] h-[16px] rounded-full border-4 border-white dark:border-[#1A1625] shadow-sm z-10 flex items-center justify-center ${dotColor}`} />
                          
                          <div className="bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.12)' }}>
                                <Phone size={18} style={{ color: '#7c3aed' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="font-semibold text-[13px] text-gray-800 dark:text-slate-100">Ligação</span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                    style={{ background: success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: success ? '#059669' : '#dc2626' }}>
                                    {success ? '✓' : '✕'} {getCallTypeLabel(call)}
                                  </span>
                                </div>
                                <p className="text-[11px]" style={{ color: '#9ca3af' }}>ORIGEM: GrapeHub CRM</p>

                                {call.duration > 0 && (
                                  <div className="mt-2 text-[11px] text-gray-400 dark:text-slate-500">
                                    ⏱ Duração: <strong className="text-gray-600 dark:text-slate-400">{formatCallDuration(call.duration)}</strong>
                                  </div>
                                )}

                                {call.record_url && (
                                  <div className="mt-2.5 rounded-lg p-1.5 flex items-center gap-2 max-w-[350px]" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                    <audio controls src={call.record_url} className="w-full h-7" style={{ minWidth: 0, flex: 1 }} preload="none" />
                                    <a href={call.record_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-1 rounded hover:bg-purple-50 transition-colors" title="Abrir gravação">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                    </a>
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5 mt-2.5">
                                  <Clock size={11} className="text-gray-400" />
                                  <span className="text-[11px]" style={{ color: '#9ca3af' }}>
                                    {formatRelativeTime(call.started_at)}
                                    {(call.first_name || call.last_name) && <> por <strong className="font-medium text-gray-600 dark:text-slate-400">{[call.first_name, call.last_name].filter(Boolean).join(' ')}</strong></>}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  </div>
                );
              })()}
              {activeTab === 'arquivos' && (
                <div className="p-6 space-y-6 flex-1 flex flex-col font-sans">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100">Documentos e Arquivos</h3>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFiles}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-slate-200 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                    >
                      {uploadingFiles ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {uploadingFiles ? 'Enviando...' : 'Fazer Upload'}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </div>

                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-2xl p-8 text-center bg-gray-50 dark:bg-white/5 backdrop-blur-md cursor-pointer hover:border-violet-500 transition-all relative overflow-hidden"
                  >
                    <div className="flex flex-col items-center gap-3 relative z-10">
                      <div className="p-3 bg-white/50 dark:bg-white/5 rounded-full border border-gray-200 dark:border-white/10 shadow-sm">
                        <Folder size={24} className="text-gray-400 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-700 dark:text-slate-200">Clique ou arraste arquivos para cá</p>
                        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Suporta PDF, DOCX, XLSX, imagens e vídeos (Máx 50MB)</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden relative">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                        <tr>
                          <th className="px-6 py-4">Nome do Arquivo</th>
                          <th className="px-6 py-4">Data</th>
                          <th className="px-6 py-4">Tamanho</th>
                          <th className="px-6 py-4">Enviado por</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-white/10 text-gray-700 dark:text-slate-200">
                        {filesLoading && files.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Carregando arquivos...</td>
                          </tr>
                        ) : files.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">Nenhum arquivo enviado.</td>
                          </tr>
                        ) : (
                          files.map((file: any) => (
                            <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 flex items-center gap-3 font-bold max-w-[200px] truncate">
                                <File size={16} className="text-violet-500 flex-shrink-0" />
                                <span className="truncate" title={file.name}>{file.name}</span>
                              </td>
                              <td className="px-6 py-4 text-gray-500 dark:text-slate-400">{new Date(file.created_at).toLocaleDateString('pt-BR')}</td>
                              <td className="px-6 py-4 text-gray-500 dark:text-slate-400">{file.size || '-'}</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider bg-violet-500/10 text-violet-500">
                                  {(() => {
                                    if (file.sender === 'Agência') return currentUserName || 'Sistema';
                                    const userMatch = users?.find((u:any) => u.email === file.sender || u.name === file.sender);
                                    return userMatch?.name || file.sender || 'Sistema';
                                  })()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-3 text-gray-400">
                                  <button onClick={() => window.open(file.url, '_blank')} className="hover:text-violet-500 transition-colors" title="Visualizar"><Eye size={16} /></button>
                                  <button onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = file.url;
                                    a.download = file.name;
                                    a.target = '_blank';
                                    a.click();
                                  }} className="hover:text-violet-500 transition-colors" title="Baixar"><Download size={16} /></button>
                                  <button onClick={() => handleDeleteFile(file.id)} className="hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
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
                  Formulário
                </h4>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${sectionsOpen.meeting ? 'rotate-180' : ''}`} />
              </div>
              
              {sectionsOpen.meeting && (
                <div className="space-y-3">
                  {[
                    { label: 'Nome Completo', field: 'form_nome_completo', type: 'text' },
                    { label: 'Nome Fantasia', field: 'form_nome_fantasia', type: 'text' },
                    { label: 'Telefone (Whatsapp)', field: 'form_telefone_whatsapp', type: 'text' },
                    { label: 'CEP', field: 'form_cep', type: 'text' },
                    { label: 'Cidade', field: 'form_cidade', type: 'text' },
                    { label: 'Estado', field: 'form_estado', type: 'text' },
                  ].map(({ label, field, type }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500 dark:text-slate-400 shrink-0 min-w-max">{label}</span>
                      <input 
                        type={type}
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
{/* Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMeetingModal(false)} />
          <div className="bg-white dark:bg-[#1A1625] rounded-3xl w-full max-w-lg p-6 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Adicionar Reunião</h3>
                <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Registre na timeline do lead</p>
              </div>
              <button onClick={() => setShowMeetingModal(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-2 block">Título da Reunião</label>
                  <input
                    type="text"
                    value={meetingForm.title}
                    onChange={e => setMeetingForm(p => ({...p, title: e.target.value}))}
                    placeholder="Ex: Reunião de alinhamento estratégico..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-medium text-sm text-gray-800 dark:text-slate-200 placeholder-gray-400"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-2 block">Data e Hora</label>
                  <input
                    type="datetime-local"
                    value={meetingForm.meeting_date}
                    onChange={e => setMeetingForm(p => ({...p, meeting_date: e.target.value}))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-medium text-sm text-gray-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-2 block">Local do escritório</label>
                  <input
                    type="text"
                    value={meetingForm.office_location}
                    onChange={e => setMeetingForm(p => ({...p, office_location: e.target.value}))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-medium text-sm text-gray-800 dark:text-slate-200"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-2 block">Link da reunião</label>
                  <input
                    type="text"
                    value={meetingForm.reunion_link}
                    onChange={e => setMeetingForm(p => ({...p, reunion_link: e.target.value}))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-medium text-sm text-gray-800 dark:text-slate-200"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-2 block">Nicho de atuação</label>
                  <input
                    type="text"
                    value={meetingForm.reunion_niche}
                    onChange={e => setMeetingForm(p => ({...p, reunion_niche: e.target.value}))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-medium text-sm text-gray-800 dark:text-slate-200"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-2 block">Fechamentos mês</label>
                  <input
                    type="text"
                    value={meetingForm.monthly_closings}
                    onChange={e => setMeetingForm(p => ({...p, monthly_closings: e.target.value}))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-medium text-sm text-gray-800 dark:text-slate-200"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-2 block">Meta de fechamentos</label>
                  <input
                    type="text"
                    value={meetingForm.closing_goal}
                    onChange={e => setMeetingForm(p => ({...p, closing_goal: e.target.value}))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-medium text-sm text-gray-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Próximas Ações / Acordos</span>
                  <span className="text-[9px] font-medium text-violet-500 lowercase opacity-70">Use - pra marcações</span>
                </label>
                <textarea
                  value={meetingForm.notes}
                  onChange={e => setMeetingForm(p => ({...p, notes: e.target.value}))}
                  placeholder="Dica: Registre aqui os detalhes...&#10;&#10;- Primeiro ponto acordado&#10;- Segundo item de ação"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-medium text-sm resize-none text-gray-800 dark:text-slate-200 placeholder-gray-400"
                />
              </div>

              <button 
                 onClick={handleCreateMeeting}
                 disabled={!meetingForm.title || !meetingForm.meeting_date || meetingsLoading}
                 className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold mt-2 transition-all active:scale-[0.98] shadow-xl shadow-violet-500/20 disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2">
                {meetingsLoading ? <Loader2 size={18} className="animate-spin" /> : 'Salvar Reunião'}
              </button>
            </div>
          </div>
        </div>
      )}      {/* Image Viewer Popup */}
      {selectedImage && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center">
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/50 rounded-full transition-colors backdrop-blur-md"
            >
              <X size={24} />
            </button>
            <img 
              src={selectedImage} 
              alt="Visualização" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </div>
    </>
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
  const [webhookRegistering, setWebhookRegistering] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{success?: boolean; webhookUrl?: string; error?: string} | null>(null);
  const [crmWebhookSettings, setCrmWebhookSettings] = useState<any>({ form_webhook_url: '', whatsapp_webhook_url: '', inbound_token: '', inbound_kanban_id: '', inbound_coluna: '' });
  const [savingWebhookSettings, setSavingWebhookSettings] = useState(false);
  const [showWebhookConfig, setShowWebhookConfig] = useState<'form' | 'whatsapp' | 'inbound' | null>(null);
  const [inboundColumns, setInboundColumns] = useState<any[]>([]);
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
    if (crmWebhookSettings?.inbound_kanban_id) {
       fetch(`/api/crm-comercial/columns?kanban_id=${crmWebhookSettings.inbound_kanban_id}`)
         .then(r => r.json())
         .then(setInboundColumns)
         .catch(() => setInboundColumns([]));
    } else {
       setInboundColumns([]);
    }
  }, [crmWebhookSettings?.inbound_kanban_id]);

  useEffect(() => {
    if (user?.email) {
      fetchData();
      
      // Fetch CRM Webhook settings
      fetch(`/api/crm/settings/webhooks?user_id=${encodeURIComponent(user.email)}`)
        .then(r => r.json())
        .then(data => setCrmWebhookSettings(data))
        .catch(e => console.error(e));

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

            // 🔑 Auto-register SIP using DB credentials directly
            if (form.sip_extension && form.sip_password && form.api4com_domain) {
              let sipServer = form.sip_server
                ? (form.sip_server.startsWith('wss://') || form.sip_server.startsWith('ws://') ? form.sip_server : `wss://${form.sip_server}`)
                : `wss://${form.api4com_domain}:6443`;
              if (!sipServer.includes(':6443') && !sipServer.includes(':8089') && !sipServer.includes('/ws')) {
                sipServer = sipServer.replace(/\/$/, '') + ':6443';
              }
              console.log('[Softphone] Auto-registering from DB settings, WSS:', sipServer);
              softphone.register({
                extension: form.sip_extension,
                password: form.sip_password,
                domain: form.api4com_domain,
                sipServer
              });
            }
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
        // Api4Com requires port 6443 for WSS connections
        let sipServer = sip_server
          ? (sip_server.startsWith('wss://') || sip_server.startsWith('ws://') ? sip_server : `wss://${sip_server}`)
          : `wss://${api4com_domain}:6443`;
        // If user typed the bare domain without port, add :6443
        if (!sipServer.includes(':6443') && !sipServer.includes(':8089') && !sipServer.includes('/ws')) {
          sipServer = sipServer.replace(/\/$/, '') + ':6443';
        }
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

    console.log('[CRM] handleCallLead chamado:', { phone, leadName, leadId, userId: user.email, sipStatus: softphone.sipStatus });

    // Usa o fluxo correto da Api4Com:
    // 1. Chamamos a REST API do Dialer
    // 2. Api4Com liga para nosso ramal via SIP (com X-Api4comintegratedcall: true)
    // 3. O browser auto-atende via WebRTC
    // 4. Api4Com conecta ao cliente
    softphone.initiateDialerCall(phone, leadName || phone, leadId, user.email);
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


  const handleRegisterWebhook = async () => {
    if (!user?.email) {
      setWebhookResult({ error: 'Usuário não identificado — faça login novamente' });
      return;
    }
    setWebhookRegistering(true);
    setWebhookResult(null);
    try {
      const res = await fetch('/api/api4com/register-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.email })
      });
      const data = await res.json();
      if (data.success) {
        setWebhookResult({ success: true, webhookUrl: data.webhookUrl });
      } else {
        // Show the detail from the server if available
        const detail = data.detail ? ` (${JSON.stringify(data.detail).slice(0, 120)})` : '';
        setWebhookResult({ error: (data.error || 'Falha ao registrar') + detail });
      }
    } catch (e) {
      setWebhookResult({ error: `Erro de conexão: ${String(e)}` });
    } finally {
      setWebhookRegistering(false);
    }
  };

  const handleSaveWebhookSettings = async () => {
    if (!user?.email) return;
    setSavingWebhookSettings(true);
    try {
      const res = await fetch('/api/crm/settings/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.email, ...crmWebhookSettings })
      });
      if (res.ok) {
        setShowWebhookConfig(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingWebhookSettings(false);
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
          let sipServer = settingsForm.sip_server
            ? (settingsForm.sip_server.startsWith('wss://') || settingsForm.sip_server.startsWith('ws://') ? settingsForm.sip_server : `wss://${settingsForm.sip_server}`)
            : `wss://${settingsForm.api4com_domain}:6443`;
          if (!sipServer.includes(':6443') && !sipServer.includes(':8089') && !sipServer.includes('/ws')) {
            sipServer = sipServer.replace(/\/$/, '') + ':6443';
          }
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

          <button
            title={`Configurações do CRM e Telefonia — Ramal: ${
              softphone.sipStatus === 'registered' ? '✓ Registrado' :
              softphone.sipStatus === 'connecting' ? 'Conectando...' :
              softphone.sipStatus === 'error' ? '✗ Falha no registro' : 'Não conectado'
            }`}
            onClick={() => { setTestResult(null); setSettingsTab('telefonia'); fetchLossReasons(); setIsTelefonySettingsOpen(true); }}
            className="relative flex items-center justify-center w-[38px] h-[38px] flex-shrink-0 bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm"
          >
            <Settings size={18} />
            {/* SIP status dot */}
            <span className="absolute -top-[3px] -right-[3px] w-2.5 h-2.5 rounded-full border border-white dark:border-[#0d0b14]" style={{
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
          currentUserEmail={user?.email}
          currentUserName={user?.name}
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

      {/* ━━━━━━ SOFTPHONE POPUP (WebRTC + Dialer Hybrid) ━━━━━━ */}
      <AnimatePresence>
        {/* === WAITING / ERROR state — from the hook's currentCall (pre-answer) === */}
        {softphone.currentCall && (softphone.currentCall.status === 'calling' || softphone.currentCall.status === 'failed') && !softphone.currentCall.startedAt && (() => {
          const call = softphone.currentCall!;
          const isError = call.status === 'failed';
          const initials = (call.leadName || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
          const accentColor = isError ? '#ef4444' : '#a78bfa';

          return (
            <motion.div
              key="softphone-waiting"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              className="fixed bottom-6 right-6 z-[100000] w-72 rounded-3xl overflow-hidden"
              style={{
                background: isError
                  ? 'linear-gradient(135deg, #1c0a0a 0%, #0d0b14 60%)'
                  : 'linear-gradient(135deg, #1a1230 0%, #0d0b14 60%)',
                border: `1px solid ${accentColor}22`,
                boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${accentColor}15`
              }}
            >
              <div className="relative flex flex-col items-center pt-8 pb-4 px-6">
                {/* Pulsing rings while calling */}
                {!isError && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: '20px' }}>
                    <span className="absolute w-24 h-24 rounded-full animate-ping" style={{ background: `${accentColor}15`, animationDuration: '1.5s' }} />
                    <span className="absolute w-32 h-32 rounded-full animate-ping" style={{ background: `${accentColor}08`, animationDuration: '1.5s', animationDelay: '0.5s' }} />
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
                <p className="text-white font-bold text-lg text-center truncate w-full">{call.leadName}</p>
                <p className="text-sm font-mono mt-0.5 mb-3" style={{ color: '#6b7280' }}>{call.phone}</p>

                {!isError && (
                  <div className="flex flex-col items-center gap-1.5 mb-2 w-full">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accentColor }} />
                      <p className="text-sm font-semibold" style={{ color: accentColor }}>
                        {call.status === 'calling' ? 'Chamando via Api4Com...' : 'Aguardando atender...'}
                      </p>
                    </div>
                    <p className="text-xs text-center" style={{ color: '#4b5563' }}>
                      {call.status === 'calling'
                        ? 'Api4Com vai ligar para o seu browser em instantes'
                        : 'Telefone do cliente está tocando'}
                    </p>
                  </div>
                )}

                {isError && (
                  <div className="rounded-xl px-3 py-2.5 w-full" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <p className="text-xs text-red-400 font-semibold">✗ {call.errorMsg || 'Falha na chamada'}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-4 pb-8 px-6">
                {isError ? (
                  <>
                    <button
                      onClick={() => call.phone && handleCallLead('retry', call.phone, call.leadName)}
                      className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all"
                      style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}
                    >
                      Tentar novamente
                    </button>
                    <button
                      onClick={() => softphone.hangUp()}
                      className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280' }}
                    >
                      Fechar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => softphone.hangUp()}
                    title="Cancelar"
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 8px 30px rgba(220,38,38,0.5)', color: '#fff' }}
                  >
                    <Phone size={24} style={{ transform: 'rotate(135deg)' }} />
                  </button>
                )}
              </div>
              <p className="text-center pb-4 text-xs" style={{ color: '#374151' }}>
                🎙 Ramal {settingsForm.sip_extension} · WebRTC
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
              className="w-full rounded-xl overflow-hidden flex flex-col bg-white dark:bg-[#13111a] border border-gray-200 dark:border-[#2d2b3d]"
              style={{ maxWidth: 560, maxHeight: '90vh' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-gray-200 dark:border-[#2d2b3d]">
                <h2 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                  <Settings size={18} className="text-violet-500" /> Configurações do CRM
                </h2>
                <button onClick={() => setIsTelefonySettingsOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 px-4 pt-3 shrink-0 border-b border-gray-200 dark:border-[#2d2b3d]">
                {([
                  { key: 'telefonia', label: 'Telefonia' },
                  { key: 'webhook', label: 'Webhook' },
                  { key: 'sequencias', label: 'Sequências' },
                  { key: 'motivos-perda', label: 'Motivos de Perda' },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSettingsTab(tab.key)}
                    className={`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                      settingsTab === tab.key
                        ? 'border-violet-600 text-violet-600 dark:border-violet-500 dark:text-violet-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="overflow-y-auto flex-1 p-6 space-y-6">

                {/* ── TELEFONIA ── */}
                {settingsTab === 'telefonia' && (<>
                  {/* SIP Status Banner — sempre visível */}
                  <div className="rounded-xl p-4" style={{
                    background: softphone.sipStatus === 'registered' ? 'rgba(34,197,94,0.08)' :
                                softphone.sipStatus === 'connecting' ? 'rgba(245,158,11,0.08)' :
                                softphone.sipStatus === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${
                      softphone.sipStatus === 'registered' ? 'rgba(34,197,94,0.25)' :
                      softphone.sipStatus === 'connecting' ? 'rgba(245,158,11,0.25)' :
                      softphone.sipStatus === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'
                    }`
                  }}>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{
                        background: softphone.sipStatus === 'registered' ? '#22c55e' :
                                    softphone.sipStatus === 'connecting' ? '#f59e0b' :
                                    softphone.sipStatus === 'error' ? '#ef4444' : '#374151',
                        boxShadow: softphone.sipStatus === 'registered' ? '0 0 8px #22c55e' :
                                   softphone.sipStatus === 'connecting' ? '0 0 8px #f59e0b' : 'none'
                      }} />
                      <div>
                        <p className="text-sm font-bold" style={{
                          color: softphone.sipStatus === 'registered' ? '#22c55e' :
                                 softphone.sipStatus === 'connecting' ? '#f59e0b' :
                                 softphone.sipStatus === 'error' ? '#ef4444' : '#9ca3af'
                        }}>
                          {softphone.sipStatus === 'registered' ? '✓ Softphone conectado — pronto para ligar' :
                           softphone.sipStatus === 'connecting' ? '⏳ Conectando ao servidor SIP...' :
                           softphone.sipStatus === 'error' ? '✗ Falha na conexão SIP' : '● Softphone desconectado'}
                        </p>
                        {softphone.sipStatus === 'error' && softphone.registrationError && (
                          <p className="text-xs mt-1" style={{ color: '#f87171' }}>{softphone.registrationError}</p>
                        )}
                        {softphone.sipStatus === 'idle' && (
                          <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Salve as configurações abaixo para conectar</p>
                        )}
                        {softphone.sipStatus === 'registered' && (
                          <p className="text-xs mt-1" style={{ color: '#4ade80' }}>Ramal {settingsForm.sip_extension} · Clique em 📞 em qualquer lead para ligar pelo browser</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#6b7280' }}>Credenciais da Conta</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs mb-1.5 text-gray-500 dark:text-[#9ca3af]">Token de Acesso (permanente)</label>
                        <input type="password" autoComplete="off" value={settingsForm.api4com_token} onChange={e => setSettingsForm(f => ({ ...f, api4com_token: e.target.value }))} placeholder="YggyHfrLEHAWmKiUFb..."
                          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all text-gray-900 bg-gray-50 border border-gray-200 focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 dark:text-white dark:bg-[#0d0b14] dark:border-[#2d2b3d] dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
                        />
                        <p className="text-xs mt-1 text-gray-500 dark:text-[#6b7280]">Token com ttl: -1 gerado na Api4Com. Nunca expira.</p>
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5 text-gray-500 dark:text-[#9ca3af]">Domínio da empresa</label>
                        <input type="text" value={settingsForm.api4com_domain} onChange={e => setSettingsForm(f => ({ ...f, api4com_domain: e.target.value }))}
                          onBlur={e => {
                            const domain = e.target.value.trim();
                            if (domain && !settingsForm.sip_server) {
                              setSettingsForm(f => ({ ...f, sip_server: `wss://${domain}:6443` }));
                            }
                          }}
                          placeholder="seudominio.api4com.com" className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all text-gray-900 bg-gray-50 border border-gray-200 focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 dark:text-white dark:bg-[#0d0b14] dark:border-[#2d2b3d] dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
                        />
                        <p className="text-xs mt-1 text-gray-500 dark:text-[#6b7280]">Domínio criado no cadastro da Api4Com</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#6b7280' }}>Ramal SIP do Usuário</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs mb-1.5 text-gray-500 dark:text-[#9ca3af]">Número do Ramal</label>
                        <input type="text" value={settingsForm.sip_extension} onChange={e => setSettingsForm(f => ({ ...f, sip_extension: e.target.value }))} placeholder="1000"
                          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all text-gray-900 bg-gray-50 border border-gray-200 focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 dark:text-white dark:bg-[#0d0b14] dark:border-[#2d2b3d] dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs mb-1.5 text-gray-500 dark:text-[#9ca3af]">Senha do Ramal</label>
                        <input type="password" autoComplete="new-password" value={settingsForm.sip_password} onChange={e => setSettingsForm(f => ({ ...f, sip_password: e.target.value }))} placeholder="••••••••"
                          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all text-gray-900 bg-gray-50 border border-gray-200 focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 dark:text-white dark:bg-[#0d0b14] dark:border-[#2d2b3d] dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs text-gray-500 dark:text-[#9ca3af]">Servidor WSS</label>
                          {settingsForm.api4com_domain && (
                            <button onClick={() => setSettingsForm(f => ({ ...f, sip_server: `wss://${settingsForm.api4com_domain}:6443` }))}
                              className="text-xs px-2 py-0.5 rounded-md transition-all text-emerald-600 bg-emerald-100/50 border border-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400"
                            >
                              ✓ Usar padrão Api4Com (:6443)
                            </button>
                          )}
                        </div>
                        <input type="text" value={settingsForm.sip_server} onChange={e => setSettingsForm(f => ({ ...f, sip_server: e.target.value }))}
                          placeholder={settingsForm.api4com_domain ? `wss://${settingsForm.api4com_domain}:6443` : 'wss://seudominio.api4com.com:6443'}
                          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all text-gray-900 bg-gray-50 border border-gray-200 focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 dark:text-white dark:bg-[#0d0b14] dark:border-[#2d2b3d] dark:focus:border-violet-500 dark:focus:ring-violet-500/20"
                        />
                        <p className="text-xs mt-1 text-gray-500 dark:text-[#6b7280]">
                          Api4Com usa porta <strong className="text-violet-600 dark:text-violet-400 font-mono">:6443</strong> — deixe em branco para usar automaticamente
                        </p>

                      </div>
                    </div>
                  </div>
                  {testResult && (
                    <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ background: testResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, color: testResult.success ? '#22c55e' : '#ef4444' }}>
                      <span>{testResult.success ? '✓' : '✗'}</span><span>{testResult.message}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 pt-2 flex-wrap">
                    <button onClick={handleSaveApi4ComSettings} disabled={savingSettings} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50" style={{ background: settingsSaved ? '#16a34a' : '#7c3aed' }}>
                      {savingSettings ? <Loader2 size={14} className="animate-spin" /> : null}
                      {settingsSaved ? '✓ Salvo!' : 'Salvar configurações'}
                    </button>
                    <button onClick={handleTestApi4ComConnection} disabled={testingConnection} title="Testa o token salvo no banco de dados" className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50" style={{ border: '1px solid #22c55e', color: '#22c55e', background: 'transparent' }}>
                      {testingConnection ? <Loader2 size={14} className="animate-spin" /> : <PhoneCall size={14} />}
                      Testar Conexão
                    </button>
                    <button onClick={() => setIsTelefonySettingsOpen(false)} className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all bg-transparent border border-gray-300 dark:border-[#2d2b3d] text-gray-600 dark:text-[#9ca3af] hover:bg-gray-100 dark:hover:bg-white/5">
                      Cancelar
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 space-y-5">
                    <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,58,237,0.15)' }}>
                          <span className="text-xl">🔗</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">Webhook Api4Com</p>
                          <p className="text-xs mt-0.5 text-gray-500 dark:text-[#9ca3af]">Recebe notificações ao final de cada chamada (duração, gravação, status)</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-gray-500 dark:text-[#9ca3af]">URL do Webhook (GrapeHub)</p>
                        <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10">
                          <code className="text-xs flex-1 break-all text-violet-600 dark:text-violet-400">{window.location.origin}/api/api4com/webhook</code>
                          <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/api4com/webhook`)} className="flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Copiar URL">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-500 dark:text-[#9ca3af]" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                        </div>
                      </div>
                      <div className="rounded-xl p-3 space-y-1.5 bg-white dark:bg-black/20">
                        <p className="text-xs font-semibold text-gray-700 dark:text-[#e5e7eb]">Como funciona:</p>
                        <div className="space-y-1 text-xs text-gray-500 dark:text-[#9ca3af]">
                          <p>1️⃣ Você clica em ligar → GrapeHub chama o Dialer da Api4Com</p>
                          <p>2️⃣ Api4Com realiza a chamada via SIP</p>
                          <p>3️⃣ Ao finalizar → Api4Com envia POST para esta URL</p>
                          <p>4️⃣ GrapeHub salva duração, gravação e status no histórico do lead</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={handleRegisterWebhook} disabled={webhookRegistering}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
                        style={{ background: webhookResult?.success ? '#16a34a' : '#7c3aed' }}>
                        {webhookRegistering ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>🔗</span>}
                        {webhookResult?.success ? '✓ Webhook Registrado!' : 'Registrar na Api4Com'}
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Atualiza o webhook na conta</p>
                    </div>
                    {webhookResult?.error && (
                      <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                        ❌ {webhookResult.error}
                      </div>
                    )}
                    {webhookResult?.success && (
                      <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' }}>
                        ✅ Webhook registrado! A Api4Com vai notificar o GrapeHub após cada chamada.
                      </div>
                    )}
                  </div>
                </>)}

                {/* ── WEBHOOKS GERAIS ── */}
                {settingsTab === 'webhook' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest mb-1 text-gray-500 dark:text-[#6b7280]">Integrações via Webhook</h3>
                      <p className="text-xs text-gray-500 dark:text-[#4b5563]">Configure eventos para conectar o CRM a outras plataformas.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Grupo Whatsapp */}
                      <div className="rounded-2xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 flex flex-col hover:border-emerald-500/50 transition-colors cursor-pointer group shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500">
                            <span className="text-xl">💬</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Grupo WhatsApp</p>
                            <p className="text-xs mt-0.5 text-gray-500 dark:text-[#9ca3af]">Avisos de negócios ganhos.</p>
                          </div>
                        </div>
                        {showWebhookConfig === 'whatsapp' ? (
                          <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">URL do Webhook (POST)</label>
                            <input 
                              type="url"
                              value={crmWebhookSettings.whatsapp_webhook_url}
                              onChange={e => setCrmWebhookSettings({...crmWebhookSettings, whatsapp_webhook_url: e.target.value})}
                              placeholder="https://seu-webhook.com/..."
                              className="w-full bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-emerald-500 outline-none"
                            />
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setShowWebhookConfig(null)}
                                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                              >
                                Cancelar
                              </button>
                              <button 
                                onClick={handleSaveWebhookSettings}
                                disabled={savingWebhookSettings}
                                className="flex-[2] py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                              >
                                {savingWebhookSettings ? 'Salvando...' : 'Salvar URL'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-auto">
                            <button 
                              onClick={() => setShowWebhookConfig('whatsapp')} 
                              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
                            >
                              {crmWebhookSettings.whatsapp_webhook_url ? '✨ Editar Integração' : 'Configurar Integração'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Notificação Formulário */}
                      <div className="rounded-2xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 flex flex-col hover:border-blue-500/50 transition-colors cursor-pointer group shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500">
                            <span className="text-xl">📝</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Notificação Formulário</p>
                            <p className="text-xs mt-0.5 text-gray-500 dark:text-[#9ca3af]">Receber leads externos.</p>
                          </div>
                        </div>
                        {showWebhookConfig === 'form' ? (
                          <div className="mt-2 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">URL do Webhook (POST)</label>
                            <input 
                              type="url"
                              value={crmWebhookSettings.form_webhook_url}
                              onChange={e => setCrmWebhookSettings({...crmWebhookSettings, form_webhook_url: e.target.value})}
                              placeholder="https://seu-webhook.com/..."
                              className="w-full bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 outline-none"
                            />
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setShowWebhookConfig(null)}
                                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                              >
                                Cancelar
                              </button>
                              <button 
                                onClick={handleSaveWebhookSettings}
                                disabled={savingWebhookSettings}
                                className="flex-[2] py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                              >
                                {savingWebhookSettings ? 'Salvando...' : 'Salvar URL'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-auto">
                            <button 
                              onClick={() => setShowWebhookConfig('form')} 
                              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-blue-500 hover:text-white hover:border-blue-500"
                            >
                              {crmWebhookSettings.form_webhook_url ? '✨ Editar Integração' : 'Configurar Integração'}
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Recebimento Inbound (Portal Leads) */}
                      <div className="rounded-2xl p-5 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 flex flex-col hover:border-violet-500/50 transition-colors cursor-pointer group shadow-sm md:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-500">
                            <span className="text-xl">📥</span>
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Receber Leads (Inbound)</p>
                            <p className="text-xs mt-0.5 text-gray-500 dark:text-[#9ca3af]">Crie leads automaticamente injetando dados via JSON POST no CRM.</p>
                          </div>
                        </div>
                        {showWebhookConfig === 'inbound' ? (
                          <div className="mt-2 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="p-3 bg-gray-50 dark:bg-black/30 rounded-lg border border-gray-200 dark:border-white/5">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Sua URL Exclusiva (POST JSON)</label>
                              <div className="flex items-center gap-2">
                                <input 
                                  type="text" 
                                  readOnly 
                                  value={`${window.location.origin}/api/public/webhooks/inbound/${crmWebhookSettings.inbound_token}`}
                                  className="w-full bg-transparent text-xs text-gray-600 dark:text-gray-300 outline-none selection:bg-violet-500/30"
                                />
                                <button
                                  onClick={(e) => {
                                    navigator.clipboard.writeText(`${window.location.origin}/api/public/webhooks/inbound/${crmWebhookSettings.inbound_token}`);
                                    const btn = e.currentTarget;
                                    const oldHtml = btn.innerHTML;
                                    btn.innerHTML = '<span class="text-emerald-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></span>';
                                    setTimeout(() => btn.innerHTML = oldHtml, 2000);
                                  }}
                                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md transition-colors"
                                  title="Copiar URL"
                                >
                                  <Copy size={14} className="text-gray-500" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">Kanban de Destino</label>
                                <select 
                                  value={crmWebhookSettings.inbound_kanban_id || ''}
                                  onChange={e => setCrmWebhookSettings({...crmWebhookSettings, inbound_kanban_id: e.target.value, inbound_coluna: ''})}
                                  className="w-full bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-violet-500 outline-none"
                                >
                                  <option value="">Selecione...</option>
                                  {kanbans.map((k:any) => (
                                    <option key={k.id} value={k.id}>{k.nome}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">Coluna de Destino</label>
                                <select 
                                  value={crmWebhookSettings.inbound_coluna || ''}
                                  onChange={e => setCrmWebhookSettings({...crmWebhookSettings, inbound_coluna: e.target.value})}
                                  disabled={!crmWebhookSettings.inbound_kanban_id}
                                  className="w-full bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-violet-500 outline-none disabled:opacity-50"
                                >
                                  <option value="">Selecione...</option>
                                  {inboundColumns.sort((a,b) => Number(a.order_index) - Number(b.order_index)).map((c:any) => (
                                    <option key={c.id} value={c.title}>{c.title}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                              <button 
                                onClick={() => setShowWebhookConfig(null)}
                                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                              >
                                Fechar
                              </button>
                              <button 
                                onClick={handleSaveWebhookSettings}
                                disabled={savingWebhookSettings || !crmWebhookSettings.inbound_kanban_id || !crmWebhookSettings.inbound_coluna}
                                className="flex-[2] py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50"
                              >
                                {savingWebhookSettings ? 'Salvando...' : 'Salvar Destino'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-auto">
                            <button 
                              onClick={() => setShowWebhookConfig('inbound')} 
                              className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-violet-500 hover:text-white hover:border-violet-500"
                            >
                              {crmWebhookSettings.inbound_kanban_id && crmWebhookSettings.inbound_coluna ? '✨ Editar Roteamento (Ativo)' : 'Configurar Roteamento'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
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
                      <h3 className="text-xs font-bold uppercase tracking-widest mb-1 text-gray-500 dark:text-[#6b7280]">Motivos de Perda</h3>
                      <p className="text-xs text-gray-500 dark:text-[#4b5563]">Cadastre os motivos pelos quais os negócios são perdidos.</p>
                    </div>

                    {/* Add Form */}
                    <div className="rounded-xl p-4 space-y-3 bg-gray-50 border border-gray-200 dark:bg-white/5 dark:border-[#2d2b3d]">
                      <p className="text-xs font-semibold text-gray-500 dark:text-[#9ca3af]">Novo Motivo</p>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={newLossReason.color}
                          onChange={e => setNewLossReason(f => ({ ...f, color: e.target.value }))}
                          className="w-9 h-9 rounded-lg cursor-pointer p-0.5 bg-white dark:bg-[#0d0b14] border border-gray-200 dark:border-[#2d2b3d]"
                          title="Cor do motivo"
                        />
                        <input
                          type="text"
                          value={newLossReason.name}
                          onChange={e => setNewLossReason(f => ({ ...f, name: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleCreateLossReason()}
                          placeholder="Ex: Preço alto, Concorrência..."
                          className="flex-1 rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all text-gray-900 dark:text-white bg-white dark:bg-[#0d0b14] border border-gray-200 dark:border-[#2d2b3d] focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
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
                        className="w-full rounded-lg px-3.5 py-2 text-sm outline-none transition-all text-gray-600 dark:text-gray-400 bg-white dark:bg-[#0d0b14] border border-gray-200 dark:border-[#2d2b3d] focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
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
