import React, { useEffect, useState } from 'react';
import { calcularAlertasCusto } from '../lib/alertasCusto';
import { PageHeader } from '../components/ui/PageHeader';
import BotaoSincronizar from '../components/BotaoSincronizar';
import DrePanel from './DrePanel';
import DreDashboard from './DreDashboard';
import DreDespesas from './DreDespesas';
import DreFechamento from './DreFechamento';
import { Abas } from '../components/ui/Abas';
import { FileBarChart, LayoutDashboard, PieChart, Lock } from 'lucide-react';

// Página DFC (Demonstração do Fluxo de Caixa) — antes chamada "DRE". Renomeada em
// 26/09/2026: o relatório é regime de caixa (receita quando o dinheiro cai, cartão
// no mês em que a fatura é paga), então não responde "o mês deu lucro?", só "o
// caixa subiu?". Os ids internos (financeiro-dre, /api/financeiro/dre) ficaram.
export default function Dre({ pageLabel }: { pageLabel?: string } = {}) {
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
          title={(() => { const n = (pageLabel || 'DFC').trim(); const i = n.lastIndexOf(' '); return i > 0 ? n.slice(0, i) : ''; })()}
          titleAccent={(() => { const n = (pageLabel || 'DFC').trim(); const i = n.lastIndexOf(' '); return i > 0 ? n.slice(i + 1) : n; })()}
          subtitle="Demonstração do fluxo de caixa realizado — regime de caixa, não de competência"
        >
          <BotaoSincronizar onDone={() => setVersaoSync(v => v + 1)} className="h-10 rounded-xl" />
        </PageHeader>

        {/* Abas da página (padrão 18/11/2026: ui/Abas, sublinhado). Mesmas abas e contador. */}
        <Abas
          abas={[
            { id: 'dre', rotulo: 'DFC', Icone: FileBarChart },
            { id: 'dashboard', rotulo: 'Dashboard', Icone: LayoutDashboard },
            { id: 'despesas', rotulo: 'Despesas', Icone: PieChart, contador: alertas, alerta: true },
            { id: 'fechamento', rotulo: 'Fechamento', Icone: Lock },
          ]}
          ativa={activeTab}
          onChange={id => setActiveTab(id as typeof activeTab)}
        />

        {activeTab === 'dre' && <DrePanel key={`dre-${versaoSync}`} />}
        {activeTab === 'dashboard' && <DreDashboard key={`dash-${versaoSync}`} />}
        {activeTab === 'despesas' && <DreDespesas key={`desp-${versaoSync}`} />}
        {activeTab === 'fechamento' && <DreFechamento key={`fech-${versaoSync}`} />}
      </div>
    </div>
  );
}
