import React, { useState, useEffect } from 'react';
import { Anel, BarrasPorCategoria, Cartao, CartaoKpi, DivisaoDoKpi, ListaDeBarras } from '../components/graficos';
import { CarregandoBloco } from '../components/LoadingSpinner';

// ─── Aba Ações e Nichos ───────────────────────────────────────────────────────
// Cruza o catálogo de ações (e suas pastas/nichos) com o que os parceiros de fato
// rodam. Mostra volume, qualidade de resultado e investimento — os três campos que
// existem preenchidos. CAC fica de fora: só 7 de 141 produtos o têm.
// Visual: gráficos do painel de teste do GrapeCRM (components/graficos.tsx).

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
// "R$ 94,3 mil" — para rótulos de gráfico, onde o valor cheio não cabe
const brlCurto = (v: number) => v >= 1000
  ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: v >= 100000 ? 0 : 1 })} mil`
  : Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

// Mesmas cores de resultado do Dashboard Operacional: Bom emerald-600, Ok emerald-500, Ruim rose-500
const COR_BOM = '#059669', COR_OK = '#10b981', COR_RUIM = '#f43f5e';
// Fatias do anel de nichos: a cor de destaque primeiro, o resto bem separado
const PALETA = ['rgb(var(--accent-color))', '#38bdf8', '#34d399', '#f59e0b', '#f472b6', '#94a3b8'];
const corDoPct = (p: number) => (p >= 60 ? COR_OK : p >= 40 ? '#f59e0b' : COR_RUIM);

// Barra Bom / Ok / Ruim proporcional
const BarraResultado = ({ bom, ok, ruim }: { bom: number; ok: number; ruim: number }) => {
  const t = bom + ok + ruim;
  if (!t) return <span className="text-[10px] text-slate-400 dark:text-slate-600">sem julgamento</span>;
  const seg = (n: number, cor: string, titulo: string) => n > 0 && (
    <div style={{ width: `${(n / t) * 100}%`, background: cor }} title={`${titulo}: ${n}`} />
  );
  return (
    <div className="flex h-1.5 w-full gap-[2px] rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
      {seg(bom, COR_BOM, 'Bom')}
      {seg(ok, COR_OK, 'Ok')}
      {seg(ruim, COR_RUIM, 'Ruim')}
    </div>
  );
};

const SeloPct = ({ pct }: { pct: number | null }) => {
  if (pct === null) return <span className="text-[11px] text-slate-400 dark:text-slate-600">—</span>;
  const cor = pct >= 60 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
    : pct >= 40 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
    : 'text-rose-600 dark:text-rose-400 bg-rose-500/10';
  return <span className={`numero px-2 py-0.5 rounded-full text-[11px] ${cor}`}>{pct}%</span>;
};

// Selo colorido do resultado de um cliente específico
const SeloResultado = ({ r }: { r: string | null }) => {
  const t = String(r || '').toUpperCase();
  if (!t || t === '-') return <span className="text-[10px] text-slate-400 dark:text-slate-600">sem resultado</span>;
  const cor = t.includes('BOM') ? 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300'
    : t.includes('OK') ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : t.includes('RUIM') ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
    : 'bg-slate-500/10 text-slate-500 dark:text-slate-400';
  return <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${cor}`}>{r}</span>;
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

  if (carregando) return <CarregandoBloco className="py-20" />;
  if (erro) return <div className="py-20 text-center text-sm text-rose-500">{erro}</div>;
  if (!dados) return null;

  const { nichos, totais } = dados;
  const comPasta = nichos.filter(n => !n.semPasta);

  // Nicho em foco no explorador: o escolhido, ou o maior por padrão
  const nichoAtual = nichos.find(n => n.nicho === aberto) || nichos[0] || null;
  const acaoSel = nichoAtual?.acoes.find(a => `${nichoAtual.nicho}||${a.nome}` === acaoAberta) || null;

  // Clicar num gráfico abre o nicho no explorador e rola até ele
  const abrirNicho = (nicho: string) => {
    setAberto(nicho);
    setAcaoAberta(null);
    requestAnimationFrame(() => document.getElementById('explorador-nichos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  // Anel: os 5 maiores nichos + o resto somado (inclui "Sem nicho definido")
  const porVolume = [...nichos].sort((a, b) => b.produtos - a.produtos);
  const top = porVolume.filter(n => !n.semPasta).slice(0, 5);
  const resto = totais.produtos - top.reduce((a, n) => a + n.produtos, 0);
  const segmentosAnel = [
    ...top.map((n, i) => ({ rotulo: n.nicho, valor: n.produtos, cor: PALETA[i] })),
    ...(resto > 0 ? [{ rotulo: 'Outros', valor: resto, cor: PALETA[5], chave: '' }] : []),
  ];

  const maiorNicho = top[0];
  const positivoPorNicho = comPasta
    .filter(n => n.pctPositivo !== null)
    .sort((a, b) => (b.pctPositivo! - a.pctPositivo!) || b.julgados - a.julgados);

  return (
    <div className="space-y-5">
      {/* ── Indicadores ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CartaoKpi
          titulo="Produtos rodando"
          pilula={`${comPasta.length} nichos`}
          valor={totais.produtos}
          apoio={maiorNicho ? `${Math.round((maiorNicho.produtos / Math.max(1, totais.produtos)) * 100)}% em ${maiorNicho.nicho}` : undefined}
          visual={maiorNicho && (
            <DivisaoDoKpi partes={[
              { rotulo: maiorNicho.nicho, valor: maiorNicho.produtos, cheio: true },
              { rotulo: 'Demais', valor: totais.produtos - maiorNicho.produtos },
            ]} />
          )}
        />
        <CartaoKpi
          titulo="Parceiros"
          valor={totais.parceiros}
          apoio={totais.parceiros > 0 ? `${(totais.produtos / totais.parceiros).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} produtos por parceiro` : undefined}
        />
        <CartaoKpi
          titulo="Investimento sob gestão"
          valor={brl(totais.investimento)}
          apoio={`Ticket médio ${brl(totais.ticketMedio)} por produto`}
        />
        <CartaoKpi
          titulo="Resultado positivo"
          pilula={`${totais.julgados} julgados`}
          valor={totais.pctPositivo === null ? '—' : `${totais.pctPositivo}%`}
          alerta={totais.pctPositivo !== null && totais.pctPositivo < 50}
          apoio="Bom + Ok sobre os produtos com resultado"
          visual={totais.julgados > 0 && (
            <DivisaoDoKpi partes={[
              { rotulo: 'Bom', valor: totais.bom, cor: COR_BOM },
              { rotulo: 'Ok', valor: totais.ok, cor: COR_OK },
              { rotulo: 'Ruim', valor: totais.ruim, cor: COR_RUIM },
            ]} />
          )}
        />
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Cartao titulo="Produtos por nicho" legenda="Os 5 maiores e o resto somado" className="lg:col-span-5">
          <div className="h-[220px]">
            <Anel
              segmentos={segmentosAnel}
              centro={totais.produtos}
              legendaDoCentro="produtos"
              aoClicar={chave => chave && abrirNicho(chave)}
            />
          </div>
        </Cartao>

        <Cartao titulo="Investimento por nicho" legenda="Verba mensal somada, em R$" className="lg:col-span-4">
          <div className="h-[220px]">
            <BarrasPorCategoria
              itens={[...comPasta].sort((a, b) => b.investimento - a.investimento).map(n => ({ rotulo: n.nicho, valor: n.investimento }))}
              formato={brlCurto}
              unidade="por mês"
              limite={6}
              aoClicar={abrirNicho}
            />
          </div>
        </Cartao>

        <Cartao titulo="Resultado positivo" legenda="% Bom + Ok por nicho" className="lg:col-span-3">
          {positivoPorNicho.length === 0 ? (
            <p className="py-10 text-center text-[12.5px] text-slate-500">Nenhum nicho com resultado preenchido.</p>
          ) : (
            <ListaDeBarras
              itens={positivoPorNicho.map(n => ({ rotulo: n.nicho, valor: n.pctPositivo!, cor: corDoPct(n.pctPositivo!) }))}
              formato={v => `${v}%`}
              detalhe={it => `${positivoPorNicho.find(n => n.nicho === it.rotulo)?.julgados ?? 0} julg.`}
              limite={6}
              aoClicar={abrirNicho}
            />
          )}
        </Cartao>
      </div>

      {/* ── Explorador: nichos à esquerda, ações do nicho em blocos à direita ── */}
      <div id="explorador-nichos" className="scroll-mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <Cartao titulo="Nichos" legenda={`${nichos.length} nichos`} semPadding className="lg:col-span-4 lg:sticky lg:top-4">
          {/* cabeçalho discreto das duas colunas de número */}
          <div className="flex items-center gap-3 px-5 pb-1 text-[10.5px] uppercase tracking-wider text-slate-400">
            <span className="flex-1" /><span className="w-8 text-right">prod.</span><span className="w-10 text-right">positivo</span>
          </div>
          <div className="max-h-[640px] overflow-y-auto custom-scrollbar px-2.5 pb-3">
            {nichos.map(n => {
              const ativo = nichoAtual?.nicho === n.nicho;
              return (
                <button
                  key={n.nicho}
                  onClick={() => { setAberto(n.nicho); setAcaoAberta(null); }}
                  className={`gf-item relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${ativo ? 'bg-violet-500/10' : 'hover:bg-violet-500/5'}`}
                >
                  {ativo && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-violet-500" />}
                  <span className={`min-w-0 flex-1 truncate text-[13.5px] ${n.semPasta ? 'italic text-slate-400 dark:text-slate-500' : ativo ? 'font-medium text-violet-600 dark:text-violet-300' : 'text-dark-text'}`}>{n.nicho}</span>
                  <span className="numero w-8 shrink-0 text-right text-[12px] text-slate-400">{n.produtos}</span>
                  <span className="numero w-10 shrink-0 text-right text-[12px]" style={{ color: n.pctPositivo === null ? undefined : corDoPct(n.pctPositivo) }}>
                    {n.pctPositivo === null ? <span className="text-slate-400">—</span> : `${n.pctPositivo}%`}
                  </span>
                </button>
              );
            })}
          </div>
        </Cartao>

        {nichoAtual && (
          <div key={nichoAtual.nicho} className="gf-troca lg:col-span-8 space-y-4">
            {/* Resumo do nicho */}
            <div className="gf-cartao p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={`text-[18px] font-semibold tracking-tight ${nichoAtual.semPasta ? 'italic text-slate-400' : 'text-dark-text'}`}>{nichoAtual.nicho}</h2>
                {totais.produtos > 0 && <span className="pilula-cartao">{Math.round((nichoAtual.produtos / totais.produtos) * 100)}% dos produtos</span>}
                <span className="ml-auto"><SeloPct pct={nichoAtual.pctPositivo} /></span>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Produtos', String(nichoAtual.produtos)],
                  ['Parceiros', String(nichoAtual.parceiros)],
                  ['Investimento', brl(nichoAtual.investimento)],
                  ['Ticket médio', brl(nichoAtual.ticketMedio)],
                ].map(([rot, val]) => (
                  <div key={rot} className="rounded-2xl bg-violet-500/[0.05] px-4 py-3">
                    <p className="text-[11.5px] text-slate-500 dark:text-slate-400">{rot}</p>
                    <p className="numero mt-1 truncate text-[20px] leading-tight text-dark-text">{val}</p>
                  </div>
                ))}
              </div>
              {nichoAtual.julgados > 0 && (
                <div className="mt-4">
                  <DivisaoDoKpi partes={[
                    { rotulo: 'Bom', valor: nichoAtual.bom, cor: COR_BOM },
                    { rotulo: 'Ok', valor: nichoAtual.ok, cor: COR_OK },
                    { rotulo: 'Ruim', valor: nichoAtual.ruim, cor: COR_RUIM },
                  ]} />
                </div>
              )}
            </div>

            {/* Ações do nicho em blocos — clicar mostra quem roda */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {nichoAtual.acoes.map((a, i) => {
                const chave = `${nichoAtual.nicho}||${a.nome}`;
                const sel = acaoAberta === chave;
                const fatia = nichoAtual.produtos ? Math.round((a.produtos / nichoAtual.produtos) * 100) : 0;
                return (
                  <button
                    key={a.nome}
                    onClick={() => setAcaoAberta(sel ? null : chave)}
                    style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                    className={`gf-cartao gf-cartao--sobe gf-troca flex flex-col p-4 text-left ${sel ? '!ring-2 !ring-violet-500/60' : ''}`}
                  >
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-dark-text line-clamp-2" title={a.nome}>{a.nome}</span>
                      <SeloPct pct={a.pctPositivo} />
                    </span>
                    <span className="mt-3 flex items-baseline gap-1.5">
                      <span className="numero text-[26px] leading-none text-dark-text">{a.produtos}</span>
                      <span className="text-[11.5px] text-slate-500 dark:text-slate-400">produtos · {fatia}% do nicho</span>
                    </span>
                    <span className="mt-1 text-[11.5px] text-slate-500 dark:text-slate-400">
                      <span className="numero text-dark-text">{brl(a.investimento)}</span>/mês · ticket <span className="numero">{brl(a.ticketMedio)}</span>
                    </span>
                    <span className="mt-auto block pt-3"><BarraResultado bom={a.bom} ok={a.ok} ruim={a.ruim} /></span>
                  </button>
                );
              })}
            </div>

            {/* Quem roda a ação escolhida */}
            {acaoSel && (
              <Cartao
                key={acaoSel.nome}
                titulo={<>Quem roda <span className="text-violet-600 dark:text-violet-300">{acaoSel.nome}</span></>}
                legenda={`${acaoSel.clientes?.length ?? 0} cliente(s) · ${brl(acaoSel.investimento)}/mês`}
                acao={<button onClick={() => setAcaoAberta(null)} className="text-[12px] text-slate-400 hover:text-dark-text">Fechar</button>}
                className="gf-troca"
              >
                {!acaoSel.clientes?.length ? (
                  <p className="text-[12px] text-slate-400 py-2">Nenhum cliente encontrado.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    {acaoSel.clientes.map((c, i) => (
                      <div key={`${c.projectId}-${i}`} className="flex items-center gap-3 border-b border-slate-100 py-2.5 dark:border-white/5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-dark-text" title={c.parceiro}>{c.parceiro}</span>
                          <span className="block truncate text-[10.5px] text-slate-400">
                            {[c.responsavel, c.plataforma, c.investimento].filter(Boolean).join(' · ') || '—'}
                          </span>
                        </span>
                        <span className="shrink-0"><SeloResultado r={c.resultado} /></span>
                      </div>
                    ))}
                  </div>
                )}
              </Cartao>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-600">
        Só produtos <strong className="font-semibold">ativos</strong> entram na conta — os marcados como Inativo ficam de fora.
        Bom + Ok contam como resultado positivo; produtos sem resultado preenchido ficam fora do percentual.
        CAC e custo por lead não aparecem porque quase não são preenchidos nos produtos.
      </p>
    </div>
  );
}
