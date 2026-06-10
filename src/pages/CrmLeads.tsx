import React, { useState, useEffect } from 'react';
import SplitHeadline from '../components/SplitHeadline';
import { Search, Download, Users, Phone, Mail, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import LoadingSpinner from '../components/LoadingSpinner';

interface Lead {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  origem: string | null;
  valor: number | null;
  coluna_nome: string | null;
  responsavel_name: string | null;
  tags: Array<string | { name: string; color?: string }>;
  created_at: string;
  kanban_name: string | null;
  is_lost: boolean;
}

interface Kanban {
  id: string;
  nome: string;
}

const origemColors: Record<string, string> = {
  'Meta ads': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Google': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Indicação': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};
const origemFallback = 'bg-slate-500/10 text-slate-400 border-slate-500/20';

function getOrigemColor(origem: string | null): string {
  if (!origem) return origemFallback;
  return origemColors[origem] ?? origemFallback;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatPhone(phone: string | null): string {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, '($1) $2 $3-$4');
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  if (diffDay >= 1) return `há ${diffDay} dia${diffDay > 1 ? 's' : ''}`;
  if (diffHour >= 1) return `há ${diffHour} hora${diffHour > 1 ? 's' : ''}`;
  if (diffMin >= 1) return `há ${diffMin} min`;
  return 'agora';
}

function getAvatarColor(nome: string): string {
  const colors = [
    'bg-violet-500/20 text-violet-400',
    'bg-blue-500/20 text-blue-400',
    'bg-emerald-500/20 text-emerald-400',
    'bg-rose-500/20 text-rose-400',
    'bg-orange-500/20 text-orange-400',
  ];
  return colors[nome.charCodeAt(0) % colors.length];
}

type StatusFilter = 'todos' | 'ativos' | 'perdidos';

export default function CrmLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [kanbans, setKanbans] = useState<Kanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [kanbanFilter, setKanbanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');

  const getToken = async (): Promise<string | null> => {
    try {
      return (await auth.currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  };

  const fetchLeads = async () => {
    const token = await getToken();
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/crm-comercial/leads-list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Lead[] = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error('Falha ao buscar leads', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchKanbans = async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/crm-comercial/kanbans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setKanbans(await res.json());
      }
    } catch (err) {
      console.error('Falha ao buscar kanbans', err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchKanbans();
  }, [user]);

  // ---------- Filters ----------
  const filteredLeads = leads.filter((l) => {
    // Search
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      !s ||
      (l.nome && l.nome.toLowerCase().includes(s)) ||
      (l.telefone && l.telefone.toLowerCase().includes(s)) ||
      (l.email && l.email.toLowerCase().includes(s));

    // Kanban
    const matchesKanban = !kanbanFilter || l.kanban_name === kanbanFilter;

    // Status
    const matchesStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'ativos' && !l.is_lost) ||
      (statusFilter === 'perdidos' && l.is_lost);

    return matchesSearch && matchesKanban && matchesStatus;
  });

  // ---------- CSV Export ----------
  const handleExportCSV = () => {
    const headers = [
      'Nome',
      'Telefone',
      'Email',
      'Origem',
      'Valor',
      'Etapa',
      'Responsável',
      'Tags',
      'Kanban',
      'Perdido',
      'Criado em',
    ];
    const rows = filteredLeads.map((l) => [
      `"${l.nome || ''}"`,
      `"${l.telefone || ''}"`,
      `"${l.email || ''}"`,
      `"${l.origem || ''}"`,
      `"${l.valor ?? ''}"`,
      `"${l.coluna_nome || ''}"`,
      `"${l.responsavel_name || ''}"`,
      `"${(l.tags || []).map(t => typeof t === 'string' ? t : t.name).join(', ')}"`,
      `"${l.kanban_name || ''}"`,
      `"${l.is_lost ? 'Sim' : 'Não'}"`,
      `"${l.created_at || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-full bg-light-bg dark:bg-dark-bg text-slate-900 dark:text-slate-100 font-sans p-8 overflow-y-auto w-full">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-200 dark:border-white/10 pb-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
            <Users size={20} className="text-violet-400" />
          </div>
          <div className="flex items-center gap-3">
            <SplitHeadline
              text=""
              highlight="Leads"
              className="text-2xl font-black tracking-tight text-slate-800 dark:text-white"
            />
            <span className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full font-semibold">
              {filteredLeads.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500/50 transition-colors shadow-sm"
            />
          </div>

          {/* Kanban filter */}
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={kanbanFilter}
              onChange={(e) => setKanbanFilter(e.target.value)}
              className="pl-8 pr-4 py-2 text-sm bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-violet-500/50 transition-colors shadow-sm appearance-none cursor-pointer"
            >
              <option value="">Todos Kanbans</option>
              {kanbans.map((k) => (
                <option key={k.id} value={k.nome}>
                  {k.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden text-sm">
            {(['todos', 'ativos', 'perdidos'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-violet-600 text-white'
                    : 'bg-white dark:bg-dark-card text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* ── TABLE ── */}
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
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400">Nome</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Telefone</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Email</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Origem</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Valor</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Etapa</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Responsável</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Tags</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-20 text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <Users size={32} className="opacity-20" />
                        <p>Nenhum lead encontrado.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((l) => (
                    <tr
                      key={l.id}
                      className={`border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                        l.is_lost ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Nome */}
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(
                              l.nome
                            )}`}
                          >
                            {l.nome.substring(0, 1).toUpperCase()}
                          </div>
                          <span
                            className={`font-semibold text-slate-800 dark:text-white ${
                              l.is_lost ? 'line-through' : ''
                            }`}
                          >
                            {l.nome}
                          </span>
                        </div>
                      </td>

                      {/* Telefone */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="opacity-40 shrink-0" />
                          {formatPhone(l.telefone)}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="opacity-40 shrink-0" />
                          {l.email || '-'}
                        </div>
                      </td>

                      {/* Origem */}
                      <td className="px-4 py-3">
                        {l.origem ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getOrigemColor(
                              l.origem
                            )}`}
                          >
                            {l.origem}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Valor */}
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                        {l.valor != null ? currencyFormatter.format(l.valor) : '-'}
                      </td>

                      {/* Etapa */}
                      <td className="px-4 py-3">
                        {l.coluna_nome ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            {l.coluna_nome}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Responsável */}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 capitalize">
                        {l.responsavel_name || '-'}
                      </td>

                      {/* Tags */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {(l.tags || []).length > 0
                            ? l.tags.map((tag, idx) => {
                                const tagName = typeof tag === 'string' ? tag : tag.name;
                                const tagColor = typeof tag === 'object' && tag.color ? tag.color : undefined;
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/10 text-violet-400"
                                    style={tagColor ? { backgroundColor: `${tagColor}20`, color: tagColor } : undefined}
                                  >
                                    {tagName}
                                  </span>
                                );
                              })
                            : <span className="text-slate-400">-</span>}
                        </div>
                      </td>

                      {/* Criado em */}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                        {l.created_at ? timeAgo(l.created_at) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
