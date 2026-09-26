// ── Extração de lançamentos de fatura de cartão em PDF ───────────────────────
// A fatura do cartão Asaas só é exportável em PDF (não há endpoint na API, nem
// CSV/OFX). Em vez de escrever um parser por layout de banco, mandamos o PDF
// inteiro para o Claude com structured output e recebemos a lista de lançamentos
// já normalizada — o resto do pipeline (impressão digital, insert, prune,
// categorização, DRE) é exatamente o mesmo usado pela fatura Sicredi.
import Anthropic from '@anthropic-ai/sdk';

export interface FaturaItem {
  date: string;          // YYYY-MM-DD
  description: string;
  amount: number;        // positivo = despesa, negativo = crédito/estorno
  card: string | null;
  installment: string | null;
}

export interface FaturaPDF {
  due_date: string | null;   // YYYY-MM-DD
  total: number | null;
  /** Quem emitiu a fatura. Serve para recusar o PDF quando a aba está errada. */
  emissor: 'asaas' | 'sicredi' | 'outro';
  items: FaturaItem[];
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['due_date', 'total', 'emissor', 'items'],
  properties: {
    due_date: { type: ['string', 'null'], description: 'Data de vencimento da fatura em YYYY-MM-DD' },
    emissor: {
      type: 'string',
      enum: ['asaas', 'sicredi', 'outro'],
      description: 'Instituição que emitiu a fatura, pelo cabeçalho/rodapé do PDF: "asaas" (ASAAS Gestão Financeira), "sicredi", ou "outro".',
    },
    total: { type: ['number', 'null'], description: 'Valor total da fatura em reais' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'description', 'amount', 'card', 'installment'],
        properties: {
          date: { type: 'string', description: 'Data do lançamento em YYYY-MM-DD' },
          description: { type: 'string', description: 'Descrição exatamente como impressa na fatura' },
          amount: { type: 'number', description: 'Valor em reais. Positivo = despesa. Negativo = crédito/estorno.' },
          card: { type: ['string', 'null'], description: 'Final do cartão ou portador, se a fatura separar por cartão' },
          installment: { type: ['string', 'null'], description: 'Parcela, ex.: "02/12", se houver' },
        },
      },
    },
  },
} as const;

const SYSTEM = `Você extrai lançamentos de faturas de cartão de crédito brasileiras em PDF.

Regras:
- Extraia TODOS os lançamentos da fatura, inclusive IOF, anuidade, juros, multa, seguro e taxas. Cada linha impressa vira um item.
- Não some, não agrupe e não arredonde. Um item por linha da fatura.
- "description" é o texto impresso, sem reescrever nem traduzir.
- "amount" em reais, ponto como separador decimal. Despesa = positivo. Crédito, estorno, desconto ou pagamento recebido = negativo.
- NÃO inclua linhas de pagamento da própria fatura ("PAGAMENTO EFETUADO", "PAG FAT", "PAGTO DEBITO CONTA"): elas quitam a fatura, não são despesa.
- NÃO inclua linhas de saldo, subtotal, total, limite ou "saldo anterior".
- Datas em YYYY-MM-DD. Quando a fatura mostrar só dia/mês, deduza o ano pelo vencimento da fatura (compras de dezembro numa fatura que vence em janeiro são do ano anterior).
- Se um valor estiver em dólar e também em reais, use o valor em reais.
- Se a fatura separar por portador/cartão, preencha "card" com o identificador daquele bloco.
- Devolva lista vazia se o PDF não for uma fatura de cartão.
- "emissor": identifique a instituição pelo cabeçalho ou rodapé da fatura.`;

export async function extrairFaturaPDF(
  pdf: Buffer,
  hint?: { billingMonth?: string | null; fileName?: string }
): Promise<FaturaPDF> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada no servidor — necessária para ler faturas em PDF.');

  const anthropic = new Anthropic({ apiKey });

  const contexto = [
    hint?.fileName ? `Arquivo: ${hint.fileName}` : '',
    hint?.billingMonth ? `Mês de competência selecionado na tela: ${hint.billingMonth} (use só como desempate de ano; o vencimento impresso manda).` : '',
  ].filter(Boolean).join('\n');

  const stream = anthropic.messages.stream({
    model: 'claude-opus-5',
    max_tokens: 32000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA as any } },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdf.toString('base64') } },
          { type: 'text', text: `Extraia os lançamentos desta fatura.${contexto ? `\n\n${contexto}` : ''}` },
        ],
      },
    ],
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === 'refusal') {
    throw new Error('A leitura do PDF foi recusada pelo modelo.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('A fatura é maior que o limite de leitura. Divida o PDF e importe em partes.');
  }

  const texto = response.content.filter((b) => b.type === 'text').map((b: any) => b.text).join('');
  let parsed: FaturaPDF;
  try {
    parsed = JSON.parse(texto);
  } catch {
    throw new Error('Não foi possível interpretar a resposta da leitura do PDF.');
  }

  const iso = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
  const items = (parsed.items || []).filter(
    (i) => i && iso.test(String(i.date)) && typeof i.amount === 'number' && Number.isFinite(i.amount) && i.amount !== 0
  );

  return {
    due_date: parsed.due_date && iso.test(parsed.due_date) ? parsed.due_date : null,
    total: typeof parsed.total === 'number' ? parsed.total : null,
    // Valor fora do esperado vira 'outro': nesse caso a importação NÃO bloqueia
    // (só recusa quando tem certeza de que a aba está errada).
    emissor: parsed.emissor === 'asaas' || parsed.emissor === 'sicredi' ? parsed.emissor : 'outro',
    items,
  };
}
