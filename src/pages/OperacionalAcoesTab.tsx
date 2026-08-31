import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

// ─── Aba Operacional ──────────────────────────────────────────────────────────
// Cruza o catálogo de ações (e suas pastas/nichos) com o que os parceiros de fato
// rodam. Mostra volume, qualidade de resultado e investimento — os três campos que
// existem preenchidos. CAC fica de fora: só 7 de 141 produtos o têm.

interface OpCliente {
  projectId: string; parceiro: string; squad: string | null; responsavel: string | null;
  investimento: string | null; plataforma: string | null; resultado: string | null; status: string | null;
}
interface OpAcao {
  nome: string; produtos: number; parceiros: number; investimento: number;
  bom: number; ok: number; ruim: number; julgados: number;
  pctPositivo: number | null; ticketMedio: number; clientes?: OpCliente[];
}
interface OpNicho extends OpAcao { nicho: string; semPasta: boolean; acoes: OpAcao[] }

const brl = (v: number) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

// Barra Bom / Ok / Ruim proporcional
const BarraResultado = ({ bom, ok, ruim }: { bom: number; ok: number; ruim: number }) => {
  const t = bom + ok + ruim;
  if (!t) return <span className="text-[10px] text-slate-400 dark:text-slate-600">sem julgamento</span>;
  const seg = (n: number, cor: string, titulo: string) => n > 0 && (
    <div className={cor} style={{ width: `${(n / t) * 100}%` }} title={`${titulo}: ${n}`} />
  );
  return (
    <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
      {seg(bom, 'bg-emerald-500', 'Bom')}
      {seg(ok, 'bg-sky-500', 'Ok')}
      {seg(ruim, 'bg-rose-500', 'Ruim')}
    </div>
  );
};

const SeloPct = ({ pct }: { pct: number | null }) => {
  if (pct === null) return <span className="text-[11px] text-slate-400 dark:text-slate-600">—</span>;
  const cor = pct >= 60 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
    : pct >= 40 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
    : 'text-rose-600 dark:text-rose-400 bg-rose-500/10';
  return <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${cor}`}>{pct}%</span>;
};

// Selo colorido do resultado de um cliente específico
const SeloResultado = ({ r }: { r: string | null }) => {
  const t = String(r || '').toUpperCase();
  if (!t || t === '-') return <span className="text-[10px] text-slate-400 dark:text-slate-600">sem resultado</span>;
  const cor = t.includes('BOM') ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : t.includes('OK') ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
    : t.includes('RUIM') ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
    : 'bg-slate-500/10 text-slate-500 dark:text-slate-400';
  return <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${cor}`}>{r}</span>;
};

export default function OperacionalTab() {
  const [dados, setDados] = useState<{ nichos: OpNicho[]; totais: any } | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [acaoAberta, setAcaoAberta] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch('/api/playbook-acoes/operacional')
      .then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Falha'); return r.json(); })
      .then(d => vivo && setDados(d))
      .catch(e => vivo && setErro(e.message))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, []);

  if (carregando) return <div className="py-20 text-center text-sm text-slate-500">Calculando…</div>;
  if (erro) return <div className="py-20 text-center text-sm text-rose-500">{erro}</div>;
  if (!dados) return null;

  const { nichos, totais } = dados;

  return (
    <div className="space-y-5">
      {/* Totais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { rotulo: 'Produtos rodando', valor: String(totais.produtos) },
          { rotulo: 'Parceiros', valor: String(totais.parceiros) },
          { rotulo: 'Investimento sob gestão', valor: brl(totais.investimento) },
          { rotulo: 'Resultado positivo', valor: totais.pctPositivo === null ? '—' : `${totais.pctPositivo}%` },
        ].map(k => (
          <div key={k.rotulo} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{k.rotulo}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{k.valor}</p>
          </div>
        ))}
      </div>

      {/* Tabela por nicho */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_70px_70px_120px_110px_130px_60px] gap-3 px-5 py-3 border-b border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span>Nicho</span><span className="text-right">Produtos</span><span className="text-right">Parceiros</span>
          <span className="text-right">Investimento</span><span className="text-right">Ticket médio</span>
          <span>Resultado</span><span className="text-right">Positivo</span>
        </div>

        {nichos.map(n => {
          const expandido = aberto === n.nicho;
          return (
            <div key={n.nicho} className="border-b border-slate-100 dark:border-white/5 last:border-none">
              <button
                onClick={() => setAberto(expandido ? null : n.nicho)}
                className="w-full grid grid-cols-2 md:grid-cols-[1fr_70px_70px_120px_110px_130px_60px] gap-3 px-5 py-3 items-center text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <ChevronRight size={13} className={`shrink-0 text-slate-400 transition-transform ${expandido ? 'rotate-90' : ''}`} />
                  <span className={`text-sm font-semibold truncate ${n.semPasta ? 'text-slate-400 dark:text-slate-500 italic' : 'text-slate-900 dark:text-white'}`}>
                    {n.nicho}
                  </span>
                  {/* participação no total de produtos */}
                  {totais.produtos > 0 && (
                    <span className="shrink-0 text-[10px] text-slate-400">{Math.round((n.produtos / totais.produtos) * 100)}%</span>
                  )}
                </span>
                <span className="text-right text-sm text-slate-700 dark:text-slate-300">{n.produtos}</span>
                <span className="text-right text-sm text-slate-700 dark:text-slate-300 hidden md:block">{n.parceiros}</span>
                <span className="text-right text-sm font-semibold text-slate-900 dark:text-white hidden md:block">{brl(n.investimento)}</span>
                <span className="text-right text-sm text-slate-500 hidden md:block">{brl(n.ticketMedio)}</span>
                <span className="hidden md:flex items-center"><BarraResultado bom={n.bom} ok={n.ok} ruim={n.ruim} /></span>
                <span className="text-right"><SeloPct pct={n.pctPositivo} /></span>
              </button>

              {/* Ações dentro do nicho */}
              {expandido && (
                <div className="bg-slate-50/60 dark:bg-black/20 px-5 py-2">
                  {n.acoes.map(a => {
                    const chaveAcao = `${n.nicho}||${a.nome}`;
                    const acaoExp = acaoAberta === chaveAcao;
                    return (
                      <div key={a.nome} className="border-b border-slate-200/60 dark:border-white/5 last:border-none">
                        <button
                          onClick={() => setAcaoAberta(acaoExp ? null : chaveAcao)}
                          className="w-full grid grid-cols-2 md:grid-cols-[1fr_70px_70px_120px_110px_130px_60px] gap-3 py-2 items-center text-left rounded-lg hover:bg-white dark:hover:bg-white/5 transition-colors"
                        >
                          <span className="flex items-center gap-1.5 min-w-0 pl-1">
                            <ChevronRight size={11} className={`shrink-0 text-slate-400 transition-transform ${acaoExp ? 'rotate-90' : ''}`} />
                            <span className="text-[13px] text-slate-700 dark:text-slate-300 truncate">{a.nome}</span>
                          </span>
                          <span className="text-right text-[13px] text-slate-600 dark:text-slate-400">{a.produtos}</span>
                          <span className="text-right text-[13px] text-slate-600 dark:text-slate-400 hidden md:block">{a.parceiros}</span>
                          <span className="text-right text-[13px] text-slate-700 dark:text-slate-300 hidden md:block">{brl(a.investimento)}</span>
                          <span className="text-right text-[13px] text-slate-500 hidden md:block">{brl(a.ticketMedio)}</span>
                          <span className="hidden md:flex items-center"><BarraResultado bom={a.bom} ok={a.ok} ruim={a.ruim} /></span>
                          <span className="text-right"><SeloPct pct={a.pctPositivo} /></span>
                        </button>

                        {/* Clientes que rodam esta ação */}
                        {acaoExp && (
                          <div className="pl-6 pr-1 pb-2">
                            {!a.clientes?.length ? (
                              <p className="text-[11px] text-slate-400 py-2">Nenhum cliente encontrado.</p>
                            ) : (
                              <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
                                {a.clientes.map((c, i) => (
                                  <div key={`${c.projectId}-${i}`} className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 dark:border-white/5 last:border-none">
                                    <span className="flex-1 min-w-0">
                                      <span className="block text-[13px] font-medium text-slate-800 dark:text-white truncate">{c.parceiro}</span>
                                      <span className="block text-[10px] text-slate-400 truncate">
                                        {[c.squad, c.responsavel, c.plataforma].filter(Boolean).join(' · ') || '—'}
                                      </span>
                                    </span>
                                    <span className="shrink-0 text-[12px] text-slate-600 dark:text-slate-400 tabular-nums">{c.investimento || '—'}</span>
                                    <span className="shrink-0 w-[132px] text-right"><SeloResultado r={c.resultado} /></span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-600">
        Só produtos <strong className="font-semibold">ativos</strong> entram na conta — os marcados como Inativo ficam de fora.
        Bom + Ok contam como resultado positivo; produtos sem resultado preenchido ficam fora do percentual.
        CAC e custo por lead não aparecem porque quase não são preenchidos nos produtos.
      </p>
    </div>
  );
}
