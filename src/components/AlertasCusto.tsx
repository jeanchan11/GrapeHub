import React, { useMemo, useState } from 'react';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { calcularAlertasCusto, PCT_MINIMO, DIFERENCA_MINIMA, AlertaCusto } from '../lib/alertasCusto';
import { PopupLancamentos } from './DespesasPorCategoria';

/**
 * Painel "Custos subindo" da aba Despesas do DFC. Mês de referência = o último
 * com movimento (trocável); base = média dos até 3 meses anteriores. Clicar num
 * alerta abre os lançamentos da categoria no mês — o porquê do aumento.
 */
interface DreRow { structure: string; description: string; values: Record<string, number>; }

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const nomeMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const AlertasCusto: React.FC<{ rows: DreRow[]; meses: string[]; grupos: string[] }> = ({ rows, meses, grupos }) => {
  const [mesRef, setMesRef] = useState(meses[meses.length - 1]);
  const [aberto, setAberto] = useState(true);
  const [popup, setPopup] = useState<AlertaCusto | null>(null);

  const { alertas, base } = useMemo(() => calcularAlertasCusto(rows, meses, mesRef, grupos), [rows, meses, mesRef, grupos]);
  const baseTxt = base.length === 0 ? '' : base.length === 1 ? nomeMes(base[0]) : `${nomeMes(base[0])}–${nomeMes(base[base.length - 1])}`;
  const totalSubida = alertas.reduce((s, a) => s + a.diferenca, 0);

  return (
    <div className={`bg-dark-card border rounded-2xl ${alertas.length ? 'border-rose-500/30' : 'border-white/10'}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-4">
        <button onClick={() => setAberto(a => !a)} className="flex items-center gap-2.5 text-left min-w-0">
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${alertas.length ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
            <TrendingUp size={16} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-dark-text">
              {alertas.length
                ? `${alertas.length} ${alertas.length === 1 ? 'custo subindo' : 'custos subindo'} · +${brl(totalSubida)} no mês`
                : 'Nenhum custo fora do normal'}
            </span>
            <span className="block text-[11px] text-slate-500">
              {base.length ? `${nomeMes(mesRef)} contra a média de ${baseTxt}` : 'Sem meses anteriores para comparar'}
              {' · '}alerta quando sobe ≥ {PCT_MINIMO}% e ≥ R$ {DIFERENCA_MINIMA}
            </span>
          </span>
          {alertas.length > 0 && <ChevronDown size={15} className={`text-slate-500 shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} />}
        </button>
        <select value={mesRef} onChange={e => setMesRef(e.target.value)}
          className="bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-dark-text outline-none">
          {meses.slice(1).reverse().map(m => <option key={m} value={m}>{nomeMes(m)}</option>)}
        </select>
      </div>

      {aberto && alertas.length > 0 && (
        <div className="px-3 pb-3">
          <div className="grid grid-cols-[1fr_110px_110px_130px] gap-2 px-3 pb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Categoria</span><span className="text-right">Média</span><span className="text-right">{nomeMes(mesRef)}</span><span className="text-right">Aumento</span>
          </div>
          {alertas.map(a => (
            <button key={a.structure} onClick={() => setPopup(a)}
              className="w-full grid grid-cols-[1fr_110px_110px_130px] gap-2 items-center px-3 py-2.5 rounded-xl text-left hover:bg-white/[0.04] transition-colors">
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-dark-text truncate">{a.nome}</span>
                <span className="block text-[10px] text-slate-500 truncate"><span className="font-mono">{a.structure}</span> · {a.grupo}</span>
              </span>
              <span className="text-right text-[12px] tabular-nums text-slate-400">{a.pct === null ? '—' : brl(a.media)}</span>
              <span className="text-right text-[13px] tabular-nums font-bold text-rose-400">{brl(a.atual)}</span>
              <span className="text-right tabular-nums">
                <span className="block text-[13px] font-bold text-rose-400">+{brl(a.diferenca)}</span>
                <span className="block text-[10px] font-bold text-rose-300/80">{a.pct === null ? 'custo novo' : `+${a.pct.toFixed(0)}%`}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {popup && (
        <PopupLancamentos
          structure={popup.structure}
          nome={popup.nome}
          de={mesRef}
          ate={mesRef}
          valorDre={-popup.atual}
          onFechar={() => setPopup(null)}
        />
      )}
    </div>
  );
};

export default AlertasCusto;
