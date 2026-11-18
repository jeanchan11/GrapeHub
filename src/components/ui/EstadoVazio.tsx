import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

/**
 * Estado vazio padrão (18/11/2026): ícone lucide discreto + frase cinza. Nada de emoji.
 * Só mostre depois que o carregamento terminar — antes, use CarregandoBloco.
 */
export function EstadoVazio({
  Icone = Inbox, titulo, descricao, acao, className = '',
}: {
  Icone?: LucideIcon;
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 py-12 text-center ${className}`}>
      <Icone size={26} className="text-slate-300 dark:text-slate-600 mb-1" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{titulo}</p>
      {descricao && <p className="text-[12.5px] text-slate-400 dark:text-slate-500 max-w-sm">{descricao}</p>}
      {acao && <div className="mt-3">{acao}</div>}
    </div>
  );
}

export default EstadoVazio;
