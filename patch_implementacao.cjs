const fs = require('fs');
let code = fs.readFileSync('src/pages/ImplementacaoIA.tsx', 'utf8');

const stateInjection = `  const [addingNewGroup, setAddingNewGroup] = useState(false);
  const [newGroupLabel, setNewGroupLabel] = useState('');
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const newGroupRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingNewGroup && newGroupRef.current) newGroupRef.current.focus();
  }, [addingNewGroup]);

  const handleAddGroup = async () => {
    const val = newGroupLabel.trim();
    if (!val) { setAddingNewGroup(false); return; }
    const id = val.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      await fetch('/api/ia-status-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id, label: val.toUpperCase(), color: '#8b5cf6', emoji: '📌', order_index: statusGroups.length
        }),
      });
      fetchTasks();
    } catch { /* silent */ }
    setAddingNewGroup(false);
    setNewGroupLabel('');
  };

  const handleRenameGroup = async (id: string, label: string) => {
    try {
      await fetch(\`/api/ia-status-groups/\${id}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      fetchTasks();
    } catch { /* silent */ }
  };

  const handleUpdateGroup = async (id: string, fields: { color?: string; emoji?: string }) => {
    try {
      await fetch(\`/api/ia-status-groups/\${id}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      fetchTasks();
    } catch { /* silent */ }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      await fetch(\`/api/ia-status-groups/\${id}\`, { method: 'DELETE' });
      fetchTasks();
    } catch { /* silent */ }
  };

  const handleGroupDragStart = (id: string) => setDraggingGroupId(id);

  const handleGroupDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggingGroupId && targetId !== draggingGroupId) setDragOverGroupId(targetId);
  };

  const handleGroupDrop = async (targetId: string) => {
    if (!draggingGroupId || draggingGroupId === targetId) {
      setDraggingGroupId(null); setDragOverGroupId(null); return;
    }
    const fromIdx = statusGroups.findIndex(g => g.id === draggingGroupId);
    const toIdx = statusGroups.findIndex(g => g.id === targetId);
    if (fromIdx === -1 || toIdx === -1) { setDraggingGroupId(null); setDragOverGroupId(null); return; }

    const reordered = [...statusGroups];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setStatusGroups(reordered);
    setDraggingGroupId(null); setDragOverGroupId(null);

    try {
      await fetch('/api/ia-status-groups/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: reordered.map((g, i) => ({ id: g.id, order_index: i })) }),
      });
    } catch { /* silent */ }
  };
`;

code = code.replace(
  'const [detailSubtask, setDetailSubtask] = useState<{subtask: Subtask, task: OnboardingTask} | null>(null);',
  'const [detailSubtask, setDetailSubtask] = useState<{subtask: Subtask, task: OnboardingTask} | null>(null);\n' + stateInjection
);

const newStatusUI = `          </div>

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
          )}`;

code = code.replace(
  /<button className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-400 transition-colors mt-4 px-4 py-2">[\s\S]*?Novo status[\s\S]*?<\/button>/,
  newStatusUI
);

const groupBlockUsage = `<div onDragEnd={() => { setDraggingGroupId(null); setDragOverGroupId(null); }}>
          {groups.map((group, gIdx) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: -24, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: gIdx * 0.08, ease: [0.32, 0.72, 0, 1] }}
            >
              <GroupBlock
                group={group}
                coloredTagDefs={coloredTagDefs}
                onUpdate={fetchTasks}
                onAddTask={setAddingToGroup}
                onOpenSubtask={(s, t) => setDetailSubtask({subtask: s, task: t})}
                onOpenDetail={setDetailTask}
                onRenameGroup={handleRenameGroup}
                onUpdateGroup={handleUpdateGroup}
                onDeleteGroup={handleDeleteGroup}
                onDragStart={handleGroupDragStart}
                onDragOver={handleGroupDragOver}
                onDrop={handleGroupDrop}
                isDragOver={dragOverGroupId === group.id}
              />
            </motion.div>
          ))}
          </div>`;

code = code.replace(
  /\{groups\.map\(\(group, gIdx\) => \([\s\S]*?<\/motion\.div>\s*\)\)\}/m,
  groupBlockUsage
);

fs.writeFileSync('src/pages/ImplementacaoIA.tsx', code);
console.log('Main component updated.');
