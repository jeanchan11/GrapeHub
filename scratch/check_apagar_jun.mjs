import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const r = await pool.query(`
  SELECT e.id, b.name, e.due_date, e.expected_value, e.status, e.linked_movement_id
  FROM fin_bill_entries e JOIN fin_bills b ON b.id=e.bill_id
  WHERE e.reference_month='2026-06' AND e.status NOT IN ('paid','cancelled')
  ORDER BY e.due_date`);
console.log('=== A pagar pendentes Junho/2026 (status != paid/cancelled) ===');
console.table(r.rows.map(x=>({id:x.id,name:x.name,due:x.due_date.toISOString().slice(0,10),val:x.expected_value,status:x.status,linked:x.linked_movement_id})));
const total = r.rows.reduce((s,x)=>s+parseFloat(x.expected_value),0);
console.log('TOTAL a pagar Junho:', total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
await pool.end();
