import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Save, Copy, Check, Info, Target, TrendingUp, BrainCircuit, MessageSquare, Users, Briefcase, FileText, X, Download, ClipboardList } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import SplitHeadline from '../components/SplitHeadline';
import { toast } from '@/src/lib/toast';

import PdiTab from './collaborator_tabs/PdiTab';
import FeedbacksTab from './collaborator_tabs/FeedbacksTab';
import OneOnOnesTab from './collaborator_tabs/OneOnOnesTab';
import DesempenhoTab from './collaborator_tabs/DesempenhoTab';
import GeralTab from './collaborator_tabs/GeralTab';

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

export default function CollaboratorProfile({ id, fromMinhaEquipe = false }: { id: string, fromMinhaEquipe?: boolean }) {
  const [collab, setCollab] = useState<Collaborator | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('geral');
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Collaborator>>({});
  const [copiedPix, setCopiedPix] = useState(false);
  const [previewFile, setPreviewFile] = useState<{name: string, url: string} | null>(null);

  const { user, userData } = useAuth();
  const isAdmin = userData?.role === 'superadmin' || userData?.role === 'diretor-operacional' || userData?.role === 'gerente-operacional';
  const isSelf = user?.uid === collab?.linked_user_id || userData?.email === collab?.linked_user_email;

  useEffect(() => {
    // Read aba from URL if exists
    const urlParams = new URLSearchParams(window.location.search);
    const aba = urlParams.get('aba');
    if (aba) setActiveTab(aba);

    loadCollaborator();
  }, [id]);

  useEffect(() => {
    // If we came from minha-equipe and trying to view informacoes, fallback to geral immediately
    if (fromMinhaEquipe && activeTab === 'informacoes') {
      setActiveTab('geral');
      return;
    }
    // If not admin and trying to view informacoes, fallback to geral (requires userData)
    if (!isAdmin && activeTab === 'informacoes' && userData) {
      setActiveTab('geral');
    }
  }, [isAdmin, activeTab, userData, fromMinhaEquipe]);

  const loadCollaborator = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collaborators/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCollab(data);
        setFormData(data);
      } else {
        window.location.hash = '#/colaboradores';
      }
    } catch (e) {
      console.error(e);
      window.location.hash = '#/colaboradores';
    } finally {
      setLoading(false);
    }
  };

  const setTabAndUrl = (tab: string) => {
    setActiveTab(tab);
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('aba', tab);
    window.history.replaceState(null, '', currentUrl.toString());
  };

  const handleSave = async () => {
    if (!formData.name) return toast.error('Nome é obrigatório');
    try {
      const res = await fetch(`/api/collaborators/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const data = await res.json();
        setCollab(data);
        setIsEditMode(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[75vh] w-full"><LoadingSpinner size="lg" /></div>;
  if (!collab) return null;

  const tabs = [
    { id: 'geral', label: 'Visão Geral', icon: Info },
    { id: 'desempenho', label: 'Desempenho', icon: TrendingUp },
    { id: '1-1s', label: '1:1s', icon: Users },
    { id: 'metas', label: 'Metas', icon: Target },
    { id: 'feedbacks', label: 'Feedbacks', icon: MessageSquare },
    { id: 'pdi', label: 'PDI', icon: BrainCircuit },
    ...(isAdmin && !fromMinhaEquipe ? [{ id: 'informacoes', label: 'Informações', icon: ClipboardList }] : []),
  ];

  return (
    <div className="min-h-full bg-light-bg dark:bg-dark-bg text-slate-900 dark:text-slate-100 font-sans p-8 overflow-y-auto w-full">
      {/* Header / Breadcrumb */}
      <div className="mb-8">
        <button 
          onClick={() => window.location.hash = fromMinhaEquipe ? '#/minha-equipe' : '#/colaboradores'}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-sm font-semibold mb-4"
        >
          <ChevronLeft size={16} /> {fromMinhaEquipe ? 'Voltar para Minha Equipe' : 'Voltar para Colaboradores'}
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl shrink-0 overflow-hidden bg-violet-500/20 text-violet-400">
              {collab.linked_picture ? (
                <img src={collab.linked_picture} alt={collab.name} className="w-full h-full object-cover" />
              ) : (
                collab.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{collab.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">{collab.role || 'Sem Cargo'}</span>
                {collab.seniority_level && (
                  <span className="text-xs bg-violet-500/10 text-violet-500 dark:text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full font-semibold">
                    {collab.seniority_level}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  collab.status === 'Efetivado' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                  collab.status === 'Desligamento' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 
                  'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}>
                  {collab.status}
                </span>
              </div>
            </div>
          </div>
          {!fromMinhaEquipe && (
            <div>
              {isEditMode ? (
                <button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                  <Save size={16} /> Salvar Alterações
                </button>
              ) : (
                <button onClick={() => setIsEditMode(true)} className="bg-slate-200 dark:bg-white/[0.05] hover:bg-slate-300 dark:hover:bg-white/10 text-slate-700 dark:text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                  Editar Perfil
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto mb-6 pb-2 scrollbar-hide border-b border-slate-200 dark:border-white/10">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTabAndUrl(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-bold transition-all border-b-2 ${
                isActive 
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-white dark:bg-dark-card' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-dark-card rounded-b-2xl rounded-tr-2xl border border-slate-200 dark:border-white/10 shadow-sm p-6 min-h-[400px] overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.18 }}
            className="flex-1 flex flex-col"
          >
            {/* Visão Geral */}
            {activeTab === 'geral' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <SplitHeadline text="Visão " highlight="Geral" className="text-xl font-black text-slate-800 dark:text-white" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    Resumo e Gráficos do Colaborador
                  </p>
                </div>
                <GeralTab 
                  collaboratorId={id} 
                  isAdmin={isAdmin} 
                  isSelf={isSelf} 
                  collaboratorEmail={collab.linked_user_email} 
                />
              </div>
            )}

        {/* Informações */}
        {activeTab === 'informacoes' && isAdmin && !fromMinhaEquipe && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <SplitHeadline text="Informações " highlight="Básicas" className="text-xl font-black text-slate-800 dark:text-white" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Dados pessoais e contratuais
              </p>
            </div>

            {/* Informações Básicas */}
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50/50 dark:bg-dark-bg p-5 rounded-2xl border border-slate-100 dark:border-white/10">
                
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Nome Completo</label>
                  {isEditMode ? (
                    <input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" />
                  ) : (
                    <div className="text-sm font-medium text-slate-800 dark:text-white">{collab.name}</div>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Grupo</label>
                  {isEditMode ? (
                    <input value={formData.group_name || ''} onChange={e => setFormData({...formData, group_name: e.target.value})} className="w-full bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" />
                  ) : (
                    <div className="text-sm font-medium text-slate-800 dark:text-white">{collab.group_name || '-'}</div>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Cargo</label>
                  {isEditMode ? (
                    <input value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" />
                  ) : (
                    <div className="text-sm font-medium text-slate-800 dark:text-white">{collab.role || '-'}</div>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Chave PIX</label>
                  {isEditMode ? (
                    <input value={formData.pix_key || ''} onChange={e => setFormData({...formData, pix_key: e.target.value})} className="w-full bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" />
                  ) : (
                    collab.pix_key ? (
                      <div
                        onClick={() => {
                          navigator.clipboard.writeText(collab.pix_key || '').then(() => {
                            setCopiedPix(true);
                            setTimeout(() => setCopiedPix(false), 2000);
                          });
                        }}
                        className="group/pix relative flex items-start gap-2 bg-white dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 hover:border-violet-500/30 rounded-xl p-2.5 cursor-pointer transition-all"
                      >
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 break-all flex-1 pr-6">{collab.pix_key}</span>
                        {copiedPix ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Copy className="w-4 h-4 text-slate-400 shrink-0" />}
                      </div>
                    ) : <div className="text-sm font-medium text-slate-400">-</div>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Remuneração</label>
                  {isEditMode ? (
                    <input value={formData.remuneration || ''} onChange={e => setFormData({...formData, remuneration: e.target.value})} className="w-full bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" />
                  ) : (
                    <div className="text-sm font-medium text-slate-800 dark:text-white">{collab.remuneration || '-'}</div>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Vale Transporte</label>
                  {isEditMode ? (
                    <input value={formData.transport_voucher || ''} onChange={e => setFormData({...formData, transport_voucher: e.target.value})} className="w-full bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" />
                  ) : (
                    <div className="text-sm font-medium text-slate-800 dark:text-white">{collab.transport_voucher || '-'}</div>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Data Nasc.</label>
                  {isEditMode ? (
                    <input type="date" value={formData.birth_date || ''} onChange={e => setFormData({...formData, birth_date: e.target.value})} className="w-full bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-white focus:outline-none focus:border-violet-500" />
                  ) : (
                    <div className="text-sm font-medium text-slate-800 dark:text-white">{collab.birth_date || '-'}</div>
                  )}
                </div>

              </div>
            </div>

            {/* Form Data Seção */}
            {collab.form_data && Object.keys(collab.form_data).length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Briefcase size={18} className="text-violet-500" /> Informações do Formulário
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-dark-bg p-5 rounded-2xl border border-slate-100 dark:border-white/10">
                  {Object.entries(collab.form_data).map(([key, value]) => {
                    const excludedFields = ['Concordo com os termos acima', 'Nome Completo', 'Declaração de Veracidade', 'Data Atual'];
                    if (excludedFields.includes(key)) return null;

                    let filePreview: {name: string, url: string} | null = null;
                    if (typeof value === 'object' && value !== null) {
                      if ('name' in value && 'url' in value) {
                        filePreview = { name: (value as any).name, url: (value as any).url };
                      } else if ('data' in value && typeof (value as any).data === 'string') {
                        const dataStr = (value as any).data;
                        const isPdf = dataStr.startsWith('JVBER');
                        const mime = isPdf ? 'application/pdf' : 'image/jpeg';
                        const ext = isPdf ? '.pdf' : '.jpg';
                        filePreview = { name: `${key}${ext}`, url: `data:${mime};base64,${dataStr}` };
                      }
                    } else if (typeof value === 'string' && value.trim().startsWith('{')) {
                      try {
                        const parsed = JSON.parse(value);
                        if (parsed && typeof parsed === 'object' && 'data' in parsed && typeof parsed.data === 'string') {
                          const isPdf = parsed.data.startsWith('JVBER');
                          const mime = isPdf ? 'application/pdf' : 'image/jpeg';
                          const ext = isPdf ? '.pdf' : '.jpg';
                          filePreview = { name: `${key}${ext}`, url: `data:${mime};base64,${parsed.data}` };
                        } else if (parsed && typeof parsed === 'object' && 'name' in parsed && 'url' in parsed) {
                          filePreview = { name: parsed.name, url: parsed.url };
                        }
                      } catch (e) {}
                    }

                    return (
                      <div key={key} className="bg-white dark:bg-dark-bg p-3.5 rounded-xl border border-slate-100 dark:border-white/5">
                        <label className="text-xs font-bold text-slate-400 mb-1.5 block leading-tight">{key}</label>
                        <div className="text-sm font-medium text-slate-800 dark:text-white whitespace-pre-wrap break-all">
                          {filePreview ? (
                            <button
                              onClick={() => setPreviewFile(filePreview)}
                              className="bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/20 px-3 py-2 rounded-xl flex items-center gap-2 transition-all w-fit"
                            >
                              <FileText size={16} />
                              <span className="font-semibold truncate max-w-[200px]">{filePreview.name}</span>
                            </button>
                          ) : typeof value === 'object' && value !== null ? (
                            JSON.stringify(value)
                          ) : (
                            String(value)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}



        {/* New Tabs Rendering */}
        {activeTab === 'pdi' && <PdiTab collaboratorId={id} isAdmin={isAdmin} />}
        {activeTab === 'feedbacks' && <FeedbacksTab collaboratorId={id} isAdmin={isAdmin} isSelf={isSelf} />}
        {activeTab === '1-1s' && <OneOnOnesTab collaboratorId={id} isAdmin={isAdmin} />}
        {activeTab === 'desempenho' && <DesempenhoTab collaboratorId={id} isAdmin={isAdmin} />}

            {/* Empty States for other unbuilt tabs */}
            {['metas'].includes(activeTab) && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <SplitHeadline text="Metas & " highlight="Objetivos" className="text-xl font-black text-slate-800 dark:text-white" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    Acompanhamento de OKRs
                  </p>
                </div>
                <div className="flex flex-col justify-center items-center h-64 text-slate-500 dark:text-slate-400">
                  <Target size={48} className="mb-4 opacity-50" />
                  <h3 className="text-xl font-bold mb-2">Aba em Desenvolvimento</h3>
                  <p className="text-sm max-w-md text-center">
                    Esta seção do perfil do colaborador ({activeTab}) ainda será implementada nas próximas fases.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-dark-bg w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="text-violet-500 shrink-0" size={24} />
                <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate">{previewFile.name}</h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a 
                  href={previewFile.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500 dark:text-slate-400 transition-colors"
                  title="Baixar ou abrir em nova aba"
                >
                  <Download size={20} />
                </a>
                <button 
                  onClick={() => setPreviewFile(null)}
                  className="p-2 hover:bg-rose-500/10 rounded-xl text-slate-500 hover:text-rose-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-[#151221] overflow-hidden relative min-h-[50vh]">
              {previewFile.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
                </div>
              ) : (
                <iframe 
                  src={previewFile.url} 
                  title={previewFile.name}
                  className="w-full h-full absolute inset-0 border-none"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
