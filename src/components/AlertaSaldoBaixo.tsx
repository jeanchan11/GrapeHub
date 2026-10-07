import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Wallet, X, ArrowRight } from 'lucide-react';

/**
 * Popup de saldo baixo para o gestor da página de Projetos (`/api/alertas/saldo-baixo`).
 * Aparece em qualquer tela do GrapeHub, só para quem é responsável por uma página de
 * Projetos, e só com contas pré-pagas abaixo da regra (ver `src/routes/alerta-saldo.ts`).
 *
 * Confere ao abrir o app e a cada 30 min. "Lembrar em 4h" (ou fechar no X, 1h) adia
 * cada projeto da lista; um projeto NOVO entrando na lista faz o popup voltar na hora.
 * O adiamento fica no navegador (localStorage), por ser só conveniência de quem vê.
 *
 * Teste: o botão "Testar popup" das Configurações de Projetos dispara o evento
 * `alerta-saldo:testar` com a prévia da regra; o popup abre na hora, para quem
 * clicou, marcado como teste e sem adiar nada.
 */
export const EVENTO_TESTE_SALDO = 'alerta-saldo:testar';

interface Item {
  project_id: string;
  partner: string;
  page_id: string;
  page_label: string;
  saldo: number;
  gasto_dia: number;
  dias: number | null;
}

const CHAVE = 'alerta-saldo-adiado';
const INTERVALO = 30 * 60 * 1000;
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const lerAdiados = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch { return {}; }
};
const adiar = (ids: string[], ms: number) => {
  try {
    const atual = lerAdiados();
    const agora = Date.now();
    // limpa os vencidos para a chave não crescer para sempre
    for (const k of Object.keys(atual)) if (atual[k] < agora) delete atual[k];
    for (const id of ids) atual[id] = agora + ms;
    localStorage.setItem(CHAVE, JSON.stringify(atual));
  } catch { /* sem storage: o popup só volta na próxima conferência */ }
};

const AlertaSaldoBaixo: React.FC<{ onAbrirPagina: (pageId: string) => void }> = ({ onAbrirPagina }) => {
  const [itens, setItens] = useState<Item[]>([]);
  const [regra, setRegra] = useState<{ dias: number; minimo: number } | null>(null);
  const [aberto, setAberto] = useState(false);
  const [teste, setTeste] = useState(false);
  const testeAberto = useRef(false); // a conferência periódica não atropela um teste aberto

  const conferir = useCallback(async () => {
    try {
      const r = await fetch('/api/alertas/saldo-baixo');
      if (!r.ok) return;
      const j = await r.json();
      const lista: Item[] = j.itens || [];
      const adiados = lerAdiados();
      const pendentes = lista.filter(i => !(adiados[i.project_id] > Date.now()));
      if (testeAberto.current) return;
      setItens(lista);
      setRegra(j.regra || null);
      if (pendentes.length > 0) setAberto(true);
    } catch { /* falha de rede: tenta de novo no próximo ciclo */ }
  }, []);

  useEffect(() => {
    // pequeno atraso para não competir com o carregamento da página inicial
    const t = setTimeout(conferir, 4000);
    const iv = setInterval(conferir, INTERVALO);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [conferir]);

  useEffect(() => {
    const abrirTeste = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      setItens(d.itens || []);
      setRegra(d.regra || null);
      setTeste(true);
      testeAberto.current = true;
      setAberto(true);
    };
    window.addEventListener(EVENTO_TESTE_SALDO, abrirTeste);
    return () => window.removeEventListener(EVENTO_TESTE_SALDO, abrirTeste);
  }, []);

  if (!aberto || itens.length === 0) return null;

  const fechar = (ms: number) => { if (!teste) adiar(itens.map(i => i.project_id), ms); setAberto(false); setTeste(false); testeAberto.current = false; };
  const paginas = Array.from(new Set(itens.map(i => i.page_id)));

  const situacao = (i: Item) => {
    if (i.saldo <= 0.5) return { t: 'Zerado — campanhas paradas', c: 'text-rose-500' };
    if (i.dias == null) return { t: 'Sem gasto nos últimos 7 dias', c: 'text-slate-500' };
    if (i.dias < 1) return { t: 'Acaba hoje', c: 'text-rose-500' };
    return { t: `≈ ${i.dias.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${i.dias < 2 ? 'dia' : 'dias'} de saldo`, c: 'text-amber-500' };
  };

  return createPortal(
    <div className="fixed inset-0 z-[9100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[480px] bg-white dark:bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-start gap-3 px-6 pt-6 pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-light-text dark:text-white">
              Saldo baixo em {itens.length} {itens.length === 1 ? 'conta de anúncio' : 'contas de anúncio'}
              {teste && <span className="ml-2 align-middle px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-500">Teste</span>}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Recarregue antes que as campanhas parem.
              {regra ? ` Entra aqui conta pré-paga com menos de ${regra.dias} dias de saldo ou abaixo de ${brl(regra.minimo)}.` : ''}
            </p>
          </div>
          <button onClick={() => fechar(60 * 60 * 1000)} className="p-1.5 rounded-lg text-slate-400 hover:text-light-text dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5" title="Fechar (volta em 1 hora)">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 pb-2 max-h-[50vh] overflow-y-auto">
          {itens.map(i => {
            const s = situacao(i);
            return (
              <button key={i.project_id} onClick={() => { fechar(4 * 60 * 60 * 1000); onAbrirPagina(i.page_id); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-black/[0.03] dark:hover:bg-white/5 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0"><Wallet size={14} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-light-text dark:text-white truncate">{i.partner}</p>
                  <p className={`text-[11px] font-medium ${s.c}`}>
                    {s.t}
                    {i.gasto_dia > 0 && <span className="text-slate-500 font-normal"> · gasta {brl(i.gasto_dia)}/dia</span>}
                    {paginas.length > 1 && <span className="text-slate-500 font-normal"> · {i.page_label}</span>}
                  </p>
                </div>
                <p className="text-sm font-black text-light-text dark:text-white shrink-0">{brl(i.saldo)}</p>
                <ArrowRight size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-black/5 dark:border-white/5">
          <button onClick={() => fechar(4 * 60 * 60 * 1000)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-light-text dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            Lembrar em 4h
          </button>
          <button onClick={() => { fechar(4 * 60 * 60 * 1000); onAbrirPagina(paginas[0]); }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-colors">
            Abrir projetos
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AlertaSaldoBaixo;
