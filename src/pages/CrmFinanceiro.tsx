
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Search, Plus, MoreHorizontal, 
  CheckCircle2, AlertCircle, Clock, 
  DollarSign, Users, ChevronDown,
  Trash2,
  Filter, Download, Link as LinkIcon,
  CreditCard, RefreshCw, X, Send, Image as ImageIcon, Archive, ArchiveRestore,
  Calendar, Activity, ShieldCheck, Pencil, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import OptionPicker from '../components/ui/OptionPicker';
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
import LoadingSpinner, { CarregandoPagina } from '../components/LoadingSpinner';
import CrmChecklist from '../components/CrmChecklist';
import ArchiveClientModal from '../components/ArchiveClientModal';
import { FinanceiroDoCliente } from '../components/ClientModal';
import { toast } from '@/src/lib/toast';
import '../components/graficos.css';
import { confirmDialog } from '@/src/lib/confirm';

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
  valorDisplay?: number;
  diasAtraso?: number;
  proximaCobranca?: string;
  paymentStatus?: string;
  displayColumn?: string;
  isArchived?: boolean;
  crmArchivedAt?: string | null;
  aviso_previo_date?: string;
  finPeopleGuid?: string;
  hasActiveSubscription?: boolean;
  subscriptionValue?: number;
  subscriptionStatus?: string;
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

interface RetColumn { id: string; title: string; emoji: string; color: string; }
// As colunas vêm de /api/retencao/columns. Não existe lista fixa no front: uma
// cópia local ressuscitaria visualmente a coluna que o usuário acabou de apagar.
// Paleta de cores para as colunas customizáveis
const COLUMN_COLORS = ['#f43f5e', '#fb923c', '#f59e0b', '#34d399', '#2dd4bf', '#38bdf8', '#8b5cf6', '#ec4899', '#64748b'];

const CARD_VALUE_STYLE: Record<string, { bg: string; text: string }> = {
  negociacao:    { bg: '#0d2d1a', text: '#34d399' },
  recuperado:    { bg: '#0a2d2a', text: '#2dd4bf' },
  red:           { bg: '#2d0f0f', text: '#f87171' },
  finalizacao:   { bg: '#2d240a', text: '#fbbf24' },
  yellow:        { bg: '#2d240a', text: '#fbbf24' },
};

// "R$ 1.200" sem centavos — cabe no card
const brlCurto = (v: number) => 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR');
// "PEDIDO DE FINALIZAÇÃO" → "Pedido de finalização" (as colunas foram gravadas em caixa alta)
const tituloColuna = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t);

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
  columns: RetColumn[];
}

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

const SortableCard: React.FC<SortableCardProps> = ({ client, onClick, onMove, columns }) => {
  const COLUMNS = columns;
  const [showMenu, setShowMenu] = useState(false);
  // O card tem `overflow-hidden` (para arredondar as bordas), o que recortava o menu
  // por completo — z-index não resolve, o corte acontece antes do empilhamento.
  // Solução: renderizar em portal no body, com posição fixa calculada pelo botão.
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const abrirMenu = () => {
    const r = menuBtnRef.current?.getBoundingClientRect();
    if (!r) return;
    const LARGURA = 192; // w-48
    const ALTURA = 92;   // 2 itens (Arquivar e Excluir)
    const cabeAbaixo = window.innerHeight - r.bottom > ALTURA + 8;
    setMenuPos({
      top: cabeAbaixo ? r.bottom + 4 : Math.max(8, r.top - ALTURA - 4),
      left: Math.min(Math.max(8, r.right - LARGURA), window.innerWidth - LARGURA - 8),
    });
    setShowMenu(true);
  };

  // Fecha ao clicar fora, rolar ou redimensionar — com posição fixa o menu não
  // acompanha o scroll, então fechar é mais correto do que reposicionar.
  useEffect(() => {
    if (!showMenu) return;
    const fora = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      if (menuBtnRef.current?.contains(e.target as Node)) return;
      setShowMenu(false);
    };
    const fechar = () => setShowMenu(false);
    document.addEventListener('mousedown', fora);
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      document.removeEventListener('mousedown', fora);
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [showMenu]);
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
  const valueStyle = col ? { bg: col.color + '22', text: col.color } : CARD_VALUE_STYLE['red'];

  const cardBorderClass = isDragging
    ? 'ring-2 ring-violet-500 shadow-2xl border-violet-500/50'
    : 'border-gray-200 dark:border-white/5 hover:border-violet-500/30 hover:shadow-md';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onClick(client)}
      className={`relative cursor-grab active:cursor-grabbing rounded-xl border shadow-sm transition-all duration-200 ${cardBorderClass} ${client.isArchived ? 'opacity-50 grayscale' : ''} bg-white dark:bg-dark-card`}
      style={{ ...style, marginBottom: 12 }}
    >
      <div className="p-3">
      {/* O card tinha `overflow-hidden` e recortava este selo pela metade. Com o
          menu agora em portal, nada precisa do clipping — o selo volta inteiro. */}
      {client.isArchived && (
        <div className="absolute -top-2 -right-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg shadow-sm z-10 pointer-events-none">
          Arquivado
        </div>
      )}

      {/* Molde do card do Comercial: nome em negrito, pílulas, e embaixo squad × valor */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-[13px] leading-tight text-gray-900 dark:text-white line-clamp-2 min-w-0" title={client.name}>{client.name}</h4>
          {(client.aviso_previo_date || (client.diasAtraso && client.diasAtraso > 0)) && (
            <div className="mt-2 flex items-center gap-1 flex-wrap">
              {client.aviso_previo_date && (() => {
                const d = new Date(String(client.aviso_previo_date).slice(0, 10) + 'T12:00:00');
                if (isNaN(d.getTime())) return null;
                const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
                const dias = Math.round((d.getTime() - hoje.getTime()) / 86400000);
                // vermelho quando venceu, âmbar na última semana, neutro no resto
                const cor = dias < 0
                  ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400'
                  : dias <= 7
                    ? 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-400'
                    : 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-white/10 dark:text-slate-300';
                const legenda = dias < 0 ? `venceu há ${Math.abs(dias)}d` : dias === 0 ? 'vence hoje' : `vence em ${dias}d`;
                return (
                  <span className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${cor}`} title={`Aviso prévio: ${d.toLocaleDateString('pt-BR')}`}>
                    <Calendar size={9} /> Aviso {legenda}
                  </span>
                );
              })()}
              {client.diasAtraso && client.diasAtraso > 0 ? (
                <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
                  <Clock size={9} /> Atrasado {client.diasAtraso}d
                </span>
              ) : null}
            </div>
          )}
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
              {client.proximaCobranca ? `Próx. cobrança ${new Date(String(client.proximaCobranca).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''}
            </span>
            {client.subscriptionValue ? (
              <span className="text-[11px] font-black text-emerald-500 shrink-0 ml-2">{brlCurto(client.subscriptionValue)}</span>
            ) : null}
          </div>
        </div>

        <div className="relative">
          <button
            ref={menuBtnRef}
            onClick={(e) => {
              e.stopPropagation();
              showMenu ? setShowMenu(false) : abrirMenu();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-gray-500 dark:text-slate-400 darker:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded"
          >
            <MoreHorizontal size={16} />
          </button>

          {showMenu && menuPos && createPortal(
            // O posicionamento fica num wrapper comum: passar top/left no style do
            // motion.div fazia o motion ANIMAR essas propriedades, e o menu aparecia
            // deslizando de fora da tela.
            <div ref={menuRef} style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 200 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.12 }}
                className="w-48 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-white/10 darker:border-white/5 bg-white dark:bg-dark-card"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-1 flex flex-col">
                  {/* "Mover para anterior/próxima" saíram: mover é por arrasto do card. */}
                  {client.isArchived ? (
                    // Arquivar grava crm_status='arquivado', o que apaga a coluna de
                    // origem. Desarquivar devolve para "Processo de Saída", que é onde
                    // o card já aparece enquanto arquivado.
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMove(client.id, 'processo_saida');
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors hover:bg-gray-100 dark:hover:bg-white/5 text-emerald-600 dark:text-emerald-400"
                    >
                      <ArchiveRestore size={14} /> Desarquivar
                    </button>
                  ) : (
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
                  )}
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
            </div>,
            document.body
          )}
        </div>
      </div>




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

const CrmFinanceiro = ({ pageLabel }: { pageLabel?: string } = {}) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Colunas do kanban (dinâmicas) — carregadas da API
  const [columns, setColumns] = useState<RetColumn[]>([]);
  const [colMenu, setColMenu] = useState<string | null>(null);
  const [menuQuadro, setMenuQuadro] = useState(false);
  const COLUMNS = columns; // alias: mantém as referências existentes funcionando
  const [colModal, setColModal] = useState<{ mode: 'new' | 'edit'; id?: string; title: string; emoji: string; color: string } | null>(null);
  const fetchColumns = async () => {
    try {
      const r = await fetch('/api/retencao/columns');
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) {
          setColumns(data.map((c: any) => ({ id: c.id, title: c.title, emoji: c.emoji || '📌', color: c.color || '#8b5cf6' })));
        }
      }
    } catch (e) { console.error('fetchColumns', e); }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [squadFilter, setSquadFilter] = useState<string>('Todos');
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  
  // Slide-over state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'historico' | 'financeiro' | 'checklist'>('historico');
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

  // Fast fetch: only CRM clients (filtered, much smaller dataset)
  const fetchCrmClients = async () => {
    try {
      const res = await fetch('/api/clients?crm_status=true');
      if (res.ok) setClients(await res.json());
    } catch (err) {
      console.error("Error fetching CRM clients:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Lazy fetch: all clients — only needed for "Add Client" dropdown
  const allClientsFetched = useRef(false);
  const fetchAllClients = useCallback(async () => {
    if (allClientsFetched.current) return;
    allClientsFetched.current = true;
    try {
      const res = await fetch('/api/clients');
      if (res.ok) setAllClients(await res.json());
    } catch (err) {
      console.error("Error fetching all clients:", err);
      allClientsFetched.current = false; // allow retry on error
    }
  }, []);

  // Combined re-fetch for sync/refresh button
  const fetchClients = async () => {
    allClientsFetched.current = false;
    await Promise.all([fetchCrmClients(), fetchAllClients()]);
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

  // Initial load: only fetch CRM clients + tasks (fast path)
  useEffect(() => {
    Promise.all([fetchCrmClients(), fetchTasks(), fetchColumns()]);
  }, []);

  // ── Handlers de colunas (criar / editar / mover / excluir) ──
  const saveColumn = async () => {
    if (!colModal || !colModal.title.trim()) return;
    const body = { title: colModal.title.trim(), emoji: colModal.emoji, color: colModal.color };
    try {
      if (colModal.mode === 'new') {
        const r = await fetch('/api/retencao/columns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (r.ok) { const c = await r.json(); setColumns(prev => [...prev, { id: c.id, title: c.title, emoji: c.emoji, color: c.color }]); }
      } else if (colModal.id) {
        await fetch(`/api/retencao/columns/${colModal.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        setColumns(prev => prev.map(c => c.id === colModal.id ? { ...c, ...body } : c));
      }
      setColModal(null);
    } catch (e) { console.error('saveColumn', e); }
  };
  const deleteColumn = async (id: string) => {
    const col = columns.find(c => c.id === id);
    const n = clients.filter(c => c.crmStatus === id).length;
    const msg = n > 0
      ? `Excluir a coluna "${col?.title}"? Os ${n} cliente(s) dela saem do quadro de Retenção (não são apagados).`
      : `Excluir a coluna "${col?.title}"?`;
    if (!(await confirmDialog({ message: msg, danger: true }))) return;
    try {
      await fetch(`/api/retencao/columns/${id}`, { method: 'DELETE' });
      setColumns(prev => prev.filter(c => c.id !== id));
      setClients(prev => prev.map(c => c.crmStatus === id ? { ...c, crmStatus: undefined as any } : c));
    } catch (e) { console.error('deleteColumn', e); }
  };
  const moveColumn = async (id: string, dir: -1 | 1) => {
    const idx = columns.findIndex(c => c.id === id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= columns.length) return;
    const reordered = [...columns];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(to, 0, moved);
    setColumns(reordered);
    try {
      await fetch('/api/retencao/columns/reorder', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columns: reordered.map((c, i) => ({ id: c.id, order_index: i })) }),
      });
    } catch (e) { console.error('moveColumn', e); }
  };

  // Lazy-load all clients when dropdown is opened
  useEffect(() => {
    if (isAddDropdownOpen) fetchAllClients();
  }, [isAddDropdownOpen, fetchAllClients]);

  useEffect(() => {
    if (selectedClient) {
      if (selectedClient.crmStatus === 'processo_saida') {
        setActiveTab('checklist');
      } else {
        setActiveTab('historico');
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
    const anoIncompleto = field === 'aviso_previo_date' && !!value && Number(String(value).slice(0, 4)) < 2000;
    // Optimistic update
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, [field]: value } : c));
    if (selectedClient && selectedClient.id === clientId) {
      setSelectedClient(prev => prev ? { ...prev, [field]: value } : null);
    }
    
    if (anoIncompleto) return; // ainda digitando o ano
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
            type: 'Saída',
            content: value ? `Aviso prévio registrado: ${dateStr}` : 'Aviso prévio removido'
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
        fetch(`/api/clientes/${encodeURIComponent(selectedClient.id)}/historico`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'Saída', content: 'Saída concluída: checklist completo, cliente inativado', meta: { evento: 'saida_concluida' } }),
              }).catch(() => {});
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
      const matchesSquad = true; // filtro de squad saiu da tela (13/11/2026)
      const isArchived = c.crmStatus === 'arquivado';
      
      if (isArchived && !showArchived) return false;
      return matchesSearch && matchesSquad;
    }).map(c => {
      // Map archived clients to 'processo_saida' column for display
      if (c.crmStatus === 'arquivado') {
        return { ...c, displayColumn: 'processo_saida', isArchived: true };
      }
      return { ...c, displayColumn: c.crmStatus, isArchived: false };
    });
  }, [clients, searchQuery, showArchived, squadFilter]);

  const availableClients = useMemo(() => {
    const activeColumns = columns.map(c => c.id);
    return allClients.filter(c => !c.crmStatus || !activeColumns.includes(c.crmStatus));
  }, [allClients, columns]);

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
      <CarregandoPagina />
    );
  }

  return (
    <div className="p-8 w-full">
      <PageHeader 
        title={(() => { const n = (pageLabel || 'Retenção').trim(); const i = n.lastIndexOf(' '); return i > 0 ? n.slice(0, i) : ''; })()}
        titleAccent={(() => { const n = (pageLabel || 'Retenção').trim(); const i = n.lastIndexOf(' '); return i > 0 ? n.slice(i + 1) : n; })()}
        subtitle="Acompanhamento de clientes em risco e negociações ativas."
      >
        {/* Barra do topo no molde do Comercial: busca, arquivados, atualizar e "⋮" */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-72 h-[38px] bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-lg pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            title={showArchived ? 'Ocultar arquivados' : 'Mostrar arquivados'}
            className={`h-[38px] flex items-center gap-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
              showArchived
                ? 'bg-violet-500/10 border-violet-500/40 text-violet-600 dark:text-violet-300'
                : 'bg-white dark:bg-dark-card border-gray-200 dark:border-white/10 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Archive size={15} />
            Arquivados
          </button>
          <button
            onClick={async () => {
              setIsSyncing(true);
              await fetchClients();
              setIsSyncing(false);
            }}
            disabled={isSyncing}
            title="Atualizar dados"
            className="w-[38px] h-[38px] flex items-center justify-center bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuQuadro(v => !v)}
              title="Mais opções"
              className="w-[38px] h-[38px] flex items-center justify-center bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <MoreHorizontal size={16} className="rotate-90" />
            </button>
            {menuQuadro && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuQuadro(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 min-w-[200px] bg-white dark:bg-dark-card rounded-xl shadow-xl border border-gray-100 dark:border-white/10 p-2">
                  <button
                    onClick={() => { setColModal({ mode: 'new', title: '', emoji: '📌', color: '#8b5cf6' }); setMenuQuadro(false); }}
                    className="w-full text-left flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-violet-600 dark:text-violet-400 font-bold text-sm"
                  >
                    <Plus size={14} /> Nova coluna
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </PageHeader>

      {/* Resumo da retenção — o que está em jogo antes de olhar coluna por coluna */}
      {(() => {
        const ids = new Set(COLUMNS.map(c => c.id));
        const naRetencao = filteredClients.filter(c => !c.isArchived && c.displayColumn && ids.has(c.displayColumn));
        const mrr = naRetencao.reduce((a, c) => a + (c.subscriptionValue || 0), 0);
        const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
        const avisos7 = naRetencao.filter(c => {
          if (!c.aviso_previo_date) return false;
          const d = new Date(String(c.aviso_previo_date).slice(0, 10) + 'T12:00:00');
          const dias = Math.round((d.getTime() - hoje.getTime()) / 86400000);
          return dias >= 0 && dias <= 7;
        }).length;
        const atrasados = naRetencao.filter(c => (c.diasAtraso || 0) > 0).length;
        const itens: { rotulo: string; valor: string; apoio: string; cor: string; Icone: any; alerta?: boolean }[] = [
          { rotulo: 'Clientes na retenção', valor: String(naRetencao.length), apoio: `em ${COLUMNS.length} etapas`, cor: '#8b5cf6', Icone: Users },
          { rotulo: 'Mensalidade em jogo', valor: brlCurto(mrr), apoio: 'por mês, somando as assinaturas', cor: '#10b981', Icone: DollarSign },
          { rotulo: 'Aviso prévio em 7 dias', valor: String(avisos7), apoio: avisos7 > 0 ? 'vencem nesta semana' : 'nenhum vencendo', cor: '#f59e0b', Icone: Calendar, alerta: avisos7 > 0 },
          { rotulo: 'Cobrança atrasada', valor: String(atrasados), apoio: atrasados > 0 ? 'clientes com fatura vencida' : 'ninguém em atraso', cor: '#f43f5e', Icone: AlertCircle, alerta: atrasados > 0 },
        ];
        return (
          <div className="mb-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {itens.map(({ rotulo, valor, apoio, cor, Icone, alerta }) => (
              <div key={rotulo} className="gf-cartao flex items-center gap-4 px-5 py-4">
                <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in srgb, ${cor} 14%, transparent)`, color: cor }}>
                  <Icone size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] text-slate-500 dark:text-slate-400 truncate">{rotulo}</p>
                  <p className="numero text-[26px] leading-tight text-dark-text" style={alerta ? { color: cor } : undefined}>{valor}</p>
                  <p className="text-[11.5px] text-slate-400 dark:text-slate-500 truncate">{apoio}</p>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {(
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
        <div className="flex overflow-x-auto pb-4 gap-3 items-stretch snap-x">
          {COLUMNS.map((column, colIdx) => {
            // Arquivados vêm dos mais recentes para os mais antigos; os que já estavam
            // arquivados antes de existir o carimbo (crmArchivedAt nulo) vão para o fim.
            // Os não-arquivados mantêm a ordem original da lista.
            const columnClients = filteredClients
              .filter(c => c.displayColumn === column.id)
              .sort((a, b) => {
                if (!a.isArchived && !b.isArchived) return 0;
                if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
                const ta = a.crmArchivedAt ? new Date(a.crmArchivedAt).getTime() : -Infinity;
                const tb = b.crmArchivedAt ? new Date(b.crmArchivedAt).getTime() : -Infinity;
                return tb - ta;
              });
            const ativosDaColuna = columnClients.filter(c => !c.isArchived);
            const mrrColuna = ativosDaColuna.reduce((a, c) => a + (c.subscriptionValue || 0), 0);
            return (
              <div
                key={column.id}
                className="flex flex-col flex-1 basis-0 min-h-[500px] min-w-[180px] snap-start bg-slate-50/50 dark:bg-white/[0.02] rounded-[22px] border border-gray-200 dark:border-white/5 darker:border-white/5 p-2 relative"
              >
                {/* Cabeçalho no molde do kanban do Comercial: ícone na cor, título, "R$ • N clientes" */}
                <div className="p-3 flex items-start justify-between mb-2 group/col">
                  <div className="flex items-start gap-2 pt-1 pl-1 w-full overflow-hidden">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 text-[12px]" style={{ background: column.color }}>
                      {column.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white text-[14px] leading-tight truncate pr-2" title={column.title}>{tituloColuna(column.title)}</h3>
                      <p className="text-gray-500 dark:text-slate-400 text-[11px] mt-1 font-medium flex items-center gap-1.5">
                        <span className="text-gray-600 dark:text-slate-300 font-semibold flex-shrink-0">{brlCurto(mrrColuna)}</span>
                        <span className="flex-shrink-0">•</span>
                        <span className="truncate">{ativosDaColuna.length} {ativosDaColuna.length === 1 ? 'cliente' : 'clientes'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {/* Menu da coluna (mover, editar, excluir) — como o "..." do Comercial */}
                    <div className="relative">
                      <button
                        onClick={() => setColMenu(colMenu === column.id ? null : column.id)}
                        className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {colMenu === column.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setColMenu(null)} />
                          <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] bg-white dark:bg-dark-card border border-gray-100 dark:border-white/10 rounded-xl shadow-xl p-2">
                            <button onClick={() => { setIsAddDropdownOpen(column.id); setColMenu(null); }}
                              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-violet-600 dark:text-violet-400 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                              <Plus size={15} />Adicionar cliente
                            </button>
                            <div className="h-px bg-gray-200 dark:bg-white/10 my-1" />
                            {[
                              { rotulo: 'Mover para a esquerda', icone: <ChevronLeft size={15} />, acao: () => moveColumn(column.id, -1), off: colIdx === 0 },
                              { rotulo: 'Mover para a direita', icone: <ChevronRight size={15} />, acao: () => moveColumn(column.id, 1), off: colIdx === COLUMNS.length - 1 },
                              { rotulo: 'Editar coluna', icone: <Pencil size={14} />, acao: () => setColModal({ mode: 'edit', id: column.id, title: column.title, emoji: column.emoji, color: column.color }), off: false },
                            ].map(it => (
                              <button key={it.rotulo} disabled={it.off} onClick={() => { it.acao(); setColMenu(null); }}
                                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                                {it.icone}{it.rotulo}
                              </button>
                            ))}
                            <button onClick={() => { deleteColumn(column.id); setColMenu(null); }}
                              className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors mt-1">
                              <Trash2 size={15} />Excluir
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <DroppableColumn column={column} isOver={false}>

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
                      {columnClients.length === 0 && (
                        <div className="border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 p-8 min-h-[150px] pointer-events-none">
                          <p className="font-medium text-sm">Arraste clientes para cá</p>
                          <p className="text-xs opacity-50 mt-1">Solte aqui para adicionar</p>
                        </div>
                      )}
                      {columnClients.map((client, idx) => (
                        <motion.div
                          key={client.id}
                          initial={{ opacity: 0, y: -18, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.35, delay: idx * 0.06, ease: [0.32, 0.72, 0, 1] }}
                        >
                          <SortableCard
                            client={client}
                            onClick={setSelectedClient}
                            onMove={handleMoveClient}
                            columns={columns}
                          />
                        </motion.div>
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
                columns={columns}
              />
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>
      )}

      {/* Modal criar/editar coluna */}
      {colModal && (
        <Modal isOpen onClose={() => setColModal(null)} semCabecalho maxWidth="max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-gray-900 dark:text-white">{colModal.mode === 'new' ? 'Nova coluna' : 'Editar coluna'}</h3>
              <button onClick={() => setColModal(null)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Nome</label>
                <div className="flex items-center gap-2">
                  <input value={colModal.emoji} onChange={e => setColModal({ ...colModal, emoji: e.target.value.slice(0, 2) })}
                    className="w-12 text-center text-lg bg-slate-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-2 outline-none focus:border-violet-500" title="Emoji" />
                  <input autoFocus value={colModal.title} onChange={e => setColModal({ ...colModal, title: e.target.value })}
                    onKeyDown={e => { if (e.key === 'Enter') saveColumn(); }}
                    placeholder="Ex: EM NEGOCIAÇÃO"
                    className="flex-1 bg-slate-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-violet-500" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {COLUMN_COLORS.map(c => (
                    <button key={c} onClick={() => setColModal({ ...colModal, color: c })}
                      className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 flex items-center justify-center ${colModal.color === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-dark-card ring-gray-400' : ''}`}
                      style={{ background: c }}>
                      {colModal.color === c && <Check size={14} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setColModal(null)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={saveColumn} disabled={!colModal.title.trim()} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 transition-colors">
                {colModal.mode === 'new' ? 'Criar' : 'Salvar'}
              </button>
            </div>
        </Modal>
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
                  <OptionPicker
                    value={selectedClient.crmStatus ? COLUMNS.find(c => c.id === selectedClient.crmStatus)?.title || null : null}
                    onChange={(val) => {
                      const col = COLUMNS.find(c => c.title === val);
                      handleMoveClient(selectedClient.id, col ? col.id : '');
                    }}
                    options={COLUMNS.map(c => ({ label: c.title, color: c.color }))}
                    emptyLabel="Nenhum"
                    placeholder="Nenhum"
                    compact
                  />
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
                onClick={() => setActiveTab('historico')}
                className={`pb-4 text-sm font-bold transition-all ${activeTab === 'historico' ? 'modal-tab-active' : 'text-slate-500 hover:text-light-text dark:hover:text-white'}`}
              >
                Histórico
              </button>
              <button
                onClick={() => setActiveTab('financeiro')}
                className={`pb-4 text-sm font-bold transition-all ${activeTab === 'financeiro' ? 'modal-tab-active' : 'text-slate-500 hover:text-light-text dark:hover:text-white'}`}
              >
                Financeiro
              </button>
              {/* Checklist de Saída em todas as colunas (antes só em "Processo de saída"):
                  dá para adiantar itens enquanto o cliente ainda está em aviso/negociação. */}
              <button
                onClick={() => setActiveTab('checklist')}
                className={`pb-4 text-sm font-bold transition-all ${activeTab === 'checklist' ? 'modal-tab-active' : 'text-slate-500 hover:text-light-text dark:hover:text-white'}`}
              >
                Checklist de Saída
              </button>
            </>
          )
        }
      >
        {selectedClient && (
          <div className="space-y-6">
                {activeTab === 'historico' && (
                  <CrmCommentHistory clientId={selectedClient.id} />
                )}

                {/* Mensalidade e pagamentos — o mesmo bloco da aba Financeiro dos Clientes Ativos */}
                {activeTab === 'financeiro' && (
                  <FinanceiroDoCliente
                    clientId={selectedClient.id}
                    clientName={selectedClient.name}
                    finSubscriptionId={(selectedClient as any).finSubscriptionId}
                    finPeopleGuid={selectedClient.finPeopleGuid}
                    onAlterado={fetchClients}
                  />
                )}

                {activeTab === 'checklist' && (
                  <div>
                    <CrmChecklist
                      clientId={selectedClient.id}
                      onCompleteExit={handleCompleteExit}
                      acaoExtra={(
                      <button
                        onClick={async () => {
                          if (!(await confirmDialog({ message: 'Tem certeza que deseja arquivar este cliente?', danger: false }))) return;
                          try {
                            const updateRes = await fetch(`/api/clients/${selectedClient.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'Inativo', crm_status: 'arquivado' })
                            });
                            if (!updateRes.ok) throw new Error('Failed to update client status');
                            fetch(`/api/clientes/${encodeURIComponent(selectedClient.id)}/historico`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'Saída', content: 'Cliente arquivado na Retenção e inativado', meta: { evento: 'arquivado' } }),
              }).catch(() => {});
                            setIsArchiveModalOpen(false);
                            setSelectedClient(null);
                            fetchClients();
                          } catch (err) {
                            console.error('Error archiving client:', err);
                            toast.error('Erro ao arquivar cliente');
                          }
                        }}
                        className="h-8 px-3 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-[12.5px] font-medium transition-colors flex items-center gap-1.5"
                      >
                        <Archive size={14} />
                        Arquivar cliente
                      </button>
                      )}
                    />
                  </div>
                 )}
          </div>
        )}
      </Modal>



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
            <OptionPicker
              value={newTaskData.projectId ? clients.find(c => c.id === newTaskData.projectId)?.name || null : null}
              onChange={(val) => {
                const client = clients.find(c => c.name === val);
                setNewTaskData(prev => ({ ...prev, projectId: client ? client.id : '' }));
              }}
              options={clients.filter(c => c.crmStatus).map(c => ({ label: c.name }))}
              emptyLabel="Selecione um cliente"
              placeholder="Selecione um cliente"
              className="w-full"
            />
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
