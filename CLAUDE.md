# GrapeHub — contexto do projeto

ERP interno da Grape Mídia: financeiro (DRE, contas a pagar/receber, extrato), CRM
comercial e financeiro, operacional (squads, playbook de ações, onboarding de cliente),
RH (colaboradores, 1:1, planos de carreira), portal do cliente e Central de Treinamentos.

Este arquivo é lido no começo de toda sessão. **Quem descobrir algo não óbvio aqui, registra
aqui** — é o que evita repetir contexto para a próxima sessão.

---

## Stack e como rodar

- React 18 + TypeScript + Vite no front; Express + Postgres (Neon) no back.
- `npm run dev` → `tsx watch server.ts`, porta **3000** (o Express serve o Vite em middleware;
  não existe servidor de front separado).
- `npm run lint` é só `tsc --noEmit`. **O projeto tem erros de tipo pré-existentes** em várias
  páginas (CrmComercial, ContasAReceber, Organograma…). Ao validar uma alteração, filtre a
  saída pelos arquivos que você tocou — não tente zerar o projeto inteiro.
- Tailwind vem por **CDN** (`index.html`), com config inline. Não há build de CSS.

## Temas

Três estados no `<html>`: `light`, `dark`, `dark.darker`. Use os tokens do projeto
(`bg-dark-bg`, `bg-dark-card`, `text-dark-text`, `border-black/10 dark:border-white/10`),
nunca cores fixas. A preferência fica em `App.tsx` (`'system' | 'light' | 'darker'`).

## Arquitetura

- **`server.ts` tem ~20 mil linhas** e concentra a maior parte das rotas. Código novo vai em
  `src/routes/*.ts` com um `setupXRoutes(app, pool)` chamado de `server.ts`.
- Páginas: `App.tsx` é um `switch (activePage)`. Página nova precisa de **três** passos:
  1. componente em `src/pages/`;
  2. `case '<id>'` no switch do `App.tsx`;
  3. entrada no catálogo de `src/components/PageManager.tsx`.
  O menu em si é montado pelo Jean na UI de admin — o passo 3 só faz a página aparecer na
  lista de páginas disponíveis.
- **Uma página do menu ≠ um componente.** O menu vive na tabela `menu_pages` (montado pelo Jean
  na UI de admin) e cada linha aponta para um `template`. **Templates são reaproveitados**: hoje
  7 páginas usam `meeting-notes`, 4 usam `projects`, 4 `dashboard-head`, 3 `todo`/`todo-staff`/
  `senhas`, 2 `chamados-grapehub`. Os dados ficam isolados pelo `page_id` (= `activePage`), mas
  **título fixo dentro do componente aparece igual em todas as páginas que usam o template** —
  foi o bug de "Chamados CRM" exibindo a headline "Chamados Grapehub". Pegue o nome do menu com
  `findPageLabel(menu, activePage)` (em `App.tsx`) e passe como `pageLabel`.
- Autenticação: `authenticateToken` roda **antes do roteamento**. Logo, **401 não prova que a
  rota existe**. Para testar se uma rota subiu, 401 é sinal bom; 404 em HTML é sinal de que o
  servidor antigo ainda está no ar.
- O front usa `fetch` puro: `src/utils/authFetch.ts` sobrescreve `window.fetch` e injeta o
  Bearer do Firebase. Não monte header de Authorization à mão nas páginas.

## Banco — armadilhas reais (todas já custaram tempo)

- **`clients.id` é TEXT**, não INT. Tabela auxiliar com `client_id INT` faz a transação inteira
  dar rollback, e com `2>/dev/null` o erro some.
- **`users.uid` NÃO é o uid do Firebase** — é um slug do e-mail (`tiago_grapemidia_com`).
  A chave real para identificar alguém é o **e-mail** (`users.email`, único); é assim que o app
  resolve o usuário logado (`/api/users/profile/:email`). `collaborators.linked_user_id`
  aponta para `users.id` (um inteiro em texto), não para `uid`.
- **Data de competência difere por conta** em `fin_movements_asaas`: Asaas usa
  `transaction_date`; cartão (Sicredi, Asaas) usa `billing_month` — a fatura pertence ao mês em
  que é **paga**, não ao mês da compra. Toda query de DRE/relatório precisa das duas pernas.
- `product_catalog.name` tem UNIQUE: ao deduplicar, **apague os perdedores antes** de renomear
  o vencedor, senão colide.
- **Seed de boot não pode ser `ON CONFLICT DO NOTHING`.** `initializeDatabase()` roda a cada
  subida do servidor; um `INSERT ... ON CONFLICT (id) DO NOTHING` de dados que o usuário pode
  apagar pela UI ressuscita a linha no próximo restart — foi o caso da coluna "RECUPERADO" do
  quadro de Retenção (`retencao_columns`). Semeie com
  `INSERT ... SELECT ... WHERE NOT EXISTS (SELECT 1 FROM <tabela>)`, que só popula o estado
  inicial. Mesmo cuidado com listas fixas no front usadas como estado inicial: elas fazem o
  item apagado piscar na tela e parecer que voltou.
- **Dado de exemplo no front vira dado real no banco.** `ProjectsModule` usava um array
  `initialProjects` (Advocacia Silva, Clínica Sorriso, Tech Solutions… com responsáveis
  fictícios Lucas Lima, Ana Souza, Pedro Rocha, Mariana Costa) como fallback quando a API de
  projetos falhava — e os projetos-modelo acabaram gravados como clientes de verdade. O modal de
  novo parceiro ainda usava "Lucas Lima" como responsável padrão, sem oferecer o campo, e
  carimbou 7 clientes reais. Hoje: falha de carregamento mostra **lista vazia**, e o responsável
  padrão é o **dono da página** (`menu_pages.manager_id` → `page_manager_name` na API de
  projetos). Nunca use nome de pessoa inventado como fallback.
- `projects.responsible` é **texto livre**, não FK para `collaborators`. Quem sai da empresa
  continua como responsável até alguém reatribuir — confira contra `collaborators.status`.
- Antes de qualquer normalização em massa, crie tabela de backup (`<tabela>_backup_YYYYMMDD`)
  e confira o resultado antes de descartá-la.

## Armadilhas de front

- **`motion.div` anima valores de `style`.** Menu em portal posicionado via `style={{top,left}}`
  num `motion.div` entra deslizando da tela. Ponha `position/top/left/zIndex` numa `div` comum
  por fora e deixe só opacity/scale no `motion.div`.
- **Regex dentro de template literal de SQL**: `'^\d{4}'` vira `'^d{4}'` no Postgres e casa com
  zero linhas, silenciosamente. Use classes explícitas: `'^[0-9]{4}'`.
- Comentário JSX dentro de `{cond && (` quebra o build (TS1005) — ponha acima da condicional.
- Drag and drop: o padrão do projeto é **`@dnd-kit`** (core/sortable/utilities).

## Git — o `git` do shell está quebrado para rede

O shell tem `git` **aliasado para o do GitHub Desktop**, e o `--exec-path` dele resolve para
`//libexec/git-core` (caminho inválido). Operação local funciona; qualquer coisa de rede falha
com `git: 'remote-https' is not a git command`. Para push/fetch/clone use
**`/usr/bin/git`** ou `/opt/homebrew/bin/git`, que têm o helper.

## Proposta comercial — os preços são imagem, não código

- `PropostaDocument.tsx` monta 15 PNGs via `import.meta.glob('../assets/proposta/*.png')`.
  O único texto dinâmico é o nome do cliente na capa. **Preço não existe em código** — está
  nos pixels do `15.png`.
- **Há duas cópias do mesmo slide**, em repositórios diferentes. Mudou uma, mude a outra:
  `grapehub/src/assets/proposta/15.png` e
  `gerador-de-proposta-grape-mídia/proposta/public/imagens/15.png`.
- **Não troque "1.200" e "1.800" nos outros slides.** No slide 13, R$ 1.200 é a verba de
  tráfego recomendada (R$ 40 × 30 dias); no slide 14, R$ 1.800 é o que as *outras* agências
  cobram por tráfego, numa conta que fecha em R$ 4.650. São outra coisa.
- Caminho durável quando a tabela mudar: editar no Canva e substituir o PNG inteiro, em vez de
  cirurgia no pixel. Não há arquivo de design no repositório.
- No repositório do gerador, cuidado: **`node_modules` está versionado** (~9 mil arquivos) e o
  **`.env` não está no `.gitignore`**. Nunca use `git add .` lá — stage arquivo por arquivo.

## Deploy (produção, Hostinger)

Não há CI. O processo é manual e tem uma pegadinha:

1. `npm run build` gera `dist/` (front via Vite + `dist/server.js` via esbuild).
2. O `.gitignore` lista `dist`, **mas 43 arquivos de `dist` continuam rastreados** por terem
   sido commitados antes. Enquanto isso não for corrigido (`git rm -r --cached dist`), o
   `.gitignore` não tem efeito sobre eles.
3. A produção **builda o próprio front**, mas `dist/server.js` precisa ser substituído à mão.
4. **Trocar o arquivo não basta: é preciso reiniciar o processo.** O Node mantém o código em
   memória, então o servidor antigo continua respondendo.
   Sonda rápida: `GET /api/public/<qualquer-coisa>` devolve **HTML** no servidor antigo e
   **JSON 404** no novo.

## Integrações

- **Asaas** (`asaasFetch` → `https://api.asaas.com/v3`, header `access_token`). Só existe v3.
  Há um endpoint **não documentado** `/asaasCards` que devolve limite/disponível/dia de
  vencimento do cartão. **Não existe** endpoint de fatura/lançamentos do cartão — foi testado
  com ~30 variações de path, todas 404. Por isso a fatura entra por PDF (ver abaixo).
- **Firebase**: Auth (login dos colaboradores), Storage (uploads) e Admin SDK no servidor.
  Regras de Storage em `storage.rules` — **caminho novo exige regra nova**, senão o upload
  falha com permission-denied. Publicar com `npx firebase deploy --only storage`.
- **UAZAPI** para WhatsApp e **n8n** (webhook) para e-mail, no disparo de cobranças.
  O canal sai de `clients.billing_method`, que é texto livre — já foi normalizado para três
  valores canônicos. O seletor da UI grava **"E-mail"** com hífen; comparações precisam
  normalizar (upper + remover espaço/hífen) antes de decidir o canal.
- **Anthropic SDK** já instalado e em uso no servidor (`ANTHROPIC_API_KEY` no `.env`).

## Decisões em vigor

- **Fatura de cartão em PDF** (`src/routes/fatura-pdf.ts`): a fatura do cartão Asaas só sai em
  PDF, então o PDF vai para o Claude com saída estruturada e volta como lançamentos
  normalizados. Daí em diante usa o **mesmo** pipeline do CSV/OFX da Sicredi — impressão
  digital estável, prune do mês, categorização, DRE. OFX e CSV continuam em parser
  determinístico; **só PDF passa por IA**.
- **Contas de cartão** são um conjunto (`CARD_ACCOUNTS` em `src/routes/bills.ts`):
  `sicredi` e `asaas_cartao`. Ao mexer em query de DRE, categorização ou fatura, trate o
  conjunto, não a string `'sicredi'`.
- **Critérios de avaliação (Desempenho)**: os critérios são dinâmicos por cargo, em
  `performance_criteria`. Cada ciclo avaliado grava um **snapshot** em
  `collaborator_performance_cycles.notas` (JSONB) com label/ícone/cor congelados. Toda a aba
  Desempenho — cards, gráfico e histórico — é montada no front a partir desse snapshot, não do
  `/resumo`. Por isso `GET /api/colaboradores/:id/desempenho` **re-resolve** label, descrição,
  ícone e cor pelo `criterio_id` na tabela atual: renomear um critério passa a refletir em todo
  o histórico. A **nota nunca é tocada**, e o snapshot segue como fallback para critério
  apagado ou avaliação legada (`criterio_id` negativo, colunas `nota_*`).
  **Cuidado com médias vindas das colunas legadas**: `nota_campanhas/grapehub/reunioes/tmr`
  estão NULAS em todo ciclo novo, então qualquer `SUM(...)/4` sobre elas devolve vazio. Quem
  ainda faz isso: `GET /api/colaboradores/:id/desempenho/resumo` (já sem consumidor no front) e
  as médias de liderados em Minha Equipe e no motor de alertas (`server.ts`, buscar
  `nota_tmr`). Calcule a partir de `notas` (JSONB).

- **Central de Treinamentos** (`src/pages/Cursos.tsx`, `src/routes/cursos.ts`): curso → módulos
  → aulas em vídeo, com progresso por colaborador. O progresso é gravado pelo **e-mail do
  token**, nunca pelo corpo da requisição, e só conta avanço contínuo de reprodução (arrastar a
  barra não conclui a aula). Pendente: atribuição de trilha por cargo (tabela
  `course_assignments` existe, falta a tela), prazo e certificado.

## Como trabalhar aqui

- Português do Brasil. Conclusão primeiro, resposta curta, número antes de opinião.
- **Não commitar nem dar push sem pedido explícito.**
- Antes de opinar sobre marketing, comercial, criativo, campanha, oferta, funil, verba, métrica,
  proposta ou precificação: consultar o Segundo Cérebro em
  `/Users/convidado/Desktop/ML MARKETING` (regras em `CLAUDE.md` de lá) e abrir a resposta com o
  lastro — ID, status, confiança, métrica, amostra e data.
- Ao mexer em algo que afeta dinheiro (DRE, cobrança, fatura), valide com query real no banco e
  mostre o número, não só o código.
