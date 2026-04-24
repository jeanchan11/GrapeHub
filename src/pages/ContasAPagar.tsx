import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, ChevronRight, AlertTriangle } from 'lucide-react';

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
  category_structure?: string | null;
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
  'Despesas Financeiras': '💳',
  'Despesas Operacionais': '📋',
  'Distribuição de Lucros': '💰',
  'Antecipação Débito': '⚡',
  'Estorno': '🔄',
  'Transferência': '🏦',
  'Receitas Operacionais': '📈',
  'Receitas Não Operacionais': '📊',
  'Despesas Não Operacionais': '📉',
  'Salários e Pessoal': '👥',
  'Salários, Encargos e Pessoal': '👥',
  'Outros': '📁',
};

const getCategoryIcon = (cat: string | null) => {
  if (!cat) return '📁';
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (cat.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '📁';
};

// ── Sub-category item type ──────────────────────────
interface SubCatGroup {
  name: string;
  total: number;
  items: ItemRow[];
}

interface ItemRow {
  description: string;
  date: string;
  person: string | null;
  value: number;
  status: string;
  l3?: string | null;
}

// ── Level 3 item row ──────────────────────────────────
const ItemRowComponent = ({ item }: { item: ItemRow }) => {
  const isAtrasado = item.status === 'Atrasado';
  const isVenceHoje = item.status === 'Vence Hoje';

  return (
    <div className="flex items-center justify-between p-3 hover:bg-dark-card rounded-lg transition-colors">
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
          <span className={`text-[10px] ${isAtrasado ? 'text-rose-400 font-semibold' : 'text-slate-500'}`}>{fmtDate(item.date)}</span>
          {item.person && <span className="text-[10px] text-slate-500 truncate max-w-[180px]">{item.person}</span>}
          {item.l3 && (
            <span className="text-[9px] text-emerald-400/60 font-medium">
              {item.l3}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs font-bold text-dark-text ml-4 shrink-0">{formatCurrency(item.value)}</span>
    </div>
  );
};

// ── Collapsible Level 2 Sub-Group ────────────────────
const SubGroupCollapsible = ({ group }: { group: SubCatGroup }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="ml-4 mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
          <span className="text-[11px] font-semibold text-sky-400/80">{group.name}</span>
          <span className="text-[9px] text-slate-600 font-normal">{group.items.length} itens</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-dark-text/70">{formatCurrency(group.total)}</span>
          {isOpen ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
        </div>
      </button>
      {isOpen && (
        <div className="ml-3 pl-3 border-l-2 border-sky-500/10 space-y-0.5 pb-1">
          {group.items.map((item, idx) => (
            <ItemRowComponent key={idx} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Collapsible Level 1 Group ────────────────────────
const CollapsibleGroup = ({ category, directItems, subGroups, total, icon }: {
  category: string;
  directItems: ItemRow[];
  subGroups: SubCatGroup[];
  total: number;
  icon: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasSubGroups = subGroups.length > 0;
  const totalItems = directItems.length + subGroups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="mb-2 border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-dark-card hover:bg-dark-card-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-dark-text">{category}</span>
            {hasSubGroups && (
              <span className="px-1.5 py-0.5 bg-violet-500/10 text-violet-400 text-[8px] font-bold rounded-full uppercase tracking-wider">
                {subGroups.length} sub
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-normal">{totalItems} itens</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-dark-text">{formatCurrency(total)}</span>
          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>
      {isOpen && (
        <div className="bg-dark-bg border-t border-white/10">
          {/* Sub-groups (L2) */}
          {subGroups.length > 0 && (
            <div className="py-2">
              {subGroups.map((sg, idx) => (
                <SubGroupCollapsible key={idx} group={sg} />
              ))}
            </div>
          )}
          {/* Direct items (no L2) */}
          {directItems.length > 0 && (
            <div className="p-2 space-y-1">
              {subGroups.length > 0 && directItems.length > 0 && (
                <div className="px-3 py-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sem subcategoria</span>
                </div>
              )}
              {directItems.map((item, idx) => (
                <ItemRowComponent key={idx} item={item} />
              ))}
            </div>
          )}
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

  // Group items hierarchically: L1 → L2 → items
  const groupHierarchical = (filteredItems: BillItem[]) => {
    const l1Groups: Record<string, {
      name: string;
      icon: string;
      total: number;
      directItems: ItemRow[];
      subGroups: Record<string, SubCatGroup>;
    }> = {};

    for (const item of filteredItems) {
      const l1Name = item.category_l1_desc || item.grapehub_category || 'Outros';
      const l2Name = item.category_l2_desc;
      const l3Name = item.category_l3_desc;

      if (!l1Groups[l1Name]) {
        l1Groups[l1Name] = {
          name: l1Name,
          icon: getCategoryIcon(l1Name),
          total: 0,
          directItems: [],
          subGroups: {},
        };
      }

      const valor = Math.abs(parseFloat(item.movement_value || item.original_value || '0'));
      l1Groups[l1Name].total += valor;

      const row: ItemRow = {
        description: item.doc_description,
        date: item.expiration_date || '',
        person: item.people_name,
        value: valor,
        status: item.status,
        l3: l3Name,
      };

      if (l2Name) {
        if (!l1Groups[l1Name].subGroups[l2Name]) {
          l1Groups[l1Name].subGroups[l2Name] = { name: l2Name, total: 0, items: [] };
        }
        l1Groups[l1Name].subGroups[l2Name].total += valor;
        l1Groups[l1Name].subGroups[l2Name].items.push(row);
      } else {
        l1Groups[l1Name].directItems.push(row);
      }
    }

    return Object.values(l1Groups)
      .map(g => ({
        ...g,
        subGroupsList: Object.values(g.subGroups).sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
  };

  const pagas = items.filter(d => ['Conciliado', 'Quitado'].includes(d.status));
  const previstas = items.filter(d => ['Pendente', 'Atrasado', 'Vence Hoje'].includes(d.status));

  const pagasGrouped = groupHierarchical(pagas);
  const previstasGrouped = groupHierarchical(previstas);

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
                <div className="flex-1 overflow-y-auto max-h-[700px] p-4">
                  {pagasGrouped.length === 0 ? (
                    <p className="text-center py-12 text-slate-500">Nenhuma despesa paga encontrada.</p>
                  ) : (
                    pagasGrouped.map((cat, idx) => (
                      <CollapsibleGroup
                        key={idx}
                        category={cat.name}
                        icon={cat.icon}
                        total={cat.total}
                        directItems={cat.directItems}
                        subGroups={cat.subGroupsList}
                      />
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
                <div className="flex-1 overflow-y-auto max-h-[700px] p-4">
                  {previstasGrouped.length === 0 ? (
                    <p className="text-center py-12 text-slate-500">Nenhuma despesa prevista encontrada.</p>
                  ) : (
                    previstasGrouped.map((cat, idx) => (
                      <CollapsibleGroup
                        key={idx}
                        category={cat.name}
                        icon={cat.icon}
                        total={cat.total}
                        directItems={cat.directItems}
                        subGroups={cat.subGroupsList}
                      />
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
