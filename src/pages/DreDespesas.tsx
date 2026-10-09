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
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Despesas por categoria</h2>
          <p className="text-[11px] text-slate-500">
            Onde o dinheiro está indo · clique para descer até os lançamentos · <span className="text-amber-500">meses em destaque</span> = calculado pelo GrapeHub
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Grupo em foco — barra segmentada com 40px, a altura dos outros controles */}
          <div className="h-10 flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5">
            {GRUPOS.map(([g, rotulo]) => (
              <button key={g} onClick={() => setGrupo(g)}
                className={`h-full px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  grupo === g ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
                {rotulo}
              </button>
            ))}
          </div>
          {/* Ano — um controle só, com as setas dentro */}
          <div className="h-10 flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
            <button onClick={() => setYear(y => y - 1)} title="Ano anterior" className="w-9 h-full flex items-center justify-center rounded-l-xl text-slate-400 hover:text-violet-500 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-bold text-slate-900 dark:text-white w-12 text-center tabular-nums">{year}</span>
            <button onClick={() => setYear(y => y + 1)} title="Próximo ano" className="w-9 h-full flex items-center justify-center rounded-r-xl text-slate-400 hover:text-violet-500 transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {loading ? <div className="py-20 text-center text-sm text-slate-500">Carregando…</div>
        : !data ? <div className="py-20 text-center text-sm text-slate-500">Não foi possível carregar o DFC.</div>
        : meses.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-dark-card/60 py-20 text-center text-sm text-slate-500">Nenhum lançamento em {year}.</div>
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
