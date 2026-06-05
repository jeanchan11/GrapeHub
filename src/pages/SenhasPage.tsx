import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, X, Copy, Trash2, Loader2, KeyRound, Edit2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import SplitHeadline from '../components/SplitHeadline';
import { useAuth } from '../contexts/AuthContext';

interface PasswordItem {
  id: string;
  page_id: string;
  service_name: string;
  login?: string;
  password?: string;
  url?: string;
  created_at: string;
}

const SenhasPage: React.FC<{ activePage: string }> = ({ activePage }) => {
  const { userData } = useAuth();
  const [passwords, setPasswords] = useState<PasswordItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PasswordItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [serviceName, setServiceName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/passwords?page_id=${activePage}`);
      if (res.ok) {
        setPasswords(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activePage]);

  const openNewModal = () => {
    setEditingItem(null);
    setServiceName('');
    setLogin('');
    setPassword('');
    setUrl('');
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: PasswordItem) => {
    setEditingItem(item);
    setServiceName(item.service_name);
    setLogin(item.login || '');
    setPassword(item.password || '');
    setUrl(item.url || '');
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!serviceName.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingItem) {
        const res = await fetch(`/api/passwords/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_name: serviceName, login, password, url })
        });
        if (res.ok) {
          fetchData();
          setIsModalOpen(false);
        }
      } else {
        const res = await fetch('/api/passwords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page_id: activePage, service_name: serviceName, login, password, url })
        });
        if (res.ok) {
          fetchData();
          setIsModalOpen(false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta senha?')) return;
    try {
      const res = await fetch(`/api/passwords/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPasswords(prev => prev.filter(p => p.id !== id));
        setIsModalOpen(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Podemos omitir o alert e mostrar algo mais sutil, mas para MVP o clipboard nativo ja resolve
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <SplitHeadline
            text="Logins e "
            highlight="Senhas"
            subtitle="Gerenciador de Acessos"
            className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1"
            subtitleClassName="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-purple-500" size={32} />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#11111b] border border-slate-200 dark:border-white/5 shadow-sm dark:shadow-none rounded-xl overflow-hidden">
          <div className="p-2 space-y-1">
            {passwords.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.35,
                  delay: idx * 0.06,
                  ease: [0.32, 0.72, 0, 1],
                }}
              >
                <div 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => openEditModal(item)}
                >
                  <div className="w-8 h-8 rounded-full border border-purple-500/50 flex items-center justify-center bg-purple-500/10 text-purple-500">
                    <KeyRound size={16} />
                  </div>
                  
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-800 dark:text-gray-200">
                      {item.service_name}
                    </span>
                  </div>
                  
                  <button className="text-xs text-slate-400 dark:text-gray-500 hover:text-purple-500 transition-colors">
                    Ver dados
                  </button>
                </div>
              </motion.div>
            ))}
            
            {passwords.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                Nenhuma senha cadastrada ainda.
              </div>
            )}

            <div className="p-3 mt-2">
              <button 
                onClick={openNewModal}
                className="text-sm text-slate-500 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-2 font-medium transition-colors"
              >
                <Plus size={16} /> ADICIONAR SENHA
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {editingItem ? 'Dados de Acesso' : 'Nova Senha'}
            </h2>
            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Serviço / Plataforma</label>
              {isEditing ? (
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ex: Hostgator"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2 text-slate-800 dark:text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                />
              ) : (
                <div className="py-2 text-slate-800 dark:text-white font-medium">{serviceName}</div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">URL / Link de Acesso</label>
              {isEditing ? (
                <div className="relative">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://exemplo.com/login"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-4 pr-10 py-2 text-slate-800 dark:text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                  />
                  <button 
                    onClick={() => copyToClipboard(url)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-purple-500 rounded-md transition-colors"
                    title="Copiar link"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between py-2 group">
                  {url ? (
                    <a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noreferrer" className="text-purple-500 hover:underline truncate mr-2 block max-w-full">
                      {url}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Sem link cadastrado</span>
                  )}
                  {url && (
                    <button 
                      onClick={() => copyToClipboard(url)}
                      className="p-1.5 text-slate-400 hover:text-purple-500 rounded-md transition-colors opacity-100 md:opacity-0 group-hover:opacity-100 shrink-0"
                      title="Copiar link"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Login</label>
              {isEditing ? (
                <div className="relative">
                  <input
                    type="text"
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="E-mail ou usuário"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-4 pr-10 py-2 text-slate-800 dark:text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                  />
                  <button 
                    onClick={() => copyToClipboard(login)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-purple-500 rounded-md transition-colors"
                    title="Copiar login"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between py-2 group">
                  <span className="text-slate-800 dark:text-white">{login}</span>
                  <button 
                    onClick={() => copyToClipboard(login)}
                    className="p-1.5 text-slate-400 hover:text-purple-500 rounded-md transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                    title="Copiar login"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Senha</label>
              {isEditing ? (
                <div className="relative">
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-4 pr-10 py-2 text-slate-800 dark:text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all font-mono"
                  />
                  <button 
                    onClick={() => copyToClipboard(password)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-purple-500 rounded-md transition-colors"
                    title="Copiar senha"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between py-2 group">
                  <span className="text-slate-800 dark:text-white font-mono">{password}</span>
                  <button 
                    onClick={() => copyToClipboard(password)}
                    className="p-1.5 text-slate-400 hover:text-purple-500 rounded-md transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"
                    title="Copiar senha"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/10">
            {isEditing && editingItem ? (
              <button 
                onClick={() => handleDelete(editingItem.id)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <Trash2 size={16} /> Excluir
              </button>
            ) : (
              <div></div>
            )}
            
            {isEditing ? (
              <button 
                onClick={handleSave}
                disabled={isSubmitting || !serviceName.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Concluir
              </button>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Edit2 size={18} />
                Editar
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SenhasPage;
