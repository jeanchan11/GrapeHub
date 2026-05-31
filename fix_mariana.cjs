const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await client.connect();
    // Update the client named exactly 'Mariana' to 'Mariana Mira Advocacia'
    const result = await client.query(`
      UPDATE clients 
      SET name = 'Mariana Mira Advocacia' 
      WHERE name = 'Mariana'
      RETURNING id, name
    `);
    console.log("Updated rows:", result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
