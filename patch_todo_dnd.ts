import fs from 'fs';
let content = fs.readFileSync('src/pages/TodoPage.tsx', 'utf-8');

// 1. Add GripVertical to lucide-react
content = content.replace('Archive\n} from \'lucide-react\';', 'Archive, GripVertical\n} from \'lucide-react\';');

// 2. Add DND Kit imports
const dndImports = `
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
`;
content = content.replace("import { DatePicker }", dndImports + "import { DatePicker }");

// 3. Add SortableTaskRow component
const sortableComponent = `
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

`;
content = content.replace("// ── Animated Progress Bar", sortableComponent + "// ── Animated Progress Bar");

// 4. Update tasks state logic to handle drag and drop
const dndHandlers = `
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.sortable?.containerId;
    const isOverTask = over.data.current?.sortable?.containerId;
    const overContainerId = isOverTask ? over.data.current.sortable.containerId : over.id;
    
    // We only allow dragging across sections within the SAME PROJECT for now
    // The containerId is the section_id (or project_id if no section)
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const activeContainerId = active.data.current?.sortable?.containerId;
    const overContainerId = over.data.current?.sortable?.containerId || over.id;
    
    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    let newTasks = [...tasks];
    
    // Find project_id of the active task
    const projectId = activeTask.project_id || 'no-project';
    
    // If we dropped over a section ID that doesn't match the active task's section
    // we need to update section_id
    let newSectionId = overContainerId === \`section-\${projectId}-__none__\` ? null : overContainerId.toString().replace(\`section-\${projectId}-\`, '');
    if (newSectionId === overContainerId) {
      // It means it dropped onto a task in the same container, containerId is already the section
      if (overContainerId.toString().includes('__none__')) newSectionId = null;
    }

    const oldIndex = tasks.findIndex(t => t.id === active.id);
    let newIndex = tasks.findIndex(t => t.id === over.id);
    
    if (newIndex === -1) {
       // Dropped on an empty container
       newIndex = tasks.length - 1; 
    }

    // Optimistic update
    activeTask.section_id = newSectionId;
    newTasks = arrayMove(newTasks, oldIndex, newIndex);
    
    // Reassign order_index for ALL tasks in this project/section to ensure consistency
    let orderCounter = 0;
    const updatedTasksForDb: any[] = [];
    newTasks.forEach(t => {
      if ((t.project_id || 'no-project') === projectId && (t.section_id || null) === newSectionId) {
        t.order_index = orderCounter++;
        updatedTasksForDb.push({ id: t.id, section_id: t.section_id, order_index: t.order_index });
      }
    });

    setTasks([...newTasks]);

    try {
      await fetch('/api/tasks/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasksForDb })
      });
    } catch (e) {
      console.error(e);
      fetchTasks(); // revert on failure
    }
  };

  // Close tag dropdown + filter dropdowns on click outside
`;
content = content.replace("  // Close tag dropdown + filter dropdowns on click outside\n  useEffect(() => {", dndHandlers + "  useEffect(() => {");

// 5. Wrap Ativos Kanban with DndContext
content = content.replace(
  '<div className={viewType === \'kanban\' ? "flex gap-4 overflow-x-auto pb-6 pt-2 h-[calc(100vh-200px)] items-start custom-scrollbar" : "space-y-6 pb-6 pt-2"}>',
  '<DndContext sensors={sensors} collisionDetection={closestCenter} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>\n          <div className={viewType === \'kanban\' ? "flex gap-4 overflow-x-auto pb-6 pt-2 h-[calc(100vh-200px)] items-start custom-scrollbar" : "space-y-6 pb-6 pt-2"}>'
);
content = content.replace(
  '          {/* Flat task list for all non-completed tasks (List View) */}\n          {viewType === \'list\' && (',
  '          </div>\n        </DndContext>\n\n          {/* Flat task list for all non-completed tasks (List View) */}\n          {viewType === \'list\' && ('
);

// 6. Wrap Task Item in SortableTaskRow and remove the section <select>
content = content.replace(/<div key=\{task.id\} className="flex items-center gap-2.5 p-2 hover:bg-white\/5 rounded-xl group\/task transition-colors">/g, '<SortableTaskRow task={task}>');
content = content.replace(/<DatePicker value=\{task.dueDate \|\| null\} onChange=\{\(val\) => updateTaskField\(task.id, 'dueDate', val\)\} \/>\n                      <\/div>\n                    <\/div>/g, '<DatePicker value={task.dueDate || null} onChange={(val) => updateTaskField(task.id, \'dueDate\', val)} />\n                      </div>\n                    </SortableTaskRow>');

// Remove the section select entirely
content = content.replace(/\{taskSections\.length > 0 && \(\n.*?<div className="relative" onClick=\{\(e\) => e\.stopPropagation\(\)\}>\n.*?<select[\s\S]*?<\/select>\n.*?<\/div>\n.*?\)\}/g, '');


// 7. Wrap sections with SortableContext
// We need to find where unsectionedTasks and section tasks are rendered
// Unsectioned:
// <div className="space-y-0.5 mt-2">
//   {unsectionedTasks.map(renderTaskRowCard)}
// </div>

const unsectionRegex = /<div className="space-y-0.5 mt-2">\s*\{unsectionedTasks\.map\(renderTaskRowCard\)\}\s*<\/div>/g;
content = content.replace(unsectionRegex, `
<SortableContext items={unsectionedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
  <div id={\`section-\${pid}-__none__\`} className="space-y-0.5 mt-2 min-h-[10px]">
    {unsectionedTasks.map(renderTaskRowCard)}
  </div>
</SortableContext>
`);

const sectionRegex = /<div className="space-y-0.5 mt-2">\s*\{sectionTasks\.map\(renderTaskRowCard\)\}\s*<\/div>/g;
content = content.replace(sectionRegex, `
<SortableContext items={sectionTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
  <div id={\`section-\${pid}-\${s.id}\`} className="space-y-0.5 mt-2 min-h-[10px]">
    {sectionTasks.map(renderTaskRowCard)}
  </div>
</SortableContext>
`);

fs.writeFileSync('src/pages/TodoPage.tsx', content);
