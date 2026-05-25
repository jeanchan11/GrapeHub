import React, { useState, useEffect } from 'react';
import { Plus, Search, GripVertical, ChevronDown, ChevronRight, Edit, Trash2, CheckCircle2, Copy, Check, Settings, X, Link } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import Organograma from '../components/Organograma';

interface Collaborator {
  id: number;
  name: string;
  group_name: string | null;
  role: string | null;
  seniority_level: string | null;
  pix_key: string | null;
  remuneration: string | null;
  transport_voucher: string | null;
  benefits: string | null;
  birth_date: string | null;
  start_date: string | null;
  end_date: string | null;
  level_junior: boolean;
  level_pleno: boolean;
  level_senior: boolean;
  leadership_role: boolean;
  ai_role: boolean;
  status: string;
  form_data: any;
  linked_user_id?: string | null;
  linked_picture?: string | null;
  linked_user_name?: string | null;
  linked_user_email?: string | null;
}

interface SystemUser {
  id: string;
  name: string;
  email: string;
  picture?: string | null;
}

interface CollaboratorSetting {
  id: number;
  type: 'group' | 'role' | 'seniority';
  name: string;
  color: string;
}

const DEFAULT_STATUSES = ['Efetivado', 'Desligamento', 'Turnover'];

export default function ColaboradoresPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'Efetivado': true
  });
  const [mainTab, setMainTab] = useState<'dados' | 'organograma'>('dados');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [modalTab, setModalTab] = useState<'geral' | 'formulario' | 'comentarios'>('geral');
  const [editingItem, setEditingItem] = useState<Collaborator | null>(null);
  const [formData, setFormData] = useState<Partial<Collaborator>>({});

  const [copyToast, setCopyToast] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const copyFormLink = () => {
    const url = `${window.location.origin}/?onboarding=colaborador`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2500);
    });
  };

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settings, setSettings] = useState<CollaboratorSetting[]>([]);
  const [newSettingName, setNewSettingName] = useState('');
  const [newSettingType, setNewSettingType] = useState<'group' | 'role' | 'seniority'>('group');
  const [newSettingColor, setNewSettingColor] = useState('#8b5cf6');

  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const loadCollaborators = async () => {
    try {
      const res = await fetch('/api/collaborators');
      if (res.ok) {
        setCollaborators(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/collaborator-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSystemUsers = async () => {
    try {
      const res = await fetch('/api/system-users');
      if (res.ok) setSystemUsers(await res.json());
    } catch (e) { console.error(e); }
  };

  const addSetting = async () => {
    if (!newSettingName.trim()) return;
    try {
      const response = await fetch('/api/collaborator-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newSettingType, name: newSettingName.trim(), color: newSettingColor })
      });
      if (response.ok) {
        setNewSettingName('');
        fetchSettings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSetting = async (id: number) => {
    try {
      const response = await fetch(`/api/collaborator-settings/${id}`, { method: 'DELETE' });
      if (response.ok) fetchSettings();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCollaborators();
    fetchSettings();
    fetchSystemUsers();
  }, []);

  const toggleGroup = (status: string) => {
    setExpandedGroups(prev => ({ ...prev, [status]: !prev[status] }));
  };

  const openAddModal = (status = 'Efetivado') => {
    setEditingItem(null);
    setFormData({ status, name: '', group_name: '', role: '' });
    setModalTab('geral');
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const openEditModal = (collab: Collaborator) => {
    setEditingItem(collab);
    setFormData({ ...collab });
    setModalTab('geral');
    setIsEditMode(false);
    setUserSearch('');
    setShowUserDropdown(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return alert('Nome é obrigatório');
    
    try {
      const isEdit = !!editingItem;
      const url = isEdit ? `/api/collaborators/${editingItem.id}` : '/api/collaborators';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        await loadCollaborators();
        setIsModalOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir colaborador?')) return;
    try {
      const res = await fetch(`/api/collaborators/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCollaborators(prev => prev.filter(c => c.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const grouped = collaborators.reduce((acc, curr) => {
    const s = curr.status || 'Outros';
    if (!acc[s]) acc[s] = [];
    acc[s].push(curr);
    return acc;
  }, {} as Record<string, Collaborator[]>);

  // Ensure default statuses exist in grouped
  DEFAULT_STATUSES.forEach(s => {
    if (!grouped[s]) grouped[s] = [];
  });

  const statuses = Object.keys(grouped).sort((a, b) => {
    const idxA = DEFAULT_STATUSES.indexOf(a);
    const idxB = DEFAULT_STATUSES.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const filtered = (list: Collaborator[]) => list.filter(c => 
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.group_name && c.group_name.toLowerCase().includes(search.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'efetivado': return 'bg-emerald-500';
      case 'desligamento': return 'bg-rose-500';
      case 'turnover': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-light-bg dark:bg-dark-bg p-6 font-sans">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            Colaboradores <span className="text-violet-500">Grape</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Gestão centralizada do time Grape Mídia</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Buscar colaborador..."
              className="bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors w-64"
            />
          </div>
          <button onClick={copyFormLink} title="Copiar link do formulário" className="relative bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-violet-500 dark:hover:text-violet-400 w-10 h-10 rounded-xl flex items-center justify-center transition-colors">
            <Link size={18} />
            {copyToast && (
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg animate-bounce">
                Link copiado!
              </span>
            )}
          </button>
          <button onClick={() => setIsSettingsModalOpen(true)} className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 w-10 h-10 rounded-xl flex items-center justify-center transition-colors">
            <Settings size={18} />
          </button>
          <button onClick={() => openAddModal()} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
            <Plus size={16} /> Novo Colaborador
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-white/10 pb-px">
        <button
          onClick={() => setMainTab('dados')}
          className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${
            mainTab === 'dados' 
              ? 'border-violet-500 text-violet-600 dark:text-violet-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Dados
        </button>
        <button
          onClick={() => setMainTab('organograma')}
          className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${
            mainTab === 'organograma' 
              ? 'border-violet-500 text-violet-600 dark:text-violet-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Organograma
        </button>
      </div>

      {mainTab === 'dados' ? (
        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            {statuses.map(status => {
              const list = filtered(grouped[status]);
              const isExpanded = expandedGroups[status] !== false;
              
              // Only show empty default statuses if there's no search
              if (list.length === 0 && search) return null;

              return (
                <div key={status} className="mb-6 bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                  {/* Group Header */}
                  <div 
                    className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-white/[0.02] cursor-pointer border-b border-slate-100 dark:border-white/5 select-none"
                    onClick={() => toggleGroup(status)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {isExpanded ? <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" /> : <ChevronRight size={16} className="text-slate-400 dark:text-slate-500" />}
                      <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status)}`} />
                      <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">{status}</h2>
                      <span className="text-xs text-slate-500 ml-2">{list.length}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); openAddModal(status); }}
                      className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Table */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-white/5 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                            <th className="py-2.5 px-4 font-semibold w-[250px]">Nome</th>
                            <th className="py-2.5 px-4 font-semibold w-[150px]">Grupo</th>
                            <th className="py-2.5 px-4 font-semibold w-[150px]">Cargo</th>
                            <th className="py-2.5 px-4 font-semibold w-[120px]">Senioridade</th>
                            <th className="py-2.5 px-4 font-semibold w-[150px]">Data Aniversário</th>
                            <th className="py-2.5 px-4 w-[60px]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.length === 0 ? (
                            <tr>
                              <td colSpan={15} className="py-4 text-center text-sm text-slate-500">Nenhum colaborador nesta lista.</td>
                            </tr>
                          ) : (
                            list.map((c) => (
                              <tr key={c.id} onClick={() => openEditModal(c)} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer group transition-colors">
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center gap-2">
                                    <GripVertical size={14} className="text-slate-400 dark:text-slate-600 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
                                    <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                                      {c.linked_picture
                                        ? <img src={c.linked_picture} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        : c.name.charAt(0).toUpperCase()
                                      }
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap overflow-hidden text-ellipsis">{c.name}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-4">
                                  {(() => {
                                    const s = settings.find(set => set.type === 'group' && set.name === c.group_name);
                                    if (s) return <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${s.color}20`, color: s.color }}>{c.group_name}</span>;
                                    return <span className="text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">{c.group_name || '-'}</span>;
                                  })()}
                                </td>
                                <td className="py-2.5 px-4 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                  {(() => {
                                    const s = settings.find(set => set.type === 'role' && set.name === c.role);
                                    if (s) return <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${s.color}20`, color: s.color }}>{c.role}</span>;
                                    return c.role || '-';
                                  })()}
                                </td>
                                <td className="py-2.5 px-4">
                                  {(() => {
                                    const s = settings.find(set => set.type === 'seniority' && set.name === c.seniority_level);
                                    if (s) return <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${s.color}20`, color: s.color }}>{c.seniority_level}</span>;
                                    return <span className="text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">{c.seniority_level || '-'}</span>;
                                  })()}
                                </td>
                                <td className="py-2.5 px-4 text-xs text-slate-600 dark:text-slate-400">{c.birth_date || '-'}</td>
                                
                                <td className="py-2.5 px-4" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEditModal(c)} className="w-6 h-6 rounded hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"><Edit size={12} /></button>
                                    <button onClick={() => handleDelete(c.id)} className="w-6 h-6 rounded hover:bg-rose-500/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"><Trash2 size={12} /></button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Organograma collaborators={collaborators.filter(c => c.status === 'Efetivado')} settings={settings} />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{editingItem ? 'Detalhes do Colaborador' : 'Novo Colaborador'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"><Plus size={20} className="rotate-45" /></button>
            </div>

            <div className="flex border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.01]">
              <button 
                onClick={() => setModalTab('geral')} 
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${modalTab === 'geral' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'}`}
              >
                Geral
              </button>
              <button 
                onClick={() => setModalTab('formulario')} 
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${modalTab === 'formulario' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'}`}
              >
                Informações do Formulário
              </button>
              <button 
                onClick={() => setModalTab('comentarios')} 
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${modalTab === 'comentarios' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'}`}
              >
                Comentários
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col">
              {modalTab === 'geral' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Nome</label>
                    {isEditMode ? (
                      <input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" />
                    ) : (
                      <div className="text-sm font-medium text-slate-800 dark:text-white">{formData.name || '-'}</div>
                    )}
                  </div>
              
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Status</label>
                    {isEditMode ? (
                      <select value={formData.status || 'Efetivado'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 appearance-none">
                        <option value="Efetivado" className="text-slate-800 dark:text-white bg-white dark:bg-dark-card">Efetivado</option>
                        <option value="Desligamento" className="text-slate-800 dark:text-white bg-white dark:bg-dark-card">Desligamento</option>
                        <option value="Turnover" className="text-slate-800 dark:text-white bg-white dark:bg-dark-card">Turnover</option>
                      </select>
                    ) : (
                      <div className="text-sm font-medium text-slate-800 dark:text-white">{formData.status || '-'}</div>
                    )}
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Grupo</label>
                    {isEditMode ? (
                      <select value={formData.group_name || ''} onChange={e => setFormData({...formData, group_name: e.target.value})} className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 appearance-none">
                        <option value="" className="text-slate-800 dark:text-white bg-white dark:bg-dark-card">Selecione...</option>
                        {settings.filter(s => s.type === 'group').map(s => (
                          <option key={s.id} value={s.name} className="text-slate-800 dark:text-white bg-white dark:bg-dark-card">{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm font-medium text-slate-800 dark:text-white">{formData.group_name || '-'}</div>
                    )}
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Cargo</label>
                    {isEditMode ? (
                      <select value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 appearance-none">
                        <option value="" className="text-slate-800 dark:text-white bg-white dark:bg-dark-card">Selecione...</option>
                        {settings.filter(s => s.type === 'role').map(s => (
                          <option key={s.id} value={s.name} className="text-slate-800 dark:text-white bg-white dark:bg-dark-card">{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm font-medium text-slate-800 dark:text-white">{formData.role || '-'}</div>
                    )}
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Chave PIX</label>
                    {isEditMode ? (
                      <input value={formData.pix_key || ''} onChange={e => setFormData({...formData, pix_key: e.target.value})} className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" />
                    ) : (
                      formData.pix_key ? (
                        <div 
                          onClick={() => {
                            navigator.clipboard.writeText(formData.pix_key || '').then(() => {
                              setCopiedPix(true);
                              setTimeout(() => setCopiedPix(false), 2000);
                            });
                          }}
                          className="group/pix relative flex items-start gap-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 hover:border-violet-500/30 dark:hover:border-violet-500/30 rounded-xl p-2.5 cursor-pointer transition-all active:scale-[0.98] overflow-hidden"
                          title="Clique para copiar a chave PIX"
                        >
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 break-all flex-1 pr-6 select-all">
                            {formData.pix_key}
                          </span>
                          <button 
                            type="button" 
                            className="absolute right-2 top-2.5 text-slate-400 hover:text-violet-500 dark:text-slate-500 dark:hover:text-violet-400 transition-colors shrink-0"
                          >
                            {copiedPix ? (
                              <Check className="w-4 h-4 text-emerald-500 animate-scale-up" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-slate-400 dark:text-slate-500">-</div>
                      )
                    )}
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Remuneração</label>
                    {isEditMode ? (
                      <input value={formData.remuneration || ''} onChange={e => setFormData({...formData, remuneration: e.target.value})} className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" placeholder="Ex: R$ 3.000,00" />
                    ) : (
                      <div className="text-sm font-medium text-slate-800 dark:text-white">{formData.remuneration || '-'}</div>
                    )}
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Vale Transporte</label>
                    {isEditMode ? (
                      <input value={formData.transport_voucher || ''} onChange={e => setFormData({...formData, transport_voucher: e.target.value})} className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" />
                    ) : (
                      <div className="text-sm font-medium text-slate-800 dark:text-white">{formData.transport_voucher || '-'}</div>
                    )}
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Data Nasc.</label>
                    {isEditMode ? (
                      <input type="date" value={formData.birth_date || ''} onChange={e => setFormData({...formData, birth_date: e.target.value})} className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-violet-500" />
                    ) : (
                      <div className="text-sm font-medium text-slate-800 dark:text-white">{formData.birth_date || '-'}</div>
                    )}
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Dia de Início</label>
                    {isEditMode ? (
                      <input type="date" value={formData.start_date || ''} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-violet-500" />
                    ) : (
                      <div className="text-sm font-medium text-slate-800 dark:text-white">{formData.start_date || '-'}</div>
                    )}
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Data de Saída</label>
                    {isEditMode ? (
                      <input type="date" value={formData.end_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-violet-500" />
                    ) : (
                      <div className="text-sm font-medium text-slate-800 dark:text-white">{formData.end_date || '-'}</div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Benefícios</label>
                    {isEditMode ? (
                      <textarea value={formData.benefits || ''} onChange={e => setFormData({...formData, benefits: e.target.value})} className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 resize-none h-20" />
                    ) : (
                      <div className="text-sm font-medium text-slate-800 dark:text-white whitespace-pre-wrap">{formData.benefits || '-'}</div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-3 block">Senioridade</label>
                    {isEditMode ? (
                      <select value={formData.seniority_level || ''} onChange={e => setFormData({...formData, seniority_level: e.target.value})} className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 appearance-none">
                        <option value="" className="text-slate-800 dark:text-white bg-white dark:bg-dark-card">Selecione a senioridade...</option>
                        {settings.filter(s => s.type === 'seniority').map(s => (
                          <option key={s.id} value={s.name} className="text-slate-800 dark:text-white bg-white dark:bg-dark-card">{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm font-medium text-slate-800 dark:text-white">{formData.seniority_level || '-'}</div>
                    )}
                  </div>
                  {/* Usuário Vinculado */}
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Usuário Vinculado</label>
                    {isEditMode ? (
                      <div className="relative">
                        {formData.linked_user_id ? (
                          // Vinculado — mostrar card com desvincular
                          <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/30 rounded-xl px-3 py-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-violet-500/20">
                              {formData.linked_picture
                                ? <img src={formData.linked_picture} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                                : <div className="w-full h-full flex items-center justify-center text-violet-600 text-xs font-bold">{(formData.linked_user_name || '?')[0]}</div>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-800 dark:text-white truncate">{formData.linked_user_name}</div>
                              <div className="text-xs text-slate-500 truncate">{formData.linked_user_email}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, linked_user_id: null, linked_picture: null, linked_user_name: null, linked_user_email: null})}
                              className="text-slate-400 hover:text-rose-500 transition-colors"
                              title="Desvincular"
                            ><X size={16} /></button>
                          </div>
                        ) : (
                          // Busca de usuário
                          <div>
                            <input
                              value={userSearch}
                              onChange={e => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                              onFocus={() => setShowUserDropdown(true)}
                              placeholder="Buscar usuário do sistema..."
                              className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500"
                            />
                            {showUserDropdown && (
                              <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                {systemUsers
                                  .filter(u => !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()))
                                  .map(u => (
                                    <button
                                      key={u.id}
                                      type="button"
                                      onMouseDown={() => {
                                        setFormData({...formData, linked_user_id: u.id, linked_picture: u.picture || null, linked_user_name: u.name, linked_user_email: u.email});
                                        setUserSearch('');
                                        setShowUserDropdown(false);
                                      }}
                                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-violet-500/10 transition-colors text-left"
                                    >
                                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-violet-500/20">
                                        {u.picture
                                          ? <img src={u.picture} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                                          : <div className="w-full h-full flex items-center justify-center text-violet-600 text-xs font-bold">{(u.name || '?')[0]}</div>
                                        }
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-slate-800 dark:text-white truncate">{u.name}</div>
                                        <div className="text-xs text-slate-500 truncate">{u.email}</div>
                                      </div>
                                    </button>
                                  ))
                                }
                                {systemUsers.filter(u => !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())).length === 0 && (
                                  <div className="px-3 py-3 text-sm text-slate-500 text-center">Nenhum usuário encontrado.</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      formData.linked_user_id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-violet-500/20">
                            {formData.linked_picture
                              ? <img src={formData.linked_picture} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                              : <div className="w-full h-full flex items-center justify-center text-violet-600 text-xs font-bold">{(formData.linked_user_name || '?')[0]}</div>
                            }
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-800 dark:text-white">{formData.linked_user_name}</div>
                            <div className="text-xs text-slate-500">{formData.linked_user_email}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400">Nenhum usuário vinculado</div>
                      )
                    )}
                  </div>

                </div>
              )}

              {modalTab === 'formulario' && (
                <div className="flex-1">
                  {!formData.form_data || Object.keys(formData.form_data).length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm py-10">
                      Nenhuma informação de formulário cadastrada.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(formData.form_data).map(([key, val]: [string, any]) => {
                        // Tratar chaves de arquivo
                        if (val && typeof val === 'object' && val.name && val.data) {
                          return (
                            <div key={key} className="border border-slate-200 dark:border-white/10 rounded-xl p-4 bg-slate-50 dark:bg-white/[0.02]">
                              <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                                {key.replace(/_/g, ' ')}
                              </p>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{val.name}</span>
                                <button 
                                  onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = `data:${val.type || 'application/octet-stream'};base64,${val.data}`;
                                    a.download = val.name;
                                    a.click();
                                  }}
                                  className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                  Baixar
                                </button>
                              </div>
                            </div>
                          );
                        }
                        
                        // Campos de texto simples
                        return (
                          <div key={key}>
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">
                              {key.replace(/_/g, ' ')}
                            </p>
                            {isEditMode ? (
                              <input 
                                value={val || ''} 
                                onChange={e => setFormData({
                                  ...formData, 
                                  form_data: { ...formData.form_data, [key]: e.target.value }
                                })}
                                className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500"
                              />
                            ) : (
                              <div className="text-sm font-medium text-slate-800 dark:text-white whitespace-pre-wrap">
                                {String(val || '-')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              
              {modalTab === 'comentarios' && (
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                    Comentários / Observações do Colaborador
                  </label>
                  {isEditMode ? (
                    <textarea 
                      value={formData.form_data?.comments || ''} 
                      onChange={e => setFormData({
                        ...formData,
                        form_data: { ...(formData.form_data || {}), comments: e.target.value }
                      })}
                      placeholder="Adicione observações, notas de feedback ou comentários importantes sobre o colaborador..."
                      className="w-full flex-1 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 placeholder-slate-500 resize-none min-h-[200px]"
                    />
                  ) : (
                    <div className="flex-1 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl p-4 min-h-[200px] overflow-y-auto">
                      {formData.form_data?.comments ? (
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {formData.form_data.comments}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-500 italic">
                          Nenhum comentário adicionado ainda. Clique em "Editar" para adicionar uma observação.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-5 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 bg-slate-50 dark:bg-white/[0.02]">
              {isEditMode ? (
                <>
                  <button onClick={() => {
                    if (editingItem) {
                      setFormData(editingItem);
                      setIsEditMode(false);
                    } else {
                      setIsModalOpen(false);
                    }
                  }} className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">Cancelar</button>
                  <button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-xl text-sm font-bold transition-colors">Salvar</button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">Fechar</button>
                  <button onClick={() => setIsEditMode(true)} className="bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white px-6 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 border border-slate-200 dark:border-transparent">
                    <Edit size={16} /> Editar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configurações */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
                  <Settings size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">Configurações</h2>
                  <p className="text-xs text-slate-400">Gerencie Grupos, Cargos e Senioridade</p>
                </div>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex gap-2 mb-6 items-center">
                <select value={newSettingType} onChange={e => setNewSettingType(e.target.value as any)} className="bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 appearance-none w-32">
                  <option value="group">Grupo</option>
                  <option value="role">Cargo</option>
                  <option value="seniority">Senioridade</option>
                </select>
                <input value={newSettingName} onChange={e => setNewSettingName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSetting()} placeholder="Novo item..." className="flex-1 bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" />
                <label className="relative w-10 h-10 flex-shrink-0 cursor-pointer" title="Selecionar cor">
                  <span className="block w-10 h-10 rounded-lg border-2 border-white/20 shadow-lg" style={{ backgroundColor: newSettingColor }} />
                  <input type="color" value={newSettingColor} onChange={e => setNewSettingColor(e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                </label>
                <button onClick={addSetting} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors h-10 flex items-center justify-center">
                  <Plus size={18} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 border-b border-slate-200 dark:border-white/10 pb-2">Grupos</h3>
                  <div className="flex flex-wrap gap-2">
                    {settings.filter(s => s.type === 'group').map(s => (
                      <span key={s.id} className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2" style={{ backgroundColor: `${s.color || '#8b5cf6'}20`, color: s.color || '#8b5cf6' }}>
                        {s.name}
                        <button onClick={() => deleteSetting(s.id)} className="opacity-60 hover:opacity-100 transition-opacity"><X size={14}/></button>
                      </span>
                    ))}
                    {settings.filter(s => s.type === 'group').length === 0 && <span className="text-xs text-slate-500">Nenhum cadastrado.</span>}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 border-b border-slate-200 dark:border-white/10 pb-2">Cargos</h3>
                  <div className="flex flex-wrap gap-2">
                    {settings.filter(s => s.type === 'role').map(s => (
                      <span key={s.id} className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2" style={{ backgroundColor: `${s.color || '#8b5cf6'}20`, color: s.color || '#8b5cf6' }}>
                        {s.name}
                        <button onClick={() => deleteSetting(s.id)} className="opacity-60 hover:opacity-100 transition-opacity"><X size={14}/></button>
                      </span>
                    ))}
                    {settings.filter(s => s.type === 'role').length === 0 && <span className="text-xs text-slate-500">Nenhum cadastrado.</span>}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 border-b border-slate-200 dark:border-white/10 pb-2">Senioridades</h3>
                  <div className="flex flex-wrap gap-2">
                    {settings.filter(s => s.type === 'seniority').map(s => (
                      <span key={s.id} className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2" style={{ backgroundColor: `${s.color || '#8b5cf6'}20`, color: s.color || '#8b5cf6' }}>
                        {s.name}
                        <button onClick={() => deleteSetting(s.id)} className="opacity-60 hover:opacity-100 transition-opacity"><X size={14}/></button>
                      </span>
                    ))}
                    {settings.filter(s => s.type === 'seniority').length === 0 && <span className="text-xs text-slate-500">Nenhum cadastrado.</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-white/10 flex justify-end bg-slate-50 dark:bg-white/[0.02]">
              <button onClick={() => setIsSettingsModalOpen(false)} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white rounded-xl text-sm font-bold transition-colors border border-slate-200 dark:border-transparent">Fechar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
