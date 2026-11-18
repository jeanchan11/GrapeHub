// Painel "Configurar" do construtor: mostra os campos do passo selecionado no fluxo.
// Gatilho → lista de eventos. Condição → regras (E). Ação → escolher o tipo e preencher.
// Cada alteração devolve o config inteiro do passo, com as MESMAS chaves de antes
// (ver catalogo.ts › ACTIONS).
import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeftRight, Info, ListFilter, MousePointerClick, Plus, Trash2, X, Zap } from 'lucide-react';
import {
  ACTIONS, CONDITION_FIELDS, GRUPOS_ACAO, OPS_SEM_VALOR, TASK_TYPES, TRIGGERS,
  getActionDef, opsDoCampo, rotuloCampo, type FlowStep,
} from './catalogo';
import { useDadosCrm } from './dados';
import { Campo, INPUT, Seletor, SeletorLista, TXT_FRACO } from './ui';
import ThemedDropdown from '../ui/ThemedDropdown';

type Config = Record<string, any>;

/** Tira uma chave do config (JSON.stringify já ignoraria `undefined`, mas fica explícito). */
const sem = (cfg: Config, ...chaves: string[]) => {
  const n = { ...cfg };
  for (const k of chaves) delete n[k];
  return n;
};

function Cabecalho({ Icone, titulo, subtitulo, tom }: { Icone: React.ElementType; titulo: string; subtitulo: string; tom: string }) {
  return (
    <div className="flex items-start gap-3 px-5 py-4 border-b border-black/5 dark:border-white/5">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tom}`}><Icone size={16} /></span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-dark-text">{titulo}</p>
        <p className={`text-xs mt-0.5 ${TXT_FRACO}`}>{subtitulo}</p>
      </div>
    </div>
  );
}

function ListaErros({ erros }: { erros: string[] }) {
  if (erros.length === 0) return null;
  return (
    <div className="mx-5 mt-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-3 py-2.5 space-y-1">
      {erros.map((e, i) => (
        <p key={i} className="flex items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle size={13} className="shrink-0 mt-px" /> {e}
        </p>
      ))}
    </div>
  );
}

// ─── Pipeline › Etapa ────────────────────────────────────────────────────────

function PipelineEtapa({ kanbanId, colunaId, onKanban, onColuna, rotuloEtapa = 'Etapa' }: {
  kanbanId?: string; colunaId?: string;
  onKanban: (id: string) => void; onColuna: (id: string) => void;
  rotuloEtapa?: string;
}) {
  const { kanbans, kanbansProntos, colunas, carregarColunas } = useDadosCrm();
  useEffect(() => { if (kanbanId) carregarColunas(String(kanbanId)); }, [kanbanId, carregarColunas]);
  const lista = kanbanId ? colunas[String(kanbanId)] : undefined;
  return (
    <div className="space-y-4">
      <Campo rotulo="Pipeline">
        <Seletor valor={kanbanId} opcoes={kanbans} onChange={onKanban} placeholder="Escolher pipeline…"
          carregando={!kanbansProntos} vazio="Nenhum pipeline encontrado." />
      </Campo>
      {kanbanId && (
        <Campo rotulo={rotuloEtapa}>
          <Seletor valor={colunaId} opcoes={lista || []} onChange={onColuna} placeholder="Escolher etapa…"
            carregando={!lista} vazio="Este pipeline não tem etapas." />
        </Campo>
      )}
    </div>
  );
}

// ─── Gatilho ─────────────────────────────────────────────────────────────────

function PainelGatilho({ passo, onChange }: { passo: FlowStep; onChange: (cfg: Config) => void }) {
  return (
    <div className="p-5">
      <SeletorLista
        cor="ambar"
        itens={TRIGGERS.map(t => ({ id: t.id, label: t.label, description: t.description, Icone: t.Icone }))}
        selecionado={passo.config?.event}
        onEscolher={id => onChange({ event: id })}
      />
    </div>
  );
}

// ─── Condição ────────────────────────────────────────────────────────────────

function PainelCondicao({ passo, onChange, onRemover }: { passo: FlowStep; onChange: (cfg: Config) => void; onRemover: () => void }) {
  const cfg = passo.config || {};
  const regras: Config[] = cfg.rules || [];
  const setRegras = (rs: Config[]) => onChange({ ...cfg, rules: rs });
  const setRegra = (i: number, r: Config) => setRegras(regras.map((x, j) => (j === i ? r : x)));
  const removerRegra = (i: number) => {
    if (regras.length <= 1) { onRemover(); return; }
    setRegras(regras.filter((_, j) => j !== i));
  };

  return (
    <div className="p-5 space-y-3">
      {regras.map((r, i) => {
        const ops = opsDoCampo(r.field);
        const pedeValor = !OPS_SEM_VALOR.includes(r.op);
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                <span className={`text-[10px] font-bold tracking-widest ${TXT_FRACO}`}>E</span>
                <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
              </div>
            )}
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${TXT_FRACO}`}>Regra {i + 1}</p>
                <button type="button" onClick={() => removerRegra(i)} title="Remover regra"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Campo rotulo="Campo">
                  <Seletor
                    valor={r.field || ''}
                    opcoes={CONDITION_FIELDS.map(f => ({ id: f, nome: rotuloCampo(f) }))}
                    placeholder="Escolher…"
                    onChange={field => {
                      const op = opsDoCampo(field).includes(r.op) ? r.op : opsDoCampo(field)[0];
                      setRegra(i, { ...r, field, op, value: '', _kanban: '' });
                    }}
                  />
                </Campo>
                <Campo rotulo="Operador">
                  <ThemedDropdown
                    value={r.op || 'é'}
                    options={ops.map(o => ({ value: o, label: o }))}
                    onChange={op => setRegra(i, { ...r, op: op || 'é' })}
                  />
                </Campo>
              </div>

              {pedeValor && r.field === 'Kanban' && (
                <PipelineSoKanban valor={r.value} onChange={id => setRegra(i, { ...r, value: id })} />
              )}

              {pedeValor && r.field === 'Etapa do funil' && (
                <PipelineEtapa
                  kanbanId={r._kanban || undefined}
                  colunaId={r.value || undefined}
                  onKanban={id => setRegra(i, { ...r, _kanban: id, value: '' })}
                  onColuna={id => setRegra(i, { ...r, value: id })}
                />
              )}

              {pedeValor && r.field && r.field !== 'Kanban' && r.field !== 'Etapa do funil' && (
                <Campo rotulo="Valor">
                  <input type="text" value={r.value || ''} placeholder="Valor…" className={INPUT}
                    onChange={e => setRegra(i, { ...r, value: e.target.value })} />
                </Campo>
              )}
            </div>
          </React.Fragment>
        );
      })}

      <button type="button" onClick={() => setRegras([...regras, { field: '', op: 'é', value: '' }])}
        className="w-full h-9 rounded-xl border border-dashed border-violet-400/50 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-colors inline-flex items-center justify-center gap-1.5">
        <Plus size={13} /> Adicionar regra (E)
      </button>
    </div>
  );
}

function PipelineSoKanban({ valor, onChange }: { valor?: string; onChange: (id: string) => void }) {
  const { kanbans, kanbansProntos } = useDadosCrm();
  return (
    <Campo rotulo="Pipeline">
      <Seletor valor={valor} opcoes={kanbans} onChange={onChange} placeholder="Escolher pipeline…"
        carregando={!kanbansProntos} vazio="Nenhum pipeline encontrado." />
    </Campo>
  );
}

// ─── Ação ────────────────────────────────────────────────────────────────────

function CamposDaAcao({ cfg, set }: { cfg: Config; set: (cfg: Config) => void }) {
  const { sequencias, sequenciasProntas, carregarSequencias, usuarios, usuariosProntos, carregarUsuarios } = useDadosCrm();
  const tipo = cfg.action_type;
  useEffect(() => { if (tipo === 'start_sequence') carregarSequencias(); }, [tipo, carregarSequencias]);
  useEffect(() => { if (tipo === 'assign_responsible') carregarUsuarios(); }, [tipo, carregarUsuarios]);

  switch (tipo) {
    case 'create_task':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Tipo de atividade">
              <ThemedDropdown value={cfg.task_type || 'Ligação'} options={TASK_TYPES.map(t => ({ value: t, label: t }))}
                onChange={v => set({ ...cfg, task_type: v || 'Ligação' })} />
            </Campo>
            <Campo rotulo="Prazo (dias)" ajuda="0 = no mesmo dia">
              <input type="number" min={0} value={cfg.day_offset ?? 1} className={INPUT}
                onChange={e => set({ ...cfg, day_offset: Number(e.target.value) })} />
            </Campo>
          </div>
          <Campo rotulo="Título" ajuda="Vazio vira “Atividade automática”.">
            <input type="text" value={cfg.title || ''} placeholder="Ex.: Ligar para o cliente" className={INPUT}
              onChange={e => set({ ...cfg, title: e.target.value })} />
          </Campo>
          <Campo rotulo="Observações" opcional>
            <textarea rows={3} value={cfg.observations || ''} placeholder="Observações da atividade…" className={`${INPUT} resize-none`}
              onChange={e => set({ ...cfg, observations: e.target.value })} />
          </Campo>
        </div>
      );

    case 'move_stage':
      return (
        <div className="space-y-3">
          {cfg.column_id && !cfg._kanban && (
            <p className={`text-xs ${TXT_FRACO}`}>Já existe uma etapa de destino gravada. Para trocar, escolha o pipeline.</p>
          )}
          <PipelineEtapa
            kanbanId={cfg._kanban || undefined}
            colunaId={cfg.column_id || undefined}
            rotuloEtapa="Etapa de destino"
            onKanban={id => set({ ...sem(cfg, 'column_id'), _kanban: id })}
            onColuna={id => set({ ...cfg, column_id: id })}
          />
        </div>
      );

    case 'create_lead':
      return (
        <PipelineEtapa
          kanbanId={cfg.kanban_id || undefined}
          colunaId={cfg.column_id || undefined}
          rotuloEtapa="Etapa do novo negócio"
          onKanban={id => set({ ...sem(cfg, 'column_id'), kanban_id: id })}
          onColuna={id => set({ ...cfg, column_id: id })}
        />
      );

    case 'assign_responsible':
      return (
        <Campo rotulo="Responsável">
          <Seletor valor={cfg.responsible_id} opcoes={usuarios} onChange={id => set({ ...cfg, responsible_id: id })}
            placeholder="Escolher pessoa…" carregando={!usuariosProntos} vazio="Nenhum usuário encontrado." />
        </Campo>
      );

    case 'add_tag':
      return (
        <Campo rotulo="Etiqueta" ajuda="Escreva exatamente como a etiqueta aparece no CRM.">
          <input type="text" value={cfg.tag || ''} placeholder="Nome da etiqueta" className={INPUT}
            onChange={e => set({ ...cfg, tag: e.target.value })} />
        </Campo>
      );

    case 'create_note':
      return (
        <Campo rotulo="Texto da nota">
          <textarea rows={4} value={cfg.note || ''} placeholder="Texto da nota automática…" className={`${INPUT} resize-none`}
            onChange={e => set({ ...cfg, note: e.target.value })} />
        </Campo>
      );

    case 'send_webhook':
      return (
        <Campo rotulo="URL do webhook">
          <input type="url" value={cfg.webhook_url || ''} placeholder="https://…" className={INPUT}
            onChange={e => set({ ...cfg, webhook_url: e.target.value })} />
        </Campo>
      );

    case 'start_sequence':
      return (
        <Campo rotulo="Sequência">
          <Seletor
            valor={cfg.sequence_id != null ? String(cfg.sequence_id) : ''}
            opcoes={sequencias.map(s => ({ id: String(s.id), nome: s.nome }))}
            onChange={id => set({ ...cfg, sequence_id: id ? Number(id) : undefined })}
            placeholder="Escolher sequência…"
            carregando={!sequenciasProntas}
            vazio="Nenhuma sequência criada. Crie uma em Sequências."
          />
        </Campo>
      );

    default:
      return (
        <p className={`flex items-start gap-1.5 text-xs ${TXT_FRACO}`}>
          <Info size={13} className="shrink-0 mt-px" /> Esta ação não precisa de configuração.
        </p>
      );
  }
}

function PainelAcao({ passo, onChange }: { passo: FlowStep; onChange: (cfg: Config) => void }) {
  const cfg = passo.config || {};
  const def = getActionDef(cfg.action_type);
  const [trocando, setTrocando] = useState(false);

  if (!def || trocando) {
    return (
      <div className="p-5 space-y-3">
        {def && (
          <button type="button" onClick={() => setTrocando(false)} className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline">
            ← Manter “{def.label}”
          </button>
        )}
        <SeletorLista
          busca
          itens={GRUPOS_ACAO.flatMap(gr => ACTIONS.filter(x => x.grupo === gr)).map(x => ({ id: x.id, label: x.label, description: x.description, Icone: x.icon, grupo: x.grupo }))}
          selecionado={cfg.action_type}
          onEscolher={id => { onChange({ ...cfg, action_type: id }); setTrocando(false); }}
        />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start gap-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/20 p-3">
        <span className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
          <def.icon size={15} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-dark-text">{def.label}</p>
          <p className={`text-xs mt-0.5 leading-snug ${TXT_FRACO}`}>{def.ajuda}</p>
        </div>
        <button type="button" onClick={() => setTrocando(true)} title="Trocar o tipo da ação"
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline">
          <ArrowLeftRight size={12} /> Trocar
        </button>
      </div>
      <CamposDaAcao cfg={cfg} set={onChange} />
    </div>
  );
}

// ─── Painel ──────────────────────────────────────────────────────────────────

export function PainelConfigurar({ passo, numeroAcao, erros, onChange, onRemover }: {
  passo: FlowStep | null;
  /** Posição da ação no fluxo (1, 2…), para o título. */
  numeroAcao?: number;
  erros: string[];
  onChange: (id: string, cfg: Config) => void;
  onRemover: (id: string) => void;
}) {
  if (!passo) {
    return (
      <div className="flex flex-col items-center justify-center text-center gap-2 px-8 py-16">
        <MousePointerClick size={24} className="text-slate-300 dark:text-slate-600" />
        <p className={`text-sm font-medium ${TXT_FRACO}`}>Clique num passo do fluxo para configurar.</p>
      </div>
    );
  }
  const set = (cfg: Config) => onChange(passo.id, cfg);

  if (passo.type === 'trigger') {
    return (
      <>
        <Cabecalho Icone={Zap} tom="bg-amber-500/15 text-amber-600 dark:text-amber-400"
          titulo="Gatilho" subtitulo="O evento do CRM que dispara esta automação." />
        <ListaErros erros={erros} />
        <PainelGatilho passo={passo} onChange={set} />
      </>
    );
  }

  if (passo.type === 'condition') {
    return (
      <>
        <Cabecalho Icone={ListFilter} tom="bg-sky-500/15 text-sky-600 dark:text-sky-400"
          titulo="Condição" subtitulo="As ações só rodam se TODAS as regras forem verdadeiras." />
        <ListaErros erros={erros} />
        <PainelCondicao passo={passo} onChange={set} onRemover={() => onRemover(passo.id)} />
        <div className="px-5 pb-5">
          <button type="button" onClick={() => onRemover(passo.id)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-500 transition-colors">
            <Trash2 size={13} /> Remover condição
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Cabecalho Icone={MousePointerClick} tom="bg-violet-500/15 text-violet-600 dark:text-violet-400"
        titulo={`Ação ${numeroAcao ?? ''}`.trim()}
        subtitulo={getActionDef(passo.config?.action_type) ? 'Ajuste o que esta ação faz.' : 'Escolha o que esta ação faz.'} />
      <ListaErros erros={erros} />
      <PainelAcao passo={passo} onChange={set} />
    </>
  );
}
