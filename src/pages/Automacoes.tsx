import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Plus, Play, Pause, Trash2, Edit2, Clock, Mail, MessageSquare,
  Phone, CheckSquare, Tag, Users, ArrowRight, Settings, ChevronRight,
  Activity, AlertCircle, X, Search, GitBranch, Repeat, Bell, TrendingUp,
  Filter, ArrowLeft, Save, ChevronDown, MoreHorizontal, ArrowUp,
  ToggleLeft, Hash, Pencil, Copy, Webhook, ListChecks, UserCheck,
  FlagTriangleRight, FileText, Send, RefreshCw, SkipForward, History,
  LayoutGrid, Layers, Eye, EyeOff, Circle
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type StepType = 'trigger' | 'condition' | 'action';
type ViewMode = 'list' | 'builder';
type TabMode = 'modelos' | 'minhas' | 'historico';

interface TriggerDef { id: string; label: string; description: string; }
interface ActionDef  { id: string; label: string; description: string; icon: React.ElementType; }

interface FlowStep {
  id: string;
  type: StepType;
  config: Record<string, any>;
}

interface Automation {
  id: string;
  name: string;
  description: string;
  active: boolean;
  runs: number;
  lastRun?: string;
  createdAt: string;
  steps: FlowStep[];
}

interface AutomationTemplate {
  id: string;
  name: string;
  trigger: string;
  description: string;
  steps: FlowStep[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TRIGGERS: TriggerDef[] = [
  { id: 'lead_created',   label: 'Negócio criado',     description: 'Quando um novo negócio for criado' },
  { id: 'stage_changed',  label: 'Etapa alterada',      description: 'Quando a etapa de um negócio mudar' },
  { id: 'lead_won',       label: 'Negócio ganho',       description: 'Quando um negócio for marcado como ganho' },
  { id: 'lead_lost',      label: 'Negócio perdido',     description: 'Quando um negócio for marcado como perdido' },
  { id: 'lead_updated',   label: 'Negócio atualizado',  description: 'Quando qualquer campo do negócio for alterado' },
  { id: 'task_created',   label: 'Atividade criada',    description: 'Quando uma nova atividade for registrada' },
  { id: 'task_overdue',   label: 'Atividade atrasada',  description: 'Quando uma atividade passar do prazo' },
  { id: 'task_completed', label: 'Atividade concluída', description: 'Quando uma atividade for concluída' },
];

const ACTIONS: ActionDef[] = [
  { id: 'create_lead',        label: 'Criar novo negócio',        description: 'Cria um negócio em outro pipeline',       icon: Plus },
  { id: 'create_task',        label: 'Criar atividade',           description: 'Cria uma atividade vinculada ao negócio',  icon: CheckSquare },
  { id: 'move_stage',         label: 'Mover para etapa',          description: 'Move o negócio para outra etapa',          icon: ArrowRight },
  { id: 'assign_responsible', label: 'Atribuir responsável',      description: 'Define um responsável para o negócio',     icon: UserCheck },
  { id: 'mark_won',           label: 'Marcar como ganho',         description: 'Fecha o negócio como ganho',              icon: TrendingUp },
  { id: 'mark_lost',          label: 'Marcar como perdido',       description: 'Fecha o negócio como perdido',            icon: AlertCircle },
  { id: 'add_tag',            label: 'Adicionar etiqueta',        description: 'Adiciona uma etiqueta ao negócio',        icon: Tag },
  { id: 'duplicate_lead',     label: 'Duplicar negócio',          description: 'Cria uma cópia do negócio',               icon: Copy },
  { id: 'create_note',        label: 'Criar nota',                description: 'Registra uma nota no negócio',            icon: FileText },
  { id: 'clear_open_tasks',   label: 'Apagar atividades em aberto', description: 'Remove todas as atividades não concluídas do negócio', icon: Trash2 },
  { id: 'send_webhook',       label: 'Enviar webhook',            description: 'Envia um POST para uma URL externa',      icon: Send },
  { id: 'start_sequence',     label: 'Iniciar sequência',         description: 'Inscreve o negócio numa sequência',       icon: GitBranch },
];

const CONDITION_FIELDS = [
  'Kanban', 'Etapa do funil', 'Valor do negócio', 'Responsável', 'Origem', 'Tag', 'Etiqueta', 'Campo personalizado',
];
const CONDITION_OPS = ['é', 'não é', 'contém', 'não contém', 'maior que', 'menor que', 'está preenchido', 'está vazio'];

const TASK_TYPES = ['Ligação', 'Reunião', 'Videochamada', 'Email', 'WhatsApp', 'Instagram', 'LinkedIn', 'Outros'];

const TEMPLATES: AutomationTemplate[] = [
  { id: 't1',  name: 'Inbound pra Vendas',                   trigger: 'Negócio ganho',      description: 'Ao ganhar um negócio no pipeline Inbound, cria automaticamente uma oportunidade no pipeline Negociação na etapa Reunião Realizada.', steps: [{ id: 's1', type: 'trigger', config: { event: 'lead_won' } }, { id: 's2', type: 'action', config: { action_type: 'create_lead' } }] },
  { id: 't2',  name: 'Prospecção pra Vendas',                trigger: 'Negócio ganho',      description: 'Ao ganhar um negócio no pipeline Prospecção, cria automaticamente uma oportunidade no pipeline Negociação na etapa Reunião Realizada.', steps: [] },
  { id: 't3',  name: 'Social Selling pra Vendas',            trigger: 'Negócio ganho',      description: 'Ao ganhar um negócio no pipeline Social Selling, cria automaticamente uma oportunidade no pipeline Negociação na etapa Reunião Realizada.', steps: [] },
  { id: 't4',  name: 'Rodízio SDRs',                         trigger: 'Negócio criado',     description: 'Distribui automaticamente os novos negócios do pipeline Inbound entre os SDRs da equipe, em rodízio igualitário.', steps: [{ id: 's1', type: 'trigger', config: { event: 'lead_created' } }, { id: 's2', type: 'action', config: { action_type: 'assign_responsible' } }] },
  { id: 't5',  name: 'Criar atividade ao mudar de etapa',    trigger: 'Etapa alterada',     description: 'Quando um negócio mudar de etapa, cria automaticamente uma atividade de acompanhamento.', steps: [] },
  { id: 't6',  name: 'Notificar via webhook ao ganhar negócio', trigger: 'Negócio ganho',   description: 'Envia um POST para uma URL externa sempre que um negócio for marcado como ganho.', steps: [] },
  { id: 't7',  name: 'Mover negócio ao atualizar campo',     trigger: 'Negócio atualizado', description: 'Move o negócio para uma etapa específica quando um campo for atualizado.', steps: [] },
  { id: 't8',  name: 'Atribuir responsável ao criar negócio', trigger: 'Negócio criado',    description: 'Quando um novo negócio for criado, define automaticamente um responsável.', steps: [] },
  { id: 't9',  name: 'Criar nota ao perder negócio',         trigger: 'Negócio perdido',    description: 'Registra automaticamente uma nota de análise quando um negócio for perdido.', steps: [] },
  { id: 't10', name: 'Marcar como ganho ao atingir etapa final', trigger: 'Etapa alterada', description: 'Marca o negócio como ganho automaticamente quando ele chegar em uma etapa específica.', steps: [] },
  { id: 't11', name: 'Adicionar etiqueta com condição',      trigger: 'Negócio atualizado', description: 'Adiciona uma etiqueta ao negócio quando ele atender condições específicas (funil, etapa, status).', steps: [] },
  { id: 't12', name: 'Duplicar negócio ao ganhar',           trigger: 'Negócio ganho',      description: 'Quando um negócio for ganho, duplica ele em outro funil para acompanhamento (ex: CS, Contrato).', steps: [] },
];

const TRIGGER_COLOR = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-400/40';
const ACTION_COLOR  = 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-400/40';
const COND_COLOR    = 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-400/40';

const makeid = () => Math.random().toString(36).slice(2, 9);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTriggerLabel(event: string) {
  return TRIGGERS.find(t => t.id === event)?.label || 'Selecionar gatilho';
}
function getTriggerDesc(event: string) {
  return TRIGGERS.find(t => t.id === event)?.description || '';
}
function getActionLabel(action_type: string) {
  return ACTIONS.find(a => a.id === action_type)?.label || 'Selecionar ação';
}

// ─── Flow Node Components ─────────────────────────────────────────────────────

const FlowConnector = () => (
  <div className="flex flex-col items-center gap-0 my-px">
    <div className="w-px h-5 bg-gray-300 dark:bg-white/20" />
    <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-white/20" />
    <div className="w-px h-5 bg-gray-300 dark:bg-white/20" />
  </div>
);

const AddStepRow = ({ onAddCondition, onAddAction }: { onAddCondition: () => void; onAddAction: () => void }) => (
  <div className="flex items-center justify-center gap-2 my-1">
    <button onClick={onAddCondition} className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border border-dashed ${COND_COLOR} hover:opacity-80 transition-opacity`}>
      <Filter size={10} /> +SE
    </button>
    <button onClick={onAddAction} className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold border border-dashed ${ACTION_COLOR} hover:opacity-80 transition-opacity`}>
      <Play size={10} /> +AÇÃO
    </button>
  </div>
);

// ─── RIGHT PANEL ──────────────────────────────────────────────────────────────

interface RightPanelProps {
  mode: 'trigger' | 'action' | 'condition' | null;
  step: FlowStep | null;
  onUpdateStep: (id: string, config: Record<string, any>) => void;
  onClose: () => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ mode, step, onUpdateStep, onClose }) => {
  if (!mode || !step) return null;

  if (mode === 'trigger') return (
    <div className="w-80 shrink-0 border-l border-gray-200 dark:border-white/10 bg-white dark:bg-dark-card overflow-y-auto">
      <div className="p-5 border-b border-gray-100 dark:border-white/10">
        <p className="text-sm font-black text-gray-900 dark:text-white">Configurar Gatilho</p>
        <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">Selecione o evento que vai disparar esta automação.</p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-white/5">
        {TRIGGERS.map(t => (
          <button key={t.id} onClick={() => { onUpdateStep(step.id, { event: t.id }); onClose(); }}
            className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${step.config.event === t.id ? 'bg-violet-50 dark:bg-violet-500/10' : ''}`}>
            <p className={`text-sm font-bold ${step.config.event === t.id ? 'text-violet-600 dark:text-violet-400' : 'text-gray-900 dark:text-white'}`}>{t.label}</p>
            <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{t.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  if (mode === 'action') {
    const cfg = step.config;
    const isCreateTask = !cfg.action_type || cfg.action_type === 'create_task';
    return (
      <div className="w-80 shrink-0 border-l border-gray-200 dark:border-white/10 bg-white dark:bg-dark-card overflow-y-auto">
        <div className="p-5 border-b border-gray-100 dark:border-white/10">
          <p className="text-sm font-black text-gray-900 dark:text-white">Configurar Ação</p>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">Configure os parâmetros desta ação.</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {ACTIONS.map(a => {
            const Icon = a.icon;
            return (
              <button key={a.id} onClick={() => onUpdateStep(step.id, { ...cfg, action_type: a.id })}
                className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-start gap-3 ${cfg.action_type === a.id ? 'bg-violet-50 dark:bg-violet-500/10' : ''}`}>
                <Icon size={15} className={`mt-0.5 shrink-0 ${cfg.action_type === a.id ? 'text-violet-500' : 'text-gray-400 dark:text-slate-500'}`} />
                <div>
                  <p className={`text-sm font-bold ${cfg.action_type === a.id ? 'text-violet-600 dark:text-violet-400' : 'text-gray-900 dark:text-white'}`}>{a.label}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{a.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (mode === 'condition') {
    const cfg = step.config;
    const rules: any[] = cfg.rules || [{ field: '', op: 'é', value: '' }];
    const updateRules = (rs: any[]) => onUpdateStep(step.id, { ...cfg, rules: rs });

    // Carrega kanbans disponíveis para o dropdown de condição
    const [kanbans, setKanbans] = useState<{ id: string; name: string }[]>([]);
    useEffect(() => {
      fetch('/api/crm-comercial/kanbans')
        .then(r => r.json())
        .then((data: any[]) => setKanbans(data.map(k => ({ id: String(k.id), name: k.name || k.title || k.nome || String(k.id) }))))
        .catch(() => {});
    }, []);

    // Mapa de columns por kanban_id (carregado sob demanda)
    const [columnsByKanban, setColumnsByKanban] = useState<Record<string, { id: string; name: string }[]>>({});

    const loadColumns = (kanbanId: string) => {
      if (!kanbanId || columnsByKanban[kanbanId]) return;
      fetch(`/api/crm-comercial/columns?kanban_id=${kanbanId}`)
        .then(r => r.json())
        .then((data: any[]) => setColumnsByKanban(prev => ({
          ...prev,
          [kanbanId]: data.map(c => ({ id: String(c.id), name: c.title || c.name || String(c.id) })),
        })))
        .catch(() => {});
    };

    const KANBAN_OPS = ['é', 'não é'];
    const STAGE_OPS  = ['mudou para', 'é', 'não é'];

    return (
      <div className="w-80 shrink-0 border-l border-gray-200 dark:border-white/10 bg-white dark:bg-dark-card overflow-y-auto">
        <div className="p-5 border-b border-gray-100 dark:border-white/10">
          <p className="text-sm font-black text-gray-900 dark:text-white">Condição</p>
          <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">A automação só continua se estas condições forem verdadeiras.</p>
        </div>
        <div className="p-4 space-y-2">
          {rules.map((r, i) => (
            <React.Fragment key={i}>
              {/* Separador AND entre regras */}
              {i > 0 && (
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                  <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 tracking-widest">E</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                </div>
              )}

              {/* Card de cada regra */}
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-3 space-y-2">
                {/* Linha campo + operador + X */}
                <div className="flex items-center gap-2">
                  <select value={r.field} onChange={e => updateRules(rules.map((x,j)=>j===i?{...x,field:e.target.value,value:'',_kanban:''}:x))}
                    className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-white dark:bg-dark-bg border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60">
                    <option value="">Campo...</option>
                    {CONDITION_FIELDS.map(f => <option key={f}>{f}</option>)}
                  </select>
                  <select value={r.op} onChange={e => updateRules(rules.map((x,j)=>j===i?{...x,op:e.target.value}:x))}
                    className="w-24 px-2 py-1.5 rounded-lg bg-white dark:bg-dark-bg border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60">
                    {(r.field === 'Kanban' ? KANBAN_OPS : r.field === 'Etapa do funil' ? STAGE_OPS : CONDITION_OPS).map(o => <option key={o}>{o}</option>)}
                  </select>
                  <button onClick={() => updateRules(rules.filter((_,j)=>j!==i))} className="text-gray-400 hover:text-red-500 transition-colors shrink-0"><X size={13} /></button>
                </div>

                {/* ── KANBAN: seletor ── */}
                {!['está preenchido','está vazio'].includes(r.op) && r.field === 'Kanban' && (
                  <>
                    <select value={r.value} onChange={e => updateRules(rules.map((x,j)=>j===i?{...x,value:e.target.value}:x))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-dark-bg border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60">
                      <option value="">Selecionar kanban...</option>
                      {kanbans.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                    {r.value && (
                      <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">
                        ✓ {kanbans.find(k => k.id === r.value)?.name || r.value}
                      </p>
                    )}
                  </>
                )}

                {/* ── ETAPA DO FUNIL: pipeline → etapa ── */}
                {!['está preenchido','está vazio'].includes(r.op) && r.field === 'Etapa do funil' && (
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">Pipeline</p>
                      <select
                        value={r._kanban || ''}
                        onChange={e => {
                          const kId = e.target.value;
                          loadColumns(kId);
                          updateRules(rules.map((x,j)=>j===i?{...x,_kanban:kId,value:''}:x));
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-dark-bg border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60">
                        <option value="">Selecionar pipeline...</option>
                        {kanbans.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                      </select>
                    </div>
                    {r._kanban && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">Etapa</p>
                        <select
                          value={r.value || ''}
                          onChange={e => updateRules(rules.map((x,j)=>j===i?{...x,value:e.target.value}:x))}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-dark-bg border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60">
                          <option value="">Selecionar etapa...</option>
                          {(columnsByKanban[r._kanban] || []).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {r.value && r._kanban && (
                      <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">
                        ✓ {kanbans.find(k => k.id === r._kanban)?.name} → {(columnsByKanban[r._kanban] || []).find(c => c.id === r.value)?.name || r.value}
                      </p>
                    )}
                  </div>
                )}

                {/* ── OUTROS CAMPOS: input livre ── */}
                {!['está preenchido','está vazio'].includes(r.op) && r.field !== 'Kanban' && r.field !== 'Etapa do funil' && (
                  <input type="text" value={r.value || ''} onChange={e => updateRules(rules.map((x,j)=>j===i?{...x,value:e.target.value}:x))}
                    placeholder="Valor..."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-dark-bg border border-gray-200 dark:border-white/10 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60" />
                )}
              </div>
            </React.Fragment>
          ))}

          {/* Botão adicionar e contador */}
          <button onClick={() => updateRules([...rules, {field:'',op:'é',value:''}])}
            className="w-full mt-1 py-2 text-xs text-violet-600 dark:text-violet-400 font-bold border border-dashed border-violet-300 dark:border-violet-500/30 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
            + Adicionar condição
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// ─── ACTION FORM (inline in flow) ────────────────────────────────────────────

const ActionForm: React.FC<{ step: FlowStep; idx: number; onUpdate: (id: string, cfg: Record<string,any>) => void; onDelete: (id: string) => void; onSelect: () => void; isSelected: boolean }> = ({ step, idx, onUpdate, onDelete, onSelect, isSelected }) => {
  const cfg = step.config;
  const ActionIcon = ACTIONS.find(a => a.id === cfg.action_type)?.icon || Play;

  // Carrega sequências disponíveis para o selector de start_sequence
  const [sequences, setSequences] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    if (cfg.action_type === 'start_sequence') {
      fetch('/api/crm-comercial/sequences/all')
        .then(r => r.json())
        .then((data: any[]) => setSequences(data.map(s => ({ id: s.id, name: s.name || `Sequência ${s.id}` }))))
        .catch(() => {});
    }
  }, [cfg.action_type]);

  return (
    <div onClick={onSelect} className={`rounded-xl border-2 transition-all cursor-pointer ${isSelected ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-dark-card hover:border-violet-400/50'}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-black flex items-center justify-center">{idx}</span>
          <Play size={12} className="text-violet-500" />
          <span className="text-[11px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-wider">AÇÃO</span>
          {cfg.action_type && <span className="text-xs text-gray-600 dark:text-slate-400 font-medium">{getActionLabel(cfg.action_type)}</span>}
        </div>
        <button onClick={e=>{e.stopPropagation();onDelete(step.id)}} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 size={13}/></button>
      </div>
      {/* Inline form */}
      <div className="px-4 py-3 space-y-3" onClick={e=>e.stopPropagation()}>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 block mb-1">Tipo de Ação</label>
          <select value={cfg.action_type||''} onChange={e=>onUpdate(step.id,{...cfg,action_type:e.target.value})}
            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60">
            <option value="">Selecionar...</option>
            {ACTIONS.map(a=><option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>
        {(cfg.action_type === 'create_task' || !cfg.action_type) && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 block mb-1">Tipo</label>
                <select value={cfg.task_type||'Ligação'} onChange={e=>onUpdate(step.id,{...cfg,task_type:e.target.value})}
                  className="w-full px-2 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60">
                  {TASK_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 block mb-1">Prazo (dias)</label>
                <input type="number" min={0} value={cfg.day_offset??1} onChange={e=>onUpdate(step.id,{...cfg,day_offset:Number(e.target.value)})}
                  className="w-full px-2 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 block mb-1">Título</label>
              <input type="text" value={cfg.title||''} onChange={e=>onUpdate(step.id,{...cfg,title:e.target.value})}
                placeholder="Ex: Ligar para o cliente"
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 block mb-1">Observações (opcional)</label>
              <textarea value={cfg.observations||''} onChange={e=>onUpdate(step.id,{...cfg,observations:e.target.value})}
                rows={2} placeholder="Observações da atividade..."
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60 resize-none" />
            </div>
          </>
        )}
        {cfg.action_type === 'send_webhook' && (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 block mb-1">URL do Webhook</label>
            <input type="url" value={cfg.webhook_url||''} onChange={e=>onUpdate(step.id,{...cfg,webhook_url:e.target.value})}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60" />
          </div>
        )}
        {cfg.action_type === 'create_note' && (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 block mb-1">Conteúdo da nota</label>
            <textarea value={cfg.note||''} onChange={e=>onUpdate(step.id,{...cfg,note:e.target.value})}
              rows={3} placeholder="Texto da nota automática..."
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60 resize-none" />
          </div>
        )}
        {cfg.action_type === 'add_tag' && (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 block mb-1">Etiqueta</label>
            <input type="text" value={cfg.tag||''} onChange={e=>onUpdate(step.id,{...cfg,tag:e.target.value})}
              placeholder="Nome da etiqueta"
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60" />
          </div>
        )}
        {cfg.action_type === 'start_sequence' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 block">Sequência</label>
            {sequences.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500 italic">Carregando sequências...</p>
            ) : (
              <select
                value={cfg.sequence_id || ''}
                onChange={e => onUpdate(step.id, { ...cfg, sequence_id: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-violet-500/60">
                <option value="">Selecionar sequência...</option>
                {sequences.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            {cfg.sequence_id && (
              <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">
                ✓ {sequences.find(s => s.id === cfg.sequence_id)?.name || `Sequência ${cfg.sequence_id}`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── CONDITION BLOCK (inline in flow) ────────────────────────────────────────

const ConditionBlock: React.FC<{ step: FlowStep; onDelete: (id: string) => void; onSelect: () => void; isSelected: boolean }> = ({ step, onDelete, onSelect, isSelected }) => {
  const rules: any[] = step.config.rules || [];
  const label = rules.length === 0 ? '???' : rules.map(r=>`${r.field||'???'} ${r.op} ${r.value||''}`).join(' E ');
  return (
    <div onClick={onSelect} className={`rounded-xl border-2 px-4 py-3 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'border-sky-400 bg-sky-50 dark:bg-sky-500/10' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-dark-card hover:border-sky-400/50'}`}>
      <div className="flex items-center gap-2">
        <Filter size={13} className="text-sky-500" />
        <span className="text-[11px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-wider">CONDIÇÃO</span>
        <span className="text-xs text-gray-600 dark:text-slate-400 truncate max-w-[180px]">{label}</span>
      </div>
      <button onClick={e=>{e.stopPropagation();onDelete(step.id)}} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 size={13}/></button>
    </div>
  );
};

// ─── BUILDER ─────────────────────────────────────────────────────────────────

const AutomationBuilder: React.FC<{
  automation: Partial<Automation>;
  onSave: (a: Partial<Automation>) => void;
  onBack: () => void;
  saving?: boolean;
}> = ({ automation: init, onSave, onBack, saving = false }) => {
  const [name, setName] = useState(init.name || '');
  const [description, setDescription] = useState(init.description || '');
  const [steps, setSteps] = useState<FlowStep[]>(init.steps || [{ id: makeid(), type: 'trigger', config: {} }]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(!init.name);

  const triggerStep = steps.find(s => s.type === 'trigger')!;
  const flowSteps = steps.filter(s => s.type !== 'trigger');

  const selectedStep = steps.find(s => s.id === selectedStepId) || null;
  const rightPanelMode = selectedStep
    ? (selectedStep.type === 'trigger' ? 'trigger' : selectedStep.type === 'condition' ? 'condition' : 'action')
    : null;

  const updateStep = (id: string, config: Record<string,any>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, config } : s));
  };

  const deleteStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id));
    if (selectedStepId === id) setSelectedStepId(null);
  };

  const addCondition = () => {
    const ns: FlowStep = { id: makeid(), type: 'condition', config: { rules: [{ field: '', op: 'é', value: '' }] } };
    setSteps(prev => [...prev, ns]);
    setSelectedStepId(ns.id);
  };

  const addAction = () => {
    const ns: FlowStep = { id: makeid(), type: 'action', config: { action_type: 'create_task' } };
    setSteps(prev => [...prev, ns]);
    setSelectedStepId(ns.id);
  };

  const hasTrigger = !!triggerStep?.config?.event;

  return (
    <div className="flex h-full bg-light-bg dark:bg-dark-bg">
      {/* ── Main flow area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-white dark:bg-dark-card border-b border-gray-200 dark:border-white/10 gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all shrink-0">
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <input autoFocus type="text" value={name} onChange={e=>setName(e.target.value)} onBlur={()=>setEditingName(false)}
                  placeholder="Nome da automação"
                  className="text-lg font-black text-gray-900 dark:text-white bg-transparent border-b-2 border-violet-500 focus:outline-none w-full max-w-xs" />
              ) : (
                <button onClick={()=>setEditingName(true)} className="text-lg font-black text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors truncate block">{name || 'Nome da automação'}</button>
              )}
              <input type="text" value={description} onChange={e=>setDescription(e.target.value)}
                placeholder="Descrição opcional"
                className="text-xs text-gray-500 dark:text-slate-500 bg-transparent focus:outline-none w-full mt-0.5" />
            </div>
          </div>
          <button onClick={()=>onSave({ ...init, name, description, steps })} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-violet-500/20 shrink-0">
            {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Save size={15} />} Salvar
          </button>
        </div>

        {/* Flow canvas */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-xl mx-auto space-y-0">
            {/* TRIGGER BLOCK */}
            <div className={`rounded-xl border-2 border-dashed transition-all ${hasTrigger ? 'border-amber-400/60 bg-amber-50 dark:bg-amber-500/5' : 'border-amber-400/40 bg-amber-50/50 dark:bg-amber-500/5'}`}>
              <div className="px-4 py-2.5 flex items-center gap-2 border-b border-amber-200/60 dark:border-amber-500/20">
                <Zap size={13} className="text-amber-500" />
                <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">GATILHO</span>
              </div>
              {hasTrigger ? (
                <button onClick={()=>setSelectedStepId(triggerStep.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-100/50 dark:hover:bg-amber-500/10 transition-colors rounded-b-xl">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{getTriggerLabel(triggerStep.config.event)}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-500">{getTriggerDesc(triggerStep.config.event)}</p>
                  </div>
                  <ChevronRight size={15} className="text-gray-400 shrink-0" />
                </button>
              ) : (
                <button onClick={()=>setSelectedStepId(triggerStep.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 text-amber-500 hover:text-amber-600 hover:bg-amber-100/50 dark:hover:bg-amber-500/10 transition-colors rounded-b-xl text-sm font-bold">
                  <Plus size={15} /> Selecionar gatilho
                </button>
              )}
            </div>

            {/* FLOW STEPS */}
            {flowSteps.map((step, i) => (
              <React.Fragment key={step.id}>
                <FlowConnector />
                <AddStepRow onAddCondition={addCondition} onAddAction={addAction} />
                <FlowConnector />
                {step.type === 'condition' ? (
                  <ConditionBlock step={step} onDelete={deleteStep}
                    onSelect={()=>setSelectedStepId(step.id)}
                    isSelected={selectedStepId === step.id} />
                ) : (
                  <ActionForm step={step} idx={i+1} onUpdate={updateStep} onDelete={deleteStep}
                    onSelect={()=>setSelectedStepId(step.id)}
                    isSelected={selectedStepId === step.id} />
                )}
              </React.Fragment>
            ))}

            {/* Add first step or end */}
            <FlowConnector />
            <AddStepRow onAddCondition={addCondition} onAddAction={addAction} />
            <FlowConnector />
            <div className="flex items-center justify-center gap-2 py-3">
              <Circle size={14} className="text-gray-300 dark:text-white/20" />
              <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">Fim do fluxo</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <AnimatePresence>
        {rightPanelMode && (
          <motion.div initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 80, opacity: 0 }} transition={{ duration: 0.2 }}>
            <RightPanel mode={rightPanelMode} step={selectedStep} onUpdateStep={updateStep} onClose={()=>setSelectedStepId(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── TEMPLATE CARD ────────────────────────────────────────────────────────────

const TriggerBadge = ({ label }: { label: string }) => (
  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400">{label}</span>
);

const TemplateCard: React.FC<{ tpl: AutomationTemplate; onUse: (tpl: AutomationTemplate) => void }> = ({ tpl, onUse }) => (
  <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-white/10 rounded-2xl p-5 hover:border-violet-500/40 hover:shadow-md transition-all group flex flex-col">
    <div className="flex items-start gap-3 mb-3">
      <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
        <Zap size={16} className="text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{tpl.name}</p>
        <TriggerBadge label={tpl.trigger} />
      </div>
    </div>
    <p className="text-xs text-gray-500 dark:text-slate-500 leading-relaxed flex-1 mb-4">{tpl.description}</p>
    <button onClick={() => onUse(tpl)}
      className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1 transition-colors group-hover:gap-2">
      Usar este modelo <ArrowRight size={12} />
    </button>
  </div>
);

// ─── AUTOMATION ROW ───────────────────────────────────────────────────────────

const AutomationRow: React.FC<{ a: Automation; onEdit: () => void; onDelete: () => void; onToggle: () => void }> = ({ a, onEdit, onDelete, onToggle }) => (
  <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-white/10 rounded-2xl p-5 hover:border-violet-500/30 transition-all group flex items-center gap-4">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${a.active ? 'bg-violet-500/15 text-violet-500' : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-slate-500'}`}>
      <Zap size={16} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm font-bold text-gray-900 dark:text-white">{a.name}</p>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.active ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-slate-400'}`}>
          {a.active ? 'Ativa' : 'Inativa'}
        </span>
      </div>
      {a.description && <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">{a.description}</p>}
      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400 dark:text-slate-500">
        <span className="flex items-center gap-1"><Activity size={10}/> {a.runs} execuções</span>
        {a.lastRun && <span className="flex items-center gap-1"><Clock size={10}/> {a.lastRun}</span>}
      </div>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      <button onClick={onToggle} title={a.active?'Pausar':'Ativar'}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${a.active ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
        {a.active ? <Pause size={14}/> : <Play size={14}/>}
      </button>
      <button onClick={onEdit} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-all"><Edit2 size={14}/></button>
      <button onClick={onDelete} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"><Trash2 size={14}/></button>
    </div>
  </div>
);

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const Automacoes: React.FC = () => {
  const [view, setView] = useState<ViewMode>('list');
  const [tab, setTab] = useState<TabMode>('modelos');
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [editingAutomation, setEditingAutomation] = useState<Partial<Automation> | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Load from API ──
  const loadAutomations = useCallback(async () => {
    try {
      const res = await fetch('/api/automations');
      if (res.ok) {
        const data = await res.json();
        // Normalize DB rows to our Automation interface
        setAutomations(data.map((a: any) => ({
          id: String(a.id),
          name: a.name,
          description: a.description || '',
          active: a.active,
          runs: a.runs || 0,
          lastRun: a.last_run_at ? new Date(a.last_run_at).toLocaleString('pt-BR') : undefined,
          createdAt: a.created_at,
          steps: (a.steps || []).map((s: any) => ({
            id: String(s.id),
            type: s.type as StepType,
            config: typeof s.config === 'string' ? JSON.parse(s.config) : s.config,
          })),
        })));
      }
    } catch (e) {
      console.error('Failed to load automations:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/automations/logs?limit=100');
      if (res.ok) setLogs(await res.json());
    } catch {}
    finally { setLogsLoading(false); }
  }, []);

  useEffect(() => { loadAutomations(); }, [loadAutomations]);
  useEffect(() => { if (tab === 'historico') loadLogs(); }, [tab, loadLogs]);

  const activeCount = automations.filter(a => a.active).length;
  const totalRuns = automations.reduce((s, a) => s + a.runs, 0);

  const openBuilder = (base?: Partial<Automation>) => {
    setEditingAutomation(base || {});
    setView('builder');
  };

  const handleSave = async (a: Partial<Automation>) => {
    if (!a.name?.trim()) { alert('Dê um nome à automação.'); return; }
    setSaving(true);
    try {
      const payload = { name: a.name, description: a.description || '', steps: a.steps || [] };
      const isEdit = !!a.id;
      const res = await fetch(
        isEdit ? `/api/automations/${a.id}` : '/api/automations',
        { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      if (!res.ok) throw new Error('Falha ao salvar');
      await loadAutomations();
      setView('list');
      setTab('minhas');
    } catch (e) {
      alert('Erro ao salvar automação. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta automação?')) return;
    await fetch(`/api/automations/${id}`, { method: 'DELETE' });
    setAutomations(prev => prev.filter(a => a.id !== id));
  };

  const handleToggle = async (id: string) => {
    const res = await fetch(`/api/automations/${id}/toggle`, { method: 'PATCH' });
    if (res.ok) {
      const updated = await res.json();
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: updated.active } : a));
    }
  };

  const handleUseTemplate = (tpl: AutomationTemplate) => {
    openBuilder({ name: tpl.name, description: tpl.description, steps: tpl.steps.map(s => ({ ...s, id: makeid() })) });
  };

  const filteredAutomations = automations.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Builder view ──
  if (view === 'builder' && editingAutomation !== null) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <AutomationBuilder
          automation={editingAutomation}
          onSave={handleSave}
          onBack={() => setView('list')}
          saving={saving}
        />
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-1">CRM Comercial</p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
            Auto<span className="text-violet-500">mações</span>
          </h1>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mt-1">
            Automatize ações com base em eventos do seu CRM
          </p>
        </div>
        <button onClick={() => openBuilder()}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-violet-500/20">
          <Plus size={16} /> Nova Automação
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-8 mb-8 p-5 bg-white dark:bg-dark-card border border-gray-100 dark:border-white/10 rounded-2xl">
        {[
          { label: 'Total', value: loading ? '—' : automations.length, color: 'text-gray-900 dark:text-white' },
          { label: 'Ativas', value: loading ? '—' : activeCount, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Execuções totais', value: loading ? '—' : totalRuns, color: 'text-violet-600 dark:text-violet-400' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-slate-500 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-gray-200 dark:border-white/10 mb-6">
        {([['modelos','Modelos'],['minhas','Minhas Automações'],['historico','Histórico']] as const).map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${tab === k ? 'border-violet-600 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'modelos' && (
          <motion.div key="modelos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {TEMPLATES.map(tpl => (
                <TemplateCard key={tpl.id} tpl={tpl} onUse={handleUseTemplate} />
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'minhas' && (
          <motion.div key="minhas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                <input type="text" placeholder="Buscar automações..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500/60" />
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
              </div>
            ) : filteredAutomations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                  <Zap size={28} className="text-violet-500" />
                </div>
                <p className="text-base font-bold text-gray-700 dark:text-slate-300 mb-1">Nenhuma automação criada ainda</p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mb-5">Escolha um modelo ou crie do zero.</p>
                <button onClick={() => openBuilder()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-all">
                  <Plus size={15} /> Nova Automação
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAutomations.map(a => (
                  <AutomationRow key={a.id} a={a}
                    onEdit={() => openBuilder(a)}
                    onDelete={() => handleDelete(a.id)}
                    onToggle={() => handleToggle(a.id)} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'historico' && (
          <motion.div key="historico" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-700 dark:text-white">
                {logs.length} execuções registradas
              </p>
              <button onClick={loadLogs} className="text-xs text-violet-600 dark:text-violet-400 hover:underline">Atualizar</button>
            </div>

            {logsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                  <History size={24} className="text-gray-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-bold text-gray-600 dark:text-slate-400">Nenhuma execução ainda</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Os logs aparecerão aqui quando uma automação for disparada.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="bg-white dark:bg-dark-card border border-gray-100 dark:border-white/10 rounded-xl px-4 py-3 flex items-start gap-3">
                    {/* status icon */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      log.status === 'success'
                        ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-500'
                        : 'bg-red-100 dark:bg-red-500/15 text-red-500'
                    }`}>
                      {log.status === 'success'
                        ? <CheckSquare size={14} />
                        : <AlertCircle size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{log.automation_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 font-bold">{log.action_type}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          log.status === 'success'
                            ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400'
                        }`}>{log.status === 'success' ? '✓ sucesso' : '✗ erro'}</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        Lead: <span className="font-medium text-gray-700 dark:text-slate-300">{log.lead_nome || log.lead_id}</span>
                        {' — '}{log.message}
                      </p>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 shrink-0 whitespace-nowrap">
                      {new Date(log.executed_at).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Automacoes;
