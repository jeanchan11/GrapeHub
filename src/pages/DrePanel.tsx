import React, { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight, FileBarChart } from 'lucide-react';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const fmt = (v: number | null | undefined) => {
  if (v == null || v === 0) return '—';
  const s = Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `-${s}` : s;
};

interface DreRow { structure: string; description: string; level: number; values: Record<string, number>; total: number; }
interface SpecialRow { description: string; values: Record<string, number>; total?: number | null; }
interface DreData {
  year: string; months: string[]; historicalMonths: string[];
  saldoInicial: SpecialRow; rows: DreRow[]; semCategoria: SpecialRow & { total: number }; geracao: SpecialRow; saldoFinal: SpecialRow;
}

type Apresentacao = 'detalhado' | 'agrupado' | 'totalizadores' | 'simplificado';
const APRESENTACOES: { key: Apresentacao; label: string }[] = [
  { key: 'simplificado', label: 'Simplificado' },
  { key: 'totalizadores', label: 'Totalizadores' },
  { key: 'agrupado', label: 'Agrupado' },
  { key: 'detalhado', label: 'Detalhado' },
];

const ACCENTS: Record<string, string> = { emerald: 'text-emerald-500', rose: 'text-rose-500', amber: 'text-amber-500', violet: 'text-violet-400' };
const KpiCard = ({ label, value, sub, accent = 'violet' }: { label: string; value: string; sub: string; accent?: string }) => (
  <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-xl p-4">
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
    <p className={`text-lg font-black ${ACCENTS[accent] || ACCENTS.violet}`}>{value}</p>
    <p className="text-[10px] text-slate-500 mt-1 leading-tight">{sub}</p>
  </div>
);

const DrePanel: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [apresentacao, setApresentacao] = useState<Apresentacao>('detalhado');
  const [data, setData] = useState<DreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [ind, setInd] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/financeiro/dre?year=${year}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year]);

  useEffect(() => {
    fetch('/api/financeiro/indicadores').then(r => r.ok ? r.json() : null).then(setInd).catch(() => {});
  }, []);

  const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const pct = (v: number) => `${((v || 0) * 100).toFixed(1).replace('.', ',')}%`;

  const months = data?.months || [];
  const histSet = new Set(data?.historicalMonths || []);
  const dreRows = data?.rows || [];

  // Nível máximo visível por apresentação
  const maxLevel = apresentacao === 'detalhado' ? 99 : apresentacao === 'agrupado' ? 2 : apresentacao === 'totalizadores' ? 1 : 0;
  const treeMode = apresentacao === 'detalhado' || apresentacao === 'agrupado';

  // ── Árvore recolhível (só nos modos com hierarquia) ──
  const hasChildren = (s: string) => treeMode && dreRows.some(r => r.structure.startsWith(s + '.') && r.structure.split('.').length <= maxLevel);
  const isHidden = (s: string) => {
    if (!treeMode) return false;
    const parts = s.split('.');
    for (let i = 1; i < parts.length; i++) if (collapsed.has(parts.slice(0, i).join('.'))) return true;
    return false;
  };
  const toggle = (s: string) => setCollapsed(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

  // ── Totalizadores calculados ──
  const sumRows = (rows: DreRow[], extra?: SpecialRow) => {
    const values: Record<string, number> = {}; let total = 0;
    for (const m of months) {
      let v = rows.reduce((s, r) => s + (r.values[m] || 0), 0);
      if (extra) v += (extra.values[m] || 0);
      values[m] = v; total += v;
    }
    return { values, total };
  };
  const lvl1 = dreRows.filter(r => r.level === 1);
  const isReceita = (d: string) => /receita/i.test(d);
  const isOperacional = (d: string) => /operacionai/i.test(d) && !/n[ãa]o/i.test(d);
  const geracaoOperacional = sumRows(lvl1.filter(r => isOperacional(r.description)));
  const receitasTotal = sumRows(lvl1.filter(r => isReceita(r.description)));
  const despesasTotal = sumRows(lvl1.filter(r => !isReceita(r.description)), data?.semCategoria); // inclui sem categoria

  const valCls = (v: number) => v < 0 ? 'text-rose-500' : v > 0 ? 'text-emerald-500' : 'text-slate-500';
  const rowCls = (level: number) => {
    if (level === 1) return 'bg-violet-500/[0.07] dark:bg-violet-500/10 font-bold text-dark-text';
    if (level === 2) return 'font-semibold text-dark-text';
    return 'text-slate-500 dark:text-slate-400';
  };
  const indent = (level: number) => ({ paddingLeft: `${0.75 + (level - 1) * 1.1}rem` });

  const Row = (key: string, label: string, values: Record<string, number>, opts: { cls?: string; level?: number; total?: number | null; isCategory?: boolean; collapsible?: boolean; isCollapsed?: boolean; onToggle?: () => void } = {}) => (
    <tr key={key} className={`border-b border-black/5 dark:border-white/5 ${opts.cls || ''}`}>
      <td className="sticky left-0 z-10 bg-dark-card px-3 py-2 text-xs whitespace-nowrap" style={opts.level ? indent(opts.level) : { paddingLeft: '0.75rem' }}>
        <div className={`flex items-center gap-1.5 ${opts.onToggle ? 'cursor-pointer hover:text-violet-400 transition-colors select-none' : ''}`} onClick={opts.onToggle}>
          {opts.isCategory && (
            <span className="w-3 shrink-0 flex items-center justify-center text-slate-500">
              {opts.collapsible && <ChevronRight size={12} className={`transition-transform ${!opts.isCollapsed ? 'rotate-90' : ''}`} />}
            </span>
          )}
          <span>{label}</span>
        </div>
      </td>
      {months.map(m => {
        const v = values[m] ?? 0;
        return <td key={m} className={`px-3 py-2 text-xs text-right tabular-nums whitespace-nowrap ${valCls(v)} ${!histSet.has(m) ? 'bg-amber-500/[0.04]' : ''}`}>{fmt(v)}</td>;
      })}
      <td className={`px-3 py-2 text-xs text-right tabular-nums font-bold whitespace-nowrap ${opts.total != null ? valCls(opts.total) : 'text-slate-400'}`}>
        {opts.total != null ? fmt(opts.total) : ''}
      </td>
    </tr>
  );

  const CLS_TOTALIZER = 'bg-violet-500/10 font-black text-dark-text border-t-2 border-violet-500/20';
  const CLS_SALDO = 'bg-slate-500/[0.06] font-bold text-dark-text';

  // Monta as linhas do corpo conforme a apresentação
  const buildBody = () => {
    if (!data) return null;
    const body: React.ReactNode[] = [];
    body.push(Row('si', data.saldoInicial.description, data.saldoInicial.values, { cls: 'bg-slate-500/[0.06] text-slate-400 font-semibold' }));

    if (apresentacao === 'simplificado') {
      body.push(Row('rec', 'Receitas', receitasTotal.values, { cls: 'bg-emerald-500/[0.08] font-bold text-dark-text', total: receitasTotal.total }));
      body.push(Row('desp', 'Despesas', despesasTotal.values, { cls: 'bg-rose-500/[0.08] font-bold text-dark-text', total: despesasTotal.total }));
    } else {
      let insertedOp = false;
      for (const r of data.rows) {
        if (r.level > maxLevel) continue;
        if (!insertedOp && r.level === 1 && !isOperacional(r.description)) {
          body.push(Row('gop', 'Geração de Caixa Operacional', geracaoOperacional.values, { cls: CLS_TOTALIZER, total: geracaoOperacional.total }));
          insertedOp = true;
        }
        if (isHidden(r.structure)) continue;
        const kids = hasChildren(r.structure);
        body.push(Row(r.structure, r.description, r.values, {
          cls: rowCls(r.level), level: r.level, total: r.total,
          isCategory: true, collapsible: kids, isCollapsed: collapsed.has(r.structure),
          onToggle: kids ? () => toggle(r.structure) : undefined,
        }));
      }
      if (!insertedOp) body.push(Row('gop', 'Geração de Caixa Operacional', geracaoOperacional.values, { cls: CLS_TOTALIZER, total: geracaoOperacional.total }));
      // Sem categoria (só nas visões com detalhe)
      if (data.semCategoria.total !== 0) body.push(Row('semcat', data.semCategoria.description, data.semCategoria.values, { cls: 'text-amber-500 font-semibold', total: data.semCategoria.total }));
    }

    body.push(Row('gper', data.geracao.description, data.geracao.values, { cls: CLS_TOTALIZER }));
    body.push(Row('sf', data.saldoFinal.description, data.saldoFinal.values, { cls: CLS_SALDO }));
    return body;
  };

  return (
    <>
      {ind && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <KpiCard label="MRR" value={brl(ind.mrr)} sub={`${ind.subs_count} assinaturas · ticket ${brl(ind.ticket_medio)}`} accent="emerald" />
          <KpiCard label="Margem operacional" value={pct(ind.margem_operacional)} sub={`líquida ${pct(ind.margem_liquida)}`} accent={ind.margem_operacional >= 0 ? 'emerald' : 'rose'} />
          <KpiCard label="Caixa & Runway" value={brl(ind.caixa)} sub={ind.runway_meses != null ? `runway ${ind.runway_meses.toFixed(1).replace('.', ',')} meses` : 'fluxo positivo'} accent={ind.runway_meses != null && ind.runway_meses < 6 ? 'rose' : 'violet'} />
          <KpiCard label="Inadimplência" value={brl(ind.inadimplencia_valor)} sub={`${pct(ind.inadimplencia_pct)} da receita · ${ind.inadimplencia_clientes} clientes`} accent="amber" />
          <KpiCard label="LTV / CAC" value={brl(ind.ltv)} sub={`CAC ${brl(ind.cac)}${ind.payback_meses ? ` · payback ${ind.payback_meses.toFixed(1).replace('.', ',')}m` : ''}`} accent="violet" />
          <KpiCard label="Clientes ativos" value={String(ind.clientes_ativos)} sub={`novos no mês: ${ind.novos_clientes}`} accent="violet" />
        </div>
      )}
    <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <FileBarChart size={16} className="text-violet-500" />
          <div>
            <h2 className="text-sm font-bold text-dark-text">DRE / Fluxo de Caixa</h2>
            <p className="text-[10px] text-slate-500">
              Meses sem destaque = <span className="text-amber-500 font-semibold">calculado pelo GrapeHub</span> · meses normais = histórico importado
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Apresentação */}
          <div className="flex flex-col">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Apresentação</label>
            <select
              value={apresentacao}
              onChange={e => setApresentacao(e.target.value as Apresentacao)}
              className="bg-dark-bg border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-dark-text focus:outline-none focus:border-violet-500/50 cursor-pointer dark:[color-scheme:dark]"
            >
              {[...APRESENTACOES].reverse().map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </div>
          {/* Ano */}
          <div className="flex flex-col">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ano</label>
            <div className="flex items-center gap-1">
              <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400"><ChevronLeft size={15} /></button>
              <span className="text-xs font-bold text-dark-text w-12 text-center">{year}</span>
              <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400"><ChevronRight size={15} /></button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-violet-500" /></div>
      ) : !data || data.rows.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-500">Sem dados de DRE para {year}.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-dark-bg/40 border-b border-black/10 dark:border-white/10">
                <th className="sticky left-0 z-10 bg-dark-card px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categoria</th>
                {months.map((m, i) => (
                  <th key={m} className={`px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-widest ${histSet.has(m) ? 'text-slate-500' : 'text-amber-500'}`}>{MESES[i]}</th>
                ))}
                <th className="px-3 py-2.5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</th>
              </tr>
            </thead>
            <tbody>{buildBody()}</tbody>
          </table>
        </div>
      )}
    </div>
    </>
  );
};

export default DrePanel;
