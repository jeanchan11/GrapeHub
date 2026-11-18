# Auditoria de design: pessoas, administração e componentes base (18/11/2026)

Escopo: 40 arquivos (lista em `pessoas-files.lst`). Somente leitura, sem edição no projeto.
Referência: `padrao-design.md`. A tabela lista só o que está fora do padrão.

Números do grupo:
- **0 de 40** arquivos usam `Cartao`/`CartaoKpi`/`.gf-cartao`. Todo cartão do grupo é legado.
- **~29 popups** feitos à mão. Só 2 usam `ui/Modal.tsx` (Senhas e Permissões de usuário).
- **6 popups fecham com Esc**, contando o `confirm.tsx`. O próprio `Modal.tsx` não fecha.
- **6 valores de z-index** em modal de tela cheia: 50, 300, 1000, 9000, 9995 e 9999.

---

## 1. Tabela de achados

### Cor (17)

| arquivo:linha | o que está fora | correção sugerida |
|---|---|---|
| collaborator_tabs/PdiTab.tsx:444, 459, 486, 497, 532, 402 | `text-white dark:text-dark-text` no título e nos inputs do modal de PDI, sobre `bg-white`/`bg-slate-50`. **No tema claro o texto fica branco no branco, e o que se digita some.** | `text-dark-text` |
| collaborator_tabs/PdiTab.tsx:178, 230, 245, 260, 278, 400, 428, 522, 578 (~15 ocorrências) | Paleta hex própria: `#7F77DD`, `#5DCAA5`, `#F0997B` e `#555` | `violet-500` / `emerald-500` / `amber-500`. Checkbox: `border-black/20 dark:border-white/20` |
| collaborator_tabs/PdiTab.tsx:349 | Pílula fixa escura `bg-slate-800 text-slate-300 border-slate-700`, que também aparece no tema claro | `bg-black/5 dark:bg-white/5 text-slate-500 dark:text-slate-400` |
| collaborator_tabs/FeedbacksTab.tsx:243, 244, 273, 351, 360, 389, 397, 405, 421 (9) e OneOnOnesTab.tsx:446, 459, 462, 478, 481, 489, 515, 526 (8) | Hex no escuro: `dark:text-[#888]`, `dark:text-[#F0F0F0]`, `dark:text-[#2A2A2A]` e `dark:border-[#151221]` | `dark:text-slate-400`, `dark:text-dark-text`, `dark:text-white/10`, `dark:border-dark-card` |
| CandidateDetailModal.tsx:788 | Confirmação com `bg-[#1a1a2e]` (aparece como caixa escura também no tema claro) | Trocar o modal inteiro por `confirmDialog({ danger: true })` |
| AdminPanel.tsx:607 (+600) | Menu "..." do usuário em `bg-[#1e1b29]` com `text-slate-300`, `hover:bg-white/5` e `hover:text-white`, ou seja, só no escuro | `bg-dark-card border border-black/10 dark:border-white/10 text-dark-text hover:bg-black/5 dark:hover:bg-white/5` |
| Bolao.tsx:832, 1106 | Overlay `bg-[#0a0118]/80` e degradê `from-[#0d0d1a]/80` | Overlay padrão `bg-black/60 backdrop-blur-sm`; `from-black/60` |
| ContratacaoPage.tsx: 15 ocorrências (354, 574, 599, 1069, 1075, 1080, 1145, 1153, 1413, 1453, 1460, 1467, 1553, 1563, 1581); também CandidateDetailModal (3), DesempenhoTab (2), OneOnOnesTab (1) e MultiOptionPicker (1) | `hover:text-white` / `hover:bg-white/5` sem variante clara: no tema claro o texto fica branco ao passar o mouse | `hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5` |
| 41 ocorrências em 11 arquivos: GeralTab 287…483 (7), MinhaEquipeTab 175, 260, 277… (7), DesempenhoTab 174, 372, 688, 715, 785 (5), PdiTab (5), DiferenciaisPage (5), CollaboratorProfile 248, 335, 406 (4), ContratacaoPage (2), Placeholders (2), OneOnOnesTab (2), ColaboradoresPage 1013, FeedbacksTab 285 | Cartões e modais com `dark:bg-dark-bg` (ou `/40`, `/95`) como superfície. No escuro ficam mais escuros que os outros cartões (#0a0118 contra #14082e), e os modais de Desempenho e 1:1 destoam dos demais | `bg-dark-card`; nos cartões, migrar para `Cartao` |
| MoodPopup.tsx:177–287; ActivityToastStack.tsx:165–270, 472–568 | Superfície no estilo iOS, `rgba(28,28,30,.88)` cinza, e verde Apple `#30d158`. O `isDark` não distingue o tema `darker` | `rgb(var(--dark-card))` / `rgb(var(--dark-text) / x)`, como em `lib/toast.tsx` |
| ui/DateRangePicker.tsx:20–23 | Paleta hex por `isDark` (`#14082e` / `#1c0e3a`). No tema `darker` o painel fica roxo | Tokens `rgb(var(--dark-card))`, como no `ThemedDropdown` |
| ui/DatePicker.tsx:142 | Gatilho padrão `text-white dark:text-white`: invisível no tema claro | `text-dark-text` |
| ui/OptionPicker.tsx:117, 139–150, 162–185 (e MultiOptionPicker:153) | `hover:bg-white/5`, `border-white/10` e borda padrão `rgba(255,255,255,0.1)`: hover e borda não aparecem no claro. **São 30 telas usando** | `border-black/10 dark:border-white/10`, `hover:bg-black/5 dark:hover:bg-white/5` |
| ui/Modal.tsx:54, 62; index.html:143 | Ícone `text-purple-500`; botão fechar com `dark:hover:bg-neutral-800` e `text-gray-*`. No escuro, `.modal-container` é `#1E1B2E`, diferente de `--dark-card` (`#14082e`) | `text-violet-500`, `hover:bg-black/5 dark:hover:bg-white/10 text-slate-500`; alinhar `.modal-container` a `rgb(var(--dark-card))` |
| WelcomePage.css:83–177 | Hex fixos: cartão `#14112A`, `#0A0A0A` no darker, `#7F77DD`, `#EF9F27`, `#1D9E75`, `#534AB7` | Variáveis `--dark-card` / `--accent-color` |
| SenhasPage.tsx:160, 185, 346; UserPermissionsModal.tsx:174, 214, 255, 293 | `purple-*` no lugar de `violet-*` (inclusive `bg-purple-600 dark:bg-violet-600`) | `violet-600` nos dois temas |
| UserPermissionsModal.tsx:85 | Avatar com `bg-slate-700` fixo | `bg-violet-500/15 text-violet-500` |

### Formato (6)

| arquivo:linha | o que está fora | correção sugerida |
|---|---|---|
| Todos os 40 arquivos | Nenhum usa `Cartao` ou `.gf-cartao`. O padrão é o legado `rounded-2xl border` | Migrar os cartões de resumo primeiro (MinhaEquipeTab:260–333, DesempenhoTab:688–715, GeralTab:418–483) para `Cartao`/`CartaoKpi` |
| Modais do grupo | Três raios para o mesmo tipo de popup: `rounded-3xl` (Colaboradores:500, Perfil:406, Desempenho:174/372, Feedbacks:338, 1:1:106/502, Bolão:834), `rounded-2xl` (PDI, Contratação, Cursos, Bolão:217, Estrutura, Cargos) e 22px (`Modal.tsx`, PlanosDeCarreira:293) | Um só raio (22px, igual ao `.gf-cartao`) definido no `Modal.tsx` |
| collaborator_tabs/PdiTab.tsx:349, 352, 356 | Pílulas com `rounded-[20px]` | `rounded-full` |
| Bolao.tsx:99, 102, 217, 250, 481, 843, 1121; ContratacaoPage.tsx:503, 1064, 1443; Organograma.tsx:188; ui/DatePicker.tsx:214 | Sombras coloridas (`shadow-violet-500/x`, `shadow-[0_0_30px_rgba(124,58,237,.35)]`, brilho no dia selecionado) | Sem sombra no botão; `shadow-sm` no cartão |
| Organograma.tsx:164 | Contêiner `rounded-3xl bg-slate-50 dark:bg-black/20` | `Cartao` / `bg-dark-card rounded-[22px]` |
| Placeholders.tsx:505–526 | As 3 páginas "em desenvolvimento" (Calculadora SDR, Gerente Operacional, Squad Able) usam um cartão gigante `rounded-3xl shadow-2xl p-12` com `h1 text-4xl font-bold` | Estado vazio padrão (ícone lucide + frase cinza), ou tirar do menu |

### Cabeçalho e abas (7)

| arquivo:linha | o que está fora | correção sugerida |
|---|---|---|
| SenhasPage.tsx:132; DiferenciaisPage.tsx:153; AdminPanel.tsx:419; Placeholders.tsx:17, 222 (`text-4xl`); ColaboradoresPage.tsx:321 e MinhaEquipeTab.tsx:245 (`text-3xl`) | O título da página aparece em 3 tamanhos. O padrão é `text-2xl font-black` (PlanosDeCarreira:147 e ContratacaoPage:1432 já seguem) | `SplitHeadline className="text-2xl font-black tracking-tight text-dark-text"` |
| SenhasPage.tsx:128–134 (App.tsx:504) | O título "Logins e Senhas" é fixo, mas o template `senhas` serve 3 páginas do menu, então as três mostram a mesma headline | Passar `pageLabel={findPageLabel(menu, activePage)}`, como em Diferenciais |
| AdminPanel.tsx:419; Placeholders.tsx:507, 516, 525 | `<h1>` à mão em vez de `SplitHeadline`. Placeholders.tsx:7 redefine um `PageHeader` local em `text-4xl` com o mesmo nome do `ui/PageHeader` | `SplitHeadline` ou o `ui/PageHeader` (depois de corrigido, ver seção 2) |
| Bolao.tsx:1097–1110; Cursos.tsx:1141 | O Bolão não tem título, só o banner. Os Cursos usam um hero próprio `text-3xl md:text-4xl` | `SplitHeadline` acima do banner/hero |
| ContratacaoPage.tsx:1453, 1460, 1467; Bolao.tsx:1121; PdiTab.tsx:278 | Abas com fundo violeta cheio (`bg-violet-600 text-white`, `shadow-lg shadow-violet-500/20`, `bg-[#7F77DD]`) | Sublinhado `border-b-2 border-violet-500 text-violet-600 dark:text-violet-400`, como em ColaboradoresPage:354 / AdminPanel:429 |
| CandidateDetailModal.tsx:322, 610 | Aba DISC e spinner em azul (`border-blue-500 text-blue-6..`, `border-t-blue-500`) | violeta |
| Placeholders.tsx:231, 237 | Rótulos de aba com emoji: "⚡ Automações" e "📋 Logs de Execução" | Ícone lucide `Zap`/`ScrollText` size 14 |

### Popup (14). Detalhe por modal na seção 2

| arquivo:linha | o que está fora | correção sugerida |
|---|---|---|
| Grupo inteiro | 27 modais artesanais e só 2 com `ui/Modal` | Corrigir o `Modal.tsx` (seção 2) e migrar |
| Grupo inteiro | Só 6 fecham com Esc: DesempenhoTab:137/277, OneOnOnesTab:71, Cursos:517, Bolao:823 e confirm.tsx. O `Modal.tsx` também não fecha | Esc dentro do `Modal.tsx` |
| ColaboradoresPage.tsx:1012; CollaboratorProfile.tsx:405; FeedbacksTab.tsx:337; OneOnOnesTab.tsx:501; PdiTab.tsx:441 | Não fecham com clique fora nem com Esc: só pelo X | `Modal` |
| CargosAvaliacoes.tsx:53 (z-300), CandidateDetailModal.tsx:245 (z-1000), EstruturaMenu.tsx:284 (z-9000), Cursos.tsx:524 (z-9995), z-9999 (PlanosDeCarreira:292, ContratacaoPage:344/618/1403, CandidateDetailModal:787, Bolao:214, Placeholders:463), o resto z-50 | 6 camadas diferentes. O z-50 empata com o menu lateral (`Sidebar.tsx:506`) e só fica por cima pela ordem no DOM | Uma só camada no `Modal` (ex.: `z-[9000]` via portal) |
| ContratacaoPage.tsx:344, 618, 1403; CandidateDetailModal.tsx:787 | 4 confirmações feitas à mão que duplicam o `confirmDialog` | `await confirmDialog({ message, danger: true })` |
| Cursos.tsx:1021, 1053 | `window.prompt('Nome do curso:')` / `('Nome do módulo:')`, nativos do navegador | `await promptDialog({ message: 'Nome do curso' })` |
| DesempenhoTab.tsx:171, 369; OneOnOnesTab.tsx:105 | Overlay `rgba(0,0,0,.72)` inline, sem desfoque | `bg-black/60 backdrop-blur-sm` (via `Modal`) |
| CollaboratorProfile:405, FeedbacksTab:337, OneOnOnesTab:501 (`slate-900/60`), PdiTab:441 (`slate-900/50 dark:black/80`), CandidateDetailModal:248, Bolao:832 (`#0a0118/80`), PlanosDeCarreira:292 (`modal-overlay`, sem desfoque) | 6 overlays diferentes | Um overlay só, no `Modal` |
| SenhasPage.tsx:195–203 | `<Modal>` sem `title` e com cabeçalho próprio dentro do corpo: aparecem **dois X** e o padding dobra (p-6 + p-6) | Usar `title` / `footer` do Modal, ou dar ao Modal uma opção `semCabecalho` |
| UserPermissionsModal.tsx:34–37 | `console.log` deixado no código; `if (!isOpen) return null` antes do `<Modal>` mata a animação de saída | Remover os dois; o Modal já trata `isOpen` |
| ColaboradoresPage.tsx:503; Placeholders.tsx:467 | Fechar com `<Plus className="rotate-45">` e com o caractere "✕" | `<X size={20} />` |
| ui/Modal.tsx:36 | Abre alinhado ao topo (`items-start pt-10`); os outros 27 abrem centralizados | `items-center` como padrão (topo opcional para modais altos) |
| ActivityToastStack.tsx:431 (top 24 / right 24, z 9999) × lib/toast.tsx:58 (top-4 / right-4, z 100000) | Os dois avisos ocupam o mesmo canto: um toast de sucesso cobre o lembrete de atividade | Toaster em `bottom-4 right-4`, ou empilhar os dois no mesmo contêiner |
| ColaboradoresPage.tsx:335–338 | "Link copiado!" é balão próprio com `animate-bounce` | `toast.success('Link copiado.')` |

### Animação (5)

| arquivo:linha | o que está fora | correção sugerida |
|---|---|---|
| ColaboradoresPage:3, CollaboratorProfile:2, DesempenhoTab:7, GeralTab:2, MinhaEquipeTab:2, OneOnOnesTab:6, PdiTab:2, Cursos:2, DiferenciaisPage:2, SenhasPage:2, LoadingSpinner:2, PageTransition:2 | `framer-motion` (12 arquivos). Já `ui/Modal`, `ui/DatePicker`, `MoodPopup` e `ActivityToastStack` usam `motion/react` | `motion/react` |
| DesempenhoTab.tsx:761; MinhaEquipeTab.tsx:292, 365; PdiTab.tsx:42, 326, 381 | Barras e contadores de 0,8 a 1,5 s | ≤ 0,5 s |
| GeralTab.tsx:303, 364 (`animate-pulse` na pílula "hoje"); Bolao.tsx:431 (coroa `animate-bounce`); ColaboradoresPage.tsx:336 (`animate-bounce`); WelcomePage.css:77 (`float` + `pulse-glow` infinitos) | Animações infinitas em interface comum | Remover; destacar por cor |
| 18 dos 27 modais artesanais | Sem animação de entrada. Os outros usam ora `animate-in zoom-in-95`, ora framer (fade + 0,96), ora spring | Animação única no `Modal` (já é opacity + scale 0,95 em 0,25 s) |
| SenhasPage.tsx:146–153 | Lista com atraso de 0,06 s por item: 30 senhas = 1,8 s até a última aparecer | Sem stagger, ou com teto de 0,3 s |

### Carregamento (3)

| arquivo:linha | o que está fora | correção sugerida |
|---|---|---|
| PlanosDeCarreira.tsx:137; ContratacaoPage.tsx:535, 1509; DesempenhoTab.tsx:535; CandidateDetailModal.tsx:522, 610 (azul); Bolao.tsx:531, 889, 1132, 1137; Placeholders.tsx:312, 395 | 12 spinners próprios `border-4 border-violet-500/30 border-t-violet-500` | `LoadingSpinner` centralizado (página: `min-h-screen`; seção/aba: `py-16`) |
| SenhasPage.tsx:140 (página); Organograma.tsx:160; PortalAccessTab.tsx:78; CargosAvaliacoes.tsx:206; Cursos.tsx:398, 1189; DiferenciaisPage.tsx:599; DesempenhoTab.tsx:404 | `Loader2` solto como carregamento de página ou seção | `LoadingSpinner` (o `Loader2` fica só dentro de botão) |
| Placeholders.tsx:470 | Texto cru "Carregando…" | `LoadingSpinner size="sm"` |

### Vazio (3)

| arquivo:linha | o que está fora | correção sugerida |
|---|---|---|
| Placeholders.tsx:24–29 (página Notificações, App.tsx:411) | **4 notificações fictícias fixas no código** ("Projeto Alpha", "Parceiro X", "Meta Atingida") aparecem como reais. Combina com o sino falso `badge: 12` | Estado vazio "Nenhuma notificação" até existir um backend |
| collaborator_tabs/MinhaEquipeTab.tsx:421 (+190, 394) | Emoji 📅 como ícone de vazio; ❓ quando o humor falta | `CalendarX` lucide + frase cinza; traço "—" |
| Placeholders.tsx:504–526 | 3 telas "em desenvolvimento" no menu | Estado vazio padrão ou tirar do menu |

### Texto e emoji (5)

| arquivo:linha | o que está fora | correção sugerida |
|---|---|---|
| Bolao.tsx:117, 160, 164, 166, 223, 252, 335, 1151, 1160, 1174, 1188, 1200, 1203, 1210 (~20) | Emojis como ícone (⚽ 🔒 ✏️ 🎯 ✅ ❌ 🏆 🥇 🥈 🥉 📋) | lucide: `Trophy`, `Lock`, `Pencil`, `Target`, `CheckCircle2`, `XCircle`, `Medal` |
| PageManager.tsx:597, 623, 646, 803, 811, 828 | "📁" dentro do rótulo da opção, **e o texto com emoji é usado como chave de comparação** (646, 828) | Opção com `value` próprio e ícone `Folder` |
| AdminPanel.tsx:528 ("⚠️"); Placeholders.tsx:89 ("✅"), 163 ("🗓️"), 361/365 ("✓ Sucesso" / "✗ Erro") | Emoji ou símbolo como ícone | `AlertTriangle`, `CheckCircle2`, `XCircle` |
| ActivityToastStack.tsx:309, 311 | "🕐" e "👤" no subtítulo do lembrete | `Clock` / `User` size 11 |
| MoodPopup.tsx:209, 226 | "💜" e "🍇 … 🍇" decorativos (os emojis de humor são conteúdo e podem ficar) | Tirar os decorativos |

Texto em inglês: nada relevante no grupo ("Status", "Feedbacks" e "Painel Admin" são de uso corrente).

### Botão (3)

| arquivo:linha | o que está fora | correção sugerida |
|---|---|---|
| collaborator_tabs/PdiTab.tsx:578 | Primário `bg-[#7F77DD] hover:bg-[#6b64c4]` | `bg-violet-600 hover:bg-violet-700 text-white rounded-xl` |
| SenhasPage.tsx:346, 185 | Primário `bg-purple-600 rounded-lg`; "ADICIONAR SENHA" como link roxo em caixa alta | `bg-violet-600 hover:bg-violet-700 rounded-xl`; "+ Adicionar senha" no botão secundário |
| DiferenciaisPage.tsx:156, 562; Bolao.tsx:250 | `hover:bg-violet-500`: clareia no hover, ao contrário do padrão, que escurece | `hover:bg-violet-700` |

**Total: 63 achados.** Cor 17 · formato 6 · cabeçalho/abas 7 · popup 14 · animação 5 · carregamento 3 · vazio 3 · texto/emoji 5 · botão 3.

---

## 2. Inventário de popups e modais do grupo

Legenda: **Anim.** = animação de entrada; **Portal** = createPortal; **Esc** e **Fora** = fecha com Esc / com clique fora.

| # | arquivo:linha | modal | overlay | z | container (fundo · raio · borda) | anim. | portal | Esc | Fora |
|---|---|---|---|---|---|---|---|---|---|
| 1 | ColaboradoresPage:499 | Detalhes / Novo colaborador | black/60 blur-sm | 50 | white / dark-card · 3xl · white/10 | — | não | não | sim |
| 2 | ColaboradoresPage:1012 | Configurações | black/60 blur-sm | 50 | white / **dark-bg** · 3xl | — | não | não | **não** |
| 3 | CollaboratorProfile:405 | Prévia de arquivo | slate-900/60 blur | 50 | white / **dark-bg** · 3xl | animate-in zoom 200ms | não | não | **não** |
| 4 | DesempenhoTab:168 | Agendar próxima avaliação | rgba(0,0,0,.72) sem blur | 50 | white / **dark-bg/95** · 3xl | — | não | sim | sim |
| 5 | DesempenhoTab:366 | Registrar/realizar avaliação | idem | 50 | idem | — | não | sim | sim |
| 6 | FeedbacksTab:337 | Dar/pedir feedback | slate-900/60 blur | 50 | white / dark-card · 3xl | animate-in | não | não | **não** |
| 7 | OneOnOnesTab:102 | Agendar próximo 1:1 | rgba(0,0,0,.72) | 50 | white / dark-bg/95 · 3xl | — | não | sim | sim |
| 8 | OneOnOnesTab:501 | Registrar/editar 1:1 | slate-900/60 blur | 50 | white / dark-card · 3xl | animate-in | não | não | **não** |
| 9 | PdiTab:441 | Nova/editar ação de PDI | slate-900/50 · dark:black/80 blur | 50 | **slate-50** / dark-bg · 2xl; texto branco no claro | animate-in | não | não | **não** |
| 10 | PlanosDeCarreira:292 | Permissões de acesso | `modal-overlay` (sem blur) | 9999 | `modal-container` 22px | — | não | não | sim |
| 11 | CargosAvaliacoes:53 | Editar critério | black/60 blur | **300** | white / dark-card · 2xl | — | não | não | sim |
| 12 | ContratacaoPage:63 (`ModalOverlay`, usado em 1335 e 1604) | Candidato / pasta | black/60 blur | 50 | white / dark-card · 2xl | — | não | não | sim |
| 13 | ContratacaoPage:344 | Confirmação (à mão) | black/60 blur | 9999 | dark-card · 2xl | — | não | não | sim |
| 14 | ContratacaoPage:618 | Confirmar exclusão (à mão) | idem | 9999 | light-card / dark-card · 2xl | — | não | não | sim |
| 15 | ContratacaoPage:1403 | Confirmação (à mão) | idem | 9999 | dark-card · 2xl | — | não | não | sim |
| 16 | ContratacaoPage:1654 | Editar formulário | black/60 blur | 50 | white / dark-card · 2xl | — | não | não | sim |
| 17 | CandidateDetailModal:245 | Detalhe do candidato | slate-900/50 · dark:black/60 blur | **1000** | light-card / dark-card · 2xl | animate-in zoom | não | não | sim |
| 18 | CandidateDetailModal:787 | Confirmação (à mão) | black/60 blur | 9999 | **#1a1a2e** · 2xl | — | não | não | sim |
| 19 | Cursos:271 | Nova/editar aula | black/60 blur | 50 | dark-card · 2xl | framer fade+0,96 | não | não | sim |
| 20 | Cursos:388 | Turma | black/60 blur | 50 | dark-card · 2xl | framer | não | não | sim |
| 21 | Cursos:524 | Aula concluída (confete) | black/50 blur | 9995 | dark-card · 3xl | spring + confete; fecha sozinho em 6–9 s | não | sim | sim |
| 22 | Cursos:1021, 1053 | Nome do curso / módulo | **window.prompt nativo** | — | — | — | — | — | — |
| 23 | Bolao:214 | Fazer/editar palpite | black/60 blur | 9999 | dark-card · 2xl · shadow-violet | — | não | não | sim |
| 24 | Bolao:731 | Resultado do jogo | black/60 blur | 50 | dark-card · 2xl | — | não | não | sim |
| 25 | Bolao:757 | Editar jogo | black/60 blur | 50 | dark-card · 2xl | — | não | não | sim |
| 26 | Bolao:831 | Palpites do participante | **#0a0118/80**, sem blur | 50 | dark-card · 3xl | animate-in | não | sim | sim |
| 27 | EstruturaMenu:284 | Editar seção/pasta/página | black/50 blur | **9000** | white / dark-card · 2xl | — | **sim** | não | sim |
| 28 | Placeholders:463 | Webhook de alertas | black/60 blur | 9999 | light-card / dark-card · 2xl | — | não | não | sim |
| 29 | SenhasPage:195 | Dados de acesso (**ui/Modal**) | modal-overlay | 50 | modal-container 22px; **dois X** | motion 0,25 s | não | não | sim |
| 30 | UserPermissionsModal:40 (via AdminPanel) | Configurações do usuário (**ui/Modal**) | modal-overlay | 50 | modal-container 22px | entrada sim, saída morta | não | não | sim |
| 31 | MoodPopup:137 | Humor do dia (toast no rodapé com blur em tela cheia) | blur 8px rgba | 9997/9998 | rgba(28,28,30) cinza iOS | spring | não | não | não (de propósito) |
| 32 | lib/confirm.tsx:83 | confirmDialog / promptDialog | rgba(0,0,0,.6) blur 2px | 100001 | `--dark-card` · 2xl | animate-in 150ms | sim | sim | sim |

**Padrão que predomina** (20 de 29): popup inline com `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm` e contêiner `bg-white dark:bg-dark-card rounded-2xl|3xl shadow-2xl`. Sem portal e sem Esc. Desses 20, 15 fecham com clique fora e 13 não têm animação de entrada.

### Componentes base (`src/components/ui/`): estão no padrão e quem usa

Contagem: arquivos de `src/` + `App.tsx` que importam o componente. Para comparar, **57 arquivos** do projeto têm `fixed inset-0` próprio, com 175 ocorrências.

| componente | usos (arquivos) | está no padrão? |
|---|---|---|
| OptionPicker | **30** | Em parte. Portal, `bg-dark-card`, `rounded-xl` e z-100000 estão certos. Hover e borda `white/x` não funcionam no tema claro (OptionPicker.tsx:117, 139–150, 162–185) |
| Modal | **11** (CrmComercial, CrmFinanceiro, CrmPessoas, CrmEmpresas, ClientModal, ArchiveClientModal, ProjectsModule, TodoPage, TaskTemplates, SenhasPage, UserPermissionsModal) | **Não** (ver veredito abaixo) |
| PageHeader | 7 | Não. Usa `designSystem.pageTitle`: `text-3xl`, `text-gray-900 dark:text-white`, subtítulo `text-sm`. O padrão é `text-2xl` com subtítulo `text-[10px] uppercase tracking-widest`. A paleta `gray-*` e o `designSystem.card` (`dark:bg-[#1a1a1a]`, `neutral-800`) são de outro sistema visual |
| ThemedDropdown | 6 | **Sim.** Tokens `rgb(var(--dark-card))`, portal e fecha com clique fora. É o melhor exemplo do grupo |
| DatePicker | 2 | Em parte. Gatilho `text-white` no claro (142) e brilho violeta (214) |
| DateRangePicker | 1 | Não. Hex por `isDark`, quebra no `darker` (20–23) |
| ActionPicker | 1 | Sim, em geral (`bg-white dark:bg-dark-card`, `border-black/10`) |
| MultiOptionPicker | **0** (código morto) | Mesmos defeitos de tema claro do OptionPicker |
| lib/confirm | 34 | Sim (tokens, portal, Esc, clique fora) |
| lib/toast | 45 | Sim. Só disputa o canto superior direito com o `ActivityToastStack` |
| LoadingSpinner | 28 | Sim. Ainda há 20 carregamentos próprios no grupo |

### Veredito: `ui/Modal.tsx` como padrão único de popup

**Serve de base, mas não está pronto.** A estrutura é boa: cabeçalho, abas, corpo e rodapé, `AnimatePresence` de `motion/react` e animação de 0,25 s em opacity + scale 0,95. Falta:

1. **Esc**: não fecha. É pré-requisito para o padrão.
2. **Portal + camada própria**: renderiza inline em `z-50`, o mesmo z do menu lateral. Fica por cima só pela ordem no DOM e por não haver transform em ancestral. Com `createPortal(document.body)` e `z-[9000]` a dependência some.
3. **Superfície**: `.modal-container` usa hex (`#1E1B2E` no escuro), diferente de `bg-dark-card` (`#14082e`). O overlay `.modal-overlay` não tem desfoque, e os outros 20 modais têm.
4. **Alinhamento**: `items-start pt-10`, enquanto o resto centraliza.
5. **Flexibilidade**: não dá para esconder o cabeçalho. A SenhasPage pôs um próprio e ficou com dois X.
6. **Detalhes**: botão fechar `neutral-800`/`gray-*`, ícone `purple-500`, e nenhum bloqueio de rolagem do fundo.

Com esses 6 ajustes, migrar os ~29 popups do grupo é troca mecânica. As 4 confirmações feitas à mão e os 2 `window.prompt` vão para `confirmDialog` / `promptDialog`, não para o Modal.

---

## 3. Os 5 problemas mais visíveis, em ordem

1. **Cada popup se comporta de um jeito.** São 29 popups, 27 feitos à mão. Uns fecham com Esc e outros não (só 6 fecham). Cinco não fecham nem clicando fora: ColaboradoresPage:1012, CollaboratorProfile:405, FeedbacksTab:337, OneOnOnesTab:501 e PdiTab:441. Há 3 raios, 6 overlays e 6 camadas de z, e 4 confirmações à mão ao lado do `confirmDialog` (ContratacaoPage:344, 618, 1403; CandidateDetailModal:787). Ainda sobram 2 `window.prompt` nativos (Cursos:1021, 1053).
2. **Tema claro quebrado em pontos de uso diário.** O modal de PDI escreve branco no branco (PdiTab:444, 459, 486, 497, 532). A Contratação tem 15 `hover:text-white` (ex.: 1453–1467). O OptionPicker, usado em 30 telas, tem borda e hover invisíveis no claro (OptionPicker.tsx:117, 162–185). O gatilho do DatePicker é branco (DatePicker:142). O menu "..." do Admin é escuro fixo (AdminPanel:607).
3. **A página Notificações mostra 4 avisos inventados** como se fossem reais, como "Projeto Alpha" e "Parceiro X" (Placeholders.tsx:24–29). Somado ao sino com `badge: 12` fixo, passa a impressão de alertas que não existem.
4. **O título da página muda de tamanho de tela para tela.** É `text-4xl` em Senhas:132, Diferenciais:153, Admin:419 e Automações (Placeholders:222); `text-3xl` em Colaboradores:321 e Minha Equipe:245; `text-2xl` em Planos e Contratação. As abas também variam: violeta cheio na Contratação (1453–1467) e no Bolão (1121), sublinhado no resto. Além disso, as 3 páginas do template `senhas` mostram o mesmo título fixo (SenhasPage:128).
5. **Carregamento em 4 estilos:** `LoadingSpinner` (uva), 12 spinners de borda próprios (PlanosDeCarreira:137, ContratacaoPage:535/1509, Bolao:531…, um deles azul em CandidateDetailModal:610), `Loader2` solto em 8 lugares (SenhasPage:140, Organograma:160, PortalAccessTab:78…) e texto cru "Carregando…" (Placeholders:470).
