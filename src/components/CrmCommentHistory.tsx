import React, { useState, useEffect } from 'react';
import { CheckCircle2, Image as ImageIcon, X, RefreshCw, Send, Bot, ArrowRight, MessageSquare, Phone, Handshake, CalendarClock, Receipt, PenLine } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '@/src/lib/toast';

export const COMMENT_TYPES = [
  { id: 'Observação', label: 'Observação', color: 'bg-slate-500' },
  { id: 'Contato realizado', label: 'Contato realizado', color: 'bg-blue-500' },
  { id: 'Acordo fechado', label: 'Acordo fechado', color: 'bg-emerald-500' },
  { id: 'Promessa de pagamento', label: 'Promessa de pagamento', color: 'bg-amber-500' },
  { id: 'COBRANÇA', label: 'Cobrança Automática', color: 'bg-red-500' },
  { id: 'Mudança de Status', label: 'Mudança de Status', color: 'bg-violet-500' }
];

// Cor e ícone de cada tipo — usados na bolinha da linha do tempo e na pílula
const TIPO_VISUAL: Record<string, { cor: string; Icone: React.ComponentType<{ size?: number; className?: string }> }> = {
  'Observação': { cor: '#64748b', Icone: MessageSquare },
  'Contato realizado': { cor: '#3b82f6', Icone: Phone },
  'Acordo fechado': { cor: '#10b981', Icone: Handshake },
  'Promessa de pagamento': { cor: '#f59e0b', Icone: CalendarClock },
  'COBRANÇA': { cor: '#f43f5e', Icone: Receipt },
  'Mudança de Status': { cor: '#8b5cf6', Icone: ArrowRight },
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
}

interface CrmCommentHistoryProps {
  clientId: string;
}

const getInitials = (name?: string) => {
  if (!name) return 'U';
  return name.substring(0, 2).toUpperCase();
};

const CrmCommentHistory: React.FC<CrmCommentHistoryProps> = ({ clientId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState(COMMENT_TYPES[0].id);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [commentImages, setCommentImages] = useState<File[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());

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
    }
  }, [clientId]);

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
        setNewComment('');
        setCommentImages([]);
        setIsAddingNote(false);
        fetchComments();
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

  return (
    <div className="mt-2">
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
            {COMMENT_TYPES.filter(t => t.id !== 'Mudança de Status').map(type => (
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
      {comments.length === 0 ? (
        <div className="text-center text-slate-500 text-sm py-8 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
          Nenhum registro ainda.
        </div>
      ) : (
        <div className="relative">
          <span className="absolute left-[13px] top-3 bottom-3 w-px bg-slate-200 dark:bg-white/10" />
          {comments.map((comment, i) => {
            const d = dataDe(comment.created_at);
            const dia = diaDe(d);
            const diaAnterior = i > 0 ? diaDe(dataDe(comments[i - 1].created_at)) : null;
            const { cor, Icone } = visualDo(comment.type);
            const sistema = comment.user_id === 'sistema';
            const autor = sistema ? 'Automação' : (comment.user_name || comment.user_email || comment.user_id);
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
                          <span className="ml-auto shrink-0 text-[11px] text-slate-400">{horaDe(d)}</span>
                        </div>
                        {texto && (
                          <p className={`mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words ${texto.length > 400 && !aberto ? 'line-clamp-6' : ''}`}>{texto}</p>
                        )}
                        {texto.length > 400 && (
                          <button onClick={alternar} className="mt-0.5 text-[12px] font-medium text-violet-600 dark:text-violet-400 hover:underline">{aberto ? 'Recolher' : 'Ver tudo'}</button>
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

      {/* Lightbox Popup */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
            onClick={() => setLightboxImage(null)}
          >
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={lightboxImage}
              alt="Visualização ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CrmCommentHistory;
