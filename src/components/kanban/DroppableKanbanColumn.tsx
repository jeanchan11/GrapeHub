import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableKanbanColumnProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export const DroppableKanbanColumn: React.FC<DroppableKanbanColumnProps> = ({ id, children, className = '' }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex flex-col transition-colors duration-200 rounded-2xl ${
        isOver ? 'bg-gray-100 dark:bg-white/5 ring-2 ring-emerald-500/50' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
