import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DespesasPorCategoria from '../components/DespesasPorCategoria';
import AlertasCusto from '../components/AlertasCusto';

interface DreRow { structure: string; description: string; level: number; values: Record<string, number>; total: number; }
interface DreData { year: string; months: string[]; historicalMonths: string[]; rows: DreRow[]; }

/**
 * Aba "Despesas" do DRE: a rosca de despesas por categoria, com drill-down até os
 * lançamentos, numa tela só para ela. Lê o mesmo `/api/financeiro/dre` da aba
 * DRE / Fluxo de Caixa — os números são os da tabela.
 */
const GRUPOS: [string, string][] = [
  ['02', 'Operacionais'],
  ['04', 'Não operacionais'],
  ['05', 'Distribuição de lucros'],
];

const DreDespesas: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [grupo, setGrupo] = useState('02');
  const [data, setData] = useState<DreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/financeiro/dre?year=${year}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year]);

  // Meses do ano com algum movimento (corta o fim do ano ainda vazio).
  const meses = useMemo(() => {
    if (!data) return [];
    const lvl1 = data.rows.filter(r => /^[0-9]+$/.test(r.structure));
    const comMovimento = data.months.map(m => lvl1.some(r => Math.abs(r.values[m] || 0) > 0.005));
    const ultimo = comMovimento.lastIndexOf(true);
    return ultimo < 0 ? [] : data.months.slice(0, ultimo + 1);
  }, [data]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-dark-text">Despesas por categoria</h2>
          <p className="text-xs text-slate-500">
            Onde o dinheiro está indo · clique para descer até os lançamentos · <span className="text-amber-400">meses em destaque</span> = calculado pelo GrapeHub
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-dark-card border border-white/10 rounded-xl p-0.5">
            {GRUPOS.map(([g, rotulo]) => (
              <button key={g} onClick={() => setGrupo(g)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  grupo === g ? 'bg-violet-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                {rotulo}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-dark-card border border-white/10 rounded-xl px-1 py-0.5">
            <button onClick={() => setYear(y => y - 1)} className="p-1.5 text-slate-400 hover:text-violet-400 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-bold text-dark-text px-1 tabular-nums">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="p-1.5 text-slate-400 hover:text-violet-400 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {loading ? <div className="py-20 text-center text-sm text-slate-500">Carregando…</div>
        : !data ? <div className="py-20 text-center text-sm text-slate-500">Não foi possível carregar o DFC.</div>
        : meses.length === 0 ? (
          <div className="bg-dark-card border border-white/10 rounded-2xl py-20 text-center text-sm text-slate-500">Nenhum lançamento em {year}.</div>
        ) : (
          <>
          {/* Alerta de custo subindo — do grupo em foco */}
          <AlertasCusto key={`al-${grupo}-${year}`} rows={data.rows} meses={meses} grupos={[grupo]} />
          {/* key: trocar grupo ou ano recomeça do primeiro nível */}
          <DespesasPorCategoria key={`${grupo}-${year}`} rows={data.rows} meses={meses} historicos={data.historicalMonths} raiz={grupo} grande />
          </>
        )}
    </div>
  );
};

export default DreDespesas;
