// Tipos e funções da página de Leads (Comercial › Leads). Redesenho de 18/11/2026.
// Os dados vêm de GET /api/crm-comercial/leads-list, que devolve `l.*` de
// crm_comercial_leads + coluna_nome/coluna_color/responsavel_name/kanban_name.

export interface Lead {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  origem: string | null;
  /** numeric no banco: o pg manda como texto ("1500.00"). Use valorNum(). */
  valor: number | string | null;
  coluna_nome: string | null;
  coluna_color: string | null;
  responsavel_name: string | null;
  tags: Array<string | { name: string; color?: string }> | null;
  /** timestamptz */
  created_at: string;
  /** timestamptz */
  etapa_updated_at: string | null;
  kanban_name: string | null;
  is_lost: boolean;
  observacoes: string | null;
  faturamento: string | null;
  form_nome_fantasia: string | null;
  form_cidade: string | null;
  // Campos que já vinham no `l.*` e a tela antiga não mostrava
  form_estado?: string | null;
  form_nome_completo?: string | null;
  form_telefone_whatsapp?: string | null;
  instagram?: string | null;
  nicho?: string | null;
  tempo_oab?: string | null;
  office_location?: string | null;
  monthly_closings?: string | null;
  closing_goal?: string | null;
  investimento?: string | null;
  forma_pagamento?: string | null;
  /** DATE (AAAA-MM-DD) → dataDoBanco() */
  previsao?: string | null;
  reunion_date?: string | null;
  reunion_link?: string | null;
  utm_platform?: string | null;
  utm_campaign?: string | null;
  utm_set?: string | null;
  utm_creative?: string | null;
  utm_position?: string | null;
  prob_fechamento?: number | null;
  lead_score?: number | null;
}

export interface HistoryEntry {
  id: number;
  lead_id: string;
  action_type: string | null;
  description: string | null;
  user_name: string | null;
  from_coluna_name: string | null;
  to_coluna_name: string | null;
  moved_by: string | null;
  task_type?: string | null;
  created_at: string;
}

export interface Note {
  id: number;
  lead_id: string;
  content: string;
  user_name: string | null;
  created_at: string;
}

export interface Kanban {
  id: string;
  nome: string;
}

// ── Status ───────────────────────────────────────────────
export type LeadStatus = 'aberto' | 'ganho' | 'perdido';

/** Mesma regra da tela antiga: perdido = is_lost; ganho = etapa com "ganho"/"fechado" no nome. */
export function getLeadStatus(lead: Lead): LeadStatus {
  if (lead.is_lost) return 'perdido';
  const col = (lead.coluna_nome || '').toLowerCase();
  if (col.includes('ganho') || col.includes('fechado')) return 'ganho';
  return 'aberto';
}

export const STATUS: Record<LeadStatus, { rotulo: string; pilula: string; ponto: string }> = {
  aberto: { rotulo: 'Em aberto', pilula: 'bg-sky-500/10 text-sky-700 dark:text-sky-300', ponto: 'bg-sky-500' },
  ganho: { rotulo: 'Ganho', pilula: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', ponto: 'bg-emerald-500' },
  perdido: { rotulo: 'Perdido', pilula: 'bg-rose-500/10 text-rose-700 dark:text-rose-300', ponto: 'bg-rose-500' },
};

// ── Formatos ─────────────────────────────────────────────
export const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function valorNum(v: Lead['valor']): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4');
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return phone;
}

/** Link wa.me (só abre a conversa; não envia nada). Sem número válido → null. */
export function linkWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, '');
  if (d.startsWith('0')) d = d.replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  if (d.length < 12 || d.length > 13) return null;
  return `https://wa.me/${d}`;
}

/** Dia local (AAAA-MM-DD) de um timestamptz — `slice(0,10)` do ISO daria o dia em UTC. */
export function diaLocal(ts: string | null | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return String(ts).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay > 30) return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  if (diffDay >= 1) return `há ${diffDay} dia${diffDay > 1 ? 's' : ''}`;
  if (diffHour >= 1) return `há ${diffHour} hora${diffHour > 1 ? 's' : ''}`;
  if (diffMin >= 1) return `há ${diffMin} min`;
  return 'agora';
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatData(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export const fmtBR = (iso: string) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

export function tagNome(t: string | { name: string; color?: string }): string {
  return typeof t === 'string' ? t : t.name;
}
export function tagCor(t: string | { name: string; color?: string }): string | undefined {
  return typeof t === 'object' && t.color ? t.color : undefined;
}

const AVATAR_CORES = [
  'bg-violet-500/15 text-violet-600 dark:text-violet-300',
  'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  'bg-amber-500/15 text-amber-600 dark:text-amber-300',
];
export function corAvatar(nome: string): string {
  return AVATAR_CORES[(nome || '?').charCodeAt(0) % AVATAR_CORES.length];
}
export const inicial = (nome: string | null | undefined) => (nome || '?').trim().charAt(0).toUpperCase() || '?';
export const primeiroNome = (nome: string | null | undefined) => (nome || '').trim().split(/\s+/)[0] || '';
