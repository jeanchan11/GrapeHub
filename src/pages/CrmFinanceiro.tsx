
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Plus, MoreHorizontal, 
  CheckCircle2, AlertCircle, Clock, 
  DollarSign, Users, ChevronDown,
  ArrowRight, ArrowLeft, Trash2,
  Filter, Download, Link as LinkIcon,
  CreditCard, RefreshCw, X, Send, Image as ImageIcon, Archive,
  Calendar, Activity, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Modal } from '../components/ui/Modal';
import { designSystem } from '../design-system';
import CrmCommentHistory, { COMMENT_TYPES } from '../components/CrmCommentHistory';
import CrmChecklist from '../components/CrmChecklist';
import ArchiveClientModal from '../components/ArchiveClientModal';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Ativo' | 'Inativo';
  startDate: string;
  location: string;
  squad: string;
  tags: string;
  contracts: string;
  createdAt: string;
  crmStatus?: string;
  monthlyFee?: number;
  daysInArrears?: number;
  paidThisMonth?: number;
  recurringDelay?: boolean;
  paymentHistory?: { date: string; status: string }[];
  displayColumn?: string;
  isArchived?: boolean;
  aviso_previo_date?: string;
}

interface Comment {
  id: number;
  client_id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  user_picture?: string;
  user_role?: string;
  type: string;
  content: string;
  created_at: string;
  images?: string[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  dueDate: string | null;
  createdBy: string;
  assignedTo: string;
  project_id: string;
  project_name?: string;
}

const COLUMNS = [
  { id: 'inadimplente_marvee', title: 'INADIMPLENTES MARVEE', emoji: '🔄', color: '#3b82f6', colorKey: 'red' },
  { id: 'inadimplente_grape', title: 'INADIMPLENTES GRAPE', emoji: '🔄', color: '#a78bfa', colorKey: 'red' },
  { id: 'pedido_finalizacao', title: 'PEDIDO DE FINALIZAÇÃO', emoji: '📋', color: '#f43f5e', colorKey: 'finalizacao' },
  { id: 'negociacao', title: 'NEGOCIAÇÃO', emoji: '🟡', color: '#34d399', colorKey: 'negociacao' },
  { id: 'aviso_30_dias', title: 'AVISO 30 DIAS', emoji: '⚠️', color: '#fb923c', colorKey: 'yellow' },
  { id: 'processo_saida', title: 'PROCESSO DE SAÍDA', emoji: '🔴', color: '#f87171', colorKey: 'red' },
];

const CARD_VALUE_STYLE: Record<string, { bg: string; text: string }> = {
  negociacao:    { bg: '#0d2d1a', text: '#34d399' },
  red:           { bg: '#2d0f0f', text: '#f87171' },
  finalizacao:   { bg: '#2d240a', text: '#fbbf24' },
  yellow:        { bg: '#2d240a', text: '#fbbf24' },
};

const AVATAR_COLORS = [
  { bg: 'bg-blue-500', text: 'text-white' },
  { bg: 'bg-emerald-500', text: 'text-white' },
  { bg: 'bg-violet-500', text: 'text-white' },
  { bg: 'bg-fuchsia-500', text: 'text-white' },
];

const getAvatarColor = (name: string) => {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

const getInitialsFromName = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

interface SortableCardProps {
  client: Client;
  onClick: (client: Client) => void;
  onMove: (clientId: string, newStatus: string) => void | Promise<void>;
}

const SortableCard: React.FC<SortableCardProps> = ({ client, onClick, onMove }) => {
  const [showMenu, setShowMenu] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: client.id, data: { type: 'Client', client } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const formatCurrency = (value: number | string | undefined) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue);
  };

  const col = COLUMNS.find(c => c.id === client.crmStatus || c.id === client.displayColumn);
  const valueStyle = col ? (CARD_VALUE_STYLE[col.colorKey] || CARD_VALUE_STYLE['red']) : CARD_VALUE_STYLE['red'];
  const avatar = getAvatarColor(client.name);
  const initials = getInitialsFromName(client.name);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onClick(client)}
      className={`relative cursor-grab active:cursor-grabbing rounded-xl border transition-all ${
        isDragging
          ? 'ring-2 ring-violet-500 shadow-2xl border-violet-500/50'
          : 'border-gray-200 dark:border-white/5 darker:border-white/5 hover:border-gray-300 dark:hover:border-white/10 darker:hover:border-white/10'
      } ${client.isArchived ? 'opacity-50 grayscale' : ''} bg-white dark:bg-dark-card p-3`}
      style={{ ...style, marginBottom: 12 }}
    >
      {client.isArchived && (
        <div className="absolute -top-2 -right-2 bg-slate-800 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg z-10">
          Arquivado
        </div>
      )}

      {/* Top: avatar + name + squad + menu */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${avatar.bg} ${avatar.text}`}
          >
            {initials}
          </div>
          <div>
            <div className="text-[13px] font-medium leading-tight text-gray-900 dark:text-white darker:text-gray-100">{client.name}</div>
            <div className="text-[11px] mt-0.5 text-gray-500 dark:text-slate-400 darker:text-slate-500">{client.squad}</div>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="text-gray-500 dark:text-slate-400 darker:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded"
          >
            <MoreHorizontal size={16} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-xl overflow-hidden z-50 border border-gray-200 dark:border-white/10 darker:border-white/5 bg-white dark:bg-dark-card"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-1 flex flex-col">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentIndex = COLUMNS.findIndex(c => c.id === client.crmStatus);
                      if (currentIndex > 0) onMove(client.id, COLUMNS[currentIndex - 1].id);
                      setShowMenu(false);
                    }}
                    disabled={COLUMNS.findIndex(c => c.id === client.crmStatus) === 0}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg disabled:opacity-40 text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-slate-300"
                  >
                    <ArrowLeft size={14} /> Mover para anterior
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const currentIndex = COLUMNS.findIndex(c => c.id === client.crmStatus);
                      if (currentIndex < COLUMNS.length - 1) onMove(client.id, COLUMNS[currentIndex + 1].id);
                      setShowMenu(false);
                    }}
                    disabled={COLUMNS.findIndex(c => c.id === client.crmStatus) === COLUMNS.length - 1}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg disabled:opacity-40 text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-slate-300"
                  >
                    <ArrowRight size={14} /> Mover para próxima
                  </button>
                  <div className="h-px bg-gray-200 dark:bg-white/10 my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(client.id, 'arquivado');
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-slate-300"
                  >
                    <Archive size={14} /> Arquivar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(client.id, '');
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-left"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Value bar */}
      <div
        className={`rounded-md text-[13px] font-semibold px-[10px] py-[7px] mb-2 ${
          col?.colorKey === 'negociacao' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 darker:bg-emerald-500/10' :
          col?.colorKey === 'red' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 darker:bg-rose-500/10' :
          col?.colorKey === 'finalizacao' || col?.colorKey === 'yellow' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 darker:bg-amber-500/10' :
          'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-slate-300'
        }`}
      >
        {formatCurrency(client.monthlyFee)}
      </div>

      {/* Footer: badges + atraso */}
      <div className="flex flex-wrap items-center gap-1.5 mt-1 border-t border-gray-100 dark:border-white/5 pt-2">
        <span className="flex items-center gap-1 text-gray-500 dark:text-slate-400 darker:text-slate-500">
          <Clock size={11} />
          <span className="text-[11px] font-medium">
            {client.daysInArrears && client.daysInArrears > 0 ? `${client.daysInArrears} dias em atraso` : 'Em dia'}
          </span>
        </span>
        
        {client.aviso_previo_date && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
            <Clock size={9} /> {new Date(client.aviso_previo_date + 'T12:00:00').toLocaleDateString('pt-BR')}
          </span>
        )}

        {client.recurringDelay && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <AlertCircle size={9} /> Atraso Recorrente
          </span>
        )}
        {client.crmStatus === 'aviso_30_dias' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <AlertCircle size={9} /> Aviso 30 Dias
          </span>
        )}
        {client.crmStatus === 'pedido_finalizacao' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <AlertCircle size={9} /> Pedido Finalização
          </span>
        )}
      </div>
    </div>
  );
};

const DroppableColumn = ({ column, children, isOver }: { column: any, children: React.ReactNode, isOver: boolean }) => {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex-1 transition-all duration-200 rounded-xl px-2 pt-1 pb-2"
      style={{
        background: isOver ? 'rgba(167,139,250,0.06)' : 'transparent',
        boxShadow: isOver ? 'inset 0 0 0 1.5px rgba(167,139,250,0.35)' : 'none',
      }}
    >
      {children}
    </div>
  );
};

const CrmFinanceiro = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  
  // Slide-over state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'financeiro' | 'historico' | 'checklist'>('financeiro');
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Archive state
  const [showArchived, setShowArchived] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

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

  const [isSyncing, setIsSyncing] = useState(false);
  
  // Tasks state
  const [activeMainTab, setActiveMainTab] = useState<'crm' | 'tarefas'>('crm');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState({ title: '', dueDate: '', projectId: '' });
  const [inlineTaskData, setInlineTaskData] = useState({ title: '', dueDate: '' });
  const [isAddingInlineTask, setIsAddingInlineTask] = useState(false);
  const [taskFilterClientId, setTaskFilterClientId] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      const [crmRes, allRes] = await Promise.all([
        fetch('/api/clients?crm_status=true'),
        fetch('/api/clients')
      ]);
      
      if (crmRes.ok) setClients(await crmRes.json());
      if (allRes.ok) setAllClients(await allRes.json());
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  const syncInadimplentes = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/crm/sync-inadimplentes', { method: 'POST' });
    } catch (err) {
      console.error("Error syncing inadimplentes:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await syncInadimplentes();
      await fetchClients();
      await fetchTasks();
    };
    init();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      if (selectedClient.crmStatus === 'processo_saida') {
        setActiveTab('checklist');
      } else {
        setActiveTab('financeiro');
      }
    }
  }, [selectedClient]);

  const handleMoveClient = async (clientId: string, newStatus: string) => {
    const client = clients.find(c => c.id === clientId) || allClients.find(c => c.id === clientId);
    const oldStatus = client?.crmStatus || '';

    // Optimistic update
    setClients(prev => {
      const exists = prev.some(c => c.id === clientId);
      if (exists) {
        return prev.map(c => c.id === clientId ? { ...c, crmStatus: newStatus } : c);
      } else if (client) {
        return [...prev, { ...client, crmStatus: newStatus }];
      }
      return prev;
    });
    
    if (selectedClient && selectedClient.id === clientId) {
      setSelectedClient(prev => prev ? { ...prev, crmStatus: newStatus } : null);
    }

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm_status: newStatus })
      });

      if (!response.ok) {
        // Revert on failure
        fetchClients();
      } else {
        if (oldStatus !== newStatus && user) {
          const oldCol = COLUMNS.find(c => c.id === oldStatus)?.title || 'Nenhum';
          const newCol = COLUMNS.find(c => c.id === newStatus)?.title || 'Nenhum';
          
          await fetch('/api/crm-comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: clientId,
              user_id: user.email,
              type: 'Mudança de Status',
              content: `Movido de ${oldCol} para ${newCol}`
            })
          });
          
          if (selectedClient && selectedClient.id === clientId) {
            // fetchComments(clientId); // Removed as it's handled by the component now
          }
        }
      }
    } catch (err) {
      console.error("Error updating client status:", err);
      fetchClients();
    }
  };

  const handleUpdateClientField = async (clientId: string, field: string, value: string) => {
    // Optimistic update
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, [field]: value } : c));
    if (selectedClient && selectedClient.id === clientId) {
      setSelectedClient(prev => prev ? { ...prev, [field]: value } : null);
    }
    
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar campo');
      }

      if (field === 'aviso_previo_date' && user) {
        let dateStr = 'Removida';
        if (value) {
          dateStr = new Date(value + 'T12:00:00').toLocaleDateString('pt-BR');
        }
        await fetch('/api/crm-comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            user_id: user.email,
            type: 'Atualização',
            content: `📅 Aviso Prévio: Data alterada para ${dateStr}`
          })
        });
      }
    } catch (err) {
      console.error(err);
      // Revert on fail
      await fetchClients();
    }
  };

  const originalColumnRef = useRef<string | null>(null);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
    const client = clients.find(c => c.id === event.active.id);
    if (client) originalColumnRef.current = client.crmStatus || null;
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isOverColumn = COLUMNS.some(c => c.id === overId);

    setClients(prev => {
      const activeIndex = prev.findIndex(c => c.id === activeId);
      if (activeIndex === -1) return prev;

      const newClients = [...prev];

      if (isOverColumn) {
        // Dropped on empty column area
        if (prev[activeIndex].crmStatus !== overId) {
          newClients[activeIndex] = { ...newClients[activeIndex], crmStatus: overId, displayColumn: overId };
        }
        return newClients;
      }

      // Dragging over another card
      const overIndex = prev.findIndex(c => c.id === overId);
      if (overIndex === -1) return prev;

      const targetColumn = prev[overIndex].crmStatus;

      // Update column if moving cross-column
      if (prev[activeIndex].crmStatus !== targetColumn) {
        newClients[activeIndex] = { ...newClients[activeIndex], crmStatus: targetColumn, displayColumn: targetColumn };
      }

      return arrayMove(newClients, activeIndex, overIndex);
    });
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const clientId = active.id;
    const overId = over.id;

    // Determine final column from over target
    let newStatus: string;
    if (COLUMNS.find(c => c.id === overId)) {
      newStatus = overId;
    } else {
      const overClient = clients.find(c => c.id === overId);
      newStatus = overClient?.crmStatus || '';
    }

    // Only persist to DB if the column actually changed
    if (newStatus && newStatus !== originalColumnRef.current) {
      handleMoveClient(clientId, newStatus);
    }
  };

  const handleCompleteExit = async () => {
    if (!selectedClient) return;
    
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Inativo', crm_status: null })
      });
      
      if (res.ok) {
        fetchClients();
        setSelectedClient(null);
      }
    } catch (err) {
      console.error("Error completing exit:", err);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const isArchived = c.crmStatus === 'arquivado';
      
      if (isArchived && !showArchived) return false;
      return matchesSearch;
    }).map(c => {
      // Map archived clients to 'processo_saida' column for display
      if (c.crmStatus === 'arquivado') {
        return { ...c, displayColumn: 'processo_saida', isArchived: true };
      }
      return { ...c, displayColumn: c.crmStatus, isArchived: false };
    });
  }, [clients, searchQuery, showArchived]);

  const availableClients = useMemo(() => {
    const activeColumns = COLUMNS.map(c => c.id);
    return allClients.filter(c => !c.crmStatus || !activeColumns.includes(c.crmStatus));
  }, [allClients]);

  const filteredAvailableClients = useMemo(() => {
    return availableClients.filter(c => 
      c.name.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [availableClients, clientSearch]);

  const formatCurrency = (value: number | string | undefined) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numValue);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateString));
  };

  const getInitials = (email: string) => {
    if (!email) return 'U';
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-violet-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 w-full">
      <PageHeader 
        title="CRM" 
        titleAccent="Financeiro" 
        subtitle="Gestão de inadimplência e negociações ativas."
      >
        <button
          onClick={async () => {
            await syncInadimplentes();
            await fetchClients();
          }}
          disabled={isSyncing}
          className="p-3 bg-white dark:bg-[#1a1a1a] darker:bg-[#0d0d0d] border border-gray-100 dark:border-neutral-800 darker:border-neutral-900 rounded-2xl text-gray-500 hover:text-purple-500 dark:hover:text-purple-400 transition-colors disabled:opacity-50"
          title="Sincronizar Inadimplentes"
        >
          <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
        </button>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-colors ${
            showArchived 
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
              : 'bg-white dark:bg-[#1a1a1a] darker:bg-[#0d0d0d] border border-gray-100 dark:border-neutral-800 darker:border-neutral-900 text-gray-500 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Archive size={18} />
          {showArchived ? 'Ocultar Arquivados' : 'Mostrar Arquivados'}
        </button>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar cliente no CRM..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white dark:bg-[#1a1a1a] darker:bg-[#0d0d0d] border border-gray-100 dark:border-neutral-800 darker:border-neutral-900 rounded-2xl py-3 pl-12 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all w-64"
          />
        </div>
        <button className="p-3 bg-white dark:bg-[#1a1a1a] darker:bg-[#0d0d0d] border border-gray-100 dark:border-neutral-800 darker:border-neutral-900 rounded-2xl text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <Download size={18} />
        </button>
      </PageHeader>

      <div className="flex items-center gap-4 mb-8 border-b border-gray-200 dark:border-neutral-800 darker:border-neutral-900">
        <button
          onClick={() => setActiveMainTab('crm')}
          className={`pb-4 px-2 text-sm font-bold transition-colors relative ${
            activeMainTab === 'crm' 
              ? 'text-violet-500' 
              : 'text-slate-500 hover:text-light-text dark:hover:text-white'
          }`}
        >
          CRM
          {activeMainTab === 'crm' && (
            <motion.div layoutId="activeMainTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveMainTab('tarefas')}
          className={`pb-4 px-2 text-sm font-bold transition-colors relative ${
            activeMainTab === 'tarefas' 
              ? 'text-violet-500' 
              : 'text-slate-500 hover:text-light-text dark:hover:text-white'
          }`}
        >
          Tarefas
          {activeMainTab === 'tarefas' && (
            <motion.div layoutId="activeMainTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-t-full" />
          )}
        </button>
      </div>

      {activeMainTab === 'crm' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
        <div className="flex overflow-x-auto pb-4 gap-5 items-start snap-x">
          {COLUMNS.map(column => {
            const columnClients = filteredClients.filter(c => c.displayColumn === column.id);
            return (
              <div
                key={column.id}
                className="flex flex-col flex-1 min-h-[500px] min-w-[320px] w-[320px] snap-start bg-slate-50/50 dark:bg-white/[0.02] rounded-3xl border border-gray-200 dark:border-white/5 darker:border-white/5 p-2"
              >
                {/* Column header */}
                <div className="px-3 pt-3 pb-2 border-b border-gray-200 dark:border-white/5 darker:border-white/5 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: column.color + '22', color: column.color }}
                    >
                      {column.emoji}
                    </div>
                    <span className="text-[12px] font-black uppercase tracking-widest text-gray-900 dark:text-white darker:text-gray-100">
                      {column.title}
                    </span>
                  </div>
                  <div className="text-[11px] pl-9 text-gray-500 dark:text-slate-400 darker:text-slate-500">
                    {columnClients.length} cliente{columnClients.length !== 1 ? 's' : ''} · <span className="font-semibold text-emerald-600 dark:text-emerald-500">{formatCurrency(columnClients.reduce((acc, c) => acc + (typeof c.monthlyFee === 'string' ? parseFloat(c.monthlyFee) : (c.monthlyFee || 0)), 0))}</span>
                  </div>
                </div>

                <DroppableColumn column={column} isOver={false}>
                  {/* Add client button */}
                  <button
                    onClick={() => setIsAddDropdownOpen(isAddDropdownOpen === column.id ? null : column.id)}
                    className="w-full py-2 mb-3 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:text-slate-400 dark:hover:text-violet-400 dark:hover:bg-violet-500/10 darker:text-slate-500"
                  >
                    <Plus size={14} />
                    Adicionar Cliente
                  </button>

                  {isAddDropdownOpen === column.id && (
                    <div className="relative mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="absolute z-50 top-0 left-0 right-0 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10 darker:border-white/5 bg-white dark:bg-dark-card">
                        <div className="p-3 border-b border-gray-200 dark:border-white/5 darker:border-white/5">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={13} />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Buscar cliente..."
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              className="w-full rounded-lg pl-9 pr-4 py-2 text-xs outline-none transition-all bg-slate-50/50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 darker:border-white/10 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredAvailableClients.length > 0 ? (
                            filteredAvailableClients.map(client => (
                              <button
                                key={client.id}
                                onClick={() => {
                                  handleMoveClient(client.id, column.id);
                                  setIsAddDropdownOpen(null);
                                  setClientSearch('');
                                }}
                                className="w-full px-4 py-3 text-left text-xs flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-slate-300"
                              >
                                <span>{client.name}</span>
                                <Plus size={13} className="text-gray-400 dark:text-slate-500" />
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-6 text-center text-xs text-gray-500 dark:text-slate-500">
                              Nenhum cliente disponível
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsAddDropdownOpen(null)}
                      />
                    </div>
                  )}

                  <SortableContext
                    items={columnClients.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="min-h-[80px]">
                      {columnClients.map(client => (
                        <SortableCard
                          key={client.id}
                          client={client}
                          onClick={setSelectedClient}
                          onMove={handleMoveClient}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DroppableColumn>
              </div>
            );
          })}
        </div>

        <DragOverlay
          dropAnimation={{
            ...defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.3' } } }),
          }}
        >
          {activeId ? (
            <div style={{ transform: 'scale(1.03)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', borderRadius: 10, opacity: 0.95 }}>
              <SortableCard
                client={clients.find(c => c.id === activeId)!}
                onClick={() => {}}
                onMove={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-3xl border border-slate-200 dark:border-white/10 p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-light-text dark:text-white">Tarefas do CRM</h2>
              {taskFilterClientId && (
                <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/10 text-violet-500 rounded-full text-sm font-bold">
                  <span>Cliente: {clients.find(c => c.id === taskFilterClientId)?.name}</span>
                  <button onClick={() => setTaskFilterClientId(null)} className="hover:text-violet-700 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={() => setIsNewTaskModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white rounded-xl text-sm font-bold hover:bg-violet-600 transition-colors"
            >
              <Plus size={16} />
              Nova Tarefa
            </button>
          </div>
          
          <div className="space-y-6">
            {['Atrasadas', 'Hoje', 'Esta semana', 'Próximas'].map(group => {
              const groupTasks = tasks.filter(t => {
                if (taskFilterClientId && t.project_id !== taskFilterClientId) return false;
                
                const isCrmClient = clients.some(c => c.id === t.project_id && c.crmStatus);
                if (!isCrmClient) return false;
                
                if (!t.dueDate) return group === 'Próximas';
                
                const dueDate = new Date(t.dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (group === 'Atrasadas') return diffDays < 0 && t.status !== 'completed';
                if (group === 'Hoje') return diffDays === 0 && t.status !== 'completed';
                if (group === 'Esta semana') return diffDays > 0 && diffDays <= 7 && t.status !== 'completed';
                if (group === 'Próximas') return diffDays > 7 && t.status !== 'completed';
                return false;
              });

              if (groupTasks.length === 0) return null;

              return (
                <div key={group}>
                  <h3 className={`text-sm font-bold uppercase tracking-widest mb-3 ${
                    group === 'Atrasadas' ? 'text-red-500' : 'text-slate-500'
                  }`}>
                    {group} ({groupTasks.length})
                  </h3>
                  <div className="space-y-2">
                    {groupTasks.map(task => {
                      const client = clients.find(c => c.id === task.project_id);
                      return (
                        <div key={task.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                          <button 
                            onClick={async () => {
                              try {
                                await fetch(`/api/tasks/${task.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'completed' })
                                });
                                fetchTasks();
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center hover:border-violet-500 transition-colors"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-light-text dark:text-white">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {client && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500">
                                  {client.name}
                                </span>
                              )}
                              {task.dueDate && (
                                <span className={`text-[10px] font-medium ${
                                  group === 'Atrasadas' ? 'text-red-500' : 'text-slate-500'
                                }`}>
                                  {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Central Modal Popup */}
      <Modal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        title={selectedClient?.name || ''}
        maxWidth="max-w-3xl"
        headerContent={
          selectedClient && (
            <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest ${
              selectedClient.squad === 'Able' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
            }`}>
              {selectedClient.squad}
            </div>
          )
        }
        headerActions={
          selectedClient && (
            <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 dark:bg-white/[0.03] backdrop-brightness-110 py-1.5 px-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                  <ShieldCheck size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Status CRM</span>
                  <select 
                    value={selectedClient.crmStatus || ''}
                    onChange={(e) => handleMoveClient(selectedClient.id, e.target.value)}
                    className="text-xs font-bold bg-transparent border-none p-0 outline-none focus:ring-0 text-gray-800 dark:text-white cursor-pointer"
                  >
                    <option value="" className="dark:bg-slate-900">Nenhum</option>
                    {COLUMNS.map(c => (
                      <option key={c.id} value={c.id} className="dark:bg-slate-900">{c.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <Calendar size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Aviso Prévio</span>
                  <input
                    type="date"
                    value={selectedClient.aviso_previo_date || ''}
                    onChange={(e) => handleUpdateClientField(selectedClient.id, 'aviso_previo_date', e.target.value)}
                    className="text-xs font-bold bg-transparent border-none p-0 outline-none focus:ring-0 text-gray-800 dark:text-white cursor-pointer [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
          )
        }
        tabs={
          selectedClient && (
            <>
              <button
                onClick={() => setActiveTab('financeiro')}
                className={`pb-4 text-sm font-bold transition-all ${activeTab === 'financeiro' ? 'modal-tab-active' : 'text-slate-500 hover:text-light-text dark:hover:text-white'}`}
              >
                Financeiro
              </button>
              <button
                onClick={() => setActiveTab('historico')}
                className={`pb-4 text-sm font-bold transition-all ${activeTab === 'historico' ? 'modal-tab-active' : 'text-slate-500 hover:text-light-text dark:hover:text-white'}`}
              >
                Histórico
              </button>
              {selectedClient.crmStatus === 'processo_saida' && (
                <button
                  onClick={() => setActiveTab('checklist')}
                  className={`pb-4 text-sm font-bold transition-all ${activeTab === 'checklist' ? 'modal-tab-active' : 'text-slate-500 hover:text-light-text dark:hover:text-white'}`}
                >
                  Checklist de Saída
                </button>
              )}
            </>
          )
        }
      >
        {selectedClient && (
          <div className="space-y-6">
            {activeTab === 'financeiro' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Fee Mensal / MRR</div>
                        <div className="text-lg font-black text-light-text dark:text-white">{formatCurrency(selectedClient.monthlyFee)}</div>
                      </div>
                      <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 shadow-sm">
                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1">Pago no Mês</div>
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedClient.paidThisMonth)}</div>
                      </div>
                      <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/20 col-span-2 flex justify-between items-center shadow-sm">
                        <div>
                          <div className="text-[10px] font-bold text-rose-600 dark:text-rose-500 uppercase tracking-widest mb-1">Valor em Aberto (Aprox.)</div>
                          <div className="text-lg font-black text-rose-600 dark:text-rose-400">
                            {formatCurrency((selectedClient.monthlyFee || 0) - (selectedClient.paidThisMonth || 0))}
                          </div>
                        </div>
                        {selectedClient.daysInArrears && selectedClient.daysInArrears > 0 && (
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-rose-600 dark:text-rose-500 uppercase tracking-widest mb-1">Atraso</div>
                            <div className="text-sm font-bold text-rose-600 dark:text-rose-400">{selectedClient.daysInArrears} dias</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedClient.paymentHistory && selectedClient.paymentHistory.length > 0 && (
                      <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Histórico de Pontualidade (Últimos 6 meses)</div>
                        <div className="flex items-center gap-3">
                          {selectedClient.paymentHistory.map((ph, idx) => (
                            <div 
                              key={idx} 
                              className="flex-1 flex flex-col items-center gap-2"
                              title={`${new Date(ph.date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}: ${ph.status}`}
                            >
                              <div className={`w-full h-3 rounded-full ${ph.status === 'Conciliado' ? 'bg-emerald-500' : ph.status === 'Atrasado' ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(ph.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tarefas</div>
                        <button 
                          onClick={() => setIsAddingInlineTask(true)}
                          className="text-xs font-bold text-violet-500 hover:text-violet-600 transition-colors flex items-center gap-1"
                        >
                          <Plus size={14} />
                          Adicionar tarefa
                        </button>
                      </div>

                      {isAddingInlineTask && (
                        <div className="mb-4 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center gap-3">
                          <input
                            type="text"
                            value={inlineTaskData.title}
                            onChange={e => setInlineTaskData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Título da tarefa..."
                            className="flex-1 bg-transparent text-sm text-light-text dark:text-white outline-none"
                            autoFocus
                          />
                          <input
                            type="date"
                            value={inlineTaskData.dueDate}
                            onChange={e => setInlineTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
                            className="bg-transparent text-sm text-slate-500 outline-none"
                          />
                          <button
                            onClick={async () => {
                              if (!inlineTaskData.title) return;
                              try {
                                await fetch('/api/tasks', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    id: crypto.randomUUID(),
                                    title: inlineTaskData.title,
                                    project_id: selectedClient.id,
                                    dueDate: inlineTaskData.dueDate || null,
                                    status: 'pending',
                                    createdBy: user?.name || 'Sistema',
                                    assignedTo: 'all'
                                  })
                                });
                                setIsAddingInlineTask(false);
                                setInlineTaskData({ title: '', dueDate: '' });
                                fetchTasks();
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            disabled={!inlineTaskData.title}
                            className="text-xs font-bold text-white bg-violet-500 px-3 py-1.5 rounded-lg hover:bg-violet-600 transition-colors disabled:opacity-50"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setIsAddingInlineTask(false)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )}

                      <div className="space-y-2">
                        {tasks.filter(t => t.project_id === selectedClient.id && t.status !== 'completed').slice(0, 5).map(task => (
                          <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors group">
                            <button 
                              onClick={async () => {
                                try {
                                  await fetch(`/api/tasks/${task.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'completed' })
                                  });
                                  fetchTasks();
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center hover:border-violet-500 transition-colors flex-shrink-0"
                            />
                            <p className="text-sm font-medium text-light-text dark:text-white flex-1 truncate">{task.title}</p>
                            {task.dueDate && (
                              <span className="text-[10px] font-medium text-slate-500 flex-shrink-0">
                                {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        ))}
                        {tasks.filter(t => t.project_id === selectedClient.id && t.status !== 'completed').length === 0 && !isAddingInlineTask && (
                          <p className="text-sm text-slate-500 text-center py-4">Nenhuma tarefa pendente.</p>
                        )}
                      </div>
                      
                      {tasks.filter(t => t.project_id === selectedClient.id && t.status !== 'completed').length > 5 && (
                        <button 
                          onClick={() => {
                            setTaskFilterClientId(selectedClient.id);
                            setSelectedClient(null);
                            setActiveMainTab('tarefas');
                          }}
                          className="w-full mt-4 text-xs font-bold text-slate-500 hover:text-violet-500 transition-colors text-center"
                        >
                          Ver todas as tarefas
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'historico' && (
                  <CrmCommentHistory clientId={selectedClient.id} />
                )}

                {activeTab === 'checklist' && selectedClient.crmStatus === 'processo_saida' && (
                  <div>
                    <div className="flex justify-end mb-4">
                      <button
                        onClick={() => setIsArchiveModalOpen(true)}
                        className="px-5 py-2.5 bg-rose-500 text-white hover:bg-rose-600 rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-lg shadow-rose-500/20 flex items-center gap-2"
                      >
                        <Archive size={16} />
                        Arquivar Cliente
                      </button>
                    </div>
                    <CrmChecklist clientId={selectedClient.id} onCompleteExit={handleCompleteExit} />
                  </div>
                 )}
          </div>
        )}
      </Modal>

      {isArchiveModalOpen && selectedClient && (
        <ArchiveClientModal
          clientId={selectedClient.id}
          onClose={() => setIsArchiveModalOpen(false)}
          onConfirm={async (data) => {
            try {
              // Save exit data
              const exitRes = await fetch('/api/crm-exit-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, client_id: selectedClient.id })
              });

              if (!exitRes.ok) throw new Error('Failed to save exit data');

              // Update client status
              const updateRes = await fetch(`/api/clients/${selectedClient.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Inativo', crm_status: 'arquivado' })
              });

              if (!updateRes.ok) throw new Error('Failed to update client status');

              setIsArchiveModalOpen(false);
              setSelectedClient(null);
              fetchClients();
            } catch (err) {
              console.error('Error archiving client:', err);
              alert('Erro ao arquivar cliente');
            }
          }}
        />
      )}

      <Modal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Nova Tarefa"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              onClick={() => setIsNewTaskModalOpen(false)}
              className={designSystem.button.secondary}
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                if (!newTaskData.title || !newTaskData.projectId) return;
                try {
                  await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: crypto.randomUUID(),
                      title: newTaskData.title,
                      project_id: newTaskData.projectId,
                      dueDate: newTaskData.dueDate || null,
                      status: 'pending',
                      createdBy: user?.name || 'Sistema',
                      assignedTo: 'all'
                    })
                  });
                  setIsNewTaskModalOpen(false);
                  setNewTaskData({ title: '', dueDate: '', projectId: '' });
                  fetchTasks();
                } catch (err) {
                  console.error(err);
                }
              }}
              disabled={!newTaskData.title || !newTaskData.projectId}
              className={designSystem.button.primary}
            >
              Salvar Tarefa
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={designSystem.input.label}>Título</label>
            <input 
              type="text"
              value={newTaskData.title}
              onChange={e => setNewTaskData(prev => ({ ...prev, title: e.target.value }))}
              className={designSystem.input.field}
              placeholder="Ex: Cobrar cliente"
            />
          </div>
          
          <div>
            <label className={designSystem.input.label}>Cliente</label>
            <select
              value={newTaskData.projectId}
              onChange={e => setNewTaskData(prev => ({ ...prev, projectId: e.target.value }))}
              className={designSystem.input.field}
            >
              <option value="">Selecione um cliente</option>
              {clients.filter(c => c.crmStatus).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className={designSystem.input.label}>Data de Vencimento</label>
            <input 
              type="date"
              value={newTaskData.dueDate}
              onChange={e => setNewTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
              className={designSystem.input.field}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CrmFinanceiro;
