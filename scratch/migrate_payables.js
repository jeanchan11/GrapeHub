import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const getYYYYMMDD = (d) => {
  if (!d) return '';
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return String(d).slice(0, 10);
};

async function migrate() {
  try {
    console.log('Starting migration of fin_payables to fin_bills & fin_bill_entries...');
    
    // Fetch all pending payables
    const payablesRes = await pool.query(
      `SELECT * FROM fin_payables WHERE status = 'Pendente' ORDER BY id ASC`
    );
    const payables = payablesRes.rows;
    console.log(`Found ${payables.length} pending payables in fin_payables.`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const fp of payables) {
      const dateStr = getYYYYMMDD(fp.due_date);
      const referenceMonth = dateStr.slice(0, 7); // YYYY-MM
      const migrationNote = `Migrado do fin_payables ID: ${fp.id}`;

      // Check if already migrated
      const checkRes = await pool.query(
        `SELECT id FROM fin_bills WHERE notes LIKE $1`,
        [`%${migrationNote}%`]
      );

      if (checkRes.rows.length > 0) {
        skippedCount++;
        continue;
      }

      // Start transaction for this payable
      await pool.query('BEGIN');

      try {
        const fullNotes = `Migrado do fin_payables ID: ${fp.id}. Conta original: ${fp.account_name}. Fornecedor: ${fp.supplier_name || ''}. Obs: ${fp.comment || ''}`;
        
        // Insert into fin_bills
        const billRes = await pool.query(
          `INSERT INTO fin_bills (name, category, value, recurrence, due_date, notes, is_active)
           VALUES ($1, $2, $3, 'once', $4, $5, TRUE)
           RETURNING id`,
          [fp.description, fp.category_l2_desc || 'Outros', fp.value, dateStr, fullNotes]
        );
        const billId = billRes.rows[0].id;

        // Insert into fin_bill_entries
        await pool.query(
          `INSERT INTO fin_bill_entries (bill_id, reference_month, due_date, expected_value, status, notes)
           VALUES ($1, $2, $3, $4, 'pending', $5)`,
          [billId, referenceMonth, dateStr, fp.value, migrationNote]
        );

        await pool.query('COMMIT');
        migratedCount++;
      } catch (err) {
        await pool.query('ROLLBACK');
        console.error(`Error migrating payable ID ${fp.id}:`, err);
        throw err;
      }
    }

    console.log(`Migration completed: ${migratedCount} migrated, ${skippedCount} skipped (already migrated).`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
