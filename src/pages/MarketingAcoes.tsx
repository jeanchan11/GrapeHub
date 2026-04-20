
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, MoreHorizontal,
  AlertTriangle, PauseCircle,
  DollarSign,
  Plus, Target, Activity,
  Megaphone, X, Calendar, User,
  Pencil, Trash2, ChevronRight,
  TrendingUp, TrendingDown, Minus,
  PlayCircle, Clock, Zap,
  RefreshCw, Paperclip, Image as ImageIcon, FileText, Download
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type CampaignStatus = 'Ativa' | 'Pausada' | 'Testando' | 'Gargalo';
type ActionType = 'Otimização' | 'Criativo' | 'Pausa' | 'Segmentação' | 'Orçamento' | 'Reativação' | 'Outro';
type ActionResult = 'Positivo' | 'Negativo' | 'Neutro' | 'Aguardando';

interface ActionAttachment {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string; // base64 data URL
  size: string;
}

interface CampaignAction {
  id: string;
  date: string;
  type: ActionType;
  description: string;
  author: string;
  result: ActionResult;
  attachments?: ActionAttachment[];
}

interface Campaign {
  id: string;
  name: string;
  client: string;
  platform: 'Meta Ads' | 'Google Ads' | 'TikTok Ads' | 'LinkedIn Ads' | 'Outro';
  status: CampaignStatus;
  budget: string;
  result: string;
  responsible: string;
  actions: CampaignAction[];
  created_at?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PLATFORMS = ['Meta Ads', 'Google Ads', 'TikTok Ads', 'LinkedIn Ads', 'Outro'] as const;
const ACTION_TYPES: ActionType[] = ['Otimização', 'Criativo', 'Pausa', 'Segmentação', 'Orçamento', 'Reativação', 'Outro'];
const ACTION_RESULTS: ActionResult[] = ['Positivo', 'Negativo', 'Neutro', 'Aguardando'];

const campaignResults = [
  { label: '-',                   color: 'bg-slate-500' },
  { label: 'TESTANDO',            color: 'bg-blue-500' },
  { label: 'RESULTADO RUIM',      color: 'bg-rose-500' },
  { label: 'RESULTADO OK',        color: 'bg-amber-500' },
  { label: 'RESULTADO BOM',       color: 'bg-emerald-500' },
  { label: 'PAUSADA',             color: 'bg-slate-400' },
  { label: 'AGUARDANDO CRIATIVO', color: 'bg-violet-500' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function todayStr() { return new Date().toLocaleDateString('pt-BR'); }

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Badge components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CampaignStatus }) {
  const map: Record<CampaignStatus, { icon: React.ReactNode; cls: string }> = {
    Ativa:    { icon: <PlayCircle size={12} />,  cls: 'bg-emerald-500/10 text-emerald-500' },
    Pausada:  { icon: <PauseCircle size={12} />, cls: 'bg-slate-500/10 text-slate-400' },
    Testando: { icon: <Clock size={12} />,        cls: 'bg-blue-500/10 text-blue-400' },
    Gargalo:  { icon: <AlertTriangle size={12} />, cls: 'bg-rose-500/10 text-rose-400' },
  };
  const { icon, cls } = map[status] || map.Testando;
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 w-fit ${cls}`}>
      {icon}{status}
    </span>
  );
}

function ResultBadge({ result }: { result: string }) {
  const found = campaignResults.find(r => r.label === result) || { label: result || '-', color: 'bg-slate-500' };
  const text  = found.color.replace('bg-', 'text-');
  return (
    <span className={`px-2.5 py-1 rounded-full ${found.color}/10 ${text} text-[10px] font-bold uppercase tracking-widest w-fit`}>
      {found.label}
    </span>
  );
}

function ActionResultBadge({ result }: { result: ActionResult }) {
  const map: Record<ActionResult, { icon: React.ReactNode; cls: string }> = {
    Positivo:   { icon: <TrendingUp size={11} />,   cls: 'text-emerald-500 bg-emerald-500/10' },
    Negativo:   { icon: <TrendingDown size={11} />,  cls: 'text-rose-400 bg-rose-500/10' },
    Neutro:     { icon: <Minus size={11} />,          cls: 'text-slate-400 bg-slate-500/10' },
    Aguardando: { icon: <Clock size={11} />,           cls: 'text-amber-400 bg-amber-500/10' },
  };
  const { icon, cls } = map[result];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${cls}`}>
      {icon}{result}
    </span>
  );
}

function PlatformDot({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    'Meta Ads':     'bg-blue-500',
    'Google Ads':   'bg-green-500',
    'TikTok Ads':   'bg-pink-500',
    'LinkedIn Ads': 'bg-sky-600',
    'Outro':        'bg-slate-400',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[platform] || 'bg-slate-400'}`} />;
}

function ActionTypeIcon({ type }: { type: ActionType }) {
  const map: Record<ActionType, { icon: React.ReactNode; cls: string }> = {
    'Otimização':  { icon: <Zap size={12} />,           cls: 'bg-violet-500/15 text-violet-400' },
    'Criativo':    { icon: <Activity size={12} />,       cls: 'bg-blue-500/15 text-blue-400' },
    'Pausa':       { icon: <PauseCircle size={12} />,    cls: 'bg-slate-500/15 text-slate-400' },
    'Segmentação': { icon: <Target size={12} />,         cls: 'bg-amber-500/15 text-amber-400' },
    'Orçamento':   { icon: <DollarSign size={12} />,     cls: 'bg-emerald-500/15 text-emerald-400' },
    'Reativação':  { icon: <PlayCircle size={12} />,     cls: 'bg-green-500/15 text-green-400' },
    'Outro':       { icon: <MoreHorizontal size={12} />, cls: 'bg-slate-500/15 text-slate-400' },
  };
  const { icon, cls } = map[type] || map['Outro'];
  return <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${cls}`}>{icon}</span>;
}

// ── Attachment previews ────────────────────────────────────────────────────────

function AttachmentList({ attachments, onRemove }: { attachments: ActionAttachment[]; onRemove?: (id: string) => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (!attachments?.length) return null;

  const images = attachments.filter(a => a.mimeType.startsWith('image/'));
  const files  = attachments.filter(a => !a.mimeType.startsWith('image/'));

  return (
    <>
      {/* image grid */}
      {images.length > 0 && (
        <div className={`grid gap-1.5 mt-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {images.map(img => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden border border-white/10 cursor-pointer" style={{ maxHeight: 180 }}
              onClick={() => setLightbox(img.dataUrl)}>
              <img src={img.dataUrl} alt={img.name} className="w-full object-cover" style={{ maxHeight: 180 }} />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold bg-black/50 px-2 py-1 rounded-lg transition-opacity">Ver</span>
              </div>
              {onRemove && (
                <button onClick={e => { e.stopPropagation(); onRemove(img.id); }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500">
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* file list */}
      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-2 bg-dark-bg/60 rounded-lg px-3 py-2 group">
              <FileText size={13} className="text-violet-400 shrink-0" />
              <span className="text-xs text-dark-text truncate flex-1">{f.name}</span>
              <span className="text-[10px] text-slate-500 shrink-0">{f.size}</span>
              <a href={f.dataUrl} download={f.name}
                className="w-6 h-6 rounded-lg hover:bg-violet-500/15 flex items-center justify-center text-slate-400 hover:text-violet-400 transition-colors shrink-0">
                <Download size={11} />
              </a>
              {onRemove && (
                <button onClick={() => onRemove(f.id)}
                  className="w-6 h-6 rounded-lg hover:bg-rose-500/10 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setLightbox(null)}>
          <img src={lightbox} className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl" />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface Props { activePage?: string; }

export default function MarketingAcoes({ activePage }: Props) {
  const [campaigns, setCampaigns]       = useState<Campaign[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  // Modals
  const [addCampaignOpen, setAddCampaignOpen]   = useState(false);
  const [addActionOpen, setAddActionOpen]       = useState(false);
  const [editCampaignOpen, setEditCampaignOpen] = useState(false);
  const [targetCampaignId, setTargetCampaignId] = useState<string | null>(null);

  // Forms
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    name: '', client: '', platform: 'Meta Ads', status: 'Testando', budget: 'R$ 0', result: '-', responsible: '',
  });
  const [newAction, setNewAction] = useState<Partial<CampaignAction>>({
    date: todayStr(), type: 'Otimização', description: '', author: '', result: 'Aguardando', attachments: [],
  });

  // ── Persist ────────────────────────────────────────────────────────────────────

  const saveToServer = useCallback(async (data: Campaign[]) => {
    if (!activePage) return;
    setSaving(true);
    try {
      await fetch('/api/marketing-acoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: activePage, campaigns: data }),
      });
    } catch (e) { console.error('[marketing-acoes] save error:', e); }
    finally { setSaving(false); }
  }, [activePage]);

  useEffect(() => {
    if (!activePage) { setLoading(false); return; }
    fetch(`/api/marketing-acoes?page_id=${encodeURIComponent(activePage)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.campaigns) setCampaigns(d.campaigns); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activePage]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => saveToServer(campaigns), 600);
    return () => clearTimeout(t);
  }, [campaigns, loading, saveToServer]);

  // ── Stats ──────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => [
    { label: 'Total Campanhas', value: campaigns.length, icon: Megaphone,    cls: 'text-violet-400 bg-violet-500/10' },
    { label: 'Ativas',          value: campaigns.filter(c => c.status === 'Ativa').length,   icon: PlayCircle,    cls: 'text-emerald-400 bg-emerald-500/10' },
    { label: 'Pausadas',        value: campaigns.filter(c => c.status === 'Pausada').length, icon: PauseCircle,   cls: 'text-slate-400 bg-slate-500/10' },
    { label: 'Gargalo',         value: campaigns.filter(c => c.status === 'Gargalo').length, icon: AlertTriangle, cls: 'text-rose-400 bg-rose-500/10' },
    { label: 'Total Ações',     value: campaigns.reduce((s, c) => s + c.actions.length, 0),  icon: Zap,           cls: 'text-amber-400 bg-amber-500/10' },
  ], [campaigns]);

  // ── Filter ─────────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => campaigns.filter(c => {
    const q = searchQuery.toLowerCase();
    return (c.name.toLowerCase().includes(q) || c.client.toLowerCase().includes(q)) &&
           (statusFilter === 'Todos' || c.status === statusFilter);
  }), [campaigns, searchQuery, statusFilter]);

  // ── CRUD ───────────────────────────────────────────────────────────────────────

  function handleAddCampaign() {
    setCampaigns(prev => [{
      id: genId(),
      name: newCampaign.name || 'Nova Campanha',
      client: newCampaign.client || '',
      platform: (newCampaign.platform as any) || 'Meta Ads',
      status: (newCampaign.status as any) || 'Testando',
      budget: newCampaign.budget || 'R$ 0',
      result: newCampaign.result || '-',
      responsible: newCampaign.responsible || '',
      actions: [],
      created_at: new Date().toISOString(),
    }, ...prev]);
    setAddCampaignOpen(false);
    setNewCampaign({ name: '', client: '', platform: 'Meta Ads', status: 'Testando', budget: 'R$ 0', result: '-', responsible: '' });
  }

  function handleSaveEditCampaign() {
    if (!targetCampaignId) return;
    setCampaigns(prev => prev.map(c => c.id === targetCampaignId ? { ...c, ...newCampaign } as Campaign : c));
    setEditCampaignOpen(false);
    setTargetCampaignId(null);
  }

  function openAddAction(campaignId: string) {
    setTargetCampaignId(campaignId);
    setNewAction({ date: todayStr(), type: 'Otimização', description: '', author: '', result: 'Aguardando', attachments: [] });
    setAddActionOpen(true);
  }

  function handleAddAction() {
    if (!targetCampaignId) return;
    const action: CampaignAction = {
      id: genId(),
      date:        newAction.date || todayStr(),
      type:        (newAction.type as ActionType)   || 'Outro',
      description: newAction.description || '',
      author:      newAction.author     || '',
      result:      (newAction.result as ActionResult) || 'Aguardando',
      attachments: newAction.attachments || [],
    };
    setCampaigns(prev => prev.map(c =>
      c.id === targetCampaignId ? { ...c, actions: [action, ...c.actions] } : c
    ));
    setAddActionOpen(false);
    setTargetCampaignId(null);
  }

  function handleDeleteAction(campaignId: string, actionId: string) {
    setCampaigns(prev => prev.map(c =>
      c.id === campaignId ? { ...c, actions: c.actions.filter(a => a.id !== actionId) } : c
    ));
  }

  function openEditCampaign(c: Campaign) {
    setTargetCampaignId(c.id);
    setNewCampaign({ name: c.name, client: c.client, platform: c.platform, status: c.status, budget: c.budget, result: c.result, responsible: c.responsible });
    setEditCampaignOpen(true);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">

      {/* Header */}
      <div className="px-6 md:px-8 pt-8 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dark-text">
            Ações de <span className="text-violet-500">Campanhas</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            Registro de otimizações e ações em campanhas de marketing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="flex items-center gap-1.5 text-xs text-slate-400"><RefreshCw size={12} className="animate-spin" /> Salvando…</span>}
          <button onClick={() => setAddCampaignOpen(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-violet-500/20">
            <Plus size={15} /> Adicionar Campanha
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 md:px-8 pb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.cls.split(' ')[1]}`}>
                <s.icon size={15} className={s.cls.split(' ')[0]} />
              </div>
            </div>
            <div className="text-2xl font-black text-dark-text">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="px-6 md:px-8 pb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar campanha ou cliente…"
            className="w-full bg-dark-card border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-dark-text placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Todos','Ativa','Pausada','Testando','Gargalo'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === s ? 'bg-violet-600 text-white border-violet-500' : 'bg-dark-card border-white/10 text-slate-400 hover:border-violet-500/40 hover:text-dark-text'
              }`}>{s}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-6 md:px-8 pb-8 space-y-3">
          {filtered.length === 0 && (
            <div className="bg-dark-card border border-white/10 rounded-2xl p-12 text-center">
              <Megaphone size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">Nenhuma campanha encontrada</p>
              <p className="text-slate-500 text-xs mt-1">Clique em "Adicionar Campanha" para começar</p>
            </div>
          )}

          {filtered.map(campaign => {
            const isExpanded = expandedId === campaign.id;
            return (
              <div key={campaign.id} className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
                {/* Row header */}
                <div className="flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : campaign.id)}>
                  <button className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center shrink-0" onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : campaign.id); }}>
                    <ChevronRight size={14} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>
                  <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-violet-400">{campaign.name.slice(0,1).toUpperCase()}</span>
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-bold text-dark-text truncate">{campaign.name}</span>
                    <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <PlatformDot platform={campaign.platform} />{campaign.platform} · {campaign.client}
                    </span>
                  </div>
                  <div className="hidden sm:block"><ResultBadge result={campaign.result} /></div>
                  <div className="hidden md:block"><StatusBadge status={campaign.status} /></div>
                  <div className="hidden lg:flex flex-col items-end">
                    <span className="text-xs text-slate-500">Investimento</span>
                    <span className="text-sm font-bold text-dark-text">{campaign.budget}</span>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">{campaign.actions.length} ação{campaign.actions.length !== 1 ? 'ões' : ''}</span>
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openAddAction(campaign.id)} className="w-8 h-8 rounded-lg hover:bg-violet-500/15 flex items-center justify-center text-violet-400 transition-colors" title="Adicionar ação"><Plus size={14} /></button>
                    <button onClick={() => openEditCampaign(campaign)} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-dark-text transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => setCampaigns(prev => prev.filter(c => c.id !== campaign.id))} className="w-8 h-8 rounded-lg hover:bg-rose-500/10 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>

                {/* Expanded actions */}
                {isExpanded && (
                  <div className="border-t border-white/10 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Histórico de Ações</span>
                      <button onClick={() => openAddAction(campaign.id)} className="flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors"><Plus size={12} /> Nova ação</button>
                    </div>

                    {campaign.actions.length === 0 ? (
                      <div className="py-8 text-center">
                        <Zap size={24} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500 text-xs">Nenhuma ação registrada ainda</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {campaign.actions.map(action => (
                          <div key={action.id} className="bg-dark-bg/60 rounded-xl px-4 py-3 group">
                            <div className="flex items-start gap-3">
                              <ActionTypeIcon type={action.type} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-xs font-bold text-dark-text">{action.type}</span>
                                  <ActionResultBadge result={action.result} />
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1"><Calendar size={10} />{action.date}</span>
                                  {action.author && <span className="text-[10px] text-slate-500 flex items-center gap-1"><User size={10} />{action.author}</span>}
                                  {(action.attachments?.length ?? 0) > 0 && (
                                    <span className="text-[10px] text-slate-500 flex items-center gap-1"><Paperclip size={10} />{action.attachments!.length}</span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">{action.description}</p>
                                {/* Attachments in card */}
                                {action.attachments && action.attachments.length > 0 && (
                                  <AttachmentList attachments={action.attachments} />
                                )}
                              </div>
                              <button onClick={() => handleDeleteAction(campaign.id, action.id)}
                                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg hover:bg-rose-500/10 flex items-center justify-center text-slate-500 hover:text-rose-400 transition-all shrink-0">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Campaign */}
      {addCampaignOpen && (
        <ModalOverlay onClose={() => setAddCampaignOpen(false)} title="Adicionar Campanha">
          <CampaignForm data={newCampaign} onChange={setNewCampaign} />
          <div className="flex gap-3 mt-6">
            <button onClick={() => setAddCampaignOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-colors">Cancelar</button>
            <button onClick={handleAddCampaign} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors">Adicionar</button>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: Edit Campaign */}
      {editCampaignOpen && (
        <ModalOverlay onClose={() => setEditCampaignOpen(false)} title="Editar Campanha">
          <CampaignForm data={newCampaign} onChange={setNewCampaign} />
          <div className="flex gap-3 mt-6">
            <button onClick={() => setEditCampaignOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-colors">Cancelar</button>
            <button onClick={handleSaveEditCampaign} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors">Salvar</button>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: Add Action */}
      {addActionOpen && (
        <ModalOverlay onClose={() => setAddActionOpen(false)} title="Registrar Ação" wide>
          <ActionForm data={newAction} onChange={setNewAction} />
          <div className="flex gap-3 mt-6">
            <button onClick={() => setAddActionOpen(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-white/10 hover:bg-white/5 transition-colors">Cancelar</button>
            <button onClick={handleAddAction} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors">Registrar</button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ── Modal wrapper ──────────────────────────────────────────────────────────────

function ModalOverlay({ onClose, title, children, wide }: { onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${wide ? 'max-w-lg' : 'max-w-md'} bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black text-dark-text">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Campaign form ──────────────────────────────────────────────────────────────

function CampaignForm({ data, onChange }: { data: Partial<Campaign>; onChange: (d: Partial<Campaign>) => void }) {
  const cls = "w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500/50 transition-colors";
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Nome da Campanha</label>
        <input className={cls} value={data.name || ''} onChange={e => onChange({ ...data, name: e.target.value })} placeholder="Ex: Meta Ads – Prospecção Q2" />
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Cliente / Parceiro</label>
        <input className={cls} value={data.client || ''} onChange={e => onChange({ ...data, client: e.target.value })} placeholder="Nome do cliente" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Plataforma</label>
          <select className={cls} value={data.platform || 'Meta Ads'} onChange={e => onChange({ ...data, platform: e.target.value as any })}>
            {PLATFORMS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Status</label>
          <select className={cls} value={data.status || 'Testando'} onChange={e => onChange({ ...data, status: e.target.value as CampaignStatus })}>
            {['Ativa','Pausada','Testando','Gargalo'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Investimento Mensal</label>
          <input className={cls} value={data.budget || ''} onChange={e => onChange({ ...data, budget: e.target.value })} placeholder="R$ 0" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Resultado</label>
          <select className={cls} value={data.result || '-'} onChange={e => onChange({ ...data, result: e.target.value })}>
            {campaignResults.map(r => <option key={r.label}>{r.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Responsável</label>
        <input className={cls} value={data.responsible || ''} onChange={e => onChange({ ...data, responsible: e.target.value })} placeholder="Nome do gestor" />
      </div>
    </div>
  );
}

// ── Action form (with paste + file upload) ─────────────────────────────────────

function ActionForm({ data, onChange }: { data: Partial<CampaignAction>; onChange: (d: Partial<CampaignAction>) => void }) {
  const cls       = "w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500/50 transition-colors";
  const fileRef   = useRef<HTMLInputElement>(null);
  const attachments = data.attachments || [];

  // ---- add attachment helper
  async function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    const newAttachments: ActionAttachment[] = await Promise.all(
      arr.map(async f => ({
        id:       genId(),
        name:     f.name,
        mimeType: f.type || 'application/octet-stream',
        dataUrl:  await fileToDataUrl(f),
        size:     fmtSize(f.size),
      }))
    );
    onChange({ ...data, attachments: [...attachments, ...newAttachments] });
  }

  // ---- paste handler
  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(i => i.kind === 'file' && i.type.startsWith('image/'));
    if (imageItems.length === 0) return; // let normal text paste through
    e.preventDefault();
    const files = imageItems.map(i => i.getAsFile()).filter(Boolean) as File[];
    if (files.length) addFiles(files);
  }

  // ---- drag-and-drop
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  function removeAttachment(id: string) {
    onChange({ ...data, attachments: attachments.filter(a => a.id !== id) });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Tipo de Ação</label>
          <select className={cls} value={data.type || 'Otimização'} onChange={e => onChange({ ...data, type: e.target.value as ActionType })}>
            {ACTION_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Data</label>
          <input type="text" className={cls} value={data.date || ''} onChange={e => onChange({ ...data, date: e.target.value })} placeholder="DD/MM/AAAA" />
        </div>
      </div>

      {/* Description with paste support */}
      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Descrição</label>
        <textarea
          className={`${cls} min-h-[90px] resize-none`}
          value={data.description || ''}
          onChange={e => onChange({ ...data, description: e.target.value })}
          onPaste={handlePaste}
          placeholder="Descreva a ação… (Cole imagens com Ctrl+V)"
        />
      </div>

      {/* Attachments drop zone + previews */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Anexos</label>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors">
            <Paperclip size={12} /> Anexar arquivo
          </button>
          <input ref={fileRef} type="file" multiple className="hidden"
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
        </div>

        {/* Drop zone (shown only when no attachments yet, alongside the previews) */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          className="border border-dashed border-white/20 rounded-xl px-4 py-3 text-center text-xs text-slate-500 hover:border-violet-500/40 hover:text-violet-400 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
        >
          <ImageIcon size={16} className="mx-auto mb-1 opacity-50" />
          Arraste arquivos ou clique para selecionar · Cole imagens com <kbd className="px-1 py-0.5 rounded text-[10px] bg-white/10 font-mono">Ctrl+V</kbd>
        </div>

        {/* Preview */}
        {attachments.length > 0 && (
          <AttachmentList attachments={attachments} onRemove={removeAttachment} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Autor</label>
          <input className={cls} value={data.author || ''} onChange={e => onChange({ ...data, author: e.target.value })} placeholder="Quem realizou" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Resultado</label>
          <select className={cls} value={data.result || 'Aguardando'} onChange={e => onChange({ ...data, result: e.target.value as ActionResult })}>
            {ACTION_RESULTS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
