import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

// estrutura -> id
const cats = await pool.query("SELECT id, structure FROM fin_categories");
const structId = {}; for (const c of cats.rows) structId[c.structure] = c.id;

// colaboradores
const colab = (await pool.query("SELECT DISTINCT name FROM collaborators")).rows.map(r=>r.name).filter(Boolean);
const OWNER = 'jean barreto chan';
const employees = colab.map(n => { const t = norm(n).split(/\s+/).filter(Boolean); return { full:norm(n), first:t[0], second:(t[1]||'').slice(0,3) }; });

const RULES = [
  { re: /cobranca recebida|antecipacao\s*-\s*fatura/i, s:'01.01.01' },
  { re: /taxa\s*pix/i, s:'02.07.06' },
  { re: /taxa\s*boleto/i, s:'02.07.07' },
  { re: /taxa.*cart|taxa de cart/i, s:'02.07.08' },
  { re: /tarifa|taxa de antecip/i, s:'02.07.03' },
  { re: /\biof\b/i, s:'02.07.99' },
  { re: /facebk|facebook|meta ads|instagram ads/i, s:'02.05.08' },
  { re: /openai|anthropic|elevenlabs|claude/i, s:'02.02.10' },
  { re: /hostinger|neon|atlassian|clickup|1password|capcut|canva|myhubi|uazapi|pichau|apple\.com|google|gsuite|workspace|dominio|vps/i, s:'02.02.06' },
  { re: /wellhub|gympass/i, s:'02.03.09' },
  { re: /\bdas\b|simples nacional|darf/i, s:'02.01.01' },
  { re: /\bfgts\b/i, s:'02.03.07' },
  { re: /aluguel|condominio|iptu/i, s:'02.06.05' },
];

function classify(desc, type) {
  const d = norm(desc);
  // Pix para pessoa
  if (/pix.*para|transferencia/i.test(d)) {
    if (d.includes('grape midia')) return '_TRANSFER';
    if (d.includes(OWNER) || (d.includes('jean')&&d.includes('chan'))) return '05.01';
    for (const e of employees) if (e.first && d.includes(e.first) && (e.second==''||d.includes(e.second))) return '02.03.03';
  }
  for (const r of RULES) if (r.re.test(d)) return r.s;
  return null;
}

const mv = await pool.query(`SELECT COALESCE(NULLIF(custom_description,''),description) desc, type, value::numeric val
  FROM fin_movements_asaas WHERE is_anticipation_pair=false AND custom_category_id IS NULL
   AND ((account='asaas' AND transaction_date>='2026-06-01' AND transaction_date<'2026-07-01') OR (account='sicredi' AND billing_month='2026-06'))`);

const byL2 = {}; let semcat=0, transfer=0, semcatN=0;
for (const m of mv.rows) {
  const s = classify(m.desc, m.type);
  const signed = Number(m.val) * m.type;
  if (s === '_TRANSFER') { transfer += signed; continue; }
  if (!s) { semcat += signed; semcatN++; continue; }
  const l2 = s.split('.').slice(0,2).join('.');
  byL2[l2] = (byL2[l2]||0) + signed;
}
console.log('=== Rollup nível-2 (motor, dry-run Junho) vs Marvee ===');
const marvee = {'01.01':72629.29,'02.01':-10272.51,'02.02':-5838.23,'02.03':-29317.06,'02.05':-10813.40,'02.06':-4998.84,'02.07':-2118.17,'05.01':-17678.31};
for (const k of Object.keys(marvee)) console.log(' ', k, 'motor:', (byL2[k]||0).toFixed(2).padStart(11), '| marvee:', marvee[k].toFixed(2).padStart(11), Math.abs((byL2[k]||0)-marvee[k])<50?'OK':'<<DIF');
console.log('  transfer excluído:', transfer.toFixed(2));
console.log('  SEM categoria restante:', semcat.toFixed(2), '('+semcatN+' mov)');
await pool.end();
