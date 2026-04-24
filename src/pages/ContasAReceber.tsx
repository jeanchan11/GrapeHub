import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Clock, CreditCard, FileText } from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface ReceivableItem {
  asaas_id: string;
  transaction_type: string;
  value: string;
  transaction_date: string;
  description: string;
  balance: string;
  payment_id: string | null;
}

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
}

interface Summary {
  total_recebido: number;
  total_antecipacoes: number;
  total_a_receber: number;
  total_recebido_invoices: number;
  total_mes: number;
  saldo_final: number;
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

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  'Pendente': { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Pendente' },
  'Confirmado': { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Confirmado' },
  'Recebido': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'Recebido' },
};

// ── CollapsibleGroup ─────────────────────────────────
const CollapsibleGroup = ({ title, icon, items, total, valueColor }: {
  title: string;
  icon: string;
  items: { label: string; sublabel?: string; date: string; value: number; badge?: { text: string; bg: string; color: string } }[];
  total: number;
  valueColor?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

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
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-slate-500">{fmtDate(item.date)}</span>
                  {item.sublabel && <span className="text-[10px] text-slate-500 truncate max-w-[280px]">{item.sublabel}</span>}
                </div>
              </div>
              <span className={`text-xs font-bold ${valueColor || 'text-emerald-400'} ml-4 shrink-0`}>
                {valueColor?.includes('amber') ? '' : '+'}{formatCurrency(item.value)}
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
  const [summary, setSummary] = useState<Summary>({ total_recebido: 0, total_antecipacoes: 0, total_a_receber: 0, total_recebido_invoices: 0, total_mes: 0, saldo_final: 0 });
  const [cobracoes, setCobracoes] = useState<ReceivableItem[]>([]);
  const [antecipacoes, setAntecipacoes] = useState<ReceivableItem[]>([]);
  const [invoicesPendentes, setInvoicesPendentes] = useState<InvoiceItem[]>([]);
  const [invoicesConfirmados, setInvoicesConfirmados] = useState<InvoiceItem[]>([]);
  const [invoicesRecebidos, setInvoicesRecebidos] = useState<InvoiceItem[]>([]);

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
        setCobracoes(data.cobracoes_recebidas || []);
        setAntecipacoes(data.antecipacoes || []);
        setInvoicesPendentes(data.invoices?.pendentes || []);
        setInvoicesConfirmados(data.invoices?.confirmados || []);
        setInvoicesRecebidos(data.invoices?.recebidos || []);
      } catch (err) {
        console.error('Error fetching contas a receber:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth]);

  // Map movements into collapsible items
  const mapMovItems = (items: ReceivableItem[]) =>
    items.map(item => ({
      label: extractClientName(item.description),
      sublabel: item.description !== extractClientName(item.description) ? item.description : undefined,
      date: item.transaction_date,
      value: Math.abs(parseFloat(item.value || '0')),
    }));

  // Map invoices into collapsible items grouped by billing_type
  const groupInvoicesByType = (items: InvoiceItem[]) => {
    const grouped: Record<string, { label: string; icon: string; total: number; items: { label: string; sublabel?: string; date: string; value: number; badge?: { text: string; bg: string; color: string } }[] }> = {};

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
        badge: inv.billing_type ? { text: meta.label, bg: 'bg-slate-500/15', color: 'text-slate-400' } : undefined,
      });
    }
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  };

  const cobracoesItems = mapMovItems(cobracoes);
  const antecipItems = mapMovItems(antecipacoes);
  const cobracoesTotal = cobracoesItems.reduce((s, i) => s + i.value, 0);
  const antecipTotal = antecipItems.reduce((s, i) => s + i.value, 0);

  const pendentesGrouped = groupInvoicesByType(invoicesPendentes);
  const confirmadosGrouped = groupInvoicesByType(invoicesConfirmados);
  const recebidosGrouped = groupInvoicesByType(invoicesRecebidos);

  const pendentesTotal = invoicesPendentes.reduce((s, i) => s + parseFloat(i.value || '0'), 0);
  const confirmadosTotal = invoicesConfirmados.reduce((s, i) => s + parseFloat(i.value || '0'), 0);
  const recebidosTotal = invoicesRecebidos.reduce((s, i) => s + parseFloat(i.value || '0'), 0);

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
            {/* KPI Cards — row 1: summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Já Recebido</p>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-2xl font-black text-dark-text">{formatCurrency(summary.total_recebido)}</h3>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">recebido</span>
                </div>
              </div>
              <div className="bg-dark-card border-2 border-amber-500/30 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">A Receber</p>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-2xl font-black text-amber-400">{formatCurrency(summary.total_a_receber)}</h3>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider">pendente</span>
                </div>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Antecipações</p>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-2xl font-black text-dark-text">{formatCurrency(summary.total_antecipacoes)}</h3>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wider">antecipado</span>
                </div>
              </div>
              <div className="bg-dark-card border border-violet-500/30 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total do Mês</p>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-violet-400">{formatCurrency(summary.total_mes)}</h3>
                  <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-[10px] font-bold rounded-full uppercase tracking-wider">geral</span>
                </div>
              </div>
            </div>

            {/* ── Two-column layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* LEFT COLUMN — A Receber (Pendentes + Confirmados) */}
              <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-400" />
                    <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">A Receber</h2>
                  </div>
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    {invoicesPendentes.length + invoicesConfirmados.length} cobranças
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[600px] p-4">
                  {pendentesGrouped.length === 0 && confirmadosGrouped.length === 0 ? (
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
                      {confirmadosGrouped.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 px-2">Confirmados — {formatCurrency(confirmadosTotal)}</p>
                          {confirmadosGrouped.map((group, idx) => (
                            <CollapsibleGroup key={`c-${idx}`} title={group.label} icon={group.icon} items={group.items} total={group.total} valueColor="text-blue-400" />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN — Já Recebido (Cobranças + Antecipações + Invoices recebidos) */}
              <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-emerald-400" />
                    <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">Já Recebido</h2>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                    Conciliado
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[600px] p-4">
                  {cobracoesItems.length === 0 && antecipItems.length === 0 && recebidosGrouped.length === 0 ? (
                    <p className="text-center py-12 text-slate-500">Nenhum recebimento neste mês.</p>
                  ) : (
                    <>
                      {cobracoesItems.length > 0 && (
                        <CollapsibleGroup title="Cobranças Recebidas" icon="💰" items={cobracoesItems} total={cobracoesTotal} valueColor="text-emerald-400" />
                      )}
                      {antecipItems.length > 0 && (
                        <CollapsibleGroup title="Antecipações" icon="⚡" items={antecipItems} total={antecipTotal} valueColor="text-emerald-400" />
                      )}
                      {recebidosGrouped.length > 0 && (
                        <div className="mt-2">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 px-2">Cobranças Recebidas (Asaas) — {formatCurrency(recebidosTotal)}</p>
                          {recebidosGrouped.map((group, idx) => (
                            <CollapsibleGroup key={`r-${idx}`} title={group.label} icon={group.icon} items={group.items} total={group.total} valueColor="text-emerald-400" />
                          ))}
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
