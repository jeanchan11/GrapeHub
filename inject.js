const fs = require('fs');
const target = 'src/pages/OnboardingOperacional.tsx';
const scratch = '/Users/convidado/.gemini/antigravity/brain/6b27e102-50a7-47f6-9774-564b3343d51f/scratch/SubtaskModal.tsx';
let targetContent = fs.readFileSync(target, 'utf8');
const scratchContent = fs.readFileSync(scratch, 'utf8');

// The scratch content has some imports we don't need (already in main file or we can add them).
// We need FileText, Link as LinkIcon, Plus, Save.
// Let's add them to the import list.
targetContent = targetContent.replace(
  "import { Plus, X, Settings, ChevronRight, Loader2, CheckCircle2, ChevronDown, Trash2, MoreHorizontal } from 'lucide-react';",
  "import { Plus, X, Settings, ChevronRight, Loader2, CheckCircle2, ChevronDown, Trash2, MoreHorizontal, FileText, Link as LinkIcon, Save } from 'lucide-react';"
);

// Inject SubtaskDetailModal and DocEditorModal
// The scratch file has imports at the top, we should remove them.
const componentsContent = scratchContent.split('// Assume interfaces')[1];

const insertionPoint = '// ── Main Component ────────────────────────────────────────';
targetContent = targetContent.replace(insertionPoint, componentsContent + '\n\n' + insertionPoint);

// Update OnboardingOperacional to have detailSubtask state
targetContent = targetContent.replace(
  '  const [detailTask, setDetailTask] = useState<OnboardingTask | null>(null);',
  '  const [detailTask, setDetailTask] = useState<OnboardingTask | null>(null);\n  const [detailSubtask, setDetailSubtask] = useState<{subtask: Subtask, task: OnboardingTask} | null>(null);'
);

// Add the modal render at the end of the return statement
const mainReturnEnd = '{detailTask && (\n        <DetailModal\n          task={detailTask}';
targetContent = targetContent.replace(
  mainReturnEnd,
  '{detailSubtask && (\n        <SubtaskDetailModal\n          subtask={detailSubtask.subtask}\n          task={detailSubtask.task}\n          onClose={() => setDetailSubtask(null)}\n          onUpdate={fetchTasks}\n        />\n      )}\n\n      ' + mainReturnEnd
);

// Also GroupBlock needs to pass onOpenSubtask
// Let's check where it is called
targetContent = targetContent.replace(
  'onAddTask={setAddingToGroup}',
  'onAddTask={setAddingToGroup}\n              onOpenSubtask={(s, t) => setDetailSubtask({subtask: s, task: t})}'
);

fs.writeFileSync(target, targetContent);
console.log('Injection completed successfully.');
