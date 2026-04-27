import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Clock, CreditCard, Zap, FileText, ExternalLink } from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface InvoiceItem {
  id: number;
  asaas_id: string;
  customer_name: string | null;
  customer_cpfcnpj: string | null;
  billing_type: string;
  status: string;
  value: string;
  net_value: string | null;
  due_date: string;
  payment_date: string | null;
  description: string | null;
  invoice_url: string | null;
}

interface MovementItem {
  asaas_id: string;
  transaction_type: string;
  value: string;
  transaction_date: string;
  description: string;
  payment_id: string | null;
}

interface Summary {
  total_recebido: number;
  total_antecipacoes: number;
  total_a_receber: number;
  total_mes: number;
}

// ── Helpers ────────────────────────────────────────────
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return (num || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const extractClientName = (desc: string): string => {
  if (!desc) return '';
  const match = desc.match(/\d+\s+(.+)$/);
  if (match) return match[1].trim();
  const dashIdx = desc.lastIndexOf(' - ');
  if (dashIdx >= 0) return desc.slice(dashIdx + 3).trim();
  return desc;
};

const BILLING_LABELS: Record<string, { label: string; icon: string }> = {
  'PIX': { label: 'Pix', icon: '⚡' },
  'BOLETO': { label: 'Boleto', icon: '📄' },
  'CREDIT_CARD': { label: 'Cartão', icon: '💳' },
  'DEBIT_CARD': { label: 'Débito', icon: '💳' },
  'TRANSFER': { label: 'Transferência', icon: '🏦' },
  'DEPOSIT': { label: 'Depósito', icon: '🏦' },
  'UNDEFINED': { label: 'Outros', icon: '📁' },
};

const TRANSACTION_LABELS: Record<string, string> = {
  'PAYMENT_RECEIVED': 'Cobranças Recebidas',
  'TRANSFER': 'Transferências',
  'RECEIVABLE_ANTICIPATION_GROSS_CREDIT': 'Crédito Antecipação',
  'PAYMENT_FEE_REFUND': 'Reembolso de Taxas',
  'REFUND_RECEIVED': 'Reembolsos',
};

// ── CollapsibleGroup ─────────────────────────────────
const CollapsibleGroup = ({ title, icon, items, total, valueColor, defaultOpen }: {
  title: string;
  icon: string;
  items: { label: string; sublabel?: string; date: string; value: number; badge?: { text: string; bg: string; color: string }; url?: string | null }[];
  total: number;
  valueColor?: string;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || false);

  return (
    <div className="mb-2 border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-dark-card hover:bg-dark-card-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-bold text-dark-text">{title}</span>
          <span className="text-[10px] text-slate-500 font-normal ml-2">{items.length} itens</span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-sm font-bold ${valueColor || 'text-dark-text'}`}>{formatCurrency(total)}</span>
          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>
      {isOpen && (
        <div className="bg-dark-bg p-2 space-y-1 border-t border-white/10">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 hover:bg-dark-card rounded-lg transition-colors">
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-dark-text truncate">{item.label}</span>
                  {item.badge && (
                    <span className={`px-1.5 py-0.5 ${item.badge.bg} ${item.badge.color} text-[9px] font-bold rounded-full shrink-0`}>
                      {item.badge.text}
                    </span>
                  )}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-slate-500">{fmtDate(item.date)}</span>
                  {item.sublabel && <span className="text-[10px] text-slate-500 truncate max-w-[280px]">{item.sublabel}</span>}
                </div>
              </div>
              <span className={`text-xs font-bold ${valueColor || 'text-emerald-400'} ml-4 shrink-0`}>
                {formatCurrency(item.value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────
export default function ContasAReceber() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>({ total_recebido: 0, total_antecipacoes: 0, total_a_receber: 0, total_mes: 0 });
  const [pendentes, setPendentes] = useState<InvoiceItem[]>([]);
  const [vencidos, setVencidos] = useState<InvoiceItem[]>([]);
  const [recebidos, setRecebidos] = useState<MovementItem[]>([]);
  const [antecipacoes, setAntecipacoes] = useState<MovementItem[]>([]);

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
        const res = await fetch(`/api/fin-receivables?month=${selectedMonth}`);
        if (!res.ok) throw new Error('Falha ao carregar');
        const data = await res.json();
        setSummary(data.summary);
        setPendentes(data.a_receber?.pendentes || []);
        setVencidos(data.a_receber?.vencidos || []);
        setRecebidos(data.recebidos || []);
        setAntecipacoes(data.antecipacoes || []);
      } catch (err) {
        console.error('Error fetching contas a receber:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth]);

  // Group invoices (A Receber) by billing_type
  const groupInvoicesByType = (items: InvoiceItem[]) => {
    const grouped: Record<string, { label: string; icon: string; total: number; items: { label: string; sublabel?: string; date: string; value: number; badge?: { text: string; bg: string; color: string }; url?: string | null }[] }> = {};

    for (const inv of items) {
      const bt = inv.billing_type || 'UNDEFINED';
      const meta = BILLING_LABELS[bt] || BILLING_LABELS['UNDEFINED'];
      if (!grouped[bt]) {
        grouped[bt] = { label: meta.label, icon: meta.icon, total: 0, items: [] };
      }
      const valor = parseFloat(inv.value || '0');
      grouped[bt].total += valor;
      grouped[bt].items.push({
        label: inv.customer_name || inv.description || 'Cobrança',
        sublabel: inv.description || undefined,
        date: inv.due_date,
        value: valor,
        badge: { text: meta.label, bg: 'bg-slate-500/15', color: 'text-slate-400' },
        url: inv.invoice_url,
      });
    }
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  };

  // Group movements (Já Recebido) by transaction_type
  const groupMovementsByType = (items: MovementItem[]) => {
    const grouped: Record<string, { label: string; icon: string; total: number; items: { label: string; sublabel?: string; date: string; value: number }[] }> = {};

    for (const mov of items) {
      const tt = mov.transaction_type || 'OTHER';
      const label = TRANSACTION_LABELS[tt] || tt;
      if (!grouped[tt]) {
        grouped[tt] = { label, icon: '💰', total: 0, items: [] };
      }
      const valor = Math.abs(parseFloat(mov.value || '0'));
      grouped[tt].total += valor;
      grouped[tt].items.push({
        label: extractClientName(mov.description),
        sublabel: mov.description !== extractClientName(mov.description) ? mov.description : undefined,
        date: mov.transaction_date,
        value: valor,
      });
    }
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  };

  const pendentesGrouped = groupInvoicesByType(pendentes);
  const vencidosGrouped = groupInvoicesByType(vencidos);
  const recebidosGrouped = groupMovementsByType(recebidos);

  const pendentesTotal = pendentes.reduce((s, i) => s + parseFloat(i.value || '0'), 0);
  const vencidosTotal = vencidos.reduce((s, i) => s + parseFloat(i.value || '0'), 0);
  const antecipTotal = antecipacoes.reduce((s, i) => s + Math.abs(parseFloat(i.value || '0')), 0);

  // Map antecipações into collapsible items
  const antecipItems = antecipacoes.map(item => ({
    label: extractClientName(item.description),
    sublabel: item.description !== extractClientName(item.description) ? item.description : undefined,
    date: item.transaction_date,
    value: Math.abs(parseFloat(item.value || '0')),
  }));

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dark-text">
            Contas a <span className="text-violet-500">Receber</span>
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
              <div className="bg-dark-card border-2 border-amber-500/30 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">A Receber</p>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-2xl font-black text-amber-400">{formatCurrency(summary.total_a_receber)}</h3>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {pendentes.length + vencidos.length} cobranças
                  </span>
                </div>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Já Recebido</p>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-2xl font-black text-emerald-400">{formatCurrency(summary.total_recebido)}</h3>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {recebidos.length} entradas
                  </span>
                </div>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Antecipações</p>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-2xl font-black text-blue-400">{formatCurrency(summary.total_antecipacoes)}</h3>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {antecipacoes.length} antecipado
                  </span>
                </div>
              </div>
              <div className="bg-dark-card border border-violet-500/30 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total do Mês</p>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-violet-400">{formatCurrency(summary.total_mes)}</h3>
                  <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-[10px] font-bold rounded-full uppercase tracking-wider">recebido + antecipado</span>
                </div>
              </div>
            </div>

            {/* ── Two-column layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* LEFT COLUMN — A Receber (Pendentes + Vencidos) */}
              <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-400" />
                    <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">A Receber</h2>
                  </div>
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {pendentes.length + vencidos.length} cobranças
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[600px] p-4">
                  {pendentesGrouped.length === 0 && vencidosGrouped.length === 0 ? (
                    <p className="text-center py-12 text-slate-500">Nenhuma cobrança pendente neste mês.</p>
                  ) : (
                    <>
                      {pendentesGrouped.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2 px-2">Pendentes — {formatCurrency(pendentesTotal)}</p>
                          {pendentesGrouped.map((group, idx) => (
                            <CollapsibleGroup key={`p-${idx}`} title={group.label} icon={group.icon} items={group.items} total={group.total} valueColor="text-amber-400" />
                          ))}
                        </div>
                      )}
                      {vencidosGrouped.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2 px-2">Vencidos — {formatCurrency(vencidosTotal)}</p>
                          {vencidosGrouped.map((group, idx) => (
                            <CollapsibleGroup key={`v-${idx}`} title={group.label} icon={group.icon} items={group.items} total={group.total} valueColor="text-rose-400" />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN — Já Recebido + Antecipações */}
              <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-emerald-400" />
                    <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">Já Recebido</h2>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {recebidos.length + antecipacoes.length} entradas
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[600px] p-4">
                  {recebidosGrouped.length === 0 && antecipItems.length === 0 ? (
                    <p className="text-center py-12 text-slate-500">Nenhum recebimento neste mês.</p>
                  ) : (
                    <>
                      {recebidosGrouped.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 px-2">Recebidos — {formatCurrency(summary.total_recebido)}</p>
                          {recebidosGrouped.map((group, idx) => (
                            <CollapsibleGroup key={`r-${idx}`} title={group.label} icon={group.icon} items={group.items} total={group.total} valueColor="text-emerald-400" />
                          ))}
                        </div>
                      )}
                      {antecipItems.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 px-2">Antecipações — {formatCurrency(antecipTotal)}</p>
                          <CollapsibleGroup title="Antecipações Asaas" icon="⚡" items={antecipItems} total={antecipTotal} valueColor="text-blue-400" />
                        </div>
                      )}
                    </>
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
