// ── Calculadora de remuneração por CONTRATOS fechados ───────────────────────
// Irmã da Calculadora Closer (`/api/closer-data`), que mede a meta em reais
// vendidos. Aqui a meta é quantidade de contratos, então os parâmetros são
// outros e guardar no mesmo registro misturaria as duas — cada uma tem a sua
// linha de configuração.
import { Express } from 'express';
import { Pool } from 'pg';

const PADRAO = {
  baseSalary: 2500,        // salário fixo
  contractsTarget: 10,     // meta do mês, em contratos
  bonusValue: 800,         // bônus integral (100% da meta)
  averageTicket: 2500,     // ticket médio do contrato (só para mostrar o volume)
  commissionPerContract: 250,  // comissão FIXA por contrato fechado, em reais
  contractsClosed: 0,      // fechados até agora
};

export async function migrateCalculadoraContratos(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calculadora_contratos_data (
      id         serial PRIMARY KEY,
      data       jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export function setupCalculadoraContratosRoutes(app: Express, pool: Pool) {
  const numero = (v: any, padrao: number) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? n : padrao;
  };

  app.get('/api/calculadora-contratos', async (_req: any, res) => {
    try {
      const r = await pool.query(
        `SELECT data FROM calculadora_contratos_data ORDER BY updated_at DESC LIMIT 1`);
      const raw = r.rows[0]?.data || {};
      res.json({
        baseSalary:      numero(raw.baseSalary,      PADRAO.baseSalary),
        contractsTarget: numero(raw.contractsTarget, PADRAO.contractsTarget),
        bonusValue:      numero(raw.bonusValue,      PADRAO.bonusValue),
        averageTicket:   numero(raw.averageTicket,   PADRAO.averageTicket),
        commissionPerContract: numero(raw.commissionPerContract, PADRAO.commissionPerContract),
        contractsClosed: numero(raw.contractsClosed, PADRAO.contractsClosed),
      });
    } catch (err: any) {
      console.error('[calculadora-contratos] GET:', err.message);
      res.status(500).json({ error: 'Falha ao carregar a calculadora.' });
    }
  });

  app.post('/api/calculadora-contratos', async (req: any, res) => {
    try {
      const b = req.body || {};
      const data = {
        baseSalary:      numero(b.baseSalary,      PADRAO.baseSalary),
        contractsTarget: numero(b.contractsTarget, PADRAO.contractsTarget),
        bonusValue:      numero(b.bonusValue,      PADRAO.bonusValue),
        averageTicket:   numero(b.averageTicket,   PADRAO.averageTicket),
        commissionPerContract: numero(b.commissionPerContract, PADRAO.commissionPerContract),
        contractsClosed: numero(b.contractsClosed, PADRAO.contractsClosed),
      };
      // Uma linha só, como na calculadora do closer: a tela é um simulador, não
      // um histórico.
      const existe = await pool.query(
        `SELECT id FROM calculadora_contratos_data ORDER BY updated_at DESC LIMIT 1`);
      if (existe.rows[0]) {
        await pool.query(
          `UPDATE calculadora_contratos_data SET data=$1, updated_at=now() WHERE id=$2`,
          [data, existe.rows[0].id]);
      } else {
        await pool.query(`INSERT INTO calculadora_contratos_data (data) VALUES ($1)`, [data]);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('[calculadora-contratos] POST:', err.message);
      res.status(500).json({ error: 'Falha ao salvar a calculadora.' });
    }
  });
}
