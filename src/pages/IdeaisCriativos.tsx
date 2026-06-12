import React from 'react';
import TodoStaff from './TodoStaff';

/**
 * IdeaisCriativos
 *
 * Página de gestão de ideias criativas.
 * Clona o template do TodoStaff/ChamadosGrapehub com customizações:
 * - Título: "Ideais Criativos"
 * - Coluna "A Fazer" renomeada para "Ideias"
 * - Aba secundária "Ideias" removida (hideIdeas)
 */
const IdeaisCriativos: React.FC<{ activePage?: string }> = ({ activePage }) => {
  return (
    <TodoStaff
      activePage={activePage}
      pageTitle="Ideais Criativos"
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
