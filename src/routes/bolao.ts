import { Express } from 'express';
import { Pool } from 'pg';
import multer from 'multer';
import admin from 'firebase-admin';

export async function setupBolaoRoutes(app: Express, pool: Pool) {

  // ── Migration ──────────────────────────────────────────────────────────────
  await pool.query(`CREATE SCHEMA IF NOT EXISTS bolao`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bolao.boloes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ativo',
      criado_por TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bolao.jogos (
      id SERIAL PRIMARY KEY,
      bolao_id INT NOT NULL REFERENCES bolao.boloes(id),
      fase TEXT NOT NULL,
      time_casa TEXT NOT NULL,
      time_fora TEXT NOT NULL,
      inicia_em TIMESTAMPTZ NOT NULL,
      gols_casa INT,
      gols_fora INT,
      status TEXT NOT NULL DEFAULT 'agendado'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bolao.palpites (
      id SERIAL PRIMARY KEY,
      jogo_id INT NOT NULL REFERENCES bolao.jogos(id),
      user_id TEXT NOT NULL,
      palpite_casa INT NOT NULL,
      palpite_fora INT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(jogo_id, user_id)
    )
  `);

  // View de pontos
  await pool.query(`
    CREATE OR REPLACE VIEW bolao.v_pontos AS
    SELECT
      p.id AS palpite_id,
      p.jogo_id,
      p.user_id,
      j.bolao_id,
      CASE
        WHEN p.palpite_casa = j.gols_casa AND p.palpite_fora = j.gols_fora THEN 10
        WHEN
          SIGN((p.palpite_casa - p.palpite_fora)::float) = SIGN((j.gols_casa - j.gols_fora)::float)
          AND (p.palpite_casa - p.palpite_fora) = (j.gols_casa - j.gols_fora)
        THEN 7
        WHEN SIGN((p.palpite_casa - p.palpite_fora)::float) = SIGN((j.gols_casa - j.gols_fora)::float) THEN 5
        ELSE 0
      END AS pontos,
      (p.palpite_casa = j.gols_casa AND p.palpite_fora = j.gols_fora) AS placar_exato,
      (SIGN((p.palpite_casa - p.palpite_fora)::float) = SIGN((j.gols_casa - j.gols_fora)::float)) AS resultado_certo
    FROM bolao.palpites p
    JOIN bolao.jogos j ON j.id = p.jogo_id
    WHERE j.status = 'encerrado'
  `);

  // View de ranking
  await pool.query(`
    CREATE OR REPLACE VIEW bolao.v_ranking AS
    SELECT
      vp.bolao_id,
      vp.user_id,
      u.name AS user_name,
      u.picture AS user_picture,
      COALESCE(SUM(vp.pontos), 0)::int AS total_pontos,
      COUNT(*) FILTER (WHERE vp.placar_exato)::int AS qtd_exatos,
      COUNT(*) FILTER (WHERE vp.resultado_certo)::int AS qtd_resultados,
      COUNT(*)::int AS qtd_palpites
    FROM bolao.v_pontos vp
    LEFT JOIN users u ON u.id = vp.user_id
    GROUP BY vp.bolao_id, vp.user_id, u.name, u.picture
    ORDER BY total_pontos DESC, qtd_exatos DESC, qtd_resultados DESC
  `);

  // Seed: 1 bolão fixo + jogos no formato chaveamento completo (Oitavas → Final)
  const seedCheck = await pool.query(`SELECT id FROM bolao.boloes WHERE nome = 'Bolão Copa 2026' LIMIT 1`);
  let bolaoSeedId: number;

  if (seedCheck.rowCount === 0) {
    const bolaoRes = await pool.query(
      `INSERT INTO bolao.boloes (nome, status, criado_por) VALUES ('Bolão Copa 2026', 'ativo', 'system') RETURNING id`
    );
    bolaoSeedId = bolaoRes.rows[0].id;
  } else {
    bolaoSeedId = seedCheck.rows[0].id;
  }

  // Verificar se já existem jogos no formato oitavas
  const oitavasCheck = await pool.query(
    `SELECT COUNT(*) FROM bolao.jogos WHERE bolao_id = $1 AND fase = 'Oitavas'`,
    [bolaoSeedId]
  );
  const hasOitavas = parseInt(oitavasCheck.rows[0].count, 10) > 0;

  if (!hasOitavas) {
    // Limpar jogos antigos (palpites deletados via cascade)
    await pool.query(
      `DELETE FROM bolao.palpites WHERE jogo_id IN (SELECT id FROM bolao.jogos WHERE bolao_id = $1)`,
      [bolaoSeedId]
    );
    await pool.query(`DELETE FROM bolao.jogos WHERE bolao_id = $1`, [bolaoSeedId]);

    const now = new Date();
    const d = (days: number, h = 16) => {
      const dt = new Date(now.getTime() + days * 86400000);
      dt.setHours(h, 0, 0, 0);
      return dt.toISOString();
    };

    // Bracket:
    // Pair 1 (OT1+OT2) → QF1 | Pair 2 (OT3+OT4) → QF2 → SF1
    // Pair 3 (OT5+OT6) → QF3 | Pair 4 (OT7+OT8) → QF4 → SF2
    // SF1 + SF2 → Final     SF perdedores → 3° Lugar
    await pool.query(`
      INSERT INTO bolao.jogos (bolao_id, fase, time_casa, time_fora, inicia_em) VALUES
      -- Oitavas (8 jogos) — Pair 1 → QF1
      ($1, 'Oitavas', 'Brasil',    'Japão',      $2::timestamptz),
      ($1, 'Oitavas', 'Argentina', 'Polônia',    $3::timestamptz),
      -- Pair 2 → QF2
      ($1, 'Oitavas', 'França',    'Bélgica',    $4::timestamptz),
      ($1, 'Oitavas', 'Alemanha',  'EUA',        $5::timestamptz),
      -- Pair 3 → QF3
      ($1, 'Oitavas', 'Portugal',  'Coreia do S',$6::timestamptz),
      ($1, 'Oitavas', 'Espanha',   'México',     $7::timestamptz),
      -- Pair 4 → QF4
      ($1, 'Oitavas', 'Inglaterra','Senegal',    $8::timestamptz),
      ($1, 'Oitavas', 'Holanda',   'Austrália',  $9::timestamptz),
      -- Quartas (4 jogos)
      ($1, 'Quartas', 'A Definir', 'A Definir',  $10::timestamptz),
      ($1, 'Quartas', 'A Definir', 'A Definir',  $11::timestamptz),
      ($1, 'Quartas', 'A Definir', 'A Definir',  $12::timestamptz),
      ($1, 'Quartas', 'A Definir', 'A Definir',  $13::timestamptz),
      -- Semifinais
      ($1, 'Semifinal', 'A Definir', 'A Definir', $14::timestamptz),
      ($1, 'Semifinal', 'A Definir', 'A Definir', $15::timestamptz),
      -- Disputa de 3° lugar
      ($1, 'Terceiro Lugar', 'A Definir', 'A Definir', $16::timestamptz),
      -- Final
      ($1, 'Final',   'A Definir', 'A Definir',  $17::timestamptz)
    `, [
      bolaoSeedId,
      d(5),  d(6),  d(7),  d(8),     // Oitavas pair1+2
      d(9),  d(10), d(11), d(12),    // Oitavas pair3+4
      d(17), d(18), d(17,20), d(18,20), // Quartas
      d(22), d(22,20),               // Semifinais
      d(26), d(27),                  // 3° lugar + Final
    ]);

    console.log('[Bolao] Seed de chaveamento completo (Oitavas→Final) inserido.');
  }


  // Seed menu page na seção Grape (se ainda não existir)
  try {
    const menuCheck = await pool.query(`SELECT id FROM menu_pages WHERE id = 'bolao' LIMIT 1`);
    if (menuCheck.rowCount === 0) {
      // Encontrar a seção Grape
      const grapeSection = await pool.query(
        `SELECT id FROM menu_sections WHERE LOWER(title) LIKE '%grape%' LIMIT 1`
      );
      if (grapeSection.rows.length > 0) {
        const sectionId = grapeSection.rows[0].id;
        await pool.query(`
          INSERT INTO menu_pages (id, section_id, label, icon, icon_color, template, order_index)
          VALUES ('bolao', $1, 'Bolão', 'Trophy', '#7C3AED', 'bolao',
            (SELECT COALESCE(MAX(order_index) + 1, 0) FROM menu_pages))
          ON CONFLICT (id) DO NOTHING
        `, [sectionId]);
        console.log('[Bolao] Menu page created in Grape section.');
      } else {
        console.log('[Bolao] Seção Grape não encontrada — adicione o Bolão pelo Admin Panel (template: bolao).');
      }
    }
  } catch (e) {
    console.warn('[Bolao] Não foi possível criar menu page automaticamente:', e);
  }

  // ── Helper: admin check ────────────────────────────────────────────────────
  // Identifica o usuário por EMAIL (como o resto do app) ou pelo Firebase UID — o
  // `users.uid` pode conter um placeholder (ex: seed inicial), então o email é o mais confiável.
  async function isAdmin(user: any): Promise<boolean> {
    try {
      const email = user?.email || '';
      const uid = user?.uid || '';
      if (!email && !uid) return false;
      const r = await pool.query(
        `SELECT role FROM users WHERE (email = $1 AND $1 <> '') OR (uid = $2 AND $2 <> '') LIMIT 1`,
        [email, uid]
      );
      const role = r.rows[0]?.role;
      return role === 'superadmin' || role === 'admin';
    } catch { return false; }
  }

  // ── Routes ─────────────────────────────────────────────────────────────────

  // GET /api/bolao — lista bolões
  app.get('/api/bolao', async (req: any, res: any) => {
    try {
      const r = await pool.query(`SELECT * FROM bolao.boloes ORDER BY created_at DESC`);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/bolao/:id — dados do bolão
  app.get('/api/bolao/:id', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const r = await pool.query(`SELECT * FROM bolao.boloes WHERE id = $1`, [id]);
      if (r.rowCount === 0) return res.status(404).json({ error: 'Bolão não encontrado.' });
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/bolao/:id/jogos — jogos + palpite do user logado + flag travado
  app.get('/api/bolao/:id/jogos', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const targetUid = (req.query.uid as string) || req.user?.uid || '';
      const isMe = targetUid === (req.user?.uid || '');
      const r = await pool.query(`
        SELECT
          j.*,
          p.id AS palpite_id,
          CASE WHEN (j.inicia_em <= now() OR $3 = true) THEN p.palpite_casa ELSE null END AS palpite_casa,
          CASE WHEN (j.inicia_em <= now() OR $3 = true) THEN p.palpite_fora ELSE null END AS palpite_fora,
          (j.inicia_em <= now()) AS travado,
          vp.pontos,
          vp.placar_exato,
          vp.resultado_certo
        FROM bolao.jogos j
        LEFT JOIN bolao.palpites p ON p.jogo_id = j.id AND p.user_id = $2
        LEFT JOIN bolao.v_pontos vp ON vp.jogo_id = j.id AND vp.user_id = $2
        WHERE j.bolao_id = $1
        ORDER BY j.inicia_em ASC
      `, [id, targetUid, isMe]);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/bolao/:id/palpites — palpites de TODOS, por jogo (só jogos já travados: revela após o início)
  app.get('/api/bolao/:id/palpites', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const r = await pool.query(`
        SELECT
          j.id AS jogo_id, j.fase, j.time_casa, j.time_fora, j.inicia_em,
          j.gols_casa, j.gols_fora, j.status,
          COALESCE(c.name, 'Participante') AS user_name,
          u.picture AS user_picture, c.bolao_avatar_url,
          p.palpite_casa, p.palpite_fora,
          vp.pontos, vp.placar_exato, vp.resultado_certo
        FROM bolao.jogos j
        JOIN bolao.palpites p ON p.jogo_id = j.id
        LEFT JOIN collaborators c ON c.linked_user_id = p.user_id
        LEFT JOIN users u ON u.id = c.linked_user_id
        LEFT JOIN bolao.v_pontos vp ON vp.jogo_id = j.id AND vp.user_id = p.user_id
        WHERE j.bolao_id = $1 AND j.inicia_em <= now()
        ORDER BY j.inicia_em DESC, vp.pontos DESC NULLS LAST, c.name ASC
      `, [id]);
      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/bolao/jogos/:jogoId/palpite — upsert palpite
  app.post('/api/bolao/jogos/:jogoId/palpite', async (req: any, res: any) => {
    try {
      const { jogoId } = req.params;
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ error: 'Não autenticado.' });

      const { palpite_casa, palpite_fora } = req.body;
      if (
        !Number.isInteger(palpite_casa) || !Number.isInteger(palpite_fora) ||
        palpite_casa < 0 || palpite_fora < 0
      ) {
        return res.status(400).json({ error: 'Palpite inválido. Gols devem ser inteiros >= 0.' });
      }

      // Verificar se o jogo já travou (validação obrigatória no backend)
      const jogoR = await pool.query(`SELECT inicia_em FROM bolao.jogos WHERE id = $1`, [jogoId]);
      if (!jogoR.rows[0]) return res.status(404).json({ error: 'Jogo não encontrado.' });
      if (new Date(jogoR.rows[0].inicia_em) <= new Date()) {
        return res.status(403).json({ error: 'Jogo já iniciado. Palpite bloqueado.' });
      }

      const r = await pool.query(`
        INSERT INTO bolao.palpites (jogo_id, user_id, palpite_casa, palpite_fora)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (jogo_id, user_id) DO UPDATE
          SET palpite_casa = EXCLUDED.palpite_casa,
              palpite_fora = EXCLUDED.palpite_fora,
              updated_at = now()
        RETURNING *
      `, [jogoId, uid, palpite_casa, palpite_fora]);
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // PUT /api/bolao/jogos/:jogoId/resultado — admin: lança resultado
  app.put('/api/bolao/jogos/:jogoId/resultado', async (req: any, res: any) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await isAdmin(req.user))) {
        return res.status(403).json({ error: 'Acesso restrito a administradores.' });
      }
      const { jogoId } = req.params;
      const { gols_casa, gols_fora } = req.body;
      if (!Number.isInteger(gols_casa) || !Number.isInteger(gols_fora) || gols_casa < 0 || gols_fora < 0) {
        return res.status(400).json({ error: 'Resultado inválido. Gols devem ser inteiros >= 0.' });
      }
      const r = await pool.query(`
        UPDATE bolao.jogos SET gols_casa = $1, gols_fora = $2, status = 'encerrado'
        WHERE id = $3 RETURNING *
      `, [gols_casa, gols_fora, jogoId]);
      if (r.rowCount === 0) return res.status(404).json({ error: 'Jogo não encontrado.' });
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/bolao/:id/jogos — admin: cadastra jogo(s)
  app.post('/api/bolao/:id/jogos', async (req: any, res: any) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await isAdmin(req.user))) {
        return res.status(403).json({ error: 'Acesso restrito a administradores.' });
      }
      const { id } = req.params;
      const body: any[] = Array.isArray(req.body) ? req.body : [req.body];
      const inserted: any[] = [];
      for (const jogo of body) {
        const { fase, time_casa, time_fora, inicia_em } = jogo;
        if (!fase || !time_casa || !time_fora || !inicia_em) {
          return res.status(400).json({ error: 'fase, time_casa, time_fora e inicia_em são obrigatórios.' });
        }
        const r = await pool.query(`
          INSERT INTO bolao.jogos (bolao_id, fase, time_casa, time_fora, inicia_em)
          VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [id, fase, time_casa, time_fora, inicia_em]);
        inserted.push(r.rows[0]);
      }
      res.status(201).json(inserted);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // PUT /api/bolao/jogos/:jogoId — admin: edita fase/times/data de um jogo (definir "A Definir")
  app.put('/api/bolao/jogos/:jogoId', async (req: any, res: any) => {
    try {
      const uid = req.user?.uid;
      if (!uid || !(await isAdmin(req.user))) {
        return res.status(403).json({ error: 'Acesso restrito a administradores.' });
      }
      const { jogoId } = req.params;
      const { fase, time_casa, time_fora, inicia_em } = req.body;
      if (!fase || !time_casa || !time_fora || !inicia_em) {
        return res.status(400).json({ error: 'fase, time_casa, time_fora e inicia_em são obrigatórios.' });
      }
      const r = await pool.query(`
        UPDATE bolao.jogos SET fase = $1, time_casa = $2, time_fora = $3, inicia_em = $4
        WHERE id = $5 RETURNING *
      `, [fase, time_casa, time_fora, inicia_em, jogoId]);
      if (r.rowCount === 0) return res.status(404).json({ error: 'Jogo não encontrado.' });
      res.json(r.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/bolao/:id/ranking
  app.get('/api/bolao/:id/ranking', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const r = await pool.query(`
        SELECT
          $1::int AS bolao_id,
          c.linked_user_id AS user_id,
          c.name AS user_name,
          u.picture AS user_picture,
          c.bolao_avatar_url,
          COALESCE(SUM(vp.pontos), 0)::int AS total_pontos,
          COUNT(vp.palpite_id) FILTER (WHERE vp.placar_exato)::int AS qtd_exatos,
          COUNT(vp.palpite_id) FILTER (WHERE vp.resultado_certo)::int AS qtd_resultados,
          (
            SELECT COUNT(*)::int FROM bolao.palpites p
            JOIN bolao.jogos j ON j.id = p.jogo_id
            WHERE p.user_id = c.linked_user_id AND j.bolao_id = $1
          ) AS qtd_palpites
        FROM collaborators c
        LEFT JOIN users u ON u.id = c.linked_user_id
        LEFT JOIN bolao.v_pontos vp ON vp.user_id = c.linked_user_id AND vp.bolao_id = $1
        WHERE c.linked_user_id IS NOT NULL
          AND c.status = 'Efetivado'
        GROUP BY c.linked_user_id, c.name, u.picture, c.bolao_avatar_url
        ORDER BY total_pontos DESC, qtd_exatos DESC, qtd_resultados DESC, c.name ASC
      `, [id]);

      res.json(r.rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // POST /api/bolao/avatar/:id — upload figurine image
  const bolaoAvatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

  app.post('/api/bolao/avatar/:id', bolaoAvatarUpload.single('file'), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const file = req.file;
      if (!file) return res.status(400).json({ error: 'No file provided' });

      let fileUrl = '';
      const fileName = `bolao-avatars/${id}-${Date.now()}.${file.originalname.split('.').pop()}`;

      try {
        const bucket = admin.storage().bucket();
        const blob = bucket.file(fileName);
        await blob.save(file.buffer, { metadata: { contentType: file.mimetype } });
        await blob.makePublic();
        fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      } catch {
        // Fallback: base64
        const base64 = file.buffer.toString('base64');
        fileUrl = `data:${file.mimetype};base64,${base64}`;
      }

      await pool.query(`UPDATE collaborators SET bolao_avatar_url = $1 WHERE id = $2`, [fileUrl, id]);
      res.json({ success: true, url: fileUrl });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // DELETE /api/bolao/avatar/:id
  app.delete('/api/bolao/avatar/:id', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await pool.query(`UPDATE collaborators SET bolao_avatar_url = NULL WHERE id = $1`, [id]);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  console.log('[Bolao] Routes registered.');
}
