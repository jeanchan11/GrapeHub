import fs from 'fs';
let content = fs.readFileSync('src/pages/TodoPage.tsx', 'utf-8');

// 1. Add missing imports
content = content.replace(
  "import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent } from '@dnd-kit/core';",
  "import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverEvent, DragOverlay, useDroppable, defaultDropAnimationSideEffects, DragStartEvent } from '@dnd-kit/core';"
);

// 2. Add SortableSectionDropZone
const dropZoneCode = `
const SortableSectionDropZone = ({ id, items, children }: { id: string, items: string[], children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className={\`space-y-0.5 min-h-[40px] rounded-xl border border-transparent transition-colors p-1 \${isOver ? 'bg-violet-900/20 border-violet-500/30' : ''}\`}>
        {children}
      </div>
    </SortableContext>
  );
};
`;
if (!content.includes('SortableSectionDropZone')) {
  content = content.replace('const SortableTaskRow =', dropZoneCode + '\nconst SortableTaskRow =');
}

// 3. Add activeTask state and drag start/end handlers
if (!content.includes('const [activeTask, setActiveTask]')) {
  content = content.replace(
    'const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);',
    'const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);\n  const [activeTask, setActiveTask] = useState<Task | null>(null);'
  );
  
  const dragStartCode = `
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task;
    if (task) setActiveTask(task);
  };
`;
  content = content.replace('const handleDragOver =', dragStartCode + '\n  const handleDragOver =');
  
  content = content.replace('const handleDragEnd = async (event: DragEndEvent) => {', 'const handleDragEnd = async (event: DragEndEvent) => {\n    setActiveTask(null);');
}

// 4. Update DndContext tags
content = content.replace(
  '<DndContext sensors={sensors} collisionDetection={closestCenter} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>',
  '<DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={() => setActiveTask(null)}>'
);

// Add DragOverlay right before closing DndContext
const overlayCode = `
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
`;
content = content.replace('</DndContext>', overlayCode);

// 5. Wrap sections with SortableSectionDropZone
const unsectionedRegex = /<div className="space-y-0\.5">\{unsectionedTasks\.map\(renderTaskRowCard\)\}<\/div>/g;
content = content.replace(unsectionedRegex, `
<SortableSectionDropZone id={\`section-\${pid}-__none__\`} items={unsectionedTasks.map(t => t.id)}>
  {unsectionedTasks.map(renderTaskRowCard)}
</SortableSectionDropZone>
`);

const sectionRegex = /<div className="space-y-0\.5">\s*\{sectionTasks\.map\(renderTaskRowCard\)\}\s*\{renderAddInput\(section\.id\)\}\s*<\/div>/g;
content = content.replace(sectionRegex, `
<SortableSectionDropZone id={\`section-\${pid}-\${section.id}\`} items={sectionTasks.map(t => t.id)}>
  {sectionTasks.map(renderTaskRowCard)}
</SortableSectionDropZone>
{renderAddInput(section.id)}
`);


fs.writeFileSync('src/pages/TodoPage.tsx', content);
