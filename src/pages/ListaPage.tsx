import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SplitHeadline from '../components/SplitHeadline';
import ListaTaskDetailModal from '../components/ListaTaskDetailModal';
import RichTextEditor from '../components/RichTextEditor';
import { Plus, ChevronDown, ChevronRight, Calendar, Users, Tag, MoreHorizontal, Circle, CheckCircle2, Loader2, X, Trash2, GripVertical, Settings, Check, Edit2, Layers, Pencil, TrendingUp, AlertTriangle } from 'lucide-react';
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
export interface ColoredTag {
  id: string;
  name: string;
  color: string;
}

const TAG_COLORS = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#64748b',
  '#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f472b6',
];

const loadColoredTags = (pageId: string): ColoredTag[] => {
  try { const r = localStorage.getItem(`grapehub_ctags_${pageId}`); return r ? JSON.parse(r) : []; } catch { return []; }
};
const saveColoredTags = (pageId: string, tags: ColoredTag[]) =>
  localStorage.setItem(`grapehub_ctags_${pageId}`, JSON.stringify(tags));

const uid = () => Math.random().toString(36).substr(2, 9);

const isCompletedGroup = (groupId: string, label: string = '') => {
  const idLower = (groupId || '').toLowerCase();
  const labelLower = (label || '').toLowerCase();
  return idLower.includes('concluido') || idLower.includes('postado') || labelLower.includes('concluido') || labelLower.includes('concluído') || labelLower.includes('postado');
};

interface Task {
  id: number;
  client_name: string;
  status_group: string;
  created_at: string;
  subtask_count: number;
  order_index?: number;
  tags?: string[];
  due_date?: string | null;
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
const TaskRow = ({
  task,
  coloredTagDefs = [],
  onUpdate,
  onDelete,
  onOpenDetail,
  dragHandleProps
}: {
  task: Task;
  coloredTagDefs?: ColoredTag[];
  onUpdate: () => void;
  onDelete: (id: number) => void;
  onOpenDetail: (task: Task) => void;
  dragHandleProps?: any;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [newSubTitle, setNewSubTitle] = useState('');

  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const tagMenuRef = React.useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(e.target as Node)) {
        setTagMenuOpen(false);
      }
    };
    if (tagMenuOpen) {
      document.addEventListener('mousedown', handler);
    }
    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [tagMenuOpen]);

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

  const handleToggleTag = async (tagName: string) => {
    const currentTags = Array.isArray(task.tags) ? task.tags : [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(t => t !== tagName)
      : [...currentTags, tagName];
    try {
      await fetch(`/api/onboarding-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });
      onUpdate();
    } catch { /* silent */ }
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const normalizedTags = Array.isArray(task.tags) ? task.tags : [];

  return (
    <div className="border-b border-black/[0.06] dark:border-white/[0.06] last:border-none">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.02] transition-colors group">
        <div {...(dragHandleProps?.attributes || {})} {...(dragHandleProps?.listeners || {})} className="w-[14px] shrink-0 flex justify-center cursor-grab active:cursor-grabbing text-slate-700 hover:text-slate-500">
          <GripVertical size={12} />
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex items-center justify-center shrink-0">
          <div className="w-2 h-2 rounded-full bg-slate-500" />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer flex items-center gap-2" onClick={() => onOpenDetail(task)}>
          <span className="text-sm font-medium text-dark-text hover:text-violet-400 transition-colors truncate">{task.client_name}</span>
          {task.subtask_count > 0 && (
            <span className="text-[10px] text-slate-500 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              ↳ {task.subtask_count}
            </span>
          )}
        </div>

        {/* Due Date Column */}
        {(() => {
          if (!task.due_date) {
            return <div className="w-28 shrink-0" />;
          }
          const todayISO = new Date().toISOString().split('T')[0];
          const datePart = task.due_date.split('T')[0];
          const isCompleted = isCompletedGroup(task.status_group, '');
          const isLate = datePart < todayISO && !isCompleted;
          const isToday = datePart === todayISO && !isCompleted;
          const [yr, mo, dy] = datePart.split('-');
          const label = `${dy}/${mo}`;
          const style = isLate
            ? 'bg-red-500/10 text-red-400 border-red-500/20'
            : isToday
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-black/5 dark:bg-white/5 text-slate-400 border-black/10 dark:border-white/10';
          return (
            <div className="w-28 shrink-0" onClick={() => onOpenDetail(task)}>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border cursor-pointer ${style}`}>
                <Calendar size={9} />
                {label}
              </span>
            </div>
          );
        })()}

        {/* Tags Column */}
        <div className="w-40 shrink-0 flex items-center gap-1 flex-wrap relative" ref={tagMenuRef} onClick={e => e.stopPropagation()}>
          {/* Each tag badge: hover shows × to remove */}
          {normalizedTags.slice(0, 2).map(tg => {
            const td = coloredTagDefs.find(c => c.name === tg);
            const color = td?.color || '#8b5cf6';
            return (
              <button
                key={tg}
                onClick={e => { e.stopPropagation(); handleToggleTag(tg); }}
                title={`Remover "${tg}"`}
                className="group/tag flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all hover:pr-1"
                style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
              >
                {tg}
                <X size={9} className="opacity-0 group-hover/tag:opacity-100 transition-opacity shrink-0 -mr-0.5" />
              </button>
            );
          })}
          {normalizedTags.length > 2 && (
            <button
              onClick={e => { e.stopPropagation(); setTagMenuOpen(v => !v); }}
              className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors"
            >
              +{normalizedTags.length - 2}
            </button>
          )}

          {/* + button to add tags — always visible on row hover */}
          <button
            onClick={e => { e.stopPropagation(); setTagMenuOpen(v => !v); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 rounded-full border border-dashed border-slate-600 hover:border-violet-500 flex items-center justify-center text-slate-500 hover:text-violet-400"
          >
            <Plus size={9} />
          </button>

          {/* Dropdown menu */}
          {tagMenuOpen && (
            <div
              className="absolute top-7 left-0 z-50 w-52 bg-dark-card border border-black/10 dark:border-white/10 rounded-xl shadow-2xl p-2"
              onClick={e => e.stopPropagation()}
            >
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 mb-2">Adicionar / Remover</p>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {(() => {
                  const defNames = new Set(coloredTagDefs.map(c => c.name));
                  const orphanTags = normalizedTags
                    .filter(t => !defNames.has(t))
                    .map(t => ({ id: t, name: t, color: '#8b5cf6' }));
                  const allItems = [...orphanTags, ...coloredTagDefs];
                  if (allItems.length === 0) {
                    return <p className="text-xs text-slate-500 px-2 py-2 text-center">Nenhuma tag. Configure em "Tags".</p>;
                  }
                  return allItems.map(c => {
                    const hasTag = normalizedTags.includes(c.name);
                    return (
                      <button key={c.id} onClick={() => handleToggleTag(c.name)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors text-left ${hasTag ? 'bg-violet-500/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="text-xs text-dark-text truncate">{c.name}</span>
                        </div>
                        {hasTag
                          ? <X size={11} className="text-rose-400 shrink-0" />
                          : <Plus size={11} className="text-slate-600 shrink-0" />
                        }
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => { if (confirm('Excluir esta tarefa?')) onDelete(task.id); }}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all shrink-0"
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
                <div className="px-12 py-2 flex items-center gap-2 border-b border-black/10 dark:border-white/5 mb-1 bg-black/5 dark:bg-white/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Subtarefas
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {completedCount}/{subtasks.length}
                  </span>
                  <div className="flex-1 h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden ml-1 max-w-[200px]">
                    <div className="h-full bg-violet-500 rounded-full transition-all duration-300"
                      style={{ width: `${subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="space-y-1">
                  {subtasks.map(sub => (
                    <div key={sub.id} className="flex items-center gap-2 px-12 py-1.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.02] transition-colors group/sub">
                      <div className="w-4 shrink-0 flex items-center justify-center">
                        <button
                          onClick={() => toggleSubtask(sub)}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            sub.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-violet-500'
                          }`}
                        >
                          {sub.completed && <CheckCircle2 size={10} className="text-dark-text" />}
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
  coloredTagDefs = [],
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
  coloredTagDefs?: ColoredTag[];
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
            <span className="bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full text-[10px]">{group.tasks.length}</span>
          </div>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-slate-600 hover:text-slate-400 transition-colors">
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <div className="absolute left-0 top-full mt-1 z-50 w-44 bg-dark-card border border-black/10 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden" onClick={() => setShowMenu(false)}>
                <button onClick={() => { setEditing(true); setEditLabel(group.label); }} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5">
                  <Pencil size={12} /> Renomear
                </button>
                <button onClick={() => onDeleteGroup(group.id)} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 border-t border-black/10 dark:border-white/5">
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
            <div className="flex items-center gap-3 px-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-black/10 dark:border-white/5">
              <div className="w-[14px] shrink-0" />
              <div className="w-4 shrink-0" />
              <div className="w-5 shrink-0" />
              <span className="flex-1">Nome</span>
              <span className="w-28 shrink-0">Prazo</span>
              <span className="w-40 shrink-0">Tags</span>
              <div className="w-[22px] shrink-0" />
            </div>

            <SortableContext items={group.tasks.map(t => `task-${t.id}`)} strategy={verticalListSortingStrategy}>
              {group.tasks.map(task => (
                <SortableListRow key={`task-${task.id}`} id={`task-${task.id}`}>
                  {(dragHandleProps) => (
                    <TaskRow task={task} coloredTagDefs={coloredTagDefs} onUpdate={onUpdate} onDelete={onDeleteTask} onOpenDetail={onOpenDetail} dragHandleProps={dragHandleProps} />
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
      <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-dark-text mb-4">Adicionar Item</h3>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Nome do item..."
          className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-dark-text placeholder-slate-500 outline-none focus:border-violet-500/50 mb-4 transition-colors"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
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

interface TagsManagerModalProps {
  tags: ColoredTag[];
  onChange: (tags: ColoredTag[]) => void;
  onClose: () => void;
}

const TagsManagerModal: React.FC<TagsManagerModalProps> = ({ tags, onChange, onClose }) => {
  const [newName, setNewName]   = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const add = () => {
    const v = newName.trim();
    if (!v) return;
    if (tags.some(t => t.name.toLowerCase() === v.toLowerCase())) return;
    onChange([...tags, { id: uid(), name: v, color: newColor }]);
    setNewName('');
  };

  const remove = (id: string) => onChange(tags.filter(t => t.id !== id));

  const startEdit = (t: ColoredTag) => { setEditId(t.id); setEditName(t.name); setEditColor(t.color); };

  const saveEdit = () => {
    const v = editName.trim();
    if (!v || !editId) return;
    onChange(tags.map(t => t.id === editId ? { ...t, name: v, color: editColor } : t));
    setEditId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-dark-bg rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-dark-text">Gerenciar <span className="text-violet-500">Tags</span></h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/10 transition-all"><X size={16} /></button>
        </div>

        {/* Create new tag */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest block">Nova Tag</label>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Nome da tag..."
            className="w-full bg-dark-card border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-dark-text placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
          />
          <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full transition-all ${newColor === c ? 'ring-2 ring-offset-2 ring-offset-dark-bg ring-white scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={add}
            disabled={!newName.trim()}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-xs font-bold text-white transition-all"
          >
            <Plus size={13} /> Criar Tag
          </button>
        </div>

        {/* Tag list */}
        {tags.length > 0 && (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            <label className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest block mb-2">Tags Existentes</label>
            {tags.map(t => (
              <div key={t.id}>
                {editId === t.id ? (
                  <div className="flex flex-col gap-2 p-2 bg-dark-card rounded-xl border border-violet-500/30">
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      className="bg-transparent border-b border-black/10 dark:border-white/20 text-sm text-dark-text focus:outline-none py-0.5"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {TAG_COLORS.map(c => (
                        <button
                          key={c} onClick={() => setEditColor(c)}
                          className={`w-5 h-5 rounded-full transition-all ${editColor === c ? 'ring-2 ring-offset-2 ring-offset-dark-card ring-white scale-110' : 'hover:scale-110'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={saveEdit} className="flex-1 py-1 rounded bg-violet-600 hover:bg-violet-500 text-[10px] font-bold text-white uppercase tracking-wider">Salvar</button>
                      <button onClick={() => setEditId(null)} className="flex-1 py-1 rounded bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 text-[10px] font-bold text-dark-text uppercase tracking-wider">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 group/tagrow">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="text-xs text-dark-text truncate">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/tagrow:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(t)} className="p-1 text-slate-500 hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 rounded"><Edit2 size={11} /></button>
                      <button onClick={() => remove(t.id)} className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded"><Trash2 size={11} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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

  const [coloredTagDefs, setColoredTagDefs] = useState<ColoredTag[]>(() => loadColoredTags(activePage));
  const [tagsModal, setTagsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'tarefas'>('overview');

  // Rich Text Notes (Esquerda e Direita)
  const [notesHtml, setNotesHtml] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [originalNotesHtml, setOriginalNotesHtml] = useState('');

  const [notesHtmlRight, setNotesHtmlRight] = useState('');
  const [notesDirtyRight, setNotesDirtyRight] = useState(false);
  const [notesSavingRight, setNotesSavingRight] = useState(false);
  const [originalNotesHtmlRight, setOriginalNotesHtmlRight] = useState('');

  const saveNotes = async (leftVal: string, rightVal: string) => {
    const isLeftDirty = leftVal !== originalNotesHtml;
    const isRightDirty = rightVal !== originalNotesHtmlRight;
    if (isLeftDirty) setNotesSaving(true);
    if (isRightDirty) setNotesSavingRight(true);

    try {
      await fetch(`/api/lista-page-settings/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline,
          subtitle,
          notes_html: leftVal,
          notes_html_right: rightVal
        }),
      });
      if (isLeftDirty) {
        setOriginalNotesHtml(leftVal);
        setNotesDirty(false);
      }
      if (isRightDirty) {
        setOriginalNotesHtmlRight(rightVal);
        setNotesDirtyRight(false);
      }
    } catch { /* silent */ } finally {
      setNotesSaving(false);
      setNotesSavingRight(false);
    }
  };

  useEffect(() => {
    setColoredTagDefs(loadColoredTags(pageId));
    setNotesHtml('');
    setOriginalNotesHtml('');
    setNotesDirty(false);
    setNotesHtmlRight('');
    setOriginalNotesHtmlRight('');
    setNotesDirtyRight(false);
  }, [pageId]);

  useEffect(() => {
    if (!notesDirty && !notesDirtyRight) return;
    const timeoutId = setTimeout(() => {
      saveNotes(notesHtml, notesHtmlRight);
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, [notesHtml, notesDirty, notesHtmlRight, notesDirtyRight]);

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
        setNotesHtml(settings.notes_html || '');
        setOriginalNotesHtml(settings.notes_html || '');
        setNotesDirty(false);
        setNotesHtmlRight(settings.notes_html_right || '');
        setOriginalNotesHtmlRight(settings.notes_html_right || '');
        setNotesDirtyRight(false);
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
        body: JSON.stringify({
          headline: newHeadline,
          subtitle,
          notes_html: notesHtml,
          notes_html_right: notesHtmlRight
        }),
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
            onClick={() => setTagsModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold rounded-xl transition-colors border border-violet-500/20 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20"
          >
            <Tag size={14} />
            Tags
          </button>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`px-4 py-2 text-[11px] font-bold rounded-xl transition-colors border flex items-center gap-2 ${
              showCompleted
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-dark-card text-slate-400 border-black/10 dark:border-white/10 hover:bg-black/20 dark:hover:bg-black/5 dark:bg-white/5'
            }`}
          >
            <Check size={14} />
            {showCompleted ? 'Ocultar Concluídos' : 'Mostrar Concluídos'}
          </button>
        </div>
      </div>

      {/* ── Tabs Switcher ── */}
      <div className="px-8 flex border-b border-black/10 dark:border-white/10 mb-6 shrink-0">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-violet-500 text-violet-400 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-400 font-medium'
          }`}
        >
          <TrendingUp size={13} />
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('tarefas')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'tarefas'
              ? 'border-violet-500 text-violet-400 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-400 font-medium'
          }`}
        >
          <Layers size={13} />
          Lista de Postagens
        </button>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : activeTab === 'overview' ? (
        (() => {
          const todayStr = new Date().toISOString().split('T')[0];
          const totalPosts = tasks.length;
          const completedGroups = statusGroups.filter(g => isCompletedGroup(g.id, g.label));
          const completedGroupIds = completedGroups.map(g => g.id);
          const completedTasks = tasks.filter(t => completedGroupIds.includes(t.status_group));
          const pendingTasks = tasks.filter(t => !completedGroupIds.includes(t.status_group));
          const overdueTasks = pendingTasks.filter(t => {
            if (!t.due_date) return false;
            return t.due_date.split('T')[0] < todayStr;
          });
          const upcomingTasks = pendingTasks.filter(t => {
            if (!t.due_date) return false;
            return t.due_date.split('T')[0] >= todayStr;
          });
          const completionPct = totalPosts > 0 ? (completedTasks.length / totalPosts) * 100 : 0;

          return (
            <div className="px-8 pb-12 space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total de Postagens */}
                <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between transition-colors duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total de Postagens</span>
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <Layers size={16} className="text-violet-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-dark-text">{totalPosts}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {completedTasks.length} concluídas · {pendingTasks.length} em andamento
                  </p>
                </div>

                {/* Fila Concluída */}
                <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between transition-colors duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Fila Concluída</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Check size={16} className="text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-dark-text">{completedTasks.length}</p>
                  <div className="mt-2 w-full bg-black/5 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPct}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full bg-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 text-right">{Math.round(completionPct)}% concluído</p>
                </div>

                {/* Postagens em Atraso */}
                <div className={`bg-dark-card border rounded-2xl p-5 flex flex-col justify-between transition-colors duration-200 ${
                  overdueTasks.length > 0 ? 'border-red-500/30' : 'border-black/10 dark:border-white/10'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Postagens em Atraso</span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      overdueTasks.length > 0 ? 'bg-red-500/10' : 'bg-slate-500/10'
                    }`}>
                      <AlertTriangle size={16} className={overdueTasks.length > 0 ? 'text-red-400' : 'text-slate-400'} />
                    </div>
                  </div>
                  <p className={`text-2xl font-black ${overdueTasks.length > 0 ? 'text-red-400' : 'text-dark-text'}`}>
                    {overdueTasks.length}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {overdueTasks.length > 0 ? 'Requerem atenção imediata' : 'Nenhuma postagem em atraso'}
                  </p>
                </div>

                {/* Próximos Prazos */}
                <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between transition-colors duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Próximos Prazos</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Calendar size={16} className="text-amber-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-dark-text">{upcomingTasks.length}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {upcomingTasks.length > 0 ? 'Postagens com prazos definidos' : 'Nenhum prazo futuro definido'}
                  </p>
                </div>
              </div>

              {/* Main Dashboard Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fila de Postagens (Pipeline Queue) */}
                <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col min-h-[600px]">
                  <h3 className="text-sm font-black text-dark-text uppercase tracking-widest mb-4">Fila de Postagens</h3>
                  <div className="space-y-5 flex-1 overflow-y-auto pr-1">
                    {statusGroups.map(group => {
                      const groupTasks = tasks.filter(t => t.status_group === group.id);
                      const pct = totalPosts > 0 ? (groupTasks.length / totalPosts) * 100 : 0;
                      return (
                        <div key={group.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{group.emoji || '⬜'}</span>
                              <span className="uppercase tracking-wider text-[11px]">{group.label}</span>
                            </div>
                            <span className="text-[11px]">{groupTasks.length} posts ({Math.round(pct)}%)</span>
                          </div>
                          <div className="w-full h-2.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden border border-black/10 dark:border-white/[0.02]">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              style={{ backgroundColor: group.color || '#8b5cf6' }}
                              className="h-full rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Próximos Prazos (Calendário) */}
                <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col min-h-[600px]">
                  <h3 className="text-sm font-black text-dark-text uppercase tracking-widest mb-4">Próximos Prazos</h3>
                  <div className="space-y-3 flex-1 overflow-y-auto scrollbar-hide">
                    {tasks
                      .filter(t => t.due_date)
                      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
                      .slice(0, 8)
                      .map((t, idx) => {
                        const datePart = t.due_date!.split('T')[0];
                        const isCompleted = isCompletedGroup(t.status_group, statusGroups.find(g => g.id === t.status_group)?.label || '');
                        const isLate = datePart < todayStr && !isCompleted;
                        const isToday = datePart === todayStr && !isCompleted;

                        const cardStyles = isLate
                          ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10'
                          : isToday
                            ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                            : 'border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10';

                        const badgeStyles = isLate
                          ? 'bg-red-500/15 text-red-400 border-red-500/20'
                          : isToday
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-500/15 text-slate-400 border-slate-500/20';

                        const badgeLabel = isLate ? 'Atrasado' : isToday ? 'Hoje' : 'No prazo';
                        const g = statusGroups.find(group => group.id === t.status_group);
                        const [y2, m2, d2] = datePart.split('-');
                        const formattedDate = `${d2}/${m2}/${y2}`;
                        const initial = (t.client_name || '?').charAt(0).toUpperCase();

                        return (
                          <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => setSelectedTask(t)}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${cardStyles}`}
                          >
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full shrink-0 bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">
                              {initial}
                            </div>

                            {/* Main Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-dark-text truncate">
                                  {t.client_name}
                                </p>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${badgeStyles}`}>
                                  {badgeLabel}
                                </span>
                              </div>
                              <p className={`text-xs mt-1 truncate ${isLate ? 'text-red-400/80' : 'text-slate-500'}`}>
                                {g?.label || t.status_group}
                                {isLate && (
                                  <span className="text-red-500 font-bold ml-1.5 dark:text-red-400">(Atrasado)</span>
                                )}
                              </p>
                            </div>

                            {/* Date on right */}
                            <p className="text-[11px] font-black text-slate-400 shrink-0">
                              {formattedDate}
                            </p>
                          </motion.div>
                        );
                      })}
                    {tasks.filter(t => t.due_date).length === 0 && (
                      <div className="text-center py-12 text-slate-500 text-xs">
                        Nenhuma postagem com prazo definido.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="px-8 pb-12">
          {/* Rich Text Notes */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bloco Esquerda */}
            <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Anotações - Esquerda</h4>
                <RichTextEditor
                  content={notesHtml}
                  minHeight="150px"
                  onChange={(html) => {
                    setNotesHtml(html);
                    setNotesDirty(html !== originalNotesHtml);
                  }}
                />
              </div>
              <div className="mt-2 flex justify-end min-h-[16px]">
                {notesSaving ? (
                  <span className="text-violet-400 text-[10px] font-bold flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> Salvando...
                  </span>
                ) : notesDirty ? (
                  <span className="text-slate-500 text-[10px] font-bold">Editado</span>
                ) : notesHtml ? (
                  <span className="text-emerald-500 text-[10px] font-bold flex items-center gap-1">
                    ✓ Salvo
                  </span>
                ) : null}
              </div>
            </div>

            {/* Bloco Direita */}
            <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-4 shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Anotações - Direita</h4>
                <RichTextEditor
                  content={notesHtmlRight}
                  minHeight="150px"
                  onChange={(html) => {
                    setNotesHtmlRight(html);
                    setNotesDirtyRight(html !== originalNotesHtmlRight);
                  }}
                />
              </div>
              <div className="mt-2 flex justify-end min-h-[16px]">
                {notesSavingRight ? (
                  <span className="text-violet-400 text-[10px] font-bold flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> Salvando...
                  </span>
                ) : notesDirtyRight ? (
                  <span className="text-slate-500 text-[10px] font-bold">Editado</span>
                ) : notesHtmlRight ? (
                  <span className="text-emerald-500 text-[10px] font-bold flex items-center gap-1">
                    ✓ Salvo
                  </span>
                ) : null}
              </div>
            </div>
          </div>

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
                          coloredTagDefs={coloredTagDefs}
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
                  <p className="text-dark-text text-sm font-bold opacity-80 flex items-center gap-2"><GripVertical size={16} /> Movendo grupo...</p>
                </div>
              ) : activeDragId && activeDragId.startsWith('task-') ? (
                <div className="bg-black/5 dark:bg-white/5 border border-violet-500/50 rounded-xl p-4 shadow-2xl backdrop-blur-md">
                  <p className="text-dark-text text-sm font-bold opacity-80 flex items-center gap-2"><GripVertical size={16} /> Movendo tarefa...</p>
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
              <button onClick={() => { setAddingNewGroup(false); setNewGroupLabel(''); }} className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Cancelar</button>
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

      {/* Tags Manager Modal */}
      {tagsModal && (
        <TagsManagerModal
          tags={coloredTagDefs}
          onChange={(newTags) => {
            setColoredTagDefs(newTags);
            saveColoredTags(pageId, newTags);
          }}
          onClose={() => setTagsModal(false)}
        />
      )}
    </div>
  );
}
