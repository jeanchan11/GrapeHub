const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.VITE_DATABASE_URL || 'postgresql://neondb_owner:npg_Ucjz1nygpE4L@ep-sweet-morning-ac7xd87o-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  await client.connect();
  try {
    const res = await client.query(`SELECT id, name FROM automations`);
    console.log("Automações:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
