import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, Search, ArrowDownLeft, ArrowUpRight, Pencil } from 'lucide-react';
import { SeletorCategoria, usePlanoDeContas, Folha } from './SeletorCategoriaDRE';
import { toast } from '@/src/lib/toast';
import { useAuth } from '../contexts/AuthContext';

/**
 * Conciliação manual do Extrato.
 *
 * Aparece aqui todo lançamento SEM categoria no banco — o que nenhuma regra
 * pegou. Na lista principal eles pareciam classificados (a API preenche o rótulo
 * com o tipo da transação do Asaas: TRANSFER vira "Transferência"), mas ficavam
 * fora do DRE. Aqui a pessoa renomeia, escolhe a categoria e confirma.
 *
 * Descrição e categoria vão na MESMA requisição (`PATCH /api/financeiro/extrato/:id`).
 * `edited_by` precisa ser a pessoa, nunca 'regra-auto'/'motor-auto': o motor de
 * categorização (`bills.ts`) reprocessa as linhas com esses valores e
 * sobrescreveria a conciliação no próximo sync.
 */

export interface ItemConciliacao {
  id: number;
  description: string;
  custom_description: string | null;
  original_description: string | null;
  value: string;
  movement_value: string;
  movement_date: string | null;
  type: number;
  person_name: string | null;
  person_fantasy_name: string | null;
  account?: string;
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
const descricaoAtual = (i: ItemConciliacao) =>
  (i.custom_description || i.description || i.original_description || '').trim();

// ── Card de um lançamento ────────────────────────────────────────────────────
const CardConciliacao: React.FC<{
  item: ItemConciliacao;
  folhas: Folha[];
  aoConciliar: (id: number, descricao: string, categoria: Folha) => Promise<void>;
}> = ({ item, folhas, aoConciliar }) => {
  const original = descricaoAtual(item);
  const [descricao, setDescricao] = useState(original);
  const [categoria, setCategoria] = useState<Folha | null>(null);
  const [salvando, setSalvando] = useState(false);

  const valor = Math.abs(parseFloat(item.value || item.movement_value || '0'));
  const entrada = item.type === 1;
  const contraparte = item.person_fantasy_name || item.person_name;
  const renomeou = descricao.trim() !== original;

  const confirmar = async () => {
    if (!categoria) return;
    setSalvando(true);
    try {
      await aoConciliar(item.id, descricao.trim(), categoria);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      className="rounded-2xl border border-black/10 dark:border-white/10 bg-dark-card p-4 space-y-3"
    >
      {/* Cabeçalho: o que dá para saber sem ler a descrição */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            entrada ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {entrada ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {fmtData(item.movement_date)}{item.account ? ` · ${({ asaas: 'Asaas', sicredi: 'Cartão Sicredi', asaas_cartao: 'Cartão Asaas' } as Record<string, string>)[item.account] || item.account}` : ''}
            </p>
            {contraparte && <p className="text-xs text-slate-500 truncate">{contraparte}</p>}
          </div>
        </div>
        <p className={`text-base font-black tabular-nums shrink-0 ${entrada ? 'text-emerald-500' : 'text-rose-500'}`}>
          {entrada ? '+' : '−'}{fmtBRL(valor)}
        </p>
      </div>

      {/* Descrição editável — o texto do banco é longo e genérico
          ("Transação via Pix com QR Code para…"); o nome que fica é o seu. */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
          <Pencil size={9} /> Descrição
        </label>
        <input
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          className="mt-1 w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text outline-none focus:border-violet-500/60"
        />
        {renomeou && (
          <p className="mt-1 text-[10px] text-slate-500 truncate" title={original}>
            Original: {original}
          </p>
        )}
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categoria</label>
        <div className="mt-1">
          <SeletorCategoria
            folhas={folhas}
            valor={categoria}
            aoEscolher={setCategoria}
            sugestaoNatureza={entrada ? 'entrada' : 'saida'}
          />
        </div>
      </div>

      <button
        onClick={confirmar}
        disabled={!categoria || salvando || !descricao.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
      >
        {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        {salvando ? 'Conciliando…' : 'Conciliar'}
      </button>
    </motion.div>
  );
};

// ── Modal ────────────────────────────────────────────────────────────────────
const ModalConciliacao: React.FC<{
  itens: ItemConciliacao[];
  onFechar: () => void;
  /** Avisa a página para atualizar a linha sem refazer o fetch do extrato. */
  onConciliado: (id: number, descricao: string, categoria: { id: number; nome: string }) => void;
}> = ({ itens, onFechar, onConciliado }) => {
  const { user } = useAuth();
  const { folhas, carregando } = usePlanoDeContas();
  const [busca, setBusca] = useState('');

  // Fecha no Esc — o modal cobre a tela inteira e não pode prender a pessoa.
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onFechar]);

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return itens;
    return itens.filter(i =>
      descricaoAtual(i).toLowerCase().includes(t) ||
      (i.person_fantasy_name || i.person_name || '').toLowerCase().includes(t));
  }, [itens, busca]);

  const total = itens.reduce((s, i) => s + Math.abs(parseFloat(i.value || i.movement_value || '0')), 0);

  const conciliar = async (id: number, descricao: string, categoria: Folha) => {
    const item = itens.find(i => i.id === id);
    const original = item ? (item.original_description || item.description || '').trim() : '';
    try {
      const r = await fetch(`/api/financeiro/extrato/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Descrição igual à do banco vai como null: não cria "edição" à toa.
          custom_description: descricao && descricao !== original ? descricao : null,
          custom_category: categoria.nome,
          custom_category_id: categoria.id,
          edited_by: user?.email || 'conciliacao-manual',
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Falha ao conciliar.');
      onConciliado(id, descricao, { id: categoria.id, nome: categoria.nome });
    } catch (e: any) {
      toast.error(e.message || 'Falha ao conciliar.');
      throw e;
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl bg-dark-bg border border-black/10 dark:border-white/10 rounded-3xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-dark-text">Conciliar lançamentos</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {itens.length > 0
                ? <>{itens.length} sem categoria · {fmtBRL(total)} fora do DFC até serem classificados</>
                : 'Nada pendente no período.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {itens.length > 3 && (
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar…"
                  className="w-48 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-dark-text outline-none focus:border-violet-500/60"
                />
              </div>
            )}
            <button onClick={onFechar} className="text-slate-400 hover:text-dark-text"><X size={18} /></button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto">
          {carregando ? (
            <div className="py-16 flex justify-center"><Loader2 size={22} className="animate-spin text-violet-500" /></div>
          ) : itens.length === 0 ? (
            <div className="py-16 text-center">
              <Check size={32} className="mx-auto text-emerald-500 mb-3" />
              <p className="text-sm font-bold text-emerald-500">Tudo conciliado</p>
              <p className="text-xs text-slate-500 mt-1">Todo lançamento do período tem categoria e entra no DFC.</p>
            </div>
          ) : visiveis.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">Nenhum lançamento com "{busca}".</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <AnimatePresence mode="popLayout">
                {visiveis.map(item => (
                  <CardConciliacao key={item.id} item={item} folhas={folhas} aoConciliar={conciliar} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ModalConciliacao;
