import React, { useEffect, useState } from 'react';

import SplitHeadline from '../components/SplitHeadline';
// Gráficos no desenho do painel de teste do GrapeCRM
import { Anel, BarrasPorCategoria, Cartao, CartaoKpi, DivisaoDoKpi, LinhaComBolinha, LinhaDoKpi, LinhasNoTempo } from '../components/graficos';
import { confirmDialog } from '@/src/lib/confirm';
import {
  Users, TrendingUp, DollarSign, AlertTriangle,
  CheckCircle, Cpu, RefreshCw, Clock, MessageSquare, X,
  ThumbsUp, Edit2, Trash2, Search, ShieldAlert, Calendar,
  LayoutDashboard, UserX, KeyRound, Layers
} from 'lucide-react';
// Abas de churn reaproveitadas do Consolidado (mesma implementação, sem duplicar código)
import { ChurnTab, RiscoDeChurnTab, type ChurnRow } from './OperacionalConsolidado';
import OperacionalAcoesTab from './OperacionalAcoesTab';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { EstadoVazio } from '../components/ui/EstadoVazio';
import { Abas } from '../components/ui/Abas';

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
  churnChecklist?: Record<string, boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
// Raw color map — keys normalized to lowercase for lookup
// Cores de status do padrão (18/11/2026): Ok = emerald-500 (#10b981) e Ruim = rose-500 (#f43f5e),
// as mesmas dos gráficos desta página e da aba Ações e Nichos.
const RESULT_COLOR_MAP: Record<string, string> = {
  'resultado ok':           '#10b981',
  'resultado ruim':         '#f43f5e',
  'resultado bom':          '#059669',   // emerald-600 — Bom é melhor que Ok (emerald-500)
  'campanha pausada':       '#f59e0b',
  'testando':               '#0ea5e9',
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

// Recorte da carteira pelo head selecionado nos botões do topo.
// Extraído para que o fetch da série histórica use exatamente o mesmo critério da tela.
function filterByGestor(projects: ProjectRow[], selectedGestor: string | null, isHeadsMode: boolean): ProjectRow[] {
  if (!selectedGestor) return projects;
  return isHeadsMode
    ? projects.filter(p => p.page_id === selectedGestor)   // heads: filtra pela página do head
    : projects.filter(p => p.responsible === selectedGestor);
}

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

const CountUp = ({ value, prefix = '', suffix = '', className = '', format = false }: { value: number; prefix?: string; suffix?: string; className?: string; format?: boolean }) => {
  const [display, setDisplay] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const animated = React.useRef(false);
  const shownRef = React.useRef(0);

  React.useEffect(() => {
    // Depois da 1ª contagem, troca de valor (ex.: outro head) anima do número atual até o novo.
    if (animated.current) {
      const de = shownRef.current, para = Math.round(value);
      if (de === para) return;
      const inicio = performance.now();
      let raf = 0;
      const passo = (agora: number) => {
        const t = Math.min((agora - inicio) / 600, 1);
        const v = Math.round(de + (para - de) * (1 - Math.pow(1 - t, 3)));
        shownRef.current = v; setDisplay(v);
        if (t < 1) raf = requestAnimationFrame(passo);
      };
      raf = requestAnimationFrame(passo);
      return () => cancelAnimationFrame(raf);
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const duration = 1000;
          const start = performance.now();
          const target = Math.round(value);
          const step = (now: number) => {
            const elapsed = now - start;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            shownRef.current = Math.round(eased * target); setDisplay(shownRef.current);
            if (t < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  const formattedStr = format ? display.toLocaleString('pt-BR') : display;

  return <span ref={ref} className={className}>{prefix}{formattedStr}{suffix}</span>;
};

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-dark-bg">
      <LoadingSpinner size="lg" />
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
export default function DashboardOperacional({ activePage = '', subsessionId: subsessionIdProp, mode = 'squad' }: { activePage?: string; subsessionId?: string | null; mode?: 'squad' | 'heads' | 'head' }) {
  const parts = activePage.split('-');
  const squadNameRaw = parts[parts.length - 1] || 'able';
  const squadName = squadNameRaw.charAt(0).toUpperCase() + squadNameRaw.slice(1).toLowerCase();
  const isHeadsMode = mode === 'heads';
  // Modo "head": mesmo dashboard, mas dedicado a um único head — a página já vive
  // dentro da subseção dele, então não há seletor de gestor.
  const isSingleHeadMode = mode === 'head';
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [heads, setHeads] = useState<{ name: string; picture: string | null }[]>([]); // Heads de Tráfego ativos (modo operação)
  const [headPages, setHeadPages] = useState<{ id: string; label: string }[]>([]); // páginas "Projetos X"
  const [retentionClientIds, setRetentionClientIds] = useState<string[]>([]); // ids de clientes ativos em Retenção
  const [briefingTasks, setBriefingTasks] = useState<{ responsible_name: string | null }[]>([]); // onboarding em briefing
  const [users, setUsers]       = useState<{name: string, picture: string, email: string}[]>([]);
  const [squadMembers, setSquadMembers] = useState<string[]>([]);
  const [resolvedSubsessionId, setResolvedSubsessionId] = useState<string | null>(subsessionIdProp ?? null);
  const [loading, setLoading]   = useState(true);
  const [spinning, setSpinning] = useState(false);
  // Abas Visão Geral / Risco de Churn / Churn — só no modo operação (heads)
  const [tab, setTab] = useState<'geral' | 'acoes' | 'risco' | 'churn' | 'tokens'>('geral');
  const [tokenErrors, setTokenErrors] = useState<any[]>([]);
  const [churns, setChurns] = useState<ChurnRow[]>([]);
  const [activeClientsCount, setActiveClientsCount] = useState(0);
  // ── Dados exclusivos do Dashboard Head ──
  const [meetSummary, setMeetSummary] = useState<Record<string, { last_date: string | null; last_30d: number }>>({});
  const [headChurns, setHeadChurns] = useState<any[]>([]);
  const [history, setHistory] = useState<{ date: string; total: number; bom: number; ok: number; ruim: number; testando: number; investimento: number }[]>([]);

  const findUser = (responsibleName: string | undefined | null) => {
    if (!responsibleName) return undefined;
    const normalize = (n: string) => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const normName = normalize(responsibleName);
    return users.find(u => {
      if (u.name && normalize(u.name) === normName) return true;
      if (u.email) {
        const prefix = u.email.toLowerCase().split('@')[0];
        if (normalize(prefix) === normName) return true;
      }
      return false;
    });
  };

  // Auto-resolve subsessionId from activePage when not provided as prop
  useEffect(() => {
    if (subsessionIdProp) {
      setResolvedSubsessionId(subsessionIdProp);
      return;
    }
    // Fetch subsession_id from DB for this page
    if (activePage) {
      fetch(`/api/menu/page-subsession/${encodeURIComponent(activePage)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.subsession_id) {
            setResolvedSubsessionId(data.subsession_id);
          }
        })
        .catch(() => {});
    }
  }, [activePage, subsessionIdProp]);
  const [error, setError]       = useState<string | null>(null);
  const [selectedGestor, setSelectedGestor] = useState<string | null>(null);
  const [selectedResultCategory, setSelectedResultCategory] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);

  const { userData } = useAuth();
  const [replyingNoteId, setReplyingNoteId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteMessage, setEditingNoteMessage] = useState<string>('');
  const [commentSearch, setCommentSearch] = useState('');

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
    if (!(await confirmDialog({ message: 'Tem certeza que deseja excluir esta nota?', danger: true }))) return;
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
      // Modo "heads" (operação inteira): ignora squad/subsessão, carrega TODOS os projetos.
      const useSubsession = !isHeadsMode && resolvedSubsessionId;
      const fetches: Promise<Response>[] = [
        useSubsession
          ? fetch(`/api/projects/by-subsession/${encodeURIComponent(resolvedSubsessionId!)}`)
          : fetch('/api/projects'),
        fetch('/api/users'),
      ];
      if (useSubsession) {
        fetches.push(fetch(`/api/squad-members/${encodeURIComponent(resolvedSubsessionId!)}`));
      } else if (isHeadsMode) {
        // Colaboradores (heads ativos) + páginas de projetos (atribuição por página)
        fetches.push(fetch('/api/collaborators'));
        fetches.push(fetch('/api/head-project-pages'));
      }

      const [resProjects, resUsers, resExtra, resPages] = await Promise.all(fetches);
      if (isHeadsMode && resPages && resPages.ok) {
        setHeadPages(await resPages.json());
      }

      if (!resProjects.ok) throw new Error('Falha ao buscar projetos');
      const all: ProjectRow[] = await resProjects.json();

      if (resUsers.ok) {
        const usersData = await resUsers.json();
        setUsers(usersData);
      }

      if (resExtra && resExtra.ok) {
        if (useSubsession) {
          setSquadMembers(await resExtra.json() as string[]);
        } else if (isHeadsMode) {
          const collabs: any[] = await resExtra.json();
          const activeStatuses = ['efetivado', 'ativo'];
          setHeads(
            collabs
              .filter(c => (c.role || '').toLowerCase() === 'head de tráfego' && activeStatuses.includes((c.status || '').toLowerCase()))
              .map(c => ({ name: c.name, picture: c.linked_picture || c.picture || null }))
          );
        }
      }

      // Modo heads: todos os projetos. Squad: por subsessão (já filtrado) ou por nome do squad.
      const relevant = isHeadsMode ? all : (resolvedSubsessionId ? all : all.filter(p => p.squad === squadName));

      setProjects(relevant);
    } catch (e) {
      setError('Falha ao carregar dados.');
      console.error(e);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  };

  useEffect(() => { fetchData(); }, [squadName, resolvedSubsessionId, isHeadsMode]);

  // Dados da aba "Churn" — carregados só quando a aba é aberta.
  useEffect(() => {
    if (tab !== 'churn' || churns.length > 0) return;
    let alive = true;
    Promise.all([fetch('/api/churn'), fetch('/api/clients')])
      .then(async ([chRes, cRes]) => {
        const ch = chRes.ok ? await chRes.json() : [];
        const cli = cRes.ok ? await cRes.json() : [];
        if (!alive) return;
        setChurns(Array.isArray(ch) ? ch : []);
        setActiveClientsCount(Array.isArray(cli) ? cli.filter((c: any) => c.status === 'Ativo').length : 0);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [tab, churns.length]);

  // Erros de token — carregados ao abrir a aba.
  useEffect(() => {
    if (tab !== 'tokens') return;
    let alive = true;
    fetch('/api/token-errors')
      .then(r => r.ok ? r.json() : [])
      .then(rows => { if (alive) setTokenErrors(Array.isArray(rows) ? rows : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [tab]);

  // Registra o snapshot de risco do dia (idempotente) ao abrir a aba de risco.
  useEffect(() => {
    if (tab === 'risco') { fetch('/api/churn-snapshots/capture', { method: 'POST' }).catch(() => {}); }
  }, [tab]);

  // ── Evolução da carteira, investimento e churn ──
  // Usado tanto no Dashboard Head quanto no Operacional. A série histórica é pedida
  // para a carteira JÁ recortada pelo head selecionado nos botões do topo, para o
  // gráfico acompanhar o filtro como o resto da página.
  useEffect(() => {
    if (projects.length === 0) return;
    let alive = true;
    const escopo = filterByGestor(projects, selectedGestor, isHeadsMode);
    const ids = escopo.map(p => p.id);
    if (ids.length === 0) { setHistory([]); return; }

    fetch('/api/meetings/by-project-summary')
      .then(r => r.ok ? r.json() : [])
      .then((rows: any[]) => {
        if (!alive) return;
        const map: Record<string, { last_date: string | null; last_30d: number }> = {};
        for (const r of rows || []) map[r.project_id] = { last_date: r.last_date, last_30d: Number(r.last_30d) || 0 };
        setMeetSummary(map);
      })
      .catch(() => {});

    fetch('/api/project-history', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectIds: ids, days: 90 }),
    })
      .then(r => r.ok ? r.json() : { series: [] })
      .then(d => { if (alive) setHistory(d.series || []); })
      .catch(() => {});

    fetch('/api/churn')
      .then(r => r.ok ? r.json() : [])
      .then(rows => { if (alive) setHeadChurns(Array.isArray(rows) ? rows : []); })
      .catch(() => {});

    return () => { alive = false; };
  }, [projects, selectedGestor, isHeadsMode]);

  // Contagem de clientes em Retenção (base completa) — mesma regra da página Clientes Ativos.
  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.ok ? r.json() : [])
      .then((cli: any[]) => {
        const ids = (Array.isArray(cli) ? cli : []).filter(c => {
          if ((c.status || '') !== 'Ativo') return false;
          let tags: any = c.tags;
          try { tags = Array.isArray(tags) ? tags : JSON.parse(tags || '[]'); } catch { tags = []; }
          return Array.isArray(tags) && tags.includes('quarentena');
        }).map(c => c.id);
        setRetentionClientIds(ids);
      })
      .catch(() => {});
  }, []);

  // Onboarding na etapa "Reunião - Briefing" (status_group briefing-realizado).
  useEffect(() => {
    fetch('/api/onboarding-tasks')
      .then(r => r.ok ? r.json() : [])
      .then((tasks: any[]) => {
        setBriefingTasks((Array.isArray(tasks) ? tasks : [])
          .filter(t => t.status_group === 'briefing-realizado')
          .map(t => ({ responsible_name: t.responsible_name || null })));
      })
      .catch(() => {});
  }, []);

  if (loading) return <Spinner />;

  const filteredProjects = filterByGestor(projects, selectedGestor, isHeadsMode);

  const kpis     = calcKPIs(filteredProjects);
  const distrib  = groupByResult(filteredProjects);
  const gestoresListAll = groupByResponsible(projects);
  // Casa nomes diferentes (ex.: "José Victor" no projeto vs "José Victor Batista da Silva" no cadastro):
  // os tokens do nome mais curto devem estar contidos no mais longo, e o primeiro nome bater.
  // Ignora sufixos (Jr/Junior/Filho…).
  const SUFFIX = new Set(['jr', 'junior', 'filho', 'neto', 'sobrinho', 'segundo', 'ii', 'iii']);
  const sigTokens = (n: string) => (n || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/).filter(t => t.length > 1 && !SUFFIX.has(t));
  const namesMatch = (a: string, b: string) => {
    const ta = sigTokens(a), tb = sigTokens(b);
    if (!ta.length || !tb.length) return false;
    const [small, large] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
    const largeSet = new Set(large);
    return small[0] === large[0] && small.every(t => largeSet.has(t));
  };
  // Modo heads: atribui os projetos pela PÁGINA "Projetos X" (page_id), não pelo responsible.
  // Casa cada head à sua página pelo rótulo ("Projetos Erick" → head Erick).
  const pageNameOf = (label: string) => (label || '').replace(/^projetos\s+/i, '').trim();
  const gestoresList = isHeadsMode
    ? heads.map(head => {
        const page = headPages.find(pg => namesMatch(head.name, pageNameOf(pg.label)));
        const total = page ? projects.filter(p => p.page_id === page.id).length : 0;
        return { name: page ? page.id : head.name, total, displayName: head.name, picture: head.picture } as any;
      })
    : (squadMembers.length > 0
        ? gestoresListAll.filter(g => squadMembers.some(m => m.toLowerCase() === g.name.toLowerCase()))
        : gestoresListAll);
  // Retenção e Onboarding respeitam o head selecionado (modo operação).
  // Head selecionado → nome (para casar onboarding) e page_id (para casar clientes via projeto).
  const selectedHeadName = isHeadsMode && selectedGestor
    ? ((gestoresList.find((g: any) => g.name === selectedGestor) as any)?.displayName || null)
    : null;
  const headClientIds = (isHeadsMode && selectedGestor)
    ? new Set(projects.filter(p => p.page_id === selectedGestor).map(p => (p as any).active_client_id).filter(Boolean))
    : null;
  const retentionShown = headClientIds
    ? retentionClientIds.filter(id => headClientIds.has(id)).length
    : retentionClientIds.length;
  const briefingShown = selectedHeadName
    ? briefingTasks.filter(t => namesMatch(t.responsible_name || '', selectedHeadName)).length
    : briefingTasks.length;

  const gestores = groupByResponsible(filteredProjects);
  const recentComments = getRecentComments(filteredProjects);
  const commentQuery = commentSearch.trim().toLowerCase();
  const filteredComments = commentQuery
    ? recentComments.filter(c =>
        `${c.project?.partner || ''} ${c.productName || ''} ${c.opt?.author || ''} ${c.opt?.message || ''}`
          .toLowerCase()
          .includes(commentQuery)
      )
    : recentComments;

  // Product summary
  const allProducts = filteredProjects.flatMap(p => p.products || []);

  // ══ Dashboard Head — métricas de desempenho ═════════════════════════════════
  const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim();

  // Nome do head = responsável mais frequente na carteira da página.
  const headName = (() => {
    const c: Record<string, number> = {};
    for (const p of projects) { const r = (p.responsible || '').trim(); if (r) c[r] = (c[r] || 0) + 1; }
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  })();

  // 1) Cadência de reuniões
  const DIAS_SEM_REUNIAO = 30;
  const meetRows = projects.map(p => {
    const s = meetSummary[p.id];
    const last = s?.last_date ? new Date(s.last_date + 'T12:00:00') : null;
    const dias = last ? Math.floor((Date.now() - last.getTime()) / 86400000) : null;
    return { p, last, dias, last30: s?.last_30d || 0 };
  });
  const comReuniao30 = meetRows.filter(r => r.last30 > 0).length;
  // Projetos parados: mais de 4 dias sem nenhuma otimização registrada.
  // daysSince devolve 999 quando o projeto não tem histórico nenhum.
  const semUpdate = filteredProjects
    .map(p => ({ p, dias: daysSince(p) }))
    .filter(({ dias }) => dias > 4)
    .sort((a, b) => b.dias - a.dias);

  const semReuniao = meetRows
    .filter(r => r.dias === null || r.dias > DIAS_SEM_REUNIAO)
    .sort((a, b) => (b.dias ?? 99999) - (a.dias ?? 99999));

  // 2) Evolução da carteira (90 dias)
  const histFirst = history[0];
  const histLast = history[history.length - 1];
  const pctSaudavel = (h?: typeof histFirst) => (h && h.total > 0 ? Math.round(((h.bom + h.ok) / h.total) * 100) : 0);
  const saudavelHoje = pctSaudavel(histLast);
  const saudavelAntes = pctSaudavel(histFirst);
  const saudavelDelta = saudavelHoje - saudavelAntes;

  // 3) Churn (campo `gestor` da planilha de churn)
  // Dashboard Head → sempre o head da página. Dashboard Operacional → o head selecionado
  // nos botões do topo; sem seleção ("Todos"), conta as saídas de toda a operação.
  const churnScopeName = isSingleHeadMode ? headName : selectedHeadName;
  const churnDoHead = churnScopeName
    ? headChurns.filter(c => {
        if (!c.gestor) return false;
        const g = norm(c.gestor), h = norm(churnScopeName);
        return g === h || g.startsWith(h) || h.startsWith(g);
      })
    : headChurns;
  const churn6m = churnDoHead.filter(c => c.day_exit && new Date(c.day_exit) >= new Date(Date.now() - 180 * 86400000));
  const parseMoney = (v: any) => Number(String(v ?? '').replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
  const evitaveis = churn6m.filter(c => norm(c.tipo).includes('evitavel') && !norm(c.tipo).includes('inevitavel')).length;
  // Só é ressalva quando há recorte por head — em "Todos" essas saídas já entram na conta.
  const churnSemGestor = churnScopeName
    ? headChurns.filter(c => !c.gestor && c.day_exit && new Date(c.day_exit) >= new Date(Date.now() - 180 * 86400000)).length
    : 0;

  // 4) Investimento sob gestão vs. início da série
  const investHoje = histLast?.investimento || 0;
  const investAntes = histFirst?.investimento || 0;
  const investDelta = investAntes > 0 ? Math.round(((investHoje - investAntes) / investAntes) * 100) : null;

  // ── Séries e recortes usados pelos gráficos (desenho do painel de teste do GrapeCRM) ──
  const rotuloDia = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  const ehPositivo = (r?: string) => ['resultado bom', 'resultado ok'].includes(String(r || '').toLowerCase());
  const positivosAgora = filteredProjects.filter(p => ehPositivo(p.projectResult)).length;
  const pctPositivoAgora = filteredProjects.length ? Math.round((positivosAgora / filteredProjects.length) * 100) : 0;
  const deltaPositivo = history.length >= 2 ? pctPositivoAgora - saudavelAntes : null;
  const pctRuim = filteredProjects.length ? Math.round((kpis.resultadoRuim / filteredProjects.length) * 100) : 0;
  const nomeResultado = (l: string) => (l === '-' ? 'Sem resultado' : l.charAt(0) + l.slice(1).toLowerCase());
  const segmentosResultado = distrib.map(d => ({ rotulo: nomeResultado(d.label), valor: d.count, cor: d.color, chave: d.label }));
  const pctReuniao = Math.round((comReuniao30 / Math.max(projects.length, 1)) * 100);

  // Status da carteira (Rodando, Gargalo…) — barra dividida do cartão Projetos
  const statusCarteira = (() => {
    const cont: Record<string, number> = {};
    for (const p of filteredProjects) { const st = p.status || 'Sem status'; cont[st] = (cont[st] || 0) + 1; }
    const corStatus: Record<string, string> = { Rodando: 'rgb(var(--accent-color))', Gargalo: '#f59e0b' };
    return Object.entries(cont)
      .sort((a, b) => b[1] - a[1])
      .map(([rotulo, valor]) => ({ rotulo, valor, cor: corStatus[rotulo] || '#94a3b8' }));
  })();
  const deltaRuim = history.length >= 2 ? kpis.resultadoRuim - histFirst.ruim : null;

  // Indicadores do topo — os mesmos nos três modos (squad, operação, head)
  const renderIndicadores = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <CartaoKpi
        titulo="Projetos"
        pilula={`${kpis.totalAtivos} operacionais`}
        valor={<CountUp value={filteredProjects.length} />}
        apoio="Situação da carteira hoje"
        visual={<DivisaoDoKpi partes={statusCarteira} />}
      />
      <CartaoKpi
        titulo="Resultado positivo"
        pilula="Bom + Ok"
        valor={<CountUp value={pctPositivoAgora} suffix="%" />}
        apoio={deltaPositivo === null
          ? `${positivosAgora} de ${filteredProjects.length} projetos`
          : <span>{positivosAgora} projetos · <span className={deltaPositivo > 0 ? 'text-emerald-500' : deltaPositivo < 0 ? 'text-rose-500' : ''}>{deltaPositivo > 0 ? '+' : ''}{deltaPositivo} p.p. em {history.length} dias</span></span>}
        visual={<LinhaDoKpi id="positivo" cor="#10b981" valores={history.map(h => (h.total > 0 ? Math.round(((h.bom + h.ok) / h.total) * 100) : null))} rotulos={history.map(h => rotuloDia(h.date))} formato={v => `${v}%`} />}
      />
      <CartaoKpi
        titulo="Resultado ruim"
        pilula={`${pctRuim}% da carteira`}
        alerta={pctRuim >= 30}
        valor={<CountUp value={kpis.resultadoRuim} />}
        apoio={deltaRuim === null
          ? 'Projetos em Resultado Ruim'
          : <span>Projetos em Resultado Ruim · <span className={deltaRuim > 0 ? 'text-rose-500' : deltaRuim < 0 ? 'text-emerald-500' : ''}>{deltaRuim > 0 ? '+' : ''}{deltaRuim} em {history.length} dias</span></span>}
        visual={<LinhaDoKpi id="ruim" cor="#f43f5e" valores={history.map(h => h.ruim)} rotulos={history.map(h => rotuloDia(h.date))} formato={v => `${v} projetos`} />}
      />
      <CartaoKpi
        titulo="Investimento sob gestão"
        pilula={`${fmtBRL(kpis.orcamentoTotal / 30)}/dia`}
        valor={<CountUp value={kpis.orcamentoTotal} prefix="R$ " format />}
        apoio={history.length >= 2 && investDelta !== null
          ? <span className={investDelta > 0 ? 'text-emerald-500' : investDelta < 0 ? 'text-rose-500' : ''}>{investDelta > 0 ? '+' : ''}{investDelta}% desde {rotuloDia(histFirst.date)}</span>
          : 'Verba mensal somada da carteira'}
        visual={<LinhaDoKpi id="invest" valores={history.map(h => h.investimento || null)} rotulos={history.map(h => rotuloDia(h.date))} formato={fmtBRL} />}
      />
    </div>
  );

  // Evolução da carteira (90 dias) — % de Bom+Ok, Ruim e Outros dia a dia, já recortada pelo head
  const renderEvolucao = (className: string) => {
    const pct = (q: number, t: number) => (t > 0 ? Math.round((q / t) * 100) : 0);
    const outros = (h: typeof histFirst) => Math.max(0, h.total - h.bom - h.ok - h.ruim);
    return (
      <Cartao
        titulo="Evolução da carteira"
        legenda={`% de projetos por resultado · últimos ${Math.max(history.length, 1)} dias`}
        className={className}
      >
        {history.length < 2 ? (
          <p className="py-10 text-center text-[12.5px] text-slate-500">A série começa a partir de hoje — volte em alguns dias para ver a evolução.</p>
        ) : (
          <div className="h-[300px]">
            <LinhasNoTempo
              id="evolucao"
              rotulos={history.map(h => rotuloDia(h.date))}
              series={[
                { rotulo: 'Bom + Ok', cor: '#10b981', valores: history.map(h => pct(h.bom + h.ok, h.total)), detalhe: i => `${history[i].bom + history[i].ok} de ${history[i].total}` },
                { rotulo: 'Ruim', cor: '#f43f5e', valores: history.map(h => pct(h.ruim, h.total)), detalhe: i => `${history[i].ruim} de ${history[i].total}` },
                { rotulo: 'Outros', cor: '#94a3b8', valores: history.map(h => pct(outros(h), h.total)), detalhe: i => `${outros(history[i])} de ${history[i].total}` },
              ]}
            />
          </div>
        )}
      </Cartao>
    );
  };

  // Distribuição de resultados — o anel abre a lista de projetos do resultado clicado
  const renderDistribuicao = (className: string) => (
    <Cartao titulo="Distribuição de resultados" legenda="Clique num resultado para ver os projetos" className={className}>
      {segmentosResultado.length === 0 ? (
        <p className="py-10 text-center text-[12.5px] text-slate-500">Sem dados de resultado.</p>
      ) : (
        <div className="h-[240px]">
          <Anel segmentos={segmentosResultado} centro={filteredProjects.length} legendaDoCentro="projetos" aoClicar={setSelectedResultCategory} />
        </div>
      )}
    </Cartao>
  );

  // Churn dos últimos 6 meses — só no Dashboard Head
  const renderChurnHead = (className: string) => (
    <Cartao
      titulo="Churn nos últimos 6 meses"
      legenda={churnScopeName ? `Saídas atribuídas a ${churnScopeName} na planilha de churn` : 'Saídas de toda a operação na planilha de churn'}
      className={className}
    >
      <div className="grid grid-cols-2 gap-3 shrink-0">
        <div className="rounded-2xl bg-rose-500/[0.06] px-4 py-3">
          <p className="text-[12px] text-slate-500 dark:text-slate-400">Clientes perdidos</p>
          <p className="numero mt-1 text-[30px] leading-none text-rose-500">{churn6m.length}</p>
        </div>
        <div className="rounded-2xl bg-amber-500/[0.07] px-4 py-3">
          <p className="text-[12px] text-slate-500 dark:text-slate-400">Evitáveis</p>
          <p className="numero mt-1 text-[30px] leading-none text-amber-500">{evitaveis}<span className="text-[14px] text-slate-400"> de {churn6m.length}</span></p>
        </div>
      </div>
      {churn6m.length > 0 && (
        <div className="-mx-2.5 mt-3 min-h-0 flex-1 overflow-y-auto custom-scrollbar">
          {churn6m.map((c: any, i: number) => (
            <LinhaComBolinha
              key={c.id || i}
              cor="#f43f5e"
              titulo={c.cliente}
              detalhe={c.motivo || undefined}
              valor={c.day_exit ? new Date(c.day_exit).toLocaleDateString('pt-BR') : ''}
            />
          ))}
        </div>
      )}
      {churnSemGestor > 0 && (
        <p className="text-[11.5px] text-amber-500 mt-3 border-t border-slate-100 dark:border-white/5 pt-3 shrink-0">
          {churnSemGestor} saída(s) no período estão sem gestor preenchido na planilha e não entram nesta conta.
        </p>
      )}
    </Cartao>
  );

  // Parceiros Sem Atualização, sempre ao lado dos Últimos Comentários. A lista rola por dentro.
  const renderSemUpdate = (altura: string) => (
    <Cartao
      titulo="Parceiros sem atualização"
      legenda={semUpdate.length === 0 ? 'Mais de 4 dias sem otimização registrada' : `${semUpdate.length} projeto(s) há mais de 4 dias sem otimização`}
      acao={semUpdate.length > 0 ? <span className="pilula-cartao pilula-cartao--alerta">{semUpdate.length}</span> : undefined}
      className={altura}
    >
      {semUpdate.length === 0 ? (
        <p className="text-[12.5px] text-emerald-500 py-6 text-center">Toda a carteira atualizada.</p>
      ) : (
        <>
          {/* Gravidade: quanto tempo sem otimização */}
          <div className="mb-3 shrink-0">
            <DivisaoDoKpi partes={[
              { rotulo: 'Mais de 14 dias', valor: semUpdate.filter(x => x.dias !== 999 && x.dias > 14).length, cor: '#f43f5e' },
              { rotulo: '5 a 14 dias', valor: semUpdate.filter(x => x.dias <= 14).length, cor: '#f59e0b' },
              { rotulo: 'Sem histórico', valor: semUpdate.filter(x => x.dias === 999).length, cor: '#94a3b8' },
            ]} />
          </div>
          <div className="-mx-2.5 min-h-0 flex-1 overflow-y-auto custom-scrollbar">
            {semUpdate.map(({ p, dias }) => {
              const cor = dias === 999 ? '#94a3b8' : dias > 14 ? '#f43f5e' : '#f59e0b';
              return (
                <LinhaComBolinha
                  key={p.id}
                  cor={cor}
                  titulo={p.partner}
                  dica={p.partner}
                  detalhe={[p.responsible, p.projectResult && p.projectResult !== '-' ? nomeResultado(p.projectResult) : null].filter(Boolean).join(' · ') || undefined}
                  valor={dias === 999 ? 'sem histórico' : `${dias} dias`}
                  valorEmPilula
                  onClick={() => setSelectedProject(p)}
                />
              );
            })}
          </div>
        </>
      )}
    </Cartao>
  );

  const renderComentariosEInvestimento = () => (
    <>
    {/* ── Parceiros Sem Atualização + Últimos Comentários, lado a lado ─────────────── */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {renderSemUpdate('h-[420px] lg:h-[640px]')}

      {/* Histórico de Comentários */}
      <Cartao titulo="Últimos comentários" legenda="Histórico consolidado dos projetos" className="h-[420px] lg:h-[640px]">
        {/* Busca dentro do histórico de comentários */}
        <div className="relative mb-4 shrink-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value={commentSearch}
            onChange={e => setCommentSearch(e.target.value)}
            placeholder="Buscar por parceiro, otimização, autor..."
            className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-dark-text placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          {commentSearch && (
            <button onClick={() => setCommentSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-dark-text transition-colors" title="Limpar busca">
              <X size={13} />
            </button>
          )}
        </div>
        {filteredComments.length === 0 ? (
          <EstadoVazio Icone={commentQuery ? Search : MessageSquare} titulo={commentQuery ? 'Nenhum comentário encontrado' : 'Nenhum comentário registrado'} className="py-6" />
        ) : (
          <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-0">
            {(commentQuery ? filteredComments : filteredComments.slice(0, 40)).map((c, idx) => {
              const dbUser = findUser(c.opt.author);
              return (
                <div 
                  key={c.id} 
                  className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors"
                  style={{ animation: 'rowFadeIn 0.3s ease both', animationDelay: `${Math.min(idx, 8) * 0.04}s` }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-200 dark:bg-dark-card shrink-0 border border-slate-300 dark:border-white/10">
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
                      {(auth.currentUser?.email === c.opt.authorEmail || (userData?.name && c.opt.author?.toLowerCase() === userData?.name?.toLowerCase()) || (c.opt.author && auth.currentUser?.displayName && c.opt.author.toLowerCase() === auth.currentUser.displayName.toLowerCase()) || (userData?.role as string) === 'Admin') && (
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
                          className="px-3 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors"
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
                          className="px-3 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors"
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
                          <ThumbsUp size={14} fill="currentColor" className="text-violet-500" />
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
      </Cartao>
    </div>
    </>
  );

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">
      <style>{`
        @keyframes rowFadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4">
        <div>
          <SplitHeadline text="Dashboard " highlight={isSingleHeadMode ? 'Head' : 'Operacional'} />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            {isSingleHeadMode
              ? 'Visão geral de projetos'
              : isHeadsMode ? 'Visão geral de projetos · Operação' : `Visão geral de projetos · Squad ${squadName}`}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          title="Atualizar"
          className="w-9 h-9 rounded-xl bg-dark-card border border-black/10 dark:border-white/10 hover:bg-dark-card-hover flex items-center justify-center transition-colors"
        >
          <RefreshCw size={14} className={`text-slate-400 ${spinning ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Abas: Visão Geral / Risco de Churn / Churn (modo operação) ──── */}
      {isHeadsMode && (
        <div className="px-6 md:px-8">
          <Abas
            abas={[
              { id: 'geral', rotulo: 'Visão Geral', Icone: LayoutDashboard },
              { id: 'acoes', rotulo: 'Ações e Nichos', Icone: Layers },
              { id: 'risco', rotulo: 'Risco de Churn', Icone: ShieldAlert },
              { id: 'churn', rotulo: 'Churn', Icone: UserX },
              { id: 'tokens', rotulo: 'Erros de Token', Icone: KeyRound },
            ]}
            ativa={tab}
            onChange={(id) => setTab(id as typeof tab)}
          />
        </div>
      )}

      {/* Filtro de gestores — oculto no modo "head" (a página já é de um head só) */}
      {!isSingleHeadMode && tab === 'geral' && (<>
      {/* ── Filtro de Gestores ─────────────────────────────────────────── */}
      {/* pt-6 com abas: mesmo respiro das outras abas (Ações, Risco, Tokens) abaixo da linha */}
      <div className={`px-6 md:px-8 pb-8 flex flex-wrap gap-3 ${isHeadsMode ? 'pt-6' : ''}`}>
        <button
          onClick={() => setSelectedGestor(null)}
          className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all ${
            selectedGestor === null 
              ? 'bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/30 shadow-[0_0_15px_rgba(124,58,237,0.15)]' 
              : 'bg-white dark:bg-dark-card border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-dark-card flex items-center justify-center text-slate-500 dark:text-slate-400">
            <Users size={14} />
          </div>
          <div className="text-left">
            <p className={`text-sm font-bold leading-tight ${selectedGestor === null ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300'}`}>Todos</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">{projects.length} projetos</p>
          </div>
        </button>

        {gestoresList.map(g => {
          const disp = (g as any).displayName || g.name;
          const firstName = String(disp).trim().split(/\s+/)[0];
          const dbUser = findUser(disp) || findUser(g.name);
          const avatar = (g as any).picture || dbUser?.picture || null;

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
              <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-100 dark:bg-dark-card flex items-center justify-center shrink-0">
                {avatar ? (
                  <img src={avatar} alt={firstName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${disp}`} alt={firstName} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="text-left">
                <p className={`text-sm font-bold leading-tight ${selectedGestor === g.name ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-white'}`}>
                  {firstName}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{g.total} projetos</p>
              </div>
            </button>
          );
        })}
      </div>
      </>)}
      {/* Sem o filtro, mantém o respiro entre o cabeçalho e os cards */}
      {isSingleHeadMode && <div className="pb-4" />}

      {error && (
        <div className="mx-6 md:mx-8 mb-4 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-500 dark:text-rose-400 text-sm flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" /> {error}
        </div>
      )}

      {/* Conteúdo das abas de churn (reaproveitadas do Consolidado) */}
      {isHeadsMode && tab === 'risco' && (
        <div className="px-6 md:px-8 pb-10 pt-6">
          <RiscoDeChurnTab
            projects={projects as any}
            heads={gestoresList.map((g: any) => ({ id: g.name, name: g.displayName || g.name, picture: g.picture }))}
          />
        </div>
      )}
      {isHeadsMode && tab === 'churn' && (
        <div className="px-6 md:px-8 pb-10 pt-6"><ChurnTab churns={churns} activeCount={activeClientsCount} /></div>
      )}

      {/* ── Ações e Nichos — cruza o catálogo de ações com o que os parceiros rodam ── */}
      {isHeadsMode && tab === 'acoes' && (
        <div className="px-6 md:px-8 pb-10 pt-6">
          <OperacionalAcoesTab />
        </div>
      )}

      {/* ── Erros de Token — centraliza as contas com credencial quebrada ── */}
      {isHeadsMode && tab === 'tokens' && (
        <div className="px-6 md:px-8 pb-10 pt-6 space-y-5">
          {(() => {
            const comErro = tokenErrors.filter(t => String(t.status) === 'error');
            const reauth = tokenErrors.filter(t => String(t.status) === 'pending_reauth');
            const porPlataforma = tokenErrors.reduce((acc: Record<string, number>, t) => {
              const k = t.platform === 'meta_ads' ? 'Meta Ads' : (t.platform || 'Outro');
              acc[k] = (acc[k] || 0) + 1; return acc;
            }, {});
            return (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <CartaoKpi titulo="Com erro" alerta={comErro.length > 0} valor={comErro.length} apoio="Coleta de dados parada" />
                  <CartaoKpi titulo="Reautenticar" valor={reauth.length} apoio="Token pedindo novo login" />
                  {Object.entries(porPlataforma).slice(0, 2).map(([k, v]) => (
                    <CartaoKpi key={k} titulo={k} valor={v as number} apoio="Contas com problema" />
                  ))}
                </div>

                <Cartao titulo="Tokens com problema" legenda="Contas cujo token parou de funcionar — a coleta de dados está parada nelas.">

                  {tokenErrors.length === 0 ? (
                    <p className="text-[12.5px] text-emerald-500 text-center py-10">Nenhum token com erro.</p>
                  ) : (
                    <div className="-mx-2.5">
                      {tokenErrors.map(t => {
                        const isErro = String(t.status) === 'error';
                        const cor = isErro ? '#f43f5e' : '#f59e0b';
                        const quando = t.last_synced_at
                          ? new Date(t.last_synced_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : 'sem sincronização';
                        return (
                          <div key={t.id} className="gf-item flex items-start gap-3 rounded-xl border-t border-slate-200/70 px-2.5 py-3 first:border-t-0 hover:bg-violet-500/5 dark:border-white/5">
                            <i className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cor, boxShadow: `0 0 0 4px color-mix(in srgb, ${cor} 18%, transparent)` }} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-[13.5px] font-medium text-dark-text">{t.partner || t.project_id || '—'}</p>
                                <span className="pilula-cartao">{t.platform === 'meta_ads' ? 'Meta Ads' : (t.platform || 'outro')}</span>
                              </div>
                              <p className="mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                                {[t.account_name, t.responsible, `última coleta ${quando}`].filter(Boolean).join(' · ')}
                              </p>
                              {t.last_error && (
                                <p className="mt-2 line-clamp-2 rounded-lg bg-rose-500/[0.06] px-2.5 py-1.5 font-mono text-[11px] leading-snug text-rose-500 dark:text-rose-400">{t.last_error}</p>
                              )}
                            </div>
                            <span className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium" style={{ color: cor, background: `color-mix(in srgb, ${cor} 12%, transparent)` }}>
                              {isErro ? 'Erro' : 'Reautenticar'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Cartao>
              </>
            );
          })()}
        </div>
      )}

      {/* Visão Geral — escondida (não desmontada) ao trocar de aba, preservando o estado */}
      <div className={`px-6 md:px-8 pb-10 space-y-5 ${tab !== 'geral' ? 'hidden' : ''}`}>
        {renderIndicadores()}

        {!isSingleHeadMode && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {renderEvolucao('lg:col-span-7')}
            {renderDistribuicao('lg:col-span-5')}
          </div>
        )}

        {!isSingleHeadMode && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Carteira por head (operação) ou por gestor (squad) — clicar filtra a tela */}
            <Cartao
              titulo={isHeadsMode ? 'Carteira por head' : 'Carteira por gestor'}
              legenda={selectedGestor ? 'Clique de novo para voltar a todos' : 'Clique numa barra para filtrar a tela'}
              className="lg:col-span-8"
            >
              <div className="h-[220px]">
                <BarrasPorCategoria
                  itens={[...gestoresList]
                    .sort((x: any, y: any) => y.total - x.total)
                    .map((g: any) => ({ rotulo: String(g.displayName || g.name).trim().split(/\s+/)[0], valor: g.total, chave: g.name }))}
                  unidade="projetos"
                  limite={8}
                  aoClicar={chave => setSelectedGestor(selectedGestor === chave ? null : chave)}
                />
              </div>
            </Cartao>

            {/* Retenção e Onboarding são leituras da operação inteira — fora do Dashboard Head */}
            <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <CartaoKpi
                titulo="Retenção"
                pilula="clientes"
                alerta={retentionShown > 0}
                valor={<CountUp value={retentionShown} />}
                apoio="Clientes ativos em retenção"
              />
              <CartaoKpi
                titulo="Onboarding"
                pilula="briefing"
                valor={<CountUp value={briefingShown} />}
                apoio="Em reunião de briefing"
              />
            </div>
          </div>
        )}

        {!isSingleHeadMode && renderComentariosEInvestimento()}

        {/* ════ Desempenho do Head — blocos exclusivos do Dashboard Head ════ */}
        {isSingleHeadMode && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {renderEvolucao('lg:col-span-7')}
              {renderDistribuicao('lg:col-span-5')}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <CartaoKpi
                className="lg:col-span-12"
                titulo="Cadência de reuniões"
                pilula={`${pctReuniao}% da carteira`}
                alerta={pctReuniao < 50}
                valor={<span>{comReuniao30}<span className="text-[20px] text-slate-400"> / {projects.length}</span></span>}
                apoio="Clientes com reunião nos últimos 30 dias"
                visual={
                  <DivisaoDoKpi partes={[
                    { rotulo: 'Com reunião', valor: comReuniao30, cor: '#10b981' },
                    { rotulo: 'Sem reunião', valor: Math.max(0, projects.length - comReuniao30), cor: 'rgb(var(--accent-color) / .25)' },
                  ]} />
                }
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <Cartao
                titulo={`Sem reunião há mais de ${DIAS_SEM_REUNIAO} dias`}
                legenda={`${semReuniao.length} cliente(s) precisando de contato`}
                className="lg:col-span-7 max-h-[420px]"
              >
                {semReuniao.length === 0 ? (
                  <p className="text-[12.5px] text-emerald-500 py-6 text-center">Toda a carteira teve reunião recente.</p>
                ) : (
                  <div className="-mx-2.5 min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                    {semReuniao.map(({ p, dias }) => (
                      <LinhaComBolinha
                        key={p.id}
                        cor={dias === null ? '#94a3b8' : dias > 60 ? '#f43f5e' : '#f59e0b'}
                        titulo={p.partner}
                        valor={dias === null ? 'sem registro' : `${dias} dias`}
                        valorEmPilula
                        onClick={() => setSelectedProject(p)}
                      />
                    ))}
                  </div>
                )}
              </Cartao>
              {renderChurnHead('lg:col-span-5 max-h-[420px]')}
            </div>

            {/* Comentários e parceiros sem atualização fecham o Dashboard Head */}
            {renderComentariosEInvestimento()}
          </>
        )}

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
          <Modal isOpen onClose={() => setSelectedResultCategory(null)} semCabecalho semPadding maxWidth="max-w-2xl">
            <div className="w-full flex flex-col max-h-[85vh] overflow-hidden">
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
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {matchingProjects.length === 0 ? (
                  <EstadoVazio titulo="Nenhum projeto encontrado." className="py-10" />
                ) : (
                  matchingProjects.map(p => {
                    const gest = findUser(p.responsible);
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProject(p)}
                        className="bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-violet-500/30 p-4 rounded-2xl flex items-center justify-between transition-colors group cursor-pointer"
                        title="Ver detalhes do projeto"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-bold text-dark-text group-hover:text-violet-400 transition-colors truncate">{p.partner}</span>
                          <span className="text-xs text-slate-500 truncate">{p.product}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0 pl-4">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Gestor</p>
                            <div className="flex items-center gap-1.5 justify-end">
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0">
                                {gest?.picture ? <img src={gest.picture} alt="" className="w-full h-full object-cover" /> : null}
                              </div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{gest?.name || p.responsible}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ── Popup de detalhe do projeto (análise de parceiro) ── */}
      {selectedProject && (() => {
        const p = selectedProject;
        const gest = findUser(p.responsible);
        const resColor = getResultColor(p.projectResult);
        const prods = Array.isArray(p.products) ? p.products : [];
        // Coleta as otimizações/comentários do projeto
        const opts: any[] = [];
        for (const prod of prods) {
          const list = (prod as any).optimizations;
          if (Array.isArray(list)) {
            for (const o of list) {
              if (o?.message) opts.push({ ...o, productName: prod.name });
            }
          }
        }
        opts.sort((a, b) => {
          const da = (a.date || '').split('/').reverse().join('') + (a.time || '');
          const db = (b.date || '').split('/').reverse().join('') + (b.time || '');
          return db.localeCompare(da);
        });
        const recentOpts = opts.slice(0, 6);

        return (
          <Modal isOpen onClose={() => setSelectedProject(null)} semCabecalho semPadding maxWidth="max-w-2xl">
            <div className="w-full flex flex-col max-h-[88vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-dark-text/5 shrink-0">
                <div className="min-w-0 pr-4">
                  <h2 className="text-xl font-black text-dark-text truncate">{p.partner}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {p.projectResult && p.projectResult !== '-' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${resColor}22`, color: resColor }}>
                        {p.projectResult}
                      </span>
                    )}
                    {p.status && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/[0.03] dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-black/10 dark:border-white/10 capitalize">{p.status}</span>
                    )}
                    {p.squad && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">{p.squad}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedProject(null)} className="w-10 h-10 rounded-xl flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-colors shrink-0">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Gestor', value: gest?.name || p.responsible || '—' },
                    { label: 'Investimento', value: p.investment || '—' },
                    { label: 'ROI', value: p.roi || '—' },
                    { label: 'Última atualização', value: p.lastUpdate || '—' },
                  ].map(s => (
                    <div key={s.label} className="bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3 py-2.5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                      <p className="text-xs font-bold text-dark-text truncate" title={s.value}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Produtos */}
                {prods.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Produtos ({prods.length})</p>
                    <div className="space-y-2">
                      {prods.map((prod, i) => {
                        const pr = (prod as any).projectResult || prod.status;
                        const prColor = getResultColor(pr);
                        return (
                          <div key={prod.id || i} className="bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-dark-text truncate">{prod.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {[prod.platform, prod.budget].filter(Boolean).join(' · ') || '—'}
                              </p>
                            </div>
                            {pr && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0" style={{ background: `${prColor}22`, color: prColor }}>{pr}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Otimizações recentes */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Otimizações recentes</p>
                  {recentOpts.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">Nenhuma otimização registrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {recentOpts.map((o, i) => (
                        <div key={o.id || i} className="bg-black/[0.03] dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl px-3 py-2.5">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-[10px] font-bold text-slate-400 truncate">{o.author || 'Sistema'} · {o.productName}</span>
                            <span className="text-[9px] text-slate-500 shrink-0">{formatDateShort(o.date)}{o.time ? ` ${o.time}` : ''}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words leading-relaxed">{o.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}

    </div>
  );
}
