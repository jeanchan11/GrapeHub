import React, { useState, useRef, useLayoutEffect } from 'react';
import { Presentation, Download, Loader2, User } from 'lucide-react';
import PropostaDocument, { exportPropostaPdf, PropostaData } from './PropostaDocument';

const PropostaTab: React.FC<{ lead: any }> = ({ lead }) => {
  const [clientName, setClientName] = useState(lead?.nome || '');
  const [exporting, setExporting] = useState(false);

  const docRef = useRef<HTMLDivElement>(null);
  const PREVIEW_SCALE = 0.44;
  const [previewH, setPreviewH] = useState(0);

  useLayoutEffect(() => {
    if (!docRef.current) return;
    const el = docRef.current;
    const update = () => setPreviewH(el.offsetHeight * PREVIEW_SCALE);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [clientName]);

  const data: PropostaData = { clientName };

  const handleExport = async () => {
    if (!docRef.current) return;
    setExporting(true);
    try {
      const safe = (clientName || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_');
      await exportPropostaPdf(docRef.current, `Proposta_Grape_Midia_${safe}.pdf`);
    } catch (e) {
      console.error('[proposta] falha ao gerar PDF', e);
      alert('Falha ao gerar o PDF. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const inputCls = 'w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-3 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors';
  const labelCls = 'block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5';

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      {/* ── Formulário ── */}
      <div className="lg:w-[340px] shrink-0 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 dark:text-white">
          <div className="w-8 h-8 rounded-lg bg-fuchsia-500/15 text-fuchsia-400 flex items-center justify-center"><Presentation size={16} /></div>
          <div>
            <h3 className="font-bold text-sm">Gerar proposta</h3>
            <p className="text-[11px] text-slate-400">15 slides · exporte o PDF</p>
          </div>
        </div>

        <div>
          <label className={labelCls}><span className="inline-flex items-center gap-1.5"><User size={12} /> Nome do cliente</span></label>
          <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: Escritório Advocacia" className={inputCls} />
          <p className="text-[11px] text-slate-400 mt-1">Aparece na capa da proposta.</p>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 text-white font-bold text-sm transition-colors"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? 'Gerando PDF...' : 'Exportar PDF'}
        </button>
      </div>

      {/* ── Prévia ── */}
      <div className="flex-1 min-w-0">
        <p className={labelCls}>Prévia</p>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-900/60 p-4 overflow-auto max-h-[72vh]">
          <div style={{ height: previewH, width: 1122.5 * PREVIEW_SCALE }}>
            <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.4))' }}>
              <PropostaDocument ref={docRef} data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropostaTab;
