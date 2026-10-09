import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, LockOpen, CheckCircle2, XCircle, AlertTriangle, Info, Loader2, ChevronDown } from 'lucide-react';
import { confirmDialog, promptDialog } from '@/src/lib/confirm';
import { toast } from '@/src/lib/toast';

/**
 * Aba "Fechamento" do DFC. Cada mês passa por conferências (servidor:
 * `src/routes/fechamento.ts`). Sem bloqueio, o superadmin fecha: o mês fica
 * travado — categoria, valor, data e pares não mudam mais — e os totais do DFC
 * ficam congelados. Reabrir exige motivo e fica no histórico.
 */

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const brl = (v: any) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataHora = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const nomeLongo = (m: string) => `${MESES_LONGOS[Number(m.slice(5, 7)) - 1]}/${m.slice(0, 4)}`;
const mesAtual = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 7);

const ICONE: Record<string, { i: React.ReactNode; cls: string; rotulo: string }> = {
  ok: { i: <CheckCircle2 size={14} />, cls: 'text-emerald-500 bg-emerald-500/10', rotulo: 'OK' },
  bloqueia: { i: <XCircle size={14} />, cls: 'text-rose-500 bg-rose-500/10', rotulo: 'Impede o fechamento' },
  atencao: { i: <AlertTriangle size={14} />, cls: 'text-amber-500 bg-amber-500/10', rotulo: 'Atenção' },
  info: { i: <Info size={14} />, cls: 'text-slate-500 bg-slate-500/10', rotulo: 'Informativo' },
};

const GRUPOS: Record<string, string> = {
  '01': 'Receitas operacionais', '02': 'Despesas operacionais', '03': 'Receitas não operacionais',
  '04': 'Despesas não operacionais', '05': 'Distribuição de lucros', '99': 'Transferências (fora do resultado)',
};

const DreFechamento: React.FC = () => {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [meses, setMeses] = useState<Record<string, any>>({});
  const [podeFechar, setPodeFechar] = useState(false);
  const [sel, setSel] = useState<string>(() => {
    // padrão: o último mês terminado. Dia 1 do mês anterior, em hora local — setMonth(m-1) num
    // dia 31 transbordava para o mês corrente, e toISOString (UTC) virava o mês à noite.
    const h = new Date(); const d = new Date(h.getFullYear(), h.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  // Trocar o ano leva o mês selecionado junto (antes o detalhe ficava no mês do ano anterior
  // e nenhum mês da grade aparecia marcado)
  useEffect(() => { setSel(s => (s.slice(0, 4) === String(ano) ? s : `${ano}-${s.slice(5, 7)}`)); }, [ano]);
  const [det, setDet] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [agindo, setAgindo] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  const carregarAno = useCallback(async () => {
    const r = await fetch(`/api/financeiro/fechamento?ano=${ano}`);
    if (!r.ok) return;
    const d = await r.json();
    setMeses(Object.fromEntries((d.meses || []).map((m: any) => [m.month, m])));
    setPodeFechar(!!d.pode_fechar);
  }, [ano]);

  const carregarMes = useCallback(async () => {
    setCarregando(true); setDet(null);
    try {
      const r = await fetch(`/api/financeiro/fechamento/${sel}`);
      if (r.ok) setDet(await r.json());
    } finally { setCarregando(false); }
  }, [sel]);

  useEffect(() => { carregarAno(); }, [carregarAno]);
  useEffect(() => { carregarMes(); }, [carregarMes]);

  const fechado = det?.fechamento?.status === 'fechado';
  const terminou = sel < mesAtual();
  const bloqueios = (det?.checks || []).filter((c: any) => c.status === 'bloqueia');
  const avisos = (det?.checks || []).filter((c: any) => c.status === 'atencao');

  const fechar = async () => {
    if (avisos.length) {
      const ok = await confirmDialog({
        title: `Fechar ${nomeLongo(sel)} com avisos?`,
        message: `${avisos.map((a: any) => `• ${a.titulo}: ${a.detalhe}`).join('\n')}\n\nDepois de fechado, categoria, valor e data dos lançamentos do mês ficam travados.`,
        confirmText: 'Fechar mesmo assim',
      });
      if (!ok) return;
    } else {
      const ok = await confirmDialog({
        title: `Fechar ${nomeLongo(sel)}?`,
        message: 'Todas as conferências passaram. Depois de fechado, categoria, valor e data dos lançamentos do mês ficam travados e os totais do DFC ficam congelados.',
        confirmText: 'Fechar mês',
      });
      if (!ok) return;
    }
    setAgindo(true);
    try {
      const r = await fetch(`/api/financeiro/fechamento/${sel}/fechar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmar_avisos: avisos.length > 0 }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'Não foi possível fechar.'); return; }
      toast.success(`${nomeLongo(sel)} fechado.`);
      await Promise.all([carregarAno(), carregarMes()]);
    } finally { setAgindo(false); }
  };

  const reabrir = async () => {
    const motivo = await promptDialog({
      title: `Reabrir ${nomeLongo(sel)}`,
      message: 'O mês volta a aceitar alterações. O motivo fica registrado no histórico.',
      placeholder: 'Ex.: fatura do Sicredi chegou com lançamento faltando',
      confirmText: 'Reabrir',
    });
    if (!motivo) return;
    setAgindo(true);
    try {
      const r = await fetch(`/api/financeiro/fechamento/${sel}/reabrir`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motivo }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(d.error || 'Não foi possível reabrir.'); return; }
      toast.success(`${nomeLongo(sel)} reaberto.`);
      await Promise.all([carregarAno(), carregarMes()]);
    } finally { setAgindo(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Fechamento do mês</h2>
          <p className="text-[11px] text-slate-500">Conferências antes de travar o mês · fechado, os números do DFC não mudam mais sem reabrir</p>
        </div>
        {/* Ano — um controle só, com as setas dentro */}
        <div className="h-10 flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
          <button onClick={() => setAno(a => a - 1)} title="Ano anterior" className="w-9 h-full flex items-center justify-center rounded-l-xl text-slate-400 hover:text-violet-500"><ChevronLeft size={15} /></button>
          <span className="text-sm font-bold text-slate-900 dark:text-white w-12 text-center tabular-nums">{ano}</span>
          <button onClick={() => setAno(a => a + 1)} title="Próximo ano" className="w-9 h-full flex items-center justify-center rounded-r-xl text-slate-400 hover:text-violet-500"><ChevronRight size={15} /></button>
        </div>
      </div>

      {/* Os 12 meses */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 2xl:grid-cols-12 gap-2">
        {MESES.map((nome, i) => {
          const m = `${ano}-${String(i + 1).padStart(2, '0')}`;
          const f = meses[m];
          const st = f?.status === 'fechado' ? 'fechado' : m >= mesAtual() ? (m === mesAtual() ? 'corrente' : 'futuro') : 'aberto';
          return (
            <button key={m} onClick={() => setSel(m)}
              className={`rounded-xl border px-2.5 py-2.5 text-left transition-colors ${sel === m ? 'border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-500/30' : 'border-slate-200 dark:border-white/5 bg-white dark:bg-dark-card/60 hover:border-violet-500/30'}`}>
              <p className={`text-xs font-bold ${sel === m ? 'text-violet-600 dark:text-violet-300' : 'text-slate-900 dark:text-white'}`}>{nome}</p>
              <p className={`mt-1.5 inline-flex items-center gap-1 ${st === 'futuro' ? 'text-[10px] font-semibold text-slate-400' : `h-5 px-2 rounded-full text-[10px] font-semibold ${
                st === 'fechado' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : st === 'aberto' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-500/10 text-slate-500'}`}`}>
                {st === 'fechado' ? <><Lock size={10} /> Fechado</> : st === 'aberto' ? <><LockOpen size={10} /> Aberto</> : st === 'corrente' ? 'Em curso' : '—'}
              </p>
              {f?.entraram_depois > 0 && <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-1">+{f.entraram_depois} depois</p>}
            </button>
          );
        })}
      </div>

      {/* Detalhe do mês */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-dark-card/60">
        <div className="flex items-start justify-between gap-4 flex-wrap px-5 py-4 border-b border-slate-100 dark:border-white/5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">{nomeLongo(sel)}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {fechado
                ? <>Fechado em {dataHora(det.fechamento.closed_at)} por {String(det.fechamento.closed_by || '—').split('@')[0]}</>
                : !terminou ? 'O mês ainda não terminou — dá para conferir, não para fechar.'
                : bloqueios.length ? `${bloqueios.length} conferência(s) impedem o fechamento.`
                : avisos.length ? `Pronto para fechar, com ${avisos.length} aviso(s).` : 'Pronto para fechar.'}
            </p>
            {meses[sel]?.entraram_depois > 0 && (
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                {meses[sel].entraram_depois} lançamento(s) da conta Asaas entraram depois do fechamento — reabra para classificar.
              </p>
            )}
            {meses[sel]?.bloqueios > 0 && fechado && (
              <p className="text-[11px] text-slate-500 mt-1">A trava segurou {meses[sel].bloqueios} tentativa(s) de alteração desde o fechamento.</p>
            )}
          </div>
          {podeFechar && terminou && (
            fechado ? (
              <button onClick={reabrir} disabled={agindo}
                className="h-10 flex items-center gap-2 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-300 transition-colors disabled:opacity-40">
                <LockOpen size={15} /> Reabrir
              </button>
            ) : (
              <button onClick={fechar} disabled={agindo || carregando || bloqueios.length > 0}
                title={bloqueios.length ? 'Resolva as conferências em vermelho' : undefined}
                className="h-10 flex items-center gap-2 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {agindo ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />} Fechar mês
              </button>
            )
          )}
        </div>

        {carregando || !det ? (
          <div className="py-16 flex justify-center"><Loader2 size={22} className="animate-spin text-violet-500" /></div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_320px]">
            {/* Conferências */}
            <div className="p-2">
              {det.checks.map((c: any) => {
                const ic = ICONE[c.status];
                const temItens = c.itens && c.itens.length > 0;
                return (
                  <div key={c.id} className="rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                    <button onClick={() => temItens && setAberto(aberto === c.id ? null : c.id)}
                      className={`w-full flex items-start gap-3 px-3 py-3 text-left ${temItens ? 'cursor-pointer' : 'cursor-default'}`}>
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ic.cls}`}>{ic.i}</span>
                      <span className="flex-1 min-w-0 pt-0.5">
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{c.titulo}</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">{c.detalhe}</span>
                      </span>
                      {temItens && <ChevronDown size={15} className={`mt-1.5 text-slate-400 transition-transform ${aberto === c.id ? 'rotate-180' : ''}`} />}
                    </button>
                    {aberto === c.id && temItens && (
                      <div className="mx-3 mb-3 ml-[3.25rem] rounded-xl border border-slate-200 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5 max-h-72 overflow-y-auto">
                        {c.itens.map((it: any, k: number) => (
                          <div key={it.id || k} className="flex items-center gap-3 px-3 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                            <span className="text-slate-500 w-20 shrink-0 tabular-nums">
                              {String(it.data || it.vencimento || '').slice(0, 10).split('-').reverse().join('/')}
                            </span>
                            <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-300" title={it.descricao || it.conta}>
                              {it.descricao || it.conta}
                              {it.categoria && <span className="text-slate-500"> · {it.structure} {it.categoria}</span>}
                            </span>
                            <span className={`tabular-nums font-bold shrink-0 ${it.type === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                              {it.type === 1 ? '+' : ''}{brl(it.valor)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Totais (ao vivo ou congelados) e histórico */}
            <div className="border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-white/5 p-5 space-y-5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  {fechado ? 'Totais congelados no fechamento' : 'Totais do DFC agora'}
                </p>
                {(() => {
                  const t = fechado ? det.fechamento.totais : det.totais;
                  if (!t) return null;
                  return (
                    <div className="space-y-2 text-xs">
                      {Object.entries(t.grupos || {}).map(([g, v]: any) => (
                        <div key={g} className="flex justify-between gap-3">
                          <span className="text-slate-500">{GRUPOS[g] || g}</span>
                          <span className={`tabular-nums font-semibold ${v >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>{brl(v)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/5 font-bold">
                        <span className="text-slate-900 dark:text-white">Geração de caixa</span>
                        <span className={`tabular-nums ${t.geracao >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>{brl(t.geracao)}</span>
                      </div>
                      {t.saldo_final !== null && (
                        <div className="flex justify-between gap-3 text-slate-500">
                          <span>Saldo Asaas no fim do mês</span><span className="tabular-nums">{brl(t.saldo_final)}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {det.historico?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Histórico</p>
                  <div className="space-y-2.5">
                    {det.historico.map((h: any, i: number) => (
                      <div key={i} className="text-[11px]">
                        <p className="text-slate-600 dark:text-slate-300">
                          {(() => {
                            // cada ação com o seu nome (antes, tudo que não era "fechar" saía como "Reaberto",
                            // inclusive o recálculo dos totais de janeiro em 03/10/2026)
                            const ACAO: Record<string, { t: string; c: string }> = {
                              fechar: { t: 'Fechado', c: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                              reabrir: { t: 'Reaberto', c: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                              recalcular: { t: 'Totais recalculados', c: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
                            };
                            const a = ACAO[h.acao] || { t: h.acao, c: 'bg-slate-500/10 text-slate-500' };
                            return <span className={`inline-flex items-center h-5 px-2 mr-0.5 rounded-full text-[10px] font-semibold ${a.c}`}>{a.t}</span>;
                          })()}
                          {' '}· {dataHora(h.em)} · {String(h.por || '—').split('@')[0]}
                        </p>
                        {h.motivo && <p className="text-slate-500 mt-0.5">“{h.motivo}”</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DreFechamento;
