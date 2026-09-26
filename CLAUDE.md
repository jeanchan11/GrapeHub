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
- **Recarregar depois de editar uma linha não pode ligar o `loading`.** Nas tabelas que trocam
  o conteúdo por spinner, isso desmonta as linhas, refaz a animação de entrada e joga a rolagem
  para o topo — em Contas a Pagar, categorizar a fatura linha a linha virava "refresh" a cada
  clique. Atualize a linha com o que o PATCH devolveu e refaça o fetch com `{ silencioso: true }`
  (`fetchSicredi`, `fetchEntries`). `loading` só para troca de mês/conta e upload.

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
  **Aba errada apaga dado**: a importação faz *prune* — remove do mês/conta tudo que
  não está no arquivo novo (`DELETE … WHERE account=$3 AND billing_month=$1 AND
  asaas_id <> ALL(...)`). Em 25/09/2026 a fatura do Asaas foi importada na aba
  Sicredi; a próxima fatura real do Sicredi do mês teria apagado os 11 itens em
  silêncio. Hoje a extração devolve `emissor` (asaas/sicredi/outro) e o servidor
  **recusa** o PDF antes de gravar quando o emissor não bate com a aba ('outro' não
  bloqueia). Para mover lançamentos de cartão entre contas, troque `account` **e** o
  prefixo do `asaas_id` (`${account}_${fitid}`); o `fitid` do PDF é
  md5(data+descrição+valor+cartão) e **não** inclui a conta, então o resultado fica
  idêntico a uma importação feita na aba certa.
- **Fatura: conferência e importação reversível** (`src/routes/fatura-versoes.ts`, 26/09/2026).
  (1) PDF: a soma dos itens lidos tem de bater com o total impresso (tolerância R$ 0,05);
  divergiu → 409, nada gravado, e a tela pergunta "importar mesmo assim" — o reenvio usa a
  extração em cache por 30 min (não paga outra leitura). (2) Toda importação de cartão
  (PDF, CSV, OFX) grava antes uma FOTO em `fin_card_imports` (linhas do mês + linhas do
  arquivo em qualquer mês + data de pagamento). Só a mais recente de cada cartão/mês pode
  ser desfeita. Restauração é **upsert pelo id**, nunca delete+insert: 50 linhas de
  `fin_recurring_bill_entries` apontam para lançamentos (FK sem cascade). Testado em
  transação com rollback: o mês volta idêntico (hash de todas as colunas igual).

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

- **Som ambiente do Estúdio** (`src/routes/estudio-mix.ts`): a MiniMax **não gera
  ambiência**. O `/v1/t2a_v2` só tem `voice_modify.sound_effects`
  (`spacious_echo`, `auditorium_echo`, `lofi_telephone`, `robotic`), que é efeito
  aplicado **na voz** e sem controle de volume — nada de trânsito, pássaro ou
  gente ao fundo. A cama de som é arquivo do catálogo (`estudio.ambiences`,
  subido pelo superadmin em `estudio/ambiencias/`) e a mixagem é nossa, por
  ffmpeg. Duas regras que custaram medição:
  1. **`normalize=0` no `amix` é obrigatório** — sem ele o filtro divide o ganho
     pelo número de entradas e a voz sai pela metade. Medido: voz limpa
     −21,5 dB → mixada −21,7 dB (pico sobe de −18,9 para −14,2 dB a 0,25).
  2. **A ambiência entra DEPOIS do HeyGen**, sobre o mp4 pronto (`-c:v copy`,
     ~30 ms). O HeyGen tira o lip sync do áudio que recebe, então ele recebe a
     **voz limpa**; o `mix_url` do `audio_job` é só o que a pessoa ouve e baixa.
     Mixar antes obrigaria a re-renderizar — e gastar crédito — a cada ajuste de
     volume.
  O binário é resolvido por `FFMPEG_PATH` → `node_modules/ffmpeg-static/ffmpeg`
  → PATH. **Não use `require('ffmpeg-static')`**: o servidor é empacotado pelo
  esbuild e o require some conforme o formato de saída.

- **Crédito saiu do Estúdio; o que conta é dinheiro.** O `plan_credit: 85` do
  HeyGen não tem relação com a cobrança da API, que sai de uma **carteira em
  dólar** por minuto de render. Cada vídeo grava `video_jobs.custo_usd`
  **congelado na criação** (duração do áudio × preço do minuto da engine): preço
  e câmbio mudam, e um relatório que se recalcula sozinho reescreveria o
  passado. `GET /api/estudio/gastos?de=&ate=` devolve o gasto do período em US$
  e R$, a quebra por pessoa e a `pct` do teto — **`pct` só vem quando o período
  é um mês inteiro**, porque o teto é mensal e comparar 10 dias com ele mentiria.
  Preço/minuto por engine, câmbio e teto ficam em `estudio.settings`
  (Configurações › Gastos). Medição que ancora tudo: **US$ 2,33/min no Avatar
  IV** — um vídeo de 30 s custou US$ 1,17 na carteira, e o cálculo do backfill
  devolveu US$ 1,1687 para esse mesmo vídeo. **III e V nunca foram medidos** e
  herdaram o número do IV. A cota por head virou `modo='valor'` (reais) —
  ninguém tinha limite em crédito configurado, todos em zero.
  **Os dois tetos barram de verdade**, conferidos em `POST /api/estudio/videos`
  ANTES de subir o asset: o da conta (`teto_mensal_brl`) vale para todo mundo,
  superadmin incluído, e o de cada head vale por cima. A checagem soma o custo
  do vídeo que está para ser gerado, porque o HeyGen **cobra no envio** — barrar
  depois seria barrar com o dinheiro já gasto.

- **Quem decide que o vídeo do Estúdio ficou pronto é o polling, não o webhook.**
  Sem `PUBLIC_BASE_URL` o `callback_url` do HeyGen não tem para onde chegar, e
  mesmo com ele o aviso pode se perder. A varredura roda a cada **20 s** e a
  lista (`GET /api/estudio/videos`) cutuca os pendentes sem esperar o resultado —
  `concluirVideo` baixa o mp4, mixa a ambiência e sobe para o Storage, e segurar
  a resposta HTTP nisso travaria a tela por dezenas de segundos. Havia uma
  **carência de 3 minutos** antes da primeira consulta somada a um intervalo de
  2 min: os quatro primeiros vídeos gerados levaram 233, 267, 270 e 281 s entre
  criação e conclusão — regularidade que era a nossa espera, não o tempo de
  render (um vídeo de 8 s fica pronto no HeyGen em menos de um minuto). Ao mexer
  aqui, mantenha as duas travas: `conferindo` (um job por vez) e a janela mínima
  de 8 s por job, senão varredura e tela concluem o mesmo vídeo em paralelo.

- **Contrato assinado pelo ZapSign** (`src/routes/zapsign.ts`, `ContratoTab.tsx`):
  o PDF é montado **no navegador** (`contratoPdfBase64` em `ContratoDocument.tsx`)
  e vai em base64 para o servidor, que chama `POST api.zapsign.com.br/api/v1/docs/`
  com `Authorization: Bearer $ZAPSIGN_API_TOKEN`. O token nunca vai ao front.
  Decisões tomadas em 23/09/2026, com a base na mão (375 leads: 374 com
  telefone, 313 com e-mail):
  - **Dois signatários, em ordem** (`signature_order_active`): cliente primeiro,
    Grape depois — o link da Grape só vale após o cliente assinar. A Grape sai
    de `ZAPSIGN_SIGNER_EMAIL`/`_NAME`; sem essas variáveis, volta a UM
    signatário e nada quebra. **`ZAPSIGN_USER_TOKEN` é outra coisa**: só com ele
    a Grape assina SOZINHA, via `POST /sign/`, e isso exige o **add-on de
    assinatura em lote** no plano — quando não está contratado, a opção
    "assinar via API" nem aparece no perfil do usuário no ZapSign. O código da
    assinatura automática está pronto e inerte até a variável ser preenchida.
  - **Nada de disparo automático** (`send_automatic_whatsapp/email: false`,
    `disable_signer_emails: true`): a tela devolve o `sign_url` e o closer manda
    no WhatsApp junto da mensagem dele.
  - `auth_mode: 'assinaturaTela-tokenWhatsapp'` — assina na tela E confirma com
    código no WhatsApp. Por isso `phone_country`/`phone_number` são
    **obrigatórios**, e o telefone é normalizado no servidor (tira o 55 e o zero
    de operadora; aceita 10 ou 11 dígitos).
  - O `base64_pdf` vai **sem** o prefixo `data:application/pdf;base64,` — a API
    recusa se ele vier junto.
  - `blank_email: true` no cliente: sem isso o ZapSign **exige e-mail** na tela
    de identidade, o que travaria os 62 de 375 leads sem e-mail. `lock_phone`
    impede o signatário de trocar o número para onde vai o código.
  - **Posicionar a assinatura**: o PDF é rasterizado (páginas viram imagem), então
    texto-âncora (`<<signer1>>`) não funciona — é `POST /docs/{token}/place-signatures/`
    com coordenadas **relativas** (0–100, a partir do canto inferior esquerdo,
    página começando em 0). As duas rubricas vão na MESMA chamada: o endpoint
    substitui o conjunto inteiro. Não é retroativo — só vale para quem assinar
    depois. O front mede a **linha** de assinatura (`[data-assinatura-cliente]`
    / `[data-assinatura-grape]`) e converte para %, o que dispensa DPI.
    **Armadilha que custou um contrato assinado errado**: `ContratoDocument`
    renderiza tudo DUAS vezes — há um container de medição fora da tela para
    calcular a paginação. `querySelector` pegava a cópia escondida, que não
    pertence a página nenhuma, a medição virava `null` em silêncio e nenhuma
    coordenada era enviada. Filtre sempre pelas que estão dentro de
    `[data-contrato-page]`.
  Status: enquanto não houver webhook, quem descobre que o cliente assinou é o
  botão "Atualizar status", que consulta `GET /docs/{token}/`. O `signed_file` e
  os links de arquivo do ZapSign **expiram em 60 min** — reconsulte, não guarde.
  O formulário do ZapSign que o cliente preenchia (CLIENTE/TIPO/CNPJ/VALOR/data)
  deixa de ser necessário: quem preenche é o closer, no CRM.

- **Extrato: `grapehub_category` mente, `raw_grapehub_category` não.** A API do
  extrato (`server.ts`, `TRANSACTION_LABELS`) preenche `grapehub_category` com um
  rótulo derivado do **tipo da transação no Asaas** quando o lançamento não tem
  categoria: `TRANSFER` → "Transferência", e o que não está no mapa sai cru
  (`INVOICE_FEE`). Na tela parecia classificado; no banco estava sem categoria e
  **fora do DRE**. Medido em setembro/2026: 38 lançamentos, R$ 5.721,34 (11 Pix a
  terceiros como "Transferência", R$ 1.813,88). Para saber se há categoria de
  verdade, use `raw_grapehub_category`/`custom_category` — é o que a pílula e a
  aba **Conciliar** do Extrato usam. O `ASAAS_CARD_BILL_PAYMENT` (pagamento da
  fatura do cartão) também cai lá, e é correto ficar fora do DRE como despesa: os
  gastos já entram pela fatura, contar o pagamento duplicaria.
  **Conciliação manual** (`src/components/ModalConciliacao.tsx`): grava descrição
  e categoria numa só chamada (`PATCH /api/financeiro/extrato/:id`) com
  `custom_category_id` e `edited_by` = e-mail da pessoa. É o que a protege dos
  motores automáticos: o de `bills.ts` só reprocessa `custom_category_id IS NULL`
  ou `edited_by IN ('regra-auto','motor-auto')`, e o `autoApplyReconciliationRules`
  só toca `custom_category IS NULL`. **Exceção**: o botão manual de aplicar regras
  (`POST /api/fin-reconciliation-rules/apply`) casa pela descrição **sem guarda
  nenhuma** e sobrescreve o que a pessoa conciliou — uma regra larga demais
  apaga conciliação manual.
  **Pares estornados não entram na conciliação.** O sync casa Pix devolvido
  (`PIX_TRANSACTION_DEBIT_REFUND`, pelo `pixTransactionId`) e pagamento de conta
  cancelado (`BILL_PAYMENT_CANCELLED`, pelo `billId`) com o débito original e marca
  os DOIS `is_reversed_pair=true`; o DRE e o Fluxo ignoram o par. O Conciliar listava
  esses créditos como pendentes (7 dos 10 em 25/09/2026) — agora filtra
  `is_reversed_pair` e `is_anticipation_pair`. Categoria posta num lado do par não muda
  número nenhum.

- **Extrato traz os cartões pelo mês da fatura** (decisão do Jean, 25/09/2026). Com
  `account=all` (o que a página pede), `/api/financeiro/extrato` devolve a conta Asaas
  por `transaction_date` **e** os itens de `CARD_ACCOUNTS` por `billing_month` — mesmo
  critério do DRE, para o filtro de categorias (árvore do plano,
  `FiltroCategoriasDRE.tsx`) bater com ele. Conferido em setembro: 02.02 = −10.285,51 e
  02.03 = −32.340,19 nos dois. Sem `account`, a rota segue só Asaas (o Dashboard usa
  assim). Com cartão na tela, o **pagamento da fatura** (`ASAAS_CARD_BILL_PAYMENT`) sai
  dos totais e das somas por categoria — senão o mesmo gasto conta duas vezes. Idem
  para **toda categoria 99**: a fatura do Sicredi é paga com Pix da conta Asaas para a
  conta Sicredi (R$ 24.750 em 18/09/2026, mesmo dia do `payment_date` da fatura).
  **Pagamento de fatura e Pix entre contas vão na 99**, nunca em conta 04: em 25/09/2026
  havia uma categoria criada à mão, 04.04.100 "transferencia entre contas", que fazia o
  DRE de setembro contar R$ 28.644,72 de despesa a mais. Os dois lançamentos foram para a
  99 e a categoria foi apagada (backups `*_backup_20260925_transf`).

- **Motor de categorização (`categorizeMovements`, `bills.ts`): tipo antes do
  texto, e trava de natureza.** As regras são regex sobre a descrição, e a
  descrição carrega o **nome do cliente** — que aqui é escritório de advocacia.
  `/honorario|advogad|juridic/` jogou 10 antecipações de fatura (R$ 13.229,60 de
  receita, jan–set/2026) e 7 taxas de NF na despesa **02.06.04 Honorários
  Advogado**, que aparecia VERDE no DRE. Agora: (1) `transaction_type` decide
  primeiro — `RECEIVABLE_ANTICIPATION_GROSS_CREDIT` → 01.01.01,
  `INVOICE_FEE` → 02.07.100; (2) regra nenhuma põe entrada (`type=1`) em conta
  02/04/05 nem saída (`type=-1`) em 01/03 — nesses casos o lançamento fica sem
  categoria e vai para Conciliar. **Direção é a coluna `type`**; `value` é sempre
  positivo. Exceção legítima que a trava deixa para a conciliação manual:
  **estorno** de despesa (ex.: crédito do Google de R$ 46,87 em 02.02.06), que é
  entrada numa conta de despesa e está certo. Os 17 foram corrigidos com backup em
  `fin_movements_asaas_backup_20260925` e marcados `edited_by='correcao-20260925'`
  — marca que nenhum motor reprocessa; com `motor-auto`, o motor antigo da
  produção os devolveria para Honorários no próximo sync, antes do deploy.
  **Regras fixas por decisão do Jean (25/09/2026)**: IOF → **02.02.100 IOF
  ferramentas** (antes 02.07.99 Outras Despesas Financeiras) e Google Cloud →
  **02.02.10 Custos de IA** (antes caía na regra genérica de `google`, 02.02.06 —
  por isso a regra de Google Cloud fica na linha de IA, antes da de ferramentas).
  Histórico corrigido: 64 IOF (R$ 382,02) e 8 Google Cloud (R$ 2.205,13), backup em
  `fin_movements_asaas_backup_20260925_iof`, mesma marca `correcao-20260925`.

- **Categoria só em texto não entra no DRE.** O DRE agrupa por
  `custom_category_id`; o texto (`custom_category`/`grapehub_category`) é só
  exibição. O "Editar Lançamento" do cartão (`PATCH /api/fin/bills/sicredi/:id`)
  gravava só o texto, de uma lista própria da tela (Aluguel, Marketing…) que nem
  existe no plano — 12 lançamentos de abril/2026 (R$ 2.463,15) apareciam
  categorizados e ficavam fora do DRE (corrigidos; backup em
  `fin_movements_asaas_backup_20260925_catcartao`). Hoje o endpoint recebe
  `custom_category_id`, busca o nome no plano (não confia no texto da tela) e
  marca `edited_by` com o e-mail. **Toda tela que categoriza precisa gravar o id** —
  use `SeletorCategoria` (formulário) ou `CategoriaDreInline` (pílula clicável em
  tabela, menu em portal), ambos em `src/components/SeletorCategoriaDRE.tsx`.

- **Fechamento do mês com trava** (`src/routes/fechamento.ts`, aba Fechamento do DFC, 26/09/2026).
  Conferências que **bloqueiam**: lançamento sem categoria; pagamento de fatura fora da 99;
  saldo do Asaas não fecha com os lançamentos (cadeia pela coluna `balance`: início = "antes"
  que não é "depois" de ninguém, fim = o inverso); fatura do cartão Asaas paga e não
  importada. **Avisam**: conferência de PDF divergente, natureza invertida, contas a pagar do
  mês em aberto. Só superadmin fecha/reabre (reabrir exige motivo; tudo em
  `fin_month_closing_log`). Os totais do DFC ficam congelados em `fin_month_closings.totais`.
  **A trava é um gatilho** (`trg_fin_trava_mes_fechado` em `fin_movements_asaas`) que
  **desfaz em silêncio** mudança de categoria/valor/tipo/data/mês da fatura/conta/pares num
  mês fechado e registra em `fin_month_lock_log` — não dá erro de propósito: a produção roda
  código antigo e a rotina de antecipações zera e remarca os pares de TODOS os meses a cada
  5 min; com erro ela quebraria. As rotas de edição conferem antes e devolvem **423** com o
  motivo; as rotinas em lote usam `foraDeMesFechado()`. Livre em mês fechado: descrição,
  comentário, vínculo com conta a pagar, dados do sync, e lançamento NOVO da conta Asaas
  (banco é a verdade — a tela conta "+N depois"). Cartão novo em mês fechado não entra.
  Achado ao testar: **junho/2026 não fecha o saldo — faltam R$ 2.396,02 de movimentação**
  gravada (jul–set fecham no centavo).

- **A página "DRE" virou "DFC"** (26/09/2026, `menu_pages.label`): o relatório é regime de
  caixa. Ids internos ficaram (`financeiro-dre`, `/api/financeiro/dre`, `Dre*.tsx`).
- **Alerta de custo subindo** (`src/lib/alertasCusto.ts`, aba Despesas do DFC + contador na
  aba): categoria folha do grupo em foco, mês × média dos até 3 anteriores; alerta quando sobe
  ≥ 25% **e** ≥ R$ 300 (ou custo novo ≥ R$ 300). Sai das linhas do `/api/financeiro/dre`.
  Setembro/2026 contra jun–ago: 7 alertas, +R$ 9.111 (Material de Escritório +R$ 2.784,
  Custos de IA +R$ 2.131…). **O sino de Notificações da Sidebar é falso**: `badge: 12`
  fixo no código, sem fonte — não serve para alertas até ganhar backend.

- **Fluxo de Caixa: a linha de saldo é o banco, não o DRE** (`/api/financeiro/fluxo-diario`).
  O saldo inicial do mês é calculado de trás para frente a partir do saldo real do Asaas
  (`/finance/balance`), então **todo** movimento da conta tem de entrar nessa conta —
  inclusive transferência entre contas. O filtro por `custom_category = 'transferencia entre
  contas'` estava ali e, quando o pagamento da fatura (R$ 3.894,72) e um Pix para a própria
  Grape (R$ 24.750) foram classificados assim em 25/09/2026, a curva de setembro caiu
  R$ 28.644,72 e mostrou caixa negativo (mínimo real do mês: R$ 1.432,90 intradiário,
  R$ 7.885,95 no fechamento de 08/09). Hoje: transferência entre contas sai das **barras** e
  volta pelo campo `transferencias` na linha; o **pagamento da fatura do cartão**
  (`ASAAS_CARD_BILL_PAYMENT`) conta como **saída** no fluxo — no DRE fica fora, porque os
  itens da fatura já entram. Conferência: a coluna `balance` de cada movimento é o saldo do
  Asaas depois dele; a curva tem de bater com ela dia a dia.

- **Aba Despesas do DRE** (`DreDespesas.tsx` → `DespesasPorCategoria.tsx`; grupos 02/04/05): os valores dos
  níveis (02 → 02.xx → 02.xx.yy) saem das linhas do próprio `/api/financeiro/dre`, então
  batem com a tabela inclusive nos meses do Marvee. O popup de lançamentos usa
  `GET /api/financeiro/dre/lancamentos?structure=&de=&ate=` (`src/routes/dre-lancamentos.ts`),
  com o mesmo critério do DRE ao vivo — conferido: 02.02 set/26 = −10.285,51 e 02 jul–set =
  −212.695,16 nos dois. Em mês histórico o DRE usa o número importado e a lista pode não
  fechar; o popup avisa.

- **Conta a pagar conciliada leva a categoria para o extrato** (`src/routes/bill-category.ts`).
  Antes, conciliar em Contas a Pagar só marcava a conta como paga e ligava ao
  lançamento: o lançamento ficava SEM categoria e fora do DRE (medido: 13 de 120
  vinculados, R$ 1.891,80). Não dava para copiar `fin_bills.category`, porque é
  uma lista própria da tela ("Utilidades", "Impostos", "Serviços") e nenhum nome
  existia no plano de contas. Agora `fin_bills.category_id` aponta para
  `fin_categories`, e os três caminhos que ligam conta a lançamento herdam essa
  categoria: a conciliação automática (`reconcileBills`), o vínculo manual
  (`/entries/:id/link`, **mantido**) e a edição da conta, que é **retroativa**
  (definiu a categoria, os pagamentos antigos entram no DRE). A herança
  sobrescreve lançamento sem categoria, de regra (`regra-auto`) e de motor
  (`motor-auto`) — a conta é um mapeamento específico, a regra é palavra-chave —,
  mas **nunca** a categoria escolhida por uma pessoa.

- **Telefonia foi REMOVIDA do GrapeHub** (24/09/2026). Saíram: a página Ligações
  (`CrmLigacoes.tsx`), o softphone WebRTC (`useSoftphone.ts`, JsSIP), o botão
  "Ligar" e a aba Ligações do card do lead, a seção Integrações das
  Configurações e as 11 rotas da Api4Com (`/api/api4com/*` e
  `/api/crm-comercial/call-status`). **O que ficou de propósito**: o tipo de
  tarefa **"Ligação"** no CRM — é tarefa, não telefonia.
  Dois detalhes que evitariam retrabalho: o `server.ts` tinha um seed de boot com
  `INSERT ... ON CONFLICT (id) DO UPDATE` que **ressuscitava a página no menu a
  cada restart** (a armadilha de seed já documentada aqui), e o id semeado
  (`crm-ligacoes`) **não era o da linha real** (`ligacoes`) — apagar pelo id do
  seed não removia nada. Os dados não foram destruídos:
  `crm_api4com_settings` e `crm_comercial_call_status` viraram
  `*_backup_20260924`. Para reverter de vez, é só dropá-las.

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
