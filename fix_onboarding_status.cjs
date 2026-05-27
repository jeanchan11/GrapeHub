const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.VITE_DATABASE_URL || 'postgresql://neondb_owner:npg_Ucjz1nygpE4L@ep-sweet-morning-ac7xd87o-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
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
