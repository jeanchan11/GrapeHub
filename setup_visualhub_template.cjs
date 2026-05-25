const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Template items padrão para VisualHub (pode ser ajustado depois)
const items = [
  'Briefing do projeto',
  'Criação de roteiro',
  'Gravação do conteúdo',
  'Edição do vídeo',
  'Revisão e aprovação',
  'Publicação',
  'Relatório de performance',
];

async function run() {
  try {
    await pool.query("DELETE FROM onboarding_template_items WHERE type = 'visual-hub'");
    for (let i = 0; i < items.length; i++) {
      await pool.query(
        "INSERT INTO onboarding_template_items (title, order_index, type) VALUES ($1, $2, $3)",
        [items[i], i, 'visual-hub']
      );
    }
    console.log("Template VisualHub inserido!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
