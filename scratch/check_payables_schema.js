import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const bills = await pool.query('SELECT COUNT(*) FROM fin_bills');
    console.log('Total rows in fin_bills:', bills.rows[0].count);

    const entries = await pool.query('SELECT COUNT(*) FROM fin_bill_entries');
    console.log('Total rows in fin_bill_entries:', entries.rows[0].count);

    if (parseInt(bills.rows[0].count) > 0) {
      const sampleBills = await pool.query('SELECT * FROM fin_bills LIMIT 3');
      console.log('Sample fin_bills:', sampleBills.rows);
    }
    if (parseInt(entries.rows[0].count) > 0) {
      const sampleEntries = await pool.query('SELECT * FROM fin_bill_entries LIMIT 3');
      console.log('Sample fin_bill_entries:', sampleEntries.rows);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
