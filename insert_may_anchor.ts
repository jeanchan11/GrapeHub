import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_Ucjz1nygpE4L@ep-sweet-morning-ac7xd87o-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require' });

async function run() {
  // Remove qualquer anchor de Maio anterior
  await pool.query("DELETE FROM fin_dfc_config WHERE year = 2026 AND mes_referencia = 5;");
  // Insere: Maio começa com R$ 49.644,31 (caixa real Asaas hoje)
  await pool.query("INSERT INTO fin_dfc_config (year, mes_referencia, saldo_referencia) VALUES (2026, 5, 49644.31);");
  const r = await pool.query("SELECT * FROM fin_dfc_config WHERE year = 2026 ORDER BY mes_referencia;");
  console.log("Configs 2026:", r.rows);
  process.exit(0);
}
run();
