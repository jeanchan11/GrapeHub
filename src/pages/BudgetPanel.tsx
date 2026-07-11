import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Save, Copy, Target } from 'lucide-react';
import ThemedDropdown from '@/src/components/ui/ThemedDropdown';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface Categoria { structure: string; description: string; parent: string; parentDesc: string; tipo: 'receita' | 'despesa'; }
interface OrcData {
  year: string; months: string[]; categorias: Categoria[];
  budget: Record<string, Record<string, number>>;
  realizado: Record<string, Record<string, number>>;
  historicalMonths: string[];
}

const fmt0 = (v: number) => (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const brl0 = (v: number) => `R$ ${fmt0(v)}`;

const BudgetPanel: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [mode, setMode] = useState<'planejar' | 'comparar'>('comparar');
  const [data, setData] = useState<OrcData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // draft = orçado editável (structure -> month -> value)
  const [draft, setDraft] = useState<Record<string, Record<string, number>>>({});
  // período do comparativo: 'YYYY-MM' ou 'ANO' (acumulado)
  const [periodo, setPeriodo] = useState<string>('ANO');

  const load = () => {
    setLoading(true);
    fetch(`/api/financeiro/orcamento?year=${year}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: OrcData | null) => { setData(d); setDraft(d?.budget ? JSON.parse(JSON.stringify(d.budget)) : {}); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, [year]);

  const months = data?.months || [];
  const cats = data?.categorias || [];

  // agrupa categorias por pai (nível 1) preservando ordem
  const grupos = useMemo(() => {
    const map: { parent: string; parentDesc: string; itens: Categoria[] }[] = [];
    for (const c of cats) {
      let g = map.find(x => x.parent === c.parent);
      if (!g) { g = { parent: c.parent, parentDesc: c.parentDesc || c.parent, itens: [] }; map.push(g); }
      g.itens.push(c);
    }
    return map;
  }, [cats]);

  const getDraft = (s: string, m: string) => draft[s]?.[m] ?? 0;
  const setCell = (s: string, m: string, v: number) => {
    setDraft(prev => ({ ...prev, [s]: { ...(prev[s] || {}), [m]: v } }));
  };
  const replicar = (s: string) => {
    const jan = draft[s]?.[months[0]] ?? 0;
    setDraft(prev => ({ ...prev, [s]: months.reduce((acc, m) => ({ ...acc, [m]: jan }), {}) }));
  };

  const salvar = async () => {
    setSaving(true); setMsg(null);
    const items: { ref_month: string; structure: string; value: number }[] = [];
    for (const c of cats) for (const m of months) items.push({ ref_month: m, structure: c.structure, value: getDraft(c.structure, m) });
    try {
      const r = await fetch('/api/financeiro/orcamento', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }),
      });
      if (r.ok) { setMsg('Orçamento salvo.'); load(); } else setMsg('Erro ao salvar.');
    } catch { setMsg('Falha na conexão.'); }
    finally { setSaving(false); setTimeout(() => setMsg(null), 3000); }
  };

  // ── realizado / orçado no período selecionado ──
  const periodMonths = periodo === 'ANO' ? months : [periodo];
  const sumOrc = (s: string) => periodMonths.reduce((a, m) => a + (data?.budget[s]?.[m] ?? 0), 0);
  const sumReal = (s: string) => periodMonths.reduce((a, m) => a + (data?.realizado[s]?.[m] ?? 0), 0);

  const totals = useMemo(() => {
    let recOrc = 0, recReal = 0, despOrc = 0, despReal = 0;
    for (const c of cats) {
      const o = sumOrc(c.structure), r = sumReal(c.structure);
      if (c.tipo === 'receita') { recOrc += o; recReal += r; } else { despOrc += o; despReal += r; }
    }
    return { recOrc, recReal, despOrc, despReal, resOrc: recOrc - despOrc, resReal: recReal - despReal };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, periodo, cats]);

  const yearsel = (
    <div className="flex items-center gap-2">
      <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400"><ChevronLeft size={16} /></button>
      <span className="text-sm font-bold text-dark-text w-12 text-center">{year}</span>
      <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400"><ChevronRight size={16} /></button>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-500"><Loader2 className="animate-spin mr-2" size={18} /> Carregando orçamento...</div>;

  return (
    <div className="space-y-4">
      {/* Barra de controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-dark-card border border-white/10 rounded-lg p-1">
          {(['comparar', 'planejar'] as const).map(k => (
            <button key={k} onClick={() => setMode(k)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${mode === k ? 'bg-violet-500/20 text-violet-300' : 'text-slate-500 hover:text-dark-text'}`}>
              {k === 'comparar' ? 'Orçado vs Realizado' : 'Planejar'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {mode === 'comparar' && (
            <ThemedDropdown value={periodo} options={[{ value: 'ANO', label: 'Ano inteiro (acumulado)' }, ...months.map((m, i) => ({ value: m, label: `${MESES[i]}/${year}` }))]} onChange={setPeriodo} className="w-auto" />
          )}
          {yearsel}
          {mode === 'planejar' && (
            <button onClick={salvar} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Salvar
            </button>
          )}
        </div>
      </div>
      {msg && <p className="text-xs font-semibold text-emerald-400">{msg}</p>}

      {/* ══════════ COMPARAR ══════════ */}
      {mode === 'comparar' && data && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ResumoCard titulo="Receita" orc={totals.recOrc} real={totals.recReal} tipo="receita" />
            <ResumoCard titulo="Despesa" orc={totals.despOrc} real={totals.despReal} tipo="despesa" />
            <ResumoCard titulo="Resultado" orc={totals.resOrc} real={totals.resReal} tipo="resultado" />
          </div>

          {/* Tabela por categoria */}
          <div className="bg-dark-card border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/10">
                  <th className="text-left font-bold px-4 py-3">Categoria</th>
                  <th className="text-right font-bold px-4 py-3">Orçado</th>
                  <th className="text-right font-bold px-4 py-3">Realizado</th>
                  <th className="text-right font-bold px-4 py-3">Variação</th>
                  <th className="text-right font-bold px-4 py-3 w-24">%</th>
                </tr>
              </thead>
              <tbody>
                {grupos.map(g => (
                  <React.Fragment key={g.parent}>
                    <tr className="bg-white/[0.03]">
                      <td colSpan={5} className="px-4 py-2 text-[11px] font-black uppercase tracking-wide text-slate-400">{g.parentDesc}</td>
                    </tr>
                    {g.itens.map(c => {
                      const o = sumOrc(c.structure), r = sumReal(c.structure);
                      const varr = r - o; // >0 realizado acima do orçado
                      const pctv = o > 0 ? (varr / o) * 100 : (r > 0 ? 100 : 0);
                      // despesa acima = ruim (vermelho); receita acima = bom (verde)
                      const bom = c.tipo === 'receita' ? varr >= 0 : varr <= 0;
                      const cor = Math.abs(varr) < 1 ? 'text-slate-500' : bom ? 'text-emerald-400' : 'text-rose-400';
                      return (
                        <tr key={c.structure} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 text-dark-text">{c.description}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-400">{o ? brl0(o) : '—'}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-dark-text font-semibold">{r ? brl0(r) : '—'}</td>
                          <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${cor}`}>{Math.abs(varr) < 1 ? '—' : `${varr > 0 ? '+' : '−'}${fmt0(Math.abs(varr))}`}</td>
                          <td className={`px-4 py-2.5 text-right tabular-nums text-xs ${cor}`}>{o ? `${pctv > 0 ? '+' : ''}${pctv.toFixed(0)}%` : '—'}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5"><Target size={12} /> Meses fechados usam o realizado histórico; o mês corrente é calculado ao vivo. Preencha o orçado na aba "Planejar".</p>
        </>
      )}

      {/* ══════════ PLANEJAR ══════════ */}
      {mode === 'planejar' && data && (
        <div className="bg-dark-card border border-white/10 rounded-xl overflow-x-auto">
          <table className="text-sm min-w-max">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/10">
                <th className="text-left font-bold px-3 py-3 sticky left-0 bg-dark-card z-10 min-w-[220px]">Categoria</th>
                {MESES.map(m => <th key={m} className="text-right font-bold px-2 py-3 min-w-[80px]">{m}</th>)}
                <th className="text-center font-bold px-2 py-3">↻</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map(g => (
                <React.Fragment key={g.parent}>
                  <tr className="bg-white/[0.03]">
                    <td colSpan={14} className="px-3 py-2 text-[11px] font-black uppercase tracking-wide text-slate-400 sticky left-0 bg-dark-card">{g.parentDesc}</td>
                  </tr>
                  {g.itens.map(c => (
                    <tr key={c.structure} className="border-b border-white/5">
                      <td className="px-3 py-1.5 text-dark-text sticky left-0 bg-dark-card z-10">{c.description}</td>
                      {months.map(m => (
                        <td key={m} className="px-1 py-1">
                          <input type="number" value={getDraft(c.structure, m) || ''} placeholder="0"
                            onChange={e => setCell(c.structure, m, parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent text-right tabular-nums text-dark-text text-xs px-1.5 py-1 rounded border border-transparent hover:border-white/10 focus:border-violet-500 focus:bg-white/5 outline-none" />
                        </td>
                      ))}
                      <td className="px-1 py-1 text-center">
                        <button onClick={() => replicar(c.structure)} title="Replicar Jan para o ano todo"
                          className="p-1 rounded text-slate-500 hover:text-violet-400 hover:bg-white/5"><Copy size={13} /></button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const ResumoCard = ({ titulo, orc, real, tipo }: { titulo: string; orc: number; real: number; tipo: 'receita' | 'despesa' | 'resultado' }) => {
  const varr = real - orc;
  const bom = tipo === 'despesa' ? varr <= 0 : varr >= 0;
  const cor = Math.abs(varr) < 1 ? 'text-slate-400' : bom ? 'text-emerald-400' : 'text-rose-400';
  return (
    <div className="bg-dark-card border border-white/10 rounded-xl p-4">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{titulo}</p>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[10px] text-slate-500">Realizado</p>
          <p className="text-lg font-black text-dark-text">{brl0(real)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500">Orçado</p>
          <p className="text-sm font-bold text-slate-400">{orc ? brl0(orc) : '—'}</p>
        </div>
      </div>
      <p className={`text-xs font-semibold mt-2 ${cor}`}>
        {Math.abs(varr) < 1 ? 'Sem orçamento definido' : `${varr > 0 ? '+' : '−'}${brl0(Math.abs(varr))} vs orçado`}
      </p>
    </div>
  );
};

export default BudgetPanel;
