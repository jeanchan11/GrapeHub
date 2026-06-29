import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    console.log('=== ANALISANDO EXCLUSÃO DE JULHO EM DIANTE ===\n');

    // Buscar entries de julho em diante (reference_month >= '2026-07')
    // onde a bill correspondente não está nas Contas Cadastradas (is_active = false OU recurrence = 'once')
    const res = await pool.query(`
      SELECT 
        e.id as entry_id,
        e.reference_month,
        e.due_date,
        e.expected_value,
        e.status,
        b.id as bill_id,
        b.name as bill_name,
        b.recurrence,
        b.is_active
      FROM fin_bill_entries e
      JOIN fin_bills b ON b.id = e.bill_id
      WHERE e.reference_month >= '2026-07'
        AND (b.is_active = false OR b.recurrence = 'once')
      ORDER BY e.reference_month, b.name
    `);

    console.log(`Total de lançamentos (entries) encontrados para exclusão: ${res.rows.length}`);
    
    // Agrupar por tipo
    const onceEntries = res.rows.filter(r => r.recurrence === 'once');
    const inactiveEntries = res.rows.filter(r => !r.is_active);

    console.log(`\n1. Lançamentos com recorrência "once" (única) a serem excluídos (${onceEntries.length}):`);
    onceEntries.forEach(r => {
      console.log(`  - [Entry ID:${r.entry_id}] "${r.bill_name}" | Ref: ${r.reference_month} | Venc: ${r.due_date.toISOString().split('T')[0]} | Valor: R$${r.expected_value} | Status: ${r.status}`);
    });

    console.log(`\n2. Lançamentos de contas inativas (is_active = false) a serem excluídos (${inactiveEntries.length}):`);
    inactiveEntries.forEach(r => {
      console.log(`  - [Entry ID:${r.entry_id}] "${r.bill_name}" | Ref: ${r.reference_month} | Valor: R$${r.expected_value} | Status: ${r.status}`);
    });

    // Vamos verificar se existem fin_bills correspondentes a essas recurrence='once' que também devem ser excluídas para não deixar lixo na tabela fin_bills
    const onceBillIds = Array.from(new Set(onceEntries.map(r => r.bill_id)));
    console.log(`\nTotal de contas únicas (fin_bills com recurrence='once') que também serão excluídas: ${onceBillIds.length}`);

    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

check();
