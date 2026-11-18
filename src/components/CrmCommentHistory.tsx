import React, { useState, useEffect } from 'react';
import { CheckCircle2, Image as ImageIcon, X, RefreshCw, Send, Bot, ArrowRight, MessageSquare, Phone, Handshake, CalendarClock, Receipt, PenLine, MessageCircle, DoorOpen, LogOut, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from './ui/Modal';
import { EstadoVazio } from './ui/EstadoVazio';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '@/src/lib/toast';

// `manual: true` = aparece na caixa de escrever. Os outros nascem sozinhos de uma ação
// (disparo da régua, botão WA, troca de etapa, aviso prévio, checklist, arquivamento).
export const COMMENT_TYPES = [
  { id: 'Observação', label: 'Observação', color: 'bg-slate-500', manual: true },
  { id: 'Contato realizado', label: 'Contato realizado', color: 'bg-blue-500', manual: true },
  { id: 'Acordo fechado', label: 'Acordo fechado', color: 'bg-emerald-500', manual: true },
  { id: 'Promessa de pagamento', label: 'Promessa de pagamento', color: 'bg-amber-500', manual: true },
  { id: 'Pedido de saída', label: 'Pedido de saída / insatisfação', color: 'bg-red-600', manual: true },
  { id: 'COBRANÇA', label: 'Cobrança Automática', color: 'bg-red-500' },
  { id: 'Cobrança manual', label: 'Cobrança manual', color: 'bg-rose-500' },
  { id: 'Mudança de Status', label: 'Mudança de Status', color: 'bg-violet-500' },
  { id: 'Saída', label: 'Saída', color: 'bg-slate-600' },
  { id: 'Atualização', label: 'Atualização', color: 'bg-sky-500' },
];

// Filtros da linha do tempo
const GRUPOS: { id: string; rotulo: string; tipos?: string[] }[] = [
  { id: 'tudo', rotulo: 'Tudo' },
  { id: 'cobranca', rotulo: 'Cobrança', tipos: ['COBRANÇA', 'Cobrança manual', 'Promessa de pagamento'] },
  { id: 'contato', rotulo: 'Contato', tipos: ['Contato realizado', 'Observação', 'Atualização', 'Acordo fechado'] },
  { id: 'retencao', rotulo: 'Retenção', tipos: ['Mudança de Status', 'Pedido de saída'] },
  { id: 'saida', rotulo: 'Saída', tipos: ['Saída'] },
];

const RESULTADOS = [
  { id: 'sem_resposta', rotulo: 'Sem resposta' },
  { id: 'prometeu', rotulo: 'Prometeu pagar' },
  { id: 'pediu_prazo', rotulo: 'Pediu prazo' },
  { id: 'reclamou', rotulo: 'Reclamou' },
  { id: 'pagou', rotulo: 'Disse que já pagou' },
];

// Cor e ícone de cada tipo — usados na bolinha da linha do tempo e na pílula
const TIPO_VISUAL: Record<string, { cor: string; Icone: React.ComponentType<{ size?: number; className?: string }> }> = {
  'Observação': { cor: '#64748b', Icone: MessageSquare },
  'Contato realizado': { cor: '#3b82f6', Icone: Phone },
  'Acordo fechado': { cor: '#10b981', Icone: Handshake },
  'Promessa de pagamento': { cor: '#f59e0b', Icone: CalendarClock },
  'COBRANÇA': { cor: '#f43f5e', Icone: Receipt },
  'Cobrança manual': { cor: '#fb7185', Icone: MessageCircle },
  'Mudança de Status': { cor: '#8b5cf6', Icone: ArrowRight },
  'Pedido de saída': { cor: '#dc2626', Icone: DoorOpen },
  'Saída': { cor: '#94a3b8', Icone: LogOut },
  'Atualização': { cor: '#0ea5e9', Icone: PenLine },
};
const visualDo = (tipo: string) => TIPO_VISUAL[tipo] || { cor: '#64748b', Icone: PenLine };
const rotuloDoTipo = (tipo: string) => COMMENT_TYPES.find(t => t.id === tipo)?.label || tipo;

// "PEDIDO DE FINALIZAÇÃO" → "Pedido de finalização"
const frase = (t: string) => (t ? t.trim().charAt(0).toUpperCase() + t.trim().slice(1).toLowerCase() : t);

const dataDe = (dateString: string) => {
  let s = dateString;
  if (!s.includes('Z') && !s.includes('+') && s.includes('T')) s += 'Z';
  else if (!s.includes('T') && !s.includes('Z')) s = s.replace(' ', 'T') + 'Z';
  return new Date(s);
};
const horaDe = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const diaDe = (d: Date) => {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const dif = Math.round((hoje.getTime() - x.getTime()) / 86400000);
  if (dif === 0) return 'Hoje';
  if (dif === 1) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: x.getFullYear() === hoje.getFullYear() ? undefined : 'numeric' }).replace('.', '');
};

interface Comment {
  id: number;
  client_id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  user_picture?: string;
  user_role?: string;
  type: string;
  content: string;
  created_at: string;
  images?: string[];
  meta?: { resultado?: string | null; promessa_data?: string | null; canal?: string; origem?: string; evento?: string } | null;
}

interface Resumo {
  status?: string;
  retencao_etiqueta: boolean;
  etapa: { id: string; titulo: string; cor?: string; emoji?: string } | null;
  aviso_previo_date: string | null;
  atraso: { qtd: number; valor: number; dias: number } | null;
  ultimo_contato: { created_at: string; type: string; autor: string } | null;
  promessa: { data: string; vencida: boolean } | null;
}

interface CrmCommentHistoryProps {
  clientId: string;
  /** Linha de resumo (atraso, último contato, etapa, promessa) acima do histórico. */
  mostrarResumo?: boolean;
  /** Avisa quem está em volta que algo foi registrado (ex.: recarregar a lista). */
  onAlterado?: () => void;
  /** Tipo já marcado no campo de nota (em Inadimplentes, "Contato realizado"). */
  tipoInicial?: string;
}

const brlC = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const dataCurta = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
const haQuanto = (iso: string) => {
  const d = Math.floor((Date.now() - dataDe(iso).getTime()) / 86400000);
  return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`;
};

const getInitials = (name?: string) => {
  if (!name) return 'U';
  return name.substring(0, 2).toUpperCase();
};

const CrmCommentHistory: React.FC<CrmCommentHistoryProps> = ({ clientId, mostrarResumo = true, onAlterado, tipoInicial }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState(tipoInicial || COMMENT_TYPES[0].id);
  // Promessa de pagamento escrita à mão precisa da data — é ela que vira "Prometeu dd/mm" nos Inadimplentes
  const [dataPromessa, setDataPromessa] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [commentImages, setCommentImages] = useState<File[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const [editando, setEditando] = useState<{ id: number; texto: string; tipo: string } | null>(null);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const podeEditar = (c: { user_id?: string; type: string }) =>
    !!user && c.user_id !== 'sistema' && COMMENT_TYPES.some(t => t.manual && t.id === c.type) &&
    ((c.user_id || '').toLowerCase() === (user.email || '').toLowerCase() || (user as any).role === 'superadmin');
  const salvarEdicao = async () => {
    if (!editando || !editando.texto.trim()) return;
    setSalvandoEdicao(true);
    try {
      const r = await fetch(`/api/crm-comments/${editando.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editando.texto, type: editando.tipo }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); toast.error(e.error || 'Não foi possível editar a nota'); return; }
      setEditando(null);
      fetchComments();
      fetchResumo();
      onAlterado?.();
    } finally { setSalvandoEdicao(false); }
  };
  const [grupo, setGrupo] = useState('tudo');
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [sugerirRetencao, setSugerirRetencao] = useState(false);
  const [promessaPara, setPromessaPara] = useState<{ id: number; data: string } | null>(null);

  const fetchResumo = async () => {
    try {
      const r = await fetch(`/api/clientes/${encodeURIComponent(clientId)}/resumo-relacionamento`);
      if (r.ok) setResumo(await r.json());
    } catch { /* o resumo é extra; o histórico funciona sem ele */ }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/crm-comments?client_id=${clientId}`);
      if (res.ok) {
        setComments(await res.json());
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchComments();
      fetchResumo();
      setSugerirRetencao(false);
    }
  }, [clientId]);

  // Resultado de uma cobrança manual (promessa precisa de data)
  const salvarResultado = async (id: number, resultado: string, promessa_data?: string) => {
    const r = await fetch(`/api/crm-comments/${id}/resultado`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultado, promessa_data }),
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); toast.error(e.error || 'Não foi possível salvar.'); return; }
    setPromessaPara(null);
    fetchComments(); fetchResumo(); onAlterado?.();
  };

  // "Pedido de saída" registrado por alguém → levar o cliente para a etapa de pedido na Retenção.
  // Só a ETAPA do kanban; a etiqueta de retenção (previsão de faturamento) segue manual.
  const levarParaRetencao = async () => {
    const r = await fetch(`/api/clients/${encodeURIComponent(clientId)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crm_status: 'pedido_finalizacao' }),
    });
    if (!r.ok) { toast.error('Não foi possível mover para a Retenção.'); return; }
    await fetch('/api/crm-comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, user_id: user?.email, type: 'Mudança de Status', content: 'Movido de Nenhum para PEDIDO DE FINALIZAÇÃO' }),
    });
    toast.success('Cliente levado para "Pedido de finalização" na Retenção.');
    setSugerirRetencao(false);
    fetchComments(); fetchResumo(); onAlterado?.();
  };

  const handleAddComment = async () => {
    if (!clientId || (!newComment.trim() && commentImages.length === 0) || !user) return;
    
    setIsSubmittingComment(true);
    try {
      // Convert images to base64 — works in any environment, no external storage needed
      const imageDataUrls: string[] = [];
      for (const image of commentImages) {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(image);
          });
          imageDataUrls.push(dataUrl);
        } catch (readErr) {
          console.error('Erro ao ler imagem:', readErr);
        }
      }

      // Don't save if no text and all images failed to read
      if (!newComment.trim() && imageDataUrls.length === 0) {
        toast.error('Não foi possível carregar as imagens. Tente novamente.');
        return;
      }

      if (commentType === 'Promessa de pagamento' && !/^\d{4}-\d{2}-\d{2}$/.test(dataPromessa)) {
        toast.error('Informe a data em que o cliente prometeu pagar.');
        return;
      }
      const res = await fetch('/api/crm-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          user_id: user.email,
          type: commentType,
          content: newComment,
          images: imageDataUrls
        })
      });

      if (res.ok) {
        if (commentType === 'Promessa de pagamento') {
          const criado = await res.clone().json().catch(() => null);
          if (criado?.id) {
            await fetch(`/api/crm-comments/${criado.id}/resultado`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resultado: 'prometeu', promessa_data: dataPromessa }),
            }).catch(() => {});
          }
          setDataPromessa('');
        }
        setNewComment('');
        setCommentImages([]);
        setIsAddingNote(false);
        if (commentType === 'Pedido de saída') setSugerirRetencao(true);
        fetchComments();
        fetchResumo();
        onAlterado?.();
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Erro ao salvar nota:', errData);
        toast.error('Erro ao salvar nota: ' + (errData.error || res.status));
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      toast.error('Erro inesperado ao salvar nota. Verifique o console.');
    } finally {
      setIsSubmittingComment(false);
    }
  };


  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) setCommentImages(prev => [...prev, file]);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/'));
    if (files.length > 0) setCommentImages(prev => [...prev, ...files]);
  };

  const contagem = (g: typeof GRUPOS[number]) => (g.tipos ? comments.filter(c => g.tipos!.includes(c.type)).length : comments.length);
  const grupoAtual = GRUPOS.find(g => g.id === grupo) || GRUPOS[0];
  const visiveis = grupoAtual.tipos ? comments.filter(c => grupoAtual.tipos!.includes(c.type)) : comments;
  const pilula = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px]';

  return (
    <div className="mt-2">
      {/* Resumo do relacionamento: o que interessa antes de ler o histórico */}
      {mostrarResumo && resumo && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {resumo.atraso
            ? <span className={`${pilula} bg-rose-500/10 text-rose-600 dark:text-rose-400`}><Receipt size={12} /> {brlC(resumo.atraso.valor)} em atraso · {resumo.atraso.dias} {resumo.atraso.dias === 1 ? 'dia' : 'dias'}</span>
            : <span className={`${pilula} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`}><CheckCircle2 size={12} /> Sem atraso</span>}
          {resumo.promessa && (
            <span className={`${pilula} ${resumo.promessa.vencida ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
              <CalendarClock size={12} /> {resumo.promessa.vencida ? `Promessa vencida em ${dataCurta(resumo.promessa.data)}` : `Prometeu pagar em ${dataCurta(resumo.promessa.data)}`}
            </span>
          )}
          {resumo.ultimo_contato
            ? <span className={`${pilula} bg-slate-500/10 text-slate-600 dark:text-slate-300`} title={`${resumo.ultimo_contato.type} · ${resumo.ultimo_contato.autor}`}><Clock size={12} /> Último contato {haQuanto(resumo.ultimo_contato.created_at)}</span>
            : <span className={`${pilula} bg-slate-500/10 text-slate-500 dark:text-slate-400`}><Clock size={12} /> Nenhum contato registrado</span>}
          {resumo.etapa && (
            <span className={pilula} style={{ background: `color-mix(in srgb, ${resumo.etapa.cor || '#8b5cf6'} 14%, transparent)`, color: resumo.etapa.cor || '#8b5cf6' }}>
              {resumo.etapa.emoji} Retenção: {frase(resumo.etapa.titulo)}
            </span>
          )}
          {resumo.retencao_etiqueta && <span className={`${pilula} bg-amber-500/10 text-amber-600 dark:text-amber-400`}><AlertTriangle size={12} /> Fora da previsão de faturamento</span>}
          {resumo.aviso_previo_date && <span className={`${pilula} bg-slate-500/10 text-slate-600 dark:text-slate-300`}><LogOut size={12} /> Aviso prévio {dataCurta(resumo.aviso_previo_date)}</span>}
        </div>
      )}

      {/* Depois de registrar um pedido de saída: sugere a etapa da Retenção (sem mexer na etiqueta) */}
      {sugerirRetencao && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-[13px]">
          <DoorOpen size={16} className="shrink-0 text-rose-500" />
          {resumo?.etapa ? (
            <span className="flex-1 text-slate-600 dark:text-slate-300">Pedido de saída registrado. O cliente já está na Retenção, em <b className="font-medium">{frase(resumo.etapa.titulo)}</b>.</span>
          ) : (
            <>
              <span className="flex-1 text-slate-600 dark:text-slate-300">Pedido de saída registrado. Levar o cliente para <b className="font-medium">Pedido de finalização</b> na Retenção?</span>
              <button onClick={levarParaRetencao} className="h-8 px-3 rounded-lg bg-rose-500 text-white text-[12.5px] font-medium hover:bg-rose-600">Levar para a Retenção</button>
            </>
          )}
          <button onClick={() => setSugerirRetencao(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
        </div>
      )}

      {!isAddingNote ? (
        <button
          onClick={() => setIsAddingNote(true)}
          className="w-full mb-6 flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] px-4 py-3 text-left text-sm text-slate-400 hover:border-violet-500/40 transition-colors"
        >
          <PenLine size={15} />
          Escreva uma nota, contato ou acordo…
        </button>
      ) : (
        <div className="bg-white dark:bg-white/[0.03] p-4 rounded-xl border border-violet-500/30 shadow-sm mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMENT_TYPES.filter(t => t.manual).map(type => (
              <button
                key={type.id}
                onClick={() => setCommentType(type.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium whitespace-nowrap transition-colors ${
                  commentType === type.id
                    ? 'text-white'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                style={commentType === type.id ? { background: visualDo(type.id).cor } : undefined}
              >
                {type.label}
              </button>
            ))}
          </div>
          <div 
            className="relative"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <textarea 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onPaste={handlePaste}
              placeholder="Adicione uma nota, observação ou acordo... (Cole ou arraste imagens aqui)"
              autoFocus
              className="w-full bg-transparent border-0 p-0 text-sm text-light-text dark:text-white placeholder:text-slate-400 outline-none focus:ring-0 min-h-[80px] resize-none mb-3"
            />
            {commentImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {commentImages.map((file, idx) => (
                  <div key={idx} className="relative group">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-white/10"
                    />
                    <button
                      onClick={() => setCommentImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {commentType === 'Promessa de pagamento' && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[12px] text-slate-500">Prometeu pagar em</span>
              <input
                type="date"
                value={dataPromessa}
                onChange={(e) => setDataPromessa(e.target.value)}
                className="h-7 px-2 rounded-lg text-[12px] bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-dark-text"
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${isInternalNote ? 'bg-violet-500 border-violet-500' : 'border-slate-300 dark:border-slate-600 group-hover:border-violet-500'}`}>
                  {isInternalNote && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                />
                <span className="text-[12px] text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Nota interna</span>
              </label>
              
              <label className="cursor-pointer text-slate-400 hover:text-violet-500 transition-colors" title="Adicionar Imagem">
                <ImageIcon size={18} />
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setCommentImages(prev => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setIsAddingNote(false);
                  setNewComment('');
                  setCommentImages([]);
                }}
                className="px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddComment}
                disabled={(!newComment.trim() && commentImages.length === 0) || isSubmittingComment}
                className="bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmittingComment ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Linha do tempo: feed compacto com trilho contínuo, agrupado por dia.
          - mudança de status: uma linha;
          - cobrança automática: uma linha ("2ª cobrança + multa · WhatsApp"), mensagem sob demanda;
          - nota de pessoa: autor, tipo e o texto direto, sem caixa. */}
      {comments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {GRUPOS.filter(g => g.id === 'tudo' || contagem(g) > 0).map(g => (
            <button key={g.id} onClick={() => setGrupo(g.id)}
              className={`h-7 px-2.5 rounded-full text-[12px] transition-colors ${grupo === g.id ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300 font-medium' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
              {g.rotulo} <span className="numero text-[11px] opacity-70">{contagem(g)}</span>
            </button>
          ))}
        </div>
      )}
      {visiveis.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10">
          <EstadoVazio titulo={comments.length === 0 ? 'Nenhum registro ainda.' : 'Nada nesta categoria.'} className="py-8" />
        </div>
      ) : (
        <div className="relative">
          <span className="absolute left-[13px] top-3 bottom-3 w-px bg-slate-200 dark:bg-white/10" />
          {visiveis.map((comment, i) => {
            const d = dataDe(comment.created_at);
            const dia = diaDe(d);
            const diaAnterior = i > 0 ? diaDe(dataDe(visiveis[i - 1].created_at)) : null;
            const { cor, Icone } = visualDo(comment.type);
            const sistema = comment.user_id === 'sistema';
            const autor = comment.meta?.origem === 'anotacao-cobranca' ? 'Anotação de cobrança' : sistema ? 'Automação' : (comment.user_name || comment.user_email || comment.user_id);
            const papel = !sistema && comment.user_role && comment.user_role.toLowerCase() !== 'user' ? comment.user_role : null;
            const texto = comment.content || '';
            const status = comment.type === 'Mudança de Status' ? /Movido de (.*) para (.*)/i.exec(texto) : null;
            // Cobrança automática: tira o resumo e o canal da própria mensagem
            const disparo = /Disparo automático de cobrança\s*[—-]\s*(.+)/i.exec(texto);
            const canal = /(WhatsApp|E-?mail)\s*·\s*([^\n]+)/i.exec(texto);
            const aberto = expandidos.has(comment.id);
            const alternar = () => setExpandidos(prev => { const n = new Set(prev); n.has(comment.id) ? n.delete(comment.id) : n.add(comment.id); return n; });

            const bolinha = (
              <div className="relative z-10 w-7 h-7 shrink-0 rounded-full overflow-hidden flex items-center justify-center ring-4 ring-white dark:ring-[rgb(var(--dark-card))]"
                style={{ background: comment.user_picture && !sistema ? undefined : `color-mix(in srgb, ${cor} 16%, rgb(var(--dark-card)))`, color: cor }}>
                {disparo ? <Icone size={13} />
                  : sistema ? <Bot size={13} />
                  : comment.user_picture ? <img src={comment.user_picture} alt={autor} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : status ? <ArrowRight size={13} />
                  : <span className="text-[10px] font-bold">{getInitials(autor)}</span>}
              </div>
            );

            return (
              <React.Fragment key={comment.id}>
                {dia !== diaAnterior && (
                  <p className={`pl-10 text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${i === 0 ? 'pb-1' : 'pt-4 pb-1'}`}>{dia}</p>
                )}
                <div className="relative flex gap-3 py-1.5">
                  {bolinha}
                  <div className="min-w-0 flex-1 pt-[5px]">
                    {status ? (
                      <div className="flex items-baseline gap-3">
                        <p className="min-w-0 flex-1 text-[13px] text-slate-500 dark:text-slate-400 leading-snug">
                          <span className="font-medium text-light-text dark:text-white">{autor}</span> moveu de{' '}
                          <span className="text-slate-700 dark:text-slate-300">{frase(status[1]) === 'Nenhum' ? 'fora da retenção' : frase(status[1])}</span>
                          {' '}para{' '}
                          <span className="font-medium" style={{ color: cor }}>{frase(status[2])}</span>
                        </p>
                        <span className="shrink-0 text-[11px] text-slate-400">{horaDe(d)}</span>
                      </div>
                    ) : disparo ? (
                      <>
                        <div className="flex items-baseline gap-3">
                          <p className="min-w-0 flex-1 text-[13px] leading-snug text-slate-500 dark:text-slate-400">
                            <span className="font-medium text-light-text dark:text-white">Cobrança automática</span>
                            {' · '}{disparo[1].replace(/[^\p{L}\p{N}\s+ºª.,-]/gu, '').trim()}
                            {canal && <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 dark:bg-white/5 px-2 py-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">{/mail/i.test(canal[1]) ? 'E-mail' : 'WhatsApp'}</span>}
                            <button onClick={alternar} className="ml-2 text-[12px] font-medium text-violet-600 dark:text-violet-400 hover:underline">
                              {aberto ? 'ocultar' : 'ver mensagem'}
                            </button>
                          </p>
                          <span className="shrink-0 text-[11px] text-slate-400">{horaDe(d)}</span>
                        </div>
                        {aberto && (
                          <p className="mt-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">{texto}</p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-medium text-light-text dark:text-white">{autor}</span>
                          {papel && <span className="text-[11px] text-slate-400">{papel}</span>}
                          <span className="text-[11px] font-medium" style={{ color: cor }}>{rotuloDoTipo(comment.type)}</span>
                          {comment.meta && (comment.meta as any).editado_em && <span className="text-[11px] text-slate-400">· editada</span>}
                          <span className="ml-auto shrink-0 flex items-baseline gap-2">
                            {podeEditar(comment) && editando?.id !== comment.id && (
                              <button onClick={() => setEditando({ id: comment.id, texto: texto, tipo: comment.type })}
                                className="text-[11px] text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 inline-flex items-center gap-1">
                                <PenLine size={11} /> Editar
                              </button>
                            )}
                            <span className="text-[11px] text-slate-400">{horaDe(d)}</span>
                          </span>
                        </div>
                        {editando?.id === comment.id ? (
                          <div className="mt-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-3">
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {COMMENT_TYPES.filter(t => t.manual).map(t => (
                                <button key={t.id} onClick={() => setEditando({ ...editando, tipo: t.id })}
                                  className={`h-6 px-2 rounded-full text-[11.5px] transition-colors ${editando.tipo === t.id ? 'text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                  style={editando.tipo === t.id ? { background: visualDo(t.id).cor } : undefined}>
                                  {t.label}
                                </button>
                              ))}
                            </div>
                            <textarea value={editando.texto} onChange={e => setEditando({ ...editando, texto: e.target.value })} rows={3} autoFocus
                              className="w-full bg-transparent text-[13px] leading-relaxed text-light-text dark:text-white resize-y focus:outline-none" />
                            <div className="flex justify-end gap-2 mt-1">
                              <button onClick={() => setEditando(null)} className="h-7 px-3 rounded-lg text-[12px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">Cancelar</button>
                              <button onClick={salvarEdicao} disabled={salvandoEdicao || !editando.texto.trim()}
                                className="h-7 px-3 rounded-lg text-[12px] font-medium bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50">
                                {salvandoEdicao ? 'Salvando…' : 'Salvar'}
                              </button>
                            </div>
                          </div>
                        ) : comment.type === 'Cobrança manual' ? (() => {
                          const [linha, ...resto] = texto.split('\n');
                          const mensagem = resto.join('\n').trim();
                          const semResultado = !comment.meta?.resultado;
                          return (
                            <>
                              <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                                {linha}
                                {mensagem && <button onClick={alternar} className="ml-2 text-[12px] font-medium text-violet-600 dark:text-violet-400 hover:underline">{aberto ? 'ocultar mensagem' : 'ver mensagem'}</button>}
                              </p>
                              {aberto && mensagem && (
                                <p className="mt-2 rounded-xl bg-slate-50 dark:bg-white/[0.03] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">{mensagem}</p>
                              )}
                              {semResultado && (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11.5px] text-slate-400">Como foi?</span>
                                  {RESULTADOS.map(r => (
                                    <button key={r.id}
                                      onClick={() => (r.id === 'prometeu' ? setPromessaPara({ id: comment.id, data: '' }) : salvarResultado(comment.id, r.id))}
                                      className={`h-6 px-2 rounded-full text-[11.5px] border transition-colors ${promessaPara?.id === comment.id && r.id === 'prometeu' ? 'border-amber-500/50 text-amber-600 dark:text-amber-400' : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-violet-500/40 hover:text-violet-600'}`}>
                                      {r.rotulo}
                                    </button>
                                  ))}
                                  {promessaPara?.id === comment.id && (
                                    <span className="inline-flex items-center gap-1.5">
                                      <input type="date" value={promessaPara.data} onChange={e => setPromessaPara({ id: comment.id, data: e.target.value })}
                                        className="h-6 rounded-md border border-slate-200 dark:border-white/10 bg-transparent px-1.5 text-[11.5px] text-light-text dark:text-white [color-scheme:light] dark:[color-scheme:dark]" />
                                      <button disabled={!promessaPara.data} onClick={() => salvarResultado(comment.id, 'prometeu', promessaPara.data)}
                                        className="h-6 px-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11.5px] disabled:opacity-40 transition-colors">Salvar</button>
                                    </span>
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })() : (
                          <>
                            {texto && (
                              <p className={`mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words ${texto.length > 400 && !aberto ? 'line-clamp-6' : ''}`}>{texto}</p>
                            )}
                            {texto.length > 400 && (
                              <button onClick={alternar} className="mt-0.5 text-[12px] font-medium text-violet-600 dark:text-violet-400 hover:underline">{aberto ? 'Recolher' : 'Ver tudo'}</button>
                            )}
                          </>
                        )}
                        {comment.images && comment.images.length > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {comment.images.map((img, idx) => (
                              <button key={idx} onClick={() => setLightboxImage(img)} className="block w-full text-left focus:outline-none">
                                <img src={img} alt="Anexo" className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-white/10 hover:opacity-90 transition-opacity cursor-pointer" />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Lightbox Popup — ui/Modal (portal): antes ficava preso dentro do popup do cliente */}
      <Modal isOpen={!!lightboxImage} onClose={() => setLightboxImage(null)} semCabecalho semPadding maxWidth="max-w-[90vw] w-fit">
        <div className="relative">
          <button
            onClick={() => setLightboxImage(null)}
            aria-label="Fechar"
            className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
          >
            <X size={20} />
          </button>
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Visualização ampliada"
              className="block max-w-[90vw] max-h-[85vh] object-contain"
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CrmCommentHistory;
