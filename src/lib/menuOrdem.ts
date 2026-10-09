// Ordem dos filhos de um container do menu (seção ou pasta), MISTURANDO os tipos.
//
// Páginas, subpastas e pastas ficam em tabelas diferentes, cada uma com `order_index`. Até
// 09/10/2026 a Sidebar desenhava por tipo (todas as páginas, depois as subpastas, depois as
// pastas), e não havia como pôr uma subpasta acima de uma página. Agora o `order_index` é uma
// sequência ÚNICA por container (0..n entre todos os tipos) e todos os lugares que desenham o
// menu ordenam por aqui: Sidebar aberta, menu flutuante da Sidebar recolhida e a árvore do
// Gerenciador de Páginas. Empate (dado antigo) cai no agrupamento antigo: página → subpasta → pasta.
export type TipoFilho = 'page' | 'subsubsession' | 'subsession';
const RANK: Record<TipoFilho, number> = { page: 0, subsubsession: 1, subsession: 2 };

export function filhosEmOrdem(c: any): { tipo: TipoFilho; item: any }[] {
  const out: { tipo: TipoFilho; item: any; i: number }[] = [];
  (c?.pages || []).forEach((item: any, i: number) => out.push({ tipo: 'page', item, i }));
  (c?.subSubSessions || []).forEach((item: any, i: number) => out.push({ tipo: 'subsubsession', item, i }));
  (c?.subSessions || []).forEach((item: any, i: number) => out.push({ tipo: 'subsession', item, i }));
  // Sem order_index (API antiga): mantém o agrupamento por tipo
  const temOrdem = out.every(o => typeof o.item.order_index === 'number');
  return out
    .sort((a, b) =>
      (temOrdem ? a.item.order_index - b.item.order_index : 0) || RANK[a.tipo] - RANK[b.tipo] || a.i - b.i)
    .map(({ tipo, item }) => ({ tipo, item }));
}

// Posição de cada filho (chave `tipo:id`) — para CSS `order` quando o JSX desenha por tipo
export function posicoesFilhos(c: any): Map<string, number> {
  const m = new Map<string, number>();
  filhosEmOrdem(c).forEach(({ tipo, item }, i) => m.set(`${tipo}:${item.id}`, i));
  return m;
}
