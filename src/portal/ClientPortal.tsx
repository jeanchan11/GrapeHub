// Portal do Cliente — visão read-only, escopada por projeto.
// Estética escura reaproveitada da landing/login (glass + violeta + glows).
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { useClientSession, ClientSession } from './ClientSessionContext';
import MediaLightbox, { LbFile } from '../components/MediaLightbox';
import {
  Home, Activity, MessageSquare, FolderOpen, LogOut,
  DollarSign, Target, BarChart3, ChevronRight, Loader2, CheckCircle2,
  CalendarDays, FileText, Download, MousePointerClick, Eye, MessageCircle, Image as ImageIcon,
  Sun, Moon, Inbox, Sparkles, Upload, ChevronDown, Check,
} from 'lucide-react';

const V = '#7C3AED';
const V_LIGHT = '#A855F7';
const glass: React.CSSProperties = { background: 'var(--pcard)', backdropFilter: 'blur(14px)', border: '1px solid rgb(var(--pt-rgb) / 0.08)' };

type Theme = 'light' | 'dark';
const PortalThemeCtx = React.createContext<Theme>('dark');
const usePortalTheme = () => React.useContext(PortalThemeCtx);
// Tokens por tema. --pt-rgb = cor do "primeiro plano" (texto/bordas/overlays) em RGB.
const THEME_VARS: Record<Theme, React.CSSProperties> = {
  dark: { ['--pt-rgb' as any]: '255 255 255', ['--pbg' as any]: '#0A0118', ['--pcard' as any]: 'rgba(20,8,46,0.55)', ['--psidebar' as any]: 'linear-gradient(180deg, rgba(28,13,58,0.65) 0%, rgba(17,7,40,0.55) 100%)' },
  light: { ['--pt-rgb' as any]: '38 30 66', ['--pbg' as any]: '#F3F1FB', ['--pcard' as any]: 'rgba(255,255,255,0.82)', ['--psidebar' as any]: 'linear-gradient(180deg, rgba(249,247,254,0.92) 0%, rgba(238,234,251,0.85) 100%)' },
};

const brl0 = (n: number) => `R$ ${Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
const brl2 = (n: number) => `R$ ${Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDateBR = (d?: string) => {
  if (!d) return '—';
  const dt = new Date(String(d).length <= 10 ? String(d) + 'T12:00:00' : d);
  if (isNaN(+dt)) return String(d);
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

interface PortalData {
  me: any; kpis: any; campaigns: any; meetings: any[]; documents: any[]; optimizations: any[]; requests: any[];
}

const NAV = [
  { key: 'inicio', label: 'Início', icon: Home },
  { key: 'resultados', label: 'Resultados', icon: BarChart3 },
  { key: 'ativas', label: 'Campanhas Ativas', icon: Activity },
  { key: 'solicitacoes', label: 'Solicitações', icon: Inbox },
  { key: 'reunioes', label: 'Reuniões', icon: MessageSquare },
  { key: 'documentos', label: 'Documentos', icon: FolderOpen },
] as const;

const jget = (u: string) => fetch(u).then(r => (r.ok ? r.json() : null)).catch(() => null);

const ClientPortal: React.FC<{ session: ClientSession }> = ({ session }) => {
  const { logout } = useClientSession();
  const [tab, setTab] = useState<string>('inicio');
  const [theme, setTheme] = useState<Theme>(() => { try { return (localStorage.getItem('grapehub_portal_theme') as Theme) || 'dark'; } catch { return 'dark'; } });
  const toggleTheme = () => setTheme(t => { const n: Theme = t === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('grapehub_portal_theme', n); } catch { /* ignore */ } return n; });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PortalData>({ me: null, kpis: null, campaigns: null, meetings: [], documents: [], optimizations: [], requests: [] });

  useEffect(() => {
    Promise.all([
      jget('/api/portal/me'), jget('/api/portal/kpis'), jget('/api/portal/campaigns'),
      jget('/api/portal/meetings'), jget('/api/portal/documents'), jget('/api/portal/optimizations'),
      jget('/api/portal/requests'),
    ]).then(([me, kpis, campaigns, meetings, documents, optimizations, requests]) => {
      setData({
        me, kpis, campaigns,
        meetings: Array.isArray(meetings) ? meetings : [],
        documents: Array.isArray(documents?.documents) ? documents.documents : [],
        optimizations: Array.isArray(optimizations) ? optimizations : [],
        requests: Array.isArray(requests) ? requests : [],
      });
      setLoading(false);
    });
  }, []);

  const companyName = data.me?.project?.name || session.companyName || session.name || 'Cliente';

  const glowStrong = theme === 'light' ? 0.10 : 0.20;
  const glowSoft = theme === 'light' ? 0.05 : 0.10;

  return (
    <PortalThemeCtx.Provider value={theme}>
    <div className="min-h-screen text-[color:rgb(var(--pt-rgb))] antialiased relative" style={{ background: 'var(--pbg)', ...THEME_VARS[theme] }}>
      {/* glows de fundo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 w-[900px] h-[600px] rounded-full" style={{ opacity: glowStrong, background: `radial-gradient(circle, ${V} 0%, transparent 60%)`, filter: 'blur(30px)' }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full" style={{ opacity: glowSoft, background: `radial-gradient(circle, ${V_LIGHT} 0%, transparent 60%)`, filter: 'blur(30px)' }} />
      </div>

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-screen w-[260px] flex flex-col z-20 overflow-hidden" style={{ background: 'var(--psidebar)', backdropFilter: 'blur(16px)', borderRight: theme === 'light' ? 'none' : '1px solid rgba(255,255,255,0.06)', boxShadow: theme === 'light' ? '8px 0 30px -22px rgba(70,40,120,0.4)' : 'none' }}>
        {/* glow interno (igual à coluna do login) */}
        <div className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full" style={{ opacity: theme === 'light' ? 0.12 : 0.25, background: `radial-gradient(circle, ${V} 0%, transparent 60%)`, filter: 'blur(40px)' }} />

        <div className="relative flex items-center gap-3 px-6 h-20 shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: V, boxShadow: `0 8px 24px -8px ${V}` }}>
            <img src="/logobranca.png" alt="GrapeHub" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
          </div>
          <div className="flex items-baseline">
            <span className="font-bold text-xl tracking-tight text-[color:rgb(var(--pt-rgb))]">Grape</span>
            <span className="font-light text-xl text-[color:rgb(var(--pt-rgb)_/_0.6)]">Hub</span>
          </div>
        </div>

        <div className="relative px-4 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[color:rgb(var(--pt-rgb)_/_0.45)] px-3 mb-2">Hub do cliente</p>
          <nav className="space-y-1">
            {NAV.map(item => {
              const active = tab === item.key;
              const Icon = item.icon;
              return (
                <button key={item.key} onClick={() => setTab(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'text-[color:rgb(var(--pt-rgb))]' : 'text-[color:rgb(var(--pt-rgb)_/_0.72)] hover:text-[color:rgb(var(--pt-rgb))] hover:bg-[color:rgb(var(--pt-rgb)_/_0.05)]'}`}
                  style={active ? { background: 'rgba(124,58,237,0.22)', boxShadow: 'inset 0 0 0 1px rgba(168,85,247,0.30)' } : undefined}>
                  <Icon size={17} style={{ color: active ? V_LIGHT : 'rgb(var(--pt-rgb) / 0.6)' }} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="relative mt-auto p-4 border-t border-[color:rgb(var(--pt-rgb)_/_0.06)]">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0" style={{ background: 'rgba(124,58,237,0.2)', color: V_LIGHT }}>
              {String(companyName).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[color:rgb(var(--pt-rgb))] truncate">{companyName}</p>
              <p className="text-[11px] text-[color:rgb(var(--pt-rgb)_/_0.4)] truncate">{session.email}</p>
            </div>
          </div>
          <button onClick={toggleTheme} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[color:rgb(var(--pt-rgb)_/_0.72)] hover:text-[color:rgb(var(--pt-rgb))] hover:bg-[color:rgb(var(--pt-rgb)_/_0.05)] transition-all">
            <span className="relative w-4 h-4 flex items-center justify-center shrink-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ rotate: -90, opacity: 0, scale: 0.4 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </motion.span>
              </AnimatePresence>
            </span>
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </button>
          <button onClick={() => logout()} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[color:rgb(var(--pt-rgb)_/_0.72)] hover:text-[color:rgb(var(--pt-rgb))] hover:bg-[color:rgb(var(--pt-rgb)_/_0.05)] transition-all">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="relative z-10 pl-[260px]">
        <div className="max-w-[1100px] mx-auto px-8 py-10">
          {loading ? (
            <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-[color:rgb(var(--pt-rgb)_/_0.4)]" size={32} /></div>
          ) : (
            <>
              {tab === 'inicio' && <Inicio data={data} companyName={companyName} onNav={setTab} />}
              {tab === 'resultados' && <Resultados />}
              {tab === 'ativas' && <Ativas data={data} />}
              {tab === 'solicitacoes' && <Solicitacoes />}
              {tab === 'reunioes' && <Reunioes data={data} />}
              {tab === 'documentos' && <Documentos data={data} />}
            </>
          )}
        </div>
      </main>
    </div>
    </PortalThemeCtx.Provider>
  );
};

// ── Cabeçalho de seção ──
const Header: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <div className="mb-8">
    <h1 className="text-3xl font-black tracking-tight text-[color:rgb(var(--pt-rgb))]">{title}</h1>
    {sub && <p className="text-[color:rgb(var(--pt-rgb)_/_0.5)] mt-1">{sub}</p>}
  </div>
);

// ── KPI card ──
const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; delta?: number | null; good?: boolean }> = ({ icon, label, value, delta, good }) => (
  <div className="p-5 rounded-2xl" style={glass}>
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.15)', color: V_LIGHT }}>{icon}</div>
      {delta != null && (
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${good ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
          {delta > 0 ? '+' : ''}{delta}%
        </span>
      )}
    </div>
    <p className="text-[11px] uppercase tracking-widest text-[color:rgb(var(--pt-rgb)_/_0.4)] font-bold">{label}</p>
    <p className="text-2xl font-black text-[color:rgb(var(--pt-rgb))] mt-1">{value}</p>
  </div>
);

// ── Início ──
const OptAvatar: React.FC<{ name?: string; photo?: string | null; size?: number }> = ({ name, photo, size = 32 }) => (
  photo ? (
    <img src={photo} alt={name || ''} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} referrerPolicy="no-referrer" />
  ) : (
    <div className="rounded-full flex items-center justify-center shrink-0 font-bold" style={{ width: size, height: size, fontSize: size * 0.42, background: 'rgba(124,58,237,0.15)', color: V_LIGHT }}>
      {(name || 'E').charAt(0).toUpperCase()}
    </div>
  )
);

const Inicio: React.FC<{ data: PortalData; companyName: string; onNav: (t: string) => void }> = ({ data, companyName, onNav }) => {
  const k = data.kpis;
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const mainCampaign = data.campaigns?.active?.[0] || null;
  const nextMeeting = [...data.meetings].filter(m => new Date(m.date) >= new Date()).sort((a, b) => +new Date(a.date) - +new Date(b.date))[0] || data.meetings[0] || null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-[color:rgb(var(--pt-rgb))]">Olá, {companyName} 👋</h1>
        <p className="text-[color:rgb(var(--pt-rgb)_/_0.5)] mt-1 capitalize">{hoje}</p>
      </div>

      {/* KPIs */}
      {k?.hasMeta ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Kpi icon={<DollarSign size={18} />} label="Investimento (mês)" value={brl0(k.investment)} delta={k.deltas?.investment} good={(k.deltas?.investment ?? 0) >= 0} />
          <Kpi icon={<Target size={18} />} label={k.resultLabel || 'Resultados'} value={`${k.results ?? 0}`} delta={k.deltas?.results} good={(k.deltas?.results ?? 0) >= 0} />
          <Kpi icon={<BarChart3 size={18} />} label="Custo por resultado" value={k.cpa != null ? brl2(k.cpa) : '—'} delta={k.deltas?.cpa} good={(k.deltas?.cpa ?? 0) <= 0} />
        </div>
      ) : (
        <div className="p-5 rounded-2xl mb-6 text-[color:rgb(var(--pt-rgb)_/_0.5)] text-sm" style={glass}>Os números das campanhas aparecem aqui assim que as métricas forem sincronizadas.</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Radar da campanha */}
        <div className="lg:col-span-2 p-6 rounded-2xl" style={glass}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-bold text-[color:rgb(var(--pt-rgb))]"><Activity size={16} style={{ color: V_LIGHT }} /> Radar da campanha principal</h2>
            <button onClick={() => onNav('ativas')} className="text-xs font-bold flex items-center gap-1" style={{ color: V_LIGHT }}>Ver todas <ChevronRight size={13} /></button>
          </div>
          {mainCampaign ? (
            <div className="rounded-xl p-4 border border-[color:rgb(var(--pt-rgb)_/_0.1)] bg-[color:rgb(var(--pt-rgb)_/_0.02)]">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-bold text-[color:rgb(var(--pt-rgb))]">{mainCampaign.name}</p>
                  <span className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {mainCampaign.status || 'Rodando'}</span>
                </div>
                <div className="flex gap-6">
                  <div><p className="text-[10px] uppercase tracking-wider text-[color:rgb(var(--pt-rgb)_/_0.4)] font-bold">Gasto</p><p className="font-bold text-[color:rgb(var(--pt-rgb))]">{brl0(mainCampaign.spend)}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wider text-[color:rgb(var(--pt-rgb)_/_0.4)] font-bold">{mainCampaign.resultLabel || 'Leads'}</p><p className="font-bold text-[color:rgb(var(--pt-rgb))]">{mainCampaign.results ?? 0}</p></div>
                </div>
              </div>
            </div>
          ) : <p className="text-[color:rgb(var(--pt-rgb)_/_0.4)] text-sm py-6 text-center">Nenhuma campanha ativa no momento.</p>}

          {data.optimizations.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[color:rgb(var(--pt-rgb)_/_0.4)] mb-3">Últimas otimizações</p>
              <div className="space-y-3">
                {data.optimizations.slice(0, 2).map(o => (
                  <div key={o.id} className="flex gap-3">
                    <OptAvatar name={o.author} photo={o.authorPhoto} size={28} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-bold text-[color:rgb(var(--pt-rgb))]">{o.author || 'Equipe'}</span><span className="text-[11px] text-[color:rgb(var(--pt-rgb)_/_0.4)]">{fmtDateBR(o.date)}</span></div>
                      <p className="text-sm text-[color:rgb(var(--pt-rgb)_/_0.6)] leading-snug">{o.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Próxima reunião */}
        <div className="p-6 rounded-2xl flex flex-col" style={glass}>
          <h2 className="flex items-center gap-2 font-bold text-[color:rgb(var(--pt-rgb))] mb-4"><CalendarDays size={16} style={{ color: V_LIGHT }} /> Próxima reunião</h2>
          {nextMeeting ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1" style={{ background: 'rgba(124,58,237,0.15)', color: V_LIGHT }}><MessageSquare size={22} /></div>
              <p className="font-bold text-[color:rgb(var(--pt-rgb))]">{nextMeeting.title}</p>
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(124,58,237,0.15)', color: V_LIGHT }}>{fmtDateBR(nextMeeting.date)}</span>
              {nextMeeting.attendees && <p className="text-[11px] text-[color:rgb(var(--pt-rgb)_/_0.4)] mt-1">{nextMeeting.attendees}</p>}
            </div>
          ) : <p className="text-[color:rgb(var(--pt-rgb)_/_0.4)] text-sm flex-1 flex items-center justify-center">Nenhuma reunião registrada.</p>}
        </div>
      </div>
    </motion.div>
  );
};

// ── Campanhas Ativas ──
const Ativas: React.FC<{ data: PortalData }> = ({ data }) => {
  const active = data.campaigns?.active || [];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Header title="Campanhas Ativas" sub="O que está rodando agora e as otimizações do time." />
      {active.length === 0 ? (
        <div className="p-6 rounded-2xl text-[color:rgb(var(--pt-rgb)_/_0.5)] text-sm" style={glass}>Nenhuma campanha ativa no período.</div>
      ) : (
        <div className="space-y-4">
          {active.map((c: any, i: number) => (
            <div key={i} className="p-6 rounded-2xl" style={glass}>
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-bold text-[color:rgb(var(--pt-rgb))] text-lg">{c.name}</h3>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {c.status || 'Rodando'}</span>
              </div>
              <div className="flex gap-8 mt-4">
                <div><p className="text-[10px] uppercase tracking-wider text-[color:rgb(var(--pt-rgb)_/_0.4)] font-bold">Gasto</p><p className="font-black text-[color:rgb(var(--pt-rgb))] text-lg">{brl0(c.spend)}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-[color:rgb(var(--pt-rgb)_/_0.4)] font-bold">CPA</p><p className="font-black text-[color:rgb(var(--pt-rgb))] text-lg">{c.cpa != null ? brl2(c.cpa) : '—'}</p></div>
                <div><p className="text-[10px] uppercase tracking-wider text-[color:rgb(var(--pt-rgb)_/_0.4)] font-bold">{c.resultLabel || 'Leads'}</p><p className="font-black text-[color:rgb(var(--pt-rgb))] text-lg">{c.results ?? 0}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Histórico de otimizações */}
      <h2 className="flex items-center gap-2 font-bold text-[color:rgb(var(--pt-rgb))] mt-8 mb-4"><Activity size={16} style={{ color: V_LIGHT }} /> Histórico de otimizações</h2>
      {data.optimizations.length === 0 ? (
        <p className="text-[color:rgb(var(--pt-rgb)_/_0.4)] text-sm">Sem otimizações registradas ainda.</p>
      ) : (
        <div className="space-y-3">
          {data.optimizations.map((o: any) => (
            <div key={o.id} className="p-4 rounded-2xl flex gap-3" style={glass}>
              <OptAvatar name={o.author} photo={o.authorPhoto} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[color:rgb(var(--pt-rgb))]">{o.author || 'Equipe'}</span>
                  {o.kind === 'comentario' && <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(45,212,191,0.15)', color: '#2dd4bf' }}>Comentário</span>}
                  <span className="text-[11px] text-[color:rgb(var(--pt-rgb)_/_0.4)]">{fmtDateBR(o.date)}</span>
                </div>
                <p className="text-sm text-[color:rgb(var(--pt-rgb)_/_0.7)] leading-relaxed mt-0.5 whitespace-pre-wrap">{o.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ── Reuniões ──
const Reunioes: React.FC<{ data: PortalData }> = ({ data }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
    <Header title="Reuniões de Alinhamento" sub="Histórico das conversas e próximos passos acordados." />
    {data.meetings.length === 0 ? (
      <div className="p-6 rounded-2xl text-[color:rgb(var(--pt-rgb)_/_0.5)] text-sm" style={glass}>Nenhuma reunião registrada ainda.</div>
    ) : (
      <div className="space-y-4">
        {data.meetings.map(m => {
          const dt = new Date(String(m.date).length <= 10 ? String(m.date) + 'T12:00:00' : m.date);
          const raw = String(m.actions || '').trim();
          const isHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
          return (
            <div key={m.id} className="p-6 rounded-2xl" style={glass}>
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.12)' }}>
                  <span className="text-[10px] font-bold" style={{ color: V_LIGHT }}>{isNaN(+dt) ? '' : dt.toLocaleDateString('pt-BR', { month: '2-digit' })}</span>
                  <span className="text-xl font-black text-[color:rgb(var(--pt-rgb))] leading-none">{isNaN(+dt) ? '—' : dt.toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[color:rgb(var(--pt-rgb))]">{m.title}</h3>
                  {m.attendees && <p className="text-[12px] text-[color:rgb(var(--pt-rgb)_/_0.4)] mt-0.5">{m.attendees}</p>}
                  {raw && (
                    <div className="mt-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[color:rgb(var(--pt-rgb)_/_0.4)] mb-1.5">Próximas ações / acordos</p>
                      {isHtml ? (
                        <div className="text-sm leading-relaxed text-[color:rgb(var(--pt-rgb)_/_0.75)] [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold [&_strong]:font-semibold" dangerouslySetInnerHTML={{ __html: raw }} />
                      ) : (
                        <div className="space-y-2">
                          {raw.split(/\n\s*\n/).map((para, i) => {
                            const text = para.replace(/\s*\n\s*/g, ' ').trim();
                            return text ? <p key={i} className="text-sm leading-relaxed text-[color:rgb(var(--pt-rgb)_/_0.75)]">{text}</p> : null;
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </motion.div>
);

// ── Solicitações ──
const REQ_META: Record<string, { label: string; icon: any; color: string }> = {
  criativo: { label: 'Criativo', icon: ImageIcon, color: '#a855f7' },
  feedback: { label: 'Feedback', icon: MessageCircle, color: '#3b82f6' },
  roteiro: { label: 'Roteiro', icon: FileText, color: '#f59e0b' },
  outro: { label: 'Outro', icon: Sparkles, color: '#94a3b8' },
};
const FileChip: React.FC<{ file: any; onOpen: () => void }> = ({ file, onOpen }) => {
  const isImg = String(file.type || '').startsWith('image/');
  if (isImg) {
    return (
      <button onClick={onOpen} className="block">
        <img src={file.url} alt={file.name} className="w-20 h-20 object-cover rounded-lg border border-[color:rgb(var(--pt-rgb)_/_0.1)] hover:opacity-90 transition-opacity" referrerPolicy="no-referrer" />
      </button>
    );
  }
  return (
    <button onClick={onOpen} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[color:rgb(var(--pt-rgb)_/_0.12)] hover:border-violet-500/40 transition-colors">
      <FileText size={15} style={{ color: V_LIGHT }} />
      <span className="text-xs truncate max-w-[160px] text-[color:rgb(var(--pt-rgb)_/_0.8)]">{file.name || 'arquivo'}</span>
    </button>
  );
};

const Solicitacoes: React.FC = () => {
  const [reqs, setReqs] = useState<any[] | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<{ files: LbFile[]; index: number } | null>(null);

  useEffect(() => { jget('/api/portal/requests').then(d => setReqs(Array.isArray(d) ? d : [])); }, []);

  const sendComment = async (r: any) => {
    const text = (commentText[r.id] || '').trim();
    if (!text) return;
    setCommentText(p => ({ ...p, [r.id]: '' }));
    try {
      const res = await fetch(`/api/portal/requests/${r.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      if (res.ok) { const c = await res.json(); setReqs(prev => (prev || []).map(x => x.id === r.id ? { ...x, comments: [...(x.comments || []), c] } : x)); }
    } catch { /* ignore */ }
  };

  const toggleDone = async (r: any) => {
    const status = r.status === 'concluida' ? 'pendente' : 'concluida';
    setReqs(prev => (prev || []).map(x => x.id === r.id ? { ...x, status } : x));
    try { await fetch(`/api/portal/requests/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); } catch { /* ignore */ }
  };
  const upload = async (r: any, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadingId(r.id);
    try {
      const fd = new FormData();
      Array.from(fileList).forEach(f => fd.append('files', f));
      const res = await fetch(`/api/portal/requests/${r.id}/files`, { method: 'POST', body: fd });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setReqs(prev => (prev || []).map(x => x.id === r.id ? { ...x, files: d.files } : x));
      else alert(d.error || 'Falha ao enviar arquivos.');
    } catch { alert('Erro ao enviar arquivos.'); }
    setUploadingId(null);
  };

  if (reqs === null) return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-[color:rgb(var(--pt-rgb)_/_0.4)]" size={30} /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Header title="Solicitações" sub="O que a Grape precisa de você. Anexe os arquivos e marque como concluída." />
      {reqs.length === 0 ? (
        <div className="p-6 rounded-2xl text-[color:rgb(var(--pt-rgb)_/_0.5)] text-sm" style={glass}>Nenhuma solicitação no momento. 🎉</div>
      ) : (
        <div className="space-y-3">
          {reqs.map((r: any) => {
            const meta = REQ_META[r.type] || REQ_META.outro; const Icon = meta.icon;
            const done = r.status === 'concluida';
            const files = Array.isArray(r.files) ? r.files : [];
            return (
              <div key={r.id} className="p-5 rounded-2xl flex items-start gap-3" style={glass}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.color}22`, color: meta.color }}><Icon size={16} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
                    <span className="text-[11px] text-[color:rgb(var(--pt-rgb)_/_0.4)]">{fmtDateBR(r.created_at)}</span>
                    {done
                      ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">✓ Concluída</span>
                      : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>Pendente</span>}
                  </div>
                  <p className={`text-sm leading-relaxed ${done ? 'line-through text-[color:rgb(var(--pt-rgb)_/_0.4)]' : 'text-[color:rgb(var(--pt-rgb)_/_0.8)]'}`}>{r.description}</p>

                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">{files.map((f: any, i: number) => <FileChip key={i} file={f} onOpen={() => setLightbox({ files: files as LbFile[], index: i })} />)}</div>
                  )}

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all bg-[color:rgb(var(--pt-rgb)_/_0.06)] hover:bg-[color:rgb(var(--pt-rgb)_/_0.1)] text-[color:rgb(var(--pt-rgb)_/_0.8)]">
                      <input type="file" multiple className="hidden" onChange={e => { upload(r, e.target.files); e.currentTarget.value = ''; }} />
                      {uploadingId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      {uploadingId === r.id ? 'Enviando...' : 'Enviar arquivos'}
                    </label>
                    <button onClick={() => toggleDone(r)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${done ? 'bg-[color:rgb(var(--pt-rgb)_/_0.06)] text-[color:rgb(var(--pt-rgb)_/_0.6)] hover:bg-[color:rgb(var(--pt-rgb)_/_0.1)]' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}>
                      <CheckCircle2 size={13} /> {done ? 'Reabrir' : 'Marcar como concluída'}
                    </button>
                  </div>

                  {/* Conversa */}
                  <div className="mt-4 pt-3 border-t border-[color:rgb(var(--pt-rgb)_/_0.08)]">
                    {(r.comments || []).length > 0 && (
                      <div className="space-y-2.5 mb-3">
                        {(r.comments || []).map((c: any, i: number) => (
                          <div key={i}>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-bold" style={{ color: c.authorType === 'team' ? V_LIGHT : '#2dd4bf' }}>{c.author}</span>
                              <span className="text-[10px] text-[color:rgb(var(--pt-rgb)_/_0.4)]">{fmtDateBR(c.createdAt)}</span>
                            </div>
                            <p className="text-sm text-[color:rgb(var(--pt-rgb)_/_0.8)] leading-relaxed whitespace-pre-wrap">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        value={commentText[r.id] || ''}
                        onChange={e => setCommentText(p => ({ ...p, [r.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') sendComment(r); }}
                        placeholder="Escreva um comentário..."
                        className="flex-1 bg-[color:rgb(var(--pt-rgb)_/_0.05)] border border-[color:rgb(var(--pt-rgb)_/_0.1)] rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500/50 transition-colors text-[color:rgb(var(--pt-rgb))] placeholder:text-[color:rgb(var(--pt-rgb)_/_0.35)]"
                      />
                      <button onClick={() => sendComment(r)} disabled={!(commentText[r.id] || '').trim()} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-bold transition-all">Enviar</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <MediaLightbox files={lightbox.files} index={lightbox.index} onClose={() => setLightbox(null)} onIndex={i => setLightbox(l => l && { ...l, index: i })} />
      )}
    </motion.div>
  );
};

// ── Documentos ──
const Documentos: React.FC<{ data: PortalData }> = ({ data }) => {
  const docs = data.documents || [];
  const [lightbox, setLightbox] = useState<{ files: LbFile[]; index: number } | null>(null);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Header title="Documentos" sub="Materiais e arquivos do seu projeto." />
      {docs.length === 0 ? (
        <div className="p-6 rounded-2xl text-[color:rgb(var(--pt-rgb)_/_0.5)] text-sm" style={glass}>Nenhum documento disponível ainda.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {docs.map((f: any, i: number) => (
            <button key={i} onClick={() => setLightbox({ files: docs as LbFile[], index: i })}
              className="p-4 rounded-2xl flex items-center gap-3 hover:border-violet-500/40 transition-colors group text-left" style={glass}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.15)', color: V_LIGHT }}><FileText size={18} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[color:rgb(var(--pt-rgb))] truncate">{f.name || 'Documento'}</p>
                {f.size && <p className="text-[11px] text-[color:rgb(var(--pt-rgb)_/_0.4)]">{f.size}</p>}
              </div>
              <Download size={16} className="text-[color:rgb(var(--pt-rgb)_/_0.3)] group-hover:text-[color:rgb(var(--pt-rgb)_/_0.7)] transition-colors" />
            </button>
          ))}
        </div>
      )}
      {lightbox && (
        <MediaLightbox files={lightbox.files} index={lightbox.index} onClose={() => setLightbox(null)} onIndex={i => setLightbox(l => l && { ...l, index: i })} />
      )}
    </motion.div>
  );
};

// ── Resultados (relatório Meta Ads) ──
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const PRESETS = [
  { key: '7d', label: 'Últ. 7 dias' },
  { key: '30d', label: 'Últ. 30 dias' },
  { key: 'mes', label: 'Este mês' },
  { key: 'ant', label: 'Mês passado' },
];
const rangeFor = (key: string): { start: string; end: string } => {
  const now = new Date();
  if (key === '7d') { const s = new Date(now); s.setDate(now.getDate() - 6); return { start: isoLocal(s), end: isoLocal(now) }; }
  if (key === '30d') { const s = new Date(now); s.setDate(now.getDate() - 29); return { start: isoLocal(s), end: isoLocal(now) }; }
  if (key === 'mes') { return { start: isoLocal(new Date(now.getFullYear(), now.getMonth(), 1)), end: isoLocal(now) }; }
  return { start: isoLocal(new Date(now.getFullYear(), now.getMonth() - 1, 1)), end: isoLocal(new Date(now.getFullYear(), now.getMonth(), 0)) };
};

const MiniKpi: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string }> = ({ icon, label, value, sub }) => (
  <div className="p-4 rounded-2xl" style={glass}>
    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgba(124,58,237,0.15)', color: V_LIGHT }}>{icon}</div>
    <p className="text-[10px] uppercase tracking-widest text-[color:rgb(var(--pt-rgb)_/_0.4)] font-bold">{label}</p>
    <p className="text-lg font-black text-[color:rgb(var(--pt-rgb))] mt-0.5">{value}</p>
    {sub && <p className="text-[10px] text-[color:rgb(var(--pt-rgb)_/_0.4)] mt-0.5">{sub}</p>}
  </div>
);

const CreativeThumb: React.FC<{ adId: string; url: string | null; name: string }> = ({ adId, url, name }) => {
  const [err, setErr] = useState(false);
  const src = url && !err ? `/api/meta-thumb?id=${encodeURIComponent(adId)}&url=${encodeURIComponent(url)}` : null;
  return (
    <div className="aspect-square bg-[color:rgb(var(--pt-rgb)_/_0.3)] flex items-center justify-center overflow-hidden">
      {src
        ? <img src={src} alt={name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={() => setErr(true)} />
        : <ImageIcon size={26} className="text-[color:rgb(var(--pt-rgb)_/_0.2)]" />}
    </div>
  );
};

// Dropdown do portal — segue o tema (claro/escuro) via --pt-rgb; menu inline (herda as vars)
const PortalSelect: React.FC<{ value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; className?: string; align?: 'left' | 'right' }> = ({ value, options, onChange, className = '', align = 'left' }) => {
  const theme = usePortalTheme();
  const light = theme === 'light';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const current = options.find(o => o.value === value);
  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between gap-2 w-full px-3 py-2 rounded-xl text-xs font-bold cursor-pointer text-[color:rgb(var(--pt-rgb))]"
        style={glass}>
        <span className="truncate">{current?.label ?? '—'}</span>
        <ChevronDown size={13} className={`opacity-50 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute z-[60] mt-1.5 max-h-72 overflow-y-auto rounded-xl shadow-2xl py-1.5 min-w-full ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ background: light ? '#ffffff' : '#1b0b38', border: '1px solid rgb(var(--pt-rgb) / 0.12)' }}>
          {options.map(o => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-[color:rgb(var(--pt-rgb)_/_0.06)] text-[color:rgb(var(--pt-rgb)_/_0.8)]"
              style={o.value === value ? { color: 'rgb(var(--pt-rgb))', fontWeight: 700 } : undefined}>
              <span className="flex-1 truncate">{o.label}</span>
              {o.value === value && <Check size={13} style={{ color: V_LIGHT }} className="shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Resultados: React.FC = () => {
  const theme = usePortalTheme();
  const [preset, setPreset] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [rep, setRep] = useState<any>(null);
  const [account, setAccount] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const { start, end } = rangeFor(preset);
    const accParam = account && account !== 'all' ? `&account=${encodeURIComponent(account)}` : '';
    jget(`/api/portal/report?start=${start}&end=${end}${accParam}`).then(d => { setRep(d); setLoading(false); });
  }, [preset, account]);

  const k = rep?.kpis;
  const isMsg = k?.primaryMetric === 'messages';
  const light = theme === 'light';
  const gridStroke = light ? 'rgba(30,27,60,0.10)' : 'rgba(255,255,255,0.06)';
  const axisFill = light ? '#6b6785' : '#94a3b8';
  const chartTip = { background: light ? '#ffffff' : '#14082e', border: `1px solid ${light ? 'rgba(30,27,60,0.12)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 12, fontSize: 12, boxShadow: light ? '0 8px 24px -8px rgba(0,0,0,0.15)' : 'none' } as React.CSSProperties;
  const tipLabel = { color: light ? '#1e1b37' : '#e2e8f0' } as React.CSSProperties;
  const dayFmt = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`;

  // Campanhas presentes nos criativos (filtro) + criativos exibidos
  const creativeCampaigns: string[] = rep?.creatives
    ? (Array.from(new Set(rep.creatives.map((c: any) => c.campaignName).filter(Boolean))) as string[]).sort((a, b) => a.localeCompare(b, 'pt-BR'))
    : [];
  const shownCreatives: any[] = rep?.creatives
    ? (campaignFilter === 'all' ? rep.creatives : rep.creatives.filter((c: any) => c.campaignName === campaignFilter))
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[color:rgb(var(--pt-rgb))]">Resultados</h1>
          <p className="text-[color:rgb(var(--pt-rgb)_/_0.5)] mt-1">Desempenho das suas campanhas no Meta Ads.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {rep?.accounts?.length > 1 && (
            <PortalSelect
              value={account}
              onChange={setAccount}
              className="w-[240px]"
              options={[{ value: 'all', label: 'Consolidado (todas)' }, ...rep.accounts.map((a: any) => ({ value: a.id, label: a.name }))]}
            />
          )}
          <div className="flex gap-1 p-1 rounded-xl" style={glass}>
            {PRESETS.map(p => (
              <button key={p.key} onClick={() => setPreset(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${preset === p.key ? 'text-[color:rgb(var(--pt-rgb))]' : 'text-[color:rgb(var(--pt-rgb)_/_0.45)] hover:text-[color:rgb(var(--pt-rgb)_/_0.8)]'}`}
                style={preset === p.key ? { background: 'rgba(124,58,237,0.25)' } : undefined}>{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32"><Loader2 className="animate-spin text-[color:rgb(var(--pt-rgb)_/_0.4)]" size={30} /></div>
      ) : !rep?.hasMeta ? (
        <div className="p-6 rounded-2xl text-[color:rgb(var(--pt-rgb)_/_0.5)] text-sm" style={glass}>Ainda não há dados de campanha para exibir neste período.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MiniKpi icon={<DollarSign size={15} />} label="Investimento" value={brl0(k.spend)} />
            <MiniKpi icon={<MousePointerClick size={15} />} label="Cliques" value={Number(k.clicks).toLocaleString('pt-BR')} />
            <MiniKpi icon={<Eye size={15} />} label="Impressões" value={Number(k.impressions).toLocaleString('pt-BR')} />
            <MiniKpi icon={<BarChart3 size={15} />} label="CTR" value={`${k.ctr}%`} />
            <MiniKpi icon={<MessageCircle size={15} />} label={isMsg ? 'Mensagens' : 'Leads'} value={`${isMsg ? k.messages : k.leads}`} sub={isMsg ? `Leads: ${k.leads}` : undefined} />
            <MiniKpi icon={<Target size={15} />} label={isMsg ? 'Custo/msg' : 'Custo/lead'} value={k.costPerResult != null ? brl2(k.costPerResult) : '—'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl" style={glass}>
              <h3 className="font-bold text-[color:rgb(var(--pt-rgb))] mb-1">Investimento diário</h3>
              <p className="text-xs text-[color:rgb(var(--pt-rgb)_/_0.4)] mb-4">Gasto em anúncios no período</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={rep.daily} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <defs><linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={V_LIGHT} stopOpacity={0.4} /><stop offset="100%" stopColor={V_LIGHT} stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisFill }} tickFormatter={dayFmt} minTickGap={24} />
                  <YAxis tick={{ fontSize: 10, fill: axisFill }} tickFormatter={(v) => `R$${v}`} width={48} />
                  <RTooltip contentStyle={chartTip} labelStyle={tipLabel} labelFormatter={dayFmt} formatter={(v: any) => [brl2(Number(v)), 'Gasto']} />
                  <Area type="monotone" dataKey="spend" stroke={V_LIGHT} strokeWidth={2} fill="url(#gSpend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="p-6 rounded-2xl" style={glass}>
              <h3 className="font-bold text-[color:rgb(var(--pt-rgb))] mb-1">{isMsg ? 'Mensagens diárias' : 'Leads diários'}</h3>
              <p className="text-xs text-[color:rgb(var(--pt-rgb)_/_0.4)] mb-4">{isMsg ? 'Conversas iniciadas' : 'Leads capturados'} no período</p>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={rep.daily} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                  <defs><linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.4} /><stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisFill }} tickFormatter={dayFmt} minTickGap={24} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: axisFill }} />
                  <RTooltip contentStyle={chartTip} labelStyle={tipLabel} labelFormatter={dayFmt} />
                  <Area type="monotone" dataKey={isMsg ? 'messages' : 'leads'} stroke="#2dd4bf" strokeWidth={2} fill="url(#gRes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-6 rounded-2xl" style={glass}>
            <h3 className="font-bold text-[color:rgb(var(--pt-rgb))] mb-4">Campanhas <span className="text-[color:rgb(var(--pt-rgb)_/_0.4)] text-sm font-normal">· {rep.campaigns.length}</span></h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-bold text-[color:rgb(var(--pt-rgb)_/_0.4)] uppercase tracking-widest border-b border-[color:rgb(var(--pt-rgb)_/_0.1)]">
                  <th className="text-left py-2 pr-2">Campanha</th>
                  <th className="text-right py-2 pr-2">{isMsg ? 'Msg' : 'Leads'}</th>
                  <th className="text-right py-2 pr-2">Cliques</th>
                  <th className="text-right py-2 pr-2">CTR</th>
                  <th className="text-right py-2 pr-2">Custo</th>
                  <th className="text-right py-2">Gasto</th>
                </tr></thead>
                <tbody>
                  {rep.campaigns.map((c: any, i: number) => {
                    const r = isMsg ? c.messages : c.leads;
                    return (
                      <tr key={i} className="border-b border-[color:rgb(var(--pt-rgb)_/_0.04)]">
                        <td className="py-2.5 pr-3 text-[color:rgb(var(--pt-rgb)_/_0.85)] max-w-[340px] truncate" title={c.name}>{c.name}</td>
                        <td className="py-2.5 pr-2 text-right font-bold" style={{ color: '#2dd4bf' }}>{r}</td>
                        <td className="py-2.5 pr-2 text-right text-[color:rgb(var(--pt-rgb)_/_0.7)]">{Number(c.clicks).toLocaleString('pt-BR')}</td>
                        <td className="py-2.5 pr-2 text-right text-[color:rgb(var(--pt-rgb)_/_0.7)]">{c.ctr}%</td>
                        <td className="py-2.5 pr-2 text-right text-[color:rgb(var(--pt-rgb)_/_0.7)]">{c.costPerResult != null ? brl2(c.costPerResult) : '—'}</td>
                        <td className="py-2.5 text-right font-bold" style={{ color: V_LIGHT }}>{brl0(c.spend)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {rep.creatives?.length > 0 && (
            <div className="p-6 rounded-2xl" style={glass}>
              <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <h3 className="font-bold text-[color:rgb(var(--pt-rgb))] mb-1">Criativos <span className="text-[color:rgb(var(--pt-rgb)_/_0.4)] text-sm font-normal">· {shownCreatives.length}</span></h3>
                  <p className="text-xs text-[color:rgb(var(--pt-rgb)_/_0.4)]">Desempenho por anúncio</p>
                </div>
                {creativeCampaigns.length > 1 && (
                  <PortalSelect
                    value={campaignFilter}
                    onChange={setCampaignFilter}
                    align="right"
                    className="w-[240px]"
                    options={[{ value: 'all', label: 'Todas as campanhas' }, ...creativeCampaigns.map(c => ({ value: c, label: c }))]}
                  />
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {shownCreatives.map((c: any, i: number) => {
                  const r = isMsg ? c.messages : c.leads;
                  return (
                    <div key={i} className="rounded-xl overflow-hidden border border-[color:rgb(var(--pt-rgb)_/_0.06)] bg-[color:rgb(var(--pt-rgb)_/_0.02)]">
                      <CreativeThumb adId={c.adId} url={c.thumbnailUrl} name={c.name || 'Anúncio'} />
                      <div className="p-3">
                        <p className="text-xs font-semibold text-[color:rgb(var(--pt-rgb))] truncate" title={c.name}>{c.name || 'Anúncio'}</p>
                        {c.campaignName && (
                          <p className="text-[10px] text-[color:rgb(var(--pt-rgb)_/_0.4)] truncate mt-0.5" title={c.campaignName}>{c.campaignName}</p>
                        )}
                        <div className="flex items-center justify-between mt-2 text-[11px]">
                          <span className="font-bold" style={{ color: '#2dd4bf' }}>{r} {isMsg ? 'msg' : 'leads'}</span>
                          <span className="text-[color:rgb(var(--pt-rgb)_/_0.5)]">{brl0(c.spend)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-[color:rgb(var(--pt-rgb)_/_0.4)]">
                          <span>CTR {c.ctr}%</span>
                          <span>{c.costPerResult != null ? brl2(c.costPerResult) : '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ClientPortal;
