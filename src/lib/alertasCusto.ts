// ── Alerta de custo subindo ─────────────────────────────────────────────────
// Compara, categoria a categoria do plano, o gasto de um mês com a MÉDIA dos
// meses anteriores (até 3). Sai das linhas do próprio /api/financeiro/dre — o
// mesmo número da tabela do DFC, inclusive nos meses do histórico (Marvee).
//
// Regra (as duas condições juntas, para não alarmar à toa):
//   • subiu pelo menos PCT_MINIMO % sobre a média, e
//   • a diferença passa de DIFERENCA_MINIMA reais.
// Categoria que não existia nos meses anteriores e apareceu com mais que a
// diferença mínima também entra, como "custo novo".
//
// Motivou: Prestação de Serviço subiu 64,3% de ago para set/2026, puxada por
// Custos de IA (R$ 1.984 → R$ 4.036), e ninguém foi avisado.

export const PCT_MINIMO = 25;
export const DIFERENCA_MINIMA = 300;
export const JANELA_MESES = 3;

interface DreRow { structure: string; description: string; values: Record<string, number>; }

export interface AlertaCusto {
  structure: string;
  nome: string;
  grupo: string;        // nome do subgrupo pai (ex.: Despesas com Prestação de Serviço)
  atual: number;        // gasto no mês de referência (positivo)
  media: number;        // média dos meses anteriores (positivo)
  diferenca: number;
  pct: number | null;   // null = custo novo
}

export function calcularAlertasCusto(
  rows: DreRow[],
  meses: string[],             // meses com movimento, em ordem
  mesRef: string,
  grupos: string[] = ['02', '04'],
): { alertas: AlertaCusto[]; base: string[] } {
  const i = meses.indexOf(mesRef);
  const base = i > 0 ? meses.slice(Math.max(0, i - JANELA_MESES), i) : [];
  if (base.length === 0) return { alertas: [], base };

  const temFilho = (s: string) => rows.some(r => r.structure.startsWith(s + '.'));
  const nomeDe = (s: string) => rows.find(r => r.structure === s)?.description || s;
  const gasto = (r: DreRow, m: string) => -(r.values[m] || 0);   // despesa vem negativa no DFC

  const alertas: AlertaCusto[] = [];
  for (const r of rows) {
    if (!grupos.some(g => r.structure.startsWith(g + '.')) || temFilho(r.structure)) continue;
    const atual = gasto(r, mesRef);
    const media = base.reduce((s, m) => s + gasto(r, m), 0) / base.length;
    const diferenca = atual - media;
    if (diferenca < DIFERENCA_MINIMA) continue;
    const novo = media <= 0.005;
    const pct = novo ? null : (diferenca / media) * 100;
    if (!novo && (pct as number) < PCT_MINIMO) continue;
    const pai = r.structure.split('.').slice(0, -1).join('.');
    alertas.push({ structure: r.structure, nome: r.description, grupo: nomeDe(pai), atual, media, diferenca, pct });
  }
  alertas.sort((a, b) => b.diferenca - a.diferenca);
  return { alertas, base };
}
