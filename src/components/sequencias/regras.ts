import type { LucideIcon } from 'lucide-react';
import { MessageCircle, Phone, Mail, Calendar, CheckCircle2, CircleDot } from 'lucide-react';

/**
 * Regras e formatos da página de Sequências (redesenho de 18/11/2026).
 * Só leitura do que o servidor já faz — nada aqui muda o que é salvo.
 *
 * Como o passo é interpretado (server.ts, rotas /api/crm-comercial/sequences e a ação
 * `start_sequence` das automações; CrmComercial.handleApplySequence no botão do lead):
 * - `day_offset` é a ESPERA desde o passo anterior (o primeiro conta a partir da entrada).
 *   O dia do passo é a soma acumulada: D = Σ day_offset até ele.
 * - `time_of_day` é o horário da atividade (vazio → o servidor grava '09:00').
 * - `title` vira o título da atividade; `observations`, as observações.
 * - `skip_weekends` só vale no botão "Sequência" do lead: sábado e domingo não contam na
 *   espera. A automação `start_sequence` segue a mesma regra desde 18/11/2026 (antes contava dias corridos).
 */

/** Passo como vem do servidor / vai para ele. Campos extras (id, sequence_id, order_index) passam intactos. */
export interface Passo {
  type: string;
  title: string;
  observations: string;
  day_offset: number;
  time_of_day?: string;
  [extra: string]: any;
}

/** Exatamente o corpo enviado no POST/PUT de sequência — não acrescente campos. */
export interface FormSequencia {
  name: string;
  description: string;
  skip_weekends: boolean;
  steps: Passo[];
}

export interface Canal {
  tipo: string;
  Icone: LucideIcon;
  /** Cor do ícone/texto. */
  texto: string;
  /** Fundo suave do ícone. */
  fundo: string;
  /** Borda do botão escolhido. */
  borda: string;
}

// As cinco opções que a página sempre ofereceu, com as mesmas cores-base (Ligação: azul → sky).
export const CANAIS: Canal[] = [
  { tipo: 'WhatsApp', Icone: MessageCircle, texto: 'text-emerald-600 dark:text-emerald-400', fundo: 'bg-emerald-500/10', borda: 'border-emerald-500/50' },
  { tipo: 'Ligação', Icone: Phone, texto: 'text-sky-600 dark:text-sky-400', fundo: 'bg-sky-500/10', borda: 'border-sky-500/50' },
  { tipo: 'Email', Icone: Mail, texto: 'text-violet-600 dark:text-violet-400', fundo: 'bg-violet-500/10', borda: 'border-violet-500/50' },
  { tipo: 'Reunião', Icone: Calendar, texto: 'text-orange-600 dark:text-orange-400', fundo: 'bg-orange-500/10', borda: 'border-orange-500/50' },
  { tipo: 'Tarefa', Icone: CheckCircle2, texto: 'text-slate-600 dark:text-slate-300', fundo: 'bg-slate-500/10', borda: 'border-slate-500/50' },
];

export function canalDe(tipo: string | undefined): Canal {
  return CANAIS.find(c => c.tipo === tipo) ?? {
    tipo: tipo || 'Atividade', Icone: CircleDot,
    texto: 'text-slate-500 dark:text-slate-400', fundo: 'bg-slate-500/10', borda: 'border-slate-500/50',
  };
}

/** Passo novo — mesmos campos e padrões do editor antigo. */
export function passoNovo(day_offset: number, time_of_day = '09:00'): Passo {
  return { day_offset, time_of_day, type: 'WhatsApp', title: 'Nova atividade', observations: '' };
}

/** Dia de cada passo (D0, D2…): soma acumulada das esperas, como o servidor e o botão do lead. */
export function diasDosPassos(steps: Passo[]): number[] {
  let acc = 0;
  return steps.map(s => (acc += Number(s.day_offset ?? 0) || 0));
}

export interface GrupoDia { dia: number; indices: number[] }

/** Passos consecutivos que caem no mesmo dia. */
export function agruparPorDia(steps: Passo[]): GrupoDia[] {
  const dias = diasDosPassos(steps);
  const grupos: GrupoDia[] = [];
  dias.forEach((dia, i) => {
    const ult = grupos[grupos.length - 1];
    if (ult && ult.dia === dia) ult.indices.push(i);
    else grupos.push({ dia, indices: [i] });
  });
  return grupos;
}

export const duracaoTotal = (steps: Passo[]) => steps.reduce((s, p) => s + (Number(p.day_offset ?? 0) || 0), 0);

export function textoDias(n: number, uteis: boolean): string {
  if (n === 1) return uteis ? '1 dia útil' : '1 dia';
  return `${n} ${uteis ? 'dias úteis' : 'dias'}`;
}

export function textoDuracao(steps: Passo[], pularFimDeSemana: boolean): string {
  if (!steps.length) return 'sem passos';
  const t = duracaoTotal(steps);
  return t === 0 ? 'tudo no mesmo dia' : textoDias(t, pularFimDeSemana);
}

// ── Prévia de datas ──────────────────────────────────────────────────────────

/**
 * Cópia fiel do `addDays` de CrmComercial.handleApplySequence (botão "Sequência" do lead):
 * avança um dia por vez e, com `pular`, só conta os dias que não são sábado/domingo.
 * Consequência que a prévia mostra como é: D0 nunca é adiado, mesmo caindo num sábado.
 */
export function somarDias(base: Date, dias: number, pular: boolean): Date {
  const r = new Date(base);
  let somados = 0;
  while (somados < dias) {
    r.setDate(r.getDate() + 1);
    if (!pular || (r.getDay() !== 0 && r.getDay() !== 6)) somados++;
  }
  return r;
}

/** Botão e automação usam a mesma regra (18/11/2026); o tipo ficou para não mudar a assinatura. */
export type RegraDatas = 'lead' | 'automacao';

export function datasDosPassos(form: FormSequencia, entrada: Date, regra: RegraDatas): Date[] {
  void regra; // botão e automação: `sequence.skip_weekends ?? true`
  const pular = form.skip_weekends ?? true;
  return diasDosPassos(form.steps).map(d => somarDias(entrada, d, pular));
}

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const ehFimDeSemana = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
export function fmtData(d: Date): string {
  return `${SEMANA[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Hora + 1h, até 20:00 — sugestão para o passo novo no mesmo dia não colidir com o anterior. */
export function horaSeguinte(hora?: string): string {
  const h = parseInt((hora || '09:00').slice(0, 2), 10);
  if (Number.isNaN(h)) return '09:00';
  const n = Math.min(Math.max(h + 1, 9), 20);
  return `${String(n).padStart(2, '0')}:${(hora || '09:00').slice(3, 5) || '00'}`;
}

export const foraDoHorario = (hora?: string) => {
  const h = parseInt((hora || '09:00').slice(0, 2), 10);
  return h < 8 || h >= 21;
};

// ── Validação ────────────────────────────────────────────────────────────────

export interface Problema { nivel: 'erro' | 'aviso'; texto: string; passo?: number }

/** Erros bloqueiam o salvar; avisos só informam. */
export function validar(form: FormSequencia): Problema[] {
  const p: Problema[] = [];
  if (!form.name.trim()) p.push({ nivel: 'erro', texto: 'Dê um nome à sequência.' });
  if (!form.steps.length) p.push({ nivel: 'aviso', texto: 'Sem passos: aplicar esta sequência não cria nenhuma atividade.' });
  const dias = diasDosPassos(form.steps);
  form.steps.forEach((s, i) => {
    const n = `Passo ${i + 1}`;
    const off = Number(s.day_offset);
    if (!Number.isInteger(off) || off < 0) p.push({ nivel: 'erro', passo: i, texto: `${n}: a espera tem de ser um número inteiro de dias (0 ou mais).` });
    if (!String(s.title || '').trim()) p.push({ nivel: 'aviso', passo: i, texto: `${n}: sem título — a atividade fica sem nome.` });
    if (!s.time_of_day) p.push({ nivel: 'aviso', passo: i, texto: `${n}: sem horário — será salvo como 09:00.` });
    else if (foraDoHorario(s.time_of_day)) p.push({ nivel: 'aviso', passo: i, texto: `${n}: ${s.time_of_day} está fora de 8h–21h (risco de bloqueio no WhatsApp).` });
    if (i > 0 && dias[i] === dias[i - 1] && s.time_of_day && form.steps[i - 1].time_of_day && s.time_of_day < form.steps[i - 1].time_of_day!) {
      p.push({ nivel: 'aviso', passo: i, texto: `${n} (${s.time_of_day}) vem depois do passo ${i} (${form.steps[i - 1].time_of_day}) no mesmo dia, mas tem horário mais cedo.` });
    }
  });
  return p;
}
