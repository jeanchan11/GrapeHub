import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface MultiOption {
  label: string;
  color?: string;
}

interface MultiOptionPickerProps {
  /** Seleção atual. Vazio = "todas". */
  values: string[];
  options: MultiOption[];
  onChange: (values: string[]) => void;
  /** Texto quando nada está selecionado (equivale a "todas"). */
  allLabel?: string;
  /** Palavra usada no resumo "N categorias". */
  itemNoun?: string;
  /** Mostra campo de busca. Por padrão aparece quando há mais de 12 opções. */
  searchable?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Dropdown de seleção múltipla, no mesmo visual do OptionPicker.
 *
 * O menu é medido contra a viewport e se estende até perto da borda inferior da
 * tela, em vez de usar uma altura fixa — assim listas longas aparecem inteiras
 * (com rolagem interna) sem cortar em 240px.
 */
const MultiOptionPicker: React.FC<MultiOptionPickerProps> = ({
  values,
  options,
  onChange,
  allLabel = 'Todas',
  itemNoun = 'selecionadas',
  searchable,
  compact = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number; maxHeight: number } | null>(null);

  const showSearch = searchable ?? options.length > 12;

  // Posiciona via portal e usa todo o espaço disponível até o fim da tela
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const GAP = 4;
      const MARGIN = 12;
      const MIN_H = 180;
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      const vw = window.innerWidth || document.documentElement.clientWidth || 1200;
      const MENU_W = Math.max(r.width, 240);

      const spaceBelow = vh - r.bottom - GAP - MARGIN;
      const spaceAbove = r.top - GAP - MARGIN;
      const openUp = spaceBelow < MIN_H && spaceAbove > spaceBelow;
      const maxHeight = Math.max(MIN_H, openUp ? spaceAbove : spaceBelow);

      setPos({
        top: openUp ? r.top - GAP - maxHeight : r.bottom + GAP,
        left: Math.max(MARGIN, Math.min(r.left, vw - MENU_W - MARGIN)),
        minWidth: MENU_W,
        maxHeight,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    if (showSearch) setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 0);
  }, [open, showSearch]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = useMemo(() => new Set(values), [values]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (label: string) => {
    onChange(selected.has(label) ? values.filter(v => v !== label) : [...values, label]);
  };

  const resumo =
    values.length === 0 ? allLabel
    : values.length === 1 ? values[0]
    : `${values.length} ${itemNoun}`;

  const ativo = values.length > 0;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 rounded-lg transition-all cursor-pointer border max-w-[220px] ${
          compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
        } text-[10px] font-bold uppercase tracking-wider hover:bg-white/5`}
        style={ativo
          ? { background: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.45)', color: '#a78bfa' }
          : { background: 'transparent', borderColor: compact ? 'transparent' : 'rgba(255,255,255,0.1)', color: '#94a3b8' }}
        title={values.length > 1 ? values.join(', ') : undefined}
      >
        <span className="truncate">{resumo}</span>
        {ativo && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            className="shrink-0 opacity-60 hover:opacity-100"
            title="Limpar seleção"
          >
            <X size={11} />
          </span>
        )}
        <ChevronDown size={12} className="opacity-50 shrink-0" />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[1300] bg-dark-card border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-150"
          style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.minWidth, maxHeight: pos.maxHeight }}
        >
          {showSearch && (
            <div className="p-2 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-1.5">
                <Search size={13} className="text-slate-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
                  placeholder="Buscar categoria..."
                  className="flex-1 bg-transparent text-xs text-dark-text placeholder:text-slate-500 outline-none min-w-0"
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); searchRef.current?.focus(); }}
                    className="text-slate-400 hover:text-white shrink-0">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto overscroll-contain py-1 min-h-0">
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400 hover:bg-white/5 transition-colors"
            >
              <span className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 text-left font-medium">{allLabel}</span>
              {values.length === 0 && <Check size={14} className="text-violet-400 shrink-0" />}
            </button>

            {filtered.map(opt => {
              const on = selected.has(opt.label);
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => toggle(opt.label)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-dark-text hover:bg-white/5 transition-colors"
                >
                  <span
                    className={`w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-all ${
                      on ? 'bg-violet-500 border-violet-500' : 'border-white/20'
                    }`}
                  >
                    {on && <Check size={10} className="text-white" strokeWidth={3} />}
                  </span>
                  {opt.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: opt.color }} />}
                  <span className="flex-1 text-left font-medium">{opt.label}</span>
                </button>
              );
            })}

            {filtered.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-slate-500">Nenhuma categoria encontrada</div>
            )}
          </div>

          {values.length > 0 && (
            <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-t border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {values.length} {itemNoun}
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] font-bold uppercase tracking-wider text-violet-400 hover:text-violet-300 transition-colors"
              >
                Limpar
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default MultiOptionPicker;
