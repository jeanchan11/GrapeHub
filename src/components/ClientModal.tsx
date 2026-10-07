import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, UserPlus, CheckCircle2, AlertCircle, Link as LinkIcon, 
  ChevronDown, Search, Check, Unlink, FileText, MessageSquare,
  ShieldAlert, AlertTriangle, Calendar, Clock, User, Edit2,
  CreditCard, Briefcase, Package, Layout,
  Gavel, Scale, HeartPulse, ShieldCheck, Hammer, Landmark,
  Banknote, ShoppingCart, Home, Stethoscope, Building2,
  Globe, Activity, DollarSign, ArrowLeft
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { designSystem } from '../design-system';
import CrmCommentHistory from './CrmCommentHistory';
import { confirmDialog } from '../lib/confirm';
import { normalizePhoneBR, formatPhoneBR } from '../utils/phoneNormalize';

interface Client {
  id: string;
  name: string;
  startDate: string;
  location: string;
  squad: string;
  tags: string;
  email: string;
  phone: string;
  status: 'Ativo' | 'Inativo';
  createdAt: string;
  crmStatus?: string;
  product?: string;
  contracts?: string;
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  billingMethod?: string;
  billingNotes?: string;
  hasActiveSubscription?: boolean;
  subscriptionValue?: number;
  subscriptionNextDue?: string;
  subscriptionBillingType?: string;
  subscriptionCycle?: string;
  finPeopleGuid?: string;
  finSubscriptionId?: string;
}

interface FinPerson {
  id: string;
  guid: string;
  name: string;
  cnpjcpf: string;
  grapehub_client_id: string | null;
  asaas_id: string | null;
  linked_client_name: string | null;
}

interface FinMovement {
  movement_date: string | null;   // dia em que o cliente pagou (YYYY-MM-DD)
  credit_date?: string | null;    // dia em que o dinheiro cai (cartão: ~30 dias depois)
  expiration_date: string;
  movement_value: string;
  status: string;
  asaas_status?: string;
  payment_method?: string;
  invoice_url?: string | null;
  value?: string;
}

interface FinSubscription {
  id: string;
  customer_id: string;
  billing_type: string;
  value: number;
  next_due_date: string;
  status: string;
  cycle: string;
  description: string;
}

type SubLista = FinSubscription & {
  customer_name?: string; customer_cnpjcpf?: string; grapehub_client_id?: string;
  next_due?: string | null; linked_client_id?: string | null; linked_client_name?: string | null;
};

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingClient: Client | null;
  onSaveSuccess: () => void;
}

// Par rótulo/valor da aba "Dados do Cliente" (modo leitura). Vazio vira "—".
const Campo: React.FC<{ rotulo: string; className?: string; children?: React.ReactNode }> = ({ rotulo, className = '', children }) => {
  const vazio = children == null || children === '' || children === false;
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{rotulo}</p>
      <div className={`text-sm font-semibold break-words ${vazio ? 'text-slate-400' : 'text-light-text dark:text-white'}`}>{vazio ? '—' : children}</div>
    </div>
  );
};

const campoEd = 'w-full px-3 py-2 rounded-lg text-sm modal-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all';

const CampoEd: React.FC<{ rotulo: string; className?: string; children: React.ReactNode }> = ({ rotulo, className = '', children }) => (
  <div className={`min-w-0 ${className}`}>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{rotulo}</p>
    {children}
  </div>
);

// Lista curta (squad, produto, meio de cobrança) como botões: um clique, e o valor
// escolhido aparece com o mesmo destaque da leitura. Clicar no marcado desmarca.
const Escolha: React.FC<{ valor: string; opcoes: string[]; onChange: (v: string) => void }> = ({ valor, opcoes, onChange }) => (
  <div className="flex flex-wrap gap-1.5">
    {opcoes.map(o => (
      <button key={o} type="button" onClick={() => onChange(valor === o ? '' : o)}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
          valor === o
            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/40'
            : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-violet-500/40 hover:text-violet-500'
        }`}>{o}</button>
    ))}
  </div>
);

// ── Aba Financeiro ────────────────────────────────────────────────────────────
// Reescrita em 06/10/2026 (estava confusa, sobretudo ao escolher a assinatura).
//  • Escolha da assinatura é uma lista na própria aba, não um dropdown em portal.
//    Sugere primeiro as que têm o nome parecido com o do cliente e avisa quando a
//    assinatura já está ligada a OUTRO cliente — em 06/10/2026 eram 97 das 99
//    ativas, então escolher às cegas quase sempre duplicava.
//  • "Sem assinatura vinculada" deixou de ser a 1ª opção da lista: um clique nela
//    desvinculava. Desvincular agora é um botão com confirmação.
//  • "Pago em" é o dia em que o CLIENTE pagou. No cartão, o Asaas grava como
//    data de pagamento o dia em que o dinheiro cai (~30 dias depois); essa data
//    aparece embaixo, como "cai em". Ver /api/fin-people/:id/movements.
const brlC = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d?: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '');
const diaMes = (d?: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '');
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b.slice(0, 10) + 'T12:00:00') - Date.parse(a.slice(0, 10) + 'T12:00:00')) / 86400000);
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const MESES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const mesNome = (d: string) => `${MESES_NOME[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
const CICLO: Record<string, string> = { MONTHLY: 'Mensal', YEARLY: 'Anual', QUARTERLY: 'Trimestral', SEMIANNUALLY: 'Semestral', WEEKLY: 'Semanal', BIWEEKLY: 'Quinzenal' };
const FORMA: Record<string, string> = { BOLETO: 'Boleto', PIX: 'Pix', CREDIT_CARD: 'Cartão', UNDEFINED: 'Boleto ou Pix' };
const STATUS_SUB: Record<string, { t: string; c: string }> = {
  ACTIVE: { t: 'Ativa', c: 'bg-emerald-500/10 text-emerald-500' },
  INACTIVE: { t: 'Inativa', c: 'bg-slate-500/10 text-slate-500' },
  DELETED: { t: 'Cancelada', c: 'bg-rose-500/10 text-rose-500' },
  EXPIRED: { t: 'Expirada', c: 'bg-slate-500/10 text-slate-500' },
};

// Semelhança de nome: palavras em comum, ignorando as que todo escritório tem
const PALAVRAS_COMUNS = new Set(['advogados', 'advocacia', 'advogado', 'associados', 'sociedade', 'individual', 'ltda', 'eireli', 'escritorio', 'dos', 'das', 'consultoria', 'juridica', 'juridico']);
const palavrasDe = (t?: string | null) =>
  (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !PALAVRAS_COMUNS.has(w));

const AbaFinanceiro: React.FC<{
  clientName: string;
  subId: string;
  subs: SubLista[];
  carregandoSubs: boolean;
  movimentos: FinMovement[];
  carregandoMov: boolean;
  clientId?: string;
  onVincular: (id: string | null) => Promise<void> | void;
}> = ({ clientName, subId, subs, carregandoSubs, movimentos, carregandoMov, clientId, onVincular }) => {
  const [trocando, setTrocando] = useState(false);
  const [busca, setBusca] = useState('');
  const [comCanceladas, setComCanceladas] = useState(false);
  const [verTudo, setVerTudo] = useState(false);

  const sub = subs.find(s => String(s.id) === String(subId));
  const escolhendo = !subId || trocando;
  const hoje = hojeISO();

  const opcoes = React.useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const digitos = termo.replace(/\D/g, '');
    const doCliente = palavrasDe(clientName);
    return subs
      .filter(s => comCanceladas || s.status === 'ACTIVE')
      .filter(s => !termo
        || (s.customer_name || '').toLowerCase().includes(termo)
        || (digitos.length >= 3 && (s.customer_cnpjcpf || '').replace(/\D/g, '').includes(digitos)))
      .map(s => {
        const nomeSub = palavrasDe(s.customer_name);
        const pontos = doCliente.filter(w => nomeSub.includes(w)).length;
        const deOutro = !!s.linked_client_id && s.linked_client_id !== clientId;
        return { s, pontos, deOutro };
      })
      .sort((a, b) => b.pontos - a.pontos || Number(a.deOutro) - Number(b.deOutro)
        || (a.s.customer_name || '').localeCompare(b.s.customer_name || ''));
  }, [subs, busca, comCanceladas, clientName, clientId]);
  const sugeridas = opcoes.filter(o => o.pontos > 0);
  const demais = opcoes.filter(o => o.pontos === 0);
  const livres = subs.filter(s => s.status === 'ACTIVE' && !s.linked_client_id).length;

  const escolher = async (o: { s: SubLista; deOutro: boolean }) => {
    if (o.deOutro && !(await confirmDialog({
      title: 'Assinatura já vinculada',
      message: `Esta assinatura já está vinculada a "${o.s.linked_client_name}". Vincular também a este cliente fará os dois mostrarem a mesma mensalidade e os mesmos pagamentos.`,
      confirmText: 'Vincular mesmo assim',
    }))) return;
    await onVincular(String(o.s.id));
    setTrocando(false); setBusca('');
  };

  const desvincular = async () => {
    if (!(await confirmDialog({
      title: 'Desvincular assinatura',
      message: 'O cliente deixa de mostrar mensalidade e histórico de pagamentos até ser vinculado de novo. A assinatura no Asaas não é alterada.',
      confirmText: 'Desvincular', danger: true,
    }))) return;
    await onVincular(null);
  };

  // Resumo do mês corrente e do que está em atraso
  const doMes = movimentos.find(m => m.expiration_date?.slice(0, 7) === hoje.slice(0, 7));
  const atrasados = movimentos.filter(m => m.status === 'Atrasado');
  const valorAtraso = atrasados.reduce((t, m) => t + (parseFloat(m.movement_value) || 0), 0);
  const linhas = verTudo ? movimentos : movimentos.slice(0, 6);

  const Opcao = ({ o }: { o: { s: SubLista; deOutro: boolean } }) => {
    const atual = String(o.s.id) === String(subId);
    const st = STATUS_SUB[o.s.status] || { t: o.s.status, c: 'bg-slate-500/10 text-slate-500' };
    return (
      <button type="button" onClick={() => !atual && escolher(o)}
        className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all ${
          atual ? 'bg-violet-500/10 cursor-default' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold truncate ${atual ? 'text-violet-500' : 'text-light-text dark:text-white'}`}>{o.s.customer_name || 'Sem nome'}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {brlC(Number(o.s.value) || 0)} · {CICLO[o.s.cycle] || o.s.cycle} · {FORMA[o.s.billing_type] || o.s.billing_type}
            {o.s.customer_cnpjcpf ? ` · ${o.s.customer_cnpjcpf}` : ''}
          </p>
        </div>
        {o.s.status !== 'ACTIVE' && <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${st.c}`}>{st.t}</span>}
        {o.deOutro && (
          <span className="shrink-0 max-w-[180px] truncate px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400" title={o.s.linked_client_name || ''}>
            Já em: {o.s.linked_client_name}
          </span>
        )}
        {atual && <Check size={15} className="shrink-0 text-violet-500" />}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {/* ── Assinatura ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-sm font-bold text-light-text dark:text-white">Assinatura do Asaas</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">De onde vêm a mensalidade e o histórico de pagamentos</p>
          </div>
          {subId && !trocando && (
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => setTrocando(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-violet-500 hover:bg-violet-500/10 transition-all">Trocar</button>
              <button type="button" onClick={desvincular}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center gap-1.5">
                <Unlink size={13} /> Desvincular
              </button>
            </div>
          )}
        </div>

        {!escolhendo && (
          sub ? (
            <div className="flex items-center gap-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0"><CreditCard size={18} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-light-text dark:text-white truncate">{sub.customer_name || 'Sem nome'}</p>
                  {(() => { const st = STATUS_SUB[sub.status] || { t: sub.status, c: 'bg-slate-500/10 text-slate-500' };
                    return <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${st.c}`}>{st.t}</span>; })()}
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {CICLO[sub.cycle] || sub.cycle} · {FORMA[sub.billing_type] || sub.billing_type}
                  {sub.next_due ? ` · próximo vencimento ${dataBR(sub.next_due)}` : ''}
                  {sub.customer_cnpjcpf ? ` · ${sub.customer_cnpjcpf}` : ''}
                </p>
              </div>
              <p className="text-lg font-black text-light-text dark:text-white shrink-0">{brlC(Number(sub.value) || 0)}</p>
            </div>
          ) : carregandoSubs || subs.length === 0 ? (
            <div className="h-[68px] rounded-xl bg-slate-200/50 dark:bg-white/5 animate-pulse" />
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle size={14} className="shrink-0" />
              A assinatura vinculada (#{subId}) não está mais na lista do Asaas. Clique em Trocar para escolher outra.
            </div>
          )
        )}

        {escolhendo && (
          <div className="rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 overflow-hidden">
            <div className="p-3 border-b border-slate-200 dark:border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input autoFocus type="text" value={busca} onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar pelo nome ou CPF/CNPJ"
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm modal-input focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5">
              {carregandoSubs && subs.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Carregando assinaturas…</p>
              ) : opcoes.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">Nenhuma assinatura encontrada{busca ? ` para "${busca}"` : ''}.</p>
              ) : (
                <>
                  {sugeridas.length > 0 && (
                    <>
                      <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-violet-500 uppercase tracking-widest">Nome parecido com o do cliente</p>
                      {sugeridas.map(o => <Opcao key={o.s.id} o={o} />)}
                      {demais.length > 0 && <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Outras</p>}
                    </>
                  )}
                  {demais.map(o => <Opcao key={o.s.id} o={o} />)}
                </>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-500">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={comCanceladas} onChange={e => setComCanceladas(e.target.checked)} className="accent-violet-500" />
                Mostrar canceladas
              </label>
              <span>{livres} {livres === 1 ? 'ativa livre' : 'ativas livres'}</span>
              {trocando && (
                <button type="button" onClick={() => { setTrocando(false); setBusca(''); }}
                  className="font-bold text-slate-500 hover:text-light-text dark:hover:text-white">Cancelar</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Resumo + histórico ── */}
      {subId && (
        carregandoMov ? (
          <div className="py-14 flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-slate-500 text-xs font-medium">Carregando pagamentos…</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-6">
            <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/10 mb-6">
              <div className="pr-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Mensalidade</p>
                <p className="text-lg font-black text-light-text dark:text-white">{sub ? brlC(Number(sub.value) || 0) : '—'}</p>
              </div>
              <div className="px-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{MESES_NOME[Number(hoje.slice(5, 7)) - 1]}</p>
                {!doMes ? <p className="text-sm font-bold text-slate-400 mt-1">Sem cobrança no mês</p>
                  : doMes.status === 'Conciliado' ? <p className="text-sm font-bold text-emerald-500 mt-1">Pago em {diaMes(doMes.movement_date)}</p>
                  : doMes.status === 'Atrasado' ? <p className="text-sm font-bold text-rose-500 mt-1">Atrasado há {diasEntre(doMes.expiration_date, hoje)} dias</p>
                  : <p className="text-sm font-bold text-amber-500 mt-1">Vence {diaMes(doMes.expiration_date)}</p>}
              </div>
              <div className="pl-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Em atraso</p>
                {atrasados.length === 0 ? <p className="text-sm font-bold text-emerald-500 mt-1">Nada em atraso</p>
                  : <p className="text-sm font-bold text-rose-500 mt-1">{brlC(valorAtraso)} <span className="font-medium text-[11px]">· {atrasados.length} {atrasados.length === 1 ? 'cobrança' : 'cobranças'}</span></p>}
              </div>
            </div>

            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
              <FileText size={12} className="text-violet-500" /> Histórico de pagamentos
            </p>
            {movimentos.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Nenhuma cobrança deste cliente no Asaas.</p>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-transparent">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10">
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cobrança</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valor</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Situação</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Pago em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {linhas.map((m, idx) => {
                      const pago = m.status === 'Conciliado';
                      const atraso = pago && m.movement_date ? diasEntre(m.expiration_date, m.movement_date) : 0;
                      const credito = m.credit_date && m.credit_date !== m.movement_date ? m.credit_date : null;
                      const sit = pago ? { t: 'Pago', c: 'bg-emerald-500/10 text-emerald-500' }
                        : m.status === 'Atrasado' ? { t: 'Atrasado', c: 'bg-rose-500/10 text-rose-500' }
                        : m.status === 'Pendente' ? { t: 'Em aberto', c: 'bg-amber-500/10 text-amber-500' }
                        : { t: m.status, c: 'bg-slate-500/10 text-slate-500' };
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2.5">
                            <p className="text-xs font-bold text-light-text dark:text-white">{mesNome(m.expiration_date)}</p>
                            <p className="text-[10px] text-slate-500">vence {dataBR(m.expiration_date)}{m.payment_method ? ` · ${FORMA[m.payment_method] || m.payment_method}` : ''}</p>
                          </td>
                          <td className="px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300">{brlC(parseFloat(m.movement_value) || 0)}</td>
                          <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${sit.c}`}>{sit.t}</span></td>
                          <td className="px-4 py-2.5 text-right">
                            <p className="text-xs text-light-text dark:text-white">
                              {m.movement_date ? dataBR(m.movement_date) : <span className="text-slate-400">—</span>}
                              {atraso > 0 && <span className="ml-1.5 text-[10px] font-bold text-amber-500">+{atraso}d</span>}
                            </p>
                            {pago && credito && (
                              <p className="text-[10px] text-slate-500">{credito <= hoje ? 'caiu' : 'cai'} na conta em {dataBR(credito)}</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {movimentos.length > 6 && (
                  <button type="button" onClick={() => setVerTudo(v => !v)}
                    className="w-full py-2 text-[11px] font-bold text-violet-500 hover:bg-violet-500/5 border-t border-slate-200 dark:border-white/10">
                    {verTudo ? 'Mostrar só os 6 últimos' : `Ver todas as ${movimentos.length} cobranças`}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      )}

      {/* ── Comentários (independem da assinatura) ── */}
      {clientId && (
        <div className="space-y-4 pt-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <MessageSquare size={12} className="text-violet-500" /> Histórico de comentários
          </p>
          <CrmCommentHistory clientId={clientId} />
        </div>
      )}
    </div>
  );
};

const ClientModal = ({ isOpen, onClose, editingClient, onSaveSuccess }: ClientModalProps) => {
  const [activeTab, setActiveTab] = useState<'client' | 'finance' | 'churn' | 'projeto'>('client');
  const [finSubTab, setFinSubTab] = useState<'cadastro' | 'assinatura'>('cadastro');
  const finSearchRef = React.useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingChurn, setIsEditingChurn] = useState(false);
  const [churnData, setChurnData] = useState<any>(null);
  const [isLoadingChurn, setIsLoadingChurn] = useState(false);
  const [editChurnType, setEditChurnType] = useState('');
  const [editChurnReasons, setEditChurnReasons] = useState<string[]>([]);
  const [editChurnComment, setEditChurnComment] = useState('');
  const [billingPhoneError, setBillingPhoneError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    location: '',
    squad: 'Able',
    tags: '',
    email: '',
    phone: '',
    status: 'Ativo' as 'Ativo' | 'Inativo',
    crmStatus: '',
    product: '',
    finSubscriptionId: '',
    billingName: '',
    billingEmail: '',
    billingPhone: '',
    billingMethod: '',
    billingNotes: ''
  });

  // Finance state
  const [finPeople, setFinPeople] = useState<FinPerson[]>([]);
  const [selectedFinPersonId, setSelectedFinPersonId] = useState<string | null>(null);
  const [localFinPeopleGuid, setLocalFinPeopleGuid] = useState<string | null>(null);
  const [finMovements, setFinMovements] = useState<FinMovement[]>([]);
  const [isFetchingMovements, setIsFetchingMovements] = useState(false);
  
  // Fin people search
  const [finPeopleSearch, setFinPeopleSearch] = useState('');
  const [isFinPeopleDropOpen, setIsFinPeopleDropOpen] = useState(false);
  const [isSavingFinPerson, setIsSavingFinPerson] = useState(false);
  // Assinaturas do Asaas (lista do seletor da aba Financeiro)
  const [allSubscriptions, setAllSubscriptions] = useState<SubLista[]>([]);
  const [isFetchingSubs, setIsFetchingSubs] = useState(false);

  // Project state
  const [projectData, setProjectData] = useState<any>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [selectedProductView, setSelectedProductView] = useState<any>(null);

  useEffect(() => {
    if (editingClient) {
      setFormData({
        name: editingClient.name || '',
        startDate: editingClient.startDate || '',
        location: editingClient.location || '',
        squad: editingClient.squad || 'Able',
        tags: editingClient.tags || '',
        email: editingClient.email || '',
        phone: editingClient.phone || '',
        status: editingClient.status || 'Ativo',
        crmStatus: editingClient.crmStatus || '',
        product: editingClient.product || '',
        finSubscriptionId: editingClient.finSubscriptionId || '',
        billingName: editingClient.billingName || '',
        billingEmail: editingClient.billingEmail || '',
        billingPhone: editingClient.billingPhone || '',
        billingMethod: editingClient.billingMethod || '',
        billingNotes: editingClient.billingNotes || ''
      });
    } else {
      setFormData({
        name: '',
        startDate: new Date().toISOString().split('T')[0],
        location: '',
        squad: 'Able',
        tags: '',
        email: '',
        phone: '',
        status: 'Ativo',
        crmStatus: '',
        product: '',
        finSubscriptionId: '',
        billingName: '',
        billingEmail: '',
        billingPhone: '',
        billingMethod: '',
        billingNotes: ''
      });
    }
    setActiveTab('client');
    setFinSubTab('cadastro');
    setChurnData(null);
    setIsEditing(!editingClient);
    setIsEditingChurn(false);
    // Reset local fin_people link from the current client
    setLocalFinPeopleGuid(editingClient?.finPeopleGuid || null);
    setSelectedFinPersonId(null);
    setProjectData(null);
    setSelectedProductView(null);
  }, [editingClient, isOpen]);

  // Fetch churn data when switching to churn tab
  useEffect(() => {
    if (isOpen && activeTab === 'churn' && editingClient && editingClient.status === 'Inativo') {
      const fetchChurnData = async () => {
        setIsLoadingChurn(true);
        try {
          const res = await fetch(`/api/churn/${encodeURIComponent(editingClient.name)}`);
          if (res.ok) {
            const data = await res.json();
            setChurnData(data);
          }
        } catch (err) {
          console.error('Failed to fetch churn data:', err);
        } finally {
          setIsLoadingChurn(false);
        }
      };
      fetchChurnData();
    }
  }, [isOpen, activeTab, editingClient]);

  // Fetch fin_people for resolving selectedFinPersonId
  useEffect(() => {
    if (isOpen) {
      fetch('/api/fin-people').then(res => res.json()).then(setFinPeople);
    }
  }, [isOpen]);

  useEffect(() => {
    if (finPeople.length > 0) {
      if (localFinPeopleGuid) {
        const linked = finPeople.find(p => p.guid === localFinPeopleGuid);
        setSelectedFinPersonId(linked ? String(linked.id) : null);
      } else if (editingClient && !localFinPeopleGuid) {
        // Fallback: search by grapehub_client_id for backward compat
        const linked = finPeople.find(p => p.grapehub_client_id === editingClient.id);
        setSelectedFinPersonId(linked ? String(linked.id) : null);
      } else {
        setSelectedFinPersonId(null);
      }
    }
  }, [finPeople, localFinPeopleGuid]);

  // Fetch ALL subscriptions for the dropdown
  useEffect(() => {
    if (isOpen && activeTab === 'finance') {
      setIsFetchingSubs(true);
      fetch('/api/fin-subscriptions')
        .then(res => res.json())
        .then(setAllSubscriptions)
        .catch(err => console.error("Failed to fetch subscriptions:", err))
        .finally(() => setIsFetchingSubs(false));
    }
  }, [isOpen, activeTab]);

  // Fetch movements when fin_people is linked
  useEffect(() => {
    if (isOpen && activeTab === 'finance' && selectedFinPersonId) {
      const fetchMovements = async () => {
        setIsFetchingMovements(true);
        try {
          const response = await fetch(`/api/fin-people/${selectedFinPersonId}/movements`);
          if (response.ok) setFinMovements(await response.json());
        } catch (err) {
          console.error("Failed to fetch movements:", err);
        } finally {
          setIsFetchingMovements(false);
        }
      };
      fetchMovements();
    }
  }, [isOpen, activeTab, selectedFinPersonId]);

  // Fetch project data when switching to projeto tab
  useEffect(() => {
    if (isOpen && activeTab === 'projeto' && editingClient) {
      const fetchProject = async () => {
        setIsLoadingProject(true);
        try {
          const res = await fetch('/api/projects');
          if (res.ok) {
            const allProjects = await res.json();
            const linked = allProjects.find((p: any) => p.activeClientId === editingClient.id);
            setProjectData(linked || null);
          }
        } catch (err) {
          console.error('Failed to fetch project:', err);
        } finally {
          setIsLoadingProject(false);
        }
      };
      fetchProject();
    }
  }, [isOpen, activeTab, editingClient]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação do WhatsApp de Cobrança
    if (formData.billingPhone && formData.billingPhone.trim()) {
      const normalized = normalizePhoneBR(formData.billingPhone);
      if (!normalized) {
        setBillingPhoneError('WhatsApp inválido — confira DDD e número');
        return;
      }
      setBillingPhoneError('');
    } else {
      setBillingPhoneError('');
    }

    setIsSaving(true);

    try {
      if (editingClient) {
        // Step 1: Update core fields via PATCH
        const corePayload: Record<string, any> = {
          name: formData.name,
          start_date: formData.startDate,
          location: formData.location,
          squad: formData.squad,
          tags: formData.tags,
          email: formData.email,
          phone: formData.phone,
          product: formData.product,
        };

        const response = await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corePayload)
        });

        if (response.ok) {
          // Step 2: Try to save billing fields (may fail if DB columns don't exist yet)
          try {
            const billingPayload: Record<string, any> = {};
            if (formData.billingName !== undefined) billingPayload.billing_name = formData.billingName;
            if (formData.billingEmail !== undefined) billingPayload.billing_email = formData.billingEmail;
            if (formData.billingPhone !== undefined) billingPayload.billing_phone = formData.billingPhone;
            if (formData.billingMethod !== undefined) billingPayload.billing_method = formData.billingMethod;
            if (formData.billingNotes !== undefined) billingPayload.billing_notes = formData.billingNotes;

            if (Object.keys(billingPayload).length > 0) {
              await fetch(`/api/clients/${editingClient.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(billingPayload)
              });
            }
          } catch (billingErr) {
            console.warn('Billing fields not saved (DB columns may not exist yet):', billingErr);
          }

          onSaveSuccess();
          onClose();
        } else {
          const errorText = await response.text();
          console.error('Failed to save client:', errorText);
        }
      } else {
        // Create new client via POST
        const clientData = {
          id: Math.random().toString(36).substr(2, 9),
          name: formData.name,
          startDate: formData.startDate,
          location: formData.location,
          squad: formData.squad,
          tags: formData.tags,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          crmStatus: formData.crmStatus,
          product: formData.product,
          finSubscriptionId: formData.finSubscriptionId,
          contracts: '[]',
          createdAt: new Date().toISOString()
        };
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([clientData])
        });
        if (response.ok) {
          onSaveSuccess();
          onClose();
        }
      }
    } catch (err) {
      console.error("Failed to save client:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const saveFinSubscription = async (subId: string | null) => {
    if (!editingClient) return;
    setFormData({ ...formData, finSubscriptionId: subId || '' });
    try {
      // Save subscription link
      await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fin_subscription_id: subId })
      });

      // Auto-link cadastro (fin_people) using the subscription's customer_id
      if (subId) {
        const sub = allSubscriptions.find(s => String(s.id) === String(subId));
        if (sub?.customer_id) {
          const matchedPerson = finPeople.find(p => p.asaas_id === sub.customer_id);
          if (matchedPerson && String(matchedPerson.id) !== selectedFinPersonId) {
            // Auto-link the fin_people behind the scenes
            const guidToSave = matchedPerson.guid || null;
            setLocalFinPeopleGuid(guidToSave);
            await fetch(`/api/clients/${editingClient.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fin_people_guid: guidToSave })
            });
            setSelectedFinPersonId(String(matchedPerson.id));
          }
        }
      } else {
        // Desvincular cadastro junto
        setLocalFinPeopleGuid(null);
        await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fin_people_guid: null })
        });
        setSelectedFinPersonId(null);
      }

      onSaveSuccess();
    } catch (err) {
      console.error("Failed to save subscription link:", err);
    }
  };

  const saveFinPerson = async (personId: string | null) => {
    if (!editingClient) return;
    setIsSavingFinPerson(true);
    try {
      // Resolve the actual guid (UUID) from the numeric id
      const person = personId ? finPeople.find(p => String(p.id) === String(personId)) : null;
      const guidToSave = person?.guid || null;

      // Update local guid state immediately (prevents useEffect from restoring old link)
      setLocalFinPeopleGuid(guidToSave);

      // Save link on the client side (allows multiple clients per fin_people)
      await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fin_people_guid: guidToSave })
      });

      // Refresh fin_people list and update state
      const fpRes = await fetch('/api/fin-people');
      if (fpRes.ok) {
        const fpData = await fpRes.json();
        setFinPeople(fpData);
        setSelectedFinPersonId(personId);
      }
      setIsFinPeopleDropOpen(false);
      setFinPeopleSearch('');
      onSaveSuccess();
    } catch (err) {
      console.error('Failed to link fin person:', err);
    } finally {
      setIsSavingFinPerson(false);
    }
  };

  const squads = ['Able', 'Baker', 'Charlie', 'Delta'];

  const productIcons: { name: string; icon: any }[] = [
    { name: 'Gavel', icon: Gavel },
    { name: 'Scale', icon: Scale },
    { name: 'HeartPulse', icon: HeartPulse },
    { name: 'ShieldCheck', icon: ShieldCheck },
    { name: 'Hammer', icon: Hammer },
    { name: 'Landmark', icon: Landmark },
    { name: 'Banknote', icon: Banknote },
    { name: 'ShoppingCart', icon: ShoppingCart },
    { name: 'Home', icon: Home },
    { name: 'Stethoscope', icon: Stethoscope },
    { name: 'Building2', icon: Building2 },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'Layout', icon: Layout },
  ];

  const getProductIcon = (iconName?: string) => {
    const iconObj = productIcons.find(i => i.name === iconName);
    const IconComponent = iconObj ? iconObj.icon : Layout;
    return <IconComponent size={18} />;
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={() => { setIsEditing(false); onClose(); }}
      title={editingClient ? (isEditing ? 'Editar Cliente' : editingClient.name) : 'Novo Cliente'}
      icon={<UserPlus size={24} />}
      maxWidth="max-w-5xl"
      footer={
        activeTab === 'client' && isEditing ? (
          <>
            <button 
              type="button"
              onClick={() => { if (editingClient) { setIsEditing(false); } else { onClose(); } }}
              className={designSystem.button.secondary}
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={designSystem.button.primary}
            >
              {isSaving ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </>
        ) : null
      }
    >
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex border-b modal-divider shrink-0 mb-6">
          <button 
            onClick={() => setActiveTab('client')}
            className={`px-8 py-4 text-sm font-bold transition-all ${activeTab === 'client' ? 'modal-tab-active' : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Dados do Cliente
          </button>
          <button 
            onClick={() => setActiveTab('finance')}
            className={`px-8 py-4 text-sm font-bold transition-all ${activeTab === 'finance' ? 'modal-tab-active' : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Financeiro
          </button>
          {editingClient && editingClient.status === 'Inativo' && (
            <button 
              onClick={() => setActiveTab('churn')}
              className={`px-8 py-4 text-sm font-bold transition-all ${activeTab === 'churn' ? 'modal-tab-active' : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Motivo de Saída
            </button>
          )}
          {editingClient && (
            <button 
              onClick={() => setActiveTab('projeto')}
              className={`px-8 py-4 text-sm font-bold transition-all ${activeTab === 'projeto' ? 'modal-tab-active' : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Projeto
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'client' && (
            isEditing ? (
            <form id="client-form" onSubmit={handleSave}>
              {/* Edição no mesmo desenho da leitura (formato VB Hub): um card, grade de 3
                  colunas, rótulo pequeno em cima. Listas curtas viram botões de escolha. */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-6">
                <h4 className="text-sm font-bold text-light-text dark:text-white mb-5">Dados do cliente e do contrato</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
                  <CampoEd rotulo="Nome do cliente" className="col-span-2 md:col-span-3">
                    <input required type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Advocacia Silva" className={campoEd} />
                  </CampoEd>
                  <CampoEd rotulo="Telefone">
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" className={campoEd} />
                  </CampoEd>
                  <CampoEd rotulo="E-mail">
                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="contato@empresa.com" className={campoEd} />
                  </CampoEd>
                  <CampoEd rotulo="Local do escritório">
                    <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Ex: Uberlândia, MG" className={campoEd} />
                  </CampoEd>
                  <CampoEd rotulo="Data inicial">
                    <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className={campoEd} />
                  </CampoEd>
                  <CampoEd rotulo="Squad">
                    <Escolha valor={formData.squad} opcoes={squads} onChange={(v) => setFormData({ ...formData, squad: v || 'Able' })} />
                  </CampoEd>
                  <CampoEd rotulo="Produto">
                    <Escolha valor={formData.product} opcoes={['TCV', 'Recorrência Mensal']} onChange={(v) => setFormData({ ...formData, product: v })} />
                  </CampoEd>
                  <CampoEd rotulo="Tags (separadas por vírgula)" className="col-span-2 md:col-span-3">
                    <input type="text" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} placeholder="Ex: consumidor, previdenciário" className={campoEd} />
                  </CampoEd>
                </div>

                <div className="border-t border-slate-200 dark:border-white/10 my-6" />

                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <CreditCard size={12} className="text-violet-500" /> Cobrança
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-4">Para onde vão os lembretes e as cobranças do Asaas</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
                  <CampoEd rotulo="Nome">
                    <input type="text" value={formData.billingName} onChange={(e) => setFormData({ ...formData, billingName: e.target.value })} placeholder="Ex: Financeiro Empresa" className={campoEd} />
                  </CampoEd>
                  <CampoEd rotulo="Meio de cobrança" className="md:col-span-2">
                    <Escolha valor={formData.billingMethod} opcoes={['Whatsapp', 'E-mail', 'E-mail e Whatsapp']} onChange={(v) => setFormData({ ...formData, billingMethod: v })} />
                  </CampoEd>
                  <CampoEd rotulo="WhatsApp">
                    <input 
                      type="text"
                      value={formData.billingPhone}
                      onChange={(e) => {
                        setFormData({ ...formData, billingPhone: e.target.value });
                        if (billingPhoneError) setBillingPhoneError('');
                      }}
                      onBlur={() => {
                        if (formData.billingPhone && formData.billingPhone.trim()) {
                          const normalized = normalizePhoneBR(formData.billingPhone);
                          if (normalized) {
                            setFormData(prev => ({ ...prev, billingPhone: formatPhoneBR(normalized) }));
                            setBillingPhoneError('');
                          } else {
                            setBillingPhoneError('WhatsApp inválido — confira DDD e número');
                          }
                        } else {
                          setBillingPhoneError('');
                        }
                      }}
                      placeholder="(00) 00000-0000"
                      className={`${campoEd} ${billingPhoneError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : ''}`}
                    />
                    {billingPhoneError && (
                      <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                        <AlertCircle size={12} />
                        {billingPhoneError}
                      </p>
                    )}
                  </CampoEd>
                  <CampoEd rotulo="E-mail" className="md:col-span-2">
                    <input type="email" value={formData.billingEmail} onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })} placeholder="financeiro@empresa.com" className={campoEd} />
                  </CampoEd>
                  <CampoEd rotulo="Comentários" className="col-span-2 md:col-span-3">
                    <textarea value={formData.billingNotes} onChange={(e) => setFormData({ ...formData, billingNotes: e.target.value })} placeholder="Observações sobre a cobrança deste cliente..." rows={3} className={`${campoEd} resize-none`} />
                  </CampoEd>
                </div>
              </div>
            </form>
            ) : (
            <div className="space-y-5">
              {/* Leitura no formato do VB Hub: um card só, rótulo pequeno em cima e valor
                  embaixo, em grade de 3 colunas, seções separadas por linha — em vez de
                  uma caixa por campo. */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-6">
                <h4 className="text-sm font-bold text-light-text dark:text-white mb-5">Dados do cliente e do contrato</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
                  <Campo rotulo="Telefone">{formData.phone}</Campo>
                  <Campo rotulo="E-mail">{formData.email}</Campo>
                  <Campo rotulo="Local do escritório">{formData.location}</Campo>
                  <Campo rotulo="Data inicial">{formData.startDate ? new Date(formData.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</Campo>
                  <Campo rotulo="Squad">
                    {formData.squad && (
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${
                        formData.squad === 'Able' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                      }`}>{formData.squad}</span>
                    )}
                  </Campo>
                  <Campo rotulo="Produto">
                    {formData.product && (
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${
                        formData.product === 'TCV' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-violet-500/10 text-violet-500'
                      }`}>{formData.product}</span>
                    )}
                  </Campo>
                  <Campo rotulo="Status">
                    {formData.status && (
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-bold ${
                        formData.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>{formData.status}</span>
                    )}
                  </Campo>
                  <Campo rotulo="Tags" className="md:col-span-2">{formData.tags}</Campo>
                </div>

                <div className="border-t border-slate-200 dark:border-white/10 my-6" />

                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <CreditCard size={12} className="text-violet-500" /> Cobrança
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-4">Para onde vão os lembretes e as cobranças do Asaas</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
                  <Campo rotulo="Nome">{formData.billingName}</Campo>
                  <Campo rotulo="Meio de cobrança">{formData.billingMethod}</Campo>
                  <Campo rotulo="WhatsApp">{formData.billingPhone ? formatPhoneBR(formData.billingPhone) : ''}</Campo>
                  <Campo rotulo="E-mail" className="md:col-span-3">{formData.billingEmail}</Campo>
                  {formData.billingNotes && (
                    <Campo rotulo="Comentários" className="col-span-2 md:col-span-3">
                      <span className="whitespace-pre-wrap font-normal">{formData.billingNotes}</span>
                    </Campo>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-3 rounded-xl text-sm font-bold text-violet-500 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Edit2 size={14} /> Editar Cliente
              </button>
            </div>
            )
          )}
          {activeTab === 'finance' && (
            <AbaFinanceiro
              clientName={formData.name}
              subId={formData.finSubscriptionId}
              subs={allSubscriptions}
              carregandoSubs={isFetchingSubs}
              movimentos={finMovements}
              carregandoMov={isFetchingMovements}
              clientId={editingClient?.id}
              onVincular={saveFinSubscription}
            />
          )}
          {activeTab === 'churn' && (
                  <div className="space-y-6">
                    {isLoadingChurn ? (
                      <div className="py-20 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                        <p className="text-slate-500 text-sm font-medium">Carregando dados de churn...</p>
                      </div>
                    ) : !churnData ? (
                      <div className="p-8 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center gap-3 text-center">
                        <AlertCircle className="text-slate-400" size={32} />
                        <p className="text-sm font-medium text-slate-500">
                          Nenhum registro de churn encontrado para este cliente.
                        </p>
                      </div>
                    ) : (
                      <>
                        {!isEditingChurn ? (
                        <>
                        {/* View Mode */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Como foi</label>
                          <div>
                            {churnData['Evitavel - inevitavel'] === 'INEVITÁVEL' ? (
                              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white shadow-md shadow-rose-500/20">
                                <ShieldAlert size={14} /> INEVITÁVEL
                              </span>
                            ) : churnData['Evitavel - inevitavel'] === 'EVITÁVEL' ? (
                              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white shadow-md shadow-amber-500/20">
                                <AlertTriangle size={14} /> EVITÁVEL
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400 italic">Não informado</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Motivo de Saída</label>
                          <div className="flex flex-wrap gap-2">
                            {churnData['Motivo de saída'] ? (
                              churnData['Motivo de saída'].split(',').map((reason: string, idx: number) => {
                                const r = reason.trim();
                                const colorMap: Record<string, string> = {
                                  'Motivo Pessoal': 'bg-blue-500 text-white border-blue-500',
                                  'Falta de Relacionamento': 'bg-rose-500 text-white border-rose-500',
                                  'inadimplência': 'bg-orange-500 text-white border-orange-500',
                                  'Inadimplência': 'bg-orange-500 text-white border-orange-500',
                                  'Resultado Comercial': 'bg-red-600 text-white border-red-600',
                                  'Motivo Financeiro': 'bg-purple-500 text-white border-purple-500',
                                  'CRM e IA': 'bg-cyan-500 text-white border-cyan-500',
                                  'Outros': 'bg-slate-600 text-white border-slate-600',
                                  'Resultado Campanha': 'bg-red-600 text-white border-red-600',
                                };
                                const cls = colorMap[r] || 'bg-slate-500 text-white border-slate-500';
                                return (
                                  <span key={idx} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${cls}`}>
                                    {r}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-sm text-slate-400 italic">Nenhum motivo registrado</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Calendar size={12} className="text-violet-500" />
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data de Saída</p>
                            </div>
                            <p className="text-sm font-bold text-light-text dark:text-white">
                              {churnData.day_exit ? new Date(churnData.day_exit).toLocaleDateString('pt-BR') : '-'}
                            </p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Clock size={12} className="text-violet-500" />
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">LTV (dias)</p>
                            </div>
                            <p className="text-sm font-bold text-light-text dark:text-white">
                              {churnData.LTV ? `${churnData.LTV} dias` : '-'}
                            </p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <User size={12} className="text-violet-500" />
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestor</p>
                            </div>
                            <p className="text-sm font-bold text-light-text dark:text-white">
                              {churnData.gestor || '-'}
                            </p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Calendar size={12} className="text-violet-500" />
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data de Entrada</p>
                            </div>
                            <p className="text-sm font-bold text-light-text dark:text-white">
                              {churnData.day ? new Date(churnData.day).toLocaleDateString('pt-BR') : '-'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <MessageSquare size={12} /> Comentários
                          </label>
                          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <p className="text-sm text-light-text dark:text-white whitespace-pre-wrap">
                              {churnData.comments || <span className="text-slate-400 italic">Sem comentários</span>}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setEditChurnType(churnData['Evitavel - inevitavel'] || '');
                            setEditChurnReasons(churnData['Motivo de saída'] ? churnData['Motivo de saída'].split(',').map((r: string) => r.trim()) : []);
                            setEditChurnComment(churnData.comments || '');
                            setIsEditingChurn(true);
                          }}
                          className="w-full py-3 rounded-xl text-sm font-bold text-violet-500 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 transition-all flex items-center justify-center gap-2"
                        >
                          <Edit2 size={14} /> Editar Motivo de Saída
                        </button>
                        </>
                        ) : (
                        <>
                        {/* Edit Mode */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tipo de Churn</label>
                          <div className="flex gap-3">
                            <button type="button" onClick={() => setEditChurnType('INEVITÁVEL')}
                              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                editChurnType === 'INEVITÁVEL' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                              }`}>
                              <ShieldAlert size={14} /> INEVITÁVEL
                            </button>
                            <button type="button" onClick={() => setEditChurnType('EVITÁVEL')}
                              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                editChurnType === 'EVITÁVEL' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                              }`}>
                              <AlertTriangle size={14} /> EVITÁVEL
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Motivos de Saída</label>
                          <div className="flex flex-wrap gap-2">
                            {['Motivo Pessoal','Falta de Relacionamento','Inadimplência','Resultado Comercial','Motivo Financeiro','CRM e IA','Outros'].map(reason => (
                              <button key={reason} type="button"
                                onClick={() => setEditChurnReasons(prev => prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason])}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                  editChurnReasons.includes(reason)
                                    ? 'bg-violet-500 text-white border-violet-500'
                                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10 hover:border-violet-500/50'
                                }`}>
                                {reason}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Comentários</label>
                          <textarea
                            value={editChurnComment}
                            onChange={(e) => setEditChurnComment(e.target.value)}
                            rows={3}
                            className={designSystem.input.field + ' resize-none'}
                            placeholder="Observações sobre o churn..."
                          />
                        </div>

                        <div className="flex gap-3">
                          <button onClick={() => setIsEditingChurn(false)}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                            Cancelar
                          </button>
                          <button onClick={async () => {
                            try {
                              await fetch(`/api/churn/${churnData.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ churn_type: editChurnType, exit_reasons: editChurnReasons, comments: editChurnComment })
                              });
                              setChurnData({ ...churnData, 'Evitavel - inevitavel': editChurnType, 'Motivo de saída': editChurnReasons.join(', '), comments: editChurnComment });
                              setIsEditingChurn(false);
                            } catch (err) { console.error(err); }
                          }}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/20 transition-all">
                            Salvar Alterações
                          </button>
                        </div>
                        </>
                        )}
                      </>
                    )}
                  </div>
          )}
          {activeTab === 'projeto' && (
            <div className="space-y-6">
              {isLoadingProject ? (
                <div className="py-20 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                  <p className="text-slate-500 text-sm font-medium">Carregando projeto...</p>
                </div>
              ) : !projectData ? (
                <div className="p-8 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center gap-3 text-center">
                  <Briefcase className="text-slate-400" size={32} />
                  <p className="text-sm font-medium text-slate-500">
                    Nenhum projeto vinculado a este cliente.
                  </p>
                </div>
              ) : (
                <>
                  {/* Project Info Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                      <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold ${
                        projectData.status === 'Rodando' ? 'bg-emerald-500/10 text-emerald-500' :
                        projectData.status === 'Gargalo' ? 'bg-rose-500/10 text-rose-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>{projectData.status || '-'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Resultado</p>
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-bold ${
                        (projectData.projectResult || '').includes('BOM') ? 'bg-emerald-500/10 text-emerald-500' :
                        (projectData.projectResult || '').includes('OK') ? 'bg-blue-500/10 text-blue-500' :
                        (projectData.projectResult || '').includes('RUIM') ? 'bg-rose-500/10 text-rose-500' :
                        'bg-slate-500/10 text-slate-500'
                      }`}>{projectData.projectResult || '-'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Investimento</p>
                      <p className="text-sm font-bold text-light-text dark:text-white">R$ {projectData.investment || '0'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Última Atualização</p>
                      <p className="text-xs font-bold text-light-text dark:text-white">{projectData.lastUpdate || '-'}</p>
                    </div>
                  </div>

                  {/* Products */}
                  {projectData.products && projectData.products.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-violet-500" />
                        <h3 className="text-sm font-bold text-light-text dark:text-white uppercase tracking-widest">Produtos ({projectData.products.length})</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {projectData.products.map((prod: any) => (
                          <div key={prod.id} onClick={() => setSelectedProductView(prod)} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-3 cursor-pointer hover:border-violet-500/30 hover:bg-violet-500/5 transition-all">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-violet-500 ${
                              prod.status === 'Rodando' ? 'bg-emerald-500/10' :
                              prod.status === 'Inativo' ? 'bg-slate-500/10' : 'bg-amber-500/10'
                            }`}>
                              {getProductIcon(prod.icon)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-light-text dark:text-white truncate">{prod.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                                  prod.status === 'Rodando' ? 'bg-emerald-500/10 text-emerald-500' :
                                  prod.status === 'Inativo' ? 'bg-slate-500/10 text-slate-400' :
                                  'bg-amber-500/10 text-amber-500'
                                }`}>{prod.status || '-'}</span>
                                {prod.platform && (
                                  <span className={`text-[9px] font-bold ${
                                    prod.platform?.includes('Meta') ? 'text-blue-500' :
                                    prod.platform?.includes('Google') ? 'text-amber-500' :
                                    prod.platform?.includes('Tiktok') ? 'text-purple-500' :
                                    prod.platform?.includes('Linkedin') ? 'text-sky-400' : 'text-slate-400'
                                  }`}>{prod.platform}</span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs font-bold text-emerald-500 whitespace-nowrap">R$ {prod.budget || '0'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline - Histórico Consolidado (same design as ProjectsModule) */}
                  {(() => {
                    const allOpts = (projectData.products || []).flatMap((p: any) =>
                      (p.optimizations || []).map((o: any) => ({ ...o, productName: p.name }))
                    ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
                    if (allOpts.length === 0) return null;
                    return (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Histórico Consolidado</h4>
                        <div className="relative max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                          <div className="relative space-y-12 py-4">
                            {/* Vertical Line */}
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10 -translate-x-1/2" />

                            {allOpts.map((opt: any, idx: number) => (
                              <div key={idx} className="relative flex items-center justify-center">
                                {/* Timeline Clock */}
                                <div className="absolute left-1/2 -translate-x-1/2 z-10">
                                  <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1625]">
                                    <div className="w-full h-full rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center shadow-sm">
                                      <Clock size={16} className="text-violet-500" />
                                    </div>
                                  </div>
                                </div>

                                {/* Card */}
                                <div className={`w-[40%] p-5 rounded-2xl border transition-all bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-violet-500/20 ${idx % 2 === 0 ? 'mr-auto text-left' : 'ml-auto text-left'}`}>
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      {opt.authorPhoto ? (
                                        <img src={opt.authorPhoto} alt={opt.author} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-500 text-xs font-bold">
                                          {(opt.author || 'U').charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                                        {opt.author}
                                      </p>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium">{opt.date} {opt.time && `às ${opt.time}`}</p>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">{opt.productName}</p>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase whitespace-nowrap ${
                                      opt.status === 'Mudança de Status' 
                                        ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30' 
                                        : 'text-violet-700 bg-violet-100 dark:bg-violet-900/30'
                                    }`}>{opt.status === 'Mudança de Status' ? 'STATUS' : 'MÉTRICAS'}</span>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                    {opt.message}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>

      {/* Product Detail Popup - overlay on top of ClientModal */}
      <AnimatePresence>
        {selectedProductView && (
          <div className="fixed inset-0 z-[1100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductView(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl modal-container overflow-hidden mb-10 transition-colors duration-300"
            >
              {/* Header */}
              <div className="p-8 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-600/20 rounded-xl">
                      <div className="text-violet-600">
                        {getProductIcon(selectedProductView.icon)}
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedProductView.name}</h2>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 ${
                      selectedProductView.status === 'Rodando' ? 'bg-emerald-500/20 text-emerald-500' :
                      selectedProductView.status === 'Pausado' ? 'bg-amber-500/20 text-amber-500' :
                      selectedProductView.status === 'Inativo' ? 'bg-slate-500/20 text-slate-400' :
                      'bg-rose-500/20 text-rose-500'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        selectedProductView.status === 'Rodando' ? 'bg-emerald-500' :
                        selectedProductView.status === 'Pausado' ? 'bg-amber-500' :
                        selectedProductView.status === 'Inativo' ? 'bg-slate-400' : 'bg-rose-500'
                      }`} />
                      {selectedProductView.status}
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedProductView(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Resultado do Produto */}
                {selectedProductView.projectResult && (
                  <div className="flex items-center gap-3 mt-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resultado:</p>
                    <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold ${
                      (selectedProductView.projectResult || '').includes('BOM') ? 'bg-emerald-500/10 text-emerald-500' :
                      (selectedProductView.projectResult || '').includes('OK') ? 'bg-blue-500/10 text-blue-500' :
                      (selectedProductView.projectResult || '').includes('RUIM') ? 'bg-rose-500/10 text-rose-500' :
                      'bg-slate-500/10 text-slate-500'
                    }`}>{selectedProductView.projectResult}</span>
                  </div>
                )}

                {/* Metrics Grid */}
                <div className="mt-8 grid grid-cols-3 gap-4">
                  {[
                    { label: 'Investimento Mensal', value: selectedProductView.budget, icon: DollarSign },
                    { label: 'Plataforma', value: selectedProductView.platform, icon: Globe },
                    { label: 'Dias de Veiculação', value: selectedProductView.delivery, icon: Calendar },
                    { label: 'IA de Atendimento', value: selectedProductView.aiService, icon: MessageSquare, keyword: selectedProductView.aiKeyword },
                    { label: 'Forma de Pagamento', value: selectedProductView.paymentMethod, icon: CreditCard },
                    ...(selectedProductView.paymentMethod === 'Boleto/pix' ? [{ label: 'Saldo Atual', value: selectedProductView.balance, icon: DollarSign }] : []),
                  ].map((m: any, i: number) => (
                    <div key={i} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-violet-500/20 transition-all">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <m.icon size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                      </div>
                      <p className={`text-sm font-bold ${
                        m.label === 'Plataforma' ? (
                          (m.value || '').includes('Meta') ? 'text-blue-500' :
                          (m.value || '').includes('Google') ? 'text-amber-500' :
                          (m.value || '').includes('Tiktok') ? 'text-purple-500' :
                          (m.value || '').includes('Linkedin') ? 'text-sky-400' : 'text-slate-400'
                        ) : 'text-light-text dark:text-white'
                      }`}>{m.value || '-'}</p>
                      {m.keyword && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Palavra-chave</span>
                          <p className="text-xs font-medium text-violet-500 mt-0.5">{m.keyword}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Optimization History */}
              <div className="p-8 overflow-y-visible">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <Activity size={20} className="text-violet-500" />
                    <h3 className="text-lg font-bold text-light-text dark:text-white">Histórico de Otimizações</h3>
                  </div>
                </div>
                {selectedProductView.optimizations && selectedProductView.optimizations.length > 0 ? (
                  <div className="relative max-h-[900px] overflow-y-auto custom-scrollbar pr-2">
                    <div className="relative space-y-12 py-4">
                      {/* Vertical Line */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10 -translate-x-1/2" />

                      {[...selectedProductView.optimizations]
                        .sort((a: any, b: any) => {
                          const dateA = new Date(a.date.split('/').reverse().join('-') + 'T' + (a.time || '00:00'));
                          const dateB = new Date(b.date.split('/').reverse().join('-') + 'T' + (b.time || '00:00'));
                          return dateB.getTime() - dateA.getTime();
                        })
                        .map((opt: any, idx: number) => (
                        <div key={idx} className="relative flex items-center justify-center">
                          {/* Timeline Dot */}
                          <div className="absolute left-1/2 -translate-x-1/2 z-10">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1625]">
                              <div className="w-full h-full rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center shadow-sm">
                                <Clock size={16} className="text-violet-500" />
                              </div>
                            </div>
                          </div>

                          {/* Card */}
                          <div className={`w-[40%] p-5 rounded-2xl border transition-all bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-violet-500/20 ${idx % 2 === 0 ? 'mr-auto text-left' : 'ml-auto text-left'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {opt.authorPhoto ? (
                                  <img src={opt.authorPhoto} alt={opt.author} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-500 text-xs font-bold">
                                    {(opt.author || 'U').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                  {opt.author}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {opt.status && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    opt.status === 'Mudança de Status' 
                                      ? 'bg-emerald-500/10 text-emerald-500' 
                                      : 'bg-violet-500/10 text-violet-500'
                                  }`}>
                                    {opt.status === 'Mudança de Status' ? 'STATUS' : 'MÉTRICAS'}
                                  </span>
                                )}
                                <p className="text-[10px] text-slate-500 font-medium">{opt.date} {opt.time && `às ${opt.time}`}</p>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                              {opt.message}
                            </p>
                            {opt.images && opt.images.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {opt.images.map((img: string, i: number) => (
                                  <img key={i} src={img} alt="Nota" className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" referrerPolicy="no-referrer" />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic text-center py-8">Nenhum histórico de otimizações disponível.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ClientModal;
