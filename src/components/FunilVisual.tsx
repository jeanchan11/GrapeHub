import React from 'react';

/**
 * Funil desenhado (SVG) com N etapas: pílula com o valor em cada etapa, rótulo à
 * esquerda, detalhe opcional (ex.: custo) à direita e, entre uma etapa e outra,
 * um círculo com a taxa de passagem. Usado no Planejador comercial (3 etapas,
 * projeção) e na aba Funil das Métricas (6 etapas, realizado) — o mesmo desenho.
 *
 * A largura NÃO é proporcional ao volume: 89 mil impressões contra 4 contratos
 * faria as últimas etapas sumirem. O funil afunila por uma curva fixa.
 * `id` separa gradiente/filtro quando há dois funis na mesma página.
 */
export interface EtapaFunil { rotulo: string; valor: number | string; detalhe?: string }
export interface TaxaFunil { valor: string; rotulo: string; tom: 'rose' | 'violet' | 'emerald' | 'blue' | 'amber'; extra?: string }

const TOM: Record<TaxaFunil['tom'], { circulo: string; texto: string }> = {
  rose: { circulo: 'fill-rose-50 dark:fill-rose-900/20 stroke-rose-200 dark:stroke-rose-500/20', texto: 'fill-rose-500' },
  violet: { circulo: 'fill-slate-100 dark:fill-dark-input stroke-slate-200 dark:stroke-white/10', texto: 'fill-violet-600 dark:fill-violet-400' },
  emerald: { circulo: 'fill-emerald-50 dark:fill-emerald-900/20 stroke-emerald-200 dark:stroke-emerald-500/20', texto: 'fill-emerald-600 dark:fill-emerald-400' },
  blue: { circulo: 'fill-blue-50 dark:fill-blue-900/20 stroke-blue-200 dark:stroke-blue-500/20', texto: 'fill-blue-600 dark:fill-blue-400' },
  amber: { circulo: 'fill-amber-50 dark:fill-amber-900/20 stroke-amber-200 dark:stroke-amber-500/20', texto: 'fill-amber-600 dark:fill-amber-400' },
};

const fmt = (v: number | string) => (typeof v === 'number' ? v.toLocaleString('pt-BR') : v);

const FunilVisual: React.FC<{
  id: string;
  etapas: EtapaFunil[];
  taxas: TaxaFunil[];          // etapas.length - 1
  className?: string;
}> = ({ id, etapas, taxas, className = 'w-full h-full' }) => {
  const n = etapas.length;
  const passo = n <= 3 ? 170 : 110;
  const topo = 40;
  const altura = topo * 2 + passo * (n - 1);
  const Y = etapas.map((_, i) => topo + i * passo);

  // Meia-largura em cada etapa. Com 3 etapas é a curva do planejador (140 → 42 → 24).
  // Com mais etapas a curva é mais suave e o fundo mais largo — senão o funil vira
  // um fio a partir da metade (pedido do Jean em 28/09/2026: "mais gordinho").
  const [minimo, expoente] = n <= 3 ? [24, 2.7] : [40, 1.5];
  const meia = etapas.map((_, i) => minimo + (140 - minimo) * Math.pow(1 - i / Math.max(1, n - 1), expoente));
  const xCirculo = n <= 3 ? 352 : 360;

  // Borda esquerda como curva suave passando pelos pontos (Catmull-Rom → Bézier),
  // saindo na vertical no topo, como a boca do funil.
  const pts = Y.map((y, i) => ({ x: 200 - meia[i], y }));
  const tan = pts.map((p, i) => {
    if (i === 0) return { x: 0, y: passo * 0.9 };
    if (i === n - 1) return { x: p.x - pts[i - 1].x, y: p.y - pts[i - 1].y };
    return { x: (pts[i + 1].x - pts[i - 1].x) / 2, y: (pts[i + 1].y - pts[i - 1].y) / 2 };
  });
  let esq = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    esq += ` C ${a.x + tan[i].x / 3},${a.y + tan[i].y / 3} ${b.x - tan[i + 1].x / 3},${b.y - tan[i + 1].y / 3} ${b.x},${b.y}`;
  }
  // Borda direita = espelho, subindo
  const esp = (x: number) => 400 - x;
  let dir = ` L ${esp(pts[n - 1].x)},${pts[n - 1].y}`;
  for (let i = n - 1; i > 0; i--) {
    const a = pts[i], b = pts[i - 1];
    dir += ` C ${esp(a.x - tan[i].x / 3)},${a.y - tan[i].y / 3} ${esp(b.x + tan[i - 1].x / 3)},${b.y + tan[i - 1].y / 3} ${esp(b.x)},${b.y}`;
  }
  const caminho = `${esq}${dir} Z`;

  return (
    <svg viewBox={`0 0 400 ${altura}`} className={className} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {Y.map(y => (
        <line key={`l${y}`} x1="20" y1={y} x2="380" y2={y} stroke="currentColor" className="text-slate-200 dark:text-white/5" strokeDasharray="4 4" />
      ))}

      <path d={caminho} fill={`url(#grad-${id})`} filter={`url(#glow-${id})`} className="opacity-85" />

      {etapas.map((e, i) => (
        <g key={`e${i}`}>
          <text x="20" y={Y[i] - 8} className="fill-slate-500" fontSize="10" fontWeight="700">{e.rotulo.toUpperCase()}</text>
          {e.detalhe && (
            <text x="380" y={Y[i] - 8} textAnchor="end" className="fill-slate-400" fontSize="9" fontWeight="600">{e.detalhe}</text>
          )}
          <rect x="155" y={Y[i] - 15} width="90" height="30" rx="15" className="fill-slate-100 dark:fill-dark-input stroke-slate-200 dark:stroke-white/10" />
          <text x="200" y={Y[i] + 5} textAnchor="middle" className="fill-light-text dark:fill-white" fontSize="15" fontWeight="bold">{fmt(e.valor)}</text>
        </g>
      ))}

      {taxas.slice(0, n - 1).map((t, i) => {
        const y = (Y[i] + Y[i + 1]) / 2;
        const r = t.extra ? 30 : 26;
        return (
          <g key={`t${i}`} transform={`translate(${xCirculo}, ${y})`}>
            <circle r={r} className={TOM[t.tom].circulo} />
            <text y={t.extra ? -6 : -2} textAnchor="middle" className={TOM[t.tom].texto} fontSize="11" fontWeight="bold">{t.valor}</text>
            <text y={t.extra ? 5 : 11} textAnchor="middle" className="fill-slate-500" fontSize="8" fontWeight="bold">{t.rotulo}</text>
            {t.extra && <text y="16" textAnchor="middle" className="fill-slate-400" fontSize="7" fontWeight="600">{t.extra}</text>}
          </g>
        );
      })}
    </svg>
  );
};

export default FunilVisual;
