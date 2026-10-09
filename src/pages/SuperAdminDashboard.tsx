import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, RefreshCw, Phone, Mail, CheckCircle2, CalendarClock, Send, CalendarDays, Clock,
  Home, Laptop, Truck, Receipt, Megaphone, Wrench, Code, DollarSign, Users, Zap,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import SplitHeadline from '../components/SplitHeadline';

/**
 * Página `dashboard-financeiro` (template `superadmin-dashboard`) — é um RESUMO DO DIA, não um
 * painel de caixa (esclarecido pelo Jean em 09/10/2026): contas a pagar de hoje, cobranças
 * automáticas enviadas e as próximas contas a pagar. Saldo, gráfico e inadimplência ficam no
 * Fluxo de Caixa e em Contas a Receber.
 * Tudo vem de `/api/superadmin/dashboard-stats` (próximas = até 14 dias à frente).
 */

const CAT_COLORS: Record<string, string> = {
  'Salários': '#8b5cf6', 'Aluguel': '#f59e0b', 'Software': '#3b82f6', 'Marketing': '#ec4899', 'Impostos': '#f43f5e',
  'Serviços': '#14b8a6', 'Fornecedores': '#f97316', 'Utilidades': '#06b6d4', 'Equipamentos': '#6366f1',
  'Cartão de Crédito': '#64748b', 'Outros': '#64748b',
};
const iconeCategoria = (c: string, size = 14) => {
  switch (c) {
    case 'Aluguel': return <Home size={size} />;
    case 'Equipamentos': return <Laptop size={size} />;
    case 'Fornecedores': return <Truck size={size} />;
    case 'Impostos': return <Receipt size={size} />;
    case 'Marketing': return <Megaphone size={size} />;
    case 'Salários': return <Users size={size} />;
    case 'Serviços': return <Wrench size={size} />;
    case 'Software': return <Code size={size} />;
    case 'Utilidades': return <Zap size={size} />;
    default: return <DollarSign size={size} />;
  }
};

interface CobrancaItem {
  id: string; customer_name: string; rule_label: string; day_offset?: number | null; channel: string;
  triggered_at: string; status: string; error_message?: string;
}
interface BillItem { id: number; bill_name: string; category: string; expected_value: string; actual_value: string | null; status: string; due_date: string }
interface Stats {
  cobrancas: { hoje: number; mes: number; recentes: CobrancaItem[] };
  contas_pagar_hoje: { total_pendente: number; total_pago: number; itens: BillItem[] };
  contas_pagar_proximas: BillItem[];
}

const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v: any) => parseFloat(v) || 0;
const isoLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const rotuloDia = (iso: string) => {
  const am = new Date(); am.setDate(am.getDate() + 1);
  if (iso === isoLocal(am)) return `Amanhã · ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const d = new Date(`${iso}T12:00:00`);
  return `${SEMANA[d.getDay()]} · ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
};
const tempoAtras = (s: string | null) => {
  if (!s) return '';
  const min = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.floor(h / 24)} d`;
};

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [soErros, setSoErros] = useState(false);

  const carregar = useCallback(async (silencioso = false) => {
    silencioso ? setAtualizando(true) : setCarregando(true);
    setErro(null);
    try {
      const r = await fetch('/api/superadmin/dashboard-stats');
      if (!r.ok) throw new Error('Falha ao carregar o resumo');
      setStats(await r.json());
      setAtualizadoEm(new Date());
    } catch (e: any) {
      setErro(e.message || 'Erro inesperado');
    } finally {
      setCarregando(false); setAtualizando(false);
    }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  if (carregando) return <div className="flex justify-center items-center min-h-[70vh] w-full"><LoadingSpinner size="lg" /></div>;
  if (erro || !stats) {
    return (
      <div className="p-8">
        <div className="max-w-md mx-auto mt-20 text-center rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
          <AlertTriangle className="mx-auto text-rose-500 mb-2" />
          <p className="text-sm text-rose-500 font-semibold">{erro || 'Sem dados'}</p>
          <button onClick={() => carregar()} className="mt-4 h-9 px-4 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500">Tentar de novo</button>
        </div>
      </div>
    );
  }

  // Contas de hoje (pagas e pendentes) e as próximas, agrupadas por dia
  const hoje = stats.contas_pagar_hoje?.itens || [];
  const hojePendentes = hoje.filter(b => b.status !== 'paid' && b.status !== 'cancelled');
  const proximas = stats.contas_pagar_proximas || [];
  const em7 = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return isoLocal(d); })();
  const semana = proximas.filter(b => String(b.due_date).slice(0, 10) <= em7);
  const porDia = new Map<string, BillItem[]>();
  for (const b of proximas) { const d = String(b.due_date).slice(0, 10); porDia.set(d, [...(porDia.get(d) || []), b]); }
  const dias = [...porDia].sort(([a], [b]) => a.localeCompare(b));

  const disparos = stats.cobrancas.recentes || [];
  const comErro = disparos.filter(d => String(d.status).toUpperCase() === 'ERRO');
  const lista = soErros ? comErro : disparos;

  const card = 'rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-dark-card/60';
  const Kpi = ({ Icone, cor, rotulo, valor, sub, alerta }: { Icone: any; cor: string; rotulo: string; valor: string; sub: string; alerta?: boolean }) => (
    <div className={`px-5 py-4 rounded-2xl border ${alerta ? 'bg-rose-500/[0.06] border-rose-500/20' : 'bg-white dark:bg-dark-card/60 border-slate-200 dark:border-white/5'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${cor}1a`, color: cor }}><Icone size={14} /></div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{rotulo}</p>
      </div>
      <h3 className={`text-2xl font-bold ${alerta ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>{valor}</h3>
      <p className={`text-[11px] mt-0.5 ${alerta ? 'text-rose-400' : 'text-slate-500'}`}>{sub}</p>
    </div>
  );
  const LinhaConta = ({ b, pago }: { b: BillItem; pago?: boolean }) => {
    const cor = CAT_COLORS[b.category] || '#64748b';
    return (
      <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cor}1f`, color: cor }}>{iconeCategoria(b.category)}</div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold truncate ${pago ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{b.bill_name}</p>
          <p className="text-[10px] text-slate-500">{b.category}</p>
        </div>
        <p className={`text-sm font-bold shrink-0 ${pago ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>{brl(num(pago && b.actual_value ? b.actual_value : b.expected_value))}</p>
        {pago
          ? <span className="shrink-0 inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500"><CheckCircle2 size={10} /> Pago</span>
          : <span className="shrink-0 inline-flex items-center h-5 px-2 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">Pendente</span>}
      </div>
    );
  };

  return (
    <div className="p-8 pb-12 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <SplitHeadline text="Dashboard " highlight="Financeiro" subtitle="Resumo do dia: contas a pagar e cobranças enviadas." />
        <button onClick={() => carregar(true)} title="Atualizar"
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-slate-500 hover:text-violet-500 flex items-center gap-2 shrink-0">
          <RefreshCw size={14} className={atualizando ? 'animate-spin' : ''} />
          {atualizadoEm ? `Atualizado às ${atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Atualizar'}
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi Icone={CalendarClock} cor="#7c3aed" rotulo="A pagar hoje" valor={brl(stats.contas_pagar_hoje.total_pendente)}
          sub={hoje.length ? `${hojePendentes.length} pendente${hojePendentes.length === 1 ? '' : 's'} · ${brl(stats.contas_pagar_hoje.total_pago)} já pago` : 'nada vence hoje'} />
        <Kpi Icone={CalendarDays} cor="#3b82f6" rotulo="Próximos 7 dias" valor={brl(semana.reduce((t, b) => t + num(b.expected_value), 0))}
          sub={semana.length ? `${semana.length} conta${semana.length > 1 ? 's' : ''} a pagar` : 'nada na semana'} />
        <Kpi Icone={Send} cor="#10b981" rotulo="Cobranças hoje" valor={String(stats.cobrancas.hoje)} sub={`${stats.cobrancas.mes} enviadas no mês`} />
        <Kpi Icone={AlertTriangle} cor="#f43f5e" rotulo="Cobranças com erro" valor={String(comErro.length)}
          sub={comErro.length ? 'não chegaram ao cliente' : 'todas entregues'} alerta={comErro.length > 0} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-5 items-start">
        {/* Contas a pagar */}
        <div className={`${card} p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={15} className="text-violet-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Vencem hoje</h3>
            <span className="ml-auto text-xs font-bold text-slate-900 dark:text-white">{brl(hoje.reduce((t, b) => t + num(b.expected_value), 0))}</span>
          </div>
          {hoje.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Nenhuma conta vence hoje.</p>
          ) : (
            <div className="-mx-1 mb-2">{hoje.map(b => <LinhaConta key={b.id} b={b} pago={b.status === 'paid'} />)}</div>
          )}

          <div className="flex items-center gap-2 mt-4 mb-2 pt-4 border-t border-slate-100 dark:border-white/5">
            <Clock size={15} className="text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Próximas contas a pagar</h3>
            <span className="text-[11px] text-slate-500">· 14 dias</span>
            <span className="ml-auto text-xs font-bold text-slate-900 dark:text-white">{brl(proximas.reduce((t, b) => t + num(b.expected_value), 0))}</span>
          </div>
          {dias.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Nenhuma conta nos próximos 14 dias.</p>
          ) : (
            <div className="space-y-3 -mx-1">
              {dias.map(([d, itens]) => (
                <div key={d}>
                  <div className="flex items-center justify-between px-2 mb-0.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{rotuloDia(d)}</p>
                    <p className="text-[10px] font-bold text-slate-400">{brl(itens.reduce((t, b) => t + num(b.expected_value), 0))}</p>
                  </div>
                  {itens.map(b => <LinhaConta key={b.id} b={b} />)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cobranças enviadas */}
        <div className={`${card} p-5`}>
          <div className="flex items-center gap-2 mb-3">
            <Send size={15} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cobranças enviadas</h3>
            <div className="ml-auto flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.04]">
              {[{ v: false, r: `Todas (${disparos.length})` }, { v: true, r: `Com erro (${comErro.length})` }].map(o => (
                <button key={String(o.v)} onClick={() => setSoErros(o.v)}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors ${soErros === o.v ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
                  {o.r}
                </button>
              ))}
            </div>
          </div>
          {lista.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-10">{soErros ? 'Nenhum erro nos últimos disparos.' : 'Nenhum disparo recente.'}</p>
          ) : (
            <div className="-mx-1 space-y-0.5">
              {lista.map(d => {
                const st = String(d.status).toUpperCase();
                const isErro = st === 'ERRO', enviando = st === 'ENVIANDO';
                const email = String(d.channel || '').toUpperCase() === 'EMAIL';
                const off = d.day_offset;
                const rot = off == null ? null : off < 0 ? `D${off}` : off === 0 ? 'D0' : `D+${off}`;
                return (
                  <div key={d.id} className={`flex items-start gap-3 px-2 py-2.5 rounded-lg ${isErro ? 'bg-rose-500/[0.06]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'}`}>
                    <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold ${isErro ? 'bg-rose-500/10 text-rose-500' : enviando ? 'bg-blue-500/10 text-blue-500' : 'bg-violet-500/10 text-violet-500'}`}>
                      {(d.customer_name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate flex-1">{d.customer_name}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">{tempoAtras(d.triggered_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 min-w-0">
                        {rot && <span className={`shrink-0 font-bold ${off! < 0 ? 'text-blue-500' : off === 0 ? 'text-amber-500' : 'text-violet-500'}`}>{rot}</span>}
                        <span className="truncate">{d.rule_label || 'Cobrança'}</span>
                        <span className="shrink-0" title={email ? 'E-mail' : 'WhatsApp'}>{email ? <Mail size={11} /> : <Phone size={11} />}</span>
                      </div>
                      {isErro && d.error_message && <p className="mt-1 text-[11px] text-rose-500 break-words">{d.error_message}</p>}
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold ${
                      isErro ? 'bg-rose-500/10 text-rose-500' : enviando ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {isErro ? <><AlertTriangle size={10} /> Erro</> : enviando ? 'Enviando' : <><CheckCircle2 size={10} /> Enviado</>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
