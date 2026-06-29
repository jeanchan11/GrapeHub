import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function execute() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Iniciando transação para limpeza de duplicatas (Junho em diante)...');

    // Buscar todos os grupos duplicados na tabela fin_bills
    const dupBills = await client.query(`
      SELECT 
        name,
        value,
        recurrence,
        COUNT(*) as total,
        array_agg(id ORDER BY id) as ids,
        array_agg(due_date ORDER BY id) as due_dates
      FROM fin_bills
      GROUP BY name, value, recurrence
      HAVING COUNT(*) > 1
      ORDER BY name
    `);

    let totalBillsDeleted = 0;
    let totalEntriesDeleted = 0;

    for (const row of dupBills.rows) {
      const keeper = row.ids[0];
      const dupIds = row.ids.slice(1);

      console.log(`\nAnalisando grupo: "${row.name}" | R$ ${row.value} | Recurrence: ${row.recurrence}`);
      console.log(`  Keeper (Manter): ID ${keeper}`);

      for (const dupId of dupIds) {
        // Obter as entries para esta cópia específica
        const entriesRes = await client.query(`
          SELECT id, reference_month, due_date, status, expected_value
          FROM fin_bill_entries
          WHERE bill_id = $1
        `, [dupId]);

        let shouldDelete = true;

        if (entriesRes.rows.length > 0) {
          // Se tiver lançamentos, verifica se todos são de Junho/2026 em diante
          for (const entry of entriesRes.rows) {
            const refMonth = entry.reference_month; // Ex: '2026-07'
            const due = entry.due_date;
            const isJuneOrLater = (refMonth && refMonth >= '2026-06') || (due && due >= new Date('2026-06-01'));
            
            if (!isJuneOrLater) {
              shouldDelete = false;
              console.log(`  ⚠️ Cópia ID ${dupId} tem lançamento antigo (ID ${entry.id}, Ref: ${refMonth}, Venc: ${due.toISOString().split('T')[0]}). NÃO será deletada.`);
              break;
            }
          }
        } else {
          // Se não tiver lançamentos, olha a data de vencimento da bill
          const idx = row.ids.indexOf(dupId);
          const billDueDate = row.due_dates[idx];
          if (billDueDate) {
            const isJuneOrLater = billDueDate >= new Date('2026-06-01');
            if (!isJuneOrLater) {
              shouldDelete = false;
              console.log(`  ⚠️ Cópia ID ${dupId} tem vencimento da bill antigo (${billDueDate.toISOString().split('T')[0]}). NÃO será deletada.`);
            }
          }
        }

        if (shouldDelete) {
          // Excluir as entries primeiro
          if (entriesRes.rows.length > 0) {
            const entryIds = entriesRes.rows.map(e => e.id);
            console.log(`  🗑️ Deletando lançamentos (entries) da cópia ID ${dupId}: IDs [${entryIds.join(', ')}]`);
            await client.query(`
              DELETE FROM fin_bill_entries
              WHERE id = ANY($1)
            `, [entryIds]);
            totalEntriesDeleted += entryIds.length;
          }

          // Excluir a bill duplicada
          console.log(`  🗑️ Deletando bill duplicada ID ${dupId}`);
          await client.query(`
            DELETE FROM fin_bills
            WHERE id = $1
          `, [dupId]);
          totalBillsDeleted += 1;
        }
      }
    }

    await client.query('COMMIT');
    console.log('\n=============================================');
    console.log('Limpeza executada com sucesso e transação confirmada!');
    console.log(`Total de contas (fin_bills) deletadas: ${totalBillsDeleted}`);
    console.log(`Total de lançamentos (fin_bill_entries) deletados: ${totalEntriesDeleted}`);
    console.log('=============================================');
    
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro durante a execução. Transação revertida (Rollback).', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

execute();
