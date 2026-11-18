// ── Histórico único do cliente (17/11/2026) ──────────────────────────────────
//
// A espinha é `crm_comments` (client_id = clients.id): é o "Histórico" que aparece igual na
// Retenção e em Clientes Ativos. Antes, só a cobrança automática e a troca de etapa da Retenção
// caíam nele. Ficavam de fora: a cobrança MANUAL (o botão WA de Contas a Receber só abria o
// WhatsApp), a "Anotação de cobrança" (tabela à parte, uma nota por cliente, sobrescrita) e a
// saída (aviso prévio, checklist, arquivamento, planilha de churn ligada pelo NOME).
//
// Aqui:
//  • `meta JSONB` em crm_comments — dados estruturados do evento (canal, valor, resultado,
//    data da promessa). Coluna nova e opcional: o código antigo da produção a ignora.
//  • POST /api/clientes/:id/historico                → registra um evento com o e-mail do TOKEN
//  • POST /api/clientes/:id/historico/cobranca-manual → "Cobrança manual via WhatsApp"
//  • PATCH /api/crm-comments/:id/resultado            → como foi o contato (promessa com data)
//  • GET  /api/clientes/:id/resumo-relacionamento     → atraso, último contato, etapa, promessa
//  • GET  /api/fin/silencio?dias=15                   → atraso longo sem contato registrado
//  • `churn.client_id` — a planilha de churn passa a apontar para o cadastro (antes, só nome).
import type { Express } from 'express';
import type { Pool } from 'pg';

// Tipos que contam como "alguém falou com o cliente" (a cobrança automática não conta)
export const TIPOS_CONTATO = ['Cobrança manual', 'Contato realizado', 'Promessa de pagamento', 'Acordo fechado', 'Pedido de saída'];

const RESULTADOS: Record<string, string> = {
  sem_resposta: 'Sem resposta',
  prometeu: 'Prometeu pagar',
  pediu_prazo: 'Pediu prazo',
  reclamou: 'Reclamou / insatisfeito',
  pagou: 'Disse que já pagou',
};

const brl = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

// Cliente do Asaas ligado ao cadastro: pelo vínculo da pessoa OU pelo guid gravado no cliente
const SQL_ASAAS_DO_CLIENTE = `
  SELECT DISTINCT fp.asaas_id FROM fin_people fp
  WHERE fp.asaas_id IS NOT NULL
    AND (fp.grapehub_client_id = $1 OR fp.guid = (SELECT fin_people_guid FROM clients WHERE id = $1))`;

export async function setupClienteHistoricoRoutes(app: Express, pool: Pool) {
  try {
    await pool.query(`ALTER TABLE crm_comments ADD COLUMN IF NOT EXISTS meta JSONB`);
    await pool.query(`ALTER TABLE churn ADD COLUMN IF NOT EXISTS client_id TEXT`);
  } catch (e: any) {
    console.error('[cliente-historico] migração:', e?.message || e);
  }

  const emailDe = (req: any) => String(req.user?.email || '').toLowerCase() || 'desconhecido';

  // ── Evento genérico (aviso prévio, checklist, saída, pedido de saída…) ──
  app.post('/api/clientes/:id/historico', async (req, res) => {
    try {
      const { type, content, meta } = req.body || {};
      if (!type || !content) return res.status(400).json({ error: 'type e content são obrigatórios.' });
      const r = await pool.query(
        `INSERT INTO crm_comments (client_id, user_id, type, content, images, meta)
         VALUES ($1, $2, $3, $4, '{}', $5) RETURNING *`,
        [req.params.id, emailDe(req), String(type), String(content), meta ? JSON.stringify(meta) : null],
      );
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('[cliente-historico] evento:', e?.message || e);
      res.status(500).json({ error: 'Não foi possível registrar no histórico.' });
    }
  });

  // ── Cobrança manual (botão WA de Contas a Receber) ──
  app.post('/api/clientes/:id/historico/cobranca-manual', async (req, res) => {
    try {
      const { canal = 'whatsapp', valor = 0, qtd = 1, mensagem = '', customer_id = null } = req.body || {};
      const nomeCanal = String(canal).toLowerCase().includes('mail') ? 'e-mail' : 'WhatsApp';
      const content = `Cobrança manual via ${nomeCanal} — ${brl(Number(valor) || 0)} em aberto (${qtd} ${Number(qtd) === 1 ? 'cobrança vencida' : 'cobranças vencidas'})`
        + (mensagem ? `\n\n${String(mensagem).slice(0, 2000)}` : '');
      const r = await pool.query(
        `INSERT INTO crm_comments (client_id, user_id, type, content, images, meta)
         VALUES ($1, $2, 'Cobrança manual', $3, '{}', $4) RETURNING *`,
        [req.params.id, emailDe(req), content, JSON.stringify({ canal: nomeCanal, valor: Number(valor) || 0, qtd: Number(qtd) || 1, customer_id, resultado: null })],
      );
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('[cliente-historico] cobrança manual:', e?.message || e);
      res.status(500).json({ error: 'Não foi possível registrar a cobrança.' });
    }
  });

  // ── Editar uma nota: texto e tipo. Só quem escreveu ou o superadmin; registro automático não se edita ──
  const TIPOS_EDITAVEIS = ['Observação', 'Contato realizado', 'Promessa de pagamento', 'Acordo fechado', 'Pedido de saída', 'Cobrança manual'];
  app.patch('/api/crm-comments/:id', async (req, res) => {
    try {
      const email = emailDe(req);
      const atual = await pool.query('SELECT user_id, type, meta FROM crm_comments WHERE id = $1', [req.params.id]);
      if (!atual.rows[0]) return res.status(404).json({ error: 'Nota não encontrada' });
      const nota = atual.rows[0];
      const papel = (await pool.query('SELECT role FROM users WHERE LOWER(email) = $1', [email])).rows[0]?.role;
      if (String(nota.user_id || '').toLowerCase() !== email && papel !== 'superadmin') {
        return res.status(403).json({ error: 'Só quem escreveu a nota pode editá-la' });
      }
      if (!TIPOS_EDITAVEIS.includes(nota.type)) return res.status(400).json({ error: 'Registro automático não pode ser editado' });
      const { content, type } = req.body || {};
      if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'Texto vazio' });
      const tipo = type && TIPOS_EDITAVEIS.includes(type) ? type : nota.type;
      const meta = { ...(nota.meta || {}), editado_por: email, editado_em: new Date().toISOString() };
      const r = await pool.query('UPDATE crm_comments SET content = $1, type = $2, meta = $3 WHERE id = $4 RETURNING *', [content, tipo, meta, req.params.id]);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('[cliente-historico] editar nota:', e?.message || e);
      res.status(500).json({ error: 'Falha ao editar a nota' });
    }
  });

  // ── Resultado do contato (promessa precisa de data) ──
  app.patch('/api/crm-comments/:id/resultado', async (req, res) => {
    try {
      const { resultado, promessa_data } = req.body || {};
      if (!RESULTADOS[resultado]) return res.status(400).json({ error: 'Resultado inválido.' });
      if (resultado === 'prometeu' && !/^\d{4}-\d{2}-\d{2}$/.test(String(promessa_data || ''))) {
        return res.status(400).json({ error: 'Informe a data prometida.' });
      }
      const atual = await pool.query('SELECT content, meta FROM crm_comments WHERE id = $1', [req.params.id]);
      if (!atual.rows.length) return res.status(404).json({ error: 'Registro não encontrado.' });
      const meta = { ...(atual.rows[0].meta || {}), resultado, promessa_data: resultado === 'prometeu' ? promessa_data : null, resultado_por: emailDe(req), resultado_em: new Date().toISOString() };
      // a 1ª linha do texto ganha o resultado; o resto (mensagem enviada) fica como estava
      const [primeira, ...resto] = String(atual.rows[0].content || '').split('\n');
      const base = primeira.split(' · Resultado:')[0];
      const rot = resultado === 'prometeu' ? `${RESULTADOS[resultado]} em ${dataBR(promessa_data)}` : RESULTADOS[resultado];
      const content = [`${base} · Resultado: ${rot}`, ...resto].join('\n');
      const r = await pool.query('UPDATE crm_comments SET meta = $2, content = $3 WHERE id = $1 RETURNING *', [req.params.id, JSON.stringify(meta), content]);
      res.json(r.rows[0]);
    } catch (e: any) {
      console.error('[cliente-historico] resultado:', e?.message || e);
      res.status(500).json({ error: 'Não foi possível salvar o resultado.' });
    }
  });

  // ── Resumo do relacionamento (cabeçalho do Histórico) ──
  app.get('/api/clientes/:id/resumo-relacionamento', async (req, res) => {
    try {
      const id = req.params.id;
      const [cli, atraso, contato, promessa] = await Promise.all([
        pool.query(`SELECT c.id, c.name, c.status, c.tags, c.crm_status, c.aviso_previo_date::text AS aviso_previo_date,
                           rc.title AS etapa, rc.color AS etapa_cor, rc.emoji AS etapa_emoji
                      FROM clients c LEFT JOIN retencao_columns rc ON rc.id = c.crm_status WHERE c.id = $1`, [id]),
        pool.query(`SELECT COUNT(*)::int AS qtd, COALESCE(SUM(value),0)::numeric(14,2) AS valor,
                           (CURRENT_DATE - MIN(due_date))::int AS dias
                      FROM fin_receivables WHERE status = 'OVERDUE' AND customer_id IN (${SQL_ASAAS_DO_CLIENTE})`, [id]),
        pool.query(`SELECT c.created_at, c.type, COALESCE(u.name, c.user_id) AS autor
                      FROM crm_comments c LEFT JOIN users u ON u.email = c.user_id
                     WHERE c.client_id = $1 AND c.user_id <> 'sistema' AND c.type = ANY($2)
                     ORDER BY c.created_at DESC LIMIT 1`, [id, TIPOS_CONTATO]),
        pool.query(`SELECT meta->>'promessa_data' AS data, created_at FROM crm_comments
                     WHERE client_id = $1 AND meta->>'resultado' = 'prometeu' AND meta->>'promessa_data' IS NOT NULL
                     ORDER BY created_at DESC LIMIT 1`, [id]),
      ]);
      if (!cli.rows.length) return res.status(404).json({ error: 'Cliente não encontrado.' });
      const c = cli.rows[0];
      let tags: string[] = [];
      try { tags = Array.isArray(c.tags) ? c.tags : JSON.parse(c.tags || '[]'); } catch { /* texto solto */ }
      const a = atraso.rows[0];
      const p = promessa.rows[0];
      const hoje = new Date().toISOString().slice(0, 10);
      res.json({
        client_id: c.id,
        status: c.status,
        retencao_etiqueta: tags.includes('quarentena'),
        etapa: c.crm_status ? { id: c.crm_status, titulo: c.etapa || c.crm_status, cor: c.etapa_cor, emoji: c.etapa_emoji } : null,
        aviso_previo_date: c.aviso_previo_date,
        atraso: Number(a.qtd) > 0 ? { qtd: Number(a.qtd), valor: Number(a.valor), dias: Number(a.dias) } : null,
        ultimo_contato: contato.rows[0] || null,
        // promessa só interessa enquanto houver atraso
        promessa: p && Number(a.qtd) > 0 ? { data: p.data, vencida: p.data < hoje } : null,
      });
    } catch (e: any) {
      console.error('[cliente-historico] resumo:', e?.message || e);
      res.status(500).json({ error: 'Não foi possível montar o resumo.' });
    }
  });

  // ── Alerta de silêncio: atraso longo e nenhum contato registrado desde o vencimento ──
  app.get('/api/fin/silencio', async (req, res) => {
    try {
      const dias = Math.max(1, parseInt(String(req.query.dias || '15'), 10) || 15);
      const r = await pool.query(`
        WITH atraso AS (
          SELECT c.id AS client_id, c.name, MIN(r.due_date) AS desde, SUM(r.value)::numeric(14,2) AS valor, COUNT(*)::int AS qtd
            FROM fin_receivables r
            JOIN fin_people fp ON fp.asaas_id = r.customer_id
            JOIN clients c ON c.id = fp.grapehub_client_id OR (c.fin_people_guid IS NOT NULL AND c.fin_people_guid = fp.guid)
           WHERE r.status = 'OVERDUE' AND c.status = 'Ativo'
           GROUP BY c.id, c.name
        )
        SELECT a.client_id, a.name, a.desde::text AS desde, (CURRENT_DATE - a.desde)::int AS dias, a.valor, a.qtd,
               (SELECT MAX(created_at) FROM crm_comments k
                 WHERE k.client_id = a.client_id AND k.user_id <> 'sistema' AND k.type = ANY($2)) AS ultimo_contato
          FROM atraso a
         WHERE CURRENT_DATE - a.desde >= $1
           AND NOT EXISTS (SELECT 1 FROM crm_comments k
                            WHERE k.client_id = a.client_id AND k.user_id <> 'sistema' AND k.type = ANY($2)
                              AND k.created_at >= a.desde)
         ORDER BY dias DESC`, [dias, TIPOS_CONTATO]);
      res.json({ dias, clientes: r.rows });
    } catch (e: any) {
      console.error('[cliente-historico] silêncio:', e?.message || e);
      res.status(500).json({ error: 'Não foi possível calcular.' });
    }
  });
}
