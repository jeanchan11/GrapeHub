import pg from "pg";
import dotenv from "dotenv";
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const OLD_IDS_MAP: Record<string, string> = {
  'follow_up_1': 'Follow up 1',
  'follow_up_2': 'Follow up 2',
  'follow_up_3': 'Follow up 3',
  'follow_up_4': 'Follow up 4',
  'negociacao': 'Negociação 🏆',
  'onboarding': 'Onboarding Comercial',
  'fechado': 'Fechado'
};

async function run() {
  try {
    const cols = await pool.query('SELECT id, title FROM crm_comercial_columns');
    const colsMap: Record<string, string> = {};
    for (const col of cols.rows) {
      colsMap[col.title] = col.id;
    }

    const leads = await pool.query('SELECT id, coluna FROM crm_comercial_leads');
    for (const lead of leads.rows) {
      let newColumnId = null;
      if (lead.coluna && OLD_IDS_MAP[lead.coluna]) {
        newColumnId = colsMap[OLD_IDS_MAP[lead.coluna]];
      } else if (lead.coluna === '') {
        newColumnId = colsMap['Follow up 1']; // Default to first column
      }

      if (newColumnId) {
        await pool.query('UPDATE crm_comercial_leads SET coluna = $1 WHERE id = $2', [newColumnId, lead.id]);
        console.log(`Updated lead ${lead.id} to column ${newColumnId}`);
      }
    }
    console.log('Migration complete');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
