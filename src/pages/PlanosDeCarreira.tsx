import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Trash2, Loader2, Lock, X } from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';
import SplitHeadline from '../components/SplitHeadline';
import { useAuth } from '../contexts/AuthContext';

interface DocPage {
  id: string;
  page_id: string;
  title: string;
  content: string;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  allowed_users?: string[];
}

interface PlanosDeCarreiraProps {
  activePage?: string;
}

const apiCall = async (method: string, url: string, body?: any) => {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res;
};

export default function PlanosDeCarreira({ activePage = 'default' }: PlanosDeCarreiraProps) {
  const { user, userData } = useAuth();
  const [docPages, setDocPages] = useState<DocPage[]>([]);
  const [activeDocPageId, setActiveDocPageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [tempAllowedUsers, setTempAllowedUsers] = useState<string[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load users
  useEffect(() => {
    fetch('/api/system-users').then(res => res.json()).then(data => {
      if (Array.isArray(data)) setSystemUsers(data);
    }).catch(console.error);
  }, []);

  // Load doc pages
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const url = `/api/career-plans/docs?page_id=${activePage}&user_email=${encodeURIComponent(user?.email || '')}&user_role=${encodeURIComponent(userData?.role || '')}`;
        const res = await fetch(url);
        const data = res.ok ? await res.json() : [];
        setDocPages(data);
        if (data.length > 0) setActiveDocPageId(data[0].id);
      } catch (err) {
        console.error('[PlanosDeCarreira] Failed to load:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activePage, user, userData]);

  // Create new page
  const createPage = () => {
    const newId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const newPage: DocPage = {
      id: newId,
      page_id: activePage,
      title: 'Novo Plano de Carreira',
      content: '',
      sort_order: docPages.length,
      created_by: userData?.name || user?.email || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setDocPages(prev => [...prev, newPage]);
    setActiveDocPageId(newId);
    apiCall('POST', '/api/career-plans/docs', newPage);
  };

  // Delete page
  const deletePage = (pageId: string) => {
    if (!confirm('Excluir este plano de carreira?')) return;
    const newPages = docPages.filter(p => p.id !== pageId);
    setDocPages(newPages);
    if (activeDocPageId === pageId) {
      setActiveDocPageId(newPages.length > 0 ? newPages[0].id : null);
    }
    apiCall('DELETE', `/api/career-plans/docs/${pageId}`);
  };

  // Auto-save helper
  const autoSave = (pageId: string, updates: Partial<DocPage>) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      const page = docPages.find(p => p.id === pageId);
      if (page) {
        await apiCall('PUT', `/api/career-plans/docs/${pageId}`, {
          title: updates.title ?? page.title,
          content: updates.content ?? page.content,
        });
      }
      setSaving(false);
    }, 1000);
  };

  // Switch page (save current first)
  const switchPage = (pageId: string) => {
    if (activeDocPageId && activeDocPageId !== pageId) {
      const current = docPages.find(p => p.id === activeDocPageId);
      if (current) {
        apiCall('PUT', `/api/career-plans/docs/${activeDocPageId}`, {
          title: current.title,
          content: current.content,
        });
      }
    }
    setActiveDocPageId(pageId);
  };

  const activePage_ = docPages.find(p => p.id === activeDocPageId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-bg">
        <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4">
        <div>
          <SplitHeadline text="Planos de " highlight="Carreira" className="text-2xl font-black tracking-tight text-dark-text" />
          <p className="text-[10px] font-bold text-dark-text/30 uppercase tracking-widest mt-0.5">
            Documentação de cargos e benefícios
          </p>
        </div>
      </div>

      {/* Document editor */}
      <div className="px-6 md:px-8 pb-10">
        <div
          className="flex gap-0 bg-dark-card border border-white/[0.06] rounded-2xl overflow-hidden shadow-xl"
          style={{ minHeight: '70vh' }}
        >
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0 border-r border-white/[0.06] flex flex-col">
            <div className="px-4 py-4 border-b border-white/[0.06]">
              <p className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest">Planos</p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar py-2 px-2 space-y-0.5">
              {docPages.map(page => (
                <div
                  key={page.id}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${
                    activeDocPageId === page.id
                      ? 'bg-violet-600/15 text-violet-400'
                      : 'text-dark-text/60 hover:bg-white/[0.04] hover:text-dark-text'
                  }`}
                  onClick={() => switchPage(page.id)}
                >
                  <FileText size={13} className="flex-shrink-0 opacity-50" />
                  {editingTitle === page.id ? (
                    <input
                      autoFocus
                      value={titleInput}
                      onChange={e => setTitleInput(e.target.value)}
                      onBlur={() => {
                        if (titleInput.trim()) {
                          setDocPages(prev => prev.map(p => p.id === page.id ? { ...p, title: titleInput.trim() } : p));
                          apiCall('PUT', `/api/career-plans/docs/${page.id}`, { title: titleInput.trim(), content: page.content });
                        }
                        setEditingTitle(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingTitle(null);
                      }}
                      className="flex-1 min-w-0 bg-transparent text-xs font-medium text-dark-text outline-none border-b border-violet-500"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      className="flex-1 min-w-0 text-xs font-medium truncate"
                      onDoubleClick={e => {
                        e.stopPropagation();
                        setEditingTitle(page.id);
                        setTitleInput(page.title);
                      }}
                    >{page.title}</span>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      deletePage(page.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md text-dark-text/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div className="px-2 py-3 border-t border-white/[0.06]">
              <button
                onClick={createPage}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-dark-text/40 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
              >
                <Plus size={13} />
                Adicionar plano
              </button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {activePage_ ? (
              <>
                {/* Page Header */}
                <div className="px-8 pt-6 pb-4 border-b border-white/[0.06]">
                  <input
                    value={activePage_.title}
                    onChange={e => {
                      const newTitle = e.target.value;
                      setDocPages(prev => prev.map(p => p.id === activeDocPageId ? { ...p, title: newTitle } : p));
                      autoSave(activeDocPageId!, { title: newTitle });
                    }}
                    className="text-2xl font-black text-dark-text bg-transparent outline-none w-full placeholder:text-dark-text/20"
                    placeholder="Título do plano..."
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-dark-text/30">
                      {activePage_.created_by && <><span className="text-dark-text/50">{activePage_.created_by}</span> · </>}
                      Atualizado por último {new Date(activePage_.updated_at).toLocaleDateString('pt-BR')}
                      {activePage_.updated_at && ` at ${new Date(activePage_.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                    {(userData?.role === 'Admin' || userData?.name === activePage_.created_by || user?.email === activePage_.created_by) && (
                      <button onClick={() => {
                        setTempAllowedUsers(activePage_.allowed_users || []);
                        setPermissionsModalOpen(true);
                      }} className="ml-2 flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold text-dark-text/60 hover:text-dark-text transition-colors">
                        <Lock size={10} /> {activePage_.allowed_users && activePage_.allowed_users.length > 0 ? `${activePage_.allowed_users.length} usuários restritos` : 'Público'}
                      </button>
                    )}
                    {saving && <Loader2 size={10} className="animate-spin text-dark-text/40 ml-2" />}
                  </div>
                </div>
                {/* Editor */}
                <div className="flex-1 px-8 py-6 overflow-y-auto custom-scrollbar">
                  <RichTextEditor
                    key={activeDocPageId}
                    content={activePage_.content}
                    onChange={html => {
                      setDocPages(prev => prev.map(p => p.id === activeDocPageId ? { ...p, content: html, updated_at: new Date().toISOString() } : p));
                      autoSave(activeDocPageId!, { content: html });
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-dark-text/30 gap-3">
                <FileText size={40} className="opacity-20" />
                <p className="text-sm font-medium">Selecione um plano ou crie um novo</p>
                <button
                  onClick={createPage}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all"
                >
                  <Plus size={13} /> Criar primeiro plano
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Permissions Modal */}
      {permissionsModalOpen && activePage_ && (
        <div className="fixed inset-0 z-[9999] modal-overlay flex items-center justify-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setPermissionsModalOpen(false); }}>
          <div className="modal-container w-full max-w-md flex flex-col max-h-[85vh]">
            <div className="p-5 border-b modal-divider flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold modal-title">Permissões de Acesso</h3>
                <p className="text-xs text-dark-text/50 mt-1">Quem pode ver o plano <strong>{activePage_.title}</strong>?</p>
              </div>
              <button onClick={() => setPermissionsModalOpen(false)} className="text-dark-text/40 hover:text-dark-text">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 bg-violet-500/10 border-b border-violet-500/20 text-xs text-violet-400">
              {tempAllowedUsers.length === 0 ? (
                <><strong>Acesso Público:</strong> Todos os usuários podem ver este plano.</>
              ) : (
                <><strong>Acesso Restrito:</strong> Apenas os usuários marcados abaixo (e administradores) podem ver.</>
              )}
            </div>

            <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-1">
              {systemUsers.map(u => {
                const checked = tempAllowedUsers.includes(u.email);
                return (
                  <label key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-colors border border-transparent hover:border-white/10">
                    <input type="checkbox" checked={checked} onChange={e => {
                      if (e.target.checked) setTempAllowedUsers(prev => [...prev, u.email]);
                      else setTempAllowedUsers(prev => prev.filter(email => email !== u.email));
                    }} className="w-4 h-4 rounded border-white/20 bg-dark-input text-violet-500 focus:ring-violet-500 focus:ring-offset-dark-card" />
                    <div className="flex items-center gap-3">
                      {u.picture ? (
                        <img src={u.picture} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold shrink-0">
                          {(u.name || u.email).substring(0,2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-dark-text truncate">{u.name || u.email}</p>
                        {u.name && <p className="text-xs text-dark-text/50 truncate">{u.email}</p>}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
            <div className="p-5 border-t modal-divider flex gap-3">
              <button onClick={() => setPermissionsModalOpen(false)} className="modal-btn-cancel">
                Cancelar
              </button>
              <button onClick={() => {
                setDocPages(prev => prev.map(p => p.id === activePage_.id ? { ...p, allowed_users: tempAllowedUsers } : p));
                apiCall('PUT', `/api/career-plans/docs/${activePage_.id}`, { allowed_users: tempAllowedUsers });
                setPermissionsModalOpen(false);
              }} className="modal-btn-primary">
                Salvar Permissões
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
