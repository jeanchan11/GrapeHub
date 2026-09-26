// ── Lançamentos por trás de uma linha do DRE ────────────────────────────────
// Usado pelo gráfico de despesas do Dashboard do DRE: clicou numa categoria, vê
// os lançamentos que formam aquele número.
//
// Mesmo critério do DRE ao vivo (`/api/financeiro/dre` em server.ts):
//   • conta Asaas pela data da transação; cartões pelo MÊS DA FATURA;
//   • sem pares de antecipação nem estornados;
//   • a categoria casa pela estrutura, incluindo as filhas (02.02 pega 02.02.xx).
//
// Meses com histórico importado (fin_dfc_historico, o Marvee) NÃO são calculados
// a partir de lançamentos — o DRE usa o número importado. A resposta devolve
// quais meses do intervalo são históricos para a tela avisar que, neles, a lista
// pode não fechar com o total.
import type { Express } from 'express';
import type { Pool } from 'pg';
import { CARD_ACCOUNTS } from './bills';

export function setupDreLancamentosRoutes(app: Express, pool: Pool) {
  app.get('/api/financeiro/dre/lancamentos', async (req, res) => {
    const structure = String(req.query.structure || '').trim();
    const de = String(req.query.de || '').trim();
    const ate = String(req.query.ate || de).trim();
    if (!/^[0-9]+(\.[0-9]+)*$/.test(structure)) return res.status(400).json({ error: 'structure inválida' });
    if (!/^[0-9]{4}-[0-9]{2}$/.test(de) || !/^[0-9]{4}-[0-9]{2}$/.test(ate)) return res.status(400).json({ error: 'período inválido (YYYY-MM)' });

    try {
      const r = await pool.query(
        `SELECT m.id, m.account, m.type, m.value::numeric AS value, m.transaction_type,
                m.transaction_date, m.billing_month,
                COALESCE(NULLIF(m.custom_description, ''), m.description) AS descricao,
                m.description AS descricao_original,
                c.structure, c.description AS categoria,
                CASE WHEN m.account = 'asaas' THEN to_char(m.transaction_date, 'YYYY-MM') ELSE m.billing_month END AS competencia
           FROM fin_movements_asaas m
           JOIN fin_categories c ON c.id = m.custom_category_id
          WHERE (c.structure = $1 OR c.structure LIKE $1 || '.%')
            AND m.is_anticipation_pair = false AND m.is_reversed_pair = false
            AND ((m.account = 'asaas' AND to_char(m.transaction_date, 'YYYY-MM') BETWEEN $2 AND $3)
              OR (m.account = ANY($4::text[]) AND m.billing_month BETWEEN $2 AND $3))
          ORDER BY m.value::numeric DESC, m.transaction_date DESC`,
        [structure, de, ate, [...CARD_ACCOUNTS]],
      );
      const hist = await pool.query(
        `SELECT DISTINCT ref_month FROM fin_dfc_historico
          WHERE ref_month BETWEEN $1 AND $2 AND structure ~ '^[0-9]' ORDER BY 1`,
        [de, ate],
      );
      const itens = r.rows.map((x: any) => ({
        ...x,
        value: Number(x.value),
        valor_dre: Number(x.value) * Number(x.type),   // com sinal, como no DRE
      }));
      res.json({
        structure, de, ate,
        meses_historicos: hist.rows.map((h: any) => h.ref_month),
        total: itens.reduce((s: number, i: any) => s + i.valor_dre, 0),
        itens,
      });
    } catch (e: any) {
      console.error('[dre-lancamentos]', e.message);
      res.status(500).json({ error: 'Falha ao buscar lançamentos' });
    }
  });
}
