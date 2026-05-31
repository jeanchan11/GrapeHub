const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  await client.connect();
  try {
    const res = await client.query(`UPDATE onboarding_tasks SET status_group = 'briefing-realizado' WHERE status_group = 'a-fazer-briefing' RETURNING id`);
    console.log(`Migrated ${res.rowCount} tasks from a-fazer-briefing to briefing-realizado`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
