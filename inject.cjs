const fs = require('fs');
const target = 'src/pages/OnboardingOperacional.tsx';
const scratch = '/Users/convidado/.gemini/antigravity/brain/6b27e102-50a7-47f6-9774-564b3343d51f/scratch/SubtaskModal.tsx';
let targetContent = fs.readFileSync(target, 'utf8');
const scratchContent = fs.readFileSync(scratch, 'utf8');

targetContent = targetContent.replace(
  "import { Plus, X, Settings, ChevronRight, Loader2, CheckCircle2, ChevronDown, Trash2, MoreHorizontal } from 'lucide-react';",
  "import { Plus, X, Settings, ChevronRight, Loader2, CheckCircle2, ChevronDown, Trash2, MoreHorizontal, FileText, Link as LinkIcon, Save } from 'lucide-react';"
);

const componentsContent = scratchContent.split('// Assume interfaces')[1];

const insertionPoint = '// ── Main Component ────────────────────────────────────────';
targetContent = targetContent.replace(insertionPoint, componentsContent + '\n\n' + insertionPoint);

targetContent = targetContent.replace(
  '  const [detailTask, setDetailTask] = useState<OnboardingTask | null>(null);',
  '  const [detailTask, setDetailTask] = useState<OnboardingTask | null>(null);\n  const [detailSubtask, setDetailSubtask] = useState<{subtask: Subtask, task: OnboardingTask} | null>(null);'
);

const mainReturnEnd = '{detailTask && (\\n        <DetailModal';
targetContent = targetContent.replace(
  '{detailTask && (\n        <DetailModal',
  '{detailSubtask && (\n        <SubtaskDetailModal\n          subtask={detailSubtask.subtask}\n          task={detailSubtask.task}\n          onClose={() => setDetailSubtask(null)}\n          onUpdate={fetchTasks}\n        />\n      )}\n\n      {detailTask && (\n        <DetailModal'
);

targetContent = targetContent.replace(
  'onAddTask={setAddingToGroup}',
  'onAddTask={setAddingToGroup}\n              onOpenSubtask={(s, t) => setDetailSubtask({subtask: s, task: t})}'
);

fs.writeFileSync(target, targetContent);
console.log('Injection completed successfully.');
