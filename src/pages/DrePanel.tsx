import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ChevronLeft, ChevronRight, FileBarChart, Columns3, Check, Eye, Repeat, Percent, Wallet, AlertTriangle, Target, Users } from 'lucide-react';
import ThemedDropdown from '@/src/components/ui/ThemedDropdown';

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

// Cor do ícone por acento. `rose` é o estado de alerta: o card inteiro fica rosado
// (padrão aprovado no Fluxo de Caixa, visual refeito em 09/10/2026).
const ACCENTS: Record<string, string> = { emerald: '#10b981', rose: '#f43f5e', amber: '#f59e0b', violet: '#7c3aed' };
const KpiCard = ({ label, value, sub, accent = 'violet', icone: Icone }: { label: string; value: string; sub: string; accent?: string; icone: any }) => {
  const cor = ACCENTS[accent] || ACCENTS.violet;
  const alerta = accent === 'rose';
  return (
    <div className={`px-5 py-4 rounded-2xl border min-w-0 ${alerta ? 'bg-rose-500/[0.06] border-rose-500/20' : 'bg-white dark:bg-dark-card/60 border-slate-200 dark:border-white/5'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cor}1a`, color: cor }}><Icone size={14} /></div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{label}</p>
      </div>
      <p className={`text-2xl font-bold tabular-nums truncate ${alerta ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>{value}</p>
      <p className={`text-[11px] mt-0.5 leading-snug ${alerta ? 'text-rose-400' : 'text-slate-500'}`}>{sub}</p>
    </div>
  );
};

// Fundo opaco para a coluna fixa (sticky). Não usar `dark:bg-dark-card` aqui: o
// index.html aplica `position: relative` nessa classe no tema escuro, o que solta
// a coluna fixa. A variável CSS é a mesma do token, então a cor acompanha os 3 temas.
const BG_FIXO = 'bg-white dark:bg-[rgb(var(--dark-card))]';

const DrePanel: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [apresentacao, setApresentacao] = useState<Apresentacao>('detalhado');
  const [data, setData] = useState<DreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hiddenMonths, setHiddenMonths] = useState<Set<string>>(new Set());
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<any>(null);

  // Fecha o menu de colunas ao clicar fora
  useEffect(() => {
    if (!colMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setColMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [colMenuOpen]);

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

  // ── Colunas (meses) visíveis ──
  const monthLabel = (m: string) => MESES[months.indexOf(m)] || m;
  const toggleMonth = (m: string) => setHiddenMonths(prev => { const n = new Set(prev); n.has(m) ? n.delete(m) : n.add(m); return n; });
  const showAllMonths = () => setHiddenMonths(new Set());
  const visibleCount = months.filter(m => !hiddenMonths.has(m)).length;

  // Nível máximo visível por apresentação.
  // "Agrupado" usa o mesmo limite do detalhado: o que define o que aparece é o
  // estado recolhido (abaixo), assim os grupos mantêm a seta e podem ser abertos.
  const maxLevel = apresentacao === 'detalhado' || apresentacao === 'agrupado' ? 99 : apresentacao === 'totalizadores' ? 1 : 0;
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

  // Estado inicial da árvore ao trocar de apresentação:
  // "Agrupado" abre com os grupos recolhidos (mostrando até o nível 2) e
  // "Detalhado" abre com tudo expandido. A partir daí o usuário controla pelas setas.
  useEffect(() => {
    if (apresentacao === 'agrupado') {
      setCollapsed(new Set(
        dreRows
          .filter(r => r.level >= 2 && dreRows.some(x => x.structure.startsWith(r.structure + '.')))
          .map(r => r.structure)
      ));
    } else if (apresentacao === 'detalhado') {
      setCollapsed(new Set());
    }
  }, [apresentacao, dreRows]);

  // ── Oculta linhas/categorias sem nada lançado no ano (todos os meses zerados) ──
  const rowHasValue = (r: DreRow) => r.total !== 0 || months.some(m => (r.values[m] || 0) !== 0);
  const branchHasValue = (s: string) => dreRows.some(r => (r.structure === s || r.structure.startsWith(s + '.')) && rowHasValue(r));

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
    <tr key={key} className={`border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors ${opts.cls || ''}`}>
      <td className={`sticky left-0 z-10 ${BG_FIXO} px-3 py-2.5 text-xs whitespace-nowrap border-r border-slate-100 dark:border-white/5`} style={opts.level ? indent(opts.level) : { paddingLeft: '0.75rem' }}>
        <div className={`flex items-center gap-1.5 ${opts.onToggle ? 'cursor-pointer hover:text-violet-500 transition-colors select-none' : ''}`} onClick={opts.onToggle}>
          {opts.isCategory && (
            <span className="w-3 shrink-0 flex items-center justify-center text-slate-500">
              {opts.collapsible && <ChevronRight size={12} className={`transition-transform ${!opts.isCollapsed ? 'rotate-90' : ''}`} />}
            </span>
          )}
          <span>{label}</span>
        </div>
      </td>
      {months.map(m => {
        if (hiddenMonths.has(m)) return null;
        const v = values[m] ?? 0;
        return <td key={m} className={`px-3 py-2.5 text-xs text-right tabular-nums whitespace-nowrap ${valCls(v)} ${!histSet.has(m) ? 'bg-amber-500/[0.04]' : ''}`}>{fmt(v)}</td>;
      })}
      <td className={`px-3 py-2.5 text-xs text-right tabular-nums font-bold whitespace-nowrap border-l border-slate-100 dark:border-white/5 ${opts.total != null ? valCls(opts.total) : 'text-slate-400'}`}>
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
        if (!branchHasValue(r.structure)) continue; // some nada lançado no ano
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 mb-6">
          <KpiCard icone={Repeat} label="MRR" value={brl(ind.mrr)} sub={`${ind.subs_count} assinaturas · ticket ${brl(ind.ticket_medio)}`} accent="emerald" />
          <KpiCard icone={Percent} label="Margem operacional" value={pct(ind.margem_operacional)} sub={`líquida ${pct(ind.margem_liquida)}`} accent={ind.margem_operacional >= 0 ? 'emerald' : 'rose'} />
          <KpiCard icone={Wallet} label="Caixa & Runway" value={brl(ind.caixa)} sub={ind.runway_meses != null ? `runway ${ind.runway_meses.toFixed(1).replace('.', ',')} meses` : 'fluxo positivo'} accent={ind.runway_meses != null && ind.runway_meses < 6 ? 'rose' : 'violet'} />
          <KpiCard icone={AlertTriangle} label="Inadimplência" value={brl(ind.inadimplencia_valor)} sub={`${pct(ind.inadimplencia_pct)} da receita · ${ind.inadimplencia_clientes} clientes`} accent="amber" />
          <KpiCard icone={Target} label="LTV / CAC" value={brl(ind.ltv)} sub={`CAC ${brl(ind.cac)}${ind.payback_meses ? ` · payback ${ind.payback_meses.toFixed(1).replace('.', ',')}m` : ''}`} accent="violet" />
          <KpiCard icone={Users} label="Clientes ativos" value={String(ind.clientes_ativos)} sub={`novos no mês: ${ind.novos_clientes}`} accent="violet" />
        </div>
      )}
    <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-dark-card overflow-hidden mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#7c3aed1a', color: '#7c3aed' }}>
            <FileBarChart size={14} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">DRE / Fluxo de Caixa</h2>
            <p className="text-[11px] text-slate-500">
              Meses sem destaque = <span className="text-amber-500 font-semibold">calculado pelo GrapeHub</span> · meses normais = histórico importado
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Colunas (meses) visíveis */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Colunas</label>
            <div className="relative" ref={colMenuRef}>
              <button
                onClick={() => setColMenuOpen(o => !o)}
                className={`h-10 flex items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${hiddenMonths.size > 0 ? 'border-violet-500/40 text-violet-600 dark:text-violet-400 bg-violet-500/10' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:border-violet-500/40'}`}
              >
                <Columns3 size={14} />
                <span>Meses{hiddenMonths.size > 0 ? ` (${visibleCount}/${months.length})` : ''}</span>
              </button>
              {colMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-30 w-52 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[rgb(var(--dark-card))] shadow-xl shadow-black/20 p-1.5">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Exibir meses</span>
                    {hiddenMonths.size > 0 && (
                      <button onClick={showAllMonths} className="flex items-center gap-1 text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-500">
                        <Eye size={11} /> Todos
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {months.map(m => {
                      const on = !hiddenMonths.has(m);
                      return (
                        <button
                          key={m}
                          onClick={() => toggleMonth(m)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition-colors"
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'bg-violet-500 border-violet-500' : 'border-slate-300 dark:border-slate-500/50'}`}>
                            {on && <Check size={11} className="text-white" strokeWidth={3} />}
                          </span>
                          <span className={on ? '' : 'text-slate-500'}>{monthLabel(m)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Apresentação */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Apresentação</label>
            <ThemedDropdown value={apresentacao} options={[...APRESENTACOES].reverse().map(a => ({ value: String(a.key), label: a.label }))} onChange={(v) => setApresentacao(v as Apresentacao)} className="w-auto" buttonClassName="h-10" />
          </div>
          {/* Ano — um controle só, com as setas dentro */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ano</label>
            <div className="h-10 flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
              <button onClick={() => setYear(y => y - 1)} title="Ano anterior" className="w-9 h-full flex items-center justify-center rounded-l-xl text-slate-400 hover:text-violet-500"><ChevronLeft size={15} /></button>
              <span className="text-sm font-bold text-slate-900 dark:text-white w-12 text-center tabular-nums">{year}</span>
              <button onClick={() => setYear(y => y + 1)} title="Próximo ano" className="w-9 h-full flex items-center justify-center rounded-r-xl text-slate-400 hover:text-violet-500"><ChevronRight size={15} /></button>
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
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th className={`sticky left-0 z-10 ${BG_FIXO} px-3 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-100 dark:border-white/5`}>Categoria</th>
                {months.map((m, i) => (
                  hiddenMonths.has(m) ? null : (
                    <th key={m} className={`px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest ${histSet.has(m) ? 'text-slate-500' : 'text-amber-500 bg-amber-500/[0.04]'}`}>{MESES[i]}</th>
                  )
                ))}
                <th className="px-3 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest border-l border-slate-100 dark:border-white/5">Total</th>
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
