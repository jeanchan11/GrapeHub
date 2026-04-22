import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Search, Filter, 
  CheckCircle2, Circle, Clock, AlertCircle,
  Trash2, Edit2, Calendar, User, Tag,
  ChevronDown, X, Check, Loader2, ListTodo,
  ChevronUp, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/ui/Modal';
import { designSystem } from '../design-system';

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
}

const TodoPage: React.FC<{ activePage: string; onPageChange?: (page: string) => void }> = ({ activePage, onPageChange }) => {
  const { userData: authUser } = useAuth();
  
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  const formatDate = (date: Date) => {
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `Hoje, ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = currentDate.toISOString().split('T')[0];
      const [tasksRes, projectsRes, templatesRes] = await Promise.all([
        fetch(`/api/daily-tasks?date=${dateStr}&page_id=${activePage}`),
        fetch('/api/projects'),
        fetch('/api/task-templates')
      ]);
      
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (templatesRes.ok) setTemplates(await templatesRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentDate]);

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
          dueDate: currentDate.toISOString().split('T')[0],
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

  const updateTaskField = async (taskId: string, field: string, value: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (res.ok) {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Grouping logic
  const groupedTasks: Record<string, Record<string, Task[]>> = {};
  const noDateTasks: Record<string, Task[]> = {};
  
  tasks.forEach(task => {
    const groupName = task.project_group || 'Sem Grupo';
    const projectName = task.project_name || 'Sem Cliente';
    const projectId = task.project_id || 'no-project';
    
    if (selectedGroup !== 'all' && groupName !== selectedGroup) return;
    
    if (!task.dueDate) {
      if (!noDateTasks[projectId]) noDateTasks[projectId] = [];
      noDateTasks[projectId].push(task);
      return;
    }

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1">
            Daily Log <span className="text-violet-500">Operacional</span>
          </h1>
          <p className="text-slate-500 text-sm">Controle diário de campanhas e tarefas</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 px-4 font-medium text-slate-800 dark:text-white min-w-[140px] justify-center">
            <Calendar size={16} className="text-purple-500 dark:text-purple-400" />
            {formatDate(currentDate)}
          </div>
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-4">
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
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([groupName, clients]) => {
            const isGroupExpanded = expandedGroups[groupName] !== false;
            
            return (
              <div key={groupName} className="space-y-3">
                <button 
                  onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !isGroupExpanded }))}
                  className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white/90 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {isGroupExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  {groupName}
                  <span className="text-sm font-normal text-slate-500 dark:text-gray-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full border border-slate-200 dark:border-transparent">
                    {Object.keys(clients).length} clientes
                  </span>
                </button>

                <AnimatePresence>
                  {isGroupExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3 pl-6"
                    >
                      {Object.entries(clients).map(([projectId, clientTasks]) => {
                        const clientStatus = getClientStatus(clientTasks);
                        if (selectedStatus !== 'all' && clientStatus !== selectedStatus) return null;
                        
                        const isClientExpanded = expandedClients[projectId] || false;
                        const completedCount = clientTasks.filter(t => t.status === 'completed').length;
                        const progress = clientTasks.length > 0 ? (completedCount / clientTasks.length) * 100 : 0;
                        const projectName = clientTasks[0]?.project_name || 'Projeto Desconhecido';

                        return (
                          <div key={projectId} className="bg-white dark:bg-[#11111b] border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none rounded-xl overflow-hidden">
                            {/* Client Card Header */}
                            <div 
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                              onClick={() => setExpandedClients(prev => ({ ...prev, [projectId]: !isClientExpanded }))}
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-500/20 dark:to-blue-500/20 border border-purple-200 dark:border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                                  {projectName.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <h3 className="text-slate-800 dark:text-white font-medium flex items-center gap-2">
                                    {projectName}
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/10">
                                      {groupName}
                                    </span>
                                  </h3>
                                  <div className="flex items-center gap-3 mt-1">
                                    <div className="text-xs text-slate-500 dark:text-gray-500">{completedCount}/{clientTasks.length} concluídas</div>
                                    <div className="w-32 h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${progress}%` }} />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4">
                                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getClientStatusColor(clientStatus)}`}>
                                  {clientStatus}
                                </span>
                                {isClientExpanded ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                              </div>
                            </div>

                            {/* Client Tasks List */}
                            <AnimatePresence>
                              {isClientExpanded && (
                                <motion.div 
                                  initial={{ height: 0 }}
                                  animate={{ height: 'auto' }}
                                  exit={{ height: 0 }}
                                  className="border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20"
                                >
                                  <div className="p-2 space-y-1">
                                    {clientTasks.map(task => {
                                      const isCompleted = task.status === 'completed';
                                      const isTaskExpanded = expandedTasks[task.id] || false;
                                      
                                      return (
                                        <div key={task.id} className={`rounded-lg transition-colors ${isCompleted ? 'bg-green-500/5' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                          <div className="flex items-center gap-3 p-3">
                                            <button 
                                              onClick={() => toggleTaskStatus(task)}
                                              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 dark:border-gray-500 text-transparent hover:border-purple-500 dark:hover:border-purple-500 bg-white dark:bg-transparent'}`}
                                            >
                                              <Check size={14} />
                                            </button>
                                            
                                            <div className="flex-1 flex flex-col">
                                              <div className="flex items-center justify-between">
                                                <span className={`text-sm ${isCompleted ? 'text-slate-400 dark:text-gray-500 line-through' : 'text-slate-700 dark:text-gray-200'}`}>
                                                  {task.title}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  <button className="text-xs text-slate-500 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1 p-1">
                                                    <ImageIcon size={14} /> Ver print da campanha
                                                  </button>
                                                  <select 
                                                    value={task.priority || 'Média'}
                                                    onChange={(e) => updateTaskField(task.id, 'priority', e.target.value)}
                                                    className="text-xs bg-transparent border-none text-slate-500 dark:text-gray-500 focus:ring-0 cursor-pointer"
                                                  >
                                                    <option value="Baixa">Baixa</option>
                                                    <option value="Média">Média</option>
                                                    <option value="Alta">Alta</option>
                                                    <option value="Urgente">Urgente</option>
                                                  </select>
                                                  <button 
                                                    onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !isTaskExpanded }))}
                                                    className="text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-white p-1"
                                                  >
                                                    <ListTodo size={16} />
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Subtasks */}
                                          <AnimatePresence>
                                            {isTaskExpanded && (
                                              <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="pl-11 pr-4 pb-3 space-y-2"
                                              >
                                                {task.subtasks_list?.map(subtask => (
                                                  <div key={subtask.id} className="flex items-center gap-3 group">
                                                    <button 
                                                      onClick={() => toggleSubtaskStatus(subtask, task.id)}
                                                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${subtask.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-400 dark:border-gray-600 text-transparent group-hover:border-purple-500 dark:group-hover:border-purple-500 bg-white dark:bg-transparent'}`}
                                                    >
                                                      <Check size={12} />
                                                    </button>
                                                    <span className={`text-xs ${subtask.completed ? 'text-slate-400 dark:text-gray-600 line-through' : 'text-slate-600 dark:text-gray-400'}`}>
                                                      {subtask.title}
                                                    </span>
                                                  </div>
                                                ))}
                                                
                                                {addingSubtaskToTask === task.id ? (
                                                  <div className="flex items-center gap-2 mt-2">
                                                    <input 
                                                      type="text"
                                                      value={newSubtaskTitle}
                                                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                                      placeholder="Título da subtarefa..."
                                                      className="flex-1 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded px-3 py-1 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-purple-500"
                                                      onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask(task.id)}
                                                      autoFocus
                                                    />
                                                    <button onClick={() => handleAddSubtask(task.id)} className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-xs font-medium">Salvar</button>
                                                    <button onClick={() => setAddingSubtaskToTask(null)} className="text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-400"><X size={14} /></button>
                                                  </div>
                                                ) : (
                                                  <button 
                                                    onClick={() => setAddingSubtaskToTask(task.id)}
                                                    className="text-xs text-slate-500 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1 mt-2"
                                                  >
                                                    <Plus size={12} /> Adicionar subtarefa
                                                  </button>
                                                )}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      );
                                    })}
                                    
                                    {/* Add Task to Client */}
                                    <div className="p-3">
                                      {addingTaskToClient === projectId ? (
                                        <div className="flex items-center gap-2">
                                          <input 
                                            type="text"
                                            value={newTaskTitle}
                                            onChange={(e) => setNewTaskTitle(e.target.value)}
                                            placeholder="Título da tarefa..."
                                            className="flex-1 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-purple-500"
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddTask(projectId)}
                                            autoFocus
                                          />
                                          <button onClick={() => handleAddTask(projectId)} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium">Salvar</button>
                                          <button onClick={() => setAddingTaskToClient(null)} className="text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-400 p-2"><X size={18} /></button>
                                        </div>
                                      ) : (
                                        <button 
                                          onClick={() => setAddingTaskToClient(projectId)}
                                          className="text-sm text-slate-500 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-2 font-medium"
                                        >
                                          <Plus size={16} /> ADICIONAR ITEM
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          
          {Object.keys(groupedTasks).length === 0 && Object.keys(noDateTasks).length === 0 && (
            <div className="text-center py-12 text-slate-500 dark:text-gray-500">
              Nenhuma tarefa encontrada para esta data.
            </div>
          )}

          {Object.keys(noDateTasks).length > 0 && (
            <div className="space-y-3 mt-8">
              <button 
                onClick={() => setExpandedGroups(prev => ({ ...prev, 'Sem Data': prev['Sem Data'] !== false ? false : true }))}
                className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-white/90 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {expandedGroups['Sem Data'] !== false ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                Sem Data
                <span className="text-sm font-normal text-slate-500 dark:text-gray-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full border border-slate-200 dark:border-transparent">
                  {Object.keys(noDateTasks).length} clientes
                </span>
              </button>

              <AnimatePresence>
                {expandedGroups['Sem Data'] !== false && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-3 pl-6"
                  >
                    {Object.entries(noDateTasks).map(([projectId, clientTasks]) => {
                      const clientStatus = getClientStatus(clientTasks);
                      if (selectedStatus !== 'all' && clientStatus !== selectedStatus) return null;
                      
                      const isClientExpanded = expandedClients[`nodate-${projectId}`] || false;
                      const completedCount = clientTasks.filter(t => t.status === 'completed').length;
                      const progress = clientTasks.length > 0 ? (completedCount / clientTasks.length) * 100 : 0;
                      const projectName = clientTasks[0]?.project_name || 'Projeto Desconhecido';
                      const groupName = clientTasks[0]?.project_group || 'Sem Grupo';

                      return (
                        <div key={`nodate-${projectId}`} className="bg-white dark:bg-[#11111b] border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none rounded-xl overflow-hidden opacity-90 dark:opacity-80">
                          {/* Client Card Header */}
                          <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                            onClick={() => setExpandedClients(prev => ({ ...prev, [`nodate-${projectId}`]: !isClientExpanded }))}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-500/20 dark:to-gray-600/20 border border-gray-200 dark:border-gray-500/30 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold">
                                {projectName.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-slate-800 dark:text-white font-medium flex items-center gap-2">
                                  {projectName}
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/10">
                                    {groupName}
                                  </span>
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="text-xs text-slate-500 dark:text-gray-500">{completedCount}/{clientTasks.length} concluídas</div>
                                  <div className="w-32 h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-400 dark:bg-gray-500 rounded-full" style={{ width: `${progress}%` }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getClientStatusColor(clientStatus)}`}>
                                {clientStatus}
                              </span>
                              {isClientExpanded ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                            </div>
                          </div>

                          {/* Client Tasks List */}
                          <AnimatePresence>
                            {isClientExpanded && (
                              <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20"
                              >
                                <div className="p-2 space-y-1">
                                  {clientTasks.map(task => {
                                    const isCompleted = task.status === 'completed';
                                    const isTaskExpanded = expandedTasks[task.id] || false;
                                    
                                    return (
                                      <div key={task.id} className={`rounded-lg transition-colors ${isCompleted ? 'bg-green-500/5' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                                        <div className="flex items-center gap-3 p-3">
                                          <button 
                                            onClick={() => toggleTaskStatus(task)}
                                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 dark:border-gray-500 text-transparent hover:border-purple-500 dark:hover:border-purple-500 bg-white dark:bg-transparent'}`}
                                          >
                                            <Check size={14} />
                                          </button>
                                          
                                          <div className="flex-1 flex flex-col">
                                            <div className="flex items-center justify-between">
                                              <span className={`text-sm ${isCompleted ? 'text-slate-400 dark:text-gray-500 line-through' : 'text-slate-700 dark:text-gray-200'}`}>
                                                {task.title}
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <button className="text-xs text-slate-500 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1 p-1">
                                                  <ImageIcon size={14} /> Ver print da campanha
                                                </button>
                                                <select 
                                                  value={task.priority || 'Média'}
                                                  onChange={(e) => updateTaskField(task.id, 'priority', e.target.value)}
                                                  className="text-xs bg-transparent border-none text-slate-500 dark:text-gray-500 focus:ring-0 cursor-pointer"
                                                >
                                                  <option value="Baixa">Baixa</option>
                                                  <option value="Média">Média</option>
                                                  <option value="Alta">Alta</option>
                                                  <option value="Urgente">Urgente</option>
                                                </select>
                                                <button 
                                                  onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !isTaskExpanded }))}
                                                  className="text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-white p-1"
                                                >
                                                  <ListTodo size={16} />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Subtasks */}
                                        <AnimatePresence>
                                          {isTaskExpanded && (
                                            <motion.div 
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: 'auto', opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              className="pl-11 pr-4 pb-3 space-y-2"
                                            >
                                              {task.subtasks_list?.map(subtask => (
                                                <div key={subtask.id} className="flex items-center gap-3 group">
                                                  <button 
                                                    onClick={() => toggleSubtaskStatus(subtask, task.id)}
                                                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${subtask.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-400 dark:border-gray-600 text-transparent group-hover:border-purple-500 dark:group-hover:border-purple-500 bg-white dark:bg-transparent'}`}
                                                  >
                                                    <Check size={12} />
                                                  </button>
                                                  <span className={`text-xs ${subtask.completed ? 'text-slate-400 dark:text-gray-600 line-through' : 'text-slate-600 dark:text-gray-400'}`}>
                                                    {subtask.title}
                                                  </span>
                                                </div>
                                              ))}
                                              
                                              {addingSubtaskToTask === task.id ? (
                                                <div className="flex items-center gap-2 mt-2">
                                                  <input 
                                                    type="text"
                                                    value={newSubtaskTitle}
                                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                                    placeholder="Título da subtarefa..."
                                                    className="flex-1 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded px-3 py-1 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-purple-500"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask(task.id)}
                                                    autoFocus
                                                  />
                                                  <button onClick={() => handleAddSubtask(task.id)} className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-xs font-medium">Salvar</button>
                                                  <button onClick={() => setAddingSubtaskToTask(null)} className="text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-400"><X size={14} /></button>
                                                </div>
                                              ) : (
                                                <button 
                                                  onClick={() => setAddingSubtaskToTask(task.id)}
                                                  className="text-xs text-slate-500 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1 mt-2"
                                                >
                                                  <Plus size={12} /> Adicionar subtarefa
                                                </button>
                                              )}
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    );
                                  })}
                                  
                                  {/* Add Task to Client */}
                                  <div className="p-3">
                                    {addingTaskToClient === `nodate-${projectId}` ? (
                                      <div className="flex items-center gap-2">
                                        <input 
                                          type="text"
                                          value={newTaskTitle}
                                          onChange={(e) => setNewTaskTitle(e.target.value)}
                                          placeholder="Título da tarefa..."
                                          className="flex-1 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-purple-500"
                                          onKeyDown={(e) => e.key === 'Enter' && handleAddTask(projectId)}
                                          autoFocus
                                        />
                                        <button onClick={() => handleAddTask(projectId)} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium">Salvar</button>
                                        <button onClick={() => setAddingTaskToClient(null)} className="text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-400 p-2"><X size={18} /></button>
                                      </div>
                                    ) : (
                                      <button 
                                        onClick={() => setAddingTaskToClient(`nodate-${projectId}`)}
                                        className="text-sm text-slate-500 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-2 font-medium"
                                      >
                                        <Plus size={16} /> ADICIONAR ITEM
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
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
    </div>
  );
};

export default TodoPage;
