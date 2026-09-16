import { Star } from 'lucide-react';

// Linha de estrelas de uma avaliação. Usada na aba Desempenho e no card de
// resumo da Visão Geral — os dois precisam mostrar a mesma nota do mesmo jeito.
export default function StarRow({ value, max = 5, size = 14 }: { value: number; max?: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-white/15'}
        />
      ))}
    </div>
  );
}
