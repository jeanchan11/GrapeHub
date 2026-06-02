import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT * FROM menu_subsessions WHERE label ILIKE '%Calculadoras%'").then(res => {
  console.log('Result:', res.rows);
  process.exit(0);
});
