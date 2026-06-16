/**
 * normalizePhoneBR – Normaliza telefone BR para formato canônico (só dígitos, com 55).
 *
 * Regras:
 *  1. Remove tudo que não é dígito.
 *  2. Remove 0 inicial (ex: 081… → 81…).
 *  3. Se NÃO começa com 55, adiciona 55.
 *  4. Se JÁ começa com 55 e tem 12 ou 13 dígitos, não duplica.
 *  5. Resultado final: 13 dígitos (celular) ou 12 dígitos (fixo) → válido.
 *  6. Qualquer outro comprimento → null (inválido).
 *
 * @param raw  Valor bruto (pode conter parênteses, hífens, espaços, +55 etc.)
 * @returns    String canônica (ex: "5581994383204") ou null se inválido.
 */
export function normalizePhoneBR(raw: string | null | undefined): string | null {
  if (!raw) return null;

  // 1. Só dígitos
  let digits = raw.replace(/\D/g, '');

  if (digits.length === 0) return null;

  // 2. Remove 0 inicial (ex: 081… → 81…)
  if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
  }

  // 3/4. Adiciona 55 se não começa com 55
  if (!digits.startsWith('55')) {
    digits = '55' + digits;
  }

  // 4a. Remove 0 "rogue" entre o 55 e o DDD (ex: 550819… → 5581…)
  if (digits.startsWith('550') && (digits.length === 14 || digits.length === 15)) {
    digits = '55' + digits.slice(3);
  }

  // 5. Validar comprimento: celular = 13, fixo = 12
  if (digits.length !== 12 && digits.length !== 13) {
    return null;
  }

  return digits;
}

/**
 * formatPhoneBR – Formata telefone canônico para exibição.
 *
 * @param canonical  String canônica (ex: "5581994383204")
 * @returns          String formatada (ex: "(81) 99438-3204") ou o valor original se não reconhecer.
 */
export function formatPhoneBR(canonical: string | null | undefined): string {
  if (!canonical) return '';

  const digits = canonical.replace(/\D/g, '');

  // Celular: 55 + DDD(2) + 9XXXX-XXXX = 13 dígitos
  if (digits.length === 13 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 9);
    const part2 = digits.slice(9, 13);
    return `(${ddd}) ${part1}-${part2}`;
  }

  // Fixo: 55 + DDD(2) + XXXX-XXXX = 12 dígitos
  if (digits.length === 12 && digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const part1 = digits.slice(4, 8);
    const part2 = digits.slice(8, 12);
    return `(${ddd}) ${part1}-${part2}`;
  }

  // Fallback: retorna como está
  return canonical;
}
