import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, CheckCircle2, Clock, AlertTriangle, X, Upload,
  RefreshCw, ChevronDown, ChevronLeft, ChevronRight, BarChart2, CreditCard,
  Receipt, Tag, Calendar, DollarSign, FileText, Check, Loader2,
  Home, Laptop, Truck, Megaphone, Users, Wrench, Code, Zap
} from 'lucide-react';
import SplitHeadline from '../components/SplitHeadline';
import { motion, AnimatePresence, useSpring, useTransform, useInView } from 'motion/react';

// ── Types ───────────────────────────────────────────────────────────────────
interface Bill {
  id: number;
  name: string;
  category: string;
  value: string | null;
  recurrence: 'monthly' | 'yearly' | 'once' | 'weekly';
  due_day: number | null;
  due_date: string | null;
  notes: string | null;
  is_active: boolean;
}

interface Entry {
  id: number;
  bill_id: number;
  bill_name: string;
  category: string;
  reference_month: string;
  due_date: string;
  expected_value: string;
  actual_value: string | null;
  status: 'pending' | 'paid' | 'partial' | 'cancelled';
  paid_at: string | null;
  notes: string | null;
  linked_movement_id: number | null;
  linked_description: string | null;
  linked_date: string | null;
  linked_value: string | null;
  recurrence?: string;
}

interface EntrySummary {
  total_previsto: number;
  total_pago: number;
  total_pendente: number;
  vence_7_dias: number;
  total: number;
}

interface SicrediItem {
  id: number;
  asaas_id: string;
  description: string;
  custom_description: string | null;
  value: string;
  transaction_date: string;
  type: number;
  grapehub_category: string | null;
  custom_category: string | null;
  user_comment: string | null;
  sicredi_status: string;
}

interface SicrediSummary {
  total: number;
  total_items: number;
  categorized: number;
  payment_date?: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const fmtBRL = (v: number | string) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  const date = new Date(String(d).slice(0, 10) + 'T12:00:00');
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
};

const getDueDateStatus = (dueDate: string | null, status: string) => {
  if (status === 'paid') return 'paid';
  if (!dueDate) return 'normal';
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(String(dueDate).slice(0,10) + 'T12:00:00'); due.setHours(0,0,0,0);
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'soon';
  return 'normal';
};

// ── CountUp ─────────────────────────────────────────────────────────────────
const CountUp = ({ value, currency = false }: { value: number; currency?: boolean }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const spring = useSpring(0, { duration: 1000, bounce: 0 });
  const display = useTransform(spring, v =>
    currency ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : Math.round(v).toLocaleString('pt-BR')
  );
  useEffect(() => { if (inView) spring.set(value); }, [inView, value]);
  return <motion.span ref={ref}>{display}</motion.span>;
};

// ── Status Badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status, dueDate }: { status: Entry['status']; dueDate: string | null }) => {
  const ds = getDueDateStatus(dueDate, status);
  if (ds === 'paid') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400">✓ Pago</span>;
  if (status === 'partial') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400">~ Parcial</span>;
  if (status === 'cancelled') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400">× Cancelado</span>;
  if (ds === 'overdue') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400">⚠ Atrasado</span>;
  if (ds === 'today') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400">● Hoje</span>;
  if (ds === 'soon') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400">Em breve</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-slate-400">Pendente</span>;
};

// ── Category Styles & Colors ──────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  'Salários': 'bg-violet-500', 'Aluguel': 'bg-amber-500', 'Software': 'bg-blue-500',
  'Marketing': 'bg-pink-500', 'Impostos': 'bg-rose-500', 'Serviços': 'bg-teal-500',
  'Fornecedores': 'bg-orange-500', 'Utilidades': 'bg-cyan-500', 'Equipamentos': 'bg-indigo-500',
  'Outros': 'bg-slate-500',
};

const getCategoryStyles = (category: string) => {
  const colors: Record<string, { bg: string, text: string, border: string, dot: string }> = {
    'Salários': { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', dot: 'bg-violet-500' },
    'Aluguel': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-500' },
    'Software': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-500' },
    'Marketing': { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20', dot: 'bg-pink-500' },
    'Impostos': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', dot: 'bg-rose-500' },
    'Serviços': { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20', dot: 'bg-teal-500' },
    'Fornecedores': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-500' },
    'Utilidades': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', dot: 'bg-cyan-500' },
    'Equipamentos': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', dot: 'bg-indigo-500' },
    'Outros': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', dot: 'bg-slate-500' },
  };

  if (colors[category]) return colors[category];

  // Hash/modulo fallback for custom categories
  const keys = Object.keys(colors).filter(k => k !== 'Outros');
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % keys.length;
  return colors[keys[index]];
};

const getCategoryIcon = (category: string, size = 16) => {
  switch (category) {
    case 'Aluguel':
      return <Home size={size} />;
    case 'Equipamentos':
      return <Laptop size={size} />;
    case 'Fornecedores':
      return <Truck size={size} />;
    case 'Impostos':
      return <Receipt size={size} />;
    case 'Marketing':
      return <Megaphone size={size} />;
    case 'Salários':
      return <Users size={size} />;
    case 'Serviços':
      return <Wrench size={size} />;
    case 'Software':
      return <Code size={size} />;
    case 'Utilidades':
      return <Zap size={size} />;
    default:
      return <DollarSign size={size} />;
  }
};

const CatDot = ({ cat }: { cat: string }) => (
  <span className={`w-2 h-2 rounded-full inline-block mr-1.5 shrink-0 ${CAT_COLORS[cat] || 'bg-slate-500'}`} />
);

// ── Bill Modal ───────────────────────────────────────────────────────────────
const RECURRENCE_LABELS: Record<string, string> = {
  monthly: 'Mensal', yearly: 'Anual', once: 'Única', weekly: 'Semanal'
};

interface BillModalProps {
  bill: Partial<Bill> | null;
  categories: string[];
  onSave: (data: Partial<Bill>) => Promise<void>;
  onClose: () => void;
}
const BillModal: React.FC<BillModalProps> = ({ bill, categories, onSave, onClose }) => {
  const [form, setForm] = useState<Partial<Bill>>(bill || { recurrence: 'monthly', category: 'Outros' });
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  const set = (k: keyof Bill, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name?.trim()) return;
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  };

  const allCats = showNewCat ? [...categories, newCat].filter(Boolean) : categories;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl mx-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-dark-text">{form.id ? 'Editar Conta' : 'Nova Conta'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-dark-text transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Nome *</label>
            <input value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Ex: Aluguel escritório"
              className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text placeholder-slate-500 focus:outline-none focus:border-violet-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Categoria</label>
              <select value={form.category || 'Outros'} onChange={e => set('category', e.target.value)}
                className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-violet-500/50">
                {allCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => setShowNewCat(!showNewCat)} className="text-[10px] text-violet-400 mt-1 hover:underline">+ Nova categoria</button>
              {showNewCat && (
                <input value={newCat} onChange={e => { setNewCat(e.target.value); set('category', e.target.value); }}
                  placeholder="Nome da categoria" className="mt-1 w-full bg-dark-bg border border-violet-500/40 rounded-lg px-3 py-1.5 text-sm text-dark-text focus:outline-none" />
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Recorrência</label>
              <select value={form.recurrence || 'monthly'} onChange={e => set('recurrence', e.target.value as any)}
                className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-violet-500/50">
                {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Valor (R$)</label>
              <input type="number" step="0.01" value={form.value || ''} onChange={e => set('value', e.target.value)} placeholder="0,00"
                className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-violet-500/50" />
            </div>
            {(form.recurrence === 'monthly' || form.recurrence === 'weekly') && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Dia de Pagar (1–31)</label>
                <input type="number" min={1} max={31} value={form.due_day || ''} onChange={e => set('due_day', Number(e.target.value))} placeholder="Ex: 10"
                  className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-violet-500/50" />
              </div>
            )}
            {(form.recurrence === 'once' || form.recurrence === 'yearly') && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Data de Vencimento</label>
                <input type="date" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)}
                  className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-violet-500/50" />
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Observações</label>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Opcional"
              className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text resize-none focus:outline-none focus:border-violet-500/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-slate-400 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.name?.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Mark Paid Modal ──────────────────────────────────────────────────────────
const PayModal = ({ entry, onSave, onClose }: { entry: Entry; onSave: (id: number, data: any) => Promise<void>; onClose: () => void }) => {
  const [val, setVal] = useState(entry.actual_value || entry.expected_value || '');
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(entry.id, { status: 'paid', actual_value: val, paid_at: date }); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-sm p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-dark-text">Marcar como Pago</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400"><X size={14} /></button>
        </div>
        <p className="text-xs text-slate-400 mb-4">{entry.bill_name}</p>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Valor Pago (R$)</label>
            <input type="number" step="0.01" value={val} onChange={e => setVal(e.target.value)}
              className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Data de Pagamento</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-emerald-500/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-slate-400 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {saving ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Sicredi Edit Modal ───────────────────────────────────────────────────────
const SicrediEditModal = ({ item, categories, onSave, onClose }: {
  item: SicrediItem; categories: string[];
  onSave: (id: number, data: any) => Promise<void>; onClose: () => void;
}) => {
  const [desc, setDesc] = useState(item.custom_description || item.description || '');
  const [cat, setCat] = useState(item.custom_category || item.grapehub_category || '');
  const [comment, setComment] = useState(item.user_comment || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(item.id, { custom_description: desc, custom_category: cat, user_comment: comment }); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-sm p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-dark-text">Editar Lançamento</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400"><X size={14} /></button>
        </div>
        <p className="text-[10px] text-slate-500 mb-4 truncate">{item.description}</p>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Descrição Personalizada</label>
            <input value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Categoria</label>
            <select value={cat} onChange={e => setCat(e.target.value)}
              className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-emerald-500/50">
              <option value="">— Sem categoria —</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Observação</label>
            <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Opcional"
              className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text focus:outline-none focus:border-emerald-500/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-slate-400 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({
  icon, label, value, sub, subColor, accent
}: { icon: React.ReactNode; label: string; value: string; sub?: string; subColor?: string; accent?: string }) => (
  <div className={`bg-dark-card border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 flex flex-col gap-2 hover:border-white/20 transition-all duration-200`}>
    <div className="flex items-center justify-between">
      <div className={`p-1.5 rounded-lg ${accent || 'bg-violet-600'}`}>{icon}</div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
    <div>
      <p className="text-lg font-black text-dark-text tracking-tight leading-tight">{value}</p>
      {sub && <p className={`text-[11px] mt-0.5 font-semibold ${subColor || 'text-slate-500'}`}>{sub}</p>}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function ContasAPagar() {
  const [activeTab, setActiveTab] = useState<'contas' | 'sicredi'>('contas');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);

  // Contas a Pagar state
  const [bills, setBills] = useState<Bill[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entrySummary, setEntrySummary] = useState<EntrySummary>({ total_previsto: 0, total_pago: 0, total_pendente: 0, vence_7_dias: 0, total: 0 });
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [billModal, setBillModal] = useState<Partial<Bill> | null | undefined>(undefined); // undefined = closed
  const [payModal, setPayModal] = useState<Entry | null>(null);
  const [filterCat, setFilterCat] = useState('');
  const [entrySubTab, setEntrySubTab] = useState<'pending' | 'paid'>('pending');
  const [showBillsConfig, setShowBillsConfig] = useState(false);
  const [linkModal, setLinkModal] = useState<{ entry: Entry; candidates: any[]; loading: boolean } | null>(null);

  // Sicredi state
  const [sicrediItems, setSicrediItems] = useState<SicrediItem[]>([]);
  const [sicrediSummary, setSicrediSummary] = useState<SicrediSummary>({ total: 0, total_items: 0, categorized: 0 });
  const [sicrediLoading, setSicrediLoading] = useState(false);
  const [sicrediEditItem, setSicrediEditItem] = useState<SicrediItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filterSicrediCat, setFilterSicrediCat] = useState('');

  // Month nav
  const [selY, selM] = selectedMonth.split('-').map(Number);
  const monthLabel = `${MESES[selM - 1]} ${selY}`;
  const prevMonth = () => { let m = selM - 1, y = selY; if (m < 1) { m = 12; y--; } setSelectedMonth(`${y}-${String(m).padStart(2,'0')}`); };
  const nextMonth = () => { let m = selM + 1, y = selY; if (m > 12) { m = 1; y++; } setSelectedMonth(`${y}-${String(m).padStart(2,'0')}`); };

  // ── Fetch ──
  const fetchCats = useCallback(async () => {
    const r = await fetch('/api/fin/bills/categories');
    if (r.ok) setCategories(await r.json());
  }, []);

  const fetchBills = useCallback(async () => {
    const r = await fetch('/api/fin/bills');
    if (r.ok) setBills(await r.json());
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/fin/bills/entries?month=${selectedMonth}`);
      if (r.ok) {
        const data = await r.json();
        setEntries(data.entries || []);
        setEntrySummary(data.summary || {});
      }
    } finally { setLoading(false); }
  }, [selectedMonth]);

  const fetchSicredi = useCallback(async () => {
    setSicrediLoading(true);
    try {
      const r = await fetch(`/api/fin/bills/sicredi?month=${selectedMonth}`);
      if (r.ok) {
        const data = await r.json();
        setSicrediItems(data.items || []);
        setSicrediSummary(data.summary || {});
      }
    } finally { setSicrediLoading(false); }
  }, [selectedMonth]);

  useEffect(() => {
    fetchCats();
    fetchBills();
  }, []);

  useEffect(() => {
    if (activeTab === 'contas') fetchEntries();
    else fetchSicredi();
  }, [activeTab, selectedMonth]);

  // ── CRUD Handlers ──
  const handleSaveBill = async (data: Partial<Bill>) => {
    const method = data.id ? 'PUT' : 'POST';
    const url = data.id ? `/api/fin/bills/${data.id}` : '/api/fin/bills';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (r.ok) { await fetchBills(); await fetchEntries(); await fetchCats(); }
  };

  const handleDeleteBill = async (id: number) => {
    if (!confirm('Remover esta conta recorrente?')) return;
    await fetch(`/api/fin/bills/${id}`, { method: 'DELETE' });
    await fetchBills(); await fetchEntries();
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm('Excluir este lançamento do mês? (Esta ação não remove a conta recorrente cadastrada)')) return;
    const r = await fetch(`/api/fin/bills/entries/${id}`, { method: 'DELETE' });
    if (r.ok) await fetchEntries();
  };

  const handlePayEntry = async (id: number, data: any) => {
    const r = await fetch(`/api/fin/bills/entries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (r.ok) await fetchEntries();
  };

  const handleSicrediEdit = async (id: number, data: any) => {
    const r = await fetch(`/api/fin/bills/sicredi/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (r.ok) await fetchSicredi();
  };

  // ── Upload Fatura (OFX ou CSV da Sicredi) ──
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      // Lê o arquivo em base64 (suporta .ofx e .csv)
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const r = await fetch('/api/financeiro/extrato/importar-ofx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: 'sicredi', billing_month: selectedMonth, fileName: file.name, fileData }),
      });
      if (r.ok) {
        const data = await r.json();
        const ins = data.inserted ?? data.count ?? 0;
        const skip = data.skipped ?? 0;
        const pruned = data.pruned ?? 0;
        const bm: string | null = data.billing_month || null;
        const parts = [`${ins} novo(s)`];
        if (skip) parts.push(`${skip} mantido(s)`);
        if (pruned) parts.push(`${pruned} removido(s)`);
        let prefix = '';
        if (data.month_source === 'vencimento' && bm) {
          const [y, m] = bm.split('-');
          const dd = data.due_date ? `${data.due_date.slice(8, 10)}/${data.due_date.slice(5, 7)}/${data.due_date.slice(0, 4)}` : '';
          prefix = `Fatura ${m}/${y}${dd ? ` (vence ${dd})` : ''} · `;
        }
        setUploadMsg({ type: 'ok', text: `${prefix}${parts.join(' · ')}.` });
        // A fatura pode cair num mês diferente do selecionado (auto-detecção pelo vencimento):
        // pula para o mês em que ela foi lançada para o usuário vê-la.
        if (bm && bm !== selectedMonth) setSelectedMonth(bm);
        else await fetchSicredi();
      } else {
        const err = await r.json().catch(() => ({}));
        setUploadMsg({ type: 'err', text: err.error || 'Erro ao importar arquivo.' });
      }
    } catch { setUploadMsg({ type: 'err', text: 'Falha na conexão.' }); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  // ── Data de pagamento da fatura ──
  const handleSavePaymentDate = async (date: string) => {
    setSicrediSummary(prev => ({ ...prev, payment_date: date || null }));
    try {
      await fetch('/api/fin/bills/sicredi/payment-date', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth, payment_date: date || null }),
      });
    } catch { /* silencioso */ }
  };

  // ── Filtered entries ──
  const filteredEntries = entries.filter(e =>
    (!filterCat || e.category === filterCat) &&
    (entrySubTab === 'paid' ? e.status === 'paid' : e.status !== 'paid' && e.status !== 'cancelled')
  );
  const pendingCount = entries.filter(e => e.status !== 'paid' && e.status !== 'cancelled').length;
  const paidCount = entries.filter(e => e.status === 'paid').length;
  const filteredSicredi = sicrediItems.filter(i => !filterSicrediCat || (i.custom_category || i.grapehub_category) === filterSicrediCat);

  // Group by category for entries
  const entriesByCategory = filteredEntries.reduce((acc, e) => {
    const cat = e.category || 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(e);
    return acc;
  }, {} as Record<string, Entry[]>);

  // Sicredi categories in use
  const sicrediCats = Array.from(new Set(sicrediItems.map(i => i.custom_category || i.grapehub_category).filter(Boolean)));

  // ── Manual link handlers ──
  const openLinkModal = async (entry: Entry) => {
    setLinkModal({ entry, candidates: [], loading: true });
    try {
      const r = await fetch(`/api/fin/bills/entries/${entry.id}/candidates`);
      const data = await r.json();
      setLinkModal({ entry, candidates: data.candidates || [], loading: false });
    } catch {
      setLinkModal(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  const handleManualLink = async (entryId: number, movementId: number) => {
    try {
      const r = await fetch(`/api/fin/bills/entries/${entryId}/link`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movement_id: movementId }),
      });
      if (r.ok) { setLinkModal(null); await fetchEntries(); }
    } catch { /* ignore */ }
  };

  const handleUnlink = async (entryId: number) => {
    if (!confirm('Desvincular este pagamento?')) return;
    try {
      const r = await fetch(`/api/fin/bills/entries/${entryId}/unlink`, { method: 'POST' });
      if (r.ok) await fetchEntries();
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <SplitHeadline text="Contas a" highlight="Pagar" subtitle={`Referência: ${monthLabel}`} subtitleClassName="text-sm text-gray-500 dark:text-gray-400 mt-1" />
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            {/* Tabs */}
            <div className="flex items-center gap-1">
              {([['contas', 'Contas a Pagar', 'violet'], ['sicredi', 'Sicredi', 'emerald']] as const).map(([key, label, color]) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`px-3 py-1.5 text-sm font-bold border-b-2 transition-all ${activeTab === key ? `border-${color}-400 text-${color}-400` : 'border-transparent text-slate-500 hover:text-dark-text'}`}>
                  {label}
                </button>
              ))}
            </div>
            {/* Month nav */}
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 rounded-lg bg-dark-card border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-dark-text transition-colors"><ChevronLeft size={14} /></button>
              <span className="text-xs font-bold text-dark-text bg-dark-card border border-black/10 dark:border-white/10 px-3 py-1.5 rounded-lg min-w-[110px] text-center">{monthLabel}</span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg bg-dark-card border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-dark-text transition-colors"><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-5 pb-10 space-y-5">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ABA: CONTAS A PAGAR */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'contas' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard icon={<AlertTriangle size={16} className="text-white" />} accent="bg-rose-600"
                label="Vence em 7 dias" value={String(entrySummary.vence_7_dias)}
                sub={entrySummary.vence_7_dias > 0 ? 'Atenção!' : 'Nenhum'} subColor={entrySummary.vence_7_dias > 0 ? 'text-rose-400' : 'text-slate-500'} />
              <KpiCard icon={<DollarSign size={16} className="text-white" />} accent="bg-violet-600"
                label="Total Previsto" value={fmtBRL(entrySummary.total_previsto)}
                sub={`${entrySummary.total} contas`} subColor="text-violet-400" />
              <KpiCard icon={<CheckCircle2 size={16} className="text-white" />} accent="bg-emerald-600"
                label="Pago" value={fmtBRL(entrySummary.total_pago)}
                sub={entrySummary.total_previsto > 0 ? `${Math.round((entrySummary.total_pago / entrySummary.total_previsto) * 100)}% do total` : '—'} subColor="text-emerald-400" />
              <KpiCard icon={<Clock size={16} className="text-white" />} accent="bg-amber-600"
                label="A Pagar" value={fmtBRL(entrySummary.total_pendente)}
                sub={monthLabel} subColor="text-amber-400" />
            </div>

            {/* Sub-tabs A pagar / Pagos */}
            <div className="flex items-center gap-1 border-b border-black/10 dark:border-white/10">
              {([['pending', 'A Pagar', pendingCount, 'amber'], ['paid', 'Pagos', paidCount, 'emerald']] as const).map(([key, label, count, color]) => (
                <button key={key} onClick={() => setEntrySubTab(key)}
                  className={`pb-2.5 px-1 text-sm font-bold border-b-2 transition-all -mb-px flex items-center gap-2 ${
                    entrySubTab === key ? `border-${color}-400 text-${color}-400` : 'border-transparent text-slate-500 hover:text-dark-text'
                  }`}>
                  {label}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    entrySubTab === key ? `bg-${color}-500/15 text-${color}-400` : 'bg-white/5 text-slate-500'
                  }`}>{count}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                  className="bg-dark-card border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-dark-text focus:outline-none hover:border-white/20">
                  <option value="">Todas categorias</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => setShowBillsConfig(!showBillsConfig)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-dark-card text-xs text-slate-400 hover:text-dark-text hover:border-white/20 transition-colors">
                  <Receipt size={13} /> Contas Cadastradas
                </button>
              </div>
              <button onClick={() => setBillModal({})}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors">
                <Plus size={14} /> Nova Conta
              </button>
            </div>

            {/* Bills config modal */}
            <AnimatePresence>
              {showBillsConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && setShowBillsConfig(false)}>
                <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
                  className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
                  <div className="px-5 py-3 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <Receipt size={15} className="text-violet-400" />
                      <p className="text-sm font-bold text-dark-text">Contas Cadastradas</p>
                      <span className="text-[10px] text-slate-500">{bills.filter(b => b.recurrence !== 'once').length} contas</span>
                    </div>
                    <button onClick={() => setShowBillsConfig(false)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-dark-text transition-colors"><X size={16} /></button>
                  </div>
                  {bills.filter(b => b.recurrence !== 'once').length === 0 ? (
                    <div className="px-5 py-8 text-center text-slate-500 text-sm">Nenhuma conta cadastrada.</div>
                  ) : (
                    <div className="divide-y divide-black/5 dark:divide-white/5 overflow-y-auto">
                      {/* Column header */}
                      <div className="flex items-center px-5 py-2 bg-dark-bg/30 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span className="flex-1">Nome</span>
                        <span className="w-32 shrink-0">Vencimento</span>
                        <span className="w-36 shrink-0">Valor</span>
                        <span className="w-20 shrink-0"></span>
                      </div>
                      {bills.filter(b => b.recurrence !== 'once').map(b => {
                        return (
                          <div key={b.id} className="flex items-center px-5 py-3 hover:bg-black/[0.03] dark:hover:bg-white/3 transition-colors">
                            <div className="flex-1 min-w-0 pr-3">
                              <p className="text-sm font-semibold text-dark-text break-words leading-tight">{b.name}</p>
                              <p className="text-[10px] text-slate-500">
                                <CatDot cat={b.category} />{b.category} · {RECURRENCE_LABELS[b.recurrence] || b.recurrence}
                              </p>
                            </div>
                            <div className="w-32 shrink-0">
                              {b.recurrence === 'monthly' && b.due_day ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[11px] font-bold whitespace-nowrap">
                                  <Calendar size={10} />
                                  Dia {b.due_day}
                                </span>
                              ) : b.recurrence === 'once' && b.due_date ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold whitespace-nowrap">
                                  <Calendar size={10} />
                                  {fmtDate(b.due_date)}
                                </span>
                              ) : b.recurrence === 'yearly' && b.due_date ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[11px] font-bold whitespace-nowrap">
                                  <Calendar size={10} />
                                  {fmtDate(b.due_date).slice(0, 5)}
                                </span>
                              ) : b.recurrence === 'weekly' && b.due_day ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-bold whitespace-nowrap">
                                  <Calendar size={10} />
                                  Dia {b.due_day} (Semanal)
                                </span>
                              ) : b.due_day ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[11px] font-bold whitespace-nowrap">
                                  <Calendar size={10} />
                                  Dia {b.due_day}
                                </span>
                              ) : b.due_date ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold whitespace-nowrap">
                                  <Calendar size={10} />
                                  {fmtDate(b.due_date)}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-600">—</span>
                              )}
                            </div>
                            <div className="w-36 shrink-0">
                              <p className="text-sm font-bold text-dark-text">{b.value ? fmtBRL(Number(b.value)) : 'Variável'}</p>
                            </div>
                            <div className="w-20 shrink-0 flex items-center gap-2 justify-end">
                              <button onClick={() => setBillModal(b)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-dark-text transition-colors"><Pencil size={13} /></button>
                              <button onClick={() => handleDeleteBill(b.id)} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Entries table in a single unified list layout (resembling the second screenshot) */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl py-16 flex flex-col items-center gap-3">
                <Receipt size={32} className="text-slate-600" />
                <p className="text-sm text-slate-500">Nenhuma conta prevista para {monthLabel}.</p>
                <button onClick={() => setBillModal({})} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold mt-1">
                  <Plus size={13} /> Adicionar Conta
                </button>
              </div>
            ) : (
              <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-black/10 dark:border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-dark-bg/25">
                      <th className="px-4 py-2.5">Conta</th>
                      <th className="px-4 py-2.5">Valor</th>
                      <th className="px-4 py-2.5">Categoria</th>
                      <th className="px-4 py-2.5">Recorrência</th>
                      <th className="px-4 py-2.5">Vencimento</th>
                      <th className="px-4 py-2.5 text-right">Status / Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {filteredEntries.map((entry) => {
                      const isPaid = entry.status === 'paid';
                      const value = Number(isPaid && entry.actual_value ? entry.actual_value : entry.expected_value);
                      const catStyle = getCategoryStyles(entry.category || 'Outros');
                      
                      // Recurrence colors/labels
                      const recColors: Record<string, string> = {
                        monthly: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
                        once: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                        yearly: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
                        weekly: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                      };
                      const recStyle = recColors[entry.recurrence || ''] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                      const recLabel = RECURRENCE_LABELS[entry.recurrence || ''] || entry.recurrence || '';

                      const ds = getDueDateStatus(entry.due_date, entry.status);
                      const rowBg = ds === 'overdue'
                        ? 'bg-red-500/5 border-l-2 border-l-red-500/40 hover:bg-red-500/10'
                        : ds === 'today'
                          ? 'bg-emerald-500/5 border-l-2 border-l-emerald-500/40 hover:bg-emerald-500/10'
                          : ds === 'paid'
                            ? 'hover:bg-black/[0.03] dark:hover:bg-white/3'
                            : 'hover:bg-black/[0.03] dark:hover:bg-white/3';

                      return (
                        <tr key={entry.id} className={`transition-colors align-middle ${rowBg}`}>
                          {/* Col 1: Conta */}
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2.5">
                              {/* Circle avatar with Category colors and category icon */}
                              <div className={`w-7 h-7 rounded-full ${catStyle.bg} ${catStyle.text} ${catStyle.border} border flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.02)]`}>
                                {getCategoryIcon(entry.category, 13)}
                              </div>
                              <div 
                                onClick={() => {
                                  const b = bills.find(x => x.id === entry.bill_id);
                                  if (b) setBillModal(b);
                                }}
                                className="min-w-0 cursor-pointer group"
                              >
                                <p className={`text-[13px] font-semibold truncate group-hover:text-violet-400 transition-colors ${isPaid ? 'text-slate-500 line-through group-hover:text-slate-400' : 'text-dark-text'}`}>{entry.bill_name}</p>
                                {isPaid && entry.linked_description ? (
                                  <p className="text-[10px] text-emerald-400/70 truncate mt-0.5" title={entry.linked_description}>
                                    🔗 {entry.linked_description}
                                  </p>
                                ) : entry.notes ? (
                                  <p className="text-[10px] text-slate-500 truncate mt-0.5 group-hover:text-slate-400 transition-colors">{entry.notes}</p>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          {/* Col 2: Valor */}
                          <td className="px-4 py-2 text-[13px] font-bold text-dark-text">
                            {fmtBRL(value)}
                          </td>

                          {/* Col 3: Categoria (Tag/Badge) */}
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                              {entry.category || 'Outros'}
                            </span>
                          </td>

                          {/* Col 4: Recorrência */}
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${recStyle}`}>
                              {recLabel}
                            </span>
                          </td>

                          {/* Col 4: Vencimento */}
                          <td className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                            {fmtDate(entry.due_date)}
                          </td>

                          {/* Col 5: Status / Ações */}
                          <td className="px-4 py-2 text-right">
                            <div className="inline-flex items-center gap-2">
                              <StatusBadge status={entry.status} dueDate={entry.due_date} />
                              {isPaid && entry.linked_movement_id ? (
                                <button onClick={() => handleUnlink(entry.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-rose-600/20 text-slate-500 hover:text-rose-400 text-[10px] font-bold transition-colors border border-black/5 dark:border-white/5 hover:border-rose-500/20"
                                  title="Desvincular do extrato">
                                  <X size={10} /> Desvincular
                                </button>
                              ) : !isPaid && entry.status !== 'cancelled' ? (
                                <>
                                  <button onClick={() => openLinkModal(entry)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-600/15 hover:bg-violet-600/30 text-violet-400 text-[10px] font-bold transition-colors border border-violet-500/20"
                                    title="Vincular manualmente ao extrato">
                                    🔗 Vincular
                                  </button>
                                  <button onClick={() => setPayModal(entry)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-[10px] font-bold transition-colors border border-emerald-500/20">
                                    <Check size={10} /> Pagar
                                  </button>
                                  <button onClick={() => handleDeleteEntry(entry.id)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/25 text-rose-400 text-[10px] font-bold transition-colors border border-rose-500/20"
                                    title="Excluir este lançamento do mês">
                                    <Trash2 size={10} />
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ABA: SICREDI */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'sicredi' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KpiCard icon={<CreditCard size={16} className="text-white" />} accent="bg-emerald-600"
                label="Total da Fatura" value={fmtBRL(sicrediSummary.total)}
                sub={`${sicrediSummary.total_items} lançamentos`} subColor="text-emerald-400" />
              <KpiCard icon={<Tag size={16} className="text-white" />} accent="bg-amber-600"
                label="Categorizados"
                value={sicrediSummary.total_items > 0 ? `${Math.round((sicrediSummary.categorized / sicrediSummary.total_items) * 100)}%` : '0%'}
                sub={`${sicrediSummary.categorized} de ${sicrediSummary.total_items}`} subColor="text-amber-400" />
              <KpiCard icon={<Upload size={16} className="text-white" />} accent="bg-blue-600"
                label="Período" value={monthLabel} sub="Fatura do cartão" subColor="text-blue-400" />
            </div>

            {/* Upload area */}
            <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-bold text-dark-text mb-0.5">Importar Fatura (OFX ou CSV)</p>
                <p className="text-xs text-slate-500">Faça upload do arquivo .ofx ou .csv da fatura exportada pelo Sicredi Internet Banking</p>
                {uploadMsg && (
                  <p className={`text-xs mt-2 font-semibold ${uploadMsg.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>{uploadMsg.text}</p>
                )}
              </div>
              <div className="flex flex-col shrink-0">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pagamento da fatura</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none z-10" />
                  <input
                    type="date"
                    value={sicrediSummary.payment_date || ''}
                    onChange={(e) => handleSavePaymentDate(e.target.value)}
                    className="w-[152px] bg-dark-card border border-black/10 dark:border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-dark-text cursor-pointer transition-colors hover:border-violet-500/40 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/15 dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input ref={fileRef} type="file" accept=".ofx,.OFX,.csv,.CSV" className="hidden" onChange={handleUpload} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? 'Importando...' : 'Upload OFX / CSV'}
                </button>
                <button onClick={fetchSicredi} className="p-2.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-dark-text transition-colors">
                  <RefreshCw size={14} className={sicrediLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Filter */}
            {sicrediItems.length > 0 && (
              <div className="flex items-center gap-2">
                <select value={filterSicrediCat} onChange={e => setFilterSicrediCat(e.target.value)}
                  className="bg-dark-card border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-dark-text focus:outline-none hover:border-white/20">
                  <option value="">Todas categorias</option>
                  {sicrediCats.map(c => <option key={c!} value={c!}>{c}</option>)}
                  <option value="__uncategorized">Sem categoria</option>
                </select>
                <span className="text-xs text-slate-500">{filteredSicredi.length} lançamentos</span>
              </div>
            )}

            {/* Sicredi table */}
            {sicrediLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
              </div>
            ) : sicrediItems.length === 0 ? (
              <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl py-16 flex flex-col items-center gap-3">
                <CreditCard size={32} className="text-slate-600" />
                <p className="text-sm text-slate-500">Nenhum lançamento para {monthLabel}.</p>
                <p className="text-xs text-slate-600">Faça o upload do arquivo OFX ou CSV para importar.</p>
              </div>
            ) : (
              <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="hidden md:grid grid-cols-12 px-5 py-2.5 border-b border-black/5 dark:border-white/5 bg-dark-bg/30">
                  <span className="col-span-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição</span>
                  <span className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categoria</span>
                  <span className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data</span>
                  <span className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Valor</span>
                </div>
                {/* Rows */}
                <div className="divide-y divide-black/5 dark:divide-white/5 max-h-[560px] overflow-y-auto">
                  {(filterSicrediCat === '__uncategorized'
                    ? sicrediItems.filter(i => !i.grapehub_category && !i.custom_category)
                    : filteredSicredi
                  ).map((item, idx) => {
                    const cat = item.custom_category || item.grapehub_category;
                    const desc = item.custom_description || item.description;
                    const isDebit = item.type === -1;
                    return (
                      <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                        className="grid grid-cols-12 items-center px-5 py-3 hover:bg-black/[0.03] dark:hover:bg-white/3 transition-colors gap-2">
                        <div className="col-span-5 min-w-0">
                          <p className="text-sm text-dark-text truncate">{desc}</p>
                          {item.user_comment && <p className="text-[10px] text-slate-500 truncate">{item.user_comment}</p>}
                        </div>
                        <div className="col-span-3">
                          {cat ? (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                              <CatDot cat={cat} />{cat}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600 italic">Sem categoria</span>
                          )}
                        </div>
                        <div className="col-span-2">
                          <span className="text-xs text-slate-400">{fmtDate(item.transaction_date)}</span>
                        </div>
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <span className={`text-sm font-bold ${isDebit ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {isDebit ? '-' : '+'}{fmtBRL(Number(item.value))}
                          </span>
                          <button onClick={() => setSicrediEditItem(item)}
                            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-dark-text transition-colors shrink-0">
                            <Pencil size={11} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {/* Footer total */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-black/10 dark:border-white/10 bg-dark-bg/30">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total de Despesas</span>
                  <span className="text-base font-black text-rose-400">{fmtBRL(sicrediSummary.total)}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {billModal !== undefined && (
          <BillModal bill={billModal} categories={categories} onSave={handleSaveBill} onClose={() => setBillModal(undefined)} />
        )}
        {payModal && <PayModal entry={payModal} onSave={handlePayEntry} onClose={() => setPayModal(null)} />}
        {linkModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setLinkModal(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-dark-text">Vincular ao Extrato</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {linkModal.entry.bill_name} · Previsto: {fmtBRL(Number(linkModal.entry.expected_value))}
                  </p>
                </div>
                <button onClick={() => setLinkModal(null)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-dark-text">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {linkModal.loading ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-violet-500" size={24} /></div>
                ) : linkModal.candidates.length === 0 ? (
                  <p className="text-center text-slate-500 py-12">Nenhum pagamento encontrado no período.</p>
                ) : (
                  linkModal.candidates.map(c => {
                    const isLinked = !!c.linked_bill_entry_id;
                    const valDiff = Math.abs(Number(c.value) - Number(linkModal.entry.expected_value));
                    const pctDiff = Number(linkModal.entry.expected_value) > 0 ? (valDiff / Number(linkModal.entry.expected_value) * 100) : 0;
                    const isExact = pctDiff < 1;
                    const isClose = pctDiff < 5;
                    return (
                      <div key={c.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                          isLinked ? 'border-black/5 dark:border-white/5 opacity-40' : isExact ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10' : isClose ? 'border-amber-500/20 hover:bg-amber-500/5' : 'border-black/5 dark:border-white/5 hover:bg-black/[0.03] dark:hover:bg-white/3'
                        }`}
                        onClick={() => !isLinked && handleManualLink(linkModal.entry.id, c.id)}>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isExact ? 'bg-emerald-500' : isClose ? 'bg-amber-500' : 'bg-white/20'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-dark-text truncate">{c.description || 'Sem descrição'}</p>
                          <p className="text-[10px] text-slate-500">
                            {fmtDate(c.transaction_date)} · {c.transaction_type}
                            {isLinked && ' · Já vinculado'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${isExact ? 'text-emerald-400' : isClose ? 'text-amber-400' : 'text-dark-text'}`}>{fmtBRL(Number(c.value))}</p>
                          {pctDiff > 0 && (
                            <p className={`text-[10px] ${pctDiff < 5 ? 'text-emerald-400/60' : 'text-amber-400/60'}`}>
                              {pctDiff < 1 ? '≈ Exato' : `Δ ${pctDiff.toFixed(1)}%`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        {sicrediEditItem && (
          <SicrediEditModal item={sicrediEditItem} categories={categories} onSave={handleSicrediEdit} onClose={() => setSicrediEditItem(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
