import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, AlertCircle, ListTodo, Calendar, User, MoreHorizontal, Trash2, Edit2, PlayCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { TaskHistory } from './TaskHistory';

interface Subtask {
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
  projectId: string;
  subtasks?: Subtask[];
}

interface Template {
  id: number;
  name: string;
  description: string;
  items?: any[];
}

export const ProjectTasks: React.FC<{ projectId: string }> = ({ projectId }) => {
  const { userData } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // New task form
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('all');

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        
        // Fetch subtasks for each task
        const tasksWithSubtasks = await Promise.all(data.map(async (task: Task) => {
          const subRes = await fetch(`/api/task-subtasks?task_id=${task.id}`);
          if (subRes.ok) {
            task.subtasks = await subRes.json();
          } else {
            task.subtasks = [];
          }
          return task;
        }));
        
        setTasks(tasksWithSubtasks);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/task-templates');
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTasks();
      fetchTemplates();
    }
  }, [projectId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          description: '',
          status: 'pending',
          createdBy: userData?.id || 'unknown',
          assignedTo: newTaskAssignee,
          dueDate: newTaskDueDate || null,
          project_id: projectId
        })
      });

      if (res.ok) {
        setNewTaskTitle('');
        setNewTaskDueDate('');
        setNewTaskAssignee('all');
        setShowNewTaskForm(false);
        fetchTasks();
      }
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/task-subtasks/${subtaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed, user_id: userData?.id })
      });

      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Error toggling subtask:', err);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, user_id: userData?.id })
      });

      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  const handleApplyTemplate = async (templateId: number, templateName: string, itemsCount: number) => {
    if (!confirm(`Aplicar modelo "${templateName}"? Isso criará ${itemsCount} tarefas/subtarefas.`)) {
      return;
    }

    setIsApplyingTemplate(true);
    setShowTemplateDropdown(false);

    try {
      const res = await fetch(`/api/task-templates/${templateId}/apply?project_id=${projectId}&user_id=${userData?.id}`, {
        method: 'POST'
      });

      if (res.ok) {
        fetchTasks();
      } else {
        alert('Erro ao aplicar modelo');
      }
    } catch (err) {
      console.error('Error applying template:', err);
      alert('Erro ao aplicar modelo');
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Group tasks
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));

  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const groupedTasks = {
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'),
    today: tasks.filter(t => t.dueDate && new Date(t.dueDate).getTime() === now.getTime()),
    thisWeek: tasks.filter(t => t.dueDate && new Date(t.dueDate) > now && new Date(t.dueDate) <= endOfWeek),
    thisMonth: tasks.filter(t => t.dueDate && new Date(t.dueDate) > endOfWeek && new Date(t.dueDate) <= endOfMonth),
    future: tasks.filter(t => t.dueDate && new Date(t.dueDate) > endOfMonth),
    noDate: tasks.filter(t => !t.dueDate)
  };

  const renderTaskGroup = (title: string, groupTasks: Task[], colorClass: string, defaultExpanded = true) => {
    if (groupTasks.length === 0) return null;
    
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h4 className={`text-sm font-bold uppercase tracking-widest ${colorClass}`}>{title}</h4>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 text-xs font-bold">
            {groupTasks.length}
          </span>
        </div>
        <div className="space-y-3">
          {groupTasks.map(task => {
            const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
            const totalSubtasks = task.subtasks?.length || 0;
            const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
            const isExpanded = expandedTasks[task.id];

            return (
              <div key={task.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  <button 
                    onClick={() => handleUpdateTaskStatus(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                    className={`flex-shrink-0 transition-colors ${task.status === 'completed' ? 'text-emerald-500' : 'text-slate-300 hover:text-violet-500'}`}
                  >
                    {task.status === 'completed' ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <h5 className={`font-bold truncate ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-light-text dark:text-white'}`}>
                      {task.title}
                    </h5>
                    {totalSubtasks > 0 && (
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                          {completedSubtasks} de {totalSubtasks}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    {task.dueDate && (
                      <div className={`flex items-center gap-1 text-xs font-medium ${new Date(task.dueDate) < now && task.status !== 'completed' ? 'text-rose-500' : 'text-slate-500'}`}>
                        <Calendar size={14} />
                        {new Intl.DateTimeFormat('pt-BR').format(new Date(task.dueDate))}
                      </div>
                    )}
                    
                    {totalSubtasks > 0 && (
                      <button 
                        onClick={() => toggleTaskExpanded(task.id)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
                      >
                        <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                    {totalSubtasks === 0 && (
                      <button 
                        onClick={() => toggleTaskExpanded(task.id)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
                      >
                        <Clock size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Subtasks & History */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20"
                    >
                      {totalSubtasks > 0 && (
                        <div className="p-4 pl-12 space-y-2 border-b border-slate-100 dark:border-white/5">
                          {task.subtasks?.map(subtask => (
                            <div key={subtask.id} className="flex items-center gap-3 group">
                              <button 
                                onClick={() => handleToggleSubtask(subtask.id, !subtask.completed)}
                                className={`flex-shrink-0 transition-colors ${subtask.completed ? 'text-emerald-500' : 'text-slate-300 group-hover:text-violet-500'}`}
                              >
                                {subtask.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                              </button>
                              <span className={`text-sm flex-1 ${subtask.completed ? 'text-slate-400 line-through' : 'text-slate-600 dark:text-slate-300'}`}>
                                {subtask.title}
                              </span>
                              {subtask.due_date && (
                                <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                  <Calendar size={12} />
                                  {new Intl.DateTimeFormat('pt-BR').format(new Date(subtask.due_date))}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* History Component */}
                      <TaskHistory taskId={task.id} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Carregando tarefas...</div>;
  }

  return (
    <div className="mt-8 border-t border-slate-200 dark:border-white/10 pt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ListTodo size={20} className="text-violet-500" />
          <h3 className="text-lg font-bold text-light-text dark:text-white">Tarefas do Projeto</h3>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              disabled={isApplyingTemplate}
              className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isApplyingTemplate ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ListTodo size={14} />
              )}
              Aplicar Modelo
              <ChevronDown size={14} />
            </button>
            
            {showTemplateDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-10 overflow-hidden">
                <div className="p-2">
                  {templates.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">Nenhum modelo disponível</div>
                  ) : (
                    templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => handleApplyTemplate(template.id, template.name, template.items?.length || 0)}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <div className="text-sm font-bold text-light-text dark:text-white">{template.name}</div>
                        <div className="text-[10px] text-slate-500">{template.items?.length || 0} itens</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => setShowNewTaskForm(true)}
            className="px-4 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            <Plus size={14} />
            Nova Tarefa
          </button>
        </div>
      </div>

      {showNewTaskForm && (
        <form onSubmit={handleCreateTask} className="mb-8 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-4">
          <input
            type="text"
            placeholder="Título da tarefa..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-colors"
            autoFocus
          />
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNewTaskForm(false)}
                className="px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="px-6 py-3 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {renderTaskGroup('Atrasadas', groupedTasks.overdue, 'text-rose-500')}
        {renderTaskGroup('Hoje', groupedTasks.today, 'text-amber-500')}
        {renderTaskGroup('Esta Semana', groupedTasks.thisWeek, 'text-blue-500')}
        {renderTaskGroup('Este Mês', groupedTasks.thisMonth, 'text-violet-500')}
        {renderTaskGroup('Próximos Meses', groupedTasks.future, 'text-emerald-500')}
        {renderTaskGroup('Sem Data', groupedTasks.noDate, 'text-slate-500')}
        
        {tasks.length === 0 && !showNewTaskForm && (
          <div className="text-center py-12 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
            <ListTodo size={32} className="mx-auto text-slate-400 mb-3" />
            <p className="text-slate-500 font-medium">Nenhuma tarefa vinculada a este projeto.</p>
          </div>
        )}
      </div>
    </div>
  );
};
