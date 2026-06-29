import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Zap, Calendar, AlertTriangle, Users, TrendingUp, CheckCircle, Clock, ArrowUpRight, Phone, Mail, FileText } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import SplitHeadline from '../components/SplitHeadline';

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
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        
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

        {/* Clientes em Atraso */}
        <motion.div
          initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={`bg-white dark:bg-dark-card border rounded-2xl px-4 py-3 flex flex-col justify-between shadow-sm ${
            data.clientes_atraso.total_quantidade > 0 ? 'border-red-500/20 bg-red-500/[0.01]' : 'border-slate-200 dark:border-white/10'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inadimplência</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${data.clientes_atraso.total_quantidade > 0 ? 'bg-red-500/15' : 'bg-slate-500/10'}`}>
              <AlertTriangle size={16} className={data.clientes_atraso.total_quantidade > 0 ? 'text-red-500' : 'text-slate-400'} />
            </div>
          </div>
          <p className={`text-2xl font-black ${data.clientes_atraso.total_quantidade > 0 ? 'text-red-500' : 'text-slate-850 dark:text-white'}`}>
            {data.clientes_atraso.total_quantidade}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Clientes em atraso · Totalizando <span className="font-bold text-red-500">{formatBRL(data.clientes_atraso.total_valor)}</span>
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

          {/* Próximas Contas a Pagar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
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

            <div className="space-y-2">
              {data.contas_pagar_proximas.map((item, idx) => {
                const dueDate = new Date(item.due_date + 'T12:00:00');
                const today = new Date();
                today.setHours(0,0,0,0);
                const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isUrgent = diffDays <= 3;
                const isMedium = diffDays <= 7;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.04 }}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-1 h-8 rounded-full shrink-0 ${
                        isUrgent ? 'bg-red-500' : isMedium ? 'bg-amber-400' : 'bg-violet-400'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.bill_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500">
                            {item.category}
                          </span>
                          <span className={`text-[10px] font-bold ${
                            isUrgent ? 'text-red-400' : isMedium ? 'text-amber-400' : 'text-slate-400'
                          }`}>
                            Vence em {formatDate(item.due_date)}
                            {diffDays === 1 ? ' (amanhã)' : diffDays <= 3 ? ` (${diffDays}d)` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-black text-slate-800 dark:text-white">
                        {formatBRL(item.expected_value)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              {data.contas_pagar_proximas.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">Nenhuma conta futura prevista.</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Coluna Direita: Cobranças e Atrasos ── */}
        <div className="space-y-6">
          {/* Últimos Disparos de Cobrança */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col min-h-[300px]"
          >
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-4">
              Disparos de Cobrança Recentes
            </h3>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[350px]">
              {data.cobrancas.recentes.map(item => (
                <div
                  key={item.id}
                  onMouseEnter={e => showTooltip(e, item)}
                  onMouseLeave={hideTooltip}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100/50 dark:hover:bg-white/[0.03] transition-all cursor-default"
                >
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center text-xs shrink-0 text-violet-500 dark:text-violet-400 font-black uppercase">
                    {(item.customer_name || 'X').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.customer_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                      {item.day_offset != null && (() => {
                        const d = item.day_offset;
                        const label = d < 0 ? `D${d}` : d === 0 ? 'D0' : `D+${d}`;
                        const cls = d < 0 ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20'
                          : d === 0 ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20'
                          : d >= 10 ? 'bg-violet-500/10 text-violet-500 dark:text-violet-400 border-violet-500/20'
                          : 'bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20';
                        return <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>;
                      })()}
                      <span className="text-xs text-slate-500 truncate">{item.rule_label || 'Notificação de cobrança'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 block">{formatTimeAgo(item.triggered_at)}</span>
                    <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mt-1">
                      Enviado
                    </span>
                  </div>
                </div>
              ))}
              {data.cobrancas.recentes.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-10">Nenhum disparo registrado recentemente.</p>
              )}
            </div>
          </motion.div>

          {/* Clientes em Atraso (Lista de Detalhes) */}
          {data.clientes_atraso.recentes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-white dark:bg-dark-card border border-red-500/20 dark:border-red-900/30 bg-red-500/[0.01] rounded-2xl p-6 shadow-sm flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-red-500 uppercase tracking-widest">
                  Maiores Atrasos em Aberto
                </h3>
                <span className="text-xs font-bold text-red-400">
                  Atenção necessária
                </span>
              </div>

              <div className="space-y-2.5">
                {data.clientes_atraso.recentes.map(item => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-xl border border-red-500/10 bg-red-500/[0.02] hover:bg-red-500/[0.04] transition-all"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.customer_name}</p>
                      <p className="text-xs text-red-400 mt-0.5">
                        Atrasado há <span className="font-bold">{item.dias_atraso} dias</span> (Venceu em {formatDate(item.due_date)})
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-red-500">
                        {formatBRL(item.valor)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
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
