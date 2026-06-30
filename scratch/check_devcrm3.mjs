import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const e = await pool.query(`SELECT id, bill_id, reference_month, due_date, expected_value, status, linked_movement_id, paid_at FROM fin_bill_entries WHERE bill_id=138 ORDER BY reference_month`);
console.log('=== entries bill 138 (Desenvolvedor CRM) ===');
console.table(e.rows.map(x=>({id:x.id,ref:x.reference_month,due:x.due_date?.toISOString?.().slice(0,10),val:x.expected_value,status:x.status,linked:x.linked_movement_id,paid_at:x.paid_at?.toISOString?.().slice(0,10)})));
await pool.end();
