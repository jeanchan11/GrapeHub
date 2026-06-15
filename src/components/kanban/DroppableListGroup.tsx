import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableListGroupProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export const DroppableListGroup: React.FC<DroppableListGroupProps> = ({ id, children, className = '' }) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`transition-colors duration-200 rounded-xl ${
        isOver ? 'bg-white/5 ring-2 ring-violet-500/50 pt-1' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
