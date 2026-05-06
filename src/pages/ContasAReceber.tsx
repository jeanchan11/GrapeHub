import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Clock, CreditCard, Zap, FileText, ExternalLink, Settings, AlertTriangle, Pause, Play, Check, X, ShieldAlert, Activity, CheckCircle2, Send, Settings2, Search, TrendingUp, Banknote, BarChart2, MessageCircle, Copy } from 'lucide-react';

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
  total_recebidas: number;
  total_confirmadas: number;
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

// ── Collection Rules Block ────────────────────────────
interface Rule {
  id: number;
  day_offset: number;
  phase: string;
  label: string;
  channels: string[];
  message_template: string;
  is_automated: boolean;
  is_active: boolean;
}

interface QueueItem {
  client_name: string;
  value: string | number;
  due_date: string;
  rule_label: string;
  day_offset: number;
  channel: string;
  scheduled_date: string;
  status: string;
  triggered_at: string;
  receivable_asaas_id: string;
  customer_asaas_id: string;
  rule_id: number | null;
  message_template: string | null;
  event_id: number | null;
  invoice_url: string | null;
  row_type: string;
}

interface SummaryData {
  preventivo: number;
  vencimento: number;
  reativo: number;
  humano: number;
}

const CollectionRulesBlock = ({ selectedMonth }: { selectedMonth: string }) => {
  const [summary, setSummary] = useState<SummaryData>({ preventivo: 0, vencimento: 0, reativo: 0, humano: 0 });
  const [rules, setRules] = useState<Rule[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [templateText, setTemplateText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'disparos'>('config');
  const [phaseDetail, setPhaseDetail] = useState<{ phase: string; label: string; items: any[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [queueStats, setQueueStats] = useState({ hoje: 0, ultimos7dias: 0, agendados: 0 });
  const [confettiItems, setConfettiItems] = useState<{ id: number; x: number; y: number }[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [queueSubTab, setQueueSubTab] = useState<'agendados' | 'enviados' | 'humano' | 'suspensao'>('agendados');
  const [queueAll, setQueueAll] = useState<QueueItem[]>([]);

  const buildMessage = (template: string | null, item: QueueItem) => {
    if (!template) return `Olá! Sua fatura de ${formatCurrency(item.value)} vence em ${fmtDate(item.due_date)}. ${item.invoice_url || ''}`;
    const hora = new Date().getHours();
    const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    return template
      .replace(/\\n/g, '\n')
      .replace(/\{\{saudacao\}\}/g, saudacao)
      .replace(/\{\{nome\}\}/g, item.client_name || '')
      .replace(/\{\{valor\}\}/g, formatCurrency(item.value))
      .replace(/\{\{vencimento\}\}/g, fmtDate(item.due_date))
      .replace(/\{\{link\}\}/g, item.invoice_url || '');
  };

  const copyMessage = (item: QueueItem, idx: number) => {
    const msg = buildMessage(item.message_template, item);
    navigator.clipboard.writeText(msg);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const triggerConfetti = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const particles = Array.from({ length: 30 }, (_, i) => ({
      id: Date.now() + i,
      x: rect.left + rect.width / 2,
      y: rect.top,
    }));
    setConfettiItems(particles);
    setTimeout(() => setConfettiItems([]), 2000);
  };

  const markAsSent = async (item: QueueItem, idx: number, e: React.MouseEvent) => {
    triggerConfetti(e);
    // Optimistic update — identify by unique key, not index
    const updateFn = (q: QueueItem) =>
      q.receivable_asaas_id === item.receivable_asaas_id && q.rule_id === item.rule_id
        ? { ...q, status: 'sent' as const }
        : q;
    setQueue(prev => prev.map(updateFn));
    setQueueAll(prev => prev.map(updateFn));
    setQueueStats(prev => ({ ...prev, hoje: prev.hoje + 1, agendados: Math.max(0, prev.agendados - 1) }));
    try {
      const msg = buildMessage(item.message_template, item);
      await fetch('/api/fin/collection/events/mark-sent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_id: item.rule_id,
          receivable_asaas_id: item.receivable_asaas_id,
          customer_asaas_id: item.customer_asaas_id,
          event_id: item.event_id,
          client_name: item.client_name,
          value: item.value,
          due_date: item.due_date,
          rule_label: item.rule_label,
          message: msg,
        }),
      });
    } catch { /* silent */ }
  };  const phaseLabels: Record<string, string> = { preventivo: 'Em Preventivo', vencimento: 'No Vencimento', reativo: 'Em Atraso', humano: 'Contato Humano' };

  const openPhaseDetail = async (phase: string) => {
    setLoadingDetail(true);
    setPhaseDetail({ phase, label: phaseLabels[phase] || phase, items: [] });
    try {
      const res = await fetch(`/api/fin/collection/summary/${phase}`);
      if (res.ok) {
        const items = await res.json();
        setPhaseDetail({ phase, label: phaseLabels[phase] || phase, items });
      }
    } catch (err) {
      console.error('Error fetching phase detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sumRes, rulesRes, queueRes, statsRes] = await Promise.all([
          fetch('/api/fin/collection/summary'),
          fetch('/api/fin/collection/rules'),
          fetch(`/api/fin/collection/events/queue?month=${selectedMonth}`),
          fetch(`/api/fin/collection/events/stats?month=${selectedMonth}`),
        ]);
        if (sumRes.ok) setSummary(await sumRes.json());
        if (rulesRes.ok) setRules(await rulesRes.json());
        if (queueRes.ok) setQueue(await queueRes.json());
        if (statsRes.ok) setQueueStats(await statsRes.json());
        // Fetch all queue items (no month filter) for Contato Humano and Suspensão tabs
        const allQueueRes = await fetch('/api/fin/collection/events/queue?all=true');
        if (allQueueRes.ok) setQueueAll(await allQueueRes.json());
      } catch (err) {
        console.error('Error fetching collection data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth]);

  const hoje = new Date().toISOString().split('T')[0];
  const disparosHoje = queueStats.hoje;
  const concluidos = queueStats.ultimos7dias;
  const pendentes = queueStats.agendados;

  const filteredQueue = queue.filter(q => 
    !searchTerm || q.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const queueAgendados = filteredQueue.filter(q => (q.status === 'pending' || q.status === 'manual') && q.day_offset < 10);
  const queueEnviados = filteredQueue.filter(q => q.status === 'sent' || q.status === 'failed');
  // Humano e Suspensão: sem filtro de mês, usam queueAll
  const filteredQueueAll = queueAll.filter(q => !searchTerm || q.client_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const queueHumano = filteredQueueAll.filter(q => (q.status === 'pending' || q.status === 'manual') && q.day_offset >= 10 && q.day_offset < 15);
  const queueSuspensao = filteredQueueAll.filter(q => (q.status === 'pending' || q.status === 'manual') && q.day_offset >= 15);

  const handleToggleRule = async (id: number) => {
    try {
      setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
      const res = await fetch(`/api/fin/collection/rules/${id}/toggle`, { method: 'PATCH' });
      if (!res.ok) {
        setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
      }
    } catch (err) {
      console.error('Failed to toggle rule', err);
    }
  };

  const handleSaveMessage = async () => {
    if (!editingRule) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/fin/collection/rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingRule, message_template: templateText })
      });
      if (!res.ok) throw new Error('Failed to update rule');
      const updated = await res.json();
      setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
      setEditingRule(null);
    } catch (err) {
      console.error('Failed to save message template:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const renderPreview = (text: string) => {
    if (!text) return "Nenhuma mensagem configurada para esta etapa.";
    return text
      .replace(/\\n/g, '\n')
      .replace(/\{\{saudacao\}\}/g, 'Boa tarde')
      .replace(/\{\{nome\}\}/g, 'Maria Silva')
      .replace(/\{\{valor\}\}/g, 'R$ 1.500,00')
      .replace(/\{\{vencimento\}\}/g, '15/05/2026')
      .replace(/\{\{link\}\}/g, 'https://pagamento.asaas.com/exemplo');
  };

  const timelineStyles: Record<string, { bg: string, border: string, text: string, pillBg: string, iconColor: string }> = {
    preventivo: {
      bg: 'bg-[#2dd4bf]/10 dark:bg-[#2dd4bf]/5', border: 'border-[#2dd4bf]/30', text: 'text-teal-600 dark:text-[#2dd4bf]', pillBg: 'bg-[#2dd4bf]/10', iconColor: 'bg-teal-500 dark:bg-[#2dd4bf]'
    },
    vencimento: {
      bg: 'bg-[#f59e0b]/10 dark:bg-[#f59e0b]/5', border: 'border-[#f59e0b]/30', text: 'text-amber-600 dark:text-[#f59e0b]', pillBg: 'bg-[#f59e0b]/10', iconColor: 'bg-amber-500 dark:bg-[#f59e0b]'
    },
    reativo: {
      bg: 'bg-[#f87171]/10 dark:bg-[#f87171]/5', border: 'border-[#f87171]/30', text: 'text-rose-600 dark:text-[#f87171]', pillBg: 'bg-[#f87171]/10', iconColor: 'bg-rose-500 dark:bg-[#f87171]'
    },
    humano: {
      bg: 'bg-[#a78bfa]/10 dark:bg-[#a78bfa]/5', border: 'border-[#a78bfa]/30', text: 'text-violet-600 dark:text-[#a78bfa]', pillBg: 'bg-[#a78bfa]/10', iconColor: 'bg-violet-500 dark:bg-[#a78bfa]'
    },
  };

  const getExtraBadge = (day: number) => {
    if (day === 2) return 'Sem multa ainda';
    if (day === 5) return 'Multa aplicada';
    if (day === 10) return 'Intervenção humana';
    if (day === 15) return 'Decisão final';
    return null;
  };

  const getRuleDescription = (day: number, template: string) => {
    if (day === -5) return "Aviso amigável: fatura vence em 5 dias. Valor, vencimento e link do boleto/Pix.";
    if (day === -2) return "Tom levemente mais direto. Reforça valor + link + forma de pagamento preferida.";
    if (day === 0) return 'Notificação direta: "Sua fatura vence hoje." Pix em destaque + link do boleto.';
    if (day === 2) return 'Tom empático: "Percebemos que ainda não identificamos seu pagamento." Link para regularizar.';
    if (day === 5) return 'Informa multa e juros. Valor atualizado. Sugere contato para acordo.';
    if (day === 10) return 'Mensagem manual do responsável comercial. Abre espaço para acordo, parcelamento ou entender o motivo do não pagamento.';
    if (day === 15) return 'Serviço pausado. Humano decide: renegociar, suspender ou encerrar o contrato.';
    return template ? (template.length > 80 ? template.slice(0, 80) + '...' : template) : 'Mensagem automática de cobrança.';
  };

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-white/10 rounded-2xl p-6 mt-6 shadow-sm dark:shadow-none">
      {/* 1. Header (Tabs) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 dark:border-white/10 pb-4">
        <div className="flex items-center gap-6">
          <Activity size={20} className="text-violet-500 hidden sm:block" />
          <button 
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 pb-4 -mb-[17px] border-b-2 font-bold text-sm transition-colors ${activeTab === 'config' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <Settings2 size={16} />
            Régua de Cobrança
          </button>
          <button 
            onClick={() => setActiveTab('disparos')}
            className={`flex items-center gap-2 pb-4 -mb-[17px] border-b-2 font-bold text-sm transition-colors ${activeTab === 'disparos' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <Send size={16} />
            Fila de Disparos
          </button>
        </div>
        
        {activeTab === 'config' && (
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 text-[10px] font-bold rounded-full uppercase tracking-widest flex items-center gap-1">
              <CheckCircle2 size={10} /> Ativa
            </span>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-medium text-gray-600 dark:text-slate-300 transition-colors">
              <Settings size={14} /> Editar Régua
            </button>
          </div>
        )}
        {activeTab === 'disparos' && (
          <div className="flex items-center gap-3">
             <div className="relative">
               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar cliente..." className="pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/50" />
             </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Aba CONFIGURAÇÕES */}
          {activeTab === 'config' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* 4. Alerta Humano */}
          {summary.humano > 0 && (
            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-500/50 rounded-xl flex items-center gap-3">
              <AlertTriangle className="text-orange-500 dark:text-orange-400 shrink-0" size={20} />
              <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                <strong className="text-orange-600 dark:text-orange-500">{summary.humano} cliente(s)</strong> atingiram D+10 e requerem contato humano urgente.
              </p>
            </div>
          )}

          {/* 2. Métricas 4 Fases */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div onClick={() => openPhaseDetail('preventivo')} className="p-4 rounded-xl border border-[#2dd4bf]/20 bg-[#2dd4bf]/5 dark:bg-[#0d4a3a]/10 cursor-pointer hover:border-[#2dd4bf]/40 hover:shadow-md transition-all">
              <p className="text-[10px] font-bold text-teal-600 dark:text-[#2dd4bf] uppercase tracking-widest mb-1">Em preventivo</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white">{summary.preventivo}</p>
            </div>
            <div onClick={() => openPhaseDetail('vencimento')} className="p-4 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/5 dark:bg-[#78350f]/10 cursor-pointer hover:border-[#f59e0b]/40 hover:shadow-md transition-all">
              <p className="text-[10px] font-bold text-amber-600 dark:text-[#f59e0b] uppercase tracking-widest mb-1">No vencimento</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white">{summary.vencimento}</p>
            </div>
            <div onClick={() => openPhaseDetail('reativo')} className="p-4 rounded-xl border border-[#f87171]/20 bg-[#f87171]/5 dark:bg-[#7c2d12]/10 cursor-pointer hover:border-[#f87171]/40 hover:shadow-md transition-all">
              <p className="text-[10px] font-bold text-rose-600 dark:text-[#f87171] uppercase tracking-widest mb-1">Em atraso</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white">{summary.reativo}</p>
            </div>
            <div onClick={() => openPhaseDetail('humano')} className="p-4 rounded-xl border border-[#a78bfa]/20 bg-[#a78bfa]/5 dark:bg-[#4c1d95]/10 relative overflow-hidden cursor-pointer hover:border-[#a78bfa]/40 hover:shadow-md transition-all">
              <p className="text-[10px] font-bold text-violet-600 dark:text-[#a78bfa] uppercase tracking-widest mb-1 flex items-center gap-2">
                Contato Humano
                {summary.humano > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />}
              </p>
              <p className="text-2xl font-black text-gray-800 dark:text-white">{summary.humano}</p>
            </div>
          </div>

          {/* Legenda Timeline */}
          <div className="flex items-center gap-6 mb-8 text-xs font-semibold text-gray-500 dark:text-slate-300">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#2dd4bf]" /> Preventivo</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Vencimento</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#f87171]" /> Reativo automático</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#a78bfa]" /> Contato humano</div>
          </div>

          {/* 3. Timeline Vertical (Novo Design) */}
          <div className="relative pl-12 border-l-2 border-gray-100 dark:border-white/10 ml-4 space-y-6">
            {rules.map((rule, idx) => {
              const showDivider = rule.day_offset >= 10 && (idx === 0 || rules[idx-1].day_offset < 10);
              const formatDay = (d: number) => d < 0 ? `D${d}` : d === 0 ? 'D0' : `D+${d}`;
              const style = timelineStyles[rule.phase] || timelineStyles.reativo;
              const extraBadge = getExtraBadge(rule.day_offset);
              const desc = getRuleDescription(rule.day_offset, rule.message_template || '');

              return (
                <React.Fragment key={rule.id}>
                  {showDivider && (
                    <div className="relative -ml-[65px] flex items-center gap-4 py-4 opacity-60">
                      <div className="flex-1 border-t border-dashed border-gray-300 dark:border-slate-500" />
                      <span className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest">automação encerra aqui</span>
                      <div className="flex-1 border-t border-dashed border-gray-300 dark:border-slate-500" />
                    </div>
                  )}
                  
                  <div 
                    onClick={() => { setEditingRule(rule); setTemplateText(rule.message_template || ''); }}
                    className={`relative flex flex-col p-5 rounded-xl border transition-all cursor-pointer ${rule.is_active ? `${style.bg} ${style.border} hover:bg-gray-50 dark:hover:bg-white/5` : 'bg-gray-50 dark:bg-dark-bg/40 border-gray-200 dark:border-white/5 opacity-60 hover:opacity-100'}`}
                  >
                    {/* Bolinha cortando a linha */}
                    <div className={`absolute -left-[67px] top-5 w-9 h-9 rounded-full border-2 bg-white dark:bg-dark-bg flex items-center justify-center font-bold text-[10px] ${rule.is_active ? style.border + ' ' + style.text : 'border-gray-200 dark:border-white/10 text-gray-400 dark:text-slate-500'}`}>
                      {formatDay(rule.day_offset)}
                    </div>

                    {/* Header do Card */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-base font-bold ${rule.is_active ? style.text : 'text-gray-500 dark:text-slate-400'}`}>{rule.label}</h3>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                          {rule.channels.map(ch => (
                            <span key={ch} className={`px-3 py-1 text-[10px] font-bold rounded-full border ${rule.is_active ? style.pillBg + ' ' + style.text + ' ' + style.border : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-white/10'}`}>
                              {ch}
                            </span>
                          ))}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleRule(rule.id); }}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.is_active ? style.iconColor : 'bg-gray-300 dark:bg-slate-700'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${rule.is_active ? 'translate-x-4.5' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>

                    {/* Descrição */}
                    <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed max-w-[90%]">{desc}</p>

                    {/* Extra Badge */}
                    {extraBadge && (
                      <div className="mt-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold border ${rule.is_active ? style.pillBg + ' ' + style.text + ' ' + style.border : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-white/10'}`}>
                          {extraBadge}
                        </span>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

              {/* 5. Footer / Pausar */}
              <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 flex justify-end">
                <button className="flex items-center gap-2 px-4 py-2 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-xl text-xs font-bold transition-colors">
                  <Pause size={14} /> Pausar Régua
                </button>
              </div>
            </div>
          )}

          {/* Aba FILA DE DISPAROS */}
          {activeTab === 'disparos' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-dark-bg/50">
                  <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1">Disparos Hoje</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{queueStats.hoje}</p>
                </div>
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1">Concluídos 7 dias</p>
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{queueStats.ultimos7dias}</p>
                </div>
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">Agendados/Pendentes</p>
                  <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{queueStats.agendados}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 dark:border-white/5 overflow-x-auto">
                {/* Sub-tabs: Agendados / Enviados */}
                <div className="flex items-center gap-6 px-4 pt-3 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-dark-bg/50">
                  <button onClick={() => setQueueSubTab('agendados')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${queueSubTab === 'agendados' ? 'border-amber-400 text-amber-600 dark:text-amber-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}>
                    Agendados
                    <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${queueSubTab === 'agendados' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400'}`}>{queueAgendados.length}</span>
                  </button>
                  <button onClick={() => setQueueSubTab('enviados')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${queueSubTab === 'enviados' ? 'border-emerald-400 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}>
                    Enviados
                    <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${queueSubTab === 'enviados' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400'}`}>{queueEnviados.length}</span>
                  </button>
                  <button onClick={() => setQueueSubTab('humano')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${queueSubTab === 'humano' ? 'border-violet-400 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}>
                    Contato Humano
                    <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${queueSubTab === 'humano' ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400'}`}>{queueHumano.length}</span>
                  </button>
                  <button onClick={() => setQueueSubTab('suspensao')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-colors ${queueSubTab === 'suspensao' ? 'border-rose-400 text-rose-600 dark:text-rose-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}>
                    Suspensão
                    <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${queueSubTab === 'suspensao' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400'}`}>{queueSuspensao.length}</span>
                  </button>
                </div>
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-dark-bg/50 border-b border-gray-100 dark:border-white/5">
                      <th className="w-[30%] px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Cliente / Valor</th>
                      <th className="w-[20%] px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Regra Acionada</th>
                      <th className="w-[10%] px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Canal</th>
                      <th className="w-[15%] px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Data Programada</th>
                      <th className="w-[10%] px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Mensagem</th>
                      <th className="w-[15%] px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {(() => {
                      const currentList = queueSubTab === 'agendados' ? queueAgendados : queueSubTab === 'enviados' ? queueEnviados : queueSubTab === 'humano' ? queueHumano : queueSuspensao;
                      const emptyMsg = queueSubTab === 'agendados' ? 'Nenhum disparo agendado.' : queueSubTab === 'enviados' ? 'Nenhum disparo enviado.' : queueSubTab === 'humano' ? 'Nenhum cliente em contato humano.' : 'Nenhum cliente em suspensão.';
                      if (currentList.length === 0) return (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400 text-sm">{emptyMsg}</td>
                        </tr>
                      );
                      return currentList.map((item, idx) => {
                      const phaseKey = item.day_offset < 0 ? 'preventivo' : item.day_offset === 0 ? 'vencimento' : item.day_offset >= 10 ? 'humano' : 'reativo';
                      const badgeColor = timelineStyles[phaseKey]?.pillBg + ' ' + timelineStyles[phaseKey]?.text;
                      const badgeLabel = item.day_offset < 0 ? `D${item.day_offset}` : item.day_offset === 0 ? 'D0' : `D+${item.day_offset}`;
                      const fmtTriggered = item.triggered_at ? new Date(item.triggered_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : fmtDate(item.scheduled_date);

                      return (
                        <tr key={idx} className="bg-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 dark:bg-dark-card">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{item.client_name || 'Desconhecido'}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{formatCurrency(item.value)} • Venc: {fmtDate(item.due_date)}</p>
                          </td>
                          <td className="px-4 py-3 dark:bg-dark-card">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border border-current opacity-80 ${badgeColor}`}>{badgeLabel}</span>
                              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{item.rule_label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 dark:bg-dark-card">
                            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md border border-gray-200 dark:border-white/5">
                              {item.channel}
                            </span>
                          </td>
                          <td className="px-4 py-3 dark:bg-dark-card">
                            <span className="text-xs text-gray-600 dark:text-slate-400">{fmtTriggered}</span>
                          </td>
                          {/* Mensagem column */}
                          <td className="px-4 py-3 text-center dark:bg-dark-card">
                            <button
                              onClick={() => copyMessage(item, idx)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                copiedIdx === idx
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-white/10 hover:bg-violet-500/10 hover:text-violet-500 hover:border-violet-500/20'
                              }`}
                              title="Copiar mensagem"
                            >
                              {copiedIdx === idx ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
                            </button>
                          </td>
                          {/* Status column */}
                          <td className="px-4 py-3 text-right dark:bg-dark-card">
                            {item.status === 'sent' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                                <CheckCircle2 size={12} /> Enviado
                              </span>
                            )}
                            {item.status === 'failed' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-full">
                                <AlertTriangle size={12} /> Falhou
                              </span>
                            )}
                            {item.status === 'manual' && (
                              <button
                                onClick={(e) => markAsSent(item, idx, e)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-full cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              >
                                <Clock size={12} /> Pendente
                              </button>
                            )}
                            {item.status === 'pending' && (
                              <button
                                onClick={(e) => markAsSent(item, idx, e)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-full cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              >
                                <Clock size={12} /> Agendado
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Confetti animation */}
              {confettiItems.length > 0 && (
                <div className="fixed inset-0 pointer-events-none z-[9999]">
                  {confettiItems.map((p, i) => {
                    const angle = (Math.random() - 0.5) * 120;
                    const dist = 80 + Math.random() * 200;
                    const dx = Math.sin(angle * Math.PI / 180) * dist;
                    const dy = -(100 + Math.random() * 300);
                    const size = 6 + Math.random() * 6;
                    const rotation = Math.random() * 720;
                    const hue = 100 + Math.random() * 40; // green range
                    const delay = Math.random() * 0.2;
                    return (
                      <div
                        key={p.id}
                        style={{
                          position: 'fixed',
                          left: p.x,
                          top: p.y,
                          width: size,
                          height: size,
                          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                          backgroundColor: `hsl(${hue}, 80%, ${50 + Math.random() * 20}%)`,
                          animation: `confetti-fly 1.5s ease-out ${delay}s forwards`,
                          opacity: 1,
                          transform: `translate(0, 0) rotate(0deg)`,
                          zIndex: 9999,
                          ['--dx' as any]: `${dx}px`,
                          ['--dy' as any]: `${dy}px`,
                          ['--rot' as any]: `${rotation}deg`,
                        }}
                      />
                    );
                  })}
                  <style>{`
                    @keyframes confetti-fly {
                      0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
                      100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
                    }
                  `}</style>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 6. Modal de Edição */}
      {editingRule && (() => {
        const style = timelineStyles[editingRule.phase] || timelineStyles.reativo;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingRule(null)}>
            <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-[10px] font-bold rounded-full border flex items-center justify-center ${style.pillBg} ${style.text} ${style.border}`}>
                    {editingRule.day_offset < 0 ? `D${editingRule.day_offset}` : editingRule.day_offset === 0 ? 'D0' : `D+${editingRule.day_offset}`}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{editingRule.label}</h3>
                </div>
                <button onClick={() => setEditingRule(null)} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {editingRule.phase === 'humano' && (
                  <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl flex gap-3 text-violet-700 dark:text-violet-300 text-xs">
                    <ShieldAlert size={16} className="shrink-0 text-violet-500" />
                    <p>Esta etapa é manual — a mensagem é apenas uma referência para o contato humano.</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest block">Mensagem (Template)</label>
                  <textarea
                    value={templateText}
                    onChange={e => setTemplateText(e.target.value)}
                    placeholder="Nenhuma mensagem configurada para esta etapa."
                    className="w-full h-32 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/50 resize-none transition-colors"
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['{{saudacao}}', '{{nome}}', '{{valor}}', '{{vencimento}}', '{{link}}'].map(tag => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-slate-400 text-[10px] rounded border border-gray-200 dark:border-white/5 font-mono cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10 transition-colors" onClick={() => setTemplateText(prev => prev + tag)}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-slate-500 mt-2 font-medium">Dica: use <code className="bg-gray-100 dark:bg-white/5 px-1 rounded border border-gray-200 dark:border-white/5">\n</code> para fazer uma quebra de linha na mensagem.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest block">Preview</label>
                  <div className="bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-white/5 rounded-xl p-4 text-sm text-gray-600 dark:text-slate-300 whitespace-pre-wrap">
                    {renderPreview(templateText)}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-dark-bg/30 flex justify-end gap-3">
                <button onClick={() => setEditingRule(null)} className="px-4 py-2 text-gray-500 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white text-xs font-bold transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSaveMessage} disabled={isSaving} className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2">
                  {isSaving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Salvar Mensagem
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 7. Modal Detalhe por Fase */}
      {phaseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setPhaseDetail(null)}>
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${phaseDetail.phase === 'preventivo' ? 'bg-[#2dd4bf]' : phaseDetail.phase === 'vencimento' ? 'bg-[#f59e0b]' : phaseDetail.phase === 'reativo' ? 'bg-[#f87171]' : 'bg-[#a78bfa]'}`} />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">{phaseDetail.label}</h3>
                <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">{phaseDetail.items.length} cliente(s)</span>
              </div>
              <button onClick={() => setPhaseDetail(null)} className="text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-auto flex-1">
              {loadingDetail ? (
                <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>
              ) : phaseDetail.items.length === 0 ? (
                <div className="py-12 text-center text-gray-500 dark:text-slate-400 text-sm">Nenhum cliente nesta fase.</div>
              ) : (
                <div className="flex flex-col">
                  {/* Header */}
                  <div className="flex items-center px-6 py-2 bg-gray-50 dark:bg-dark-bg/50 border-b border-gray-100 dark:border-white/5 sticky top-0">
                    <span className="flex-1 min-w-0 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Cliente</span>
                    <span className="w-32 shrink-0 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest text-right">Valor</span>
                    <span className="w-28 shrink-0 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest text-center">Vencimento</span>
                    <span className="w-14 shrink-0 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest text-center">Dias</span>
                  </div>
                  {/* Rows */}
                  {phaseDetail.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center px-6 py-3 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <p className="flex-1 min-w-0 text-sm font-bold text-gray-900 dark:text-white truncate pr-3" title={item.customer_name || 'Desconhecido'}>{item.customer_name || 'Desconhecido'}</p>
                      <span className="w-32 shrink-0 text-sm font-semibold text-gray-900 dark:text-white text-right whitespace-nowrap">{formatCurrency(item.value)}</span>
                      <span className="w-28 shrink-0 text-xs text-gray-600 dark:text-slate-400 text-center whitespace-nowrap">{fmtDate(item.due_date)}</span>
                      <span className={`w-14 shrink-0 text-xs font-bold text-center whitespace-nowrap ${Number(item.days_offset) < 0 ? 'text-teal-600 dark:text-[#2dd4bf]' : Number(item.days_offset) === 0 ? 'text-amber-600 dark:text-[#f59e0b]' : Number(item.days_offset) <= 10 ? 'text-rose-600 dark:text-[#f87171]' : 'text-violet-600 dark:text-[#a78bfa]'}`}>
                        {Number(item.days_offset) < 0 ? `D${item.days_offset}` : Number(item.days_offset) === 0 ? 'D0' : `D+${item.days_offset}`}
                      </span>
                    </div>
                  ))}
                  {/* Footer total */}
                  <div className="flex items-center px-6 py-3 bg-gray-50 dark:bg-dark-bg/50 border-t border-gray-200 dark:border-white/10">
                    <span className="flex-1 min-w-0 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Total</span>
                    <span className="w-32 shrink-0 text-sm font-black text-gray-900 dark:text-white text-right whitespace-nowrap">
                      {formatCurrency(phaseDetail.items.reduce((sum: number, i: any) => sum + parseFloat(i.value || '0'), 0))}
                    </span>
                    <span className="w-28 shrink-0"></span>
                    <span className="w-14 shrink-0"></span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────
export default function ContasAReceber() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary>({ total_recebido: 0, total_recebidas: 0, total_confirmadas: 0, total_antecipacoes: 0, total_a_receber: 0, total_mes: 0 });
  const [pendentes, setPendentes] = useState<InvoiceItem[]>([]);
  const [vencidos, setVencidos] = useState<InvoiceItem[]>([]);
  const [recebidos, setRecebidos] = useState<any[]>([]);
  const [recebidas, setRecebidas] = useState<any[]>([]);
  const [confirmadas, setConfirmadas] = useState<any[]>([]);
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
        setRecebidas(data.recebidas || []);
        setConfirmadas(data.confirmadas || []);
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
  const [mainTab, setMainTab] = useState<'receber' | 'cobrancas'>('receber');
  const [receberSubTab, setReceberSubTab] = useState<'pendentes' | 'recebidos'>('pendentes');

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-2">
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

      {/* ── Tab Navigation ── */}
      <div className="px-6 md:px-8 mb-4 flex items-center gap-1 border-b border-white/5">
        <button
          onClick={() => setMainTab('receber')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${mainTab === 'receber' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          A Receber
        </button>
        <button
          onClick={() => setMainTab('cobrancas')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${mainTab === 'cobrancas' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Cobranças
        </button>
      </div>

      <div className="px-6 md:px-8 pb-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ══ Tab: A Receber ══ */}
            {mainTab === 'receber' && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* 1) Recebidas */}
                  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 flex flex-col min-h-[150px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-emerald-600"><TrendingUp size={20} className="text-white" /></div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recebidas</p>
                    </div>
                    <div className="flex flex-col mt-auto">
                      <h3 className="text-3xl font-black tracking-tight mb-3 text-emerald-400">{formatCurrency(summary.total_recebidas)}</h3>
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Pix + Boleto</span><span className="font-semibold text-emerald-400">{recebidas.length} cobranças</span></div>
                      </div>
                    </div>
                  </div>
                  {/* 2) Confirmadas */}
                  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 flex flex-col min-h-[150px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-blue-600"><Banknote size={20} className="text-white" /></div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confirmadas</p>
                    </div>
                    <div className="flex flex-col mt-auto">
                      <h3 className="text-3xl font-black tracking-tight mb-3 text-blue-400">{formatCurrency(summary.total_confirmadas)}</h3>
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Cartão + Antecipadas</span><span className="font-semibold text-blue-400">{confirmadas.length} cobranças</span></div>
                      </div>
                    </div>
                  </div>
                  {/* 3) A Receber */}
                  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 flex flex-col min-h-[150px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-amber-500"><Clock size={20} className="text-white" /></div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">A Receber</p>
                    </div>
                    <div className="flex flex-col mt-auto">
                      <h3 className="text-3xl font-black tracking-tight mb-3 text-amber-400">{formatCurrency(pendentes.reduce((s, r) => s + parseFloat(r.value || '0'), 0))}</h3>
                      <div className="pt-3 border-t border-white/10"><div className="flex justify-between items-center text-sm"><span className="text-slate-500">Cobranças</span><span className="font-semibold text-amber-400">{pendentes.length} pendentes</span></div></div>
                    </div>
                  </div>
                  {/* 4) Vencidas */}
                  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 flex flex-col min-h-[150px]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-rose-600"><AlertTriangle size={20} className="text-white" /></div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vencidas</p>
                    </div>
                    <div className="flex flex-col mt-auto">
                      <h3 className={`text-3xl font-black tracking-tight mb-3 ${vencidos.length > 0 ? 'text-rose-400' : 'text-dark-text'}`}>{formatCurrency(vencidos.reduce((s, r) => s + parseFloat(r.value || '0'), 0))}</h3>
                      <div className="pt-3 border-t border-white/10">
                        <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Atrasadas</span><span className={`font-semibold ${vencidos.length > 0 ? 'text-rose-400' : 'text-slate-500'}`}>{vencidos.length} cobranças</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-tabs: A Receber / Já Recebido */}
                <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-6 px-6 pt-4 border-b border-white/5">
                    <button onClick={() => setReceberSubTab('pendentes')}
                      className={`pb-3 text-sm font-bold border-b-2 transition-colors ${receberSubTab === 'pendentes' ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                      A Receber
                      <span className="ml-2 text-[10px] font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">{pendentes.length + vencidos.length}</span>
                    </button>
                    <button onClick={() => setReceberSubTab('recebidos')}
                      className={`pb-3 text-sm font-bold border-b-2 transition-colors ${receberSubTab === 'recebidos' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                      Já Recebido
                      <span className="ml-2 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">{recebidos.length}</span>
                    </button>
                  </div>

                  {/* Sub-tab: A Receber */}
                  {receberSubTab === 'pendentes' && (
                    <div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-dark-bg/50 border-b border-gray-100 dark:border-white/5">
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Cliente / Descrição</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Tipo</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Vencimento</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest text-right">Valor</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {[...vencidos, ...pendentes].length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">Nenhuma cobrança pendente neste mês.</td></tr>
                          ) : [...vencidos, ...pendentes].map((inv, idx) => {
                            const isOverdue = inv.status === 'OVERDUE';
                            const bt = BILLING_LABELS[inv.billing_type] || BILLING_LABELS['UNDEFINED'];
                            return (
                              <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-3">
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">{inv.customer_name || 'Desconhecido'}</p>
                                  {inv.description && <p className="text-xs text-slate-500 truncate max-w-[300px]">{inv.description}</p>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md border border-gray-200 dark:border-white/5">
                                    {bt.icon} {bt.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-slate-400">{fmtDate(inv.due_date)}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`text-sm font-bold ${isOverdue ? 'text-rose-400' : 'text-amber-400'}`}>{formatCurrency(inv.value)}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {isOverdue ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full">
                                      <AlertTriangle size={10} /> Vencido
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
                                      <Clock size={10} /> Pendente
                                    </span>
                                  )}
                                  {inv.invoice_url && (
                                    <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-violet-400 hover:text-violet-300 inline-block align-middle">
                                      <ExternalLink size={12} />
                                    </a>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Sub-tab: Já Recebido */}
                  {receberSubTab === 'recebidos' && (
                    <div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-dark-bg/50 border-b border-gray-100 dark:border-white/5">
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Cliente / Descrição</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Tipo</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Vencimento</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Pago em</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest text-right">Valor</th>
                            <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {recebidos.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">Nenhum recebimento neste mês.</td></tr>
                          ) : recebidos.map((inv: any, idx: number) => {
                            const bt = BILLING_LABELS[inv.billing_type] || BILLING_LABELS['UNDEFINED'];
                            return (
                              <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-3">
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">{inv.customer_name || 'Desconhecido'}</p>
                                  {inv.description && <p className="text-xs text-slate-500 truncate max-w-[300px]">{inv.description}</p>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md border border-gray-200 dark:border-white/5">
                                    {bt.icon} {bt.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-slate-400">{fmtDate(inv.due_date)}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-emerald-400">{inv.payment_date ? fmtDate(inv.payment_date) : '—'}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-sm font-bold text-emerald-400">{formatCurrency(inv.value)}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                                    <CheckCircle2 size={10} /> Recebido
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ══ Tab: Cobranças ══ */}
            {mainTab === 'cobrancas' && (
              <CollectionRulesBlock selectedMonth={selectedMonth} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
