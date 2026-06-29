import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    // Get columns of all relevant tables
    const cols = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('fin_bill_entries', 'fin_bills', 'fin_payables')
      ORDER BY table_name, ordinal_position
    `);
    
    const byTable = {};
    for (const row of cols.rows) {
      if (!byTable[row.table_name]) byTable[row.table_name] = [];
      byTable[row.table_name].push(`${row.column_name} (${row.data_type})`);
    }
    
    for (const [table, columns] of Object.entries(byTable)) {
      console.log(`\nTabela: ${table}`);
      console.log('Colunas:', columns.join(', '));
    }

    process.exit(0);
  } catch (err) {
    console.error('Erro:', err.message);
    process.exit(1);
  }
}

check();
