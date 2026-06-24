import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    const subsessions = await pool.query('SELECT * FROM menu_subsessions');
    console.log("--- Menu Subsessions ---");
    subsessions.rows.forEach(s => {
      console.log(`ID: ${s.id}, Label: ${s.label}, Section ID: ${s.section_id}`);
    });

    const subsubsessions = await pool.query('SELECT * FROM menu_subsubsessions');
    console.log("--- Menu Subsubsessions ---");
    subsubsessions.rows.forEach(s => {
      console.log(`ID: ${s.id}, Label: ${s.label}, Subsession ID: ${s.subsession_id}, Section ID: ${s.section_id}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
