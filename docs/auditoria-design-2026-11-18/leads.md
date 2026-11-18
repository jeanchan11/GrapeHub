# Redesenho da página Leads (Comercial › Leads) — 18/11/2026

Backup do original: `/private/tmp/claude-501/-Users-jeanchan-Desktop-backup-jean-Desktop-APLICA--ES-grapehub/2a760d95-3b6d-4303-9b29-bf652f1a2d5e/scratchpad/redesign/CrmLeads.tsx.orig` (952 linhas).

## Arquivos
- `src/pages/CrmLeads.tsx` — página (reescrita).
- `src/components/leads/LeadDetalhe.tsx` — popup do lead (novo).
- `src/components/leads/leadsUtil.ts` — tipos, regra de status, formatos (novo).
- O DateRangePicker próprio (~200 linhas) saiu; usa `src/components/ui/DateRangePicker.tsx`, com os mesmos atalhos.

Verificação: `curl` dos 3 arquivos = 200. `tsc --noEmit`: 32 linhas de erro, todas pré-existentes e em outros
arquivos. Nenhuma nos meus (saída em `tsc-leads.txt`). Não deu para ver a tela (sem login): o JSX foi revisado à mão.

## Medição (banco, só leitura, 18/11/2026)
- `leads-list` devolve **508 leads**, cerca de 620 KB de JSON. 52 foram criados em novembro e 343 estão perdidos (`is_lost`).
- Por isso a paginação é no navegador: 50 por vez, com "Carregar mais".
- Preenchimento: UTM 453, nicho 472, tempo de OAB 471, faturamento 472, Instagram 455, e-mail 453, cidade 55, tags 130.
- **`responsavel_name` vem NULO nos 508 leads.** A rota faz `LEFT JOIN users u ON l.responsavel_id = u.email`,
  mas `responsavel_id` guarda o **id** do usuário (`'2'` = Tiago Cordeiro, 286 leads; `'1'` = Jean Chan, 221). A tela antiga
  também mostrava "-" para todos. A coluna Responsável continua lá e vai funcionar quando o servidor
  corrigir o join (`u.id::text = l.responsavel_id`, como já faz `fechamento-detalhe.ts`). Não mexi no servidor.

## Nova estrutura
1. **Topo**: título "Leads" + subtítulo. Botões **Colunas** (colunas extras) e **Exportar** (CSV).
2. **Indicadores** num único `Cartao` com números em linha: Leads no período, Em aberto, Ganhos, Perdidos e
   Conversão (ganhos ÷ (ganhos+perdidos)). São calculados da lista já carregada e respeitam busca e pipeline.
   Usam a mesma regra de data das abas: Ganhos e Perdidos pela `etapa_updated_at`, os outros pela `created_at`.
   Assim o número do indicador é igual ao da aba.
3. **Barra de filtros**:
   - busca por nome, telefone ou e-mail, com X para limpar;
   - `Abas` segmentado com contador (Todos | Em aberto | Ganhos | Perdidos);
   - pipeline no `ThemedDropdown`;
   - período no `DateRangePicker` da ui. Limpar o período mostra "Todo o período";
   - "Limpar filtros" aparece quando algum filtro difere do padrão (o padrão é o mês atual).
4. **Tabela** no `Cartao`. Colunas: Lead (avatar + nome + telefone · e-mail em cinza), Origem, Etapa (bolinha com a cor
   da coluna + pipeline em cinza), Status (pílula), Responsável (avatar + primeiro nome), Valor (`.numero`, à direita)
   e Criado em (data + "há X dias").
   - Os cabeçalhos ordenam ao clicar, com seta. O padrão é criado em, do mais novo para o mais antigo (a ordem da API).
   - A linha inteira abre o detalhe, também pelo Enter.
   - O rodapé mostra "Mostrando X de Y · período" e o botão "Carregar mais".
   - Carregando: `CarregandoBloco`.
   - Lista vazia: `EstadoVazio` mostra, para cada filtro ativo, quantos leads apareceriam sem ele, com o link "tirar".
5. **Detalhe** (`Modal` max-w-3xl, no molde do `FechamentoPopup`):
   - Cabeçalho: avatar, nome, nome fantasia, pílula de status, etapa com cor, pipeline e valor.
   - Ações: **Abrir WhatsApp** (link `wa.me/55…`, só abre a conversa), **Copiar telefone** e **Copiar e-mail**, com toast.
     Só aparecem quando existe o dado.
   - Blocos **Contato**, **Negócio**, **De onde veio** (origem + utm_platform/campaign/set/creative/position) e
     **Perfil** (nome fantasia, nicho, faturamento, tempo de OAB, cidade/UF, investimento, fechamentos/mês, meta).
   - Tags e Observações.
   - **Linha do tempo única**: histórico + anotações em ordem cronológica (mais recente primeiro), agrupada por dia
     (Hoje, Ontem, data). Cada item mostra ícone, hora e autor (`user_name` ou `moved_by`). Há um filtro segmentado
     Tudo | Etapas | Anotações | Tarefas e automações, com contadores.
   - Tipos com rótulo: troca de etapa (de → para), ganho, perda, reaberto, anotação, reunião, ligação,
     tarefa criada/concluída/excluída/reaberta (com o tipo da tarefa), entrada por webhook e automação.
   - A anotação que já aparece no histórico como `note_created` não se repete, como na tela antiga.

## Onde foi parar cada campo antigo
| Antes (tabela) | Agora |
|---|---|
| Nome (avatar) | Coluna **Lead** |
| Telefone | Linha cinza sob o nome (Lead) + detalhe › Contato |
| Email | Linha cinza sob o nome (Lead) + detalhe › Contato |
| Origem (pílula colorida) | Coluna **Origem** (texto) + detalhe › De onde veio |
| Valor | Coluna **Valor** (à direita, `.numero`) + cabeçalho e Negócio do detalhe |
| Etapa | Coluna **Etapa**, com o pipeline embaixo |
| Status | Coluna **Status**. "Aberto" virou "Em aberto"; regra igual |
| Responsável | Coluna **Responsável** (vazia hoje, ver acima) + detalhe › Negócio |
| Tags | Coluna opcional em **Colunas › Tags** + detalhe |
| Criado em (há X) | Coluna **Criado em** (data + há X) + detalhe › Negócio |
| Mudou status (há X) | Coluna opcional em **Colunas › Mudou de etapa** + detalhe › Negócio ("Mudou de etapa", data e há X) |
| Lead perdido em 50% de opacidade e riscado | Pílula vermelha "Perdido" (o texto não fica mais apagado) |
| Contador "N leads no filtro" | Rodapé "Mostrando X de Y" + contadores das abas e indicadores |

| Antes (popup) | Agora |
|---|---|
| Telefone, Email | Contato (+ copiar / WhatsApp) |
| Origem | De onde veio |
| Valor, Responsável, Etapa, Criado em | Negócio (+ cabeçalho) |
| Nome Fantasia, Cidade, Faturamento | Perfil |
| Kanban no cabeçalho | Cabeçalho + Negócio › Pipeline |
| Tags, Observações | Bloco próprio abaixo |
| Histórico + anotações | Linha do tempo (mesma fusão e deduplicação) |

Campos novos no detalhe, que já vinham no `l.*` da mesma resposta:
- instagram, WhatsApp do formulário (quando difere do telefone), nome no formulário, form_estado, office_location;
- nicho, tempo_oab, investimento, monthly_closings, closing_goal;
- previsao (DATE → `dataDoBanco`), reunion_date, reunion_link, forma_pagamento, prob_fechamento, lead_score e UTMs.

O CSV exporta o mesmo conteúdo de antes: a lista filtrada, 12 colunas, mesmos cabeçalhos e o status "Aberto/Ganho/Perdido".

## Chamadas de API — antes × depois
| Chamada | Antes | Depois |
|---|---|---|
| `GET /api/crm-comercial/leads-list` | sem parâmetros, `Authorization: Bearer <token>`, na montagem e quando `user` muda | **idêntica** |
| `GET /api/crm-comercial/kanbans` | mesmo header, mesmo momento | **idêntica** |
| `GET /api/crm-comercial/lead-history/:id` | ao abrir o popup, em paralelo com notes | **idêntica** (agora em `LeadDetalhe.tsx`) |
| `GET /api/crm-comercial/notes?lead_id=:id` | idem | **idêntica** |

Nenhuma chamada nova e nenhuma mudança de servidor. Indicadores, contadores, ordenação e paginação são todos feitos no navegador.
A preferência de colunas fica no `localStorage` (`crmLeads.colunasExtras`), com try/catch.

## Riscos e diferenças de comportamento
- **Dia do filtro de período**: antes era `created_at.slice(0,10)`, o dia em **UTC**. Agora é o dia **local**. Um lead criado
  entre 21h e 23h59 (BRT) contava no dia seguinte e podia cair no mês errado no último dia. Isso muda a contagem
  na virada do mês; é correção.
- **Ganhos e Perdidos usam `etapa_updated_at`**, que muda a cada troca de etapa, não só na troca de status. Essa regra
  já era da tela antiga e foi mantida. Os indicadores Ganhos, Perdidos e Conversão herdam essa aproximação. A dica do
  indicador avisa "pela data em que mudaram de etapa".
- **Histórico limitado a 50** pelo servidor (`LIMIT 50`). Leads com muita automação (há 3.382 `task_created` na base)
  perdem os eventos mais antigos. O popup avisa quando chega a 50.
- Responsável vazio em 100% dos leads (bug do join no servidor, descrito acima).
- As descrições do histórico gravadas pelo sistema trazem emoji (⚡, 📞, 📥). São conteúdo do banco e ficaram como estão.
- Não testei na tela (sem login). Riscos visuais mais prováveis: a largura da barra de filtros em telas estreitas
  (ela quebra linha) e o seletor "Colunas", que abre com `absolute` dentro do cabeçalho.
