import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, Clock, CalendarDays, BarChart2, CreditCard, ChevronDown, RefreshCw, CheckCircle2, ExternalLink } from 'lucide-react';
import SplitHeadline from '../components/SplitHeadline';
import { motion, useSpring, useTransform, useInView } from 'motion/react';

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
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes('T') || s.includes('Z')) return s.slice(0, 10);
  return s;
};

const fmtDate = (d: any) => {
  const nd = normDate(d);
  if (!nd) return '—';
  const date = new Date(nd + 'T12:00:00');
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

// ── CountUp Animation Component ───────────────────────────────────
const CountUp = ({ value, isCurrency = false, suffix = '' }: { value: number; isCurrency?: boolean; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const springValue = useSpring(0, { duration: 1200, bounce: 0 });
  const display = useTransform(springValue, (v: number) => {
    if (isCurrency) return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return Math.round(v).toLocaleString('pt-BR') + suffix;
  });

  useEffect(() => {
    if (isInView) springValue.set(value);
  }, [isInView, value, springValue]);

  return <motion.span ref={ref}>{display}</motion.span>;
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

  // ── Tab color ──
  const tabColor = activeTab === 'sicredi' ? 'emerald' : 'violet';

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-2">
        <div>
          <SplitHeadline text="Contas a " highlight="Pagar" className="text-2xl font-black tracking-tight text-dark-text" />
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
            Referência: {monthLabel}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={prevMonth}
            className="w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:border-violet-500/60 flex items-center justify-center transition-all hover:bg-dark-card-hover">
            <ChevronDown size={14} className="text-slate-400 rotate-90" />
          </button>
          <div className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-violet-500/60 rounded-xl">
            <CalendarDays size={16} className="text-violet-500" />
            <span className="text-sm font-bold text-dark-text">{monthLabel}</span>
          </div>
          <button onClick={nextMonth}
            className="w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:border-violet-500/60 flex items-center justify-center transition-all hover:bg-dark-card-hover">
            <ChevronDown size={14} className="text-slate-400 -rotate-90" />
          </button>
          <button
            onClick={() => fetchData(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-dark-card-hover bg-dark-card border border-white/10 ml-1"
          >
            <RefreshCw size={14} className={`text-slate-400 ${spinning ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="px-6 md:px-8 mb-4 flex items-center gap-1 border-b border-white/5">
        <button
          onClick={() => setActiveTab('contas')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'contas' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Contas a Pagar
        </button>
        <button
          onClick={() => setActiveTab('sicredi')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'sicredi' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Sicredi
        </button>
      </div>

      <div className="px-6 md:px-8 pb-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {activeTab === 'contas' ? (
                <>
                  {/* 1) Vence em 7 dias */}
                  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[160px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-rose-600"><AlertTriangle size={20} className="text-white" /></div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Vence em 7 dias</p>
                    </div>
                    <div className="flex flex-col mt-auto">
                      <h3 className="text-3xl font-black tracking-tight mb-3 text-red-500/80 dark:text-red-400/80">
                        <CountUp value={summary.vence_7_dias} isCurrency />
                      </h3>
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Urgentes</span>
                          <span className="font-semibold text-rose-500">a vencer</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2) Total Previsto */}
                  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[160px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-violet-600"><Clock size={20} className="text-white" /></div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total Previsto</p>
                    </div>
                    <div className="flex flex-col mt-auto">
                      <h3 className="text-3xl font-black tracking-tight mb-3 text-dark-text">
                        <CountUp value={summary.total_previsto} isCurrency />
                      </h3>
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Provisões</span>
                          <span className="font-semibold text-violet-500">{summary.total_items} contas</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3) Este Mês */}
                  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[160px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-amber-500"><CalendarDays size={20} className="text-white" /></div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Este Mês</p>
                    </div>
                    <div className="flex flex-col mt-auto">
                      <h3 className="text-3xl font-black tracking-tight mb-3 text-dark-text">
                        <CountUp value={summary.total_mes_atual} isCurrency />
                      </h3>
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Mês atual</span>
                          <span className="font-semibold text-amber-500">{monthLabel}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4) Categorias */}
                  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[160px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-blue-600"><BarChart2 size={20} className="text-white" /></div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Categorias</p>
                    </div>
                    <div className="flex flex-col mt-auto">
                      <h3 className="text-3xl font-black tracking-tight mb-3 text-dark-text">
                        <CountUp value={distinctCategories} />
                      </h3>
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Maior</span>
                          <span className="font-semibold text-blue-500 truncate max-w-[140px]">{topCategory?.category_l2_desc || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Sicredi: Total da Fatura */}
                  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[160px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-emerald-600"><CreditCard size={20} className="text-white" /></div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total da Fatura</p>
                    </div>
                    <div className="flex flex-col mt-auto">
                      <h3 className="text-3xl font-black tracking-tight mb-3 text-dark-text">
                        <CountUp value={totalAllMonths} isCurrency />
                      </h3>
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Cartão Sicredi</span>
                          <span className="font-semibold text-emerald-500">fatura total</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lançamentos */}
                  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[160px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-emerald-600"><BarChart2 size={20} className="text-white" /></div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Lançamentos</p>
                    </div>
                    <div className="flex flex-col mt-auto">
                      <h3 className="text-3xl font-black tracking-tight mb-3 text-dark-text">
                        <CountUp value={totalCount} />
                      </h3>
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Total</span>
                          <span className="font-semibold text-emerald-500">{totalCount} itens</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Categorizados */}
                  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[160px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-amber-500"><CalendarDays size={20} className="text-white" /></div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Categorizados</p>
                    </div>
                    <div className="flex flex-col mt-auto">
                      <h3 className="text-3xl font-black tracking-tight mb-3 text-dark-text">
                        <CountUp value={sicrediCategorized} suffix={`/${totalCount}`} />
                      </h3>
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Progresso</span>
                          {totalCount > 0 && sicrediCategorized === totalCount ? (
                            <span className="font-semibold text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12} /> 100%</span>
                          ) : (
                            <span className="font-semibold text-amber-500">{totalCount > 0 ? Math.round((sicrediCategorized / totalCount) * 100) : 0}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Maior Gasto */}
                  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[160px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-rose-600"><AlertTriangle size={20} className="text-white" /></div>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Maior Gasto</p>
                    </div>
                    <div className="flex flex-col mt-auto">
                      <h3 className="text-3xl font-black tracking-tight mb-3 text-red-500/80 dark:text-red-400/80">
                        {biggestItem ? <CountUp value={parseFloat(biggestItem.value)} isCurrency /> : '—'}
                      </h3>
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500 truncate max-w-[160px]">{biggestItem?.description || '—'}</span>
                          <span className="font-semibold text-rose-500">maior</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Table grouped by month ── */}
            {sortedMonthKeys.length === 0 ? (
              <div className="bg-dark-card border border-white/10 rounded-2xl p-12 text-center">
                <CreditCard size={32} className="mx-auto mb-3 text-slate-500" />
                <p className="text-sm font-medium text-slate-400">Nenhuma provisão encontrada para este período.</p>
              </div>
            ) : (
              <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
                {sortedMonthKeys.map((monthKey, groupIdx) => {
                  const group = itemsByMonth[monthKey];
                  return (
                    <div key={monthKey}>
                      {/* Month header */}
                      <div className={`flex items-center justify-between px-4 py-3 bg-dark-bg/50 ${groupIdx > 0 ? 'border-t border-white/10' : ''} border-b border-white/5`}>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {group.label}
                        </span>
                        <span className={`text-xs font-black ${activeTab === 'sicredi' ? 'text-emerald-400' : 'text-violet-400'}`}>
                          {fmtBRL(group.total)}
                        </span>
                      </div>

                      {/* Items table */}
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-dark-bg/50 border-b border-gray-100 dark:border-white/5">
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Descrição</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Fornecedor</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Categoria</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Vencimento</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest text-right">Valor</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {group.items.map((item, idx) => {
                            const dueStatus = getDueDateStatus(item.due_date);
                            const supplierDisplay = item.supplier_fantasy_name || item.supplier_name || '—';
                            const val = parseFloat(item.value) || 0;

                            return (
                              <motion.tr
                                key={item.id}
                                className="hover:bg-white/[0.02] transition-colors"
                                initial={{ opacity: 0, y: -18, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{
                                  duration: 0.35,
                                  delay: idx * 0.06,
                                  ease: [0.32, 0.72, 0, 1],
                                }}
                              >
                                {/* Descrição */}
                                <td className="px-4 py-3">
                                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[300px]">{item.description}</p>
                                  {item.comment && <p className="text-xs text-slate-500 truncate max-w-[280px]">{item.comment}</p>}
                                </td>

                                {/* Fornecedor */}
                                <td className="px-4 py-3">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{supplierDisplay}</p>
                                  {item.supplier_cnpjcpf && (
                                    <p className="text-[10px] text-slate-500 truncate max-w-[160px]">{item.supplier_cnpjcpf}</p>
                                  )}
                                </td>

                                {/* Categoria */}
                                <td className="px-4 py-3">
                                  {item.category_l3_desc ? (
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md border border-gray-200 dark:border-white/5 truncate inline-block max-w-[180px]">
                                      {item.category_l3_desc}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-600">—</span>
                                  )}
                                </td>

                                {/* Vencimento */}
                                <td className="px-4 py-3">
                                  <span className="text-xs text-slate-400">{fmtDate(item.due_date)}</span>
                                </td>

                                {/* Valor */}
                                <td className="px-4 py-3 text-right">
                                  <span className="text-sm font-bold text-rose-400">-{fmtBRL(val)}</span>
                                </td>

                                {/* Status */}
                                <td className="px-4 py-3 text-right">
                                  {dueStatus === 'overdue' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full">
                                      <AlertTriangle size={10} /> Atrasado
                                    </span>
                                  ) : dueStatus === 'today' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full">
                                      <Clock size={10} /> Hoje
                                    </span>
                                  ) : dueStatus === 'soon' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
                                      <Clock size={10} /> Em breve
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-white/5 px-2 py-1 rounded-full">
                                      <Clock size={10} /> Pendente
                                    </span>
                                  )}
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
