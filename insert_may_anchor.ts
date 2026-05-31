import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
