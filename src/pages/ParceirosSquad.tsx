import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
  const n = parseFloat(val.replace(/[^\d.,]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function fmtBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export default function ParceirosSquad() {
  const { userData } = useAuth();
  const isAdmin = userData?.role === 'superadmin' || userData?.role === 'admin';

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  // Manager picker state
  const [pickerPageId, setPickerPageId] = useState<string | null>(null);
  const [savingPageId, setSavingPageId] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

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
        const relevant = all.filter(p => p.squad === 'Able');
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

  useEffect(() => { fetchData(); }, []);

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
    <div className="min-h-screen bg-dark-bg transition-colors duration-300 p-6 md:p-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dark-text">
            Parceiros <span className="text-violet-500">Squad</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            Todos os projetos · Squad Able
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          className={`w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:bg-dark-card-hover flex items-center justify-center transition-colors ${spinning ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={14} className="text-slate-400" />
        </button>
      </div>

      {/* ── Tabela completa ──────────────────────────────────── */}
      <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-dark-text">Todos os Projetos</h2>
            <p className="text-xs text-slate-500 mt-0.5">{projects.length} projetos carregados</p>
          </div>
          {isAdmin && (
            <p className="text-[10px] text-violet-400 bg-violet-500/10 px-2 py-1 rounded-lg font-medium">
              Admin · clique no responsável para alterar
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: 'rgba(100,100,120,0.15)' }}>
                {['Cliente', 'Responsável', 'Resultado', 'Orçamento/dia', 'Produtos'].map(h => (
                  <th key={h} className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pb-3 pr-4 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
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
                  <tr key={p.id} className="border-b transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(100,100,120,0.08)' }}>
                    {/* Cliente */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-500 text-[10px] font-black shrink-0">
                          {p.partner.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-dark-text truncate max-w-[140px]">{p.partner}</span>
                      </div>
                    </td>

                    {/* Responsável */}
                    <td className="py-3 pr-4 relative">
                      <div className="relative inline-block" ref={isPickerOpen ? pickerRef : undefined}>
                        <button
                          onClick={() => {
                            if (!isAdmin || !p.page_id) return;
                            setPickerPageId(isPickerOpen ? null : p.page_id!);
                          }}
                          className={`flex items-center gap-2 rounded-xl transition-all ${
                            isAdmin && p.page_id
                              ? 'hover:bg-white/5 px-2 py-1 cursor-pointer'
                              : 'cursor-default'
                          }`}
                          title={isAdmin ? 'Clique para alterar o responsável desta página' : undefined}
                        >
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center overflow-hidden shrink-0 border-2 border-violet-500/30">
                            {isSaving ? (
                              <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                            ) : picture ? (
                              <img src={picture} alt={p.responsible} className="w-full h-full object-cover" />
                            ) : p.responsible ? (
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.responsible}`} alt={p.responsible} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[8px] text-slate-500">?</span>
                            )}
                          </div>
                          <span className="text-slate-300 font-medium truncate max-w-[100px]">{p.responsible || '—'}</span>
                          {isAdmin && p.page_id && (
                            <ChevronDown size={10} className="text-slate-500 shrink-0" />
                          )}
                        </button>

                        {/* Manager picker dropdown */}
                        {isPickerOpen && (
                          <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                            <div className="px-3 py-2 border-b border-white/5">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Responsável da página</p>
                              <p className="text-[10px] text-violet-400 mt-0.5 truncate">{p.page_id}</p>
                            </div>
                            <button
                              onClick={() => handleSetManager(p.page_id!, null)}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                            >
                              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-slate-400">—</div>
                              <span className="text-xs text-slate-400">Nenhum</span>
                              {!p.page_manager_id && <Check size={11} className="ml-auto text-violet-400" />}
                            </button>
                            {managers.map(m => (
                              <button
                                key={m.id}
                                onClick={() => handleSetManager(p.page_id!, String(m.id))}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                              >
                                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-white/10">
                                  {m.picture ? (
                                    <img src={m.picture} alt={m.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} alt={m.name} className="w-full h-full object-cover" />
                                  )}
                                </div>
                                <span className={`text-xs font-medium ${String(m.id) === p.page_manager_id ? 'text-violet-400' : 'text-slate-300'}`}>{m.name}</span>
                                {String(m.id) === p.page_manager_id && <Check size={11} className="ml-auto text-violet-400" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Resultado */}
                    <td className="py-3 pr-4">
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{
                          background: ((p.projectResult && RESULT_COLORS[p.projectResult.toUpperCase()]) ? RESULT_COLORS[p.projectResult.toUpperCase()] : '#64748b') + '22',
                          color: (p.projectResult && RESULT_COLORS[p.projectResult.toUpperCase()]) ? RESULT_COLORS[p.projectResult.toUpperCase()] : '#94a3b8',
                        }}
                      >
                        {p.projectResult || '-'}
                      </span>
                    </td>

                    {/* Orçamento */}
                    <td className="py-3 pr-4 font-bold text-emerald-500 whitespace-nowrap">
                      {parseMoney(p.investment) > 0 ? fmtBRL(parseMoney(p.investment)) : '—'}
                    </td>

                    {/* Produtos */}
                    <td className="py-3 pr-4 text-slate-400">{(p.products || []).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
