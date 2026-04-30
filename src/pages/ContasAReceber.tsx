import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Clock, CreditCard, Zap, FileText, ExternalLink, Settings, AlertTriangle, Pause, Play, Check, X, ShieldAlert, Activity, CheckCircle2, Send, Settings2, Search } from 'lucide-react';

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
}

interface SummaryData {
  preventivo: number;
  vencimento: number;
  reativo: number;
  humano: number;
}

const CollectionRulesBlock = () => {
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

  const phaseLabels: Record<string, string> = { preventivo: 'Em Preventivo', vencimento: 'No Vencimento', reativo: 'Em Atraso', humano: 'Contato Humano' };

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
          fetch('/api/fin/collection/events/queue'),
          fetch('/api/fin/collection/events/stats'),
        ]);
        if (sumRes.ok) setSummary(await sumRes.json());
        if (rulesRes.ok) setRules(await rulesRes.json());
        if (queueRes.ok) setQueue(await queueRes.json());
        if (statsRes.ok) setQueueStats(await statsRes.json());
      } catch (err) {
        console.error('Error fetching collection data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const hoje = new Date().toISOString().split('T')[0];
  const disparosHoje = queueStats.hoje;
  const concluidos = queueStats.ultimos7dias;
  const pendentes = queueStats.agendados;

  const filteredQueue = queue.filter(q => 
    !searchTerm || q.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

              <div className="rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-dark-bg/50 border-b border-gray-100 dark:border-white/5">
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Cliente / Valor</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Regra Acionada</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Canal</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">Data Programada</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredQueue.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-slate-400 text-sm">
                          Nenhum disparo encontrado.
                        </td>
                      </tr>
                    ) : filteredQueue.map((item, idx) => {
                      const phaseKey = item.day_offset < 0 ? 'preventivo' : item.day_offset === 0 ? 'vencimento' : item.day_offset >= 10 ? 'humano' : 'reativo';
                      const badgeColor = timelineStyles[phaseKey]?.pillBg + ' ' + timelineStyles[phaseKey]?.text;
                      const badgeLabel = item.day_offset < 0 ? `D${item.day_offset}` : item.day_offset === 0 ? 'D0' : `D+${item.day_offset}`;
                      const fmtTriggered = item.triggered_at ? new Date(item.triggered_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : fmtDate(item.scheduled_date);

                      return (
                        <tr key={idx} className="bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{item.client_name || 'Desconhecido'}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{formatCurrency(item.value)} • Venc: {fmtDate(item.due_date)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border border-current opacity-80 ${badgeColor}`}>{badgeLabel}</span>
                              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{item.rule_label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md border border-gray-200 dark:border-white/5">
                              {item.channel}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-gray-600 dark:text-slate-400">{fmtTriggered}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
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
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-full">
                                <Clock size={12} /> Pendente
                              </span>
                            )}
                            {item.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-full">
                                <Clock size={12} /> Agendado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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

            <CollectionRulesBlock />
          </>
        )}
      </div>
    </div>
  );
}
