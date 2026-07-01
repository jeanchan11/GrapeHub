import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });

const br = await pool.query(`SELECT id FROM fin_bills WHERE LOWER(name) LIKE '%sicredi%' AND LOWER(name) LIKE '%cart%' LIMIT 1`);
const billId = br.rows[0].id;

// 1) remove parcelas antigas sem nota (do backfill no dia 18), só se pendentes
const del = await pool.query(`DELETE FROM fin_bill_entries WHERE bill_id=$1 AND (notes IS NULL OR notes='') AND status NOT IN ('paid','cancelled') RETURNING reference_month`, [billId]);
console.log('parcelas antigas removidas:', del.rows.map(r=>r.reference_month).join(', ') || 'nenhuma');

// 2) re-sync por competência (mesma lógica do helper)
const months = await pool.query(`SELECT DISTINCT billing_month FROM fin_movements_asaas WHERE account='sicredi' AND billing_month IS NOT NULL ORDER BY billing_month`);
for (const m of months.rows) {
  const bm = m.billing_month;
  const [bY,bM] = bm.split('-').map(Number);
  const noteTag = `Competência ${String(bM).padStart(2,'0')}/${bY}`;
  await pool.query(`DELETE FROM fin_bill_entries WHERE bill_id=$1 AND notes=$2 AND status NOT IN ('paid','cancelled')`, [billId, noteTag]);
  const pd = await pool.query(`SELECT payment_date FROM fin_sicredi_invoice WHERE billing_month=$1`, [bm]);
  const payDate = pd.rows[0]?.payment_date;
  if (!payDate) { console.log(`  ${bm}: sem data de pagamento -> não lançado`); continue; }
  const payIso = new Date(payDate).toISOString().slice(0,10);
  const refMonth = payIso.slice(0,7);
  const tr = await pool.query(`SELECT COALESCE(SUM(value::numeric),0) total FROM fin_movements_asaas WHERE account='sicredi' AND billing_month=$1 AND type=-1`, [bm]);
  const total = parseFloat(tr.rows[0].total)||0;
  await pool.query(`INSERT INTO fin_bill_entries (bill_id, reference_month, due_date, expected_value, status, notes) VALUES ($1,$2,$3,$4,'pending',$5) ON CONFLICT (bill_id, reference_month) DO UPDATE SET due_date=EXCLUDED.due_date, expected_value=EXCLUDED.expected_value, notes=EXCLUDED.notes WHERE fin_bill_entries.status NOT IN ('paid','cancelled')`, [billId, refMonth, payIso, total, noteTag]);
  console.log(`  ${bm}: lançado em ${refMonth} (vence ${payIso}) R$ ${total.toFixed(2)} [${noteTag}]`);
}
await pool.end();
