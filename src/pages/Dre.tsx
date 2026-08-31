import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import DrePanel from './DrePanel';
import DreDashboard from './DreDashboard';

// Página independente do Fluxo de Caixa — reúne a tabela do DRE e o dashboard.
export default function Dre() {
  const [activeTab, setActiveTab] = useState<'dre' | 'dashboard'>('dre');

  return (
    <div className="min-h-screen bg-dark-bg p-8 font-sans text-dark-text transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <PageHeader
          title="DRE /"
          titleAccent="Fluxo de Caixa"
          subtitle="Demonstrativo de resultados"
        />

        {/* Abas */}
        <div className="flex items-center gap-1 border-b border-white/10">
          {([['dre', 'DRE / Fluxo de Caixa'], ['dashboard', 'Dashboard']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${activeTab === key ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-dark-text'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'dre' && <DrePanel />}
        {activeTab === 'dashboard' && <DreDashboard />}
      </div>
    </div>
  );
}
