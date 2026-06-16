/**
 * Testes da normalizePhoneBR e formatPhoneBR
 *
 * Rodar: npx tsx scripts/test-phone-normalize.ts
 */
import { normalizePhoneBR, formatPhoneBR } from '../src/utils/phoneNormalize';

let passed = 0;
let failed = 0;

function assert(label: string, actual: string | null, expected: string | null) {
  if (actual === expected) {
    console.log(`  ✅ ${label}: ${JSON.stringify(actual)}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}: esperado ${JSON.stringify(expected)}, obteve ${JSON.stringify(actual)}`);
    failed++;
  }
}

console.log('\n── normalizePhoneBR ──────────────────────────────────\n');

// Caso 1: sem código do país
assert('81994383204 → 5581994383204',
  normalizePhoneBR('81994383204'), '5581994383204');

// Caso 2: com formatação
assert('(81) 99438-3204 → 5581994383204',
  normalizePhoneBR('(81) 99438-3204'), '5581994383204');

// Caso 3: já canônico
assert('5581994383204 → inalterado',
  normalizePhoneBR('5581994383204'), '5581994383204');

// Caso 4: com zero inicial
assert('081994383204 → 5581994383204',
  normalizePhoneBR('081994383204'), '5581994383204');

// Caso 5: SP celular
assert('(11) 98905-4242 → 5511989054242',
  normalizePhoneBR('(11) 98905-4242'), '5511989054242');

// Caso 6: número inválido (muito curto)
assert('12345 → null',
  normalizePhoneBR('12345'), null);

// Caso 7: fixo 8 dígitos
assert('(11) 3232-1010 → 551132321010',
  normalizePhoneBR('(11) 3232-1010'), '551132321010');

// Caso 8: com +55
assert('+55 81 99438-3204 → 5581994383204',
  normalizePhoneBR('+55 81 99438-3204'), '5581994383204');

// Caso 9: null input
assert('null → null',
  normalizePhoneBR(null), null);

// Caso 10: string vazia
assert('"" → null',
  normalizePhoneBR(''), null);

// Caso 11: com 0 antes do DDD e +55
assert('+55 081 99438-3204 → 5581994383204',
  normalizePhoneBR('+55 081 99438-3204'), '5581994383204');

// Caso 12: Número muito longo
assert('55819943832041234 → null (muito longo)',
  normalizePhoneBR('55819943832041234'), null);

console.log('\n── formatPhoneBR ──────────────────────────────────────\n');

// Celular
assert('5581994383204 → (81) 99438-3204',
  formatPhoneBR('5581994383204'), '(81) 99438-3204');

// Fixo
assert('551132321010 → (11) 3232-1010',
  formatPhoneBR('551132321010'), '(11) 3232-1010');

// Null
assert('null → ""',
  formatPhoneBR(null), '');

// Número desconhecido
assert('12345 → "12345" (fallback)',
  formatPhoneBR('12345'), '12345');

console.log(`\n${'═'.repeat(50)}`);
console.log(`  RESULTADO: ${passed} passou, ${failed} falhou`);
console.log(`${'═'.repeat(50)}\n`);

if (failed > 0) process.exit(1);
