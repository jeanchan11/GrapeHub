import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Clock, CreditCard, Zap, FileText, ExternalLink, Settings, AlertTriangle, Pause, Play, Check, X, ShieldAlert, Activity, CheckCircle2, Send, Settings2, Search, TrendingUp, Banknote, BarChart2, MessageCircle, Copy, Phone, Mail, Users, DollarSign, Filter, RefreshCw, MoreHorizontal, RotateCcw } from 'lucide-react';

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
  const [copiedPhoneIdx, setCopiedPhoneIdx] = useState<number | null>(null);
  const [queueSubTab, setQueueSubTab] = useState<'agendados' | 'enviados' | 'humano' | 'suspensao'>('agendados');
  const [queueAll, setQueueAll] = useState<QueueItem[]>([]);

  // ── Dispatch Queue states ──────────────────────────────────────────────────
  const [dispatchItems, setDispatchItems] = useState<any[]>([]);
  const [dispatchStats, setDispatchStats] = useState({ disparos_hoje: 0, concluidos_7_dias: 0, agendados_pendentes: 0 });
  const [dispatchConfig, setDispatchConfig] = useState<any>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [cfgForm, setCfgForm] = useState({ dispatch_enabled: true, dispatch_time: '09:00', dispatch_interval_seconds: 60, n8n_webhook_url: '' });
  const [savingCfg, setSavingCfg] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const callbackUrl = `${window.location.origin}/api/finance/dispatch/callback`;
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [showSendAllConfirm, setShowSendAllConfirm] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  const [dispatchSubTab, setDispatchSubTab] = useState<'agendados'|'enviados'|'humano'|'suspensao'|'cancelados'>('agendados');

  const fetchDispatch = async () => {
    try {
      const [qRes, sRes, cRes] = await Promise.all([
        fetch('/api/finance/dispatch/queue'),
        fetch('/api/finance/dispatch/queue/stats'),
        fetch('/api/finance/dispatch/config'),
      ]);
      if (qRes.ok) setDispatchItems(await qRes.json());
      if (sRes.ok) setDispatchStats(await sRes.json());
      if (cRes.ok) {
        const cfg = await cRes.json();
        setDispatchConfig(cfg);
        setCfgForm({
          dispatch_enabled: cfg.dispatch_enabled ?? true,
          dispatch_time: cfg.dispatch_time?.slice(0,5) || '09:00',
          dispatch_interval_seconds: cfg.dispatch_interval_seconds || 60,
          n8n_webhook_url: cfg.n8n_webhook_url || '',
        });
      }
    } catch (e) { /* silent */ }
  };

  // Polling when ENVIANDO items exist
  useEffect(() => {
    if (!pollingActive) return;
    const t = setInterval(() => {
      fetchDispatch().then(() => {
        setDispatchItems(prev => {
          if (!prev.some(i => i.status === 'ENVIANDO')) setPollingActive(false);
          return prev;
        });
      });
    }, 10_000);
    return () => clearInterval(t);
  }, [pollingActive]);

  useEffect(() => {
    if (activeTab === 'disparos') fetchDispatch();
  }, [activeTab]);

  const handleDispatchSend = async (id: string) => {
    setSendingId(id);
    setDispatchItems(prev => prev.map(i => i.id === id ? { ...i, status: 'ENVIANDO' } : i));
    setPollingActive(true);
    await fetch(`/api/finance/dispatch/queue/${id}/send`, { method: 'POST' });
    setSendingId(null);
    setTimeout(fetchDispatch, 3000);
  };

  const handleDispatchCancel = async (id: string) => {
    await fetch(`/api/finance/dispatch/queue/${id}/cancel`, { method: 'POST' });
    fetchDispatch();
  };

  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  const handleDispatchReopen = async (id: string) => {
    setOpenMenuId(null);
    await fetch(`/api/finance/dispatch/queue/${id}/reopen`, { method: 'POST' });
    fetchDispatch();
  };

  const handleSendAll = async () => {
    setSendingAll(true);
    setShowSendAllConfirm(false);
    setPollingActive(true);
    await fetch('/api/finance/dispatch/queue/send-all', { method: 'POST' });
    setSendingAll(false);
    fetchDispatch();
  };

  const handlePopulateQueue = async () => {
    await fetch('/api/finance/dispatch/queue/populate', { method: 'POST' });
    fetchDispatch();
  };

  const handleSaveConfig = async () => {
    setSavingCfg(true);
    try {
      await fetch('/api/finance/dispatch/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfgForm),
      });
      setShowConfigModal(false);
      fetchDispatch();
    } finally { setSavingCfg(false); }
  };


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
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar..." className="pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-white/10 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/50" />
            </div>
            <button onClick={handlePopulateQueue} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 transition-colors">
              <RefreshCw size={13} /> Popular Fila
            </button>
            <button onClick={() => setShowSendAllConfirm(true)} disabled={sendingAll || dispatchItems.filter(i => i.status === 'AGENDADO').length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors">
              {sendingAll ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Disparando...</> : <><Send size={13} /> Disparar Fila</>}
            </button>
            <button onClick={() => setShowConfigModal(true)} className="p-1.5 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" title="Configurações">
              <Settings size={15} />
            </button>
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
          {activeTab === 'disparos' && (() => {
            // ── Filtros de sub-tab baseados em day_offset (como a régua original) ──
            const search = (i: any) => !searchTerm || i.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());

            const agendados   = dispatchItems.filter(i => i.status === 'AGENDADO' && (i.day_offset ?? 0) < 10  && search(i));
            const humano      = dispatchItems.filter(i => i.status === 'AGENDADO' && (i.day_offset ?? 0) >= 10 && (i.day_offset ?? 0) < 15 && search(i));
            const suspensao   = dispatchItems.filter(i => i.status === 'AGENDADO' && (i.day_offset ?? 0) >= 15 && search(i));
            const enviados    = dispatchItems.filter(i => (i.status === 'ENVIADO' || i.status === 'ENVIANDO') && search(i));
            const cancelados  = dispatchItems.filter(i => (i.status === 'CANCELADO' || i.status === 'ERRO')   && search(i));

            type SubTab = 'agendados' | 'humano' | 'suspensao' | 'enviados' | 'cancelados';
            const subTabCfg: { key: SubTab; label: string; color: string; items: any[] }[] = [
              { key: 'agendados',  label: 'Agendados',       color: 'amber',   items: agendados  },
              { key: 'enviados',   label: 'Enviados',         color: 'emerald', items: enviados   },
              { key: 'humano',     label: 'Contato Humano',   color: 'violet',  items: humano     },
              { key: 'suspensao',  label: 'Suspensão',        color: 'rose',    items: suspensao  },
              { key: 'cancelados', label: 'Cancelados',       color: 'slate',   items: cancelados },
            ];

            const currentItems = subTabCfg.find(t => t.key === dispatchSubTab)?.items ?? [];

            return (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-dark-bg/50">
                    <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1">Disparos Hoje</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{dispatchStats.disparos_hoje}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1">Concluídos 7 dias</p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{dispatchStats.concluidos_7_dias}</p>
                  </div>
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-1">Agendados/Pendentes</p>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{dispatchStats.agendados_pendentes}</p>
                  </div>
                </div>

                {/* Table + Sub-tabs */}
                <div className="rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
                  <div className="flex items-center gap-6 px-4 pt-3 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-dark-bg/50">
                    {subTabCfg.map(({ key, label, color, items }) => {
                      const active = dispatchSubTab === key;
                      return (
                        <button key={key} onClick={() => setDispatchSubTab(key)}
                          className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${active ? `border-${color}-400 text-${color}-600 dark:text-${color}-400` : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}>
                          {label}
                          <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? `bg-${color}-500/15 text-${color}-600 dark:text-${color}-400` : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                            {items.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-dark-bg/50 border-b border-gray-100 dark:border-white/5">
                          {['Cliente / Valor','Telefone','Regra','Canal','Agendado','Fatura','Status'].map(h => (
                            <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                        {currentItems.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-slate-500">Nenhum item nesta categoria.</td></tr>
                        ) : currentItems.map((item) => (

                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3">
                              <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[200px]">{item.customer_name}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">{formatCurrency(item.amount)} • {fmtDate(item.due_date)}</p>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{item.customer_phone || '—'}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const d = item.day_offset ?? 0;
                                  const phaseKey = d < 0 ? 'preventivo' : d === 0 ? 'vencimento' : d >= 10 ? 'humano' : 'reativo';
                                  const pillColors: Record<string, string> = {
                                    preventivo: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                                    vencimento: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                                    reativo:    'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
                                    humano:     'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
                                  };
                                  const label = d < 0 ? `D${d}` : d === 0 ? 'D0' : `D+${d}`;
                                  return (
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${pillColors[phaseKey]}`}>{label}</span>
                                  );
                                })()}
                                <span className="text-xs text-gray-600 dark:text-slate-400">{item.rule_triggered || '—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">{item.channel}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 dark:text-slate-400">
                              {fmtDate(item.scheduled_date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {item.invoice_url
                                ? <a href={item.invoice_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 hover:bg-violet-100 transition-all"><ExternalLink size={10} /> Ver</a>
                                : <span className="text-xs text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {item.status === 'AGENDADO' && (
                                  <>
                                    <button onClick={() => handleDispatchSend(item.id)} disabled={sendingId === item.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                                      <Play size={10} /> Enviar
                                    </button>
                                    <button onClick={() => handleDispatchCancel(item.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold text-gray-400 hover:text-rose-500 transition-colors">
                                      <X size={10} />
                                    </button>
                                  </>
                                )}
                                {item.status === 'ENVIANDO' && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <div className="w-2.5 h-2.5 border-2 border-blue-400/30 border-t-blue-500 rounded-full animate-spin" /> Enviando...
                                  </span>
                                )}
                                {item.status === 'ENVIADO' && (() => {
                                  const confirmed = !!item.n8n_ticket_id;
                                  const sentAt = item.sent_at
                                    ? new Date(item.sent_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
                                    : '—';
                                  return (
                                    <div className="flex items-center gap-2">
                                      {/* Badge principal com tooltip */}
                                      <div className="relative group">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-default transition-all ${
                                          confirmed
                                            ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-white/10'
                                        }`}>
                                          {confirmed ? <CheckCircle2 size={11} /> : <Clock size={10} />}
                                          {confirmed ? 'Enviado' : 'Aguardando n8n'}
                                        </span>
                                        {/* Tooltip hover */}
                                        <div className="absolute bottom-full right-0 mb-2 w-72 z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150">
                                          <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-2xl p-3 border border-white/10 text-left">
                                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                              <CheckCircle2 size={10} /> Mensagem Enviada
                                            </p>
                                            <div className="space-y-1.5">
                                              <div className="flex gap-2">
                                                <span className="text-[10px] text-gray-400 w-16 shrink-0">Horário</span>
                                                <span className="text-[10px] text-white font-medium">{sentAt}</span>
                                              </div>
                                              <div className="flex gap-2">
                                                <span className="text-[10px] text-gray-400 w-16 shrink-0">Telefone</span>
                                                <span className="text-[10px] text-white font-medium">{item.customer_phone || '—'}</span>
                                              </div>
                                              {confirmed && (
                                                <div className="flex gap-2">
                                                  <span className="text-[10px] text-gray-400 w-16 shrink-0">Ticket n8n</span>
                                                  <span className="text-[10px] text-violet-300 font-mono truncate">{item.n8n_ticket_id}</span>
                                                </div>
                                              )}
                                              {item.message_rendered && (
                                                <div className="pt-1.5 border-t border-white/10">
                                                  <p className="text-[10px] text-gray-400 mb-1">Mensagem enviada</p>
                                                  <p className="text-[10px] text-gray-200 leading-relaxed line-clamp-4">{item.message_rendered}</p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          {/* Arrow */}
                                          <div className="flex justify-end pr-4">
                                            <div className="w-2.5 h-2.5 bg-gray-900 dark:bg-gray-800 rotate-45 -mt-1.5 border-r border-b border-white/10" />
                                          </div>
                                        </div>
                                      </div>
                                      {/* Menu 3 pontos */}
                                      <div className="relative">
                                        <button
                                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                                          className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                        >
                                          <MoreHorizontal size={14} />
                                        </button>
                                        {openMenuId === item.id && (
                                          <>
                                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                            <div className="absolute right-0 top-7 z-50 min-w-[180px] bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                                              <button
                                                onClick={() => handleDispatchReopen(item.id)}
                                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                                              >
                                                <RotateCcw size={13} /> Reagendar envio
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                                {item.status === 'ERRO' && (() => {
                                  const errAt = item.updated_at
                                    ? new Date(item.updated_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
                                    : '—';
                                  return (
                                    <div className="flex items-center gap-2">
                                      <div className="relative group">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-default bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
                                          <AlertTriangle size={10} /> Erro no envio
                                        </span>
                                        {/* Tooltip hover */}
                                        <div className="absolute bottom-full right-0 mb-2 w-72 z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150">
                                          <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-2xl p-3 border border-rose-500/30 text-left">
                                            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                              <AlertTriangle size={10} /> Falha no Envio
                                            </p>
                                            <div className="space-y-1.5">
                                              <div className="flex gap-2">
                                                <span className="text-[10px] text-gray-400 w-16 shrink-0">Horário</span>
                                                <span className="text-[10px] text-white font-medium">{errAt}</span>
                                              </div>
                                              <div className="flex gap-2">
                                                <span className="text-[10px] text-gray-400 w-16 shrink-0">Telefone</span>
                                                <span className="text-[10px] text-white font-medium">{item.customer_phone || '—'}</span>
                                              </div>
                                              {item.error_message && (
                                                <div className="pt-1.5 border-t border-white/10">
                                                  <p className="text-[10px] text-gray-400 mb-1">Detalhe do erro</p>
                                                  <p className="text-[10px] text-rose-300 leading-relaxed">{item.error_message}</p>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex justify-end pr-4">
                                            <div className="w-2.5 h-2.5 bg-gray-900 dark:bg-gray-800 rotate-45 -mt-1.5 border-r border-b border-rose-500/30" />
                                          </div>
                                        </div>
                                      </div>
                                      <button onClick={() => handleDispatchSend(item.id)} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors">
                                        <RefreshCw size={10} /> Retentar
                                      </button>
                                    </div>
                                  );
                                })()}
                                {item.status === 'CANCELADO' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-white/5 text-gray-400">Cancelado</span>
                                )}

                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* ── Config Modal ─────────────────────────────────────────────────────── */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowConfigModal(false)}>
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-[22px] w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2"><Settings size={16} className="text-violet-500" /> Configurações de Disparo</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Disparos automáticos</span>
                <button onClick={() => setCfgForm(f => ({ ...f, dispatch_enabled: !f.dispatch_enabled }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cfgForm.dispatch_enabled ? 'bg-violet-500' : 'bg-gray-300 dark:bg-slate-700'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cfgForm.dispatch_enabled ? 'translate-x-4.5' : 'translate-x-1'}`} />
                </button>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest block mb-1">Horário de início</label>
                <input type="time" value={cfgForm.dispatch_time} onChange={e => setCfgForm(f => ({ ...f, dispatch_time: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/50" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest block mb-1">Intervalo entre disparos (segundos)</label>
                <input type="number" min={10} value={cfgForm.dispatch_interval_seconds} onChange={e => setCfgForm(f => ({ ...f, dispatch_interval_seconds: parseInt(e.target.value) }))}
                  className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/50" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest block mb-1">URL do Webhook n8n</label>
                <input type="url" value={cfgForm.n8n_webhook_url} onChange={e => setCfgForm(f => ({ ...f, n8n_webhook_url: e.target.value }))}
                  placeholder="https://n8n.seudominio.com/webhook/..." className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/50" />
              </div>
              {/* Callback URL - para configurar no n8n */}
              <div className="border border-dashed border-emerald-400/40 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-xl p-4">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                  <Activity size={10} /> URL de Callback (configure no n8n)
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-2.5">
                  Coloque esta URL no nó <strong>"Callback GrapeHub"</strong> do seu workflow n8n. Quando o envio for bem-sucedido, o n8n faz um POST aqui para confirmar.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[11px] font-mono bg-white dark:bg-dark-bg border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-emerald-700 dark:text-emerald-300 truncate select-all">
                    {callbackUrl}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(callbackUrl); setCopiedCallback(true); setTimeout(() => setCopiedCallback(false), 2000); }}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                      copiedCallback
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-white dark:bg-dark-bg border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 hover:border-emerald-400/50 hover:text-emerald-600'
                    }`}
                  >
                    {copiedCallback ? <><Check size={11} /> Copiado!</> : <><Copy size={11} /> Copiar</>}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2">
                  Corpo esperado: <code className="font-mono">{`{ "dispatch_id": "...", "success": true }`}</code>
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-dark-bg/30 flex justify-end gap-3">
              <button onClick={() => setShowConfigModal(false)} className="px-4 py-2 text-gray-500 text-xs font-bold">Cancelar</button>
              <button onClick={handleSaveConfig} disabled={savingCfg} className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50">
                {savingCfg && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send-all confirm ────────────────────────────────────────────────── */}
      {showSendAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSendAllConfirm(false)}>
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-[22px] w-full max-w-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Disparar fila completa?</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Isso irá enviar <strong className="text-gray-900 dark:text-white">{dispatchItems.filter(i => i.status === 'AGENDADO').length} mensagens</strong> agendadas para hoje, respeitando o intervalo configurado.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSendAllConfirm(false)} className="px-4 py-2 text-gray-500 text-xs font-bold">Cancelar</button>
              <button onClick={handleSendAll} className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold">Confirmar</button>
            </div>
          </div>
        </div>
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

// ── InadimplentesBlock ─────────────────────────────────
interface InadimplentesCharge {
  id: number;
  asaas_id: string;
  value: string;
  due_date: string;
  billing_type: string;
  status: string;
  description: string | null;
  invoice_url: string | null;
}

interface InadimplentesClient {
  customer_id: string;
  customer_name: string | null;
  phone: string | null;
  cnpjcpf: string | null;
  email: string | null;
  client_id: string | null;
  client_name_internal: string | null;
  squad: string | null;
  total_charges: number;
  total_value: string;
  oldest_due_date: string;
  latest_due_date: string;
  max_days_overdue: number;
  charges: InadimplentesCharge[];
}

const getDaysColor = (days: number) => {
  if (days >= 30) return { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' };
  if (days >= 15) return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
  return { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };
};

const getWhatsAppMessage = (client: InadimplentesClient) => {
  const totalStr = parseFloat(client.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dias = client.max_days_overdue;
  const name = client.customer_name?.split(' ')[0] || 'Cliente';
  return encodeURIComponent(
    `Olá ${name}, tudo bem? 👋\n\nIdentificamos que há ${client.total_charges} cobrança(s) em aberto no total de *${totalStr}*, com atraso de ${dias} dia(s).\n\nPodemos verificar juntos para regularizar essa situação? Estamos à disposição para ajudar! 🤝`
  );
};

const InadimplentesBlock = () => {
  const [clients, setClients] = useState<InadimplentesClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'days' | 'value' | 'charges'>('days');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fin/inadimplentes');
      if (res.ok) setClients(await res.json());
    } catch (err) {
      console.error('Error fetching inadimplentes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = clients
    .filter(c => !search || c.customer_name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))
    .sort((a, b) => {
      if (sortBy === 'days') return (b.max_days_overdue || 0) - (a.max_days_overdue || 0);
      if (sortBy === 'value') return parseFloat(b.total_value) - parseFloat(a.total_value);
      return Number(b.total_charges) - Number(a.total_charges);
    });

  const totalAmount = clients.reduce((s, c) => s + parseFloat(c.total_value || '0'), 0);
  const avgDays = clients.length > 0 ? Math.round(clients.reduce((s, c) => s + (c.max_days_overdue || 0), 0) / clients.length) : 0;
  const criticalCount = clients.filter(c => c.max_days_overdue >= 30).length;

  const copyWhatsAppMsg = (client: InadimplentesClient) => {
    const msg = decodeURIComponent(getWhatsAppMessage(client));
    navigator.clipboard.writeText(msg);
    setCopiedId(client.customer_id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-dark-card border border-rose-500/20 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-rose-500/10"><Users size={16} className="text-rose-400" /></div>
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Inadimplentes</span>
          </div>
          <p className="text-3xl font-black text-rose-400">{clients.length}</p>
          <p className="text-xs text-slate-500 mt-1">clientes com atraso</p>
        </div>

        <div className="bg-dark-card border border-orange-500/20 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-orange-500/10"><DollarSign size={16} className="text-orange-400" /></div>
            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Total Em Risco</span>
          </div>
          <p className="text-3xl font-black text-orange-400">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-slate-500 mt-1">em cobranças abertas</p>
        </div>

        <div className="bg-dark-card border border-amber-500/20 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-amber-500/10"><Clock size={16} className="text-amber-400" /></div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Média De Atraso</span>
          </div>
          <p className="text-3xl font-black text-amber-400">{avgDays}d</p>
          <p className="text-xs text-slate-500 mt-1">dias em média</p>
        </div>

        <div className="bg-dark-card border border-rose-600/30 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-rose-600/10"><AlertTriangle size={16} className="text-rose-500" /></div>
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Críticos +30d</span>
          </div>
          <p className="text-3xl font-black text-rose-500">{criticalCount}</p>
          <p className="text-xs text-slate-500 mt-1">clientes críticos</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente ou telefone..."
            className="w-full pl-9 pr-4 py-2 bg-dark-card border border-white/10 rounded-xl text-sm text-dark-text focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20"
          />
        </div>
        <div className="flex items-center gap-1 bg-dark-card border border-white/10 rounded-xl p-1">
          {([['days', 'Atraso'], ['value', 'Valor'], ['charges', 'Cobranças']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${sortBy === key ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:border-white/20 transition-all"
        >
          <RefreshCw size={13} />
          Atualizar
        </button>
      </div>

      {/* Clients List */}
      <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-dark-text mb-1">Nenhum inadimplente!</p>
            <p className="text-sm text-slate-500">Todos os clientes estão em dia com os pagamentos.</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-dark-bg/50 border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <span>Cliente</span>
              <span>Cobranças</span>
              <span>Total Em Aberto</span>
              <span>Atraso</span>
              <span className="w-24 text-center">Ações</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/5">
              {filtered.map(client => {
                const daysColor = getDaysColor(client.max_days_overdue || 0);
                const isExpanded = expandedId === client.customer_id;
                const waMsg = getWhatsAppMessage(client);
                const phone = client.phone?.replace(/\D/g, '');
                const waUrl = phone ? `https://wa.me/55${phone}?text=${waMsg}` : null;

                return (
                  <div key={client.customer_id}>
                    {/* Main Row */}
                    <div
                      className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors cursor-pointer items-center"
                      onClick={() => setExpandedId(isExpanded ? null : client.customer_id)}
                    >
                      {/* Client Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${daysColor.bg} ${daysColor.text}`}>
                          {(client.customer_name || 'X').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-dark-text truncate">{client.customer_name || 'Desconhecido'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {client.phone && (
                              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Phone size={9} /> {client.phone}
                              </span>
                            )}
                            {client.squad && (
                              <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full">
                                {client.squad}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Total Charges */}
                      <div>
                        <span className={`text-xs font-bold ${daysColor.text} ${daysColor.bg} border ${daysColor.border} px-2 py-1 rounded-full`}>
                          {client.total_charges} {Number(client.total_charges) === 1 ? 'cobrança' : 'cobranças'}
                        </span>
                      </div>

                      {/* Total Value */}
                      <div>
                        <p className="text-sm font-black text-rose-400">{formatCurrency(client.total_value)}</p>
                        <p className="text-[10px] text-slate-500">Desde {fmtDate(client.oldest_due_date)}</p>
                      </div>

                      {/* Days Overdue */}
                      <div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border ${daysColor.bg} ${daysColor.text} ${daysColor.border}`}>
                          <Clock size={10} />
                          {client.max_days_overdue}d de atraso
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 w-24 justify-end" onClick={e => e.stopPropagation()}>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir WhatsApp"
                            className="flex items-center gap-1 px-2 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-[10px] font-bold transition-all"
                          >
                            <MessageCircle size={11} /> WA
                          </a>
                        )}
                        <button
                          onClick={() => copyWhatsAppMsg(client)}
                          title="Copiar mensagem"
                          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                            copiedId === client.customer_id
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {copiedId === client.customer_id ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                        <button className={`transition-colors ${isExpanded ? 'text-rose-400' : 'text-slate-500'}`}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded: Charge Detail */}
                    {isExpanded && (
                      <div className="bg-dark-bg/50 border-t border-white/5 px-5 py-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Cobranças em Aberto</p>
                        <div className="space-y-2">
                          {client.charges.map((charge, idx) => {
                            const bt = BILLING_LABELS[charge.billing_type] || BILLING_LABELS['UNDEFINED'];
                            const daysLate = Math.floor((Date.now() - new Date(charge.due_date).getTime()) / (1000 * 60 * 60 * 24));
                            const c = getDaysColor(daysLate);
                            return (
                              <div key={idx} className="flex items-center justify-between p-3 bg-dark-card rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-lg">{bt.icon}</span>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-dark-text truncate max-w-[300px]">{charge.description || 'Cobrança'}</p>
                                    <p className="text-[10px] text-slate-500">Venceu em {fmtDate(charge.due_date)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                                    {daysLate}d atraso
                                  </span>
                                  <span className="text-sm font-black text-rose-400">{formatCurrency(charge.value)}</span>
                                  {charge.invoice_url && (
                                    <a
                                      href={charge.invoice_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 rounded-lg text-[10px] font-bold transition-all"
                                    >
                                      <ExternalLink size={10} /> Ver Fatura
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {client.email && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <Mail size={12} />
                            <span>{client.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer summary */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-2 text-xs text-slate-500">
          <span>{filtered.length} cliente(s) com cobranças em atraso</span>
          <span className="font-bold text-rose-400">Total: {formatCurrency(totalAmount)}</span>
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
  const [mainTab, setMainTab] = useState<'receber' | 'cobrancas' | 'inadimplentes'>('receber');
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
        <button
          onClick={() => setMainTab('inadimplentes')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${mainTab === 'inadimplentes' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <span>Inadimplentes</span>
          {vencidos.length > 0 && <span className="text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded-full">{vencidos.length}</span>}
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

            {/* ══ Tab: Inadimplentes ══ */}
            {mainTab === 'inadimplentes' && (
              <InadimplentesBlock />
            )}
          </>
        )}
      </div>
    </div>
  );
}
