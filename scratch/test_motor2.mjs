import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const colab = (await pool.query("SELECT DISTINCT name FROM collaborators")).rows.map(r=>r.name).filter(Boolean);
const employees = colab.map(n => { const t = norm(n).split(/\s+/).filter(Boolean); return { first:t[0], second:(t[1]||'').slice(0,3) }; });
const RULES = [
  { re: /cobranca recebida|antecipacao\s*-\s*fatura/, s:'01.01.01' },
  { re: /taxa\s*pix/, s:'02.07.06' }, { re: /taxa\s*boleto/, s:'02.07.07' },
  { re: /taxa.*cart/, s:'02.07.08' }, { re: /tarifa|taxa de antecip/, s:'02.07.03' }, { re: /\biof\b/, s:'02.07.99' },
  // Pagamento de conta - X (impostos/admin)
  { re: /simples nacional/, s:'02.01.01' }, { re: /\bdarf\b|\birpj\b|\bcsll\b/, s:'02.01.05' }, { re: /\biss\b/, s:'02.01.06' },
  { re: /\binss\b/, s:'02.03.99' }, { re: /\bfgts\b/, s:'02.03.07' },
  { re: /seguro/, s:'02.06.14' }, { re: /aluguel|condominio|iptu/, s:'02.06.05' },
  { re: /energia|cpfl|enel|agua|sabesp/, s:'02.06.06' }, { re: /internet|telefone|\btim\b|\bvivo\b|\bclaro\b/, s:'02.06.07' },
  { re: /contabil|contador/, s:'02.06.03' }, { re: /marvee|assessoria financeira/, s:'02.06.01' }, { re: /honorario|advogad|juridic/, s:'02.06.04' },
  // Cartão
  { re: /facebk|facebook|meta ads|instagram ads/, s:'02.05.08' },
  { re: /openai|anthropic|elevenlabs|claude/, s:'02.02.10' },
  { re: /hostinger|neon|atlassian|clickup|1password|capcut|canva|myhubi|uazapi|pichau|apple\.com|google|gsuite|workspace|dominio|vps/, s:'02.02.06' },
  { re: /wellhub|gympass/, s:'02.03.09' },
];
function classify(desc){ const d=norm(desc);
  if(/pix.*para|transferencia/.test(d)){ if(d.includes('grape midia'))return '_T'; if(d.includes('jean')&&d.includes('chan'))return '05.01'; for(const e of employees) if(e.first&&d.includes(e.first)&&(e.second===''||d.includes(e.second)))return '02.03.03'; }
  for(const r of RULES) if(r.re.test(d)) return r.s; return null; }
// reprocessa: uncategorized OU auto-categorizado errado
const mv = await pool.query(`SELECT COALESCE(NULLIF(custom_description,''),description) desc, type, value::numeric val, edited_by, custom_category_id
  FROM fin_movements_asaas WHERE is_anticipation_pair=false
   AND (custom_category_id IS NULL OR edited_by IN ('regra-auto','motor-auto'))
   AND ((account='asaas' AND transaction_date>='2026-06-01' AND transaction_date<'2026-07-01') OR (account='sicredi' AND billing_month='2026-06'))`);
const byL2={}; let sem=0,semN=0,tr=0;
for(const m of mv.rows){ const s=classify(m.desc); const v=Number(m.val)*m.type;
  if(s==='_T'){tr+=v;continue;} if(!s){sem+=v;semN++;continue;} const l2=s.split('.').slice(0,2).join('.'); byL2[l2]=(byL2[l2]||0)+v; }
// soma os JÁ categorizados manualmente (não reprocessados) pra ter o total real
const man = await pool.query(`SELECT fc.structure s, SUM(m.value::numeric*m.type) v FROM fin_movements_asaas m JOIN fin_categories fc ON fc.id=m.custom_category_id WHERE m.is_anticipation_pair=false AND (m.edited_by IS NULL OR m.edited_by NOT IN ('regra-auto','motor-auto')) AND ((m.account='asaas' AND m.transaction_date>='2026-06-01' AND m.transaction_date<'2026-07-01') OR (m.account='sicredi' AND m.billing_month='2026-06')) GROUP BY fc.structure`);
for(const r of man.rows){ const l2=r.s.split('.').slice(0,2).join('.'); byL2[l2]=(byL2[l2]||0)+Number(r.v); }
const marvee={'01.01':72629.29,'02.01':-10272.51,'02.02':-5838.23,'02.03':-29317.06,'02.05':-10813.40,'02.06':-7458.86,'02.07':-2118.17,'05.01':-17678.31};
console.log('=== Rollup motor (Junho) vs Marvee ===');
for(const k of Object.keys(marvee)){ const v=byL2[k]||0; console.log(' ',k, 'motor:',v.toFixed(2).padStart(11),'| marvee:',marvee[k].toFixed(2).padStart(11), Math.abs(v-marvee[k])<150?'OK':'DIF'); }
console.log('  transfer excluído:',tr.toFixed(2),'| SEM categoria:',sem.toFixed(2),'('+semN+')');
await pool.end();
