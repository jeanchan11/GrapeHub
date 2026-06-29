import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query("SELECT * FROM menu_pages WHERE label ILIKE '%postagem%' OR id ILIKE '%postagem%' OR label ILIKE '%ig%' OR id ILIKE '%ig%'");
    console.log('Matching Pages:', res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
