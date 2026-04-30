const http = require('http');

http.get('http://localhost:3000/api/financeiro/dre?year=2026', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log("DRE Summary:");
    const summary = json.summary;
    console.log("Receitas:", summary.monthly_receitas.slice(0, 4));
    console.log("Despesas:", summary.monthly_despesas.slice(0, 4));
    console.log("Dist:", summary.monthly_distribuicao.slice(0, 4));
    console.log("Geracao:", summary.monthly_geracao_caixa.slice(0, 4));
    console.log("Saldo Inicial:", summary.monthly_saldo_inicial.slice(0, 4));
  });
}).on("error", (err) => console.log("Error: " + err.message));
