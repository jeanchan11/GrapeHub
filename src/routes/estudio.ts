// ── Estúdio: produção de vídeo de anúncio (copy + MiniMax TTS + HeyGen) ──────
// Fluxo: copy → avatar → locução → vídeo, com aprovação humana entre o áudio
// (centavos) e o vídeo (crédito do HeyGen). Nada de vídeo automático.
//
// O vídeo pronto pertence a um PROJETO (projects.id, TEXT) — não existe pasta.
import { Express } from 'express';
import { Pool } from 'pg';
import multer from 'multer';
import admin from 'firebase-admin';
import crypto from 'crypto';
import { mixarAudio, mixarVideo } from './estudio-mix';

// Dono/autor é o E-MAIL: `users.uid` aqui é um slug e não resolve a pessoa.
function emailDoToken(req: any): string | null {
  const e = req.user?.email;
  return typeof e === 'string' && e.includes('@') ? e.toLowerCase().trim() : null;
}

async function papel(pool: Pool, email: string | null): Promise<string> {
  if (!email) return '';
  const r = await pool.query('SELECT role FROM users WHERE LOWER(email) = $1', [email]);
  return String(r.rows[0]?.role || '');
}

// Só o super admin edita catálogo e cotas.
const ehSuperadmin = (role: string) => role === 'superadmin';
// Quem enxerga o saldo da conta inteira, além do próprio.
const veSaldoDaConta = (role: string) => role === 'superadmin' || role === 'diretor-operacional';

export async function migrateEstudio(pool: Pool) {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS estudio`);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
         WHERE t.typname = 'job_status' AND n.nspname = 'estudio'
      ) THEN
        CREATE TYPE estudio.job_status AS ENUM ('pending','processing','done','failed');
      END IF;
    END $$;
  `);

  // As tabelas de job nasceram organizadas por pasta. O fluxo passou a ser por
  // projeto, e `CREATE TABLE IF NOT EXISTS` não altera tabela existente — então
  // a versão antiga é descartada e recriada. Só quando está VAZIA: com dado
  // dentro, aborta e deixa o erro aparecer, em vez de apagar trabalho.
  for (const tabela of ['video_jobs', 'audio_jobs']) {
    const existe = await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='estudio' AND table_name=$1`, [tabela]);
    if (!existe.rowCount) continue;
    const temProjeto = await pool.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_schema='estudio' AND table_name=$1 AND column_name='project_id'`, [tabela]);
    if (temProjeto.rowCount) continue;
    const linhas = await pool.query(`SELECT COUNT(*)::int n FROM estudio."${tabela}"`);
    if (linhas.rows[0].n > 0) {
      console.warn(`[estudio] ${tabela} tem ${linhas.rows[0].n} linha(s) no formato antigo — migre à mão.`);
      continue;
    }
    await pool.query(`DROP TABLE estudio."${tabela}" CASCADE`);
    console.log(`[estudio] ${tabela} vazia no formato antigo — recriada por projeto.`);
  }

  await pool.query(`
    -- Catálogo de vozes do MiniMax
    CREATE TABLE IF NOT EXISTS estudio.voices (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      provider    text NOT NULL DEFAULT 'minimax',
      voice_id    text NOT NULL UNIQUE,
      name        text NOT NULL,
      client_ref  text,
      is_cloned   boolean NOT NULL DEFAULT false,
      active      boolean NOT NULL DEFAULT true,
      preview_url text,
      ordem       int NOT NULL DEFAULT 0,
      created_at  timestamptz NOT NULL DEFAULT now()
    );

    -- Banco de sons ambiente (trânsito, rodovia, pássaros, gente). Os arquivos
    -- são subidos pelo super admin: a licença do áudio fica com a gente, e não
    -- em algo baixado de origem duvidosa.
    CREATE TABLE IF NOT EXISTS estudio.ambiences (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name           text NOT NULL,
      url            text NOT NULL,
      storage_key    text,
      volume_padrao  numeric(4,2) NOT NULL DEFAULT 0.25,
      active         boolean NOT NULL DEFAULT true,
      ordem          int NOT NULL DEFAULT 0,
      created_at     timestamptz NOT NULL DEFAULT now()
    );

    -- Catálogo de avatares do HeyGen. Cada um tem a voz que fala por ele.
    CREATE TABLE IF NOT EXISTS estudio.avatars (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      avatar_id        text NOT NULL UNIQUE,
      name             text NOT NULL,
      preview_url      text,
      client_ref       text,
      default_voice_id uuid REFERENCES estudio.voices(id) ON DELETE SET NULL,
      cor              text NOT NULL DEFAULT '#7c3aed',
      active           boolean NOT NULL DEFAULT true,
      ordem            int NOT NULL DEFAULT 0,
      created_at       timestamptz NOT NULL DEFAULT now()
    );

    -- Formatos de roteiro. Cada um é um agente, com prompt próprio.
    CREATE TABLE IF NOT EXISTS estudio.copy_types (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug       text NOT NULL UNIQUE,
      name       text NOT NULL,
      descricao  text,
      prompt     text NOT NULL DEFAULT '',
      active     boolean NOT NULL DEFAULT true,
      ordem      int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    -- Teto mensal por pessoa, em créditos do HeyGen ou em nº de vídeos.
    CREATE TABLE IF NOT EXISTS estudio.quotas (
      user_email text PRIMARY KEY,
      modo       text NOT NULL DEFAULT 'creditos',   -- creditos | videos
      limite     int  NOT NULL DEFAULT 0,            -- 0 = sem limite
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    -- Configuração solta do módulo (ex.: créditos do plano no HeyGen).
    CREATE TABLE IF NOT EXISTS estudio.settings (
      chave      text PRIMARY KEY,
      valor      text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS estudio.audio_jobs (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id  text NOT NULL,             -- projects.id (TEXT)
      created_by  text NOT NULL,             -- e-mail
      copy_type   text,
      briefing    text,
      script      text NOT NULL,             -- roteiro de locução, com as pausas
      voice_id    text NOT NULL,
      voice_name  text,
      model       text NOT NULL,
      speed       numeric(4,2) NOT NULL DEFAULT 1.00,
      pitch       int NOT NULL DEFAULT 0,
      volume      numeric(4,2) NOT NULL DEFAULT 1.00,
      status      estudio.job_status NOT NULL DEFAULT 'pending',
      storage_key text,
      audio_url   text,
      duration_ms integer,
      char_count  integer,
      error       text,
      created_at  timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS estudio.video_jobs (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      audio_job_id    uuid NOT NULL REFERENCES estudio.audio_jobs(id) ON DELETE CASCADE,
      project_id      text NOT NULL,
      created_by      text NOT NULL,
      avatar_id       text NOT NULL,
      avatar_name     text,
      heygen_asset_id text,
      heygen_video_id text,
      width           integer NOT NULL DEFAULT 1080,
      height          integer NOT NULL DEFAULT 1920,
      status          estudio.job_status NOT NULL DEFAULT 'pending',
      storage_key     text,
      video_url       text,
      thumbnail_url   text,
      creditos        numeric(6,2),          -- debitado pelo HeyGen, quando informado
      error           text,
      webhook_payload jsonb,
      created_at      timestamptz NOT NULL DEFAULT now(),
      completed_at    timestamptz
    );

    CREATE INDEX IF NOT EXISTS idx_estudio_audio_proj  ON estudio.audio_jobs (project_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_estudio_video_proj  ON estudio.video_jobs (project_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_estudio_video_hg    ON estudio.video_jobs (heygen_video_id);
    CREATE INDEX IF NOT EXISTS idx_estudio_video_autor ON estudio.video_jobs (created_by, created_at DESC);
  `);

  // `CREATE TABLE IF NOT EXISTS` não mexe em tabela existente: as colunas que
  // nasceram depois (voz padrão do avatar, prévia da voz, ordenação) precisam de
  // ALTER explícito, senão só aparecem em banco novo.
  await pool.query(`
    ALTER TABLE estudio.voices  ADD COLUMN IF NOT EXISTS preview_url text;
    ALTER TABLE estudio.voices  ADD COLUMN IF NOT EXISTS ordem int NOT NULL DEFAULT 0;
    ALTER TABLE estudio.avatars ADD COLUMN IF NOT EXISTS default_voice_id uuid;
    ALTER TABLE estudio.avatars ADD COLUMN IF NOT EXISTS cor text NOT NULL DEFAULT '#7c3aed';
    ALTER TABLE estudio.avatars ADD COLUMN IF NOT EXISTS ordem int NOT NULL DEFAULT 0;
    ALTER TABLE estudio.audio_jobs ADD COLUMN IF NOT EXISTS ambience_id uuid;
    ALTER TABLE estudio.audio_jobs ADD COLUMN IF NOT EXISTS ambience_vol numeric(4,2) NOT NULL DEFAULT 0.25;
    ALTER TABLE estudio.audio_jobs ADD COLUMN IF NOT EXISTS mix_url text;
    ALTER TABLE estudio.audio_jobs ADD COLUMN IF NOT EXISTS mix_storage_key text;
    ALTER TABLE estudio.video_jobs ADD COLUMN IF NOT EXISTS custo_usd numeric(8,4);
    ALTER TABLE estudio.video_jobs ADD COLUMN IF NOT EXISTS titulo text;
    ALTER TABLE estudio.video_jobs ADD COLUMN IF NOT EXISTS engine text NOT NULL DEFAULT 'avatar_iv';
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'avatars_default_voice_fk'
      ) THEN
        ALTER TABLE estudio.avatars
          ADD CONSTRAINT avatars_default_voice_fk
          FOREIGN KEY (default_voice_id) REFERENCES estudio.voices(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);

  // A ambiência apagada do catálogo não pode derrubar o job que a usou: o
  // vínculo vira NULL e o áudio já mixado continua de pé.
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'audio_jobs_ambience_fk'
      ) THEN
        ALTER TABLE estudio.audio_jobs
          ADD CONSTRAINT audio_jobs_ambience_fk
          FOREIGN KEY (ambience_id) REFERENCES estudio.ambiences(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);

  // Pastas saíram do fluxo; a tabela só é removida se ninguém a referencia mais.
  await pool.query(`DROP TABLE IF EXISTS estudio.folders`).catch((e: any) =>
    console.warn('[estudio] folders não pôde ser removida:', e.message));

  // Semente dos dois formatos de roteiro, só quando a tabela está vazia (seed de
  // boot que reinsere apaga o trabalho de quem editou — ver CLAUDE.md).
  await pool.query(`
    INSERT INTO estudio.copy_types (slug, name, descricao, ordem)
    SELECT * FROM (VALUES
      ('direto', 'Roteiro direto', 'Vai direto à dor, prova e CTA.', 0),
      ('caixa',  'Caixa de perguntas', 'Abre com uma pergunta do público e o advogado responde.', 1)
    ) AS v(slug, name, descricao, ordem)
    WHERE NOT EXISTS (SELECT 1 FROM estudio.copy_types);
  `);

  await pool.query(`
    INSERT INTO estudio.settings (chave, valor)
    SELECT 'creditos_plano', '85'
    WHERE NOT EXISTS (SELECT 1 FROM estudio.settings WHERE chave = 'creditos_plano');
  `);

  // Preço por minuto de render, em DÓLAR — é assim que o HeyGen cobra. Só o
  // Avatar IV foi medido aqui: 30 s de vídeo custaram US$ 1,17 na carteira da
  // API (saldo 9,15 → 7,98), o que dá US$ 2,33/min. III e V herdam esse número
  // como chute até alguém medir; o campo existe justamente para corrigir.
  // O câmbio é editável porque a conta que o Jean faz é em real.
  for (const [chave, valor] of [
    ['preco_min_avatar_iii', '2.33'],
    ['preco_min_avatar_iv',  '2.33'],
    ['preco_min_avatar_v',   '2.33'],
    ['cambio_usd_brl',       '5.12'],   // 17/09/2026
    ['teto_mensal_brl',      '1000'],
  ]) {
    await pool.query(
      `INSERT INTO estudio.settings (chave, valor)
       SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM estudio.settings WHERE chave = $1)`,
      [chave, valor]);
  }

  // Crédito saiu da conversa: o teto agora é em reais. Ninguém chegou a
  // configurar limite em crédito (todos em zero), então a troca não perde nada.
  await pool.query(`UPDATE estudio.quotas SET modo='valor' WHERE modo='creditos'`);

  // Custo dos vídeos que nasceram antes da coluna existir. Sem isto o painel de
  // gastos abriria zerado com cinco vídeos já gerados na tela.
  await pool.query(`
    UPDATE estudio.video_jobs v
       SET custo_usd = ROUND((COALESCE(a.duration_ms,0) / 60000.0) * $1::numeric, 4)
      FROM estudio.audio_jobs a
     WHERE a.id = v.audio_job_id
       AND v.custo_usd IS NULL
       AND v.heygen_video_id IS NOT NULL
  `, ['2.33']);
}

// ── Gemini: escolher sozinho a Flash mais nova ───────────────────────────────
// Fixar "gemini-X.Y-flash" no código envelhece e um dia devolve 404. Aqui o
// servidor lista os modelos da conta e fica com a Flash de maior versão que
// aceita generateContent. GEMINI_MODEL no .env continua mandando, para
// travar numa versão específica quando for preciso.
let cacheModeloGemini: { nome: string; em: number } | null = null;
const VALIDADE_CACHE_MODELO = 6 * 60 * 60 * 1000;  // 6h
const GEMINI_FALLBACK = 'gemini-2.5-flash';

async function modeloGeminiFlash(apiKey: string): Promise<string> {
  const fixo = (process.env.GEMINI_MODEL || '').trim();
  if (fixo) return fixo;
  if (cacheModeloGemini && Date.now() - cacheModeloGemini.em < VALIDADE_CACHE_MODELO) {
    return cacheModeloGemini.nome;
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(apiKey)}`);
    if (!r.ok) throw new Error(`lista de modelos ${r.status}`);
    const d: any = await r.json();

    const candidatos = (d?.models || [])
      .map((m: any) => ({
        nome: String(m?.name || '').replace(/^models\//, ''),
        metodos: m?.supportedGenerationMethods || [],
      }))
      .filter((m: any) => m.metodos.includes('generateContent') && /(^|-)flash/.test(m.nome))
      // Variantes menores (flash-lite, flash-8b) são outro produto, não "a Flash".
      .filter((m: any) => !/(lite|8b)/i.test(m.nome))
      .map((m: any) => {
        const v = m.nome.match(/gemini-(\d+)(?:\.(\d+))?/);
        const preview = /(preview|exp|latest)/i.test(m.nome);
        return {
          nome: m.nome,
          maior: v ? parseInt(v[1]) : 0,
          menor: v && v[2] ? parseInt(v[2]) : 0,
          preview,
        };
      })
      // Maior versão primeiro; entre iguais, a estável ganha da preview.
      .sort((a: any, b: any) =>
        b.maior - a.maior || b.menor - a.menor || Number(a.preview) - Number(b.preview));

    const escolhido = candidatos[0]?.nome;
    if (!escolhido) throw new Error('nenhum modelo flash na conta');
    if (cacheModeloGemini?.nome !== escolhido) {
      console.log(`[estudio] Gemini Flash em uso: ${escolhido}`);
    }
    cacheModeloGemini = { nome: escolhido, em: Date.now() };
    return escolhido;
  } catch (e: any) {
    console.warn('[estudio] não consegui listar modelos do Gemini:', e.message);
    return GEMINI_FALLBACK;
  }
}

// ── Arquivos no Firebase Storage ─────────────────────────────────────────────
// Mesmo mecanismo do portal: token de download no metadata, que funciona com
// uniform bucket-level access e dispensa ACL por objeto.
async function guardarNoStorage(caminho: string, dados: Buffer, contentType: string): Promise<string> {
  const bucket = admin.storage().bucket();
  const blob = bucket.file(caminho);
  const token = crypto.randomUUID();
  await blob.save(dados, { metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } } });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(caminho)}?alt=media&token=${token}`;
}

// ── HeyGen v3 ────────────────────────────────────────────────────────────────
// O v2 inteiro é legado e sai do ar em 31/10/2026 — a própria API devolve o
// aviso. Tudo aqui é v3: /v3/assets, /v3/videos, /v3/users/me. O webhook não
// precisa ser registrado: o callback_url vai em cada requisição.
const HEYGEN_BASE = 'https://api.heygen.com';

async function heygen(caminho: string, init: RequestInit = {}): Promise<any> {
  const chave = (process.env.HEYGEN_API_KEY || '').trim();
  if (!chave) throw new Error('HEYGEN_API_KEY não configurada no servidor.');
  const r = await fetch(`${HEYGEN_BASE}${caminho}`, {
    ...init,
    headers: { 'X-Api-Key': chave, ...(init.headers || {}) },
  });
  const txt = await r.text();
  let json: any = {};
  try { json = txt ? JSON.parse(txt) : {}; } catch { /* resposta não-JSON */ }
  if (!r.ok) {
    const msg = json?.error?.message || json?.message || txt.slice(0, 300) || `HTTP ${r.status}`;
    // Saldo é o erro mais provável e merece texto que o usuário entenda.
    if (r.status === 402 || /balance|quota|credit/i.test(String(msg))) {
      throw new Error('Saldo de API do HeyGen esgotado. Recarregue a carteira no painel deles.');
    }
    throw new Error(`HeyGen ${r.status}: ${msg}`);
  }
  return json;
}

// ── Clonagem de voz na MiniMax ───────────────────────────────────────────────
// Não existe tela no console deles: clonar é só por API, em duas chamadas —
// sobe o áudio, depois cria a voz apontando para o file_id. Regras apuradas na
// prática pelo GrapeCRM, e todas já custaram erro:
//   • a MiniMax responde HTTP 200 mesmo recusando; o veredito é o base_resp;
//   • file_id tem que ir NUMÉRICO — como string devolve "invalid params";
//   • voice_id é escolhido por nós: letra na frente, 8+ caracteres, e repetir um
//     id existente SOBRESCREVE a voz anterior sem avisar (daí o sufixo de tempo);
//   • mandar `text` gera uma prévia sintetizada e dispara a cobrança de US$ 1,50
//     da primeira síntese — por isso não mandamos.
const MINIMAX_BASE = 'https://api.minimax.io';
const FORMATOS_CLONAGEM = ['.mp3', '.m4a', '.wav'];
const TAMANHO_MAXIMO_CLONE = 20 * 1024 * 1024;

const comGroupId = (url: string, grupo?: string) =>
  grupo?.trim() ? `${url}?GroupId=${encodeURIComponent(grupo.trim())}` : url;

function voiceIdDeClonagem(nome: string): string {
  let base = (nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '');
  if (!base) base = 'voz';
  if (base.length > 20) base = base.slice(0, 20);
  if (!/^[a-zA-Z]/.test(base)) base = 'v' + base;
  return `${base}${Math.floor(Date.now() / 1000)}`;
}

async function subirAudioDeClonagem(chave: string, grupo: string, nomeArquivo: string, audio: Buffer): Promise<number> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(audio)]), nomeArquivo);
  form.append('purpose', 'voice_clone');

  const r = await fetch(comGroupId(`${MINIMAX_BASE}/v1/files/upload`, grupo), {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}` },
    body: form,
  });
  const out: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`MiniMax ${r.status}: ${JSON.stringify(out).slice(0, 300)}`);
  const status = out?.base_resp?.status_code;
  if (status && status !== 0 && status !== 200) {
    throw new Error(`MiniMax recusou o upload (${status}): ${out?.base_resp?.status_msg || ''}`);
  }
  const fileId = out?.file?.file_id;
  if (!fileId) throw new Error('A MiniMax não devolveu file_id.');
  return Number(fileId);
}

async function clonarVozMiniMax(chave: string, grupo: string, voiceId: string, fileId: number): Promise<void> {
  const r = await fetch(comGroupId(`${MINIMAX_BASE}/v1/voice_clone`, grupo), {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId, voice_id: voiceId }),   // numérico de propósito
  });
  const out: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`MiniMax ${r.status}: ${JSON.stringify(out).slice(0, 300)}`);
  const status = out?.base_resp?.status_code;
  if (status && status !== 0 && status !== 200) {
    throw new Error(`MiniMax recusou a clonagem (${status}): ${out?.base_resp?.status_msg || ''}`);
  }
}

export function setupEstudioRoutes(app: Express, pool: Pool) {

  const ctx = async (req: any) => {
    const email = emailDoToken(req);
    return { email, role: await papel(pool, email) };
  };

  const uploadVoz = multer({ storage: multer.memoryStorage(), limits: { fileSize: TAMANHO_MAXIMO_CLONE } });

  // POST /api/estudio/vozes/clonar — sobe a amostra e cria a voz clonada.
  app.post('/api/estudio/vozes/clonar', uploadVoz.single('audio'), async (req: any, res) => {
    try {
      const { role } = await ctx(req);
      if (!ehSuperadmin(role)) return res.status(403).json({ error: 'Apenas o super admin.' });

      const chave = (process.env.MINIMAX_API_KEY || '').trim();
      const grupo = (process.env.MINIMAX_GROUP_ID || '').trim();
      if (!chave) return res.status(503).json({ error: 'MINIMAX_API_KEY não configurada no servidor.' });

      const nome = String(req.body?.name || '').trim();
      if (!nome) return res.status(400).json({ error: 'Dê um nome para a voz.' });
      if (!req.file) return res.status(400).json({ error: 'Envie o áudio de referência.' });

      const ext = (req.file.originalname.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
      if (!FORMATOS_CLONAGEM.includes(ext)) {
        return res.status(400).json({ error: `Formato ${ext || 'desconhecido'} não serve. Use mp3, m4a ou wav.` });
      }

      const fileId = await subirAudioDeClonagem(chave, grupo, req.file.originalname, req.file.buffer);
      const voiceId = voiceIdDeClonagem(nome);
      await clonarVozMiniMax(chave, grupo, voiceId, fileId);

      const r = await pool.query(
        `INSERT INTO estudio.voices (voice_id, name, client_ref, is_cloned, active)
         VALUES ($1, $2, $3, true, true) RETURNING *`,
        [voiceId, nome, req.body?.client_ref || null]);

      res.status(201).json(r.rows[0]);
    } catch (err: any) {
      console.error('[estudio] clonar voz:', err.message);
      res.status(500).json({ error: err.message || 'Falha ao clonar a voz.' });
    }
  });


  // ── Catálogo, para o fluxo de geração (qualquer usuário autenticado) ──────
  app.get('/api/estudio/catalogo', async (req: any, res) => {
    try {
      const tipos = await pool.query(
        `SELECT id, slug, name, descricao FROM estudio.copy_types
          WHERE active ORDER BY ordem, name`);
      const avatares = await pool.query(
        `SELECT a.id, a.avatar_id, a.name, a.preview_url, a.client_ref, a.cor,
                v.id AS voice_uuid, v.name AS voice_name, v.voice_id
           FROM estudio.avatars a
           LEFT JOIN estudio.voices v ON v.id = a.default_voice_id
          WHERE a.active AND a.default_voice_id IS NOT NULL
          ORDER BY a.ordem, a.name`);
      const ambiencias = await pool.query(
        `SELECT id, name, url, volume_padrao FROM estudio.ambiences
          WHERE active ORDER BY ordem, name`);
      res.json({ tipos: tipos.rows, avatares: avatares.rows, ambiencias: ambiencias.rows });
    } catch (err: any) {
      console.error('[estudio] catalogo:', err.message);
      res.status(500).json({ error: 'Falha ao carregar o catálogo.' });
    }
  });

  // ── Gasto (US$ do HeyGen, exibido em R$) ─────────────────────────────────
  // Crédito de plano saiu da conta: o que pesa é a carteira da API, cobrada em
  // dólar por minuto de render. O custo de cada vídeo é congelado no job na hora
  // da geração (`custo_usd`) — preço e câmbio mudam, e um relatório que se
  // recalcula sozinho reescreveria o passado.
  async function parametrosDeCusto() {
    const r = await pool.query(
      `SELECT chave, valor FROM estudio.settings
        WHERE chave IN ('preco_min_avatar_iii','preco_min_avatar_iv','preco_min_avatar_v',
                        'cambio_usd_brl','teto_mensal_brl')`);
    const m = new Map(r.rows.map((x: any) => [x.chave, Number(x.valor)]));
    return {
      preco: {
        avatar_iii: m.get('preco_min_avatar_iii') || 2.33,
        avatar_iv:  m.get('preco_min_avatar_iv')  || 2.33,
        avatar_v:   m.get('preco_min_avatar_v')   || 2.33,
      } as Record<string, number>,
      cambio: m.get('cambio_usd_brl') || 5.12,
      teto: m.get('teto_mensal_brl') || 0,
    };
  }

  /** Período pedido na tela, com o dia inteiro incluído no fim. */
  function periodoDaQuery(req: any) {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    const hoje = new Date();
    const de = iso.test(String(req.query?.de || '')) ? String(req.query.de)
      : `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;
    const ate = iso.test(String(req.query?.ate || '')) ? String(req.query.ate)
      : `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    return { de, ate };
  }

  app.get('/api/estudio/gastos', async (req: any, res) => {
    try {
      const { email, role } = await ctx(req);
      if (!email) return res.status(401).json({ error: 'Não autenticado.' });

      const { preco, cambio, teto } = await parametrosDeCusto();
      const { de, ate } = periodoDaQuery(req);
      const daConta = veSaldoDaConta(role);

      // Só entra quem chegou ao HeyGen: a cobrança acontece no envio, não na
      // conclusão — vídeo que falhou LÁ já foi pago, e o que falhou aqui antes
      // do envio nunca teve heygen_video_id.
      const filtro = `heygen_video_id IS NOT NULL
                        AND created_at >= $1::date AND created_at < ($2::date + 1)`;

      const total = await pool.query(
        `SELECT COALESCE(SUM(custo_usd),0)::numeric AS usd, COUNT(*)::int AS videos
           FROM estudio.video_jobs
          WHERE ${filtro} ${daConta ? '' : 'AND created_by = $3'}`,
        daConta ? [de, ate] : [de, ate, email]);

      // Quebra por pessoa, para o Jean e o Adriano verem de onde saiu o gasto.
      const porPessoa = daConta ? await pool.query(
        `SELECT v.created_by AS email, COALESCE(u.name, v.created_by) AS nome,
                COALESCE(SUM(v.custo_usd),0)::numeric AS usd, COUNT(*)::int AS videos,
                COALESCE(SUM(a.duration_ms),0)::bigint AS ms,
                q.modo, COALESCE(q.limite,0)::numeric AS limite
           FROM estudio.video_jobs v
           LEFT JOIN users u ON lower(u.email) = lower(v.created_by)
           LEFT JOIN estudio.audio_jobs a ON a.id = v.audio_job_id
           LEFT JOIN estudio.quotas q ON q.user_email = lower(v.created_by)
          WHERE ${filtro.replace(/created_at/g, 'v.created_at').replace('heygen_video_id', 'v.heygen_video_id')}
          GROUP BY v.created_by, u.name, q.modo, q.limite
          ORDER BY usd DESC`, [de, ate]) : { rows: [] as any[] };

      // O teto é MENSAL. Num período que não seja um mês fechado, a porcentagem
      // compararia coisas diferentes — então ela só vai quando faz sentido.
      const inicio = new Date(`${de}T00:00:00`);
      const fim = new Date(`${ate}T00:00:00`);
      const ehMesInteiro = inicio.getDate() === 1
        && inicio.getMonth() === fim.getMonth() && inicio.getFullYear() === fim.getFullYear();

      const cota = daConta ? null : await pool.query(
        `SELECT modo, limite FROM estudio.quotas WHERE user_email = $1`, [email]);
      const tetoAplicavel = daConta ? teto : Number(cota?.rows[0]?.limite || 0);

      const usd = Number(total.rows[0].usd) || 0;
      res.json({
        visao: daConta ? 'conta' : 'pessoal',
        periodo: { de, ate, mes_inteiro: ehMesInteiro },
        cambio,
        usd,
        brl: usd * cambio,
        videos: total.rows[0].videos,
        teto_brl: tetoAplicavel,
        pct: ehMesInteiro && tetoAplicavel > 0
          ? Math.round((usd * cambio / tetoAplicavel) * 100)
          : null,
        por_pessoa: porPessoa.rows.map((p: any) => ({
          email: p.email, nome: p.nome, videos: p.videos,
          segundos: Math.round(Number(p.ms || 0) / 1000),
          usd: Number(p.usd) || 0, brl: (Number(p.usd) || 0) * cambio,
          modo: p.modo || null,
          limite: Number(p.limite) || 0,
        })),
        preco_minuto: preco,
      });
    } catch (err: any) {
      console.error('[estudio] gastos:', err.message);
      res.status(500).json({ error: 'Falha ao carregar os gastos.' });
    }
  });

  // ── Configuração (super admin) ────────────────────────────────────────────
  app.get('/api/estudio/config', async (req: any, res) => {
    try {
      const { role } = await ctx(req);
      if (!ehSuperadmin(role)) return res.status(403).json({ error: 'Apenas o super admin.' });

      const tipos = await pool.query(`SELECT * FROM estudio.copy_types ORDER BY ordem, name`);
      const vozes = await pool.query(`SELECT * FROM estudio.voices ORDER BY ordem, name`);
      const avatares = await pool.query(`SELECT * FROM estudio.avatars ORDER BY ordem, name`);
      const ambiencias = await pool.query(`SELECT * FROM estudio.ambiences ORDER BY ordem, name`);
      const custo = await parametrosDeCusto();

      // A lista de quem tem cota sai do cadastro de colaboradores, não é digitada.
      const heads = await pool.query(
        `SELECT c.name, LOWER(u.email) AS email, COALESCE(q.modo,'valor') AS modo, COALESCE(q.limite,0) AS limite
           FROM collaborators c
           JOIN users u ON u.id = c.linked_user_id
           LEFT JOIN estudio.quotas q ON q.user_email = LOWER(u.email)
          WHERE c.status = 'Efetivado' AND LOWER(c.role) LIKE '%head%'
          ORDER BY c.name`);

      // Gasto do mês por head, para a tela mostrar quanto de cada teto já foi.
      const gastoDoMes = await pool.query(
        `SELECT created_by AS email, COALESCE(SUM(custo_usd),0)::numeric AS usd
           FROM estudio.video_jobs
          WHERE heygen_video_id IS NOT NULL
            AND date_trunc('month', created_at) = date_trunc('month', now())
          GROUP BY created_by`);
      const usadoPor = new Map(gastoDoMes.rows.map((g: any) => [g.email, Number(g.usd) || 0]));

      res.json({
        tipos: tipos.rows,
        vozes: vozes.rows,
        avatares: avatares.rows,
        ambiencias: ambiencias.rows,
        cotas: heads.rows.map((h: any) => ({
          ...h,
          usado_brl: (usadoPor.get(h.email) || 0) * custo.cambio,
        })),
        preco_minuto: custo.preco,
        cambio_usd_brl: custo.cambio,
        teto_mensal_brl: custo.teto,
      });
    } catch (err: any) {
      console.error('[estudio] GET config:', err.message);
      res.status(500).json({ error: 'Falha ao carregar as configurações.' });
    }
  });

  // Salva tudo de uma vez — a tela tem um botão só. Em transação: ou grava o
  // conjunto inteiro, ou não grava nada.
  app.put('/api/estudio/config', async (req: any, res) => {
    const { role } = await ctx(req);
    if (!ehSuperadmin(role)) return res.status(403).json({ error: 'Apenas o super admin.' });

    const { tipos = [], vozes = [], avatares = [], ambiencias = [], cotas = [],
            preco_minuto, cambio_usd_brl, teto_mensal_brl } = req.body || {};
    const c = await pool.connect();
    try {
      await c.query('BEGIN');

      // ── vozes ── (apaga as que sumiram da tela, respeitando o vínculo)
      const idsVoz = vozes.filter((v: any) => v.id).map((v: any) => v.id);
      await c.query(
        `DELETE FROM estudio.voices WHERE ($1::uuid[] IS NULL OR NOT (id = ANY($1)))`,
        [idsVoz.length ? idsVoz : null]
      );
      const mapaVoz = new Map<string, string>();   // id do front -> uuid no banco
      for (let i = 0; i < vozes.length; i++) {
        const v = vozes[i];
        if (!v.voice_id?.trim() || !v.name?.trim()) continue;
        const r = v.id
          ? await c.query(
              `UPDATE estudio.voices SET voice_id=$1, name=$2, client_ref=$3, is_cloned=$4,
                      active=$5, preview_url=$6, ordem=$7 WHERE id=$8 RETURNING id`,
              [v.voice_id.trim(), v.name.trim(), v.client_ref || null, !!v.is_cloned, v.active !== false, v.preview_url || null, i, v.id])
          : await c.query(
              `INSERT INTO estudio.voices (voice_id, name, client_ref, is_cloned, active, preview_url, ordem)
               VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
              [v.voice_id.trim(), v.name.trim(), v.client_ref || null, !!v.is_cloned, v.active !== false, v.preview_url || null, i]);
        mapaVoz.set(String(v.tempId || v.id), r.rows[0].id);
      }

      // ── avatares ──
      const idsAvatar = avatares.filter((a: any) => a.id).map((a: any) => a.id);
      await c.query(
        `DELETE FROM estudio.avatars WHERE ($1::uuid[] IS NULL OR NOT (id = ANY($1)))`,
        [idsAvatar.length ? idsAvatar : null]
      );
      for (let i = 0; i < avatares.length; i++) {
        const a = avatares[i];
        if (!a.avatar_id?.trim() || !a.name?.trim()) continue;
        const vozUuid = a.default_voice_id ? (mapaVoz.get(String(a.default_voice_id)) || a.default_voice_id) : null;
        if (a.id) {
          await c.query(
            `UPDATE estudio.avatars SET avatar_id=$1, name=$2, preview_url=$3, client_ref=$4,
                    default_voice_id=$5, cor=$6, active=$7, ordem=$8 WHERE id=$9`,
            [a.avatar_id.trim(), a.name.trim(), a.preview_url || null, a.client_ref || null,
             vozUuid, a.cor || '#7c3aed', a.active !== false, i, a.id]);
        } else {
          await c.query(
            `INSERT INTO estudio.avatars (avatar_id, name, preview_url, client_ref, default_voice_id, cor, active, ordem)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [a.avatar_id.trim(), a.name.trim(), a.preview_url || null, a.client_ref || null,
             vozUuid, a.cor || '#7c3aed', a.active !== false, i]);
        }
      }

      // ── sons ambiente ──
      // Sem DELETE de quem sumiu com CASCADE: a FK é ON DELETE SET NULL, então
      // o job antigo perde o vínculo mas mantém o mp3 mixado que já entregou.
      const idsAmb = ambiencias.filter((a: any) => a.id).map((a: any) => a.id);
      await c.query(
        `DELETE FROM estudio.ambiences WHERE ($1::uuid[] IS NULL OR NOT (id = ANY($1)))`,
        [idsAmb.length ? idsAmb : null]
      );
      for (let i = 0; i < ambiencias.length; i++) {
        const a = ambiencias[i];
        if (!a.name?.trim() || !a.url?.trim()) continue;
        const vol = Math.min(1, Math.max(0, Number(a.volume_padrao ?? 0.25)));
        if (a.id) {
          await c.query(
            `UPDATE estudio.ambiences SET name=$1, url=$2, storage_key=$3, volume_padrao=$4,
                    active=$5, ordem=$6 WHERE id=$7`,
            [a.name.trim(), a.url.trim(), a.storage_key || null, vol, a.active !== false, i, a.id]);
        } else {
          await c.query(
            `INSERT INTO estudio.ambiences (name, url, storage_key, volume_padrao, active, ordem)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [a.name.trim(), a.url.trim(), a.storage_key || null, vol, a.active !== false, i]);
        }
      }

      // ── tipos de copy ──
      const idsTipo = tipos.filter((t: any) => t.id).map((t: any) => t.id);
      await c.query(
        `DELETE FROM estudio.copy_types WHERE ($1::uuid[] IS NULL OR NOT (id = ANY($1)))`,
        [idsTipo.length ? idsTipo : null]
      );
      for (let i = 0; i < tipos.length; i++) {
        const t = tipos[i];
        if (!t.name?.trim()) continue;
        const slug = (t.slug || t.name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40);
        if (t.id) {
          await c.query(
            `UPDATE estudio.copy_types SET name=$1, descricao=$2, prompt=$3, active=$4, ordem=$5 WHERE id=$6`,
            [t.name.trim(), t.descricao || null, t.prompt || '', t.active !== false, i, t.id]);
        } else {
          await c.query(
            `INSERT INTO estudio.copy_types (slug, name, descricao, prompt, active, ordem)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, descricao=EXCLUDED.descricao,
                     prompt=EXCLUDED.prompt, active=EXCLUDED.active, ordem=EXCLUDED.ordem`,
            [slug, t.name.trim(), t.descricao || null, t.prompt || '', t.active !== false, i]);
        }
      }

      // ── cotas ──
      for (const q of cotas) {
        if (!q.email) continue;
        await c.query(
          `INSERT INTO estudio.quotas (user_email, modo, limite, updated_at)
           VALUES ($1,$2,$3,now())
           ON CONFLICT (user_email) DO UPDATE SET modo=EXCLUDED.modo, limite=EXCLUDED.limite, updated_at=now()`,
          [String(q.email).toLowerCase(), q.modo === 'videos' ? 'videos' : 'valor', Math.max(0, Math.round(Number(q.limite) || 0))]);
      }

      const gravarSetting = (chave: string, valor: number) => c.query(
        `INSERT INTO estudio.settings (chave, valor, updated_at) VALUES ($1,$2,now())
         ON CONFLICT (chave) DO UPDATE SET valor=EXCLUDED.valor, updated_at=now()`,
        [chave, String(valor)]);

      if (preco_minuto) {
        for (const eng of ['avatar_iii', 'avatar_iv', 'avatar_v']) {
          const v = Number(preco_minuto[eng]);
          if (Number.isFinite(v) && v >= 0) await gravarSetting(`preco_min_${eng}`, v);
        }
      }
      if (cambio_usd_brl !== undefined && Number(cambio_usd_brl) > 0) {
        await gravarSetting('cambio_usd_brl', Number(cambio_usd_brl));
      }
      if (teto_mensal_brl !== undefined) {
        await gravarSetting('teto_mensal_brl', Math.max(0, Number(teto_mensal_brl) || 0));
      }

      await c.query('COMMIT');
      res.json({ ok: true });
    } catch (err: any) {
      await c.query('ROLLBACK');
      console.error('[estudio] PUT config:', err.message);
      res.status(500).json({ error: err.message || 'Falha ao salvar as configurações.' });
    } finally {
      c.release();
    }
  });

  // ── Geração de copy (Claude) ──────────────────────────────────────────────
  app.post('/api/estudio/copy', async (req: any, res) => {
    try {
      const email = emailDoToken(req);
      if (!email) return res.status(401).json({ error: 'Não autenticado.' });

      const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
      if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });

      const { project_id, copy_type, briefing } = req.body || {};
      if (!project_id) return res.status(400).json({ error: 'Escolha o projeto.' });
      if (!briefing?.trim()) return res.status(400).json({ error: 'Descreva o que o anúncio precisa dizer.' });

      const tipo = await pool.query(`SELECT name, descricao, prompt FROM estudio.copy_types WHERE slug = $1 AND active`, [copy_type]);
      if (!tipo.rows[0]) return res.status(400).json({ error: 'Tipo de roteiro não encontrado.' });

      // Contexto do cliente: nome do parceiro e as teses que ele roda.
      const proj = await pool.query(
        `SELECT p.partner,
                (SELECT string_agg(DISTINCT pr.name, ', ') FROM products pr WHERE pr.project_id = p.id) AS produtos
           FROM projects p WHERE p.id = $1`, [project_id]);
      if (!proj.rows[0]) return res.status(404).json({ error: 'Projeto não encontrado.' });
      const { partner, produtos } = proj.rows[0];

      const promptDoTipo = (tipo.rows[0].prompt || '').trim();
      const system = promptDoTipo || [
        'Você escreve roteiros de anúncio em vídeo para escritórios de advocacia no Brasil.',
        `Formato pedido: ${tipo.rows[0].name} — ${tipo.rows[0].descricao || ''}`.trim(),
        'Escreva em português do Brasil, linguagem falada, frases curtas.',
        'Devolva APENAS o texto que será narrado, sem título, sem marcação e sem instruções de cena.',
      ].join('\n');

      const userText = [
        `Escritório: ${partner}`,
        produtos ? `Teses que ele atende: ${produtos}` : '',
        '',
        `Briefing: ${briefing.trim()}`,
      ].filter(Boolean).join('\n');

      // O prompt do agente vai em system_instruction, campo próprio do Gemini.
      // Jogar a instrução dentro de `contents` faz o modelo tratá-la como fala do
      // usuário e responder genérico.
      const modelo = await modeloGeminiFlash(apiKey);
      const resposta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: userText }] }],
          }),
        }
      );

      const bruto = await resposta.json().catch(() => ({} as any));
      if (!resposta.ok) {
        const msg = bruto?.error?.message || `Gemini ${resposta.status}`;
        console.error('[estudio] gemini:', msg);
        return res.status(502).json({ error: `Gemini recusou: ${msg}` });
      }

      const cand = bruto?.candidates?.[0];
      const texto = (cand?.content?.parts || []).map((p: any) => p?.text || '').join('').trim();
      if (!texto) {
        // Sem texto costuma ser bloqueio de segurança, e o motivo vem em finishReason.
        const motivo = cand?.finishReason || bruto?.promptFeedback?.blockReason || 'resposta vazia';
        return res.status(502).json({ error: `O Gemini não devolveu roteiro (${motivo}).` });
      }

      res.json({ copy: texto, modelo, usou_prompt_proprio: !!promptDoTipo });
    } catch (err: any) {
      console.error('[estudio] copy:', err.message);
      res.status(500).json({ error: err.message || 'Falha ao gerar a copy.' });
    }
  });

  // POST /api/estudio/vozes/:id/previa — sintetiza um trecho para ouvir a voz.
  // Atenção ao custo: é a PRIMEIRA SÍNTESE de uma voz clonada que dispara os
  // US$ 1,50 da MiniMax. Como a voz vai ser usada de qualquer jeito, a cobrança
  // só é antecipada, não criada — mas vale saber.
  app.post('/api/estudio/vozes/:id/previa', async (req: any, res) => {
    try {
      const { role } = await ctx(req);
      if (!ehSuperadmin(role)) return res.status(403).json({ error: 'Apenas o super admin.' });

      const chave = (process.env.MINIMAX_API_KEY || '').trim();
      if (!chave) return res.status(503).json({ error: 'MINIMAX_API_KEY não configurada no servidor.' });
      const grupo = (process.env.MINIMAX_GROUP_ID || '').trim();
      const modelo = (process.env.MINIMAX_TTS_MODEL || 'speech-2.8-hd').trim();

      const texto = String(req.body?.texto || '').trim();
      if (!texto) return res.status(400).json({ error: 'Escreva o texto da prévia.' });
      if (texto.length > 500) return res.status(400).json({ error: 'Use até 500 caracteres na prévia.' });

      const v = await pool.query(`SELECT voice_id, name FROM estudio.voices WHERE id = $1`, [req.params.id]);
      if (!v.rows[0]) return res.status(404).json({ error: 'Voz não encontrada.' });

      const url = grupo ? `${MINIMAX_BASE}/v1/t2a_v2?GroupId=${encodeURIComponent(grupo)}` : `${MINIMAX_BASE}/v1/t2a_v2`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelo, text: texto, stream: false, language_boost: 'auto', output_format: 'hex',
          voice_setting: { voice_id: v.rows[0].voice_id, speed: 1, vol: 1, pitch: 0 },
          audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
        }),
      });
      const out: any = await r.json().catch(() => ({}));
      const st = out?.base_resp?.status_code;
      if (!r.ok || (st && st !== 0 && st !== 200)) {
        throw new Error(out?.base_resp?.status_msg || `MiniMax ${r.status}`);
      }
      if (!out?.data?.audio) throw new Error('A MiniMax não devolveu áudio.');

      const mp3 = Buffer.from(out.data.audio, 'hex');
      // Nome com timestamp: o navegador cacheia por URL, e sem isso a prévia
      // regerada continuaria tocando a antiga.
      const caminho = `estudio/previas/${req.params.id}-${Date.now()}.mp3`;
      const publicUrl = await guardarNoStorage(caminho, mp3, 'audio/mpeg');

      await pool.query(`UPDATE estudio.voices SET preview_url = $1 WHERE id = $2`, [publicUrl, req.params.id]);
      res.json({ preview_url: publicUrl, duration_ms: out?.extra_info?.audio_length || null });
    } catch (err: any) {
      console.error('[estudio] prévia de voz:', err.message);
      res.status(500).json({ error: err.message || 'Falha ao gerar a prévia.' });
    }
  });

  // ── Locução (MiniMax TTS) ────────────────────────────────────────────────
  // A voz não é escolhida aqui: vem do avatar. O HD custa US$ 0,10/1k caracteres
  // contra US$ 0,06 do turbo, mas é o modelo pensado para narração — e locução de
  // anúncio é exatamente o caso dele.
  app.post('/api/estudio/audio', async (req: any, res) => {
    try {
      const email = emailDoToken(req);
      if (!email) return res.status(401).json({ error: 'Não autenticado.' });

      const chave = (process.env.MINIMAX_API_KEY || '').trim();
      if (!chave) return res.status(503).json({ error: 'MINIMAX_API_KEY não configurada no servidor.' });
      const grupo = (process.env.MINIMAX_GROUP_ID || '').trim();

      // O modelo vem da tela. A lista fica restrita de propósito: nome de modelo
      // inválido a MiniMax aceita e devolve erro genérico, difícil de diagnosticar.
      const MODELOS = ['speech-2.8-hd', 'speech-2.8-turbo'];
      const padrao = (process.env.MINIMAX_TTS_MODEL || 'speech-2.8-hd').trim();
      const modelo = MODELOS.includes(String(req.body?.model)) ? String(req.body.model) : padrao;

      const { project_id, avatar_id, script, copy_type, briefing } = req.body || {};
      const ambienceId = String(req.body?.ambience_id || '').trim() || null;
      const ambienceVol = Math.min(1, Math.max(0, Number(req.body?.ambience_vol ?? 0.25)));
      const speed = Math.min(2, Math.max(0.5, Number(req.body?.speed) || 1));
      const pitch = Math.min(12, Math.max(-12, parseInt(req.body?.pitch) || 0));
      const volume = Math.min(2, Math.max(0.1, Number(req.body?.volume) || 1));

      if (!project_id) return res.status(400).json({ error: 'Escolha o projeto.' });
      if (!avatar_id) return res.status(400).json({ error: 'Escolha o avatar.' });
      if (!script?.trim()) return res.status(400).json({ error: 'O roteiro está vazio.' });
      if (script.length > 5000) {
        return res.status(400).json({ error: `O roteiro tem ${script.length} caracteres; o limite por geração é 5.000.` });
      }

      // A voz sai do avatar — é o vínculo cadastrado nas Configurações.
      const av = await pool.query(
        `SELECT a.avatar_id, a.name AS avatar_name, v.voice_id, v.name AS voice_name
           FROM estudio.avatars a
           JOIN estudio.voices v ON v.id = a.default_voice_id
          WHERE a.id = $1 AND a.active`, [avatar_id]);
      if (!av.rows[0]) return res.status(400).json({ error: 'Avatar sem voz vinculada ou inativo.' });
      const { voice_id, voice_name } = av.rows[0];

      // A ambiência é conferida antes de gastar a síntese: escolher um som que
      // saiu do catálogo e descobrir só na mixagem jogaria fora a chamada paga.
      let ambiencia: { id: string; name: string; url: string } | null = null;
      if (ambienceId) {
        const amb = await pool.query(
          `SELECT id, name, url FROM estudio.ambiences WHERE id = $1 AND active`, [ambienceId]);
        if (!amb.rows[0]) return res.status(400).json({ error: 'Som ambiente não encontrado ou inativo.' });
        ambiencia = amb.rows[0];
      }

      const job = await pool.query(
        `INSERT INTO estudio.audio_jobs
           (project_id, created_by, copy_type, briefing, script, voice_id, voice_name, model, speed, pitch, volume, status, char_count, ambience_id, ambience_vol)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'processing',$12,$13,$14) RETURNING id`,
        [project_id, email, copy_type || null, briefing || null, script, voice_id, voice_name, modelo, speed, pitch, volume, script.length,
         ambiencia?.id || null, ambienceVol]);
      const jobId = job.rows[0].id;

      try {
        const url = grupo
          ? `${MINIMAX_BASE}/v1/t2a_v2?GroupId=${encodeURIComponent(grupo)}`
          : `${MINIMAX_BASE}/v1/t2a_v2`;
        const r = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: modelo, text: script, stream: false, language_boost: 'auto', output_format: 'hex',
            voice_setting: { voice_id, speed, vol: volume, pitch },
            audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
          }),
        });
        const out: any = await r.json().catch(() => ({}));
        // A MiniMax devolve 200 mesmo recusando; o veredito é o base_resp.
        const st = out?.base_resp?.status_code;
        if (!r.ok || (st && st !== 0 && st !== 200)) {
          throw new Error(out?.base_resp?.status_msg || `MiniMax ${r.status}`);
        }
        if (!out?.data?.audio) throw new Error('A MiniMax não devolveu áudio.');

        // O áudio vem como string HEXADECIMAL dentro do JSON, não como bytes.
        const mp3 = Buffer.from(out.data.audio, 'hex');
        const caminho = `estudio/audio/${jobId}.mp3`;
        const audioUrl = await guardarNoStorage(caminho, mp3, 'audio/mpeg');
        const duracao = out?.extra_info?.audio_length || null;

        // A VOZ LIMPA é preservada: é ela que vai para o HeyGen, porque o lip
        // sync sai desse áudio e ruído por baixo põe a sincronia em risco. O
        // mixado é o que a pessoa ouve e baixa.
        let mixUrl: string | null = null;
        let mixCaminho: string | null = null;
        if (ambiencia) {
          try {
            const camaBuf = Buffer.from(await (await fetch(ambiencia.url)).arrayBuffer());
            const mixado = await mixarAudio(mp3, camaBuf, ambienceVol, duracao);
            mixCaminho = `estudio/audio/${jobId}-mix.mp3`;
            mixUrl = await guardarNoStorage(mixCaminho, mixado, 'audio/mpeg');
          } catch (e: any) {
            // Mixagem quebrada não invalida a locução, que já foi paga. O job
            // fica pronto com a voz limpa e o aviso vai para o log.
            console.warn(`[estudio] ambiência não mixada no áudio ${jobId}:`, e.message);
            mixCaminho = null;
            mixUrl = null;
          }
        }

        const done = await pool.query(
          `UPDATE estudio.audio_jobs
              SET status='done', storage_key=$1, audio_url=$2, duration_ms=$3,
                  mix_storage_key=$5, mix_url=$6
            WHERE id=$4 RETURNING *`,
          [caminho, audioUrl, duracao, jobId, mixCaminho, mixUrl]);
        res.status(201).json({
          ...done.rows[0],
          ambience_name: ambiencia?.name || null,
          // Avisa a tela quando a cama foi pedida mas não entrou.
          ambience_falhou: !!ambiencia && !mixUrl,
        });
      } catch (e: any) {
        await pool.query(`UPDATE estudio.audio_jobs SET status='failed', error=$1 WHERE id=$2`, [e.message, jobId]);
        throw e;
      }
    } catch (err: any) {
      console.error('[estudio] audio:', err.message);
      res.status(500).json({ error: err.message || 'Falha ao gerar o áudio.' });
    }
  });

  // ── Vídeo (HeyGen v3) ────────────────────────────────────────────────────
  // Única etapa que gasta dinheiro de verdade: Avatar IV sai a US$ 4/min em
  // 1080p. Por isso a cota é conferida ANTES de disparar.
  app.post('/api/estudio/videos', async (req: any, res) => {
    try {
      const { email, role } = await ctx(req);
      if (!email) return res.status(401).json({ error: 'Não autenticado.' });

      const { audio_job_id } = req.body || {};
      const titulo = String(req.body?.titulo || '').trim();
      if (!titulo) return res.status(400).json({ error: 'Dê um nome ao vídeo.' });
      if (titulo.length > 120) return res.status(400).json({ error: 'O nome do vídeo é muito longo (máx. 120).' });
      const aspect = ['9:16', '1:1', '16:9', '4:5', 'auto'].includes(req.body?.aspect_ratio)
        ? req.body.aspect_ratio : '9:16';
      // Engine do avatar: III, IV (padrão do HeyGen) ou V. Cada uma tem preço
      // diferente por minuto — por isso fica gravada no job.
      const engine = ['avatar_iii', 'avatar_iv', 'avatar_v'].includes(req.body?.engine)
        ? req.body.engine : 'avatar_iv';
      const resolution = ['720p', '1080p', '4k'].includes(req.body?.resolution)
        ? req.body.resolution : '1080p';
      if (!audio_job_id) return res.status(400).json({ error: 'Gere o áudio antes.' });

      const aj = await pool.query(
        `SELECT * FROM estudio.audio_jobs WHERE id = $1 AND status = 'done'`, [audio_job_id]);
      if (!aj.rows[0]) return res.status(400).json({ error: 'Áudio não encontrado ou ainda não pronto.' });
      const audio = aj.rows[0];

      // O avatar vem do catálogo, pelo avatar_id do HeyGen.
      const av = await pool.query(
        `SELECT a.avatar_id, a.name FROM estudio.avatars a
          WHERE a.avatar_id = $1 OR a.id::text = $1`, [String(req.body?.avatar_id || '')]);
      if (!av.rows[0]) return res.status(400).json({ error: 'Avatar não encontrado.' });

      // ── Cota: quem não é superadmin/diretor tem teto mensal ──
      // O teto é em REAIS (ou em quantidade de vídeos). Conferido ANTES de
      // enviar, porque o HeyGen cobra no envio.
      const { preco, cambio, teto } = await parametrosDeCusto();
      const custoUsd = Number((((audio.duration_ms || 0) / 60000) * (preco[engine] || 2.33)).toFixed(4));
      const reais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

      // ── Teto da CONTA: vale para todo mundo, superadmin incluído ──
      // Enquanto era só o número do card, o teto não segurava nada: a conta
      // estourava e ninguém era barrado. Quem precisa passar levanta o teto em
      // Configurações › Gastos — é uma decisão consciente, não um acidente.
      if (teto > 0) {
        const mes = await pool.query(
          `SELECT COALESCE(SUM(custo_usd),0)::numeric AS usd FROM estudio.video_jobs
            WHERE heygen_video_id IS NOT NULL
              AND date_trunc('month', created_at) = date_trunc('month', now())`);
        const gastoBrl = (Number(mes.rows[0].usd) || 0) * cambio;
        if (gastoBrl + custoUsd * cambio > teto) {
          return res.status(429).json({
            error: `Este vídeo passa do teto do mês da conta (${reais(gastoBrl)} de ${reais(teto)}). `
                 + `Aumente o teto em Configurações › Gastos para continuar.`,
          });
        }
      }

      if (!veSaldoDaConta(role)) {
        const cota = await pool.query(`SELECT modo, limite FROM estudio.quotas WHERE user_email = $1`, [email]);
        const limite = Number(cota.rows[0]?.limite ?? 0);
        if (limite > 0) {
          const uso = await pool.query(
            `SELECT COUNT(*)::int AS videos, COALESCE(SUM(custo_usd),0)::numeric AS usd
               FROM estudio.video_jobs
              WHERE created_by = $1 AND heygen_video_id IS NOT NULL
                AND date_trunc('month', created_at) = date_trunc('month', now())`, [email]);
          const emVideos = cota.rows[0]?.modo === 'videos';
          const usado = emVideos ? uso.rows[0].videos : (Number(uso.rows[0].usd) || 0) * cambio;
          // Soma o vídeo que está para ser gerado: estourar o teto NO envio é
          // pior do que barrar antes, porque o dinheiro já saiu.
          const depois = emVideos ? usado + 1 : usado + custoUsd * cambio;
          if (depois > limite) {
            const fmt = (v: number) => emVideos ? String(Math.round(v)) : reais(v);
            return res.status(429).json({
              error: `Este vídeo passa do seu limite do mês (${fmt(usado)} de ${fmt(limite)}). Fale com o Jean para liberar mais.`,
            });
          }
        }
      }

      const job = await pool.query(
        `INSERT INTO estudio.video_jobs
           (audio_job_id, project_id, created_by, avatar_id, avatar_name, titulo, engine, width, height, status, custo_usd)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'processing',$10) RETURNING id`,
        [audio_job_id, audio.project_id, email, av.rows[0].avatar_id, av.rows[0].name, titulo, engine,
         aspect === '9:16' ? 1080 : 1920, aspect === '9:16' ? 1920 : 1080, custoUsd]);
      const jobId = job.rows[0].id;

      try {
        // 1) sobe o mp3 como asset (multipart, campo `file`, até 32 MB)
        const mp3 = Buffer.from(await (await fetch(audio.audio_url)).arrayBuffer());
        const form = new FormData();
        form.append('file', new Blob([new Uint8Array(mp3)], { type: 'audio/mpeg' }), `${audio_job_id}.mp3`);
        const asset = await heygen('/v3/assets', { method: 'POST', body: form });
        const assetId = asset?.data?.asset_id;
        if (!assetId) throw new Error('O HeyGen não devolveu asset_id.');

        // 2) cria o vídeo. O callback_url vai por requisição — no v3 não existe
        //    registro prévio de webhook.
        const base = (process.env.PUBLIC_BASE_URL || '').trim();
        const criado = await heygen('/v3/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'avatar',
            avatar_id: av.rows[0].avatar_id,
            audio_asset_id: assetId,
            aspect_ratio: aspect,
            resolution,
            engine: { type: engine },
            callback_id: jobId,
            ...(base ? { callback_url: `${base.replace(/\/$/, '')}/api/estudio/webhooks/heygen` } : {}),
          }),
        });
        const videoId = criado?.data?.video_id;
        if (!videoId) throw new Error('O HeyGen não devolveu video_id.');

        const up = await pool.query(
          `UPDATE estudio.video_jobs SET heygen_asset_id=$1, heygen_video_id=$2 WHERE id=$3 RETURNING *`,
          [assetId, videoId, jobId]);
        res.status(201).json(up.rows[0]);
      } catch (e: any) {
        await pool.query(`UPDATE estudio.video_jobs SET status='failed', error=$1 WHERE id=$2`, [e.message, jobId]);
        throw e;
      }
    } catch (err: any) {
      console.error('[estudio] video:', err.message);
      res.status(500).json({ error: err.message || 'Falha ao gerar o vídeo.' });
    }
  });

  // GET /api/estudio/videos — fila do usuário (superadmin/diretor veem tudo).
  // Traz a duração do áudio junto: é ela que permite estimar o tempo de render.
  app.get('/api/estudio/videos', async (req: any, res) => {
    try {
      const { email, role } = await ctx(req);
      if (!email) return res.status(401).json({ error: 'Não autenticado.' });
      const tudo = veSaldoDaConta(role);

      // Cutuca o HeyGen pelos que ainda processam, SEM esperar o resultado: quando
      // um fica pronto, `concluirVideo` ainda baixa o mp4, mixa a ambiência e sobe
      // para o Storage — segurar a resposta nisso deixaria a lista travada por
      // dezenas de segundos. O front recarrega a cada 10 s e pega o resultado no
      // ciclo seguinte; a trava de 8 s por job evita enxurrada de requisição.
      videosPendentes(6)
        .then(js => js.forEach(j => void conferirNoHeyGen(j)))
        .catch(() => { /* a varredura de 20 s cobre */ });

      const r = await pool.query(
        // `created_by` guarda o e-mail (a chave real de usuário aqui; users.uid
        // é slug). O join traz o nome para o card não exibir e-mail cru.
        `SELECT v.*, a.duration_ms, a.script, p.partner AS projeto,
                COALESCE(u.name, v.created_by) AS autor
           FROM estudio.video_jobs v
           LEFT JOIN estudio.audio_jobs a ON a.id = v.audio_job_id
           LEFT JOIN projects p ON p.id = v.project_id
           LEFT JOIN users u ON lower(u.email) = lower(v.created_by)
          ${tudo ? '' : 'WHERE v.created_by = $1'}
          ORDER BY v.created_at DESC
          LIMIT 30`,
        tudo ? [] : [email]);
      res.json(r.rows);
    } catch (err: any) {
      console.error('[estudio] lista de vídeos:', err.message);
      res.status(500).json({ error: 'Falha ao carregar a fila.' });
    }
  });

  // GET /api/estudio/videos/:id — o front consulta enquanto processa
  app.get('/api/estudio/videos/:id', async (req: any, res) => {
    try {
      const r = await pool.query(`SELECT * FROM estudio.video_jobs WHERE id = $1`, [req.params.id]);
      if (!r.rows[0]) return res.status(404).json({ error: 'Não encontrado.' });
      res.json(r.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao consultar.' });
    }
  });

  // ── Conclusão do vídeo ───────────────────────────────────────────────────
  // Baixa o mp4 do HeyGen para o nosso Storage e pendura na aba Criativos do
  // projeto. A URL do HeyGen EXPIRA — o arquivo canônico é sempre o nosso.
  async function concluirVideo(jobId: string, videoUrl: string, thumb?: string | null, payload?: any) {
    const j = await pool.query(`SELECT * FROM estudio.video_jobs WHERE id = $1`, [jobId]);
    const job = j.rows[0];
    if (!job) return;
    if (job.status === 'done') return;      // idempotente: webhook repetido não refaz nada

    let mp4 = Buffer.from(await (await fetch(videoUrl)).arrayBuffer());

    // Som ambiente entra AQUI, sobre o vídeo já renderizado. O HeyGen recebeu a
    // voz limpa (lip sync), e mixar depois significa que trocar a cama ou o
    // volume nunca exige uma nova renderização — não custa crédito.
    const amb = await pool.query(
      `SELECT b.url, a.ambience_vol, a.duration_ms
         FROM estudio.audio_jobs a
         JOIN estudio.ambiences b ON b.id = a.ambience_id
        WHERE a.id = $1`, [job.audio_job_id]);
    if (amb.rows[0]) {
      try {
        const camaBuf = Buffer.from(await (await fetch(amb.rows[0].url)).arrayBuffer());
        mp4 = await mixarVideo(mp4, camaBuf, Number(amb.rows[0].ambience_vol) || 0.25, amb.rows[0].duration_ms);
      } catch (e: any) {
        // Vídeo mudo de ambiência é melhor que vídeo nenhum: o crédito do
        // HeyGen já foi gasto e o arquivo precisa chegar ao projeto.
        console.warn(`[estudio] ambiência não mixada no vídeo ${jobId}:`, e.message);
      }
    }

    const caminho = `estudio/video/${jobId}.mp4`;
    const url = await guardarNoStorage(caminho, mp4, 'video/mp4');

    await pool.query(
      `UPDATE estudio.video_jobs
          SET status='done', storage_key=$1, video_url=$2, thumbnail_url=$3,
              webhook_payload=$4, completed_at=now()
        WHERE id=$5`,
      [caminho, url, thumb || null, payload ? JSON.stringify(payload) : null, jobId]);

    // Entrega: o criativo aparece na página do projeto.
    // Nome escolhido por quem gerou; o formato antigo fica de reserva para jobs
    // criados antes do campo existir.
    const base = (job.titulo || `Estúdio ${new Date().toLocaleDateString('pt-BR')} — ${job.avatar_name || 'avatar'}`).trim();
    const nome = /\.mp4$/i.test(base) ? base : `${base}.mp4`;
    await pool.query(
      `UPDATE projects
          SET files = COALESCE(files::jsonb, '[]'::jsonb) || $1::jsonb
        WHERE id = $2`,
      [JSON.stringify([{
        name: nome,
        url,
        date: new Date().toLocaleDateString('pt-BR'),
        size: `${(mp4.length / 1024 / 1024).toFixed(1)} MB`,
        sender: 'Agência',
        origem: 'estudio',
        type: 'video/mp4',
      }]), job.project_id]
    ).catch((e: any) => console.warn('[estudio] não anexei o criativo ao projeto:', e.message));

    console.log(`[estudio] vídeo ${jobId} concluído e anexado ao projeto ${job.project_id}`);
  }

  // Webhook do HeyGen. SEM auth do Firebase — precisa estar no PUBLIC_ROUTES.
  // A proteção é o callback_id, que só nós conhecemos: um POST sem id válido
  // não encontra job e não faz nada.
  app.post('/api/estudio/webhooks/heygen', async (req: any, res) => {
    try {
      const b = req.body || {};
      const evento = String(b.event_type || b.event || '').toLowerCase();
      const d = b.event_data || b.data || b;
      const callbackId = d?.callback_id || b?.callback_id;
      const videoId = d?.video_id || b?.video_id;

      const j = await pool.query(
        `SELECT id, status FROM estudio.video_jobs
          WHERE ($1::text IS NOT NULL AND id::text = $1) OR ($2::text IS NOT NULL AND heygen_video_id = $2)
          LIMIT 1`,
        [callbackId || null, videoId || null]);
      if (!j.rows[0]) { console.warn('[estudio] webhook sem job correspondente'); return res.json({ ok: true }); }
      const jobId = j.rows[0].id;
      if (j.rows[0].status === 'done') return res.json({ ok: true });

      const url = d?.url || d?.video_url;
      if (/fail|error/.test(evento) || (!url && d?.error)) {
        await pool.query(`UPDATE estudio.video_jobs SET status='failed', error=$1, webhook_payload=$2 WHERE id=$3`,
          [String(d?.error?.message || d?.msg || 'HeyGen reportou falha'), JSON.stringify(b), jobId]);
        return res.json({ ok: true });
      }
      if (url) await concluirVideo(jobId, url, d?.thumbnail_url || d?.gif_url, b);
      res.json({ ok: true });
    } catch (err: any) {
      console.error('[estudio] webhook:', err.message);
      res.json({ ok: true });   // nunca devolver erro: o HeyGen reenviaria em laço
    }
  });

  // ── Status do vídeo no HeyGen ────────────────────────────────────────────
  // Sem PUBLIC_BASE_URL o webhook não tem para onde chegar, e mesmo com ele o
  // aviso pode se perder — então quem decide que o vídeo ficou pronto, na
  // prática, é esta consulta.
  //
  // Duas travas: `conferindo` impede que a varredura e a tela perguntem pelo
  // mesmo job ao mesmo tempo (duas conclusões simultâneas baixariam e mixariam
  // o mesmo mp4 duas vezes), e `ultimaConferida` evita bater no HeyGen a cada
  // recarga de lista.
  const conferindo = new Set<string>();
  const ultimaConferida = new Map<string, number>();
  const INTERVALO_MINIMO_MS = 8000;

  async function conferirNoHeyGen(job: { id: string; heygen_video_id: string; created_at: string | Date }) {
    if (conferindo.has(job.id)) return;
    const agora = Date.now();
    if (agora - (ultimaConferida.get(job.id) || 0) < INTERVALO_MINIMO_MS) return;
    conferindo.add(job.id);
    ultimaConferida.set(job.id, agora);
    try {
      const minutos = (agora - new Date(job.created_at).getTime()) / 60000;
      if (minutos > 45) {
        await pool.query(
          `UPDATE estudio.video_jobs SET status='failed', error='Tempo esgotado (45 min)' WHERE id=$1`, [job.id]);
        return;
      }
      const st = await heygen(`/v3/videos/${encodeURIComponent(job.heygen_video_id)}`);
      const d = st?.data || {};
      const estado = String(d.status || '').toLowerCase();
      if (estado === 'completed' || estado === 'done' || estado === 'success') {
        const url = d.video_url || d.url;
        if (url) await concluirVideo(job.id, url, d.thumbnail_url, d);
      } else if (estado === 'failed' || estado === 'error') {
        await pool.query(`UPDATE estudio.video_jobs SET status='failed', error=$1 WHERE id=$2`,
          [String(d?.error?.message || 'HeyGen reportou falha'), job.id]);
      }
    } catch (e: any) {
      console.warn(`[estudio] status do vídeo ${job.id}:`, e.message);
    } finally {
      conferindo.delete(job.id);
      // A memória não pode crescer para sempre num processo que fica meses no ar.
      if (ultimaConferida.size > 500) ultimaConferida.clear();
    }
  }

  /** Jobs ainda processando, do mais novo para o mais velho. */
  async function videosPendentes(limite = 20) {
    const r = await pool.query(
      `SELECT id, heygen_video_id, created_at FROM estudio.video_jobs
        WHERE status='processing' AND heygen_video_id IS NOT NULL
        ORDER BY created_at DESC LIMIT $1`, [limite]);
    return r.rows;
  }

  // Varredura de fundo. Vídeo de 8 segundos fica pronto no HeyGen em menos de um
  // minuto: com o intervalo em 2 min (e a carência de 3 min que existia antes), o
  // card ficava girando muito depois de o vídeo estar pronto lá.
  async function varrerVideosPendentes() {
    try {
      for (const job of await videosPendentes()) await conferirNoHeyGen(job);
    } catch (e: any) {
      console.warn('[estudio] varredura:', e.message);
    }
  }
  setInterval(varrerVideosPendentes, 20 * 1000);

  // ── Clientes ativos, para vincular ───────────────────────────────────────
  app.get('/api/estudio/clientes', async (_req: any, res) => {
    try {
      const r = await pool.query(
        `SELECT id, name FROM clients
          WHERE COALESCE(status,'') NOT IN ('Inativo','churn') ORDER BY name ASC`);
      res.json(r.rows);
    } catch (err: any) {
      res.status(500).json({ error: 'Falha ao carregar os clientes.' });
    }
  });
}
