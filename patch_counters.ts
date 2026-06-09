import fs from 'fs';

let content = fs.readFileSync('src/pages/TodoPage.tsx', 'utf-8');

const countersFind = `  const totalOptimized = filteredByTab.filter(t => t.status === 'completed').length;
  const totalPending = filteredByTab.filter(t => t.status !== 'completed').length;`;

const countersReplace = `  let totalOptimized = 0;
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
  }`;

if (content.includes(countersFind)) {
  content = content.replace(countersFind, countersReplace);
  fs.writeFileSync('src/pages/TodoPage.tsx', content);
  console.log('Patched counters');
} else {
  console.log('Could not find counters block!');
}
