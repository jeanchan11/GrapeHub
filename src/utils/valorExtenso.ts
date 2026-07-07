// Converte um valor numérico (R$) para extenso em português — usado no gerador de contrato
// (cláusula 4.1). O resultado é editável na UI, então cobre os casos comuns de contrato.

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const DEZ_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
const ESCALAS: [string, string][] = [
  ['', ''],
  ['mil', 'mil'],
  ['milhão', 'milhões'],
  ['bilhão', 'bilhões'],
  ['trilhão', 'trilhões'],
];

// 0..999 por extenso
function ate999(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const d = Math.floor(resto / 10);
  const u = resto % 10;
  const parts: string[] = [];
  if (c) parts.push(CENTENAS[c]);
  if (resto) {
    if (resto < 10) parts.push(UNIDADES[u]);
    else if (resto < 20) parts.push(DEZ_DEZENOVE[resto - 10]);
    else { parts.push(DEZENAS[d]); if (u) parts.push(UNIDADES[u]); }
  }
  return parts.join(' e ');
}

function inteiroExtenso(n: number): string {
  if (n === 0) return 'zero';
  // separa em grupos de 3, do mais significativo para o menos
  const grupos: number[] = [];
  let x = n;
  while (x > 0) { grupos.unshift(x % 1000); x = Math.floor(x / 1000); }

  const total = grupos.length;
  const partes: string[] = [];
  grupos.forEach((val, i) => {
    if (val === 0) return;
    const escala = total - 1 - i; // 0 = unidade, 1 = mil, 2 = milhão...
    let txt: string;
    if (escala === 1) {
      txt = val === 1 ? 'mil' : `${ate999(val)} mil`;
    } else if (escala >= 2) {
      const [sing, plur] = ESCALAS[escala];
      txt = `${ate999(val)} ${val === 1 ? sing : plur}`;
    } else {
      txt = ate999(val);
    }
    partes.push(txt);
  });

  // junta os grupos: vírgula entre eles, mas " e " antes do último se for < 100 ou centena redonda
  if (partes.length === 1) return partes[0];
  const ultimo = grupos[grupos.length - 1];
  const ultimoTexto = partes[partes.length - 1];
  const anteriores = partes.slice(0, -1).join(', ');
  const usaE = ultimo !== 0 && (ultimo < 100 || ultimo % 100 === 0);
  return usaE ? `${anteriores} e ${ultimoTexto}` : `${anteriores}, ${ultimoTexto}`;
}

// Valor em reais → "mil e oitocentos reais", "dois mil e quinhentos reais e cinquenta centavos"
export function valorPorExtenso(valor: number): string {
  if (!isFinite(valor) || valor < 0) return '';
  const inteiro = Math.floor(valor + 1e-9);
  const centavos = Math.round((valor - inteiro) * 100);

  let out = '';
  if (inteiro > 0) {
    out = `${inteiroExtenso(inteiro)} ${inteiro === 1 ? 'real' : 'reais'}`;
  }
  if (centavos > 0) {
    const cent = `${inteiroExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`;
    out = out ? `${out} e ${cent}` : cent;
  }
  if (!out) out = 'zero reais';
  // capitaliza a primeira letra
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// Formata número como moeda BRL
export function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
