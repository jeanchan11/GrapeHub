// Sistema de toast global (sem context) — substitui os alert() nativos.
// Uso: import { toast } from '@/src/lib/toast';  toast.success('...'), toast.error('...')
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; type: ToastType; message: string; }

let counter = 0;
let items: ToastItem[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());
const remove = (id: number) => { items = items.filter(t => t.id !== id); emit(); };
const push = (type: ToastType, message: string) => {
  const id = ++counter;
  items = [...items, { id, type, message: String(message ?? '') }];
  emit();
  setTimeout(() => remove(id), 4200);
  return id;
};

export const toast = Object.assign(
  (message: string) => push('info', message),
  {
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  }
);

// Cores seguem os tokens de tema do app (--dark-card/--dark-text), herdados do <html>
// mesmo no portal pro body → funcionam em claro/escuro/escuro-profundo.
const Row: React.FC<{ item: ToastItem }> = ({ item }) => {
  const conf = {
    success: { Icon: CheckCircle2, color: '#10b981' },
    error: { Icon: XCircle, color: '#f43f5e' },
    info: { Icon: Info, color: '#8b5cf6' },
  }[item.type];
  const Icon = conf.Icon;
  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-200 flex items-start gap-3 rounded-xl px-4 py-3 shadow-2xl pointer-events-auto min-w-[280px] max-w-[400px]"
      style={{ background: 'rgb(var(--dark-card))', border: '1px solid rgb(var(--dark-text) / 0.1)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${conf.color}22` }}>
        <Icon size={17} style={{ color: conf.color }} />
      </div>
      <p className="flex-1 text-sm font-medium pt-1 break-words" style={{ color: 'rgb(var(--dark-text))' }}>{item.message}</p>
      <button onClick={() => remove(item.id)} className="shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'rgb(var(--dark-text) / 0.6)' }}><X size={15} /></button>
    </div>
  );
};

export const Toaster: React.FC = () => {
  const [, force] = useState(0);
  useEffect(() => { const l = () => force(n => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed top-4 right-4 z-[100000] flex flex-col gap-2 pointer-events-none">
      {items.map(t => <Row key={t.id} item={t} />)}
    </div>,
    document.body
  );
};
