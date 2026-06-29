import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    console.log('--- DETALHES DAS DUPLICATAS DE JUNHO EM DIANTE ---');

    // Queremos ver as fin_bills duplicadas e suas respectivas fin_bill_entries que estão em Junho de 2026 ou depois (referencia >= '2026-06' ou due_date >= '2026-06-01')
    // Vamos listar os grupos e os respectivos IDs que seriam removidos seguindo a regra:
    // "Manter o mais antigo (menor ID) e apagar os outros, contanto que a data de vencimento/referência seja de Junho/2026 em diante."
    
    const dupBills = await pool.query(`
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

    let totalBillsToDelete = 0;
    let totalEntriesToDelete = 0;

    for (const row of dupBills.rows) {
      console.log(`\nGrupo: "${row.name}" | R$ ${row.value} | ${row.recurrence}`);
      
      // Vamos listar todas as entries associadas a cada um desses IDs para entender a data de cada uma
      const idsStr = row.ids.join(',');
      const entriesRes = await pool.query(`
        SELECT id, bill_id, reference_month, due_date, status, expected_value
        FROM fin_bill_entries
        WHERE bill_id IN (${idsStr})
        ORDER BY bill_id, due_date
      `);

      console.log(`  Bills cadastradas:`);
      row.ids.forEach((billId, idx) => {
        const dt = row.due_dates[idx];
        const dtStr = dt ? new Date(dt).toISOString().split('T')[0] : 'N/A';
        console.log(`    - Bill ID ${billId} | Vencimento da Bill: ${dtStr}`);
      });

      console.log(`  Entries (lançamentos) associados:`);
      entriesRes.rows.forEach(entry => {
        console.log(`    - Entry ID ${entry.id} (Bill ${entry.bill_id}) | Ref: ${entry.reference_month} | Venc: ${entry.due_date.toISOString().split('T')[0]} | Valor: R$ ${entry.expected_value} | Status: ${entry.status}`);
      });

      // Decisão de exclusão:
      // O ID mais antigo (menor ID) é row.ids[0].
      // As cópias são row.ids.slice(1).
      // Para cada cópia, verificamos se os lançamentos dela são de Junho/2026 em diante.
      const keeper = row.ids[0];
      const dupIds = row.ids.slice(1);

      const toDeleteBillsForGroup = [];
      const toDeleteEntriesForGroup = [];

      for (const dupId of dupIds) {
        // Encontra as entries desta cópia específica
        const dupEntries = entriesRes.rows.filter(e => e.bill_id === dupId);
        
        // Verifica se todas as entries dessa cópia estão de junho em diante.
        // Se a cópia não tiver nenhuma entry, podemos deletá-la se o due_date da bill em si for >= Junho ou se a bill foi criada recentemente.
        // Vamos checar as entries primeiro:
        let matchDateFilter = true;
        
        if (dupEntries.length > 0) {
          for (const e of dupEntries) {
            const yyyymm = e.reference_month; // Ex: '2026-07' ou '2026-06'
            const due = e.due_date;
            
            // Junho em diante significa: reference_month >= '2026-06' ou due_date >= '2026-06-01'
            const isJuneOrLater = (yyyymm && yyyymm >= '2026-06') || (due && due >= new Date('2026-06-01'));
            if (!isJuneOrLater) {
              matchDateFilter = false;
            }
          }
        } else {
          // Se não tem entries, olha a data de vencimento da bill
          const billIdx = row.ids.indexOf(dupId);
          const billDueDate = row.due_dates[billIdx];
          if (billDueDate) {
            const isJuneOrLater = billDueDate >= new Date('2026-06-01');
            if (!isJuneOrLater) matchDateFilter = false;
          }
        }

        if (matchDateFilter) {
          toDeleteBillsForGroup.push(dupId);
          dupEntries.forEach(e => {
            toDeleteEntriesForGroup.push(e.id);
          });
        }
      }

      if (toDeleteBillsForGroup.length > 0) {
        console.log(`  👉 DECISÃO: Manter Bill ${keeper}. Deletar duplicatas: Bills [${toDeleteBillsForGroup.join(', ')}] e Entries [${toDeleteEntriesForGroup.join(', ')}]`);
        totalBillsToDelete += toDeleteBillsForGroup.length;
        totalEntriesToDelete += toDeleteEntriesForGroup.length;
      } else {
        console.log(`  👉 DECISÃO: Nenhuma duplicata deste grupo atende ao critério de Junho em diante para exclusão.`);
      }
    }

    console.log(`\nResumo total pré-exclusão:`);
    console.log(`Total de Bills (contas) para excluir: ${totalBillsToDelete}`);
    console.log(`Total de Entries (lançamentos) para excluir: ${totalEntriesToDelete}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
