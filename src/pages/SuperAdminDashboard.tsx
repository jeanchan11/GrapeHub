import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Zap, Calendar, AlertTriangle, Users, TrendingUp, CheckCircle, Clock, ArrowUpRight, Phone, Mail, FileText,
  Home, Laptop, Truck, Receipt, Megaphone, Wrench, Code, DollarSign } from 'lucide-react';

import LoadingSpinner from '../components/LoadingSpinner';
import SplitHeadline from '../components/SplitHeadline';

// Mesmas cores e ícones de categoria da página Contas a Pagar, para as duas telas
// falarem a mesma língua visual.
const CAT_COLORS: Record<string, string> = {
  'Salários': 'bg-violet-500', 'Aluguel': 'bg-amber-500', 'Software': 'bg-blue-500',
  'Marketing': 'bg-pink-500', 'Impostos': 'bg-rose-500', 'Serviços': 'bg-teal-500',
  'Fornecedores': 'bg-orange-500', 'Utilidades': 'bg-cyan-500', 'Equipamentos': 'bg-indigo-500',
  'Outros': 'bg-slate-500',
};

const getCategoryIcon = (category: string, size = 16) => {
  switch (category) {
    case 'Aluguel':      return <Home size={size} />;
    case 'Equipamentos': return <Laptop size={size} />;
    case 'Fornecedores': return <Truck size={size} />;
    case 'Impostos':     return <Receipt size={size} />;
    case 'Marketing':    return <Megaphone size={size} />;
    case 'Salários':     return <Users size={size} />;
    case 'Serviços':     return <Wrench size={size} />;
    case 'Software':     return <Code size={size} />;
    case 'Utilidades':   return <Zap size={size} />;
    default:             return <DollarSign size={size} />;
  }
};

interface CobrancaItem {
  id: string;
  customer_name: string;
  customer_phone?: string | null;
  rule_label: string;
  day_offset?: number | null;
  channel: string;
  triggered_at: string;
  sent_at?: string | null;
  message_rendered?: string | null;
  status: string;
}

interface BillItem {
  id: number;
  bill_name: string;
  category: string;
  expected_value: string;
  actual_value: string | null;
  status: string;
  due_date: string;
}

interface OverdueItem {
  id: number;
  customer_name: string;
  valor: string;
  due_date: string;
  dias_atraso: number;
}

interface LeadItem {
  id: number;
  nome: string;
  telefone: string;
  email: string;
  created_at: string;
  coluna_nome: string;
}

interface DashboardData {
  cobrancas: {
    hoje: number;
    mes: number;
    recentes: CobrancaItem[];
  };
  contas_pagar_hoje: {
    total_pendente: number;
    total_pago: number;
    itens: BillItem[];
  };
  contas_pagar_proximas: BillItem[];
  clientes_atraso: {
    total_quantidade: number;
    total_valor: number;
    recentes: OverdueItem[];
  };
  leads: {
    novos_hoje: number;
    novos_mes: number;
    recentes: LeadItem[];
  };
  comercial_kpis: {
    faturamento_vendas: number;
    quantidade_vendas: number;
    reunioes_marcadas: number;
    reunioes_realizadas: number;
  };
}

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  // Tooltip de detalhe do disparo (igual ao Contas a Receber)
  const [tooltipData, setTooltipData] = useState<{ item: CobrancaItem; x: number; y: number } | null>(null);
  const showTooltip = (e: React.MouseEvent, item: CobrancaItem) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipData({ item, x: rect.left, y: rect.top });
  };
  const hideTooltip = () => setTooltipData(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/superadmin/dashboard-stats');
      if (!res.ok) throw new Error('Falha ao carregar dados do servidor');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('SuperAdminDashboard fetch error:', err);
      setError(err.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatBRL = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return (num || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const cleanDate = dateStr.slice(0, 10);
      const [y, m, d] = cleanDate.split('-');
      return `${d}/${m}/${y}`;
    } catch {
      return dateStr;
    }
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours}h`;
    return `há ${Math.floor(hours / 24)}d`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh] bg-light-bg dark:bg-dark-bg w-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-light-bg dark:bg-dark-bg w-full text-red-500">
        <p className="font-bold text-lg mb-2">Erro ao carregar o painel</p>
        <p className="text-sm mb-4">{error || 'Dados inválidos'}</p>
        <button
          onClick={fetchStats}
          className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-all shadow-lg"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-light-bg dark:bg-dark-bg text-slate-900 dark:text-slate-100 font-sans p-8 overflow-y-auto w-full space-y-8">
      
      {/* ── Header ─────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SplitHeadline
            text="Dashboard "
            highlight="Financeiro"
            className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-0"
            subtitle="Gestão de cobranças e contas a pagar"
            subtitleClassName="text-sm text-gray-500 dark:text-gray-400 mt-1"
          />
        </div>
        <button 
          onClick={fetchStats}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm"
          title="Atualizar dados"
        >
          <TrendingUp size={16} />
        </button>
      </div>

      {/* ── KPI Grid ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        
        {/* Cobranças */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 flex flex-col justify-between shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cobranças Enviadas</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Zap size={16} className="text-violet-500" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-850 dark:text-white">{data.cobrancas.hoje}</p>
          <p className="text-xs text-slate-500 mt-1">
            Disparos efetuados hoje · <span className="font-bold">{data.cobrancas.mes}</span> no mês
          </p>
        </motion.div>

        {/* Contas a Pagar de Hoje */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 flex flex-col justify-between shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">A Pagar (Hoje)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Calendar size={16} className="text-amber-500" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-850 dark:text-white">{formatBRL(data.contas_pagar_hoje.total_pendente)}</p>
          <p className="text-xs text-slate-500 mt-1">
            {data.contas_pagar_hoje.itens.filter(i => i.status === 'paid').length} de {data.contas_pagar_hoje.itens.length} pagas hoje ({formatBRL(data.contas_pagar_hoje.total_pago)} pago)
          </p>
        </motion.div>
      </div>

      {/* ── Main content (2 columns) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ── Coluna Esquerda: Financeiro ── */}
        <div className="space-y-6">
          {/* Contas a Pagar de Hoje */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col min-h-[300px]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">
                Contas a Pagar (Vencem Hoje)
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {data.contas_pagar_hoje.itens.length} lançamentos
              </span>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[350px] pr-1">
              {data.contas_pagar_hoje.itens.map(item => {
                const isPaid = item.status === 'paid';
                return (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-all"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.bill_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500">
                          {item.category}
                        </span>
                        {isPaid ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-0.5">
                            <CheckCircle size={8} /> Pago
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center gap-0.5">
                            <Clock size={8} /> Pendente
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-800 dark:text-white">
                        {formatBRL(item.expected_value)}
                      </p>
                      {item.actual_value && (
                        <p className="text-[10px] text-slate-500">Pago: {formatBRL(item.actual_value)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {data.contas_pagar_hoje.itens.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <span className="text-3xl mb-2">🎉</span>
                  <p className="text-sm font-medium">Nenhuma conta com vencimento para hoje.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Próximas Contas a Pagar — mesmo visual da página Contas a Pagar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Calendar size={14} className="text-violet-500" />
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">
                  Próximas Contas a Pagar
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {data.contas_pagar_proximas.length} próximas
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {data.contas_pagar_proximas.map((item, idx) => {
                const dueDate = new Date(item.due_date + 'T12:00:00');
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
                const cat = item.category || 'Outros';
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.04 }}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Ícone da categoria, como na página Contas a Pagar */}
                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white ${CAT_COLORS[cat] || 'bg-slate-500'}`}>
                      {getCategoryIcon(cat, 15)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.bill_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wide text-slate-500">
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${CAT_COLORS[cat] || 'bg-slate-500'}`} />
                          {cat}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="text-[10px] text-slate-400">{formatDate(item.due_date)}</span>
                      </div>
                    </div>

                    <p className="text-sm font-black text-slate-800 dark:text-white shrink-0">
                      {formatBRL(item.expected_value)}
                    </p>

                    <span className="shrink-0 w-[86px] text-right">
                      {diffDays < 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400">⚠ Atrasado</span>
                      ) : diffDays === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400">● Hoje</span>
                      ) : diffDays <= 7 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400">Em breve</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-400">Pendente</span>
                      )}
                    </span>
                  </motion.div>
                );
              })}
              {data.contas_pagar_proximas.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-10">Nenhuma conta futura prevista.</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Coluna Direita: Cobranças ── */}
        {/* `relative` + filho absoluto: o card ocupa a altura da linha do grid
            (ditada pela coluna esquerda) sem esticá-la. */}
        <div className="relative min-h-[420px]">
          <div className="lg:absolute lg:inset-0 flex flex-col">
          {/* Últimos Disparos de Cobrança */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col flex-1 min-h-0"
          >
            {/* Cabeçalho com resumo — erro ganha destaque quando existe */}
            {(() => {
              const rec = data.cobrancas.recentes;
              const erros = rec.filter(i => String(i.status).toUpperCase() === 'ERRO').length;
              const enviados = rec.filter(i => String(i.status).toUpperCase() === 'ENVIADO').length;
              return (
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">
                    Disparos Recentes
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-500">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{enviados} ok
                    </span>
                    {erros > 0 && (
                      <span className="flex items-center gap-1.5 text-rose-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />{erros} com erro
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.04]">
              {data.cobrancas.recentes.map((item, idx) => {
                const st = String(item.status || 'ENVIADO').toUpperCase();
                const isErro = st === 'ERRO';
                const isEnviando = st === 'ENVIANDO';
                const isEmail = String(item.channel || '').toUpperCase() === 'EMAIL';
                const accent = isErro ? 'bg-rose-500' : isEnviando ? 'bg-blue-500' : 'bg-emerald-500';
                const d = item.day_offset;
                const dLabel = d == null ? null : d < 0 ? `D${d}` : d === 0 ? 'D0' : `D+${d}`;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * idx }}
                    onMouseEnter={e => showTooltip(e, item)}
                    onMouseLeave={hideTooltip}
                    className={`relative flex items-start gap-3 pl-6 pr-5 py-3.5 transition-colors cursor-default ${
                      isErro ? 'bg-rose-500/[0.04] hover:bg-rose-500/[0.07]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <span className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />

                    <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-black uppercase ring-2 ${
                      isErro ? 'bg-rose-500/10 text-rose-500 ring-rose-500/20'
                        : isEnviando ? 'bg-blue-500/10 text-blue-500 ring-blue-500/20'
                        : 'bg-violet-500/10 text-violet-500 dark:text-violet-400 ring-violet-500/15'
                    }`}>
                      {(item.customer_name || 'X').charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.customer_name}</p>
                        <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{formatTimeAgo(item.triggered_at)}</span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1 min-w-0">
                        {dLabel && (
                          <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded ${
                            (d as number) < 0 ? 'bg-blue-500/10 text-blue-500'
                              : d === 0 ? 'bg-amber-500/10 text-amber-500'
                              : (d as number) >= 10 ? 'bg-violet-500/10 text-violet-500'
                              : 'bg-orange-500/10 text-orange-500'
                          }`}>{dLabel}</span>
                        )}
                        <span className="text-[11px] text-slate-500 truncate">{item.rule_label || 'Notificação de cobrança'}</span>
                        <span className="text-slate-300 dark:text-slate-700 shrink-0">·</span>
                        <span className="shrink-0 text-slate-400" title={isEmail ? 'E-mail' : 'WhatsApp'}>
                          {isEmail ? <Mail size={11} /> : <Phone size={11} />}
                        </span>
                      </div>

                      {/* Motivo do erro à vista — não só no tooltip */}
                      {isErro && (item as any).error_message && (
                        <p className="mt-1.5 text-[10px] text-rose-500/90 leading-snug line-clamp-2">
                          {(item as any).error_message}
                        </p>
                      )}
                    </div>

                    <span className={`shrink-0 self-center inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full border ${
                      isErro ? 'bg-rose-500/10 text-rose-500 border-rose-500/25'
                        : isEnviando ? 'bg-blue-500/10 text-blue-500 border-blue-500/25'
                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25'
                    }`}>
                      {isErro ? <><AlertTriangle size={9} /> Erro</>
                        : isEnviando ? <><Clock size={9} /> Enviando</>
                        : <><CheckCircle size={9} /> Enviado</>}
                    </span>
                  </motion.div>
                );
              })}
              {data.cobrancas.recentes.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-14">Nenhum disparo registrado recentemente.</p>
              )}
            </div>
          </motion.div>

          </div>
        </div>

      </div>

      {/* Tooltip de detalhe do disparo (hover) — igual ao Contas a Receber */}
      {tooltipData && (() => {
        const { item, x, y } = tooltipData;
        const isEmail = (item.channel || '').toUpperCase() === 'EMAIL';
        const metodo = isEmail ? 'E-mail' : 'WhatsApp';
        const time = item.sent_at || item.triggered_at;
        const timeStr = time
          ? new Date(time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—';
        const left = Math.min(x, window.innerWidth - 300);
        const top = y - 8;
        return (
          <div className="pointer-events-none" style={{ position: 'fixed', top, left, zIndex: 99999, transform: 'translateY(-100%)' }}>
            <div className="w-72 rounded-xl shadow-2xl p-3 border text-left bg-white dark:bg-gray-900 border-gray-200 dark:border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle size={10} /> Mensagem Enviada
              </p>
              <div className="space-y-1.5">
                <div className="flex gap-2 items-center">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 w-16 shrink-0">Método</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${isEmail ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>{metodo}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 w-16 shrink-0">Horário</span>
                  <span className="text-[10px] text-gray-900 dark:text-white font-medium">{timeStr}</span>
                </div>
                {item.customer_phone && (
                  <div className="flex gap-2">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 w-16 shrink-0">{isEmail ? 'E-mail' : 'Telefone'}</span>
                    <span className="text-[10px] text-gray-900 dark:text-white font-medium truncate">{item.customer_phone}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 w-16 shrink-0">Régua</span>
                  <span className="text-[10px] text-gray-900 dark:text-white font-medium truncate">{item.rule_label || '—'}</span>
                </div>
                {item.message_rendered && (
                  <div className="pt-1.5 border-t border-gray-100 dark:border-white/10">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Mensagem enviada</p>
                    <p className="text-[10px] text-gray-700 dark:text-gray-200 leading-relaxed line-clamp-4">{item.message_rendered}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
