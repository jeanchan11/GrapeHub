import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    const sections = await pool.query('SELECT * FROM menu_sections');
    console.log("--- Menu Sections ---");
    sections.rows.forEach(s => {
      console.log(`ID: ${s.id}, Title: ${s.title}, Icon: ${s.icon}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
