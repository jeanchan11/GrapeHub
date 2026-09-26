import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Search, Check, Minus, X } from 'lucide-react';
import { Categoria, NATUREZA, useArvorePlanoDeContas } from './SeletorCategoriaDRE';

/**
 * Filtro de categorias do Extrato desenhado como o DRE: grupo › subgrupo ›
 * categoria, na ordem do plano de contas, com o total do período em cada nível.
 * A ideia é ler "quanto foi gasto em quê" no próprio filtro, antes de filtrar.
 *
 * Mostra o plano INTEIRO, como o DRE — categoria sem lançamento no período
 * aparece apagada, com "—". A seleção é sempre um conjunto de CATEGORIAS FINAIS
 * (ids do plano); marcar um grupo marca todas as categorias dele.
 *
 * O menu abre em portal (`data-picker-menu`): o painel de Filtros tem 340 px e
 * fecha em clique fora; o atributo é o que o painel reconhece como "dentro".
 */

export const SEM_CATEGORIA = '__sem_categoria__';

export interface TotalCategoria { v: number; n: number }   // v: soma com sinal (entrada +, saída −)

const brl = (v: number) =>
  `${v < 0 ? '−' : v > 0 ? '+' : ''}${Math.abs(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;

interface No {
  cat: Categoria;
  folhas: number[];          // ids das categorias finais abaixo
  total: TotalCategoria;
  filhos: No[];
}

const FiltroCategoriasDRE: React.FC<{
  totais: Record<number, TotalCategoria>;
  semCategoria: TotalCategoria;
  selecionados: string[];
  onChange: (v: string[]) => void;
}> = ({ totais, semCategoria, selecionados, onChange }) => {
  const { arvore, carregando } = useArvorePlanoDeContas();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [fechados, setFechados] = useState<Set<string>>(new Set());
  const botaoRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxH: number } | null>(null);

  const sel = useMemo(() => new Set(selecionados), [selecionados]);

  // Monta a árvore do plano inteiro (filtrada só pela busca).
  const nos = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const casa = (c: Categoria) => !t || c.description.toLowerCase().includes(t) || c.structure.startsWith(t);
    const montar = (c: Categoria, paiCasou: boolean): No | null => {
      const filhos = c.children || [];
      const casou = paiCasou || casa(c);
      if (filhos.length === 0) {
        if (!casou) return null;
        return { cat: c, folhas: [c.id], total: totais[c.id] || { v: 0, n: 0 }, filhos: [] };
      }
      const sub = filhos.map(f => montar(f, casou)).filter(Boolean) as No[];
      if (sub.length === 0) return null;
      return {
        cat: c,
        folhas: sub.flatMap(s => s.folhas),
        total: sub.reduce((a, s) => ({ v: a.v + s.total.v, n: a.n + s.total.n }), { v: 0, n: 0 }),
        filhos: sub,
      };
    };
    return arvore.map(c => montar(c, false)).filter(Boolean) as No[];
  }, [arvore, totais, busca]);

  // Posição do menu: abaixo do botão, sem sair da tela.
  const posicionar = () => {
    const b = botaoRef.current?.getBoundingClientRect();
    if (!b) return;
    const largura = Math.min(480, window.innerWidth - 16);
    const left = Math.max(8, Math.min(b.left, window.innerWidth - largura - 8));
    const top = b.bottom + 6;
    setPos({ top, left, maxH: Math.max(240, window.innerHeight - top - 12) });
  };
  useLayoutEffect(() => { if (aberto) posicionar(); }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || botaoRef.current?.contains(t)) return;
      setAberto(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setAberto(false); } };
    const mover = () => posicionar();
    document.addEventListener('mousedown', fora);
    window.addEventListener('keydown', esc, true);
    window.addEventListener('resize', mover);
    return () => {
      document.removeEventListener('mousedown', fora);
      window.removeEventListener('keydown', esc, true);
      window.removeEventListener('resize', mover);
    };
  }, [aberto]);

  const alternar = (ids: string[]) => {
    const todos = ids.every(i => sel.has(i));
    const novo = new Set(sel);
    ids.forEach(i => (todos ? novo.delete(i) : novo.add(i)));
    onChange(Array.from(novo));
  };

  const alternarGrupo = (estrutura: string) =>
    setFechados(prev => {
      const n = new Set(prev);
      n.has(estrutura) ? n.delete(estrutura) : n.add(estrutura);
      return n;
    });

  const Caixa: React.FC<{ estado: 'sim' | 'parte' | 'nao' }> = ({ estado }) => (
    <span className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
      estado === 'nao' ? 'border-white/20' : 'bg-violet-500 border-violet-500 text-white'}`}>
      {estado === 'sim' && <Check size={11} strokeWidth={3} />}
      {estado === 'parte' && <Minus size={11} strokeWidth={3} />}
    </span>
  );

  const Valor: React.FC<{ t: TotalCategoria; forte?: boolean }> = ({ t, forte }) => (
    <span className={`shrink-0 tabular-nums text-right ${forte ? 'text-[12px] font-bold' : 'text-[11px] font-semibold'} ${
      t.v < 0 ? 'text-rose-400' : t.v > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
      {brl(t.v)}
    </span>
  );

  const Linha: React.FC<{ no: No; nivel: number }> = ({ no, nivel }) => {
    const ids = no.folhas.map(String);
    const marcados = ids.filter(i => sel.has(i)).length;
    const estado = marcados === 0 ? 'nao' : marcados === ids.length ? 'sim' : 'parte';
    const grupo = no.filhos.length > 0;
    const fechado = fechados.has(no.cat.structure) && !busca.trim();
    const natureza = NATUREZA[no.cat.structure.slice(0, 2)];
    const vazio = no.total.n === 0;

    return (
      <>
        <div
          className={`flex items-center gap-2 pr-3 py-1.5 hover:bg-white/5 cursor-pointer ${nivel === 0 ? 'mt-1' : ''} ${vazio && estado === 'nao' ? 'opacity-45' : ''}`}
          style={{ paddingLeft: 10 + nivel * 16 }}
          onClick={() => alternar(ids)}
        >
          {grupo ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); alternarGrupo(no.cat.structure); }}
              className="p-0.5 -ml-1 text-slate-500 hover:text-dark-text"
              title={fechado ? 'Expandir' : 'Recolher'}
            >
              {fechado ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            </button>
          ) : <span className="w-[18px] shrink-0" />}
          <Caixa estado={estado} />
          <span className="shrink-0 text-[10px] font-mono text-slate-500 w-[58px]">{no.cat.structure}</span>
          <span className={`min-w-0 flex-1 truncate ${
            nivel === 0 ? 'text-[12px] font-black uppercase tracking-wide text-dark-text'
              : grupo ? 'text-[12px] font-bold text-dark-text' : 'text-[12px] text-slate-300'}`}
            title={no.cat.description}>
            {no.cat.description}
          </span>
          {nivel === 0 && natureza && (
            <span className="shrink-0 text-[9px] font-bold uppercase text-slate-500">{natureza.rotulo}</span>
          )}
          <span className="shrink-0 text-[10px] text-slate-600 w-7 text-right">{vazio ? '' : no.total.n}</span>
          <span className="w-[104px] flex justify-end">
            {vazio ? <span className="text-[11px] text-slate-600">—</span> : <Valor t={no.total} forte={grupo} />}
          </span>
        </div>
        {grupo && !fechado && no.filhos.map(f => <Linha key={f.cat.id} no={f} nivel={nivel + 1} />)}
      </>
    );
  };

  const qtd = selecionados.length;
  const rotulo = qtd === 0 ? 'Todas categorias'
    : qtd === 1 && sel.has(SEM_CATEGORIA) ? '⚠️ Sem categoria'
    : `${qtd} categoria${qtd > 1 ? 's' : ''}`;

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          ref={botaoRef}
          type="button"
          onClick={() => setAberto(a => !a)}
          className={`flex-1 flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
            qtd > 0 ? 'border-violet-500/40 text-violet-300 bg-violet-500/10' : 'border-white/10 text-slate-300 bg-black/20 hover:border-white/20'}`}
        >
          <span className="truncate">{rotulo}</span>
          <ChevronDown size={13} className={`shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
        </button>
        {qtd > 0 && (
          <button type="button" onClick={() => onChange([])} title="Limpar categorias"
            className="p-2 rounded-lg border border-white/10 text-slate-400 hover:text-dark-text">
            <X size={12} />
          </button>
        )}
      </div>

      {aberto && pos && createPortal(
        <div
          ref={menuRef}
          data-picker-menu
          className="fixed z-[100000] bg-dark-card border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          style={{ top: pos.top, left: pos.left, width: Math.min(480, window.innerWidth - 16), maxHeight: Math.min(pos.maxH, 560) }}
        >
          <div className="relative border-b border-white/10 shrink-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar categoria ou código (ex.: 02.02)…"
              className="w-full bg-transparent pl-8 pr-3 py-2.5 text-xs text-dark-text placeholder-slate-500 outline-none"
            />
          </div>

          <div className="overflow-y-auto py-1">
            {semCategoria.n > 0 && !busca.trim() && (
              <div
                className="flex items-center gap-2 pr-3 py-1.5 hover:bg-white/5 cursor-pointer border-b border-white/5 mb-1"
                style={{ paddingLeft: 28 }}
                onClick={() => alternar([SEM_CATEGORIA])}
              >
                <Caixa estado={sel.has(SEM_CATEGORIA) ? 'sim' : 'nao'} />
                <span className="min-w-0 flex-1 text-[12px] font-bold text-amber-400">⚠️ Sem categoria (fora do DFC)</span>
                <span className="shrink-0 text-[10px] text-slate-600 w-7 text-right">{semCategoria.n}</span>
                <span className="w-[104px] flex justify-end"><Valor t={semCategoria} /></span>
              </div>
            )}

            {carregando && <p className="px-3 py-4 text-xs text-slate-500">Carregando plano de contas…</p>}
            {!carregando && nos.length === 0 && (
              <p className="px-3 py-4 text-xs text-slate-500">
                {busca.trim() ? `Nenhuma categoria com "${busca}".` : 'Plano de contas vazio.'}
              </p>
            )}
            {nos.map(no => <Linha key={no.cat.id} no={no} nivel={0} />)}
          </div>

          <div className="shrink-0 border-t border-white/10 px-3 py-2 flex items-center justify-between text-[10px] text-slate-500">
            <span>Valores líquidos do período (entradas − saídas) · cartões pelo mês da fatura</span>
            {qtd > 0 && (
              <button type="button" onClick={() => onChange([])} className="font-bold text-violet-400 hover:text-violet-300">Limpar</button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default FiltroCategoriasDRE;
