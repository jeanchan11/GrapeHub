import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, closestCorners, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, Plus, Calendar, Film, Images, Image as ImageIcon, CircleDot, X, Loader2, CheckCircle2, ListChecks } from 'lucide-react';
import OptionPicker from './ui/OptionPicker';
import { toast } from '../lib/toast';

/**
 * Peças da página de postagens do Instagram (template `lista`, página "Postagens IG").
 * Remodelada em 09/10/2026: calendário na visão geral e quadro (colunas por etapa) no lugar
 * da lista agrupada.
 *
 * A postagem é uma linha de `onboarding_tasks` (type `lista-<page_id>`). Campos usados:
 *   client_name → título · status_group → etapa · due_date → dia de publicar
 *   produto     → PERFIL (Jean | Grape) — os dois perfis de Instagram da Grape (cofre D-020)
 *   entregavel  → FORMATO (Reels | Carrossel | Foto | Story)
 * Reaproveitar colunas evita migração; a tabela já é genérica (Visual Hub usa `entregavel` também).
 */

export interface Postagem {
  id: number; client_name: string; status_group: string; due_date?: string | null;
  produto?: string | null; entregavel?: string | null; tags?: string[]; subtask_count?: number;
  description?: string; created_at?: string;
}
export interface Etapa { id: string; label: string; color: string; emoji: string; order_index: number }

export const PERFIS = [
  { id: 'Jean', cor: '#8b5cf6' },
  { id: 'Grape', cor: '#10b981' },
];
export const FORMATOS = [
  { id: 'Reels', Icone: Film },
  { id: 'Carrossel', Icone: Images },
  { id: 'Foto', Icone: ImageIcon },
  { id: 'Story', Icone: CircleDot },
];
const corPerfil = (p?: string | null) => PERFIS.find(x => x.id === p)?.cor || '#94a3b8';
const IconeFormato = (f?: string | null) => FORMATOS.find(x => x.id === f)?.Icone || null;

export const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const diaDe = (p: Postagem) => (p.due_date ? String(p.due_date).split('T')[0] : null);
const fmtDia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
// Etapa final = "concluído/postado" (mesma regra antiga da página)
export const eFinal = (e?: Etapa) => !!e && /conclu|postado/i.test(`${e.id} ${e.label}`);
// Rótulo da etapa sem o emoji que vem colado no nome ("APROVAÇÃO DAS ARTES ✅")
export const nomeEtapa = (e?: Etapa) => (e?.label || '').replace(/[\u{1F300}-\u{1FAFF}☀-➿️]/gu, '').trim();

// ── Pílulas ───────────────────────────────────────────────────────────────────
export const PilulaPerfil: React.FC<{ perfil?: string | null }> = ({ perfil }) => perfil ? (
  <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold" style={{ background: `${corPerfil(perfil)}22`, color: corPerfil(perfil) }}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: corPerfil(perfil) }} />{perfil}
  </span>
) : null;

export const PilulaFormato: React.FC<{ formato?: string | null }> = ({ formato }) => {
  const I = IconeFormato(formato);
  return formato ? (
    <span className="inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-300">
      {I && <I size={10} />}{formato}
    </span>
  ) : null;
};

// ── Cartão do quadro ──────────────────────────────────────────────────────────
const Cartao: React.FC<{ p: Postagem; final: boolean; onAbrir: () => void; onCampo: (campo: 'produto' | 'entregavel', v: string | null) => void; arrastando?: boolean }> = ({ p, final, onAbrir, onCampo, arrastando }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `post-${p.id}` });
  const dia = diaDe(p);
  const hoje = hojeISO();
  const atrasada = !!dia && !final && dia < hoje;
  const ehHoje = !!dia && !final && dia === hoje;
  const parar = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div
      ref={setNodeRef} {...attributes} {...listeners}
      onClick={onAbrir}
      className={`group rounded-xl border p-3 cursor-grab active:cursor-grabbing transition-all ${
        isDragging && !arrastando ? 'opacity-30' : ''
      } ${arrastando ? 'shadow-2xl rotate-1 border-violet-500/50 bg-white dark:bg-dark-card' : 'bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/10 hover:border-violet-500/40'}`}
    >
      <div className="flex items-center gap-1 mb-2 flex-wrap" onClick={parar} onPointerDown={parar}>
        <OptionPicker value={p.produto || null} options={PERFIS.map(x => ({ label: x.id, color: x.cor }))} placeholder="Perfil" emptyLabel="Sem perfil" variant="tag"
          onChange={(v) => onCampo('produto', v)} />
        <OptionPicker value={p.entregavel || null} options={FORMATOS.map(x => ({ label: x.id, color: '#94a3b8' }))} placeholder="Formato" emptyLabel="Sem formato" variant="tag"
          onChange={(v) => onCampo('entregavel', v)} />
      </div>
      <p className={`text-sm font-semibold leading-snug ${final ? 'text-slate-500 line-through decoration-slate-400/60' : 'text-slate-800 dark:text-slate-100'}`}>{p.client_name}</p>
      <div className="flex items-center gap-2 mt-2 text-[11px]">
        {dia ? (
          <span className={`inline-flex items-center gap-1 font-semibold ${atrasada ? 'text-rose-500' : ehHoje ? 'text-emerald-500' : 'text-slate-500'}`}>
            <Calendar size={11} /> {ehHoje ? 'Hoje' : fmtDia(dia)}{atrasada ? ' · atrasada' : ''}
          </span>
        ) : <span className="text-slate-400">sem data</span>}
        {!!p.subtask_count && <span className="inline-flex items-center gap-1 text-slate-400"><ListChecks size={11} /> {p.subtask_count}</span>}
        {final && <CheckCircle2 size={12} className="text-emerald-500 ml-auto" />}
      </div>
    </div>
  );
};

const Coluna: React.FC<{ etapa: Etapa; total: number; children: React.ReactNode; onNova: () => void; rodape?: React.ReactNode }> = ({ etapa, total, children, onNova, rodape }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${etapa.id}` });
  return (
    <div ref={setNodeRef} className={`w-[272px] shrink-0 flex flex-col rounded-2xl border transition-colors ${isOver ? 'border-violet-500/50 bg-violet-500/[0.04]' : 'border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-white/[0.02]'}`}>
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: etapa.color }} />
        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider truncate">{nomeEtapa(etapa)}</p>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-200/70 dark:bg-white/10 rounded-full px-1.5">{total}</span>
        <button onClick={onNova} className="ml-auto w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-violet-500 hover:bg-violet-500/10" title="Nova postagem nesta etapa"><Plus size={14} /></button>
      </div>
      <div className="flex-1 px-2 pb-2 space-y-2 min-h-[120px]">{children}</div>
      {rodape}
    </div>
  );
};

// ── Quadro ────────────────────────────────────────────────────────────────────
export const QuadroPostagens: React.FC<{
  postagens: Postagem[]; etapas: Etapa[];
  mostrarPostadas: boolean;
  onAbrir: (p: Postagem) => void;
  onMover: (id: number, etapa: string) => void;
  onCampo: (id: number, campo: 'produto' | 'entregavel', v: string | null) => void;
  onNova: (etapa: string) => void;
}> = ({ postagens, etapas, mostrarPostadas, onAbrir, onMover, onCampo, onNova }) => {
  const [arrastando, setArrastando] = useState<Postagem | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  // dentro da coluna: por data (sem data por último); a coluna final, da mais recente para trás
  const ordenar = (lista: Postagem[], final: boolean) => [...lista].sort((a, b) => {
    const da = diaDe(a), db = diaDe(b);
    if (!da && !db) return b.id - a.id;
    if (!da) return 1; if (!db) return -1;
    return final ? db.localeCompare(da) : da.localeCompare(db);
  });

  const fim = ({ active, over }: DragEndEvent) => {
    setArrastando(null);
    if (!over) return;
    const id = Number(String(active.id).replace('post-', ''));
    const etapa = String(over.id).replace('col-', '');
    const p = postagens.find(x => x.id === id);
    if (p && p.status_group !== etapa) onMover(id, etapa);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners}
      onDragStart={({ active }: DragStartEvent) => setArrastando(postagens.find(x => `post-${x.id}` === active.id) || null)}
      onDragEnd={fim} onDragCancel={() => setArrastando(null)}>
      <div className="flex gap-3 overflow-x-auto pb-4 items-start">
        {etapas.map(et => {
          const final = eFinal(et);
          const todas = ordenar(postagens.filter(p => p.status_group === et.id), final);
          const visiveis = final && !mostrarPostadas ? todas.slice(0, 5) : todas;
          return (
            <Coluna key={et.id} etapa={et} total={todas.length} onNova={() => onNova(et.id)}
              rodape={todas.length > visiveis.length ? <p className="px-3 pb-3 text-[11px] text-slate-400">+{todas.length - visiveis.length} postadas — use "Mostrar todas as postadas"</p> : undefined}>
              {visiveis.length === 0 && <p className="text-[11px] text-slate-400 text-center py-6">Arraste uma postagem para cá</p>}
              {visiveis.map(p => (
                <Cartao key={p.id} p={p} final={final} onAbrir={() => onAbrir(p)} onCampo={(c, v) => onCampo(p.id, c, v)} />
              ))}
            </Coluna>
          );
        })}
      </div>
      {createPortal(
        <DragOverlay dropAnimation={null}>
          {arrastando && <div className="w-[256px]"><Cartao p={arrastando} final={false} onAbrir={() => {}} onCampo={() => {}} arrastando /></div>}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
};

// ── Calendário do mês ─────────────────────────────────────────────────────────
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const CalendarioPostagens: React.FC<{
  postagens: Postagem[]; etapas: Etapa[];
  onAbrir: (p: Postagem) => void; onNovaNoDia: (iso: string) => void;
}> = ({ postagens, etapas, onAbrir, onNovaNoDia }) => {
  const hoje = hojeISO();
  const [mes, setMes] = useState(() => ({ y: Number(hoje.slice(0, 4)), m: Number(hoje.slice(5, 7)) - 1 }));
  const finais = new Set(etapas.filter(eFinal).map(e => e.id));

  const celulas = useMemo(() => {
    const primeiro = new Date(mes.y, mes.m, 1);
    const inicio = new Date(primeiro); inicio.setDate(1 - primeiro.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio); d.setDate(inicio.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { iso, dia: d.getDate(), doMes: d.getMonth() === mes.m };
    });
  }, [mes]);
  // corta a última semana se ela for toda do mês seguinte
  const linhas = celulas.slice(35).every(c => !c.doMes) ? celulas.slice(0, 35) : celulas;
  const porDia = useMemo(() => {
    const m = new Map<string, Postagem[]>();
    for (const p of postagens) { const d = diaDe(p); if (d) m.set(d, [...(m.get(d) || []), p]); }
    return m;
  }, [postagens]);
  const doMesTotal = postagens.filter(p => diaDe(p)?.startsWith(`${mes.y}-${String(mes.m + 1).padStart(2, '0')}`)).length;
  const navegar = (delta: number) => setMes(({ y, m }) => { const n = new Date(y, m + delta, 1); return { y: n.getFullYear(), m: n.getMonth() }; });

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/[0.02] p-5">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{MESES[mes.m]} <span className="text-slate-400 font-medium">{mes.y}</span></h3>
        <span className="text-[11px] text-slate-500">{doMesTotal} {doMesTotal === 1 ? 'postagem' : 'postagens'}</span>
        <div className="flex items-center gap-2 ml-auto">
          {PERFIS.map(p => (
            <span key={p.id} className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500"><span className="w-2 h-2 rounded-full" style={{ background: p.cor }} />{p.id}</span>
          ))}
          <button onClick={() => setMes({ y: Number(hoje.slice(0, 4)), m: Number(hoje.slice(5, 7)) - 1 })} className="h-8 px-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">Hoje</button>
          <button onClick={() => navegar(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"><ChevronLeft size={16} /></button>
          <button onClick={() => navegar(1)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden bg-slate-200 dark:bg-white/5 border border-slate-200 dark:border-white/5">
        {DIAS_SEMANA.map(d => <div key={d} className="bg-slate-50 dark:bg-dark-card px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{d}</div>)}
        {linhas.map(c => {
          const posts = porDia.get(c.iso) || [];
          const ehHoje = c.iso === hoje;
          return (
            <div key={c.iso} className={`group relative min-h-[96px] p-1.5 ${c.doMes ? 'bg-white dark:bg-dark-card' : 'bg-slate-50/70 dark:bg-dark-card/60'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center ${ehHoje ? 'bg-violet-600 text-white' : c.doMes ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'}`}>{c.dia}</span>
                <button onClick={() => onNovaNoDia(c.iso)} title="Agendar postagem neste dia"
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-violet-500 hover:bg-violet-500/10"><Plus size={12} /></button>
              </div>
              <div className="space-y-1">
                {posts.slice(0, 3).map(p => {
                  const final = finais.has(p.status_group);
                  const atrasada = !final && c.iso < hoje;
                  const I = IconeFormato(p.entregavel);
                  const cor = corPerfil(p.produto);
                  return (
                    <button key={p.id} onClick={() => onAbrir(p)} title={`${p.client_name}${p.produto ? ` · ${p.produto}` : ''}${p.entregavel ? ` · ${p.entregavel}` : ''}`}
                      className={`w-full flex items-center gap-1 px-1.5 py-0.5 rounded-md text-left text-[10px] font-semibold truncate transition-opacity hover:opacity-80 ${atrasada ? 'ring-1 ring-rose-500/60' : ''}`}
                      style={{ background: `${cor}1f`, color: cor }}>
                      {final ? <CheckCircle2 size={10} className="shrink-0" /> : I ? <I size={10} className="shrink-0" /> : null}
                      <span className={`truncate ${final ? 'line-through opacity-70' : ''}`}>{p.client_name}</span>
                    </button>
                  );
                })}
                {posts.length > 3 && <p className="text-[10px] text-slate-400 px-1">+{posts.length - 3}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Nova postagem ─────────────────────────────────────────────────────────────
export const NovaPostagemModal: React.FC<{
  pageId: string; etapas: Etapa[]; etapaInicial?: string; diaInicial?: string;
  onFechar: () => void; onCriada: () => void;
}> = ({ pageId, etapas, etapaInicial, diaInicial, onFechar, onCriada }) => {
  const primeira = etapas.find(e => !eFinal(e))?.id || etapas[0]?.id || '';
  const [titulo, setTitulo] = useState('');
  const [perfil, setPerfil] = useState<string | null>(null);
  const [formato, setFormato] = useState<string | null>(null);
  const [dia, setDia] = useState(diaInicial || '');
  const [etapa, setEtapa] = useState(etapaInicial || primeira);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!titulo.trim()) return toast.error('Dê um título para a postagem.');
    setSalvando(true);
    try {
      const r = await fetch('/api/onboarding-tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: titulo.trim(), status_group: etapa, type: `lista-${pageId}`, due_date: dia || null, produto: perfil, entregavel: formato }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      onCriada(); onFechar();
    } catch (e: any) {
      toast.error(`Não foi possível criar: ${e.message}`);
    } finally { setSalvando(false); }
  };

  const rotulo = 'block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5';
  const Escolha = ({ valor, opcoes, onChange, cores }: { valor: string | null; opcoes: string[]; onChange: (v: string | null) => void; cores?: Record<string, string> }) => (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map(o => {
        const ativo = valor === o; const cor = cores?.[o] || '#8b5cf6';
        return (
          <button key={o} type="button" onClick={() => onChange(ativo ? null : o)}
            className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${ativo ? '' : 'border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
            style={ativo ? { background: `${cor}1f`, color: cor, borderColor: `${cor}66` } : undefined}>{o}</button>
        );
      })}
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-[480px] bg-white dark:bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Nova postagem</h3>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={rotulo}>Título / ideia</label>
            <input autoFocus value={titulo} onChange={e => setTitulo(e.target.value)} onKeyDown={e => e.key === 'Enter' && salvar()}
              placeholder="Ex.: Meme STF — IA que fecha contrato" className="w-full px-3 py-2 rounded-lg text-sm modal-input focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>
          <div><label className={rotulo}>Perfil</label><Escolha valor={perfil} opcoes={PERFIS.map(p => p.id)} onChange={setPerfil} cores={Object.fromEntries(PERFIS.map(p => [p.id, p.cor]))} /></div>
          <div><label className={rotulo}>Formato</label><Escolha valor={formato} opcoes={FORMATOS.map(f => f.id)} onChange={setFormato} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={rotulo}>Publicar em</label>
              <input type="date" value={dia} onChange={e => setDia(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm modal-input focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
            <div>
              <label className={rotulo}>Etapa</label>
              <OptionPicker value={nomeEtapa(etapas.find(e => e.id === etapa)) || null}
                options={etapas.map(e => ({ label: nomeEtapa(e), color: e.color }))}
                onChange={(v) => setEtapa(etapas.find(e => nomeEtapa(e) === v)?.id || etapa)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-black/5 dark:border-white/5">
          <button onClick={onFechar} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 flex items-center gap-2">
            {salvando && <Loader2 size={13} className="animate-spin" />} Criar postagem
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
