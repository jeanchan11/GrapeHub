import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, UserPlus, CheckCircle2, AlertCircle, Link as LinkIcon, 
  ChevronDown, Search, Check, Unlink, FileText, MessageSquare,
  ShieldAlert, AlertTriangle, Calendar, Clock, User, Edit2,
  CreditCard, Briefcase, Package, Layout,
  Gavel, Scale, HeartPulse, ShieldCheck, Hammer, Landmark,
  Banknote, ShoppingCart, Home, Stethoscope, Building2,
  Globe, Activity, DollarSign, ArrowLeft
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
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  billingMethod?: string;
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
  linked_client_name: string | null;
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
  const [activeTab, setActiveTab] = useState<'client' | 'finance' | 'churn' | 'projeto'>('client');
  const [finSubTab, setFinSubTab] = useState<'cadastro' | 'assinatura'>('cadastro');
  const finSearchRef = React.useRef<HTMLDivElement>(null);
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
    finSubscriptionId: '',
    billingName: '',
    billingEmail: '',
    billingPhone: '',
    billingMethod: ''
  });

  // Finance state
  const [finPeople, setFinPeople] = useState<FinPerson[]>([]);
  const [selectedFinPersonId, setSelectedFinPersonId] = useState<string | null>(null);
  const [localFinPeopleGuid, setLocalFinPeopleGuid] = useState<string | null>(null);
  const [finMovements, setFinMovements] = useState<FinMovement[]>([]);
  const [isFetchingMovements, setIsFetchingMovements] = useState(false);
  
  // Fin people search
  const [finPeopleSearch, setFinPeopleSearch] = useState('');
  const [isFinPeopleDropOpen, setIsFinPeopleDropOpen] = useState(false);
  const [isSavingFinPerson, setIsSavingFinPerson] = useState(false);

  // Subscription state — single dropdown for all subscriptions
  const [allSubscriptions, setAllSubscriptions] = useState<(FinSubscription & { customer_name?: string; customer_cnpjcpf?: string; grapehub_client_id?: string })[]>([]);
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [isSubDropdownOpen, setIsSubDropdownOpen] = useState(false);
  const [isFetchingSubs, setIsFetchingSubs] = useState(false);

  // Project state
  const [projectData, setProjectData] = useState<any>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [selectedProductView, setSelectedProductView] = useState<any>(null);

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
        finSubscriptionId: editingClient.finSubscriptionId || '',
        billingName: editingClient.billingName || '',
        billingEmail: editingClient.billingEmail || '',
        billingPhone: editingClient.billingPhone || '',
        billingMethod: editingClient.billingMethod || ''
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
        finSubscriptionId: '',
        billingName: '',
        billingEmail: '',
        billingPhone: '',
        billingMethod: ''
      });
    }
    setActiveTab('client');
    setFinSubTab('cadastro');
    setChurnData(null);
    setIsEditing(!editingClient);
    setIsEditingChurn(false);
    // Reset local fin_people link from the current client
    setLocalFinPeopleGuid(editingClient?.finPeopleGuid || null);
    setSelectedFinPersonId(null);
    setProjectData(null);
    setSelectedProductView(null);
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
    if (finPeople.length > 0) {
      if (localFinPeopleGuid) {
        const linked = finPeople.find(p => p.guid === localFinPeopleGuid);
        setSelectedFinPersonId(linked ? String(linked.id) : null);
      } else if (editingClient && !localFinPeopleGuid) {
        // Fallback: search by grapehub_client_id for backward compat
        const linked = finPeople.find(p => p.grapehub_client_id === editingClient.id);
        setSelectedFinPersonId(linked ? String(linked.id) : null);
      } else {
        setSelectedFinPersonId(null);
      }
    }
  }, [finPeople, localFinPeopleGuid]);

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

  // Fetch project data when switching to projeto tab
  useEffect(() => {
    if (isOpen && activeTab === 'projeto' && editingClient) {
      const fetchProject = async () => {
        setIsLoadingProject(true);
        try {
          const res = await fetch('/api/projects');
          if (res.ok) {
            const allProjects = await res.json();
            const linked = allProjects.find((p: any) => p.activeClientId === editingClient.id);
            setProjectData(linked || null);
          }
        } catch (err) {
          console.error('Failed to fetch project:', err);
        } finally {
          setIsLoadingProject(false);
        }
      };
      fetchProject();
    }
  }, [isOpen, activeTab, editingClient]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (editingClient) {
        // Step 1: Update core fields via PATCH
        const corePayload: Record<string, any> = {
          name: formData.name,
          start_date: formData.startDate,
          location: formData.location,
          squad: formData.squad,
          tags: formData.tags,
          email: formData.email,
          phone: formData.phone,
          product: formData.product,
        };

        const response = await fetch(`/api/clients/${editingClient.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corePayload)
        });

        if (response.ok) {
          // Step 2: Try to save billing fields (may fail if DB columns don't exist yet)
          try {
            const billingPayload: Record<string, any> = {};
            if (formData.billingName !== undefined) billingPayload.billing_name = formData.billingName;
            if (formData.billingEmail !== undefined) billingPayload.billing_email = formData.billingEmail;
            if (formData.billingPhone !== undefined) billingPayload.billing_phone = formData.billingPhone;
            if (formData.billingMethod !== undefined) billingPayload.billing_method = formData.billingMethod;

            if (Object.keys(billingPayload).length > 0) {
              await fetch(`/api/clients/${editingClient.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(billingPayload)
              });
            }
          } catch (billingErr) {
            console.warn('Billing fields not saved (DB columns may not exist yet):', billingErr);
          }

          onSaveSuccess();
          onClose();
        } else {
          const errorText = await response.text();
          console.error('Failed to save client:', errorText);
        }
      } else {
        // Create new client via POST
        const clientData = {
          id: Math.random().toString(36).substr(2, 9),
          name: formData.name,
          startDate: formData.startDate,
          location: formData.location,
          squad: formData.squad,
          tags: formData.tags,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          crmStatus: formData.crmStatus,
          product: formData.product,
          finSubscriptionId: formData.finSubscriptionId,
          contracts: '[]',
          createdAt: new Date().toISOString()
        };
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([clientData])
        });
        if (response.ok) {
          onSaveSuccess();
          onClose();
        }
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
      onSaveSuccess();
    } catch (err) {
      console.error("Failed to save subscription link:", err);
    }
  };

  const saveFinPerson = async (personId: string | null) => {
    if (!editingClient) return;
    setIsSavingFinPerson(true);
    try {
      // Resolve the actual guid (UUID) from the numeric id
      const person = personId ? finPeople.find(p => String(p.id) === String(personId)) : null;
      const guidToSave = person?.guid || null;

      // Update local guid state immediately (prevents useEffect from restoring old link)
      setLocalFinPeopleGuid(guidToSave);

      // Save link on the client side (allows multiple clients per fin_people)
      await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fin_people_guid: guidToSave })
      });

      // Refresh fin_people list and update state
      const fpRes = await fetch('/api/fin-people');
      if (fpRes.ok) {
        const fpData = await fpRes.json();
        setFinPeople(fpData);
        setSelectedFinPersonId(personId);
      }
      setIsFinPeopleDropOpen(false);
      setFinPeopleSearch('');
      onSaveSuccess();
    } catch (err) {
      console.error('Failed to link fin person:', err);
    } finally {
      setIsSavingFinPerson(false);
    }
  };

  const squads = ['Able', 'Baker', 'Charlie', 'Delta'];

  const productIcons: { name: string; icon: any }[] = [
    { name: 'Gavel', icon: Gavel },
    { name: 'Scale', icon: Scale },
    { name: 'HeartPulse', icon: HeartPulse },
    { name: 'ShieldCheck', icon: ShieldCheck },
    { name: 'Hammer', icon: Hammer },
    { name: 'Landmark', icon: Landmark },
    { name: 'Banknote', icon: Banknote },
    { name: 'ShoppingCart', icon: ShoppingCart },
    { name: 'Home', icon: Home },
    { name: 'Stethoscope', icon: Stethoscope },
    { name: 'Building2', icon: Building2 },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'Layout', icon: Layout },
  ];

  const getProductIcon = (iconName?: string) => {
    const iconObj = productIcons.find(i => i.name === iconName);
    const IconComponent = iconObj ? iconObj.icon : Layout;
    return <IconComponent size={18} />;
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={() => { setIsEditing(false); onClose(); }}
      title={editingClient ? (isEditing ? 'Editar Cliente' : editingClient.name) : 'Novo Cliente'}
      icon={<UserPlus size={24} />}
      maxWidth="max-w-5xl"
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
          {editingClient && (
            <button 
              onClick={() => setActiveTab('projeto')}
              className={`px-8 py-4 text-sm font-bold transition-all ${activeTab === 'projeto' ? 'modal-tab-active' : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Projeto
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

              <div className="pt-6 border-t border-slate-200 dark:border-white/10">
                <h4 className="text-sm font-bold text-light-text dark:text-white mb-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-violet-500" /> Informações de Cobrança
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className={designSystem.input.label}>Nome de Cobrança</label>
                    <input 
                      type="text"
                      value={formData.billingName}
                      onChange={(e) => setFormData({ ...formData, billingName: e.target.value })}
                      placeholder="Ex: Financeiro Empresa"
                      className={designSystem.input.field}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={designSystem.input.label}>Meio de Cobrança</label>
                    <select 
                      value={formData.billingMethod}
                      onChange={(e) => setFormData({ ...formData, billingMethod: e.target.value })}
                      className={designSystem.input.field}
                    >
                      <option value="" className="bg-light-sidebar dark:bg-dark-sidebar">Selecionar...</option>
                      <option value="Whatsapp" className="bg-light-sidebar dark:bg-dark-sidebar">Whatsapp</option>
                      <option value="E-mail" className="bg-light-sidebar dark:bg-dark-sidebar">E-mail</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className={designSystem.input.label}>Email de Cobrança</label>
                    <input 
                      type="email"
                      value={formData.billingEmail}
                      onChange={(e) => setFormData({ ...formData, billingEmail: e.target.value })}
                      placeholder="financeiro@empresa.com"
                      className={designSystem.input.field}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={designSystem.input.label}>Whatsapp de Cobrança</label>
                    <input 
                      type="text"
                      value={formData.billingPhone}
                      onChange={(e) => setFormData({ ...formData, billingPhone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className={designSystem.input.field}
                    />
                  </div>
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

              <div className="pt-6 border-t border-slate-200 dark:border-white/10">
                <h4 className="text-sm font-bold text-light-text dark:text-white mb-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-violet-500" /> Informações de Cobrança
                </h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nome</p>
                    <p className="text-sm text-light-text dark:text-white">{formData.billingName || '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Meio de Cobrança</p>
                    <p className="text-sm font-medium text-light-text dark:text-white">{formData.billingMethod || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email</p>
                    <p className="text-sm text-light-text dark:text-white">{formData.billingEmail || '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Whatsapp</p>
                    <p className="text-sm text-light-text dark:text-white">{formData.billingPhone || '-'}</p>
                  </div>
                </div>
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
            <div className="space-y-4">
              {/* Sub-tabs */}
              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
                <button
                  onClick={() => setFinSubTab('cadastro')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    finSubTab === 'cadastro'
                      ? 'bg-white dark:bg-white/10 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Cadastro
                </button>
                <button
                  onClick={() => setFinSubTab('assinatura')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    finSubTab === 'assinatura'
                      ? 'bg-white dark:bg-white/10 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Assinatura
                </button>
              </div>

              {/* ── CADASTRO sub-tab ── */}
              {finSubTab === 'cadastro' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <LinkIcon size={16} className="text-violet-500" />
                    <h3 className="text-sm font-bold text-light-text dark:text-white uppercase tracking-widest">Cadastro Financeiro</h3>
                  </div>
                  <p className="text-[11px] text-slate-500">Vincule o cadastro do cliente no sistema financeiro (Asaas).</p>

                  {/* Current linked person */}
                  {selectedFinPersonId ? (() => {
                    const person = finPeople.find(p => String(p.id) === String(selectedFinPersonId));
                    return (
                      <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                        <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-light-text dark:text-white truncate">{person?.name || 'Cadastro vinculado'}</p>
                          <p className="text-[10px] text-slate-500">{person?.cnpjcpf || person?.asaas_id || ''}</p>
                        </div>
                        <button
                          onClick={() => saveFinPerson(null)}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-rose-500/20 transition-all"
                        >
                          <Unlink size={13} /> Desvincular
                        </button>
                      </div>
                    );
                  })() : (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                      <AlertCircle size={18} className="text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-600 dark:text-amber-400">Nenhum cadastro financeiro vinculado.</p>
                    </div>
                  )}

                  {/* Search & link */}
                  <div className="relative">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Buscar e vincular cadastro</label>
                    <div className="relative" ref={finSearchRef}>
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        value={finPeopleSearch}
                        onChange={e => { setFinPeopleSearch(e.target.value); setIsFinPeopleDropOpen(true); }}
                        onFocus={() => setIsFinPeopleDropOpen(true)}
                        placeholder="Buscar por nome ou CNPJ/CPF..."
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-light-text dark:text-white placeholder:text-slate-400 outline-none focus:border-violet-500/50 transition-all"
                      />
                    </div>
                    {isFinPeopleDropOpen && finPeopleSearch.length > 0 && (() => {
                      const rect = finSearchRef.current?.getBoundingClientRect();
                      return (
                        <>
                          <div className="fixed inset-0 z-[200]" onClick={() => setIsFinPeopleDropOpen(false)} />
                          <div
                            className="fixed z-[201] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl max-h-[260px] overflow-y-auto"
                            style={rect ? { top: rect.bottom + 4, left: rect.left, width: rect.width } : {}}
                          >
                            {finPeople
                              .filter(p =>
                                (p.name || '').toLowerCase().includes(finPeopleSearch.toLowerCase()) ||
                                (p.cnpjcpf || '').includes(finPeopleSearch)
                              )
                              .slice(0, 20)
                              .map(person => (
                                <button
                                  key={person.id}
                                  type="button"
                                  onClick={() => { saveFinPerson(person.id); setIsFinPeopleDropOpen(false); }}
                                  disabled={isSavingFinPerson}
                                  className={`w-full text-left px-4 py-3 hover:bg-violet-500/5 transition-colors flex items-center justify-between gap-2 ${
                                    selectedFinPersonId === person.id ? 'bg-violet-500/10' : ''
                                  }`}
                                >
                                  <div>
                                    <p className="text-sm font-bold text-light-text dark:text-white">{person.name}</p>
                                    <p className="text-[10px] text-slate-500">{person.cnpjcpf || person.asaas_id || '-'}</p>
                                  </div>
                                  {selectedFinPersonId === person.id && <Check size={14} className="text-violet-500 shrink-0" />}
                                  {person.grapehub_client_id && person.grapehub_client_id !== editingClient?.id && (
                                    <span
                                      title={person.linked_client_name || 'Outro cliente'}
                                      className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-bold max-w-[120px] truncate cursor-help"
                                    >
                                      📎 {person.linked_client_name
                                        ? person.linked_client_name.split(' ').slice(0, 3).join(' ')
                                        : 'Compartilhado'}
                                    </span>
                                  )}
                                </button>
                              ))}
                            {finPeople.filter(p =>
                              (p.name || '').toLowerCase().includes(finPeopleSearch.toLowerCase()) ||
                              (p.cnpjcpf || '').includes(finPeopleSearch)
                            ).length === 0 && (
                              <p className="text-sm text-slate-500 text-center py-4">Nenhum cadastro encontrado</p>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ── ASSINATURA sub-tab ── */}
              {finSubTab === 'assinatura' && (
                    <div className="space-y-6">

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
          {activeTab === 'projeto' && (
            <div className="space-y-6">
              {isLoadingProject ? (
                <div className="py-20 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                  <p className="text-slate-500 text-sm font-medium">Carregando projeto...</p>
                </div>
              ) : !projectData ? (
                <div className="p-8 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center gap-3 text-center">
                  <Briefcase className="text-slate-400" size={32} />
                  <p className="text-sm font-medium text-slate-500">
                    Nenhum projeto vinculado a este cliente.
                  </p>
                </div>
              ) : (
                <>
                  {/* Project Info Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                      <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold ${
                        projectData.status === 'Rodando' ? 'bg-emerald-500/10 text-emerald-500' :
                        projectData.status === 'Gargalo' ? 'bg-rose-500/10 text-rose-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>{projectData.status || '-'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Resultado</p>
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-bold ${
                        (projectData.projectResult || '').includes('BOM') ? 'bg-emerald-500/10 text-emerald-500' :
                        (projectData.projectResult || '').includes('OK') ? 'bg-blue-500/10 text-blue-500' :
                        (projectData.projectResult || '').includes('RUIM') ? 'bg-rose-500/10 text-rose-500' :
                        'bg-slate-500/10 text-slate-500'
                      }`}>{projectData.projectResult || '-'}</span>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Investimento</p>
                      <p className="text-sm font-bold text-light-text dark:text-white">R$ {projectData.investment || '0'}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Última Atualização</p>
                      <p className="text-xs font-bold text-light-text dark:text-white">{projectData.lastUpdate || '-'}</p>
                    </div>
                  </div>

                  {/* Products */}
                  {projectData.products && projectData.products.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-violet-500" />
                        <h3 className="text-sm font-bold text-light-text dark:text-white uppercase tracking-widest">Produtos ({projectData.products.length})</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {projectData.products.map((prod: any) => (
                          <div key={prod.id} onClick={() => setSelectedProductView(prod)} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center gap-3 cursor-pointer hover:border-violet-500/30 hover:bg-violet-500/5 transition-all">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-violet-500 ${
                              prod.status === 'Rodando' ? 'bg-emerald-500/10' :
                              prod.status === 'Inativo' ? 'bg-slate-500/10' : 'bg-amber-500/10'
                            }`}>
                              {getProductIcon(prod.icon)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-light-text dark:text-white truncate">{prod.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                                  prod.status === 'Rodando' ? 'bg-emerald-500/10 text-emerald-500' :
                                  prod.status === 'Inativo' ? 'bg-slate-500/10 text-slate-400' :
                                  'bg-amber-500/10 text-amber-500'
                                }`}>{prod.status || '-'}</span>
                                {prod.platform && (
                                  <span className={`text-[9px] font-bold ${
                                    prod.platform?.includes('Meta') ? 'text-blue-500' :
                                    prod.platform?.includes('Google') ? 'text-amber-500' :
                                    prod.platform?.includes('Tiktok') ? 'text-purple-500' :
                                    prod.platform?.includes('Linkedin') ? 'text-sky-400' : 'text-slate-400'
                                  }`}>{prod.platform}</span>
                                )}
                              </div>
                            </div>
                            <p className="text-xs font-bold text-emerald-500 whitespace-nowrap">R$ {prod.budget || '0'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline - Histórico Consolidado (same design as ProjectsModule) */}
                  {(() => {
                    const allOpts = (projectData.products || []).flatMap((p: any) =>
                      (p.optimizations || []).map((o: any) => ({ ...o, productName: p.name }))
                    ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
                    if (allOpts.length === 0) return null;
                    return (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Histórico Consolidado</h4>
                        <div className="relative max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                          <div className="relative space-y-12 py-4">
                            {/* Vertical Line */}
                            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10 -translate-x-1/2" />

                            {allOpts.map((opt: any, idx: number) => (
                              <div key={idx} className="relative flex items-center justify-center">
                                {/* Timeline Clock */}
                                <div className="absolute left-1/2 -translate-x-1/2 z-10">
                                  <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1625]">
                                    <div className="w-full h-full rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center shadow-sm">
                                      <Clock size={16} className="text-violet-500" />
                                    </div>
                                  </div>
                                </div>

                                {/* Card */}
                                <div className={`w-[40%] p-5 rounded-2xl border transition-all bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-violet-500/20 ${idx % 2 === 0 ? 'mr-auto text-left' : 'ml-auto text-left'}`}>
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      {opt.authorPhoto ? (
                                        <img src={opt.authorPhoto} alt={opt.author} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-500 text-xs font-bold">
                                          {(opt.author || 'U').charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                                        {opt.author}
                                      </p>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-medium">{opt.date} {opt.time && `às ${opt.time}`}</p>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">{opt.productName}</p>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase whitespace-nowrap ${
                                      opt.status === 'Mudança de Status' 
                                        ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30' 
                                        : 'text-violet-700 bg-violet-100 dark:bg-violet-900/30'
                                    }`}>{opt.status === 'Mudança de Status' ? 'STATUS' : 'MÉTRICAS'}</span>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                    {opt.message}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>

      {/* Product Detail Popup - overlay on top of ClientModal */}
      <AnimatePresence>
        {selectedProductView && (
          <div className="fixed inset-0 z-[1100] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductView(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl modal-container overflow-hidden mb-10 transition-colors duration-300"
            >
              {/* Header */}
              <div className="p-8 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-600/20 rounded-xl">
                      <div className="text-violet-600">
                        {getProductIcon(selectedProductView.icon)}
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedProductView.name}</h2>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 ${
                      selectedProductView.status === 'Rodando' ? 'bg-emerald-500/20 text-emerald-500' :
                      selectedProductView.status === 'Pausado' ? 'bg-amber-500/20 text-amber-500' :
                      selectedProductView.status === 'Inativo' ? 'bg-slate-500/20 text-slate-400' :
                      'bg-rose-500/20 text-rose-500'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        selectedProductView.status === 'Rodando' ? 'bg-emerald-500' :
                        selectedProductView.status === 'Pausado' ? 'bg-amber-500' :
                        selectedProductView.status === 'Inativo' ? 'bg-slate-400' : 'bg-rose-500'
                      }`} />
                      {selectedProductView.status}
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedProductView(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Resultado do Produto */}
                {selectedProductView.projectResult && (
                  <div className="flex items-center gap-3 mt-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Resultado:</p>
                    <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold ${
                      (selectedProductView.projectResult || '').includes('BOM') ? 'bg-emerald-500/10 text-emerald-500' :
                      (selectedProductView.projectResult || '').includes('OK') ? 'bg-blue-500/10 text-blue-500' :
                      (selectedProductView.projectResult || '').includes('RUIM') ? 'bg-rose-500/10 text-rose-500' :
                      'bg-slate-500/10 text-slate-500'
                    }`}>{selectedProductView.projectResult}</span>
                  </div>
                )}

                {/* Metrics Grid */}
                <div className="mt-8 grid grid-cols-3 gap-4">
                  {[
                    { label: 'Investimento Mensal', value: selectedProductView.budget, icon: DollarSign },
                    { label: 'Plataforma', value: selectedProductView.platform, icon: Globe },
                    { label: 'Dias de Veiculação', value: selectedProductView.delivery, icon: Calendar },
                    { label: 'IA de Atendimento', value: selectedProductView.aiService, icon: MessageSquare, keyword: selectedProductView.aiKeyword },
                    { label: 'Forma de Pagamento', value: selectedProductView.paymentMethod, icon: CreditCard },
                    ...(selectedProductView.paymentMethod === 'Boleto/pix' ? [{ label: 'Saldo Atual', value: selectedProductView.balance, icon: DollarSign }] : []),
                  ].map((m: any, i: number) => (
                    <div key={i} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-violet-500/20 transition-all">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <m.icon size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{m.label}</span>
                      </div>
                      <p className={`text-sm font-bold ${
                        m.label === 'Plataforma' ? (
                          (m.value || '').includes('Meta') ? 'text-blue-500' :
                          (m.value || '').includes('Google') ? 'text-amber-500' :
                          (m.value || '').includes('Tiktok') ? 'text-purple-500' :
                          (m.value || '').includes('Linkedin') ? 'text-sky-400' : 'text-slate-400'
                        ) : 'text-light-text dark:text-white'
                      }`}>{m.value || '-'}</p>
                      {m.keyword && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Palavra-chave</span>
                          <p className="text-xs font-medium text-violet-500 mt-0.5">{m.keyword}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Optimization History */}
              <div className="p-8 overflow-y-visible">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <Activity size={20} className="text-violet-500" />
                    <h3 className="text-lg font-bold text-light-text dark:text-white">Histórico de Otimizações</h3>
                  </div>
                </div>
                {selectedProductView.optimizations && selectedProductView.optimizations.length > 0 ? (
                  <div className="relative max-h-[900px] overflow-y-auto custom-scrollbar pr-2">
                    <div className="relative space-y-12 py-4">
                      {/* Vertical Line */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10 -translate-x-1/2" />

                      {[...selectedProductView.optimizations]
                        .sort((a: any, b: any) => {
                          const dateA = new Date(a.date.split('/').reverse().join('-') + 'T' + (a.time || '00:00'));
                          const dateB = new Date(b.date.split('/').reverse().join('-') + 'T' + (b.time || '00:00'));
                          return dateB.getTime() - dateA.getTime();
                        })
                        .map((opt: any, idx: number) => (
                        <div key={idx} className="relative flex items-center justify-center">
                          {/* Timeline Dot */}
                          <div className="absolute left-1/2 -translate-x-1/2 z-10">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1625]">
                              <div className="w-full h-full rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center shadow-sm">
                                <Clock size={16} className="text-violet-500" />
                              </div>
                            </div>
                          </div>

                          {/* Card */}
                          <div className={`w-[40%] p-5 rounded-2xl border transition-all bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-violet-500/20 ${idx % 2 === 0 ? 'mr-auto text-left' : 'ml-auto text-left'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {opt.authorPhoto ? (
                                  <img src={opt.authorPhoto} alt={opt.author} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-500 text-xs font-bold">
                                    {(opt.author || 'U').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                  {opt.author}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {opt.status && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    opt.status === 'Mudança de Status' 
                                      ? 'bg-emerald-500/10 text-emerald-500' 
                                      : 'bg-violet-500/10 text-violet-500'
                                  }`}>
                                    {opt.status === 'Mudança de Status' ? 'STATUS' : 'MÉTRICAS'}
                                  </span>
                                )}
                                <p className="text-[10px] text-slate-500 font-medium">{opt.date} {opt.time && `às ${opt.time}`}</p>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                              {opt.message}
                            </p>
                            {opt.images && opt.images.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {opt.images.map((img: string, i: number) => (
                                  <img key={i} src={img} alt="Nota" className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" referrerPolicy="no-referrer" />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic text-center py-8">Nenhum histórico de otimizações disponível.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ClientModal;
