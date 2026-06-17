import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, Calendar, FileText, ArrowRight,
  MessageSquare, X, Check, CalendarClock, Clock, Trash
} from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import SplitHeadline from '../../components/SplitHeadline';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../firebase';

// Helper: fetch autenticado com token Firebase
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string> || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Proximo1on1 {
  id: number;
  collaborator_id: number;
  data: string;
  horario: string;
  observacao: string | null;
  criado_por_nome: string | null;
  criado_em: string;
}

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

// ── AgendarProximo1on1 Modal ──────────────────────────────────────────────────
interface AgendarProps {
  collaboratorId: string;
  userEmail: string | undefined;
  onClose: () => void;
  onSaved: () => void;
}

function AgendarProximo1on1Modal({ collaboratorId, userEmail, onClose, onSaved }: AgendarProps) {
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('09:00');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!data) { setError('Selecione a data do próximo 1:1.'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await authFetch(`/api/collaborators/${collaboratorId}/proximo-1on1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { 'x-user-email': userEmail } : {}),
        },
        body: JSON.stringify({ data, horario, observacao }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao agendar');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-white dark:bg-dark-bg/95 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <CalendarClock size={18} className="text-violet-400" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 dark:text-white text-base">Agendar Próximo 1:1</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Defina a data da próxima reunião</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Data</label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Horário</label>
              <input
                type="time"
                value={horario}
                onChange={e => setHorario(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Observação (opcional)</label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={3}
              placeholder="Pauta ou ponto a preparar para o 1:1..."
              className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5 text-sm text-rose-400">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/[0.07] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Confirmar agendamento
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function OneOnOnesTab({ collaboratorId, isAdmin }: OneOnOnesTabProps) {
  const [items, setItems] = useState<OneOnOne[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [showAgendarModal, setShowAgendarModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<OneOnOne> | null>(null);
  const [saving, setSaving] = useState(false);
  const [proximo1on1, setProximo1on1] = useState<Proximo1on1 | null>(null);

  const { userData } = useAuth();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, proxRes] = await Promise.all([
        authFetch(`/api/collaborators/${collaboratorId}/one-on-ones`),
        authFetch(`/api/collaborators/${collaboratorId}/proximo-1on1`),
      ]);
      if (itemsRes.ok) setItems(await itemsRes.json());
      if (proxRes.ok) {
        const p = await proxRes.json();
        setProximo1on1(p);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [collaboratorId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRemoverAgendamento = async () => {
    if (!confirm('Remover agendamento do próximo 1:1?')) return;
    await authFetch(`/api/collaborators/${collaboratorId}/proximo-1on1`, { method: 'DELETE' });
    setProximo1on1(null);
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
      let participanteId: number | undefined = editingItem.participante_id;

      if (!participanteId) {
        if (!userData?.email) { setSaving(false); return alert('Usuário não autenticado.'); }
        const senderRes = await authFetch(`/api/collaborators/by-email/${encodeURIComponent(userData.email)}`);
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

      const res = await authFetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        return alert('Erro ao salvar: ' + (err.error || 'Erro desconhecido'));
      }
      setModalOpen(false);
      fetchAll();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir este registro?')) return;
    try {
      const res = await authFetch(`/api/collaborators/${collaboratorId}/one-on-ones/${id}`, { method: 'DELETE' });
      if (res.ok) setItems(items.filter(i => i.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <SplitHeadline text="Reuniões " highlight="1:1" className="text-xl font-black text-slate-800 dark:text-white" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            Acompanhamento individual
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAgendarModal(true)}
              className="flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-violet-50 dark:hover:bg-violet-500/10 border border-slate-200 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-500/30 text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            >
              <CalendarClock size={15} /> Agendar próximo
            </button>
            <button
              onClick={openNewModal}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus size={16} /> Registrar 1:1
            </button>
          </div>
        )}
      </div>

      {/* ── Card Próximo 1:1 ── */}
      {proximo1on1 && (() => {
        const dataStr = proximo1on1.data.includes('T')
          ? proximo1on1.data
          : proximo1on1.data + 'T12:00:00';
        const dataObj = new Date(dataStr);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const diasRestantes = Math.ceil((dataObj.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const isPast = diasRestantes < 0;
        const isToday = diasRestantes === 0;
        const badgeColor = isPast
          ? 'bg-rose-500/15 text-rose-400 border-rose-500/20'
          : isToday
            ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
        const badgeLabel = isPast
          ? `${Math.abs(diasRestantes)}d atrás`
          : isToday
            ? 'Hoje!'
            : `em ${diasRestantes}d`;
        const horarioFmt = proximo1on1.horario ? proximo1on1.horario.slice(0, 5) : '';

        return (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-r from-violet-600/10 via-violet-500/5 to-transparent border border-violet-500/20 rounded-2xl p-5 flex items-center gap-4"
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent pointer-events-none" />
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center shrink-0">
              <CalendarClock size={22} className="text-violet-400" />
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Próximo 1:1 Agendado</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>{badgeLabel}</span>
              </div>
              <p className="text-base font-black text-slate-800 dark:text-white">
                {dataObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-4 mt-1">
                {horarioFmt && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={11} /> {horarioFmt}
                  </span>
                )}
                {proximo1on1.observacao && (
                  <span className="text-xs text-slate-500 truncate max-w-xs">{proximo1on1.observacao}</span>
                )}
                {proximo1on1.criado_por_nome && (
                  <span className="text-xs text-slate-400">Agendado por {proximo1on1.criado_por_nome}</span>
                )}
              </div>
            </div>
            {/* Actions */}
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowAgendarModal(true)}
                  className="text-xs text-violet-400 hover:text-violet-300 font-bold px-3 py-1.5 rounded-lg hover:bg-violet-500/10 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={handleRemoverAgendamento}
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-rose-500/10"
                >
                  <Trash size={13} />
                </button>
              </div>
            )}
          </motion.div>
        );
      })()}

      {/* ── Lista de 1:1s ── */}
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

      {/* Modal Registrar / Editar 1:1 */}
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

      {/* Modal Agendar Próximo 1:1 */}
      {showAgendarModal && (
        <AgendarProximo1on1Modal
          collaboratorId={collaboratorId}
          userEmail={userData?.email}
          onClose={() => setShowAgendarModal(false)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}
