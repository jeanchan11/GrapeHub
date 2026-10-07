// ── Reunião marcada = lead que ENTROU na coluna "Reunião Marcada" ────────────
//
// Regra (Jean, 28/09/2026): conta como reunião marcada todo lead que foi para a
// coluna "Reunião Marcada", na data em que entrou nela. Reunião realizada é quem
// tem a anotação da reunião (aba Reuniões → `crm_comercial_meetings`).
//
// Por que a contagem antiga errava — medido em 28/09/2026, setembro deu 10 e o
// certo é 38:
//  1. A ENTRADA na coluna quase nunca fica no histórico. O lead nasce direto nela
//     pelo webhook do GrapeCRM ("Recebido via Webhook CRM") e a criação não grava
//     movimentação — havia 0 registros de entrada na coluna atual. A regra velha
//     contava quem SAIU da coluna no período (pela data da saída) ou quem ainda
//     estava nela e foi criado no período.
//  2. A coluna foi APAGADA e recriada com outro id por volta de 24/09. O histórico
//     aponta para o id velho, que não existe mais em `crm_comercial_columns`, e o
//     JOIN pelo título perdeu tudo que passou por ela (abr–set).
//
// Correções:
//  • Entrada = movimentação para a coluna OU, para quem nasceu nela, a criação do
//    lead (a coluna inicial é o `from_coluna` da 1ª movimentação ou, se o lead
//    nunca se mexeu, a coluna atual).
//  • `crm_comercial_columns_legacy` guarda o título de coluna apagada. Apagar
//    coluna ou kanban agora grava ali antes; a antiga "Reunião Marcada"
//    (c7e4f656…) foi identificada pelo caminho dos leads — é de onde eles saem
//    para No Show (31×) e Follow up (82×), e 76 saíram dela perto da data da
//    reunião registrada.
import type { Pool } from 'pg';

export async function migrateCrmReunioes(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_comercial_columns_legacy (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      kanban_id TEXT,
      deleted_at TIMESTAMPTZ DEFAULT NOW(),
      origem TEXT            -- 'exclusao' (gravado ao apagar) | 'inferido' (reconstruído depois)
    )`);
}

/** Guarda título/kanban das colunas que vão ser apagadas. Chamar ANTES do DELETE. */
export async function guardarColunasApagadas(pool: Pool, where: string, params: any[]) {
  await pool.query(
    `INSERT INTO crm_comercial_columns_legacy (id, title, kanban_id, origem)
     SELECT id::text, title, kanban_id::text, 'exclusao' FROM crm_comercial_columns WHERE ${where}
     ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, kanban_id = EXCLUDED.kanban_id, deleted_at = NOW()`,
    params,
  ).catch((e: any) => console.error('[crm-reunioes] guardar colunas apagadas:', e.message));
}

/** Ids (atuais e apagados) das colunas "Reunião Marcada". */
const COLUNAS_RM = `
  SELECT id::text AS id FROM crm_comercial_columns
   WHERE LOWER(title) LIKE '%reunião marcada%' OR LOWER(title) LIKE '%reuniao marcada%'
  UNION
  SELECT id FROM crm_comercial_columns_legacy
   WHERE LOWER(title) LIKE '%reunião marcada%' OR LOWER(title) LIKE '%reuniao marcada%'`;

/**
 * SQL que devolve `marcadas` = leads DISTINTOS que entraram na coluna "Reunião
 * Marcada" no período. `ini`/`fim` são os placeholders das datas (ex.: '$1', '$2');
 * sem eles, conta tudo.
 */
export function sqlReunioesMarcadas(ini?: string, fim?: string): string {
  const periodo = ini && fim ? `WHERE em >= ${ini} AND em < (${fim}::date + interval '1 day')` : '';
  return `
    WITH rm AS (${COLUNAS_RM}),
    entradas AS (
      SELECT h.lead_id, h.created_at AS em
        FROM crm_comercial_history h
       WHERE h.to_coluna IN (SELECT id FROM rm)
      UNION ALL
      SELECT l.id, l.created_at
        FROM crm_comercial_leads l
       WHERE COALESCE(
               (SELECT h.from_coluna FROM crm_comercial_history h
                 WHERE h.lead_id = l.id AND COALESCE(h.from_coluna, '') <> ''
                 ORDER BY h.created_at, h.id LIMIT 1),
               l.coluna) IN (SELECT id FROM rm)
    )
    SELECT COUNT(DISTINCT lead_id)::int AS marcadas FROM entradas ${periodo}`;
}
