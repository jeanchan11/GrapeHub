import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap, Plus, Trash2, Pencil, Search, ArrowRight, History, LayoutGrid, Activity, Clock,
} from 'lucide-react';
import SplitHeadline from '../components/SplitHeadline';
import { CarregandoBloco } from '../components/LoadingSpinner';
import { EstadoVazio } from '../components/ui/EstadoVazio';
import { Abas } from '../components/ui/Abas';
import { designSystem } from '../design-system';
import { toast } from '@/src/lib/toast';
import { confirmDialog } from '@/src/lib/confirm';
import {
  TEMPLATES, dividirPassos, getTriggerDef, haQuanto, makeid, resumoCondicoes, rotuloAcao,
  type Automation, type AutomationTemplate, type StepType,
} from '../components/automacoes/catalogo';
import { DadosCrmProvider, kanbansCitados, useDadosCrm } from '../components/automacoes/dados';
import { Construtor } from '../components/automacoes/Construtor';
import { Historico } from '../components/automacoes/Historico';
import { INPUT, Interruptor, TXT_FRACO } from '../components/automacoes/ui';

// Redesenho de 18/11/2026. Chamadas de API iguais às de antes (método, URL e corpo):
//   GET  /api/automations · POST /api/automations · PUT /api/automations/:id
//   DELETE /api/automations/:id · PATCH /api/automations/:id/toggle
//   GET  /api/automations/logs?limit=100
// Catálogo, construtor, painel e histórico ficam em src/components/automacoes/.

type ViewMode = 'list' | 'builder';
type TabMode = 'minhas' | 'modelos' | 'historico';
type FiltroStatus = 'todas' | 'ativas' | 'pausadas';

// ─── Linha da lista ──────────────────────────────────────────────────────────

function AutomacaoLinha({ a, alternando, onEdit, onDelete, onToggle }: {
  a: Automation; alternando: boolean; onEdit: () => void; onDelete: () => void; onToggle: () => void;
}) {
  const { nomes } = useDadosCrm();
  const { gatilho, condicoes, acoes } = dividirPassos(a.steps);
  const trig = getTriggerDef(gatilho?.config?.event);
  const cond = resumoCondicoes(condicoes, nomes);
  const rotulos = acoes.map(s => rotuloAcao(s.config?.action_type));

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEdit}
      onKeyDown={e => { if (e.key === 'Enter') onEdit(); }}
      className="group bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl px-4 py-4 sm:px-5 flex items-center gap-4 cursor-pointer hover:border-violet-500/40 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
    >
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        a.active ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400' : 'bg-black/[0.04] dark:bg-white/5 text-slate-400'
      }`}>
        <Zap size={17} />
      </span>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${a.active ? 'text-dark-text' : 'text-slate-500 dark:text-slate-400'}`}>{a.name}</p>
        <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 mt-0.5">
          <span className={TXT_FRACO}>Quando </span>
          <span className="font-semibold text-amber-600 dark:text-amber-400">{trig?.label || 'gatilho não definido'}</span>
          {cond && <span className={TXT_FRACO}> ({cond})</span>}
          <ArrowRight size={13} className="inline mx-1.5 -mt-0.5 text-slate-400" />
          {rotulos.length > 0 ? (
            <>
              <span className="font-medium text-dark-text">{rotulos.slice(0, 2).join(', ')}</span>
              {rotulos.length > 2 && <span className={TXT_FRACO}> (+{rotulos.length - 2})</span>}
            </>
          ) : <span className={`italic ${TXT_FRACO}`}>nenhuma ação</span>}
        </p>
        <div className={`flex items-center gap-x-4 gap-y-1 flex-wrap mt-1.5 text-xs ${TXT_FRACO}`}>
          <span className="inline-flex items-center gap-1">
            <Activity size={12} /> <span className="numero">{a.runs.toLocaleString('pt-BR')}</span> {a.runs === 1 ? 'execução' : 'execuções'}
          </span>
          <span className="inline-flex items-center gap-1" title={a.lastRun ? `Última execução: ${a.lastRun}` : undefined}>
            <Clock size={12} /> {a.lastRunAt ? `última ${haQuanto(a.lastRunAt)}` : 'nunca executou'}
          </span>
          {a.description && <span className="truncate max-w-[360px]" title={a.description}>{a.description}</span>}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Interruptor ligado={a.active} onChange={onToggle} disabled={alternando}
          title={a.active ? 'Pausar automação' : 'Ativar automação'} />
        <button type="button" title="Editar" onClick={e => { e.stopPropagation(); onEdit(); }}
          className="w-8 h-8 ml-1 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/10 transition-colors">
          <Pencil size={14} />
        </button>
        <button type="button" title="Excluir" onClick={e => { e.stopPropagation(); onDelete(); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Cartão de modelo ────────────────────────────────────────────────────────

function CartaoModelo({ tpl, onUse }: { tpl: AutomationTemplate; onUse: (tpl: AutomationTemplate) => void }) {
  const { gatilho, acoes } = dividirPassos(tpl.steps);
  const trig = getTriggerDef(gatilho?.config?.event);
  const Icone = trig?.Icone || Zap;
  return (
    <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-5 flex flex-col hover:border-violet-500/40 transition-colors">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          <Icone size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-dark-text leading-tight">{tpl.name}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Quando: {tpl.trigger}</p>
        </div>
      </div>
      <p className={`text-xs leading-relaxed mt-3 flex-1 ${TXT_FRACO}`}>{tpl.description}</p>
      {acoes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {acoes.map(s => (
            <span key={s.id} className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 text-[11px] font-semibold">
              <ArrowRight size={11} /> {rotuloAcao(s.config?.action_type)}
            </span>
          ))}
        </div>
      )}
      <button type="button" onClick={() => onUse(tpl)} className={`${designSystem.button.secundario} mt-4 w-full`}>
        Usar modelo <ArrowRight size={14} />
      </button>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

const AutomacoesPagina: React.FC = () => {
  const { carregarColunas } = useDadosCrm();
  const [view, setView] = useState<ViewMode>('list');
  const [tab, setTab] = useState<TabMode>('minhas');
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [editingAutomation, setEditingAutomation] = useState<Partial<Automation> | null>(null);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todas');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alternando, setAlternando] = useState<Set<string>>(new Set());

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
          lastRunAt: a.last_run_at || undefined,
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
  // Antes o histórico só carregava ao abrir a aba; agora também na entrada, para o contador da aba.
  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { if (tab === 'historico') loadLogs(); }, [tab, loadLogs]);

  // Nomes das etapas citadas nas condições (para "Pipeline › Etapa" nas frases da lista)
  useEffect(() => {
    kanbansCitados(automations.flatMap(a => a.steps)).forEach(id => carregarColunas(id));
  }, [automations, carregarColunas]);

  const activeCount = automations.filter(a => a.active).length;
  const totalRuns = automations.reduce((s, a) => s + a.runs, 0);
  const errosNoHistorico = logs.some(l => l.status !== 'success');

  const openBuilder = (base?: Partial<Automation>) => {
    setEditingAutomation(base || {});
    setView('builder');
  };

  /** `ativa` = posição do interruptor no construtor; aplicada pelo mesmo PATCH /toggle da lista. */
  const handleSave = async (a: Partial<Automation>, ativa: boolean) => {
    if (!a.name?.trim()) { toast.error('Dê um nome à automação.'); return; }
    setSaving(true);
    try {
      const payload = { name: a.name, description: a.description || '', steps: a.steps || [] };
      const isEdit = !!a.id;
      const res = await fetch(
        isEdit ? `/api/automations/${a.id}` : '/api/automations',
        { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      if (!res.ok) throw new Error('Falha ao salvar');
      const salva = await res.json().catch(() => null);
      const id = salva?.id != null ? String(salva.id) : a.id;
      const ativaAgora: boolean = typeof salva?.active === 'boolean' ? salva.active : (a.active ?? true);
      if (id && ativaAgora !== ativa) {
        const t = await fetch(`/api/automations/${id}/toggle`, { method: 'PATCH' }).catch(() => null);
        if (!t?.ok) toast.error('Automação salva, mas não deu para mudar Ativa/Pausada. Use o interruptor da lista.');
      }
      await loadAutomations();
      setView('list');
      setTab('minhas');
      toast.success(isEdit ? 'Automação salva.' : 'Automação criada.');
    } catch (e) {
      toast.error('Erro ao salvar automação. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Automation) => {
    if (!(await confirmDialog({
      title: 'Excluir automação?',
      message: `“${a.name}” deixa de rodar e o histórico de execuções dela também é apagado.`,
      confirmText: 'Excluir',
      danger: true,
    }))) return;
    try {
      const res = await fetch(`/api/automations/${a.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setAutomations(prev => prev.filter(x => x.id !== a.id));
      toast.success('Automação excluída.');
    } catch {
      toast.error('Não deu para excluir. Tente novamente.');
    }
  };

  const handleToggle = async (id: string) => {
    setAlternando(s => new Set(s).add(id));
    try {
      const res = await fetch(`/api/automations/${id}/toggle`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: updated.active } : a));
    } catch {
      toast.error('Não deu para mudar Ativa/Pausada. Tente novamente.');
    } finally {
      setAlternando(s => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  const handleUseTemplate = (tpl: AutomationTemplate) => {
    openBuilder({
      name: tpl.name,
      description: tpl.description,
      steps: tpl.steps.map(s => ({ ...s, id: makeid(), config: JSON.parse(JSON.stringify(s.config)) })),
    });
  };

  const filteredAutomations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return automations.filter(a =>
      (!q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)) &&
      (filtroStatus === 'todas' || (filtroStatus === 'ativas' ? a.active : !a.active)),
    );
  }, [automations, search, filtroStatus]);

  // ── Builder view ──
  if (view === 'builder' && editingAutomation !== null) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <Construtor
          automation={editingAutomation}
          onSave={handleSave}
          onCancel={() => setView('list')}
          saving={saving}
        />
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap px-6 md:px-8 pt-8 pb-4">
        <div>
          <SplitHeadline text="Auto" highlight="mações" />
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
            CRM Comercial · ações automáticas a partir de eventos do funil
          </p>
          <p className={`text-xs mt-2 ${TXT_FRACO}`}>
            {loading ? 'Carregando…' : (
              <>
                <span className="numero text-dark-text">{automations.length}</span> {automations.length === 1 ? 'automação' : 'automações'}
                <span className="mx-1.5">·</span>
                <span className="numero text-emerald-600 dark:text-emerald-400">{activeCount}</span> {activeCount === 1 ? 'ativa' : 'ativas'}
                <span className="mx-1.5">·</span>
                <span className="numero text-dark-text">{totalRuns.toLocaleString('pt-BR')}</span> execuções no total
              </>
            )}
          </p>
        </div>
        <button onClick={() => openBuilder()} className={designSystem.button.principal}>
          <Plus size={16} /> Nova automação
        </button>
      </div>

      {/* Tabs */}
      <Abas<TabMode>
        className="px-6 md:px-8 mb-6"
        abas={[
          { id: 'minhas', rotulo: 'Minhas automações', Icone: Zap, contador: loading ? undefined : automations.length },
          { id: 'modelos', rotulo: 'Modelos', Icone: LayoutGrid },
          { id: 'historico', rotulo: 'Histórico', Icone: History, contador: logs.length, alerta: errosNoHistorico, dica: 'Últimas 100 execuções' },
        ]}
        ativa={tab}
        onChange={setTab}
      />

      <div className="px-6 md:px-8 pb-10">
        <AnimatePresence mode="wait">
          {tab === 'minhas' && (
            <motion.div key="minhas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loading ? (
                <CarregandoBloco />
              ) : automations.length === 0 ? (
                <EstadoVazio
                  Icone={Zap}
                  titulo="Nenhuma automação criada ainda"
                  descricao="Comece do zero ou a partir de um modelo pronto."
                  acao={
                    <div className="flex items-center gap-2">
                      <button onClick={() => openBuilder()} className={designSystem.button.principal}>
                        <Plus size={15} /> Criar automação
                      </button>
                      <button onClick={() => setTab('modelos')} className={designSystem.button.secundario}>
                        <LayoutGrid size={15} /> Ver modelos
                      </button>
                    </div>
                  }
                />
              ) : (
                <>
                  <div className="flex items-center gap-3 flex-wrap mb-4">
                    <div className="relative flex-1 min-w-[220px] max-w-sm">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" placeholder="Buscar automação…" value={search} onChange={e => setSearch(e.target.value)}
                        className={`${INPUT} pl-9`} />
                    </div>
                    <Abas<FiltroStatus>
                      variante="segmentado"
                      abas={[
                        { id: 'todas', rotulo: 'Todas' },
                        { id: 'ativas', rotulo: 'Ativas', contador: activeCount },
                        { id: 'pausadas', rotulo: 'Pausadas', contador: automations.length - activeCount },
                      ]}
                      ativa={filtroStatus}
                      onChange={setFiltroStatus}
                    />
                  </div>
                  {filteredAutomations.length === 0 ? (
                    <EstadoVazio
                      Icone={Search}
                      titulo="Nenhuma automação encontrada"
                      descricao={search ? `Nada com “${search}” neste filtro.` : 'Nada neste filtro.'}
                    />
                  ) : (
                    <div className="space-y-2.5">
                      {filteredAutomations.map(a => (
                        <AutomacaoLinha key={a.id} a={a}
                          alternando={alternando.has(a.id)}
                          onEdit={() => openBuilder(a)}
                          onDelete={() => handleDelete(a)}
                          onToggle={() => handleToggle(a.id)} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {tab === 'modelos' && (
            <motion.div key="modelos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className={`text-sm mb-4 ${TXT_FRACO}`}>
                O modelo abre no construtor já montado. Falta só escolher pipeline, etapa ou pessoa, quando ele pedir.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {TEMPLATES.map(tpl => (
                  <CartaoModelo key={tpl.id} tpl={tpl} onUse={handleUseTemplate} />
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'historico' && (
            <motion.div key="historico" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Historico logs={logs} carregando={logsLoading} onAtualizar={loadLogs} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Automacoes: React.FC = () => (
  <DadosCrmProvider>
    <AutomacoesPagina />
  </DadosCrmProvider>
);

export default Automacoes;
