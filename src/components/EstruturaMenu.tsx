import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, MeasuringStrategy,
  type DragStartEvent, type DragMoveEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronRight, Plus, Pencil, Trash2, FileText, Search, X, Loader2, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { confirmDialog } from '../lib/confirm';
import { toast } from '../lib/toast';
import OptionPicker from './ui/OptionPicker';
import { filhosEmOrdem } from '../lib/menuOrdem';

/**
 * Aba "Estrutura" do Gerenciador de Páginas (reescrita em 09/10/2026).
 *
 * O menu é uma árvore de 4 tipos — seção › pasta (subsession) › subpasta (subsubsession) ›
 * página — guardada em 4 tabelas, cada uma com `order_index` próprio. Aqui ela vira UMA lista
 * achatada (cada linha com `depth`), e o arraste segue o padrão "sortable tree" do dnd-kit:
 *  • para cima/baixo muda a ordem;
 *  • o deslocamento horizontal decide o nível (direita = entra na pasta de cima, esquerda = sai);
 *  • a linha fantasma mostra onde vai cair; destino que a hierarquia não aceita fica vermelho e
 *    o soltar não faz nada.
 * Regras de encaixe: seção só na raiz; pasta dentro de seção; subpasta dentro de seção ou
 * pasta; página dentro de qualquer um dos três. Pasta SEM subpastas também pode ir para dentro
 * de outra pasta: ela vira subpasta (o banco não tem 3º nível de pasta) — ver
 * `src/routes/menu-pasta-em-pasta.ts`.
 *
 * Ordem: dentro de cada seção/pasta, páginas, subpastas e pastas formam UMA sequência
 * (`order_index` misto, ver src/lib/menuOrdem.ts) — dá para pôr uma subpasta acima de uma
 * página. Ao soltar, a posição é regravada para todos os filhos do destino, de todos os tipos.
 *
 * Antes disso eram SortableContexts aninhados, um por lista, com mover entre listas feito no
 * onDragOver — perdia o alvo com frequência, e seção/pasta não mudava de pai arrastando.
 */

type Tipo = 'section' | 'subsession' | 'subsubsession' | 'page';
interface No {
  key: string; id: string; tipo: Tipo; depth: number; parentKey: string | null;
  label: string; icon?: string; icon_color?: string; template?: string; raw: any;
  paginas: number; pastas: number;
}

const INDENT = 28;
const chave = (tipo: Tipo, id: string) => `${tipo}:${id}`;
const separar = (k: string): { tipo: Tipo; id: string } => {
  const i = k.indexOf(':'); return { tipo: k.slice(0, i) as Tipo, id: k.slice(i + 1) };
};
const CONTEINER: Record<Tipo, boolean> = { section: true, subsession: true, subsubsession: true, page: false };
const ACEITA: Record<Tipo, Tipo[]> = {
  section: ['page', 'subsubsession', 'subsession'], subsession: ['page', 'subsubsession'], subsubsession: ['page'], page: [],
};
const NOME: Record<Tipo, string> = { section: 'seção', subsession: 'pasta', subsubsession: 'subpasta', page: 'página' };
const TABELA: Record<Tipo, string> = { section: 'sections', subsession: 'subsessions', subsubsession: 'subsubsessions', page: 'pages' };
const CAMPO: Record<Tipo, string> = { section: '', subsession: 'subSessions', subsubsession: 'subSubSessions', page: 'pages' };

function contar(raw: any, tipo: Tipo): { paginas: number; pastas: number } {
  if (tipo === 'page') return { paginas: 0, pastas: 0 };
  let paginas = (raw.pages || []).length, pastas = 0;
  for (const ss of raw.subSubSessions || []) { pastas++; paginas += (ss.pages || []).length; }
  for (const sub of raw.subSessions || []) { const c = contar(sub, 'subsession'); pastas += 1 + c.pastas; paginas += c.paginas; }
  return { paginas, pastas };
}

function achatar(menu: any[], recolhidos: Set<string>): No[] {
  const out: No[] = [];
  const add = (tipo: Tipo, raw: any, depth: number, parentKey: string | null) => {
    const no: No = {
      key: chave(tipo, raw.id), id: raw.id, tipo, depth, parentKey,
      label: tipo === 'section' ? raw.title : raw.label, icon: raw.icon, icon_color: raw.icon_color,
      template: raw.template, raw, ...contar(raw, tipo),
    };
    out.push(no); return no;
  };
  const filhos = (c: any, depth: number, pk: string) => {
    for (const { tipo, item } of filhosEmOrdem(c)) {
      const n = add(tipo, item, depth, pk);
      if (tipo !== 'page' && !recolhidos.has(n.key)) filhos(item, depth + 1, n.key);
    }
  };
  for (const s of menu || []) {
    const sn = add('section', s, 0, null);
    if (!recolhidos.has(sn.key)) filhos(s, 1, sn.key);
  }
  return out;
}

// Tira da lista os descendentes de quem está sendo arrastado (eles vão junto)
function semDescendentes(itens: No[], key: string): No[] {
  const i = itens.findIndex(n => n.key === key);
  if (i < 0) return itens;
  const d = itens[i].depth;
  let j = i + 1;
  while (j < itens.length && itens[j].depth > d) j++;
  return [...itens.slice(0, i + 1), ...itens.slice(j)];
}

function acharPai(lista: No[], idx: number, depth: number): No | null | undefined {
  if (depth === 0) return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (lista[i].depth === depth - 1) return lista[i];
    if (lista[i].depth < depth - 1) return undefined;
  }
  return undefined;
}
// Pasta sem subpastas pode entrar em outra pasta (vira subpasta)
const viraSubpasta = (ativo: No, pai: No | null) =>
  ativo.tipo === 'subsession' && pai?.tipo === 'subsession' && pai.key !== ativo.key && !(ativo.raw.subSubSessions || []).length;
const encaixa = (ativo: No, pai: No | null) =>
  ativo.tipo === 'section' ? pai === null : !!pai && (ACEITA[pai.tipo].includes(ativo.tipo) || viraSubpasta(ativo, pai));

// Onde o item cai: nível pedido pelo deslocamento, limitado pelos vizinhos, e o mais próximo
// dele que a hierarquia aceita. null = nenhum nível serve ali.
function projetar(itens: No[], ativoKey: string, overKey: string, dx: number): { depth: number; pai: No | null } | null {
  const ai = itens.findIndex(n => n.key === ativoKey), oi = itens.findIndex(n => n.key === overKey);
  if (ai < 0 || oi < 0) return null;
  const ativo = itens[ai];
  const novos = arrayMove(itens, ai, oi);
  const prev = novos[oi - 1], next = novos[oi + 1];
  const desejado = ativo.depth + Math.round(dx / INDENT);
  const max = prev ? (CONTEINER[prev.tipo] ? prev.depth + 1 : prev.depth) : 0;
  const min = next ? next.depth : 0;
  const cands: number[] = [];
  for (let d = min; d <= max; d++) cands.push(d);
  cands.sort((a, b) => Math.abs(a - desejado) - Math.abs(b - desejado));
  for (const d of cands) {
    const pai = acharPai(novos, oi, d);
    if (pai === undefined) continue;
    if (encaixa(ativo, pai)) return { depth: d, pai };
  }
  return null;
}

function acharRaw(menu: any[], tipo: Tipo, id: string): any {
  for (const s of menu) {
    if (tipo === 'section' && s.id === id) return s;
    for (const ss of s.subSubSessions || []) if (tipo === 'subsubsession' && ss.id === id) return ss;
    for (const sub of s.subSessions || []) {
      if (tipo === 'subsession' && sub.id === id) return sub;
      for (const ss of sub.subSubSessions || []) if (tipo === 'subsubsession' && ss.id === id) return ss;
    }
  }
  return null;
}
// Lista (por referência) dos filhos de um tipo dentro do pai; pai null = raiz (seções)
function listaDe(menu: any[], paiKey: string | null, tipoFilho: Tipo): any[] {
  if (!paiKey) return menu;
  const { tipo, id } = separar(paiKey);
  const alvo = acharRaw(menu, tipo, id);
  if (!alvo) return [];
  const campo = CAMPO[tipoFilho];
  alvo[campo] = alvo[campo] || [];
  return alvo[campo];
}

// Filhos de todos os tipos de um pai, na ordem mista; null = raiz (seções)
function filhosDe(menu: any[], paiKey: string | null): { tipo: Tipo; item: any }[] {
  if (!paiKey) return menu.map((s: any) => ({ tipo: 'section' as Tipo, item: s }));
  const { tipo, id } = separar(paiKey);
  return filhosEmOrdem(acharRaw(menu, tipo, id)) as { tipo: Tipo; item: any }[];
}
// Grava a ordem mista: um POST /reorder por tabela, com a posição global de cada item
async function gravarOrdem(ordem: { tipo: Tipo; item: any }[]) {
  const porTipo = new Map<Tipo, { id: string; order_index: number }[]>();
  ordem.forEach(({ tipo, item }, i) => porTipo.set(tipo, [...(porTipo.get(tipo) || []), { id: item.id, order_index: i }]));
  for (const [tipo, items] of porTipo) {
    const r = await fetch('/api/menu/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: TABELA[tipo], items }) });
    if (!r.ok) throw new Error('ordenar');
  }
}

// Campos de pai que cada PUT espera
function campoPai(tipo: Tipo, paiKey: string | null) {
  const p = paiKey ? separar(paiKey) : null;
  if (tipo === 'subsession') return { section_id: p?.id ?? null };
  if (tipo === 'subsubsession') return {
    subsession_id: p?.tipo === 'subsession' ? p.id : null,
    section_id: p?.tipo === 'section' ? p.id : null,
  };
  if (tipo === 'page') return {
    section_id: p?.tipo === 'section' ? p.id : null,
    subsession_id: p?.tipo === 'subsession' ? p.id : null,
    subsubsession_id: p?.tipo === 'subsubsession' ? p.id : null,
  };
  return {};
}
const urlDe = (tipo: Tipo, id: string) => `/api/menu/${TABELA[tipo]}/${encodeURIComponent(id)}`;

// ── Linha ────────────────────────────────────────────────────────────────────
const Linha: React.FC<{
  no: No; depth: number; invalido?: boolean; fantasma?: boolean; recolhido: boolean; arrastavel: boolean;
  Icone: React.ComponentType<any>;
  onAlternar: () => void; onEditar: () => void; onExcluir: () => void; onNovaPagina: () => void;
}> = ({ no, depth, invalido, fantasma, recolhido, arrastavel, Icone, onAlternar, onEditar, onExcluir, onNovaPagina }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id: no.key, disabled: !arrastavel });
  const secao = no.tipo === 'section';
  const pasta = no.tipo === 'subsession' || no.tipo === 'subsubsession';
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className="relative">
      {/* linhas-guia de cada nível */}
      {Array.from({ length: depth }).map((_, i) => (
        <span key={i} className="absolute top-0 bottom-0 w-px bg-slate-200 dark:bg-white/[0.06]" style={{ left: 22 + i * INDENT }} />
      ))}
      <div
        style={{ marginLeft: depth * INDENT }}
        className={`group flex items-center gap-2 h-10 pl-1 pr-2 rounded-lg transition-colors ${
          fantasma
            ? invalido ? 'border border-dashed border-rose-500/60 bg-rose-500/5' : 'border border-dashed border-violet-500/60 bg-violet-500/5'
            : secao ? 'bg-slate-100/80 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.07]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
        }`}
      >
        <button
          ref={setActivatorNodeRef} {...attributes} {...listeners}
          className={`w-6 h-7 shrink-0 flex items-center justify-center rounded text-slate-300 dark:text-slate-600 ${arrastavel ? 'cursor-grab active:cursor-grabbing hover:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10' : 'opacity-0 pointer-events-none'}`}
          title="Arrastar" aria-label={`Arrastar ${no.label}`}
        >
          <GripVertical size={14} />
        </button>
        {CONTEINER[no.tipo] ? (
          <button onClick={onAlternar} className="w-5 h-5 shrink-0 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-white" title={recolhido ? 'Abrir' : 'Recolher'}>
            <ChevronRight size={14} className={`transition-transform ${recolhido ? '' : 'rotate-90'}`} />
          </button>
        ) : <span className="w-5 shrink-0" />}
        <Icone size={15} className="shrink-0" style={{ color: no.icon_color || '#94a3b8' }} />
        <span className={`truncate ${secao ? 'text-[13px] font-bold uppercase tracking-wide text-slate-800 dark:text-white' : pasta ? 'text-sm font-semibold text-slate-800 dark:text-slate-100' : 'text-sm text-slate-700 dark:text-slate-200'}`}>
          {no.label}
        </span>
        {no.tipo === 'page' ? (
          <span className="text-[10px] font-mono text-slate-400 truncate" title={`id: ${no.id} · template: ${no.template}`}>
            {no.template && no.template !== no.id ? `${no.id} · ${no.template}` : no.id}
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 whitespace-nowrap">
            {no.paginas} {no.paginas === 1 ? 'página' : 'páginas'}{no.pastas ? ` · ${no.pastas} ${no.pastas === 1 ? 'pasta' : 'pastas'}` : ''}
          </span>
        )}
        <div className="flex-1" />
        {!fantasma && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {CONTEINER[no.tipo] && (
              <button onClick={onNovaPagina} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-violet-500 hover:bg-violet-500/10" title="Nova página aqui"><Plus size={14} /></button>
            )}
            <button onClick={onEditar} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10" title="Editar"><Pencil size={13} /></button>
            <button onClick={onExcluir} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10" title="Excluir"><Trash2 size={13} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Janela de edição ─────────────────────────────────────────────────────────
const JanelaEditar: React.FC<{
  no: No; templates: { id: string; label: string }[];
  IconSelector: React.ComponentType<{ value: string; onChange: (v: string) => void }>;
  ColorSelector: React.ComponentType<{ value: string; onChange: (v: string) => void }>;
  onFechar: () => void; onSalvo: () => void;
}> = ({ no, templates, IconSelector, ColorSelector, onFechar, onSalvo }) => {
  const [label, setLabel] = useState(no.label);
  const [icon, setIcon] = useState(no.icon || (no.tipo === 'page' ? 'FileText' : 'Folder'));
  const [cor, setCor] = useState(no.icon_color || '#64748b');
  const [template, setTemplate] = useState(no.template || '');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    if (!label.trim()) return toast.error('O nome não pode ficar vazio.');
    setSalvando(true);
    try {
      const corpo: any = no.tipo === 'section'
        ? { title: label.trim(), icon, icon_color: cor }
        : { label: label.trim(), icon, icon_color: cor, ...campoPai(no.tipo, no.parentKey), ...(no.tipo === 'page' ? { template } : {}) };
      const r = await fetch(urlDe(no.tipo, no.id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
      if (!r.ok) throw new Error(await r.text());
      toast.success('Salvo.');
      onSalvo();
    } catch (e: any) {
      toast.error(`Não foi possível salvar: ${e.message || e}`);
    } finally { setSalvando(false); }
  };

  const rotulo = 'block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5';
  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-[520px] bg-white dark:bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/5">
          <div>
            <h3 className="text-base font-bold text-light-text dark:text-white">Editar {NOME[no.tipo]}</h3>
            <p className="text-[11px] font-mono text-slate-500">id: {no.id}</p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg text-slate-400 hover:text-light-text dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={rotulo}>Nome</label>
            <input autoFocus value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && salvar()}
              className="w-full px-3 py-2 rounded-lg text-sm modal-input focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={rotulo}>Ícone</label><IconSelector value={icon} onChange={setIcon} /></div>
            <div><label className={rotulo}>Cor do ícone</label><ColorSelector value={cor} onChange={setCor} /></div>
          </div>
          {no.tipo === 'page' && (
            <div>
              <label className={rotulo}>Modelo (template)</label>
              <OptionPicker
                value={templates.find(t => t.id === template)?.label || template || null}
                options={templates.map(t => ({ label: t.label }))}
                placeholder="Template"
                onChange={(v) => setTemplate(templates.find(t => t.label === v)?.id || template)}
              />
              <p className="text-[11px] text-slate-500 mt-1.5">Trocar o modelo muda a tela que a página abre. Os dados ficam ligados ao id, que não muda.</p>
            </div>
          )}
          <p className="text-[11px] text-slate-500">Para mudar de lugar, arraste na lista.</p>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-black/5 dark:border-white/5">
          <button onClick={onFechar} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-light-text dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 flex items-center gap-2">
            {salvando && <Loader2 size={13} className="animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ── Componente ───────────────────────────────────────────────────────────────
const CHAVE_RECOLHIDOS = 'estrutura-menu-recolhidos';

const EstruturaMenu: React.FC<{
  menu: any[]; setMenu: (m: any) => void; refreshMenu: () => Promise<void> | void;
  iconeDe: (nome?: string) => React.ComponentType<any>;
  IconSelector: React.ComponentType<{ value: string; onChange: (v: string) => void }>;
  ColorSelector: React.ComponentType<{ value: string; onChange: (v: string) => void }>;
  templates: { id: string; label: string }[];
  onNovaPagina: (pai: { tipo: Tipo; id: string }) => void;
}> = ({ menu, setMenu, refreshMenu, iconeDe, IconSelector, ColorSelector, templates, onNovaPagina }) => {
  const [recolhidos, setRecolhidos] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(CHAVE_RECOLHIDOS) || '[]')); } catch { return new Set(); }
  });
  useEffect(() => { try { localStorage.setItem(CHAVE_RECOLHIDOS, JSON.stringify([...recolhidos])); } catch { /* só conveniência */ } }, [recolhidos]);
  const [busca, setBusca] = useState('');
  const [ativoKey, setAtivoKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [dx, setDx] = useState(0);
  const [editando, setEditando] = useState<No | null>(null);
  const [salvando, setSalvando] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const lista = Array.isArray(menu) ? menu : [];
  const todas = useMemo(() => achatar(lista, new Set()), [lista]);
  const ativo = ativoKey ? todas.find(n => n.key === ativoKey) || null : null;

  // Ao arrastar uma seção, todas recolhem: só faz sentido soltar entre seções
  const itens = useMemo(() => {
    const term = busca.trim().toLowerCase();
    if (term) {
      // busca: mostra quem casa e o caminho até ele (sem arrastar)
      const manter = new Set<string>();
      const porKey = new Map(todas.map(n => [n.key, n]));
      for (const n of todas) {
        if (n.label.toLowerCase().includes(term) || n.id.toLowerCase().includes(term)) {
          let c: No | undefined = n;
          while (c) { manter.add(c.key); c = c.parentKey ? porKey.get(c.parentKey) : undefined; }
        }
      }
      return todas.filter(n => manter.has(n.key));
    }
    if (ativo?.tipo === 'section') return achatar(lista, new Set(lista.map((s: any) => chave('section', s.id))));
    const base = achatar(lista, recolhidos);
    return ativoKey ? semDescendentes(base, ativoKey) : base;
  }, [todas, lista, recolhidos, busca, ativo?.tipo, ativoKey]);

  const projecao = ativoKey && overKey ? projetar(itens, ativoKey, overKey, dx) : null;

  const alternar = (k: string) => setRecolhidos(prev => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s; });
  const pastas = todas.filter(n => CONTEINER[n.tipo]).map(n => n.key);

  const limpar = () => { setAtivoKey(null); setOverKey(null); setDx(0); };

  const aoSoltar = async ({ active, over }: DragEndEvent) => {
    const proj = ativoKey && over ? projetar(itens, String(active.id), String(over.id), dx) : null;
    const no = todas.find(n => n.key === active.id);
    limpar();
    if (!proj || !no || !over) { if (over && !proj) toast.error(`Uma ${NOME[no?.tipo || 'page']} não pode ficar aí.`); return; }

    const ai = itens.findIndex(n => n.key === no.key), oi = itens.findIndex(n => n.key === over.id);
    const novos = arrayMove(itens, ai, oi);
    const novoPaiKey = proj.pai?.key ?? null;

    if (proj.pai && viraSubpasta(no, proj.pai)) {
      const ok = await confirmDialog({
        title: 'Mover pasta para dentro de outra',
        message: `"${no.label}" vira uma subpasta de "${proj.pai.label}", levando as ${no.paginas} páginas. Subpasta só guarda páginas — não dá para criar pastas dentro dela.`,
        confirmText: 'Mover',
      });
      if (!ok) return;
      // posição entre os filhos do destino (páginas e subpastas), pela ordem em que ela foi solta
      const atuais = filhosDe(lista, novoPaiKey);
      let pos = 0;
      for (const n of novos) { if (n.key === no.key) break; if (n.parentKey === novoPaiKey) pos++; }
      if (recolhidos.has(proj.pai.key)) pos = atuais.length;
      const ordem = [...atuais]; ordem.splice(Math.min(pos, ordem.length), 0, { tipo: 'subsubsession', item: { ...no.raw } });
      setSalvando(true);
      try {
        const r = await fetch(`/api/menu/subsessions/${encodeURIComponent(no.id)}/virar-subpasta`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destino: proj.pai.id }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        await gravarOrdem(ordem);
        toast.success(`"${no.label}" agora é subpasta de "${proj.pai.label}".`);
      } catch (e: any) {
        toast.error(e.message || 'Não foi possível mover a pasta.');
      } finally {
        setSalvando(false);
        await refreshMenu();
      }
      return;
    }
    const mudouPai = novoPaiKey !== no.parentKey;

    // Ordem final entre TODOS os filhos do destino (páginas, subpastas e pastas juntas; na raiz,
    // só seções). Os ocultos por "recolher" vão junto, no fim.
    const atuais = filhosDe(lista, novoPaiKey).filter(f => !(f.tipo === no.tipo && f.item.id === no.id));
    let pos = 0;
    for (const n of novos) { if (n.key === no.key) break; if (n.parentKey === novoPaiKey) pos++; }
    if (novoPaiKey && recolhidos.has(novoPaiKey)) pos = atuais.length;
    const ordem = [...atuais];
    ordem.splice(Math.min(pos, ordem.length), 0, { tipo: no.tipo, item: no.raw });
    const chaves = (l: { tipo: Tipo; item: any }[]) => l.map(f => `${f.tipo}:${f.item.id}`).join('|');
    if (!mudouPai && chaves(ordem) === chaves(filhosDe(lista, no.parentKey))) return;

    // Otimista: tira do pai antigo, põe no novo e renumera os filhos do destino
    const clone = JSON.parse(JSON.stringify(lista));
    const velha = listaDe(clone, no.parentKey, no.tipo);
    const iv = velha.findIndex((x: any) => x.id === no.id);
    if (iv >= 0) velha.splice(iv, 1);
    listaDe(clone, novoPaiKey, no.tipo).push({ ...no.raw });
    ordem.forEach(({ tipo, item }, idx) => {
      const alvo = novoPaiKey ? listaDe(clone, novoPaiKey, tipo).find((x: any) => x.id === item.id) : clone.find((x: any) => x.id === item.id);
      if (alvo) alvo.order_index = idx;
    });
    if (!novoPaiKey) clone.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
    setMenu(clone);

    setSalvando(true);
    try {
      if (mudouPai) {
        const corpo: any = { label: no.raw.label, icon: no.raw.icon, icon_color: no.raw.icon_color, ...campoPai(no.tipo, novoPaiKey), ...(no.tipo === 'page' ? { template: no.raw.template } : {}) };
        const r = await fetch(urlDe(no.tipo, no.id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
        if (!r.ok) throw new Error('mover');
      }
      await gravarOrdem(ordem);
      if (mudouPai) toast.success(`"${no.label}" movida para ${proj.pai ? `"${proj.pai.label}"` : 'a raiz'}.`);
    } catch {
      toast.error('Não foi possível salvar a nova posição. Recarregando…');
    } finally {
      setSalvando(false);
      await refreshMenu();
    }
  };

  const excluir = async (no: No) => {
    const extra = no.tipo === 'page' ? '' :
      (no.paginas || no.pastas)
        ? ` Vai junto tudo o que está dentro: ${no.pastas ? `${no.pastas} ${no.pastas === 1 ? 'pasta' : 'pastas'} e ` : ''}${no.paginas} ${no.paginas === 1 ? 'página' : 'páginas'}.`
        : ' Ela está vazia.';
    const ok = await confirmDialog({
      title: `Excluir ${NOME[no.tipo]}`,
      message: `"${no.label}" sai do menu de todo mundo.${extra}`,
      confirmText: 'Excluir', danger: true,
    });
    if (!ok) return;
    try {
      const r = await fetch(urlDe(no.tipo, no.id), { method: 'DELETE' });
      if (!r.ok) throw new Error(await r.text());
      toast.success(`"${no.label}" excluída.`);
    } catch (e: any) {
      toast.error(`Não foi possível excluir: ${e.message || e}`);
    } finally { await refreshMenu(); }
  };

  const arrastavel = !busca.trim();
  const sobreposto = ativo;
  const IconeAtivo = sobreposto ? iconeDe(sobreposto.icon) : FileText;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar página, pasta ou id…"
            className="w-full h-10 pl-9 pr-9 rounded-xl text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-light-text dark:text-white placeholder:text-slate-500 outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20" />
          {busca && <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-light-text dark:hover:text-white"><X size={13} /></button>}
        </div>
        <button onClick={() => setRecolhidos(new Set())} className="h-10 px-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-light-text dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5">
          <ChevronsUpDown size={14} /> Abrir tudo
        </button>
        <button onClick={() => setRecolhidos(new Set(pastas))} className="h-10 px-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-light-text dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5">
          <ChevronsDownUp size={14} /> Recolher tudo
        </button>
        {salvando && <span className="flex items-center gap-1.5 text-xs text-slate-500"><Loader2 size={13} className="animate-spin" /> Salvando…</span>}
      </div>
      <p className="text-[11px] text-slate-500 mb-3">
        {busca.trim()
          ? 'Busca ativa: arrastar fica desligado até limpar a busca.'
          : 'Arraste pela alça ⋮⋮. Para cima e para baixo muda a ordem; para a direita entra na pasta de cima; para a esquerda sai dela. Uma pasta sem subpastas pode entrar em outra pasta (vira subpasta).'}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={({ active }: DragStartEvent) => { setAtivoKey(String(active.id)); setOverKey(String(active.id)); }}
        onDragMove={({ delta }: DragMoveEvent) => setDx(delta.x)}
        onDragOver={({ over }: DragOverEvent) => setOverKey(over ? String(over.id) : null)}
        onDragEnd={aoSoltar}
        onDragCancel={limpar}
      >
        <SortableContext items={itens.map(n => n.key)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {itens.length === 0 && <p className="text-sm text-slate-500 py-8 text-center">Nada encontrado.</p>}
            {itens.map(n => {
              const eAtivo = n.key === ativoKey;
              const depth = eAtivo && projecao ? projecao.depth : n.depth;
              return (
                <Linha
                  key={n.key}
                  no={n}
                  depth={depth}
                  fantasma={eAtivo}
                  invalido={eAtivo && !projecao}
                  recolhido={recolhidos.has(n.key)}
                  arrastavel={arrastavel}
                  Icone={iconeDe(n.icon)}
                  onAlternar={() => alternar(n.key)}
                  onEditar={() => setEditando(n)}
                  onExcluir={() => excluir(n)}
                  onNovaPagina={() => onNovaPagina({ tipo: n.tipo, id: n.id })}
                />
              );
            })}
          </div>
        </SortableContext>
        {createPortal(
          <DragOverlay dropAnimation={null}>
            {sobreposto && (
              <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-white dark:bg-dark-card border border-violet-500/40 shadow-2xl cursor-grabbing w-fit max-w-[420px]">
                <GripVertical size={14} className="text-slate-400" />
                <IconeAtivo size={15} style={{ color: sobreposto.icon_color || '#94a3b8' }} />
                <span className="text-sm font-semibold text-light-text dark:text-white truncate">{sobreposto.label}</span>
                {(sobreposto.paginas + sobreposto.pastas) > 0 && (
                  <span className="text-[10px] font-bold text-violet-500 bg-violet-500/10 rounded-full px-2 py-0.5">+{sobreposto.paginas + sobreposto.pastas}</span>
                )}
              </div>
            )}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>

      {editando && (
        <JanelaEditar
          no={editando}
          templates={templates}
          IconSelector={IconSelector}
          ColorSelector={ColorSelector}
          onFechar={() => setEditando(null)}
          onSalvo={async () => { setEditando(null); await refreshMenu(); }}
        />
      )}
    </div>
  );
};

export default EstruturaMenu;
