import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });

// 1) acha/cria a conta "Cartão Sicredi" (igual à automação do import)
let billRes = await pool.query(`SELECT id FROM fin_bills WHERE LOWER(name) LIKE '%sicredi%' AND LOWER(name) LIKE '%cart%' LIMIT 1`);
let billId;
if (billRes.rows.length === 0) {
  const nb = await pool.query(`INSERT INTO fin_bills (name, category, value, recurrence, due_day, is_active) VALUES ('Cartão Sicredi','Cartão de Crédito',NULL,'monthly',18,false) RETURNING id`);
  billId = nb.rows[0].id; console.log('conta "Cartão Sicredi" criada (id', billId, ')');
} else { billId = billRes.rows[0].id; console.log('conta "Cartão Sicredi" já existe (id', billId, ')'); }

// 2) pra cada mês de competência com fatura Sicredi, lança no Contas a Pagar
const months = await pool.query(`SELECT billing_month, SUM(value::numeric) FILTER (WHERE type=-1) total FROM fin_movements_asaas WHERE account='sicredi' AND billing_month IS NOT NULL GROUP BY billing_month ORDER BY billing_month`);
for (const m of months.rows) {
  const bm = m.billing_month;
  const total = parseFloat(m.total) || 0;
  const [bY,bM] = bm.split('-').map(Number);
  const due = `${bY}-${String(bM).padStart(2,'0')}-18`;
  const r = await pool.query(
    `INSERT INTO fin_bill_entries (bill_id, reference_month, due_date, expected_value, status)
     VALUES ($1,$2,$3,$4,'pending')
     ON CONFLICT (bill_id, reference_month)
     DO UPDATE SET expected_value=EXCLUDED.expected_value, due_date=EXCLUDED.due_date
     WHERE fin_bill_entries.status NOT IN ('paid','cancelled')
     RETURNING id, (xmax=0) AS inserted`,
    [billId, bm, due, total]);
  const act = r.rows.length ? (r.rows[0].inserted ? 'criada' : 'atualizada') : 'já paga (mantida)';
  console.log(`  ${bm}: R$ ${total.toFixed(2)} -> ${act}`);
}
await pool.end();
