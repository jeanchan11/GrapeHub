import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface BillItem {
  id: number;
  doc_description: string;
  movement_value: string;
  original_value: string;
  payment_date: string | null;
  expiration_date: string | null;
  status: string;
  type_column: string;
  payment_method: string;
  document_code: string;
  grapehub_category: string | null;
  people_name: string | null;
  people_cnpjcpf: string | null;
  category_l1_desc: string | null;
  category_l2_desc: string | null;
  category_l3_desc: string | null;
}

interface Summary {
  total_previsto: number;
  ja_pago: number;
  total_mes: number;
  vence_hoje_amanha: number;
}

// ── Helpers ────────────────────────────────────────────
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return (num || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const CATEGORY_ICONS: Record<string, string> = {
  'Despesas Fixas': '🏠',
  'Despesas Variáveis': '📊',
  'Impostos': '📋',
  'Salários e Pessoal': '👥',
  'Fornecedores': '🏭',
  'Serviços': '🛠️',
  'Marketing e Vendas': '📣',
  'Despesas Financeiras': '💳',
  'Distribuição de Lucros': '💰',
  'Outros': '📁',
};

const getCategoryIcon = (cat: string | null) => {
  if (!cat) return '📁';
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '📁';
};

// ── CollapsibleGroup ─────────────────────────────────
const CollapsibleGroup = ({ category, items, total, icon }: {
  category: string;
  items: { description: string; date: string; person: string | null; value: number; status: string }[];
  total: number;
  icon: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mb-2 border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-dark-card hover:bg-dark-card-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-bold text-dark-text">{category}</span>
          <span className="text-[10px] text-slate-500 font-normal ml-2">{items.length} itens</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-dark-text">{formatCurrency(total)}</span>
          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>
      {isOpen && (
        <div className="bg-dark-bg p-2 space-y-1 border-t border-white/10">
          {items.map((item, idx) => {
            const isAtrasado = item.status === 'Atrasado';
            const isVenceHoje = item.status === 'Vence Hoje';
            const expDate = item.date;

            return (
              <div key={idx} className="flex items-center justify-between p-3 hover:bg-dark-card rounded-lg transition-colors">
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-dark-text truncate">{item.description}</span>
                    {isVenceHoje && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/15 text-amber-400 text-[9px] font-bold rounded-full shrink-0">
                        <AlertTriangle size={9} /> Vence Hoje
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={`text-[10px] ${isAtrasado ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}>{fmtDate(expDate)}</span>
                    {item.person && <span className="text-[10px] text-slate-500 truncate max-w-[180px]">{item.person}</span>}
                  </div>
                </div>
                <span className="text-xs font-bold text-dark-text ml-4 shrink-0">{formatCurrency(item.value)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────
export default function ContasAPagar() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>({ total_previsto: 0, ja_pago: 0, total_mes: 0, vence_hoje_amanha: 0 });
  const [items, setItems] = useState<BillItem[]>([]);

  const [selY, selM] = selectedMonth.split('-').map(Number);
  const monthLabel = `${MESES_FULL[selM - 1]} ${selY}`;

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/financeiro/contas-a-pagar?month=${selectedMonth}`);
        if (!res.ok) throw new Error('Falha ao carregar');
        const data = await res.json();
        setSummary(data.summary);
        setItems(data.items);
      } catch (err) {
        console.error('Error fetching contas a pagar:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth]);

  // Group items by category
  const groupByCategory = (filteredItems: BillItem[]) => {
    const grouped: Record<string, { name: string; icon: string; total: number; items: { description: string; date: string; person: string | null; value: number; status: string }[] }> = {};
    
    for (const item of filteredItems) {
      const catName = item.category_l1_desc || item.grapehub_category || 'Outros';
      if (!grouped[catName]) {
        grouped[catName] = { name: catName, icon: getCategoryIcon(catName), total: 0, items: [] };
      }
      const valor = Math.abs(parseFloat(item.movement_value || item.original_value || '0'));
      grouped[catName].total += valor;
      grouped[catName].items.push({
        description: item.doc_description,
        date: item.expiration_date || '',
        person: item.people_name,
        value: valor,
        status: item.status,
      });
    }

    return Object.values(grouped).sort((a, b) => b.total - a.total);
  };

  const pagas = items.filter(d => ['Conciliado', 'Quitado'].includes(d.status));
  const previstas = items.filter(d => ['Pendente', 'Atrasado', 'Vence Hoje'].includes(d.status));

  const pagasGrouped = groupByCategory(pagas);
  const previstasGrouped = groupByCategory(previstas);

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dark-text">
            Contas a <span className="text-violet-500">Pagar</span>
          </h1>
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
            <Calendar size={16} className="text-violet-500" />
            <span className="text-sm font-bold text-dark-text">{monthLabel}</span>
          </div>
          <button onClick={nextMonth}
            className="w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:border-violet-500/60 flex items-center justify-center transition-all hover:bg-dark-card-hover">
            <ChevronDown size={14} className="text-slate-400 -rotate-90" />
          </button>
        </div>
      </div>

      <div className="px-6 md:px-8 pb-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Previsto</p>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-2xl font-black text-dark-text">{formatCurrency(summary.total_previsto)}</h3>
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider">a pagar</span>
                </div>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Já Pago</p>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-2xl font-black text-dark-text">{formatCurrency(summary.ja_pago)}</h3>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">conciliado</span>
                </div>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total do Mês</p>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-2xl font-black text-dark-text">{formatCurrency(summary.total_mes)}</h3>
                  <span className="px-2 py-0.5 bg-dark-bg text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider border border-white/10">geral</span>
                </div>
              </div>
              <div className="bg-dark-card border-2 border-rose-500/30 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Vence Hoje/Amanhã</p>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-rose-500">{formatCurrency(summary.vence_hoje_amanha)}</h3>
                  <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">urgente</span>
                </div>
              </div>
            </div>

            {/* Panels — 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pagas */}
              <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">Despesas pagas</h2>
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Conciliado</span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[600px] p-4">
                  {pagasGrouped.length === 0 ? (
                    <p className="text-center py-12 text-slate-500">Nenhuma despesa paga encontrada.</p>
                  ) : (
                    pagasGrouped.map((cat, idx) => (
                      <CollapsibleGroup key={idx} category={cat.name} icon={cat.icon} total={cat.total} items={cat.items} />
                    ))
                  )}
                </div>
              </div>

              {/* Previstas */}
              <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">Despesas previstas</h2>
                  <span className="px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Pendente</span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[600px] p-4">
                  {previstasGrouped.length === 0 ? (
                    <p className="text-center py-12 text-slate-500">Nenhuma despesa prevista encontrada.</p>
                  ) : (
                    previstasGrouped.map((cat, idx) => (
                      <CollapsibleGroup key={idx} category={cat.name} icon={cat.icon} total={cat.total} items={cat.items} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
