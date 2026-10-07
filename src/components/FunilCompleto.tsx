import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import FunilVisual from './FunilVisual';

/**
 * Aba "Funil" das Métricas do comercial: o funil de aquisição inteiro, da
 * impressão ao contrato, com a taxa de passagem entre cada etapa e o custo de
 * cada uma. Números do `/api/marketing-dashboard` (mesmos da aba Marketing).
 *
 * As duas últimas taxas mostram também o que o Planejador comercial usa
 * (`/api/comercial-data`) — é onde o planejado costuma descolar do real.
 */

interface Range { start: string; end: string }

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const int = (v: number) => Math.round(v).toLocaleString('pt-BR');
const pctTxt = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toLocaleString('pt-BR', { maximumFractionDigits: a / b < 0.1 ? 1 : 0 })}%` : '—');


const FunilCompleto: React.FC<{ range: Range; versao?: number }> = ({ range, versao = 0 }) => {
  const [k, setK] = useState<any>(null);
  const [plano, setPlano] = useState<any>(null);
  const [meta, setMeta] = useState<{ pageview_lp: number | null; clicou_agendar: number | null; impressoes?: number | null; cliques_link?: number | null; gasto?: number | null; motivo?: string | null } | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    setCarregando(true); setErro('');
    Promise.all([
      fetch(`/api/marketing-dashboard?start=${range.start}&end=${range.end}`).then(r => (r.ok ? r.json() : Promise.reject(new Error('Falha ao carregar o funil')))),
      fetch('/api/comercial-data').then(r => (r.ok ? r.json() : null)).catch(() => null),
      // Pageview da LP e clique no agendar vêm do Insights da Meta (conta da Grape)
      fetch(`/api/marketing-funil-meta?start=${range.start}&end=${range.end}`).then(r => r.json()).catch(() => null),
    ])
      .then(([d, p, m]) => { if (vivo) { setK(d?.kpis || null); setPlano(p); setMeta(m && !m.error ? m : { pageview_lp: null, clicou_agendar: null, motivo: m?.error || 'Não foi possível consultar a Meta.' }); } })
      .catch(e => vivo && setErro(e.message))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [range.start, range.end, versao]);

  if (carregando && !k) return <div className="flex justify-center py-24"><Loader2 size={26} className="animate-spin text-violet-500" /></div>;
  if (erro) return <div className="mx-6 md:mx-8 rounded-xl px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2"><AlertCircle size={16} /> {erro}</div>;
  if (!k) return null;

  // Com a Meta disponível, impressões/cliques/gasto saem dela (mesma atribuição do
  // pageview); sem ela, da tabela `facebook` como na aba Marketing.
  const daMeta = meta?.impressoes != null;
  const gasto = daMeta ? Number(meta!.gasto) || 0 : Number(k.total_spend) || 0;
  const n = (v: any) => Number(v) || 0;
  const impr = daMeta ? n(meta!.impressoes) : n(k.total_impressions);
  const cliques = daMeta ? n(meta!.cliques_link) : n(k.total_clicks);
  // Funil da LP (28/09/2026): anúncio → LP → clique no agendar → formulário de agendamento.
  // As duas etapas do meio saem da Meta; sem elas, aparecem como "—".
  const pageview = meta?.pageview_lp ?? null, clicou = meta?.clicou_agendar ?? null;
  const ou = (v: number | null) => (v == null ? '—' : v);
  const marcadas = n(k.reunioes_marcadas), realizadas = n(k.reunioes_realizadas), contratos = n(k.vendas_trafego);
  const custo = (div: number, rotulo: string) => (div > 0 ? rotulo.replace('#', brl(gasto / div)) : '');

  const etapas = [
    { rotulo: 'Impressões', valor: impr, detalhe: impr ? `CPM ${brl(gasto / impr * 1000)}` : '' },
    { rotulo: daMeta ? 'Cliques no link' : 'Cliques', valor: cliques, detalhe: custo(cliques, 'CPC #') },
    { rotulo: 'Pageview da LP', valor: ou(pageview), detalhe: pageview ? custo(pageview, '# / visita') : '' },
    { rotulo: 'Clicou no agendar', valor: ou(clicou), detalhe: clicou ? custo(clicou, '# / clique') : '' },
    { rotulo: 'Reuniões marcadas', valor: marcadas, detalhe: custo(marcadas, '# / marcada') },
    { rotulo: 'Reuniões realizadas', valor: realizadas, detalhe: custo(realizadas, '# / realizada') },
    { rotulo: 'Contratos', valor: contratos, detalhe: custo(contratos, 'CAC #') },
  ];
  const taxas = [
    { valor: pctTxt(cliques, impr), rotulo: 'CTR', tom: 'blue' as const },
    { valor: pageview == null ? '—' : pctTxt(pageview, cliques), rotulo: 'CARREGOU', tom: 'violet' as const },
    { valor: pageview == null || clicou == null ? '—' : pctTxt(clicou, pageview), rotulo: 'CLICOU', tom: 'blue' as const },
    { valor: clicou == null ? '—' : pctTxt(marcadas, clicou), rotulo: 'AGENDOU', tom: 'rose' as const },
    { valor: pctTxt(realizadas, marcadas), rotulo: 'COMPAREC.', tom: 'amber' as const,
      extra: plano?.noShowRate != null ? `plano ${100 - Number(plano.noShowRate)}%` : undefined },
    { valor: pctTxt(contratos, realizadas), rotulo: 'FECHAM.', tom: 'emerald' as const,
      extra: plano?.meetingToClosingRate != null ? `plano ${Number(plano.meetingToClosingRate)}%` : undefined },
  ];

  return (
    <div className="px-6 md:px-8 pb-10">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* Funil */}
        <div className="bg-dark-card border border-white/10 rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-dark-text">Funil completo</h2>
              <p className="text-xs text-slate-500">Da impressão ao contrato · taxa entre etapas e custo de cada uma</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Investido</p>
              <p className="text-lg font-black text-dark-text">{brl(gasto)}</p>
            </div>
          </div>

          {meta?.motivo && (
            <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
              <AlertCircle size={13} className="shrink-0 mt-0.5" /> <span>{meta.motivo}</span>
            </div>
          )}
          <div className="flex justify-center">
            <FunilVisual id="completo" etapas={etapas} taxas={taxas} className="w-full max-w-[470px] h-auto" />
          </div>

          <p className="text-[10px] text-slate-500 mt-6 leading-relaxed">
            Reuniões contam todas as origens de lead (a maioria é Meta Ads); contratos contam só os de origem "campanhas".
            Realizada = tem anotação da reunião — marcadas que ainda vão acontecer no período aparecem como não comparecidas.
          </p>
        </div>

        {/* Leitura rápida */}
        <div className="space-y-4">
          {[
            { t: 'Do clique ao contrato', v: pctTxt(contratos, cliques), s: `${int(cliques)} cliques → ${int(contratos)} contratos` },
            { t: 'Da visita na LP ao contrato', v: pageview ? pctTxt(contratos, pageview) : '—', s: pageview ? `${int(pageview)} visitas → ${int(contratos)} contratos` : 'aguardando dado da Meta' },
            { t: 'Da reunião marcada ao contrato', v: pctTxt(contratos, marcadas), s: `${int(marcadas)} marcadas → ${int(contratos)} contratos` },
            { t: 'Receita dos contratos do tráfego', v: brl(Number(k.receita_trafego) || 0), s: gasto > 0 ? `${((Number(k.receita_trafego) || 0) / gasto).toFixed(1).replace('.', ',')}× o investido no mês` : '' },
          ].map(c => (
            <div key={c.t} className="bg-dark-card border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.t}</p>
              <p className="text-2xl font-black text-dark-text mt-1">{c.v}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{c.s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FunilCompleto;
