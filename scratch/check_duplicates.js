import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    console.log('=== TOTAIS GERAIS ===\n');
    const totals = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM fin_bills) as total_bills,
        (SELECT COUNT(*) FROM fin_bill_entries) as total_entries,
        (SELECT COUNT(*) FROM fin_payables) as total_payables,
        (SELECT COUNT(*) FROM fin_bill_entries WHERE status = 'pending') as entries_pending,
        (SELECT COUNT(*) FROM fin_bill_entries WHERE status = 'paid') as entries_paid
    `);
    const t = totals.rows[0];
    console.log(`fin_bills: ${t.total_bills}`);
    console.log(`fin_bill_entries: ${t.total_entries} (pending: ${t.entries_pending}, paid: ${t.entries_paid})`);
    console.log(`fin_payables (legado): ${t.total_payables}`);

    console.log('\n=== DUPLICATAS EM fin_bills (mesmo name + value + recurrence) ===\n');
    const dupBills = await pool.query(`
      SELECT 
        name,
        value,
        recurrence,
        COUNT(*) as total,
        array_agg(id ORDER BY id) as ids
      FROM fin_bills
      GROUP BY name, value, recurrence
      HAVING COUNT(*) > 1
      ORDER BY total DESC, name
    `);
    
    if (dupBills.rows.length === 0) {
      console.log('Nenhuma duplicata encontrada em fin_bills ✓');
    } else {
      console.log(`${dupBills.rows.length} grupo(s) com duplicatas:`);
      dupBills.rows.forEach(row => {
        console.log(`  ❌ "${row.name}" | R$${row.value} | ${row.recurrence} | Qtd: ${row.total} | IDs: [${row.ids}]`);
      });
    }

    console.log('\n=== DUPLICATAS EM fin_bill_entries (mesmo bill_id + reference_month + due_date + expected_value) ===\n');
    const dupEntries = await pool.query(`
      SELECT 
        fbe.bill_id,
        fb.name as bill_name,
        fbe.reference_month,
        fbe.due_date,
        fbe.expected_value,
        COUNT(*) as total,
        array_agg(fbe.id ORDER BY fbe.id) as ids,
        array_agg(fbe.status ORDER BY fbe.id) as statuses
      FROM fin_bill_entries fbe
      JOIN fin_bills fb ON fb.id = fbe.bill_id
      GROUP BY fbe.bill_id, fb.name, fbe.reference_month, fbe.due_date, fbe.expected_value
      HAVING COUNT(*) > 1
      ORDER BY total DESC, fb.name
    `);
    
    if (dupEntries.rows.length === 0) {
      console.log('Nenhuma duplicata encontrada em fin_bill_entries ✓');
    } else {
      console.log(`${dupEntries.rows.length} grupo(s) com duplicatas:`);
      dupEntries.rows.forEach(row => {
        console.log(`  ❌ "${row.bill_name}" | Mês: ${row.reference_month} | Venc: ${row.due_date} | R$${row.expected_value} | Qtd: ${row.total}`);
        console.log(`     Entry IDs: [${row.ids}] | Status: [${row.statuses}]`);
      });
    }

    console.log('\n=== ANÁLISE DE ENTRADAS DE JULHO/2026 ===\n');
    const julyEntries = await pool.query(`
      SELECT 
        fbe.id,
        fb.name as bill_name,
        fbe.reference_month,
        fbe.due_date,
        fbe.expected_value,
        fbe.status,
        fb.recurrence
      FROM fin_bill_entries fbe
      JOIN fin_bills fb ON fb.id = fbe.bill_id
      WHERE fbe.reference_month = '2026-07'
      ORDER BY fb.name, fbe.id
    `);
    console.log(`Total de lançamentos em 2026-07: ${julyEntries.rows.length}`);
    julyEntries.rows.forEach(row => {
      console.log(`  [ID:${row.id}] "${row.bill_name}" | R$${row.expected_value} | ${row.status} | recurrence: ${row.recurrence}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

check();
