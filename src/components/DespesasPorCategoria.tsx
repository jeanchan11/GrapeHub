import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { PieChart, Pie, Cell } from 'recharts';
import { ChevronLeft, ChevronRight, X, Loader2, Info } from 'lucide-react';

/**
 * Rosca das Despesas Operacionais (grupo 02 do plano) no Dashboard do DRE.
 *
 * Três níveis, sempre com o MESMO número do DRE:
 *   1. subcategorias de 02 (02.01 Impostos, 02.02 Prestação de Serviço…);
 *   2. clicou numa → as categorias dela (02.02.07 Domínios, 02.02.10 Custos de IA…);
 *   3. clicou numa categoria → popup com os lançamentos (`/api/financeiro/dre/lancamentos`).
 *
 * Os valores dos níveis 1 e 2 saem das linhas do próprio `/api/financeiro/dre` —
 * inclusive nos meses de histórico importado (Marvee), onde não há lançamento
 * por trás. Por isso o popup avisa quando o período tem mês histórico.
 */

interface DreRow { structure: string; description: string; level: number; values: Record<string, number>; total: number; }

const CORES = ['#f74c4c', '#8b5cf6', '#f59e0b', '#3b82f6', '#2ecc8f', '#ec4899', '#14b8a6', '#f97316', '#a3e635', '#64748b', '#06b6d4', '#eab308'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const brl0 = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const profundidade = (s: string) => s.split('.').length;
const nomeMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;

interface Fatia { structure: string; nome: string; valor: number; cor: string; temFilhos: boolean }

const DespesasPorCategoria: React.FC<{
  rows: DreRow[];
  meses: string[];              // meses do ano com movimento (YYYY-MM), na ordem
  historicos: string[];
  raiz?: string;                // grupo analisado (padrão: 02 Despesas Operacionais)
  grande?: boolean;             // aba própria: rosca e lista maiores, ocupando a tela
}> = ({ rows, meses, historicos, raiz = '02', grande = false }) => {
  // Medidas da rosca: a aba Despesas usa a versão grande.
  const D = grande ? 460 : 280;
  const C = D / 2;
  // Anel fino na versão grande: sobra miolo para o resumo do período.
  const [RI, RE] = grande ? [164, 214] : [84, 122];
  const [periodo, setPeriodo] = useState<'ano' | string>('ano');
  const [aberto, setAberto] = useState<string | null>(null);   // subcategoria em foco (nível 2)
  const [hover, setHover] = useState<number | null>(null);
  const [popup, setPopup] = useState<{ structure: string; nome: string; valorDre: number } | null>(null);

  const mesesPeriodo = periodo === 'ano' ? meses : [periodo];
  const valorDe = (r: DreRow) => -mesesPeriodo.reduce((s, m) => s + (r.values[m] || 0), 0); // despesa em magnitude

  const nomeRaiz = rows.find(r => r.structure === raiz)?.description || 'Despesas Operacionais';
  const foco = aberto ? rows.find(r => r.structure === aberto) : null;
  const pai = aberto || raiz;

  const fatias: Fatia[] = useMemo(() => {
    const filhos = rows.filter(r => r.structure.startsWith(pai + '.') && profundidade(r.structure) === profundidade(pai) + 1);
    return filhos
      .map(r => ({
        structure: r.structure,
        nome: r.description,
        valor: valorDe(r),
        cor: '',
        temFilhos: rows.some(x => x.structure.startsWith(r.structure + '.')),
      }))
      .filter(f => f.valor > 0.005)          // estorno líquido (entrada numa conta de despesa) não vira fatia
      .sort((a, b) => b.valor - a.valor)
      .map((f, i) => ({ ...f, cor: CORES[i % CORES.length] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, pai, periodo, meses]);

  const total = fatias.reduce((s, f) => s + f.valor, 0);
  const pct = (v: number, base: number) => `${((v / base) * 100).toFixed(1).replace('.', ',')}%`;

  // Faturamento do período (grupo 01) — para ler a despesa como % da receita.
  const linhaReceita = rows.find(r => r.structure === '01');
  const receita = linhaReceita ? mesesPeriodo.reduce((s, m) => s + (linhaReceita.values[m] || 0), 0) : 0;

  // Mês isolado: variação contra o mês anterior, na mesma linha do plano.
  const idx = periodo === 'ano' ? -1 : meses.indexOf(periodo);
  const mesAnterior = idx > 0 ? meses[idx - 1] : null;
  const linhaPai = rows.find(r => r.structure === pai);
  const anterior = mesAnterior && linhaPai ? -(linhaPai.values[mesAnterior] || 0) : 0;
  const atual = linhaPai ? -mesesPeriodo.reduce((s, m) => s + (linhaPai.values[m] || 0), 0) : 0;
  const variacao = mesAnterior && anterior > 0.005 ? ((atual - anterior) / anterior) * 100 : null;
  const emFoco = hover !== null ? fatias[hover] : null;

  const clicar = (f: Fatia) => {
    setHover(null);
    if (!aberto && f.temFilhos) setAberto(f.structure);
    else setPopup({ structure: f.structure, nome: f.nome, valorDre: -f.valor });
  };

  // Troca de período mantém o foco; se a subcategoria some no período, volta.
  useEffect(() => { setHover(null); }, [periodo, aberto]);

  const de = mesesPeriodo[0];
  const ate = mesesPeriodo[mesesPeriodo.length - 1];

  return (
    <div className={`bg-dark-card border border-white/10 rounded-2xl ${grande ? 'p-7 min-h-[calc(100vh-300px)]' : 'p-5'}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <div className={`flex items-center gap-1.5 ${grande ? 'text-lg' : 'text-sm'} font-bold text-dark-text`}>
            {aberto ? (
              <>
                <button onClick={() => setAberto(null)} className="flex items-center gap-1 text-slate-400 hover:text-violet-400 transition-colors">
                  <ChevronLeft size={15} /> {nomeRaiz}
                </button>
                <ChevronRight size={13} className="text-slate-600" />
                <span className="truncate">{foco?.description}</span>
              </>
            ) : <span>{nomeRaiz} por categoria</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {aberto ? 'Clique numa categoria para ver os lançamentos' : 'Clique numa fatia para abrir as categorias dela'}
          </p>
        </div>

        {/* Período: ano inteiro ou um mês */}
        <div className="flex items-center gap-1 flex-wrap bg-black/20 border border-white/5 rounded-xl p-0.5">
          {(['ano', ...meses] as string[]).map(m => (
            <button key={m} onClick={() => setPeriodo(m)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                periodo === m ? 'bg-violet-500 text-white' : historicos.includes(m) ? 'text-slate-500 hover:text-white' : 'text-amber-400/80 hover:text-amber-300'}`}>
              {m === 'ano' ? 'Ano' : MESES[Number(m.slice(5, 7)) - 1]}
            </button>
          ))}
        </div>
      </div>

      {fatias.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">Nenhuma despesa nesta categoria no período.</p>
      ) : (
        <div className={`flex flex-col lg:flex-row items-center ${grande ? 'gap-14 py-6 lg:px-6' : 'gap-8'}`}>
          <div className="relative shrink-0" style={{ width: D, height: D }}>
            <PieChart width={D} height={D}>
              <Pie
                data={fatias}
                cx={C} cy={C}
                innerRadius={RI} outerRadius={RE}
                dataKey="valor"
                strokeWidth={0}
                paddingAngle={fatias.length > 1 ? 2 : 0}
                startAngle={90} endAngle={-270}
                animationDuration={600}
                onMouseEnter={(_, i) => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={(_, i) => clicar(fatias[i])}
              >
                {fatias.map((f, i) => (
                  <Cell key={f.structure} fill={f.cor}
                    style={{
                      cursor: 'pointer',
                      transform: hover === i ? 'scale(1.04)' : 'scale(1)',
                      transformOrigin: `${C}px ${C}px`,
                      transition: 'transform .15s ease, opacity .15s ease',
                      opacity: hover === null || hover === i ? 1 : 0.35,
                    }} />
                ))}
              </Pie>
            </PieChart>
            {/* Centro: resumo do período ou a fatia sob o mouse */}
            <div className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center ${grande ? 'px-24' : 'px-16'}`}>
              {emFoco ? (
                <>
                  <p className={`${grande ? 'text-[12px]' : 'text-[10px]'} font-bold uppercase tracking-wider line-clamp-2`} style={{ color: emFoco.cor }}>{emFoco.nome}</p>
                  <p className={`${grande ? 'text-[24px] mt-1.5' : 'text-[18px] mt-1'} font-black tabular-nums leading-tight text-dark-text`}>{brl0(emFoco.valor)}</p>
                  <p className={`${grande ? 'text-[13px]' : 'text-[11px]'} font-bold tabular-nums mt-1`} style={{ color: emFoco.cor }}>
                    {pct(emFoco.valor, total)} do total
                  </p>
                  {grande && receita > 0 && (
                    <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">{pct(emFoco.valor, receita)} do faturamento</p>
                  )}
                </>
              ) : (
                <>
                  <p className={`${grande ? 'text-[11px]' : 'text-[10px]'} font-bold uppercase tracking-wider text-slate-500`}>
                    {periodo === 'ano' ? `Total · ${meses.length} meses` : `Total ${nomeMes(periodo)}`}
                  </p>
                  <p className={`${grande ? 'text-[26px] mt-1' : 'text-[20px]'} font-black tabular-nums leading-tight text-dark-text`}>{brl0(total)}</p>
                  {grande && (
                    <div className="mt-2 space-y-0.5 text-[11px] text-slate-500 tabular-nums">
                      {receita > 0 && <p><span className="font-bold text-slate-300">{pct(total, receita)}</span> do faturamento</p>}
                      {variacao !== null && (
                        <p>
                          <span className={`font-bold ${variacao > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {variacao > 0 ? '▲' : '▼'} {Math.abs(variacao).toFixed(1).replace('.', ',')}%
                          </span> vs {nomeMes(mesAnterior!)}
                        </p>
                      )}
                      {periodo === 'ano' && meses.length > 0 && <p>média {brl0(total / meses.length)}/mês</p>}
                      <p>{fatias.length} {fatias.length === 1 ? 'categoria' : 'categorias'}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className={`flex-1 min-w-0 w-full ${grande ? 'space-y-1' : 'space-y-0.5'}`}>
            {fatias.map((f, i) => (
              <button key={f.structure} onClick={() => clicar(f)}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                className={`w-full flex items-center gap-3 px-3 ${grande ? 'py-3.5' : 'py-2'} rounded-xl text-left transition-colors ${hover === i ? 'bg-white/5' : 'hover:bg-white/[0.03]'}`}>
                <span className={`${grande ? 'w-4 h-4' : 'w-3 h-3'} rounded-[4px] shrink-0`} style={{ background: f.cor }} />
                <span className={`${grande ? 'text-[12px] w-[72px]' : 'text-[10px] w-[62px]'} font-mono text-slate-500 shrink-0`}>{f.structure}</span>
                <span className={`flex-1 min-w-0 ${grande ? 'text-[16px]' : 'text-[13px]'} font-semibold text-dark-text truncate`} title={f.nome}>{f.nome}</span>
                <span className={`${grande ? 'text-[16px]' : 'text-[13px]'} font-bold tabular-nums text-rose-400 shrink-0`}>{brl(f.valor)}</span>
                <span className={`${grande ? 'text-[13px] w-14' : 'text-[11px] w-12'} font-bold tabular-nums text-slate-500 text-right shrink-0`}>
                  {((f.valor / total) * 100).toFixed(0)}%
                </span>
                {!aberto && f.temFilhos ? <ChevronRight size={14} className="text-slate-600 shrink-0" /> : <span className="w-[14px] shrink-0" />}
              </button>
            ))}
            <div className={`flex items-center justify-between px-3 pt-3 mt-1 border-t border-white/5 ${grande ? 'text-[16px]' : 'text-[12px]'} font-bold`}>
              <span className="text-slate-400">Total</span>
              <span className={`tabular-nums text-rose-400 ${grande ? 'pr-[82px]' : 'pr-[74px]'}`}>{brl(total)}</span>
            </div>
          </div>
        </div>
      )}

      {popup && (
        <PopupLancamentos
          structure={popup.structure}
          nome={popup.nome}
          de={de}
          ate={ate}
          valorDre={popup.valorDre}
          onFechar={() => setPopup(null)}
        />
      )}
    </div>
  );
};

// ── Popup: lançamentos da categoria ─────────────────────────────────────────
const CONTA: Record<string, { rotulo: string; cls: string }> = {
  asaas: { rotulo: 'Asaas', cls: 'bg-violet-500/15 text-violet-400' },
  sicredi: { rotulo: 'Cartão Sicredi', cls: 'bg-blue-500/15 text-blue-400' },
  asaas_cartao: { rotulo: 'Cartão Asaas', cls: 'bg-amber-500/15 text-amber-400' },
};

export const PopupLancamentos: React.FC<{
  structure: string; nome: string; de: string; ate: string; valorDre: number; onFechar: () => void;
}> = ({ structure, nome, de, ate, valorDre, onFechar }) => {
  const [dados, setDados] = useState<{ itens: any[]; total: number; meses_historicos: string[] } | null>(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    fetch(`/api/financeiro/dre/lancamentos?structure=${encodeURIComponent(structure)}&de=${de}&ate=${ate}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(setDados)
      .catch(() => setErro('Não foi possível carregar os lançamentos.'));
  }, [structure, de, ate]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onFechar]);

  const itens = (dados?.itens || []).filter(i =>
    !busca.trim() || String(i.descricao || '').toLowerCase().includes(busca.trim().toLowerCase()));
  const difere = dados && Math.abs(dados.total - valorDre) > 0.01;
  const periodoTxt = de === ate ? nomeMes(de) : `${nomeMes(de)} a ${nomeMes(ate)}`;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <div className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-dark-bg border border-white/10 rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-mono text-slate-500">{structure}</p>
            <h3 className="text-lg font-black text-dark-text truncate">{nome}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {periodoTxt} · {dados ? `${dados.itens.length} lançamento${dados.itens.length === 1 ? '' : 's'}` : '…'}
            </p>
          </div>
          <div className="flex items-start gap-4 shrink-0">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No DFC</p>
              <p className="text-lg font-black text-rose-400 tabular-nums">{brl(Math.abs(valorDre))}</p>
            </div>
            <button onClick={onFechar} className="text-slate-400 hover:text-dark-text mt-1"><X size={18} /></button>
          </div>
        </div>

        {dados && dados.meses_historicos.length > 0 && (
          <div className="mx-6 mt-4 flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>
              {dados.meses_historicos.map(nomeMes).join(', ')} {dados.meses_historicos.length === 1 ? 'vem' : 'vêm'} do histórico importado (Marvee):
              o DFC usa o número importado e a lista mostra só o que existe de lançamento no GrapeHub.
              {difere && <> Soma da lista: <b>{brl(Math.abs(dados.total))}</b>.</>}
            </span>
          </div>
        )}

        {dados && dados.itens.length > 6 && (
          <div className="px-6 pt-4">
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar lançamento…"
              className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-dark-text outline-none focus:border-violet-500/50" />
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-3 py-3">
          {erro ? <p className="py-12 text-center text-sm text-rose-400">{erro}</p>
            : !dados ? <div className="py-12 flex justify-center"><Loader2 size={22} className="animate-spin text-violet-500" /></div>
            : itens.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">Nenhum lançamento no GrapeHub para este período.</p>
            : itens.map(i => {
              const conta = CONTA[i.account] || CONTA.asaas;
              const data = String(i.transaction_date || '').slice(0, 10).split('-').reverse().join('/');
              const entrada = i.type === 1;
              return (
                <div key={i.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-dark-text truncate" title={i.descricao_original}>{i.descricao || '—'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                      <span>{data}</span>
                      <span className={`px-1.5 py-0.5 rounded-full font-bold ${conta.cls}`}>{conta.rotulo}</span>
                      {i.billing_month && <span>· fatura {nomeMes(i.billing_month)}</span>}
                      {i.structure !== structure && <span className="truncate">· {i.categoria}</span>}
                    </div>
                  </div>
                  <span className={`text-[13px] font-bold tabular-nums shrink-0 ${entrada ? 'text-emerald-400' : 'text-rose-400'}`}
                    title={entrada ? 'Entrada nesta conta de despesa (estorno) — abate do total' : undefined}>
                    {entrada ? '+' : '−'}{brl(i.value)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DespesasPorCategoria;
