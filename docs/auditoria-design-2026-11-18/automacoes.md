# Automações — redesenho (18/11/2026)

Backup do original: `scratchpad/redesign/Automacoes.tsx.orig` (976 linhas).
Compilação: os 7 arquivos respondem 200 no dev server. `tsc`: 0 erro nos arquivos novos/alterados
(30 erros no projeto, todos pré-existentes em outras páginas) — `tsc-automacoes.txt`.

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/pages/Automacoes.tsx` (~420 l.) | Página: cabeçalho, abas, lista, modelos, save/delete/toggle |
| `src/components/automacoes/catalogo.ts` | Tipos, gatilhos, ações (com grupo e ajuda), modelos, frases-resumo, validação |
| `src/components/automacoes/dados.tsx` | Cache de pipelines, etapas, sequências e usuários (contexto da página) |
| `src/components/automacoes/Construtor.tsx` | Construtor em duas colunas |
| `src/components/automacoes/PainelConfigurar.tsx` | Painel "Configurar" do passo selecionado |
| `src/components/automacoes/Historico.tsx` | Aba Histórico (tabela) |
| `src/components/automacoes/ui.tsx` | Interruptor, Campo, Seletor (por id), SeletorLista (ícone + nome + descrição + busca) |

## Nova estrutura da tela

**Topo:** título "Automações" (SplitHeadline) + resumo discreto em uma linha ("3 automações · 2 ativas ·
176 execuções no total") + botão principal "Nova automação".
**Abas (ui/Abas):** Minhas automações (contador) | Modelos | Histórico (contador; fica vermelho se houver erro).
A aba inicial passou a ser **Minhas automações** (antes era Modelos).

1. **Minhas automações** — busca (nome e descrição) + filtro segmentado Todas/Ativas/Pausadas.
   Cada automação é uma linha legível:
   *Quando **Negócio criado** (pipeline Inbound) → Iniciar sequência, Criar atividade (+2)*;
   embaixo nº de execuções, "última há 3 dias" (data completa no hover) e a descrição. À direita,
   interruptor Ativa/Pausada sempre visível, Editar e Excluir (confirmDialog avisando que o histórico
   da automação também some — o FK de `automation_logs` é ON DELETE CASCADE). Clicar na linha abre o
   construtor. Vazio: EstadoVazio com "Criar automação" e "Ver modelos". Carregando: CarregandoBloco.
   *Duplicar não foi criado* (não existia).
2. **Modelos** — galeria com os 12 modelos: ícone do gatilho, nome, "Quando: …", a frase e as ações
   em pílulas. "Usar modelo" abre o construtor montado.
3. **Construtor** — topo: voltar, nome editável no lugar, descrição opcional, interruptor Ativa,
   Cancelar (secundário) e Salvar (principal). Sair com mudança não salva pede confirmação.
   - Esquerda (linha do tempo): **Quando** → cartão âmbar do gatilho; **Só continua se** → cartão da
     condição (ou botão "Adicionar condição (opcional)"); **Então** → ações numeradas, cada uma com
     ícone, nome e resumo em texto ("Mover para: Comercial › Proposta", "Ligação · prazo de 1 dia ·
     “Ligar para o cliente”"), botões subir/descer/excluir. Um "+" em cada conector insere ação naquela
     posição; "Adicionar ação" no fim.
   - Direita, **Configurar**: gatilho = lista com ícone + nome + descrição; ação = lista agrupada
     (Negócio / Atividades / Clientes e integrações) com busca e, depois de escolhida, os campos com
     rótulo e ajuda curta que diz o que o servidor faz de fato (ex.: "Marcar como ganho" vai para a
     primeira etapa com "ganho"/"fechado" no nome); condição = regras E com Campo / Operador / valor
     (pipeline e etapa por seletor, o resto texto).
   - **Validação antes de salvar**: nome, gatilho, ao menos uma ação, tipo da ação e os campos de que a
     ação precisa ("Ação 2: escolha a etapa de destino", URL do webhook, sequência, responsável,
     etiqueta, texto da nota, campo/valor das regras). Mostra toast, faixa de erros, borda vermelha no
     cartão e a lista no painel; seleciona o primeiro passo com problema.
4. **Histórico** — filtro Todas/Sucesso/Erro (com contadores) e por automação, botão atualizar; tabela
   Status (pílula verde/vermelha), Automação, Ação (em português), Negócio, Quando (data + "há x").
   Clicar abre a mensagem completa (erro em destaque), o gatilho e os ids.

## Chamadas de API — antes × depois

| # | Chamada | Antes | Depois |
|---|---|---|---|
| 1 | `GET /api/automations` | ao abrir e depois de salvar | **igual** |
| 2 | `POST /api/automations` body `{name, description, steps}` | nova | **igual** (mesmo corpo) |
| 3 | `PUT /api/automations/:id` body `{name, description, steps}` | edição | **igual** (mesmo corpo) |
| 4 | `DELETE /api/automations/:id` | após confirm | **igual** (agora checa `res.ok` e avisa se falhar) |
| 5 | `PATCH /api/automations/:id/toggle` | interruptor da lista | **igual**; também chamado **depois do save** quando o interruptor do construtor difere do estado salvo |
| 6 | `GET /api/automations/logs?limit=100` | ao abrir a aba Histórico e em "Atualizar" | **igual** + 1 vez ao abrir a página (contador da aba) |
| 7 | `GET /api/crm-comercial/kanbans` | a cada abertura do painel de condição | **mesma URL**, 1 vez por página (cache) |
| 8 | `GET /api/crm-comercial/columns?kanban_id=X` | ao escolher pipeline numa condição de etapa | **mesma URL**; também para pipelines citados nos passos salvos (para mostrar o nome da etapa) |
| 9 | `GET /api/crm-comercial/sequences/all` | ao renderizar ação "Iniciar sequência" | **mesma URL**, 1 vez (cache) |
| 10 | `GET /api/users` | — | **nova na página** (mesmo endpoint do CRM), só quando há ação "Atribuir responsável" |

Nenhuma mudança de servidor.

### O que é salvo
- Mesmo formato: `steps = [{ id, type, config }]`. Ordem gravada: `[gatilho, ...condições, ...ações]`.
  O motor avalia todas as condições antes de qualquer ação, então é a mesma execução. **Conferido nas 3
  automações do banco** (ids 3, 4, 5): o array montado pelo construtor é byte a byte igual ao salvo hoje,
  e as 3 passam na validação.
- Mesmas chaves de config: gatilho `{event}` (substituído inteiro, como antes); condição
  `{rules:[{field, op, value, _kanban}]}`; create_task `task_type/day_offset/title/observations`;
  add_tag `tag`; create_note `note`; send_webhook `webhook_url`; start_sequence `sequence_id` (Number).
  Trocar o tipo da ação mantém as outras chaves (`{...cfg, action_type}`), como antes.
- **Única diferença deliberada:** agora dá para preencher as chaves que o motor JÁ lê e que a tela antiga
  não oferecia — `move_stage.column_id`, `create_lead.kanban_id/column_id`,
  `assign_responsible.responsible_id` (id de `/api/users`, o mesmo que o CRM grava em
  `responsavel_id`). Antes, essas três ações salvas pela tela não faziam nada, em silêncio. Para
  "Mover para etapa" a tela grava também `_kanban` (auxiliar, ignorado pelo motor — mesma convenção das
  regras de condição) para listar as etapas.
- Ação nova nasce com config `{}` (antes `{action_type:'create_task'}`) e a validação obriga a escolher.
- Ao mudar o campo de uma regra, o operador é ajustado para um válido do campo (ex.: "contém" não existe
  para Pipeline).

## O que foi preservado
Os 8 gatilhos, as 14 ações, os 12 modelos (mesmos nomes/descrições), condições com várias regras (E),
campos especiais Kanban e Etapa do funil, tipos de atividade, contador de execuções e última execução,
busca, histórico, toasts e confirmação. Tema claro/escuro só com tokens (`bg-dark-card`, `text-dark-text`,
`border-black/10 dark:border-white/10`), acento violeta, gatilho âmbar, condição azul-céu.

## Bugs do original corrigidos de passagem (só front)
- 10 dos 12 modelos tinham `steps: []`: abriam sem gatilho e clicar em "Selecionar gatilho" quebrava
  (`triggerStep.id` de undefined). Agora cada modelo vem com gatilho + ações da descrição; pipeline/etapa/
  pessoa ficam para escolher (a validação pede).
- `RightPanel` chamava `useState` dentro de `if (mode === 'condition')` (viola regra de hooks).
- "+SE/+AÇÃO" entre passos sempre acrescentava no fim; agora insere na posição.

## Riscos
- **Não vi a tela** (sem login). JSX revisado à mão; compila (200) e passa no tsc.
- Validação mais rígida: automação antiga com ação incompleta não salva até completar. Hoje nenhuma das
  3 do banco é afetada.
- O modelo "Rodízio SDRs" promete rodízio, mas o motor só atribui UMA pessoa fixa (já era assim).
- Aviso de mudança não salva só cobre Voltar/Cancelar; trocar de página pela Sidebar não avisa (igual antes).
- Ativar/pausar pelo construtor são 2 requisições (save + toggle); se a 2ª falhar, avisa por toast.
