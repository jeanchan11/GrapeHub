import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { 
  Plus, Search, Filter, MessageSquare, Clock, Trash2, 
  ChevronRight, Flame, DollarSign, X, Edit2, ChevronDown, Check, Users, LayoutGrid
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
import { designSystem } from '../design-system';
import { useAuth } from '../contexts/AuthContext';

interface Lead {
  id: string;
  nome: string;
  telefone: string | null;
  origem: string;
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

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
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
  onClick: () => void;
  onMove: (leadId: string, newColumn: string) => void | Promise<void>;
  onDelete: (leadId: string) => void | Promise<void>;
  onEditValue: (leadId: string, newValue: number) => void | Promise<void>;
  onHistory: () => void;
  isOverlay?: boolean;
}

const SortableCard = (props: SortableCardProps) => {
  const { lead, users, columns, onClick, onMove, onDelete, onEditValue, onHistory, isOverlay = false } = props;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-dark-card rounded-xl p-4 border border-gray-200 dark:border-white/5 shadow-sm cursor-grab active:cursor-grabbing relative group ${isDragging ? 'ring-2 ring-violet-500' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between mb-3">
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
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-slate-300`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  lead.origem === 'Indicação' ? 'bg-orange-500' : 
                  lead.origem === 'TCV' ? 'bg-emerald-500' : 
                  'bg-blue-500'
                }`}></span>
                {lead.origem}
              </span>
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

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 mb-3 flex items-center justify-between group/value">
        {isEditingValue ? (
          <input
            type="number"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => {
              setIsEditingValue(false);
              if (Number(editValue) !== lead.valor) {
                onEditValue(lead.id, Number(editValue));
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                setIsEditingValue(false);
                if (Number(editValue) !== lead.valor) {
                  onEditValue(lead.id, Number(editValue));
                }
              }
            }}
            className="w-full bg-white dark:bg-black/40 border border-emerald-500/30 rounded px-2 py-1 text-sm font-black text-emerald-500 outline-none"
            autoFocus
            onPointerDown={e => e.stopPropagation()}
          />
        ) : (
          <div className="flex items-center gap-2 w-full">
            <div className="text-sm font-black text-emerald-500">
              {formatCurrency(lead.valor)}
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEditingValue(true); }}
              onPointerDown={e => e.stopPropagation()}
              className="opacity-0 group-hover/value:opacity-100 text-emerald-500/50 hover:text-emerald-500 transition-opacity ml-auto"
            >
              <Edit2 size={12} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-slate-400">
          <Clock size={12} />
          <span>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400">0</span>
          <button 
            onPointerDown={e => e.stopPropagation()}
            className="w-5 h-5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            <ChevronRight size={12} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-white/5 text-gray-500 dark:text-slate-400">
        <button 
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          onPointerDown={e => e.stopPropagation()}
          className="flex items-center gap-1.5 text-xs font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <MessageSquare size={14} />
          <span>Chat</span>
        </button>
        
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onHistory(); }}
            onPointerDown={e => e.stopPropagation()}
            className="hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Histórico"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
              <path d="M12 7v5l4 2"></path>
            </svg>
          </button>
          
          <button
            onPointerDown={e => e.stopPropagation()}
            className="hover:text-gray-900 dark:hover:text-white transition-colors"
            title="Arquivar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="21 8 21 21 3 21 3 8"></polyline>
              <rect x="1" y="3" width="22" height="5"></rect>
              <line x1="10" y1="12" x2="14" y2="12"></line>
            </svg>
          </button>
          
          <button
            onPointerDown={e => e.stopPropagation()}
            className="hover:text-emerald-500 transition-colors"
            title="Financeiro"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </button>
          
          <div className="relative group/move">
            <button 
              onPointerDown={e => e.stopPropagation()}
              className="hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Mover coluna"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
              </svg>
            </button>
            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-white/10 py-2 opacity-0 invisible group-hover/move:opacity-100 group-hover/move:visible transition-all z-10">
              {columns.map(col => (
                <button
                  key={col.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(lead.id, col.id);
                  }}
                  onPointerDown={e => e.stopPropagation()}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 ${lead.coluna === col.id ? 'text-violet-500 font-bold' : 'text-gray-700 dark:text-slate-300'}`}
                >
                  {col.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CrmComercial = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [kanbans, setKanbans] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
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
  const [newKanbanData, setNewKanbanData] = useState({
    nome: '',
    descricao: '',
    cor: 'blue'
  });
  const [isNewColumnModalOpen, setIsNewColumnModalOpen] = useState(false);
  const [newColumnData, setNewColumnData] = useState({
    title: '',
    color: 'orange'
  });

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
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLeadForComments, setSelectedLeadForComments] = useState<Lead | null>(null);
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<Lead | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
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
      const [leadsRes, usersRes, columnsRes] = await Promise.all([
        fetch(`/api/crm-comercial/leads?kanban_id=${activeKanbanId}`),
        fetch('/api/users'),
        fetch(`/api/crm-comercial/columns?kanban_id=${activeKanbanId}`)
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
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchKanbans();
  }, []);

  useEffect(() => {
    if (activeKanbanId) {
      localStorage.setItem('activeKanbanId', activeKanbanId);
      fetchData();
    }
  }, [activeKanbanId]);

  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const lowerQuery = searchQuery.toLowerCase();
    return leads.filter(l => 
      l.nome.toLowerCase().includes(lowerQuery) || 
      (l.telefone && l.telefone.toLowerCase().includes(lowerQuery))
    );
  }, [leads, searchQuery]);

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

      if (isOverLead && prev[activeIndex].coluna !== prev[overIndex].coluna) {
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

    let newColumn = '';
    
    setLeads(prev => {
      const activeIndex = prev.findIndex(l => l.id === leadId);
      const overIndex = prev.findIndex(l => l.id === overId);
      
      if (activeIndex === -1) return prev;
      
      let newLeads = [...prev];
      newColumn = newLeads[activeIndex].coluna;

      if (columns.some(c => c.id === overId)) {
        newColumn = overId;
      } else if (overIndex !== -1) {
        newColumn = newLeads[overIndex].coluna;
      }

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
                      {!kanban.is_default && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteKanban(kanban.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md text-gray-400 dark:text-slate-400 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
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

        <button className="p-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
      </div>

      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-white/5 rounded-full px-4 py-1.5">
          <button className="p-1 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ChevronRight size={14} className="rotate-180" />
          </button>
          <span className="text-xs text-gray-500 dark:text-slate-400">Navegue pelas colunas</span>
          <button className="p-1 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors">
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
        <div className="flex overflow-x-auto pb-4 gap-6 items-stretch snap-x flex-1">
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
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                        <line x1="15" y1="3" x2="15" y2="21"></line>
                      </svg>
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
                    <button className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                      </svg>
                    </button>
                    <button className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-500 transition-colors">
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
                              onClick={() => {
                                setSelectedLeadForComments(lead);
                                fetchComments(lead.id);
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
                <option value="Indicação" className="bg-light-sidebar dark:bg-dark-sidebar">Indicação</option>
                <option value="TCV" className="bg-light-sidebar dark:bg-dark-sidebar">TCV</option>
                <option value="Mensal" className="bg-light-sidebar dark:bg-dark-sidebar">Mensal</option>
                <option value="Outro" className="bg-light-sidebar dark:bg-dark-sidebar">Outro</option>
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
        </div>
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
    </div>
  );
};

export default CrmComercial;
