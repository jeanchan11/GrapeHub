import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });

const TASK_ID = 148; // C A Rodrigues Advogados Associados

// 1) acha o lead pelo nome do onboarding e a reunião mais recente
const ob = await pool.query(`SELECT id, client_name, meeting_info FROM onboarding_tasks WHERE id=$1`, [TASK_ID]);
if (!ob.rows.length) { console.log('onboarding não encontrado'); process.exit(0); }
console.log('onboarding:', ob.rows[0].client_name, '| meeting_info atual:', ob.rows[0].meeting_info ? 'JÁ TEM' : 'vazio');

const lead = await pool.query(
  `SELECT id FROM crm_comercial_leads WHERE LOWER(TRIM(COALESCE(form_nome_fantasia, nome))) = LOWER(TRIM($1)) LIMIT 1`,
  [ob.rows[0].client_name]
);
if (!lead.rows.length) { console.log('lead não encontrado pelo nome'); process.exit(0); }
const leadId = lead.rows[0].id;

const m = await pool.query(
  `SELECT title, meeting_date, responsible_name, responsible_avatar, notes,
          office_location, reunion_link, reunion_niche, monthly_closings, closing_goal
   FROM crm_comercial_meetings WHERE lead_id=$1 ORDER BY meeting_date DESC, created_at DESC LIMIT 1`, [leadId]);
if (!m.rows.length) { console.log('nenhuma reunião pro lead', leadId); process.exit(0); }
const r = m.rows[0];
const meetingInfo = JSON.stringify({
  date: r.meeting_date, title: r.title, responsible: r.responsible_name, responsible_avatar: r.responsible_avatar,
  local: r.office_location, link: r.reunion_link, niche: r.reunion_niche,
  closings: r.monthly_closings, goal: r.closing_goal, notes: r.notes,
});
console.log('reunião:', r.title, '| notas:', (r.notes||'').length, 'chars');

await pool.query(`UPDATE onboarding_tasks SET meeting_info=$1 WHERE id=$2`, [meetingInfo, TASK_ID]);
console.log('✅ meeting_info preenchido no onboarding', TASK_ID);
await pool.end();
