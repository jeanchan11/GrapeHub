import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

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

interface Summary {
  total_recebido: number;
  total_antecipacoes: number;
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

/** Extracts client name from descriptions like:
 *  "Cobrança recebida - fatura nr. 685291183 Thiago Paixao Barbosa"
 *  Returns the text after the last number sequence */
const extractClientName = (desc: string): string => {
  if (!desc) return '';
  // Match text after the last number block (e.g. invoice number)
  const match = desc.match(/\d+\s+(.+)$/);
  if (match) return match[1].trim();
  // Fallback: text after " - "
  const dashIdx = desc.lastIndexOf(' - ');
  if (dashIdx >= 0) return desc.slice(dashIdx + 3).trim();
  return desc;
};

// ── CollapsibleGroup ─────────────────────────────────
const CollapsibleGroup = ({ title, icon, items, total }: {
  title: string;
  icon: string;
  items: { description: string; clientName: string; date: string; value: number }[];
  total: number;
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
          <span className="text-sm font-bold text-dark-text">{formatCurrency(total)}</span>
          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>
      {isOpen && (
        <div className="bg-dark-bg p-2 space-y-1 border-t border-white/10">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 hover:bg-dark-card rounded-lg transition-colors">
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-xs font-medium text-dark-text truncate">{item.clientName || item.description}</span>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-slate-500">{fmtDate(item.date)}</span>
                  {item.clientName && item.clientName !== item.description && (
                    <span className="text-[10px] text-slate-500 truncate max-w-[280px]" title={item.description}>{item.description}</span>
                  )}
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 ml-4 shrink-0">+{formatCurrency(item.value)}</span>
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
  const [summary, setSummary] = useState<Summary>({ total_recebido: 0, total_antecipacoes: 0, total_mes: 0, saldo_final: 0 });
  const [cobracoes, setCobracoes] = useState<ReceivableItem[]>([]);
  const [antecipacoes, setAntecipacoes] = useState<ReceivableItem[]>([]);

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
      } catch (err) {
        console.error('Error fetching contas a receber:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth]);

  const mapItems = (items: ReceivableItem[]) =>
    items.map(item => ({
      description: item.description,
      clientName: extractClientName(item.description),
      date: item.transaction_date,
      value: Math.abs(parseFloat(item.value || '0')),
    }));

  const cobracoesItems = mapItems(cobracoes);
  const antecipItems = mapItems(antecipacoes);

  const cobracoesTotal = cobracoesItems.reduce((s, i) => s + i.value, 0);
  const antecipTotal = antecipItems.reduce((s, i) => s + i.value, 0);

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
              <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Recebido</p>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-2xl font-black text-dark-text">{formatCurrency(summary.total_recebido)}</h3>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">recebido</span>
                </div>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Antecipações</p>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-2xl font-black text-dark-text">{formatCurrency(summary.total_antecipacoes)}</h3>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wider">antecipado</span>
                </div>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total do Mês</p>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-2xl font-black text-emerald-400">{formatCurrency(summary.total_mes)}</h3>
                  <span className="px-2 py-0.5 bg-dark-bg text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider border border-white/10">geral</span>
                </div>
              </div>
              <div className="bg-dark-card border border-violet-500/30 rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Saldo Final</p>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-violet-400">{formatCurrency(summary.saldo_final)}</h3>
                  <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-[10px] font-bold rounded-full uppercase tracking-wider">saldo</span>
                </div>
              </div>
            </div>

            {/* Groups */}
            <div className="space-y-4">
              {cobracoesItems.length > 0 && (
                <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">Cobranças Recebidas</h2>
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Recebido</span>
                  </div>
                  <div className="p-4 max-h-[600px] overflow-y-auto">
                    <CollapsibleGroup
                      title="Cobranças Recebidas"
                      icon="💰"
                      items={cobracoesItems}
                      total={cobracoesTotal}
                    />
                  </div>
                </div>
              )}

              {antecipItems.length > 0 && (
                <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">Antecipações</h2>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Antecipado</span>
                  </div>
                  <div className="p-4 max-h-[600px] overflow-y-auto">
                    <CollapsibleGroup
                      title="Antecipações Recebíveis"
                      icon="⚡"
                      items={antecipItems}
                      total={antecipTotal}
                    />
                  </div>
                </div>
              )}

              {cobracoesItems.length === 0 && antecipItems.length === 0 && (
                <div className="bg-dark-card border border-white/10 rounded-2xl p-12 text-center">
                  <p className="text-slate-500">Nenhum recebimento encontrado neste mês.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
