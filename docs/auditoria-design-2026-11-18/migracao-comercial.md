# Migração de design — área Comercial (18/11/2026)

Feito em três frentes paralelas, cada uma em arquivos separados: A = CrmComercial.tsx; B = CrmMetas, MetasPopup, AIChat, Atividades, Automacoes; C = o restante. Todos os 21 arquivos dão 200 no curl. Nenhum arquivo da base nem de outra área foi tocado. Nenhum commit.

## Resultado do tsc (filtrado pelos 21 arquivos)
`npx tsc --noEmit -p .` rodado duas vezes (saídas em `tsc-comercial.txt` e `tsc-comercial-2.txt`, nesta pasta).
- 1ª rodada: **3 erros novos**, todos corrigidos com tipo explícito, sem mudar comportamento:
  - CrmMetricas.tsx: `<Abas>` inferia `string`; agora é `<Abas<typeof activeTab>>`.
  - CrmComercial.tsx (abas das Configurações): mesmo problema; agora é `<Abas<typeof settingsTab>>`.
  - CrmComercial.tsx: `React.cloneElement(taskIcon as React.ReactElement<any>, { size: 18 })`. A cópia de backup já usava o mesmo cast sem `<any>`, mas havia um `style` junto.
- 2ª rodada: **sobraram 22 linhas, todas anteriores à migração**. Conferi contra `../grapehub-backup-design-20261118/`:
  - Atividades.tsx:630, ActivityCard sem `onDelete`/`onEdit` (era a linha 628 no backup).
  - CrmComercial.tsx: 17× `User.name`/`id`/`avatar`, `setNewColumnData` (5041) e `UserData.nome` (6519).
  - MarketingDashboard.tsx:133, `inRange` do seletor de datas, que não foi tocado.

# Migração de design — src/pages/CrmComercial.tsx (fork A, 18/11/2026)

Só este arquivo. `curl http://localhost:3000/src/pages/CrmComercial.tsx` = 200 depois de cada bloco.
tsc completo não rodado aqui (fica com o coordenador). Diff: 242 linhas a mais, 324 a menos.

## Popups migrados para `<Modal>` (9 feitos à mão → Modal)

| popup | fecharAoClicarFora | por quê |
|---|---|---|
| Card do lead (`LeadDetailModal`) | true (padrão) | já fechava clicando fora. `semCabecalho semPadding`, `max-w-7xl`, `h-[90vh] !my-0`. Ganhou Esc, mas **Esc fica desligado enquanto houver popup interno aberto** (`popupInternoAberto`: nova atividade, sequência, modelo, padrão do checklist, detalhe da tarefa, reunião, imagem) e enquanto "Gerenciar modelos" está aberto por cima (prop nova `bloquearEsc`) — senão Esc fecharia o card junto. |
| Aplicar Sequência (dentro do card) | true | lista de escolha, já fechava |
| Selecionar modelo (dentro do card) | true | idem |
| Padrão de Tarefas / editor do checklist | **false** | formulário: fechar perderia a edição (antes fechava) |
| Detalhes da Tarefa | true | só leitura; mantido `{taskDetailPopup && <Modal isOpen>}` porque o miolo lê o objeto |
| Adicionar Reunião | **false** | formulário (antes fechava) |
| Visualizar imagem | true | já fechava; Modal sem caixa (`!bg-transparent !border-0 !shadow-none`) |
| Gerenciar Kanbans | true | já fechava; virou `title=` padrão. Input de renomear tem `data-segura-esc` (Esc cancela a edição sem fechar o popup) |
| Gerenciar modelos (tarefas recorrentes) | **false** | não fechava clicando fora — preservado. `fecharComEsc` só na lista (no editor perderia o que foi digitado) |
| Configurações do CRM | true | já fechava; cada bloco tem botão próprio de salvar. Virou `title`+`icon` padrão; z-[99999] → z-[1000] do Modal |

Modais que já eram `<Modal>` (7): só "Novo Lead" ganhou `fecharAoClicarFora={false}` (formulário de vários campos).
Nova Coluna / Editar Coluna / Novo Kanban (1–2 campos), Comentários, Histórico e Excluir Coluna seguem fechando clicando fora.

`PlainMenu` (menu do arquivo) ganhou `data-segura-esc` enquanto aberto: Esc fecha só o menu, não o popup em volta.

Não migrado: comemoração "NEGÓCIO GANHO" (exceção intencional) — só tirei o 🔥 do título.

## Abas
- Card do lead: 7 abas → `<Abas>` (sublinhado).
- Configurações do CRM: Webhook | Motivos de Perda → `<Abas>` (sublinhado). O estado aceita 'sequencias' (não exibido); mapeado para 'webhook' só na exibição.

## Título
- Página usa `PageHeader` (já 2xl via design-system). Nada a mudar.

## Carregamento / vazio
- Quadro: estado novo `carregandoQuadro` (useState(true) → false no `finally` do `fetchData` existente, ou no `fetchKanbans` quando não há kanban/erro). Mostra `<CarregandoBloco>` no lugar do quadro vazio só na 1ª carga.
- "Carregando anotações…" e "Carregando reuniões…" (Loader2 32px + texto) → `<CarregandoBloco />`.
- Vazios → `<EstadoVazio>`: "Nenhum modelo cadastrado", "Nenhum motivo cadastrado ainda." (era 📋).

## Cores / tema claro / botões
- `dark:border-[#1A1625]` ×6 e `dark:border-[#15121E]` ×2 → `dark:border-dark-card`; `bg-[#F8F9FA]` ×2 → `bg-slate-50`.
- Timeline: ~14 `style={{ color/background }}` inline → classes (`text-slate-400`, `text-slate-500 dark:text-slate-400`, `bg-violet-500/10`, `bg-emerald-500/10`/`bg-rose-500/10`, `bg-black/[0.03] dark:bg-white/[0.03]`).
- Configurações: `dark:border-[#2d2b3d]` ×4, `dark:text-[#6b7280|#4b5563|#9ca3af]` ×8 → tokens; 3 botões `style={{background:'#7c3aed'}}` → `bg-violet-600 hover:bg-violet-700`; borda inline do input de edição → `border-violet-600`; bolinha `#ef4444` → `bg-rose-500`.
- "Salvar URL" do webhook de formulário: azul → violeta (cartão, ícone, foco e hover também).
- Botões violeta-500 → violet-600/700 (Padrão de Tarefas, Novo Modelo, Criar/Salvar Modelo); hover azul do editar modelo → violeta.
- Divisor e borda do menu de perda `border-white/10` → `border-black/10 dark:border-white/10`; hover `hover:bg-white/5` → com variante clara.
- Anel de cor selecionada (Nova/Editar Coluna) `ring-white ring-offset-[#0A0A0A]` → `ring-violet-500 ring-offset-dark-card`.
- Cor de progresso de meta: vermelho `#ef4444` → `#f43f5e` (rose-500).
- Sombras coloridas removidas: Ganhar/Perda do card, "Adicionar" tarefa, botões de nota/reunião, Salvar Reunião, Concluir tarefa, ícones dos kanbans (`shadow-*-500/50`), pílulas da movimentação de ganho, hover das linhas de tarefa.
- Botões X dos popups: `p-2 rounded-lg text-slate-500 hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5`.

## Emojis
- 💬 📝 📥 → `MessageCircle`, `FileText`, `Inbox`; 📋 (vazio) → `ClipboardList`; ✏️ 🗑 → `Pencil`, `Trash2`.
- "✨ Editar Integração/Roteamento" ×3 → ícone `Check` verde.
- "CONQUISTA! 🏆" → `Trophy` + texto; "Gatilho de WhatsApp acionado ✅" (texto de reserva na tela) sem emoji; "Configure em ⚙️" → texto; ✓/✕ da ligação → `Check`/`X`; "⏱ Duração" → "Duração"; 🔥 do nome do kanban comercial (Gerenciar Kanbans) removido; 🔥 da comemoração removido.

## Animação
- `framer-motion` → `motion/react`.
- Selo de ganho do card: `animate-pulse` removido.
- Contador do widget de meta: 2,5 s → 0,8 s.
- Cascata do quadro: `colIdx*0.07 + cardIdx*0.05` → `Math.min(i,8)*0.04` (colunas e cards).
- `animate-in … slide-in-from-top-2` ×3 (não funciona no CDN) removidos; os `animate-in zoom-in-95` dos popups saíram com a migração.
- Coluna do kanban `rounded-3xl` → `rounded-2xl`.

## O que NÃO fiz e por quê
- **"❌ Lead marcado como perdido"** (`handleLoseLead`): o texto é GRAVADO no histórico do lead (`/history`). O guia proíbe mudar o que é salvo — mantido.
- **Função de cor de meta copiada 3×** (aqui, CrmMetas, MetasPopup): extrair para `src/lib` exige arquivo novo fora da área — só troquei o vermelho por rose-500 aqui.
- Cores de etiqueta/origem/seletor de cor (`#3b82f6`, `#f97316`…): são dado/escolha do usuário, não tema.
- Sombras suaves do card ganho/perdido (`shadow-[0_4px_15px_rgba(...,0.1)]`): mantidas (tom 8–10%, não neon).
- `transition-all` restantes (48): nenhum em linha de tabela grande; não mexi.
- Não consegui conferir no navegador: o painel abre na tela de login (sem sessão). Só a compilação (curl 200).

## Pendências para o coordenador (base)
1. **Esc com popups empilhados**: `ui/Modal` registra o Esc no `window` e usa `stopPropagation`, que não impede outros listeners do mesmo `window`. O primeiro Modal aberto escuta primeiro, então Esc num popup por cima fecha o de baixo também. Contornei no card do lead (Esc desligado enquanto há popup interno), mas o mesmo acontece com o `confirmDialog` (`src/lib/confirm.tsx`, que também escuta Esc no window): Esc numa confirmação aberta sobre um Modal fecha o Modal junto. Correção certa é na base (pilha de modais ou `stopImmediatePropagation` + registro em captura pelo mais recente).
2. `NovaAtividadeModal` (Atividades.tsx, outra área) já está em `<Modal fecharAoClicarFora={false}>`; o card do lead considera ele no bloqueio de Esc.

# Migração de design — Comercial, parte B (18/11/2026)

Arquivos: CrmMetas.tsx, MetasPopup.tsx, AIChat/AIChat.tsx, Atividades.tsx, Automacoes.tsx.
Todos devolvem 200 no `curl http://localhost:3000/<arquivo>`. tsc completo NÃO rodado (fica com o coordenador).

## src/pages/CrmMetas.tsx
- **Popup**: o wizard de meta (`fixed inset-0 z-50 bg-black/50`) virou `<Modal isOpen={showModal} semCabecalho semPadding maxWidth="max-w-lg" fecharAoClicarFora={false}>`.
  `false` porque o original NÃO fechava clicando fora e é formulário de 2 passos. Ganhou Esc, portal, desfoque e animação.
- **Título**: `SplitHeadline` sem `className`/`subtitleClassName` (padrão 2xl, `text-dark-text`).
- **Carregamento**: `LoadingSpinner` em div própria → `<CarregandoPagina />`.
- **Vazio**: bloco próprio → `<EstadoVazio Icone={Target} … acao={Criar primeira meta}>`.
- **Botões**: "Nova Meta" e "Criar primeira meta" → `designSystem.button.principal`; atualizar com borda `border-black/10 dark:border-white/10`.
- **Cartões**: `bg-white dark:bg-dark-card border-slate-200 dark:border-white/5` → `bg-dark-card border-black/10 dark:border-white/10`.
- **Números**: valor atual (`text-3xl`/`text-4xl font-black`) com classe `numero`.
- **Cor**: `getProgressColor` vermelho `#ef4444` → rose-500 `#f43f5e` (os outros três já eram emerald/amber/violet-500).

## src/components/MetasPopup.tsx
- **Popup 1 (Metas)**: overlay inline `rgba(0,0,0,.55)` + painel → `<Modal isOpen={isOpen} semCabecalho semPadding maxWidth="max-w-4xl" className="max-h-[85vh]" fecharComEsc={!showModal}>`.
  Clique fora: **true** (já fechava). Esc é desligado enquanto o wizard está aberto, para o Esc fechar só o de cima
  (sem isso os dois `keydown` no window fechariam os dois). Saída agora anima (antes sumia de golpe).
- **Popup 2 (wizard sobre o popup)**: → `<Modal isOpen={isOpen && showModal} semCabecalho semPadding maxWidth="max-w-lg" fecharAoClicarFora={false}>`.
  **Mudança de comportamento consciente**: o original fechava no clique fora; usei `false` pela regra do guia
  ("formulário em que fechar perderia o que foi digitado") e para igualar ao wizard idêntico de CrmMetas. Se o
  coordenador preferir preservar à risca, é trocar para `true`.
- **Abas**: Ativas | Arquivadas (pílulas à mão) → `<Abas variante="segmentado">`.
- **Carregamento**: spinner `border-4` + "Carregando metas..." → `<CarregandoBloco />`.
- **Vazio**: → `<EstadoVazio Icone={Archive|Target}>` com ação "Criar primeira meta" só nas ativas.
- **Botões/cores**: Nova Meta → `designSystem.button.principal`; X com `hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5`;
  `text-slate-900 dark:text-white` → `text-dark-text`; cartão `bg-black/[0.02] dark:bg-white/[0.03] border-black/10`,
  `transition-all` → `transition-colors`, `hover:shadow-lg` → `hover:shadow-md`.
- **Números**: `numero` no anel, na taxa de conversão e no valor atual.
- **Animação**: `framer-motion` → `motion/react`; contador do anel/taxa 2,5 s → 0,8 s; cascata dos cartões com
  `delay: Math.min(i, 8) * 0.04`.
- **Cor**: `#ef4444` → `#f43f5e` (mesma função de CrmMetas).

## src/pages/Atividades.tsx
- **Popup**: `NovaAtividadeModal` (overlay `rgba(0,0,0,.45)`, caixa `dark:bg-dark-bg/80` translúcida, `rounded-3xl`,
  `animate-in` que não funciona) → `<Modal isOpen semCabecalho semPadding maxWidth="max-w-lg" fecharAoClicarFora={false}>`.
  O componente continua sendo montado/desmontado pelo pai (`{showModal && …}`, inclusive em CrmComercial.tsx:2009),
  então passa `isOpen` fixo. **Mudança consciente**: o original fechava no clique fora; usei `false` por ser
  formulário (título, lead, observações). Esc e X fecham. Botão "Salvar" sem degradê (`bg-violet-600 hover:bg-violet-700`).
  Título do popup `text-xl` → `text-lg text-dark-text`.
- **Barra de vidro mantida** (`gh-barra-vidro`), como pedido.
- **Título**: `SplitHeadline` sem className (2xl).
- **Abas**: Lista | Calendário e Pendentes | Concluídas | Todas (esta com fundo em degradê violeta inline) →
  dois `<Abas variante="segmentado">`.
- **Botões**: "Nova Atividade" e "Criar atividade" (degradê inline + sombra violeta + `active:scale-95`) → `designSystem.button.principal`.
- **Carregamento**: spinner próprio + "Carregando atividades..." → `<CarregandoBloco className="py-24" />` (fica abaixo da barra, por isso bloco e não página).
- **Vazio**: → `<EstadoVazio Icone={CheckCircle2} …>` com o botão de criar.
- **Animação**: `@keyframes sectionExpand` (morto) removido; o recolher/expandir por `max-height` calculado virou
  `motion` com `height: 'auto'` (AnimatePresence, 0,25 s); cascata das linhas limitada a `Math.min(idx, 8)`.
- **Cartão**: `bg-white dark:bg-dark-card` → `bg-dark-card`; `transition-all` → `transition-colors`; sombra violeta do hover removida.
  Dia de hoje no calendário sem `shadow-violet-500/30`.

## src/pages/Automacoes.tsx
- **Vazio eterno**: o seletor de sequência mostrava "Carregando sequências..." para sempre quando não havia sequência.
  Novo `carregandoSeq` (`useState(true)`, vira false no `.finally` do fetch que já existia); vazio mostra
  "Nenhuma sequência criada. Crie uma em Sequências."
- **Título**: `SplitHeadline` sem className (era `text-3xl`).
- **Abas**: abas sublinhadas feitas à mão → `<Abas<TabMode>>` (sublinhado) com ícones LayoutGrid/Zap/History.
- **Resumo**: números com `numero`; faixa `bg-dark-card border-black/10 dark:border-white/10`. Não virou `CartaoKpi`
  (mudaria o layout da faixa de 3 números em linha para 3 cartões — fica para decisão).
- **Botões**: "Nova Automação" (topo e vazio) → `designSystem.button.principal`; Salvar do construtor sem `shadow-violet-500/20`.
- **Carregamento/vazio**: `LoadingSpinner md` → `<CarregandoBloco />` (2×); vazios de automações e de histórico → `<EstadoVazio>`.
- **Emojis**: "✓" (3×) → `<Check>`; "✓ sucesso"/"✗ erro" → `<Check>`/`<X>`.
- `framer-motion` → `motion/react`. Linhas do histórico `bg-dark-card border-black/10`.
- Não mexido: "Pipeline" (jargão aceito pela auditoria) e as cores `text-gray-900 dark:text-white` do construtor (funcionam nos dois temas).

## src/components/AIChat/AIChat.tsx
- **Popups (3)** → `<Modal semCabecalho semPadding>`:
  - Chat: `isOpen={open}`, `maxWidth="max-w-[1100px]"`, clique fora **true** (já fechava), `fecharComEsc={!showConfig && !showHistory}`.
  - Histórico: `isOpen={showHistory}`, `max-w-[600px]`, clique fora **true** (já fechava).
  - Configurar: `isOpen={showConfig}`, `max-w-[680px]`, clique fora **false** — formulário com 3 textos longos;
    o original fechava. Esc e Cancelar fecham. **Mudança consciente**, reverter = trocar para `true`.
  - O `keydown` próprio de "Esc em cascata" saiu: a cascata é feita pelo `fecharComEsc` do painel (desligado
    enquanto há popup por cima). Saiu também o `@keyframes ai-modal-in` e o `ReactDOM.createPortal` (o Modal já faz portal).
  - Altura do painel `92vh` → `calc(100vh - 120px)` (máx. 920) para caber com o respiro do Modal sem rolar.
- **Cores**: a paleta `c` passou a usar os tokens do tema para superfície e texto (`rgb(var(--dark-card))`,
  `rgb(var(--dark-text))`) — acompanha `dark` e `dark.darker`; borda do claro `rgba(0,0,0,.1)`.
  Histórico/Config: borda violeta .4 e cabeçalho violeta translúcido → borda `c.border`, sem faixa;
  textos e botões em `rgba(255,255,255,.3/.5)` fixos (sumiam no claro) → `c.subText`/`c.iconBtnColor`/`c.labelText`;
  linhas do histórico `c.border`/`c.configBg`; sugestões da tela inicial idem; violeta claro `#A78BFA`/`#c4b5fd`
  (pouco contraste no claro) → `#8b5cf6`; erro `#FCA5A5` → rose-500. Botão "Salvar configuração" e botão
  flutuante sem degradê nem sombra violeta (`#7c3aed`).
- **Emojis → lucide**: barra 🕐 ✏️ 🗑 ⚙ ✕ → History, SquarePen, Trash2, Settings, X; títulos "🕐 Histórico" e
  "⚙ Configurar" → ícone; 🗑 da sessão → Trash2; ✓ (financeiro e salvar) → Check; ⚠ → AlertTriangle; ➤ → SendHorizontal;
  ✕ do botão flutuante → X; ícone da área (💰 🤝🔥 📈 ⚙️ 🍇) → DollarSign, Handshake, TrendingUp, Settings, Grape.
- **O que ficou**: o componente continua em estilo inline decidido por `isDark` (converter tudo para classes seria
  reescrever ~600 linhas). A cor de cada especialista (`sectionMeta.color`: azul/vermelho/laranja/amarelo) ficou —
  é identidade da área, não superfície. O bloco de código do markdown (`pre` com fundo preto .35 e texto claro)
  ficou como estava.

## Não feito / para o coordenador decidir
1. **Wizard de meta duplicado** (CrmMetas × MetasPopup): não extraí componente — é refatoração. Os dois receberam
   as mesmas mudanças visuais.
2. **`getProgressColor` duplicada** (CrmMetas, MetasPopup e CrmComercial): só troquei o vermelho para rose-500 dentro
   de cada arquivo; não criei `src/lib` (fora da minha lista).
3. **Clique fora → `false` em 3 formulários que antes fechavam** (wizard do MetasPopup, NovaAtividadeModal,
   Configurar do AIChat), pela regra de formulário do guia. Se a regra for "preservar à risca", são 3 trocas para `true`.
4. **Esc em popups empilhados de outros arquivos**: `NovaAtividadeModal` é aberto de dentro do card do lead
   (CrmComercial.tsx:2009). Se o card do lead também virar `<Modal>`, o Esc fecha os dois (os dois escutam o window).
   Quem migrar o card deve passar `fecharComEsc={!<estado do popup de atividade>}` no card — o estado está em CrmComercial.
5. Resumo de Automações em `CartaoKpi` não feito (mudança de layout).

## Parte C — Leads, Pessoas, Empresas, Sequências, Modelos de Tarefa, Métricas, Marketing, calculadoras, Proposta/Contrato, FechamentoPopup

Todos os arquivos deram 200 no curl depois da edição.

### src/pages/CrmLeads.tsx
- **Popup do lead** (histórico): `createPortal` + `bg-[#151221]` → `<Modal isOpen semCabecalho semPadding maxWidth="max-w-2xl" className="max-h-[85vh]">`.
  `fecharAoClicarFora` = padrão (true): já fechava clicando fora e não é formulário. Ganhou Esc e animação.
  Miolo no tema: textos `text-white/slate-200/300` → `text-dark-text` / `text-slate-700 dark:text-slate-300`; caixas `bg-white/[0.03] border-white/5` → `bg-black/[0.03] dark:bg-white/[0.03]` + borda dupla; bolinhas da timeline `border-[#151221]` → `border-dark-card`; linha vertical `bg-black/10 dark:bg-white/10`; data `text-slate-400 dark:text-slate-600`; "Anotação" `text-amber-600 dark:text-amber-300`.
  Carregando do histórico → `CarregandoBloco`; vazio → `EstadoVazio` (Clock).
- **Título**: tirado o ladrilho de ícone e a pílula de contagem; `SplitHeadline` padrão (sem className) + subtítulo `10px uppercase` com "N leads no filtro" (número em `.numero`).
- **Filtro de status** (todos/ativos/ganhos/perdidos) → `<Abas variante="segmentado">` (o hover `hover:text-slate-300 hover:bg-white/5` só existia no escuro).
- **Exportar** → `designSystem.button.secundario`.
- Tabela: carregamento `LoadingSpinner` → `CarregandoBloco`; vazio → `EstadoVazio`.
- DateRangePicker (popover, não popup): bordas/hover `white/10` → `black/10 dark:white/10`; sombra violeta do dia selecionado removida.
- Emoji: "Lead ganho ✅" → "Lead ganho" (texto só de exibição, montado no front; o ícone CheckCircle2 já existia).

### src/pages/CrmPessoas.tsx / src/pages/CrmEmpresas.tsx
- Título: sem ladrilho/pílula; `SplitHeadline` padrão + subtítulo com a contagem.
- **Engrenagem sem `onClick` removida** (não fazia nada).
- Exportar → `button.secundario`; "Novo Contato"/"Nova Empresa" → `button.principal`.
- Cartão da tabela `rounded-xl` → `rounded-2xl`, `bg-dark-card` + borda dupla.
- Carregamento → `CarregandoBloco`; vazio → `EstadoVazio` com o botão "Adicionar primeiro…" em `acao`.
- Popup de contato/empresa já era `<Modal>`: passou a `fecharAoClicarFora={false}` — **é formulário** (nome, telefone, e-mail…). Antes fechava clicando fora; agora só X/Esc. Empresas: etiqueta de cargo `bg-white dark:bg-dark-bg` → `bg-dark-card`.

### src/pages/CrmSequencias.tsx
- **Título que sumia no claro** (`text-white text-3xl`): tirado o className → padrão 2xl com `text-dark-text`.
- **Carregamento**: estado novo `carregando` (`useState(true)` → false no `finally` do `fetchSequences` existente); antes mostrava "Nenhuma sequência criada" enquanto buscava. Vazio → `EstadoVazio` (Zap) no lugar do ⚡.
- "Nova Sequência" e **"Salvar" (era emerald)** → `button.principal` (violeta).
- ⌛ no cabeçalho do passo → ícone `Hourglass`.
- `animate-in fade-in slide-in-from-right-4` (não funciona no CDN) removidos dos painéis laterais.

### src/pages/TaskTemplates.tsx
- Carregamento em texto cru → `<CarregandoPagina />`.
- Título `text-4xl` → padrão (sem className).
- Primários `bg-violet-500 px-6 py-3` → `button.principal`.
- "Duplicar" com ícone `Plus` → `Copy`.
- Vazio `rounded-3xl` → cartão `rounded-2xl` + `EstadoVazio` com botão "Criar Modelo".
- Popup do modelo (já `<Modal>`): `fecharAoClicarFora={false}` — formulário longo (itens e subitens). Antes fechava clicando fora.

### src/pages/CrmMetricas.tsx
- Abas Vendas/Pré vendas/Marketing/Funil (eram à mão, já no desenho sublinhado) → `<Abas>` (com `className="px-6 md:px-8 mb-6"`).
- Título: tirado o className repetido (padrão).
- Erro "⚠" → `AlertTriangle`; vermelho → rose.
- Spinner próprio `border-4` → `CarregandoBloco`.
- Popovers (DateRangePicker, VendedorPicker) e botão de atualizar: `border-white/10`, `hover:bg-white/5|10` → versões claro/escuro.
- Pílula de origem "outra" `bg-white/5` → `bg-black/5 dark:bg-white/5`.
- **Código morto apagado**: `KpiCard`, `SessaoCard`, `LossTooltip` (sem uso).
- **Não mexi**: os dois gráficos do ano (Fechamentos e Valores por mês), eixos `#94a3b8` e o `CustomTooltip` deles (usado só por esses gráficos; a borda `border-white/10` fica invisível no claro, mas o dono pediu para não mexer).

### src/pages/MarketingDashboard.tsx
- Título sem className; spinner `border-4` → `CarregandoBloco`; erro red → rose.
- Popover de período e botão de atualizar com bordas/hover claro/escuro.
- **Código morto apagado**: `CustomTooltip`, `PieTooltip`, `KpiCard`, `SessaoCard`, `VIOLET_SHADES`, `EMERALD_SHADES` (nenhum usado).

### src/pages/ComercialGrape.tsx + Closer/Contratos/Gestor/HeadCalculator.tsx
- Título `text-3xl/4xl` → padrão (5 títulos).
- `text-light-text dark:text-white` → `text-dark-text` (71 ocorrências nos 5 arquivos; acompanha o `dark.darker`).
- Dica (tooltip) `bg-slate-800 text-white rounded` → `bg-dark-card` + borda + `text-dark-text rounded-lg shadow-lg` (5).
- Cartões `rounded-3xl p-8/p-7` → `rounded-2xl p-6`; painel de parâmetros `shadow-xl` → `shadow-sm`; cartão do topo `shadow-2xl` → `shadow-sm`.
- Botão Exportar: sem `shadow-lg shadow-violet-500/20`; Head: `hover:bg-violet-500` → `hover:bg-violet-700`.
- Pizza: `#7c4dff` → `#8b5cf6` (violet-500) e `#ff7043` → `#f59e0b` (amber-500). Usei hex da paleta e não `rgb(var(--accent-color))` porque o recharts grava a cor como atributo `fill` do SVG, onde `var()` não é confiável.
- StatCard destacado: sem sombra violeta. Gestor: selo "bônus" sem `animate-bounce` infinito; barra de score `bg-blue-500` → `bg-amber-500`; trilho da barra `bg-white/10` → `bg-black/10 dark:bg-white/10`.
- ComercialGrape: ícones dos 4 KPIs (vermelho/âmbar/violeta/azul cheios) → `bg-violet-500/10 text-violet-500`; número do KPI em `.numero`; `#10b981` → emerald-500.
- **Não fiz**: o fundo `#0f0f1a` do PNG exportado (Closer, Contratos, Gestor, ComercialGrape) ficou, como combinado — é o arquivo. Mas no tema claro o PNG sai com texto escuro sobre fundo preto; se quiser, é trocar por `getComputedStyle(document.body).backgroundColor` (o Head já omite).
- Não pus `.numero` nos números grandes das calculadoras (cartões estreitos; a fonte mono é mais larga — risco de quebrar linha).

### src/components/PropostaTab.tsx / ContratoTab.tsx
- Proposta: botão "Exportar PDF" **fúcsia → violeta**; ícone fúcsia → violeta; prévia `bg-slate-900/60` (escura no claro) → igual à do Contrato (`bg-slate-200/40 dark:bg-black/30`).
- Ambos: cabeçalho e input `text-slate-800 dark:text-white` → `text-dark-text`; Contrato: hover do botão da Grape `violet-500` → `violet-700`.

### src/components/FechamentoPopup.tsx
- `createPortal` à mão (z-[90], sem animação) → `<Modal isOpen semCabecalho semPadding maxWidth="max-w-3xl" className="max-h-[90vh]">` com o miolo rolando por dentro.
  `fecharAoClicarFora` = padrão (true): já fechava clicando fora. O listener de Esc próprio saiu (o Modal faz). Carregando `Loader2` → `CarregandoBloco`.
