import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SplitHeadline from '../components/SplitHeadline';
import ListaTaskDetailModal from '../components/ListaTaskDetailModal';
import { Plus, ChevronDown, ChevronRight, Calendar, Users, Tag, MoreHorizontal, Circle, CheckCircle2, Loader2, X, Trash2, GripVertical, Settings, Check, Edit2, Layers, Pencil } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  DndContext,
  closestCorners,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableListRow } from '../components/kanban/SortableListRow';
import { DroppableListGroup } from '../components/kanban/DroppableListGroup';

// ── Types ─────────────────────────────────────────────────
interface Task {
  id: number;
  client_name: string;
  status_group: string;
  created_at: string;
  subtask_count: number;
  order_index?: number;
}

interface Subtask {
  id: number;
  task_id: number;
  title: string;
  completed: boolean;
  order_index: number;
}

interface StatusGroupDef {
  id: string;
  page_id: string;
  label: string;
  color: string;
  emoji: string;
  order_index: number;
}

interface StatusGroup extends StatusGroupDef {
  tasks: Task[];
}

// ── TaskRow ───────────────────────────────────────────────
const TaskRow = ({ task, onUpdate, onDelete, onOpenDetail, dragHandleProps }: { task: Task; onUpdate: () => void; onDelete: (id: number) => void; onOpenDetail: (task: Task) => void; dragHandleProps?: any }) => {
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [newSubTitle, setNewSubTitle] = useState('');

  const fetchSubtasks = async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch(`/api/onboarding-tasks/${task.id}/subtasks`);
      if (res.ok) setSubtasks(await res.json());
    } catch { /* silent */ } finally { setLoadingSubs(false); }
  };

  useEffect(() => {
    if (expanded) fetchSubtasks();
  }, [expanded]);

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

  const addSubtask = async () => {
    if (!newSubTitle.trim()) return;
    try {
      const res = await fetch(`/api/onboarding-tasks/${task.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubTitle.trim() }),
      });
      if (res.ok) {
        const newSub = await res.json();
        setSubtasks(prev => [...prev, newSub]);
        setNewSubTitle('');
        onUpdate();
      }
    } catch { /* silent */ }
  };

  const deleteSubtask = async (subId: number) => {
    setSubtasks(prev => prev.filter(s => s.id !== subId));
    try {
      await fetch(`/api/onboarding-subtasks/${subId}`, { method: 'DELETE' });
      onUpdate();
    } catch { /* silent */ }
  };

  const completedCount = subtasks.filter(s => s.completed).length;

  return (
    <div className="border-b border-black/[0.06] dark:border-white/[0.06] last:border-none">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors group">
        <div {...(dragHandleProps?.attributes || {})} {...(dragHandleProps?.listeners || {})} className="w-[14px] shrink-0 flex justify-center cursor-grab active:cursor-grabbing text-slate-700 hover:text-slate-500">
          <GripVertical size={12} />
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-slate-300 transition-colors">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex items-center justify-center shrink-0">
          <div className="w-2 h-2 rounded-full bg-slate-500" />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenDetail(task)}>
          <span className="text-sm font-medium text-dark-text hover:text-violet-400 transition-colors">{task.client_name}</span>
        </div>
        {task.subtask_count > 0 && (
          <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
            ↳ {task.subtask_count}
          </span>
        )}
        <button
          onClick={() => { if (confirm('Excluir esta tarefa?')) onDelete(task.id); }}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Subtasks inline */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            style={{ overflow: 'hidden' }}
            className="bg-black/[0.01] dark:bg-white/[0.01] border-b border-black/5 dark:border-white/5"
          >
            {loadingSubs ? (
              <div className="flex items-center gap-2 px-12 py-3 text-xs text-slate-500">
                <Loader2 size={12} className="animate-spin" /> Carregando subtarefas...
              </div>
            ) : (
              <div className="pb-2">
                <div className="px-12 py-2 flex items-center gap-2 border-b border-white/5 mb-1 bg-white/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Subtarefas
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {completedCount}/{subtasks.length}
                  </span>
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden ml-1 max-w-[200px]">
                    <div className="h-full bg-violet-500 rounded-full transition-all duration-300"
                      style={{ width: `${subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="space-y-1">
                  {subtasks.map(sub => (
                    <div key={sub.id} className="flex items-center gap-2 px-12 py-1.5 hover:bg-white/[0.02] transition-colors group/sub">
                      <div className="w-4 shrink-0 flex items-center justify-center">
                        <button
                          onClick={() => toggleSubtask(sub)}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            sub.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-violet-500'
                          }`}
                        >
                          {sub.completed && <CheckCircle2 size={10} className="text-white" />}
                        </button>
                      </div>
                      <span className={`text-xs flex-1 ${sub.completed ? 'text-slate-500 line-through' : 'text-dark-text'}`}>
                        {sub.title}
                      </span>
                      <button
                        onClick={() => deleteSubtask(sub.id)}
                        className="opacity-0 group-hover/sub:opacity-100 p-0.5 text-slate-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 px-12 py-1.5">
                    <div className="w-4 shrink-0 flex justify-center">
                      <Plus size={12} className="text-slate-600" />
                    </div>
                    <input
                      value={newSubTitle}
                      onChange={e => setNewSubTitle(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSubtask()}
                      placeholder="Adicionar Tarefa..."
                      className="flex-1 bg-transparent text-xs text-dark-text placeholder-slate-600 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── GroupBlock ─────────────────────────────────────────────
const GroupBlock = ({
  group,
  pageId,
  onUpdate,
  onAddTask,
  onRenameGroup,
  onUpdateGroup,
  onDeleteGroup,
  onDeleteTask,
  onOpenDetail,
  dragHandleProps,
}: {
  group: StatusGroup;
  pageId: string;
  onUpdate: () => void;
  onAddTask: (groupId: string) => void;
  onRenameGroup: (id: string, label: string) => void;
  onUpdateGroup: (id: string, fields: { color?: string; emoji?: string }) => void;
  onDeleteGroup: (id: string) => void;
  onDeleteTask: (id: number) => void;
  onOpenDetail: (task: Task) => void;
  dragHandleProps: any;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(group.label);
  const [showMenu, setShowMenu] = useState(false);

  const saveRename = () => {
    if (editLabel.trim() && editLabel.trim() !== group.label) {
      onRenameGroup(group.id, editLabel.trim().toUpperCase());
    }
    setEditing(false);
  };

  return (
    <DroppableListGroup id={`group-${group.id}`}>
      <div className="mb-1">
        {/* Group Header */}
        <div className="flex items-center gap-2 px-4 py-2">
          <div {...dragHandleProps?.attributes} {...dragHandleProps?.listeners} className="cursor-grab text-slate-600 hover:text-slate-400 transition-colors">
            <GripVertical size={14} />
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className="text-slate-500">
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: group.color + '20', color: group.color }}
          >
            <span>{group.emoji}</span>
            {editing ? (
              <input
                autoFocus
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditing(false); }}
                onBlur={saveRename}
                className="bg-transparent border-none outline-none text-[11px] font-bold uppercase tracking-wider w-32"
                style={{ color: group.color }}
              />
            ) : (
              <span onDoubleClick={() => { setEditing(true); setEditLabel(group.label); }}>{group.label}</span>
            )}
            <span className="bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">{group.tasks.length}</span>
          </div>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-slate-600 hover:text-slate-400 transition-colors">
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <div className="absolute left-0 top-full mt-1 z-50 w-44 bg-dark-card border border-white/10 rounded-xl shadow-2xl overflow-hidden" onClick={() => setShowMenu(false)}>
                <button onClick={() => { setEditing(true); setEditLabel(group.label); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/5">
                  <Pencil size={12} /> Renomear
                </button>
                <button onClick={() => onDeleteGroup(group.id)} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 border-t border-white/5">
                  <Trash2 size={12} /> Excluir grupo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tasks */}
        {!collapsed && (
          <>
            {/* Column Header */}
            <div className="flex items-center px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
              <span className="flex-1 pl-8">Nome</span>
            </div>

            <SortableContext items={group.tasks.map(t => `task-${t.id}`)} strategy={verticalListSortingStrategy}>
              {group.tasks.map(task => (
                <SortableListRow key={`task-${task.id}`} id={`task-${task.id}`}>
                  {(dragHandleProps) => (
                    <TaskRow task={task} onUpdate={onUpdate} onDelete={onDeleteTask} onOpenDetail={onOpenDetail} dragHandleProps={dragHandleProps} />
                  )}
                </SortableListRow>
              ))}
            </SortableContext>

            {/* Add Task */}
            <button
              onClick={() => onAddTask(group.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs text-slate-600 hover:text-violet-400 transition-colors w-full"
            >
              <Plus size={14} /> Adicionar Tarefa
            </button>
          </>
        )}
      </div>
    </DroppableListGroup>
  );
};

// ── AddTaskModal ──────────────────────────────────────────
const AddTaskModal = ({ groupId, pageId, onClose, onSaved }: { groupId: string; pageId: string; onClose: () => void; onSaved: () => void }) => {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/onboarding-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: name.trim(), status_group: groupId, type: `lista-${pageId}` }),
      });
      onSaved();
      onClose();
    } catch { /* silent */ } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-dark-text mb-4">Adicionar Item</h3>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Nome do item..."
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-3 text-sm text-dark-text placeholder-slate-500 outline-none focus:border-violet-500/50 mb-4 transition-colors"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-300 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors"
          >
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────
export default function ListaPage({ activePage, pageLabel }: { activePage: string; pageLabel?: string }) {
  const pageId = activePage;
  const defaultHeadline = pageLabel || 'Minha Lista';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusGroups, setStatusGroups] = useState<StatusGroupDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [addingNewGroup, setAddingNewGroup] = useState(false);
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const newGroupRef = useRef<HTMLInputElement>(null);

  // Headline editing
  const [headline, setHeadline] = useState(defaultHeadline);
  const [subtitle, setSubtitle] = useState('GESTÃO DE TAREFAS');
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [editHeadlineVal, setEditHeadlineVal] = useState('');

  const [showCompleted, setShowCompleted] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const isFirstLoad = useRef(true);

  // ── Fetch ──
  const fetchData = async (silent = false) => {
    const showSpinner = isFirstLoad.current && !silent;
    try {
      if (showSpinner) setLoading(true);
      const [resTasks, resGroups, resSettings] = await Promise.all([
        fetch(`/api/onboarding-tasks?type=lista-${pageId}`),
        fetch(`/api/lista-status-groups?page_id=${pageId}`),
        fetch(`/api/lista-page-settings/${pageId}`),
      ]);
      if (resTasks.ok) setTasks(await resTasks.json());
      if (resGroups.ok) {
        const groups = await resGroups.json();
        if (groups.length > 0) {
          setStatusGroups(groups);
        } else if (isFirstLoad.current) {
          // Create default groups on first load
          const defaults = [
            { id: 'a-fazer', label: 'A FAZER', color: '#64748b', emoji: '⬜', order_index: 0 },
            { id: 'em-andamento', label: 'EM ANDAMENTO', color: '#f59e0b', emoji: '🟡', order_index: 1 },
            { id: 'concluido', label: 'CONCLUÍDO', color: '#10b981', emoji: '✅', order_index: 2 },
          ];
          for (const g of defaults) {
            await fetch('/api/lista-status-groups', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...g, page_id: pageId }),
            });
          }
          setStatusGroups(defaults.map(g => ({ ...g, page_id: pageId })));
        }
      }
      if (resSettings.ok) {
        const settings = await resSettings.json();
        setHeadline(settings.headline || defaultHeadline);
        setSubtitle(settings.subtitle || 'GESTÃO DE TAREFAS');
      }
      isFirstLoad.current = false;
    } catch { /* silent */ } finally { if (showSpinner) setLoading(false); }
  };

  useEffect(() => { isFirstLoad.current = true; fetchData(); }, [pageId]);

  // ── Headline save ──
  const saveHeadline = async (newHeadline: string) => {
    setHeadline(newHeadline);
    setEditingHeadline(false);
    try {
      await fetch(`/api/lista-page-settings/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline: newHeadline, subtitle }),
      });
    } catch { /* silent */ }
  };

  // ── Status Group CRUD ──
  const handleAddGroup = async () => {
    const label = newGroupLabel.trim().toUpperCase();
    if (!label) { setAddingNewGroup(false); return; }
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    try {
      const res = await fetch('/api/lista-status-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, page_id: pageId, label, color: '#7c3aed', emoji: '🔵', order_index: statusGroups.length }),
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
      await fetch(`/api/lista-status-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, page_id: pageId }),
      });
    } catch { /* silent */ }
  };

  const handleUpdateGroup = async (id: string, fields: { color?: string; emoji?: string }) => {
    setStatusGroups(prev => prev.map(g => g.id === id ? { ...g, ...fields } : g));
    try {
      await fetch(`/api/lista-status-groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, page_id: pageId }),
      });
    } catch { /* silent */ }
  };

  const handleDeleteGroup = async (id: string) => {
    setStatusGroups(prev => prev.filter(g => g.id !== id));
    try {
      await fetch(`/api/lista-status-groups/${id}?page_id=${pageId}`, { method: 'DELETE' });
      fetchData(true);
    } catch { /* silent */ }
  };

  const handleDeleteTask = async (taskId: number) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await fetch(`/api/onboarding-tasks/${taskId}`, { method: 'DELETE' });
    } catch { /* silent */ }
  };

  // ── DnD ──
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDndStart = (event: DragStartEvent) => setActiveDragId(event.active.id as string);

  const handleDndOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId.startsWith('task-')) {
      const activeTaskNumId = parseInt(activeId.replace('task-', ''));
      const activeTask = tasks.find(t => t.id === activeTaskNumId);
      if (!activeTask) return;

      let newStatus: string | null = null;
      if (overId.startsWith('group-')) {
        newStatus = overId.replace('group-', '');
      } else if (overId.startsWith('task-')) {
        const overTaskNumId = parseInt(overId.replace('task-', ''));
        const overTask = tasks.find(t => t.id === overTaskNumId);
        if (overTask) newStatus = overTask.status_group;
      }

      if (newStatus && activeTask.status_group !== newStatus) {
        setTasks(prev => prev.map(t => t.id === activeTaskNumId ? { ...t, status_group: newStatus! } : t));
      }

      // Reorder within same group
      if (overId.startsWith('task-')) {
        const overTaskNumId = parseInt(overId.replace('task-', ''));
        if (activeTaskNumId !== overTaskNumId) {
          setTasks(prev => {
            const activeT = prev.find(t => t.id === activeTaskNumId);
            const overT = prev.find(t => t.id === overTaskNumId);
            if (!activeT || !overT || activeT.status_group !== overT.status_group) return prev;
            const groupTasks = prev.filter(t => t.status_group === activeT.status_group);
            const otherTasks = prev.filter(t => t.status_group !== activeT.status_group);
            const oldIdx = groupTasks.findIndex(t => t.id === activeTaskNumId);
            const newIdx = groupTasks.findIndex(t => t.id === overTaskNumId);
            if (oldIdx === -1 || newIdx === -1) return prev;
            const reordered = [...groupTasks];
            const [moved] = reordered.splice(oldIdx, 1);
            reordered.splice(newIdx, 0, moved);
            return [...otherTasks, ...reordered];
          });
        }
      }
    }
  };

  const handleDndEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId.startsWith('group-') && overId.startsWith('group-')) {
      const activeGroupId = activeId.replace('group-', '');
      const overGroupId = overId.replace('group-', '');
      if (activeGroupId !== overGroupId) {
        const fromIdx = statusGroups.findIndex(g => g.id === activeGroupId);
        const toIdx = statusGroups.findIndex(g => g.id === overGroupId);
        if (fromIdx !== -1 && toIdx !== -1) {
          const reordered = [...statusGroups];
          const [moved] = reordered.splice(fromIdx, 1);
          reordered.splice(toIdx, 0, moved);
          setStatusGroups(reordered);
          try {
            await fetch('/api/lista-status-groups/reorder', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ page_id: pageId, groups: reordered.map((g, i) => ({ id: g.id, order_index: i })) }),
            });
          } catch { /* silent */ }
        }
      }
    } else if (activeId.startsWith('task-')) {
      const activeTaskNumId = parseInt(activeId.replace('task-', ''));
      const activeTask = tasks.find(t => t.id === activeTaskNumId);
      if (!activeTask) return;

      try {
        await fetch(`/api/onboarding-tasks/${activeTaskNumId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status_group: activeTask.status_group }),
        });
      } catch { /* silent */ }

      const groupTasks = tasks.filter(t => t.status_group === activeTask.status_group);
      try {
        await fetch('/api/onboarding-tasks/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks: groupTasks.map((t, i) => ({ id: t.id, order_index: i })) }),
        });
      } catch { /* silent */ }
    }
  };

  // Focus new group input
  useEffect(() => {
    if (addingNewGroup && newGroupRef.current) newGroupRef.current.focus();
  }, [addingNewGroup]);

  const groups: StatusGroup[] = statusGroups.map(sg => ({
    ...sg,
    tasks: tasks.filter(t => t.status_group === sg.id),
  }));

  // Split headline for SplitHeadline component
  const headlineWords = headline.split(' ');
  const lastWord = headlineWords.pop() || '';
  const firstPart = headlineWords.join(' ') + (headlineWords.length > 0 ? ' ' : '');

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-4 flex items-start justify-between">
        <div className="group/headline">
          {editingHeadline ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={editHeadlineVal}
                onChange={e => setEditHeadlineVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveHeadline(editHeadlineVal);
                  if (e.key === 'Escape') setEditingHeadline(false);
                }}
                onBlur={() => saveHeadline(editHeadlineVal)}
                className="text-2xl font-black tracking-tight text-dark-text bg-transparent border-b-2 border-violet-500 outline-none"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <SplitHeadline text={firstPart} highlight={lastWord} className="text-2xl font-black tracking-tight text-dark-text" />
              <button
                onClick={() => { setEditingHeadline(true); setEditHeadlineVal(headline); }}
                className="opacity-0 group-hover/headline:opacity-100 p-1 text-slate-600 hover:text-violet-400 transition-all"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-8 pb-12">
          <DndContext sensors={dndSensors} collisionDetection={closestCorners} onDragStart={handleDndStart} onDragOver={handleDndOver} onDragEnd={handleDndEnd}>
            <SortableContext items={groups.map(g => `group-${g.id}`)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col">
                {groups.map((group, gIdx) => (
                  <SortableListRow key={`group-${group.id}`} id={`group-${group.id}`}>
                    {({ attributes, listeners }) => (
                      <motion.div
                        initial={{ opacity: 0, y: -24, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.4, delay: gIdx * 0.08, ease: [0.32, 0.72, 0, 1] }}
                      >
                        <GroupBlock
                          group={group}
                          pageId={pageId}
                          onUpdate={() => fetchData(true)}
                          onAddTask={setAddingToGroup}
                          onRenameGroup={handleRenameGroup}
                          onUpdateGroup={handleUpdateGroup}
                          onDeleteGroup={handleDeleteGroup}
                          onDeleteTask={handleDeleteTask}
                          onOpenDetail={(task) => setSelectedTask(task)}
                          dragHandleProps={{ attributes, listeners }}
                        />
                      </motion.div>
                    )}
                  </SortableListRow>
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {activeDragId && activeDragId.startsWith('group-') ? (
                <div className="bg-dark-bg/80 border-t-2 border-violet-500 rounded-xl p-4 shadow-2xl">
                  <p className="text-white text-sm font-bold opacity-80 flex items-center gap-2"><GripVertical size={16} /> Movendo grupo...</p>
                </div>
              ) : activeDragId && activeDragId.startsWith('task-') ? (
                <div className="bg-white/5 border border-violet-500/50 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                  <p className="text-white text-sm font-bold opacity-80 flex items-center gap-2"><GripVertical size={16} /> Movendo tarefa...</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

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
              <button onClick={handleAddGroup} className="text-[10px] text-violet-400 hover:text-violet-300 font-bold transition-colors">Salvar</button>
              <button onClick={() => { setAddingNewGroup(false); setNewGroupLabel(''); }} className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors">Cancelar</button>
            </div>
          ) : (
            <button onClick={() => setAddingNewGroup(true)} className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 transition-colors mt-4 px-4 py-2">
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
          pageId={pageId}
          onClose={() => setAddingToGroup(null)}
          onSaved={() => fetchData(true)}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <ListaTaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => { fetchData(true); }}
          onDelete={(id) => { handleDeleteTask(id); setSelectedTask(null); }}
        />
      )}
    </div>
  );
}
