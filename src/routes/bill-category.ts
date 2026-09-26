// ── Categoria herdada da conta a pagar ──────────────────────────────────────
// Cada conta cadastrada (Internet, INSS, Energia…) aponta para UMA categoria do
// plano de contas (`fin_bills.category_id` → `fin_categories.id`). Quando a conta
// é conciliada com um lançamento do extrato, o lançamento herda essa categoria e
// entra no DRE — que agrupa por `fin_movements_asaas.custom_category_id`.
//
// Por que um campo novo e não o `fin_bills.category` que já existia: aquele é uma
// lista própria de Contas a Pagar ("Utilidades", "Impostos", "Serviços") e NENHUM
// dos nomes existe no plano de contas. "Utilidades" não diz se é Energia ou
// Internet; não havia como converter. O texto antigo continua servindo ao filtro
// da tela de Contas a Pagar.
//
// Precedência — o que a herança pode sobrescrever:
//   • lançamento sem categoria;
//   • categoria posta por regra ('regra-auto') ou pelo motor ('motor-auto'): a
//     conta é um mapeamento específico daquele pagamento, uma regra é um casamento
//     genérico de palavra-chave;
//   • a própria herança anterior ('conta-a-pagar'), para mudar a categoria da
//     conta refletir nos pagamentos já feitos.
// O que ela NUNCA sobrescreve: categoria escolhida por uma pessoa (edited_by é um
// e-mail, ou veio da conciliação manual).
import { Pool } from 'pg';
import { foraDeMesFechado } from './fechamento';

const PODE_SOBRESCREVER = `(m.custom_category_id IS NULL OR m.edited_by IN ('regra-auto','motor-auto','conta-a-pagar'))`;

export async function migrateBillCategory(pool: Pool) {
  await pool.query(`ALTER TABLE fin_bills ADD COLUMN IF NOT EXISTS category_id INT`);
}

/** Aplica a categoria da conta a UM lançamento recém-vinculado. */
export async function herdarCategoriaNoLancamento(pool: Pool, movementId: number): Promise<boolean> {
  const r = await pool.query(`
    UPDATE fin_movements_asaas m
       SET custom_category_id = c.id,
           custom_category    = c.description,
           grapehub_category  = c.description,
           edited_by          = 'conta-a-pagar',
           edited_at          = NOW()
      FROM fin_bill_entries e
      JOIN fin_bills b      ON b.id = e.bill_id
      JOIN fin_categories c ON c.id = b.category_id
     WHERE m.id = $1
       AND m.linked_bill_entry_id = e.id
       AND ${PODE_SOBRESCREVER}
       AND ${foraDeMesFechado('m.')}
    RETURNING m.id`, [movementId]);
  return (r.rowCount || 0) > 0;
}

/**
 * Aplica a categoria da conta a TODOS os lançamentos já vinculados a ela.
 * Roda quando a categoria da conta é definida ou trocada — é o que torna o
 * cadastro retroativo: configurou "Internet", os pagamentos antigos da Internet
 * entram no DRE junto.
 */
export async function herdarCategoriaDaConta(pool: Pool, billId: number): Promise<number> {
  const r = await pool.query(`
    UPDATE fin_movements_asaas m
       SET custom_category_id = c.id,
           custom_category    = c.description,
           grapehub_category  = c.description,
           edited_by          = 'conta-a-pagar',
           edited_at          = NOW()
      FROM fin_bill_entries e
      JOIN fin_bills b      ON b.id = e.bill_id
      JOIN fin_categories c ON c.id = b.category_id
     WHERE b.id = $1
       AND m.linked_bill_entry_id = e.id
       AND ${PODE_SOBRESCREVER}
       AND ${foraDeMesFechado('m.')}
    RETURNING m.id`, [billId]);
  return r.rowCount || 0;
}
