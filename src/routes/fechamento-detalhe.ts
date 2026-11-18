// Popup do fechamento (Métricas do Comercial › Lista de Fechamentos), 18/11/2026.
//
//  • GET    /api/fechamentos/:id/detalhe → o fechamento + o lead do CRM (anúncio, perfil, jornada)
//  • PATCH  /api/fechamentos/:id         → muda a origem (campanhas | indicação)
//  • DELETE /api/fechamentos/:id         → tira da lista de fechamentos
//
// `fechamentos` não guarda o id do lead: o vínculo é pelo NOME, com a mesma regra da
// lista (`lead_nome`; sem ele, nome fantasia ou nome do lead). Tirar da lista não mexe no
// lead do CRM. Nada é apagado de verdade: a linha vai inteira para `fechamentos_removidos`
// e toda mudança fica em `fechamentos_log`.
import type { Express } from 'express';
import type { Pool } from 'pg';

const ORIGENS = ['campanhas', 'indicação'];

export async function setupFechamentoDetalheRoutes(app: Express, pool: Pool) {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS fechamentos_removidos (
      id SERIAL PRIMARY KEY, fechamento_id INTEGER, dados JSONB, motivo TEXT,
      removido_por TEXT, removido_em TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS fechamentos_log (
      id SERIAL PRIMARY KEY, fechamento_id INTEGER, acao TEXT, de TEXT, para TEXT,
      por TEXT, em TIMESTAMP DEFAULT NOW())`);
  } catch (e: any) {
    console.error('[fechamento-detalhe] migração:', e?.message || e);
  }

  const emailDe = (req: any) => String(req.user?.email || '').toLowerCase();
  const podeEditar = async (email: string) => {
    if (!email) return false;
    const papel = String((await pool.query('SELECT role FROM users WHERE LOWER(email) = $1', [email])).rows[0]?.role || '');
    return papel === 'superadmin' || papel === 'admin' || papel === 'gerente-comercial' || papel.startsWith('diretor');
  };

  // Nomes reais das colunas (a tabela veio de planilha: "INDICAÇÃO / CAMPANHA", "FATURAMENTO"…)
  const colunas = async () => {
    const r = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'fechamentos' ORDER BY ordinal_position`);
    const c = r.rows.map((x: any) => x.column_name as string);
    return {
      nome: c.find(x => x.toLowerCase() === 'nome') || 'Nome',
      valor: c.find(x => x.toLowerCase().includes('valor')) || 'Valor',
      origem: c.find(x => x.toLowerCase().includes('indica') || x.toLowerCase().includes('campa') || x.toLowerCase().includes('origem')) || 'INDICAÇÃO / CAMPANHA',
      fat: c.find(x => x.toLowerCase().includes('fatura')) || 'FATURAMENTO',
      cidade: c.find(x => x.toLowerCase().includes('cidade')) || 'CIDADE',
    };
  };

  app.get('/api/fechamentos/:id/detalhe', async (req, res) => {
    try {
      const col = await colunas();
      const f = (await pool.query(
        `SELECT id, to_char(day, 'YYYY-MM-DD') AS dia, "${col.nome}" AS nome, "${col.valor}" AS valor,
                "${col.origem}" AS origem, "${col.fat}" AS faturamento, "${col.cidade}" AS cidade,
                COALESCE(lead_nome, '') AS lead_nome
           FROM fechamentos WHERE id = $1`, [req.params.id])).rows[0];
      if (!f) return res.status(404).json({ error: 'Fechamento não encontrado' });

      const lead = (await pool.query(
        `SELECT l.id, l.nome, l.form_nome_fantasia, l.telefone, l.email, l.instagram, l.origem,
                l.utm_platform, l.utm_campaign, l.utm_set, l.utm_creative, l.utm_position,
                l.faturamento, l.nicho, l.tempo_oab, l.form_cidade, l.form_estado, l.office_location,
                l.form_cnpj_cpf, l.valor, l.forma_pagamento, l.investimento, l.monthly_closings,
                l.closing_goal, l.observacoes, l.created_at, l.reunion_date, l.lead_score,
                u.name AS responsavel, u.picture AS responsavel_foto,
                COALESCE(c.title, lg.title) AS etapa, k.nome AS kanban
           FROM crm_comercial_leads l
           LEFT JOIN users u ON u.id = l.responsavel_id
           LEFT JOIN crm_comercial_columns c ON c.id::text = l.coluna::text
           LEFT JOIN crm_comercial_columns_legacy lg ON lg.id = l.coluna::text
           LEFT JOIN crm_comercial_kanbans k ON k.id::text = l.kanban_id::text
          WHERE ($1 <> '' AND l.nome = $1)
             OR ($1 = '' AND (l.form_nome_fantasia = $2 OR l.nome = $2))
          ORDER BY l.created_at DESC NULLS LAST LIMIT 1`, [f.lead_nome, f.nome])).rows[0] || null;

      let historico: any[] = [];
      let reunioes: any[] = [];
      if (lead) {
        historico = (await pool.query(
          `SELECT h.created_at, h.action_type, h.description, COALESCE(h.user_name, h.moved_by) AS autor,
                  COALESCE(cf.title, lf.title) AS de, COALESCE(ct.title, lt.title) AS para
             FROM crm_comercial_history h
             LEFT JOIN crm_comercial_columns cf ON cf.id::text = h.from_coluna::text
             LEFT JOIN crm_comercial_columns_legacy lf ON lf.id = h.from_coluna::text
             LEFT JOIN crm_comercial_columns ct ON ct.id::text = h.to_coluna::text
             LEFT JOIN crm_comercial_columns_legacy lt ON lt.id = h.to_coluna::text
            WHERE h.lead_id::text = $1
            ORDER BY h.created_at ASC LIMIT 80`, [lead.id])).rows;
        reunioes = (await pool.query(
          `SELECT meeting_date, title, responsible_name FROM crm_comercial_meetings
            WHERE lead_id = $1 ORDER BY meeting_date ASC`, [String(lead.id)])).rows;
      }

      res.json({ fechamento: f, lead, historico, reunioes, pode_editar: await podeEditar(emailDe(req)) });
    } catch (e: any) {
      console.error('[fechamento-detalhe] detalhe:', e?.message || e);
      res.status(500).json({ error: 'Falha ao carregar o fechamento' });
    }
  });

  app.patch('/api/fechamentos/:id', async (req, res) => {
    try {
      const email = emailDe(req);
      if (!(await podeEditar(email))) return res.status(403).json({ error: 'Sem permissão para alterar fechamentos' });
      const origem = String(req.body?.origem || '').toLowerCase();
      if (!ORIGENS.includes(origem)) return res.status(400).json({ error: 'Origem inválida' });
      const col = await colunas();
      const atual = (await pool.query(`SELECT "${col.origem}" AS origem FROM fechamentos WHERE id = $1`, [req.params.id])).rows[0];
      if (!atual) return res.status(404).json({ error: 'Fechamento não encontrado' });
      await pool.query(`UPDATE fechamentos SET "${col.origem}" = $1 WHERE id = $2`, [origem, req.params.id]);
      await pool.query(`INSERT INTO fechamentos_log (fechamento_id, acao, de, para, por) VALUES ($1, 'origem', $2, $3, $4)`,
        [req.params.id, atual.origem || '', origem, email]);
      res.json({ ok: true, origem });
    } catch (e: any) {
      console.error('[fechamento-detalhe] origem:', e?.message || e);
      res.status(500).json({ error: 'Falha ao mudar a origem' });
    }
  });

  app.delete('/api/fechamentos/:id', async (req, res) => {
    const email = emailDe(req);
    if (!(await podeEditar(email))) return res.status(403).json({ error: 'Sem permissão para alterar fechamentos' });
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const linha = (await c.query(`SELECT row_to_json(f) AS dados FROM fechamentos f WHERE id = $1`, [req.params.id])).rows[0];
      if (!linha) { await c.query('ROLLBACK'); return res.status(404).json({ error: 'Fechamento não encontrado' }); }
      await c.query(`INSERT INTO fechamentos_removidos (fechamento_id, dados, motivo, removido_por) VALUES ($1, $2, $3, $4)`,
        [req.params.id, linha.dados, String(req.body?.motivo || '').slice(0, 500) || null, email]);
      await c.query(`DELETE FROM fechamentos WHERE id = $1`, [req.params.id]);
      await c.query(`INSERT INTO fechamentos_log (fechamento_id, acao, por) VALUES ($1, 'removido', $2)`, [req.params.id, email]);
      await c.query('COMMIT');
      res.json({ ok: true });
    } catch (e: any) {
      await c.query('ROLLBACK').catch(() => {});
      console.error('[fechamento-detalhe] remover:', e?.message || e);
      res.status(500).json({ error: 'Falha ao tirar o fechamento' });
    } finally {
      c.release();
    }
  });
}
