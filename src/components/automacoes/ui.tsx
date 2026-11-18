// Peças pequenas da página de Automações: interruptor, campo com rótulo, seletor por id
// e a lista de escolha com ícone + nome + descrição (gatilhos e ações).
import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, Search } from 'lucide-react';
import ThemedDropdown from '../ui/ThemedDropdown';

export const INPUT =
  'w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-white/10 ' +
  'text-sm text-dark-text placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors';

export const TXT_FRACO = 'text-slate-500 dark:text-slate-400';

/** Interruptor Ativa/Pausada. Não propaga o clique (fica dentro de linhas clicáveis). */
export function Interruptor({ ligado, onChange, rotulos = ['Ativa', 'Pausada'], disabled = false, title }: {
  ligado: boolean;
  onChange: (v: boolean) => void;
  rotulos?: [string, string] | null;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      title={title}
      disabled={disabled}
      onClick={e => { e.stopPropagation(); onChange(!ligado); }}
      className="inline-flex items-center gap-2 shrink-0 disabled:opacity-50 group/sw"
    >
      <span className={`relative w-9 h-5 rounded-full transition-colors ${ligado ? 'bg-violet-600' : 'bg-slate-300 dark:bg-white/15'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${ligado ? 'translate-x-4' : ''}`} />
      </span>
      {rotulos && (
        <span className={`text-xs font-semibold w-[52px] text-left ${ligado ? 'text-violet-600 dark:text-violet-400' : TXT_FRACO}`}>
          {ligado ? rotulos[0] : rotulos[1]}
        </span>
      )}
    </button>
  );
}

/** Campo de formulário: rótulo em cima, ajuda curta embaixo. */
export function Campo({ rotulo, ajuda, opcional, children }: {
  rotulo: string;
  ajuda?: React.ReactNode;
  opcional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-dark-text mb-1.5">
        {rotulo}
        {opcional && <span className={`font-normal ${TXT_FRACO}`}> (opcional)</span>}
      </p>
      {children}
      {ajuda && <p className={`mt-1.5 text-[11.5px] leading-snug ${TXT_FRACO}`}>{ajuda}</p>}
    </div>
  );
}

/** Seletor por id (ThemedDropdown), com texto de "escolher" enquanto vazio. */
export function Seletor({ valor, opcoes, onChange, placeholder, carregando = false, vazio = 'Nada para escolher.' }: {
  valor?: string | null;
  opcoes: { id: string; nome: string }[];
  onChange: (id: string) => void;
  placeholder: string;
  carregando?: boolean;
  vazio?: string;
}) {
  if (carregando) return <div className={`${INPUT} ${TXT_FRACO}`}>Carregando…</div>;
  if (opcoes.length === 0) return <p className={`text-xs italic ${TXT_FRACO}`}>{vazio}</p>;
  const v = valor ? String(valor) : '';
  const existe = opcoes.some(o => o.id === v);
  const lista = [
    ...(existe ? [] : [{ value: v, label: v ? 'Opção que não existe mais — escolha outra' : placeholder }]),
    ...opcoes.map(o => ({ value: o.id, label: o.nome })),
  ];
  return (
    <ThemedDropdown
      value={v}
      options={lista}
      onChange={id => { if (id && id !== v) onChange(id); }}
      buttonClassName={existe ? '' : '!text-slate-400'}
    />
  );
}

export interface ItemLista { id: string; label: string; description: string; Icone: LucideIcon; grupo?: string; }

/** Lista de escolha: ícone + nome + descrição, com busca opcional e grupos. */
export function SeletorLista({ itens, selecionado, onEscolher, busca = false, cor = 'violeta' }: {
  itens: ItemLista[];
  selecionado?: string;
  onEscolher: (id: string) => void;
  busca?: boolean;
  cor?: 'violeta' | 'ambar';
}) {
  const [q, setQ] = useState('');
  const termo = q.trim().toLowerCase();
  const filtrados = termo
    ? itens.filter(i => (i.label + ' ' + i.description).toLowerCase().includes(termo))
    : itens;
  const grupos = Array.from(new Set(filtrados.map(i => i.grupo || '')));
  const tom = cor === 'ambar'
    ? { sel: 'bg-amber-500/10 border-amber-500/40', icone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', check: 'text-amber-500' }
    : { sel: 'bg-violet-500/10 border-violet-500/40', icone: 'bg-violet-500/15 text-violet-600 dark:text-violet-400', check: 'text-violet-500' };

  return (
    <div className="space-y-3">
      {busca && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" className={`${INPUT} pl-9`} />
        </div>
      )}
      {filtrados.length === 0 && <p className={`text-xs italic ${TXT_FRACO} px-1`}>Nada encontrado para “{q}”.</p>}
      {grupos.map(grupo => (
        <div key={grupo || 'todos'} className="space-y-1">
          {grupo && <p className={`text-[11px] font-semibold uppercase tracking-wider px-1 pt-1 ${TXT_FRACO}`}>{grupo}</p>}
          {filtrados.filter(i => (i.grupo || '') === grupo).map(i => {
            const sel = i.id === selecionado;
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => onEscolher(i.id)}
                className={`w-full flex items-start gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                  sel ? tom.sel : 'border-transparent hover:bg-black/[0.03] dark:hover:bg-white/5'
                }`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sel ? tom.icone : 'bg-black/[0.04] dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                  <i.Icone size={15} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-dark-text">{i.label}</span>
                  <span className={`block text-xs mt-0.5 ${TXT_FRACO}`}>{i.description}</span>
                </span>
                {sel && <Check size={15} className={`${tom.check} shrink-0 mt-1`} />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
