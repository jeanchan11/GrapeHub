import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const { rows: users } = await pool.query(`
      SELECT id, uid, email, name, role 
      FROM users 
      ORDER BY email
    `);
    console.log("Users in DB:");
    users.forEach(u => console.log(`id: "${u.id}", uid: "${u.uid}", email: "${u.email}", name: "${u.name}"`));
  } catch (e) {
    console.error("Query error:", e);
  } finally {
    await pool.end();
  }
}

run();
