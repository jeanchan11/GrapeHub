import React from 'react';
import { X } from 'lucide-react';
import { designSystem } from '../../design-system';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  minHeight?: string;
  headerContent?: React.ReactNode;
  headerActions?: React.ReactNode;
  tabs?: React.ReactNode;
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
  tabs
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`${designSystem.modal.overlay} flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10`}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-0"
            onClick={onClose}
          />
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={`relative z-10 ${designSystem.modal.container} ${maxWidth} ${minHeight}`}
          >
            <div className={designSystem.modal.header}>
              <div className="flex items-center gap-3 min-w-0">
                {icon && <div className="text-purple-500 flex-shrink-0">{icon}</div>}
                {title && <h2 className={`${designSystem.modal.title} truncate`}>{title}</h2>}
                {headerContent}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                {headerActions}
                <button 
                  onClick={onClose} 
                  className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {tabs && (
              <div className="flex items-center gap-6 px-6 pt-6 border-b modal-divider shrink-0">
                {tabs}
              </div>
            )}

            <div className={designSystem.modal.body}>
              {children}
            </div>

            {footer && (
              <div className={designSystem.modal.footer}>
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
