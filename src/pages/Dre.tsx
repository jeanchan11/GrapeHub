import React, { useEffect, useState } from 'react';
import { calcularAlertasCusto } from '../lib/alertasCusto';
import { PageHeader } from '../components/ui/PageHeader';
import BotaoSincronizar from '../components/BotaoSincronizar';
import DrePanel from './DrePanel';
import DreDashboard from './DreDashboard';
import DreDespesas from './DreDespesas';
import DreFechamento from './DreFechamento';

// Página DFC (Demonstração do Fluxo de Caixa) — antes chamada "DRE". Renomeada em
// 26/09/2026: o relatório é regime de caixa (receita quando o dinheiro cai, cartão
// no mês em que a fatura é paga), então não responde "o mês deu lucro?", só "o
// caixa subiu?". Os ids internos (financeiro-dre, /api/financeiro/dre) ficaram.
export default function Dre() {
  const [activeTab, setActiveTab] = useState<'dre' | 'dashboard' | 'despesas' | 'fechamento'>('dre');
  // Os painéis buscam os próprios dados no mount. Trocar a `key` depois do sync
  // os remonta, que é o jeito mais simples de recarregar sem levantar o estado
  // dos dois para cá.
  const [versaoSync, setVersaoSync] = useState(0);

  // Quantos custos subiram no último mês — vira um contador na aba Despesas,
  // para o alerta ser visto sem precisar abrir a aba.
  const [alertas, setAlertas] = useState(0);
  useEffect(() => {
    fetch(`/api/financeiro/dre?year=${new Date().getFullYear()}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return;
        const lvl1 = d.rows.filter((r: any) => /^[0-9]+$/.test(r.structure));
        const com = d.months.filter((m: string) => lvl1.some((r: any) => Math.abs(r.values[m] || 0) > 0.005));
        const meses = d.months.slice(0, d.months.indexOf(com[com.length - 1]) + 1);
        setAlertas(meses.length ? calcularAlertasCusto(d.rows, meses, meses[meses.length - 1]).alertas.length : 0);
      })
      .catch(() => {});
  }, [versaoSync]);

  return (
    <div className="min-h-screen bg-dark-bg p-8 font-sans text-dark-text transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <PageHeader
          title="DFC /"
          titleAccent="Fluxo de Caixa"
          subtitle="Demonstração do fluxo de caixa realizado — regime de caixa, não de competência"
        >
          <BotaoSincronizar onDone={() => setVersaoSync(v => v + 1)} />
        </PageHeader>

        {/* Abas */}
        <div className="flex items-center gap-1 border-b border-white/10">
          {([['dre', 'DFC'], ['dashboard', 'Dashboard'], ['despesas', 'Despesas'], ['fechamento', 'Fechamento']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${activeTab === key ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-dark-text'}`}
            >
              {label}
              {key === 'despesas' && alertas > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black align-middle"
                  title={`${alertas} custo(s) acima da média dos meses anteriores`}>{alertas}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'dre' && <DrePanel key={`dre-${versaoSync}`} />}
        {activeTab === 'dashboard' && <DreDashboard key={`dash-${versaoSync}`} />}
        {activeTab === 'despesas' && <DreDespesas key={`desp-${versaoSync}`} />}
        {activeTab === 'fechamento' && <DreFechamento key={`fech-${versaoSync}`} />}
      </div>
    </div>
  );
}
