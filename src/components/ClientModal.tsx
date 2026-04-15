import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, UserPlus, CheckCircle2, AlertCircle, Link as LinkIcon, 
  ChevronDown, Search, Check, Unlink, FileText, MessageSquare
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { designSystem } from '../design-system';
import CrmCommentHistory from './CrmCommentHistory';

interface Client {
  id: string;
  name: string;
  startDate: string;
  location: string;
  squad: string;
  tags: string;
  email: string;
  phone: string;
  status: 'Ativo' | 'Inativo';
  createdAt: string;
  crmStatus?: string;
}

interface FinPerson {
  id: string;
  name: string;
  cnpjcpf: string;
  grapehub_client_id: string | null;
}

interface FinMovement {
  movement_date: string;
  expiration_date: string;
  movement_value: string;
  status: string;
  value?: string;
}

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingClient: Client | null;
  onSaveSuccess: () => void;
}

const ClientModal = ({ isOpen, onClose, editingClient, onSaveSuccess }: ClientModalProps) => {
  const [activeTab, setActiveTab] = useState<'client' | 'finance'>('client');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    location: '',
    squad: 'Able',
    tags: '',
    email: '',
    phone: '',
    status: 'Ativo' as 'Ativo' | 'Inativo',
    crmStatus: ''
  });

  // Finance state
  const [finPeople, setFinPeople] = useState<FinPerson[]>([]);
  const [finSearchQuery, setFinSearchQuery] = useState('');
  const [selectedFinPersonId, setSelectedFinPersonId] = useState<string | null>(null);
  const [isFinDropdownOpen, setIsFinDropdownOpen] = useState(false);
  const [finMovements, setFinMovements] = useState<FinMovement[]>([]);
  const [isFetchingMovements, setIsFetchingMovements] = useState(false);

  useEffect(() => {
    if (editingClient) {
      setFormData({
        name: editingClient.name || '',
        startDate: editingClient.startDate || '',
        location: editingClient.location || '',
        squad: editingClient.squad || 'Able',
        tags: editingClient.tags || '',
        email: editingClient.email || '',
        phone: editingClient.phone || '',
        status: editingClient.status || 'Ativo',
        crmStatus: editingClient.crmStatus || ''
      });
    } else {
      setFormData({
        name: '',
        startDate: new Date().toISOString().split('T')[0],
        location: '',
        squad: 'Able',
        tags: '',
        email: '',
        phone: '',
        status: 'Ativo',
        crmStatus: ''
      });
    }
    setActiveTab('client');
  }, [editingClient, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/fin-people').then(res => res.json()).then(setFinPeople);
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingClient && finPeople.length > 0) {
      const linked = finPeople.find(p => p.grapehub_client_id === editingClient.id);
      if (linked) setSelectedFinPersonId(linked.id);
      else setSelectedFinPersonId(null);
    } else if (!editingClient) {
      setSelectedFinPersonId(null);
    }
  }, [editingClient, finPeople]);

  useEffect(() => {
    if (isOpen && activeTab === 'finance' && selectedFinPersonId) {
      const fetchMovements = async () => {
        setIsFetchingMovements(true);
        try {
          const response = await fetch(`/api/fin-people/${selectedFinPersonId}/movements`);
          if (response.ok) {
            const data = await response.json();
            setFinMovements(data);
          }
        } catch (err) {
          console.error("Failed to fetch movements:", err);
        } finally {
          setIsFetchingMovements(false);
        }
      };
      fetchMovements();
    }
  }, [isOpen, activeTab, selectedFinPersonId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const clientData = {
      id: editingClient?.id || Math.random().toString(36).substr(2, 9),
      ...formData,
      createdAt: editingClient?.createdAt || new Date().toISOString()
    };

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([clientData])
      });

      if (response.ok) {
        const originalLinkedPerson = editingClient ? finPeople.find(p => p.grapehub_client_id === editingClient.id) : null;
        
        if (originalLinkedPerson?.id !== selectedFinPersonId) {
          if (originalLinkedPerson) {
            await fetch(`/api/fin-people/${originalLinkedPerson.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ grapehub_client_id: null })
            });
          }
          
          if (selectedFinPersonId) {
            await fetch(`/api/fin-people/${selectedFinPersonId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ grapehub_client_id: clientData.id })
            });
          }
        }

        onSaveSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Failed to save client:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const squads = ['Able', 'Baker', 'Charlie', 'Delta'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
      icon={<UserPlus size={24} />}
      maxWidth="max-w-2xl"
      footer={
        activeTab === 'client' ? (
          <>
            <button 
              type="button"
              onClick={onClose}
              className={designSystem.button.secondary}
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={designSystem.button.primary}
            >
              {isSaving ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </>
        ) : null
      }
    >
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex border-b modal-divider shrink-0 mb-6">
          <button 
            onClick={() => setActiveTab('client')}
            className={`px-8 py-4 text-sm font-bold transition-all ${activeTab === 'client' ? 'modal-tab-active' : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Dados do Cliente
          </button>
          <button 
            onClick={() => setActiveTab('finance')}
            className={`px-8 py-4 text-sm font-bold transition-all ${activeTab === 'finance' ? 'modal-tab-active' : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Financeiro
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'client' ? (
            <form id="client-form" onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={designSystem.input.label}>Nome do Cliente</label>
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Advocacia Silva"
                    className={designSystem.input.field}
                  />
                </div>
                <div className="space-y-2">
                  <label className={designSystem.input.label}>Data Inicial</label>
                  <input 
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={designSystem.input.field}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={designSystem.input.label}>Local do Escritório</label>
                <input 
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ex: Uberlândia, MG"
                  className={designSystem.input.field}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={designSystem.input.label}>Squad</label>
                  <select 
                    value={formData.squad}
                    onChange={(e) => setFormData({ ...formData, squad: e.target.value })}
                    className={designSystem.input.field}
                  >
                    {squads.map(s => <option key={s} value={s} className="bg-light-sidebar dark:bg-dark-sidebar">{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={designSystem.input.label}>Tags (separadas por vírgula)</label>
                  <input 
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Ex: consumidor, previdenciário"
                    className={designSystem.input.field}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={designSystem.input.label}>Email</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@empresa.com"
                    className={designSystem.input.field}
                  />
                </div>
                <div className="space-y-2">
                  <label className={designSystem.input.label}>Telefone</label>
                  <input 
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className={designSystem.input.field}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={designSystem.input.label}>Status</label>
                <div className="flex gap-3">
                  {['Ativo', 'Inativo'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: status as 'Ativo' | 'Inativo' })}
                      className={`flex-1 py-4 rounded-xl font-bold transition-all ${
                        formData.status === status
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </form>
                ) : (
                  <div className="space-y-8">
                    {/* Seção 1 - Vínculo Financeiro */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <LinkIcon size={16} className="text-violet-500" />
                        <h3 className="text-sm font-bold text-light-text dark:text-white uppercase tracking-widest">Vínculo Financeiro</h3>
                      </div>
                      
                      <div className="space-y-2 relative">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Vincular ao Financeiro (Marvee/Asaas)</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <button
                              type="button"
                              onClick={() => setIsFinDropdownOpen(!isFinDropdownOpen)}
                              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-4 text-left flex items-center justify-between transition-all hover:border-violet-500/50"
                            >
                              {selectedFinPersonId ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-light-text dark:text-white font-medium">
                                    {finPeople.find(p => p.id === selectedFinPersonId)?.name}
                                  </span>
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold rounded-md uppercase tracking-widest">
                                    Vinculado ✓
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">Selecionar pessoa no financeiro...</span>
                              )}
                              <ChevronDown size={18} className={`text-slate-400 transition-transform ${isFinDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isFinDropdownOpen && (
                              <div className="absolute z-[110] top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-3 border-b border-slate-100 dark:border-white/5">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                      autoFocus
                                      type="text"
                                      placeholder="Buscar por nome..."
                                      value={finSearchQuery}
                                      onChange={(e) => setFinSearchQuery(e.target.value)}
                                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-violet-500 transition-all"
                                    />
                                  </div>
                                </div>
                                <div className="max-h-[250px] overflow-y-auto p-1">
                                  {finPeople
                                    .filter(p => p.name.toLowerCase().includes(finSearchQuery.toLowerCase()))
                                    .map(person => (
                                      <button
                                        key={person.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedFinPersonId(person.id);
                                          setIsFinDropdownOpen(false);
                                        }}
                                        className={`w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex flex-col gap-0.5 ${selectedFinPersonId === person.id ? 'bg-violet-500/10' : ''}`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className={`font-bold text-sm ${selectedFinPersonId === person.id ? 'text-violet-500' : 'text-light-text dark:text-white'}`}>
                                            {person.name}
                                          </span>
                                          {selectedFinPersonId === person.id && <Check size={14} className="text-violet-500" />}
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-medium">{person.cnpjcpf || 'Sem documento'}</span>
                                      </button>
                                    ))}
                                  {finPeople.filter(p => p.name.toLowerCase().includes(finSearchQuery.toLowerCase())).length === 0 && (
                                    <div className="p-8 text-center text-slate-500 text-sm italic">
                                      Nenhuma pessoa encontrada
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {selectedFinPersonId && (
                            <button
                              type="button"
                              onClick={() => setSelectedFinPersonId(null)}
                              className="px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all flex items-center justify-center gap-2 border border-rose-500/20"
                              title="Desvincular"
                            >
                              <Unlink size={18} />
                              <span className="text-xs font-bold uppercase tracking-widest">Desvincular</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {!selectedFinPersonId ? (
                      <div className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-col items-center gap-3 text-center">
                        <AlertCircle className="text-amber-500" size={32} />
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          Vincule este cliente ao financeiro para visualizar os dados abaixo
                        </p>
                      </div>
                    ) : isFetchingMovements ? (
                      <div className="py-20 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                        <p className="text-slate-500 text-sm font-medium">Carregando dados financeiros...</p>
                      </div>
                    ) : (
                      <>
                        {/* Seção 2 - Resumo Financeiro */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Fee Mensal Atual</p>
                            <p className="text-xl font-bold text-light-text dark:text-white">
                              {(() => {
                                const lastMovement = finMovements.find(m => m.status === 'Conciliado' || m.status === 'Pendente');
                                return lastMovement ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(lastMovement.movement_value)) : 'R$ 0,00';
                              })()}
                            </p>
                          </div>
                          <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status do Mês</p>
                            {(() => {
                              const currentMonth = new Date().toISOString().slice(0, 7);
                              const monthMovement = finMovements.find(m => (m.movement_date || m.expiration_date)?.startsWith(currentMonth));
                              if (!monthMovement) return <p className="text-sm font-bold text-slate-400">Sem lançamento</p>;
                              if (monthMovement.status === 'Conciliado') return <p className="text-sm font-bold text-emerald-500">Em dia ✓</p>;
                              if (monthMovement.status === 'Atrasado') {
                                const diff = Math.floor((new Date().getTime() - new Date(monthMovement.expiration_date).getTime()) / (1000 * 60 * 60 * 24));
                                return <p className="text-sm font-bold text-rose-500">Atrasado {diff} dias</p>;
                              }
                              return <p className="text-sm font-bold text-amber-500">Pendente</p>;
                            })()}
                          </div>
                        </div>

                        {/* Seção 3 - Histórico de Pagamentos */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-violet-500" />
                            <h3 className="text-sm font-bold text-light-text dark:text-white uppercase tracking-widest">Histórico de Pagamentos</h3>
                          </div>
                          <div className="bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-100/50 dark:bg-white/5">
                                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mês</th>
                                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valor</th>
                                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Pagamento</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                                {finMovements.slice(0, 6).map((m, idx) => (
                                  <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                                    <td className="px-4 py-3 text-xs font-bold text-light-text dark:text-white">
                                      {new Date(m.expiration_date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(m.movement_value))}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest ${
                                        m.status === 'Conciliado' ? 'bg-emerald-500/10 text-emerald-500' :
                                        m.status === 'Atrasado' ? 'bg-rose-500/10 text-rose-500' :
                                        'bg-amber-500/10 text-amber-500'
                                      }`}>
                                        {m.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                                      {m.movement_date ? new Date(m.movement_date).toLocaleDateString('pt-BR') : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Seção 4 - Histórico de Comentários */}
                        <div className="space-y-4 pt-6 mt-6 border-t border-slate-200 dark:border-white/10">
                          <div className="flex items-center gap-2">
                            <MessageSquare size={16} className="text-violet-500" />
                            <h3 className="text-sm font-bold text-light-text dark:text-white uppercase tracking-widest">Histórico de Comentários</h3>
                          </div>
                          {editingClient && <CrmCommentHistory clientId={editingClient.id} />}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Modal>
  );
};

export default ClientModal;
