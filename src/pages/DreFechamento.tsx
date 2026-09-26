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
  ok: { i: <CheckCircle2 size={16} />, cls: 'text-emerald-400', rotulo: 'OK' },
  bloqueia: { i: <XCircle size={16} />, cls: 'text-rose-400', rotulo: 'Impede o fechamento' },
  atencao: { i: <AlertTriangle size={16} />, cls: 'text-amber-400', rotulo: 'Atenção' },
  info: { i: <Info size={16} />, cls: 'text-slate-400', rotulo: 'Informativo' },
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
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);               // padrão: o último mês terminado
  });
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
          <h2 className="text-sm font-bold text-dark-text">Fechamento do mês</h2>
          <p className="text-xs text-slate-500">Conferências antes de travar o mês · fechado, os números do DFC não mudam mais sem reabrir</p>
        </div>
        <div className="flex items-center gap-1 bg-dark-card border border-white/10 rounded-xl px-1 py-0.5">
          <button onClick={() => setAno(a => a - 1)} className="p-1.5 text-slate-400 hover:text-violet-400"><ChevronLeft size={14} /></button>
          <span className="text-sm font-bold text-dark-text px-1 tabular-nums">{ano}</span>
          <button onClick={() => setAno(a => a + 1)} className="p-1.5 text-slate-400 hover:text-violet-400"><ChevronRight size={14} /></button>
        </div>
      </div>

      {/* Os 12 meses */}
      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
        {MESES.map((nome, i) => {
          const m = `${ano}-${String(i + 1).padStart(2, '0')}`;
          const f = meses[m];
          const st = f?.status === 'fechado' ? 'fechado' : m >= mesAtual() ? (m === mesAtual() ? 'corrente' : 'futuro') : 'aberto';
          return (
            <button key={m} onClick={() => setSel(m)}
              className={`rounded-xl border px-2 py-2.5 text-left transition-all ${sel === m ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 bg-dark-card hover:border-white/20'}`}>
              <p className="text-xs font-bold text-dark-text">{nome}</p>
              <p className={`mt-1 flex items-center gap-1 text-[10px] font-bold ${
                st === 'fechado' ? 'text-emerald-400' : st === 'aberto' ? 'text-amber-400' : 'text-slate-500'}`}>
                {st === 'fechado' ? <><Lock size={10} /> Fechado</> : st === 'aberto' ? <><LockOpen size={10} /> Aberto</> : st === 'corrente' ? 'Em curso' : '—'}
              </p>
              {f?.entraram_depois > 0 && <p className="text-[9px] text-amber-400 mt-0.5">+{f.entraram_depois} depois</p>}
            </button>
          );
        })}
      </div>

      {/* Detalhe do mês */}
      <div className="bg-dark-card border border-white/10 rounded-2xl">
        <div className="flex items-start justify-between gap-4 flex-wrap px-6 py-5 border-b border-white/10">
          <div>
            <h3 className="text-lg font-black text-dark-text capitalize">{nomeLongo(sel)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {fechado
                ? <>Fechado em {dataHora(det.fechamento.closed_at)} por {String(det.fechamento.closed_by || '—').split('@')[0]}</>
                : !terminou ? 'O mês ainda não terminou — dá para conferir, não para fechar.'
                : bloqueios.length ? `${bloqueios.length} conferência(s) impedem o fechamento.`
                : avisos.length ? `Pronto para fechar, com ${avisos.length} aviso(s).` : 'Pronto para fechar.'}
            </p>
            {meses[sel]?.entraram_depois > 0 && (
              <p className="text-xs text-amber-400 mt-1">
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
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-slate-300 hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-40">
                <LockOpen size={15} /> Reabrir
              </button>
            ) : (
              <button onClick={fechar} disabled={agindo || carregando || bloqueios.length > 0}
                title={bloqueios.length ? 'Resolva as conferências em vermelho' : undefined}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed">
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
            <div className="p-3">
              {det.checks.map((c: any) => {
                const ic = ICONE[c.status];
                const temItens = c.itens && c.itens.length > 0;
                return (
                  <div key={c.id} className="rounded-xl hover:bg-white/[0.02]">
                    <button onClick={() => temItens && setAberto(aberto === c.id ? null : c.id)}
                      className={`w-full flex items-start gap-3 px-3 py-3 text-left ${temItens ? 'cursor-pointer' : 'cursor-default'}`}>
                      <span className={`mt-0.5 ${ic.cls}`}>{ic.i}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-bold text-dark-text">{c.titulo}</span>
                        <span className="block text-xs text-slate-400 mt-0.5">{c.detalhe}</span>
                      </span>
                      {temItens && <ChevronDown size={15} className={`mt-0.5 text-slate-500 transition-transform ${aberto === c.id ? 'rotate-180' : ''}`} />}
                    </button>
                    {aberto === c.id && temItens && (
                      <div className="mx-3 mb-3 ml-10 rounded-xl border border-white/5 divide-y divide-white/5 max-h-72 overflow-y-auto">
                        {c.itens.map((it: any, k: number) => (
                          <div key={it.id || k} className="flex items-center gap-3 px-3 py-2 text-xs">
                            <span className="text-slate-500 w-20 shrink-0">
                              {String(it.data || it.vencimento || '').slice(0, 10).split('-').reverse().join('/')}
                            </span>
                            <span className="flex-1 min-w-0 truncate text-slate-300" title={it.descricao || it.conta}>
                              {it.descricao || it.conta}
                              {it.categoria && <span className="text-slate-500"> · {it.structure} {it.categoria}</span>}
                            </span>
                            <span className={`tabular-nums font-bold shrink-0 ${it.type === 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
            <div className="border-t lg:border-t-0 lg:border-l border-white/10 p-5 space-y-5">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  {fechado ? 'Totais congelados no fechamento' : 'Totais do DFC agora'}
                </p>
                {(() => {
                  const t = fechado ? det.fechamento.totais : det.totais;
                  if (!t) return null;
                  return (
                    <div className="space-y-1.5 text-xs">
                      {Object.entries(t.grupos || {}).map(([g, v]: any) => (
                        <div key={g} className="flex justify-between gap-3">
                          <span className="text-slate-400">{GRUPOS[g] || g}</span>
                          <span className={`tabular-nums font-semibold ${v >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{brl(v)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between gap-3 pt-1.5 border-t border-white/10 font-bold">
                        <span className="text-dark-text">Geração de caixa</span>
                        <span className={`tabular-nums ${t.geracao >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{brl(t.geracao)}</span>
                      </div>
                      {t.saldo_final !== null && (
                        <div className="flex justify-between gap-3 text-slate-400">
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
                  <div className="space-y-2">
                    {det.historico.map((h: any, i: number) => (
                      <div key={i} className="text-[11px]">
                        <p className="text-slate-300">
                          <span className={`font-bold ${h.acao === 'fechar' ? 'text-emerald-400' : 'text-amber-400'}`}>{h.acao === 'fechar' ? 'Fechado' : 'Reaberto'}</span>
                          {' '}· {dataHora(h.em)} · {String(h.por || '—').split('@')[0]}
                        </p>
                        {h.motivo && <p className="text-slate-500">“{h.motivo}”</p>}
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
