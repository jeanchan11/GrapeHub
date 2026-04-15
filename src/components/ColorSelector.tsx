import React, { useState, useRef, useEffect } from 'react';

const PREDEFINED_COLORS = [
  '#ff0000', // Pure Red
  '#ef4444', // Vibrant Red
  '#4c1d95', // Deep Purple
  '#6d28d9', // Dark Purple
  '#0ea5e9', // Sky Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ffffff', // White
];

const ColorSelector = ({ value, onChange }: { value: string, onChange: (color: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 cursor-pointer transition-all hover:scale-105"
        style={{ backgroundColor: value || '#64748b' }}
      />
      {isOpen && (
        <div className="absolute z-50 mt-2 p-2 bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl shadow-xl grid grid-cols-4 gap-2">
          {PREDEFINED_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => { onChange(color); setIsOpen(false); }}
              className="w-8 h-8 rounded-lg hover:scale-105 transition-transform"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ColorSelector;
