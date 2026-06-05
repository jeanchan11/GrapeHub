import React, { useState, useEffect, useRef, useMemo } from 'react';
import SplitHeadline from '../components/SplitHeadline';
import { PageHeader } from '../components/ui/PageHeader';
import { RefreshCw, ChevronDown, Check, ArrowUp, ArrowDown, ArrowUpDown, Search, Filter, Download, Briefcase, DollarSign, Target, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMenu } from '../context/MenuContext';
import ProjectsModule from './ProjectsModule';


interface ProjectRow {
  id: string;
  partner: string;
  product?: string;
  status: string;
  roi: string;
  investment: string;
  responsible: string;
  responsiblePicture?: string | null;
  lastUpdate: string;
  activeClientId: string;
  page_id?: string;
  page_manager_id?: string;
  group?: string;
  projectResult?: string;
  squad?: string;
  files?: any[];
  products?: any[];
}

const RESULT_COLORS: Record<string, string> = {
  'RESULTADO BOM': '#8b5cf6',
  'RESULTADO OK': '#10b981',
  'RESULTADO RUIM': '#ef4444',
  'TESTANDO': '#3b82f6',
  'AGUARDANDO CRIATIVOS': '#94a3b8',
  'CAMPANHA PAUSADA': '#eab308'
};

function parseMoney(val: string | null | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/[^\d,]/g, '').replace('.', '').replace(',', '.')) || 0;
}

function fmtBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export default function ParceirosSquad({ activePage, onPageChange }: { activePage?: string; onPageChange?: (page: string) => void }) {
  const { userData } = useAuth();
  const { menu } = useMenu();
  const isAdmin = userData?.role === 'superadmin' || userData?.role === 'admin';

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [modalProject, setModalProject] = useState<any | null>(null);

  // Manager picker state
  const [pickerPageId, setPickerPageId] = useState<string | null>(null);
  const [savingPageId, setSavingPageId] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Resolve the squad name from the menu hierarchy
  const squadName = useMemo(() => {
    if (!activePage || !Array.isArray(menu)) return 'Able'; // fallback
    for (const section of menu) {
      for (const ss of section.subSessions || []) {
        // Check pages directly inside subsession
        for (const p of ss.pages || []) {
          if (p.id === activePage) {
            // The parent subsession label is typically "Squad Baker"
            const match = ss.label?.match(/Squad\s+(.+)/i);
            return match ? match[1] : ss.label || 'Able';
          }
        }
        // Check inside sub-sub-sessions
        for (const sss of ss.subSubSessions || []) {
          for (const p of sss.pages || []) {
            if (p.id === activePage) {
              const match = ss.label?.match(/Squad\s+(.+)/i);
              return match ? match[1] : ss.label || 'Able';
            }
          }
        }
      }
    }
    return 'Able'; // fallback
  }, [activePage, menu]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setSpinning(true);
    try {
      const [resProj, resUsers] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/users')
      ]);
      
      if (resProj.ok) {
        const all: ProjectRow[] = await resProj.json();
        const relevant = all.filter(p => p.squad === squadName);
        setProjects(relevant);
      }
      
      if (resUsers.ok) {
        setUsers(await resUsers.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  };

  useEffect(() => { fetchData(); }, [squadName]);

  const sortedProjects = useMemo(() => {
    let sortable = [...projects];
    if (sortConfig !== null) {
      sortable.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortConfig.key === 'Cliente') {
          valA = a.partner.toLowerCase();
          valB = b.partner.toLowerCase();
        } else if (sortConfig.key === 'Responsável') {
          valA = (a.responsible || '').toLowerCase();
          valB = (b.responsible || '').toLowerCase();
        } else if (sortConfig.key === 'Resultado') {
          valA = (a.projectResult || '').toLowerCase();
          valB = (b.projectResult || '').toLowerCase();
        } else if (sortConfig.key === 'Orçamento Mensal') {
          valA = parseMoney(a.investment);
          if (valA <= 0 && a.products) {
            valA = a.products.reduce((acc, prod) => acc + parseMoney(prod.budget), 0);
          }
          valB = parseMoney(b.investment);
          if (valB <= 0 && b.products) {
            valB = b.products.reduce((acc, prod) => acc + parseMoney(prod.budget), 0);
          }
        } else if (sortConfig.key === 'Produtos') {
          valA = (a.products || []).length;
          valB = (b.products || []).length;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [projects, sortConfig]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredProjects = useMemo(() => {
    return sortedProjects.filter(p => 
      p.partner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.responsible && p.responsible.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [sortedProjects, searchQuery]);

  const totalProjetos = projects.length;
  const totalOrcamento = projects.reduce((acc, p) => {
    let total = parseMoney(p.investment);
    if (total <= 0 && p.products && p.products.length > 0) {
      total = p.products.reduce((a, prod) => a + parseMoney(prod.budget), 0);
    }
    return acc + total;
  }, 0);
  const resultadoBom = projects.filter(p => p.projectResult === 'RESULTADO BOM').length;
  const resultadoRuim = projects.filter(p => p.projectResult === 'RESULTADO RUIM').length;

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerPageId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSetManager = async (pageId: string, managerId: string | null) => {
    setSavingPageId(pageId);
    try {
      await fetch(`/api/menu-pages/${pageId}/manager`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id: managerId, requester_email: userData?.email })
      });
      setPickerPageId(null);
      await fetchData(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingPageId(null);
    }
  };

  // Get managers (gestor-trafego users)
  const managers = users.filter(u => u.role === 'gestor-trafego' || u.role === 'superadmin' || u.role === 'admin');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-bg">
        <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <style>{`
        @keyframes rowFadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {/* Header */}
      <PageHeader 
        title="Parceiros" 
        titleAccent="Squad" 
        subtitle={`Todos os projetos · Squad ${squadName}`}
      >
        <button
          onClick={() => fetchData(true)}
          className={`px-4 py-2 bg-dark-card border border-white/10 hover:bg-dark-card-hover text-white rounded-xl transition-all shadow-sm flex items-center gap-2 ${spinning ? 'opacity-70' : ''}`}
        >
          <RefreshCw size={16} className={spinning ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md p-5 rounded-3xl border border-slate-200 dark:border-white/10 hover:border-violet-500/30 transition-all group shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10">
              <Briefcase size={18} className="text-violet-500" />
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Projetos</p>
          <h3 className="text-3xl font-bold text-light-text dark:text-white">{totalProjetos}</h3>
          <p className="text-[10px] text-violet-500 mt-1">Parceiros gerenciados pelo squad</p>
        </div>

        <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md p-5 rounded-3xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/30 transition-all group shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <DollarSign size={18} className="text-emerald-500" />
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Orçamento Total</p>
          <h3 className="text-3xl font-bold text-light-text dark:text-white">{fmtBRL(totalOrcamento)}</h3>
          <p className="text-[10px] text-emerald-500 mt-1">Soma de investimento mensal</p>
        </div>

        <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md p-5 rounded-3xl border border-slate-200 dark:border-white/10 hover:border-blue-500/30 transition-all group shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10">
              <Target size={18} className="text-blue-500" />
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Resultado Bom</p>
          <h3 className="text-3xl font-bold text-light-text dark:text-white">{resultadoBom}</h3>
          <p className="text-[10px] text-blue-500 mt-1">Projetos com bons resultados</p>
        </div>

        <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md p-5 rounded-3xl border border-slate-200 dark:border-white/10 hover:border-rose-500/30 transition-all group shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10">
              <AlertTriangle size={18} className="text-rose-500" />
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Atenção</p>
          <h3 className="text-3xl font-bold text-light-text dark:text-white">{resultadoRuim}</h3>
          <p className="text-[10px] text-rose-500 mt-1">Resultado Ruim ou pausado</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200 dark:border-white/10 mb-6 flex flex-wrap items-center gap-4 shadow-sm transition-colors">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar parceiro ou responsável..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-light-text dark:text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 hover:text-light-text dark:hover:text-white transition-colors">
            <Filter size={18} />
          </button>
          <button className="p-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 hover:text-light-text dark:hover:text-white transition-colors">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Tabela completa */}
      <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                {['Cliente', 'Responsável', 'Resultado', 'Orçamento Mensal', 'Produtos'].map(h => (
                  <th 
                    key={h} 
                    className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left cursor-pointer hover:text-violet-400 transition-colors group select-none"
                    onClick={() => handleSort(h)}
                  >
                    <div className="flex items-center gap-1.5">
                      {h}
                      {sortConfig?.key === h ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-violet-500" /> : <ArrowDown size={10} className="text-violet-500" />
                      ) : (
                        <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredProjects.map((p, idx) => {
                // Use picture from backend if available, else look up by name
                const fallbackUser = users.find(u =>
                  p.responsible &&
                  (
                    (u.name && u.name.toLowerCase() === p.responsible.toLowerCase()) ||
                    (u.email && u.email.toLowerCase().includes(p.responsible.toLowerCase().split(' ')[0]))
                  )
                );
                const picture = p.responsiblePicture || fallbackUser?.picture || null;
                const isPickerOpen = pickerPageId === p.page_id;
                const isSaving = savingPageId === p.page_id;

                return (
                  <tr 
                    key={p.id} 
                    className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                    style={{
                      animation: `rowFadeIn 0.3s ease both`,
                      animationDelay: `${idx * 0.04}s`,
                    }} 
                    onClick={(e: any) => {
                      // Prevent if clicked on a specific button inside
                      if (e.target.closest('button')) return;
                      
                      if (p.page_id) {
                        setModalProject(p);
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('OPEN_PROJECT_MODAL', { detail: p }));
                        }, 300); // Allow ProjectsModule to mount and fetch data
                      }
                    }}
                  >
                    {/* Cliente */}
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 flex items-center justify-center shrink-0 shadow-inner">
                          <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500">
                            {p.partner.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-bold text-light-text dark:text-white text-sm truncate max-w-[200px]">{p.partner}</span>
                      </div>
                    </td>

                    {/* Responsável */}
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center overflow-hidden shrink-0 border-2 border-violet-500/30 shadow-sm">
                          {picture ? (
                            <img src={picture} alt={p.responsible} className="w-full h-full object-cover" />
                          ) : p.responsible ? (
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.responsible}`} alt={p.responsible} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] text-slate-500">?</span>
                          )}
                        </div>
                        <span className="text-sm text-slate-500 font-medium truncate max-w-[120px]">{p.responsible || '—'}</span>
                      </div>
                    </td>

                    {/* Resultado */}
                    <td className="px-8 py-5">
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap"
                        style={{
                          background: ((p.projectResult && RESULT_COLORS[p.projectResult.toUpperCase()]) ? RESULT_COLORS[p.projectResult.toUpperCase()] : '#64748b') + '22',
                          color: (p.projectResult && RESULT_COLORS[p.projectResult.toUpperCase()]) ? RESULT_COLORS[p.projectResult.toUpperCase()] : '#94a3b8',
                        }}
                      >
                        {p.projectResult || '-'}
                      </span>
                    </td>

                    {/* Orçamento */}
                    <td className="px-8 py-5 text-sm font-bold text-emerald-500 whitespace-nowrap">
                      {(() => {
                        let total = parseMoney(p.investment);
                        if (total <= 0 && p.products && p.products.length > 0) {
                          total = p.products.reduce((acc, prod) => acc + parseMoney(prod.budget), 0);
                        }
                        return total > 0 ? fmtBRL(total) : '—';
                      })()}
                    </td>

                    {/* Produtos */}
                    <td className="px-8 py-5 text-sm text-slate-500">{(p.products || []).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {modalProject && (
        <ProjectsModule activePage={modalProject.page_id} modalOnly={true} />
      )}
    </div>
  );
}
