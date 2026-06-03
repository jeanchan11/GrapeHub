import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Search, Filter, 
  CheckCircle2, Circle, Clock, AlertCircle,
  Trash2, Edit2, Calendar, User, Tag,
  ChevronDown, X, Check, Loader2, ListTodo, ListChecks,
  ChevronUp, Image as ImageIcon, Scale, Paperclip, MessageSquare, Columns, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/ui/Modal';
import { designSystem } from '../design-system';
import TaskDetailModal from '../components/TaskDetailModal';
import { DatePicker } from '../components/ui/DatePicker';
import confetti from 'canvas-confetti';

interface TaskSubtask {
  id: string;
  task_id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
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
  project_group?: string;
  priority: string;
  subtasks_list?: TaskSubtask[];
  tags?: string[];
}

const TodoPage: React.FC<{ activePage: string; onPageChange?: (page: string) => void }> = ({ activePage, onPageChange }) => {
  const { userData: authUser } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewType, setViewType] = useState<'kanban' | 'list'>('kanban');

  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchTemplateId, setBatchTemplateId] = useState('');
  const [batchClientIds, setBatchClientIds] = useState<string[]>([]);
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  
  const [addingTaskToClient, setAddingTaskToClient] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [addingSubtaskToTask, setAddingSubtaskToTask] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // TaskDetailModal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const handleSubtaskAddFromModal = async (taskId: string, title: string) => {
    try {
      const res = await fetch('/api/task-subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, title, assignee: null, due_date: null })
      });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/daily-tasks?page_id=${activePage}`;

      const [tasksRes, projectsRes, templatesRes] = await Promise.all([
        fetch(url),
        fetch('/api/projects'),
        fetch('/api/task-templates')
      ]);
      
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (projectsRes.ok) {
        const p = await projectsRes.json();
        p.unshift({ id: 'no-project', partner: 'Tarefas Internas / Sem Parceiro', group: 'Sem Grupo' });
        setProjects(p);
      }
      if (templatesRes.ok) setTemplates(await templatesRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activePage]);

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const updateTaskField = async (taskId: string, field: string, value: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (res.ok) {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t));
        if (selectedTask?.id === taskId) {
          setSelectedTask(prev => prev ? { ...prev, [field]: value } : null);
        }
      }
    } catch (e) { console.error(e); }
  };

  const toggleSubtaskStatus = async (subtask: TaskSubtask, taskId: string) => {
    try {
      const res = await fetch(`/api/task-subtasks/${subtask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !subtask.completed })
      });
      if (res.ok) {
        setTasks(tasks.map(t => {
          if (t.id === taskId && t.subtasks_list) {
            return {
              ...t,
              subtasks_list: t.subtasks_list.map(st => st.id === subtask.id ? { ...st, completed: !st.completed } : st)
            };
          }
          return t;
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateBatch = async () => {
    if (!batchTemplateId || batchClientIds.length === 0) return;
    setIsSubmittingBatch(true);
    try {
      const res = await fetch('/api/task-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: batchTemplateId,
          client_ids: batchClientIds,
          date: batchDate,
          user_id: authUser?.id,
          page_id: activePage
        })
      });
      if (res.ok) {
        setIsBatchModalOpen(false);
        setBatchTemplateId('');
        setBatchClientIds([]);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleAddTask = async (projectId: string) => {
    if (!newTaskTitle.trim()) return;
    try {
      const taskId = Math.random().toString(36).substring(2, 15);
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          title: newTaskTitle,
          description: '',
          status: 'pending',
          createdBy: authUser?.id || 'system',
          assignedTo: 'all',
          createdAt: new Date().toISOString(),
          dueDate: new Date().toISOString().split('T')[0],
          subtasks: [],
          project_id: projectId,
          page_id: activePage
        })
      });
      if (res.ok) {
        setNewTaskTitle('');
        setAddingTaskToClient(null);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubtask = async (taskId: string) => {
    if (!newSubtaskTitle.trim()) return;
    try {
      const res = await fetch('/api/task-subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          title: newSubtaskTitle,
          assignee: null,
          due_date: null
        })
      });
      if (res.ok) {
        setNewSubtaskTitle('');
        setAddingSubtaskToTask(null);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };


  // Grouping logic
  const groupedTasks: Record<string, Record<string, Task[]>> = {};
  
  tasks.forEach(task => {
    const projectId = task.project_id || 'no-project';
    const groupName = (projectId === 'no-project' ? 'Sem Grupo' : task.project_group) || 'Sem Grupo';
    
    if (selectedGroup !== 'all' && groupName !== selectedGroup) return;

    if (!groupedTasks[groupName]) groupedTasks[groupName] = {};
    if (!groupedTasks[groupName][projectId]) groupedTasks[groupName][projectId] = [];
    
    groupedTasks[groupName][projectId].push(task);
  });

  const getClientStatus = (clientTasks: Task[]) => {
    if (clientTasks.length === 0) return 'SEM TAREFAS';
    if (clientTasks.some(t => t.status === 'gargalo')) return 'GARGALO';
    if (clientTasks.every(t => t.status === 'completed')) return 'OTIMIZADO';
    return 'PENDENTE';
  };

  const getClientStatusColor = (status: string) => {
    switch (status) {
      case 'OTIMIZADO': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'GARGALO': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'PENDENTE': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const totalOptimized = tasks.filter(t => t.status === 'completed').length;
  const totalPending = tasks.filter(t => t.status !== 'completed').length;

  const uniqueGroups = Array.from(new Set(projects.map(p => p.group).filter(Boolean)));

  const getProjectIcon = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    
    const projectResults = [
      { label: '-', color: 'bg-slate-500' },
      { label: 'CAMPANHA PAUSADA', color: 'bg-slate-400' },
      { label: 'TESTANDO', color: 'bg-blue-500' },
      { label: 'RESULTADO RUIM', color: 'bg-rose-500' },
      { label: 'RESULTADO OK', color: 'bg-amber-500' },
      { label: 'RESULTADO BOM', color: 'bg-emerald-500' },
      { label: 'AGUARDANDO CRIATIVOS', color: 'bg-slate-400' },
      { label: 'AGUARDANDO ARTIGO', color: 'bg-slate-400' },
      { label: 'AGUARDANDO LP', color: 'bg-slate-400' },
      { label: 'SUBIR CAMPANHA', color: 'bg-slate-400' },
    ];

    const colorMap: Record<string, { bg: string; text: string }> = {
      'bg-emerald-500': { bg: 'bg-emerald-500/20', text: 'text-emerald-500' },
      'bg-amber-500':   { bg: 'bg-amber-500/20',   text: 'text-amber-500' },
      'bg-rose-500':    { bg: 'bg-rose-500/20',    text: 'text-rose-500' },
      'bg-blue-500':    { bg: 'bg-blue-500/20',    text: 'text-blue-500' },
      'bg-slate-500':   { bg: 'bg-slate-500/20',   text: 'text-slate-500' },
      'bg-slate-400':   { bg: 'bg-slate-400/20',   text: 'text-slate-400' },
    };

    const resultBg = projectResults.find(r => r.label === project?.projectResult)?.color || 'bg-slate-500';
    const c = colorMap[resultBg] || colorMap['bg-slate-500'];

    return (
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg} ${c.text} flex-shrink-0`}>
        <Scale size={20} />
      </div>
    );
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1">
            To Do <span className="text-violet-500">Gestor</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Controle diário de campanhas e tarefas</p>
        </div>
        


        <div className="flex items-center gap-4">
          <div className="flex bg-white dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
            <button 
              onClick={() => setViewType('kanban')}
              className={`p-1.5 rounded-lg transition-colors ${viewType === 'kanban' ? 'bg-white dark:bg-white/10 text-violet-500 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-gray-300'}`}
              title="Visualização Kanban"
            >
              <Columns size={18} />
            </button>
            <button 
              onClick={() => setViewType('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewType === 'list' ? 'bg-white dark:bg-white/10 text-violet-500 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-gray-300'}`}
              title="Visualização em Lista"
            >
              <List size={18} />
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm font-medium bg-white dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10">
            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <CheckCircle2 size={16} />
              {totalOptimized} Otimizados
            </span>
            <span className="text-slate-300 dark:text-gray-600">〜</span>
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-gray-400">
              <Circle size={16} />
              {totalPending} Pendentes
            </span>
          </div>
          <button 
            onClick={() => setIsBatchModalOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
          >
            <Plus size={18} />
            Criar Lote
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white rounded-xl px-4 py-2 focus:outline-none focus:border-purple-500"
        >
          <option value="all">Todos os Grupos</option>
          {uniqueGroups.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white rounded-xl px-4 py-2 focus:outline-none focus:border-purple-500"
        >
          <option value="all">Todos os Status</option>
          <option value="OTIMIZADO">Otimizado</option>
          <option value="PENDENTE">Pendente</option>
          <option value="GARGALO">Gargalo</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-purple-500" size={32} />
        </div>
      ) : (
        <div className={viewType === 'kanban' ? "flex gap-4 overflow-x-auto pb-6 pt-2 h-[calc(100vh-200px)] items-start custom-scrollbar" : "space-y-6 pb-6 pt-2"}>
          {['Grupo 1', 'Grupo 2', 'Quarentena'].map(targetGroup => {
            const actualGroupKey = Object.keys(groupedTasks).find(k => k.toLowerCase() === targetGroup.toLowerCase());
            const groupName = actualGroupKey || targetGroup;
            const clients = actualGroupKey ? groupedTasks[actualGroupKey] : {};
            
            // Filtra os clientes baseados no status selecionado (Otimizado, Pendente, Gargalo)
            const filteredClients = Object.entries(clients).filter(([projectId, clientTasks]) => {
                const completedCount = clientTasks.filter(t => t.status === 'completed').length;
                let status: 'todo' | 'in_progress' | 'done' = 'todo';
                if (clientTasks.length > 0) {
                    if (completedCount === 0) status = 'todo';
                    else if (completedCount === clientTasks.length) status = 'done';
                    else status = 'in_progress';
                }
                
                // User filter logic
                if (selectedStatus === 'OTIMIZADO' && status !== 'done') return false;
                if (selectedStatus === 'PENDENTE' && status !== 'todo' && status !== 'in_progress') return false;
                if (selectedStatus === 'GARGALO' && !clientTasks.some(t => t.status === 'gargalo')) return false;
                
                return true;
            });
            
            if (filteredClients.length === 0) return null;

            const isGroupExpanded = expandedGroups[groupName] !== false;
            
            const renderCards = () => filteredClients.map(([projectId, clientTasks]) => {
                      const completedCount = clientTasks.filter(t => t.status === 'completed').length;
                      const progress = clientTasks.length > 0 ? (completedCount / clientTasks.length) * 100 : 0;
                      const projectName = projectId === 'no-project' ? 'Tarefas Internas / Sem Parceiro' : (clientTasks[0]?.project_name || 'Projeto Desconhecido');
                      const isClientExpanded = expandedClients[groupName + projectId] || false;
                      const isDone = progress === 100;

                      return (
                         <div key={projectId} className="flex flex-col rounded-2xl bg-dark-card border border-white/[0.06] hover:border-violet-500/25 transition-all shadow-sm flex-shrink-0">
                            {/* Client Card Header */}
                            <div 
                              className="p-4 cursor-pointer"
                              onClick={() => setExpandedClients(prev => ({ ...prev, [groupName + projectId]: !isClientExpanded }))}
                            >
                              {viewType === 'list' ? (
                                <div className="flex items-start gap-3">
                                  {getProjectIcon(projectId)}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-dark-text truncate pr-2">{projectName}</h4>
                                    <div className="w-[300px] shrink-0 mt-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-dark-text/40">{completedCount}/{clientTasks.length} tarefas</span>
                                        <span className="text-[10px] font-bold text-violet-400">{Math.round(progress)}%</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-dark-text/10 rounded-full mt-1.5 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${progress}%` }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-3">
                                  {getProjectIcon(projectId)}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-dark-text truncate pr-2">{projectName}</h4>
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="text-[10px] font-bold text-dark-text/40">{completedCount}/{clientTasks.length} tarefas</span>
                                      <span className="text-[10px] font-bold text-violet-400">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-dark-text/10 rounded-full mt-1.5 overflow-hidden">
                                      <div className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${progress}%` }} />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Subtasks Expanded View */}
                            <AnimatePresence>
                              {isClientExpanded && (
                                 <motion.div
                                   initial={{ height: 0, opacity: 0 }}
                                   animate={{ height: 'auto', opacity: 1 }}
                                   exit={{ height: 0, opacity: 0 }}
                                   className="border-t border-white/[0.06] bg-dark-bg/50 rounded-b-2xl"
                                 >
                                    <div className="p-3 space-y-1.5">
                                      {clientTasks.map(task => {
                                         const isCompleted = task.status === 'completed';
                                         return (
                                            <div key={task.id} className="flex items-center gap-2.5 p-2 hover:bg-white/5 rounded-xl group/task transition-colors">
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (task.status !== 'completed') {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const x = (rect.left + rect.width / 2) / window.innerWidth;
                                                    const y = (rect.top + rect.height / 2) / window.innerHeight;
                                                    confetti({
                                                      particleCount: 30,
                                                      spread: 50,
                                                      scalar: 0.6,
                                                      origin: { x, y },
                                                      colors: ['#8B5CF6', '#A78BFA', '#C4B5FD'],
                                                      disableForReducedMotion: true,
                                                      zIndex: 100
                                                    });
                                                  }
                                                  toggleTaskStatus(task);
                                                }}
                                                className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
                                                  isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-dark-text/20 hover:border-violet-400'
                                                }`}
                                              >
                                                {isCompleted && <Check size={10} className="text-white" />}
                                              </button>
                                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <span 
                                                  onClick={(e) => { e.stopPropagation(); openTaskDetail(task); }}
                                                  className={`text-xs block cursor-pointer transition-colors ${isCompleted ? 'line-through text-dark-text/40 hover:text-dark-text/60' : 'text-dark-text hover:text-violet-400'}`}
                                                >
                                                  {task.title}
                                                </span>
                                                {task.subtasks_list && task.subtasks_list.length > 0 && (
                                                  <div className="mt-1">
                                                    <span className="text-[9px] font-semibold text-dark-text/30 flex items-center gap-1 bg-dark-text/5 px-1.5 py-0.5 rounded-full w-fit">
                                                      <ListChecks size={9} />
                                                      {task.subtasks_list.filter(s => s.completed).length}/{task.subtasks_list.length}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                              
                                              <div className="flex items-center gap-2 flex-shrink-0">
                                                {/* Tags Logic (Max 1 Tag) */}
                                                {(task.tags && task.tags.length > 0) ? (
                                                  <span className="text-[9px] font-semibold text-violet-400 flex items-center gap-1 bg-violet-400/10 border border-violet-400/20 px-1.5 py-0.5 rounded-full">
                                                    <Tag size={9} />
                                                    {task.tags[0]}
                                                    <button 
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateTaskField(task.id, 'tags', []);
                                                      }}
                                                      className="hover:text-red-400 ml-0.5"
                                                    >
                                                      <X size={8} />
                                                    </button>
                                                  </span>
                                                ) : (
                                                  <div className="relative group/tagdrop" onClick={(e) => e.stopPropagation()}>
                                                    <button className="text-[9px] font-semibold text-dark-text/30 flex items-center gap-1 bg-dark-text/5 px-1.5 py-0.5 rounded-full hover:bg-dark-text/10 transition-colors" title="Adicionar Tag">
                                                      <Plus size={9} /> Tag
                                                    </button>
                                                    <div className="absolute right-0 top-full mt-1 bg-[#1A1A24] border border-white/10 rounded-lg shadow-xl py-1 hidden group-hover/tagdrop:block z-[60] min-w-[120px]">
                                                       {['Facebook', 'Google', 'CRM', 'Otimização'].map(option => (
                                                         <button 
                                                           key={option}
                                                           onClick={() => {
                                                             updateTaskField(task.id, 'tags', [option]);
                                                           }}
                                                           className="w-full text-left px-3 py-1.5 text-[10px] text-dark-text hover:bg-white/5 transition-colors"
                                                         >
                                                           {option}
                                                         </button>
                                                       ))}
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Date Selector */}
                                                <DatePicker 
                                                  value={task.dueDate || null}
                                                  onChange={(val) => updateTaskField(task.id, 'dueDate', val)}
                                                />
                                              </div>
                                            </div>
                                         );
                                      })}
                                      
                                      {/* Add Task Quick Input */}
                                      <div className="pt-2 mt-2 border-t border-white/[0.06]">
                                        {addingTaskToClient === groupName + projectId ? (
                                          <div className="flex items-center gap-2">
                                            <input 
                                              type="text"
                                              value={newTaskTitle}
                                              onChange={(e) => setNewTaskTitle(e.target.value)}
                                              placeholder="Nova tarefa..."
                                              className="flex-1 bg-dark-card border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:outline-none focus:border-violet-500"
                                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(projectId); }}
                                              autoFocus
                                            />
                                            <button onClick={() => handleAddTask(projectId)} className="bg-violet-600 hover:bg-violet-700 text-white p-1.5 rounded-lg"><Check size={14}/></button>
                                            <button onClick={() => setAddingTaskToClient(null)} className="text-dark-text/40 hover:text-red-400 p-1.5"><X size={14}/></button>
                                          </div>
                                        ) : (
                                          <button 
                                            onClick={() => setAddingTaskToClient(groupName + projectId)}
                                            className="text-[10px] font-bold text-dark-text/40 hover:text-violet-400 uppercase tracking-widest flex items-center gap-1 px-2 py-1 w-full"
                                          >
                                            <Plus size={12} /> Adicionar Tarefa
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                 </motion.div>
                              )}
                            </AnimatePresence>
                         </div>
                      );
                   });

            if (viewType === 'kanban') {
              return (
                <div key={groupName} className="flex-1 min-w-[340px] max-w-[500px] rounded-3xl bg-dark-bg/40 border border-white/[0.06] p-4 flex flex-col gap-3 max-h-full overflow-y-auto custom-scrollbar">
                   <div className="flex items-center justify-between px-1 mb-1">
                     <h3 className="text-[11px] font-bold text-dark-text uppercase tracking-widest">{groupName}</h3>
                     <span className="text-[10px] bg-dark-text/10 px-2 py-0.5 rounded-full text-dark-text/60 font-bold">{filteredClients.length}</span>
                   </div>
                   
                   <div className="flex flex-col gap-3">
                     {renderCards()}
                   </div>
                </div>
              );
            }

            return (
              <div key={groupName} className="bg-dark-bg/40 border border-white/[0.06] rounded-3xl overflow-hidden mb-6">
                <button 
                  onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !isGroupExpanded }))}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isGroupExpanded ? <ChevronDown size={20} className="text-violet-500" /> : <ChevronRight size={20} className="text-violet-500" />}
                    <h3 className="text-[14px] font-bold text-dark-text uppercase tracking-widest">{groupName}</h3>
                    <span className="text-[10px] bg-dark-text/10 px-2 py-0.5 rounded-full text-dark-text/60 font-bold ml-2">
                      {filteredClients.length} parceiros
                    </span>
                  </div>
                </button>

                <AnimatePresence>
                  {isGroupExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4"
                    >
                      <div className="flex flex-col gap-3 pt-2">
                        {renderCards()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          
          {Object.keys(groupedTasks).length === 0 && (
            <div className="text-center w-full py-12 text-dark-text/40 font-medium">
              Nenhuma tarefa encontrada.
            </div>
          )}
        </div>
      )}

      {/* Batch Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Criar Lote de Tarefas"
        maxWidth="max-w-lg"
        footer={
          <>
            <button 
              onClick={() => setIsBatchModalOpen(false)}
              className={designSystem.button.secondary}
            >
              Cancelar
            </button>
            <button 
              onClick={handleCreateBatch}
              disabled={!batchTemplateId || batchClientIds.length === 0 || isSubmittingBatch}
              className={designSystem.button.primary}
            >
              {isSubmittingBatch ? <Loader2 className="animate-spin" size={18} /> : null}
              Criar Lote
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className={designSystem.input.label}>Modelo de Tarefas</label>
            <div className="flex gap-2">
              <select 
                value={batchTemplateId}
                onChange={(e) => setBatchTemplateId(e.target.value)}
                className={`flex-1 ${designSystem.input.field}`}
              >
                <option value="">Selecione um modelo...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setIsBatchModalOpen(false);
                  if (onPageChange) onPageChange('task-templates');
                }}
                className="flex items-center justify-center min-w-[42px] bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors shrink-0 shadow-lg shadow-violet-500/20 border border-violet-500"
                title="Criar novo modelo"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          
          <div>
            <label className={designSystem.input.label}>Data do Lote</label>
            <input 
              type="date"
              value={batchDate}
              onChange={(e) => setBatchDate(e.target.value)}
              className={designSystem.input.field}
            />
          </div>
          
          <div>
            <label className={`${designSystem.input.label} flex justify-between`}>
              <span>Clientes ({batchClientIds.length} selecionados)</span>
              <button 
                onClick={() => setBatchClientIds(projects.map(p => p.id))}
                className="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300 text-xs normal-case"
              >
                Selecionar Todos
              </button>
            </label>
            <div className="max-h-48 overflow-y-auto bg-gray-50 dark:bg-neutral-900 darker:bg-black border border-gray-200 dark:border-neutral-700 darker:border-neutral-800 rounded-xl p-2 space-y-1">
              {projects.map(p => (
                <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 darker:hover:bg-neutral-900 rounded-lg cursor-pointer transition-colors">
                  <input 
                    type="checkbox"
                    checked={batchClientIds.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) setBatchClientIds([...batchClientIds, p.id]);
                      else setBatchClientIds(batchClientIds.filter(id => id !== p.id));
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 bg-transparent"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">{p.partner} <span className="text-gray-500 text-xs ml-2">({p.group || 'Sem Grupo'})</span></span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedTask(null); }}
        task={selectedTask ? tasks.find(t => t.id === selectedTask.id) || selectedTask : null}
        onTaskUpdate={(taskId, field, value) => {
          updateTaskField(taskId, field, value);
        }}
        onSubtaskToggle={(subtask, taskId) => {
          toggleSubtaskStatus(subtask, taskId);
        }}
        onSubtaskAdd={handleSubtaskAddFromModal}
        onRefresh={fetchData}
      />
    </div>
  );
};

export default TodoPage;
