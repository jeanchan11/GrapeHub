import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, UserPlus, CheckCircle2, AlertCircle, Link as LinkIcon, 
  ChevronDown, Search, Check, Unlink, FileText, MessageSquare,
  ShieldAlert, AlertTriangle, Calendar, Clock, User, Edit2,
  CreditCard
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
  product?: string;
  contracts?: string;
  hasActiveSubscription?: boolean;
  subscriptionValue?: number;
  subscriptionNextDue?: string;
  subscriptionBillingType?: string;
  subscriptionCycle?: string;
  finPeopleGuid?: string;
  finSubscriptionId?: string;
}

interface FinPerson {
  id: string;
  guid: string;
  name: string;
  cnpjcpf: string;
  grapehub_client_id: string | null;
  asaas_id: string | null;
}

interface FinMovement {
  movement_date: string;
  expiration_date: string;
  movement_value: string;
  status: string;
  value?: string;
}

interface FinSubscription {
  id: string;
  customer_id: string;
  billing_type: string;
  value: number;
  next_due_date: string;
  status: string;
  cycle: string;
  description: string;
}

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingClient: Client | null;
  onSaveSuccess: () => void;
}

const ClientModal = ({ isOpen, onClose, editingClient, onSaveSuccess }: ClientModalProps) => {
  const [activeTab, setActiveTab] = useState<'client' | 'finance' | 'churn'>('client');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingChurn, setIsEditingChurn] = useState(false);
  const [churnData, setChurnData] = useState<any>(null);
  const [isLoadingChurn, setIsLoadingChurn] = useState(false);
  const [editChurnType, setEditChurnType] = useState('');
  const [editChurnReasons, setEditChurnReasons] = useState<string[]>([]);
  const [editChurnComment, setEditChurnComment] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    location: '',
    squad: 'Able',
    tags: '',
    email: '',
    phone: '',
    status: 'Ativo' as 'Ativo' | 'Inativo',
    crmStatus: '',
    product: '',
    finSubscriptionId: ''
  });

  // Finance state
  const [finPeople, setFinPeople] = useState<FinPerson[]>([]);
  const [selectedFinPersonId, setSelectedFinPersonId] = useState<string | null>(null);
  const [finMovements, setFinMovements] = useState<FinMovement[]>([]);
  const [isFetchingMovements, setIsFetchingMovements] = useState(false);
  
  // Subscription state — single dropdown for all subscriptions
  const [allSubscriptions, setAllSubscriptions] = useState<(FinSubscription & { customer_name?: string; customer_cnpjcpf?: string; grapehub_client_id?: string })[]>([]);
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false);
  const [isFetchingSubs, setIsFetchingSubs] = useState(false);

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
        crmStatus: editingClient.crmStatus || '',
        product: editingClient.product || '',
        finSubscriptionId: editingClient.finSubscriptionId || ''
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
        crmStatus: '',
        product: '',
        finSubscriptionId: ''
      });
    }
    setActiveTab('client');
    setChurnData(null);
    setIsEditing(!editingClient);
    setIsEditingChurn(false);
  }, [editingClient, isOpen]);

  // Fetch churn data when switching to churn tab
  useEffect(() => {
    if (isOpen && activeTab === 'churn' && editingClient && editingClient.status === 'Inativo') {
      const fetchChurnData = async () => {
        setIsLoadingChurn(true);
        try {
          const res = await fetch(`/api/churn/${encodeURIComponent(editingClient.name)}`);
          if (res.ok) {
            const data = await res.json();
            setChurnData(data);
          }
        } catch (err) {
          console.error('Failed to fetch churn data:', err);
        } finally {
          setIsLoadingChurn(false);
        }
      };
      fetchChurnData();
    }
  }, [isOpen, activeTab, editingClient]);

  // Fetch fin_people for resolving selectedFinPersonId
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

  // Fetch ALL subscriptions for the dropdown
  useEffect(() => {
    if (isOpen && activeTab === 'finance') {
      setIsFetchingSubs(true);
      fetch('/api/fin-subscriptions')
        .then(res => res.json())
        .then(setAllSubscriptions)
        .catch(err => console.error("Failed to fetch subscriptions:", err))
        .finally(() => setIsFetchingSubs(false));
    }
  }, [isOpen, activeTab]);

  // Fetch movements when fin_people is linked
  useEffect(() => {
    if (isOpen && activeTab === 'finance' && selectedFinPersonId) {
      const fetchMovements = async () => {
        setIsFetchingMovements(true);
        try {
          const response = await fetch(`/api/fin-people/${selectedFinPersonId}/movements`);
          if (response.ok) setFinMovements(await response.json());
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
      contracts: editingClient?.contracts || '[]',
      createdAt: editingClient?.createdAt || new Date().toISOString()
    };

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([clientData])
      });

      if (response.ok) {
        onSaveSuccess();
        onClose();
      }
    } catch (err) {
      console.error("Failed to save client:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const saveFinSubscription = async (subId: string | null) => {
    if (!editingClient) return;
    setFormData({ ...formData, finSubscriptionId: subId || '' });
    try {
      await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fin_subscription_id: subId })
      });
      // Refresh fin_people to get updated grapehub_client_id linkage
      const fpRes = await fetch('/api/fin-people');
      if (fpRes.ok) {
        const fpData = await fpRes.json();
        setFinPeople(fpData);
        const linked = fpData.find((p: FinPerson) => p.grapehub_client_id === editingClient.id);
        setSelectedFinPersonId(linked ? linked.id : null);
      }
      onSaveSuccess();
    } catch (err) {
      console.error("Failed to save subscription link:", err);
    }
  };

  const squads = ['Able', 'Baker', 'Charlie', 'Delta'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { setIsEditing(false); onClose(); }}
      title={editingClient ? (isEditing ? 'Editar Cliente' : editingClient.name) : 'Novo Cliente'}
      icon={<UserPlus size={24} />}
      maxWidth="max-w-2xl"
      footer={
        activeTab === 'client' && isEditing ? (
          <>
            <button 
              type="button"
              onClick={() => { if (editingClient) { setIsEditing(false); } else { onClose(); } }}
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
          {editingClient && editingClient.status === 'Inativo' && (
            <button 
              onClick={() => setActiveTab('churn')}
              className={`px-8 py-4 text-sm font-bold transition-all ${activeTab === 'churn' ? 'modal-tab-active' : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Motivo de Saída
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'client' && (
            isEditing ? (
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
                  <label className={designSystem.input.label}>Produto</label>
                  <select 
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    className={designSystem.input.field}
                  >
                    <option value="" className="bg-light-sidebar dark:bg-dark-sidebar">Selecionar...</option>
                    <option value="TCV" className="bg-light-sidebar dark:bg-dark-sidebar">TCV</option>
                    <option value="Recorrência Mensal" className="bg-light-sidebar dark:bg-dark-sidebar">Recorrência Mensal</option>
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
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nome do Cliente</p>
                  <p className="text-sm font-bold text-light-text dark:text-white">{formData.name || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data Inicial</p>
                  <p className="text-sm font-bold text-light-text dark:text-white">{formData.startDate ? new Date(formData.startDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Local do Escritório</p>
                <p className="text-sm font-bold text-light-text dark:text-white">{formData.location || '-'}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Squad</p>
                  <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold ${
                    formData.squad === 'Able' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                  }`}>{formData.squad}</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Produto</p>
                  {formData.product ? (
                    <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold ${
                      formData.product === 'TCV' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-violet-500/10 text-violet-500'
                    }`}>{formData.product}</span>
                  ) : (
                    <p className="text-sm text-slate-400 italic">Não definido</p>
                  )}
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tags</p>
                  <p className="text-sm text-light-text dark:text-white">{formData.tags || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email</p>
                  <p className="text-sm text-light-text dark:text-white">{formData.email || '-'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Telefone</p>
                  <p className="text-sm text-light-text dark:text-white">{formData.phone || '-'}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold ${
                  formData.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                }`}>{formData.status}</span>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-3 rounded-xl text-sm font-bold text-violet-500 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Edit2 size={14} /> Editar Cliente
              </button>
            </div>
            )
          )}
          {activeTab === 'finance' && (
                  <div className="space-y-8">
                    {/* Seção 1 - Vincular Assinatura */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-violet-500" />
                        <h3 className="text-sm font-bold text-light-text dark:text-white uppercase tracking-widest">Assinatura Financeira</h3>
                      </div>
                      
                      <div className={`space-y-2 relative ${isSubDropdownOpen ? 'pb-[320px]' : ''}`}>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Vincular a uma assinatura do Asaas</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <button type="button" onClick={() => setIsSubDropdownOpen(!isSubDropdownOpen)}
                              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-4 text-left flex items-center justify-between transition-all hover:border-violet-500/50">
                              {formData.finSubscriptionId ? (() => {
                                const sub = allSubscriptions.find(s => String(s.id) === formData.finSubscriptionId);
                                return (<div className="flex items-center gap-2">
                                  <span className="text-light-text dark:text-white font-medium">{sub?.customer_name || 'Assinatura'} — {sub ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.value) : ''}</span>
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold rounded-md uppercase tracking-widest">Vinculada ✓</span>
                                </div>);
                              })() : (<span className="text-slate-400">Selecionar assinatura...</span>)}
                              <ChevronDown size={18} className={`text-slate-400 transition-transform ${isSubDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isSubDropdownOpen && (
                              <div className="absolute z-[110] top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                                <div className="p-3 border-b border-slate-100 dark:border-white/5">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input autoFocus type="text" placeholder="Buscar por nome..." value={subSearchQuery} onChange={(e) => setSubSearchQuery(e.target.value)}
                                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-light-text dark:text-white outline-none focus:border-violet-500 transition-all" />
                                  </div>
                                </div>
                                <div className="max-h-[250px] overflow-y-auto p-1">
                                  <button type="button" onClick={() => { saveFinSubscription(null); setIsSubDropdownOpen(false); }}
                                    className={`w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all ${!formData.finSubscriptionId ? 'bg-violet-500/10' : ''}`}>
                                    <span className={`font-bold text-sm ${!formData.finSubscriptionId ? 'text-violet-500' : 'text-light-text dark:text-white'}`}>Sem assinatura vinculada</span>
                                  </button>
                                  {allSubscriptions
                                    .filter(s => (s.customer_name || '').toLowerCase().includes(subSearchQuery.toLowerCase()))
                                    .map(sub => (
                                      <button key={sub.id} type="button" onClick={() => { saveFinSubscription(sub.id); setIsSubDropdownOpen(false); }}
                                        className={`w-full text-left p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex flex-col gap-0.5 ${formData.finSubscriptionId === String(sub.id) ? 'bg-violet-500/10' : ''}`}>
                                        <div className="flex items-center justify-between">
                                          <span className={`font-bold text-sm ${formData.finSubscriptionId === String(sub.id) ? 'text-violet-500' : 'text-light-text dark:text-white'}`}>{sub.customer_name || 'Sem nome'}</span>
                                          {formData.finSubscriptionId === String(sub.id) && <Check size={14} className="text-violet-500" />}
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-medium">
                                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.value)} · {sub.cycle === 'MONTHLY' ? 'Mensal' : sub.cycle === 'YEARLY' ? 'Anual' : sub.cycle} · {sub.status === 'ACTIVE' ? '✅ Ativa' : '⏸ ' + sub.status}
                                        </span>
                                      </button>))}
                                </div>
                              </div>
                            )}
                          </div>
                          {formData.finSubscriptionId && (
                            <button type="button" onClick={() => saveFinSubscription(null)}
                              className="px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all flex items-center justify-center gap-2 border border-rose-500/20">
                              <Unlink size={18} /><span className="text-xs font-bold uppercase tracking-widest">Desvincular</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {!formData.finSubscriptionId ? (
                      <div className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-col items-center gap-3 text-center">
                        <AlertCircle className="text-amber-500" size={32} />
                        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          Vincule uma assinatura do Asaas para visualizar dados de pagamento
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
                                const sub = allSubscriptions.find(s => String(s.id) === formData.finSubscriptionId);
                                return sub ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.value) : 'R$ 0,00';
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
          {activeTab === 'churn' && (
                  <div className="space-y-6">
                    {isLoadingChurn ? (
                      <div className="py-20 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                        <p className="text-slate-500 text-sm font-medium">Carregando dados de churn...</p>
                      </div>
                    ) : !churnData ? (
                      <div className="p-8 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center gap-3 text-center">
                        <AlertCircle className="text-slate-400" size={32} />
                        <p className="text-sm font-medium text-slate-500">
                          Nenhum registro de churn encontrado para este cliente.
                        </p>
                      </div>
                    ) : (
                      <>
                        {!isEditingChurn ? (
                        <>
                        {/* View Mode */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Como foi</label>
                          <div>
                            {churnData['Evitavel - inevitavel'] === 'INEVITÁVEL' ? (
                              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white shadow-md shadow-rose-500/20">
                                <ShieldAlert size={14} /> INEVITÁVEL
                              </span>
                            ) : churnData['Evitavel - inevitavel'] === 'EVITÁVEL' ? (
                              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white shadow-md shadow-amber-500/20">
                                <AlertTriangle size={14} /> EVITÁVEL
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400 italic">Não informado</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Motivo de Saída</label>
                          <div className="flex flex-wrap gap-2">
                            {churnData['Motivo de saída'] ? (
                              churnData['Motivo de saída'].split(',').map((reason: string, idx: number) => {
                                const r = reason.trim();
                                const colorMap: Record<string, string> = {
                                  'Motivo Pessoal': 'bg-blue-500 text-white border-blue-500',
                                  'Falta de Relacionamento': 'bg-rose-500 text-white border-rose-500',
                                  'inadimplência': 'bg-orange-500 text-white border-orange-500',
                                  'Inadimplência': 'bg-orange-500 text-white border-orange-500',
                                  'Resultado Comercial': 'bg-red-600 text-white border-red-600',
                                  'Motivo Financeiro': 'bg-purple-500 text-white border-purple-500',
                                  'CRM e IA': 'bg-cyan-500 text-white border-cyan-500',
                                  'Outros': 'bg-slate-600 text-white border-slate-600',
                                  'Resultado Campanha': 'bg-red-600 text-white border-red-600',
                                };
                                const cls = colorMap[r] || 'bg-slate-500 text-white border-slate-500';
                                return (
                                  <span key={idx} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border ${cls}`}>
                                    {r}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-sm text-slate-400 italic">Nenhum motivo registrado</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Calendar size={12} className="text-violet-500" />
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data de Saída</p>
                            </div>
                            <p className="text-sm font-bold text-light-text dark:text-white">
                              {churnData.day_exit ? new Date(churnData.day_exit).toLocaleDateString('pt-BR') : '-'}
                            </p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Clock size={12} className="text-violet-500" />
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">LTV (dias)</p>
                            </div>
                            <p className="text-sm font-bold text-light-text dark:text-white">
                              {churnData.LTV ? `${churnData.LTV} dias` : '-'}
                            </p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <User size={12} className="text-violet-500" />
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestor</p>
                            </div>
                            <p className="text-sm font-bold text-light-text dark:text-white">
                              {churnData.gestor || '-'}
                            </p>
                          </div>
                          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Calendar size={12} className="text-violet-500" />
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data de Entrada</p>
                            </div>
                            <p className="text-sm font-bold text-light-text dark:text-white">
                              {churnData.day ? new Date(churnData.day).toLocaleDateString('pt-BR') : '-'}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <MessageSquare size={12} /> Comentários
                          </label>
                          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                            <p className="text-sm text-light-text dark:text-white whitespace-pre-wrap">
                              {churnData.comments || <span className="text-slate-400 italic">Sem comentários</span>}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setEditChurnType(churnData['Evitavel - inevitavel'] || '');
                            setEditChurnReasons(churnData['Motivo de saída'] ? churnData['Motivo de saída'].split(',').map((r: string) => r.trim()) : []);
                            setEditChurnComment(churnData.comments || '');
                            setIsEditingChurn(true);
                          }}
                          className="w-full py-3 rounded-xl text-sm font-bold text-violet-500 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 transition-all flex items-center justify-center gap-2"
                        >
                          <Edit2 size={14} /> Editar Motivo de Saída
                        </button>
                        </>
                        ) : (
                        <>
                        {/* Edit Mode */}
                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Tipo de Churn</label>
                          <div className="flex gap-3">
                            <button type="button" onClick={() => setEditChurnType('INEVITÁVEL')}
                              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                editChurnType === 'INEVITÁVEL' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                              }`}>
                              <ShieldAlert size={14} /> INEVITÁVEL
                            </button>
                            <button type="button" onClick={() => setEditChurnType('EVITÁVEL')}
                              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                editChurnType === 'EVITÁVEL' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                              }`}>
                              <AlertTriangle size={14} /> EVITÁVEL
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Motivos de Saída</label>
                          <div className="flex flex-wrap gap-2">
                            {['Motivo Pessoal','Falta de Relacionamento','Inadimplência','Resultado Comercial','Motivo Financeiro','CRM e IA','Outros'].map(reason => (
                              <button key={reason} type="button"
                                onClick={() => setEditChurnReasons(prev => prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason])}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                  editChurnReasons.includes(reason)
                                    ? 'bg-violet-500 text-white border-violet-500'
                                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10 hover:border-violet-500/50'
                                }`}>
                                {reason}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Comentários</label>
                          <textarea
                            value={editChurnComment}
                            onChange={(e) => setEditChurnComment(e.target.value)}
                            rows={3}
                            className={designSystem.input.field + ' resize-none'}
                            placeholder="Observações sobre o churn..."
                          />
                        </div>

                        <div className="flex gap-3">
                          <button onClick={() => setIsEditingChurn(false)}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                            Cancelar
                          </button>
                          <button onClick={async () => {
                            try {
                              await fetch(`/api/churn/${churnData.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ churn_type: editChurnType, exit_reasons: editChurnReasons, comments: editChurnComment })
                              });
                              setChurnData({ ...churnData, 'Evitavel - inevitavel': editChurnType, 'Motivo de saída': editChurnReasons.join(', '), comments: editChurnComment });
                              setIsEditingChurn(false);
                            } catch (err) { console.error(err); }
                          }}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/20 transition-all">
                            Salvar Alterações
                          </button>
                        </div>
                        </>
                        )}
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
