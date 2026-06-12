import React, { useState, useEffect, useCallback, useRef } from 'react';
import SplitHeadline from '../components/SplitHeadline';
import { Search, Download, Users, Phone, Mail, Filter, X, Calendar, Tag, DollarSign, ArrowRight, Clock, MessageSquare, User, MapPin, FileText, Circle, CheckCircle2, XCircle, Loader2, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import LoadingSpinner from '../components/LoadingSpinner';
import { createPortal } from 'react-dom';

// ── DateRangePicker (same as CrmMetricas) ─────────────────
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function formatDateBR(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function daysInMonthFn(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function firstDayOfMonth(y: number, m: number) {
  return new Date(y, m - 1, 1).getDay();
}

interface DateRange { start: string; end: string; }

function DateRangePicker({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState('');
  const [selecting, setSelecting] = useState<string>('');
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSelecting('');
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function stepMonth(dir: 1 | -1) {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setViewYear(y); setViewMonth(m);
  }

  function handleDayClick(iso: string) {
    if (!selecting) {
      setSelecting(iso);
    } else {
      const s = selecting < iso ? selecting : iso;
      const e = selecting < iso ? iso : selecting;
      onChange({ start: s, end: e });
      setSelecting('');
      setOpen(false);
    }
  }

  function isInRange(iso: string) {
    const lo = selecting ? Math.min(...[selecting, hovered || selecting].map(d => +new Date(d))) : +new Date(range.start);
    const hi = selecting ? Math.max(...[selecting, hovered || selecting].map(d => +new Date(d))) : +new Date(range.end);
    const v  = +new Date(iso);
    return v > lo && v < hi;
  }

  function isStart(iso: string) {
    return selecting ? iso === selecting : iso === range.start;
  }
  function isEnd(iso: string) {
    if (selecting) return hovered ? iso === (selecting < hovered ? hovered : selecting) : false;
    return iso === range.end;
  }

  const days = daysInMonthFn(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const cells: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: days }, (_, i) => isoDate(viewYear, viewMonth, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const label = range.start && range.end
    ? range.start === range.end
      ? formatDateBR(range.start)
      : `${formatDateBR(range.start)} → ${formatDateBR(range.end)}`
    : 'Selecionar período';

  function preset(presetLabel: string, start: string, end: string) {
    return (
      <button
        key={presetLabel}
        onClick={() => { onChange({ start, end }); setOpen(false); setSelecting(''); }}
        className="text-xs text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 px-2 py-1 rounded-lg transition-colors text-left whitespace-nowrap"
      >{presetLabel}</button>
    );
  }

  const todayIso = today.toISOString().slice(0, 10);
  const d7 = new Date(today); d7.setDate(today.getDate() - 6);
  const d30 = new Date(today); d30.setDate(today.getDate() - 29);
  const mStart = isoDate(today.getFullYear(), today.getMonth() + 1, 1);
  const mEnd = isoDate(today.getFullYear(), today.getMonth() + 1, daysInMonthFn(today.getFullYear(), today.getMonth() + 1));
  const pmStart = (() => { const d = new Date(today.getFullYear(), today.getMonth() - 1, 1); return isoDate(d.getFullYear(), d.getMonth() + 1, 1); })();
  const pmEnd = (() => { const d = new Date(today.getFullYear(), today.getMonth(), 0); return d.toISOString().slice(0,10); })();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 bg-dark-card border border-violet-500/60 rounded-xl px-4 py-2.5 transition-all hover:border-violet-500"
      >
        <Calendar size={14} className="text-violet-500" />
        <span className="text-sm font-bold text-dark-text">{label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-4" style={{ minWidth: 320 }}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            {selecting ? 'Clique na data final' : 'Selecionar Período'}
          </p>

          {/* Presets */}
          <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-white/10">
            {preset('Hoje', todayIso, todayIso)}
            {preset('Últ. 7 dias', d7.toISOString().slice(0,10), todayIso)}
            {preset('Últ. 30 dias', d30.toISOString().slice(0,10), todayIso)}
            {preset('Este mês', mStart, mEnd)}
            {preset('Mês passado', pmStart, pmEnd)}
          </div>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => stepMonth(-1)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
              <ChevronDown size={13} className="text-slate-400 rotate-90" />
            </button>
            <span className="text-sm font-bold text-dark-text">{MESES_FULL[viewMonth - 1]} {viewYear}</span>
            <button onClick={() => stepMonth(1)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
              <ChevronDown size={13} className="text-slate-400 -rotate-90" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEK_DAYS.map((wd, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-slate-500 pb-1">{wd}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((iso, idx) => {
              if (!iso) return <div key={idx} />;
              const start = isStart(iso);
              const end = isEnd(iso);
              const inRng = isInRange(iso);
              const isTodayCell = iso === todayIso;
              return (
                <button
                  key={iso}
                  onClick={() => handleDayClick(iso)}
                  onMouseEnter={() => selecting && setHovered(iso)}
                  onMouseLeave={() => selecting && setHovered('')}
                  className={`relative h-8 w-full text-xs font-semibold transition-all
                    ${start || end ? 'text-white z-10' : inRng ? 'text-violet-700 dark:text-violet-200' : 'text-dark-text hover:text-violet-600'}
                    ${inRng ? 'bg-violet-500/15' : ''}
                    ${start ? 'rounded-l-full' : ''}
                    ${end ? 'rounded-r-full' : ''}
                    ${!start && !end ? 'rounded-full' : ''}
                  `}
                >
                  <span className={`absolute inset-0.5 flex items-center justify-center rounded-full text-xs
                    ${start || end ? 'bg-violet-600 shadow-md shadow-violet-500/30' : ''}
                    ${isTodayCell && !start && !end ? 'ring-1 ring-violet-500/60' : ''}
                  `}>
                    {parseInt(iso.slice(8))}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {range.start && range.end && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-500">{formatDateBR(range.start)} → {formatDateBR(range.end)}</span>
              <button
                onClick={() => { onChange({ start: '', end: '' }); setSelecting(''); }}
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >Limpar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Lead {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  origem: string | null;
  valor: number | null;
  coluna_nome: string | null;
  coluna_color: string | null;
  responsavel_name: string | null;
  tags: Array<string | { name: string; color?: string }>;
  created_at: string;
  etapa_updated_at: string | null;
  kanban_name: string | null;
  is_lost: boolean;
  observacoes: string | null;
  faturamento: string | null;
  form_nome_fantasia: string | null;
  form_cidade: string | null;
}

interface HistoryEntry {
  id: number;
  lead_id: string;
  action_type: string | null;
  description: string | null;
  user_name: string | null;
  from_coluna_name: string | null;
  to_coluna_name: string | null;
  moved_by: string | null;
  created_at: string;
}

interface Note {
  id: number;
  lead_id: string;
  content: string;
  user_name: string | null;
  created_at: string;
}

interface Kanban {
  id: string;
  nome: string;
}

// ── Helpers ──────────────────────────────────────────────
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

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

type LeadStatus = 'aberto' | 'ganho' | 'perdido';

function getLeadStatus(lead: Lead): LeadStatus {
  if (lead.is_lost) return 'perdido';
  const col = (lead.coluna_nome || '').toLowerCase();
  if (col.includes('ganho') || col.includes('fechado')) return 'ganho';
  return 'aberto';
}

const statusConfig: Record<LeadStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  aberto: {
    label: 'Aberto',
    icon: <Circle size={12} />,
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  ganho: {
    label: 'Ganho',
    icon: <CheckCircle2 size={12} />,
    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  perdido: {
    label: 'Perdido',
    icon: <XCircle size={12} />,
    cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  },
};

// ── History action label / icon ──────────────────────────
function historyLabel(entry: HistoryEntry): { icon: React.ReactNode; text: string; color: string } {
  const t = entry.action_type || '';
  if (t === 'stage_changed' || (!t && entry.from_coluna_name && entry.to_coluna_name)) {
    return {
      icon: <ArrowRight size={14} />,
      text: `Movido de "${entry.from_coluna_name || '?'}" → "${entry.to_coluna_name || '?'}"`,
      color: 'text-blue-400',
    };
  }
  if (t === 'note_created') {
    return { icon: <MessageSquare size={14} />, text: entry.description || 'Anotação criada', color: 'text-amber-400' };
  }
  if (t === 'lead_won') {
    return { icon: <CheckCircle2 size={14} />, text: 'Lead ganho ✅', color: 'text-emerald-400' };
  }
  if (t === 'lead_lost') {
    return { icon: <XCircle size={14} />, text: entry.description || 'Lead perdido', color: 'text-rose-400' };
  }
  if (t === 'reaberto') {
    return { icon: <Circle size={14} />, text: entry.description || 'Lead reaberto', color: 'text-violet-400' };
  }
  if (t === 'call') {
    return { icon: <Phone size={14} />, text: entry.description || 'Ligação realizada', color: 'text-cyan-400' };
  }
  if (t === 'meeting_created') {
    return { icon: <Calendar size={14} />, text: entry.description || 'Reunião marcada', color: 'text-violet-400' };
  }
  // fallback
  return {
    icon: <Clock size={14} />,
    text: entry.description || entry.action_type || 'Ação registrada',
    color: 'text-slate-400',
  };
}

// ── Lead Detail Modal ────────────────────────────────────
function LeadDetailModal({ lead, onClose, getToken }: { lead: Lead; onClose: () => void; getToken: () => Promise<string | null> }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const status = getLeadStatus(lead);
  const stCfg = statusConfig[status];

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const [hRes, nRes] = await Promise.all([
          fetch(`/api/crm-comercial/lead-history/${lead.id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/crm-comercial/notes?lead_id=${lead.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (hRes.ok) setHistory(await hRes.json());
        if (nRes.ok) setNotes(await nRes.json());
      } catch { /* silent */ }
      setLoadingHistory(false);
    })();
  }, [lead.id]);

  // Merge history + notes into timeline
  const timeline = [
    ...history.map(h => ({ type: 'history' as const, data: h, date: h.created_at })),
    ...notes.map(n => ({ type: 'note' as const, data: n, date: n.created_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Remove notes that are already in history as note_created (avoid duplicates)
  const seenNoteTexts = new Set(history.filter(h => h.action_type === 'note_created').map(h => h.description));
  const filteredTimeline = timeline.filter(item => {
    if (item.type === 'note' && seenNoteTexts.has(item.data.content)) return false;
    return true;
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#151221] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(lead.nome)}`}>
              {lead.nome.substring(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">{lead.nome}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${stCfg.cls}`}>
                  {stCfg.icon}
                  {stCfg.label}
                </span>
                {lead.kanban_name && (
                  <span className="text-[10px] text-slate-500">{lead.kanban_name}</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoItem icon={<Phone size={14} />} label="Telefone" value={formatPhone(lead.telefone)} />
            <InfoItem icon={<Mail size={14} />} label="Email" value={lead.email || '-'} />
            <InfoItem icon={<MapPin size={14} />} label="Origem" value={lead.origem || '-'} />
            <InfoItem icon={<DollarSign size={14} />} label="Valor" value={lead.valor != null ? currencyFormatter.format(lead.valor) : '-'} />
            <InfoItem icon={<User size={14} />} label="Responsável" value={lead.responsavel_name || '-'} />
            <InfoItem icon={<Tag size={14} />} label="Etapa" value={lead.coluna_nome || '-'} />
            {lead.form_nome_fantasia && <InfoItem icon={<FileText size={14} />} label="Nome Fantasia" value={lead.form_nome_fantasia} />}
            {lead.form_cidade && <InfoItem icon={<MapPin size={14} />} label="Cidade" value={lead.form_cidade} />}
            <InfoItem icon={<Calendar size={14} />} label="Criado em" value={lead.created_at ? formatDateTime(lead.created_at) : '-'} />
            {lead.faturamento && <InfoItem icon={<DollarSign size={14} />} label="Faturamento" value={lead.faturamento} />}
          </div>

          {/* Tags */}
          {(lead.tags || []).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {lead.tags.map((tag, idx) => {
                  const tagName = typeof tag === 'string' ? tag : tag.name;
                  const tagColor = typeof tag === 'object' && tag.color ? tag.color : undefined;
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={tagColor ? { backgroundColor: `${tagColor}20`, color: tagColor } : { backgroundColor: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}
                    >
                      {tagName}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Observações */}
          {lead.observacoes && (
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Observações</p>
              <p className="text-sm text-slate-300 bg-white/[0.03] rounded-xl p-3 border border-white/5">{lead.observacoes}</p>
            </div>
          )}

          {/* Timeline / Histórico */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Histórico</p>
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-violet-500" />
              </div>
            ) : filteredTimeline.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Nenhum registro de histórico.</p>
            ) : (
              <div className="relative pl-5 space-y-0">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/10" />

                {filteredTimeline.map((item, idx) => {
                  if (item.type === 'history') {
                    const h = item.data as HistoryEntry;
                    const label = historyLabel(h);
                    return (
                      <div key={`h-${h.id || idx}`} className="relative pb-4">
                        <div className={`absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 border-[#151221] flex items-center justify-center ${
                          label.color.replace('text-', 'bg-').replace('400', '500/20')
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${label.color.replace('text-', 'bg-')}`} />
                        </div>
                        <div className="ml-2">
                          <div className="flex items-center gap-2">
                            <span className={`${label.color}`}>{label.icon}</span>
                            <span className="text-xs text-slate-300 leading-snug">{label.text}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {(h.user_name || h.moved_by) && (
                              <span className="text-[10px] text-slate-500">{h.user_name || h.moved_by}</span>
                            )}
                            <span className="text-[10px] text-slate-600">{formatDateTime(h.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const n = item.data as Note;
                    return (
                      <div key={`n-${n.id}`} className="relative pb-4">
                        <div className="absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 border-[#151221] bg-amber-500/20 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        </div>
                        <div className="ml-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare size={14} className="text-amber-400" />
                            <span className="text-xs text-amber-300 font-medium">Anotação</span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 bg-white/[0.03] rounded-lg p-2 border border-white/5 leading-relaxed">{n.content}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {n.user_name && <span className="text-[10px] text-slate-500">{n.user_name}</span>}
                            <span className="text-[10px] text-slate-600">{formatDateTime(n.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-slate-500">{icon}</span>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm text-slate-200 font-medium truncate">{value}</p>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────
type StatusFilter = 'todos' | 'ativos' | 'ganhos' | 'perdidos';

function defaultDateRange(): DateRange {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth() + 1;
  const start = `${y}-${String(m).padStart(2,'0')}-01`;
  const end = `${y}-${String(m).padStart(2,'0')}-${String(daysInMonthFn(y, m)).padStart(2,'0')}`;
  return { start, end };
}

export default function CrmLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [kanbans, setKanbans] = useState<Kanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [kanbanFilter, setKanbanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      return (await auth.currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }, []);

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
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      !s ||
      (l.nome && l.nome.toLowerCase().includes(s)) ||
      (l.telefone && l.telefone.toLowerCase().includes(s)) ||
      (l.email && l.email.toLowerCase().includes(s));

    const matchesKanban = !kanbanFilter || l.kanban_name === kanbanFilter;

    const st = getLeadStatus(l);
    const matchesStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'ativos' && st === 'aberto') ||
      (statusFilter === 'ganhos' && st === 'ganho') ||
      (statusFilter === 'perdidos' && st === 'perdido');

    // Date filter — use etapa_updated_at for ganhos/perdidos, created_at for others
    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      const useStatusDate = (statusFilter === 'ganhos' || statusFilter === 'perdidos') && l.etapa_updated_at;
      const dateRef = useStatusDate ? l.etapa_updated_at! : l.created_at;
      if (dateRef) {
        const dateSlice = dateRef.slice(0, 10);
        matchesDate = dateSlice >= dateRange.start && dateSlice <= dateRange.end;
      }
    }

    return matchesSearch && matchesKanban && matchesStatus && matchesDate;
  });

  // ---------- CSV Export ----------
  const handleExportCSV = () => {
    const headers = [
      'Nome', 'Telefone', 'Email', 'Origem', 'Valor', 'Etapa', 'Status',
      'Responsável', 'Tags', 'Kanban', 'Criado em', 'Mudou status',
    ];
    const rows = filteredLeads.map((l) => [
      `"${l.nome || ''}"`,
      `"${l.telefone || ''}"`,
      `"${l.email || ''}"`,
      `"${l.origem || ''}"`,
      `"${l.valor ?? ''}"`,
      `"${l.coluna_nome || ''}"`,
      `"${statusConfig[getLeadStatus(l)].label}"`,
      `"${l.responsavel_name || ''}"`,
      `"${(l.tags || []).map(t => typeof t === 'string' ? t : t.name).join(', ')}"`,
      `"${l.kanban_name || ''}"`,
      `"${l.created_at || ''}"`,
      `"${l.etapa_updated_at || ''}"`,
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
            {(['todos', 'ativos', 'ganhos', 'perdidos'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-violet-500/20 text-violet-400 font-semibold'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Date Range Picker */}
          <DateRangePicker range={dateRange} onChange={setDateRange} />

          {/* Export */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white dark:bg-[#151221] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden min-h-[500px]">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.03]">
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400">Nome</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Telefone</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Email</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Origem</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Valor</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Etapa</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Status</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Responsável</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Tags</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Criado em</th>
                  <th className="px-4 py-4 font-semibold text-slate-600 dark:text-slate-400">Mudou status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-20 text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <Users size={32} className="opacity-20" />
                        <p>Nenhum lead encontrado.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((l) => {
                    const st = getLeadStatus(l);
                    const stC = statusConfig[st];
                    return (
                      <tr
                        key={l.id}
                        onClick={() => setSelectedLead(l)}
                        className={`border-b border-slate-50 dark:border-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer ${
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

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stC.cls}`}>
                            {stC.icon}
                            {stC.label}
                          </span>
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

                        {/* Mudou status */}
                        <td className="px-4 py-3 text-xs">
                          {l.etapa_updated_at ? (
                            <span className="text-slate-500 dark:text-slate-400">
                              {timeAgo(l.etapa_updated_at)}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Lead Detail Popup ── */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          getToken={getToken}
        />
      )}
    </div>
  );
}
