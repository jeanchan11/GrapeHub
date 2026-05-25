const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const items = [
  '[A implementar] Definir a ação a rodar',
  '[A implementar] Definir perguntas e sera necessário qualificar ou não',
  '[PROMPTS] Criar Prompt Follow up',
  '[PROMPTS] Criar o Prompt SDR IA',
  '[CRM Grape] Criar filas',
  '[CRM Grape] Criar tags',
  '[CRM Grape] Organizar para receber a IA',
  '[N8N IA] Criar pasta dentro do n8n pro cliente',
  '[N8N IA] duplicar modelo de produção da IA e Follow up',
  '[N8N IA] Credencial - Redis',
  '[N8N IA] Credencial - CRM Grape',
  '[N8N IA] Credencial - OpenIA',
  '[N8N IA] Credencial - Postgress (Neon)',
  '[N8N IA] Note de envio mensagem texto - token',
  '[N8N IA] Note de envio mensagem áudio - token',
  '[N8N IA] Adicionar frase',
  '[N8N IA] Mudar tags e filas',
  '[N8N FOLLOW UP] Mudar Tags e credenciais nos nodes',
  '[N8N FOLLOW UP] Mudar Prompt',
  '[N8N FOLLOW UP] Mudar credencial node principal',
  '[N8N FOLLOW UP] Alterar tags no node Switch',
  '[N8N FOLLOW UP] Note de envio mensagem texto - token'
];

async function run() {
  try {
    await pool.query("DELETE FROM onboarding_template_items WHERE type = 'implementacao-ia'");
    for (let i = 0; i < items.length; i++) {
      await pool.query(
        "INSERT INTO onboarding_template_items (title, order_index, type) VALUES ($1, $2, $3)",
        [items[i], i, 'implementacao-ia']
      );
    }
    console.log("Template IA inserted!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
