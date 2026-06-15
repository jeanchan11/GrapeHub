import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableListRowProps {
  id: string;
  children: (dragHandleProps: { attributes: any; listeners: any }) => React.ReactNode;
  isDragOverlay?: boolean;
}

export const SortableListRow: React.FC<SortableListRowProps> = ({ id, children, isDragOverlay }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isDragOverlay ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative',
    backgroundColor: isDragOverlay ? 'rgba(0,0,0,0.4)' : undefined, // Default for drag overlays, could be overridden by children
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  );
};
