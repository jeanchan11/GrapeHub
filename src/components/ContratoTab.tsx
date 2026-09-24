import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import {
  FileText, Download, Loader2, Building2, User, PenLine, Copy, Check,
  ExternalLink, RefreshCw, MessageCircle,
} from 'lucide-react';
import ContratoDocument, { exportContratoPdf, contratoPdfBase64, medirAssinaturas, ContratoData } from './ContratoDocument';
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

interface DocZapsign {
  id: number; doc_token: string; sign_url: string | null; status: string;
  nome: string; signatario: string | null; signed_file: string | null;
  created_at: string; signed_at: string | null;
  /** Link da Grape (2º signatário). Só vale depois que o cliente assinar. */
  grape_sign_url: string | null; grape_signed_at: string | null;
}

// Rótulos dos status que o ZapSign devolve.
const STATUS: Record<string, { texto: string; cor: string }> = {
  pending: { texto: 'Aguardando assinatura', cor: 'text-amber-500 bg-amber-500/10' },
  signed:  { texto: 'Assinado', cor: 'text-emerald-500 bg-emerald-500/10' },
  refused: { texto: 'Recusado', cor: 'text-rose-500 bg-rose-500/10' },
};

// Só dígitos, com o 55 na frente — formato que o link do WhatsApp espera.
const zap = (tel: string) => {
  const n = String(tel || '').replace(/\D/g, '');
  return n.startsWith('55') ? n : `55${n}`;
};

const ContratoTab: React.FC<{ lead: any }> = ({ lead }) => {
  const [nome, setNome] = useState(lead?.nome || '');
  const [tipoPessoa, setTipoPessoa] = useState<'juridica' | 'fisica'>('juridica');
  const [documento, setDocumento] = useState('');
  const [valor, setValor] = useState<number>(1800);
  const [valorExt, setValorExt] = useState<string>(valorPorExtenso(1800));
  const [dataISO, setDataISO] = useState(todayISO());
  const [exporting, setExporting] = useState(false);

  // ── Assinatura (ZapSign) ──
  // O telefone sai do lead: é por ele que o cliente recebe o código para assinar.
  const [telefone, setTelefone] = useState(
    String(lead?.telefone || lead?.form_telefone_whatsapp || '').trim());
  const [enviando, setEnviando] = useState(false);
  const [docs, setDocs] = useState<DocZapsign[]>([]);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState<string | null>(null);

  const carregarDocs = useCallback(async () => {
    if (!lead?.id) return;
    try {
      const r = await fetch(`/api/zapsign/contratos?lead_id=${lead.id}`);
      if (r.ok) setDocs(await r.json());
    } catch { /* silencioso: é só o histórico */ }
  }, [lead?.id]);

  useEffect(() => { void carregarDocs(); }, [carregarDocs]);

  const enviarParaAssinatura = async () => {
    if (!docRef.current) return;
    if (!nome.trim()) { toast.error('Preencha o nome do contratante.'); return; }
    if (!documento.replace(/\D/g, '')) {
      toast.error(`Preencha o ${tipoPessoa === 'juridica' ? 'CNPJ' : 'CPF'} — ele vai impresso no contrato.`);
      return;
    }
    setEnviando(true);
    try {
      // O MESMO PDF da prévia: nada é remontado no servidor, então o que o
      // cliente assina é exatamente o que está na tela.
      const base64 = await contratoPdfBase64(docRef.current);
      if (!base64) throw new Error('Não consegui montar o PDF.');

      // Onde a assinatura do cliente deve entrar. Medido agora, no documento
      // renderizado, porque a linha muda de página conforme o texto cresce.
      const { cliente: posicao, grape: posicaoGrape } = medirAssinaturas(docRef.current);
      // Sem posição, o ZapSign assina na régua padrão dele e a assinatura não
      // aparece em cima da linha — vale saber no console em vez de descobrir
      // só depois que o cliente assinou.
      if (!posicao) console.warn('[contrato] não consegui medir a linha de assinatura do cliente');

      const r = await fetch('/api/zapsign/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead?.id ?? null,
          nome_documento: `Contrato — ${nome.trim()}`,
          base64_pdf: base64,
          signatario: nome.trim(),
          telefone,
          valor,
          documento,
          posicao,
          posicao_grape: posicaoGrape,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Falha ao enviar para assinatura.');
      setDocs(p => [d, ...p]);
      toast.success('Link pronto. Copie e mande para o cliente pelo seu WhatsApp.');
    } catch (e: any) {
      console.error('[contrato] zapsign', e);
      toast.error(e.message || 'Falha ao enviar para assinatura.');
    } finally {
      setEnviando(false);
    }
  };

  const copiarLink = async (doc: DocZapsign) => {
    if (!doc.sign_url) return;
    try {
      await navigator.clipboard.writeText(doc.sign_url);
      setCopiado(doc.doc_token);
      setTimeout(() => setCopiado(null), 2000);
    } catch { toast.error('Não consegui copiar. Use o botão de abrir.'); }
  };

  const atualizarStatus = async (doc: DocZapsign) => {
    setAtualizando(doc.doc_token);
    try {
      const r = await fetch(`/api/zapsign/contratos/${doc.doc_token}/status`, { method: 'POST' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Falha ao consultar.');
      setDocs(p => p.map(x => (x.doc_token === d.doc_token ? d : x)));
      if (String(d.status).toLowerCase() === 'signed') toast.success('Contrato assinado!');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao consultar o status.');
    } finally {
      setAtualizando(null);
    }
  };

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
            <p className="text-[11px] text-slate-400">Preencha e gere o link de assinatura</p>
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

        <div>
          <label className={labelCls}>WhatsApp de quem assina</label>
          <input
            value={telefone}
            onChange={e => setTelefone(e.target.value)}
            placeholder="(11) 91234-5678"
            className={inputCls}
            inputMode="tel"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Não enviamos nada por aqui. O número serve para o ZapSign pedir um código
            de confirmação <b>na hora em que o cliente abrir o link</b>.
          </p>
        </div>

        <button
          onClick={enviarParaAssinatura}
          disabled={enviando}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm transition-colors"
        >
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
          {enviando ? 'Gerando link...' : 'Gerar link de assinatura'}
        </button>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50 text-slate-500 font-bold text-xs transition-colors"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {exporting ? 'Gerando PDF...' : 'Baixar PDF sem assinatura'}
        </button>

        {/* ── Documentos no ZapSign ── */}
        {docs.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
            <p className={labelCls}>Links de assinatura</p>
            {docs.map(doc => {
              const st = STATUS[String(doc.status).toLowerCase()] || { texto: doc.status, cor: 'text-slate-500 bg-slate-500/10' };
              const assinado = String(doc.status).toLowerCase() === 'signed';
              return (
                <div key={doc.doc_token} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cor}`}>{st.texto}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {!assinado && doc.sign_url && (
                    <>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 break-all leading-snug">{doc.sign_url}</p>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => copiarLink(doc)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-violet-600 hover:text-white text-[11px] font-bold text-slate-500 transition-colors">
                          {copiado === doc.doc_token ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar link</>}
                        </button>
                        {/* Abre o WhatsApp já com o link na mensagem — o envio é
                            manual de propósito, para o closer escrever o recado. */}
                        <a
                          href={`https://wa.me/${zap(telefone)}?text=${encodeURIComponent(
                            `Oi ${doc.signatario || ''}! Segue o contrato para assinatura: ${doc.sign_url}`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-600 hover:text-white text-[11px] font-bold transition-colors">
                          <MessageCircle size={12} /> WhatsApp
                        </a>
                      </div>
                    </>
                  )}

                  {/* A vez da Grape: o link do 2º signatário só funciona depois
                      que o cliente assina — antes disso o ZapSign recusa. */}
                  {doc.grape_sign_url && !doc.grape_signed_at && (
                    <a href={doc.grape_sign_url} target="_blank" rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                        assinado
                          ? 'bg-violet-600 text-white hover:bg-violet-500'
                          : 'bg-black/5 dark:bg-white/5 text-slate-400 hover:text-dark-text'}`}>
                      <PenLine size={11} /> {assinado ? 'Sua vez: assinar pela Grape' : 'Assinar pela Grape (após o cliente)'}
                    </a>
                  )}
                  {doc.grape_signed_at && (
                    <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                      <Check size={11} /> Assinado pela Grape
                    </p>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button onClick={() => atualizarStatus(doc)} disabled={atualizando === doc.doc_token}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-violet-500 transition-colors disabled:opacity-50">
                      <RefreshCw size={11} className={atualizando === doc.doc_token ? 'animate-spin' : ''} />
                      Atualizar status
                    </button>
                    {assinado && doc.signed_file && (
                      <a href={doc.signed_file} target="_blank" rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-1 text-[11px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors">
                        <ExternalLink size={11} /> Contrato assinado
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
