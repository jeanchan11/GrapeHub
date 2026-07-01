import fs from 'fs';
const content = fs.readFileSync('/Users/convidado/Downloads/sicredi.csv','utf-8');
const lines = content.split(/\r?\n/);
const semi=(content.match(/;/g)||[]).length, comma=(content.match(/,/g)||[]).length, tab=(content.match(/\t/g)||[]).length;
const delimiter = tab>semi&&tab>comma?'\t':semi>comma?';':',';
const normalize=s=>s.trim().replace(/^["']|["']$/g,'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const parseBRValue=str=>{if(!str)return 0;let s=str.replace(/["']/g,'').trim();if(!s||s==='-')return 0;s=s.replace(/^-?\s*[RU]\$\s*/i,m=>m.startsWith('-')?'-':'');if(str.trim().startsWith('-'))s='-'+s.replace('-','');if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');return parseFloat(s)||0;};
const parseBRDate=str=>{if(!str)return null;const s=str.replace(/["']/g,'').trim();const m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null;};
let inTx=false,dateCol=-1,descCol=-1,parcelaCol=-1,valorCol=-1,card='';const txs=[];
for(const raw of lines){
  if(!raw.trim()){inTx=false;continue;}
  const cols=raw.split(delimiter).map(c=>c.trim().replace(/^["']|["']$/g,''));
  if(normalize(cols[0])==='cartao'){card=cols[1]||'';inTx=false;continue;}
  if(normalize(cols[0])==='data'&&cols.length>=3){dateCol=0;descCol=-1;parcelaCol=-1;valorCol=-1;for(let c=1;c<cols.length;c++){const h=normalize(cols[c]);if(h.includes('descricao')||h.includes('historico'))descCol=c;else if(h.includes('parcela'))parcelaCol=c;else if(h==='valor'||(h.includes('valor')&&!h.includes('dolar')))valorCol=c;}if(descCol===-1)descCol=1;if(valorCol===-1)valorCol=cols.length>=4?3:2;inTx=true;continue;}
  if(!inTx||dateCol===-1)continue;
  const dateStr=parseBRDate(cols[dateCol]||'');if(!dateStr)continue;
  const description=(descCol>=0?cols[descCol]:'')||'Sem descrição';
  const amount=valorCol>=0?parseBRValue(cols[valorCol]):0;
  if(amount===0)continue;
  const dl=description.toLowerCase();if(dl.startsWith('pag fat')||dl.startsWith('pagamento fatura'))continue;
  txs.push({dateStr,description,amount});
}
console.log('delimiter:',JSON.stringify(delimiter),'| cartão:',card);
console.log('TRANSAÇÕES parseadas:',txs.length);
let tot=0;for(const t of txs){tot+=t.amount;console.log(`  ${t.dateStr}  ${t.description.slice(0,40).padEnd(40)}  R$ ${t.amount.toFixed(2)}`);}
console.log('TOTAL despesas: R$',tot.toFixed(2));
