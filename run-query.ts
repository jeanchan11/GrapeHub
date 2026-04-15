import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const query = process.argv[2];
  if (!query) {
    console.error("No query provided");
    process.exit(1);
  }
  try {
    const res = await pool.query(query);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
