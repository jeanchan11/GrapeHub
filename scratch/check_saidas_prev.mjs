import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const inicio='2026-06-01', fim='2026-07-01';
const r = await pool.query(`
  SELECT TO_CHAR(e.due_date,'DD/MM') AS dia, COALESCE(SUM(e.expected_value),0) AS saidas_previstas
  FROM fin_bill_entries e
  WHERE e.due_date >= $1 AND e.due_date < $2 AND e.status NOT IN ('paid','cancelled')
  GROUP BY e.due_date ORDER BY e.due_date`, [inicio, fim]);
console.log('=== saidas_previstas por dia (query NOVA, sem exclusão) ===');
console.table(r.rows);
await pool.end();
