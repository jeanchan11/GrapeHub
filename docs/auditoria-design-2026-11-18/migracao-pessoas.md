# Migração de design — área Pessoas / Administração / componentes ui (18/11/2026)

## Números
- **Popups migrados para `<Modal>`: 22** (+ Senhas corrigida com `semCabecalho` e UserPermissionsModal limpo). Confirmações à mão → `confirmDialog`: **4**. `window.prompt` → `promptDialog`: **2**.
- **Títulos acertados: 12** (sem text-3xl/4xl; Senhas pelo `pageLabel`; Cursos e Bolão ganharam título).
- **Abas → `<Abas>`: 10** (2 segmentadas: PageManager, filtros do PDI). Nenhuma aba violeta cheia sobrou.
- **Carregamentos → CarregandoPagina/CarregandoBloco: 32**. **Vazios → EstadoVazio: 19**.
- **Emojis de interface trocados/removidos: ~44** (Bolão ~22, PageManager 6, Placeholders 6, MinhaEquipe 3, MoodPopup 3, ActivityToast 2, Admin 1, Cursos 1).
- **Cores/tema claro:** ajustes em 30 dos 35 arquivos (hover/borda do OptionPicker, gatilho do DatePicker, paleta hex do DateRangePicker, modal do PDI branco no branco, ~15 `hover:text-white` da Contratação, menus `#1e1b29`, cinza iOS do Humor/Atividades, WelcomePage.css…).
- **framer-motion → motion/react: 10 arquivos.** Animações infinitas removidas: 4 (coroa bounce, "Link copiado" bounce, pílula "hoje" pulse ×2, float/pulse-glow da Welcome). Durações 0,8–1,5 s → 0,5 s.
- Todos os 35 arquivos da área: `curl` = 200.

## tsc (filtrado pelos meus arquivos)
`npx tsc --noEmit -p .` → 32 linhas no total. Nos meus arquivos, só 3 erros, **todos pré-existentes** (conferidos no backup `../grapehub-backup-design-20261118/`, mesmas linhas):
- `src/components/Organograma.tsx(184)` — prop `opacity` no `<Background>` do xyflow (linha não tocada).
- `src/pages/ContratacaoPage.tsx(644)` — `currentUser` não existe em `AuthContextType` (backup linha 662).
- `src/pages/PlanosDeCarreira.tsx(248)` — comparação `role === 'Admin'` (backup linha 251).
Erros novos que apareceram na 1ª rodada (9× `onChange={setX}` no `<Abas>`, genérico inferido como string) foram corrigidos com `onChange={(id) => setX(id as typeof x)}`.

## Pendências / decisões para o coordenador
1. **Base — Esc fecha o popup de baixo junto com o confirmDialog.** `Modal` e `ConfirmHost` escutam `keydown` no `window`; Esc no diálogo de confirmação aberto de dentro de um Modal resolve o diálogo E fecha o Modal. Sugestão: no `ConfirmHost`, `e.stopImmediatePropagation()` ao tratar Esc (ele registra antes), ou o Modal ignorar Esc com `[data-confirm]` aberto. No CandidateDetailModal deixei `fecharComEsc={false}` (antes também não tinha Esc).
2. **Toaster × ActivityToastStack no mesmo canto** (top-right). Toaster é de `lib/toast.tsx` (fora da minha área). Sugestão: Toaster em bottom-right.
3. **Clique fora em formulários que hoje fecham:** mantive (Contratação: novo candidato / pasta / editar formulário; Cursos: nova aula; Bolão: editar jogo). Se quiser proteger o digitado, é `fecharAoClicarFora={false}`. Exceção que tomei: Detalhes do colaborador fecha clicando fora na **visualização** e não fecha em **modo edição**.
4. **Esc desligado** (`fecharComEsc={false}`) nos formulários longos que antes não fechavam nem com Esc: PDI, Feedback, Registrar 1:1.
5. **Cartões KPI → `CartaoKpi`** (MinhaEquipe, Desempenho, Geral, estatísticas da Contratação): não fiz — é refazer layout, não troca mecânica.
6. **3 páginas "em desenvolvimento"** (Calculadora SDR, Gerente Operacional, Squad Able) agora mostram título + EstadoVazio; continuam no menu — tirar ou não é decisão do Jean.
7. **Banner degradê dos Cursos** ficou (só raio e blob fúcsia → violeta); tirar o "hero" é decisão de produto.

---

# Detalhe por arquivo
## ui/OptionPicker.tsx
- hover `bg-black/5 dark:bg-white/5` (gatilho, tag e itens do menu); borda padrão inline `rgba(255,255,255,.1)` → `rgb(var(--dark-text)/.12)` (aparece no claro); menu `border-black/10 dark:border-white/10`; tirado `animate-in fade-in` (não funciona no CDN); check violet-500. API e comportamento iguais.
## ui/DatePicker.tsx
- gatilho com data futura `text-white` → `text-dark-text`; hoje/atrasado com variante clara (amber-600/rose-600); painel `bg-dark-card` + borda token; sem brilho violeta no dia selecionado; hover/textos `gray-*` → tokens.
## ui/DateRangePicker.tsx
- paleta hex por isDark → tokens `rgb(var(--dark-card))`/`--dark-text` (resolve o roxo no darker). Prop `dark` continua na API (ignorada). Sombra violeta do dia selecionado tirada.
## ui/MultiOptionPicker.tsx (0 usos)
- mesmos ajustes de tema claro do OptionPicker.
## ui/PageHeader.tsx
- subtítulo opcional; flex-wrap + gap (ações quebram linha no celular). Tamanho já vem do design-system.
## ui/ThemedDropdown.tsx, ui/ActionPicker.tsx
- já no padrão (auditoria); sem mudança.
## SenhasPage.tsx
- título vem de `pageLabel` (reserva "Logins e Senhas"), sem text-4xl; Modal com `semCabecalho semPadding` (um X só); Loader2 → CarregandoBloco; vazio → EstadoVazio; purple → violet; "ADICIONAR SENHA" → botão secundário "Adicionar senha"; cascata limitada (min(i,8)*0.04); framer-motion → motion/react; botões rounded-xl.
## Placeholders.tsx
- Notificações: 4 avisos fixos removidos → EstadoVazio "Nenhuma notificação por enquanto".
- PageHeader local sem text-4xl; Automações sem text-4xl; abas com emoji → `<Abas>` (Zap/ScrollText); spinners → CarregandoBloco; "✓/✗" → CheckCircle2/XCircle; "✅" e "🗓️" tirados de texto; popup Webhook → Modal (title+icon, clique fora mantido); "Carregando…" → CarregandoBloco; botão hover violet-700; light-card/light-text → tokens.
- 3 páginas "em desenvolvimento" → título SplitHeadline + EstadoVazio (Construction). Continuam no menu (decisão do coordenador/Jean se tira).
## AdminPanel.tsx
- título `<h1 text-4xl>` → SplitHeadline; 3 abas à mão → `<Abas>`; LoadingSpinner solto → CarregandoPagina; menu "..." `#1e1b29` → bg-dark-card + tokens (funciona no claro); "⚠️" → AlertTriangle; cartões `rounded-3xl bg-dark-card/60 backdrop-blur border-white/10 shadow-xl` → `rounded-2xl bg-dark-card` + borda token; sombra violeta do botão tirada.
- NÃO feito: pílula do papel padrão em azul (`getRoleBadgeClasses` default blue) — é cor de categoria de papel, deixei.
## UserPermissionsModal.tsx
- console.log e `if (!isOpen) return null` removidos; abas à mão → `<Abas>`; avatar slate-700 → violet-500/15; purple-* → violet-*; gray-900/white → text-dark-text.
- Obs.: o AdminPanel monta o modal com `{editingUser && …}` (miolo depende do usuário), então a animação de saída continua não rodando — mantido para não quebrar.
## PageManager.tsx
- abas segmentadas à mão → `<Abas variante="segmentado">`; contêiner `rounded-3xl bg-dark-card/60 backdrop-blur shadow-xl` → `rounded-2xl bg-dark-card` + borda token.
- "📁" tirado das 6 ocorrências da opção "X (direto na seção)". O texto é a chave de comparação no OptionPicker: troquei nos 3 pontos de geração E nos de comparação ao mesmo tempo (mesma string), então a escolha continua funcionando. Não criei `value` separado (exigiria mudar a API do OptionPicker).
## EstruturaMenu.tsx
- popup "Editar seção/pasta/página" (portal z-9000 à mão) → `<Modal semCabecalho semPadding>` (clique fora mantido, ganha Esc); botão Salvar hover violet-700; purple → violet; light-text → tokens.
## CargosAvaliacoes.tsx
- popup "Editar critério" (z-300) → `<Modal semCabecalho semPadding max-w-md>` (clique fora mantido); Loader2 de seção → CarregandoBloco; vazio → EstadoVazio; ring-offset hex → dark-card; textos → tokens.
## Organograma.tsx
- Loader2 de página → CarregandoBloco; contêiner `rounded-3xl bg-slate-50 dark:bg-black/20` → `rounded-2xl bg-dark-card` + borda token; sem sombra violeta no botão; card do nó shadow-sm e texto token.
## WelcomePage.tsx / WelcomePage.css
- (o .tsx não mudou) CSS: hex fixos (#14112A, #0A0A0A no darker, #7F77DD, #EF9F27, #1D9E75, #534AB7, #E8E6F0…) → `--dark-card`/`--dark-text`/`--accent-color` e emerald/amber/violet padrão; animação infinita `float`+`pulse-glow` removida; entrada 0,8 s → 0,4 s; overrides do claro ficaram redundantes e saíram (só a sombra do cartão e o filtro do logo ficaram).
## portal_admin/PortalAccessTab.tsx
- Loader2 de seção → CarregandoBloco; textos e bordas → tokens; red → rose.
## MinhaEquipePage.tsx
- sem mudança (só embrulha MinhaEquipeTab).
## PlanosDeCarreira.tsx
- spinner de borda → CarregandoPagina; subtítulo passa pelo SplitHeadline (sem className de tamanho); popup Permissões (z-9999, modal-overlay sem desfoque) → `<Modal semCabecalho semPadding max-w-md>` mantido dentro de `{open && activePage_ && …}` (miolo depende do plano); clique fora mantido; bordas/hover `white/x` → pares claro/escuro; hover do botão violet-700; sombra xl → sm.
## ColaboradoresPage.tsx
- título sem text-3xl; abas Dados/Organograma → `<Abas>` (a aba Dados continua só para superadmin/diretor-op/gerente-op); spinner → CarregandoPagina; vazio → EstadoVazio; framer → motion/react; cascata limitada a 8 itens; cartão sem sombra violeta e `transition-colors`.
- "Link copiado!" (balão com animate-bounce) → `toast.success('Link copiado.')` + check verde discreto no botão (o estado `copyToast` ficou igual).
- Popup Detalhes/Novo colaborador → `<Modal semCabecalho semPadding>`; fecha com X (lucide `X`, não mais `Plus rotate-45`). Clique fora: **fecha na visualização (como antes) e não fecha em modo edição** (`fecharAoClicarFora={!isEditMode}`) para não perder o digitado.
- Popup Configurações (fundo `dark:bg-dark-bg`) → `<Modal fecharAoClicarFora={false}>` (antes não fechava clicando fora); ganhou Esc.
## CollaboratorProfile.tsx
- abas à mão (fundo branco na ativa, "pasta" grudada no cartão) → `<Abas>` com ícones; cartão de conteúdo `rounded-2xl` normal; spinner → CarregandoPagina; framer → motion/react; `animate-in` (não funciona no CDN) removido; blocos internos `dark:bg-dark-bg` → `dark:bg-white/[0.03]`.
- Popup Prévia de arquivo → `<Modal semCabecalho semPadding max-w-4xl fecharAoClicarFora={false}>` (antes não fechava clicando fora); ganhou Esc.
## collaborator_tabs/PdiTab.tsx
- **tema claro do modal**: título e inputs `text-white dark:text-dark-text` (branco no branco) → `text-dark-text`.
- popup Nova/editar ação → `<Modal semCabecalho semPadding max-w-xl fecharAoClicarFora={false} fecharComEsc={false}>` (formulário longo com etapas; antes não fechava nem com clique fora nem com Esc).
- paleta própria #7F77DD/#5DCAA5/#F0997B/#555 → violet-500/emerald-500/amber-500 e `black/20 dark:white/20` no checkbox; botão Salvar `bg-violet-600 hover:bg-violet-700`; pílulas `rounded-[20px]` → `rounded-full`; pílula fixa escura `bg-slate-800` → `bg-black/5 dark:bg-white/5`.
- filtros (fundo violeta cheio na ativa) → `<Abas variante="segmentado">`; LoadingSpinner → CarregandoBloco; vazio → EstadoVazio; cartões `dark:bg-dark-bg` → `bg-dark-card`; framer → motion/react; contadores/barras 1–1,5 s → 0,5 s; stagger 0,1 → 0,04.
- NÃO mexi: cor do tipo "Comportamental" `#85B7EB` (azul-claro de categoria) e as cores do OptionPicker de status (#22c55e etc.) — são cor de categoria/status, não superfície.
## collaborator_tabs/FeedbacksTab.tsx
- popup Dar/Pedir feedback → `<Modal semCabecalho semPadding max-w-lg fecharAoClicarFora={false} fecharComEsc={false}>` (antes não fechava clicando fora nem com Esc; tem textarea).
- sub-abas Recebidos/Enviados → `<Abas>`; LoadingSpinner → CarregandoBloco; vazio → EstadoVazio; hex `dark:text-[#888]`/`[#F0F0F0]`/`[#2A2A2A]`/`[#151221]` → tokens; cartão `dark:bg-dark-bg` → `bg-dark-card`; `animate-in` removido.
## collaborator_tabs/OneOnOnesTab.tsx
- popup "Agendar próximo 1:1" (overlay rgba .72 sem desfoque, Esc e clique fora) → `<Modal semCabecalho semPadding max-w-md>`; Esc próprio removido (o Modal faz o mesmo).
- popup Registrar/editar 1:1 → `<Modal … fecharAoClicarFora={false} fecharComEsc={false}>` (antes não fechava nem com clique fora nem com Esc; tem anotações longas).
- LoadingSpinner → CarregandoBloco; vazio → EstadoVazio; hex `[#888]/[#F0F0F0]/[#151221]` → tokens; cartão `dark:bg-dark-bg` → `bg-dark-card`; `hover:text-white` → `hover:text-dark-text`; framer → motion/react; `animate-in` removido.
## collaborator_tabs/DesempenhoTab.tsx
- 2 popups (Agendar próxima avaliação; Registrar/realizar avaliação) — overlay rgba .72 sem desfoque, fundo `dark:bg-dark-bg/95` → `<Modal semCabecalho semPadding>` (os dois já fechavam com Esc e clique fora; mantido, Esc próprio removido porque o Modal faz).
- spinner de borda (página) e Loader2 (critérios) → CarregandoBloco; vazio → EstadoVazio; cartões `dark:bg-dark-bg` → `bg-dark-card`; barra 1 s → 0,5 s; framer → motion/react; `hover:text-white` → token.
## collaborator_tabs/GeralTab.tsx
- LoadingSpinner → CarregandoBloco; `animate-pulse` infinito da pílula "hoje" removido (a cor âmbar continua destacando); 7 cartões `dark:bg-dark-bg/40` → `bg-dark-card` + borda token; vazio do humor → EstadoVazio; framer → motion/react.
- NÃO feito: migrar os cartões de resumo para `Cartao`/`CartaoKpi` (refazer layout, não é troca mecânica).
## collaborator_tabs/MinhaEquipeTab.tsx (página Minha Equipe)
- título sem text-3xl; LoadingSpinner lg → CarregandoBloco; emoji 📅 de vazio → EstadoVazio (CalendarX); "❓" quando falta humor → "—"; vazio de liderados → EstadoVazio; 7 cartões `dark:bg-dark-bg` → `bg-dark-card`; barras 0,8–1 s → 0,5 s; framer → motion/react; sombra violeta no hover tirada.
- NÃO feito: cartões KPI → `CartaoKpi` (mesmo motivo).
## collaborator_tabs/AgendarProximoInline.tsx
- texto dos inputs → `text-dark-text`.
## ContratacaoPage.tsx
- 3 confirmações à mão (Documentos, Kanban, Contratos; z-9999, título `text-white` invisível no claro) → `confirmDialog({ danger: true })`. Os handlers NÃO mudaram: continuam pondo `{msg, onConfirm}` no estado; um hook pequeno (`useConfirmacaoPadrao`) abre o diálogo padrão a partir do estado (confirmou → onConfirm; cancelou → limpa). Idem `confirmDelete` do contrato (effect → confirmDialog → `handleDelete`).
- `ModalOverlay` (candidato, pasta) → `<Modal title=… max-w-md>` (clique fora mantido, ganha Esc); popup "Editar formulário" → `<Modal semCabecalho semPadding max-w-2xl>` (clique fora mantido).
- abas com fundo violeta cheio → `<Abas>` com ícones; títulos sem className de tamanho, subtítulo pelo SplitHeadline; 2 spinners de borda → CarregandoBloco; 2 vazios → EstadoVazio; ~15 `hover:text-white`/`hover:bg-white/5` → pares claro/escuro; inputs `text-white` → `text-dark-text`; sombras violeta dos botões removidas; `text-gray-900 dark:text-white` → token.
- NÃO feito: os 3 cartões de estatística → `CartaoKpi` (refazer layout).
- Decisão pendente: o "Editar formulário" e "Novo/editar candidato" são formulários e hoje fecham clicando fora — mantive (preservar); se o coordenador preferir proteger o digitado, é só `fecharAoClicarFora={false}`.
## CandidateDetailModal.tsx
- popup do candidato (z-1000 à mão, `animate-in`) → `<Modal semCabecalho semPadding max-w-6xl h-[90vh] fecharComEsc={false}>`; clique fora mantido; Esc continua desligado (não existia e há anotações digitadas).
- confirmação `#1a1a2e` (escura também no claro) → `confirmDialog` (danger para exclusão/reprovação; aprovação sem danger). Handlers intactos (effect sobre `confirmAction`).
- aba DISC e spinner azuis → violeta; 2 spinners de borda → CarregandoBloco; botões do DISC azuis → violeta; `hover:text-white` → token.
- NÃO mexi: emojis e degradês da lista de Sabotadores (são conteúdo do teste, não ícone de interface).
## Cursos.tsx
- 2 `window.prompt` (nome do curso / módulo) → `promptDialog` (cancelar devolve null, o `if (!title?.trim()) return` continua igual).
- popups Nova/editar aula e Acompanhamento da turma → `<Modal semCabecalho semPadding>` (clique fora mantido, ganham Esc).
- título padrão `SplitHeadline "Central de Treinamentos"` acima do banner; saudação do banner deixou de ser `<h1 text-3xl/4xl>` (virou texto 2xl/3xl) e o selo "Central de Treinamentos" duplicado saiu; banner `rounded-3xl` → `rounded-2xl`; blob fúcsia → violeta; sombra do botão branco tirada.
- 4 `Loader2` de seção → CarregandoBloco; vazio do catálogo → EstadoVazio; botões `hover:bg-violet-500` → `hover:bg-violet-700`; "🎉" tirado da frase; framer → motion/react.
- NÃO mexi: popup de celebração (confete, mola, fecha sozinho) — é um momento especial, já tinha Esc/clique fora; só o raio 3xl → 2xl. O banner degradê ficou (decisão de produto: tirar ou não o "hero").
## Bolao.tsx
- título `SplitHeadline "Bolão da Copa"` acima do banner (não tinha título); abas violeta cheio → `<Abas>` com ícones.
- 4 popups (Fazer palpite z-9999; Resultado; Editar jogo; Palpites do participante com overlay `#0a0118/80`) → `<Modal semCabecalho semPadding>`; todos fechavam clicando fora — mantido; o do participante já tinha Esc (o próprio foi removido, o Modal faz).
- ~20 emojis de interface → lucide: ⚽→Trophy (Final), ✓→Check, 🔒→Lock, ✏️→Edit2, 🎯→Target, ✅→CheckCircle2, ❌→XCircle, 🏆→Trophy, 📋→ScrollText; 🥇🥈🥉 removidos (os cartões já têm Crown/Medal); "Resultado certo" azul → violeta.
- 4 spinners de borda (página/aba/popup) → CarregandoBloco (spinners pequenos dentro de botão ficaram); coroa `animate-bounce` parada; sombras/brilhos violeta removidos; degradê `#0d0d1a` → `black/60`; botões `hover:*-500` → `hover:*-700`.
## DiferenciaisPage.tsx
- título (já vinha do `pageLabel`) sem text-4xl; LoadingSpinner e Loader2 de seção → CarregandoBloco; vazio → EstadoVazio com ação "+ Criar primeiro registro"; botões `hover:bg-violet-500` → `hover:bg-violet-700` e sem sombra violeta; blocos `dark:bg-dark-bg` → `dark:bg-white/[0.03]`; framer → motion/react; `text-gray-900 dark:text-white` → token.
## MoodPopup.tsx
- superfície cinza iOS `rgba(28,28,30,.88)` → `rgb(var(--dark-card) / .95)`; borda e textos → `--dark-text` (funciona no `darker`); "💜" → `Heart` lucide; "🍇 … 🍇" tirados. Emojis de humor (conteúdo) ficaram. Comportamento (sem clique fora, de propósito) igual.
## ActivityToastStack.tsx
- superfície cinza iOS → `--dark-card`; 14 pares de texto `isDark ? rgba(255…) : rgba(0…)` e 2 bordas → `rgb(var(--dark-text) / x)`; verde Apple `#30d158/#34c759` → emerald `#10b981`; fundo do expandido escuro → `--dark-bg`.
- "🕐" e "👤" tirados do subtítulo (o subtítulo é uma string montada; trocar por ícone `Clock`/`User` exigiria mudar o tipo `ToastItem.subtitle` para ReactNode — não fiz).
- NÃO feito: posição (top 24/right 24, z 9999) disputa o canto com o `lib/toast.tsx` (top-4/right-4, z 100000) — o Toaster é da base/lib; decisão do coordenador (sugestão: Toaster em bottom-right).
