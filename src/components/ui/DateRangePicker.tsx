import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown } from 'lucide-react';

export interface DateRange { start: string; end: string; }

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const fmtBR = (iso: string) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const isoDate = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();
const firstDayOfMonth = (y: number, m: number) => new Date(y, m - 1, 1).getDay();

interface Props {
  range: DateRange;
  onChange: (r: DateRange) => void;
  dark?: boolean;
  align?: 'left' | 'right';
  placeholder?: string;
}

/**
 * Date range picker (presets + calendário). Cores inline por tema (`dark`),
 * menu portalado pro body — funciona no app (modal/abas) e no portal do cliente.
 */
const DateRangePicker: React.FC<Props> = ({ range, onChange, dark, align = 'right', placeholder = 'Selecionar período' }) => {
  // Se `dark` não for informado, segue o tema do app (classe .light no <html>)
  const isDark = dark ?? (typeof document !== 'undefined' ? !document.documentElement.classList.contains('light') : true);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState('');
  const [selecting, setSelecting] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  const c = isDark
    ? { btn: '#14082e', panel: '#1c0e3a', border: 'rgba(255,255,255,0.12)', text: '#e8e6f2', muted: '#94a3b8', hover: 'rgba(255,255,255,0.08)' }
    : { btn: '#f8fafc', panel: '#ffffff', border: 'rgba(226,232,240,1)', text: '#1e293b', muted: '#64748b', hover: '#f1f5f9' };
  const VIOLET = '#7c3aed';

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const W = 320, H = 430;
      const openUp = window.innerHeight - r.bottom < H && r.top > H;
      const top = openUp ? Math.max(8, r.top - 8 - H) : r.bottom + 8;
      let left = align === 'right' ? r.right - W : r.left;
      left = Math.min(Math.max(8, left), window.innerWidth - W - 8);
      setPos({ top, left });
    };
    place();
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && menuRef.current && !menuRef.current.contains(t)) { setOpen(false); setSelecting(''); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const stepMonth = (dir: 1 | -1) => {
    let m = viewMonth + dir, y = viewYear;
    if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
    setViewYear(y); setViewMonth(m);
  };
  const handleDay = (iso: string) => {
    if (!selecting) setSelecting(iso);
    else { const s = selecting < iso ? selecting : iso; const e = selecting < iso ? iso : selecting; onChange({ start: s, end: e }); setSelecting(''); setOpen(false); }
  };
  const inRange = (iso: string) => {
    const lo = selecting ? Math.min(...[selecting, hovered || selecting].map(d => +new Date(d))) : +new Date(range.start);
    const hi = selecting ? Math.max(...[selecting, hovered || selecting].map(d => +new Date(d))) : +new Date(range.end);
    const v = +new Date(iso); return v > lo && v < hi;
  };
  const isStart = (iso: string) => selecting ? iso === selecting : iso === range.start;
  const isEnd = (iso: string) => selecting ? (hovered ? iso === (selecting < hovered ? hovered : selecting) : false) : iso === range.end;

  const days = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const cells: (string | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => isoDate(viewYear, viewMonth, i + 1))];
  while (cells.length % 7 !== 0) cells.push(null);

  const label = range.start && range.end ? (range.start === range.end ? fmtBR(range.start) : `${fmtBR(range.start)} → ${fmtBR(range.end)}`) : placeholder;
  const todayIso = today.toISOString().slice(0, 10);
  const d7 = new Date(today); d7.setDate(today.getDate() - 6);
  const d30 = new Date(today); d30.setDate(today.getDate() - 29);
  const mStart = isoDate(today.getFullYear(), today.getMonth() + 1, 1);
  const mEnd = isoDate(today.getFullYear(), today.getMonth() + 1, daysInMonth(today.getFullYear(), today.getMonth() + 1));
  const pmStart = (() => { const d = new Date(today.getFullYear(), today.getMonth() - 1, 1); return isoDate(d.getFullYear(), d.getMonth() + 1, 1); })();
  const pmEnd = (() => { const d = new Date(today.getFullYear(), today.getMonth(), 0); return d.toISOString().slice(0, 10); })();

  const preset = (lbl: string, start: string, end: string) => (
    <button key={lbl} onClick={() => { onChange({ start, end }); setOpen(false); setSelecting(''); }}
      className="text-xs px-2 py-1 rounded-lg transition-colors text-left whitespace-nowrap"
      style={{ color: c.muted }}
      onMouseEnter={e => { e.currentTarget.style.background = c.hover; e.currentTarget.style.color = VIOLET; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = c.muted; }}>
      {lbl}
    </button>
  );

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 transition-all"
        style={{ background: c.btn, border: `1px solid ${open ? VIOLET : 'rgba(124,58,237,0.5)'}` }}>
        <Calendar size={14} style={{ color: VIOLET }} />
        <span className="text-sm font-bold" style={{ color: c.text }}>{label}</span>
        <ChevronDown size={14} style={{ color: c.muted }} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && pos && createPortal(
        <div ref={menuRef} className="fixed z-[10001] rounded-2xl p-4" style={{ top: pos.top, left: pos.left, width: 320, background: c.panel, border: `1px solid ${c.border}`, boxShadow: '0 16px 40px -8px rgba(0,0,0,0.5)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: c.muted }}>{selecting ? 'Clique na data final' : 'Selecionar Período'}</p>

          <div className="flex flex-wrap gap-1 mb-3 pb-3" style={{ borderBottom: `1px solid ${c.border}` }}>
            {preset('Hoje', todayIso, todayIso)}
            {preset('Últ. 7 dias', d7.toISOString().slice(0, 10), todayIso)}
            {preset('Últ. 30 dias', d30.toISOString().slice(0, 10), todayIso)}
            {preset('Este mês', mStart, mEnd)}
            {preset('Mês passado', pmStart, pmEnd)}
          </div>

          <div className="flex items-center justify-between mb-3">
            <button onClick={() => stepMonth(-1)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: c.muted }} onMouseEnter={e => e.currentTarget.style.background = c.hover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <ChevronDown size={13} className="rotate-90" />
            </button>
            <span className="text-sm font-bold" style={{ color: c.text }}>{MESES_FULL[viewMonth - 1]} {viewYear}</span>
            <button onClick={() => stepMonth(1)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ color: c.muted }} onMouseEnter={e => e.currentTarget.style.background = c.hover} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <ChevronDown size={13} className="-rotate-90" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEK_DAYS.map((d, i) => <div key={i} className="text-center text-[10px] font-bold pb-1" style={{ color: c.muted }}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((iso, idx) => {
              if (!iso) return <div key={idx} />;
              const st = isStart(iso), en = isEnd(iso), rng = inRange(iso), isToday = iso === todayIso;
              return (
                <button key={iso} onClick={() => handleDay(iso)} onMouseEnter={() => selecting && setHovered(iso)} onMouseLeave={() => selecting && setHovered('')}
                  className={`relative h-8 w-full text-xs font-semibold ${st ? 'rounded-l-full' : ''} ${en ? 'rounded-r-full' : ''} ${!st && !en ? 'rounded-full' : ''}`}
                  style={{ background: rng ? 'rgba(124,58,237,0.15)' : 'transparent', color: (st || en) ? '#fff' : c.text }}>
                  <span className="absolute inset-0.5 flex items-center justify-center rounded-full text-xs"
                    style={{ background: (st || en) ? VIOLET : 'transparent', boxShadow: (st || en) ? '0 2px 8px rgba(124,58,237,0.4)' : undefined, border: (isToday && !st && !en) ? '1px solid rgba(124,58,237,0.6)' : undefined }}>
                    {parseInt(iso.slice(8))}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-3 flex items-center justify-between text-xs" style={{ borderTop: `1px solid ${c.border}` }}>
            <span style={{ color: c.muted }}>{range.start && range.end ? `${fmtBR(range.start)} → ${fmtBR(range.end)}` : 'Nenhum período'}</span>
            <button onClick={() => { onChange({ start: '', end: '' }); setSelecting(''); }} style={{ color: VIOLET }} className="hover:opacity-80 transition-opacity">Limpar</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DateRangePicker;
