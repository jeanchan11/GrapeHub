import React, { useState, useEffect } from 'react';
import { 
  Search, Settings, Download, Plus, Users, Briefcase, 
  Phone, Mail, User, Building, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { designSystem } from '../design-system';

interface Pessoa {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  empresa: string | null;
  negocios_count: string | number;
  responsavel_name: string | null;
  responsavel_email: string | null;
}

export default function CrmPessoas() {
  const { user } = useAuth();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '', email: '', telefone: '', cargo: '', empresa: ''
  });

  const fetchPessoas = async () => {
    if (!user?.email) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/crm-pessoas/list?user_id=${user.email}`);
      if (res.ok) {
        const data = await res.json();
        setPessoas(data);
      }
    } catch (err) {
      console.error('Failed to fetch pessoas', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPessoas();
  }, [user]);

  const handleSaveContact = async () => {
    if (!user?.email || !formData.nome.trim()) return;
    setSaveError(null);
    try {
      setSaving(true);
      const res = await fetch('/api/crm-pessoas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          user_id: user.email,
          responsavel_id: user.email
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowModal(false);
        setFormData({ nome: '', email: '', telefone: '', cargo: '', empresa: '' });
        fetchPessoas();
      } else {
        setSaveError(data.details || data.error || 'Erro ao salvar contato.');
      }
    } catch (err: any) {
      setSaveError('Erro de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const filteredPessoas = pessoas.filter(p => {
    const s = searchQuery.toLowerCase();
    return (
      (p.nome && p.nome.toLowerCase().includes(s)) ||
      (p.email && p.email.toLowerCase().includes(s)) ||
      (p.telefone && p.telefone.toLowerCase().includes(s)) ||
      (p.empresa && p.empresa.toLowerCase().includes(s))
    );
  });

  const handleExportCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Cargo', 'Empresa', 'Negócios', 'Proprietário'];
    const rows = filteredPessoas.map(p => [
      `"${p.nome || ''}"`,
      `"${p.email || ''}"`,
      `"${p.telefone || ''}"`,
      `"${p.cargo || ''}"`,
      `"${p.empresa || ''}"`,
      `"${p.negocios_count || '0'}"`,
      `"${p.responsavel_name || p.responsavel_email || '-'}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Contatos_Pessoas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAvatarColor = (nome: string) => {
    const colors = [
      'bg-violet-500/20 text-violet-400',
      'bg-blue-500/20 text-blue-400',
      'bg-emerald-500/20 text-emerald-400',
      'bg-rose-500/20 text-rose-400',
      'bg-orange-500/20 text-orange-400',
    ];
    return colors[nome.charCodeAt(0) % colors.length];
  };

  return (
    <div className="min-h-full bg-light-bg dark:bg-dark-bg text-slate-900 dark:text-slate-100 font-sans p-8 overflow-y-auto w-full">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-200 dark:border-white/10 pb-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
            <Users size={20} className="text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Pessoas
            <span className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full font-semibold">
              {filteredPessoas.length}
            </span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar contato..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500/50 transition-colors shadow-sm"
            />
          </div>
          <button className="p-2 border border-slate-200 dark:border-white/10 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
             <Settings size={18} />
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <Download size={16} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button 
            onClick={() => { setShowModal(true); setSaveError(null); setFormData({ nome: '', email: '', telefone: '', cargo: '', empresa: '' }); }} 
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            <span>Novo Contato</span>
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden min-h-[500px]">
        {loading ? (
           <div className="flex justify-center items-center h-64">
             <LoadingSpinner size="lg" />
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
               <thead>
                 <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                    <th className="px-6 py-4 w-12">
                      <input type="checkbox" className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    </th>
                    <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Nome</th>
                    <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Email</th>
                    <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Telefone</th>
                    <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Cargo</th>
                    <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Empresa</th>
                    <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Negócios</th>
                    <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Proprietário</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredPessoas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-20 text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                          <Users size={32} className="opacity-20" />
                          <p>Nenhum contato encontrado.</p>
                          <button 
                            onClick={() => setShowModal(true)} 
                            className="mt-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Adicionar Primeiro Contato
                          </button>
                        </div>
                      </td>
                    </tr>
                 ) : (
                   filteredPessoas.map((p) => (
                     <tr key={p.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-3">
                          <input type="checkbox" className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(p.nome)}`}>
                              {p.nome.substring(0, 1).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-800 dark:text-white group-hover:text-violet-500 transition-colors cursor-pointer">{p.nome}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <Mail size={13} className="opacity-40 shrink-0" />
                            {p.email || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <Phone size={13} className="opacity-40 shrink-0" />
                            {p.telefone ? p.telefone.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4') : '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{p.cargo || '-'}</td>
                        <td className="px-4 py-3 text-slate-500">{p.empresa || '-'}</td>
                        <td className="px-4 py-3">
                           <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400">
                             {p.negocios_count || '0'} negócio{Number(p.negocios_count) !== 1 ? 's' : ''}
                           </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 capitalize">
                           {p.responsavel_name || p.responsavel_email?.split('@')[0] || '-'}
                        </td>
                     </tr>
                   ))
                 )}
               </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL — usando padrão do CRM Comercial */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Novo Contato"
        maxWidth="max-w-md"
        footer={
          <button
            onClick={handleSaveContact}
            disabled={saving || !formData.nome.trim()}
            className={designSystem.button.primary}
          >
            {saving ? 'Salvando...' : 'Salvar Contato'}
          </button>
        }
      >
        <div className="space-y-4">
          {saveError && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400">
              <AlertCircle size={16} className="shrink-0" />
              {saveError}
            </div>
          )}

          <div>
            <label className={designSystem.input.label}>Nome Completo *</label>
            <input 
              type="text" 
              required
              value={formData.nome} 
              onChange={e => setFormData({...formData, nome: e.target.value})}
              className={designSystem.input.field}
              placeholder="Nome da pessoa ou contato"
            />
          </div>

          <div>
            <label className={designSystem.input.label}>Telefone Principal</label>
            <input 
              type="text" 
              value={formData.telefone} 
              onChange={e => setFormData({...formData, telefone: e.target.value})}
              className={designSystem.input.field}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <label className={designSystem.input.label}>Email</label>
            <input 
              type="email" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})}
              className={designSystem.input.field}
              placeholder="joao@empresa.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={designSystem.input.label}>Cargo</label>
              <input 
                type="text" 
                value={formData.cargo} 
                onChange={e => setFormData({...formData, cargo: e.target.value})}
                className={designSystem.input.field}
                placeholder="Ex: CEO"
              />
            </div>
            <div>
              <label className={designSystem.input.label}>Empresa</label>
              <input 
                type="text" 
                value={formData.empresa} 
                onChange={e => setFormData({...formData, empresa: e.target.value})}
                className={designSystem.input.field}
                placeholder="Ex: Grape Mídia"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
