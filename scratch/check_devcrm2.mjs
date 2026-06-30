import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const e = await pool.query(`SELECT id, reference_month, status, actual_value, paid_at, linked_movement_id FROM fin_bill_entries WHERE id = 4609`);
console.log('=== entry 4609 (Junho) ===');
console.table(e.rows);
const lid = e.rows[0]?.linked_movement_id;
if (lid) {
  const m = await pool.query(`SELECT id, description, value, transaction_date FROM fin_movements_asaas WHERE id = $1`, [lid]);
  console.log('=== movimento vinculado ===');
  console.table(m.rows.map(x=>({id:x.id, desc:x.description, val:x.value, date: x.transaction_date && x.transaction_date.toISOString?x.transaction_date.toISOString().slice(0,10):x.transaction_date})));
} else {
  console.log('Sem movimento vinculado — foi marcada como paga manualmente (botão Pagar).');
}
await pool.end();
