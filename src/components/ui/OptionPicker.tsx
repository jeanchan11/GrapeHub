import React, { useState, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface OptionPickerOption {
  label: string;
  color?: string;
  bg?: string;
  border?: string;
}

interface OptionPickerProps {
  value: string | null | undefined;
  options: OptionPickerOption[];
  placeholder?: string;
  onChange: (val: string | null) => void;
  emptyLabel?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Custom dropdown component that replaces native <select> elements.
 * Matches the GrapeHub design system with dark theme support,
 * color-coded pills, checkmarks, and click-outside-to-close behavior.
 */
const OptionPicker: React.FC<OptionPickerProps> = ({
  value,
  options,
  placeholder,
  onChange,
  emptyLabel,
  compact = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.label === value);
  const cs = selected ? {
    bg: selected.bg || (selected.color ? selected.color + '26' : undefined),
    text: selected.color || '#94a3b8',
    border: selected.border || (selected.color ? selected.color + '4D' : undefined),
  } : null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 rounded-lg transition-all cursor-pointer ${
          compact
            ? 'px-2 py-1 text-[10px] font-bold uppercase tracking-wider border hover:bg-white/5'
            : 'px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border hover:bg-white/5'
        }`}
        style={cs ? {
          background: cs.bg,
          color: cs.text,
          borderColor: cs.border,
        } : {
          background: 'transparent',
          borderColor: compact ? 'transparent' : 'rgba(255,255,255,0.1)',
          color: '#94a3b8',
        }}
      >
        {value || placeholder || '—'}
        <ChevronDown size={12} className="opacity-50" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-dark-card border border-white/10 rounded-xl shadow-2xl py-1.5 min-w-[160px] animate-in fade-in slide-in-from-top-1 duration-150">
          {emptyLabel !== undefined && (
            <button
              onClick={() => { onChange(null); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-500 hover:bg-white/5 transition-colors"
            >
              <span className="flex-1 text-left font-medium">{emptyLabel || '—'}</span>
              {!value && <Check size={14} className="text-slate-400 shrink-0" />}
            </button>
          )}
          {options.map(opt => (
            <button
              key={opt.label}
              onClick={() => { onChange(opt.label); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-dark-text hover:bg-white/5 transition-colors"
            >
              {opt.color && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: opt.color }} />
              )}
              <span className="flex-1 text-left font-medium">{opt.label}</span>
              {value === opt.label && <Check size={14} className="text-violet-400 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default OptionPicker;
