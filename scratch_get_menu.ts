import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    const pages = await pool.query('SELECT * FROM menu_pages');
    console.log("--- Menu Pages ---");
    pages.rows.forEach(p => {
      console.log(`ID: ${p.id}, Label: ${p.label}, Template: ${p.template}, Section ID: ${p.section_id}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
