import React from 'react';
import MinhaEquipeTab from './collaborator_tabs/MinhaEquipeTab';

export default function MinhaEquipePage() {
  return (
    <div className="min-h-full bg-light-bg dark:bg-dark-bg text-slate-900 dark:text-slate-100 font-sans p-8 overflow-y-auto w-full">
      <MinhaEquipeTab />
    </div>
  );
}
