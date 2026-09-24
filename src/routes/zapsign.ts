// ── ZapSign: contrato do CRM enviado para assinatura ────────────────────────
// O PDF é montado no navegador (ContratoDocument) e chega aqui em base64. O
// token da API NUNCA vai para o front: quem fala com o ZapSign é o servidor.
//
// Decisões em vigor (definidas com o Jean em 23/09/2026):
//   - UM signatário: o cliente. A Grape não assina pelo ZapSign.
//   - O ZapSign NÃO dispara nada — devolvemos o link e o closer manda no
//     WhatsApp junto da mensagem dele.
//   - Autenticação `assinaturaTela-tokenWhatsapp`: o cliente desenha a
//     assinatura E confirma com código no WhatsApp. 374 dos 375 leads têm
//     telefone; e-mail só 313, por isso o token não é por e-mail.
import { Express } from 'express';
import { Pool } from 'pg';

const ZAPSIGN_BASE = 'https://api.zapsign.com.br/api/v1';

// Assinatura da Grape pela própria API (`POST /sign/`), sem ninguém abrir link.
// Exige, do lado do ZapSign: usuário na conta, com nome, telefone, assinatura e
// visto salvos no perfil; "assinar via API" habilitado (é de lá que sai o
// user_token); e plano de API com o add-on de assinatura em lote.
// Sem as duas variáveis, o contrato sai com UM signatário e nada muda.
const assinaturaDaGrape = () => {
  const email = (process.env.ZAPSIGN_SIGNER_EMAIL || '').trim();
  if (!email) return null;
  return {
    email,
    nome: (process.env.ZAPSIGN_SIGNER_NAME || 'Grape Mídia LTDA').trim(),
    // Só com o user_token a Grape assina SOZINHA, pela API — e isso depende do
    // add-on de assinatura em lote. Sem ele, o segundo signatário existe do
    // mesmo jeito e assina abrindo o próprio link, que é recurso comum da
    // plataforma e não custa nada a mais.
    userToken: (process.env.ZAPSIGN_USER_TOKEN || '').trim() || null,
  };
};

function emailDoToken(req: any): string | null {
  const e = req.user?.email;
  return typeof e === 'string' && e.includes('@') ? e.toLowerCase().trim() : null;
}

async function zapsign(caminho: string, init: RequestInit = {}): Promise<any> {
  const chave = (process.env.ZAPSIGN_API_TOKEN || '').trim();
  if (!chave) throw new Error('ZAPSIGN_API_TOKEN não configurada no servidor.');
  const r = await fetch(`${ZAPSIGN_BASE}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const txt = await r.text();
  let json: any = {};
  try { json = txt ? JSON.parse(txt) : {}; } catch { json = { raw: txt }; }
  if (!r.ok) {
    // O ZapSign devolve erro como objeto de campos ({"signers": ["..."]}) ou
    // como {detail}. Achatar aqui evita "[object Object]" chegando na tela.
    const detalhe = json?.detail
      || (json && typeof json === 'object'
        ? Object.entries(json).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ')
        : '');
    throw new Error(`ZapSign ${r.status}${detalhe ? `: ${detalhe}` : ''}`.slice(0, 500));
  }
  return json;
}

/** Só dígitos, sem o 55 do país e sem o zero de operadora. */
function telefoneBR(bruto: string): { pais: string; numero: string } | null {
  let n = String(bruto || '').replace(/\D/g, '');
  if (n.startsWith('55') && n.length > 11) n = n.slice(2);
  n = n.replace(/^0+/, '');
  if (n.length < 10 || n.length > 11) return null;
  return { pais: '55', numero: n };
}

export async function migrateZapsign(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS zapsign_documentos (
      id           serial PRIMARY KEY,
      lead_id      text,                   -- crm_comercial_leads.id é TEXT (uuid), não int
      doc_token    text NOT NULL UNIQUE,   -- token do documento no ZapSign
      open_id      integer,
      signer_token text,                   -- token do signatário (compõe o sign_url)
      grape_signer_token text,             -- 2º signatário: a Grape, que assina pela API
      grape_signed_at    timestamptz,
      nome         text NOT NULL,
      signatario   text,
      telefone     text,
      sign_url     text,
      status       text NOT NULL DEFAULT 'pending',
      signed_file  text,
      valor        numeric(12,2),
      documento    text,                   -- CNPJ/CPF gravado no contrato
      created_by   text,
      created_at   timestamptz NOT NULL DEFAULT now(),
      updated_at   timestamptz NOT NULL DEFAULT now(),
      signed_at    timestamptz
    );
    CREATE INDEX IF NOT EXISTS idx_zapsign_lead ON zapsign_documentos (lead_id, created_at DESC);
    ALTER TABLE zapsign_documentos ADD COLUMN IF NOT EXISTS grape_signer_token text;
    ALTER TABLE zapsign_documentos ADD COLUMN IF NOT EXISTS grape_sign_url text;
    ALTER TABLE zapsign_documentos ADD COLUMN IF NOT EXISTS grape_signed_at timestamptz;
  `);

  // A coluna nasceu `integer` e o id do lead é uuid em texto. `CREATE TABLE IF
  // NOT EXISTS` não corrige tabela que já existe, então o ALTER é explícito.
  await pool.query(`
    ALTER TABLE zapsign_documentos ALTER COLUMN lead_id TYPE text USING lead_id::text;
  `).catch((e: any) => console.warn('[zapsign] lead_id já era texto?', e.message));
}

export function setupZapsignRoutes(app: Express, pool: Pool) {

  // POST /api/zapsign/contratos — sobe o PDF e devolve o link de assinatura.
  app.post('/api/zapsign/contratos', async (req: any, res) => {
    try {
      const email = emailDoToken(req);
      if (!email) return res.status(401).json({ error: 'Não autenticado.' });

      const { lead_id, nome_documento, base64_pdf, signatario, telefone, valor, documento, posicao, posicao_grape } = req.body || {};
      if (!base64_pdf) return res.status(400).json({ error: 'O PDF do contrato não chegou.' });
      if (!signatario?.trim()) return res.status(400).json({ error: 'Informe o nome de quem vai assinar.' });

      const fone = telefoneBR(telefone);
      if (!fone) {
        return res.status(400).json({
          error: 'Telefone inválido. Use DDD + número (o código será enviado por WhatsApp).',
        });
      }

      const grape = assinaturaDaGrape();

      const criado = await zapsign('/docs/', {
        method: 'POST',
        body: JSON.stringify({
          name: String(nome_documento || 'Contrato').slice(0, 200),
          base64_pdf,
          lang: 'pt-br',
          // Com dois signatários, a ordem importa: a Grape só assina DEPOIS do
          // cliente. É o que torna a nossa assinatura uma resposta à dele.
          ...(grape ? { signature_order_active: true } : {}),
          // Nada de disparo automático: o link volta para a tela e quem manda é
          // o closer, junto da mensagem dele.
          // Com a Grape no documento, os e-mails do ZapSign ficam LIGADOS: é
          // assim que ela sabe que chegou a vez dela. O cliente não recebe nada
          // mesmo assim, porque vai sem e-mail cadastrado (`blank_email`).
          ...(assinaturaDaGrape() ? {} : { disable_signer_emails: true }),
          external_id: lead_id ? `lead-${lead_id}` : undefined,
          signers: [{
            name: signatario.trim(),
            phone_country: fone.pais,
            phone_number: fone.numero,
            auth_mode: 'assinaturaTela-tokenWhatsapp',
            send_automatic_email: false,
            send_automatic_whatsapp: false,
            // Sem isto o ZapSign exige e-mail na tela de identidade — e quem
            // autentica por WhatsApp não precisa dele. 62 dos 375 leads sequer
            // têm e-mail cadastrado; seria uma parede na frente da assinatura.
            blank_email: true,
            // O código vai para o número que NÓS cadastramos. Se o signatário
            // pudesse trocar o telefone ali, a autenticação não provaria nada.
            lock_phone: true,
            ...(grape ? { order_group: 1 } : {}),
          },
          // A Grape assina pela API: nada de e-mail, nada de link, nada de
          // token — o e-mail precisa bater com o do usuário da conta ZapSign.
          ...(grape ? [{
            name: grape.nome,
            email: grape.email,
            auth_mode: 'assinaturaTela',
            // Avisa por e-mail quando a vez for dela. Como a ordem está ativa,
            // esse e-mail só sai DEPOIS que o cliente assinar.
            send_automatic_email: true,
            send_automatic_whatsapp: false,
            lock_email: true,
            lock_name: true,
            order_group: 2,
          }] : []),
          ],
        }),
      });

      const signer = criado?.signers?.[0] || {};
      if (!criado?.token) throw new Error('O ZapSign não devolveu o token do documento.');

      // Posiciona a assinatura em cima da linha do contrato. O PDF é
      // rasterizado (cada página é uma imagem), então o texto-âncora
      // `<<signer1>>` do ZapSign não teria o que encontrar — vai por
      // coordenada relativa, medida no front.
      const signerGrape = criado?.signers?.[1] || {};   // 2º signatário: a Grape

      if (posicao && signer.token) {
        const pct = (v: any, padrao: number) => {
          const n = Number(v);
          return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : padrao;
        };
        const rubrica = (pos: any, token: string) => ({
          page: Math.max(0, parseInt(pos.page, 10) || 0),
          relative_position_left: pct(pos.left, 20),
          relative_position_bottom: pct(pos.bottom, 25),
          relative_size_x: pct(pos.width, 20),
          relative_size_y: pct(pos.height, 7),
          signer_token: token,
          type: 'signature',
        });
        try {
          await zapsign(`/docs/${encodeURIComponent(criado.token)}/place-signatures/`, {
            method: 'POST',
            body: JSON.stringify({
              // As duas vão na MESMA chamada: o endpoint substitui o conjunto
              // inteiro de rubricas, então mandar em duas chamadas apagaria a
              // primeira.
              rubricas: [
                rubrica(posicao, signer.token),
                ...(posicao_grape && signerGrape.token ? [rubrica(posicao_grape, signerGrape.token)] : []),
              ],
            }),
          });
        } catch (e: any) {
          // Documento já existe e o link é válido: falhar aqui só significa
          // assinatura na posição padrão do ZapSign, não contrato perdido.
          console.warn('[zapsign] não posicionei a assinatura:', e.message);
        }
      }

      const g = await pool.query(
        `INSERT INTO zapsign_documentos
           (lead_id, doc_token, open_id, signer_token, nome, signatario, telefone,
            sign_url, status, valor, documento, created_by, grape_signer_token, grape_sign_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [lead_id ? String(lead_id) : null, criado.token, criado.open_id || null, signer.token || null,
         criado.name || nome_documento || 'Contrato', signatario.trim(), `${fone.pais}${fone.numero}`,
         signer.sign_url || null, criado.status || 'pending',
         valor != null ? Number(valor) : null, documento || null, email, signerGrape.token || null, signerGrape.sign_url || null]);

      res.status(201).json(g.rows[0]);
    } catch (err: any) {
      console.error('[zapsign] criar contrato:', err.message);
      res.status(500).json({ error: err.message || 'Falha ao enviar o contrato para assinatura.' });
    }
  });

  // GET /api/zapsign/contratos?lead_id= — histórico do lead.
  app.get('/api/zapsign/contratos', async (req: any, res) => {
    try {
      const leadId = String(req.query?.lead_id || '').trim();
      const r = leadId
        ? await pool.query(
            `SELECT * FROM zapsign_documentos WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 20`, [leadId])
        : await pool.query(`SELECT * FROM zapsign_documentos ORDER BY created_at DESC LIMIT 20`);
      res.json(r.rows);
    } catch (err: any) {
      console.error('[zapsign] lista:', err.message);
      res.status(500).json({ error: 'Falha ao carregar os contratos.' });
    }
  });

  /**
   * Assina pela Grape, se o cliente já assinou e nós ainda não.
   *
   * O `POST /sign/` é ASSÍNCRONO: responde na hora e o PDF final sai depois, o
   * que significa que o status do documento não vira "signed" na mesma
   * requisição. Por isso a marca fica em `grape_signed_at` — sem ela, cada
   * consulta de status mandaria assinar de novo.
   */
  async function assinarPelaGrape(doc: any, detalhe: any): Promise<boolean> {
    const grape = assinaturaDaGrape();
    if (!grape?.userToken || !doc.grape_signer_token || doc.grape_signed_at) return false;

    // O cliente é o primeiro signatário; só faz sentido assinarmos depois dele.
    const cliente = (detalhe?.signers || []).find((x: any) => x.token === doc.signer_token);
    if (!cliente?.signed_at) return false;

    try {
      await zapsign('/sign/', {
        method: 'POST',
        body: JSON.stringify({
          user_token: grape.userToken,
          signer_tokens: [doc.grape_signer_token],
        }),
      });
      await pool.query(
        `UPDATE zapsign_documentos SET grape_signed_at = now(), updated_at = now() WHERE doc_token = $1`,
        [doc.doc_token]);
      console.log(`[zapsign] contrato ${doc.doc_token} assinado pela Grape`);
      return true;
    } catch (e: any) {
      // Contrato assinado pelo cliente continua válido; o que falta é a nossa
      // contra-assinatura, que pode ser feita à mão no painel.
      console.warn(`[zapsign] falha ao assinar pela Grape (${doc.doc_token}):`, e.message);
      return false;
    }
  }

  /**
   * Varredura: acha contratos em que o cliente já assinou e contra-assina.
   *
   * Sem isto, a assinatura da Grape só sairia quando alguém abrisse a aba
   * Contrato e clicasse em Atualizar status — ou seja, não seria automática.
   * O ZapSign tem webhook, que seria melhor, mas exige URL pública registrada;
   * enquanto isso não existe, quem descobre é a consulta.
   */
  async function varrerContratosPendentes() {
    if (!assinaturaDaGrape()?.userToken) return;   // sem API de assinatura, nada a varrer
    try {
      const pend = await pool.query(
        `SELECT * FROM zapsign_documentos
          WHERE grape_signer_token IS NOT NULL
            AND grape_signed_at IS NULL
            AND status <> 'signed'
            AND created_at > now() - interval '60 days'
          ORDER BY created_at DESC LIMIT 20`);
      for (const doc of pend.rows) {
        try {
          const detalhe = await zapsign(`/docs/${encodeURIComponent(doc.doc_token)}/`);
          await assinarPelaGrape(doc, detalhe);
          if (String(detalhe?.status || '').toLowerCase() === 'signed') {
            await pool.query(
              `UPDATE zapsign_documentos
                  SET status=$1, signed_file=$2, signed_at=COALESCE(signed_at, now()), updated_at=now()
                WHERE doc_token=$3`,
              [detalhe.status, detalhe.signed_file || null, doc.doc_token]);
          }
        } catch (e: any) {
          console.warn(`[zapsign] varredura de ${doc.doc_token}:`, e.message);
        }
      }
    } catch (e: any) {
      console.warn('[zapsign] varredura:', e.message);
    }
  }
  setInterval(varrerContratosPendentes, 2 * 60 * 1000);

  // POST /api/zapsign/contratos/:token/status — pergunta ao ZapSign como está.
  // Enquanto não houver webhook configurado, é este o caminho que descobre que
  // o cliente assinou.
  app.post('/api/zapsign/contratos/:token/status', async (req: any, res) => {
    try {
      const doc = await zapsign(`/docs/${encodeURIComponent(req.params.token)}/`);

      // Contra-assinatura da Grape, se for a vez dela.
      const nosso = await pool.query(
        `SELECT * FROM zapsign_documentos WHERE doc_token = $1`, [req.params.token]);
      if (nosso.rows[0]) await assinarPelaGrape(nosso.rows[0], doc);

      const assinado = String(doc?.status || '').toLowerCase() === 'signed';
      const r = await pool.query(
        `UPDATE zapsign_documentos
            SET status = $1, signed_file = $2, updated_at = now(),
                signed_at = CASE WHEN $3 AND signed_at IS NULL THEN now() ELSE signed_at END
          WHERE doc_token = $4 RETURNING *`,
        [doc?.status || 'pending', doc?.signed_file || null, assinado, req.params.token]);
      if (!r.rows[0]) return res.status(404).json({ error: 'Documento não encontrado aqui.' });
      res.json(r.rows[0]);
    } catch (err: any) {
      console.error('[zapsign] status:', err.message);
      res.status(500).json({ error: err.message || 'Falha ao consultar o status.' });
    }
  });
}
