import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Send, Hand, X, Check, Clock, ThumbsUp, Wrench } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import SplitHeadline from '../../components/SplitHeadline';
import { useAuth } from '../../contexts/AuthContext';

interface Feedback {
  id: number;
  de_collaborator_id: number;
  para_collaborator_id: number;
  de_nome?: string;
  de_avatar?: string;
  para_nome?: string;
  para_avatar?: string;
  nota: number;
  texto: string;
  solicitado: boolean;
  tipo: string;
  criado_em: string;
}

interface FeedbackRequest {
  id: number;
  solicitante_id: number;
  solicitado_id: number;
  solicitante_nome?: string;
  solicitante_avatar?: string;
  mensagem: string;
  status: string;
  criado_em: string;
}

interface FeedbacksTabProps {
  collaboratorId: string;
  isAdmin: boolean;
  isSelf: boolean;
}

export default function FeedbacksTab({ collaboratorId, isAdmin, isSelf }: FeedbacksTabProps) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [requests, setRequests] = useState<FeedbackRequest[]>([]);
  const [collaborators, setCollaborators] = useState<{id: number, name: string, linked_user_email?: string}[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { userData } = useAuth();
  
  const [activeSubTab, setActiveSubTab] = useState<'recebidos' | 'enviados'>('recebidos');
  const [modalType, setModalType] = useState<'dar' | 'pedir' | null>(null);
  
  const [formData, setFormData] = useState({ target_id: '', texto: '', nota: 0, tipo: 'Construtivo' });

  const canView = isAdmin || isSelf;

  useEffect(() => {
    fetchData();
    fetchCollaborators();
  }, [collaboratorId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (canView) {
        const [fRes, rRes] = await Promise.all([
          fetch(`/api/collaborators/${collaboratorId}/feedbacks`),
          fetch(`/api/collaborators/${collaboratorId}/feedbacks/solicitacoes`)
        ]);
        if (fRes.ok) setFeedbacks(await fRes.json());
        if (rRes.ok) setRequests(await rRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const res = await fetch('/api/collaborators');
      if (res.ok) setCollaborators(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userData?.email) return alert('Usuário não autenticado.');

    // Resolve the sender (logged-in user) collaborator ID via API
    let senderId: string;
    try {
      const senderRes = await fetch(`/api/collaborators/by-email/${encodeURIComponent(userData.email)}`);
      if (!senderRes.ok) {
        const err = await senderRes.json();
        return alert('Seu usuário não possui um perfil de colaborador vinculado: ' + (err.error || 'Erro desconhecido'));
      }
      const senderData = await senderRes.json();
      senderId = String(senderData.id);
    } catch (e) {
      return alert('Erro ao identificar seu perfil de colaborador.');
    }

    const recipientId = collaboratorId;

    try {
      if (modalType === 'dar') {
        if (formData.nota === 0) return alert('Dê uma nota em estrelas.');
        const res = await fetch(`/api/collaborators/${senderId}/feedbacks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ para_collaborator_id: Number(recipientId), nota: formData.nota, texto: formData.texto, tipo: formData.tipo })
        });
        if (!res.ok) {
          const err = await res.json();
          return alert('Erro ao salvar feedback: ' + (err.error || 'Erro desconhecido'));
        }
        setModalType(null);
        fetchData();
      } else {
        const res = await fetch(`/api/collaborators/${senderId}/feedbacks/solicitar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solicitado_id: Number(recipientId), mensagem: formData.texto })
        });
        if (!res.ok) {
          const err = await res.json();
          return alert('Erro ao enviar solicitação: ' + (err.error || 'Erro desconhecido'));
        }
        setModalType(null);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResponderPedido = async (reqId: number, accept: boolean) => {
    try {
      const status = accept ? 'Respondido' : 'Recusado';
      await fetch(`/api/feedbacks/solicitacoes/${reqId}/responder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (accept) {
        // Find the request to pre-fill the "Dar feedback" modal
        const request = requests.find(r => r.id === reqId);
        if (request) {
          setFormData({ target_id: String(request.solicitante_id), texto: '', nota: 0 });
          setModalType('dar');
        }
      }
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;

  const recebidos = feedbacks.filter(f => String(f.para_collaborator_id) === String(collaboratorId));
  const enviados = feedbacks.filter(f => String(f.de_collaborator_id) === String(collaboratorId));
  const displayedFeedbacks = activeSubTab === 'recebidos' ? recebidos : enviados;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <SplitHeadline text="Feedbacks & " highlight="Reconhecimentos" className="text-xl font-black text-slate-800 dark:text-white" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            Avaliações e elogios recebidos / enviados
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setFormData({ target_id: '', texto: '', nota: 0, tipo: 'Construtivo' }); setModalType('pedir'); }}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.05] dark:hover:bg-white/10 text-slate-700 dark:text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Hand size={16} /> Pedir Feedback
          </button>
          <button 
            onClick={() => { setFormData({ target_id: '', texto: '', nota: 0, tipo: 'Construtivo' }); setModalType('dar'); }}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Send size={16} /> Dar Feedback
          </button>
        </div>
      </div>

      {!canView ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
          <MessageSquare size={48} className="mb-4 opacity-50 text-violet-500" />
          <p className="text-base font-semibold">Os feedbacks são privados.</p>
          <p className="text-sm">Apenas o próprio colaborador e administradores podem visualizá-los.</p>
        </div>
      ) : (
        <>
          {requests.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6">
              <h4 className="text-sm font-bold text-amber-600 dark:text-amber-500 flex items-center gap-2 mb-3">
                <Clock size={16} /> Solicitações Pendentes ({requests.length})
              </h4>
              <div className="space-y-3">
                {requests.map(req => (
                  <div key={req.id} className="bg-white dark:bg-[#1A1A1A] p-3 rounded-xl border border-slate-200 dark:border-[#2A2A2A] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-amber-500/20 text-amber-600 overflow-hidden">
                        {req.solicitante_avatar ? <img src={req.solicitante_avatar} className="w-full h-full object-cover" /> : req.solicitante_nome?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-[#F0F0F0]">{req.solicitante_nome} pediu um feedback</p>
                        {req.mensagem && <p className="text-xs text-slate-500 dark:text-[#888]">{req.mensagem}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleResponderPedido(req.id, false)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Recusar</button>
                      <button onClick={() => handleResponderPedido(req.id, true)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition-colors">Responder</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-px">
            <button 
              onClick={() => setActiveSubTab('recebidos')}
              className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeSubTab === 'recebidos' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
            >
              Recebidos ({recebidos.length})
            </button>
            <button 
              onClick={() => setActiveSubTab('enviados')}
              className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeSubTab === 'enviados' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
            >
              Enviados ({enviados.length})
            </button>
          </div>

          {displayedFeedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-[#888]">
              <MessageSquare size={32} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum feedback {activeSubTab} ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {displayedFeedbacks.map(f => {
                const isRecebido = activeSubTab === 'recebidos';
                const peerNome = isRecebido ? f.de_nome : f.para_nome;
                const peerAvatar = isRecebido ? f.de_avatar : f.para_avatar;

                return (
                  <div key={f.id} className="bg-white dark:bg-dark-bg p-5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-violet-500/30 dark:hover:border-violet-500/40 transition-colors hover:shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white overflow-hidden border border-slate-300 dark:border-white/10">
                          {peerAvatar ? <img src={peerAvatar} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : peerNome?.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">{isRecebido ? `De: ${peerNome}` : `Para: ${peerNome}`}</h4>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(f.criado_em).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={14} className={s <= f.nota ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-white/20"} />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {f.tipo === 'Positivo' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <ThumbsUp size={10} /> Positivo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Wrench size={10} /> Construtivo
                        </span>
                      )}
                      {f.solicitado && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                          Solicitado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{f.texto}</p>
                  </div>

                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0D0D0D] w-full max-w-lg rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-[#2A2A2A] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2A2A2A]">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {modalType === 'dar' ? <Send size={18} className="text-violet-500" /> : <Hand size={18} className="text-amber-500" />}
                {modalType === 'dar' ? 'Dar Feedback' : 'Pedir Feedback'}
              </h2>
              <button onClick={() => setModalType(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#888] mb-1.5 uppercase">Para quem?</label>
                <div className="w-full bg-slate-100 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white opacity-70 cursor-not-allowed">
                  {collaborators.find(c => String(c.id) === String(collaboratorId))?.name || 'Este colaborador'}
                </div>
              </div>

              {modalType === 'dar' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#888] mb-2 uppercase">Tipo de Feedback</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, tipo: 'Positivo'})}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                          formData.tipo === 'Positivo'
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'border-slate-200 dark:border-[#2A2A2A] text-slate-500 hover:border-emerald-500/50 hover:text-emerald-600'
                        }`}
                      >
                        <ThumbsUp size={16} />
                        Positivo
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, tipo: 'Construtivo'})}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                          formData.tipo === 'Construtivo'
                            ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400'
                            : 'border-slate-200 dark:border-[#2A2A2A] text-slate-500 hover:border-amber-500/50 hover:text-amber-600'
                        }`}
                      >
                        <Wrench size={16} />
                        Construtivo
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-[#888] mb-1.5 uppercase">Avaliação (1 a 5)</label>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(s => (
                        <button 
                          key={s} type="button"
                          onClick={() => setFormData({...formData, nota: s})}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star size={24} className={s <= formData.nota ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-[#2A2A2A]"} />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#888] mb-1.5 uppercase">
                  {modalType === 'dar' ? 'Mensagem de Feedback' : 'Motivo / Mensagem (Opcional)'}
                </label>
                <textarea 
                  required={modalType === 'dar'}
                  value={formData.texto} 
                  onChange={e => setFormData({...formData, texto: e.target.value})}
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500"
                  placeholder={modalType === 'dar' ? 'Escreva um feedback construtivo...' : 'Gostaria de um feedback sobre o projeto X...'}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setModalType(null)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                  <Check size={16} /> Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
