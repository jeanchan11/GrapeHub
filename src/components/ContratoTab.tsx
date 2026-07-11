import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { FileText, Download, Loader2, Building2, User } from 'lucide-react';
import ContratoDocument, { exportContratoPdf, ContratoData } from './ContratoDocument';
import { valorPorExtenso, formatBRL } from '../utils/valorExtenso';
import { toast } from '@/src/lib/toast';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// "2026-07-06" → "06 de Julho de 2026" (sem conversão de fuso)
function dataPorExtenso(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  const mes = MESES[m - 1];
  return `${String(d).padStart(2, '0')} de ${mes.charAt(0).toUpperCase() + mes.slice(1)} de ${y}`;
}

// Máscara de CNPJ (00.000.000/0000-00) ou CPF (000.000.000-00)
function mascaraDoc(v: string, tipo: 'juridica' | 'fisica'): string {
  const n = v.replace(/\D/g, '').slice(0, tipo === 'juridica' ? 14 : 11);
  if (tipo === 'juridica') {
    return n
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return n
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ContratoTab: React.FC<{ lead: any }> = ({ lead }) => {
  const [nome, setNome] = useState(lead?.nome || '');
  const [tipoPessoa, setTipoPessoa] = useState<'juridica' | 'fisica'>('juridica');
  const [documento, setDocumento] = useState('');
  const [valor, setValor] = useState<number>(1800);
  const [valorExt, setValorExt] = useState<string>(valorPorExtenso(1800));
  const [dataISO, setDataISO] = useState(todayISO());
  const [exporting, setExporting] = useState(false);

  const docRef = useRef<HTMLDivElement>(null);
  const PREVIEW_SCALE = 0.6;
  const [previewH, setPreviewH] = useState(0);

  // Ajusta a altura do container da prévia à altura real do documento × escala
  // (o transform não altera a medição da paginação lá dentro).
  useLayoutEffect(() => {
    if (!docRef.current) return;
    const el = docRef.current;
    const update = () => setPreviewH(el.offsetHeight * PREVIEW_SCALE);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [nome, tipoPessoa, documento, valor, valorExt, dataISO]);

  // Regenera o extenso quando o valor muda (campo continua editável)
  useEffect(() => { setValorExt(valorPorExtenso(valor)); }, [valor]);

  const data: ContratoData = {
    nome,
    tipoPessoa,
    documento,
    valorNumero: formatBRL(valor),
    valorExtenso: valorExt,
    dataAssinatura: dataPorExtenso(dataISO),
  };

  const handleExport = async () => {
    if (!docRef.current) return;
    setExporting(true);
    try {
      const safe = (nome || 'cliente').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_');
      await exportContratoPdf(docRef.current, `Contrato_${safe}.pdf`);
    } catch (e) {
      console.error('[contrato] falha ao gerar PDF', e);
      toast.error('Falha ao gerar o PDF. Tente novamente.');
    } finally {
      setExporting(false);
    }
  };

  const inputCls = 'w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-3 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors';
  const labelCls = 'block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5';

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      {/* ── Formulário ── */}
      <div className="lg:w-[380px] shrink-0 space-y-4">
        <div className="flex items-center gap-2 text-slate-800 dark:text-white">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center"><FileText size={16} /></div>
          <div>
            <h3 className="font-bold text-sm">Gerar contrato</h3>
            <p className="text-[11px] text-slate-400">Preencha e exporte o PDF</p>
          </div>
        </div>

        <div>
          <label className={labelCls}>Nome do contratante</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome / Razão social" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            {([['juridica', 'Jurídica (CNPJ)', Building2], ['fisica', 'Física (CPF)', User]] as const).map(([val, txt, Icon]) => (
              <button
                key={val}
                onClick={() => { setTipoPessoa(val); setDocumento(''); }}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                  tipoPessoa === val
                    ? 'border-violet-500/50 bg-violet-500/10 text-violet-500'
                    : 'border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <Icon size={14} /> {txt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>{tipoPessoa === 'juridica' ? 'CNPJ' : 'CPF'}</label>
          <input
            value={documento}
            onChange={e => setDocumento(mascaraDoc(e.target.value, tipoPessoa))}
            placeholder={tipoPessoa === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
            className={inputCls}
            inputMode="numeric"
          />
        </div>

        <div>
          <label className={labelCls}>Valor mensal (cláusula 4.1)</label>
          <input
            type="number" min={0} step={0.01} value={valor}
            onChange={e => setValor(parseFloat(e.target.value) || 0)}
            className={inputCls}
          />
          <p className="text-[11px] text-slate-400 mt-1">{formatBRL(valor)}</p>
        </div>

        <div>
          <label className={labelCls}>Valor por extenso <span className="text-slate-300 dark:text-slate-500 normal-case font-medium">(gerado — pode editar)</span></label>
          <textarea
            value={valorExt} onChange={e => setValorExt(e.target.value)} rows={2}
            className={`${inputCls} resize-none`}
          />
        </div>

        <div>
          <label className={labelCls}>Data de assinatura</label>
          <input type="date" value={dataISO} onChange={e => setDataISO(e.target.value)} className={inputCls} />
          <p className="text-[11px] text-slate-400 mt-1">{dataPorExtenso(dataISO)}</p>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm transition-colors"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? 'Gerando PDF...' : 'Exportar PDF'}
        </button>
      </div>

      {/* ── Prévia ── */}
      <div className="flex-1 min-w-0">
        <p className={labelCls}>Prévia</p>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-200/40 dark:bg-black/30 p-4 overflow-auto max-h-[72vh]">
          {/* uma instância só: escalada por transform (medição da paginação intacta) */}
          <div style={{ height: previewH, width: 794 * PREVIEW_SCALE }}>
            <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.18))' }}>
              <ContratoDocument ref={docRef} data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContratoTab;
