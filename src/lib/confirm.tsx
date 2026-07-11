// Diálogos globais: confirmação (Promise<boolean>) e prompt com input (Promise<string|null>).
// Substituem os confirm()/prompt() nativos.
//   if (await confirmDialog({ message: 'Excluir?', danger: true })) { ... }
//   const nome = await promptDialog({ message: 'Nome:' }); if (nome) { ... }
// As cores seguem os tokens de tema do app (--dark-card/--dark-text), que viram
// sozinhos em escuro / escuro-profundo / claro. O modal é portalado pro body, e
// esses tokens ficam no <html>, então são herdados corretamente.
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Pencil } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}
export interface PromptOptions {
  title?: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

type Dialog =
  | ({ kind: 'confirm'; _id: number } & ConfirmOptions)
  | ({ kind: 'prompt'; _id: number } & PromptOptions);

let current: Dialog | null = null;
let resolver: ((v: any) => void) | null = null;
let idc = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function confirmDialog(opts: ConfirmOptions | string): Promise<boolean> {
  const o: ConfirmOptions = typeof opts === 'string' ? { message: opts } : opts;
  if (resolver) { const r = resolver; resolver = null; r(false); }
  current = { kind: 'confirm', ...o, _id: ++idc };
  emit();
  return new Promise<boolean>(res => { resolver = res; });
}
export function promptDialog(opts: PromptOptions | string): Promise<string | null> {
  const o: PromptOptions = typeof opts === 'string' ? { message: opts } : opts;
  if (resolver) { const r = resolver; resolver = null; r(null); }
  current = { kind: 'prompt', ...o, _id: ++idc };
  emit();
  return new Promise<string | null>(res => { resolver = res; });
}
const settle = (v: any) => { const r = resolver; resolver = null; current = null; emit(); r?.(v); };

// Tokens de tema (herdados do <html>) — funcionam em claro/escuro/escuro-profundo
const SURFACE = 'rgb(var(--dark-card))';
const BORDER = 'rgb(var(--dark-text) / 0.1)';
const TEXT = 'rgb(var(--dark-text))';
const TEXT_MUTED = 'rgb(var(--dark-text) / 0.72)';
const SUBTLE = 'rgb(var(--dark-text) / 0.07)';

export const ConfirmHost: React.FC = () => {
  const [, force] = useState(0);
  const [inputVal, setInputVal] = useState('');
  useEffect(() => { const l = () => force(n => n + 1); listeners.add(l); return () => { listeners.delete(l); }; }, []);
  useEffect(() => { if (current?.kind === 'prompt') setInputVal(current.defaultValue || ''); }, [current?._id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!current) return;
      if (e.key === 'Escape') settle(current.kind === 'prompt' ? null : false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!current || typeof document === 'undefined') return null;
  const o = current;
  const isPrompt = o.kind === 'prompt';
  const danger = o.kind === 'confirm' && !!o.danger;
  const accent = danger ? '#f43f5e' : '#8b5cf6';
  const onCancel = () => settle(isPrompt ? null : false);
  const onOk = () => settle(isPrompt ? inputVal : true);

  return createPortal(
    <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 animate-in fade-in duration-150" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-sm rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden"
        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}22` }}>
            {isPrompt ? <Pencil size={19} style={{ color: accent }} /> : <AlertTriangle size={20} style={{ color: accent }} />}
          </div>
          <div className="min-w-0 pt-0.5 flex-1">
            {o.title && <h3 className="text-base font-bold mb-1" style={{ color: TEXT }}>{o.title}</h3>}
            <p className="text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>{o.message}</p>
            {isPrompt && (
              <input
                autoFocus
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onOk(); }}
                placeholder={o.placeholder || ''}
                className="mt-3 w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: SUBTLE, border: `1px solid ${BORDER}`, color: TEXT }}
              />
            )}
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-bold transition-colors" style={{ background: SUBTLE, color: TEXT_MUTED }}>{o.cancelText || 'Cancelar'}</button>
          <button onClick={onOk} className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90" style={{ background: danger ? '#e11d48' : '#7c3aed' }}>{o.confirmText || (danger ? 'Excluir' : isPrompt ? 'Salvar' : 'Confirmar')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
};
