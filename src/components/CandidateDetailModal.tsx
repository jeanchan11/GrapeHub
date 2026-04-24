import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Calendar, 
  MessageSquare, 
  History, 
  Trash2, 
  Briefcase, 
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Phone,
  Mail,
  Plus,
  Send
} from 'lucide-react';

interface Candidate {
  id: number;
  folder_id: number;
  nome: string;
  contato: string | null;
  acao: string | null;
  data_acao: string | null;
  col: string;
  form_data?: any;
  created_at: string;
}

interface Note {
  id: number;
  content: string;
  user_name: string;
  created_at: string;
}

interface HistoryItem {
  id: number;
  action: string;
  details: string;
  user_name: string;
  created_at: string;
}

interface UserData {
  name: string;
}

interface CandidateDetailModalProps {
  candidate: Candidate;
  currentUser: UserData | null;
  onClose: () => void;
  onMoveCandidate: (candidateId: number, newColumn: string) => void;
  onUpdateCandidate: (candidate: Candidate) => void;
}

export const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({
  candidate,
  currentUser,
  onClose,
  onMoveCandidate,
  onUpdateCandidate
}) => {
  const [activeTab, setActiveTab] = useState<'historico' | 'formulario'>('historico');
  const [notes, setNotes] = useState<Note[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ msg: string; onConfirm: () => void; color?: string } | null>(null);
  const [historyCommentOpen, setHistoryCommentOpen] = useState(false);
  const [historyComment, setHistoryComment] = useState('');

  useEffect(() => {
    fetchNotes();
    fetchHistory();
  }, [candidate.id]);

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/hiring/candidates/${candidate.id}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/hiring/candidates/${candidate.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handeAddNote = async () => {
    if (!newNote.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hiring/candidates/${candidate.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newNote.trim(),
          user_name: currentUser?.name || 'Usuário'
        })
      });
      if (res.ok) {
        setNewNote('');
        fetchNotes();
        // Register history for added note
        logHistory('Adicionou uma nota', 'Nova anotação incluída no perfil.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    setConfirmAction({
      msg: 'Deseja excluir esta nota?',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/hiring/candidates/notes/${noteId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            fetchNotes();
          }
        } catch (e) {
          console.error(e);
        }
        setConfirmAction(null);
      }
    });
  };

  const logHistory = async (action: string, details: string) => {
    try {
      await fetch(`/api/hiring/candidates/${candidate.id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          details,
          user_name: currentUser?.name || 'Sistema'
        })
      });
      fetchHistory();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = (status: 'Aprovado' | 'Reprovado') => {
    const isApproval = status === 'Aprovado';
    setConfirmAction({
      msg: `Deseja marcar este candidato como ${status}?`,
      color: isApproval ? 'emerald' : 'rose',
      onConfirm: () => {
        onUpdateCandidate({ ...candidate, col: status });
        onMoveCandidate(candidate.id, status);
        logHistory('Alterou o status', `Movido de: ${candidate.col} → ${status}`);
        setConfirmAction(null);
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-6xl h-[90vh] bg-light-card dark:bg-dark-card rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
              {candidate.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {candidate.nome}
              </h2>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Candidato • ID: #{candidate.id}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleStatusChange('Aprovado')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <CheckCircle2 size={16} /> Aprovar
            </button>
            <button
              onClick={() => handleStatusChange('Reprovado')}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <XCircle size={16} /> Reprovar
            </button>
            <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-1"></div>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Main Area (Left) */}
          <div className="flex-1 flex flex-col bg-white dark:bg-dark-bg">
            <div className="flex items-center gap-6 px-6 border-b border-slate-200 dark:border-white/10 overflow-x-auto shrink-0 bg-slate-50/50 dark:bg-white/5 pt-2">

              <button
                className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap px-1 ${activeTab === 'historico' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                onClick={() => setActiveTab('historico')}
              >
                Histórico
              </button>
              {candidate.form_data && Object.keys(candidate.form_data).length > 0 && (
                <button
                  className={`pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap px-1 ${activeTab === 'formulario' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  onClick={() => setActiveTab('formulario')}
                >
                  Formulário Submetido
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              


              {/* Histórico Tab */}
              {activeTab === 'historico' && (
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">Histórico</h3>
                    <button
                      onClick={() => setHistoryCommentOpen(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-violet-400 hover:text-white bg-violet-500/10 hover:bg-violet-600 border border-violet-500/20 hover:border-violet-600 rounded-lg transition-all"
                    >
                      <Plus size={13} /> Adicionar Comentário
                    </button>
                  </div>

                  {/* Comment Popup */}
                  {historyCommentOpen && (
                    <div className="bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl p-4 mb-6 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare size={14} className="text-violet-500" />
                        <span className="text-xs font-bold text-slate-800 dark:text-white">Novo Comentário</span>
                      </div>
                      <textarea
                        autoFocus
                        value={historyComment}
                        onChange={e => setHistoryComment(e.target.value)}
                        placeholder="Escreva uma observação sobre o candidato..."
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 resize-none transition-colors"
                        rows={3}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && historyComment.trim()) {
                            logHistory('Comentário', historyComment.trim());
                            setHistoryComment('');
                            setHistoryCommentOpen(false);
                          }
                        }}
                      />
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[10px] text-slate-400">⌘ + Enter para enviar</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setHistoryCommentOpen(false); setHistoryComment(''); }}
                            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >Cancelar</button>
                          <button
                            onClick={() => {
                              if (!historyComment.trim()) return;
                              logHistory('Comentário', historyComment.trim());
                              setHistoryComment('');
                              setHistoryCommentOpen(false);
                            }}
                            disabled={!historyComment.trim()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                          >
                            <Send size={11} /> Enviar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="relative ml-3">
                    {/* Timeline line */}
                    <div className="absolute left-0 top-2 bottom-0 w-px bg-slate-200 dark:bg-slate-700"></div>

                    {history.length === 0 ? (
                      <div className="text-slate-500 py-4 pl-8 text-sm">Nenhum histórico registrado.</div>
                    ) : (
                      <div className="space-y-6">
                        {history.map((item) => {
                          const isStatusChange = item.action.toLowerCase().includes('status');
                          const isApproval = item.details?.toLowerCase().includes('aprovado');
                          const isRejection = item.details?.toLowerCase().includes('reprovado');
                          const dotColor = isApproval ? 'bg-emerald-500' : isRejection ? 'bg-rose-500' : 'bg-violet-500';

                          // Extract "from → to" if it's a move action
                          const moveMatch = item.details?.match(/Movido de: (.+?) → (.+)/i) || item.details?.match(/movido para: (.+)/i);
                          const fromCol = moveMatch && moveMatch[2] ? moveMatch[1] : null;
                          const toCol = moveMatch ? (moveMatch[2] || moveMatch[1]) : null;

                          return (
                            <div key={item.id} className="relative pl-8">
                              {/* Timeline dot */}
                              <div className={`absolute -left-[5px] top-5 w-[10px] h-[10px] rounded-full ${dotColor} ring-4 ring-slate-50 dark:ring-dark-bg z-10`} />

                              {/* Card */}
                              <div className="bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl p-4 shadow-sm">
                                {/* Action badges */}
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  {isStatusChange && toCol ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                                        {fromCol || 'Anterior'}
                                      </span>
                                      <span className="text-slate-400 text-xs">→</span>
                                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                                        isApproval
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                          : isRejection
                                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                          : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                                      }`}>
                                        {toCol}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-sm font-bold text-slate-800 dark:text-white">
                                      {item.action}
                                    </span>
                                  )}
                                </div>

                                {/* Details */}
                                {!isStatusChange && item.details && (
                                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                                    {item.details}
                                  </p>
                                )}

                                {/* Timestamp & user */}
                                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                  <Clock size={11} />
                                  <span>{new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className="text-slate-300 dark:text-slate-600">•</span>
                                  <span className="text-slate-500 dark:text-slate-300 font-medium">{item.user_name}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Formulário Tab */}
              {activeTab === 'formulario' && candidate.form_data && (
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <FileText className="text-violet-500" size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">Respostas do Candidato</h3>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{Object.keys(candidate.form_data).filter(k => candidate.form_data[k] !== '').length} campos preenchidos</p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-200 dark:bg-white/10 w-full"></div>

                  {/* Responses Grid */}
                  <div className="space-y-5">
                    {Object.entries(candidate.form_data).map(([key, val]) => {
                      if (val === '') return null;
                      const formattedKey = key
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
                      const isLong = typeof val === 'string' && val.length > 50;

                      return (
                        <div key={key}>
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-medium">{formattedKey}</span>
                          <div className={`font-semibold text-sm text-slate-800 dark:text-white ${isLong ? 'whitespace-pre-wrap' : ''}`}>
                            {String(val)}
                          </div>
                          <div className="h-px bg-slate-200 dark:bg-white/5 w-full mt-4"></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-[320px] bg-slate-50 dark:bg-white/5 border-l border-slate-200 dark:border-white/10 flex flex-col p-6 overflow-y-auto shrink-0">
            
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <User size={14} /> Dados do Candidato
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Nome Completo</span>
                  <div className="font-semibold text-sm text-slate-800 dark:text-white">{candidate.nome}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Contato</span>
                  <div className="font-semibold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    {candidate.contato?.includes('@') ? <Mail size={12} className="text-slate-400"/> : <Phone size={12} className="text-slate-400"/>}
                    {candidate.contato || 'Não informado'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Data de Criação</span>
                  <div className="font-semibold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    <Calendar size={12} className="text-slate-400"/>
                    {new Date(candidate.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-200 dark:bg-white/10 w-full my-6"></div>

            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Briefcase size={14} /> Processo Seletivo
              </h3>
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Coluna Atual</span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 font-bold text-sm">
                    {candidate.col}
                  </div>
                </div>
                {candidate.acao && (
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Ação Planejada</span>
                    <div className="font-semibold text-sm text-slate-800 dark:text-white bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-md p-2">
                      <div className="flex items-center gap-2 text-rose-500">
                        <Clock size={12} />
                        {candidate.data_acao ? new Date(candidate.data_acao).toLocaleDateString('pt-BR') : ''}
                      </div>
                      <div className="mt-1">{candidate.acao}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
      {/* Custom Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                confirmAction.color === 'emerald' ? 'bg-emerald-500/15' : 'bg-rose-500/15'
              }`}>
                {confirmAction.color === 'emerald' 
                  ? <CheckCircle2 size={18} className="text-emerald-400" />
                  : <Trash2 size={18} className="text-rose-400" />
                }
              </div>
              <h3 className="text-white font-bold text-base">Confirmar Ação</h3>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">{confirmAction.msg}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors">Cancelar</button>
              <button onClick={confirmAction.onConfirm} className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors ${
                confirmAction.color === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
