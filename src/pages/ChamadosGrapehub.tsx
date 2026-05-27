import React from 'react';
import TodoStaff from './TodoStaff';

/**
 * ChamadosGrapehub
 *
 * Template independente para a página "Chamados Grapehub".
 * Usa o mesmo motor do TodoStaff mas com cabeçalho e subtítulo próprios.
 * Os dados são completamente isolados pelo page_id (activePage).
 */
const ChamadosGrapehub: React.FC<{ activePage?: string }> = ({ activePage }) => {
  return (
    <TodoStaff
      activePage={activePage}
      pageTitle="Chamados Grapehub"
      pageSubtitle="Gestão de chamados internos · seção grape"
      hideRecurring
      hideDocument
      enableColoredTags
    />
  );
};

export default ChamadosGrapehub;
