import React from 'react';
import { designSystem } from '../../design-system';
import SplitHeadline from '../SplitHeadline';

interface PageHeaderProps {
  title: string;
  titleAccent?: string;
  subtitle: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, titleAccent, subtitle, children }) => {
  return (
    <div className={`${designSystem.pageTitle.wrapper} flex justify-between items-start`}>
      <SplitHeadline
        text={title ? title + ' ' : ''}
        highlight={titleAccent || ''}
        subtitle={subtitle}
        className={designSystem.pageTitle.title}
        subtitleClassName={designSystem.pageTitle.subtitle}
      />
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
};
