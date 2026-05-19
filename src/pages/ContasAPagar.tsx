import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Clock, CalendarDays, BarChart2, CreditCard, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';

// ── Types ──────────────────────────────────────────────────────────
interface PayableItem {
  id: number;
  description: string;
  value: string;
  original_value: string;
  balance_value: string;
  status: string;
  due_date: string;
  payment_date: string | null;
  supplier_name: string | null;
  supplier_fantasy_name: string | null;
  supplier_cnpjcpf: string | null;
  category_l2_desc: string | null;
  category_l3_desc: string | null;
  account_name: string | null;
  document_code: string | null;
  payment_method: string | null;
  comment: string | null;
}

interface MonthGroup {
  label: string;
  total: number;
  items: PayableItem[];
}

interface Summary {
  vence_7_dias: number;
  total_previsto: number;
  total_mes_atual: number;
  total_items: number;
}

interface CategoryRow {
  category_l2_desc: string | null;
  count: number;
  total: string;
}

// ── Helpers ────────────────────────────────────────────────────────
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Normalize date from various formats (Date object, ISO string, etc.) to YYYY-MM-DD
const normDate = (d: any): string => {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  const s = String(d);
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // ISO string — take first 10 chars
  if (s.includes('T') || s.includes('Z')) return s.slice(0, 10);
  return s;
};

const fmtDate = (d: any) => {
  const nd = normDate(d);
  if (!nd) return '—';
  const date = new Date(nd + 'T12:00:00');
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

type DueDateStatus = 'overdue' | 'today' | 'soon' | 'normal';
const getDueDateStatus = (dueDate: any): DueDateStatus => {
  const nd = normDate(dueDate);
  if (!nd) return 'normal';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nd + 'T12:00:00');
  due.setHours(0, 0, 0, 0);
  if (isNaN(due.getTime())) return 'normal';
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'soon';
  return 'normal';
};

const DUE_STYLES: Record<DueDateStatus, string> = {
  overdue: 'text-rose-400 font-bold',
  today: 'text-rose-400 font-bold',
  soon: 'text-amber-400 font-semibold',
  normal: 'text-[#7c7a9a]',
};

// ── Main Component ─────────────────────────────────────────────────
export default function ContasAPagar() {
  const [activeTab, setActiveTab] = useState<'contas' | 'sicredi'>('contas');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [summary, setSummary] = useState<Summary>({ vence_7_dias: 0, total_previsto: 0, total_mes_atual: 0, total_items: 0 });
  const [itemsByMonth, setItemsByMonth] = useState<Record<string, MonthGroup>>({});
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  // Month selector state
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Navigation between selected months
  const parsedMonth = selectedMonth || currentMonthKey;
  const [selY, selM] = parsedMonth.split('-').map(Number);
  const monthLabel = selectedMonth ? `${MESES_FULL[selM - 1]} ${selY}` : 'Todos os Meses';

  function prevMonth() {
    let m = selM - 1, y = selY;
    if (m < 1) { m = 12; y--; }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  }
  function nextMonth() {
    let m = selM + 1, y = selY;
    if (m > 12) { m = 1; y++; }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  }

  // ── Fetch data ──
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setSpinning(true);
    try {
      const monthParam = selectedMonth ? `&month=${selectedMonth}` : '';
      const [payRes, catRes] = await Promise.all([
        fetch(`/api/fin-payables?tab=${activeTab}${monthParam}`),
        fetch(`/api/fin-payables/categories?tab=${activeTab}${monthParam}`),
      ]);

      if (payRes.ok) {
        const data = await payRes.json();
        setSummary(data.summary);
        setItemsByMonth(data.items_by_month);
      }
      if (catRes.ok) {
        setCategories(await catRes.json());
      }
    } catch (err) {
      console.error('Error fetching payables:', err);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab, selectedMonth]);

  // ── Derived data ──
  const sortedMonthKeys = useMemo(() =>
    Object.keys(itemsByMonth).sort(),
  [itemsByMonth]);

  const totalAllMonths = useMemo(() =>
    Object.values(itemsByMonth).reduce((s, g) => s + g.total, 0),
  [itemsByMonth]);

  const totalCount = useMemo(() =>
    Object.values(itemsByMonth).reduce((s, g) => s + g.items.length, 0),
  [itemsByMonth]);

  // Sicredi-specific KPI calculations
  const sicrediCategorized = useMemo(() => {
    if (activeTab !== 'sicredi') return 0;
    return Object.values(itemsByMonth)
      .flatMap(g => g.items)
      .filter(i => i.category_l3_desc).length;
  }, [itemsByMonth, activeTab]);

  const biggestItem = useMemo(() => {
    const all = Object.values(itemsByMonth).flatMap(g => g.items);
    if (all.length === 0) return null;
    return all.reduce((max, i) => parseFloat(i.value) > parseFloat(max.value) ? i : max, all[0]);
  }, [itemsByMonth]);

  const distinctCategories = useMemo(() => categories.length, [categories]);
  const topCategory = useMemo(() => categories.length > 0 ? categories[0] : null, [categories]);

  // ── Tab colors ──
  const tabColor = activeTab === 'sicredi' ? '#22c55e' : '#7C3AED';

  // ── Loading spinner ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0a0a0f' }}>
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: `${tabColor}30`, borderTopColor: tabColor }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg p-8 font-sans text-dark-text transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────────────── */}
        <PageHeader 
          title="Contas a" 
          titleAccent="Pagar" 
          subtitle="Provisões pendentes · Marvee Sync"
        >
          <div className="flex items-center gap-3">
            {/* Month selector */}
            <div className="flex items-center gap-1 rounded-xl px-1 py-1 bg-dark-card border border-white/10">
              <button onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5">
                <ChevronLeft size={14} className="text-slate-400" />
              </button>
              <button
                onClick={() => setSelectedMonth(selectedMonth ? null : currentMonthKey)}
                className="px-3 py-1 text-xs font-bold min-w-[120px] text-center transition-colors text-dark-text"
              >
                {monthLabel}
              </button>
              <button onClick={nextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5">
                <ChevronRight size={14} className="text-slate-400" />
              </button>
            </div>
            <button
              onClick={() => fetchData(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5 bg-dark-card border border-white/10"
            >
              <RefreshCw size={14} className={`text-slate-400 ${spinning ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </PageHeader>

        {/* ── Tabs ────────────────────────────────────────────── */}
        <div className="flex items-center gap-6 mb-6 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveTab('contas')}
            className={`flex items-center gap-2 pb-4 -mb-[17px] border-b-2 font-bold text-sm transition-colors ${
              activeTab === 'contas' 
                ? 'border-violet-500 text-violet-400' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Contas a Pagar
          </button>
          <button
            onClick={() => setActiveTab('sicredi')}
            className={`flex items-center gap-2 pb-4 -mb-[17px] border-b-2 font-bold text-sm transition-colors ${
              activeTab === 'sicredi' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Sicredi
          </button>
        </div>

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {activeTab === 'contas' ? (
          <>
            {/* Vence em 7 dias */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10">
                  <AlertTriangle size={16} className="text-red-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Vence em 7 dias</span>
              </div>
              <p className="text-3xl font-black tracking-tight text-red-500/80 mt-auto pt-2" style={{ fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
                {fmtBRL(summary.vence_7_dias)}
              </p>
            </div>

            {/* Total previsto */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10">
                  <Clock size={16} className="text-violet-400" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Previsto</span>
              </div>
              <p className="text-3xl font-black tracking-tight text-dark-text mt-auto pt-2" style={{ fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
                {fmtBRL(summary.total_previsto)}
              </p>
              <p className="text-[10px] mt-1 text-slate-500">{summary.total_items} provisões</p>
            </div>

            {/* Este mês */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10">
                  <CalendarDays size={16} className="text-violet-400" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Este Mês</span>
              </div>
              <p className="text-3xl font-black tracking-tight text-dark-text mt-auto pt-2" style={{ fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
                {fmtBRL(summary.total_mes_atual)}
              </p>
            </div>

            {/* Por categoria */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/10">
                  <BarChart2 size={16} className="text-violet-400" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Categorias</span>
              </div>
              <p className="text-3xl font-black tracking-tight text-dark-text mt-auto pt-2">{distinctCategories}</p>
              {topCategory && (
                <p className="text-[10px] mt-1 truncate text-slate-500">
                  Maior: {topCategory.category_l2_desc || 'Sem categoria'}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Sicredi: Total da fatura */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
                  <CreditCard size={16} className="text-emerald-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total da Fatura</span>
              </div>
              <p className="text-3xl font-black tracking-tight text-dark-text mt-auto pt-2" style={{ fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
                {fmtBRL(totalAllMonths)}
              </p>
            </div>

            {/* Lançamentos */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
                  <BarChart2 size={16} className="text-emerald-400" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lançamentos</span>
              </div>
              <p className="text-3xl font-black tracking-tight text-dark-text mt-auto pt-2">{totalCount}</p>
            </div>

            {/* Categorizados */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
                  <CalendarDays size={16} className="text-emerald-400" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Categorizados</span>
              </div>
              <div className="flex items-center gap-2 mt-auto pt-2">
                <p className="text-3xl font-black tracking-tight text-dark-text">
                  {sicrediCategorized}/{totalCount}
                </p>
                {totalCount > 0 && sicrediCategorized === totalCount && (
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-full" style={{ background: '#22c55e22', color: '#4ade80' }}>100%</span>
                )}
              </div>
            </div>

            {/* Maior gasto */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10">
                  <AlertTriangle size={16} className="text-red-500" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Maior Gasto</span>
              </div>
              {biggestItem ? (
                <>
                  <p className="text-3xl font-black tracking-tight text-red-500/80 mt-auto pt-2" style={{ fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
                    {fmtBRL(parseFloat(biggestItem.value))}
                  </p>
                  <p className="text-[10px] mt-1 truncate text-slate-500">{biggestItem.description}</p>
                </>
              ) : (
                <p className="text-sm" style={{ color: '#5c5a7a' }}>—</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Table grouped by month ──────────────────────────── */}
      {sortedMonthKeys.length === 0 ? (
        <div className="bg-dark-card border border-white/10 rounded-2xl p-12 text-center">
          <CreditCard size={32} className="mx-auto mb-3 text-slate-500" />
          <p className="text-sm font-medium text-slate-400">Nenhuma provisão encontrada para este período.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedMonthKeys.map(monthKey => {
            const group = itemsByMonth[monthKey];
            return (
              <div key={monthKey}>
                {/* Month header */}
                <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl bg-dark-bg border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {group.label}
                  </span>
                  <span className="text-xs font-black" style={{ color: tabColor, fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
                    {fmtBRL(group.total)}
                  </span>
                </div>

                {/* Items table */}
                <div className="overflow-x-auto rounded-b-2xl bg-dark-card border border-white/10 border-t-0">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Vencimento</th>
                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Descrição</th>
                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Fornecedor</th>
                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Categoria</th>
                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                        <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((item) => {
                        const dueStatus = getDueDateStatus(item.due_date);
                        const supplierDisplay = item.supplier_fantasy_name || item.supplier_name || '—';
                        const val = parseFloat(item.value) || 0;

                        return (
                          <tr
                            key={item.id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            {/* Vencimento */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs whitespace-nowrap ${DUE_STYLES[dueStatus]}`}>
                                  {fmtDate(item.due_date)}
                                </span>
                                {dueStatus === 'overdue' && (
                                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-red-500/10 text-red-500">ATRASADO</span>
                                )}
                                {dueStatus === 'today' && (
                                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-red-500/10 text-red-500">HOJE</span>
                                )}
                              </div>
                            </td>

                            {/* Descrição */}
                            <td className="px-6 py-4">
                              <span className="text-xs font-medium truncate block max-w-[300px] text-dark-text">
                                {item.description}
                              </span>
                            </td>

                            {/* Fornecedor */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-medium truncate max-w-[180px] text-dark-text">{supplierDisplay}</span>
                                {item.supplier_cnpjcpf && (
                                  <span className="text-[10px] truncate max-w-[160px] text-slate-500">{item.supplier_cnpjcpf}</span>
                                )}
                              </div>
                            </td>

                            {/* Categoria */}
                            <td className="px-6 py-4">
                              {item.category_l3_desc ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium truncate max-w-[180px] bg-dark-bg border border-white/10 text-slate-400">
                                  {item.category_l3_desc}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-600">—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-orange-500/10 text-orange-500">
                                {item.status}
                              </span>
                            </td>

                            {/* Valor */}
                            <td className="px-6 py-4 text-right">
                              <span className="text-xs font-bold whitespace-nowrap text-red-500" style={{ fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
                                -{fmtBRL(val)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
