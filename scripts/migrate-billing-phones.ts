/**
 * migrate-billing-phones.ts — Migração idempotente dos billing_phone existentes.
 *
 * USO:
 *   npx tsx scripts/migrate-billing-phones.ts --dry-run   # Mostra o que mudaria
 *   npx tsx scripts/migrate-billing-phones.ts             # Aplica de verdade
 *
 * Requer: DATABASE_URL no .env (carrega automaticamente via dotenv)
 */
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Carrega .env da raiz do projeto
dotenv.config({ path: path.resolve(import.meta.dirname || __dirname, '..', '.env') });

// ── normalizePhoneBR (inline para o script ser standalone) ──────────────────
function normalizePhoneBR(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  if (!digits.startsWith('55')) digits = '55' + digits;
  if (digits.length !== 12 && digits.length !== 13) return null;
  return digits;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL não encontrada. Configure o .env');
    process.exit(1);
  }

  console.log(`\n🔄 Migração billing_phone — modo: ${dryRun ? '🧪 DRY-RUN' : '🚀 PRODUÇÃO'}\n`);

  const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    const { rows: clients } = await pool.query(
      `SELECT id, name, billing_phone FROM clients ORDER BY name ASC`
    );

    let totalProcessados = 0;
    let normalizados = 0;
    let jaCorretos = 0;
    let vaziosIgnorados = 0;
    const invalidos: { id: string; name: string; raw: string }[] = [];

    for (const c of clients) {
      totalProcessados++;
      const raw = c.billing_phone;

      // Campo vazio — ignorar
      if (!raw || !raw.trim()) {
        vaziosIgnorados++;
        continue;
      }

      const normalized = normalizePhoneBR(raw);

      if (!normalized) {
        invalidos.push({ id: c.id, name: c.name, raw });
        continue;
      }

      if (normalized === raw.replace(/\D/g, '') && raw.replace(/\D/g, '') === normalized) {
        // Já está no formato canônico? Verifica se precisa limpar caracteres especiais
        if (raw === normalized) {
          jaCorretos++;
          continue;
        }
      }

      // Precisa normalizar
      if (dryRun) {
        console.log(`  📝 ${c.name} (${c.id}): "${raw}" → "${normalized}"`);
      } else {
        await pool.query(`UPDATE clients SET billing_phone = $1 WHERE id = $2`, [normalized, c.id]);
        console.log(`  ✅ ${c.name}: "${raw}" → "${normalized}"`);
      }
      normalizados++;
    }

    // ── Resumo ──────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log('  RESUMO DA MIGRAÇÃO');
    console.log('═'.repeat(60));
    console.log(`  Total processados:    ${totalProcessados}`);
    console.log(`  Normalizados:         ${normalizados}`);
    console.log(`  Já corretos:          ${jaCorretos}`);
    console.log(`  Vazios (ignorados):   ${vaziosIgnorados}`);
    console.log(`  Inválidos:            ${invalidos.length}`);
    console.log('═'.repeat(60));

    if (invalidos.length > 0) {
      console.log('\n⚠️  Clientes com billing_phone INVÁLIDO (não alterados):');
      for (const inv of invalidos) {
        console.log(`    • ${inv.name} (${inv.id}) → "${inv.raw}"`);
      }
    }

    if (dryRun && normalizados > 0) {
      console.log('\n💡 Execute sem --dry-run para aplicar as alterações.');
    }

    if (!dryRun && normalizados > 0) {
      console.log(`\n✅ ${normalizados} registro(s) atualizados com sucesso!`);
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
