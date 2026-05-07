const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_Ucjz1nygpE4L@ep-sweet-morning-ac7xd87o-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  try {
    // 1. Encontrar o primeiro kanban do usuário
    const kanbanRes = await pool.query('SELECT id, user_id FROM crm_comercial_kanbans LIMIT 1');
    if (kanbanRes.rows.length === 0) {
      console.log('Nenhum kanban encontrado.');
      return;
    }
    const kanban = kanbanRes.rows[0];

    // 2. Encontrar a coluna de Negociação (ou primeira)
    const colRes = await pool.query("SELECT id FROM crm_comercial_columns WHERE kanban_id = $1 AND title ILIKE '%negoci%' LIMIT 1", [kanban.id]);
    let colunaId = colRes.rows.length > 0 ? colRes.rows[0].id : null;
    if (!colunaId) {
       const colRes2 = await pool.query("SELECT id FROM crm_comercial_columns WHERE kanban_id = $1 ORDER BY order_index ASC LIMIT 1", [kanban.id]);
       colunaId = colRes2.rows[0].id;
    }

    // 3. Encontrar um responsavel (usuario do sistema)
    let responsavelId = kanban.user_id; // Se não tiver usuario, pega o dono do kanban
    const usersRes = await pool.query("SELECT id, name FROM users WHERE id = $1 LIMIT 1", [kanban.user_id]);
    const responsavelName = usersRes.rows.length > 0 ? usersRes.rows[0].name : 'Tiago Cordeiro';

    // 4. Inserir Lead
    const leadRes = await pool.query(`
      INSERT INTO crm_comercial_leads (nome, telefone, origem, responsavel_id, valor, observacoes, kanban_id, coluna) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id
    `, [
      'Jean - Teste Onboarding',
      '41999998888',
      'Indicação',
      responsavelId,
      5000,
      'Lead de teste para validar integração com Onboarding',
      kanban.id,
      colunaId
    ]);
    const leadId = leadRes.rows[0].id;
    console.log('Lead criado com sucesso: ', leadId);

    // 5. Inserir Meeting
    const meetingNotes = `- Cliente demonstrou grande interesse no produto.
- Precisa de acompanhamento focado no nicho de direito imobiliário.
- Dores: Falta de organização e processos perdidos em planilhas.
- Expectativa: Centralizar tudo na plataforma GrapeHub.`;

    await pool.query(`
      INSERT INTO crm_comercial_meetings 
      (lead_id, title, meeting_date, responsible_name, notes, office_location, reunion_link, reunion_niche, monthly_closings, closing_goal)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      leadId,
      'Reunião de Diagnóstico',
      new Date().toISOString(),
      responsavelName,
      meetingNotes,
      'Curitiba/PR',
      'https://meet.google.com/abc-defg-hij',
      'Direito Imobiliário',
      '15',
      '30'
    ]);
    console.log('Reunião de teste criada com sucesso.');
    
  } catch (err) {
    console.error('Erro:', err);
  } finally {
    pool.end();
  }
}

run();
