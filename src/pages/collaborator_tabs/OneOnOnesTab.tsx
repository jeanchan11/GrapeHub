import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, FileText, ArrowRight, MessageSquare, X, Check, Users } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import SplitHeadline from '../../components/SplitHeadline';
import { useAuth } from '../../contexts/AuthContext';

interface OneOnOne {
  id: number;
  collaborator_id: number;
  participante_id: number;
  participante_nome?: string;
  participante_avatar?: string;
  data_reuniao: string;
  anotacoes: string;
  proximos_passos: string;
}

interface OneOnOnesTabProps {
  collaboratorId: string;
  isAdmin: boolean;
}

export default function OneOnOnesTab({ collaboratorId, isAdmin }: OneOnOnesTabProps) {
  const [items, setItems] = useState<OneOnOne[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<OneOnOne> | null>(null);
  const [saving, setSaving] = useState(false);

  const { userData } = useAuth();

  useEffect(() => {
    fetchItems();
  }, [collaboratorId]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collaborators/${collaboratorId}/one-on-ones`);
      if (res.ok) setItems(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingItem({ data_reuniao: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.data_reuniao) return alert('Data é obrigatória.');

    setSaving(true);
    try {
      // Resolve logged-in user's collaborator ID
      let participanteId: number | undefined = editingItem.participante_id;

      if (!participanteId) {
        if (!userData?.email) { setSaving(false); return alert('Usuário não autenticado.'); }
        const senderRes = await fetch(`/api/collaborators/by-email/${encodeURIComponent(userData.email)}`);
        if (!senderRes.ok) {
          setSaving(false);
          return alert('Seu usuário não possui um perfil de colaborador vinculado.');
        }
        const senderData = await senderRes.json();
        participanteId = senderData.id;
      }

      const payload = { ...editingItem, participante_id: participanteId };
      const isEditing = !!editingItem.id;
      const url = isEditing
        ? `/api/collaborators/${collaboratorId}/one-on-ones/${editingItem.id}`
        : `/api/collaborators/${collaboratorId}/one-on-ones`;

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        return alert('Erro ao salvar: ' + (err.error || 'Erro desconhecido'));
      }
      setModalOpen(false);
      fetchItems();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este registro?')) return;
    try {
      const res = await fetch(`/api/collaborators/${collaboratorId}/one-on-ones/${id}`, { method: 'DELETE' });
      if (res.ok) setItems(items.filter(i => i.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <SplitHeadline text="Reuniões " highlight="1:1" className="text-xl font-black text-slate-800 dark:text-white" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            Acompanhamento individual
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openNewModal}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={16} /> Registrar 1:1
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5">
          <MessageSquare size={48} className="mb-4 opacity-50 text-violet-500" />
          <p className="text-base font-semibold">Nenhum 1:1 registrado ainda.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-violet-500/20 ml-6 space-y-8 pb-8 pt-4">
          {items.map((item) => (
            <div key={item.id} className="relative pl-8">
              {/* Timeline dot */}
              <div className="absolute -left-[11px] top-1.5 w-5 h-5 rounded-full border-4 border-white dark:border-[#151221] bg-violet-500"></div>

              <div className="bg-white dark:bg-dark-bg p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hover:border-violet-500/30 transition-all group">
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-violet-500/20 text-violet-500 overflow-hidden">
                      {item.participante_avatar ? (
                        <img src={item.participante_avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        item.participante_nome?.charAt(0).toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-[#F0F0F0] text-sm flex items-center gap-2">
                        1:1 com {item.participante_nome}
                      </h4>
                      <span className="text-xs font-medium text-slate-500 dark:text-[#888] flex items-center gap-1 mt-0.5">
                        <Calendar size={12} /> {new Date(item.data_reuniao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingItem(item); setModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-violet-500 hover:bg-violet-500/10 rounded-lg transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {item.anotacoes && (
                    <div className="bg-slate-50 dark:bg-white/[0.02] p-4 rounded-xl border border-slate-100 dark:border-white/5">
                      <h5 className="text-xs font-bold text-slate-500 dark:text-[#888] mb-2 uppercase flex items-center gap-1">
                        <FileText size={14} /> Anotações
                      </h5>
                      <p className="text-sm text-slate-700 dark:text-[#F0F0F0] whitespace-pre-wrap">{item.anotacoes}</p>
                    </div>
                  )}
                  {item.proximos_passos && (
                    <div className="bg-violet-500/5 p-4 rounded-xl border border-violet-500/10">
                      <h5 className="text-xs font-bold text-violet-600 dark:text-violet-400 mb-2 uppercase flex items-center gap-1">
                        <ArrowRight size={14} /> Próximos Passos
                      </h5>
                      <p className="text-sm text-slate-700 dark:text-[#F0F0F0] whitespace-pre-wrap">{item.proximos_passos}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0D0D0D] w-full max-w-xl rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-[#2A2A2A] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2A2A2A]">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingItem.id ? 'Editar 1:1' : 'Registrar 1:1'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Data */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#888] mb-1.5 uppercase">Data da Reunião *</label>
                <input
                  type="date" required
                  value={editingItem.data_reuniao ? editingItem.data_reuniao.split('T')[0] : ''}
                  onChange={e => setEditingItem({ ...editingItem, data_reuniao: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Anotações */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#888] mb-1.5 uppercase">Anotações Livres</label>
                <textarea
                  value={editingItem.anotacoes || ''}
                  onChange={e => setEditingItem({ ...editingItem, anotacoes: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500"
                  placeholder="O que foi discutido?"
                />
              </div>

              {/* Próximos passos */}
              <div>
                <label className="block text-xs font-bold text-violet-500 mb-1.5 uppercase flex items-center gap-1">
                  <ArrowRight size={12} /> Próximos Passos
                </label>
                <textarea
                  value={editingItem.proximos_passos || ''}
                  onChange={e => setEditingItem({ ...editingItem, proximos_passos: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500"
                  placeholder="Ações e acompanhamentos..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                  {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                  Salvar 1:1
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
