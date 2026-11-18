import React from 'react';
import { Copy, Trash2, CalendarOff, CalendarDays, ArrowRight, Loader2 } from 'lucide-react';
import { agruparPorDia, canalDe, textoDuracao, type Passo } from './regras';

/** Cartão de uma sequência na lista: nome, descrição, números e a linha do tempo em miniatura. */
export function CartaoSequencia({ seq, onEditar, onDuplicar, onExcluir, duplicando }: {
  seq: any;
  onEditar: () => void;
  onDuplicar: () => void;
  onExcluir: () => void;
  duplicando: boolean;
}) {
  const steps: Passo[] = seq.steps || [];
  const grupos = agruparPorDia(steps);
  const pular = seq.skip_weekends ?? true;

  // Contagem por canal, na ordem em que aparecem.
  const porCanal: { tipo: string; n: number }[] = [];
  steps.forEach(s => {
    const t = canalDe(s.type).tipo;
    const c = porCanal.find(x => x.tipo === t);
    if (c) c.n++; else porCanal.push({ tipo: t, n: 1 });
  });

  const parar = (e: React.MouseEvent, fn: () => void) => { e.stopPropagation(); fn(); };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onEditar}
      onKeyDown={e => { if (e.key === 'Enter') onEditar(); }}
      className="gf-cartao gf-cartao--sobe p-5 flex flex-col gap-4 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
    >
      {/* Nome, descrição e ações */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-tight text-dark-text truncate">{seq.name}</h3>
          {seq.description
            ? <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-slate-400 line-clamp-2">{seq.description}</p>
            : <p className="mt-0.5 text-[12.5px] text-slate-400 dark:text-slate-500">Sem descrição</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
          <button
            type="button"
            onClick={e => parar(e, onDuplicar)}
            disabled={duplicando}
            title="Duplicar sequência"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-50"
          >
            {duplicando ? <Loader2 size={15} className="animate-spin" /> : <Copy size={15} />}
          </button>
          <button
            type="button"
            onClick={e => parar(e, onExcluir)}
            title="Excluir sequência"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Números */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] text-slate-500 dark:text-slate-400">
        <span><span className="numero text-[14px] font-semibold text-dark-text">{steps.length}</span> {steps.length === 1 ? 'passo' : 'passos'}</span>
        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        <span>{steps.length ? <>dura <span className="font-semibold text-dark-text">{textoDuracao(steps, pular)}</span></> : 'sem passos'}</span>
        {pular ? (
          <span className="pilula-cartao gap-1"><CalendarOff size={11} /> Pula fim de semana</span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full bg-slate-500/10 text-[11.5px] font-medium"><CalendarDays size={11} /> Todos os dias</span>
        )}
      </div>

      {/* Linha do tempo em miniatura: um bloco por dia, um ícone por passo */}
      {grupos.length > 0 && (
        <div className="flex flex-wrap items-start gap-y-2">
          {grupos.map((g, gi) => (
            <React.Fragment key={gi}>
              {gi > 0 && <div className="h-px w-3 sm:w-4 bg-black/10 dark:bg-white/15 mt-3 shrink-0" />}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="flex items-center gap-0.5">
                  {g.indices.slice(0, 4).map(i => {
                    const c = canalDe(steps[i].type);
                    return (
                      <span key={i} title={`${c.tipo} · ${steps[i].title || 'sem título'}`} className={`w-6 h-6 rounded-md flex items-center justify-center ${c.fundo} ${c.texto}`}>
                        <c.Icone size={13} />
                      </span>
                    );
                  })}
                  {g.indices.length > 4 && (
                    <span className="h-6 px-1 rounded-md bg-slate-500/10 text-[10.5px] font-semibold text-slate-500 flex items-center">+{g.indices.length - 4}</span>
                  )}
                </div>
                <span className="numero text-[10.5px] text-slate-500 dark:text-slate-400">D{g.dia}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Rodapé: canais e entrar */}
      <div className="mt-auto pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
        <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
          {porCanal.length ? porCanal.map(c => `${c.n} ${c.tipo}`).join(' · ') : 'Nenhum passo ainda'}
        </p>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-violet-600 dark:text-violet-400 shrink-0">
          Editar <ArrowRight size={13} />
        </span>
      </div>
    </div>
  );
}

export default CartaoSequencia;
