import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, Bell, Loader2, Wallet, Play } from 'lucide-react';
import { EVENTO_TESTE_SALDO } from './AlertaSaldoBaixo';
import { toast } from '../lib/toast';

/**
 * Configurações da página de Projetos (engrenagem do topo). Por enquanto só o
 * alerta de saldo baixo — a regra vale para ESTA página e decide quando o popup
 * aparece para o gestor dela. Ver `src/routes/alerta-saldo.ts`.
 *
 * A prévia mostra, com os números de agora, quais contas entrariam no alerta com a
 * regra em edição — para calibrar sem esperar o saldo de alguém acabar.
 */
interface Regra { ativo: boolean; dias: number; minimo: number }
interface Previa { project_id: string; partner: string; saldo: number; gasto_dia: number; dias: number | null }

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ConfigProjetosModal: React.FC<{ pageId: string; pageLabel?: string; onClose: () => void }> = ({ pageId, pageLabel, onClose }) => {
  const [regra, setRegra] = useState<Regra | null>(null);
  const [salvando, setSalvando] = useState(false);
  // A prévia vem com tudo o que o popup usa (página, gasto/dia), não só o que a lista mostra
  const [previa, setPrevia] = useState<(Previa & Record<string, any>)[] | null>(null);
  const [carregandoPrevia, setCarregandoPrevia] = useState(false);

  useEffect(() => {
    fetch(`/api/projetos/${encodeURIComponent(pageId)}/alerta-saldo`)
      .then(r => r.json())
      .then(j => setRegra({ ativo: j.ativo !== false, dias: Number(j.dias) || 0, minimo: Number(j.minimo) || 0 }))
      .catch(() => setRegra({ ativo: true, dias: 3, minimo: 100 }));
  }, [pageId]);

  // Prévia com atraso, para não consultar a cada tecla
  useEffect(() => {
    if (!regra || !regra.ativo) { setPrevia(null); return; }
    setCarregandoPrevia(true);
    const t = setTimeout(() => {
      fetch(`/api/projetos/${encodeURIComponent(pageId)}/alerta-saldo/previa?dias=${regra.dias}&minimo=${regra.minimo}`)
        .then(r => r.json())
        .then(j => setPrevia(j.itens || []))
        .catch(() => setPrevia(null))
        .finally(() => setCarregandoPrevia(false));
    }, 500);
    return () => clearTimeout(t);
  }, [pageId, regra?.ativo, regra?.dias, regra?.minimo]);

  const salvar = async () => {
    if (!regra) return;
    setSalvando(true);
    try {
      const r = await fetch(`/api/projetos/${encodeURIComponent(pageId)}/alerta-saldo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regra),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      toast.success('Alerta de saldo salvo.');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  // Abre o popup de verdade, agora, com as contas da prévia — sem esperar o ciclo de 30 min
  const testar = () => {
    if (!regra || !previa) return;
    if (previa.length === 0) {
      toast.info('Com essa regra nenhuma conta entraria hoje — o popup não apareceria.');
      return;
    }
    window.dispatchEvent(new CustomEvent(EVENTO_TESTE_SALDO, {
      detail: { itens: previa, regra: { dias: regra.dias, minimo: regra.minimo } },
    }));
  };

  const campo = 'w-full px-3 py-2 rounded-lg text-sm modal-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all';

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[520px] bg-white dark:bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-black/5 dark:border-white/5">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center"><Settings size={18} /></div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-light-text dark:text-white">Configurações</h3>
            {pageLabel && <p className="text-xs text-slate-500 truncate">{pageLabel}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-light-text dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"><X size={16} /></button>
        </div>

        {!regra ? (
          <div className="py-16 flex justify-center"><Loader2 size={22} className="animate-spin text-violet-500" /></div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* Liga/desliga */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5"><Bell size={15} /></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-light-text dark:text-white">Alerta de saldo baixo</p>
                <p className="text-xs text-slate-500 mt-0.5">Popup na tela do responsável pela página quando uma conta pré-paga estiver acabando.</p>
              </div>
              <button type="button" onClick={() => setRegra({ ...regra, ativo: !regra.ativo })}
                className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${regra.ativo ? 'bg-violet-600' : 'bg-slate-300 dark:bg-white/10'}`}
                aria-label="Ligar ou desligar o alerta">
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${regra.ativo ? 'left-5' : 'left-1'}`} />
              </button>
            </div>

            {regra.ativo && (
              <>
                <div className="rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Avisar quantos dias antes de acabar</p>
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} max={60} step={1} value={regra.dias}
                        onChange={e => setRegra({ ...regra, dias: Math.max(0, Number(e.target.value) || 0) })}
                        className={`${campo} w-24`} />
                      <span className="text-sm text-slate-500">dias de saldo, pelo gasto médio dos últimos 7 dias</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Ou quando o saldo ficar abaixo de</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">R$</span>
                      <input type="number" min={0} step={10} value={regra.minimo}
                        onChange={e => setRegra({ ...regra, minimo: Math.max(0, Number(e.target.value) || 0) })}
                        className={`${campo} w-32`} />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Basta uma das duas. Os dias pegam a conta que gasta muito (R$ 400 a R$ 170/dia acaba em 2 dias);
                    o valor pega a conta sem gasto recente, que os dias não enxergam. Use 0 para desligar um dos dois.
                  </p>
                </div>

                {/* Prévia */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      Com essa regra, hoje entrariam
                      {carregandoPrevia && <Loader2 size={11} className="animate-spin" />}
                    </p>
                    <button type="button" onClick={testar} disabled={!previa || carregandoPrevia}
                      title="Mostra agora o popup que o responsável veria"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-violet-500 hover:bg-violet-500/10 disabled:opacity-40 transition-colors">
                      <Play size={11} /> Testar popup
                    </button>
                  </div>
                  {previa == null ? null : previa.length === 0 ? (
                    <p className="text-xs text-emerald-500 font-semibold">Nenhuma conta — ninguém seria avisado agora.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {previa.map(p => (
                        <div key={p.project_id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.03]">
                          <Wallet size={13} className="text-orange-500 shrink-0" />
                          <span className="text-xs font-semibold text-light-text dark:text-white truncate flex-1">{p.partner}</span>
                          <span className="text-[11px] text-slate-500 shrink-0">
                            {p.dias == null ? 'sem gasto em 7 dias' : `${p.dias.toLocaleString('pt-BR')} ${p.dias === 1 ? 'dia' : 'dias'}`}
                          </span>
                          <span className="text-xs font-bold text-light-text dark:text-white shrink-0 w-24 text-right">{brl(p.saldo)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-black/5 dark:border-white/5">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-light-text dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5">Cancelar</button>
          <button onClick={salvar} disabled={!regra || salvando}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 flex items-center gap-2">
            {salvando && <Loader2 size={13} className="animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ConfigProjetosModal;
