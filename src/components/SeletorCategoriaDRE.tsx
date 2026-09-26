import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search, ChevronDown } from 'lucide-react';

// Seletor de categoria do PLANO DE CONTAS (o que o DRE usa), com a natureza de
// cada conta à vista. Usado na conciliação do Extrato e no cadastro de Contas a
// Pagar — os dois precisam gravar a MESMA categoria, então escolhem pelo mesmo
// componente.

export interface Categoria {
  id: number;
  structure: string;
  description: string;
  level: number;
  children?: Categoria[];
}

export interface Folha {
  id: number;
  structure: string;
  nome: string;
  caminho: string;   // "Despesas Operacionais › Infraestrutura"
  natureza: string;  // os dois primeiros dígitos do structure
}

// Natureza da conta pelo grupo de nível 1 do plano de contas. É o que permite
// ler a categoria de relance — entrada, saída ou movimentação entre contas.
export const NATUREZA: Record<string, { rotulo: string; cor: string }> = {
  '01': { rotulo: 'Receita', cor: 'emerald' },
  '03': { rotulo: 'Receita', cor: 'emerald' },
  '02': { rotulo: 'Despesa', cor: 'rose' },
  '04': { rotulo: 'Despesa', cor: 'rose' },
  '05': { rotulo: 'Lucros', cor: 'amber' },
  '99': { rotulo: 'Transferência', cor: 'slate' },
};

// Classes fixas por cor: o Tailwind do projeto vem por CDN, mas mantê-las
// literais evita depender de geração dinâmica.
export const TOM: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30',
};

export function achatar(arvore: Categoria[]): Folha[] {
  const out: Folha[] = [];
  const visitar = (n: Categoria, trilha: string[]) => {
    const filhos = n.children || [];
    if (filhos.length === 0) {
      out.push({
        id: n.id,
        structure: n.structure,
        nome: n.description,
        caminho: trilha.join(' › '),
        natureza: n.structure.slice(0, 2),
      });
      return;
    }
    filhos.forEach(f => visitar(f, [...trilha, n.description]));
  };
  arvore.forEach(n => visitar(n, []));
  return out;
}


// ── Seletor de categoria ─────────────────────────────────────────────────────
// Abre EMBUTIDO no card, empurrando o conteúdo, em vez de flutuar. Dentro de um
// modal com rolagem, menu flutuante briga com z-index e é cortado pela borda do
// container — foi exatamente o defeito do Kanban de Destino nas Configurações.
// ── Lista com busca ──────────────────────────────────────────────────────────
// Miolo compartilhado: o seletor embutido (formulários) e a pílula clicável
// (tabelas) mostram exatamente a mesma lista.
export const ListaCategorias: React.FC<{
  folhas: Folha[];
  valorId: number | null | undefined;
  aoEscolher: (f: Folha) => void;
  sugestaoNatureza: 'entrada' | 'saida';
}> = ({ folhas, valorId, aoEscolher, sugestaoNatureza }) => {
  const [busca, setBusca] = useState('');

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const base = t
      ? folhas.filter(f => f.nome.toLowerCase().includes(t) || f.caminho.toLowerCase().includes(t) || f.structure.includes(t))
      : folhas;
    // Sem busca, a natureza compatível vem primeiro: saída sugere despesa,
    // entrada sugere receita. Não esconde as outras — transferência é saída e
    // precisa continuar à mão.
    if (t) return base;
    const combina = (f: Folha) =>
      sugestaoNatureza === 'saida' ? ['02', '04', '05', '99'].includes(f.natureza) : ['01', '03', '99'].includes(f.natureza);
    return [...base.filter(combina), ...base.filter(f => !combina(f))];
  }, [folhas, busca, sugestaoNatureza]);

  return (
    <>
      <div className="relative border-b border-black/10 dark:border-white/10">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          autoFocus
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar categoria…"
          className="w-full bg-transparent pl-8 pr-3 py-2 text-xs text-dark-text placeholder-slate-500 outline-none"
        />
      </div>
      <div className="max-h-56 overflow-y-auto py-1">
        {lista.length === 0 && <p className="px-3 py-3 text-xs text-slate-500">Nenhuma categoria encontrada.</p>}
        {lista.map(f => {
          const n = NATUREZA[f.natureza];
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => { aoEscolher(f); setBusca(''); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-violet-500/10 transition-colors ${
                valorId === f.id ? 'bg-violet-500/10' : ''}`}
            >
              {n && <span className={`shrink-0 px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase ${TOM[n.cor]}`}>{n.rotulo}</span>}
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-dark-text truncate">{f.nome}</span>
                {f.caminho && <span className="block text-[10px] text-slate-500 truncate">{f.caminho}</span>}
              </span>
              {valorId === f.id && <Check size={13} className="shrink-0 text-violet-500" />}
            </button>
          );
        })}
      </div>
    </>
  );
};

// ── Seletor embutido (formulários) ───────────────────────────────────────────
export const SeletorCategoria: React.FC<{
  folhas: Folha[];
  valor: Folha | null;
  aoEscolher: (f: Folha) => void;
  sugestaoNatureza: 'entrada' | 'saida';
}> = ({ folhas, valor, aoEscolher, sugestaoNatureza }) => {
  const [aberto, setAberto] = useState(false);
  const nat = valor ? NATUREZA[valor.natureza] : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
          valor && nat
            ? TOM[nat.cor]
            : 'bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-500 hover:border-violet-500/50'
        }`}
      >
        <span className="truncate text-left">
          {valor ? (
            <>
              <span className="font-bold">{valor.nome}</span>
              {nat && <span className="ml-2 text-[10px] uppercase tracking-wider opacity-70">{nat.rotulo}</span>}
            </>
          ) : 'Escolher categoria…'}
        </span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="mt-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] overflow-hidden">
          <ListaCategorias folhas={folhas} valorId={valor?.id}
            aoEscolher={f => { aoEscolher(f); setAberto(false); }} sugestaoNatureza={sugestaoNatureza} />
        </div>
      )}
    </div>
  );
};

// ── Pílula clicável (tabelas) ────────────────────────────────────────────────
// Mostra a categoria do DRE colorida pela natureza; o clique abre a lista num
// PORTAL, posicionado pela pílula. Portal porque as tabelas têm `overflow` e
// cortariam um menu comum; `data-picker-menu` para painéis que fecham com
// clique fora reconhecerem o menu como deles.
export const CategoriaDreInline: React.FC<{
  folhas: Folha[];
  valorId: number | null | undefined;
  aoEscolher: (f: Folha) => Promise<void> | void;
  sugestaoNatureza?: 'entrada' | 'saida';
  vazio?: string;
}> = ({ folhas, valorId, aoEscolher, sugestaoNatureza = 'saida', vazio = 'Definir categoria' }) => {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const atual = folhas.find(f => f.id === valorId) || null;
  const nat = atual ? NATUREZA[atual.natureza] : null;

  const abrir = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const W = 320, H = 300;
    const embaixo = window.innerHeight - r.bottom > H;
    setPos({
      top: embaixo ? r.bottom + 6 : Math.max(8, r.top - H - 6),
      left: Math.min(Math.max(8, r.left), window.innerWidth - W - 8),
    });
    setAberto(true);
  };

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setAberto(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    // Rolar a página tira o menu de cima da pílula: fecha em vez de flutuar solto.
    const rolar = () => setAberto(false);
    document.addEventListener('mousedown', fora);
    window.addEventListener('keydown', esc);
    window.addEventListener('scroll', rolar, true);
    return () => {
      document.removeEventListener('mousedown', fora);
      window.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', rolar, true);
    };
  }, [aberto]);

  const escolher = async (f: Folha) => {
    setAberto(false);
    if (f.id === valorId) return;
    setSalvando(true);
    try { await aoEscolher(f); } finally { setSalvando(false); }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (aberto ? setAberto(false) : abrir())}
        disabled={salvando}
        title={atual ? `${atual.caminho ? atual.caminho + ' › ' : ''}${atual.nome} — clique para trocar` : 'Clique para escolher a categoria do DRE'}
        className={`inline-flex max-w-full items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors disabled:opacity-50 ${
          atual && nat
            ? `${TOM[nat.cor]} hover:brightness-125`
            : 'border-dashed border-amber-500/50 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
        }`}
      >
        <span className="truncate">{salvando ? 'Salvando…' : atual ? atual.nome : `⚠️ ${vazio}`}</span>
        <ChevronDown size={10} className={`shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && pos && createPortal(
        <div
          ref={menuRef}
          data-picker-menu
          className="fixed z-[100000] w-[320px] rounded-xl border border-white/10 bg-dark-card shadow-2xl overflow-hidden"
          style={{ top: pos.top, left: pos.left }}
        >
          <ListaCategorias folhas={folhas} valorId={valorId} aoEscolher={escolher} sugestaoNatureza={sugestaoNatureza} />
        </div>,
        document.body
      )}
    </>
  );
};

// Cache do plano de contas: várias linhas/cards podem montar o seletor ao mesmo
// tempo, e sem isto cada um faria o próprio fetch.
//
// O cache vive enquanto o módulo vive — ou seja, a sessão inteira, porque o
// GrapeHub não recarrega a página ao trocar de tela. Sem invalidação, categoria
// criada em Configurações › Plano de Categorias só aparecia nos seletores depois
// de um F5. Quem altera o plano chama `invalidarPlanoDeContas()`.
let _cache: Folha[] | null = null;
let _arvore: Categoria[] | null = null;   // mesma carga, sem achatar — o filtro do Extrato desenha a árvore do DRE
let _promessa: Promise<Folha[]> | null = null;
export const EVENTO_PLANO_MUDOU = 'plano-de-contas:mudou';

export function invalidarPlanoDeContas() {
  _cache = null;
  _arvore = null;
  _promessa = null;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_PLANO_MUDOU));
}

function carregar(): Promise<Folha[]> {
  _promessa = _promessa || fetch('/api/fin-categories')
    .then(r => (r.ok ? r.json() : { tree: [] }))
    .then(d => { _arvore = d.tree || []; return (_cache = achatar(_arvore!)); })
    .catch(() => []);
  return _promessa;
}

export function usePlanoDeContas(): { folhas: Folha[]; carregando: boolean } {
  const [folhas, setFolhas] = useState<Folha[]>(_cache || []);
  const [carregando, setCarregando] = useState(!_cache);
  useEffect(() => {
    let vivo = true;
    const buscar = () => carregar().then(f => { if (vivo) { setFolhas(f); setCarregando(false); } });
    if (!_cache) buscar();
    // Seletor já aberto na tela também se atualiza quando o plano muda.
    const aoMudar = () => buscar();
    window.addEventListener(EVENTO_PLANO_MUDOU, aoMudar);
    return () => { vivo = false; window.removeEventListener(EVENTO_PLANO_MUDOU, aoMudar); };
  }, []);
  return { folhas, carregando };
}

/** Plano de contas em árvore (grupo › subgrupo › categoria), do mesmo cache. */
export function useArvorePlanoDeContas(): { arvore: Categoria[]; carregando: boolean } {
  const { carregando } = usePlanoDeContas();
  return { arvore: carregando ? [] : (_arvore || []), carregando };
}
