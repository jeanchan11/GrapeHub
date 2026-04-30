import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, ChevronUp, ChevronRight, AlertTriangle, FileText, Upload, CreditCard, Check, Tag, Search, TrendingDown, Clock, CheckCircle, BarChart2 } from 'lucide-react';
import ContasRecorrentes from './ContasRecorrentes';
import RecurringBillDetail from './RecurringBillDetail';

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
  _source?: string | null;
}

interface Summary {
  total_previsto: number;
  ja_pago: number;
  total_mes: number;
  vence_hoje_amanha: number;
}

// ── L1 icon mapping ──────────────────────────────────
const L1_ICONS: Record<string, string> = {
  'Receitas Operacionais': '📑',
  'Deduções da Receita': '📉',
  'Receitas Não Operacionais': '📦',
  'Despesas Não Operacionais': '📦',
  'Distribuição de Lucros': '💰',
  'Despesas Operacionais': '📁',
  'Despesas com Pessoal': '👥',
  'Despesas Administrativas': '🏢',
  'Despesas com Ferramentas': '🛠️',
  'Despesas com Marketing': '📣',
  'Impostos e Tributos': '📊',
  'Despesas Financeiras': '💳',
  'Salários e Pessoal': '👥',
};
const getL1Icon = (l1: string) => L1_ICONS[l1] || '📁';

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

// ── Data structures ──────────────────────────────────
interface ItemRow {
  description: string;
  date: string;
  person: string | null;
  value: number;
  status: string;
  entryId?: number;
  isFatura?: boolean;
}

interface L3Group {
  name: string;
  code: string;   // e.g. "02.07.03"
  total: number;
  items: ItemRow[];
}

interface L2Group {
  name: string;
  code: string;   // e.g. "02.07"
  total: number;
  l3Groups: L3Group[];
  directItems: ItemRow[];
}

interface L1Group {
  name: string;
  code: string;   // e.g. "02"
  icon: string;
  total: number;
  l2Groups: L2Group[];
  directItems: ItemRow[];
}

// ── Item Row Component ─────────────────────────────
const ItemRowComponent = ({ item, onViewFatura }: { item: ItemRow; onViewFatura?: (entryId: number, name: string) => void }) => {
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
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4 shrink-0">
        {item.isFatura && item.entryId && onViewFatura && (
          <button onClick={() => onViewFatura(item.entryId!, item.description)}
            className="px-2 py-1 bg-blue-500/15 text-blue-400 text-[10px] font-bold rounded-lg hover:bg-blue-500/25 transition-all flex items-center gap-1">
            <FileText size={10} /> Ver Fatura
          </button>
        )}
        <span className="text-xs font-bold text-dark-text">{formatCurrency(item.value)}</span>
      </div>
    </div>
  );
};

// ── L3 dropdown (inside L2) ──────────────────────────
const L3Dropdown = ({ group, onViewFatura }: { group: L3Group; onViewFatura?: (entryId: number, name: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="ml-5 mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-slate-500 shrink-0" />
          <span className="text-[10px] font-mono text-slate-400">{group.code}</span>
          <span className="text-[10px] font-medium text-slate-400">{group.name}</span>
          <span className="text-[9px] text-slate-600">{group.items.length} {group.items.length === 1 ? 'item' : 'itens'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-dark-text/60">{formatCurrency(group.total)}</span>
          {isOpen ? <ChevronUp size={10} className="text-slate-500" /> : <ChevronRight size={10} className="text-slate-500" />}
        </div>
      </button>
      {isOpen && (
        <div className="ml-4 pl-3 border-l border-slate-600/20 space-y-0.5 pb-1">
          {group.items.map((item, idx) => (
            <ItemRowComponent key={idx} item={item} onViewFatura={onViewFatura} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── L2 collapsible (inside L1) ──────────────────────
const L2Collapsible = ({ group, onViewFatura }: { group: L2Group; onViewFatura?: (entryId: number, name: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const totalItems = group.directItems.length + group.l3Groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="ml-4 mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
          <span className="text-[10px] font-mono text-slate-400">{group.code}</span>
          <span className="text-[11px] font-semibold text-dark-text/80">{group.name}</span>
          <span className="text-[9px] text-slate-600 font-normal">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-dark-text/70">{formatCurrency(group.total)}</span>
          {isOpen ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
        </div>
      </button>
      {isOpen && (
        <div className="border-l-2 border-violet-500/10 ml-3 pl-1">
          {/* L3 sub-groups */}
          {group.l3Groups.map((l3, idx) => (
            <L3Dropdown key={idx} group={l3} onViewFatura={onViewFatura} />
          ))}
          {/* Direct items (no L3) */}
          {group.directItems.length > 0 && (
            <div className="ml-5 space-y-0.5 pb-1">
              {group.directItems.map((item, idx) => (
                <ItemRowComponent key={idx} item={item} onViewFatura={onViewFatura} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── L1 Collapsible Group ────────────────────────────
const L1CollapsibleGroup = ({ group, onViewFatura }: { group: L1Group; onViewFatura?: (entryId: number, name: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const totalItems = group.directItems.length
    + group.l2Groups.reduce((s, l2) => s + l2.directItems.length + l2.l3Groups.reduce((s2, l3) => s2 + l3.items.length, 0), 0);

  return (
    <div className="mb-2 border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-dark-card hover:bg-dark-card-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{group.icon}</span>
          <span className="text-[10px] font-mono text-slate-500">{group.code}</span>
          <span className="text-sm font-bold text-dark-text">{group.name}</span>
          <span className="text-[10px] text-slate-500 font-normal">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-dark-text">{formatCurrency(group.total)}</span>
          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>
      {isOpen && (
        <div className="bg-dark-bg border-t border-white/10">
          {/* L2 sub-groups */}
          {group.l2Groups.length > 0 && (
            <div className="py-2">
              {group.l2Groups.map((l2, idx) => (
                <L2Collapsible key={idx} group={l2} onViewFatura={onViewFatura} />
              ))}
            </div>
          )}
          {/* Direct items (no L2) */}
          {group.directItems.length > 0 && (
            <div className="p-2 space-y-1">
              {group.directItems.map((item, idx) => (
                <ItemRowComponent key={idx} item={item} onViewFatura={onViewFatura} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Helper: extract structure code parts ─────────────
function getStructureParts(structure: string | null | undefined): { l1Code: string; l2Code: string; l3Code: string } {
  if (!structure) return { l1Code: '??', l2Code: '', l3Code: '' };
  const parts = structure.split('.');
  return {
    l1Code: parts[0] || '??',
    l2Code: parts.length >= 2 ? `${parts[0]}.${parts[1]}` : '',
    l3Code: parts.length >= 3 ? structure : '',
  };
}

// ── Category cache for Sicredi picker ────────────────
let _sicrediCatCache: any[] | null = null;
let _sicrediCatPromise: Promise<any[]> | null = null;
function fetchSicrediCats(): Promise<any[]> {
  if (_sicrediCatCache) return Promise.resolve(_sicrediCatCache);
  if (_sicrediCatPromise) return _sicrediCatPromise;
  _sicrediCatPromise = fetch('/api/fin-categories').then(r => r.json()).then(d => {
    _sicrediCatCache = d.tree || [];
    _sicrediCatPromise = null;
    return _sicrediCatCache!;
  }).catch(() => { _sicrediCatPromise = null; return []; });
  return _sicrediCatPromise;
}

// ── Inline CategoryPicker for Sicredi ────────────────
function SicrediCategoryPicker({ item, onSave }: { item: any; onSave: (id: number, cat: string) => void }) {
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dropPos, setDropPos] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchSicrediCats().then(setCats);
      setTimeout(() => searchRef.current?.focus(), 100);
    } else setSearch('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-sicredi-cat-picker]')) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 360) setDropPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left });
      else setDropPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  const select = async (name: string) => {
    setSaving(true);
    onSave(item.id, name);
    setSaving(false);
    setOpen(false);
  };

  const matchesSearch = (node: any, term: string): boolean => {
    if (!term) return true;
    const t = term.toLowerCase();
    if (node.description?.toLowerCase().includes(t)) return true;
    return node.children?.some((c: any) => matchesSearch(c, t)) || false;
  };

  const currentCat = item.custom_category || item.grapehub_category || null;

  return (
    <div data-sicredi-cat-picker className="relative">
      <button
        ref={btnRef}
        onClick={toggleOpen}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all truncate max-w-[200px] ${
          currentCat
            ? 'bg-violet-500/10 border-violet-500/30 text-violet-400 hover:bg-violet-500/20'
            : 'bg-dark-bg border-white/10 text-slate-500 hover:border-violet-500/30 hover:text-dark-text'
        }`}
        disabled={saving}
      >
        <Tag size={11} className="shrink-0" />
        <span className="truncate">{currentCat || 'Categorizar'}</span>
      </button>

      {open && (
        <div
          data-sicredi-cat-picker
          style={{ position: 'fixed', top: dropPos.top, bottom: dropPos.bottom, left: dropPos.left, zIndex: 9999, width: 300 }}
          className="bg-dark-card border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="p-2 border-b border-white/5">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-text/30" />
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                className="w-full pl-7 pr-3 py-1.5 bg-dark-bg border border-white/5 rounded-lg text-[11px] text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/30" />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto py-1">
            {cats.length === 0 ? (
              <div className="px-3 py-4 text-center"><div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" /></div>
            ) : cats.map((l1: any) => {
              if (!matchesSearch(l1, search)) return null;
              return (
                <div key={l1.id}>
                  <div className="px-3 pt-2 pb-0.5"><span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">{l1.description}</span></div>
                  {l1.children?.map((l2: any) => {
                    if (!matchesSearch(l2, search)) return null;
                    if (l2.children?.length) {
                      return (
                        <div key={l2.id}>
                          <div className="px-3 pt-1 ml-2"><span className="text-[9px] font-semibold text-sky-400/70 uppercase">{l2.description}</span></div>
                          {l2.children.map((l3: any) => {
                            if (!matchesSearch(l3, search)) return null;
                            return (
                              <button key={l3.id} onClick={() => select(l3.description)}
                                className={`w-full text-left px-3 py-1.5 ml-4 text-[11px] hover:bg-violet-500/10 rounded-lg transition-all ${currentCat === l3.description ? 'text-violet-400 font-bold' : 'text-dark-text/80'}`}>
                                {l3.description}
                              </button>
                            );
                          })}
                        </div>
                      );
                    }
                    return (
                      <button key={l2.id} onClick={() => select(l2.description)}
                        className={`w-full text-left px-3 py-1.5 ml-2 text-[11px] hover:bg-violet-500/10 rounded-lg transition-all ${currentCat === l2.description ? 'text-violet-400 font-bold' : 'text-dark-text/80'}`}>
                        {l2.description}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SicrediTab component ─────────────────────────────
function SicrediTab({ selectedMonth, items, summary, loading, paying, onPagar, onRefresh, showCsvModal, setShowCsvModal, csvFile, setCsvFile, csvUploading, csvResult, onUploadCsv, onCategorySave }: {
  selectedMonth: string; items: any[]; summary: any; loading: boolean; paying: boolean;
  onPagar: () => void; onRefresh: () => void;
  showCsvModal: boolean; setShowCsvModal: (v: boolean) => void;
  csvFile: File | null; setCsvFile: (f: File | null) => void;
  csvUploading: boolean; csvResult: any;
  onUploadCsv: () => void; onCategorySave: (id: number, cat: string) => void;
}) {
  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>;
  }

  const hasPending = items.some(i => i.status === 'pendente');

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total da Fatura</p>
          <h3 className="text-2xl font-black text-dark-text">{formatCurrency(summary.total)}</h3>
        </div>
        <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Lançamentos</p>
          <h3 className="text-2xl font-black text-dark-text">{summary.count}</h3>
        </div>
        <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Categorizados</p>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-black text-dark-text">{summary.categorized}/{summary.count}</h3>
            {summary.categorized === summary.count && summary.count > 0 && (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">100%</span>
            )}
          </div>
        </div>
        <div className={`bg-dark-card border rounded-2xl p-5 ${summary.allPaid ? 'border-emerald-500/30' : 'border-amber-500/30'}`}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
          <span className={`px-3 py-1 text-[11px] font-bold rounded-full ${summary.allPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {summary.allPaid ? '✓ Cartão Pago' : 'Pendente'}
          </span>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3">
        <button onClick={() => { setShowCsvModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-xl text-xs font-bold text-blue-400 transition-all">
          <Upload size={14} /> Importar Fatura CSV
        </button>
        {hasPending && (
          <button onClick={onPagar} disabled={paying}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50">
            {paying ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
            Pagar Cartão
          </button>
        )}
        <button onClick={onRefresh} className="ml-auto px-3 py-2 text-xs text-slate-500 hover:text-dark-text transition-all">↻ Atualizar</button>
      </div>

      {/* Items table */}
      {items.length === 0 ? (
        <div className="bg-dark-card border border-white/10 rounded-2xl p-12 text-center">
          <CreditCard size={32} className="mx-auto text-slate-500 mb-3" />
          <p className="text-sm text-slate-500">Nenhum lançamento Sicredi para este mês.</p>
          <p className="text-[11px] text-slate-600 mt-1">Importe a fatura CSV do Sicredi para começar.</p>
        </div>
      ) : (
        <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categoria</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-xs text-dark-text/70 whitespace-nowrap">
                      {item.date ? new Date(item.date.slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-dark-text font-medium max-w-[300px] truncate">{item.description}</td>
                    <td className="px-4 py-3">
                      <SicrediCategoryPicker item={item} onSave={onCategorySave} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        item.status === 'realizado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {item.status === 'realizado' ? 'Pago' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-rose-400 text-right whitespace-nowrap">
                      -{formatCurrency(item.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10">
                  <td colSpan={4} className="px-4 py-3 text-xs font-bold text-dark-text uppercase">Total</td>
                  <td className="px-4 py-3 text-sm font-black text-rose-400 text-right">{formatCurrency(summary.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowCsvModal(false)}>
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-dark-text mb-4 flex items-center gap-2"><Upload size={16} className="text-blue-400" /> Importar Fatura Sicredi</h3>
            {csvResult ? (
              <div className="space-y-3">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-emerald-400">{csvResult.inserted}</p>
                  <p className="text-xs text-emerald-400/70 mt-1">lançamentos importados</p>
                </div>
                {csvResult.skipped > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
                    <p className="text-sm font-bold text-amber-400">{csvResult.skipped} já existiam</p>
                  </div>
                )}
                <button onClick={() => { setShowCsvModal(false); setCsvFile(null); }} className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl text-xs font-bold text-white transition-all">Fechar</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-blue-500/30 transition-colors">
                  <Upload size={28} className="mx-auto text-slate-500 mb-3" />
                  <p className="text-xs text-slate-400 mb-3">Selecione o arquivo CSV da fatura Sicredi</p>
                  <input type="file" accept=".csv,.CSV" onChange={e => setCsvFile(e.target.files?.[0] || null)}
                    className="block mx-auto text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-500/15 file:text-blue-400 hover:file:bg-blue-500/25 file:cursor-pointer file:transition-all" />
                </div>
                {csvFile && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                    <FileText size={14} className="text-blue-400" />
                    <span className="text-xs text-blue-400 font-medium flex-1 truncate">{csvFile.name}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setShowCsvModal(false)} className="flex-1 py-2.5 bg-dark-bg border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-dark-text transition-all">Cancelar</button>
                  <button onClick={onUploadCsv} disabled={!csvFile || csvUploading} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50">
                    {csvUploading ? 'Importando...' : 'Importar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────
export default function ContasAPagar() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>({ total_previsto: 0, ja_pago: 0, total_mes: 0, vence_hoje_amanha: 0 });
  const [items, setItems] = useState<BillItem[]>([]);
  const [activeTab, setActiveTab] = useState<'pagar' | 'recorrentes' | 'sicredi'>('pagar');
  const [detailView, setDetailView] = useState<{ entryId: number; billName: string } | null>(null);

  // Sicredi state
  const [sicrediItems, setSicrediItems] = useState<any[]>([]);
  const [sicrediSummary, setSicrediSummary] = useState<any>({ total: 0, count: 0, categorized: 0, allPaid: false });
  const [sicrediLoading, setSicrediLoading] = useState(false);
  const [sicrediPaying, setSicrediPaying] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ inserted: number; skipped: number; total: number } | null>(null);
  const [geraisOpen, setGeraisOpen] = useState(false);
  const [cartaoOpen, setCartaoOpen] = useState(false);

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

  // ── Sicredi handlers ──
  const fetchSicredi = async () => {
    setSicrediLoading(true);
    try {
      const res = await fetch(`/api/financeiro/contas-a-pagar/sicredi?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setSicrediItems(data.items);
        setSicrediSummary(data.summary);
      }
    } catch (err) { console.error(err); }
    setSicrediLoading(false);
  };

  const handleSicrediPagar = async () => {
    if (!confirm(`Marcar todos os ${sicrediSummary.count} lançamentos Sicredi como PAGOS?`)) return;
    setSicrediPaying(true);
    try {
      await fetch('/api/financeiro/contas-a-pagar/sicredi/pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth }),
      });
      await fetchSicredi();
    } catch (err) { console.error(err); }
    setSicrediPaying(false);
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setCsvUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('account', 'sicredi');
      formData.append('billing_month', selectedMonth);
      const res = await fetch('/api/financeiro/extrato/importar-ofx', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setCsvResult(data);
        await fetchSicredi();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao importar');
      }
    } catch (err) { console.error(err); alert('Erro de rede'); }
    setCsvUploading(false);
  };

  const handleSicrediCategorySave = async (id: number, category: string) => {
    try {
      await fetch(`/api/financeiro/extrato/${id}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      setSicrediItems(prev => prev.map(i => i.id === id ? { ...i, custom_category: category, grapehub_category: category } : i));
      setSicrediSummary((prev: any) => ({ ...prev, categorized: prev.categorized + 1 }));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (activeTab === 'sicredi') fetchSicredi();
  }, [activeTab, selectedMonth]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [contasRes, recorrentesRes] = await Promise.all([
          fetch(`/api/financeiro/contas-a-pagar?month=${selectedMonth}`),
          fetch(`/api/financeiro/recorrentes/entries?month=${selectedMonth}`)
        ]);
        if (!contasRes.ok) throw new Error('Falha ao carregar');
        const data = await contasRes.json();

        // Merge pending recurring entries as "previstas"
        let recurringItems: BillItem[] = [];
        if (recorrentesRes.ok) {
          const entries = await recorrentesRes.json();
          recurringItems = entries
            .filter((e: any) => e.status === 'pending' && !(e.bill_name || '').toLowerCase().includes('sicredi'))
            .map((e: any) => ({
              id: e.id,
              doc_description: e.bill_name,
              movement_value: e.expected_value || '0',
              original_value: e.expected_value || '0',
              payment_date: null,
              expiration_date: e.due_date,
              status: 'Pendente',
              type_column: '',
              payment_method: '',
              document_code: '',
              grapehub_category: e.category_name || null,
              people_name: e.account_name || null,
              people_cnpjcpf: null,
              category_l1_desc: null,
              category_l2_desc: e.category_name || null,
              category_l3_desc: null,
              category_structure: e.category_structure || null,
              _entryId: e.id,
              _isFatura: (e.bill_name || '').toLowerCase().includes('fatura'),
            }));
        }

        const allItems = [...data.items, ...recurringItems];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);
        const vence7dias = allItems
          .filter((i: BillItem) => ['Pendente', 'Atrasado', 'Vence Hoje'].includes(i.status) && i.expiration_date)
          .filter((i: BillItem) => {
            const d = new Date(i.expiration_date! + 'T12:00:00');
            return d >= today && d <= in7Days;
          })
          .reduce((s: number, i: BillItem) => s + Math.abs(parseFloat(i.original_value)), 0);

        setSummary({
          ...data.summary,
          total_previsto: (data.summary.total_previsto || 0) + recurringItems.reduce((s, i) => s + Math.abs(parseFloat(i.original_value)), 0),
          vence_hoje_amanha: vence7dias,
        });
        setItems(allItems);
      } catch (err) {
        console.error('Error fetching contas a pagar:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth]);

  // ── Group items by L1 > L2 > L3 hierarchy ──
  const groupHierarchical = (filteredItems: BillItem[]): L1Group[] => {
    const l1Map: Record<string, L1Group> = {};

    for (const item of filteredItems) {
      const valor = Math.abs(parseFloat(item.movement_value || item.original_value || '0'));
      const row: ItemRow = {
        description: item.doc_description,
        date: item.expiration_date || item.payment_date || '',
        person: item.people_name,
        value: valor,
        status: item.status,
        entryId: (item as any)._entryId,
        isFatura: (item as any)._isFatura,
      };

      const { l1Code, l2Code, l3Code } = getStructureParts(item.category_structure);
      const l1Name = item.category_l1_desc || 'Outros';
      const l2Name = item.category_l2_desc || null;
      const l3Name = item.category_l3_desc || null;

      // Ensure L1 exists
      if (!l1Map[l1Name]) {
        l1Map[l1Name] = {
          name: l1Name,
          code: l1Code,
          icon: getL1Icon(l1Name),
          total: 0,
          l2Groups: [],
          directItems: [],
        };
      }
      l1Map[l1Name].total += valor;

      // If we have an L2
      if (l2Name && l2Name !== l1Name) {
        let l2 = l1Map[l1Name].l2Groups.find(g => g.name === l2Name);
        if (!l2) {
          l2 = { name: l2Name, code: l2Code, total: 0, l3Groups: [], directItems: [] };
          l1Map[l1Name].l2Groups.push(l2);
        }
        l2.total += valor;

        // If we have an L3
        if (l3Name && l3Name !== l2Name) {
          let l3 = l2.l3Groups.find(g => g.name === l3Name);
          if (!l3) {
            l3 = { name: l3Name, code: l3Code, total: 0, items: [] };
            l2.l3Groups.push(l3);
          }
          l3.total += valor;
          l3.items.push(row);
        } else {
          // No L3 — direct item in L2
          l2.directItems.push(row);
        }
      } else {
        // No L2 — direct item in L1
        l1Map[l1Name].directItems.push(row);
      }
    }

    // Sort: L2 by total desc, L3 by total desc
    return Object.values(l1Map)
      .map(g => {
        g.l2Groups.sort((a, b) => b.total - a.total);
        for (const l2 of g.l2Groups) {
          l2.l3Groups.sort((a, b) => b.total - a.total);
        }
        return g;
      })
      .sort((a, b) => b.total - a.total);
  };

  const pagas = items.filter(d => ['Conciliado', 'Quitado'].includes(d.status));
  const previstas = items.filter(d => ['Pendente', 'Atrasado', 'Vence Hoje'].includes(d.status));

  // Split previstas into Despesas Gerais vs Cartão de Crédito
  const previstasGerais = previstas.filter(d => (d as any)._source !== 'sicredi');
  const previstasCartao = previstas.filter(d => (d as any)._source === 'sicredi');

  const pagasGrouped = groupHierarchical(pagas);

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
          {/* Tabs */}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setActiveTab('pagar')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'pagar' ? 'bg-violet-500 text-white' : 'bg-dark-card border border-white/10 text-slate-400 hover:text-dark-text'}`}>Contas a Pagar</button>
            <button onClick={() => setActiveTab('sicredi')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'sicredi' ? 'bg-blue-500 text-white' : 'bg-dark-card border border-white/10 text-slate-400 hover:text-dark-text'}`}>
              <span className="flex items-center gap-1.5"><CreditCard size={13} /> Sicredi</span>
            </button>
            <button onClick={() => setActiveTab('recorrentes')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'recorrentes' ? 'bg-violet-500 text-white' : 'bg-dark-card border border-white/10 text-slate-400 hover:text-dark-text'}`}>Despesa Recorrente</button>
          </div>
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
        {activeTab === 'recorrentes' ? (
          <ContasRecorrentes selectedMonth={selectedMonth} />
        ) : activeTab === 'sicredi' ? (
          <SicrediTab
            selectedMonth={selectedMonth}
            items={sicrediItems}
            summary={sicrediSummary}
            loading={sicrediLoading}
            paying={sicrediPaying}
            onPagar={handleSicrediPagar}
            onRefresh={fetchSicredi}
            showCsvModal={showCsvModal}
            setShowCsvModal={setShowCsvModal}
            csvFile={csvFile}
            setCsvFile={setCsvFile}
            csvUploading={csvUploading}
            csvResult={csvResult}
            onUploadCsv={handleCsvUpload}
            onCategorySave={handleSicrediCategorySave}
          />
        ) : loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI Cards — mesmo padrão do Dashboard Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Card 1: Vence em 7 dias */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[150px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-2xl bg-rose-600">
                    <Clock size={20} className="text-white" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vence em 7 dias</p>
                </div>
                <div className="flex flex-col mt-auto">
                  <h3 className="text-3xl font-black tracking-tight mb-3 text-rose-400">
                    {formatCurrency(summary.vence_hoje_amanha)}
                  </h3>
                </div>
              </div>

              {/* Card 2: Total Previsto */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[150px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-2xl bg-amber-500">
                    <TrendingDown size={20} className="text-white" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Previsto</p>
                </div>
                <div className="flex flex-col mt-auto">
                  <h3 className="text-3xl font-black tracking-tight mb-3 text-dark-text">
                    {formatCurrency(summary.total_previsto)}
                  </h3>
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">A pagar</span>
                      <span className="font-semibold text-amber-400">{formatCurrency(summary.total_previsto)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Já Pago */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[150px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-2xl bg-emerald-600">
                    <CheckCircle size={20} className="text-white" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Já Pago</p>
                </div>
                <div className="flex flex-col mt-auto">
                  <h3 className="text-3xl font-black tracking-tight mb-3 text-dark-text">
                    {formatCurrency(summary.ja_pago)}
                  </h3>
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Conciliado</span>
                      <span className="font-semibold text-emerald-400">{formatCurrency(summary.ja_pago)}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, summary.total_mes > 0 ? (summary.ja_pago / summary.total_mes) * 100 : 0)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Total do Mês */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[150px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-2xl bg-violet-600">
                    <BarChart2 size={20} className="text-white" />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total do Mês</p>
                </div>
                <div className="flex flex-col mt-auto">
                  <h3 className="text-3xl font-black tracking-tight mb-3 text-dark-text">
                    {formatCurrency(summary.total_mes)}
                  </h3>
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Pago</span>
                      <span className="font-semibold text-emerald-400">{formatCurrency(summary.ja_pago)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-slate-500">A pagar</span>
                      <span className="font-semibold text-amber-400">{formatCurrency(summary.total_previsto)}</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-violet-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, summary.total_mes > 0 ? (summary.ja_pago / summary.total_mes) * 100 : 0)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panels — 2 columns */}
            {detailView ? (
              <div className="mt-6">
                <RecurringBillDetail
                  entryId={detailView.entryId}
                  billName={detailView.billName}
                  onBack={() => setDetailView(null)}
                />
              </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pagas */}
              <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden flex flex-col order-2">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">Despesas pagas</h2>
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Conciliado</span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[700px] p-4">
                  {pagasGrouped.length === 0 ? (
                    <p className="text-center py-12 text-slate-500">Nenhuma despesa paga encontrada.</p>
                  ) : (
                    pagasGrouped.map((group, idx) => (
                      <L1CollapsibleGroup key={idx} group={group} />
                    ))
                  )}
                </div>
              </div>

              {/* Previstas */}
              <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden flex flex-col order-1">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">Despesas previstas</h2>
                  <span className="px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Pendente</span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[800px]">
                  {previstas.length === 0 ? (
                    <p className="text-center py-12 text-slate-500">Nenhuma despesa prevista encontrada.</p>
                  ) : (
                    <>
                      {/* ── Despesas Gerais ── */}
                      {previstasGerais.length > 0 && (
                        <div>
                          <button onClick={() => setGeraisOpen(!geraisOpen)} className="w-full flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer">
                            <span className="text-base">📁</span>
                            <h3 className="text-[11px] font-bold text-dark-text uppercase tracking-widest">Despesas Gerais</h3>
                            <span className="text-[10px] text-slate-500">{previstasGerais.length} {previstasGerais.length === 1 ? 'item' : 'itens'}</span>
                            <span className="ml-auto text-xs font-bold text-dark-text">{formatCurrency(previstasGerais.reduce((s, i) => s + Math.abs(parseFloat(i.original_value)), 0))}</span>
                            {geraisOpen ? <ChevronUp size={14} className="text-slate-400 ml-2" /> : <ChevronDown size={14} className="text-slate-400 ml-2" />}
                          </button>
                          {geraisOpen && (
                              <div className="divide-y divide-white/5">
                                {previstasGerais.map((item, idx) => {
                                  const isAtrasado = item.status === 'Atrasado';
                                  const isPendente = item.status === 'Pendente';
                                  return (
                                    <div key={idx} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-semibold text-dark-text truncate">{item.doc_description}</span>
                                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full shrink-0 ${
                                            isPendente ? 'bg-amber-500/15 text-amber-400' :
                                            isAtrasado ? 'bg-rose-500/15 text-rose-400' :
                                            'bg-emerald-500/15 text-emerald-400'
                                          }`}>{item.status}</span>
                                          {item.expiration_date && (
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                                              isAtrasado ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' :
                                              'bg-violet-500/10 border border-violet-500/30 text-violet-400'
                                            }`}>
                                              Venc: {fmtDate(item.expiration_date)}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                          {(item.grapehub_category || item.category_l2_desc) && (
                                            <span className="text-[10px] text-slate-500">{item.grapehub_category || item.category_l2_desc}</span>
                                          )}
                                        </div>
                                      </div>
                                      <span className="text-sm font-bold text-dark-text ml-4 shrink-0">{formatCurrency(Math.abs(parseFloat(item.original_value)))}</span>
                                    </div>
                                  );
                                })}
                              </div>
                          )}
                        </div>
                      )}

                      {previstasCartao.length > 0 && (
                        <div>
                          <button onClick={() => setCartaoOpen(!cartaoOpen)} className="w-full px-5 py-3 border-y border-white/5 bg-blue-500/[0.03] hover:bg-blue-500/[0.06] transition-colors cursor-pointer">
                            <div className="flex items-center gap-2">
                              <span className="text-base">💳</span>
                              <h3 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Cartão de Crédito</h3>
                              <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-bold rounded-full">Venc: {`18/${String(selM).padStart(2, '0')}/${selY}`}</span>
                              <span className="ml-auto text-xs font-bold text-blue-400">{formatCurrency(previstasCartao.reduce((s, i) => s + Math.abs(parseFloat(i.original_value)), 0))}</span>
                              {cartaoOpen ? <ChevronUp size={14} className="text-blue-400 ml-2" /> : <ChevronDown size={14} className="text-blue-400 ml-2" />}
                            </div>
                            <div className="flex items-center gap-2 mt-1 ml-7">
                              <span className="text-[10px] text-slate-500">{previstasCartao.length} itens</span>
                            </div>
                          </button>
                          {cartaoOpen && (
                              <div className="divide-y divide-white/5">
                                {previstasCartao.map((item, idx) => {
                                  const isPendente = item.status === 'Pendente';
                                  return (
                                    <div key={idx} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-semibold text-dark-text truncate">{item.doc_description}</span>
                                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full shrink-0 ${
                                            isPendente ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'
                                          }`}>{isPendente ? 'Pendente' : 'Pago'}</span>
                                          {item.expiration_date && (
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 bg-violet-500/10 border border-violet-500/30 text-violet-400">
                                              Venc: {fmtDate(item.expiration_date)}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5">
                                          {(item.grapehub_category || item.category_l2_desc) && (
                                            <span className="text-[10px] text-slate-500">{item.grapehub_category || item.category_l2_desc}</span>
                                          )}
                                        </div>
                                      </div>
                                      <span className="text-sm font-bold text-dark-text ml-4 shrink-0">{formatCurrency(Math.abs(parseFloat(item.original_value)))}</span>
                                    </div>
                                  );
                                })}
                              </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
