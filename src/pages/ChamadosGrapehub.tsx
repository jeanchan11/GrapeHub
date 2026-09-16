import React from 'react';
import TodoStaff from './TodoStaff';

/**
 * ChamadosGrapehub
 *
 * Template de quadro de chamados. Mais de uma página do menu usa este template
 * ("Chamados Grapehub" e "Chamados CRM"), por isso o título vem do rótulo da
 * página (pageLabel) e não fica fixo no componente — senão todas as páginas que
 * usam o template exibem o mesmo nome.
 * Os dados são completamente isolados pelo page_id (activePage).
 */
const ChamadosGrapehub: React.FC<{ activePage?: string; pageLabel?: string }> = ({ activePage, pageLabel }) => {
  return (
    <TodoStaff
      activePage={activePage}
      pageTitle={pageLabel?.trim() || 'Chamados Grapehub'}
      pageSubtitle="Gestão de chamados internos · seção grape"
      hideRecurring
      hideDocument
      enableColoredTags
      enableImageUpload
      enableTestColumn
    />
  );
};

export default ChamadosGrapehub;
