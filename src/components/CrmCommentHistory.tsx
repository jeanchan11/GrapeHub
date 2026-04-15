import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Image as ImageIcon, X, RefreshCw, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { auth, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const COMMENT_TYPES = [
  { id: 'Observação', label: 'Observação', color: 'bg-slate-500' },
  { id: 'Contato realizado', label: 'Contato realizado', color: 'bg-blue-500' },
  { id: 'Acordo fechado', label: 'Acordo fechado', color: 'bg-emerald-500' },
  { id: 'Promessa de pagamento', label: 'Promessa de pagamento', color: 'bg-amber-500' },
  { id: 'Mudança de Status', label: 'Mudança de Status', color: 'bg-violet-500' }
];

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

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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
      const imageUrls: string[] = [];
      for (const image of commentImages) {
        const storageRef = ref(storage, `users/${auth.currentUser?.uid}/crm_comments/${Date.now()}_${image.name}`);
        await uploadBytes(storageRef, image);
        const downloadURL = await getDownloadURL(storageRef);
        imageUrls.push(downloadURL);
      }

      const res = await fetch('/api/crm-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          user_id: user.email,
          type: commentType,
          content: newComment,
          images: imageUrls
        })
      });

      if (res.ok) {
        setNewComment('');
        setCommentImages([]);
        setIsAddingNote(false);
        fetchComments();
      }
    } catch (err) {
      console.error("Error adding comment:", err);
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
    <div className="mt-8">
      {!isAddingNote ? (
        <button 
          onClick={() => setIsAddingNote(true)}
          className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 hover:text-violet-500 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all flex items-center justify-center gap-2 mb-8 group"
        >
          <Plus size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Adicionar Nota</span>
        </button>
      ) : (
        <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMENT_TYPES.filter(t => t.id !== 'Mudança de Status').map(type => (
              <button
                key={type.id}
                onClick={() => setCommentType(type.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                  commentType === type.id 
                    ? `${type.color} text-white` 
                    : 'bg-slate-50 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
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
              className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-light-text dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-500/20 min-h-[100px] resize-none mb-3"
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
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">Nota Interna</span>
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
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleAddComment}
                disabled={(!newComment.trim() && commentImages.length === 0) || isSubmittingComment}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmittingComment ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                Salvar Nota
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-white/10 before:to-transparent">
        {comments.length > 0 ? comments.map(comment => {
          const typeConfig = COMMENT_TYPES.find(t => t.id === comment.type) || COMMENT_TYPES[0];
          const authorName = comment.user_name || comment.user_email || comment.user_id;
          const authorRole = comment.user_role || 'user';
          
          return (
            <div key={comment.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 ${typeConfig.color} text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 overflow-hidden`}>
                {comment.user_picture ? (
                  <img src={comment.user_picture} alt={authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-xs font-bold">{getInitials(authorName)}</span>
                )}
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-dark-card/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-light-text dark:text-white">{authorName}</span>
                    <span className="text-[10px] text-slate-400 capitalize">({authorRole})</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{formatDate(comment.created_at)}</span>
                </div>
                <div className="mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${typeConfig.color} bg-opacity-10 text-${typeConfig.color.replace('bg-', '')}`}>
                    {comment.type}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{comment.content}</p>
                
                {comment.images && comment.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {comment.images.map((img, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => setLightboxImage(img)} 
                        className="block w-full text-left focus:outline-none"
                      >
                        <img src={img} alt="Anexo" className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-white/10 hover:opacity-90 transition-opacity cursor-pointer" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="text-center text-slate-500 text-sm py-8 relative z-10 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 shadow-sm">
            Nenhum comentário registrado ainda.
          </div>
        )}
      </div>

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
