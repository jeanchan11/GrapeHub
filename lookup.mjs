import Database from 'better-sqlite3';
const db = new Database('/Users/convidado/Desktop/grapehub/crm.db', { readonly: true });

const cnpj = '62003814000137';
const formatted = '62.003.814/0001-37';

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);

let found = false;
for (const t of tables) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
    const cnpjCols = cols.filter(c => /cnpj|cpf|document|fiscal|tax/i.test(c));
    for (const col of cnpjCols) {
      const rows = db.prepare(`SELECT * FROM ${t} WHERE replace(replace(replace(replace(${col},'.',''),'/',''),'-',''),' ','') = ?`).all(cnpj);
      if (rows.length > 0) { console.log(`ENCONTRADO em ${t}.${col}:`, JSON.stringify(rows[0])); found = true; }
    }
  } catch(e) {}
}
if (!found) console.log('CNPJ 62003814000137 NÃO encontrado em nenhuma tabela do banco.');
db.close();
