import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, CheckCircle2, Clock, AlertTriangle, X, Upload,
  RefreshCw, ChevronDown, ChevronLeft, ChevronRight, BarChart2, CreditCard,
  Receipt, Tag, Calendar, DollarSign, FileText, Check, Loader2
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

// ── Category Dot ─────────────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  'Salários': 'bg-violet-500', 'Aluguel': 'bg-amber-500', 'Software': 'bg-blue-500',
  'Marketing': 'bg-pink-500', 'Impostos': 'bg-rose-500', 'Serviços': 'bg-teal-500',
  'Fornecedores': 'bg-orange-500', 'Utilidades': 'bg-cyan-500', 'Equipamentos': 'bg-indigo-500',
  'Outros': 'bg-slate-500',
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
        className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl mx-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-white">{form.id ? 'Editar Conta' : 'Nova Conta'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Nome *</label>
            <input value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Ex: Aluguel escritório"
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Categoria</label>
              <select value={form.category || 'Outros'} onChange={e => set('category', e.target.value)}
                className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50">
                {allCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => setShowNewCat(!showNewCat)} className="text-[10px] text-violet-400 mt-1 hover:underline">+ Nova categoria</button>
              {showNewCat && (
                <input value={newCat} onChange={e => { setNewCat(e.target.value); set('category', e.target.value); }}
                  placeholder="Nome da categoria" className="mt-1 w-full bg-dark-bg border border-violet-500/40 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none" />
              )}
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Recorrência</label>
              <select value={form.recurrence || 'monthly'} onChange={e => set('recurrence', e.target.value as any)}
                className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50">
                {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Valor (R$)</label>
              <input type="number" step="0.01" value={form.value || ''} onChange={e => set('value', e.target.value)} placeholder="0,00"
                className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
            </div>
            {form.recurrence === 'monthly' && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Dia de Vencimento</label>
                <input type="number" min={1} max={31} value={form.due_day || ''} onChange={e => set('due_day', Number(e.target.value))} placeholder="Ex: 10"
                  className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
              </div>
            )}
            {(form.recurrence === 'once' || form.recurrence === 'yearly') && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Data de Vencimento</label>
                <input type="date" value={form.due_date || ''} onChange={e => set('due_date', e.target.value)}
                  className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50" />
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Observações</label>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Opcional"
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-violet-500/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-semibold hover:bg-white/5">Cancelar</button>
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
        className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-sm p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Marcar como Pago</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"><X size={14} /></button>
        </div>
        <p className="text-xs text-slate-400 mb-4">{entry.bill_name}</p>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Valor Pago (R$)</label>
            <input type="number" step="0.01" value={val} onChange={e => setVal(e.target.value)}
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Data de Pagamento</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-semibold hover:bg-white/5">Cancelar</button>
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
        className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-sm p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Editar Lançamento</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"><X size={14} /></button>
        </div>
        <p className="text-[10px] text-slate-500 mb-4 truncate">{item.description}</p>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Descrição Personalizada</label>
            <input value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Categoria</label>
            <select value={cat} onChange={e => setCat(e.target.value)}
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50">
              <option value="">— Sem categoria —</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Observação</label>
            <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Opcional"
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-semibold hover:bg-white/5">Cancelar</button>
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
  <div className={`bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col gap-3 hover:border-white/20 transition-all duration-200`}>
    <div className="flex items-center justify-between">
      <div className={`p-2 rounded-xl ${accent || 'bg-violet-600'}`}>{icon}</div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
    <div>
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
      {sub && <p className={`text-xs mt-1 font-semibold ${subColor || 'text-slate-500'}`}>{sub}</p>}
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

  const handlePayEntry = async (id: number, data: any) => {
    const r = await fetch(`/api/fin/bills/entries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (r.ok) await fetchEntries();
  };

  const handleSicrediEdit = async (id: number, data: any) => {
    const r = await fetch(`/api/fin/bills/sicredi/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (r.ok) await fetchSicredi();
  };

  // ── OFX Upload ──
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('account', 'sicredi');
      form.append('billingMonth', selectedMonth);
      const r = await fetch('/api/fin/movements/upload', { method: 'POST', body: form });
      if (r.ok) {
        const data = await r.json();
        setUploadMsg({ type: 'ok', text: `${data.inserted ?? data.count ?? 0} lançamentos importados com sucesso.` });
        await fetchSicredi();
      } else {
        const err = await r.json().catch(() => ({}));
        setUploadMsg({ type: 'err', text: err.error || 'Erro ao importar arquivo.' });
      }
    } catch { setUploadMsg({ type: 'err', text: 'Falha na conexão.' }); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
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
        <div className="flex items-start justify-between">
          <SplitHeadline text="Contas a" highlight="Pagar" subtitle={`REFERÊNCIA: ${monthLabel.toUpperCase()}`} />
          <div className="flex items-center gap-2 mt-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg bg-dark-card border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><ChevronLeft size={14} /></button>
            <span className="text-xs font-bold text-white bg-dark-card border border-white/10 px-3 py-1.5 rounded-lg min-w-[110px] text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg bg-dark-card border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="px-6">
        <div className="flex items-center gap-1 border-b border-white/10">
          {([['contas', 'Contas a Pagar', 'violet'], ['sicredi', 'Sicredi', 'emerald']] as const).map(([key, label, color]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px ${activeTab === key ? `border-${color}-400 text-${color}-400` : 'border-transparent text-slate-500 hover:text-white'}`}>
              {label}
            </button>
          ))}
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
            <div className="flex items-center gap-1 border-b border-white/10">
              {([['pending', 'A Pagar', pendingCount, 'amber'], ['paid', 'Pagos', paidCount, 'emerald']] as const).map(([key, label, count, color]) => (
                <button key={key} onClick={() => setEntrySubTab(key)}
                  className={`pb-2.5 px-1 text-sm font-bold border-b-2 transition-all -mb-px flex items-center gap-2 ${
                    entrySubTab === key ? `border-${color}-400 text-${color}-400` : 'border-transparent text-slate-500 hover:text-white'
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
                  className="bg-dark-card border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none hover:border-white/20">
                  <option value="">Todas categorias</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => setShowBillsConfig(!showBillsConfig)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-dark-card text-xs text-slate-400 hover:text-white hover:border-white/20 transition-colors">
                  <Receipt size={13} /> Contas Cadastradas
                </button>
                <button onClick={async () => {
                  try {
                    const r = await fetch('/api/fin/bills/reconcile', { method: 'POST' });
                    const data = await r.json();
                    if (data.matched > 0) { await fetchEntries(); }
                    alert(data.matched > 0 ? `✅ ${data.matched} conta(s) vinculada(s) ao extrato!` : 'Nenhum novo vínculo encontrado.');
                  } catch { alert('Erro na reconciliação.'); }
                }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-violet-500/30 bg-violet-600/10 text-xs text-violet-400 hover:bg-violet-600/20 hover:text-violet-300 transition-colors">
                  <RefreshCw size={13} /> Reconciliar
                </button>
              </div>
              <button onClick={() => setBillModal({})}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors">
                <Plus size={14} /> Nova Conta
              </button>
            </div>

            {/* Bills config panel */}
            <AnimatePresence>
              {showBillsConfig && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <p className="text-xs font-bold text-white">Contas Recorrentes Cadastradas</p>
                    <span className="text-[10px] text-slate-500">{bills.length} contas</span>
                  </div>
                  {bills.length === 0 ? (
                    <div className="px-5 py-8 text-center text-slate-500 text-sm">Nenhuma conta cadastrada.</div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {bills.map(b => (
                        <div key={b.id} className="flex items-center px-5 py-3 hover:bg-white/3 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{b.name}</p>
                            <p className="text-[10px] text-slate-500">
                              <CatDot cat={b.category} />{b.category} · {RECURRENCE_LABELS[b.recurrence] || b.recurrence}
                              {b.due_day ? ` · Todo dia ${b.due_day}` : ''}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-white mr-4">{b.value ? fmtBRL(Number(b.value)) : 'Variável'}</p>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setBillModal(b)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><Pencil size={13} /></button>
                            <button onClick={() => handleDeleteBill(b.id)} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Entries table grouped by category */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="bg-dark-card border border-white/10 rounded-2xl py-16 flex flex-col items-center gap-3">
                <Receipt size={32} className="text-slate-600" />
                <p className="text-sm text-slate-500">Nenhuma conta prevista para {monthLabel}.</p>
                <button onClick={() => setBillModal({})} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold mt-1">
                  <Plus size={13} /> Adicionar Conta
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(entriesByCategory).map(([cat, catEntries]) => (
                  <div key={cat} className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
                    {/* Category header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-dark-bg/30">
                      <div className="flex items-center gap-2">
                        <CatDot cat={cat} />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{cat}</span>
                        <span className="text-[10px] text-slate-500">{catEntries.length} conta{catEntries.length !== 1 ? 's' : ''}</span>
                      </div>
                      <span className="text-xs font-bold text-white">{fmtBRL(catEntries.reduce((s, e) => s + Number(e.expected_value || 0), 0))}</span>
                    </div>
                    {/* Rows */}
                    <div className="divide-y divide-white/5">
                      {catEntries.map((entry, idx) => {
                        const isPaid = entry.status === 'paid';
                        return (
                          <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                            className="flex items-center px-5 py-3.5 hover:bg-white/3 transition-colors gap-3">
                            {/* Paid indicator */}
                            <div className={`w-1 h-8 rounded-full shrink-0 ${isPaid ? 'bg-emerald-500' : getDueDateStatus(entry.due_date, entry.status) === 'overdue' ? 'bg-rose-500' : 'bg-white/10'}`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isPaid ? 'text-slate-400 line-through' : 'text-white'}`}>{entry.bill_name}</p>
                              {isPaid && entry.linked_description ? (
                                <p className="text-[10px] text-emerald-400/70 truncate mt-0.5" title={entry.linked_description}>
                                  🔗 {entry.linked_description}
                                </p>
                              ) : entry.notes ? (
                                <p className="text-[10px] text-slate-500 truncate mt-0.5">{entry.notes}</p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs text-slate-400 hidden md:block">{fmtDate(entry.due_date)}</span>
                              <span className={`text-sm font-bold ${isPaid ? 'text-emerald-400' : 'text-white'}`}>{fmtBRL(Number(isPaid && entry.actual_value ? entry.actual_value : entry.expected_value))}</span>
                              <StatusBadge status={entry.status} dueDate={entry.due_date} />
                              {isPaid && entry.linked_movement_id ? (
                                <button onClick={() => handleUnlink(entry.id)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-rose-600/20 text-slate-500 hover:text-rose-400 text-[10px] font-bold transition-colors border border-white/5 hover:border-rose-500/20"
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
                                </>
                              ) : null}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
            <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-bold text-white mb-0.5">Importar Fatura OFX</p>
                <p className="text-xs text-slate-500">Faça upload do arquivo .ofx exportado pelo Sicredi Internet Banking</p>
                {uploadMsg && (
                  <p className={`text-xs mt-2 font-semibold ${uploadMsg.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>{uploadMsg.text}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input ref={fileRef} type="file" accept=".ofx,.OFX" className="hidden" onChange={handleUpload} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? 'Importando...' : 'Upload OFX'}
                </button>
                <button onClick={fetchSicredi} className="p-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                  <RefreshCw size={14} className={sicrediLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Filter */}
            {sicrediItems.length > 0 && (
              <div className="flex items-center gap-2">
                <select value={filterSicrediCat} onChange={e => setFilterSicrediCat(e.target.value)}
                  className="bg-dark-card border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none hover:border-white/20">
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
              <div className="bg-dark-card border border-white/10 rounded-2xl py-16 flex flex-col items-center gap-3">
                <CreditCard size={32} className="text-slate-600" />
                <p className="text-sm text-slate-500">Nenhum lançamento para {monthLabel}.</p>
                <p className="text-xs text-slate-600">Faça o upload do arquivo OFX para importar.</p>
              </div>
            ) : (
              <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="hidden md:grid grid-cols-12 px-5 py-2.5 border-b border-white/5 bg-dark-bg/30">
                  <span className="col-span-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição</span>
                  <span className="col-span-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categoria</span>
                  <span className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data</span>
                  <span className="col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Valor</span>
                </div>
                {/* Rows */}
                <div className="divide-y divide-white/5 max-h-[560px] overflow-y-auto">
                  {(filterSicrediCat === '__uncategorized'
                    ? sicrediItems.filter(i => !i.grapehub_category && !i.custom_category)
                    : filteredSicredi
                  ).map((item, idx) => {
                    const cat = item.custom_category || item.grapehub_category;
                    const desc = item.custom_description || item.description;
                    const isDebit = item.type === -1;
                    return (
                      <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                        className="grid grid-cols-12 items-center px-5 py-3 hover:bg-white/3 transition-colors gap-2">
                        <div className="col-span-5 min-w-0">
                          <p className="text-sm text-white truncate">{desc}</p>
                          {item.user_comment && <p className="text-[10px] text-slate-500 truncate">{item.user_comment}</p>}
                        </div>
                        <div className="col-span-3">
                          {cat ? (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
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
                            className="p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors shrink-0">
                            <Pencil size={11} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {/* Footer total */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-dark-bg/30">
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
              className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Vincular ao Extrato</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {linkModal.entry.bill_name} · Previsto: {fmtBRL(Number(linkModal.entry.expected_value))}
                  </p>
                </div>
                <button onClick={() => setLinkModal(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white">
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
                          isLinked ? 'border-white/5 opacity-40' : isExact ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10' : isClose ? 'border-amber-500/20 hover:bg-amber-500/5' : 'border-white/5 hover:bg-white/3'
                        }`}
                        onClick={() => !isLinked && handleManualLink(linkModal.entry.id, c.id)}>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isExact ? 'bg-emerald-500' : isClose ? 'bg-amber-500' : 'bg-white/20'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{c.description || 'Sem descrição'}</p>
                          <p className="text-[10px] text-slate-500">
                            {fmtDate(c.transaction_date)} · {c.transaction_type}
                            {isLinked && ' · Já vinculado'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${isExact ? 'text-emerald-400' : isClose ? 'text-amber-400' : 'text-white'}`}>{fmtBRL(Number(c.value))}</p>
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
