import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronLeft, ChevronRight, Plus, Search, Filter, 
  CheckCircle2, Circle, Clock, AlertCircle,
  Trash2, Edit2, Calendar, User, Tag,
  ChevronDown, X, Check, Loader2, ListTodo, ListChecks,
  ChevronUp, Image as ImageIcon, Scale, Paperclip, MessageSquare, Columns, List, Archive, GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useMenu } from '../context/MenuContext';
import { Modal } from '../components/ui/Modal';
import { designSystem } from '../design-system';
import TaskDetailModal from '../components/TaskDetailModal';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, DragOverlay, useDroppable, defaultDropAnimationSideEffects, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DatePicker } from '../components/ui/DatePicker';
import confetti from 'canvas-confetti';
import SplitHeadline from '../components/SplitHeadline';



const SortableSectionDropZone = ({ id, items, children }: { id: string, items: string[], children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className={`space-y-0.5 min-h-[10px] pb-1 transition-colors rounded-xl ${isOver ? 'bg-violet-900/20 ring-1 ring-violet-500/30' : ''}`}>
        {children}
      </div>
    </SortableContext>
  );
};

const SortableTaskRow = ({ task, children }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { task } });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 99 : 1,
    position: isDragging ? 'relative' as any : 'static' as any,
  };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-xl group/task transition-colors border border-transparent hover:border-white/5">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing hover:text-white text-dark-text/20 flex-shrink-0 opacity-0 group-hover/task:opacity-100 transition-opacity p-0.5">
        <GripVertical size={14} />
      </div>
      {children}
    </div>
  );
};

// ── Animated Progress Bar ─────────────────────────────────
const AnimatedBar = ({ progress, isDone }: { progress: number; isDone: boolean }) => {
  const [width, setWidth] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const animated = React.useRef(false);

  React.useEffect(() => {
    if (animated.current) { setWidth(progress); return; }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          requestAnimationFrame(() => setWidth(progress));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [progress]);

  return (
    <div ref={ref} className="w-full h-1.5 bg-dark-text/10 rounded-full mt-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${isDone ? 'bg-emerald-500' : 'bg-violet-500'}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

// ── Animated Count Up ─────────────────────────────────────
const CountUp = ({ value, suffix = '', className = '' }: { value: number; suffix?: string; className?: string }) => {
  const [display, setDisplay] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const animated = React.useRef(false);

  React.useEffect(() => {
    if (animated.current) { setDisplay(Math.round(value)); return; }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const duration = 1000;
          const start = performance.now();
          const target = Math.round(value);
          const step = (now: number) => {
            const elapsed = now - start;
            const t = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(Math.round(eased * target));
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return <span ref={ref} className={className}>{display}{suffix}</span>;
};

interface TaskSubtask {
  id: string;
  task_id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
}

interface TodoSection {
  id: string;
  project_id: string;
  page_id?: string;
  name: string;
  order_index: number;
  is_fixed: boolean;  // maps to is_default in DB
  is_default?: boolean; // raw DB field
  created_at: string;
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
  completed_at?: string | null;
  section_id?: string | null;
  order_index?: number;
}

const TodoPage: React.FC<{ activePage: string; onPageChange?: (page: string) => void }> = ({ activePage, onPageChange }) => {
  const { userData: authUser } = useAuth();
  const { menu } = useMenu();
  
  // Find the sibling 'projects' page in the same subsession or subsubsession
  // so we can fetch the correct projects for this manager
  const projectsPageId = React.useMemo(() => {
    if (!Array.isArray(menu)) return null;
    for (const section of menu) {
      if (Array.isArray(section.subSessions)) {
        for (const ss of section.subSessions) {
          // Check subSubSessions first (e.g., "Gestor José" containing "Projetos José" and "Tarefas José")
          if (Array.isArray(ss.subSubSessions)) {
            for (const sss of ss.subSubSessions) {
              if (Array.isArray(sss.pages) && sss.pages.some((p: any) => p.id === activePage)) {
                const projectsPage = sss.pages.find((p: any) => p.template === 'projects');
                if (projectsPage) return projectsPage.id;
              }
            }
          }
          // If not in a subSubSession, check the subSession's own pages
          if (Array.isArray(ss.pages) && ss.pages.some((p: any) => p.id === activePage)) {
            const projectsPage = ss.pages.find((p: any) => p.template === 'projects');
            if (projectsPage) return projectsPage.id;
          }
        }
      }
      if (Array.isArray(section.subSubSessions)) {
        for (const sss of section.subSubSessions) {
          if (Array.isArray(sss.pages)) {
            if (sss.pages.some((p: any) => p.id === activePage)) {
              const projectsPage = sss.pages.find((p: any) => p.template === 'projects');
              if (projectsPage) return projectsPage.id;
            }
          }
        }
      }
    }
    return null;
  }, [activePage, menu]);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [projects, setProjects] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewType, setViewType] = useState<'kanban' | 'list'>('kanban');
  const [todoTab, setTodoTab] = useState<'ativos' | 'arquivadas'>('ativos');

  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  
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
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [openTagDropdown, setOpenTagDropdown] = useState<string | null>(null);

  // Close tag dropdown on click outside (portal)
  useEffect(() => {
    if (!openTagDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`#tag-btn-${openTagDropdown}`) && !target.closest('[class*="z-[9999]"]')) {
        setOpenTagDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openTagDropdown]);

  // ── Sections state ────────────────────────────────────────
  // sectionsMap: projectId => TodoSection[]
  const [sectionsMap, setSectionsMap] = useState<Record<string, TodoSection[]>>({});
  const [sectionsLoading, setSectionsLoading] = useState<Record<string, boolean>>({});
  // useRef to track in-flight fetches (avoids stale closure bug with state)
  const sectionsInFlight = useRef<Set<string>>(new Set());
  // Rename guard to prevent onBlur firing after Enter
  const renameSubmitted = useRef(false);
  // renaming
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState('');
  // adding new section
  const [addingSectionToProject, setAddingSectionToProject] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');
  // adding task to specific section
  const [addingTaskToSection, setAddingTaskToSection] = useState<string | null>(null); // sectionId
  const [addingTaskSectionTitle, setAddingTaskSectionTitle] = useState('');


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task;
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const activeContainer = active.data.current?.sortable?.containerId;
    const overContainer = over.data.current?.sortable?.containerId || over.id;

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setTasks((prevTasks) => {
      const activeTaskIndex = prevTasks.findIndex(t => t.id === activeId);
      if (activeTaskIndex === -1) return prevTasks;
      
      const activeTask = { ...prevTasks[activeTaskIndex] };
      const projectId = activeTask.project_id || 'no-project';
      
      let newSectionId = overContainer.toString().includes('__none__') ? null : overContainer.toString().replace(`section-${projectId}-`, '');
      if (newSectionId === overContainer) newSectionId = null;

      const overTaskIndex = prevTasks.findIndex(t => t.id === overId);
      
      const newTasks = [...prevTasks];
      newTasks.splice(activeTaskIndex, 1);
      
      activeTask.section_id = newSectionId;
      
      if (overTaskIndex !== -1) {
         // If dropping on an item, we determine if it's below or above by the index
         // But simply inserting at the overTaskIndex is usually fine for onDragOver
         newTasks.splice(overTaskIndex, 0, activeTask);
      } else {
         newTasks.push(activeTask);
      }
      
      return newTasks;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    
    // We get the latest tasks state
    setTasks(currentTasks => {
      let newTasks = [...currentTasks];
      
      const activeIndex = newTasks.findIndex(t => t.id === active.id);
      const overIndex = newTasks.findIndex(t => t.id === over.id);

      if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
        newTasks = arrayMove(newTasks, activeIndex, overIndex);
      }

      const activeTask = newTasks.find(t => t.id === active.id);
      if (!activeTask) return currentTasks;

      const projectId = activeTask.project_id || 'no-project';
      const newSectionId = activeTask.section_id || null;

      // Reassign order_index
      let orderCounter = 0;
      const updatedTasksForDb: any[] = [];
      newTasks.forEach(t => {
        if ((t.project_id || 'no-project') === projectId && (t.section_id || null) === newSectionId) {
          t.order_index = orderCounter++;
          updatedTasksForDb.push({ id: t.id, section_id: t.section_id, order_index: t.order_index });
        }
      });

      // Fire API asynchronously
      fetch('/api/tasks/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasksForDb })
      }).catch(e => {
        console.error(e);
        fetchData(); // Revert on failure
      });

      return newTasks;
    });
  };

  // Close tag dropdown + filter dropdowns on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      
      // Check if click is inside the tag dropdown portal
      const tagPortal = document.getElementById('tag-dropdown-portal');
      if (tagPortal && tagPortal.contains(target)) {
        return; // Let the click happen so the onClick handler fires
      }
      
      const datePortal = document.getElementById('date-picker-portal');
      if (datePortal && datePortal.contains(target)) {
        return;
      }
      
      setOpenTagDropdown(null);
      
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(target)) {
        setGroupDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        fetch(`/api/projects${projectsPageId ? `?page_id=${projectsPageId}` : ''}`),
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
  }, [activePage, projectsPageId]);

  const FIXED_SECTION_NAMES = ['Campanha 1', 'Campanha 2', 'CRM', 'Outras tarefas'];

  // Auto-fetch sections for any currently-expanded project card
  useEffect(() => {
    Object.entries(expandedClients).forEach(([key, isExpanded]) => {
      if (!isExpanded) return;
      // The key is `groupName + pid` — find the pid from projects
      const project = projects.find(p => key.endsWith(p.id));
      if (project && project.id !== 'no-project') {
        // Set local placeholders synchronously if no sections yet
        if (!sectionsMap[project.id] || sectionsMap[project.id].length === 0) {
          setSectionsMap(prev => ({
            ...prev,
            [project.id]: FIXED_SECTION_NAMES.map((name, i) => ({
              id: `local-${project.id}-${i}`,
              project_id: project.id,
              page_id: activePage,
              name,
              is_fixed: true,
              order_index: i,
              created_at: new Date().toISOString(),
            }))
          }));
        }
        fetchSectionsForProject(project.id);
      }
    });
  }, [expandedClients, projects]);



  // ── Section helpers ───────────────────────────────────────

  // Helper: normalize raw DB row (is_default → is_fixed)
  const normalizeSection = (s: any): TodoSection => ({
    ...s,
    is_fixed: s.is_default ?? s.is_fixed ?? false,
  });


  const fetchSectionsForProject = async (projectId: string) => {
    // Use a ref-based in-flight guard to avoid stale-closure bugs with state
    if (sectionsInFlight.current.has(projectId)) return;
    sectionsInFlight.current.add(projectId);
    setSectionsLoading(prev => ({ ...prev, [projectId]: true }));

    // Show local placeholder sections immediately while we wait for DB
    const currentSections = sectionsMap[projectId];
    const hasRealSections = currentSections && currentSections.length > 0 && !currentSections[0]?.id?.startsWith('local-');
    if (!hasRealSections) {
      const localFallback: TodoSection[] = FIXED_SECTION_NAMES.map((name, i) => ({
        id: `local-${projectId}-${i}`,
        project_id: projectId,
        page_id: activePage,
        name,
        is_fixed: true,
        order_index: i,
        created_at: new Date().toISOString(),
      }));
      setSectionsMap(prev => ({ ...prev, [projectId]: localFallback }));
    }

    try {
      const url = `/api/todo-sections?project_id=${encodeURIComponent(projectId)}`
        + `&page_id=${encodeURIComponent(activePage)}&auto_create=true`;
      console.log('[TodoPage] fetchSections URL:', url);
      const res = await fetch(url);
      console.log('[TodoPage] fetchSections response status:', res.status);
      if (!res.ok) {
        const errText = await res.text();
        console.error('[TodoPage] GET /api/todo-sections failed:', res.status, errText);
        // Keep local fallback on error
        return;
      }
      const rawSections: any[] = await res.json();
      console.log('[TodoPage] fetchSections got', rawSections.length, 'sections:', rawSections.map(s => s.name));
      if (rawSections.length > 0) {
        const sections: TodoSection[] = rawSections.map(normalizeSection);
        setSectionsMap(prev => ({ ...prev, [projectId]: sections }));
      }
      // If rawSections.length === 0 (shouldn't happen with auto_create), keep local fallback
    } catch (e) {
      console.error('[TodoPage] fetchSectionsForProject error:', e);
      // Keep local fallback on error
    } finally {
      sectionsInFlight.current.delete(projectId);
      setSectionsLoading(prev => ({ ...prev, [projectId]: false }));
    }
  };



  const handleAddSection = async (projectId: string) => {
    if (!newSectionName.trim()) return;
    const sections = sectionsMap[projectId] || [];
    try {
      const r = await fetch('/api/todo-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          page_id: activePage,
          name: newSectionName.trim(),
          is_default: false,
          order_index: sections.length
        })
      });
      if (r.ok) {
        const raw = await r.json();
        const newSec: TodoSection = { ...raw, is_fixed: raw.is_default ?? false };
        setSectionsMap(prev => ({ ...prev, [projectId]: [...(prev[projectId] || []), newSec] }));
        setNewSectionName('');
        setAddingSectionToProject(null);
      } else {
        const errText = await r.text();
        console.error('[TodoPage] handleAddSection failed:', r.status, errText);
        alert(`Erro ao criar seção: ${errText}`);
      }
    } catch (e) {
      console.error('[TodoPage] handleAddSection error:', e);
    }
  };

  const handleRenameSection = async (section: TodoSection) => {
    // Prevent double-fire when Enter triggers both onKeyDown and onBlur
    if (renameSubmitted.current) return;
    renameSubmitted.current = true;

    const newName = renamingValue.trim();
    setRenamingSectionId(null);

    if (!newName || newName === section.name) {
      renameSubmitted.current = false;
      return;
    }

    // Optimistic update
    setSectionsMap(prev => ({
      ...prev,
      [section.project_id]: (prev[section.project_id] || []).map(s =>
        s.id === section.id ? { ...s, name: newName } : s
      )
    }));

    try {
      const isLocal = section.id.startsWith('local-');

      if (isLocal) {
        // Section only exists locally — create it in DB with the new name
        const r = await fetch('/api/todo-sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: section.project_id,
            page_id: section.page_id || activePage,
            name: newName,
            is_default: section.is_fixed,
            order_index: section.order_index
          })
        });
        if (r.ok) {
          const raw = await r.json();
          const created: TodoSection = { ...raw, is_fixed: raw.is_default ?? false };
          // Replace local section with real DB section
          setSectionsMap(prev => ({
            ...prev,
            [section.project_id]: (prev[section.project_id] || []).map(s =>
              s.id === section.id ? created : s
            )
          }));
          // Reassign any tasks that had the local section_id
          setTasks(prev => prev.map(t =>
            t.section_id === section.id ? { ...t, section_id: created.id } : t
          ));
        }
      } else {
        // Section exists in DB — PATCH the name
        const patchRes = await fetch(`/api/todo-sections/${section.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName })
        });
        if (!patchRes.ok) {
          console.error('[TodoPage] PATCH rename failed:', patchRes.status, await patchRes.text());
          // Revert optimistic update on failure
          setSectionsMap(prev => ({
            ...prev,
            [section.project_id]: (prev[section.project_id] || []).map(s =>
              s.id === section.id ? { ...s, name: section.name } : s
            )
          }));
        }
      }
    } catch (e) {
      console.error('[TodoPage] handleRenameSection error:', e);
    } finally {
      renameSubmitted.current = false;
    }
  };




  
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Deseja realmente excluir esta tarefa?")) return;
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (e) {
      console.error(e);
      fetchData(); // revert
    }
  };

  const handleDeleteSection = async (section: TodoSection) => {
    if (!window.confirm(`Deletar seção "${section.name}"? As tarefas serão mantidas sem seção.`)) return;
    try {
      await fetch(`/api/todo-sections/${section.id}`, { method: 'DELETE' });
      setSectionsMap(prev => ({
        ...prev,
        [section.project_id]: (prev[section.project_id] || []).filter(s => s.id !== section.id)
      }));
      // Clear section_id from tasks locally
      setTasks(prev => prev.map(t => t.section_id === section.id ? { ...t, section_id: null } : t));
    } catch (e) { console.error(e); }
  };

  const handleAddTaskToSection = async (projectId: string, sectionId: string | null) => {
    if (!addingTaskSectionTitle.trim()) return;
    try {
      let realSectionId = sectionId;

      // If the section only exists locally, persist it to DB first
      if (sectionId && sectionId.startsWith('local-')) {
        const localSection = (sectionsMap[projectId] || []).find(s => s.id === sectionId);
        if (localSection) {
          const r = await fetch('/api/todo-sections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: projectId,
              page_id: localSection.page_id || activePage,
              name: localSection.name,
              is_default: localSection.is_fixed,
              order_index: localSection.order_index
            })
          });
          if (r.ok) {
            const raw = await r.json();
            const created: TodoSection = { ...raw, is_fixed: raw.is_default ?? false };
            realSectionId = created.id;
            // Replace local section with DB section in state
            setSectionsMap(prev => ({
              ...prev,
              [projectId]: (prev[projectId] || []).map(s => s.id === sectionId ? created : s)
            }));
          } else {
            // API failed — use null so task is still created
            realSectionId = null;
          }
        }
      }

      const taskId = Math.random().toString(36).substring(2, 15);
      const r = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          title: addingTaskSectionTitle.trim(),
          description: '',
          status: 'pending',
          createdBy: authUser?.id || 'system',
          assignedTo: 'all',
          dueDate: new Date().toISOString().split('T')[0],
          subtasks: [],
          project_id: projectId,
          page_id: activePage,
          section_id: realSectionId
        })
      });
      if (r.ok) {
        setAddingTaskSectionTitle('');
        setAddingTaskToSection(null);
        fetchData();
      }
    } catch (e) { console.error(e); }
  };



  const moveTaskToSection = async (taskId: string, sectionId: string | null) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_id: sectionId })
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, section_id: sectionId } : t));
    } catch (e) { console.error(e); }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setTasks(tasks.map(t => t.id === task.id ? { 
          ...t, 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        } : t));
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
        setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? { ...t, [field]: value } : t));
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


  // Filter tasks based on active tab
  // Ativos: pending tasks + tasks completed TODAY (stay visible during the day)
  // Arquivadas: tasks completed on PREVIOUS days (auto-move when day changes)
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const isCompletedBeforeToday = (task: Task) => {
    if (task.status !== 'completed') return false;
    if (!task.completed_at) return true; // completed without timestamp = treat as archived
    const completedDate = new Date(task.completed_at).toISOString().split('T')[0];
    return completedDate < today;
  };
  
  const filteredByTab = todoTab === 'ativos'
    ? tasks.filter(t => !isCompletedBeforeToday(t)) // pending + completed today
    : tasks.filter(t => isCompletedBeforeToday(t)); // completed before today

  // Grouping logic
  const groupedTasks: Record<string, Record<string, Task[]>> = {};
  
  // In "Ativos" tab: seed ALL projects so they always appear, even with 0 tasks
  if (todoTab === 'ativos') {
    projects.forEach(p => {
      if (p.id === 'no-project') return; // skip the placeholder
      const groupName = p.group || 'Sem Grupo';
      if (selectedGroup !== 'all' && groupName !== selectedGroup) return;
      if (!groupedTasks[groupName]) groupedTasks[groupName] = {};
      if (!groupedTasks[groupName][p.id]) groupedTasks[groupName][p.id] = [];
    });
  }
  
  filteredByTab.forEach(task => {
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

  let totalOptimized = 0;
  let totalPending = 0;

  if (todoTab === 'ativos') {
    ['Grupo 1', 'Grupo 2', 'Quarentena'].forEach(targetGroup => {
      const actualGroupKey = Object.keys(groupedTasks).find(k => k.toLowerCase() === targetGroup.toLowerCase());
      if (!actualGroupKey) return;
      const clients = groupedTasks[actualGroupKey];
      Object.entries(clients).forEach(([projectId, clientTasks]) => {
        const completedCount = clientTasks.filter(t => t.status === 'completed').length;
        let clientStatus = 'PENDENTE';
        if (clientTasks.length === 0) clientStatus = 'SEM TAREFAS';
        else if (clientTasks.some(t => t.status === 'gargalo')) clientStatus = 'GARGALO';
        else if (clientTasks.every(t => t.status === 'completed')) clientStatus = 'OTIMIZADO';
        else clientStatus = 'PENDENTE';
        
        if (selectedStatus !== 'all' && clientStatus !== selectedStatus.toUpperCase()) return;

        clientTasks.forEach(t => {
          if (t.status === 'completed') totalOptimized++;
          else totalPending++;
        });
      });
    });
  } else {
    Object.values(groupedTasks).forEach(clients => {
      Object.entries(clients).forEach(([projectId, clientTasks]) => {
        const completedCount = clientTasks.filter(t => t.status === 'completed').length;
        let clientStatus = 'PENDENTE';
        if (clientTasks.length === 0) clientStatus = 'SEM TAREFAS';
        else if (clientTasks.some(t => t.status === 'gargalo')) clientStatus = 'GARGALO';
        else if (clientTasks.every(t => t.status === 'completed')) clientStatus = 'OTIMIZADO';
        else clientStatus = 'PENDENTE';
        
        if (selectedStatus !== 'all' && clientStatus !== selectedStatus.toUpperCase()) return;

        clientTasks.forEach(t => {
          if (t.status === 'completed') totalOptimized++;
          else totalPending++;
        });
      });
    });
  }
  const totalArquivadas = tasks.filter(t => isCompletedBeforeToday(t)).length;
  const totalAtivos = tasks.filter(t => !isCompletedBeforeToday(t)).length;

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
      {/* Header + Tabs + Filters — agrupados para evitar space-y-6 entre eles */}
      <div className="flex flex-col gap-3">

        {/* Header */}
        <div className="flex flex-row justify-between items-center">
          <div>
            <SplitHeadline
              text="To Do "
              highlight="Gestor"
              subtitle="Controle diário de campanhas e tarefas"
              className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1"
              subtitleClassName="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5"
            />
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
          </div>
        </div>

        {/* Ativos / Arquivadas Tabs */}
        <div className="flex items-center gap-1 bg-white dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10 w-fit">
          <button
            onClick={() => setTodoTab('ativos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              todoTab === 'ativos'
                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <Circle size={14} />
            Ativos
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              todoTab === 'ativos'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
            }`}>
              {totalAtivos}
            </span>
          </button>
          <button
            onClick={() => setTodoTab('arquivadas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              todoTab === 'arquivadas'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <Archive size={14} />
            Arquivadas
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              todoTab === 'arquivadas'
                ? 'bg-white/20 text-white'
                : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
            }`}>
              {totalArquivadas}
            </span>
          </button>
        </div>

        {/* Filters — custom dropdowns */}
        <div className="flex items-center gap-3 w-fit">

          {/* ── Grupos ── */}
          <div className="relative" ref={groupDropdownRef}>
            <button
              id="group-filter-btn"
              onClick={() => { setGroupDropdownOpen(v => !v); setStatusDropdownOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all bg-white dark:bg-dark-card text-slate-700 dark:text-dark-text hover:border-violet-400 dark:hover:border-violet-500/50 ${groupDropdownOpen ? 'border-violet-400 dark:border-violet-500/60 ring-2 ring-violet-400/20' : 'border-slate-200 dark:border-white/10'}`}
            >
              <span>{selectedGroup === 'all' ? 'Todos os Grupos' : selectedGroup}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 dark:text-dark-text/50 ${groupDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {groupDropdownOpen && (
              <div style={{ position: 'absolute', width: 0, height: 0 }}>
                <div 
                  className="z-[9999] min-w-[180px] rounded-xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden bg-white dark:bg-dark-card"
                  style={{ position: 'absolute', top: '6px', left: 0 }}
                >
                  {[{ value: 'all', label: 'Todos os Grupos' }, ...uniqueGroups.map(g => ({ value: g, label: g }))].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSelectedGroup(opt.value); setGroupDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedGroup === opt.value
                          ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold'
                          : 'text-slate-700 dark:text-dark-text hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Status ── */}
          <div className="relative" ref={statusDropdownRef}>
            <button
              id="status-filter-btn"
              onClick={() => { setStatusDropdownOpen(v => !v); setGroupDropdownOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all bg-white dark:bg-dark-card text-slate-700 dark:text-dark-text hover:border-violet-400 dark:hover:border-violet-500/50 ${statusDropdownOpen ? 'border-violet-400 dark:border-violet-500/60 ring-2 ring-violet-400/20' : 'border-slate-200 dark:border-white/10'}`}
            >
              <span>{
                selectedStatus === 'all' ? 'Todos os Status'
                : selectedStatus === 'OTIMIZADO' ? 'Otimizado'
                : selectedStatus === 'PENDENTE' ? 'Pendente'
                : 'Gargalo'
              }</span>
              <ChevronDown size={14} className={`transition-transform duration-200 text-slate-400 dark:text-dark-text/50 ${statusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {statusDropdownOpen && (
              <div style={{ position: 'absolute', width: 0, height: 0 }}>
                <div 
                  className="z-[9999] min-w-[180px] rounded-xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden bg-white dark:bg-dark-card"
                  style={{ position: 'absolute', top: '6px', left: 0 }}
                >
                  {[
                    { value: 'all',       label: 'Todos os Status' },
                    { value: 'OTIMIZADO', label: 'Otimizado' },
                    { value: 'PENDENTE',  label: 'Pendente' },
                    { value: 'GARGALO',   label: 'Gargalo' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSelectedStatus(opt.value); setStatusDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedStatus === opt.value
                          ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold'
                          : 'text-slate-700 dark:text-dark-text hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>


        </div>

      </div>{/* /flex-col gap-3 */}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-purple-500" size={32} />
        </div>
      ) : todoTab === 'arquivadas' ? (
        /* ── Arquivadas: flat task list ─────────────────────────── */
        <div className="pb-6 pt-2">
          {filteredByTab.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full py-16 text-center">
              <Archive size={40} className="text-emerald-500/30 mb-3" />
              <p className="text-dark-text/40 font-medium">Nenhuma tarefa arquivada</p>
              <p className="text-dark-text/25 text-sm mt-1">Tarefas concluídas aparecerão aqui</p>
            </div>
          ) : (
            <div className="bg-dark-card border border-white/[0.06] rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr_200px_140px] gap-4 px-5 py-3 border-b border-white/[0.06]">
                <span className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest">Tarefa</span>
                <span className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest text-right">Parceiro</span>
                <span className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest text-right">Concluída em</span>
              </div>
              {/* Rows */}
              {filteredByTab
                .sort((a, b) => {
                  const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
                  const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
                  return dateB - dateA; // most recent first
                })
                .map(task => {
                  const projectName = task.project_name || projects.find(p => p.id === task.project_id)?.partner || '—';
                  const completedDate = task.completed_at 
                    ? new Date(task.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : '—';
                  return (
                    <div 
                      key={task.id} 
                      className="grid grid-cols-[1fr_200px_140px] gap-4 px-5 py-3 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      onClick={() => openTaskDetail(task)}
                    >
                      {/* Task title with check */}
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                        <span className="text-sm text-dark-text/60 truncate line-through decoration-dark-text/20">{task.title}</span>
                      </div>
                      {/* Project name */}
                      <div className="flex items-center justify-end">
                        <span className="text-xs text-dark-text/40 truncate">{projectName}</span>
                      </div>
                      {/* Completed date */}
                      <div className="flex items-center justify-end gap-1.5">
                        <Calendar size={12} className="text-dark-text/25" />
                        <span className="text-xs text-dark-text/35 font-medium">{completedDate}</span>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}
        </div>
      ) : (
        /* ── Ativos: kanban / list view ─────────────────────────── */
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={() => setActiveTask(null)}>
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
            
            const renderCards = () => filteredClients.map(([pid, ct]) => {
              const completedCount = ct.filter(t => t.status === 'completed').length;
              const progress = ct.length > 0 ? (completedCount / ct.length) * 100 : 0;
              const projectName = pid === 'no-project'
                ? 'Tarefas Internas / Sem Parceiro'
                : (ct[0]?.project_name || projects.find(p => p.id === pid)?.partner || 'Projeto Desconhecido');
              const isClientExpanded = expandedClients[groupName + pid] || false;

              const isDone = progress === 100;

              const renderExpandedContentForCard = () => {
                const sections = sectionsMap[pid];


                const allProjectTasks = ct;

                const renderTaskRowCard = (task: Task) => {
                  const isCompleted = task.status === 'completed';
                  const taskSections = sectionsMap[pid] || [];
                  return (
                    <SortableTaskRow task={task}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (task.status !== 'completed') {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = (rect.left + rect.width / 2) / window.innerWidth;
                            const y = (rect.top + rect.height / 2) / window.innerHeight;
                            confetti({ particleCount: 30, spread: 50, scalar: 0.6, origin: { x, y }, colors: ['#8B5CF6', '#A78BFA', '#C4B5FD'], disableForReducedMotion: true, zIndex: 100 });
                          }
                          toggleTaskStatus(task);
                        }}
                        className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-dark-text/20 hover:border-violet-400'}`}
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
                        
                        {(task.tags && task.tags.length > 0) ? (() => {
                          const tagName = task.tags![0];
                          const tagColors: Record<string, string> = {
                            'Facebook': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                            'Google': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                            'CRM': 'text-violet-400 bg-violet-400/10 border-violet-400/20',
                            'Otimização': 'text-violet-400 bg-violet-400/10 border-violet-400/20',
                          };
                          const colorClass = tagColors[tagName] || 'text-violet-400 bg-violet-400/10 border-violet-400/20';
                          return (
                            <span className={`text-[9px] font-semibold flex items-center gap-1 border px-1.5 py-0.5 rounded-full ${colorClass}`}>
                              <Tag size={9} />{tagName}
                              <button onClick={(e) => { e.stopPropagation(); updateTaskField(task.id, 'tags', [] as any); }} className="hover:text-red-400 ml-0.5"><X size={8} /></button>
                            </span>
                          );
                        })() : (
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button id={`tag-btn-${task.id}`} onClick={() => setOpenTagDropdown(openTagDropdown === task.id ? null : task.id)} className="text-[9px] font-semibold text-dark-text/30 flex items-center gap-1 bg-dark-text/5 px-1.5 py-0.5 rounded-full hover:bg-dark-text/10 transition-colors" title="Adicionar Tag">
                              <Plus size={9} /> Tag
                            </button>
                            {openTagDropdown === task.id && createPortal(
                              <div
                                id="tag-dropdown-portal"
                                className="fixed bg-white dark:bg-[#1A1A24] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl py-1 z-[9999] min-w-[120px]"
                                style={(() => {
                                  const btn = document.getElementById(`tag-btn-${task.id}`);
                                  if (!btn) return { top: 0, left: 0 };
                                  const r = btn.getBoundingClientRect();
                                  return { top: r.bottom + 4, left: Math.max(8, r.right - 120) };
                                })()}
                              >
                                {['Facebook', 'Google', 'CRM', 'Otimização'].map(option => (
                                  <button key={option} onClick={() => { updateTaskField(task.id, 'tags', [option] as any); setOpenTagDropdown(null); }} className="w-full text-left px-3 py-1.5 text-[10px] text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">{option}</button>
                                ))}
                              </div>,
                              document.body
                            )}
                          </div>
                        )}
                        <DatePicker value={task.dueDate || null} onChange={(val) => updateTaskField(task.id, 'dueDate', val)} />
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="hidden group-hover/task:flex text-dark-text/30 hover:text-red-400 p-0.5 rounded transition-colors" title="Deletar tarefa"><Trash2 size={12} /></button>
                      </div>
                    </SortableTaskRow>
                  );
                };

                const renderAddInput = (sectionId: string | null) => {
                  const key = sectionId || '__none__';
                  if (addingTaskToSection === key) {
                    return (
                      <div className="flex items-center gap-2 mt-1">
                        <input type="text" value={addingTaskSectionTitle} onChange={(e) => setAddingTaskSectionTitle(e.target.value)}
                          placeholder="Nova tarefa..." className="flex-1 bg-dark-card border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:outline-none focus:border-violet-500"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddTaskToSection(pid, sectionId); if (e.key === 'Escape') { setAddingTaskToSection(null); setAddingTaskSectionTitle(''); } }} autoFocus />
                        <button onClick={() => handleAddTaskToSection(pid, sectionId)} className="bg-violet-600 hover:bg-violet-700 text-white p-1.5 rounded-lg"><Check size={14}/></button>
                        <button onClick={() => { setAddingTaskToSection(null); setAddingTaskSectionTitle(''); }} className="text-dark-text/40 hover:text-red-400 p-1.5"><X size={14}/></button>
                      </div>
                    );
                  }
                  return (
                    <button onClick={() => { setAddingTaskToSection(key); setAddingTaskSectionTitle(''); }}
                      className="text-[9px] font-medium text-dark-text/20 hover:text-violet-400 uppercase tracking-wider flex items-center gap-1 px-2 py-1 w-full mt-1 transition-colors">
                      <Plus size={10} /> Adicionar Tarefa
                    </button>
                  );
                };

                if (sections && sections.length > 0) {
                  const unsectionedTasks = allProjectTasks.filter(t => !t.section_id || !sections.find(s => s.id === t.section_id));
                  return (
                    <div className="p-3 space-y-3">
                      {sections.map(section => {
                        const sectionTasks = allProjectTasks.filter(t => t.section_id === section.id);
                        return (
                          <div key={section.id}>
                            
                            {/* COLLAPSE LOGIC INJECTED HERE */}
                            {(() => {
                              const sectionKey = `section-${pid}-${section.id}`;
                              const isCollapsed = collapsedSections[sectionKey] ?? (sectionTasks.length === 0);
                              const toggleCollapse = () => setCollapsedSections(prev => {
                                const currentState = prev[sectionKey] ?? (sectionTasks.length === 0);
                                return { ...prev, [sectionKey]: !currentState };
                              });
                              
                              return (
                                <>
                                  <div className="flex items-center gap-1.5 mb-1 group/section">
                                    {renamingSectionId === section.id ? (
                                      <input autoFocus type="text" value={renamingValue} onChange={(e) => setRenamingValue(e.target.value)}
                                        onBlur={() => handleRenameSection(section)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') { e.preventDefault(); handleRenameSection(section); }
                                          if (e.key === 'Escape') { renameSubmitted.current = true; setRenamingSectionId(null); setTimeout(() => { renameSubmitted.current = false; }, 100); }
                                        }}
                                        className="flex-1 text-[10px] font-bold bg-transparent border-b border-violet-500 text-violet-400 uppercase tracking-widest focus:outline-none" />
      
                                    ) : (
                                      <>
                                        <button onClick={toggleCollapse} className="text-dark-text/40 hover:text-dark-text/60 p-0.5 rounded transition-colors -ml-1">
                                          <div className={`transform transition-transform duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                                            <ChevronDown size={12} />
                                          </div>
                                        </button>
                                        <span className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest flex-1 cursor-pointer" onClick={toggleCollapse}>{section.name}</span>
                                        <span className="text-[9px] bg-dark-text/10 px-1.5 py-0.5 rounded-full text-dark-text/40 font-bold">{sectionTasks.length}</span>
                                        <div className="hidden group-hover/section:flex items-center gap-0.5">
                                          <button onClick={() => { setRenamingSectionId(section.id); setRenamingValue(section.name); }} className="p-0.5 text-dark-text/30 hover:text-violet-400 transition-colors rounded" title="Renomear seção"><Edit2 size={10} /></button>
                                          <button onClick={() => handleDeleteSection(section)} className="p-0.5 text-dark-text/30 hover:text-red-400 transition-colors rounded" title="Deletar seção"><Trash2 size={10} /></button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  
                                  <AnimatePresence initial={false}>
                                    {!isCollapsed && (
                                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} className="overflow-hidden">
                                        <SortableSectionDropZone id={`section-${pid}-${section.id}`} items={sectionTasks.map(t => t.id)}>
                                          {sectionTasks.map(renderTaskRowCard)}
                                        </SortableSectionDropZone>
                                        {renderAddInput(section.id)}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </>
                              );
                            })()}


                          </div>
                        );
                      })}
                      {unsectionedTasks.length > 0 && (
                        <div>
                          {(() => {
                            const unsectionedKey = `section-${pid}-__none__`;
                            const isUnsectionedCollapsed = collapsedSections[unsectionedKey] ?? (unsectionedTasks.length === 0);
                            const toggleUnsectioned = () => setCollapsedSections(prev => {
                              const currentState = prev[unsectionedKey] ?? (unsectionedTasks.length === 0);
                              return { ...prev, [unsectionedKey]: !currentState };
                            });
                            
                            return (
                              <>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <button onClick={toggleUnsectioned} className="text-dark-text/40 hover:text-dark-text/60 p-0.5 rounded transition-colors -ml-1">
                                    <div className={`transform transition-transform duration-200 ${isUnsectionedCollapsed ? '-rotate-90' : 'rotate-0'}`}>
                                      <ChevronDown size={12} />
                                    </div>
                                  </button>
                                  <span className="text-[10px] font-bold text-dark-text/30 uppercase tracking-widest flex-1 cursor-pointer" onClick={toggleUnsectioned}>Sem Seção</span>
                                  <span className="text-[9px] bg-dark-text/10 px-1.5 py-0.5 rounded-full text-dark-text/30 font-bold">{unsectionedTasks.length}</span>
                                </div>
                                
                                <AnimatePresence initial={false}>
                                  {!isUnsectionedCollapsed && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} className="overflow-hidden">
                                      <SortableSectionDropZone id={`section-${pid}-__none__`} items={unsectionedTasks.map(t => t.id)}>
                                        {unsectionedTasks.map(renderTaskRowCard)}
                                      </SortableSectionDropZone>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </>
                            );
                          })()}

                        </div>
                      )}
                      <div className="pt-2 border-t border-white/[0.04]">
                        {addingSectionToProject === pid ? (
                          <div className="flex items-center gap-2">
                            <input autoFocus type="text" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)}
                              placeholder="Nome da seção..." className="flex-1 bg-dark-card border border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text focus:outline-none focus:border-violet-500"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddSection(pid); if (e.key === 'Escape') { setAddingSectionToProject(null); setNewSectionName(''); } }} />
                            <button onClick={() => handleAddSection(pid)} className="bg-violet-600 hover:bg-violet-700 text-white p-1.5 rounded-lg"><Check size={14}/></button>
                            <button onClick={() => { setAddingSectionToProject(null); setNewSectionName(''); }} className="text-dark-text/40 hover:text-red-400 p-1.5"><X size={14}/></button>
                          </div>
                        ) : (
                          <button onClick={() => { setAddingSectionToProject(pid); setNewSectionName(''); }}
                            className="text-[9px] font-medium text-dark-text/20 hover:text-violet-400 uppercase tracking-wider flex items-center gap-1 px-2 py-1 w-full transition-colors">
                            <Plus size={10} /> Nova Seção
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // Fallback: sections not loaded yet
                return (
                  <div className="p-3 space-y-1.5">
                    {allProjectTasks.map(renderTaskRowCard)}
                    <div className="pt-2 mt-2 border-t border-white/[0.06]">
                      {renderAddInput(null)}
                    </div>
                  </div>
                );
              };

              return (
                <div key={pid} className="flex flex-col rounded-2xl bg-dark-card border border-white/[0.06] hover:border-violet-500/25 transition-all shadow-sm flex-shrink-0">
                  <div className="p-4 cursor-pointer" onClick={() => {
                    const newExpanded = !isClientExpanded;
                    setExpandedClients(prev => ({ ...prev, [groupName + pid]: newExpanded }));
                    if (newExpanded && pid !== 'no-project') {
                      // Set local placeholder sections synchronously so they render immediately
                      if (!sectionsMap[pid] || sectionsMap[pid].length === 0) {
                        setSectionsMap(prev => ({
                          ...prev,
                          [pid]: FIXED_SECTION_NAMES.map((name, i) => ({
                            id: `local-${pid}-${i}`,
                            project_id: pid,
                            page_id: activePage,
                            name,
                            is_fixed: true,
                            order_index: i,
                            created_at: new Date().toISOString(),
                          }))
                        }));
                      }
                      fetchSectionsForProject(pid);
                    }
                  }}>
                    {viewType === 'list' ? (
                      <div className="flex items-start gap-3">
                        {getProjectIcon(pid)}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-dark-text truncate pr-2">{projectName}</h4>
                          <div className="w-[300px] shrink-0 mt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-dark-text/40">{completedCount}/{ct.length} tarefas</span>
                              <CountUp value={progress} suffix="%" className="text-[10px] font-bold text-violet-400" />
                            </div>
                            <AnimatedBar progress={progress} isDone={isDone} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        {getProjectIcon(pid)}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-dark-text truncate pr-2">{projectName}</h4>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] font-bold text-dark-text/40">{completedCount}/{ct.length} tarefas</span>
                            <CountUp value={progress} suffix="%" className="text-[10px] font-bold text-violet-400" />
                          </div>
                          <AnimatedBar progress={progress} isDone={isDone} />
                        </div>
                      </div>
                    )}
                  </div>
                  <AnimatePresence>
                    {isClientExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, overflow: 'hidden' as any }}
                        animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
                        exit={{ height: 0, opacity: 0, overflow: 'hidden' as any }}
                        className="border-t border-white/[0.06] bg-dark-bg/50 rounded-b-2xl"
                      >
                        {renderExpandedContentForCard()}
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
            <div className="flex flex-col items-center justify-center w-full py-16 text-center">
              <CheckCircle2 size={40} className="text-violet-500/30 mb-3" />
              <p className="text-dark-text/40 font-medium">Nenhuma tarefa ativa</p>
              <p className="text-dark-text/25 text-sm mt-1">Crie um lote de tarefas para começar</p>
            </div>
          )}
        </div>
        
          <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }) }}>
            {activeTask ? (
              <div className="opacity-90 shadow-2xl scale-105 rounded-xl bg-[#1E1E2D] border border-white/10 p-2 min-w-[250px]">
                <div className="flex items-center gap-2">
                  <div className="text-violet-400 cursor-grabbing"><GripVertical size={14} /></div>
                  <span className="text-xs text-white truncate">{activeTask.title}</span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

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
        onTaskDelete={handleDeleteTask}
      />
    </div>
  );
};

export default TodoPage;
