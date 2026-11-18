# Redesenho — CRM › Sequências (18/11/2026)

Backup do original: `/private/tmp/claude-501/-Users-jeanchan-Desktop-backup-jean-Desktop-APLICA--ES-grapehub/2a760d95-3b6d-4303-9b29-bf652f1a2d5e/scratchpad/redesign/CrmSequencias.tsx.orig`

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/pages/CrmSequencias.tsx` | Estado, **todas as chamadas de API**, lista (cabeçalho, busca, grade de cartões, vazio). |
| `src/components/sequencias/ListaSequencias.tsx` | `CartaoSequencia`: nome, descrição, nº de passos, duração, selo de fim de semana, mini linha do tempo (ícone do canal + D0/D2…), contagem por canal, duplicar/excluir. |
| `src/components/sequencias/EditorSequencia.tsx` | Editor: topo (nome, descrição, interruptor, Cancelar/Salvar, "Alterações não salvas", validação) + duas colunas (linha do tempo por dia | Configurar passo) + Prévia das datas. |
| `src/components/sequencias/regras.ts` | Canais (ícone/cor), dia acumulado, agrupamento por dia, duração, prévia de datas, validação. Sem JSX, sem rede. |

Nenhum arquivo de servidor, base de design ou outra página foi tocado.

## Nova estrutura

**Lista**: `SplitHeadline` "CRM Sequências" + busca (nome/descrição) + "Nova sequência". Grade de
`gf-cartao` (1/2/3 colunas). Cada cartão: nome, descrição (2 linhas), "N passos · dura 17 dias úteis",
selo "Pula fim de semana" (pílula violeta) ou "Todos os dias", mini linha do tempo (um bloco por dia,
até 4 ícones + "+n"), "3 WhatsApp · 2 Ligação", "Editar →". Clique no cartão abre o editor.
Carregando = `CarregandoBloco`; vazio = `EstadoVazio` + "Criar sequência"; busca sem resultado = `EstadoVazio`.

**Editor**:
- Topo: "‹ Sequências", nome editável grande (seleciona "Nova Sequência" ao abrir uma nova),
  descrição, pílula âmbar "Alterações não salvas", Cancelar (pede confirmação se sujo) e Salvar.
  Interruptor "Pular fins de semana" com explicação ("2 dias depois de uma sexta cai na terça" e que a
  automação conta dias corridos). `beforeunload` enquanto houver alteração.
- Validação visível: caixa vermelha (erros, bloqueiam o salvar) e âmbar recolhível (avisos). Cada item
  com passo é clicável e seleciona o passo; o passo com problema ganha ícone na linha do tempo.
  - Erros: nome vazio; espera não inteira ou negativa.
  - Avisos: sem passos; passo sem título; sem horário (o servidor grava 09:00); horário fora de 8h–21h;
    passo do mesmo dia com horário mais cedo que o anterior.
- Esquerda — "Passos": nó "Lead entra na sequência"; blocos por dia com selo `D0`, `D2`…, frase
  ("No dia da entrada", "2 dias úteis depois do D0") e a data de exemplo (âmbar se cair no fim de
  semana). Cada passo: ícone/cor do canal, título, canal · horário, ↑ ↓ e lixeira. "+ Passo neste dia"
  no fim de cada dia; "Adicionar passo em um novo dia" no fim; vazio com "Adicionar o primeiro passo".
- Direita (fixa ao rolar no desktop) — "Configurar passo N de M": canal em 5 botões com ícone;
  "Quando": espera com − / + ("dias depois da entrada do lead" no 1º, "do passo anterior" nos demais),
  frase com o D resultante e a data de exemplo, aviso de que os seguintes andam junto; horário com
  alerta 8h–21h; título da atividade; mensagem/roteiro (observações). Excluir no cabeçalho.
- "Prévia das datas": "Se o lead entrar em [data]" (padrão hoje), lista D · canal · data + hora · título.
  Com "pular fim de semana" ligado aparece a escolha **Botão no lead | Automação**, porque as duas
  regras dão datas diferentes (ver abaixo).

Cores dos canais: as do arquivo antigo (WhatsApp emerald, Email violeta, Reunião laranja, Tarefa slate);
Ligação passou de `blue` para `sky` (o padrão evita azul).

## Chamadas de API — antes × depois

| Ação | Antes | Depois |
|---|---|---|
| Carregar | `GET /api/crm-comercial/sequences/all` | idem, mesma função `fetchSequences` |
| Criar | `POST /api/crm-comercial/sequences`, corpo `JSON.stringify(seqForm)` = `{name, description, skip_weekends, steps}` | idem (mesmo `seqForm`, mesmas 4 chaves, mesmo `Content-Type`) |
| Salvar edição | `PUT /api/crm-comercial/sequences/:id`, mesmo corpo | idem |
| Excluir | `DELETE /api/crm-comercial/sequences/:id` (após `confirmDialog`) | idem (após `confirmDialog` com texto mais claro) |
| Duplicar | — | **novo botão, mesma rota de criação**: `POST /api/crm-comercial/sequences` com `{name: "<nome> (cópia)", description, skip_weekends, steps:[{type,title,observations,day_offset,time_of_day}]}` — exatamente os campos que o POST lê. |

Formulário ao abrir: nova = `{ name: 'Nova Sequência', description: '', skip_weekends: true, steps: [] }`;
edição = `{ name: seq.name, description: seq.description || '', skip_weekends: seq.skip_weekends, steps: seq.steps || [] }`
— os dois idênticos ao original. Passo novo = `{ day_offset, time_of_day, type: 'WhatsApp', title: 'Nova atividade', observations: '' }`
(mesmos campos; só o `day_offset`/`time_of_day` inicial depende de onde se clica: 0 no primeiro passo e em
"Passo neste dia", 1 em "novo dia"; horário do "neste dia" = anterior + 1h, até 20:00).
Nenhum campo extra entra no payload (sem chave de React nem estado de UI dentro dos passos).

Diferenças de comportamento só no front (o payload continua do mesmo formato):
1. **↑/↓ troca o passo de lugar mantendo as esperas no lugar** — o passo assume o dia do vizinho e
   nenhum outro passo muda de data. Antes a troca levava a espera junto, e subir o 2º passo de um dia
   jogava o 1º para o dia anterior.
2. **Excluir passo soma a espera dele ao seguinte**, que fica na mesma data. Antes os seguintes
   recuavam.
3. Nome só com espaços passa a ser bloqueado (antes só o vazio). Sucesso/erro de salvar, excluir e
   duplicar ganharam toast.

## Como a prévia replica a regra

Fonte: `CrmComercial.handleApplySequence` (botão "Sequência" do lead) e `server.ts` ação
`start_sequence` das automações (~linha 3306). Ambos: `day_offset` = espera desde o passo anterior,
dia do passo = soma acumulada.
- **Botão no lead**: `addDays(hoje, acumulado, sequence.skip_weekends ?? true)` — avança 1 dia por vez
  e, com a opção, só conta seg–sex. `regras.ts › somarDias` é cópia literal. Conferido com script contra
  o `addDays` original: 3 formatos reais (Follow Vendas 0/2/3/5/7, Pré vendas 11 passos, Confirmação 2)
  × entrada de seg a dom × opção ligada/desligada = 42 casos, 0 diferenças.
- **Automação**: `dueDate.setDate(+acumulado)` — dias corridos, **ignora `skip_weekends`**. A prévia
  mostra essa regra na aba "Automação" e o texto do interruptor avisa.
- A prévia usa a data local ao meio-dia; o botão real usa `new Date()` + `toISOString()` (ver riscos).

## Riscos e pontos para o Jean

- **"Pular fim de semana" não vale na automação** "Iniciar sequência" (servidor conta dias corridos).
  Ex.: Pré vendas entrando numa sexta 20/11 — botão: D1 = seg 23/11; automação: D1 = sáb 21/11.
  Não mudei a regra; está exibido na tela.
- **D0 não é adiado** no botão: lead que entra no sábado recebe o D0 no sábado mesmo com a opção
  ligada. A prévia marca em âmbar.
- O botão grava `due.toISOString().split('T')[0]` (UTC): aplicado depois das 21h, todas as datas saem
  um dia à frente. Defeito do CrmComercial, não desta página; não mexi.
- `CrmComercial.tsx` tem outro editor de sequências (estado `seqForm` próprio) e lista "Dia {s.day_offset}"
  sem acumular — mostra a espera como se fosse o dia. Fora do escopo.
- Duplicar não leva `kanban_id` (a criação desta página nunca levou); todos os consumidores usam
  `/sequences/all`, então não faz diferença hoje.
- Não foi possível ver a tela (sem login): conferi o JSX à mão, compilação do dev server (200 nos 4
  arquivos) e `tsc` filtrado pelos arquivos tocados. `field-sizing: content` na descrição não existe no
  Safari — lá o campo usa `rows` pelo número de linhas.
