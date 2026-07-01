import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
const q = `EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) WITH receivable_agg AS (
  SELECT r.customer_id,
    SUM(CASE WHEN r.status='OVERDUE' THEN r.value ELSE 0 END) as overdue_total,
    MIN(CASE WHEN r.status='OVERDUE' THEN r.due_date END) as oldest_overdue,
    MIN(CASE WHEN r.status='PENDING' THEN r.due_date END) as next_pending_date,
    (SELECT r2.value FROM fin_receivables r2 WHERE r2.customer_id=r.customer_id AND r2.status='PENDING' ORDER BY r2.due_date ASC LIMIT 1) as first_pending_value,
    bool_or(r.status='OVERDUE') as has_overdue,
    bool_or(r.status='PENDING' AND r.due_date <= CURRENT_DATE + interval '7 days') as has_due_soon
  FROM fin_receivables r WHERE r.status IN ('OVERDUE','PENDING') GROUP BY r.customer_id)
SELECT c.*, fp_link.id IS NOT NULL as has_financial_link,
  EXISTS(SELECT 1 FROM projects p WHERE p.active_client_id=c.id) as has_project_link,
  (SELECT p.partner FROM projects p WHERE p.active_client_id=c.id LIMIT 1) as project_name,
  COALESCE(NULLIF(ra.overdue_total,0), ra.first_pending_value, fs.value, 0) as valor_display
FROM clients c
LEFT JOIN LATERAL (SELECT fp.id, fp.guid, fp.asaas_id FROM fin_people fp WHERE fp.grapehub_client_id=c.id OR (c.fin_people_guid IS NOT NULL AND fp.guid=c.fin_people_guid) LIMIT 1) fp_link ON true
LEFT JOIN fin_subscriptions fs ON c.fin_subscription_id IS NOT NULL AND c.fin_subscription_id != '' AND fs.id::text=c.fin_subscription_id
LEFT JOIN receivable_agg ra ON ra.customer_id=fp_link.asaas_id
ORDER BY c.sort_order ASC, c.name ASC`;
const r = await pool.query(q);
console.log(r.rows.map(x=>x['QUERY PLAN']).join('\n'));
await pool.end();
