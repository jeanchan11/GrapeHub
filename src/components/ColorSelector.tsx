import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

const PREDEFINED_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#22c55e', // Green
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#a855f7', // Purple
  '#d946ef', // Fuchsia
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ff0000', // Pure Red
  '#4c1d95', // Deep Purple
  '#6d28d9', // Dark Purple
  '#64748b', // Slate
  '#ffffff', // White
  '#0f172a', // Dark Navy
  '#000000', // Black
];

const ColorSelector = ({ value, onChange }: { value: string, onChange: (color: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value || '#64748b');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; openUp: boolean }>({ top: 0, left: 0, openUp: false });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 280;
      setDropdownPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        openUp,
      });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 cursor-pointer transition-all hover:scale-105"
        style={{ backgroundColor: value || '#64748b' }}
      />
      {isOpen && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          className="bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl p-3"
          style={{
            position: 'fixed',
            zIndex: 9999,
            left: dropdownPos.left,
            width: 232,
            ...(dropdownPos.openUp
              ? { bottom: window.innerHeight - dropdownPos.top }
              : { top: dropdownPos.top }),
          }}
        >
          <div className="grid grid-cols-6 gap-2 mb-3">
            {PREDEFINED_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => { onChange(color); setCustomColor(color); setIsOpen(false); }}
                className={`w-8 h-8 rounded-lg hover:scale-110 transition-transform ring-offset-1 ring-offset-white dark:ring-offset-dark-input ${value === color ? 'ring-2 ring-violet-500' : ''}`}
                style={{ backgroundColor: color, border: color === '#ffffff' ? '1px solid #e2e8f0' : 'none' }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
            <input
              type="color"
              value={customColor}
              onChange={e => { setCustomColor(e.target.value); onChange(e.target.value); }}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
            />
            <input
              type="text"
              value={customColor}
              onChange={e => {
                setCustomColor(e.target.value);
                if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                  onChange(e.target.value);
                }
              }}
              placeholder="#hex"
              className="flex-1 bg-slate-50 dark:bg-dark-bg/50 border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-xs text-light-text dark:text-white font-mono outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ColorSelector;
