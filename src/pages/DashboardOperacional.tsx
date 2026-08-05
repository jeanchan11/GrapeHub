import React, { useEffect, useState } from 'react';

import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import SplitHeadline from '../components/SplitHeadline';
import { confirmDialog } from '@/src/lib/confirm';
import {
  Users, TrendingUp, DollarSign, AlertTriangle,
  CheckCircle, Cpu, RefreshCw, Clock, MessageSquare, X,
  ThumbsUp, Edit2, Trash2, Search, ShieldAlert, Calendar,
  LayoutDashboard, UserX, KeyRound
} from 'lucide-react';
// Abas de churn reaproveitadas do Consolidado (mesma implementação, sem duplicar código)
import { ChurnTab, RiscoDeChurnTab, type ChurnRow } from './OperacionalConsolidado';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { ChurnRiskCircle, churnCheckedCount, CHURN_TOTAL } from './ProjectsModule';

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
    .sort((a, b) => (a as any)._priority - (b as any)._priority);
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

const CountUp = ({ value, prefix = '', suffix = '', className = '', format = false }: { value: number; prefix?: string; suffix?: string; className?: string; format?: boolean }) => {
  const [display, setDisplay] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const animated = React.useRef(false);

  React.useEffect(() => {
    if (animated.current) { setDisplay(Math.round(value)); return; }
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
            setDisplay(Math.round(eased * target));
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

const AnimatedColorBar = ({ widthPercent, color }: { widthPercent: number; color: string }) => {
  const [width, setWidth] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const animated = React.useRef(false);

  React.useEffect(() => {
    if (animated.current) { setWidth(widthPercent); return; }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          requestAnimationFrame(() => setWidth(widthPercent));
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [widthPercent]);

  return (
    <div ref={ref} className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(100,100,120,0.15)' }}>
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${width}%`, background: color }}
      />
    </div>
  );
};

function KpiCard({ icon, iconBg, label, value, sub, extra }: {
  icon: React.ReactNode; iconBg: string; label: string;
  value: React.ReactNode; sub?: React.ReactNode; extra?: React.ReactNode;
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

  const cx = 140; const cy = 140;

  const hoveredSlice = hovered !== null ? data[hovered] : null;
  const centerVal = hoveredSlice ? `${Math.round((hoveredSlice.count / total) * 100)}%` : String(total);
  const centerSub = hoveredSlice
    ? (hoveredSlice.label === '-' ? 'SEM RES.' : hoveredSlice.label.toUpperCase().replace('RESULTADO ', 'RES.').slice(0, 9))
    : 'PROJETOS';

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div className="flex gap-8 items-center justify-between w-full h-full">
      <div
        ref={wrapRef}
        className="relative flex items-center justify-center pl-2"
        style={{ width: 280, height: 280, flexShrink: 0 }}
        onMouseMove={handleMouseMove}
      >
        <PieChart width={280} height={280}>
          <Pie
            data={data}
            cx={cx} cy={cy}
            innerRadius={82} outerRadius={120}
            dataKey="count"
            strokeWidth={0}
            paddingAngle={data.length > 1 ? 3 : 0}
            startAngle={90} endAngle={-270}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
            onMouseEnter={(_, index) => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
          >
            {data.map((d, idx) => (
              <Cell 
                key={idx} 
                fill={d.color}
                stroke={hovered === idx ? 'rgba(255,255,255,0.25)' : 'none'}
                strokeWidth={hovered === idx ? 2 : 0}
                style={{
                  transform: hovered === idx ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: 'transform 0.15s ease, opacity 0.15s ease',
                  cursor: 'pointer',
                  opacity: hovered === null || hovered === idx ? 1 : 0.35,
                }}
              />
            ))}
          </Pie>

          {/* Center Text */}
          <text x={cx} y={cy - 6} textAnchor="middle" 
            fill={hoveredSlice ? hoveredSlice.color : undefined}
            className={hoveredSlice ? "" : "fill-slate-800 dark:fill-white"}
            fontSize={hovered !== null ? 32 : 36} fontWeight={900}
            style={{ transition: 'all 0.12s ease', pointerEvents: 'none' }}>
            {centerVal}
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" 
            fill={hovered !== null && hoveredSlice ? hoveredSlice.color + 'bb' : '#64748b'}
            fontSize={10} fontWeight={800} letterSpacing={1.5}
            style={{ transition: 'all 0.12s ease', pointerEvents: 'none' }}>
            {centerSub}
          </text>
        </PieChart>

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
    <div className="flex items-center justify-center min-h-[75vh] w-full bg-dark-bg">
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
  const [tab, setTab] = useState<'geral' | 'risco' | 'churn' | 'tokens'>('geral');
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

  // ── Dashboard Head: cadência de reuniões, evolução da carteira e churn ──
  useEffect(() => {
    if (!isSingleHeadMode || projects.length === 0) return;
    let alive = true;
    const ids = projects.map(p => p.id);

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
  }, [isSingleHeadMode, projects]);

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

  const filteredProjects = selectedGestor
    ? (isHeadsMode
        ? projects.filter(p => p.page_id === selectedGestor)   // heads: filtra pela página do head
        : projects.filter(p => p.responsible === selectedGestor))
    : projects;

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
  const atencao  = getAtencaoList(filteredProjects);
  const criticas = getCriticas(filteredProjects);
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

  // Radar de Churn — projetos com sinais marcados, do maior risco para o menor.
  const churnRadar = filteredProjects
    .map(p => ({ p, count: churnCheckedCount(p) }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

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

  // 3) Churn atribuído ao head (campo `gestor` da planilha de churn)
  const churnDoHead = headChurns.filter(c => {
    if (!c.gestor || !headName) return false;
    const g = norm(c.gestor), h = norm(headName);
    return g === h || g.startsWith(h) || h.startsWith(g);
  });
  const churn6m = churnDoHead.filter(c => c.day_exit && new Date(c.day_exit) >= new Date(Date.now() - 180 * 86400000));
  const parseMoney = (v: any) => Number(String(v ?? '').replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
  const ltvPerdido = churn6m.reduce((s, c) => s + parseMoney(c.ltv), 0);
  const evitaveis = churn6m.filter(c => norm(c.tipo).includes('evitavel') && !norm(c.tipo).includes('inevitavel')).length;
  const churnSemGestor = headChurns.filter(c => !c.gestor && c.day_exit && new Date(c.day_exit) >= new Date(Date.now() - 180 * 86400000)).length;

  // 4) Investimento sob gestão vs. início da série
  const investHoje = histLast?.investimento || 0;
  const investAntes = histFirst?.investimento || 0;
  const investDelta = investAntes > 0 ? Math.round(((investHoje - investAntes) / investAntes) * 100) : null;

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
          <SplitHeadline text="Dashboard " highlight={isSingleHeadMode ? 'Head' : 'Operacional'} className="text-2xl font-black tracking-tight text-dark-text" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            {isSingleHeadMode
              ? 'Visão geral de projetos'
              : isHeadsMode ? 'Visão geral de projetos · Operação' : `Visão geral de projetos · Squad ${squadName}`}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          className={`w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:bg-dark-card-hover flex items-center justify-center transition-colors ${spinning ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={14} className="text-slate-400" />
        </button>
      </div>

      {/* ── Abas: Visão Geral / Risco de Churn / Churn (modo operação) ──── */}
      {isHeadsMode && (
        <div className="px-6 md:px-8 pb-6 flex flex-wrap gap-1 border-b border-white/5">
          {([['geral', 'Visão Geral', LayoutDashboard], ['risco', 'Risco de Churn', ShieldAlert], ['churn', 'Churn', UserX], ['tokens', 'Erros de Token', KeyRound]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold transition-all border-b-2 -mb-px ${
                tab === key
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-white'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Filtro de gestores — oculto no modo "head" (a página já é de um head só) */}
      {!isSingleHeadMode && tab === 'geral' && (<>
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
              <div className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
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
        <div className="mx-6 md:mx-8 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          ⚠ {error}
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
                  <div className="bg-dark-card border border-white/5 rounded-2xl p-5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Com erro</p>
                    <p className="text-3xl font-black text-rose-400">{comErro.length}</p>
                  </div>
                  <div className="bg-dark-card border border-white/5 rounded-2xl p-5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reautenticar</p>
                    <p className="text-3xl font-black text-amber-400">{reauth.length}</p>
                  </div>
                  {Object.entries(porPlataforma).slice(0, 2).map(([k, v]) => (
                    <div key={k} className="bg-dark-card border border-white/5 rounded-2xl p-5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{k}</p>
                      <p className="text-3xl font-black text-dark-text">{v as number}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-dark-card border border-white/5 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5">
                    <h2 className="text-sm font-bold text-dark-text">Tokens com problema</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Contas cujo token parou de funcionar — a coleta de dados está parada nelas.
                    </p>
                  </div>

                  {tokenErrors.length === 0 ? (
                    <p className="text-sm text-emerald-400 text-center py-14">Nenhum token com erro ✅</p>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {tokenErrors.map(t => {
                        const isErro = String(t.status) === 'error';
                        const quando = t.last_synced_at
                          ? new Date(t.last_synced_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : 'sem sincronização';
                        return (
                          <div key={t.id} className={`relative flex items-start gap-3 pl-5 pr-5 py-4 ${isErro ? 'bg-rose-500/[0.03]' : ''}`}>
                            <span className={`absolute left-0 top-0 bottom-0 w-1 ${isErro ? 'bg-rose-500' : 'bg-amber-500'}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-bold text-dark-text truncate">
                                  {t.partner || t.project_id || '—'}
                                </p>
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 uppercase">
                                  {t.platform === 'meta_ads' ? 'Meta Ads' : (t.platform || 'outro')}
                                </span>
                                {t.account_name && (
                                  <span className="text-[10px] text-slate-500 truncate">{t.account_name}</span>
                                )}
                              </div>
                              {t.last_error && (
                                <p className="text-[11px] text-rose-400/90 mt-1.5 leading-snug line-clamp-2">{t.last_error}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                                {t.responsible && <span>{t.responsible}</span>}
                                {t.responsible && <span>·</span>}
                                <span>{quando}</span>
                              </div>
                            </div>
                            <span className={`shrink-0 text-[9px] font-black px-2 py-1 rounded-full border ${
                              isErro ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                                     : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                            }`}>
                              {isErro ? 'Erro' : 'Reautenticar'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Visão Geral — escondida (não desmontada) ao trocar de aba, preservando o estado */}
      <div className={`px-6 md:px-8 pb-10 space-y-5 ${tab !== 'geral' ? 'hidden' : ''}`}>
        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <KpiCard
            iconBg="bg-violet-500/15"
            icon={<Users size={17} className="text-violet-500" />}
            label="Projetos"
            value={<CountUp value={filteredProjects.length} />}
            sub={<span><span className="text-violet-400 font-bold">{kpis.totalAtivos}</span> operacionais</span>}
          />
          <KpiCard
            iconBg="bg-amber-500/15"
            icon={<ShieldAlert size={17} className="text-amber-500" />}
            label="Retenção"
            value={<CountUp value={retentionShown} />}
            sub={<span className="text-amber-500 font-bold">Clientes em retenção</span>}
          />
          <KpiCard
            iconBg="bg-indigo-500/15"
            icon={<Calendar size={17} className="text-indigo-500" />}
            label="Onboarding"
            value={<CountUp value={briefingShown} />}
            sub={<span className="text-indigo-400 font-bold">Em reunião de briefing</span>}
          />
          <KpiCard
            iconBg="bg-red-500/15"
            icon={<AlertTriangle size={17} className="text-red-500" />}
            label="Resultado Ruim"
            value={<CountUp value={kpis.resultadoRuim} />}
            sub={<span><span className="text-red-400 font-bold">{projects.length ? Math.round((kpis.resultadoRuim / projects.length) * 100) : 0}%</span> do total</span>}
          />
          <KpiCard
            iconBg="bg-emerald-500/15"
            icon={<DollarSign size={17} className="text-emerald-500" />}
            label="Investimento Diário"
            value={<CountUp value={kpis.orcamentoTotal / 30} prefix="R$ " format />}
            sub={<span>Mensal: <span className="text-emerald-400 font-bold">{fmtBRL(kpis.orcamentoTotal)}</span></span>}
          />
        </div>

        {/* ── Linha 2 & 3 — Comentários, Distribuição e Radar ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Histórico de Comentários */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 flex flex-col lg:row-span-2 lg:h-[780px] h-[380px]">
            <h2 className="text-sm font-bold text-dark-text mb-1">Últimos Comentários</h2>
            <p className="text-xs text-slate-500 mb-3 shrink-0">
              Histórico consolidado dos projetos
            </p>
            {/* Busca dentro do histórico de comentários */}
            <div className="relative mb-4 shrink-0">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                value={commentSearch}
                onChange={e => setCommentSearch(e.target.value)}
                placeholder="Buscar por parceiro, otimização, autor..."
                className="w-full bg-dark-bg border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
              {commentSearch && (
                <button onClick={() => setCommentSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-dark-text transition-colors" title="Limpar busca">
                  <X size={13} />
                </button>
              )}
            </div>
            {filteredComments.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-6">{commentQuery ? 'Nenhum comentário encontrado 🔍' : 'Nenhum comentário registrado 📝'}</div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-0">
                {(commentQuery ? filteredComments : filteredComments.slice(0, 40)).map((c, idx) => {
                  const dbUser = findUser(c.opt.author);
                  return (
                    <div 
                      key={c.id} 
                      className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors"
                      style={{ animation: 'rowFadeIn 0.3s ease both', animationDelay: `${idx * 0.04}s` }}
                    >
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
                    {atencao.map((a, idx) => {
                      const dbUser = findUser(a.responsible);
                      return (
                      <tr 
                        key={a.id} 
                        className="border-b transition-colors hover:bg-slate-50 dark:hover:bg-white/5" 
                        style={{ borderColor: 'rgba(100,100,120,0.08)', animation: 'rowFadeIn 0.3s ease both', animationDelay: `${idx * 0.04}s` }}
                      >
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
        {/* Radar de Churn + Projetos Sem Update — ocultos no Dashboard Head */}
        {!isSingleHeadMode && (<>

        {/* ── Linha 4 — Dist. Produtos + Tarefas Críticas ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Radar de Churn — projetos com maior probabilidade de churn */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
            <h2 className="text-sm font-bold text-dark-text mb-1">Radar de Churn</h2>
            <p className="text-xs text-slate-500 mb-4">Projetos com maior probabilidade de churn</p>
            {churnRadar.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-10">Nenhum sinal de churn marcado ✅</div>
            ) : (
              <div className="space-y-2">
                {churnRadar.map(({ p, count }, idx) => {
                  const dbUser = findUser(p.responsible);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors"
                      style={{ animation: 'rowFadeIn 0.3s ease both', animationDelay: `${idx * 0.04}s` }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-dark-text truncate">{p.partner}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0 border border-slate-300 dark:border-white/10">
                            {dbUser?.picture ? (
                              <img src={dbUser.picture} alt={p.responsible || ''} className="w-full h-full object-cover" />
                            ) : (
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.responsible}`} alt={p.responsible || ''} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{p.responsible || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">{count}/{CHURN_TOTAL}</span>
                        <ChurnRiskCircle project={p} />
                      </div>
                    </div>
                  );
                })}
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
                {criticas.map((c, idx) => {
                  const dbUser = findUser(c.responsible);
                  return (
                  <div 
                    key={c.id} 
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors"
                    style={{ animation: 'rowFadeIn 0.3s ease both', animationDelay: `${idx * 0.04}s` }}
                  >
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
        </>)}

        {/* ════ Desempenho do Head — blocos exclusivos do Dashboard Head ════ */}
        {isSingleHeadMode && (
          <>
            {/* 1) Cadência de reuniões */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-dark-card border border-white/5 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-dark-text mb-1">Cadência de Reuniões</h2>
                <p className="text-xs text-slate-500 mb-4">Clientes atendidos nos últimos 30 dias</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-black text-dark-text leading-none">{comReuniao30}</span>
                  <span className="text-lg font-bold text-slate-500 leading-none pb-0.5">/ {projects.length}</span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${comReuniao30 / Math.max(projects.length, 1) >= 0.8 ? 'bg-emerald-500' : comReuniao30 / Math.max(projects.length, 1) >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.round((comReuniao30 / Math.max(projects.length, 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {Math.round((comReuniao30 / Math.max(projects.length, 1)) * 100)}% da carteira com reunião no período
                </p>
              </div>

              <div className="lg:col-span-2 bg-dark-card border border-white/5 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-dark-text mb-1">Sem Reunião há mais de {DIAS_SEM_REUNIAO} dias</h2>
                <p className="text-xs text-slate-500 mb-4">{semReuniao.length} cliente(s) precisando de contato</p>
                {semReuniao.length === 0 ? (
                  <p className="text-xs text-emerald-400 py-6 text-center">Toda a carteira teve reunião recente ✅</p>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                    {semReuniao.slice(0, 12).map(({ p, dias }) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 bg-dark-bg/40 border border-white/5 rounded-xl px-3 py-2.5">
                        <span className="text-xs font-bold text-dark-text truncate">{p.partner}</span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${dias === null ? 'bg-slate-500/15 text-slate-400' : dias > 60 ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'}`}>
                          {dias === null ? 'sem registro' : `${dias}d`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2) Evolução da carteira + 4) Investimento */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-dark-card border border-white/5 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-dark-text mb-1">Evolução da Carteira</h2>
                <p className="text-xs text-slate-500 mb-4">% de projetos com Resultado Bom ou Ok · últimos 90 dias</p>
                {history.length < 2 ? (
                  <p className="text-xs text-slate-500 py-10 text-center">
                    A série começa a partir de hoje — volte em alguns dias para ver a evolução.
                  </p>
                ) : (
                  <>
                    <div className="flex items-end gap-3 mb-3">
                      <span className="text-3xl font-black text-dark-text leading-none">{saudavelHoje}%</span>
                      {saudavelDelta !== 0 && (
                        <span className={`text-xs font-bold pb-1 ${saudavelDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {saudavelDelta > 0 ? '↑' : '↓'} {Math.abs(saudavelDelta)} p.p.
                        </span>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={history.map(h => ({ date: h.date.slice(8, 10) + '/' + h.date.slice(5, 7), saudavel: h.total > 0 ? Math.round(((h.bom + h.ok) / h.total) * 100) : 0, ruim: h.total > 0 ? Math.round((h.ruim / h.total) * 100) : 0 }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
                        <RechartsTooltip contentStyle={{ background: '#1a1625', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                        <Area type="monotone" dataKey="saudavel" name="Bom + Ok" stroke="#2ecc8f" fill="#2ecc8f" fillOpacity={0.15} strokeWidth={2} />
                        <Area type="monotone" dataKey="ruim" name="Ruim" stroke="#f74c4c" fill="#f74c4c" fillOpacity={0.12} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </>
                )}
              </div>

              <div className="bg-dark-card border border-white/5 rounded-2xl p-5">
                <h2 className="text-sm font-bold text-dark-text mb-1">Investimento sob Gestão</h2>
                <p className="text-xs text-slate-500 mb-4">Verba mensal somada da carteira</p>
                {/* Mesmo número do card "Investimento Diário" acima (lá dividido por 30),
                    para as duas leituras baterem na tela. */}
                <p className="text-3xl font-black text-dark-text leading-none">
                  {fmtBRL(kpis.orcamentoTotal)}
                </p>
                {history.length >= 2 && investDelta !== null ? (
                  <p className={`text-xs font-bold mt-3 ${investDelta > 0 ? 'text-emerald-400' : investDelta < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                    {investDelta > 0 ? '↑' : investDelta < 0 ? '↓' : ''} {Math.abs(investDelta)}% vs. início do período
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-3">O comparativo aparece conforme a série acumula dias.</p>
                )}
              </div>
            </div>

            {/* 3) Churn */}
            <div className="bg-dark-card border border-white/5 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-dark-text mb-1">Churn nos últimos 6 meses</h2>
              <p className="text-xs text-slate-500 mb-4">
                Saídas atribuídas a {headName || 'este head'} na planilha de churn
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-dark-bg/40 border border-white/5 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Clientes perdidos</p>
                  <p className="text-2xl font-black text-rose-400">{churn6m.length}</p>
                </div>
                <div className="bg-dark-bg/40 border border-white/5 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">LTV perdido</p>
                  <p className="text-2xl font-black text-dark-text">R$ {ltvPerdido.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="bg-dark-bg/40 border border-white/5 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Evitáveis</p>
                  <p className="text-2xl font-black text-amber-400">{evitaveis}<span className="text-sm text-slate-500 font-bold"> de {churn6m.length}</span></p>
                </div>
              </div>
              {churn6m.length > 0 && (
                <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                  {churn6m.map((c: any, i: number) => (
                    <div key={c.id || i} className="flex items-center justify-between gap-3 bg-dark-bg/40 border border-white/5 rounded-xl px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-dark-text truncate">{c.cliente}</p>
                        {c.motivo && <p className="text-[10px] text-slate-500 truncate">{c.motivo}</p>}
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">{c.day_exit ? new Date(c.day_exit).toLocaleDateString('pt-BR') : ''}</span>
                    </div>
                  ))}
                </div>
              )}
              {churnSemGestor > 0 && (
                <p className="text-[11px] text-amber-400/80 mt-4 border-t border-white/5 pt-3">
                  ⚠ {churnSemGestor} saída(s) no período estão sem gestor preenchido na planilha e não entram nesta conta.
                </p>
              )}
            </div>
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
                    const gest = findUser(p.responsible);
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProject(p)}
                        className="bg-dark-card border border-white/5 hover:border-violet-500/30 p-4 rounded-2xl flex items-center justify-between transition-all group cursor-pointer"
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedProject(null)}>
            <div className="w-full max-w-2xl bg-dark-bg border border-dark-text/10 shadow-2xl rounded-3xl flex flex-col max-h-[88vh] overflow-hidden" onClick={e => e.stopPropagation()}>
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
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10 capitalize">{p.status}</span>
                    )}
                    {p.squad && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">{p.squad}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedProject(null)} className="w-10 h-10 rounded-2xl flex items-center justify-center text-dark-text/40 hover:text-dark-text hover:bg-dark-text/10 transition-colors shrink-0">
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
                    <div key={s.label} className="bg-dark-card border border-white/5 rounded-xl px-3 py-2.5">
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
                          <div key={prod.id || i} className="bg-dark-card border border-white/5 rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
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
                        <div key={o.id || i} className="bg-dark-card border border-white/5 rounded-xl px-3 py-2.5">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-[10px] font-bold text-slate-400 truncate">{o.author || 'Sistema'} · {o.productName}</span>
                            <span className="text-[9px] text-slate-500 shrink-0">{formatDateShort(o.date)}{o.time ? ` ${o.time}` : ''}</span>
                          </div>
                          <p className="text-xs text-slate-300 whitespace-pre-wrap break-words leading-relaxed">{o.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
