import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import SplitHeadline from '../components/SplitHeadline';
import { CarregandoPagina } from '../components/LoadingSpinner';
import { EstadoVazio } from '../components/ui/EstadoVazio';
import {
  Anel, Cartao, CartaoKpi, DivisaoDoKpi, LinhaComBolinha, LinhaDoKpi, LinhasNoTempo, ListaDeBarras,
} from '../components/graficos';
import { calcularAlertasCusto } from '../lib/alertasCusto';

/**
 * Dashboard Financeiro (template `painel-financeiro`, 13/11/2026).
 *
 * Faturamento, despesas e resultado saem do MESMO `/api/financeiro/dre` do DFC — com as mesmas
 * convenções do Dashboard do DFC (DreDashboard.tsx): faturamento = grupo 01; despesas = |02| +
 * |04| + |05|; resultado = 01 + 03 − despesas ("Geração de Caixa do Período"). Ou seja, regime de
 * caixa, e os meses do histórico (Marvee) usam o número importado. Bate com a tabela do DFC.
 *
 * Recorrência e inadimplência saem de `/api/clients`, com a regra de Clientes Ativos:
 * "previsível" = status Ativo SEM a etiqueta quarentena, assinatura ativa, cada assinatura uma vez
 * (é o "Assinaturas Ativas" da aba Ativos). Quem tem a etiqueta entra como "em retenção".
 * Caixa = saldo do Asaas (`/api/financeiro/resumo`, mesmo do Fluxo de Caixa).
 */

interface DreRow { structure: string; description: string; level: number; values: Record<string, number>; total: number; }
interface DreData { year: string; months: string[]; historicalMonths: string[]; rows: DreRow[]; }

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const GRUPOS_DESPESA = ['02', '04', '05'];
const PALETA = ['#8b5cf6', '#38bdf8', '#f59e0b', '#f43f5e', '#10b981', '#ec4899', '#94a3b8'];

const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brlCurto = (v: number) => {
  const a = Math.abs(v);
  const s = v < 0 ? '−' : '';
  if (a >= 1_000_000) return `${s}R$ ${(a / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (a >= 1000) return `${s}R$ ${(a / 1000).toLocaleString('pt-BR', { maximumFractionDigits: a >= 100_000 ? 0 : 1 })} mil`;
  return `${s}R$ ${Math.round(a)}`;
};
const pct = (v: number) => `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const mesDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const rotuloMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;
const somaMeses = (m: string, n: number) => {
  const [y, mm] = m.split('-').map(Number);
  return mesDe(new Date(y, mm - 1 + n, 1));
};
const tags = (t: any): string[] => { try { return Array.isArray(t) ? t : JSON.parse(t || '[]'); } catch { return []; } };

export default function PainelFinanceiro({ pageLabel }: { pageLabel?: string }) {
  const hoje = new Date();
  const mesAtual = mesDe(hoje);
  // Padrão: último mês fechado — o mês corrente ainda está pela metade e distorce as comparações
  const [mes, setMes] = useState(somaMeses(mesAtual, -1));
  const [dre, setDre] = useState<Record<string, DreData>>({});
  const [clientes, setClientes] = useState<any[]>([]);
  const [caixa, setCaixa] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [periodoDespesa, setPeriodoDespesa] = useState<'mes' | '12m'>('mes');
  const [versao, setVersao] = useState(0);

  // Os 12 meses que terminam no mês escolhido atravessam no máximo dois anos
  const anos = useMemo(() => Array.from(new Set([somaMeses(mes, -11).slice(0, 4), mes.slice(0, 4)])), [mes]);

  useEffect(() => {
    let vivo = true;
    const faltam = anos.filter(a => !dre[a] || versao > 0);
    Promise.all(faltam.map(a => fetch(`/api/financeiro/dre?year=${a}`).then(r => (r.ok ? r.json() : null)).then(d => [a, d] as const)))
      .then(res => { if (vivo) setDre(prev => { const n = { ...prev }; for (const [a, d] of res) if (d) n[a] = d; return n; }); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anos.join(','), versao]);

  useEffect(() => {
    fetch('/api/clients').then(r => (r.ok ? r.json() : [])).then(d => setClientes(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`/api/financeiro/resumo?mes=${mesAtual}`).then(r => (r.ok ? r.json() : null)).then(d => setCaixa(d?.saldo_caixa ?? null)).catch(() => {});
  }, [versao]);

  // ── Linhas do DFC dos dois anos, juntas por mês ──
  const linhas = useMemo(() => {
    const porEstrutura = new Map<string, DreRow>();
    for (const a of Object.keys(dre).sort()) {
      for (const r of dre[a].rows) {
        const atual = porEstrutura.get(r.structure);
        porEstrutura.set(r.structure, atual ? { ...atual, values: { ...atual.values, ...r.values } } : { ...r, values: { ...r.values } });
      }
    }
    return [...porEstrutura.values()];
  }, [dre]);
  const valor = (estrutura: string, m: string) => linhas.find(r => r.structure === estrutura)?.values[m] || 0;

  const meses12 = useMemo(() => Array.from({ length: 12 }, (_, i) => somaMeses(mes, i - 11)), [mes]);
  const serie = meses12.map(m => {
    const faturamento = valor('01', m);
    const naoOper = valor('03', m);
    const despesas = GRUPOS_DESPESA.reduce((s, g) => s + Math.abs(valor(g, m)), 0);
    const operacional = Math.abs(valor('02', m));
    return { m, faturamento, naoOper, despesas, operacional, resultado: faturamento + naoOper - despesas };
  });
  const atual = serie[11];
  const anterior = serie[10];
  // média dos 3 meses fechados antes do escolhido (referência para "normal")
  const base3 = serie.slice(8, 11);
  const media3 = (k: 'faturamento' | 'despesas') => base3.reduce((s, x) => s + x[k], 0) / Math.max(1, base3.length);
  const varPct = (a: number, b: number) => (b ? ((a - b) / Math.abs(b)) * 100 : null);
  const margem = atual.faturamento ? (atual.resultado / atual.faturamento) * 100 : 0;
  const tot12 = serie.reduce((acc, x) => ({ fat: acc.fat + x.faturamento, desp: acc.desp + x.despesas, res: acc.res + x.resultado }), { fat: 0, desp: 0, res: 0 });
  const margem12 = tot12.fat ? (tot12.res / tot12.fat) * 100 : 0;
  const emAndamento = mes === mesAtual;

  // ── Recorrência, retenção e inadimplência (regra de Clientes Ativos) ──
  const rec = useMemo(() => {
    const ativos = clientes.filter(c => c.status === 'Ativo');
    const soma = (lista: any[]) => {
      const vistos = new Set<string>(); let total = 0; let n = 0;
      for (const c of lista) {
        if (!c.hasActiveSubscription || !c.subscriptionValue) continue;
        const k = c.finSubscriptionId || c.id;
        if (vistos.has(k)) continue;
        vistos.add(k); total += Number(c.subscriptionValue) || 0; n++;
      }
      return { total, n };
    };
    const previsivel = soma(ativos.filter(c => !tags(c.tags).includes('quarentena')));
    const retencao = soma(ativos.filter(c => tags(c.tags).includes('quarentena')));
    const atrasados = ativos.filter(c => (Number(c.diasAtraso) || 0) > 0);
    const emAtraso = atrasados.reduce((s, c) => s + (Number(c.valorDisplay) || 0), 0);
    return { previsivel, retencao, atrasados: atrasados.length, emAtraso, ativos: ativos.length };
  }, [clientes]);

  // ── Despesas por categoria (folhas do plano nos grupos 02/04/05) ──
  const folhas = linhas.filter(r => GRUPOS_DESPESA.some(g => r.structure.startsWith(g + '.')) && !linhas.some(x => x.structure.startsWith(r.structure + '.')));
  const gastoDe = (r: DreRow, ms: string[]) => ms.reduce((s, m) => s - (r.values[m] || 0), 0);
  const mesesDespesa = periodoDespesa === 'mes' ? [mes] : meses12;
  const categorias = folhas
    .map(r => ({ structure: r.structure, rotulo: r.description, valor: gastoDe(r, mesesDespesa), media: gastoDe(r, base3.map(x => x.m)) / Math.max(1, base3.length) }))
    .filter(c => c.valor > 0.5)
    .sort((a, b) => b.valor - a.valor);
  const totalCategorias = categorias.reduce((s, c) => s + c.valor, 0);
  // Anel: subgrupos (02.xx, 04.xx, 05.xx) — os 6 maiores e o resto
  const subgrupos = linhas
    .filter(r => r.structure.split('.').length === 2 && GRUPOS_DESPESA.some(g => r.structure.startsWith(g + '.')))
    .map(r => ({ rotulo: r.description, valor: gastoDe(r, mesesDespesa) }))
    .filter(g => g.valor > 0.5)
    .sort((a, b) => b.valor - a.valor);
  const top = subgrupos.slice(0, 6);
  const resto = subgrupos.slice(6).reduce((s, g) => s + g.valor, 0);
  const segmentos = [
    ...top.map((g, i) => ({ rotulo: g.rotulo, valor: Math.round(g.valor), cor: PALETA[i] })),
    ...(resto > 0.5 ? [{ rotulo: 'Outros', valor: Math.round(resto), cor: PALETA[6] }] : []),
  ];

  const mesesComMovimento = meses12.filter(m => serie.find(x => x.m === m)!.faturamento || serie.find(x => x.m === m)!.despesas);
  const { alertas } = calcularAlertasCusto(linhas, mesesComMovimento, mes);

  // Fôlego: caixa de hoje ÷ despesa média dos 3 meses fechados
  const despesaMedia = media3('despesas');
  const folego = caixa != null && despesaMedia > 0 ? caixa / despesaMedia : null;

  const titulo = (pageLabel || 'Dashboard Financeiro').trim();
  const corte = titulo.lastIndexOf(' ');

  if (carregando && linhas.length === 0) {
    return <CarregandoPagina />;
  }

  const vFat = varPct(atual.faturamento, anterior.faturamento);
  const vDesp = varPct(atual.despesas, anterior.despesas);
  const corVar = (v: number | null, bomSobe: boolean) => (v == null || Math.abs(v) < 0.5 ? '' : (v > 0) === bomSobe ? 'text-emerald-500' : 'text-rose-500');
  const maiorResultado = Math.max(1, ...serie.map(x => Math.abs(x.resultado)));

  return (
    <div className="p-8 pb-12 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SplitHeadline
          text={corte > 0 ? titulo.slice(0, corte + 1) : ''}
          highlight={corte > 0 ? titulo.slice(corte + 1) : titulo}
          subtitle="Faturamento, despesas e resultado pelo regime de caixa — os mesmos números do DFC."
        />
        <div className="flex items-center gap-2">
          <button onClick={() => setVersao(v => v + 1)} title="Atualizar"
            className="w-[38px] h-[38px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-card text-slate-500 dark:text-slate-400 hover:text-dark-text">
            <RefreshCw size={15} />
          </button>
          <div className="h-[38px] flex items-center rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-card">
            <button onClick={() => setMes(somaMeses(mes, -1))} className="w-9 h-full flex items-center justify-center text-slate-400 hover:text-violet-500" title="Mês anterior"><ChevronLeft size={15} /></button>
            <span className="min-w-[150px] text-center text-[13.5px] font-semibold text-dark-text">
              {MESES_LONGOS[Number(mes.slice(5, 7)) - 1]} {mes.slice(0, 4)}
            </span>
            <button onClick={() => mes < mesAtual && setMes(somaMeses(mes, 1))} disabled={mes >= mesAtual}
              className="w-9 h-full flex items-center justify-center text-slate-400 hover:text-violet-500 disabled:opacity-30" title="Próximo mês"><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>

      {/* ── Mês ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CartaoKpi
          titulo="Faturamento"
          pilula={emAndamento ? 'mês em andamento' : `vs ${rotuloMes(anterior.m)}`}
          valor={brl(atual.faturamento)}
          apoio={vFat == null ? 'sem mês anterior para comparar' : <span><span className={corVar(vFat, true)}>{pct(vFat)}</span> sobre {rotuloMes(anterior.m)} · média 3m {brlCurto(media3('faturamento'))}</span>}
          visual={<LinhaDoKpi id="pf-fat" cor="#10b981" suave={0} valores={serie.map(x => x.faturamento)} rotulos={serie.map(x => rotuloMes(x.m))} formato={brl} />}
        />
        <CartaoKpi
          titulo="Despesas"
          pilula={atual.faturamento ? `${Math.round((atual.despesas / atual.faturamento) * 100)}% do faturamento` : undefined}
          valor={brl(atual.despesas)}
          apoio={vDesp == null ? 'sem mês anterior para comparar' : <span><span className={corVar(vDesp, false)}>{pct(vDesp)}</span> sobre {rotuloMes(anterior.m)} · média 3m {brlCurto(despesaMedia)}</span>}
          visual={<LinhaDoKpi id="pf-desp" cor="#f43f5e" suave={0} valores={serie.map(x => x.despesas)} rotulos={serie.map(x => rotuloMes(x.m))} formato={brl} />}
        />
        <CartaoKpi
          titulo="Resultado"
          pilula={`margem ${margem.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
          alerta={atual.resultado < 0}
          valor={<span className={atual.resultado < 0 ? 'text-rose-500' : ''}>{brl(atual.resultado)}</span>}
          apoio={<span>12 meses: <span className={tot12.res < 0 ? 'text-rose-500' : 'text-emerald-500'}>{brlCurto(tot12.res)}</span> · margem {margem12.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>}
          visual={
            <div className="flex h-full min-h-[56px] items-center gap-[5px]">
              {serie.map((x, i) => (
                <div key={x.m} className="flex h-full flex-1 flex-col justify-center" title={`${rotuloMes(x.m)}: ${brl(x.resultado)}`}>
                  <div className="flex h-1/2 items-end"><i className="w-full rounded-t-[4px]" style={{ height: x.resultado > 0 ? `${Math.max(4, (x.resultado / maiorResultado) * 100)}%` : 0, background: i === 11 ? '#8b5cf6' : 'rgb(139 92 246 / .3)' }} /></div>
                  <div className="flex h-1/2 items-start"><i className="w-full rounded-b-[4px]" style={{ height: x.resultado < 0 ? `${Math.max(4, (-x.resultado / maiorResultado) * 100)}%` : 0, background: i === 11 ? '#f43f5e' : 'rgb(244 63 94 / .3)' }} /></div>
                </div>
              ))}
            </div>
          }
        />
        <CartaoKpi
          titulo="Caixa hoje"
          pilula={folego != null ? `${folego.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses de fôlego` : undefined}
          alerta={folego != null && folego < 1}
          valor={caixa == null ? '—' : brl(caixa)}
          apoio={despesaMedia > 0 ? `Saldo do Asaas ÷ despesa média de ${brlCurto(despesaMedia)}/mês` : 'Saldo atual do Asaas'}
        />
      </div>

      {/* ── Recorrência ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <CartaoKpi
          titulo="Receita recorrente previsível"
          pilula={`${rec.previsivel.n} assinaturas`}
          valor={brl(rec.previsivel.total)}
          apoio={rec.previsivel.n ? `Ticket médio ${brl(rec.previsivel.total / rec.previsivel.n)} · clientes fora da retenção` : 'Assinaturas ativas no Asaas'}
        />
        <CartaoKpi
          titulo="Em retenção"
          pilula={`${rec.retencao.n} assinaturas`}
          alerta={rec.retencao.total > 0}
          valor={brl(rec.retencao.total)}
          apoio="Mensalidade fora da previsão até você decidir"
          visual={(rec.previsivel.total + rec.retencao.total) > 0 && (
            <DivisaoDoKpi partes={[
              { rotulo: 'Previsível', valor: Math.round(rec.previsivel.total), cor: '#10b981' },
              { rotulo: 'Retenção', valor: Math.round(rec.retencao.total), cor: '#f59e0b' },
            ]} />
          )}
        />
        <CartaoKpi
          titulo="Inadimplência"
          pilula={`${rec.atrasados} clientes`}
          alerta={rec.emAtraso > 0}
          valor={<span className={rec.emAtraso > 0 ? 'text-rose-500' : ''}>{brl(rec.emAtraso)}</span>}
          apoio={rec.previsivel.total ? `${((rec.emAtraso / (rec.previsivel.total + rec.retencao.total)) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% da receita recorrente · cobranças vencidas` : 'Cobranças vencidas e não pagas'}
        />
        <CartaoKpi
          titulo="Custo operacional"
          pilula="grupo 02"
          valor={atual.faturamento ? `${Math.round((atual.operacional / atual.faturamento) * 100)}%` : '—'}
          apoio={`${brl(atual.operacional)} do faturamento do mês · 12m: ${tot12.fat ? Math.round((serie.reduce((s, x) => s + x.operacional, 0) / tot12.fat) * 100) : 0}%`}
        />
      </div>

      {/* ── Evolução ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Cartao titulo="Faturamento x Despesas" legenda="Últimos 12 meses, regime de caixa" className="lg:col-span-12">
          <div className="h-[300px]">
            <LinhasNoTempo
              id="pf-fat-desp"
              suave={0}
              marcasX={12}
              rotulos={serie.map(x => rotuloMes(x.m))}
              formato={brlCurto}
              series={[
                { rotulo: 'Faturamento', cor: '#10b981', valores: serie.map(x => x.faturamento) },
                { rotulo: 'Despesas', cor: '#f43f5e', valores: serie.map(x => x.despesas) },
              ]}
            />
          </div>
        </Cartao>
      </div>

      {/* ── Despesas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Cartao
          titulo="Principais despesas"
          legenda={periodoDespesa === 'mes' ? `${MESES_LONGOS[Number(mes.slice(5, 7)) - 1]} · ${brl(totalCategorias)} no total` : `Últimos 12 meses · ${brl(totalCategorias)} no total`}
          acao={
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.05]">
              {([['mes', 'Mês'], ['12m', '12 meses']] as const).map(([v, r]) => (
                <button key={v} onClick={() => setPeriodoDespesa(v)}
                  className={`h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors ${periodoDespesa === v ? 'bg-white dark:bg-white/10 text-dark-text shadow-sm' : 'text-slate-500 hover:text-dark-text'}`}>{r}</button>
              ))}
            </div>
          }
          className="lg:col-span-7"
        >
          {categorias.length === 0 ? (
            <EstadoVazio titulo="Nenhuma despesa categorizada no período." className="py-10" />
          ) : (
            <ListaDeBarras
              itens={categorias.map(c => ({ rotulo: c.rotulo, valor: Math.round(c.valor), cor: '#f43f5e' }))}
              formato={brl}
              limite={10}
              detalhe={it => {
                const c = categorias.find(x => x.rotulo === it.rotulo);
                const parte = totalCategorias ? Math.round((it.valor / totalCategorias) * 100) : 0;
                if (periodoDespesa !== 'mes' || !c || c.media <= 0.5) return `${parte}%`;
                const v = ((c.valor - c.media) / c.media) * 100;
                return <span>{parte}% · <span className={Math.abs(v) < 10 ? '' : v > 0 ? 'text-rose-500' : 'text-emerald-500'}>{pct(v)} vs média</span></span>;
              }}
            />
          )}
        </Cartao>

        <div className="lg:col-span-5 space-y-4">
          <Cartao titulo="Para onde vai o dinheiro" legenda="Despesas por grupo do plano de contas">
            {segmentos.length === 0 ? (
              <p className="py-10 text-center text-[12.5px] text-slate-500">Sem despesas no período.</p>
            ) : (
              <div className="h-[220px]">
                <Anel segmentos={segmentos} centro={<span className="text-[19px]">{brlCurto(totalCategorias)}</span>} legendaDoCentro={periodoDespesa === 'mes' ? 'no mês' : 'em 12 meses'} />
              </div>
            )}
          </Cartao>

          <Cartao
            titulo="Custos subindo"
            legenda={`${MESES_LONGOS[Number(mes.slice(5, 7)) - 1]} contra a média dos 3 meses anteriores`}
            acao={alertas.length > 0 ? <span className="pilula-cartao pilula-cartao--alerta">{alertas.length}</span> : undefined}
          >
            {alertas.length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-emerald-500">Nenhum custo subiu acima do normal.</p>
            ) : (
              <div className="-mx-2.5">
                {alertas.slice(0, 6).map(a => (
                  <LinhaComBolinha
                    key={a.structure}
                    cor="#f59e0b"
                    titulo={a.nome}
                    detalhe={`${a.grupo} · média ${brl(a.media)}`}
                    valor={a.pct == null ? `novo · ${brl(a.atual)}` : `+${brlCurto(a.diferenca)} (${pct(a.pct)})`}
                    valorEmPilula
                  />
                ))}
              </div>
            )}
          </Cartao>
        </div>
      </div>

      <p className="text-[11.5px] text-slate-400 dark:text-slate-500">
        Faturamento, despesas e resultado: DFC (regime de caixa; meses do histórico usam o número importado).
        Recorrência e inadimplência: Clientes Ativos, hoje. Caixa: saldo do Asaas agora.
      </p>
    </div>
  );
}
