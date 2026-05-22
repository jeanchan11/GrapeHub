/**
 * Script para atualizar informações de cobrança - Lote 2
 */

const API_BASE = 'http://localhost:3000';

const billingUpdates = [
  { clientName: "MACEDO TUMA ADVOCACIA",                                        billingName: "Bruna",              billingMethod: "Email/WhatsApp", billingEmail: "bruna.brito@jmacedo.adv.br",                  billingPhone: "55 11 97410-8961" },
  { clientName: "Dillenburg Boaventura Advogados",                              billingName: "Nathalia",           billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "55 77 9936-3098" },
  { clientName: "RAFAELA AZAM ADVOGADA",                                        billingName: "Dra Rafaela",        billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "55 13 99188-2808" },
  { clientName: "Sandra Maria Bertussi Ferrari",                                billingName: "Sandra",             billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "55 47 9129-7154" },
  { clientName: "Vizioli Advocacia",                                            billingName: "Cintia e Ana",       billingMethod: "Email",          billingEmail: "recepcao@vizioli.com.br",                     billingPhone: "" },
  { clientName: "Fnz advogados",                                                billingName: "Bruno",              billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "51 9359-7131" },
  { clientName: "Sousa & Portilho Advocacia",                                   billingName: "Rita de Cássia",     billingMethod: "Email/WhatsApp", billingEmail: "sousa&portilho.jus@gmail.com",                 billingPhone: "21 9760-33280" },
  { clientName: "Damasceno e Ferreira Advocacia",                               billingName: "Letícia",            billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "12 99232-4600" },
  { clientName: "Oliveira Filho Advogados",                                     billingName: "Cassiana",           billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "55 51 9635-9185" },
  { clientName: "STAR ONE CORRETORA DE SEGUROS E NEGOCIOS LTDA",                billingName: "Bruna",              billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "55 11 97410-8961" },
  { clientName: "Faria Advocacia",                                              billingName: "Kellen Faria",       billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "55 17 99727-0896" },
  { clientName: "ALMEIDA MOURAO ADVOGADOS ASSOCIADOS",                          billingName: "Eli",                billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "55 99 8480-2389" },
  { clientName: "Garcia e Garcia Advogados Associados",                         billingName: "Marta",              billingMethod: "Email",          billingEmail: "financeiro@garciaegarcia.com.br",             billingPhone: "" },
  { clientName: "Ferreira Advogados",                                           billingName: "Elizane",            billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "55 93 8423-6240" },
  { clientName: "Bicudo Sociedade Individual de Advocacia",                     billingName: "Welton Bicudo",      billingMethod: "Email / WhatsApp", billingEmail: "weltonbicudo@gmail.com",                    billingPhone: "55 67 9986-7671" },
  { clientName: "Sarah Coimbra Advocacia e Assessoria Jurídica",                billingName: "Sarah",              billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "55 63 9202-9607" },
  { clientName: "Duarte Associados, Advocacia Estratégica, Consultoria e Assessoria Jurídica", billingName: "Tríssia Duarte", billingMethod: "WhatsApp", billingEmail: "",                                    billingPhone: "55 19 98161-3480" },
  { clientName: "Rubert Advocacia",                                             billingName: "Adilon Rubert",      billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "55 65 9234-7510" },
  { clientName: "Pier Gallo Advocacia",                                         billingName: "Pier",               billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "55 11 2099-4242" },
  { clientName: "Mariana Veloso advocacia",                                     billingName: "Dra Mariana",        billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "63 8400-6047" },
  { clientName: "Custódio Lima Advogados Associados",                           billingName: "Dra Ana Paula",      billingMethod: "Email / WhatsApp", billingEmail: "juliana@custodiolima.adv.br",                billingPhone: "11 99136-8621" },
  { clientName: "PS TECNOLOGIA TRIBUTÁRIA E SS ADVOCACIA",                      billingName: "Dr Saul",            billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "51 9234-6577" },
  { clientName: "Escritório de advocacia cavalcante e Barbosa",                 billingName: "Dra Maria Patricia", billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "18 99625-6365" },
  { clientName: "Rafaela Leão Advocacia",                                       billingName: "Dra Rafaela",        billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "99 8426-5286" },
  { clientName: "Marcelo oliveira soc individual de advocacia",                 billingName: "Dr Marcelo Souza",   billingMethod: "Email",          billingEmail: "drmarceloadvogado@hotmail.com",               billingPhone: "" },
  { clientName: "THIAGO BARBOSA SOCIEDADE INDIVIDUAL DE ADVOCACIA",             billingName: "Thiago Barbosa",     billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "21 98767-4838" },
  { clientName: "FLL ADVOGADOS",                                                billingName: "Dr Pedro",           billingMethod: "WhatsApp",       billingEmail: "",                                            billingPhone: "(81) 99438-3204" },
];

async function main() {
  const res = await fetch(`${API_BASE}/api/clients`);
  if (!res.ok) { console.error('Failed to fetch clients'); return; }
  const clients = await res.json();
  console.log(`📋 Total clientes no GrapeHub: ${clients.length}\n`);

  let matched = 0;
  let notFoundInDB = [];

  for (const entry of billingUpdates) {
    // Match EXATO case-insensitive
    const client = clients.find(c => 
      (c.name || '').toLowerCase().trim() === entry.clientName.toLowerCase().trim()
    );

    if (!client) {
      notFoundInDB.push(entry.clientName);
      console.log(`❓ Não encontrado no BD: "${entry.clientName}"`);
      continue;
    }

    const payload = {
      billing_name: entry.billingName,
      billing_method: entry.billingMethod,
      billing_email: entry.billingEmail || null,
      billing_phone: entry.billingPhone || null,
    };

    const updateRes = await fetch(`${API_BASE}/api/clients/${client.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (updateRes.ok) {
      matched++;
      console.log(`✅ ${client.name} ← ${entry.billingName} (${entry.billingMethod})${entry.billingEmail ? ' | ' + entry.billingEmail : ''}${entry.billingPhone ? ' | ' + entry.billingPhone : ''}`);
    } else {
      console.error(`❌ Erro ao atualizar ${client.name}: ${await updateRes.text()}`);
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 Resultado: ${matched} clientes atualizados com sucesso`);
  
  if (notFoundInDB.length > 0) {
    console.log(`\n🔍 Nomes NÃO encontrados no BD:`);
    notFoundInDB.forEach(n => console.log(`   ❓ ${n}`));
  }
}

main().catch(console.error);
