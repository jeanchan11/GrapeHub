import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Trash2, Loader2, Send, Plus, Check, CheckCircle2,
  ChevronDown, ChevronRight, FileText, Paperclip,
  ImageIcon, MessageSquare, Eye, Calendar, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { confirmDialog } from '@/src/lib/confirm';

// ─── Types ──────────────────────────────────────────────────
interface Subtask {
  id: number;
  task_id: number;
  title: string;
  completed: boolean;
  order_index: number;
}

interface Comment {
  id: number;
  task_id: number;
  text: string;
  author_name: string;
  author_avatar: string | null;
  files: { name: string; url: string; type: string }[] | null;
  created_at: string;
}

interface ListaTask {
  id: number;
  client_name: string;
  status_group: string;
  description?: string;
  subtask_count: number;
  created_at: string;
  tags?: string[];
  due_date?: string;
}

interface Props {
  task: ListaTask;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: (id: number) => void;
}

// ─── Helpers ────────────────────────────────────────────────
function UserAvatar({ name, picture, size = 28 }: { name: string; picture?: string; size?: number }) {
  if (picture) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
        <img src={picture} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#f43f5e'];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width: size, height: size, background: color, borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize: size*0.38, fontWeight: 700, color:'#fff', flexShrink:0 }}>
      {initials}
    </div>
  );
}

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

// ─── Component ──────────────────────────────────────────────
export default function ListaTaskDetailModal({ task, onClose, onUpdate, onDelete }: Props) {
  const { user, userData } = useAuth();

  // Description
  const [description, setDescription] = useState(task.description || '');
  const [editingDesc, setEditingDesc] = useState(false);
  const [savingDesc, setSavingDesc] = useState(false);
  const descSavedRef = useRef(false);

  // Due Date
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.split('T')[0] : '');

  // Subtasks
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [pastedFiles, setPastedFiles] = useState<{name: string, url: string, type: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentBoxRef = useRef<HTMLTextAreaElement>(null);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Baixa a imagem do lightbox (funciona com data: URI e URLs hospedadas)
  const downloadImage = async (url: string) => {
    const filename = `imagem-${Date.now()}.png`;
    try {
      if (url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        return;
      }
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl; a.download = url.split('/').pop()?.split('?')[0] || filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      // fallback: abre em nova aba se o download direto falhar (CORS, etc.)
      window.open(url, '_blank');
    }
  };

  // Task name editing
  const [editingName, setEditingName] = useState(false);
  const [editNameVal, setEditNameVal] = useState(task.client_name);

  // ── Fetch Data ──
  const fetchSubtasks = useCallback(async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch(`/api/onboarding-tasks/${task.id}/subtasks`);
      if (res.ok) setSubtasks(await res.json());
    } catch { /* silent */ }
    finally { setLoadingSubs(false); }
  }, [task.id]);

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/onboarding-tasks/${task.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(Array.isArray(data) ? data.map((c: any) => ({
          ...c,
          files: typeof c.files === 'string' ? JSON.parse(c.files) : c.files
        })) : []);
      }
    } catch { /* silent */ }
    finally { setLoadingComments(false); }
  }, [task.id]);

  useEffect(() => {
    fetchSubtasks();
    fetchComments();
  }, [fetchSubtasks, fetchComments]);

  // ── Description ──
  const saveDescription = async () => {
    if (description === (task.description || '')) { setEditingDesc(false); return; }
    setSavingDesc(true);
    try {
      await fetch(`/api/onboarding-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      onUpdate();
    } catch { /* silent */ }
    finally { setSavingDesc(false); setEditingDesc(false); }
  };

  // ── Task Name ──
  const saveTaskName = async () => {
    if (!editNameVal.trim() || editNameVal.trim() === task.client_name) { setEditingName(false); return; }
    try {
      await fetch(`/api/onboarding-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_name: editNameVal.trim() }),
      });
      onUpdate();
    } catch { /* silent */ }
    finally { setEditingName(false); }
  };

  // ── Subtasks ──
  const toggleSubtask = async (sub: Subtask) => {
    setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, completed: !s.completed } : s));
    try {
      await fetch(`/api/onboarding-subtasks/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !sub.completed }),
      });
      onUpdate();
    } catch { /* silent */ }
  };

  const addSubtask = async () => {
    if (!newSubTitle.trim()) return;
    try {
      await fetch(`/api/onboarding-tasks/${task.id}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubTitle.trim() }),
      });
      setNewSubTitle('');
      setAddingSubtask(false);
      fetchSubtasks();
      onUpdate();
    } catch { /* silent */ }
  };

  const deleteSubtask = async (subId: number) => {
    setSubtasks(prev => prev.filter(s => s.id !== subId));
    try {
      await fetch(`/api/onboarding-subtasks/${subId}`, { method: 'DELETE' });
      onUpdate();
    } catch { /* silent */ }
  };

  // ── Comments ──
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = (event) => {
          const url = event.target?.result as string;
          const name = `Imagem_${new Date().getTime()}.png`;
          setPastedFiles(prev => [...prev, { name, type: file.type, url }]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setPastedFiles(prev => [...prev, { name: file.name, type: file.type, url }]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendCommentHandler = async () => {
    if (!newComment.trim() && pastedFiles.length === 0) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/onboarding-tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newComment.trim(),
          author_name: userData?.name || user?.displayName || user?.email || 'Equipe',
          author_email: user?.email || null,
          author_avatar: userData?.picture || user?.photoURL || null,
          files: pastedFiles.length > 0 ? pastedFiles : null,
        }),
      });
      if (res.ok) {
        setNewComment('');
        setPastedFiles([]);
        fetchComments();
      }
    } catch { /* silent */ }
    finally { setSendingComment(false); }
  };

  const deleteCommentHandler = async (commentId: number) => {
    if (!(await confirmDialog({ message: 'Excluir este comentário?', danger: true }))) return;
    try {
      await fetch(`/api/onboarding-tasks/${task.id}/comments/${commentId}`, { method: 'DELETE' });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* silent */ }
  };

  const completedCount = subtasks.filter(s => s.completed).length;
  const totalSubs = subtasks.length;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto pt-10 pb-10"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-4xl mx-4 bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        >
          {/* ── Header ── */}
          <div className="px-6 py-4 border-b border-black/10 dark:border-white/5 flex items-center justify-between shrink-0">
            <div className="flex-1 min-w-0">
              {editingName ? (
                <input
                  autoFocus
                  value={editNameVal}
                  onChange={e => setEditNameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTaskName(); if (e.key === 'Escape') setEditingName(false); }}
                  onBlur={saveTaskName}
                  className="text-lg font-bold text-dark-text bg-transparent border-b-2 border-violet-500 outline-none w-full"
                />
              ) : (
                <h2
                  className="text-lg font-bold text-dark-text truncate cursor-pointer hover:text-violet-400 transition-colors"
                  onClick={() => { setEditingName(true); setEditNameVal(task.client_name); }}
                >
                  {task.client_name}
                </h2>
              )}
              {Array.isArray(task.tags) && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {task.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4 shrink-0">
              <button
                onClick={() => { onDelete(task.id); onClose(); }}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Excluir tarefa"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Body: Two Columns ── */}
          <div className="flex flex-1 overflow-hidden">
            {/* LEFT: Description + Subtasks */}
            <div className="flex-1 overflow-y-auto border-r border-black/10 dark:border-white/5 p-6 space-y-6">
              {/* Due Date (Prazo) */}
              <div className="flex items-center justify-between bg-dark-bg border border-black/10 dark:border-white/5 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-violet-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prazo de Entrega</span>
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setDueDate(val);
                    try {
                      await fetch(`/api/onboarding-tasks/${task.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ due_date: val || null }),
                      });
                      onUpdate();
                    } catch { /* silent */ }
                  }}
                  className="bg-transparent border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs text-dark-text focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={12} className="text-violet-500" /> Descrição
                  </label>
                  {!editingDesc && (
                    <button
                      onClick={() => setEditingDesc(true)}
                      className="text-[10px] text-violet-400 hover:text-violet-300 font-bold transition-colors"
                    >
                      Editar
                    </button>
                  )}
                </div>
                {editingDesc ? (
                  <div className="space-y-2">
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Adicione uma descrição..."
                      rows={5}
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-black/10 dark:border-white/10 text-sm text-dark-text focus:outline-none focus:border-violet-500/50 resize-none placeholder-slate-600"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setEditingDesc(false); setDescription(task.description || ''); }}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={saveDescription}
                        disabled={savingDesc}
                        className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5"
                      >
                        {savingDesc && <Loader2 size={12} className="animate-spin" />}
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setEditingDesc(true)}
                    className="px-4 py-3 rounded-xl bg-dark-bg border border-black/10 dark:border-white/10 text-sm text-slate-400 min-h-[60px] cursor-pointer hover:border-violet-500/30 transition-colors whitespace-pre-wrap"
                  >
                    {description || 'Clique para adicionar uma descrição...'}
                  </div>
                )}
              </div>

              {/* Subtasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Check size={12} className="text-violet-500" />
                    Subtarefas {totalSubs > 0 && `(${completedCount}/${totalSubs})`}
                  </label>
                </div>

                {loadingSubs ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-slate-500">
                    <Loader2 size={12} className="animate-spin" /> Carregando...
                  </div>
                ) : (
                  <div className="space-y-1">
                    {subtasks.map(sub => (
                      <div key={sub.id} className="flex items-center gap-3 group px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <button
                          onClick={() => toggleSubtask(sub)}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            sub.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-violet-500'
                          }`}
                        >
                          {sub.completed && <CheckCircle2 size={10} className="text-dark-text" />}
                        </button>
                        <span className={`text-xs flex-1 ${sub.completed ? 'text-slate-500 line-through' : 'text-dark-text'}`}>
                          {sub.title}
                        </span>
                        <button
                          onClick={() => deleteSubtask(sub.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-red-400 transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {addingSubtask ? (
                  <div className="flex items-center gap-2 mt-2 px-3">
                    <input
                      autoFocus
                      value={newSubTitle}
                      onChange={e => setNewSubTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') setAddingSubtask(false); }}
                      placeholder="Título da subtarefa..."
                      className="flex-1 bg-dark-bg border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-dark-text outline-none focus:border-violet-500/50 placeholder-slate-600"
                    />
                    <button onClick={addSubtask} className="text-violet-400 hover:text-violet-300 text-xs font-bold">Salvar</button>
                    <button onClick={() => setAddingSubtask(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"><X size={14} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSubtask(true)}
                    className="text-xs text-slate-500 hover:text-violet-400 flex items-center gap-1.5 px-3 py-2 mt-1 font-medium transition-colors"
                  >
                    <Plus size={14} /> Adicionar subtarefa
                  </button>
                )}

                {/* Progress bar */}
                {totalSubs > 0 && (
                  <div className="mt-3 px-3">
                    <div className="h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(completedCount / totalSubs) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 text-right">{Math.round((completedCount / totalSubs) * 100)}% concluído</p>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Activity / Comments */}
            <div className="w-80 flex flex-col bg-black/[0.04] dark:bg-white/[0.01]">
              <div className="px-4 py-4 border-b border-black/10 dark:border-white/5 shrink-0">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare size={12} className="text-violet-500" />
                  Atividade
                  <span className="bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-400">{comments.length}</span>
                </h4>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingComments ? (
                  <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare size={28} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-xs text-slate-500">Nenhum comentário</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">Seja o primeiro a comentar!</p>
                  </div>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="group">
                      <div className="flex gap-2.5">
                        <UserAvatar name={c.author_name || 'Equipe'} picture={c.author_avatar || undefined} size={28} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-violet-400">{c.author_name || 'Equipe'}</span>
                            <span className="text-[10px] text-slate-600">{formatDate(c.created_at)}</span>
                            <button
                              onClick={() => deleteCommentHandler(c.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-600 hover:text-red-400 transition-all ml-auto"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                          {c.text && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed bg-black/5 dark:bg-white/5 rounded-xl rounded-tl-sm px-3 py-2 border border-black/10 dark:border-white/5">
                              {c.text}
                            </p>
                          )}
                          {c.files && c.files.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {c.files.map((f, i) => (
                                <div key={i} className="relative group/img">
                                  {f.type?.startsWith('image/') ? (
                                    <img
                                      src={f.url}
                                      alt={f.name}
                                      className="h-24 w-auto rounded-lg object-cover border border-black/10 dark:border-white/10 cursor-pointer hover:border-violet-500/50 transition-colors"
                                      onClick={() => setLightboxUrl(f.url)}
                                    />
                                  ) : (
                                    <a href={f.url} download={f.name} className="flex items-center gap-1.5 px-3 py-2 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                      <FileText size={14} className="text-violet-500" />
                                      <span className="text-[10px] text-slate-600 dark:text-slate-300 max-w-[100px] truncate">{f.name}</span>
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* New Comment */}
              <div className="p-4 border-t border-black/10 dark:border-white/5 shrink-0">
                {/* Pasted files preview */}
                {pastedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {pastedFiles.map((f, i) => (
                      <div key={i} className="relative">
                        {f.type.startsWith('image/') ? (
                          <div className="relative">
                            <img src={f.url} alt={f.name} className="h-16 w-auto rounded-lg object-cover border border-violet-500/30" />
                            <button
                              onClick={() => setPastedFiles(p => p.filter((_, idx) => idx !== i))}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-dark-text"
                            >
                              <X size={8} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 rounded-lg border border-violet-500/20">
                            <FileText size={12} className="text-violet-500" />
                            <span className="text-[10px] text-violet-300 max-w-[80px] truncate">{f.name}</span>
                            <button onClick={() => setPastedFiles(p => p.filter((_, idx) => idx !== i))} className="text-violet-400 hover:text-violet-200 ml-1"><X size={10} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  ref={commentBoxRef}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Escreva um comentário ou cole um print (Ctrl+V)..."
                  className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-dark-text placeholder-slate-600 outline-none focus:border-violet-500/50 resize-none h-20 mb-2 transition-colors"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      sendCommentHandler();
                    }
                  }}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <input type="file" ref={fileInputRef} onChange={handleFileInput} className="hidden" accept="image/*" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
                      title="Anexar imagem"
                    >
                      <Paperclip size={14} />
                    </button>
                    <span className="text-[9px] text-slate-600">Ctrl+Enter enviar · Ctrl+V colar imagem</span>
                  </div>
                  <button
                    onClick={sendCommentHandler}
                    disabled={(!newComment.trim() && pastedFiles.length === 0) || sendingComment}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    {sendingComment ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                className="p-2 bg-black/5 dark:bg-white/20 rounded-full text-dark-text hover:bg-black/5 dark:hover:bg-white/30 transition-colors"
                onClick={(e) => { e.stopPropagation(); downloadImage(lightboxUrl); }}
                title="Baixar imagem"
              >
                <Download size={22} />
              </button>
              <button
                className="p-2 bg-black/5 dark:bg-white/20 rounded-full text-dark-text hover:bg-black/5 dark:hover:bg-white/30 transition-colors"
                onClick={() => setLightboxUrl(null)}
                title="Fechar"
              >
                <X size={24} />
              </button>
            </div>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={lightboxUrl}
              alt="Preview"
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
