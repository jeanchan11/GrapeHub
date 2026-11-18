import React from 'react';
import TodoStaff from './TodoStaff';

/**
 * IdeaisCriativos
 *
 * Página de gestão de ideias criativas.
 * Clona o template do TodoStaff/ChamadosGrapehub com customizações:
 * - Título: vem do rótulo da página no menu (pageLabel); "Ideais Criativos" é a reserva
 * - Coluna "A Fazer" renomeada para "Ideias"
 * - Aba secundária "Ideias" removida (hideIdeas)
 */
const IdeaisCriativos: React.FC<{ activePage?: string; pageLabel?: string }> = ({ activePage, pageLabel }) => {
  return (
    <TodoStaff
      activePage={activePage}
      pageTitle={pageLabel?.trim() || 'Ideais Criativos'}
      pageSubtitle="Gestão de ideias criativas · seção grape"
      todoLabel="Ideias"
      hideIdeas
      hideRecurring
      hideDocument
      enableColoredTags
      enableImageUpload
    />
  );
};

export default IdeaisCriativos;
