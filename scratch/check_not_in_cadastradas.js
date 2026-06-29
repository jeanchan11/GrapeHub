import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    console.log('=== ANALISANDO LANÇAMENTOS DE JULHO/2026 EM DIANTE ===\n');

    // Buscar lançamentos de 2026-07 em diante (reference_month >= '2026-07')
    // onde a conta associada (fin_bills):
    // - ou não está ativa (is_active = false)
    // - ou tem recorrência 'once' (pois as únicas não ficam no painel "Contas Cadastradas", que filtra por b.recurrence !== 'once')
    
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
      ORDER BY e.reference_month, b.name
    `);

    console.log(`Total de lançamentos a partir de Julho/2026: ${res.rows.length}`);
    
    console.log('\n--- Lançamentos cuja Bill está inativa (is_active = false): ---');
    const inactiveParent = res.rows.filter(r => !r.is_active);
    console.log(`Quantidade: ${inactiveParent.length}`);
    inactiveParent.forEach(r => {
      console.log(`  - [Entry ID:${r.entry_id}] "${r.bill_name}" | Ref: ${r.reference_month} | Valor: R$${r.expected_value} | Status: ${r.status} | Recurrência: ${r.recurrence}`);
    });

    console.log('\n--- Lançamentos cuja Bill tem recorrência "once" (única): ---');
    const onceParent = res.rows.filter(r => r.is_active && r.recurrence === 'once');
    console.log(`Quantidade: ${onceParent.length}`);
    onceParent.forEach(r => {
      console.log(`  - [Entry ID:${r.entry_id}] "${r.bill_name}" | Ref: ${r.reference_month} | Valor: R$${r.expected_value} | Status: ${r.status}`);
    });

    console.log('\n--- Lançamentos cuja Bill tem outra recorrência ativa (recorrentes normais): ---');
    const activeRecurring = res.rows.filter(r => r.is_active && r.recurrence !== 'once');
    console.log(`Quantidade: ${activeRecurring.length}`);
    activeRecurring.forEach(r => {
      console.log(`  - [Entry ID:${r.entry_id}] "${r.bill_name}" | Ref: ${r.reference_month} | Valor: R$${r.expected_value} | Status: ${r.status} | Recurrência: ${r.recurrence}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

check();
