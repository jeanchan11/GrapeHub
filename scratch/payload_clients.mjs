import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
// tamanho por coluna da tabela clients
const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='clients' ORDER BY ordinal_position`);
console.log('colunas de clients:', cols.rows.map(c=>`${c.column_name}(${c.data_type})`).join(', '));
// maiores colunas por bytes
const big = await pool.query(`
  SELECT 'contracts' AS col, COALESCE(MAX(octet_length(contracts::text)),0) AS max_bytes, COALESCE(AVG(octet_length(contracts::text))::int,0) AS avg_bytes FROM clients
  UNION ALL SELECT 'tags', COALESCE(MAX(octet_length(tags::text)),0), COALESCE(AVG(octet_length(tags::text))::int,0) FROM clients`);
console.table(big.rows);
// tamanho total do payload da query real
const t0=Date.now();
const r = await pool.query(`SELECT c.* FROM clients c`);
const ms=Date.now()-t0;
const bytes = Buffer.byteLength(JSON.stringify(r.rows));
console.log(`SELECT c.* -> ${ms}ms, ${r.rows.length} linhas, payload ${(bytes/1024).toFixed(0)} KB (${(bytes/r.rows.length/1024).toFixed(1)} KB/linha)`);
await pool.end();
