import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  X, DollarSign, MousePointerClick, Eye, Users, Megaphone, Loader2, AlertCircle, Image as ImageIcon, MessageCircle, Calendar, ChevronDown, Download
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

// ── Helpers (same as MarketingDashboard) ──────────────────────────────────
function fmtCurrency(val: number | string | null | undefined) {
  const n = Number(val) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

function fmtInt(val: number | string | null | undefined) {
  const n = Number(val) || 0;
  return n.toLocaleString('pt-BR');
}

function fmtPct(val: number | null | undefined) {
  return `${(Number(val) || 0).toFixed(2)}%`;
}

function getDay(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

// ── Tooltip ───────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, prefix = '' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-card border border-white/10 rounded-xl px-3 py-2 shadow-xl text-sm z-50">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-bold text-dark-text text-sm flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}:</span>
          <span className="text-dark-text">{prefix}{p.value?.toLocaleString('pt-BR')}</span>
        </p>
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KpiCard({ icon, iconBg, label, value, sub }: {
  icon: React.ReactNode; iconBg: string; label: string;
  value: string; sub?: React.ReactNode;
}) {
  return (
    <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col gap-2 min-w-0 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
      </div>
      <div className="text-2xl font-black text-dark-text leading-tight">{value}</div>
      {sub && <div className="text-xs text-slate-400 dark:text-slate-500">{sub}</div>}
    </div>
  );
}

// ── DateRangePicker (same as MarketingDashboard) ───────────────────────────
const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function formatDateBR(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m - 1, 1).getDay(); }

interface DateRange { start: string; end: string; }

function ModalDateRangePicker({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState('');
  const [selecting, setSelecting] = useState<string>('');
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSelecting(''); }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function stepMonth(dir: 1 | -1) {
    let m = viewMonth + dir, y = viewYear;
    if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
    setViewYear(y); setViewMonth(m);
  }

  function handleDayClick(iso: string) {
    if (!selecting) { setSelecting(iso); }
    else { const s = selecting < iso ? selecting : iso; const e = selecting < iso ? iso : selecting; onChange({ start: s, end: e }); setSelecting(''); setOpen(false); }
  }

  function isInRange(iso: string) {
    const lo = selecting ? Math.min(...[selecting, hovered || selecting].map(d => +new Date(d))) : +new Date(range.start);
    const hi = selecting ? Math.max(...[selecting, hovered || selecting].map(d => +new Date(d))) : +new Date(range.end);
    return +new Date(iso) > lo && +new Date(iso) < hi;
  }
  function isStart(iso: string) { return selecting ? iso === selecting : iso === range.start; }
  function isEnd(iso: string) { return selecting ? (hovered ? iso === (selecting < hovered ? hovered : selecting) : false) : iso === range.end; }

  const days = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const cells: (string | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => isoDate(viewYear, viewMonth, i + 1))];
  while (cells.length % 7 !== 0) cells.push(null);

  const label = range.start && range.end
    ? range.start === range.end ? formatDateBR(range.start) : `${formatDateBR(range.start)} → ${formatDateBR(range.end)}`
    : 'Selecionar período';

  function preset(lbl: string, start: string, end: string) {
    return (
      <button key={lbl} onClick={() => { onChange({ start, end }); setOpen(false); setSelecting(''); }}
        className="text-xs text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 px-2 py-1 rounded-lg transition-colors text-left whitespace-nowrap"
      >{lbl}</button>
    );
  }

  const todayIso = today.toISOString().slice(0, 10);
  const d7 = new Date(today); d7.setDate(today.getDate() - 6);
  const d30 = new Date(today); d30.setDate(today.getDate() - 29);
  const mStart = isoDate(today.getFullYear(), today.getMonth() + 1, 1);
  const mEnd = isoDate(today.getFullYear(), today.getMonth() + 1, daysInMonth(today.getFullYear(), today.getMonth() + 1));
  const pmStart = (() => { const d = new Date(today.getFullYear(), today.getMonth() - 1, 1); return isoDate(d.getFullYear(), d.getMonth() + 1, 1); })();
  const pmEnd = (() => { const d = new Date(today.getFullYear(), today.getMonth(), 0); return d.toISOString().slice(0,10); })();

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 bg-dark-card border border-violet-500/60 rounded-xl px-4 py-2.5 transition-all hover:border-violet-500">
        <Calendar size={14} className="text-violet-500" />
        <span className="text-sm font-bold text-dark-text">{label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-4" style={{ minWidth: 320 }}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            {selecting ? 'Clique na data final' : 'Selecionar Período'}
          </p>
          <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-white/10">
            {preset('Hoje', todayIso, todayIso)}
            {preset('Últ. 7 dias', d7.toISOString().slice(0,10), todayIso)}
            {preset('Últ. 30 dias', d30.toISOString().slice(0,10), todayIso)}
            {preset('Este mês', mStart, mEnd)}
            {preset('Mês passado', pmStart, pmEnd)}
          </div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => stepMonth(-1)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
              <ChevronDown size={13} className="text-slate-400 rotate-90" />
            </button>
            <span className="text-sm font-bold text-dark-text">{MESES_FULL[viewMonth - 1]} {viewYear}</span>
            <button onClick={() => stepMonth(1)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
              <ChevronDown size={13} className="text-slate-400 -rotate-90" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {WEEK_DAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-slate-500 pb-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((iso, idx) => {
              if (!iso) return <div key={idx} />;
              const start = isStart(iso), end = isEnd(iso), inRng = isInRange(iso), isToday = iso === todayIso;
              return (
                <button key={iso} onClick={() => handleDayClick(iso)}
                  onMouseEnter={() => selecting && setHovered(iso)}
                  onMouseLeave={() => selecting && setHovered('')}
                  className={`relative h-8 w-full text-xs font-semibold transition-all
                    ${start || end ? 'text-white z-10' : inRng ? 'text-violet-700 dark:text-violet-200' : 'text-dark-text hover:text-violet-600'}
                    ${inRng ? 'bg-violet-500/15' : ''}
                    ${start ? 'rounded-l-full' : ''} ${end ? 'rounded-r-full' : ''}
                    ${!start && !end ? 'rounded-full' : ''}`}>
                  <span className={`absolute inset-0.5 flex items-center justify-center rounded-full text-xs
                    ${start || end ? 'bg-violet-600 shadow-md shadow-violet-500/30' : ''}
                    ${isToday && !start && !end ? 'ring-1 ring-violet-500/60' : ''}`}>
                    {parseInt(iso.slice(8))}
                  </span>
                </button>
              );
            })}
          </div>
          {range.start && range.end && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-500">{formatDateBR(range.start)} → {formatDateBR(range.end)}</span>
              <button onClick={() => { onChange({ start: mStart, end: mEnd }); setSelecting(''); }}
                className="text-violet-400 hover:text-violet-300 transition-colors">Limpar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MetaKpis {
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  messages: number;
  ctr: number;
  primary_metric: 'messages' | 'leads';
  cost_per_result: number | null;
}

interface MetaData {
  has_meta: boolean;
  kpis: MetaKpis | null;
  daily: { date: string; spend: number; leads: number; messages: number }[];
  campaigns: {
    campaign_name: string;
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    leads: number;
    messages: number;
    cost_per_result: number | null;
  }[];
}

interface Creative {
  ad_id: string;
  ad_name: string;
  thumbnail_url: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  messages: number;
  leads: number;
}

// ── Main Component ────────────────────────────────────────────────────────
interface MetaAdsModalProps {
  projectId: string;
  partnerName: string;
  onClose: () => void;
}

export default function MetaAdsModal({ projectId, partnerName, onClose }: MetaAdsModalProps) {
  const defaultRange = (): DateRange => {
    const today = new Date();
    const d30 = new Date(today); d30.setDate(today.getDate() - 29);
    return { start: d30.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) };
  };
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MetaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loadingCreatives, setLoadingCreatives] = useState(true);
  const [exporting, setExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (r: DateRange) => {
    setLoading(true);
    setLoadingCreatives(true);
    setError(null);
    try {
      const [insightsRes, creativesRes] = await Promise.all([
        fetch(`/api/partners/${projectId}/meta-insights?start=${r.start}&end=${r.end}`),
        fetch(`/api/partners/${projectId}/meta-creatives?start=${r.start}&end=${r.end}`),
      ]);
      if (!insightsRes.ok) throw new Error((await insightsRes.json()).error || 'Erro ao carregar');
      setData(await insightsRes.json());
      if (creativesRes.ok) {
        const cData = await creativesRes.json();
        setCreatives(Array.isArray(cData?.creatives) ? cData.creatives : []);
      } else {
        setCreatives([]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingCreatives(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  const kpis = data?.kpis;
  const pm = kpis?.primary_metric || 'leads';
  const isPM = pm === 'messages';
  const dailyData = (data?.daily || []).map(d => ({ ...d, day: getDay(d.date) }));
  const campaigns = data?.campaigns || [];

  // Calc days difference for labels
  const daysDiff = Math.round((+new Date(range.end) - +new Date(range.start)) / 86400000) + 1;

  // PDF Export
  const handleExportPDF = async () => {
    if (!contentRef.current || exporting) return;
    setExporting(true);
    try {
      const el = contentRef.current;
      // Temporarily expand to capture all content
      const origMaxH = el.style.maxHeight;
      const origOverflow = el.style.overflow;
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible';

      // Wait for render
      await new Promise(r => setTimeout(r, 300));

      const dataUrl = await toPng(el, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#0f0e17',
      });

      // Restore
      el.style.maxHeight = origMaxH;
      el.style.overflow = origOverflow;

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const imgW = img.width;
      const imgH = img.height;

      // A4 landscape dimensions in mm
      const pageW = 297;
      const pageH = 210;
      const margin = 10;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Scale image to fit page width
      const scale = usableW / imgW;
      const scaledH = imgH * scale;

      // If it fits in one page
      if (scaledH <= usableH) {
        pdf.addImage(dataUrl, 'PNG', margin, margin, usableW, scaledH);
      } else {
        // Multi-page: slice the image
        const pageContentH = usableH / scale; // pixels per page
        let yOffset = 0;
        let pageNum = 0;

        while (yOffset < imgH) {
          if (pageNum > 0) pdf.addPage();
          const sliceH = Math.min(pageContentH, imgH - yOffset);
          
          // Create a canvas for the slice
          const canvas = document.createElement('canvas');
          canvas.width = imgW;
          canvas.height = sliceH;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, yOffset, imgW, sliceH, 0, 0, imgW, sliceH);
          const sliceUrl = canvas.toDataURL('image/png');
          
          pdf.addImage(sliceUrl, 'PNG', margin, margin, usableW, sliceH * scale);
          yOffset += sliceH;
          pageNum++;
        }
      }

      const fileName = `${partnerName.replace(/[^a-zA-Z0-9]/g, '_')}_MetaAds_${range.start}_${range.end}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Export PDF error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        ref={contentRef}
        className="relative bg-dark-bg rounded-2xl border border-white/10 shadow-2xl w-[1200px] max-w-[96vw] max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur-sm border-b border-white/5 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">
              {partnerName} — <span className="text-violet-400">Meta Ads</span>
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
              {formatDateBR(range.start)} → {formatDateBR(range.end)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ModalDateRangePicker range={range} onChange={setRange} />
            <button
              onClick={handleExportPDF}
              disabled={exporting || loading}
              className="p-2.5 rounded-xl bg-dark-card border border-white/10 hover:border-violet-500/60 text-slate-400 hover:text-violet-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Exportar relatório em PDF"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={32} className="text-violet-500 animate-spin" />
              <p className="text-sm text-slate-500">Carregando dados...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* No Meta token */}
          {!loading && !error && data && !data.has_meta && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <AlertCircle size={32} className="text-amber-400" />
              <p className="text-sm text-slate-400">Sem conta Meta Ads conectada para este parceiro.</p>
              <p className="text-xs text-slate-600">Vincule um token Meta Ads na aba Tokens do projeto.</p>
            </div>
          )}

          {/* Data */}
          {!loading && !error && data?.has_meta && kpis && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <KpiCard
                  icon={<DollarSign size={16} className="text-violet-400" />}
                  iconBg="bg-violet-500/15"
                  label="Valor Gasto"
                  value={fmtCurrency(kpis.spend)}
                />
                <KpiCard
                  icon={<MousePointerClick size={16} className="text-orange-400" />}
                  iconBg="bg-orange-500/15"
                  label="Cliques"
                  value={fmtInt(kpis.clicks)}
                />
                <KpiCard
                  icon={<Eye size={16} className="text-cyan-400" />}
                  iconBg="bg-cyan-500/15"
                  label="Impressões"
                  value={fmtInt(kpis.impressions)}
                />
                <KpiCard
                  icon={<Megaphone size={16} className="text-amber-400" />}
                  iconBg="bg-amber-500/15"
                  label="CTR"
                  value={fmtPct(kpis.ctr)}
                />
                <KpiCard
                  icon={isPM ? <MessageCircle size={16} className="text-emerald-400" /> : <Users size={16} className="text-emerald-400" />}
                  iconBg="bg-emerald-500/15"
                  label={isPM ? 'Mensagens' : 'Leads'}
                  value={fmtInt(isPM ? kpis.messages : kpis.leads)}
                  sub={isPM ? <>Leads: <b className="text-slate-300">{fmtInt(kpis.leads)}</b></> : kpis.messages > 0 ? <>Mensagens: <b className="text-slate-300">{fmtInt(kpis.messages)}</b></> : undefined}
                />
                <KpiCard
                  icon={<DollarSign size={16} className="text-pink-400" />}
                  iconBg="bg-pink-500/15"
                  label={isPM ? 'Custo/Msg' : 'Custo/Lead'}
                  value={kpis.cost_per_result != null ? fmtCurrency(kpis.cost_per_result) : '—'}
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Investimento Diário */}
                <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
                  <h2 className="text-sm font-bold text-dark-text">Investimento Diário</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 mt-0.5">Gastos em anúncios — {formatDateBR(range.start)} → {formatDateBR(range.end)}</p>
                  {dailyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={210} style={{ outline: 'none' }}>
                      <ComposedChart data={dailyData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} style={{ outline: 'none' }}>
                        <defs>
                          <linearGradient id="colorSpendModal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,120,0.15)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false}
                          tickFormatter={v => `R$${(v).toFixed(0)}`} width={50} />
                        <Tooltip content={<CustomTooltip prefix="R$ " />} />
                        <Area type="monotone" dataKey="spend" name="Gasto" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorSpendModal)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[210px] flex items-center justify-center text-slate-500 text-sm">Sem dados</div>
                  )}
                </div>

                {/* Resultados Diários (dinâmico) */}
                <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
                  <h2 className="text-sm font-bold text-dark-text">{isPM ? 'Mensagens Diárias' : 'Leads Diários'}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 mt-0.5">{isPM ? 'Conversas WhatsApp' : 'Capturas'} — {formatDateBR(range.start)} → {formatDateBR(range.end)}</p>
                  {dailyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={210} style={{ outline: 'none' }}>
                      <ComposedChart data={dailyData} margin={{ top: 8, right: 0, left: -24, bottom: 0 }} style={{ outline: 'none' }}>
                        <defs>
                          <linearGradient id="colorResultModal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,120,0.15)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey={isPM ? 'messages' : 'leads'} name={isPM ? 'Mensagens' : 'Leads'} stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorResultModal)"
                          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3, stroke: '#1a1827' }}
                          activeDot={{ r: 4, strokeWidth: 0 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[210px] flex items-center justify-center text-slate-500 text-sm">Sem dados</div>
                  )}
                </div>
              </div>

              {/* Campaigns Table */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
                      <Megaphone size={14} className="text-violet-500" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-dark-text">Campanhas</h2>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Ordenado por Valor Gasto</p>
                    </div>
                  </div>
                  <span className="bg-violet-500/15 text-violet-500 text-[10px] font-bold px-3 py-1 rounded-full">
                    {campaigns.length} Campanha{campaigns.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {campaigns.length === 0 ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-10 text-sm">
                    Nenhum dado de campanha no período
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left" style={{ borderColor: 'rgba(100,100,120,0.2)' }}>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 pr-4">Nome da Campanha</th>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 px-3 text-right">{isPM ? 'Mensagens' : 'Leads'}</th>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 px-3 text-right">Cliques</th>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 px-3 text-right">Impressões</th>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 px-3 text-right">CTR</th>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 px-3 text-right">{isPM ? 'Custo/Msg' : 'Custo/Lead'}</th>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 pl-3 text-right">Valor Gasto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c, i) => (
                          <tr key={i} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'rgba(100,100,120,0.1)' }}>
                            <td className="py-3 pr-4">
                              <span className="text-dark-text font-medium text-sm">{c.campaign_name}</span>
                            </td>
                            <td className="py-3 px-3 text-right text-emerald-400 font-bold">{fmtInt(isPM ? c.messages : c.leads)}</td>
                            <td className="py-3 px-3 text-right text-slate-300">{fmtInt(c.clicks)}</td>
                            <td className="py-3 px-3 text-right text-slate-300">{fmtInt(c.impressions)}</td>
                            <td className="py-3 px-3 text-right text-slate-300">{fmtPct(c.ctr)}</td>
                            <td className="py-3 px-3 text-right text-slate-300">{c.cost_per_result != null ? fmtCurrency(c.cost_per_result) : '—'}</td>
                            <td className="py-3 pl-3 text-right text-violet-400 font-bold">{fmtCurrency(c.spend)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Criativos ──────────────────────────────────────────── */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center">
                      <ImageIcon size={14} className="text-violet-500" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-dark-text">Criativos</h2>
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Desempenho por anúncio</p>
                    </div>
                  </div>
                  <span className="bg-violet-500/15 text-violet-500 text-[10px] font-bold px-3 py-1 rounded-full">
                    {creatives.length} Criativo{creatives.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {loadingCreatives ? (
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex items-center gap-4 animate-pulse">
                        <div className="w-[80px] h-[80px] rounded-xl bg-white/5" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-48 rounded bg-white/5" />
                          <div className="h-3 w-32 rounded bg-white/5" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : creatives.length === 0 ? (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-10 text-sm">
                    Nenhum criativo no período
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left" style={{ borderColor: 'rgba(100,100,120,0.2)' }}>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 pr-4" style={{ width: 96 }}>Imagem</th>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 pr-4">Nome do Criativo</th>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 px-3 text-right">
                            <span className="flex items-center justify-end gap-1">{isPM ? <><MessageCircle size={10} /> Mensagens</> : <>Leads</>}</span>
                          </th>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 px-3 text-right">Cliques</th>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 px-3 text-right">Impressões</th>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 px-3 text-right">CTR</th>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 px-3 text-right">{isPM ? 'Custo/Msg' : 'Custo/Lead'}</th>
                          <th className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pb-3 pl-3 text-right">Investimento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creatives.map((cr, i) => {
                          const resultVal = isPM ? cr.messages : cr.leads;
                          const costPerResult = resultVal > 0 ? cr.spend / resultVal : null;
                          return (
                          <tr key={cr.ad_id || i} className="border-b hover:bg-white/[0.02] transition-colors" style={{ borderColor: 'rgba(100,100,120,0.1)' }}>
                            <td className="py-3 pr-4">
                              {cr.thumbnail_url ? (
                                <img
                                  src={cr.thumbnail_url}
                                  alt={cr.ad_name}
                                  loading="lazy"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                                  className="w-[80px] h-[80px] rounded-xl object-cover border border-white/10"
                                />
                              ) : null}
                              <div className={`w-[80px] h-[80px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${cr.thumbnail_url ? 'hidden' : ''}`}>
                                <ImageIcon size={24} className="text-slate-600" />
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-dark-text font-medium text-sm line-clamp-2">{cr.ad_name}</span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className="text-emerald-400 font-black text-base">{fmtInt(resultVal)}</span>
                            </td>
                            <td className="py-3 px-3 text-right text-slate-300">{fmtInt(cr.clicks)}</td>
                            <td className="py-3 px-3 text-right text-slate-300">{fmtInt(cr.impressions)}</td>
                            <td className="py-3 px-3 text-right text-slate-300">{fmtPct(cr.ctr)}</td>
                            <td className="py-3 px-3 text-right text-slate-300 font-bold">{costPerResult != null ? fmtCurrency(costPerResult) : '—'}</td>
                            <td className="py-3 pl-3 text-right text-violet-400 font-bold">{fmtCurrency(cr.spend)}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Empty state for all data */}
              {kpis.spend === 0 && kpis.clicks === 0 && kpis.leads === 0 && (
                <div className="text-center text-slate-500 py-6 text-sm">
                  Nenhum dado de campanha encontrado nos últimos {days} dias.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
