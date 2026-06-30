import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const r = await pool.query(`SELECT id, name, category, value, recurrence, due_day, due_date, is_active, created_at FROM fin_bills WHERE name ILIKE '%desenvolvedor%' OR name ILIKE '%crm%' ORDER BY created_at DESC`);
console.log('=== fin_bills (Desenvolvedor/CRM) ===');
console.table(r.rows.map(x => ({ id:x.id, name:x.name, rec:x.recurrence, due_day:x.due_day, due_date: x.due_date && x.due_date.toISOString ? x.due_date.toISOString().slice(0,10) : x.due_date, active:x.is_active, val:x.value })));
// entries for this bill
if (r.rows.length) {
  const ids = r.rows.map(x=>x.id);
  const e = await pool.query(`SELECT id, bill_id, reference_month, due_date, expected_value, status FROM fin_bill_entries WHERE bill_id = ANY($1) ORDER BY reference_month`, [ids]);
  console.log('=== entries dessa conta ===');
  console.table(e.rows.map(x=>({id:x.id, bill_id:x.bill_id, ref:x.reference_month, due: x.due_date && x.due_date.toISOString?x.due_date.toISOString().slice(0,10):x.due_date, val:x.expected_value, status:x.status})));
}
await pool.end();
