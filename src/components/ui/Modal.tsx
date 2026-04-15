import React from 'react';
import { X } from 'lucide-react';
import { designSystem } from '../../design-system';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
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
  headerContent,
  headerActions,
  tabs
}) => {
  if (!isOpen) return null;

  return (
    <div className={`${designSystem.modal.overlay} flex items-center justify-center p-4`}>
      <div className={`${designSystem.modal.container} ${maxWidth} animate-in zoom-in-95 duration-200`}>
        <div className={designSystem.modal.header}>
          <div className="flex items-center gap-3">
            {icon && <div className="text-purple-500">{icon}</div>}
            <h2 className={designSystem.modal.title}>{title}</h2>
            {headerContent}
          </div>
          <div className="flex items-center gap-3">
            {headerActions}
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
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
      </div>
    </div>
  );
};
