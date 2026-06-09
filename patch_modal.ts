import fs from 'fs';

let content = fs.readFileSync('src/components/TaskDetailModal.tsx', 'utf-8');

// 1. Add DatePicker import
if (!content.includes('import { DatePicker }')) {
  content = content.replace(
    `import { motion, AnimatePresence } from 'motion/react';`,
    `import { motion, AnimatePresence } from 'motion/react';\nimport { DatePicker } from './ui/DatePicker';`
  );
}

// 2. Replace Header
const headerFind = `<div className="p-6 border-b modal-divider flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={\`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 \${status.color}\`}>
                {status.icon} {status.label}
              </div>
              <h2 className="text-lg font-bold modal-title truncate">{task.title}</h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <span className={\`text-xs font-bold px-2.5 py-1 rounded-lg border \${priorityStyle}\`}>
                {task.priority || 'Média'}
              </span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>`;

const headerReplace = `<div className="p-6 border-b modal-divider flex items-start justify-between shrink-0">
            <div className="flex flex-col gap-3 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={task.status}
                  onChange={(e) => onTaskUpdate(task.id, 'status', e.target.value)}
                  className={\`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer outline-none \${status.color}\`}
                  title="Alterar status"
                >
                  <option value="pending" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Pendente</option>
                  <option value="completed" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Concluída</option>
                  <option value="gargalo" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Gargalo</option>
                </select>

                <select
                  value={task.priority || 'Média'}
                  onChange={(e) => onTaskUpdate(task.id, 'priority', e.target.value)}
                  className={\`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer outline-none \${priorityStyle}\`}
                  title="Alterar prioridade"
                >
                  <option value="Baixa" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Baixa</option>
                  <option value="Média" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Média</option>
                  <option value="Alta" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Alta</option>
                  <option value="Urgente" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Urgente</option>
                </select>

                <div className="scale-90 origin-left flex items-center -ml-1">
                  <DatePicker value={task.dueDate || null} onChange={(val) => onTaskUpdate(task.id, 'dueDate', val)} />
                </div>
              </div>
              <h2 className="text-xl font-bold modal-title">{task.title}</h2>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>`;

if (content.includes(headerFind)) {
  content = content.replace(headerFind, headerReplace);
} else {
  console.log("Could not find header block!");
}

// 3. Remove Grid
const gridFindRegex = /\{\/\* Meta Info \*\/\}\s*<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">[\s\S]*?\{\/\* Description \*\/\}/m;

if (gridFindRegex.test(content)) {
  content = content.replace(gridFindRegex, '{/* Description */}');
} else {
  console.log("Could not find grid block!");
}

fs.writeFileSync('src/components/TaskDetailModal.tsx', content);
console.log('Patched TaskDetailModal.tsx');
