import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(`
      SELECT id, partner, responsible, squad
      FROM projects
      WHERE squad = 'Able'
      ORDER BY responsible
    `);
    console.log('Projects of squad Able:', res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
