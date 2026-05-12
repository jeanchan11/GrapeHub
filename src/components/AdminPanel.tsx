
import React, { useState, useEffect } from 'react';
import { Users, Shield, Check, X, Search, UserMinus, UserPlus, Lock, Unlock, Database, ChevronDown, ChevronUp, Layers, Loader2, FileText, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import { UserData, UserRole } from '../../types';
import { useMenu } from '../context/MenuContext';
import { useAuth } from '../contexts/AuthContext';
import { UserPermissionsModal } from './UserPermissionsModal';
import { PageManager } from './PageManager';

const AdminPanel: React.FC = () => {
  const { userData: currentUser, refreshUserData } = useAuth();
  const { menu, refreshMenu } = useMenu();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ status: string; message: string; time?: string } | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, { allowedPages: string[], role: UserRole, squad?: string, name?: string }>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'pages'>('users');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const deleteUser = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
    setOpenMenuId(null);
    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setUsers(users.filter(u => u.id !== id));
      } else {
        const errorData = await response.json();
        alert(`Erro ao excluir: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Erro ao excluir usuário', error);
      alert('Erro ao excluir usuário.');
    }
  };

  const roles: { id: UserRole; label: string }[] = [
    { id: 'superadmin', label: 'Superadmin' },
    { id: 'gerente-operacional', label: 'Gerente Operacional' },
    { id: 'gestor-trafego', label: 'Gestor de Tráfego' },
    { id: 'design', label: 'Design' },
    { id: 'user', label: 'Usuário Padrão' },
  ];

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const startEditing = (user: UserData) => {
    console.log('startEditing triggered for:', user.id, user.name);
    if (!pendingChanges[user.id]) {
      setPendingChanges(prev => ({
        ...prev,
        [user.id]: {
          allowedPages: [...(user.allowedPages || [])],
          role: user.role,
          squad: user.squad,
          name: user.name || ''
        }
      }));
    }
    setEditingUser(user);
    console.log('editingUser state set to:', user);
  };

  const togglePage = (id: string, pageId: string) => {
    setPendingChanges(prev => {
      const current = prev[id];
      if (!current) return prev;

      const isAllowed = current.allowedPages.includes(pageId);
      const newPages = isAllowed 
        ? current.allowedPages.filter(id => id !== pageId)
        : [...current.allowedPages, pageId];

      return {
        ...prev,
        [id]: { ...current, allowedPages: newPages }
      };
    });
  };

  const toggleSection = (id: string, subSubSessionId: string) => {
    let targetSubSubSession: any = null;
    if (Array.isArray(menu)) {
      for (const section of menu) {
        if (Array.isArray(section.subSessions)) {
          for (const subSession of section.subSessions) {
            if (Array.isArray(subSession.subSubSessions)) {
              const found = subSession.subSubSessions.find(sss => sss.id === subSubSessionId);
              if (found) {
                targetSubSubSession = found;
                break;
              }
            }
          }
        }
        if (targetSubSubSession) break;
      }
    }
    
    if (!targetSubSubSession) return;

    setPendingChanges(prev => {
      const current = prev[id];
      if (!current) return prev;

      const pageIds = targetSubSubSession.pages.map((p: any) => p.id);
      const allPagesAllowed = pageIds.every((pid: string) => current.allowedPages.includes(pid));

      let newPages: string[];
      if (allPagesAllowed) {
        newPages = current.allowedPages.filter((pid: string) => !pageIds.includes(pid));
      } else {
        const otherPages = current.allowedPages.filter((pid: string) => !pageIds.includes(pid));
        newPages = [...otherPages, ...pageIds];
      }

      return {
        ...prev,
        [id]: { ...current, allowedPages: newPages }
      };
    });
  };

  const toggleSubSession = (id: string, subSessionId: string) => {
    let targetSubSession: any = null;
    if (Array.isArray(menu)) {
      for (const section of menu) {
        if (Array.isArray(section.subSessions)) {
          const found = section.subSessions.find(ss => ss.id === subSessionId);
          if (found) {
            targetSubSession = found;
            break;
          }
        }
      }
    }
    
    if (!targetSubSession) return;

    setPendingChanges(prev => {
      const current = prev[id];
      if (!current) return prev;

      const pageIds = targetSubSession.subSubSessions ? targetSubSession.subSubSessions.flatMap((sss: any) => sss.pages ? sss.pages.map((p: any) => p.id) : []) : [];
      if (targetSubSession.pages) {
        pageIds.push(...targetSubSession.pages.map((p: any) => p.id));
      }
      const allPagesAllowed = pageIds.every((pid: string) => current.allowedPages.includes(pid));

      let newPages: string[];
      if (allPagesAllowed) {
        newPages = current.allowedPages.filter((pid: string) => !pageIds.includes(pid));
      } else {
        const otherPages = current.allowedPages.filter((pid: string) => !pageIds.includes(pid));
        newPages = [...otherPages, ...pageIds];
      }

      return {
        ...prev,
        [id]: { ...current, allowedPages: newPages }
      };
    });
  };

  const toggleMenuSection = (id: string, sectionId: string) => {
    const targetSection = Array.isArray(menu) ? menu.find(s => s.id === sectionId) : undefined;
    
    if (!targetSection) return;

    setPendingChanges(prev => {
      const current = prev[id];
      if (!current) return prev;

      const pageIds = [
        ...(targetSection.pages || []).map((p: any) => p.id),
        ...(targetSection.subSubSessions || []).flatMap((sss: any) => (sss.pages || []).map((p: any) => p.id)),
        ...(targetSection.subSessions || []).flatMap((ss: any) => {
          const pIds = (ss.subSubSessions || []).flatMap((sss: any) => (sss.pages || []).map((p: any) => p.id));
          if (ss.pages) pIds.push(...ss.pages.map((p: any) => p.id));
          return pIds;
        }),
      ];
      const allPagesAllowed = pageIds.every((pid: string) => current.allowedPages.includes(pid));

      let newPages: string[];
      if (allPagesAllowed) {
        newPages = current.allowedPages.filter((pid: string) => !pageIds.includes(pid));
      } else {
        const otherPages = current.allowedPages.filter((pid: string) => !pageIds.includes(pid));
        newPages = [...otherPages, ...pageIds];
      }

      return {
        ...prev,
        [id]: { ...current, allowedPages: newPages }
      };
    });
  };

  const changeRole = (id: string, newRole: UserRole) => {
    setPendingChanges(prev => {
      const current = prev[id];
      if (!current) {
        // If not editing yet, find user and start editing
        const user = users.find(u => u.id === id);
        if (user) {
          return {
            ...prev,
            [id]: { allowedPages: [...(user.allowedPages || [])], role: newRole, squad: user.squad }
          };
        }
        return prev;
      }
      return {
        ...prev,
        [id]: { ...current, role: newRole }
      };
    });
  };

  const changeName = (id: string, newName: string) => {
    setPendingChanges(prev => {
      const current = prev[id];
      if (!current) return prev;
      return { ...prev, [id]: { ...current, name: newName } };
    });
  };

  const changeSquad = (id: string, newSquad: string) => {
    setPendingChanges(prev => {
      const current = prev[id];
      if (!current) {
        // If not editing yet, find user and start editing
        const user = users.find(u => u.id === id);
        if (user) {
          return {
            ...prev,
            [id]: { allowedPages: [...(user.allowedPages || [])], role: user.role, squad: newSquad }
          };
        }
        return prev;
      }
      return {
        ...prev,
        [id]: { ...current, squad: newSquad }
      };
    });
  };

  const savePermissions = async (id: string) => {
    const changes = pendingChanges[id];
    if (!changes) return;

    const user = users.find(u => u.id === id);

    setIsSaving(id);
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: changes.role,
          allowedPages: changes.allowedPages,
          squad: changes.squad,
          name: changes.name !== undefined ? changes.name : user?.name,
          picture: user?.picture
        })
      });
      
      if (response.ok) {
        // Update local users so the list reflects the new name immediately
        setUsers(prev => prev.map(u =>
          u.id === id
            ? { ...u, role: changes.role, allowedPages: changes.allowedPages, squad: changes.squad, name: changes.name !== undefined ? changes.name : u.name }
            : u
        ));
        fetchUsers();
        // If editing current user, refresh the context
        if (currentUser && currentUser.id === id) {
          await refreshUserData();
        }
        setPendingChanges(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
    } finally {
      setIsSaving(null);
    }
  };

  const discardChanges = (id: string) => {
    setPendingChanges(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail) return;

    const email = newUserEmail.toLowerCase().trim();
    
    if (users.some(u => u.email.toLowerCase() === email)) {
      alert('Este usuário já existe.');
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          role: 'user',
          allowedPages: [] // Changed from ['gestor'] to [] to be safe
        })
      });
      
      if (response.ok) {
        fetchUsers();
        setNewUserEmail('');
      } else {
        const errorData = await response.json();
        alert(`Erro ao adicionar usuário: ${errorData.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Erro ao adicionar usuário. Verifique o console.');
    } finally {
      setIsAdding(false);
    }
  };

  const filteredUsers = users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()));

  const testDbConnection = async () => {
    setIsTestingDb(true);
    setDbStatus(null);
    try {
      const response = await fetch('/api/db-test');
      if (!response.ok) {
        const errorText = await response.text();
        setDbStatus({ 
          status: 'error', 
          message: `Erro no servidor (${response.status}): ${response.statusText}`,
          error: errorText.substring(0, 100)
        } as any);
        return;
      }
      const data = await response.json();
      setDbStatus(data);
    } catch (error) {
      console.error('Fetch error:', error);
      setDbStatus({ 
        status: 'error', 
        message: 'Não foi possível alcançar o servidor da API. Verifique se o backend está rodando.',
        error: error instanceof Error ? error.message : String(error)
      } as any);
    } finally {
      setIsTestingDb(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1">
            Painel <span className="text-violet-500">Admin</span>
          </h1>
          <p className="text-slate-500 text-sm">Gerencie permissões e acessos dos usuários da GrapeHub.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-8 border-b border-slate-200 dark:border-white/10 pb-px">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'users' 
              ? 'border-violet-500 text-violet-600 dark:text-violet-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={18} />
            Usuários e Permissões
          </div>
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'pages' 
              ? 'border-violet-500 text-violet-600 dark:text-violet-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText size={18} />
            Gerenciar Páginas
          </div>
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-end">
            <form onSubmit={addUser} className="flex gap-2">
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type="email"
                  placeholder="Email do novo usuário..."
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-light-text dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 w-64 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isAdding}
                className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-600/20"
              >
                {isAdding ? 'Adicionando...' : 'Adicionar'}
              </button>
            </form>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Buscar por email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-light-text dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 w-64 transition-colors"
              />
            </div>
          </div>

          <div className="mb-10 p-6 bg-dark-card/60 backdrop-blur-md rounded-3xl border border-white/10 shadow-xl transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Database className="text-violet-500" size={24} />
                <h3 className="text-xl font-bold text-light-text dark:text-white">Integração Neon DB (Postgres)</h3>
              </div>
              <button
                onClick={testDbConnection}
                disabled={isTestingDb}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                {isTestingDb ? 'Testando...' : 'Testar Conexão'}
              </button>
            </div>
            
            {dbStatus && (
              <div className={`p-4 rounded-xl text-sm ${dbStatus.status === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                <p className="font-bold">{dbStatus.message}</p>
                {dbStatus.time && <p className="mt-1 text-xs opacity-70">Hora do Banco: {new Date(dbStatus.time).toLocaleString()}</p>}
                {(dbStatus as any).error && (
                  <div className="mt-2">
                    <p className="text-xs font-mono opacity-60">{(dbStatus as any).error}</p>
                    {(dbStatus as any).error.includes('ENOTFOUND base') && (
                      <div className="mt-3 p-3 bg-rose-500/20 rounded-lg border border-rose-500/30 text-rose-200">
                        <p className="font-bold mb-1">⚠️ Hostname incorreto detectado!</p>
                        <p className="text-xs leading-relaxed">
                          O erro <strong>ENOTFOUND base</strong> indica que o sistema está tentando se conectar a um host chamado "base", que é apenas um placeholder.
                          <br /><br />
                          <strong>Como corrigir:</strong>
                          <ol className="list-decimal ml-4 mt-1 space-y-1">
                            <li>Vá ao painel da Hostinger ou GitHub Secrets.</li>
                            <li>Verifique a variável <code>DATABASE_URL</code> ou <code>PGHOST</code>.</li>
                            <li>Certifique-se de que ela contém o host real do Neon (ex: <code>ep-xxx-yyy.us-east-2.aws.neon.tech</code>).</li>
                          </ol>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <p className="mt-4 text-xs text-slate-500">
              As credenciais do Neon DB devem ser configuradas nas variáveis de ambiente (PGHOST, PGDATABASE, PGUSER, PGPASSWORD).
            </p>
          </div>

          <div className="grid gap-6">
            {filteredUsers.map(user => {
              const currentData = pendingChanges[user.id] || { allowedPages: user.allowedPages || [], role: user.role };
              const hasChanges = pendingChanges[user.id] !== undefined;

              return (
                <div 
                  key={user.id} 
                  className={`w-full text-left bg-dark-card/60 backdrop-blur-md rounded-3xl border border-white/10 overflow-visible shadow-xl transition-colors hover:border-violet-500/50 ${openMenuId === user.id ? 'relative z-50' : 'relative z-10'}`}
                >
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-lg overflow-hidden">
                        {user.picture ? (
                          <img src={user.picture} alt={user.email} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          user.email[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <p className="text-light-text dark:text-white font-bold">{user.name && user.name.trim() !== '' ? user.name : user.email}</p>
                          {hasChanges && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Alterações Pendentes
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {user.name && user.name.trim() !== '' && <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{user.email}</p>}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${user.role === 'superadmin' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-500' : 'bg-blue-500/10 text-blue-600 dark:text-blue-500'}`}>
                            {roles.find(r => r.id === user.role)?.label || user.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === user.id ? null : user.id); }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <MoreHorizontal size={20} />
                      </button>

                      {openMenuId === user.id && (
                        <div className="absolute right-0 top-10 z-20 w-48 bg-[#1e1b29] border border-white/10 rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); startEditing(user); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 transition-colors text-left"
                          >
                            <Edit3 size={16} />
                            Alterar usuário
                          </button>
                          <div className="border-t border-white/5" />
                          <button 
                            onClick={(e) => deleteUser(user.id, e)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                          >
                            <Trash2 size={16} />
                            Excluir usuário
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {editingUser && (
            <UserPermissionsModal
              isOpen={!!editingUser}
              onClose={() => setEditingUser(null)}
              user={editingUser}
              menu={menu}
              roles={roles}
              currentData={pendingChanges[editingUser.id] || { allowedPages: editingUser.allowedPages || [], role: editingUser.role, squad: editingUser.squad }}
              isSaving={isSaving === editingUser.id}
              changeRole={changeRole}
              changeName={changeName}
              changeSquad={changeSquad}
              togglePage={togglePage}
              toggleSection={toggleSection}
              toggleSubSession={toggleSubSession}
              toggleMenuSection={toggleMenuSection}
              savePermissions={savePermissions}
              discardChanges={discardChanges}
              refreshMenu={refreshMenu}
            />
          )}
        </>
      ) : (
        <PageManager />
      )}
    </div>
  );
};

export default AdminPanel;
