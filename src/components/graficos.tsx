import React, { useState, type ReactNode } from 'react';
import './graficos.css';

/**
 * Gráficos no desenho do painel de teste do GrapeCRM (components/dashboard/graficos.tsx de lá):
 * barras claras com o pico cheio, anel fino de pontas redondas, listas com bolinha e barra fina
 * de progresso. HTML/SVG puro, na cor de destaque do GrapeHub (--accent-color, violeta).
 * Só desenho: quem chama passa os números. Estilos em graficos.css (prefixo .gf-).
 *
 * Diferenças da origem: tokens do GrapeHub no lugar dos do shadcn (bg-card → dark-card,
 * text-foreground → dark-text, --primary → --accent-color) e cliques opcionais no Anel e na
 * ListaDeBarras, para abrir o detalhe.
 */

const fmt = (n: number) => n.toLocaleString('pt-BR');

const TXT_FRACO = 'text-slate-500 dark:text-slate-400';

/** Dica flutuante dos gráficos: cartão pequeno que aparece sobre o ponto/barra. */
function Dica({ x, y, titulo, linhas, embaixo = false }: { x: number; y: string; titulo?: ReactNode; linhas: ReactNode[]; embaixo?: boolean }) {
  // x em % da largura; encosta nas bordas para não sair do cartão.
  const lado = x < 18 ? '0%' : x > 82 ? '-100%' : '-50%';
  return (
    <div
      className="gf-dica pointer-events-none absolute z-20"
      style={{ left: `${x}%`, [embaixo ? 'top' : 'bottom']: y, transform: `translateX(${lado})` }}
    >
      {titulo != null && <p className={`mb-0.5 text-[10.5px] font-medium ${TXT_FRACO}`}>{titulo}</p>}
      {linhas.map((l, i) => <p key={i} className="whitespace-nowrap text-[12.5px] text-dark-text">{l}</p>)}
    </div>
  );
}

/** Cartão branco sem borda, cantos de 22px e sombra longa — a "pele" do painel de teste. */
export function Cartao({ titulo, legenda, acao, children, className = '', semPadding = false }: {
  titulo?: ReactNode;
  legenda?: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
  semPadding?: boolean;
}) {
  return (
    <div className={`gf-cartao flex min-h-0 flex-col ${semPadding ? '' : 'p-5'} ${className}`}>
      {(titulo || acao) && (
        <div className={`flex shrink-0 items-start justify-between gap-3 ${semPadding ? 'px-5 pt-5' : ''} ${legenda ? 'mb-1' : 'mb-4'}`}>
          <h2 className="text-[15px] font-semibold tracking-tight text-dark-text">{titulo}</h2>
          {acao}
        </div>
      )}
      {legenda && <p className={`mb-4 shrink-0 text-[12.5px] ${TXT_FRACO} ${semPadding ? 'px-5' : ''}`}>{legenda}</p>}
      {children}
    </div>
  );
}

/** Barras verticais; a maior fica cheia. `segunda` desenha uma parte da barra cheia (ex.: ganhos dentro dos leads). */
export function BarrasComPico({
  dados, rotuloDoValor = '', segundaRotulo = '', eixo = true, destacarPico = true, formato = fmt, eixoCompleto = false,
}: {
  dados: { rotulo: string; valor: number; segunda?: number }[];
  rotuloDoValor?: string;
  segundaRotulo?: string;
  eixo?: boolean;
  /** Como escrever o valor na dica (ex.: em reais). */
  formato?: (n: number) => string;
  /** Um rótulo embaixo de cada barra (ex.: os 12 meses), em vez de só alguns. */
  eixoCompleto?: boolean;
  /** Pinta a maior barra cheia. Desligado quando há a segunda série (ela é que vai cheia). */
  destacarPico?: boolean;
}) {
  const [foco, setFoco] = useState<number | null>(null);
  if (dados.length === 0) return null;
  const max = Math.max(1, ...dados.map((d) => d.valor));
  const pico = dados.reduce((m, d, i) => (d.valor > dados[m].valor ? i : m), 0);
  const marcas = eixoCompleto ? dados.map((_, i) => i) : dados.length <= 1 ? [0] : [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (dados.length - 1)));
  const f = foco != null ? dados[foco] : null;
  return (
    <div className="gf-barras flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1" onMouseLeave={() => setFoco(null)}>
        <div className={`gf-barras-area flex h-full items-end ${foco != null ? 'gf-com-foco' : ''}`} style={{ gap: dados.length > 40 ? 1 : dados.length > 24 ? 3 : 5 }}>
          {dados.map((d, i) => (
            <span
              key={i}
              onMouseEnter={() => setFoco(i)}
              className={`gf-barra ${destacarPico && i === pico && d.valor > 0 ? 'gf-barra--pico' : ''} ${foco === i ? 'gf-em-foco' : ''}`}
              style={{ height: `${Math.max(2, (d.valor / max) * 100)}%`, animationDelay: `${Math.min(i, 40) * 18}ms` }}
            >
              {d.segunda ? <i className="gf-barra-segunda" style={{ height: `${Math.min(100, (d.segunda / Math.max(1, d.valor)) * 100)}%` }} /> : null}
            </span>
          ))}
        </div>
        {f && foco != null && (
          <Dica
            x={((foco + 0.5) / dados.length) * 100}
            y={`calc(${Math.max(2, (f.valor / max) * 100)}% + 8px)`}
            titulo={f.rotulo}
            linhas={[
              <><b className="numero font-normal">{formato(f.valor)}</b> {rotuloDoValor}</>,
              ...(f.segunda ? [<><b className="numero font-normal">{fmt(f.segunda)}</b> {segundaRotulo}</>] : []),
            ]}
          />
        )}
      </div>
      {eixo && (
        <div className={`numero relative mt-2 h-3 text-[10.5px] ${TXT_FRACO}`}>
          {[...new Set(marcas)].map((i) => (
            <span
              key={i}
              className="absolute top-0 whitespace-nowrap"
              style={{
                left: `${dados.length <= 1 ? 0 : ((i + 0.5) / dados.length) * 100}%`,
                transform: eixoCompleto ? 'translateX(-50%)' : i === 0 ? 'translateX(-30%)' : i === dados.length - 1 ? 'translateX(-70%)' : 'translateX(-50%)',
              }}
            >
              {dados[i]?.rotulo}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Anel fino com um arco por segmento. Passar o mouse num arco ou na legenda destaca o item e
 * põe o número dele no centro. `aoClicar` abre o detalhe do segmento.
 */
export function Anel({
  segmentos, centro, legendaDoCentro, aoClicar,
}: {
  segmentos: { rotulo: string; valor: number; cor: string; chave?: string }[];
  centro: ReactNode;
  legendaDoCentro?: string;
  aoClicar?: (chave: string) => void;
}) {
  const [foco, setFoco] = useState<number | null>(null);
  const total = segmentos.reduce((a, s) => a + s.valor, 0) || 1;
  const R = 50;
  const C = 2 * Math.PI * R;
  const vao = segmentos.length > 1 ? 6 : 0;
  let acumulado = 0;
  const f = foco != null ? segmentos[foco] : null;
  const clicar = (s: typeof segmentos[number]) => aoClicar?.(s.chave ?? s.rotulo);
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-5 sm:flex-row" onMouseLeave={() => setFoco(null)}>
      <div className="gf-anel relative aspect-square h-full max-h-48 min-h-[120px] shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90 overflow-visible">
          <circle cx="60" cy="60" r={R} className="gf-anel-pista" />
          {segmentos.map((s, i) => {
            const comp = Math.max(0.001, (s.valor / total) * C - vao);
            const el = (
              <circle
                key={s.chave ?? s.rotulo}
                cx="60" cy="60" r={R}
                onMouseEnter={() => setFoco(i)}
                onClick={() => clicar(s)}
                className={`gf-anel-arco ${foco === i ? 'gf-em-foco' : ''} ${foco != null && foco !== i ? 'gf-apagado' : ''}`}
                style={{ stroke: s.cor, strokeDasharray: `${comp} ${C}`, strokeDashoffset: -acumulado, animationDelay: `${i * 90}ms` }}
              />
            );
            acumulado += (s.valor / total) * C;
            return el;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
          <span key={foco ?? 'total'} className="numero gf-troca text-[30px] leading-none text-dark-text">{f ? fmt(f.valor) : centro}</span>
          <span className={`mt-1 line-clamp-2 text-[10px] uppercase leading-tight tracking-wider ${TXT_FRACO}`}>
            {f ? `${Math.round((f.valor / total) * 100)}% · ${f.rotulo}` : legendaDoCentro}
          </span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-0.5 self-center">
        {segmentos.map((s, i) => (
          <li
            key={s.rotulo}
            onMouseEnter={() => setFoco(i)}
            onClick={() => clicar(s)}
            className={`gf-item flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] ${aoClicar ? 'cursor-pointer' : ''} ${foco === i ? 'bg-violet-500/5' : ''} ${foco != null && foco !== i ? 'opacity-50' : ''}`}
          >
            <i className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform" style={{ background: s.cor, boxShadow: `0 0 0 3px color-mix(in srgb, ${s.cor} 18%, transparent)`, transform: foco === i ? 'scale(1.3)' : undefined }} />
            <span className={`min-w-0 flex-1 truncate font-medium ${TXT_FRACO}`} title={s.rotulo}>{s.rotulo}</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">{Math.round((s.valor / total) * 100)}%</span>
            <b className="numero w-8 text-right text-[12.5px] font-normal text-dark-text">{fmt(s.valor)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Lista com barra fina de progresso; passar o mouse destaca a linha e mostra a fatia do total. */
export function ListaDeBarras({
  itens, formato = fmt, limite = 6, aoClicar, detalhe,
}: {
  itens: { rotulo: string; valor: number; cor?: string; chave?: string }[];
  formato?: (n: number) => string;
  limite?: number;
  aoClicar?: (chave: string) => void;
  /** Texto pequeno à direita do valor no lugar da fatia do total (ex.: "72% positivo"). */
  detalhe?: (item: { rotulo: string; valor: number; chave?: string }) => ReactNode;
}) {
  const lista = itens.slice(0, limite);
  const max = Math.max(1, ...lista.map((i) => i.valor));
  const total = itens.reduce((a, i) => a + i.valor, 0) || 1;
  return (
    <ul className="gf-lista space-y-1.5">
      {lista.map((it, i) => (
        <li
          key={`${it.rotulo}-${i}`}
          onClick={() => aoClicar?.(it.chave ?? it.rotulo)}
          className={`gf-item group -mx-2 grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-xl px-2 py-1.5 hover:bg-violet-500/5 ${aoClicar ? 'cursor-pointer' : ''}`}
        >
          <span className={`min-w-0 truncate text-[13px] font-medium ${TXT_FRACO} transition-colors group-hover:text-dark-text`} title={it.rotulo}>{it.rotulo}</span>
          <span className="flex items-baseline gap-2">
            <span className={`numero text-[11px] ${TXT_FRACO} ${detalhe ? '' : 'opacity-0 transition-opacity group-hover:opacity-100'}`}>
              {detalhe ? detalhe(it) : `${Math.round((it.valor / total) * 100)}%`}
            </span>
            <b className="numero text-[12.5px] font-normal text-dark-text">{formato(it.valor)}</b>
          </span>
          <span className="gf-trilho col-span-2">
            <i style={{ width: `${(it.valor / max) * 100}%`, background: it.cor, animationDelay: `${i * 60}ms` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Linha de lista com bolinha colorida, texto e um valor em fonte de número à direita. */
export function LinhaComBolinha({
  cor, titulo, detalhe, valor, onClick, dica, valorEmPilula = false,
}: {
  cor: string;
  titulo: ReactNode;
  detalhe?: ReactNode;
  valor?: ReactNode;
  onClick?: () => void;
  dica?: string;
  /** Valor numa pílula na cor da bolinha (ex.: "177 dias" em vermelho). */
  valorEmPilula?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      title={dica}
      className="gf-linha gf-item group flex w-full items-center gap-3 rounded-xl border-t border-slate-200/70 px-2.5 py-2.5 text-left first:border-t-0 hover:border-transparent hover:bg-violet-500/5 dark:border-white/5 [&:hover+*]:border-transparent"
    >
      <i className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-125" style={{ background: cor, boxShadow: `0 0 0 4px color-mix(in srgb, ${cor} 18%, transparent)` }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium text-dark-text transition-colors group-hover:text-violet-500">{titulo}</span>
        {detalhe && <span className={`block truncate text-[11.5px] ${TXT_FRACO}`}>{detalhe}</span>}
      </span>
      {valor != null && (valorEmPilula
        ? <span className="numero shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium" style={{ color: cor, background: `color-mix(in srgb, ${cor} 12%, transparent)` }}>{valor}</span>
        : <span className={`numero shrink-0 text-[11.5px] ${TXT_FRACO} transition-colors group-hover:text-dark-text`}>{valor}</span>)}
    </Tag>
  );
}

/**
 * Cartão de indicador no molde do painel de teste ("Leads novos 47 · +12 desde ontem" com as
 * barras embaixo): título em letra normal com pílula, número grande em fonte de número, uma
 * linha de apoio e, ocupando o resto do cartão, o visual. Sem visual, o número fica sozinho.
 */
export function CartaoKpi({
  titulo, pilula, valor, apoio, visual, alerta = false, className = '', valorEmTexto = false,
}: {
  titulo: string;
  pilula?: string;
  valor: ReactNode;
  apoio?: ReactNode;
  visual?: ReactNode;
  alerta?: boolean;
  className?: string;
  /** Valor é um nome, não um número: fonte normal, menor, até 2 linhas. */
  valorEmTexto?: boolean;
}) {
  return (
    <div className={`gf-cartao flex h-full min-h-0 flex-col p-5 ${alerta ? 'gf-cartao--alerta' : ''} ${className}`}>
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <span className="truncate text-[15px] font-semibold tracking-tight text-dark-text">{titulo}</span>
        {pilula && <span className={`pilula-cartao ${alerta ? 'pilula-cartao--alerta' : ''}`}>{pilula}</span>}
      </div>
      {valorEmTexto
        ? <div className="mt-3 line-clamp-2 shrink-0 text-[22px] font-semibold leading-tight tracking-tight text-dark-text" title={typeof valor === 'string' ? valor : undefined}>{valor}</div>
        : <div className="numero mt-3 shrink-0 truncate text-[38px] leading-none text-dark-text">{valor}</div>}
      {apoio && <div className={`mt-2 shrink-0 truncate text-[13px] ${TXT_FRACO}`}>{apoio}</div>}
      {/* Sem overflow-hidden: a dica das barras sai por cima e seria cortada. */}
      {visual && <div className="mt-4 flex min-h-[32px] flex-1 flex-col justify-end">{visual}</div>}
    </div>
  );
}

/** Barras que enchem o espaço do cartão; a última (o dia mais recente) cheia. Passar o mouse mostra o dia. */
export function BarrasDoKpi({ valores, rotulos, unidade = '', formato = fmt }: { valores: number[]; rotulos?: string[]; unidade?: string; formato?: (n: number) => string }) {
  const [foco, setFoco] = useState<number | null>(null);
  if (valores.length < 2) return null;
  const max = Math.max(1, ...valores);
  return (
    <div className="relative h-full min-h-[48px]" onMouseLeave={() => setFoco(null)}>
      <div className={`gf-kpi-barras flex h-full items-end gap-[5px] ${foco != null ? 'gf-com-foco' : ''}`}>
        {valores.map((v, i) => (
          <i
            key={i}
            onMouseEnter={() => setFoco(i)}
            className={`${i === valores.length - 1 ? 'gf-kpi-barras--fim' : ''} ${foco === i ? 'gf-em-foco' : ''}`}
            style={{ height: `${Math.max(5, (v / max) * 100)}%`, animationDelay: `${i * 30}ms` }}
          />
        ))}
      </div>
      {foco != null && (
        <Dica
          x={((foco + 0.5) / valores.length) * 100}
          y={`calc(${Math.max(5, (valores[foco] / max) * 100)}% + 8px)`}
          titulo={rotulos?.[foco]}
          linhas={[<><b className="numero font-normal">{formato(valores[foco])}</b> {unidade}</>]}
        />
      )}
    </div>
  );
}

/**
 * Uma barra dividida em partes, com legenda. Passar o mouse mostra a parte. Sem `cor`, a parte
 * `cheio` vai na cor de destaque e as outras em destaque claro.
 */
export function DivisaoDoKpi({ partes }: { partes: { rotulo: string; valor: number; cheio?: boolean; cor?: string }[] }) {
  const [foco, setFoco] = useState<number | null>(null);
  const total = partes.reduce((a, p) => a + p.valor, 0);
  const corDe = (p: typeof partes[number]) => p.cor || (p.cheio ? 'rgb(var(--accent-color))' : 'rgb(var(--accent-color) / .35)');
  let antes = 0;
  return (
    <div className="space-y-2.5" onMouseLeave={() => setFoco(null)}>
      <div className="relative">
        <div className={`flex h-3 gap-[3px] overflow-hidden rounded-full bg-violet-500/10 ${foco != null ? 'gf-com-foco' : ''}`}>
          {total > 0 && partes.filter(p => p.valor > 0).map((p) => {
            const i = partes.indexOf(p);
            return (
              <i
                key={p.rotulo}
                onMouseEnter={() => setFoco(i)}
                className={`gf-divisao h-full first:rounded-l-full last:rounded-r-full ${foco === i ? 'gf-em-foco' : ''}`}
                style={{ width: `${(p.valor / total) * 100}%`, background: corDe(p) }}
              />
            );
          })}
        </div>
        {foco != null && total > 0 && (() => {
          for (let k = 0; k < foco; k++) antes += partes[k].valor;
          const meio = ((antes + partes[foco].valor / 2) / total) * 100;
          return (
            <Dica
              x={meio}
              y="calc(100% + 8px)"
              titulo={partes[foco].rotulo}
              linhas={[<><b className="numero font-normal">{fmt(partes[foco].valor)}</b> · {Math.round((partes[foco].valor / total) * 100)}%</>]}
            />
          );
        })()}
      </div>
      <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] ${TXT_FRACO}`}>
        {partes.map((p, i) => (
          <span key={p.rotulo} onMouseEnter={() => setFoco(i)} className={`flex items-center gap-1.5 transition-opacity ${foco != null && foco !== i ? 'opacity-50' : ''}`}>
            <i className="h-2 w-2 rounded-full" style={{ background: corDe(p) }} />
            {p.rotulo} <b className="numero font-normal text-dark-text">{fmt(p.valor)}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Linha com degradê para cartão de indicador. Pontos sem valor (null) ficam de fora. Passar o
 * mouse marca o ponto mais próximo com uma guia, um ponto e a dica.
 */
/**
 * Suaviza uma série só para DESENHAR (média gaussiana de raio `raio`). Série diária de carteira
 * anda em degraus inteiros e vira escada; a dica e a legenda continuam com o número real.
 */
function suavizarSerie(vals: number[], raio: number) {
  if (raio <= 0 || vals.length < 3) return vals;
  const sigma = raio / 2;
  return vals.map((_, i) => {
    let soma = 0, peso = 0;
    for (let k = -raio; k <= raio; k++) {
      const j = i + k;
      if (j < 0 || j >= vals.length) continue;
      const w = Math.exp(-(k * k) / (2 * sigma * sigma));
      soma += vals[j] * w; peso += w;
    }
    return soma / peso;
  });
}

export function LinhaDoKpi({
  valores, rotulos, formato = fmt, id = 'kpi', cor = 'rgb(var(--accent-color))', suave = 3,
}: {
  valores: (number | null)[];
  rotulos?: string[];
  formato?: (n: number) => string;
  id?: string;
  cor?: string;
  /** Raio da suavização do traço (0 = sem). A dica mostra sempre o valor real. */
  suave?: number;
}) {
  const [foco, setFoco] = useState<number | null>(null);
  const pts = valores.map((v, i) => (v == null ? null : { i, v })).filter(Boolean) as { i: number; v: number }[];
  if (pts.length < 2) return null;
  const W = 300, H = 100, pad = 6;
  const liso = suavizarSerie(pts.map((p) => p.v), suave);
  const max = Math.max(...liso), min = Math.min(...liso);
  const amp = max - min || 1;
  const xy = pts.map((p, k) => ({
    x: (p.i / Math.max(1, valores.length - 1)) * W,
    y: pad + (1 - (liso[k] - min) / amp) * (H - pad * 2 - 18) + 18,
    ...p,
  }));
  const d = caminhoMonotono(xy);
  const area = `${d} L ${xy[xy.length - 1].x},${H} L ${xy[0].x},${H} Z`;
  const p = foco != null ? xy[foco] : null;
  const mover = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    let melhor = 0;
    xy.forEach((q, k) => { if (Math.abs(q.x - x) < Math.abs(xy[melhor].x - x)) melhor = k; });
    setFoco(melhor);
  };
  return (
    <div className="relative h-full min-h-[56px] cursor-crosshair" onMouseMove={mover} onMouseLeave={() => setFoco(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="gf-linha-kpi h-full w-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={`gf-linha-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity="0.24" />
            <stop offset="100%" stopColor={cor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#gf-linha-${id})`} className="gf-linha-area gf-morfa" />
        <path d={d} fill="none" stroke={cor} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="gf-linha-traco gf-morfa" pathLength={1} />
      </svg>
      {p && (
        <>
          <span className="pointer-events-none absolute bottom-0 top-0 w-px bg-violet-500/25" style={{ left: `${(p.x / W) * 100}%` }} />
          <span className="gf-ponto pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-dark-card" style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%`, background: cor }} />
          <Dica x={(p.x / W) * 100} y={`calc(${100 - (p.y / H) * 100}% + 12px)`} titulo={rotulos?.[p.i]} linhas={[<b key="v" className="numero font-normal">{formato(p.v)}</b>]} />
        </>
      )}
    </div>
  );
}

/**
 * Barras verticais por categoria: número em cima, nome embaixo, a maior cheia e as outras
 * claras. Passar o mouse mostra o número e a fatia do total.
 */
export function BarrasPorCategoria({
  itens, unidade = '', limite = 8, formato = fmt, aoClicar,
}: {
  itens: { rotulo: string; valor: number; chave?: string }[];
  unidade?: string;
  limite?: number;
  formato?: (n: number) => string;
  aoClicar?: (chave: string) => void;
}) {
  const [foco, setFoco] = useState<number | null>(null);
  const lista = itens.slice(0, limite);
  if (lista.length === 0) return null;
  const max = Math.max(1, ...lista.map((i) => i.valor));
  const total = itens.reduce((a, i) => a + i.valor, 0) || 1;
  const maior = lista.reduce((m, it, i) => (it.valor > lista[m].valor ? i : m), 0);
  return (
    <div className="flex h-full min-h-[160px] flex-col" onMouseLeave={() => setFoco(null)}>
      <div className="relative min-h-0 flex-1">
        <div className={`flex h-full items-end justify-center gap-3 ${foco != null ? 'gf-com-foco' : ''}`}>
          {lista.map((it, i) => (
            <div
              key={`${it.rotulo}-${i}`}
              onMouseEnter={() => setFoco(i)}
              onClick={() => aoClicar?.(it.chave ?? it.rotulo)}
              className={`gf-categoria flex h-full min-w-0 max-w-[88px] flex-1 flex-col items-center justify-end ${aoClicar ? 'cursor-pointer' : ''} ${foco === i ? 'gf-em-foco' : ''}`}
            >
              <span className="numero mb-1.5 whitespace-nowrap text-[12px] text-dark-text">{formato(it.valor)}</span>
              <span
                className={`gf-barra w-full ${i === maior ? 'gf-barra--pico' : ''}`}
                style={{ height: `${Math.max(3, (it.valor / max) * 100)}%`, maxWidth: 'none', animationDelay: `${i * 70}ms` }}
              />
            </div>
          ))}
        </div>
        {foco != null && (
          <Dica
            x={((foco + 0.5) / lista.length) * 100}
            y={`calc(${Math.max(3, (lista[foco].valor / max) * 100)}% + 30px)`}
            titulo={lista[foco].rotulo}
            linhas={[<><b className="numero font-normal">{formato(lista[foco].valor)}</b> {unidade} · {Math.round((lista[foco].valor / total) * 100)}% do total</>]}
          />
        )}
      </div>
      <div className="mt-2 flex justify-center gap-3">
        {lista.map((it, i) => (
          <span
            key={`r-${it.rotulo}-${i}`}
            title={it.rotulo}
            className={`min-w-0 max-w-[88px] flex-1 truncate text-center text-[11.5px] transition-colors ${foco === i ? 'font-medium text-dark-text' : TXT_FRACO}`}
          >
            {it.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Curva monotônica (como a `monotone` do recharts): não passa do ponto, então série em degrau não "afunda" abaixo de zero. */
function caminhoMonotono(p: { x: number; y: number }[]) {
  const n = p.length;
  if (n < 2) return '';
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = p[i + 1].x - p[i].x || 1e-6; m[i] = (p[i + 1].y - p[i].y) / dx[i]; }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  }
  t[n - 1] = m[n - 2];
  let d = `M ${p[0].x},${p[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    d += ` C ${p[i].x + dx[i] / 3},${p[i].y + (t[i] * dx[i]) / 3} ${p[i + 1].x - dx[i] / 3},${p[i + 1].y - (t[i + 1] * dx[i]) / 3} ${p[i + 1].x},${p[i + 1].y}`;
  }
  return d;
}

/**
 * Várias séries no tempo, com eixos: linha fina com degradê embaixo, legenda com o valor de
 * hoje e, no mouse, uma guia vertical com todas as séries do dia. Feito para percentuais
 * (eixo de 0 até o teto arredondado), mas aceita qualquer número via `formato`.
 */
export function LinhasNoTempo({
  series, rotulos, formato = (n: number) => `${n}%`, id = 'tempo', marcasX = 8, suave = 3,
}: {
  series: { rotulo: string; cor: string; valores: number[]; detalhe?: (i: number) => ReactNode }[];
  rotulos: string[];
  formato?: (n: number) => string;
  id?: string;
  marcasX?: number;
  /** Raio da suavização do traço (0 = sem). Legenda e dica mostram o valor real. */
  suave?: number;
}) {
  const [foco, setFoco] = useState<number | null>(null);
  const n = rotulos.length;
  if (n < 2 || series.length === 0) return null;
  const W = 1000, H = 300;
  const maior = Math.max(1, ...series.flatMap((s) => s.valores));
  const passo = maior <= 20 ? 5 : maior <= 60 ? 15 : maior <= 100 ? 25 : Math.ceil(maior / 4 / 10) * 10;
  const teto = Math.ceil(maior / passo) * passo;
  const linhasY = Array.from({ length: teto / passo + 1 }, (_, i) => i * passo);
  const xDe = (i: number) => (i / (n - 1)) * W;
  const yDe = (v: number) => H - (v / teto) * H;
  const desenhos = series.map((s) => {
    const liso = suavizarSerie(s.valores, suave);
    const pts = liso.map((v, i) => ({ x: xDe(i), y: yDe(v) }));
    const d = caminhoMonotono(pts);
    return { ...s, liso, d, area: `${d} L ${W},${H} L 0,${H} Z` };
  });
  const marcas = Array.from(new Set(Array.from({ length: Math.min(marcasX, n) }, (_, k) => Math.round((k / (Math.min(marcasX, n) - 1)) * (n - 1)))));
  const mover = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (n - 1));
    setFoco(Math.max(0, Math.min(n - 1, i)));
  };
  const xPct = foco != null ? (foco / (n - 1)) * 100 : 0;

  return (
    <div className="flex h-full min-h-[220px] flex-col">
      {/* Legenda com o valor de hoje (ou do dia em foco) */}
      <div className="mb-4 flex shrink-0 flex-wrap gap-x-5 gap-y-1.5">
        {series.map((s) => {
          const i = foco ?? n - 1;
          return (
            <span key={s.rotulo} className="inline-flex items-center gap-2 text-[12.5px]">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.cor }} />
              <span className={TXT_FRACO}>{s.rotulo}</span>
              <span className="numero text-dark-text">{formato(s.valores[i])}</span>
            </span>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Eixo Y */}
        <div className="relative w-9 shrink-0">
          {linhasY.map((v) => (
            <span key={v} className={`numero absolute right-2 -translate-y-1/2 text-[10.5px] ${TXT_FRACO}`} style={{ top: `${(1 - v / teto) * 100}%` }}>{formato(v)}</span>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 cursor-crosshair" onMouseMove={mover} onMouseLeave={() => setFoco(null)}>
            {linhasY.map((v) => (
              <span key={v} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-black/[.06] dark:border-white/[.06]" style={{ top: `${(1 - v / teto) * 100}%` }} />
            ))}
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
              <defs>
                {desenhos.map((s, k) => (
                  <linearGradient key={k} id={`gf-${id}-${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.cor} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={s.cor} stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>
              {desenhos.map((s, k) => <path key={`a${k}`} d={s.area} fill={`url(#gf-${id}-${k})`} className="gf-linha-area gf-morfa" />)}
              {desenhos.map((s, k) => (
                <path key={`l${k}`} d={s.d} fill="none" stroke={s.cor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="gf-linha-traco gf-morfa" pathLength={1} />
              ))}
            </svg>
            {foco != null && (
              <>
                <span className="pointer-events-none absolute bottom-0 top-0 w-px bg-violet-500/30" style={{ left: `${xPct}%` }} />
                {desenhos.map((s) => (
                  <span
                    key={s.rotulo}
                    className="gf-ponto pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-dark-card"
                    style={{ left: `${xPct}%`, top: `${(1 - s.liso[foco] / teto) * 100}%`, background: s.cor, boxShadow: 'none' }}
                  />
                ))}
                <Dica
                  x={xPct}
                  y="0px"
                  embaixo
                  titulo={rotulos[foco]}
                  linhas={series.map((s) => (
                    <span key={s.rotulo} className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.cor }} />
                      <span className={TXT_FRACO}>{s.rotulo}</span>
                      <b className="numero font-normal">{formato(s.valores[foco])}</b>
                      {s.detalhe && <span className={`text-[11px] ${TXT_FRACO}`}>{s.detalhe(foco)}</span>}
                    </span>
                  ))}
                />
              </>
            )}
          </div>
          {/* Eixo X */}
          <div className="relative mt-2 h-4 shrink-0">
            {marcas.map((i) => (
              <span
                key={i}
                className={`numero absolute text-[10.5px] ${TXT_FRACO}`}
                style={{ left: `${(i / (n - 1)) * 100}%`, transform: `translateX(${i === 0 ? '0' : i === n - 1 ? '-100%' : '-50%'})` }}
              >{rotulos[i]}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
