import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Download, TrendingUp, TrendingDown, Minus, SlidersHorizontal, Eye, EyeOff, X, Loader2 } from 'lucide-react';

interface DetailItem {
  id: number;
  date: string;
  description: string;
  value: number;
  type: number;
  transaction_type: string;
}

// ── Types ──────────────────────────────────────────────
interface DRERow {
  code: string;
  name: string;
  level: number;
  values: number[];   // [0..11] Jan..Dec
  total: number;
  type: string;
  isGroup: boolean;
}

interface DRESummary {
  monthly_receitas: number[];
  monthly_despesas: number[];
  monthly_distribuicao: number[];
  monthly_geracao_caixa: number[];
  monthly_saldo_final: number[];
  total_receitas: number;
  total_despesas: number;
  geracao_caixa: number;
  distribuicao_lucros: number;
  saldo_final: number;
}

// ── Helpers ────────────────────────────────────────────
const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const ALL_COLUMNS = [0,1,2,3,4,5,6,7,8,9,10,11]; // month indices

const fmtCur = (v: number) => {
  if (v === 0) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const fmtCell = (v: number, type: string) => {
  if (v === 0) return <span className="text-dark-text/20 text-xs">—</span>;
  const prefix = type === 'despesa' ? '-' : '';
  const color = type === 'despesa' ? 'text-rose-400' : 'text-emerald-400';
  return <span className={`${color} text-[13px]`}>{prefix}{fmtCur(v)}</span>;
};

const fmtCellBold = (v: number, type: string) => {
  if (v === 0) return <span className="text-dark-text/20 font-bold text-xs">—</span>;
  const prefix = type === 'despesa' ? '-' : '';
  const color = type === 'despesa' ? 'text-rose-400' : 'text-emerald-400';
  return <span className={`${color} font-bold text-[13px]`}>{prefix}{fmtCur(v)}</span>;
};

// ── Main Component ───────────────────────────────────
export default function DRE() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DRERow[]>([]);
  const [summary, setSummary] = useState<DRESummary | null>(null);
  const [expandedL2, setExpandedL2] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Set<number>>(new Set(ALL_COLUMNS));
  const [showColFilter, setShowColFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // L3 detail modal state
  const [detailModal, setDetailModal] = useState<{
    code: string;
    name: string;
    month: number;
    type: string;
  } | null>(null);
  const [detailItems, setDetailItems] = useState<DetailItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTotal, setDetailTotal] = useState(0);

  const openDetail = async (code: string, name: string, month: number, type: string) => {
    // For legacy months (Jan-Mar 2026), show info message
    const isLegacy = year === 2026 && month < 3;
    setDetailModal({ code, name, month, type });
    setDetailItems([]);
    setDetailTotal(0);
    if (isLegacy) {
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/financeiro/dre/detalhes?category=${code}&month=${month + 1}&year=${year}`);
      const data = await res.json();
      setDetailItems(data.items || []);
      setDetailTotal(data.total || 0);
    } catch (err) {
      console.error('Error loading details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Close popup on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowColFilter(false);
      }
    };
    if (showColFilter) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showColFilter]);

  const toggleCol = (mi: number) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(mi)) { if (next.size > 1) next.delete(mi); } // keep at least 1
      else next.add(mi);
      return next;
    });
  };

  const showAllCols = () => setVisibleCols(new Set(ALL_COLUMNS));
  const allVisible = visibleCols.size === 12;

  useEffect(() => {
    const fetchDRE = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/financeiro/dre?year=${year}`);
        if (!res.ok) throw new Error('Falha ao carregar');
        const data = await res.json();
        setRows(data.rows);
        setSummary(data.summary);
      } catch (err) {
        console.error('Error fetching DRE:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDRE();
  }, [year]);

  const toggleL2 = (code: string) => {
    setExpandedL2(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // Build renderable rows
  const renderRows = () => {
    const elements: JSX.Element[] = [];
    let i = 0;

    while (i < rows.length) {
      const row = rows[i];

      if (row.level === 1) {
        const isDespesa = row.type === 'despesa';
        const l1Bg = isDespesa ? 'bg-rose-500/[0.06]' : 'bg-emerald-500/[0.06]';
        const l1Border = isDespesa ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-emerald-500';
        const l1Text = isDespesa ? 'text-rose-400' : 'text-emerald-400';
        elements.push(
          <tr key={row.code} className={`${l1Bg} ${l1Border} border-t border-dark-text/10`}>
            <td className={`px-4 py-4 font-bold ${l1Text} text-sm whitespace-nowrap sticky left-0 ${l1Bg} z-10`}>
              <span className="opacity-50 font-mono text-[11px] mr-2">{row.code}</span>
              {row.name}
            </td>
            {row.values.map((v, mi) => (
              visibleCols.has(mi) && (
                <td key={mi} className="px-3 py-4 text-right whitespace-nowrap">
                  {fmtCellBold(v, row.type)}
                </td>
              )
            ))}
            <td className={`px-4 py-4 text-right whitespace-nowrap font-black ${l1Bg}`}>
              {fmtCellBold(row.total, row.type)}
            </td>
          </tr>
        );
        i++;
        continue;
      }

      if (row.level === 2) {
        const hasChildren = row.isGroup;
        const isExpanded = expandedL2.has(row.code);
        elements.push(
          <tr
            key={row.code}
            className={`border-b border-dark-text/[0.06] transition-colors ${hasChildren ? 'cursor-pointer hover:bg-dark-text/[0.03]' : ''}`}
            onClick={() => hasChildren && toggleL2(row.code)}
          >
            <td className="px-4 py-3 pl-8 whitespace-nowrap sticky left-0 bg-dark-card z-10">
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <ChevronDown size={12} className={`text-dark-text/40 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                )}
                {!hasChildren && <span className="w-3" />}
                <span className="text-violet-400/50 font-mono text-[10px]">{row.code}</span>
                <span className="text-[13px] font-medium text-dark-text/90 truncate max-w-[220px]">{row.name}</span>
              </div>
            </td>
            {row.values.map((v, mi) => (
              visibleCols.has(mi) && (
                <td key={mi} className="px-3 py-3 text-right whitespace-nowrap">
                  {fmtCell(v, row.type)}
                </td>
              )
            ))}
            <td className="px-4 py-3 text-right whitespace-nowrap font-bold bg-dark-text/[0.02]">
              {fmtCellBold(row.total, row.type)}
            </td>
          </tr>
        );
        if (isExpanded) {
          i++;
          while (i < rows.length && rows[i].level === 3) {
            const l3 = rows[i];
            elements.push(
              <tr key={l3.code} className="border-b border-dark-text/[0.04] bg-dark-text/[0.015] cursor-pointer hover:bg-violet-500/[0.04] transition-colors">
                <td className="px-4 py-2.5 pl-14 whitespace-nowrap sticky left-0 bg-dark-card z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-dark-text/20 shrink-0" />
                    <span className="text-dark-text/40 font-mono text-[10px]">{l3.code}</span>
                    <span className="text-[12px] text-dark-text/70 truncate max-w-[200px]">{l3.name}</span>
                  </div>
                </td>
                {l3.values.map((v, mi) => (
                  visibleCols.has(mi) && (
                    <td key={mi} className="px-3 py-2.5 text-right whitespace-nowrap"
                        onClick={() => v > 0 && openDetail(l3.code, l3.name, mi, l3.type)}>
                      {v === 0
                        ? <span className="text-dark-text/15 text-xs">—</span>
                        : <span className={`text-[12px] cursor-pointer hover:underline decoration-dotted ${l3.type === 'despesa' ? 'text-rose-400/70' : 'text-emerald-400/70'}`}>
                            {l3.type === 'despesa' ? '-' : ''}{fmtCur(v)}
                          </span>
                      }
                    </td>
                  )
                ))}
                <td className="px-4 py-2.5 text-right whitespace-nowrap bg-dark-text/[0.02]">
                  {l3.total === 0
                    ? <span className="text-dark-text/15 text-xs">—</span>
                    : <span className={`text-[12px] font-semibold ${l3.type === 'despesa' ? 'text-rose-400/80' : 'text-emerald-400/80'}`}>
                        {l3.type === 'despesa' ? '-' : ''}{fmtCur(l3.total)}
                      </span>
                  }
                </td>
              </tr>
            );
            i++;
          }
          continue;
        }
        i++;
        while (i < rows.length && rows[i].level === 3) i++;
        continue;
      }

      i++;
    }

    return elements;
  };

  const SummaryRow = ({ label, monthlyValues, total, variant }: {
    label: string; monthlyValues: number[]; total: number; variant: 'geracao' | 'saldo';
  }) => {
    const isGeracao = variant === 'geracao';
    const bg = isGeracao ? 'bg-violet-500/10' : 'bg-emerald-500/[0.08]';
    const border = isGeracao ? 'border-l-4 border-l-violet-500' : 'border-l-4 border-l-emerald-500';
    const labelColor = isGeracao ? 'text-violet-400' : 'text-emerald-400';
    return (
      <tr className={`${bg} ${border} border-t-2 border-dark-text/10`}>
        <td className={`px-4 py-4 font-bold text-sm ${labelColor} whitespace-nowrap sticky left-0 z-10 ${bg}`}>
          {label}
        </td>
        {monthlyValues.map((v, mi) => (
          visibleCols.has(mi) && (
            <td key={mi} className="px-3 py-4 text-right whitespace-nowrap">
              {v === 0
                ? <span className="text-dark-text/20 text-xs">—</span>
                : <span className={`text-[13px] font-bold ${v >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtCur(v)}</span>
              }
            </td>
          )
        ))}
        <td className={`px-4 py-4 text-right whitespace-nowrap ${bg}`}>
          <span className={`text-sm font-black ${total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtCur(total)}</span>
        </td>
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dark-text">
            Fluxo de <span className="text-violet-500">Caixa</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
            Demonstração do fluxo de caixa · {year}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Export */}
          <button className="flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-white/10 hover:border-violet-500/40 rounded-xl transition-all hover:bg-dark-card-hover group">
            <Download size={14} className="text-violet-400" />
            <span className="text-xs font-bold text-dark-text/70 group-hover:text-dark-text">Exportar</span>
          </button>

          {/* Year picker */}
          <div className="flex items-center gap-1">
            <button onClick={() => setYear(y => y - 1)}
              className="w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:border-violet-500/60 flex items-center justify-center transition-all hover:bg-dark-card-hover">
              <ChevronLeft size={14} className="text-slate-400" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-violet-500/60 rounded-xl">
              <Calendar size={16} className="text-violet-500" />
              <span className="text-sm font-bold text-dark-text">{year}</span>
            </div>
            <button onClick={() => setYear(y => y + 1)}
              className="w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:border-violet-500/60 flex items-center justify-center transition-all hover:bg-dark-card-hover">
              <ChevronRight size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 pb-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-dark-card border border-white/10 rounded-2xl p-5 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Receitas</p>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                      <TrendingUp size={16} className="text-emerald-500" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-emerald-500">{fmtCur(summary.total_receitas)}</p>
                </div>
                <div className="bg-dark-card border border-white/10 rounded-2xl p-5 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Despesas</p>
                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center">
                      <TrendingDown size={16} className="text-rose-500" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-rose-500">{fmtCur(summary.total_despesas)}</p>
                </div>
                <div className="bg-dark-card border border-white/10 rounded-2xl p-5 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Geração de Caixa</p>
                    <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
                      <Minus size={16} className="text-violet-500" />
                    </div>
                  </div>
                  <p className={`text-xl font-black ${summary.geracao_caixa >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {fmtCur(summary.geracao_caixa)}
                  </p>
                </div>
                <div className="bg-dark-card border border-white/10 rounded-2xl p-5 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Distribuição</p>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
                      <TrendingDown size={16} className="text-amber-500" />
                    </div>
                  </div>
                  <p className="text-xl font-black text-amber-500">{fmtCur(summary.distribuicao_lucros)}</p>
                </div>
                <div className={`bg-dark-card border-2 rounded-2xl p-5 transition-colors duration-200 ${summary.saldo_final >= 0 ? 'border-emerald-500/30' : 'border-rose-500/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Saldo Final</p>
                  </div>
                  <p className={`text-xl font-black ${summary.saldo_final >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {fmtCur(summary.saldo_final)}
                  </p>
                </div>
              </div>
            )}

            {/* DFC Table */}
            <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
              {/* Column filter button */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-dark-text/10">
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setShowColFilter(v => !v)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold ${
                      showColFilter || !allVisible
                        ? 'bg-violet-500/15 border-violet-500/40 text-violet-500'
                        : 'bg-dark-bg border-dark-text/10 text-dark-text/50 hover:border-violet-500/30 hover:text-violet-500'
                    }`}
                  >
                    <SlidersHorizontal size={13} />
                    Colunas
                    {!allVisible && (
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-violet-500 text-white text-[9px] font-black">
                        {visibleCols.size}
                      </span>
                    )}
                  </button>

                  {/* Popup */}
                  {showColFilter && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-dark-card backdrop-blur-xl border border-dark-text/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
                      <div className="px-4 pt-4 pb-2">
                        <p className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest">Localizar coluna</p>
                      </div>
                      <div className="px-2 pb-2 max-h-[360px] overflow-y-auto">
                        {MESES_FULL.map((nome, mi) => {
                          const active = visibleCols.has(mi);
                          return (
                            <button
                              key={mi}
                              onClick={() => toggleCol(mi)}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-dark-card-hover transition-colors"
                            >
                              <div className={`w-8 h-4 rounded-full relative transition-colors ${
                                active ? 'bg-violet-500' : 'bg-dark-text/20'
                              }`}>
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${
                                  active ? 'left-[18px]' : 'left-[2px]'
                                }`} />
                              </div>
                              <span className={`text-xs font-medium ${
                                active ? 'text-dark-text' : 'text-dark-text/40'
                              }`}>{nome}</span>
                              {active
                                ? <Eye size={12} className="text-violet-500 ml-auto" />
                                : <EyeOff size={12} className="text-dark-text/20 ml-auto" />
                              }
                            </button>
                          );
                        })}
                      </div>
                      <div className="px-3 pb-3 pt-1 border-t border-dark-text/5">
                        <button
                          onClick={showAllCols}
                          className={`w-full py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                            allVisible
                              ? 'bg-dark-text/5 text-dark-text/30 cursor-default'
                              : 'bg-violet-500/15 text-violet-500 hover:bg-violet-500/25'
                          }`}
                          disabled={allVisible}
                        >
                          Mostrar Todas
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-dark-text/10 bg-dark-text/[0.02]">
                      <th className="px-4 py-4 text-left text-xs font-bold text-violet-400 uppercase tracking-widest sticky left-0 bg-dark-card z-20 min-w-[280px]">
                        Categoria
                      </th>
                      {MESES_SHORT.map((m, mi) => (
                        visibleCols.has(mi) && (
                          <th key={mi} className="px-3 py-4 text-right text-xs font-bold text-dark-text/50 uppercase tracking-widest min-w-[110px]">
                            {m}
                          </th>
                        )
                      ))}
                      <th className="px-4 py-4 text-right text-xs font-bold text-violet-400 uppercase tracking-widest min-w-[130px] bg-violet-500/[0.05]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderRows()}

                    {/* Summary rows */}
                    {summary && (
                      <>
                        <SummaryRow
                          label="Geração de Caixa do Período"
                          monthlyValues={summary.monthly_geracao_caixa}
                          total={summary.geracao_caixa}
                          variant="geracao"
                        />
                        <SummaryRow
                          label="Saldo Final"
                          monthlyValues={summary.monthly_saldo_final}
                          total={summary.saldo_final}
                          variant="saldo"
                        />
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      {/* ── Detail Modal ── */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDetailModal(null)}>
          <div className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl w-[90%] max-w-[640px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <p className="text-[10px] font-bold text-violet-500 uppercase tracking-widest">
                  {detailModal.code} · {MESES_FULL[detailModal.month]} {year}
                </p>
                <h3 className="text-sm font-bold text-dark-text mt-0.5">{detailModal.name}</h3>
              </div>
              <button onClick={() => setDetailModal(null)} className="w-8 h-8 rounded-xl bg-dark-bg border border-white/10 flex items-center justify-center hover:border-rose-500/40 transition-all">
                <X size={14} className="text-dark-text/60" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="text-violet-500 animate-spin" />
                </div>
              ) : year === 2026 && detailModal.month < 3 ? (
                <div className="text-center py-12">
                  <p className="text-dark-text/40 text-sm">Dados do sistema legado</p>
                  <p className="text-dark-text/25 text-xs mt-1">Os lançamentos de Jan-Mar 2026 foram importados do sistema anterior e não possuem detalhamento individual.</p>
                </div>
              ) : detailItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-dark-text/40 text-sm">Nenhum lançamento encontrado</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-[9px] font-bold text-dark-text/40 uppercase tracking-wider py-2 pr-2">Data</th>
                      <th className="text-left text-[9px] font-bold text-dark-text/40 uppercase tracking-wider py-2">Descrição</th>
                      <th className="text-right text-[9px] font-bold text-dark-text/40 uppercase tracking-wider py-2 pl-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailItems.map((item) => (
                      <tr key={item.id} className="border-b border-white/[0.03] hover:bg-dark-card-hover transition-colors">
                        <td className="py-2 pr-2 text-[10px] text-dark-text/50 whitespace-nowrap">
                          {(() => {
                            const d = item.date ? new Date(item.date) : null;
                            if (!d || isNaN(d.getTime())) return '—';
                            return `${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`;
                          })()}
                        </td>
                        <td className="py-2 text-[10px] text-dark-text/70 truncate max-w-[320px]">{item.description}</td>
                        <td className={`py-2 pl-2 text-[10px] font-semibold text-right whitespace-nowrap ${detailModal.type === 'despesa' ? 'text-rose-500/70' : 'text-emerald-500/70'}`}>
                          {detailModal.type === 'despesa' ? '-' : ''}{fmtCur(item.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            {detailItems.length > 0 && (
              <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] text-dark-text/40">{detailItems.length} lançamento{detailItems.length !== 1 ? 's' : ''}</span>
                <span className={`text-xs font-bold ${detailModal.type === 'despesa' ? 'text-rose-500' : 'text-emerald-500'}`}>
                  Total: {detailModal.type === 'despesa' ? '-' : ''}{fmtCur(detailTotal)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
