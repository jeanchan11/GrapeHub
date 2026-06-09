import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Paperclip, MessageSquare, Upload, Trash2, Download,
  FileText, Image as ImageIcon, File, Loader2, Send,
  CheckCircle2, Circle, AlertCircle, Clock, Plus, Check,
  ChevronDown, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DatePicker } from './ui/DatePicker';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ─────────────────────────────────────────────────────────
interface Attachment {
  id: number;
  task_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

interface Comment {
  id: number;
  task_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  attachments: any[];
  created_at: string;
}

interface TaskSubtask {
  id: string;
  task_id: string;
  title: string;
  assignee: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  dueDate: string | null;
  createdBy: string;
  assignedTo: string;
  project_id: string;
  project_name?: string;
  project_group?: string;
  priority: string;
  subtasks_list?: TaskSubtask[];
}

type TabKey = 'details' | 'attachments' | 'comments';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onTaskUpdate: (taskId: string, field: string, value: string) => void;
  onSubtaskToggle: (subtask: TaskSubtask, taskId: string) => void;
  onSubtaskAdd: (taskId: string, title: string) => void;
  onRefresh: () => void;
  onTaskDelete?: (taskId: string) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const isImage = (type: string): boolean => type?.startsWith('image/');

const getFileIcon = (type: string) => {
  if (isImage(type)) return <ImageIcon size={18} className="text-purple-400" />;
  if (type?.includes('pdf')) return <FileText size={18} className="text-red-400" />;
  return <File size={18} className="text-slate-400" />;
};

const priorityColors: Record<string, string> = {
  'Baixa': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  'Média': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Alta': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'Urgente': 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'pending': { label: 'Pendente', color: 'bg-slate-500/20 text-slate-400', icon: <Circle size={14} /> },
  'completed': { label: 'Concluída', color: 'bg-green-500/20 text-green-400', icon: <CheckCircle2 size={14} /> },
  'gargalo': { label: 'Gargalo', color: 'bg-red-500/20 text-red-400', icon: <AlertCircle size={14} /> },
};

// ─── Component ─────────────────────────────────────────────────────
const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  onTaskUpdate,
  onSubtaskToggle,
  onSubtaskAdd,
  onRefresh,
  onTaskDelete
}) => {
  const { userData: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [description, setDescription] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ─── Data Fetching ──────────────────────────────────────────────
  const fetchAttachments = useCallback(async () => {
    if (!task) return;
    setLoadingAttachments(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/attachments`);
      if (res.ok) setAttachments(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoadingAttachments(false); }
  }, [task]);

  const fetchComments = useCallback(async () => {
    if (!task) return;
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`);
      if (res.ok) setComments(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoadingComments(false); }
  }, [task]);

  useEffect(() => {
    if (isOpen && task) {
      setDescription(task.description || '');
      fetchAttachments();
      fetchComments();
    }
  }, [isOpen, task, fetchAttachments, fetchComments]);

  // ─── File Upload ────────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    if (!task) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploaded_by', authUser?.name || authUser?.email || 'system');
      const res = await fetch(`/api/tasks/${task.id}/attachments`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        await fetchAttachments();
      }
    } catch (err) { console.error(err); }
    finally { setUploading(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(uploadFile);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files) {
      Array.from(files).forEach(uploadFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const deleteAttachment = async (id: number) => {
    try {
      await fetch(`/api/tasks/attachments/${id}`, { method: 'DELETE' });
      setAttachments(prev => prev.filter(a => a.id !== id));
    } catch (err) { console.error(err); }
  };

  // ─── Comments ───────────────────────────────────────────────────
  const sendComment = async () => {
    if (!task || !newComment.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: authUser?.name || authUser?.email || 'Anônimo',
          author_avatar: authUser?.picture || null,
          content: newComment.trim(),
        }),
      });
      if (res.ok) {
        setNewComment('');
        await fetchComments();
      }
    } catch (err) { console.error(err); }
    finally { setSendingComment(false); }
  };

  const deleteComment = async (id: number) => {
    try {
      await fetch(`/api/tasks/comments/${id}`, { method: 'DELETE' });
      setComments(prev => prev.filter(c => c.id !== id));
    } catch (err) { console.error(err); }
  };

  // ─── Description Save ──────────────────────────────────────────
  const saveDescription = () => {
    if (task && description !== task.description) {
      onTaskUpdate(task.id, 'description', description);
    }
    setEditingDesc(false);
  };

  // ─── Subtask Add ───────────────────────────────────────────────
  const handleAddSubtask = () => {
    if (!task || !newSubtaskTitle.trim()) return;
    onSubtaskAdd(task.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
    setAddingSubtask(false);
  };

  if (!isOpen || !task) return null;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'details', label: 'Detalhes', icon: <FileText size={16} /> },
    { key: 'attachments', label: 'Anexos', icon: <Paperclip size={16} />, count: attachments.length },
    { key: 'comments', label: 'Comentários', icon: <MessageSquare size={16} />, count: comments.length },
  ];

  const status = statusLabels[task.status] || statusLabels['pending'];
  const priorityStyle = priorityColors[task.priority] || priorityColors['Média'];

  return (
    <>
      {/* Main Modal */}
      <div
        className="fixed inset-0 z-50 modal-overlay flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="modal-container w-full max-w-3xl mx-auto my-8 overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-5 border-b modal-divider flex items-center justify-between shrink-0 gap-4">
            <h2 className="text-lg font-bold modal-title truncate flex-1 leading-none self-center">{task.title}</h2>
            
            <div className="flex items-center gap-2 flex-shrink-0 flex-nowrap overflow-x-auto scrollbar-hide self-center">
              <select
                value={task.status}
                onChange={(e) => onTaskUpdate(task.id, 'status', e.target.value)}
                className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer outline-none opacity-80 hover:opacity-100 transition-opacity appearance-none text-center ${status.color}`}
                title="Alterar status"
              >
                <option value="pending" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Pendente</option>
                <option value="completed" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Concluída</option>
                <option value="gargalo" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Gargalo</option>
              </select>

              <select
                value={task.priority || 'Média'}
                onChange={(e) => onTaskUpdate(task.id, 'priority', e.target.value)}
                className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider cursor-pointer outline-none opacity-80 hover:opacity-100 transition-opacity appearance-none text-center ${priorityStyle}`}
                title="Alterar prioridade"
              >
                <option value="Baixa" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Baixa</option>
                <option value="Média" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Média</option>
                <option value="Alta" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Alta</option>
                <option value="Urgente" className="text-slate-800 dark:text-white bg-white dark:bg-[#1A1A24]">Urgente</option>
              </select>

              <div className="flex items-center opacity-80 hover:opacity-100 transition-opacity ml-1">
                <DatePicker value={task.dueDate || null} onChange={(val) => onTaskUpdate(task.id, 'dueDate', val)} />
              </div>

              {onTaskDelete && (
                <button
                  onClick={() => {
                    onTaskDelete(task.id);
                    onClose();
                  }}
                  className="p-1.5 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md text-slate-500/60 dark:text-gray-400/60 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-1"
                  title="Excluir tarefa"
                >
                  <Trash2 size={14} />
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-md text-gray-500/60 dark:text-gray-400/60 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 px-6 pt-4 border-b modal-divider shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors relative
                  ${activeTab === tab.key
                    ? 'text-purple-500 dark:text-purple-400'
                    : 'text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'
                  }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] font-bold bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="task-detail-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6 overflow-y-auto flex-1 scrollbar-hide">
            <AnimatePresence mode="wait">
              {/* ═══ DETAILS TAB ═══ */}
              {activeTab === 'details' && (
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-5"
                >
                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Descrição</label>
                      {!editingDesc && (
                        <button
                          onClick={() => setEditingDesc(true)}
                          className="text-xs text-purple-500 hover:text-purple-400 font-medium"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                    {editingDesc ? (
                      <div className="space-y-2">
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Adicione uma descrição..."
                          rows={4}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setEditingDesc(false); setDescription(task.description || ''); }}
                            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-gray-300 px-3 py-1.5 rounded-lg">
                            Cancelar
                          </button>
                          <button onClick={saveDescription}
                            className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-medium">
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingDesc(true)}
                        className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-gray-400 min-h-[60px] cursor-pointer hover:border-purple-500/50 transition-colors"
                      >
                        {task.description || 'Clique para adicionar uma descrição...'}
                      </div>
                    )}
                  </div>

                  {/* Subtasks */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-slate-500 dark:text-gray-500 uppercase tracking-wider">
                        Subtarefas {task.subtasks_list?.length ? `(${task.subtasks_list.filter(s => s.completed).length}/${task.subtasks_list.length})` : ''}
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      {task.subtasks_list?.map(subtask => (
                        <div key={subtask.id} className="flex items-center gap-3 group px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <button
                            onClick={() => onSubtaskToggle(subtask, task.id)}
                            className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-colors ${subtask.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-400 dark:border-gray-600 text-transparent group-hover:border-purple-500 bg-white dark:bg-transparent'}`}
                          >
                            <Check size={12} />
                          </button>
                          <span className={`text-sm flex-1 ${subtask.completed ? 'text-slate-400 dark:text-gray-600 line-through' : 'text-slate-700 dark:text-gray-300'}`}>
                            {subtask.title}
                          </span>
                        </div>
                      ))}
                      {addingSubtask ? (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <input
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            placeholder="Título da subtarefa..."
                            className="flex-1 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-purple-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                            autoFocus
                          />
                          <button onClick={handleAddSubtask} className="text-purple-600 dark:text-purple-400 hover:text-purple-700 text-sm font-medium">Salvar</button>
                          <button onClick={() => setAddingSubtask(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-gray-400"><X size={14} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingSubtask(true)}
                          className="text-sm text-slate-500 dark:text-gray-500 hover:text-purple-500 dark:hover:text-purple-400 flex items-center gap-1.5 px-3 py-2 font-medium"
                        >
                          <Plus size={14} /> Adicionar subtarefa
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══ ATTACHMENTS TAB ═══ */}
              {activeTab === 'attachments' && (
                <motion.div
                  key="attachments"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-5"
                >
                  {/* Drop Zone */}
                  <div
                    ref={dropZoneRef}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                      ${dragOver
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-slate-300 dark:border-white/10 hover:border-purple-500/50 hover:bg-purple-500/5'
                      }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {uploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 size={32} className="animate-spin text-purple-500" />
                        <p className="text-sm text-slate-500 dark:text-gray-400">Enviando arquivo...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                          <Upload size={24} className="text-purple-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-gray-300">
                            Arraste arquivos aqui ou <span className="text-purple-500">clique para enviar</span>
                          </p>
                          <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                            Máximo 10MB por arquivo • Imagens, PDFs, Documentos
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attachments List */}
                  {loadingAttachments ? (
                    <div className="flex justify-center py-6">
                      <Loader2 size={24} className="animate-spin text-purple-500" />
                    </div>
                  ) : attachments.length === 0 ? (
                    <div className="text-center py-8">
                      <Paperclip size={32} className="mx-auto text-slate-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-slate-500 dark:text-gray-500">Nenhum anexo ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Image previews grid */}
                      {attachments.filter(a => isImage(a.file_type)).length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                          {attachments.filter(a => isImage(a.file_type)).map(att => (
                            <div key={att.id} className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 aspect-square">
                              <img
                                src={att.file_url}
                                alt={att.file_name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                <button
                                  onClick={() => setLightboxUrl(att.file_url)}
                                  className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => deleteAttachment(att.id)}
                                  className="p-2 bg-red-500/80 backdrop-blur-sm rounded-lg text-white hover:bg-red-500 transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* File list */}
                      {attachments.filter(a => !isImage(a.file_type)).map(att => (
                        <div key={att.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 group hover:border-purple-500/30 transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center border border-slate-200 dark:border-white/10">
                            {getFileIcon(att.file_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{att.file_name}</p>
                            <p className="text-xs text-slate-400 dark:text-gray-500">
                              {formatBytes(att.file_size)} • {formatDate(att.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-gray-400 transition-colors"
                            >
                              <Download size={16} />
                            </a>
                            <button
                              onClick={() => deleteAttachment(att.id)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg text-slate-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ COMMENTS TAB ═══ */}
              {activeTab === 'comments' && (
                <motion.div
                  key="comments"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-5"
                >
                  {/* Comments List */}
                  {loadingComments ? (
                    <div className="flex justify-center py-6">
                      <Loader2 size={24} className="animate-spin text-purple-500" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare size={32} className="mx-auto text-slate-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-slate-500 dark:text-gray-500">Nenhum comentário ainda</p>
                      <p className="text-xs text-slate-400 dark:text-gray-600 mt-1">Seja o primeiro a comentar!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map(comment => (
                        <div key={comment.id} className="group">
                          <div className="flex gap-3">
                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {comment.author_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                                  {comment.author_name}
                                </span>
                                <span className="text-xs text-slate-400 dark:text-gray-500">
                                  {formatDate(comment.created_at)}
                                </span>
                                <button
                                  onClick={() => deleteComment(comment.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all ml-auto"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              <div className="text-sm text-slate-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-white/5 rounded-xl rounded-tl-sm px-4 py-3 border border-slate-200 dark:border-white/10">
                                {comment.content}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New Comment Input */}
                  <div className="sticky bottom-0 bg-white dark:bg-[#1a1a2e] pt-4 border-t border-slate-200 dark:border-white/10">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-1">
                        {authUser?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <textarea
                          ref={commentInputRef}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Escreva um comentário..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none placeholder:text-slate-400 dark:placeholder:text-gray-600"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              sendComment();
                            }
                          }}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-400 dark:text-gray-600">
                            Ctrl+Enter para enviar
                          </span>
                          <button
                            onClick={sendComment}
                            disabled={!newComment.trim() || sendingComment}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                          >
                            {sendingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            Enviar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
            <button
              className="absolute top-4 right-4 p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
              onClick={() => setLightboxUrl(null)}
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={lightboxUrl}
              alt="Preview"
              className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TaskDetailModal;
