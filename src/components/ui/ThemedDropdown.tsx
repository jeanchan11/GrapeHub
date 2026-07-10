import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface ThemedOption { value: string; label: string; }

interface Props {
  value: string;
  options: ThemedOption[];
  onChange: (v: string) => void;
  className?: string;       // wrapper (largura, etc.)
  buttonClassName?: string;
  align?: 'left' | 'right';
  title?: string;
}

/**
 * Dropdown custom (via portal) que substitui o <select> nativo no app interno.
 * Cores do menu são inline (concretas) por tema — evita a fragilidade do `dark:`
 * com cor custom em elemento portalado pro body no Tailwind CDN.
 */
const ThemedDropdown: React.FC<Props> = ({ value, options, onChange, className = '', buttonClassName = '', align = 'left', title }) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const isDark = typeof document !== 'undefined' && !document.documentElement.classList.contains('light');
  const c = isDark
    ? { menuBg: '#1c0e3a', border: 'rgba(255,255,255,0.14)', text: '#cbd5e1', textSel: '#c4b5fd', hover: 'rgba(255,255,255,0.07)' }
    : { menuBg: '#ffffff', border: 'rgba(226,232,240,1)', text: '#334155', textSel: '#7c3aed', hover: '#f1f5f9' };

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const MENU_H = 300;
      const below = window.innerHeight - r.bottom;
      const openUp = below < MENU_H && r.top > below;
      const width = Math.max(r.width, 200);
      const top = openUp ? Math.max(8, r.top - 6 - Math.min(MENU_H, r.top - 16)) : r.bottom + 6;
      let left = align === 'right' ? r.right - width : r.left;
      left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
      setPos({ top, left, width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && menuRef.current && !menuRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const current = options.find(o => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        title={title}
        onClick={() => setOpen(v => !v)}
        className={`flex items-center justify-between gap-2 w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:border-violet-500/50 outline-none transition-all ${buttonClassName}`}
      >
        <span className="truncate">{current?.label ?? '—'}</span>
        <ChevronDown size={14} className={`opacity-50 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[10001] rounded-xl py-1.5 max-h-72 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, minWidth: pos.width, background: c.menuBg, border: `1px solid ${c.border}`, boxShadow: '0 12px 32px -8px rgba(0,0,0,0.45)' }}
        >
          {options.map(o => {
            const sel = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onMouseEnter={() => setHovered(o.value)}
                onMouseLeave={() => setHovered(h => (h === o.value ? null : h))}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
                style={{ color: sel ? c.textSel : c.text, fontWeight: sel ? 700 : 500, background: hovered === o.value ? c.hover : 'transparent' }}
              >
                <span className="flex-1 truncate">{o.label}</span>
                {sel && <Check size={14} style={{ color: '#8b5cf6' }} className="shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ThemedDropdown;
