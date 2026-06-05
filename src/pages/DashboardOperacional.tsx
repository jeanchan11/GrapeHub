import React, { useEffect, useState } from 'react';
import SplitHeadline from '../components/SplitHeadline';
import {
  Users, TrendingUp, DollarSign, AlertTriangle,
  CheckCircle, Cpu, RefreshCw, Clock, MessageSquare, X,
  ThumbsUp, Edit2, Trash2
} from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types  (matching real API response shape)
// ─────────────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  budget?: string;
  status?: string;
  platform?: string;
  aiService?: string;
  projectResult?: string;
}

interface ProjectRow {
  id: string;
  partner: string;
  product: string;
  status: string;
  roi: string;
  investment: string;
  responsible: string;
  lastUpdate: string;
  projectResult?: string;
  group?: string;
  page_id?: string;
  squad?: string;           // ← new field from DB
  activeClientId?: string;
  products?: Product[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
// Raw color map — keys normalized to lowercase for lookup
const RESULT_COLOR_MAP: Record<string, string> = {
  'resultado ok':           '#2ecc8f',
  'resultado ruim':         '#f74c4c',
  'resultado bom':          '#b84cf7',
  'campanha pausada':       '#f5c842',
  'testando':               '#4c8ef7',
  'aguardando criativos':   '#94a3b8',
  'aguardando artigo':      '#94a3b8',
  'aguardando lp':          '#94a3b8',
  'subir campanha':         '#f97316',
  '-':                      '#475569',
};

function getResultColor(label: string | undefined | null): string {
  if (!label) return '#475569';
  return RESULT_COLOR_MAP[label.toLowerCase()] || '#64748b';
}

// Keep backwards compat alias
const RESULT_COLORS: Record<string, string> = new Proxy({}, {
  get: (_t, k: string) => getResultColor(k),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function daysSince(p: ProjectRow): number {
  let maxTime = 0;

  // 1. Look for the latest date inside the project's optimizations history
  if (p.products && Array.isArray(p.products)) {
    for (const prod of p.products) {
      if ((prod as any).optimizations && Array.isArray((prod as any).optimizations)) {
        for (const opt of (prod as any).optimizations) {
          if (opt.date) {
            const match = opt.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (match) {
              const day = parseInt(match[1], 10);
              const month = parseInt(match[2], 10) - 1;
              const year = parseInt(match[3], 10);
              
              let h = 0, m = 0;
              if (opt.time) {
                const tm = opt.time.match(/(\d{2}):(\d{2})/);
                if (tm) {
                  h = parseInt(tm[1], 10);
                  m = parseInt(tm[2], 10);
                }
              }
              
              const optDate = new Date(year, month, day, h, m);
              if (!isNaN(optDate.getTime())) {
                maxTime = Math.max(maxTime, optDate.getTime());
              }
            }
          }
        }
      }
    }
  }

  // 2. Fallback to parsing p.lastUpdate if no optimizations were found
  if (p.lastUpdate && !p.lastUpdate.match(/atrás|min|h |hora|agora/i)) {
    const match = p.lastUpdate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        maxTime = Math.max(maxTime, d.getTime());
      }
    }
  }

  // Se não foi encontrada nenhuma data válida, consideramos que não há histórico e está crítico
  if (maxTime === 0) return 999;
  
  const diff = Date.now() - maxTime;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function parseMoney(val: string | null | undefined): number {
  if (!val) return 0;
  return parseFloat(val.replace(/[^\d,]/g, '').replace('.', '').replace(',', '.')) || 0;
}

function fmtBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI helpers
// ─────────────────────────────────────────────────────────────────────────────
function calcKPIs(projects: ProjectRow[]) {
  const totalAtivos = projects.filter(p =>
    ['Operacional', 'Ativo', 'ativo', 'active', 'Rodando'].includes(p.status)
  ).length;

  const resultadoRuim = projects.filter(p => p.projectResult?.toLowerCase() === 'resultado ruim').length;

  const investments = projects.map(p => {
    let total = parseMoney(p.investment);
    if (total <= 0 && p.products && p.products.length > 0) {
      total = p.products.reduce((acc, prod) => acc + parseMoney((prod as any).budget), 0);
    }
    return total;
  }).filter(n => n > 0);

  const orcamentoMedio = investments.length
    ? investments.reduce((a, b) => a + b, 0) / investments.length
    : 0;
  const orcamentoTotal = investments.reduce((a, b) => a + b, 0);

  const atrasados = projects.filter(p => daysSince(p) > 4).length;

  const slaBom = projects.filter(p =>
    p.projectResult?.toLowerCase() !== 'resultado ruim' && p.projectResult?.toLowerCase() !== 'campanha pausada'
  ).length;
  const slaPct = projects.length ? Math.round((slaBom / projects.length) * 100) : 0;

  const iaCount = projects.filter(p =>
    (p.products || []).some(prod =>
      (prod.aiService || '').toLowerCase().includes('ia') ||
      (prod.name || '').toLowerCase().includes('ia')
    ) || (p.group || '').toLowerCase().includes('ia')
  ).length;
  const iaPct = projects.length ? Math.round((iaCount / projects.length) * 100) : 0;

  return { totalAtivos, resultadoRuim, orcamentoMedio, orcamentoTotal, atrasados, slaPct, iaPct };
}

function groupByResult(projects: ProjectRow[]) {
  const counts: Record<string, number> = {};
  for (const p of projects) {
    const r = p.projectResult || '-';
    counts[r] = (counts[r] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count, color: getResultColor(label) }))
    .sort((a, b) => b.count - a.count);
}

function groupByResponsible(projects: ProjectRow[]) {
    const map: Record<string, {
      name: string; total: number; orcamento: number; ruim: number;
      results: Record<string, number>;
    }> = {};
    for (const p of projects) {
      const r = p.responsible || 'Sem responsável';
      if (!map[r]) map[r] = { name: r, total: 0, orcamento: 0, ruim: 0, results: {} };
      map[r].total++;
      
      let totalInvest = parseMoney(p.investment);
      if (totalInvest <= 0 && p.products && p.products.length > 0) {
        totalInvest = p.products.reduce((acc, prod) => acc + parseMoney((prod as any).budget), 0);
      }
      map[r].orcamento += totalInvest;
      
      if (p.projectResult?.toLowerCase() === 'resultado ruim') map[r].ruim++;
      const res = p.projectResult || '-';
      map[r].results[res] = (map[r].results[res] || 0) + 1;
    }
  return Object.values(map).sort((a, b) => b.total - a.total);
}

function getAtencaoList(projects: ProjectRow[]) {
  const isGargalo     = (p: ProjectRow) => (p.status || '').toLowerCase() === 'gargalo'      || (p.projectResult || '').toLowerCase() === 'gargalo';
  const isResultRuim  = (p: ProjectRow) => (p.projectResult || '').toLowerCase() === 'resultado ruim';
  const isTestando    = (p: ProjectRow) => (p.projectResult || '').toLowerCase() === 'testando';

  return projects
    .filter(p => isGargalo(p) || isResultRuim(p) || isTestando(p))
    .map(p => {
      let priority = 99;
      const alertas: string[] = [];
      if (isGargalo(p))    { priority = Math.min(priority, 0); alertas.push('Gargalo'); }
      if (isResultRuim(p)) { priority = Math.min(priority, 1); alertas.push('Resultado Ruim'); }
      if (isTestando(p))   { priority = Math.min(priority, 2); alertas.push('Testando'); }
      return { ...p, diasSemUpdate: 0, alerta: alertas.join(' · '), _priority: priority };
    })
    .sort((a, b) => (a as any)._priority - (b as any)._priority)
    .slice(0, 20);
}

function getCriticas(projects: ProjectRow[]) {
  return projects
    .filter(p => daysSince(p) > 4)
    .map(p => ({ ...p, diasSemUpdate: daysSince(p) }))
    .sort((a, b) => b.diasSemUpdate - a.diasSemUpdate)
    .slice(0, 15);
}

function getRecentComments(projects: ProjectRow[]) {
  const allComments: any[] = [];
  
  for (const p of projects) {
    if (p.products && Array.isArray(p.products)) {
      for (const prod of p.products) {
        if ((prod as any).optimizations && Array.isArray((prod as any).optimizations)) {
          for (const opt of (prod as any).optimizations) {
            if (opt.message) {
              let optDate = new Date(0);
              if (opt.date) {
                const match = opt.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                if (match) {
                  const day = parseInt(match[1], 10);
                  const month = parseInt(match[2], 10) - 1;
                  const year = parseInt(match[3], 10);
                  let h = 0, m = 0;
                  if (opt.time) {
                    const tm = opt.time.match(/(\d{2}):(\d{2})/);
                    if (tm) {
                      h = parseInt(tm[1], 10);
                      m = parseInt(tm[2], 10);
                    }
                  }
                  optDate = new Date(year, month, day, h, m);
                }
              }
              allComments.push({
                id: opt.id || Math.random().toString(),
                project: p,
                productName: prod.name,
                productId: prod.id,
                opt,
                time: optDate.getTime()
              });
            }
          }
        }
      }
    }
  }
  
  return allComments.sort((a, b) => b.time - a.time);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function KpiCard({ icon, iconBg, label, value, sub, extra }: {
  icon: React.ReactNode; iconBg: string; label: string;
  value: string; sub?: React.ReactNode; extra?: React.ReactNode;
}) {
  return (
    <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col gap-2 min-w-0 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      </div>
      <div className="text-2xl lg:text-3xl font-black text-dark-text leading-tight">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
      {extra}
    </div>
  );
}

function DonutChart({ data, onClick }: { data: { label: string; count: number; color: string }[], onClick?: (label: string) => void }) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
  const wrapRef = React.useRef<HTMLDivElement>(null);

  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
      <span className="text-3xl">📊</span>
      <span className="text-sm">Sem dados de resultado</span>
    </div>
  );

  const cx = 140; const cy = 140; const R = 120; const r = 82;
  let startAngle = -Math.PI / 2;

  const slices = data.map((d, idx) => {
    const angle = (d.count / total) * 2 * Math.PI;
    const ea = startAngle + angle;
    const x1 = cx + R * Math.cos(startAngle); const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(ea);         const y2 = cy + R * Math.sin(ea);
    const x3 = cx + r * Math.cos(ea);         const y3 = cy + r * Math.sin(ea);
    const x4 = cx + r * Math.cos(startAngle); const y4 = cy + r * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`;
    startAngle = ea;
    return { ...d, path, idx };
  });

  const hoveredSlice = hovered !== null ? slices[hovered] : null;
  const centerVal = hoveredSlice ? `${Math.round((hoveredSlice.count / total) * 100)}%` : String(total);
  const centerSub = hoveredSlice
    ? (hoveredSlice.label === '-' ? 'SEM RES.' : hoveredSlice.label.toUpperCase().replace('RESULTADO ', 'RES.').slice(0, 9))
    : 'PROJETOS';
  const centerFill = hoveredSlice ? hoveredSlice.color : 'white';

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="flex gap-8 items-center justify-between w-full h-full">
      {/* Donut SVG wrapped in relative div for tooltip positioning */}
      <div
        ref={wrapRef}
        className="relative flex items-center justify-center pl-2"
        style={{ width: 280, height: 280, flexShrink: 0 }}
        onMouseMove={handleMouseMove}
      >
        <svg width={280} height={280} viewBox="0 0 280 280" style={{ overflow: 'visible' }}>
          {slices.map((s) => (
            <path
              key={s.idx}
              d={s.path}
              fill={s.color}
              stroke={hovered === s.idx ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'}
              strokeWidth={hovered === s.idx ? 2 : 1.5}
              opacity={hovered === null || hovered === s.idx ? 1 : 0.35}
              style={{
                transform: hovered === s.idx ? 'scale(1.05)' : 'scale(1)',
                transformOrigin: `${cx}px ${cy}px`,
                transition: 'all 0.12s ease',
                cursor: 'pointer',
                filter: hovered === s.idx ? `drop-shadow(0 0 12px ${s.color}99)` : 'none',
              }}
              onMouseEnter={() => setHovered(s.idx)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {/* Center — updates on hover */}
          <text x={cx} y={cy - 6} textAnchor="middle" 
            fill={hoveredSlice ? hoveredSlice.color : undefined}
            className={hoveredSlice ? "" : "fill-slate-800 dark:fill-white"}
            fontSize={hovered !== null ? 32 : 36} fontWeight={900}
            style={{ transition: 'all 0.12s ease' }}>
            {centerVal}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" 
            fill={hovered !== null && hoveredSlice ? hoveredSlice.color + 'bb' : '#64748b'}
            fontSize={10} fontWeight={800} letterSpacing={1.5}
            style={{ transition: 'all 0.12s ease' }}>
            {centerSub}
          </text>
        </svg>

        {/* Flyout tooltip */}
        {hovered !== null && hoveredSlice && (
          <div
            className="pointer-events-none absolute z-50"
            style={{
              left: mousePos.x + 16,
              top: mousePos.y - 48,
              transform: mousePos.x > 140 ? 'translateX(-110%)' : undefined,
            }}
          >
            <div
              className="rounded-xl px-4 py-3 shadow-2xl border bg-white/95 dark:bg-[#0a0c14]/95 backdrop-blur-md"
              style={{
                borderColor: `${hoveredSlice.color}44`,
                boxShadow: `0 8px 32px ${hoveredSlice.color}33, 0 4px 12px rgba(0,0,0,0.1)`,
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: hoveredSlice.color, boxShadow: `0 0 8px ${hoveredSlice.color}` }} />
                <span className="text-sm font-bold text-slate-800 dark:text-white capitalize">
                  {hoveredSlice.label === '-' ? 'Sem resultado' : hoveredSlice.label.charAt(0) + hoveredSlice.label.slice(1).toLowerCase()}
                </span>
              </div>
              <div className="pl-5 flex items-center gap-2">
                <span className="text-base font-black" style={{ color: hoveredSlice.color }}>
                  {hoveredSlice.count}
                </span>
                <span className="text-xs text-slate-500">projetos</span>
                <span className="text-xs text-slate-600">·</span>
                <span className="text-[11px] font-bold text-slate-400">
                  {Math.round((hoveredSlice.count / total) * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="space-y-3 flex-1 min-w-0 h-full overflow-y-auto pr-1">
        {data.map((d, i) => (
          <div
            key={d.label}
            onClick={() => onClick && onClick(d.label)}
            className={`flex items-center gap-4 rounded-xl px-4 py-2.5 transition-all duration-100 border ${onClick ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}`}
            style={{
              background: hovered === i ? `${d.color}18` : undefined,
              borderColor: hovered === i ? d.color + '33' : 'transparent',
              opacity: hovered === null || hovered === i ? 1 : 0.4,
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className="w-3.5 h-3.5 rounded flex-shrink-0 transition-all"
              style={{
                background: d.color,
                boxShadow: hovered === i ? `0 0 12px ${d.color}99` : `0 0 4px ${d.color}44`,
              }}
            />
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <span className="text-sm font-bold text-dark-text capitalize truncate">
                {d.label === '-' ? 'Sem resultado' : d.label.charAt(0) + d.label.slice(1).toLowerCase()}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-800 dark:text-white">{d.count}</span>
                <span className="text-xs font-bold text-slate-500 min-w-[36px] text-right">
                  {Math.round((d.count / total) * 100)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function GestorBar({ results, total }: { results: Record<string, number>; total: number }) {
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full gap-px">
      {Object.entries(results).map(([label, count]) => (
        <div
          key={label}
          style={{ width: `${(count / total) * 100}%`, background: getResultColor(label) }}
          title={`${label}: ${count}`}
        />
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-dark-bg">
      <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );
}

const formatDateShort = (dateStr: string) => {
  if (!dateStr) return '';
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return dateStr;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const year = parseInt(match[3], 10);
  const d = new Date(year, month, day);
  const m = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
  return `${m} ${day}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardOperacional({ activePage = '', subsessionId }: { activePage?: string; subsessionId?: string | null }) {
  const parts = activePage.split('-');
  const squadNameRaw = parts[parts.length - 1] || 'able';
  const squadName = squadNameRaw.charAt(0).toUpperCase() + squadNameRaw.slice(1).toLowerCase();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [users, setUsers]       = useState<{name: string, picture: string, email: string}[]>([]);
  const [loading, setLoading]   = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [selectedGestor, setSelectedGestor] = useState<string | null>(null);
  const [selectedResultCategory, setSelectedResultCategory] = useState<string | null>(null);

  const { userData } = useAuth();
  const [replyingNoteId, setReplyingNoteId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteMessage, setEditingNoteMessage] = useState<string>('');

  const handleUpdateProject = async (updatedProject: ProjectRow) => {
    try {
      await fetch('/api/projects/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: [updatedProject] })
      });
      setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    } catch (e) {
      console.error('Failed to save project updates', e);
    }
  };

  const handleToggleLike = async (projectId: string, productId: string, optId: string) => {
    const userIdentifier = auth.currentUser?.email || userData?.name || 'user';
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const updatedProject = {
      ...project,
      products: project.products?.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            optimizations: (p as any).optimizations?.map((opt: any) => {
              if (opt.id === optId) {
                const currentLikes = opt.likes || [];
                const hasLiked = currentLikes.includes(userIdentifier);
                return {
                  ...opt,
                  likes: hasLiked
                    ? currentLikes.filter((id: string) => id !== userIdentifier)
                    : [...currentLikes, userIdentifier]
                };
              }
              return opt;
            })
          };
        }
        return p;
      })
    };
    
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
    await handleUpdateProject(updatedProject);
  };

  const handleSaveReply = async (projectId: string, productId: string, optId: string) => {
    if (!replyMessage.trim()) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newReply = {
      id: crypto.randomUUID(),
      author: userData?.name || auth.currentUser?.displayName || 'Usuário',
      authorPhoto: userData?.picture || auth.currentUser?.photoURL || '',
      message: replyMessage,
      date: new Date().toLocaleDateString('pt-BR'),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedProject = {
      ...project,
      products: project.products?.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            optimizations: (p as any).optimizations?.map((opt: any) => {
              if (opt.id === optId) {
                return { ...opt, replies: [...(opt.replies || []), newReply] };
              }
              return opt;
            })
          };
        }
        return p;
      })
    };
    
    setReplyingNoteId(null);
    setReplyMessage('');
    setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
    await handleUpdateProject(updatedProject);
  };

  const handleDeleteNote = async (projectId: string, productId: string, optId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta nota?')) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const updatedProject = {
      ...project,
      products: project.products?.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            optimizations: (p as any).optimizations?.filter((opt: any) => opt.id !== optId)
          };
        }
        return p;
      })
    };
    
    setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
    await handleUpdateProject(updatedProject);
  };

  const handleSaveEdit = async (projectId: string, productId: string, optId: string) => {
    if (!editingNoteMessage.trim()) return;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const editDateStr = `(Editado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`;
    const newMessage = `${editingNoteMessage}\n\n${editDateStr}`;

    const updatedProject = {
      ...project,
      products: project.products?.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            optimizations: (p as any).optimizations?.map((opt: any) => {
              if (opt.id === optId) {
                return { ...opt, message: newMessage };
              }
              return opt;
            })
          };
        }
        return p;
      })
    };
    
    setEditingNoteId(null);
    setEditingNoteMessage('');
    setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
    await handleUpdateProject(updatedProject);
  };

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setSpinning(true);
    setError(null);
    try {
      const [resProjects, resUsers] = await Promise.all([
        // Use subsession-aware endpoint when available, fallback to squad filter
        subsessionId
          ? fetch(`/api/projects/by-subsession/${encodeURIComponent(subsessionId)}`)
          : fetch('/api/projects'),
        fetch('/api/users')
      ]);
      
      if (!resProjects.ok) throw new Error('Falha ao buscar projetos');
      const all: ProjectRow[] = await resProjects.json();
      
      if (resUsers.ok) {
        const usersData = await resUsers.json();
        setUsers(usersData);
      }

      // When using by-subsession API, all projects are already filtered.
      // When using the fallback, filter by squad name.
      const relevant = subsessionId ? all : all.filter(p => p.squad === squadName);

      setProjects(relevant);
    } catch (e) {
      setError('Falha ao carregar dados.');
      console.error(e);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  };

  useEffect(() => { fetchData(); }, [squadName, subsessionId]);

  if (loading) return <Spinner />;

  const filteredProjects = selectedGestor 
    ? projects.filter(p => p.responsible === selectedGestor)
    : projects;

  const kpis     = calcKPIs(filteredProjects);
  const distrib  = groupByResult(filteredProjects);
  const gestoresList = groupByResponsible(projects); // Always from all projects so we show everyone in the filter
  const gestores = groupByResponsible(filteredProjects);
  const atencao  = getAtencaoList(filteredProjects);
  const criticas = getCriticas(filteredProjects);
  const recentComments = getRecentComments(filteredProjects);

  // Product summary
  const allProducts = filteredProjects.flatMap(p => p.products || []);
  const productResultDist = (() => {
    const counts: Record<string, number> = {};
    for (const prod of allProducts) {
      const r = prod.projectResult || prod.status || '-';
      counts[r] = (counts[r] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count, color: getResultColor(label) }))
      .sort((a, b) => b.count - a.count);
  })();

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4">
        <div>
          <SplitHeadline text="Dashboard " highlight="Operacional" className="text-2xl font-black tracking-tight text-dark-text" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            Visão geral de projetos · Squad {squadName}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          className={`w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:bg-dark-card-hover flex items-center justify-center transition-colors ${spinning ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={14} className="text-slate-400" />
        </button>
      </div>

      {/* ── Filtro de Gestores ─────────────────────────────────────────── */}
      <div className="px-6 md:px-8 pb-8 flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedGestor(null)}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all ${
            selectedGestor === null 
              ? 'bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/30 shadow-[0_0_15px_rgba(124,58,237,0.15)]' 
              : 'bg-white dark:bg-dark-card border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <Users size={14} />
          </div>
          <div className="text-left">
            <p className={`text-sm font-bold leading-tight ${selectedGestor === null ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300'}`}>Todos</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{projects.length} projetos</p>
          </div>
        </button>

        {gestoresList.map(g => {
          // Busca o user correspondente case-insensitive pelo nome ou tenta split
          const dbUser = users.find(u => 
            (u.name && u.name.toLowerCase() === g.name.toLowerCase()) || 
            (u.email && u.email.toLowerCase().includes(g.name.toLowerCase().split(' ')[0]))
          );
          
          return (
            <button
              key={g.name}
              onClick={() => setSelectedGestor(g.name)}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all ${
                selectedGestor === g.name 
                  ? 'bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/30 shadow-[0_0_15px_rgba(124,58,237,0.15)]' 
                  : 'bg-white dark:bg-dark-card border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                {dbUser?.picture ? (
                  <img src={dbUser.picture} alt={g.name} className="w-full h-full object-cover" />
                ) : (
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${g.name}`} alt={g.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="text-left">
                <p className={`text-sm font-bold leading-tight ${selectedGestor === g.name ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-white'}`}>
                  {dbUser?.name || g.name}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{g.total} projetos</p>
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mx-6 md:mx-8 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          ⚠ {error}
        </div>
      )}

      <div className="px-6 md:px-8 pb-10 space-y-5">
        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <KpiCard
            iconBg="bg-violet-500/15"
            icon={<Users size={17} className="text-violet-500" />}
            label="Projetos"
            value={String(filteredProjects.length)}
            sub={<span><span className="text-violet-400 font-bold">{kpis.totalAtivos}</span> operacionais</span>}
          />
          <KpiCard
            iconBg="bg-indigo-500/15"
            icon={<Cpu size={17} className="text-indigo-500" />}
            label="Produtos"
            value={String(allProducts.length)}
            sub={<span>em <span className="text-indigo-400 font-bold">{projects.length}</span> projetos</span>}
          />
          <KpiCard
            iconBg="bg-red-500/15"
            icon={<AlertTriangle size={17} className="text-red-500" />}
            label="Resultado Ruim"
            value={String(kpis.resultadoRuim)}
            sub={<span><span className="text-red-400 font-bold">{projects.length ? Math.round((kpis.resultadoRuim / projects.length) * 100) : 0}%</span> do total</span>}
          />
          <KpiCard
            iconBg="bg-emerald-500/15"
            icon={<DollarSign size={17} className="text-emerald-500" />}
            label="Investimento Diário"
            value={fmtBRL(kpis.orcamentoTotal / 30)}
            sub={<span>Mensal: <span className="text-emerald-400 font-bold">{fmtBRL(kpis.orcamentoTotal)}</span></span>}
          />
          <KpiCard
            iconBg="bg-amber-500/15"
            icon={<Clock size={17} className="text-amber-500" />}
            label="Sem Update +4d"
            value={String(kpis.atrasados)}
            sub={<span className="text-amber-500 font-bold">Projetos parados</span>}
          />
        </div>

        {/* ── Linha 2 & 3 — Comentários, Distribuição e Radar ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Histórico de Comentários */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col lg:row-span-2 lg:h-[780px] h-[380px]">
            <h2 className="text-sm font-bold text-dark-text mb-1">Últimos Comentários</h2>
            <p className="text-xs text-slate-500 mb-4 shrink-0">
              Histórico consolidado dos projetos
            </p>
            {recentComments.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-6">Nenhum comentário registrado 📝</div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-0">
                {recentComments.slice(0, 40).map(c => {
                  const dbUser = users.find(u => (u.name && u.name.toLowerCase() === c.opt.author?.toLowerCase()) || (u.email && u.email.toLowerCase().includes(c.opt.author?.toLowerCase()?.split(' ')[0] || '')));
                  return (
                    <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-300 dark:border-white/10">
                            {c.opt.authorPhoto ? (
                              <img src={c.opt.authorPhoto} alt={c.opt.author || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : dbUser?.picture ? (
                              <img src={dbUser.picture} alt={c.opt.author || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.opt.author}`} alt={c.opt.author || ''} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-dark-text leading-tight">{c.opt.author}</p>
                            <p className="text-[10px] text-slate-500">{c.project.partner} · {c.productName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-400">{formatDateShort(c.opt.date)}</p>
                            {c.opt.time && <p className="text-[9px] text-slate-500">{c.opt.time}</p>}
                          </div>
                          {(auth.currentUser?.email === c.opt.authorEmail || (userData?.name && c.opt.author?.toLowerCase() === userData?.name?.toLowerCase()) || (c.opt.author && auth.currentUser?.displayName && c.opt.author.toLowerCase() === auth.currentUser.displayName.toLowerCase()) || userData?.role === 'Admin') && (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingNoteId(c.opt.id); setEditingNoteMessage(c.opt.message.replace(/\n\n\(Editado em.*?\)/g, '')); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteNote(c.project.id, c.productId, c.opt.id); }}
                                className="text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {editingNoteId === c.opt.id ? (
                        <div className="flex flex-col gap-2 mt-2">
                          <textarea
                            value={editingNoteMessage}
                            onChange={(e) => setEditingNoteMessage(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none resize-none"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => { setEditingNoteId(null); setEditingNoteMessage(''); }}
                              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveEdit(c.project.id, c.productId, c.opt.id)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-black/20 p-2.5 rounded-lg border border-slate-200 dark:border-white/5 whitespace-pre-wrap shadow-sm dark:shadow-none">
                          {c.opt.message}
                        </p>
                      )}

                      {/* Replies */}
                      {c.opt.replies && c.opt.replies.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {c.opt.replies.map((reply: any) => (
                            <div key={reply.id} className="flex items-start gap-3 pl-4 border-l-2 border-slate-100 dark:border-white/5">
                              {reply.authorPhoto ? (
                                <img src={reply.authorPhoto} alt={reply.author} className="w-5 h-5 rounded-full object-cover mt-0.5" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 text-[10px] font-bold mt-0.5">
                                  {reply.author.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">{reply.author}</p>
                                  <p className="text-[10px] text-slate-500">{formatDateShort(reply.date)} às {reply.time}</p>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line">{reply.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {replyingNoteId === c.opt.id && (
                        <div className="mt-4 flex flex-col gap-2">
                          <textarea
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            placeholder="Escreva sua resposta..."
                            className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => { setReplyingNoteId(null); setReplyMessage(''); }}
                              className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveReply(c.project.id, c.productId, c.opt.id)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
                            >
                              Responder
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleLike(c.project.id, c.productId, c.opt.id); }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors border ${
                              c.opt.likes?.includes(auth.currentUser?.email || userData?.name || 'user')
                                ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white'
                                : 'text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                          >
                            {c.opt.likes?.includes(auth.currentUser?.email || userData?.name || 'user') ? (
                              <span>👍</span>
                            ) : (
                              <ThumbsUp size={14} />
                            )}
                            {(c.opt.likes?.length || 0) > 0 && <span>{c.opt.likes?.length}</span>}
                          </button>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setReplyingNoteId(c.opt.id); }}
                          className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                        >
                          Responder
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Distribuição de Resultados */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col h-[380px]">
            <h2 className="text-sm font-bold text-dark-text mb-1 shrink-0">Distribuição de Resultados</h2>
            <p className="text-xs text-slate-500 mb-4 shrink-0">Todos os projetos por resultado atual</p>
            <div className="flex-1 min-h-0">
              <DonutChart data={distrib} onClick={setSelectedResultCategory} />
            </div>
          </div>
          {/* Radar de Atenção */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col h-[380px]">
            <h2 className="text-sm font-bold text-dark-text mb-1 shrink-0">Radar de Atenção</h2>
            <p className="text-xs text-slate-500 mb-4 shrink-0">Projetos críticos ordenados por urgência</p>
            {atencao.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-10">Nenhum projeto crítico 🎉</div>
            ) : (
              <div className="flex-1 overflow-auto pr-1 min-h-0">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-dark-card z-10">
                    <tr className="border-b" style={{ borderColor: 'rgba(100,100,120,0.15)' }}>
                      {['Cliente', 'Gestor', 'Critério'].map(h => (
                        <th key={h} className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pb-2 pr-2 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {atencao.map(a => {
                      const dbUser = users.find(u => (u.name && u.name.toLowerCase() === a.responsible?.toLowerCase()) || (u.email && u.email.toLowerCase().includes(a.responsible?.toLowerCase()?.split(' ')[0] || '')));
                      return (
                      <tr key={a.id} className="border-b transition-colors hover:bg-slate-50 dark:hover:bg-white/5" style={{ borderColor: 'rgba(100,100,120,0.08)' }}>
                        <td className="py-2.5 pr-2 font-bold text-dark-text truncate max-w-[110px]">{a.partner}</td>
                        <td className="py-2.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-300 dark:border-white/10">
                              {dbUser?.picture ? (
                                <img src={dbUser.picture} alt={a.responsible || ''} className="w-full h-full object-cover" />
                              ) : (
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${a.responsible}`} alt={a.responsible || ''} className="w-full h-full object-cover" />
                              )}
                            </div>
                            <span className="text-slate-400 truncate max-w-[80px] text-xs">{a.responsible}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-2">
                          <div className="flex flex-wrap gap-1">
                            {(a.alerta || '').split(' · ').filter(Boolean).map(b => {
                              const colors: Record<string, { bg: string; color: string }> = {
                                'Gargalo':        { bg: '#f59e0b22', color: '#f59e0b' },
                                'Resultado Ruim': { bg: '#f74c4c22', color: '#f74c4c' },
                                'Testando':       { bg: '#4c8ef722', color: '#4c8ef7' },
                              };
                              const c = colors[b] || { bg: '#64748b22', color: '#94a3b8' };
                              return (
                                <span key={b} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap" style={{ background: c.bg, color: c.color }}>
                                  {b}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Linha 4 — Dist. Produtos + Tarefas Críticas ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Distribuição por resultado dos Produtos */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
            <h2 className="text-sm font-bold text-dark-text mb-1">Resultados por Produto</h2>
            <p className="text-xs text-slate-500 mb-4">{allProducts.length} produtos cadastrados</p>
            {productResultDist.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-10">Sem produtos cadastrados</p>
            ) : (
              <div className="space-y-3">
                {productResultDist.slice(0, 8).map(d => (
                  <div key={d.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-xs text-slate-400">{d.label}</span>
                      </div>
                      <span className="text-xs font-bold text-dark-text">{d.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(100,100,120,0.15)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(d.count / allProducts.length) * 100}%`,
                          background: d.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tarefas Críticas */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
            <h2 className="text-sm font-bold text-dark-text mb-1">Projetos Sem Update</h2>
            <p className="text-xs text-slate-500 mb-4">Mais de 4 dias sem atualização</p>
            {criticas.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-10">Todos atualizados ✅</div>
            ) : (
              <div className="space-y-2">
                {criticas.map(c => {
                  const dbUser = users.find(u => (u.name && u.name.toLowerCase() === c.responsible?.toLowerCase()) || (u.email && u.email.toLowerCase().includes(c.responsible?.toLowerCase()?.split(' ')[0] || '')));
                  return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-dark-text truncate">{c.partner}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-300 dark:border-white/10">
                          {dbUser?.picture ? (
                            <img src={dbUser.picture} alt={c.responsible || ''} className="w-full h-full object-cover" />
                          ) : (
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${c.responsible}`} alt={c.responsible || ''} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{c.responsible}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {c.projectResult && c.projectResult !== '-' && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: (getResultColor(c.projectResult) || '#64748b') + '22',
                            color: getResultColor(c.projectResult) || '#94a3b8',
                          }}
                        >
                          {c.projectResult}
                        </span>
                      )}
                      <span className={`flex-shrink-0 text-[11px] font-black px-2.5 py-1 rounded-full ${
                        c.diasSemUpdate > 14 ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {c.diasSemUpdate === 999 ? 'Sem histórico' : `${c.diasSemUpdate}d`}
                      </span>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center pt-2">
          {projects.length} projetos · {allProducts.length} produtos · Squad {squadName}
        </p>

      </div>

      {/* Result Category Modal */}
      {selectedResultCategory && (() => {
        const matchingProjects = filteredProjects.filter(p => {
          const res = p.projectResult || '-';
          return res.toLowerCase() === selectedResultCategory.toLowerCase();
        });
        const catColor = getResultColor(selectedResultCategory);

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedResultCategory(null)}>
            <div className="w-full max-w-2xl bg-dark-bg border border-dark-text/10 shadow-2xl rounded-3xl flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-dark-text/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ background: catColor, boxShadow: `0 0 10px ${catColor}` }} />
                  <div>
                    <h2 className="text-xl font-black text-dark-text capitalize">
                      {selectedResultCategory === '-' ? 'Sem resultado' : selectedResultCategory.charAt(0) + selectedResultCategory.slice(1).toLowerCase()}
                    </h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                      {matchingProjects.length} {matchingProjects.length === 1 ? 'projeto' : 'projetos'} com este resultado
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedResultCategory(null)}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {matchingProjects.length === 0 ? (
                  <div className="text-center text-slate-500 py-10 text-sm font-medium">Nenhum projeto encontrado.</div>
                ) : (
                  matchingProjects.map(p => {
                    const gest = users.find(u => (u.name && u.name.toLowerCase() === p.responsible?.toLowerCase()) || (u.email && u.email.toLowerCase().includes(p.responsible?.toLowerCase()?.split(' ')[0] || '')));
                    return (
                      <div key={p.id} className="bg-dark-card border border-white/5 hover:border-white/10 p-4 rounded-2xl flex items-center justify-between transition-all group">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-bold text-dark-text group-hover:text-violet-400 transition-colors truncate">{p.partner}</span>
                          <span className="text-xs text-slate-500 truncate">{p.product}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 pl-4">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Gestor</p>
                            <div className="flex items-center gap-1.5 justify-end">
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-800 shrink-0">
                                {gest?.picture ? <img src={gest.picture} alt="" className="w-full h-full object-cover" /> : null}
                              </div>
                              <span className="text-xs font-semibold text-slate-300">{gest?.name || p.responsible}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
