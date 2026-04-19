import pg from 'pg';
import "dotenv/config";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/crm' });
async function run() {
    const res = await pool.query("SELECT * FROM menu_sections");
    console.log("Sections:", res.rows);
    const subs = await pool.query("SELECT * FROM menu_subsessions WHERE section_id = 'comercial' OR id = 'comercial'");
    const pages = await pool.query("SELECT * FROM menu_pages WHERE section_id = 'comercial' OR subsession_id = 'comercial'");
    console.log("Subsessions:", subs.rows);
    console.log("Pages:", pages.rows);
    process.exit(0);
}
run();
