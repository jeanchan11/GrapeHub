import React, { useState, useEffect } from 'react';
import SplitHeadline from '../components/SplitHeadline';
import { 
  Search, Settings, Download, Plus, Building2, 
  Globe, Phone, Mail, Users, AlertCircle, Briefcase
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { designSystem } from '../design-system';

interface Empresa {
  id: string;
  nome: string;
  site: string | null;
  setor: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  responsavel_name: string | null;
  responsavel_email: string | null;
  pessoas_count: string | number;
  negocios_count: string | number;
  created_at: string;
}

export default function CrmEmpresas() {
  const { user } = useAuth();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '', site: '', setor: '', telefone: '', email: '', cidade: ''
  });
  const [pessoas, setPessoas] = useState<any[]>([]);

  const fetchPessoas = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`/api/crm-pessoas/list?user_id=${user.email}`);
      if (res.ok) setPessoas(await res.json());
    } catch (err) {}
  };

  const fetchEmpresas = async () => {
    if (!user?.email) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/crm-empresas/list?user_id=${user.email}`);
      if (res.ok) {
        const data = await res.json();
        setEmpresas(data);
      }
    } catch (err) {
      console.error('Failed to fetch empresas', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
    fetchPessoas();
  }, [user]);

  const openEditModal = (e: Empresa) => {
    setEditingId(e.id);
    setFormData({
      nome: e.nome || '',
      site: e.site || '',
      setor: e.setor || '',
      telefone: e.telefone || '',
      email: e.email || '',
      cidade: e.cidade || ''
    });
    setSaveError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user?.email || !formData.nome.trim()) return;
    setSaveError(null);
    try {
      setSaving(true);
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId ? `/api/crm-empresas/${editingId}` : '/api/crm-empresas';

      const res = await fetch(url, {
        method,
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
        setEditingId(null);
        setFormData({ nome: '', site: '', setor: '', telefone: '', email: '', cidade: '' });
        fetchEmpresas();
      } else {
        setSaveError(data.details || data.error || 'Erro ao salvar empresa.');
      }
    } catch (err: any) {
      setSaveError('Erro de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmpresas = empresas.filter(e => {
    const s = searchQuery.toLowerCase();
    return (
      (e.nome && e.nome.toLowerCase().includes(s)) ||
      (e.setor && e.setor.toLowerCase().includes(s)) ||
      (e.cidade && e.cidade.toLowerCase().includes(s)) ||
      (e.email && e.email.toLowerCase().includes(s))
    );
  });

  const handleExportCSV = () => {
    const headers = ['Nome', 'Setor', 'Site', 'Telefone', 'Email', 'Cidade', 'Pessoas', 'Negócios', 'Proprietário'];
    const rows = filteredEmpresas.map(e => [
      `"${e.nome || ''}"`,
      `"${e.setor || ''}"`,
      `"${e.site || ''}"`,
      `"${e.telefone || ''}"`,
      `"${e.email || ''}"`,
      `"${e.cidade || ''}"`,
      `"${e.pessoas_count || '0'}"`,
      `"${e.negocios_count || '0'}"`,
      `"${e.responsavel_name || e.responsavel_email || '-'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Empresas_${new Date().toISOString().split('T')[0]}.csv`);
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

  const SETORES = [
    'Tecnologia', 'Marketing', 'Saúde', 'Educação', 'Varejo', 'Serviços',
    'Indústria', 'Agronegócio', 'Construção', 'Financeiro', 'Outro'
  ];

  return (
    <div className="min-h-full bg-light-bg dark:bg-dark-bg text-slate-900 dark:text-slate-100 font-sans p-8 overflow-y-auto w-full">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-200 dark:border-white/10 pb-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
            <Building2 size={20} className="text-violet-400" />
          </div>
          <div className="flex items-center gap-3">
            <SplitHeadline
              text=""
              highlight="Empresas"
              className="text-2xl font-black tracking-tight text-slate-800 dark:text-white"
            />
            <span className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full font-semibold">
              {filteredEmpresas.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar empresa..."
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
            onClick={() => { setShowModal(true); setEditingId(null); setSaveError(null); setFormData({ nome: '', site: '', setor: '', telefone: '', email: '', cidade: '' }); }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            <span>Nova Empresa</span>
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
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Setor</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Contato</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Cidade</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Pessoas</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Negócios</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Proprietário</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmpresas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-20 text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <Building2 size={32} className="opacity-20" />
                        <p>Nenhuma empresa encontrada.</p>
                        <button
                          onClick={() => setShowModal(true)}
                          className="mt-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Adicionar Primeira Empresa
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEmpresas.map((e) => (
                    <tr key={e.id} onClick={() => openEditModal(e)} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer">
                      <td className="px-6 py-3">
                        <input type="checkbox" className="rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${getAvatarColor(e.nome)}`}>
                            {e.nome.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-white group-hover:text-violet-500 transition-colors cursor-pointer block">{e.nome}</span>
                            {e.site && (
                              <a href={e.site.startsWith('http') ? e.site : `https://${e.site}`} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-400 hover:underline flex items-center gap-1">
                                <Globe size={10} /> {e.site}
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {e.setor ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                            {e.setor}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col gap-0.5">
                          {e.telefone && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Phone size={11} className="opacity-50" />
                              {e.telefone}
                            </div>
                          )}
                          {e.email && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Mail size={11} className="opacity-50" />
                              {e.email}
                            </div>
                          )}
                          {!e.telefone && !e.email && '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{e.cidade || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                          <Users size={10} />
                          {e.pessoas_count || '0'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400">
                          <Briefcase size={10} />
                          {e.negocios_count || '0'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 capitalize">
                        {e.responsavel_name || e.responsavel_email?.split('@')[0] || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL — padrão CRM Comercial */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Editar Empresa" : "Nova Empresa"}
        maxWidth="max-w-md"
        footer={
          <button
            onClick={handleSave}
            disabled={saving || !formData.nome.trim()}
            className={designSystem.button.primary}
          >
            {saving ? 'Salvando...' : 'Salvar Empresa'}
          </button>
        }
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 pb-4">
          {saveError && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400">
              <AlertCircle size={16} className="shrink-0" />
              {saveError}
            </div>
          )}

          <div>
            <label className={designSystem.input.label}>Nome da Empresa *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={e => setFormData({...formData, nome: e.target.value})}
              className={designSystem.input.field}
              placeholder="Ex: Grape Mídia"
            />
          </div>

          <div>
            <label className={designSystem.input.label}>Setor</label>
            <select
              value={formData.setor}
              onChange={e => setFormData({...formData, setor: e.target.value})}
              className={designSystem.input.field}
            >
              <option value="">Selecione...</option>
              {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={designSystem.input.label}>Telefone</label>
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
                placeholder="contato@empresa.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={designSystem.input.label}>Site</label>
              <input
                type="text"
                value={formData.site}
                onChange={e => setFormData({...formData, site: e.target.value})}
                className={designSystem.input.field}
                placeholder="www.empresa.com"
              />
            </div>
            <div>
              <label className={designSystem.input.label}>Cidade</label>
              <input
                type="text"
                value={formData.cidade}
                onChange={e => setFormData({...formData, cidade: e.target.value})}
                className={designSystem.input.field}
                placeholder="Ex: Curitiba"
              />
            </div>
          </div>

          {editingId && pessoas.some(p => p.empresa?.toLowerCase().trim() === formData.nome.toLowerCase().trim()) && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-semibold mb-3 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Users size={16} className="text-violet-500" />
                Pessoas nesta empresa
              </h3>
              <div className="space-y-2">
                {pessoas
                  .filter(p => p.empresa?.toLowerCase().trim() === formData.nome.toLowerCase().trim())
                  .map(p => (
                  <div key={p.id} className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                    <div className="flex justify-between items-start">
                      <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{p.nome}</div>
                      <div className="text-xs text-slate-500 bg-white dark:bg-dark-bg px-2 py-0.5 rounded border border-slate-200 dark:border-white/5">
                        {p.cargo || 'Sem cargo'}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-col gap-0.5 mt-1">
                      {p.email && <div className="flex items-center gap-1"><Mail size={10}/> {p.email}</div>}
                      {p.telefone && <div className="flex items-center gap-1"><Phone size={10}/> {p.telefone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </Modal>
    </div>
  );
}
