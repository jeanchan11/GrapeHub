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
          <BotaoSincronizar onDone={() => setVersaoSync(v => v + 1)} className="h-10 rounded-xl" />
        </PageHeader>

        {/* Abas — barra segmentada (visual refeito em 09/10/2026, mesmas abas e contador) */}
        <div className="flex items-center gap-1 p-1 w-fit max-w-full overflow-x-auto rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5">
          {([['dre', 'DFC'], ['dashboard', 'Dashboard'], ['despesas', 'Despesas'], ['fechamento', 'Fechamento']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`h-9 px-4 rounded-lg text-sm font-semibold whitespace-nowrap inline-flex items-center transition-colors ${activeTab === key ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
            >
              {label}
              {key === 'despesas' && alertas > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold tabular-nums"
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
