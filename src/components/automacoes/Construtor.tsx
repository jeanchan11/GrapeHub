// Construtor de automação: à esquerda o fluxo (gatilho → condição → ações numeradas), à
// direita o painel "Configurar" do passo selecionado. Salvar devolve os passos na ordem
// [gatilho, ...condições, ...ações] — o motor (server.ts › runAutomations) avalia todas as
// condições antes de qualquer ação, então essa ordem é a mesma que ele já executava.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ChevronDown, ChevronUp, CircleDot, ListFilter, Plus, Save, Trash2, Zap,
} from 'lucide-react';
import { designSystem } from '../../design-system';
import { confirmDialog } from '../../lib/confirm';
import { toast } from '../../lib/toast';
import {
  dividirPassos, getActionDef, getTriggerDef, makeid, resumoAcao, resumoRegra, validar,
  type Automation, type FlowStep,
} from './catalogo';
import { kanbansCitados, useDadosCrm } from './dados';
import { PainelConfigurar } from './PainelConfigurar';
import { Interruptor, TXT_FRACO } from './ui';

type Config = Record<string, any>;

function estadoInicial(init: Partial<Automation>) {
  const { gatilho, condicoes, acoes } = dividirPassos(init.steps || []);
  return {
    nome: init.name || '',
    descricao: init.description || '',
    ativa: init.active ?? true, // automação nova nasce ativa (DEFAULT TRUE da tabela)
    gatilho: gatilho || { id: makeid(), type: 'trigger' as const, config: {} },
    condicoes,
    acoes,
  };
}

// ─── Peças do fluxo ──────────────────────────────────────────────────────────

const Rotulo = ({ children }: { children: React.ReactNode }) => (
  <p className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${TXT_FRACO}`}>{children}</p>
);

const Conector = ({ onInserir }: { onInserir?: () => void }) => (
  <div className="relative flex justify-center h-9">
    <div className="w-px h-full bg-black/10 dark:bg-white/15" />
    {onInserir && (
      <button type="button" onClick={onInserir} title="Inserir ação aqui"
        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-dark-card border border-black/10 dark:border-white/15 text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-500/50 flex items-center justify-center transition-colors">
        <Plus size={12} />
      </button>
    )}
  </div>
);

function CartaoPasso({ selecionado, comErro, tom = 'violeta', onClick, children }: {
  selecionado: boolean; comErro: boolean; tom?: 'violeta' | 'ambar' | 'ceu'; onClick: () => void; children: React.ReactNode;
}) {
  const base = tom === 'ambar'
    ? 'bg-amber-50 dark:bg-amber-500/[0.07] border-amber-300/70 dark:border-amber-500/25'
    : 'bg-dark-card border-black/10 dark:border-white/10';
  const sel = tom === 'ambar' ? 'border-amber-500 ring-2 ring-amber-500/25'
    : tom === 'ceu' ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-violet-500 ring-2 ring-violet-500/20';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={`rounded-2xl border cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 ${base} ${
        selecionado ? sel : comErro ? '!border-rose-400/70' : 'hover:border-violet-500/40'
      }`}
    >
      {children}
    </div>
  );
}

const ErroDoPasso = ({ erros }: { erros: string[] }) => erros.length === 0 ? null : (
  <p className="mt-1.5 flex items-start gap-1 text-[11.5px] text-rose-600 dark:text-rose-400">
    <AlertCircle size={12} className="shrink-0 mt-px" /> {erros[0]}{erros.length > 1 ? ` (+${erros.length - 1})` : ''}
  </p>
);

function BotaoIcone({ title, onClick, disabled, perigo, children }: {
  title: string; onClick: () => void; disabled?: boolean; perigo?: boolean; children: React.ReactNode;
}) {
  return (
    <button type="button" title={title} disabled={disabled}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 transition-colors disabled:opacity-30 disabled:pointer-events-none ${
        perigo ? 'hover:text-rose-500 hover:bg-rose-500/10' : 'hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/10'
      }`}>
      {children}
    </button>
  );
}

// ─── Construtor ──────────────────────────────────────────────────────────────

export function Construtor({ automation: init, onSave, onCancel, saving = false }: {
  automation: Partial<Automation>;
  /** `ativa` é o estado desejado do interruptor; quem chama aplica pelo /toggle depois de salvar. */
  onSave: (a: Partial<Automation>, ativa: boolean) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const { nomes, carregarColunas, carregarSequencias, carregarUsuarios } = useDadosCrm();
  const [ini] = useState(() => estadoInicial(init));
  const [nome, setNome] = useState(ini.nome);
  const [descricao, setDescricao] = useState(ini.descricao);
  const [ativa, setAtiva] = useState(ini.ativa);
  const [gatilho, setGatilho] = useState<FlowStep>(ini.gatilho);
  const [condicoes, setCondicoes] = useState<FlowStep[]>(ini.condicoes);
  const [acoes, setAcoes] = useState<FlowStep[]>(ini.acoes);
  const [selId, setSelId] = useState<string | null>(ini.gatilho.id);
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const nomeRef = useRef<HTMLInputElement>(null);

  const steps = useMemo(() => [gatilho, ...condicoes, ...acoes], [gatilho, condicoes, acoes]);
  const foto = (n: string, d: string, at: boolean, st: FlowStep[]) => JSON.stringify({ n, d, at, st });
  const [fotoInicial] = useState(() => foto(ini.nome, ini.descricao, ini.ativa, [ini.gatilho, ...ini.condicoes, ...ini.acoes]));
  const sujo = foto(nome, descricao, ativa, steps) !== fotoInicial;

  // Nomes de pipeline/etapa/sequência/pessoa para os resumos dos cartões
  useEffect(() => { kanbansCitados(steps).forEach(carregarColunas); }, [steps, carregarColunas]);
  useEffect(() => {
    if (acoes.some(s => s.config?.action_type === 'start_sequence')) carregarSequencias();
    if (acoes.some(s => s.config?.action_type === 'assign_responsible')) carregarUsuarios();
  }, [acoes, carregarSequencias, carregarUsuarios]);

  useEffect(() => { if (!ini.nome) nomeRef.current?.focus(); }, [ini.nome]);

  const erros = useMemo(() => validar(nome, gatilho, condicoes, acoes), [nome, gatilho, condicoes, acoes]);
  const errosDe = (id: string) => (tentouSalvar ? erros.filter(e => e.stepId === id).map(e => e.mensagem) : []);
  const errosGerais = tentouSalvar ? erros.filter(e => !e.stepId).map(e => e.mensagem) : [];

  // ── Edição ──
  const atualizar = (id: string, config: Config) => {
    if (id === gatilho.id) { setGatilho(g => ({ ...g, config })); return; }
    setCondicoes(cs => cs.map(s => (s.id === id ? { ...s, config } : s)));
    setAcoes(as => as.map(s => (s.id === id ? { ...s, config } : s)));
  };

  const remover = (id: string) => {
    setCondicoes(cs => cs.filter(s => s.id !== id));
    setAcoes(as => as.filter(s => s.id !== id));
    if (selId === id) setSelId(null);
  };

  const inserirAcao = (pos: number) => {
    const nova: FlowStep = { id: makeid(), type: 'action', config: {} };
    setAcoes(as => [...as.slice(0, pos), nova, ...as.slice(pos)]);
    setSelId(nova.id);
  };

  const moverAcao = (id: string, dir: -1 | 1) => {
    setAcoes(as => {
      const i = as.findIndex(s => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= as.length) return as;
      const n = [...as];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  };

  const adicionarCondicao = () => {
    const nova: FlowStep = { id: makeid(), type: 'condition', config: { rules: [{ field: '', op: 'é', value: '' }] } };
    setCondicoes(cs => [...cs, nova]);
    setSelId(nova.id);
  };

  // ── Topo ──
  const sair = async () => {
    if (sujo && !(await confirmDialog({
      title: 'Sair sem salvar?',
      message: 'As mudanças feitas nesta automação serão perdidas.',
      confirmText: 'Sair sem salvar',
      cancelText: 'Continuar editando',
      danger: true,
    }))) return;
    onCancel();
  };

  const salvar = () => {
    setTentouSalvar(true);
    if (erros.length > 0) {
      const extra = erros.length > 1 ? ` (+${erros.length - 1} ${erros.length - 1 === 1 ? 'ajuste' : 'ajustes'})` : '';
      toast.error(erros[0].mensagem + extra);
      if (erros[0].stepId) setSelId(erros[0].stepId);
      else if (!nome.trim()) nomeRef.current?.focus();
      return;
    }
    onSave({ ...init, name: nome, description: descricao, steps }, ativa);
  };

  const selecionado = steps.find(s => s.id === selId) || null;
  const numeroSel = selecionado?.type === 'action' ? acoes.findIndex(s => s.id === selecionado.id) + 1 : undefined;
  const trig = getTriggerDef(gatilho.config?.event);

  return (
    <div className="flex flex-col h-full bg-dark-bg">
      {/* ── Topo ── */}
      <div className="shrink-0 flex items-center gap-3 px-4 md:px-6 py-3 bg-dark-card border-b border-black/10 dark:border-white/10">
        <button type="button" onClick={sair} title="Voltar para Automações"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft size={17} />
        </button>
        <div className="flex-1 min-w-0">
          <input
            ref={nomeRef}
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Nome da automação"
            className={`w-full max-w-xl bg-transparent text-lg font-bold text-dark-text placeholder:text-slate-400 rounded-lg px-1.5 -mx-1.5 py-0.5 hover:bg-black/[0.03] dark:hover:bg-white/5 focus:bg-black/[0.03] dark:focus:bg-white/5 focus:outline-none ${
              tentouSalvar && !nome.trim() ? 'ring-1 ring-rose-400/70' : ''
            }`}
          />
          <input
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Descrição (opcional)"
            className={`w-full max-w-xl bg-transparent text-xs ${TXT_FRACO} placeholder:text-slate-400 rounded-md px-1.5 -mx-1.5 py-0.5 hover:bg-black/[0.03] dark:hover:bg-white/5 focus:outline-none`}
          />
        </div>
        <Interruptor ligado={ativa} onChange={setAtiva}
          title={ativa ? 'Ao salvar, a automação fica ativa' : 'Ao salvar, a automação fica pausada'} />
        <div className="hidden sm:block w-px h-7 bg-black/10 dark:bg-white/10" />
        <button type="button" onClick={sair} className={`${designSystem.button.secundario} hidden sm:inline-flex`}>Cancelar</button>
        <button type="button" onClick={salvar} disabled={saving} className={designSystem.button.principal}>
          {saving ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Save size={15} />}
          Salvar
        </button>
      </div>

      {/* ── Corpo: fluxo | configurar ── */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-xl mx-auto px-4 py-8">
            {errosGerais.length > 0 && (
              <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] px-4 py-3 space-y-1">
                {errosGerais.map((e, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                    <AlertCircle size={13} className="shrink-0 mt-px" /> {e}
                  </p>
                ))}
              </div>
            )}

            {/* Gatilho */}
            <Rotulo>Quando</Rotulo>
            <CartaoPasso tom="ambar" selecionado={selId === gatilho.id} comErro={errosDe(gatilho.id).length > 0} onClick={() => setSelId(gatilho.id)}>
              <div className="flex items-center gap-3 p-4">
                <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  {trig ? <trig.Icone size={16} /> : <Zap size={16} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Gatilho</p>
                  <p className="text-sm font-semibold text-dark-text">{trig?.label || 'Escolha o gatilho'}</p>
                  <p className={`text-xs ${TXT_FRACO}`}>{trig?.description || 'O evento do CRM que inicia a automação.'}</p>
                  <ErroDoPasso erros={errosDe(gatilho.id)} />
                </div>
              </div>
            </CartaoPasso>

            {/* Condições */}
            <Conector />
            {condicoes.length > 0 ? (
              <>
                <Rotulo>Só continua se</Rotulo>
                <div className="space-y-2">
                  {condicoes.map(c => {
                    const regras: Config[] = c.config?.rules || [];
                    return (
                      <CartaoPasso key={c.id} tom="ceu" selecionado={selId === c.id} comErro={errosDe(c.id).length > 0} onClick={() => setSelId(c.id)}>
                        <div className="flex items-start gap-3 p-4">
                          <span className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                            <ListFilter size={16} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">Condição</p>
                            {regras.length === 0
                              ? <p className={`text-sm ${TXT_FRACO}`}>Sem regras</p>
                              : regras.map((r, i) => (
                                <p key={i} className="text-sm text-dark-text">
                                  {i > 0 && <span className={`text-xs font-semibold mr-1 ${TXT_FRACO}`}>e</span>}
                                  {resumoRegra(r, nomes)}
                                </p>
                              ))}
                            <ErroDoPasso erros={errosDe(c.id)} />
                          </div>
                          <BotaoIcone title="Remover condição" perigo onClick={() => remover(c.id)}><Trash2 size={14} /></BotaoIcone>
                        </div>
                      </CartaoPasso>
                    );
                  })}
                </div>
                <Conector />
              </>
            ) : (
              <>
                <div className="flex justify-center">
                  <button type="button" onClick={adicionarCondicao}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-dashed border-sky-400/50 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-colors">
                    <ListFilter size={13} /> Adicionar condição (opcional)
                  </button>
                </div>
                <Conector />
              </>
            )}

            {/* Ações */}
            <Rotulo>Então</Rotulo>
            {acoes.map((s, i) => {
              const def = getActionDef(s.config?.action_type);
              const Icone = def?.icon || CircleDot;
              const errs = errosDe(s.id);
              return (
                <React.Fragment key={s.id}>
                  {i > 0 && <Conector onInserir={() => inserirAcao(i)} />}
                  <CartaoPasso selecionado={selId === s.id} comErro={errs.length > 0} onClick={() => setSelId(s.id)}>
                    <div className="flex items-start gap-3 p-4">
                      <span className="w-6 h-6 mt-1.5 rounded-full bg-violet-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                        <Icone size={16} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${def ? 'text-dark-text' : 'text-violet-600 dark:text-violet-400'}`}>{def?.label || 'Escolha a ação'}</p>
                        <p className={`text-xs truncate ${TXT_FRACO}`}>{def ? resumoAcao(s.config, nomes) : 'Clique para escolher o que fazer.'}</p>
                        <ErroDoPasso erros={errs} />
                      </div>
                      <div className="flex items-center shrink-0">
                        <BotaoIcone title="Subir" disabled={i === 0} onClick={() => moverAcao(s.id, -1)}><ChevronUp size={15} /></BotaoIcone>
                        <BotaoIcone title="Descer" disabled={i === acoes.length - 1} onClick={() => moverAcao(s.id, 1)}><ChevronDown size={15} /></BotaoIcone>
                        <BotaoIcone title="Excluir ação" perigo onClick={() => remover(s.id)}><Trash2 size={14} /></BotaoIcone>
                      </div>
                    </div>
                  </CartaoPasso>
                </React.Fragment>
              );
            })}
            {acoes.length > 0 && <Conector />}
            <button type="button" onClick={() => inserirAcao(acoes.length)}
              className={`w-full h-11 rounded-2xl border border-dashed text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                tentouSalvar && acoes.length === 0
                  ? 'border-rose-400/70 text-rose-600 dark:text-rose-400'
                  : 'border-violet-400/50 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10'
              }`}>
              <Plus size={15} /> Adicionar ação
            </button>
            <p className={`text-center text-xs mt-4 ${TXT_FRACO}`}>Fim do fluxo</p>
          </div>
        </div>

        {/* Configurar */}
        <aside className="lg:w-[400px] shrink-0 border-t lg:border-t-0 lg:border-l border-black/10 dark:border-white/10 bg-dark-card overflow-y-auto">
          <div className="px-5 pt-4 pb-1">
            <p className="text-sm font-bold text-dark-text">Configurar</p>
          </div>
          <PainelConfigurar
            key={selecionado?.id || 'nenhum'}
            passo={selecionado}
            numeroAcao={numeroSel}
            erros={selecionado ? errosDe(selecionado.id) : []}
            onChange={atualizar}
            onRemover={remover}
          />
        </aside>
      </div>
    </div>
  );
}

export default Construtor;
