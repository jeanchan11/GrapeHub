import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function execute() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Iniciando transação para limpar contas a pagar que não estão no contas cadastradas (Julho em diante)...');

    // 1. Identificar as fin_bill_entries de julho em diante que pertencem a fin_bills que:
    //    - ou são inativas (is_active = false)
    //    - ou são únicas (recurrence = 'once')
    const entriesToDeleteRes = await client.query(`
      SELECT e.id as entry_id, e.bill_id, b.name as bill_name, b.recurrence, e.reference_month
      FROM fin_bill_entries e
      JOIN fin_bills b ON b.id = e.bill_id
      WHERE e.reference_month >= '2026-07'
        AND (b.is_active = false OR b.recurrence = 'once')
    `);

    const entryIds = entriesToDeleteRes.rows.map(r => r.entry_id);
    const onceBillIds = Array.from(new Set(
      entriesToDeleteRes.rows.filter(r => r.recurrence === 'once').map(r => r.bill_id)
    ));

    console.log(`Encontrados ${entryIds.length} lançamentos para excluir.`);
    console.log(`Encontradas ${onceBillIds.length} contas únicas (once) associadas para excluir.`);

    // 2. Deletar as fin_bill_entries
    if (entryIds.length > 0) {
      console.log(`Deletando fin_bill_entries...`);
      await client.query(`
        DELETE FROM fin_bill_entries
        WHERE id = ANY($1)
      `, [entryIds]);
    }

    // 3. Deletar as fin_bills do tipo 'once' associadas para evitar que o auto-provisionamento as recrie
    if (onceBillIds.length > 0) {
      console.log(`Deletando fin_bills de recorrência única (once)...`);
      await client.query(`
        DELETE FROM fin_bills
        WHERE id = ANY($1)
      `, [onceBillIds]);
    }

    // 4. Também deletar qualquer fin_bills do tipo 'once' ativa cujo vencimento é de Julho em diante, mesmo que não tenha gerado entries ainda (para limpar completamente)
    const extraOnceBillsRes = await client.query(`
      SELECT id, name, due_date
      FROM fin_bills
      WHERE recurrence = 'once'
        AND is_active = true
        AND due_date >= '2026-07-01'
    `);
    const extraOnceBillIds = extraOnceBillsRes.rows.map(r => r.id);
    if (extraOnceBillIds.length > 0) {
      console.log(`Deletando mais ${extraOnceBillIds.length} contas únicas futuras do cadastro...`);
      await client.query(`
        DELETE FROM fin_bills
        WHERE id = ANY($1)
      `, [extraOnceBillIds]);
    }

    await client.query('COMMIT');
    console.log('\n=============================================');
    console.log('Limpeza de Julho em diante concluída com sucesso!');
    console.log(`Total de lançamentos (fin_bill_entries) removidos: ${entryIds.length}`);
    console.log(`Total de contas cadastradas únicas (fin_bills once) removidas: ${onceBillIds.length + extraOnceBillIds.length}`);
    console.log('=============================================');
    
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro durante a execução. Transação desfeita (Rollback).', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

execute();
