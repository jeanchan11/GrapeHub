import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'optimizations'
  AND column_name IN ('images','is_internal','type','optimization','status','message')
  ORDER BY column_name
`);
console.table(r.rows);
await pool.end();
