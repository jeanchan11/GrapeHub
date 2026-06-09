import fs from 'fs';

let content = fs.readFileSync('src/pages/TodoPage.tsx', 'utf-8');

// 1. Remove is_fixed restriction from delete section button
const sectionDeleteFind = `{!section.is_fixed && (
                                            <button onClick={() => handleDeleteSection(section)} className="p-0.5 text-dark-text/30 hover:text-red-400 transition-colors rounded" title="Deletar seção"><Trash2 size={10} /></button>
                                          )}`;
const sectionDeleteReplace = `<button onClick={() => handleDeleteSection(section)} className="p-0.5 text-dark-text/30 hover:text-red-400 transition-colors rounded" title="Deletar seção"><Trash2 size={10} /></button>`;

if (content.includes(sectionDeleteFind)) {
  content = content.replace(sectionDeleteFind, sectionDeleteReplace);
}

// 2. Remove is_fixed check inside handleDeleteSection
const sectionHandlerFind = `const handleDeleteSection = async (section: TodoSection) => {
    if (section.is_fixed) return;`;
const sectionHandlerReplace = `const handleDeleteSection = async (section: TodoSection) => {`;

if (content.includes(sectionHandlerFind)) {
  content = content.replace(sectionHandlerFind, sectionHandlerReplace);
}

// 3. Add handleDeleteTask function near handleDeleteSection
const insertTaskHandler = `
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Deseja realmente excluir esta tarefa?")) return;
    try {
      await fetch(\`/api/tasks/\${taskId}\`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (e) {
      console.error(e);
      fetchData(); // revert
    }
  };
`;

if (!content.includes('const handleDeleteTask =')) {
  content = content.replace(
    'const handleDeleteSection = async (section: TodoSection) => {',
    insertTaskHandler + '\n  const handleDeleteSection = async (section: TodoSection) => {'
  );
}

// 4. Add trash icon to task row
const taskRowFind = `<DatePicker value={task.dueDate || null} onChange={(val) => updateTaskField(task.id, 'dueDate', val)} />
                      </div>
                    </SortableTaskRow>`;

const taskRowReplace = `<DatePicker value={task.dueDate || null} onChange={(val) => updateTaskField(task.id, 'dueDate', val)} />
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} className="hidden group-hover/task:flex text-dark-text/30 hover:text-red-400 p-0.5 rounded transition-colors" title="Deletar tarefa"><Trash2 size={12} /></button>
                      </div>
                    </SortableTaskRow>`;

if (content.includes(taskRowFind)) {
  content = content.replace(taskRowFind, taskRowReplace);
} else {
  console.log("Could not find task row block!");
}

fs.writeFileSync('src/pages/TodoPage.tsx', content);
console.log('Patched TodoPage.tsx with delete handlers');
