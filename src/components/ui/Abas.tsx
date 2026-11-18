import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Abas padrão do GrapeHub (18/11/2026 — ver docs/auditoria-design-2026-11-18).
 * - `sublinhado` (padrão): abas de página — linha embaixo da ativa, com ícone. Molde do
 *   Dashboard Operacional e das Métricas do Comercial.
 * - `segmentado`: filtros/visões dentro da página (Lista | Calendário, Pendentes | Concluídas).
 * Nunca aba com fundo violeta cheio.
 */
export interface AbaItem<T extends string = string> {
  id: T;
  rotulo: React.ReactNode;
  Icone?: LucideIcon;
  /** Número ao lado do rótulo (ex.: pendências). */
  contador?: number;
  /** Contador em vermelho (atraso, erro). */
  alerta?: boolean;
  /** Dica ao passar o mouse. */
  dica?: string;
}

export function Abas<T extends string>({
  abas, ativa, onChange, variante = 'sublinhado', className = '',
}: {
  abas: AbaItem<T>[];
  ativa: T;
  onChange: (id: T) => void;
  variante?: 'sublinhado' | 'segmentado';
  className?: string;
}) {
  const contador = (a: AbaItem<T>, sel: boolean) => a.contador != null && a.contador > 0 && (
    <span className={`text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full inline-flex items-center justify-center ${
      a.alerta ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        : sel ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300' : 'bg-slate-500/10 text-slate-500'
    }`}>{a.contador}</span>
  );

  if (variante === 'segmentado') {
    return (
      <div className={`flex items-center gap-1 p-1 w-fit max-w-full overflow-x-auto scrollbar-hide shrink-0 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5 ${className}`}>
        {abas.map(a => {
          const sel = a.id === ativa;
          return (
            <button
              key={a.id}
              type="button"
              title={a.dica}
              onClick={() => onChange(a.id)}
              className={`h-9 px-4 rounded-lg text-sm font-semibold whitespace-nowrap flex items-center gap-2 transition-colors ${
                sel ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {a.Icone && <a.Icone size={15} />}
              {a.rotulo}
              {contador(a, sel)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-1 border-b border-black/5 dark:border-white/5 ${className}`}>
      {abas.map(a => {
        const sel = a.id === ativa;
        return (
          <button
            key={a.id}
            type="button"
            title={a.dica}
            onClick={() => onChange(a.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold whitespace-nowrap transition-colors border-b-2 -mb-px ${
              sel ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-white'
            }`}
          >
            {a.Icone && <a.Icone size={15} />}
            {a.rotulo}
            {contador(a, sel)}
          </button>
        );
      })}
    </div>
  );
}

export default Abas;
