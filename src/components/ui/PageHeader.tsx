import React from 'react';
import { designSystem } from '../../design-system';

interface PageHeaderProps {
  title: string;
  titleAccent?: string;
  subtitle: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, titleAccent, subtitle, children }) => {
  return (
    <div className={`${designSystem.pageTitle.wrapper} flex justify-between items-start`}>
      <div>
        <h1 className={designSystem.pageTitle.title}>
          {title} {titleAccent && <span className={designSystem.pageTitle.titleAccent}>{titleAccent}</span>}
        </h1>
        <p className={designSystem.pageTitle.subtitle}>{subtitle}</p>
      </div>
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
};
