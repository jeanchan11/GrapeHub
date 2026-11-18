// Catálogo da página de Automações (CRM comercial): tipos, gatilhos, ações, modelos e as
// frases-resumo. Só front: o formato salvo (steps = [{ id, type, config }]) é o mesmo que o
// motor de `server.ts` (runAutomations) lê. As chaves de config de cada ação estão anotadas
// em ACTIONS e são exatamente as que o motor consulta.
import type { LucideIcon } from 'lucide-react';
import {
  Plus, ArrowRightLeft, Trophy, XCircle, Pencil, CalendarPlus, AlarmClock, CheckCircle2,
  CheckSquare, ArrowRight, UserCheck, TrendingUp, AlertCircle, Tag, Copy, FileText, Trash2,
  Send, GitBranch, UserPlus, Layers,
} from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type StepType = 'trigger' | 'condition' | 'action';

export interface FlowStep {
  id: string;
  type: StepType;
  config: Record<string, any>;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  active: boolean;
  runs: number;
  /** Data/hora formatada (pt-BR) da última execução — mesmo campo de antes. */
  lastRun?: string;
  /** ISO da última execução, para o "há 2 dias". */
  lastRunAt?: string;
  createdAt: string;
  steps: FlowStep[];
}

export interface AutomationTemplate {
  id: string;
  name: string;
  trigger: string;
  description: string;
  steps: FlowStep[];
}

export interface TriggerDef { id: string; label: string; description: string; Icone: LucideIcon; }
export interface ActionDef {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  grupo: 'Negócio' | 'Atividades' | 'Clientes e integrações';
  /** O que o motor faz de fato (server.ts › runAutomations). */
  ajuda: string;
}

// ─── Gatilhos e ações ────────────────────────────────────────────────────────

export const TRIGGERS: TriggerDef[] = [
  { id: 'lead_created',   label: 'Negócio criado',      description: 'Quando um novo negócio for criado',               Icone: Plus },
  { id: 'stage_changed',  label: 'Etapa alterada',      description: 'Quando a etapa de um negócio mudar',              Icone: ArrowRightLeft },
  { id: 'lead_won',       label: 'Negócio ganho',       description: 'Quando um negócio for marcado como ganho',        Icone: Trophy },
  { id: 'lead_lost',      label: 'Negócio perdido',     description: 'Quando um negócio for marcado como perdido',      Icone: XCircle },
  { id: 'lead_updated',   label: 'Negócio atualizado',  description: 'Quando qualquer campo do negócio for alterado',   Icone: Pencil },
  { id: 'task_created',   label: 'Atividade criada',    description: 'Quando uma nova atividade for registrada',        Icone: CalendarPlus },
  { id: 'task_overdue',   label: 'Atividade atrasada',  description: 'Quando uma atividade passar do prazo',            Icone: AlarmClock },
  { id: 'task_completed', label: 'Atividade concluída', description: 'Quando uma atividade for concluída',              Icone: CheckCircle2 },
];

// Chaves de config lidas pelo motor:
//   create_task: task_type, day_offset, title, observations · move_stage: column_id
//   create_lead: kanban_id, column_id · assign_responsible: responsible_id · add_tag: tag
//   create_note: note · send_webhook: webhook_url · start_sequence: sequence_id
// `_kanban` é auxiliar da tela (mesma convenção das regras de condição): guarda o pipeline
// escolhido para listar as etapas; o motor ignora.
export const ACTIONS: ActionDef[] = [
  { id: 'move_stage',         grupo: 'Negócio',    label: 'Mover para etapa',            description: 'Move o negócio para outra etapa',          icon: ArrowRight,
    ajuda: 'O negócio vai para a etapa escolhida e a movimentação entra no histórico.' },
  { id: 'mark_won',           grupo: 'Negócio',    label: 'Marcar como ganho',           description: 'Fecha o negócio como ganho',              icon: TrendingUp,
    ajuda: 'Move o negócio para a primeira etapa do mesmo pipeline com "ganho" ou "fechado" no nome. Sem essa etapa, nada acontece.' },
  { id: 'mark_lost',          grupo: 'Negócio',    label: 'Marcar como perdido',         description: 'Fecha o negócio como perdido',            icon: AlertCircle,
    ajuda: 'Marca o negócio como perdido, sem mudar a etapa.' },
  { id: 'assign_responsible', grupo: 'Negócio',    label: 'Atribuir responsável',        description: 'Define um responsável para o negócio',     icon: UserCheck,
    ajuda: 'Troca o responsável do negócio pela pessoa escolhida.' },
  { id: 'add_tag',            grupo: 'Negócio',    label: 'Adicionar etiqueta',          description: 'Adiciona uma etiqueta ao negócio',        icon: Tag,
    ajuda: 'Se o negócio já tiver a etiqueta, nada muda.' },
  { id: 'create_note',        grupo: 'Negócio',    label: 'Criar nota',                  description: 'Registra uma nota no negócio',            icon: FileText,
    ajuda: 'A nota aparece no negócio assinada por "Automação".' },
  { id: 'create_lead',        grupo: 'Negócio',    label: 'Criar novo negócio',          description: 'Cria um negócio em outro pipeline',       icon: Plus,
    ajuda: 'Copia nome, telefone, origem, responsável, valor e observações para um negócio novo no pipeline e etapa escolhidos.' },
  { id: 'duplicate_lead',     grupo: 'Negócio',    label: 'Duplicar negócio',            description: 'Cria uma cópia do negócio',               icon: Copy,
    ajuda: 'Cria uma cópia no mesmo pipeline e na mesma etapa.' },
  { id: 'create_task',        grupo: 'Atividades', label: 'Criar atividade',             description: 'Cria uma atividade vinculada ao negócio',  icon: CheckSquare,
    ajuda: 'A atividade fica com o responsável do negócio. O prazo conta a partir do dia do disparo.' },
  { id: 'start_sequence',     grupo: 'Atividades', label: 'Iniciar sequência',           description: 'Inscreve o negócio numa sequência',       icon: GitBranch,
    ajuda: 'Cria as atividades da sequência a partir de hoje, no intervalo de cada passo.' },
  { id: 'clear_open_tasks',   grupo: 'Atividades', label: 'Apagar atividades em aberto', description: 'Remove todas as atividades não concluídas do negócio', icon: Trash2,
    ajuda: 'Apaga de vez as atividades não concluídas do negócio. Não dá para desfazer.' },
  { id: 'create_client',      grupo: 'Clientes e integrações', label: 'Criar cliente ativo', description: 'Cria um cliente em Clientes Ativos', icon: UserPlus,
    ajuda: 'Usa o nome fantasia (ou o nome) do negócio. Se já existir cliente com esse nome, não cria outro.' },
  { id: 'create_onboarding',  grupo: 'Clientes e integrações', label: 'Criar no Onboarding', description: 'Cria cliente no Onboarding Operacional', icon: Layers,
    ajuda: 'Cria o card em Onboarding Operacional (Briefing realizado) com o checklist padrão e as informações da última reunião.' },
  { id: 'send_webhook',       grupo: 'Clientes e integrações', label: 'Enviar webhook', description: 'Envia um POST para uma URL externa', icon: Send,
    ajuda: 'Envia um POST com o evento e os dados do negócio para a URL.' },
];

export const GRUPOS_ACAO: ActionDef['grupo'][] = ['Negócio', 'Atividades', 'Clientes e integrações'];

export const CONDITION_FIELDS = [
  'Kanban', 'Etapa do funil', 'Valor do negócio', 'Responsável', 'Origem', 'Tag', 'Etiqueta', 'Campo personalizado',
];
export const CONDITION_OPS = ['é', 'não é', 'contém', 'não contém', 'maior que', 'menor que', 'está preenchido', 'está vazio'];
export const KANBAN_OPS = ['é', 'não é'];
export const STAGE_OPS = ['mudou para', 'é', 'não é'];
export const OPS_SEM_VALOR = ['está preenchido', 'está vazio'];
export const opsDoCampo = (field: string) =>
  field === 'Kanban' ? KANBAN_OPS : field === 'Etapa do funil' ? STAGE_OPS : CONDITION_OPS;

/** Nome do campo como a pessoa lê (o valor salvo continua o de CONDITION_FIELDS). */
export const rotuloCampo = (field: string) =>
  field === 'Kanban' ? 'Pipeline' : field === 'Etapa do funil' ? 'Etapa do funil' : field;

export const TASK_TYPES = ['Ligação', 'Reunião', 'Videochamada', 'Email', 'WhatsApp', 'Instagram', 'LinkedIn', 'Outros'];

export const makeid = () => Math.random().toString(36).slice(2, 9);

// ─── Modelos ─────────────────────────────────────────────────────────────────
// Antes, 10 dos 12 modelos tinham `steps: []` e abriam o construtor sem gatilho (clicar em
// "Selecionar gatilho" quebrava). Agora cada um já vem com o gatilho e as ações da descrição;
// o que depende da conta (qual pipeline, qual etapa, qual pessoa) fica para escolher.

const g = (event: string): FlowStep => ({ id: 'g', type: 'trigger', config: { event } });
const a = (action_type: string, extra: Record<string, any> = {}): FlowStep =>
  ({ id: 'a' + action_type, type: 'action', config: { action_type, ...extra } });
const c = (...rules: Record<string, any>[]): FlowStep => ({ id: 'c', type: 'condition', config: { rules } });
const pipelineDeOrigem = { field: 'Kanban', op: 'é', value: '', _kanban: '' };

export const TEMPLATES: AutomationTemplate[] = [
  { id: 't1',  name: 'Inbound pra Vendas',                      trigger: 'Negócio ganho',      description: 'Ao ganhar um negócio no pipeline Inbound, cria automaticamente uma oportunidade no pipeline Negociação na etapa Reunião Realizada.',
    steps: [g('lead_won'), c(pipelineDeOrigem), a('create_lead')] },
  { id: 't2',  name: 'Prospecção pra Vendas',                   trigger: 'Negócio ganho',      description: 'Ao ganhar um negócio no pipeline Prospecção, cria automaticamente uma oportunidade no pipeline Negociação na etapa Reunião Realizada.',
    steps: [g('lead_won'), c(pipelineDeOrigem), a('create_lead')] },
  { id: 't3',  name: 'Social Selling pra Vendas',               trigger: 'Negócio ganho',      description: 'Ao ganhar um negócio no pipeline Social Selling, cria automaticamente uma oportunidade no pipeline Negociação na etapa Reunião Realizada.',
    steps: [g('lead_won'), c(pipelineDeOrigem), a('create_lead')] },
  { id: 't4',  name: 'Atribuir responsável ao novo negócio',     trigger: 'Negócio criado',     description: 'Define automaticamente um responsável para todo negócio novo do pipeline Inbound.',
    steps: [g('lead_created'), a('assign_responsible')] },
  { id: 't5',  name: 'Criar atividade ao mudar de etapa',       trigger: 'Etapa alterada',     description: 'Quando um negócio mudar de etapa, cria automaticamente uma atividade de acompanhamento.',
    steps: [g('stage_changed'), a('create_task')] },
  { id: 't6',  name: 'Notificar via webhook ao ganhar negócio', trigger: 'Negócio ganho',      description: 'Envia um POST para uma URL externa sempre que um negócio for marcado como ganho.',
    steps: [g('lead_won'), a('send_webhook')] },
  { id: 't7',  name: 'Mover negócio ao atualizar campo',        trigger: 'Negócio atualizado', description: 'Move o negócio para uma etapa específica quando um campo for atualizado.',
    steps: [g('lead_updated'), a('move_stage')] },
  { id: 't8',  name: 'Atribuir responsável ao criar negócio',   trigger: 'Negócio criado',     description: 'Quando um novo negócio for criado, define automaticamente um responsável.',
    steps: [g('lead_created'), a('assign_responsible')] },
  { id: 't9',  name: 'Criar nota ao perder negócio',            trigger: 'Negócio perdido',    description: 'Registra automaticamente uma nota de análise quando um negócio for perdido.',
    steps: [g('lead_lost'), a('create_note')] },
  { id: 't10', name: 'Marcar como ganho ao atingir etapa final', trigger: 'Etapa alterada',    description: 'Marca o negócio como ganho automaticamente quando ele chegar em uma etapa específica.',
    steps: [g('stage_changed'), c({ field: 'Etapa do funil', op: 'mudou para', value: '', _kanban: '' }), a('mark_won')] },
  { id: 't11', name: 'Adicionar etiqueta com condição',         trigger: 'Negócio atualizado', description: 'Adiciona uma etiqueta ao negócio quando ele atender condições específicas (funil, etapa, status).',
    steps: [g('lead_updated'), c({ field: '', op: 'é', value: '' }), a('add_tag')] },
  { id: 't12', name: 'Duplicar negócio ao ganhar',              trigger: 'Negócio ganho',      description: 'Quando um negócio for ganho, duplica ele em outro funil para acompanhamento (ex: CS, Contrato).',
    steps: [g('lead_won'), a('create_lead')] },
];

// ─── Leitura ─────────────────────────────────────────────────────────────────

export const getTriggerDef = (event?: string) => TRIGGERS.find(t => t.id === event);
export const getActionDef = (type?: string) => ACTIONS.find(x => x.id === type);
/** Rótulo em português de um action_type (usado também no Histórico). */
export const rotuloAcao = (type?: string) => getActionDef(type)?.label || type || '—';
export const rotuloGatilho = (event?: string) => getTriggerDef(event)?.label || event || '—';

/** Separa os passos salvos em gatilho, condições e ações (a ordem de cada grupo se mantém). */
export function dividirPassos(steps: FlowStep[] = []) {
  return {
    gatilho: steps.find(s => s.type === 'trigger') || null,
    condicoes: steps.filter(s => s.type === 'condition'),
    acoes: steps.filter(s => s.type === 'action'),
  };
}

/** Nomes vindos do CRM para montar as frases (pipeline, etapa, sequência, pessoa). */
export interface Resolvedor {
  kanban: (id?: string) => string | undefined;
  coluna: (kanbanId?: string, colunaId?: string) => string | undefined;
  sequencia: (id?: number | string) => string | undefined;
  usuario: (id?: string) => string | undefined;
}

const aspas = (s: string, max = 40) => `“${s.length > max ? s.slice(0, max - 1) + '…' : s}”`;

export function resumoRegra(r: Record<string, any>, nomes: Resolvedor): string {
  if (!r?.field) return 'condição sem campo';
  const op: string = r.op || 'é';
  if (OPS_SEM_VALOR.includes(op)) return `${rotuloCampo(r.field)} ${op}`;
  if (r.field === 'Kanban') {
    const k = r.value ? (nomes.kanban(String(r.value)) || 'pipeline escolhido') : '?';
    return op === 'não é' ? `fora do pipeline ${k}` : `pipeline ${k}`;
  }
  if (r.field === 'Etapa do funil') {
    const k = r._kanban ? nomes.kanban(String(r._kanban)) : undefined;
    const e = r.value ? (nomes.coluna(r._kanban, String(r.value)) || 'etapa escolhida') : '?';
    const alvo = k ? `${k} › ${e}` : e;
    return op === 'não é' ? `fora de ${alvo}` : op === 'mudou para' ? `mudou para ${alvo}` : `em ${alvo}`;
  }
  return `${rotuloCampo(r.field)} ${op} ${r.value ? aspas(String(r.value), 24) : '?'}`;
}

export function resumoCondicoes(condicoes: FlowStep[], nomes: Resolvedor): string {
  const regras = condicoes.flatMap(c => (c.config?.rules || []) as Record<string, any>[]);
  return regras.map(r => resumoRegra(r, nomes)).join(' e ');
}

/** Configuração da ação em uma linha ("Mover para: Pipeline X › Proposta"). */
export function resumoAcao(cfg: Record<string, any>, nomes: Resolvedor): string {
  switch (cfg?.action_type) {
    case 'create_task': {
      const dias = cfg.day_offset ?? 1;
      const prazo = dias === 0 ? 'para o mesmo dia' : `prazo de ${dias} dia${dias === 1 ? '' : 's'}`;
      return `${cfg.task_type || 'Ligação'} · ${prazo} · ${aspas(cfg.title || 'Atividade automática')}`;
    }
    case 'move_stage': {
      if (!cfg.column_id) return 'Etapa de destino não escolhida';
      const k = cfg._kanban ? nomes.kanban(String(cfg._kanban)) : undefined;
      const e = nomes.coluna(cfg._kanban, String(cfg.column_id)) || 'etapa escolhida';
      return `Mover para: ${k ? `${k} › ` : ''}${e}`;
    }
    case 'create_lead': {
      if (!cfg.kanban_id) return 'Pipeline de destino não escolhido';
      const k = nomes.kanban(String(cfg.kanban_id)) || 'pipeline escolhido';
      const e = cfg.column_id ? (nomes.coluna(String(cfg.kanban_id), String(cfg.column_id)) || 'etapa escolhida') : 'sem etapa';
      return `Criar em: ${k} › ${e}`;
    }
    case 'assign_responsible':
      return cfg.responsible_id ? `Responsável: ${nomes.usuario(String(cfg.responsible_id)) || 'pessoa escolhida'}` : 'Responsável não escolhido';
    case 'add_tag': return cfg.tag ? `Etiqueta: ${cfg.tag}` : 'Etiqueta não preenchida';
    case 'create_note': return cfg.note ? aspas(cfg.note, 60) : 'Nota sem texto';
    case 'send_webhook': {
      if (!cfg.webhook_url) return 'URL não preenchida';
      try { return `POST para ${new URL(cfg.webhook_url).host}`; } catch { return cfg.webhook_url; }
    }
    case 'start_sequence':
      return cfg.sequence_id ? `Sequência: ${nomes.sequencia(cfg.sequence_id) || `Sequência ${cfg.sequence_id}`}` : 'Sequência não escolhida';
    case 'mark_won': return 'Vai para a etapa de ganho do pipeline';
    case 'mark_lost': return 'Marca o negócio como perdido';
    case 'duplicate_lead': return 'Cópia no mesmo pipeline e etapa';
    case 'clear_open_tasks': return 'Apaga as atividades não concluídas';
    case 'create_client': return 'Cria em Clientes Ativos';
    case 'create_onboarding': return 'Cria no Onboarding Operacional';
    default: return 'Escolha o que fazer';
  }
}

// ─── Validação antes de salvar ───────────────────────────────────────────────

export interface ErroValidacao { stepId: string | null; mensagem: string; }

export function validar(nome: string, gatilho: FlowStep | null, condicoes: FlowStep[], acoes: FlowStep[]): ErroValidacao[] {
  const erros: ErroValidacao[] = [];
  if (!nome.trim()) erros.push({ stepId: null, mensagem: 'Dê um nome à automação.' });
  if (!gatilho?.config?.event) erros.push({ stepId: gatilho?.id || null, mensagem: 'Escolha o gatilho que dispara a automação.' });

  for (const c of condicoes) {
    const regras: Record<string, any>[] = c.config?.rules || [];
    if (regras.length === 0) erros.push({ stepId: c.id, mensagem: 'A condição está sem regras: adicione uma ou remova a condição.' });
    regras.forEach((r, i) => {
      const n = regras.length > 1 ? ` (regra ${i + 1})` : '';
      if (!r.field) { erros.push({ stepId: c.id, mensagem: `Escolha o campo da condição${n}.` }); return; }
      if (OPS_SEM_VALOR.includes(r.op)) return;
      if (r.field === 'Kanban' && !r.value) erros.push({ stepId: c.id, mensagem: `Escolha o pipeline da condição${n}.` });
      else if (r.field === 'Etapa do funil' && !r.value) erros.push({ stepId: c.id, mensagem: `Escolha a etapa da condição${n}.` });
      else if (!['Kanban', 'Etapa do funil'].includes(r.field) && !String(r.value ?? '').trim())
        erros.push({ stepId: c.id, mensagem: `Preencha o valor da condição${n}.` });
    });
  }

  if (acoes.length === 0) erros.push({ stepId: null, mensagem: 'Adicione pelo menos uma ação.' });
  acoes.forEach((s, i) => {
    const cfg = s.config || {};
    const p = `Ação ${i + 1}: `;
    switch (cfg.action_type) {
      case undefined: case '': erros.push({ stepId: s.id, mensagem: `${p}escolha o que a ação faz.` }); break;
      case 'move_stage': if (!cfg.column_id) erros.push({ stepId: s.id, mensagem: `${p}escolha a etapa de destino.` }); break;
      case 'create_lead':
        if (!cfg.kanban_id) erros.push({ stepId: s.id, mensagem: `${p}escolha o pipeline onde o negócio será criado.` });
        else if (!cfg.column_id) erros.push({ stepId: s.id, mensagem: `${p}escolha a etapa onde o negócio será criado.` });
        break;
      case 'assign_responsible': if (!cfg.responsible_id) erros.push({ stepId: s.id, mensagem: `${p}escolha o responsável.` }); break;
      case 'add_tag': if (!String(cfg.tag || '').trim()) erros.push({ stepId: s.id, mensagem: `${p}escreva a etiqueta.` }); break;
      case 'create_note': if (!String(cfg.note || '').trim()) erros.push({ stepId: s.id, mensagem: `${p}escreva o texto da nota.` }); break;
      case 'send_webhook':
        if (!/^https?:\/\/\S+/i.test(String(cfg.webhook_url || '').trim()))
          erros.push({ stepId: s.id, mensagem: `${p}informe a URL do webhook (começando com https://).` });
        break;
      case 'start_sequence': if (!cfg.sequence_id) erros.push({ stepId: s.id, mensagem: `${p}escolha a sequência.` }); break;
    }
  });
  return erros;
}

// ─── Datas ───────────────────────────────────────────────────────────────────

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias", ou a data. */
export function haQuanto(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  return d.toLocaleDateString('pt-BR');
}
