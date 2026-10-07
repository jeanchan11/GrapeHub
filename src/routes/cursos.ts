// ── Cursos / Área de membros interna ─────────────────────────────────────────
// Trilha de ramp-up do colaborador: curso → módulos → aulas em vídeo.
// O progresso é gravado por e-mail do usuário autenticado (users.email é a chave
// que o app já usa para resolver quem está logado) e nunca vem do corpo da
// requisição — quem manda é o token.
import { Express } from 'express';
import { Pool } from 'pg';

// Um colaborador é considerado "assistiu" a aula quando passa deste percentual.
const COMPLETION_THRESHOLD = 0.9;

export async function migrateCursos(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id           SERIAL PRIMARY KEY,
      title        TEXT NOT NULL,
      description  TEXT,
      cover_url    TEXT,
      area         TEXT,                      -- Operacional, Comercial, Financeiro...
      status       TEXT NOT NULL DEFAULT 'rascunho',  -- rascunho | publicado | arquivado
      order_index  INT  NOT NULL DEFAULT 0,
      created_by   TEXT,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS course_modules (
      id          SERIAL PRIMARY KEY,
      course_id   INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      order_index INT NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS course_lessons (
      id               SERIAL PRIMARY KEY,
      module_id        INT NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
      title            TEXT NOT NULL,
      description      TEXT,
      video_url        TEXT,
      video_path       TEXT,                  -- caminho no Firebase Storage (para excluir junto)
      duration_seconds INT NOT NULL DEFAULT 0,
      materials        JSONB NOT NULL DEFAULT '[]'::jsonb,
      order_index      INT NOT NULL DEFAULT 0,
      created_at       TIMESTAMPTZ DEFAULT NOW(),
      updated_at       TIMESTAMPTZ DEFAULT NOW()
    );

    -- Quem precisa fazer o curso: pessoa específica, um cargo inteiro ou todo mundo.
    CREATE TABLE IF NOT EXISTS course_assignments (
      id          SERIAL PRIMARY KEY,
      course_id   INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,              -- collaborator | role | all
      target_value TEXT,                      -- id do colaborador, nome do cargo, ou NULL
      due_days    INT,                        -- prazo em dias a partir da admissão
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    -- Progresso por aula e por pessoa.
    -- watched_seconds = tempo REALMENTE assistido (soma de trechos vistos),
    -- diferente de last_position, que é só onde o vídeo parou.
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id              SERIAL PRIMARY KEY,
      lesson_id       INT NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
      user_email      TEXT NOT NULL,
      watched_seconds INT NOT NULL DEFAULT 0,
      last_position   INT NOT NULL DEFAULT 0,
      completed       BOOLEAN NOT NULL DEFAULT false,
      started_at      TIMESTAMPTZ DEFAULT NOW(),
      completed_at    TIMESTAMPTZ,
      updated_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (lesson_id, user_email)
    );

    -- Como a aula foi concluída: 'assistiu' (player, ≥90% tocando de verdade) ou
    -- 'manual' (gestor marcou na Turma — ex.: viu a aula numa reunião). completed_by
    -- = e-mail de quem marcou. O histórico de marcar/desmarcar fica no log abaixo.
    ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS completed_via TEXT;
    ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS completed_by  TEXT;
    UPDATE lesson_progress SET completed_via = 'assistiu' WHERE completed AND completed_via IS NULL;

    CREATE TABLE IF NOT EXISTS lesson_completion_log (
      id          SERIAL PRIMARY KEY,
      lesson_id   INT NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
      user_email  TEXT NOT NULL,
      acao        TEXT NOT NULL,            -- marcou | desmarcou
      por         TEXT NOT NULL,            -- e-mail do gestor
      em          TIMESTAMPTZ DEFAULT NOW()
    );

    -- Comentários de quem assistiu, por aula. Autor pelo e-mail do token.
    CREATE TABLE IF NOT EXISTS lesson_comments (
      id          SERIAL PRIMARY KEY,
      lesson_id   INT NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
      user_email  TEXT NOT NULL,
      texto       TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_lesson_comments_lesson ON lesson_comments(lesson_id, created_at);

    CREATE INDEX IF NOT EXISTS idx_lesson_progress_email ON lesson_progress(user_email);
    CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id);
    CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON course_lessons(module_id);
  `);
}

// Resolve quem está logado a partir do token. Nunca confia no corpo da requisição.
function emailDoToken(req: any): string | null {
  const e = req.user?.email;
  return typeof e === 'string' && e.includes('@') ? e.toLowerCase().trim() : null;
}

async function ehAdmin(pool: Pool, email: string | null): Promise<boolean> {
  if (!email) return false;
  const r = await pool.query('SELECT role FROM users WHERE LOWER(email) = $1', [email]);
  const role = String(r.rows[0]?.role || '');
  return role === 'superadmin' || role === 'admin' || role.startsWith('gerente');
}

export function setupCursosRoutes(app: Express, pool: Pool) {

  // ── Área do colaborador ───────────────────────────────────────────────────

  // GET /api/cursos — catálogo com o progresso de quem está logado
  app.get('/api/cursos', async (req: any, res) => {
    try {
      const email = emailDoToken(req);
      const admin = await ehAdmin(pool, email);
      // Rascunho só aparece para quem administra.
      const r = await pool.query(
        `SELECT c.id, c.title, c.description, c.cover_url, c.area, c.status, c.order_index,
                COUNT(l.id)::int                                   AS total_aulas,
                COALESCE(SUM(l.duration_seconds), 0)::int          AS duracao_total,
                COUNT(p.id) FILTER (WHERE p.completed)::int        AS aulas_concluidas,
                COALESCE(SUM(p.watched_seconds), 0)::int           AS tempo_assistido
           FROM courses c
           LEFT JOIN course_modules m ON m.course_id = c.id
           LEFT JOIN course_lessons l ON l.module_id = m.id
           LEFT JOIN lesson_progress p ON p.lesson_id = l.id AND p.user_email = $1
          WHERE ($2::boolean OR c.status = 'publicado')
            AND c.status <> 'arquivado'
          GROUP BY c.id
          ORDER BY c.order_index ASC, c.id ASC`,
        [email, admin]
      );
      res.json({ cursos: r.rows, is_admin: admin });
    } catch (err: any) {
      console.error('[cursos] GET /api/cursos:', err.message);
      res.status(500).json({ error: 'Falha ao carregar cursos.' });
    }
  });

  // GET /api/cursos/:id — curso completo com módulos, aulas e progresso do usuário
  app.get('/api/cursos/:id', async (req: any, res) => {
    try {
      const email = emailDoToken(req);
      const admin = await ehAdmin(pool, email);
      const cur = await pool.query('SELECT * FROM courses WHERE id = $1', [req.params.id]);
      if (!cur.rows[0]) return res.status(404).json({ error: 'Curso não encontrado.' });
      if (cur.rows[0].status !== 'publicado' && !admin) {
        return res.status(403).json({ error: 'Curso ainda não publicado.' });
      }

      const mods = await pool.query(
        'SELECT * FROM course_modules WHERE course_id = $1 ORDER BY order_index ASC, id ASC',
        [req.params.id]
      );
      const lessons = await pool.query(
        `SELECT l.*, p.watched_seconds, p.last_position, p.completed, p.completed_at, p.completed_via
           FROM course_lessons l
           JOIN course_modules m ON m.id = l.module_id
           LEFT JOIN lesson_progress p ON p.lesson_id = l.id AND p.user_email = $2
          WHERE m.course_id = $1
          ORDER BY l.order_index ASC, l.id ASC`,
        [req.params.id, email]
      );

      const modulos = mods.rows.map((m: any) => ({
        ...m,
        aulas: lessons.rows.filter((l: any) => l.module_id === m.id),
      }));

      res.json({ curso: cur.rows[0], modulos, is_admin: admin });
    } catch (err: any) {
      console.error('[cursos] GET /api/cursos/:id:', err.message);
      res.status(500).json({ error: 'Falha ao carregar o curso.' });
    }
  });

  // POST /api/cursos/aulas/:id/progresso — heartbeat do player
  // O front manda quanto tempo NOVO foi assistido desde o último envio; o banco soma.
  // Somar no servidor evita que recarregar a página zere ou inflar o total.
  app.post('/api/cursos/aulas/:id/progresso', async (req: any, res) => {
    try {
      const email = emailDoToken(req);
      if (!email) return res.status(401).json({ error: 'Não autenticado.' });

      const delta = Math.max(0, Math.min(120, Number(req.body?.delta_seconds) || 0));
      const position = Math.max(0, Number(req.body?.position) || 0);

      const l = await pool.query('SELECT duration_seconds FROM course_lessons WHERE id = $1', [req.params.id]);
      if (!l.rows[0]) return res.status(404).json({ error: 'Aula não encontrada.' });
      const duracao = Number(l.rows[0].duration_seconds) || 0;

      const r = await pool.query(
        `INSERT INTO lesson_progress (lesson_id, user_email, watched_seconds, last_position, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (lesson_id, user_email) DO UPDATE
            SET watched_seconds = lesson_progress.watched_seconds + EXCLUDED.watched_seconds,
                last_position   = EXCLUDED.last_position,
                updated_at      = NOW()
         RETURNING *`,
        [req.params.id, email, delta, Math.round(position)]
      );

      const prog = r.rows[0];
      // Conclui quando assistiu o bastante, ou quando o front avisa que o vídeo acabou.
      const atingiu = duracao > 0 && prog.watched_seconds >= duracao * COMPLETION_THRESHOLD;
      if (!prog.completed && (atingiu || req.body?.ended === true)) {
        const up = await pool.query(
          `UPDATE lesson_progress SET completed = true, completed_at = NOW(), completed_via = 'assistiu', completed_by = NULL WHERE id = $1 RETURNING *`,
          [prog.id]
        );
        return res.json(up.rows[0]);
      }
      res.json(prog);
    } catch (err: any) {
      console.error('[cursos] progresso:', err.message);
      res.status(500).json({ error: 'Falha ao gravar progresso.' });
    }
  });

  // ── Administração ─────────────────────────────────────────────────────────

  const somenteAdmin = async (req: any, res: any, next: any) => {
    const email = emailDoToken(req);
    if (!(await ehAdmin(pool, email))) {
      return res.status(403).json({ error: 'Apenas administradores podem editar cursos.' });
    }
    req.adminEmail = email;
    next();
  };

  app.post('/api/cursos', somenteAdmin, async (req: any, res) => {
    try {
      const { title, description, area, cover_url, status } = req.body || {};
      if (!title || !String(title).trim()) return res.status(400).json({ error: 'Título obrigatório.' });
      const ord = await pool.query('SELECT COALESCE(MAX(order_index), -1) + 1 AS n FROM courses');
      const r = await pool.query(
        `INSERT INTO courses (title, description, area, cover_url, status, order_index, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [String(title).trim(), description || null, area || null, cover_url || null,
         status || 'rascunho', ord.rows[0].n, req.adminEmail]
      );
      res.status(201).json(r.rows[0]);
    } catch (err: any) {
      console.error('[cursos] POST:', err.message);
      res.status(500).json({ error: 'Falha ao criar curso.' });
    }
  });

  app.put('/api/cursos/:id', somenteAdmin, async (req: any, res) => {
    try {
      const { title, description, area, cover_url, status, order_index } = req.body || {};
      const r = await pool.query(
        `UPDATE courses SET
           title       = COALESCE($1, title),
           description = COALESCE($2, description),
           area        = COALESCE($3, area),
           cover_url   = COALESCE($4, cover_url),
           status      = COALESCE($5, status),
           order_index = COALESCE($6, order_index),
           updated_at  = NOW()
         WHERE id = $7 RETURNING *`,
        [title ?? null, description ?? null, area ?? null, cover_url ?? null,
         status ?? null, order_index ?? null, req.params.id]
      );
      if (!r.rows[0]) return res.status(404).json({ error: 'Curso não encontrado.' });
      res.json(r.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao salvar curso.' });
    }
  });

  app.delete('/api/cursos/:id', somenteAdmin, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao excluir curso.' });
    }
  });

  app.post('/api/cursos/:id/modulos', somenteAdmin, async (req: any, res) => {
    try {
      const { title } = req.body || {};
      if (!title || !String(title).trim()) return res.status(400).json({ error: 'Título obrigatório.' });
      const ord = await pool.query('SELECT COALESCE(MAX(order_index), -1) + 1 AS n FROM course_modules WHERE course_id = $1', [req.params.id]);
      const r = await pool.query(
        'INSERT INTO course_modules (course_id, title, order_index) VALUES ($1, $2, $3) RETURNING *',
        [req.params.id, String(title).trim(), ord.rows[0].n]
      );
      res.status(201).json({ ...r.rows[0], aulas: [] });
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao criar módulo.' });
    }
  });

  app.put('/api/cursos/modulos/:id', somenteAdmin, async (req: any, res) => {
    try {
      const { title, order_index } = req.body || {};
      const r = await pool.query(
        'UPDATE course_modules SET title = COALESCE($1, title), order_index = COALESCE($2, order_index) WHERE id = $3 RETURNING *',
        [title ?? null, order_index ?? null, req.params.id]
      );
      if (!r.rows[0]) return res.status(404).json({ error: 'Módulo não encontrado.' });
      res.json(r.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao salvar módulo.' });
    }
  });

  app.delete('/api/cursos/modulos/:id', somenteAdmin, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM course_modules WHERE id = $1', [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao excluir módulo.' });
    }
  });

  app.post('/api/cursos/modulos/:id/aulas', somenteAdmin, async (req: any, res) => {
    try {
      const { title, description, video_url, video_path, duration_seconds, materials } = req.body || {};
      if (!title || !String(title).trim()) return res.status(400).json({ error: 'Título obrigatório.' });
      const ord = await pool.query('SELECT COALESCE(MAX(order_index), -1) + 1 AS n FROM course_lessons WHERE module_id = $1', [req.params.id]);
      const r = await pool.query(
        `INSERT INTO course_lessons (module_id, title, description, video_url, video_path, duration_seconds, materials, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.params.id, String(title).trim(), description || null, video_url || null, video_path || null,
         Math.max(0, Math.round(Number(duration_seconds) || 0)), JSON.stringify(materials || []), ord.rows[0].n]
      );
      res.status(201).json(r.rows[0]);
    } catch (err: any) {
      console.error('[cursos] POST aula:', err.message);
      res.status(500).json({ error: 'Falha ao criar aula.' });
    }
  });

  app.put('/api/cursos/aulas/:id', somenteAdmin, async (req: any, res) => {
    try {
      const { title, description, video_url, video_path, duration_seconds, materials, order_index } = req.body || {};
      const r = await pool.query(
        `UPDATE course_lessons SET
           title            = COALESCE($1, title),
           description      = COALESCE($2, description),
           video_url        = COALESCE($3, video_url),
           video_path       = COALESCE($4, video_path),
           duration_seconds = COALESCE($5, duration_seconds),
           materials        = COALESCE($6, materials),
           order_index      = COALESCE($7, order_index),
           updated_at       = NOW()
         WHERE id = $8 RETURNING *`,
        [title ?? null, description ?? null, video_url ?? null, video_path ?? null,
         duration_seconds != null ? Math.round(Number(duration_seconds)) : null,
         materials ? JSON.stringify(materials) : null, order_index ?? null, req.params.id]
      );
      if (!r.rows[0]) return res.status(404).json({ error: 'Aula não encontrada.' });
      res.json(r.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao salvar aula.' });
    }
  });

  // PUT /api/cursos/modulos/:id/ordem — { ids: [aula, aula, ...] } na ordem nova.
  // Grava order_index = posição. Aceita aula de outro módulo DO MESMO curso (move
  // junto), para o arrastar entre módulos funcionar sem outra rota.
  app.put('/api/cursos/modulos/:id/ordem', somenteAdmin, async (req: any, res) => {
    const ids: number[] = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isFinite) : [];
    if (!ids.length) return res.status(400).json({ error: 'Envie a lista de aulas.' });
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      for (let i = 0; i < ids.length; i++) {
        await c.query(
          `UPDATE course_lessons SET order_index = $1, module_id = $2, updated_at = NOW()
            WHERE id = $3 AND module_id IN (
              SELECT id FROM course_modules WHERE course_id = (SELECT course_id FROM course_modules WHERE id = $2))`,
          [i, req.params.id, ids[i]]);
      }
      await c.query('COMMIT');
      res.json({ ok: true });
    } catch (err: any) {
      await c.query('ROLLBACK').catch(() => {});
      console.error('[cursos] ordem:', err.message);
      res.status(500).json({ error: 'Falha ao salvar a ordem.' });
    } finally { c.release(); }
  });

  app.delete('/api/cursos/aulas/:id', somenteAdmin, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM course_lessons WHERE id = $1', [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao excluir aula.' });
    }
  });

  // ── Comentários da aula ───────────────────────────────────────────────────
  // Quem vê o curso comenta. Autor sai do token; apagar: o próprio autor ou admin.
  async function podeVerAula(lessonId: string | number, email: string | null) {
    const r = await pool.query(
      `SELECT c.status FROM course_lessons l JOIN course_modules m ON m.id = l.module_id
         JOIN courses c ON c.id = m.course_id WHERE l.id = $1`, [lessonId]);
    if (!r.rows[0]) return false;
    return r.rows[0].status === 'publicado' || await ehAdmin(pool, email);
  }

  app.get('/api/cursos/aulas/:id/comentarios', async (req: any, res) => {
    try {
      const email = emailDoToken(req);
      if (!(await podeVerAula(req.params.id, email))) return res.status(403).json({ error: 'Sem acesso a esta aula.' });
      const admin = await ehAdmin(pool, email);
      const r = await pool.query(
        `SELECT c.id, c.texto, c.created_at, c.user_email, u.name AS autor, u.picture AS foto
           FROM lesson_comments c LEFT JOIN users u ON LOWER(u.email) = c.user_email
          WHERE c.lesson_id = $1 ORDER BY c.created_at ASC, c.id ASC`, [req.params.id]);
      res.json(r.rows.map((c: any) => ({
        id: c.id, texto: c.texto, created_at: c.created_at,
        autor: c.autor || c.user_email.split('@')[0], foto: c.foto || null,
        meu: c.user_email === email, pode_apagar: c.user_email === email || admin,
      })));
    } catch (err: any) {
      console.error('[cursos] GET comentários:', err.message);
      res.status(500).json({ error: 'Falha ao carregar comentários.' });
    }
  });

  app.post('/api/cursos/aulas/:id/comentarios', async (req: any, res) => {
    try {
      const email = emailDoToken(req);
      if (!email) return res.status(401).json({ error: 'Sessão inválida.' });
      const texto = String(req.body?.texto || '').trim();
      if (!texto) return res.status(400).json({ error: 'Escreva o comentário.' });
      if (texto.length > 4000) return res.status(400).json({ error: 'Comentário muito longo (máx. 4.000 caracteres).' });
      if (!(await podeVerAula(req.params.id, email))) return res.status(403).json({ error: 'Sem acesso a esta aula.' });
      const r = await pool.query(
        `INSERT INTO lesson_comments (lesson_id, user_email, texto) VALUES ($1, $2, $3) RETURNING id, texto, created_at`,
        [req.params.id, email, texto]);
      const u = await pool.query(`SELECT name, picture FROM users WHERE LOWER(email) = $1`, [email]);
      res.status(201).json({ ...r.rows[0], autor: u.rows[0]?.name || email.split('@')[0], foto: u.rows[0]?.picture || null, meu: true, pode_apagar: true });
    } catch (err: any) {
      console.error('[cursos] POST comentário:', err.message);
      res.status(500).json({ error: 'Falha ao comentar.' });
    }
  });

  app.delete('/api/cursos/comentarios/:id', async (req: any, res) => {
    try {
      const email = emailDoToken(req);
      const c = await pool.query(`SELECT user_email FROM lesson_comments WHERE id = $1`, [req.params.id]);
      if (!c.rows[0]) return res.status(404).json({ error: 'Comentário não encontrado.' });
      if (c.rows[0].user_email !== email && !(await ehAdmin(pool, email))) {
        return res.status(403).json({ error: 'Só o autor ou um gestor apaga o comentário.' });
      }
      await pool.query(`DELETE FROM lesson_comments WHERE id = $1`, [req.params.id]);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao apagar comentário.' });
    }
  });

  // ── Conclusão manual pelo gestor ─────────────────────────────────────────
  // Para quem viu a aula fora do player (reunião, antes do controle existir).
  // Nunca sobrescreve quem concluiu assistindo; só o que foi marcado à mão pode
  // ser desmarcado. Toda ação vai para lesson_completion_log.
  app.post('/api/cursos/aulas/:id/concluir', somenteAdmin, async (req: any, res) => {
    try {
      const alvo = String(req.body?.user_email || '').toLowerCase().trim();
      if (!alvo.includes('@')) return res.status(400).json({ error: 'Informe o e-mail do colaborador.' });
      const atual = (await pool.query(`SELECT completed, completed_via FROM lesson_progress WHERE lesson_id = $1 AND user_email = $2`, [req.params.id, alvo])).rows[0];
      if (atual?.completed) return res.status(409).json({ error: atual.completed_via === 'manual' ? 'Já está marcada como concluída.' : 'Esta pessoa já concluiu assistindo.' });
      const r = await pool.query(
        `INSERT INTO lesson_progress (lesson_id, user_email, completed, completed_at, completed_via, completed_by, updated_at)
         VALUES ($1, $2, true, NOW(), 'manual', $3, NOW())
         ON CONFLICT (lesson_id, user_email) DO UPDATE
           SET completed = true, completed_at = NOW(), completed_via = 'manual', completed_by = $3, updated_at = NOW()
         RETURNING *`, [req.params.id, alvo, req.adminEmail]);
      await pool.query(`INSERT INTO lesson_completion_log (lesson_id, user_email, acao, por) VALUES ($1, $2, 'marcou', $3)`, [req.params.id, alvo, req.adminEmail]);
      res.json(r.rows[0]);
    } catch (err: any) {
      console.error('[cursos] concluir manual:', err.message);
      res.status(500).json({ error: 'Falha ao marcar a aula.' });
    }
  });

  app.delete('/api/cursos/aulas/:id/concluir', somenteAdmin, async (req: any, res) => {
    try {
      const alvo = String(req.query?.user_email || '').toLowerCase().trim();
      const r = await pool.query(
        `UPDATE lesson_progress SET completed = false, completed_at = NULL, completed_via = NULL, completed_by = NULL, updated_at = NOW()
          WHERE lesson_id = $1 AND user_email = $2 AND completed AND completed_via = 'manual' RETURNING id`, [req.params.id, alvo]);
      if (!r.rows.length) return res.status(409).json({ error: 'Só dá para desmarcar conclusão feita à mão.' });
      await pool.query(`INSERT INTO lesson_completion_log (lesson_id, user_email, acao, por) VALUES ($1, $2, 'desmarcou', $3)`, [req.params.id, alvo, req.adminEmail]);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao desmarcar.' });
    }
  });

  // ── Painel do gestor ──────────────────────────────────────────────────────

  // GET /api/cursos/:id/relatorio — quem está onde, quanto tempo levou
  app.get('/api/cursos/:id/relatorio', somenteAdmin, async (req: any, res) => {
    try {
      const totais = await pool.query(
        `SELECT COUNT(l.id)::int AS total_aulas, COALESCE(SUM(l.duration_seconds),0)::int AS duracao_total
           FROM course_lessons l JOIN course_modules m ON m.id = l.module_id
          WHERE m.course_id = $1`,
        [req.params.id]
      );
      const totalAulas = totais.rows[0]?.total_aulas || 0;

      // Um colaborador efetivado por linha, mesmo quem ainda não começou.
      const r = await pool.query(
        `SELECT c.id                                                  AS colaborador_id,
                c.name                                                AS nome,
                c.role                                                AS cargo,
                c.start_date                                          AS admissao,
                LOWER(u.email)                                        AS email,
                COUNT(p.id) FILTER (WHERE p.completed)::int           AS aulas_concluidas,
                COUNT(p.id) FILTER (WHERE p.completed AND p.completed_via = 'manual')::int AS concluidas_manual,
                COALESCE(SUM(p.watched_seconds), 0)::int              AS tempo_assistido,
                MIN(p.started_at)                                     AS iniciou_em,
                MAX(p.completed_at) FILTER (WHERE p.completed)        AS ultima_conclusao,
                MAX(p.updated_at)                                     AS ultimo_acesso
           FROM collaborators c
           JOIN users u ON u.id = c.linked_user_id
           LEFT JOIN lesson_progress p
                  ON p.user_email = LOWER(u.email)
                 AND p.lesson_id IN (
                       SELECT l.id FROM course_lessons l
                        JOIN course_modules m ON m.id = l.module_id
                       WHERE m.course_id = $1)
          WHERE c.status = 'Efetivado'
          GROUP BY c.id, c.name, c.role, c.start_date, u.email
          ORDER BY c.name ASC`,
        [req.params.id]
      );

      // Detalhe por aula (para o gestor ver quem assistiu e quem foi marcado à mão)
      const aulas = (await pool.query(
        `SELECT l.id, l.title, m.title AS modulo FROM course_lessons l JOIN course_modules m ON m.id = l.module_id
          WHERE m.course_id = $1 ORDER BY m.order_index, m.id, l.order_index, l.id`, [req.params.id])).rows;
      const progs = (await pool.query(
        `SELECT p.lesson_id, p.user_email, p.completed, p.completed_at, p.completed_via, p.completed_by, p.watched_seconds,
                ub.name AS marcado_por
           FROM lesson_progress p LEFT JOIN users ub ON LOWER(ub.email) = p.completed_by
          WHERE p.lesson_id = ANY($1)`, [aulas.map((a: any) => a.id)])).rows;

      const linhas = r.rows.map((x: any) => {
        const concluidas = Number(x.aulas_concluidas) || 0;
        // Dias corridos entre a primeira aula aberta e a última concluída.
        let dias: number | null = null;
        if (x.iniciou_em && x.ultima_conclusao && concluidas >= totalAulas && totalAulas > 0) {
          dias = Math.max(0, Math.round(
            (new Date(x.ultima_conclusao).getTime() - new Date(x.iniciou_em).getTime()) / 86400000
          ));
        }
        return {
          ...x,
          aulas: aulas.map((a: any) => {
            const p = progs.find((y: any) => y.lesson_id === a.id && y.user_email === x.email);
            return {
              lesson_id: a.id, titulo: a.title, modulo: a.modulo,
              concluida: !!p?.completed, via: p?.completed ? (p.completed_via || 'assistiu') : null,
              em: p?.completed_at || null, marcado_por: p?.completed_via === 'manual' ? (p.marcado_por || p.completed_by) : null,
              assistido: Number(p?.watched_seconds) || 0,
            };
          }),
          percentual: totalAulas > 0 ? Math.round((concluidas / totalAulas) * 100) : 0,
          dias_para_concluir: dias,
        };
      });

      res.json({
        total_aulas: totalAulas,
        duracao_total: totais.rows[0]?.duracao_total || 0,
        colaboradores: linhas,
      });
    } catch (err: any) {
      console.error('[cursos] relatorio:', err.message);
      res.status(500).json({ error: 'Falha ao carregar o relatório.' });
    }
  });
}
