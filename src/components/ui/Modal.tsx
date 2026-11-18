import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { designSystem } from '../../design-system';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Popup padrão do GrapeHub (revisto em 18/11/2026 — ver docs/auditoria-design-2026-11-18).
 * - Portal no <body> e z-[1000]: cobre a tela inteira, inclusive o menu lateral (z-50).
 * - Centralizado; popup alto rola por dentro da tela, não corta.
 * - Fecha com Esc e com clique fora (desligáveis: formulário que não pode perder o que foi digitado).
 * - Fundo `modal-container` (token do tema, index.html), overlay escurecido com desfoque,
 *   entrada curta (opacity + scale .96→1).
 * Para migrar um popup feito à mão sem refazer o miolo: `semCabecalho semPadding` e o
 * conteúdo antigo vai inteiro como children.
 */
// Pilha dos popups abertos: Esc fecha só o de cima (com dois empilhados, fechava os dois).
const pilha: symbol[] = [];

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Largura máxima (classe Tailwind). Padrão max-w-2xl. */
  maxWidth?: string;
  minHeight?: string;
  headerContent?: React.ReactNode;
  headerActions?: React.ReactNode;
  tabs?: React.ReactNode;
  /** Esconde o cabeçalho padrão (título + X) — o conteúdo traz o próprio. */
  semCabecalho?: boolean;
  /** Tira o p-6 do corpo — o conteúdo controla o próprio espaçamento. */
  semPadding?: boolean;
  /** Clique no fundo fecha (padrão true). Desligue em formulários longos. */
  fecharAoClicarFora?: boolean;
  /** Esc fecha (padrão true). */
  fecharComEsc?: boolean;
  /** Classes extras no container (altura, flex…). */
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
  maxWidth = 'max-w-2xl',
  minHeight = '',
  headerContent,
  headerActions,
  tabs,
  semCabecalho = false,
  semPadding = false,
  fecharAoClicarFora = true,
  fecharComEsc = true,
  className = '',
}) => {
  // onClose muda a cada render em quem chama; a ref evita refazer o listener
  const fechar = useRef(onClose);
  fechar.current = onClose;

  const eu = useRef(Symbol('modal'));
  useEffect(() => {
    if (!isOpen) return;
    const id = eu.current;
    pilha.push(id);
    return () => { const i = pilha.lastIndexOf(id); if (i >= 0) pilha.splice(i, 1); };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !fecharComEsc) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pilha[pilha.length - 1] !== eu.current) return; // só o popup de cima
      // Esc dentro de um menu/seleção aberto não fecha o popup inteiro
      if ((e.target as HTMLElement)?.closest?.('[data-segura-esc]')) return;
      e.stopPropagation();
      fechar.current();
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [isOpen, fecharComEsc]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 modal-overlay"
            onClick={fecharAoClicarFora ? onClose : undefined}
            aria-hidden
          />
          <div
            className="relative flex min-h-full items-center justify-center p-4 sm:p-6"
            onClick={fecharAoClicarFora ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className={`relative ${designSystem.modal.container} ${maxWidth} ${minHeight} ${className}`}
              onClick={(e) => e.stopPropagation()}
            >
              {!semCabecalho && (
                <div className={designSystem.modal.header}>
                  <div className="flex items-center gap-3 min-w-0">
                    {icon && <div className="text-violet-500 flex-shrink-0">{icon}</div>}
                    {title && <h2 className={`${designSystem.modal.title} truncate`}>{title}</h2>}
                    {headerContent}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                    {headerActions}
                    <button
                      onClick={onClose}
                      aria-label="Fechar"
                      className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}

              {tabs && (
                <div className="flex items-center gap-6 px-6 pt-6 border-b modal-divider shrink-0">
                  {tabs}
                </div>
              )}

              <div className={semPadding ? 'flex-1 min-h-0 flex flex-col' : designSystem.modal.body}>
                {children}
              </div>

              {footer && (
                <div className={designSystem.modal.footer}>
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default Modal;
