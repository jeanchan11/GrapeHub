import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const res = await pool.query("SELECT title, content FROM career_plan_docs WHERE title = 'Designer'");
  console.log(res.rows[0].content);
  process.exit(0);
}
run();
