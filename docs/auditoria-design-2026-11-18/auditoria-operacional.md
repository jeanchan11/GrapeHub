# Auditoria de design — grupo Operacional/Projetos (18/11/2026)

Somente leitura. Base: `padrao-design.md`. Caminhos relativos a `grapehub/`.

Observações de escopo antes da tabela:
- **Código morto** (não vale corrigir visual, vale apagar): `src/components/ProjectTasks.tsx` não é importado em lugar nenhum; o `export default` de `src/pages/OperacionalConsolidado.tsx` é importado em `App.tsx:37` mas a rota `operacional-consolidado` renderiza `DashboardOperacional` (`App.tsx:456`) — só `ChurnTab`/`RiscoDeChurnTab` estão vivos (já no padrão).
- **Duplicação**: `ChecklistSaida.tsx` e `ChecklistIntegracao.tsx` diferem em 9 linhas (diff); ambos derivam de `OnboardingOperacional.tsx`. Toda correção nesses três precisa ser feita 3 vezes (ou extrair um componente). Os números de linha abaixo valem igualmente para Saída e Integração.
- `MetaAdsReport.tsx` é o documento do PDF (estilos inline para rasterizar) — fora do padrão de tela, não auditado.
- `src/components/ui/Modal.tsx` (base usada pelo grupo) **não usa portal e não fecha com Esc**; o botão de fechar usa `dark:hover:bg-neutral-800` (linha 62) e o ícone `text-purple-500` (linha 56).
- Texto em inglês: nada relevante na interface (só "Status", "Leads", "Upload", "Dashboard", aceitos no uso da casa).

---

## 1. Achados

| arquivo:linha | categoria | o que está fora | correção sugerida |
|---|---|---|---|
| `ProjectsModule.tsx:3619-3622` | cabeçalho | Título fixo "Projetos & Parceiros" num template usado por **4 páginas** (`projects`) — todas mostram o mesmo nome | `pageLabel` via `findPageLabel(menu, activePage)` (App.tsx), como nas outras páginas de template reaproveitado |
| `ProjectsModule.tsx:3619`, `GestorDashboard.tsx:54-58`, `ParceirosSquad.tsx:239` (PageHeader → `designSystem.pageTitle` = text-3xl) | cabeçalho | Títulos em 3 tamanhos no mesmo grupo: 4xl (Projetos, Gestor — default do `SplitHeadline`), 3xl (Parceiros Squad), 2xl (Dashboard, Onboarding, Checklists, Playbook) | `className="text-2xl font-black tracking-tight text-dark-text"` + subtítulo `text-[10px] font-bold uppercase tracking-widest` |
| `ClientModal.tsx:993-1020` × `ProjectsModule.tsx:4411-4433` | abas | Popups irmãos com abas diferentes: cliente = sublinhado `modal-tab-active px-8 py-4`; projeto = barra segmentada com pílula animada (`layoutId`) | Escolher um; sugestão: sublinhado com ícone (`border-b-2 border-violet-500`, padrão (a)) nos dois |
| `DashboardOperacional.tsx:1255` | abas/cor | Barra de abas `border-b border-white/5` some no tema claro | `border-black/5 dark:border-white/5` |
| `DashboardOperacional.tsx:56-70` × `OperacionalAcoesTab.tsx:27,30` × `DashboardOperacional.tsx:889-933` | cor | Três paletas para "resultado" na mesma página: mapa próprio (`#2ecc8f` ok, `#f74c4c` ruim, `#4c8ef7` testando, `#f5c842` pausada); gráficos com `#10b981`/`#f43f5e`; aba Ações com **Ok = `#38bdf8` (azul)**. "Ok" é menta numa aba e azul na outra | Uma constante única de cores de resultado (emerald-500 bom/ok, rose-500 ruim, amber-500 pausada, sky/violet testando) exportada de `graficos.tsx` ou `src/lib` e usada nas três |
| `ProjectsModule.tsx:2368` | cor | Raiz da página `bg-dark-bg text-white`: todo texto sem cor própria fica branco no tema claro | `text-dark-text` |
| `GestorDashboard.tsx:48, 52` (+ h2/p em 64-83 sem cor) | cor | Raiz `text-white`: títulos e números dos cards ficam brancos sobre `bg-dark-card` branco no tema claro (invisíveis) | `text-dark-text` |
| `GestorDashboard.tsx:91-104` | cor/formato | recharts cru: grade `#334155`, eixos `#94a3b8`, `<Tooltip />` padrão (caixa branca), pizza com `#8b5cf6/#e11d48` | `Anel` e `BarrasPorCategoria` de `graficos.tsx` dentro de `Cartao` |
| `ParceirosSquad.tsx:246` | cor | Botão "Atualizar" `bg-dark-card text-white border-white/10` — texto branco em fundo branco no tema claro | `text-dark-text border-black/10 dark:border-white/10` |
| `OnboardingOperacional.tsx:2224`, `ChecklistSaida.tsx:1813`, `ChecklistIntegracao.tsx:1813` | cor | Fantasma do arraste "Movendo tarefa..." `bg-white/5 text-white` — invisível no claro | `bg-dark-card text-dark-text border-violet-500/50` |
| `ClientModal.tsx:1230-1240` | cor | Pílulas de motivo de saída com fundo saturado cheio + `text-white` (blue-500, cyan-500, purple-500, orange-500, red-600, slate-600) | Pílula do padrão: `bg-X-500/10 text-X-600 dark:text-X-400` ou `PilulaTag` (`ui/OptionPicker.tsx`) |
| `MetaAdsModal.tsx:601-637` | cor/formato | 6 KPIs com 6 cores de ícone (violet, orange, cyan, amber, emerald, pink) num `KpiCard` próprio (linha 49) | `CartaoKpi` com acento único (violeta) |
| `MetaAdsModal.tsx:521, 526`; `DashboardOperacional.tsx:1546, 1629` | cor | Container de modal em `bg-dark-bg` (fundo da página, mais escuro que a superfície de modal) | `modal-container` (ou `bg-dark-card`) |
| `ProjectsModule.tsx:5457, 5461, 5468, 5480, 5497` | cor | Classes de escuro conflitantes na mesma linha (`dark:text-slate-300 dark:text-gray-500`); `gray-*` misturado com `slate-*` também em 215, 542 | Uma só: `text-slate-500 dark:text-slate-400` |
| `DashboardOperacional.tsx:1249, 1576, 1662, 1678, 1703`; `OnboardingOperacional.tsx:1279`; `ChecklistSaida/Integracao.tsx:1119`; `GestorDashboard.tsx:63, 70, 77, 87, 99` | cor | `border-white/5`/`border-white/10` sem par para o tema claro (15 ocorrências) | `border-black/10 dark:border-white/10` |
| `ClientesMapa.tsx:142` | cor | Seletor Mapa/Satélite com ativo `bg-slate-900 text-white dark:bg-white dark:text-slate-900` | `ABAS_CLS` (barra segmentada) ou ativo violeta |
| `OnboardingOperacional.tsx:939` | cor | Chevron `text-slate-700` em grupo vazio — quase invisível no escuro | `text-slate-400` |
| `ParceirosSquad.tsx:255, 266, 277, 288, 301, 324` | formato | KPIs, barra de filtros e tabela em cartões à mão `bg-white dark:bg-dark-card/60 backdrop-blur-md rounded-3xl … shadow-2xl` | `CartaoKpi` para os 4 números; `Cartao` para filtros/tabela |
| `ParceirosSquad.tsx:384-385` | formato | Avatar com degradê violet→fuchsia e texto em `bg-clip-text` degradê | `bg-violet-500/10 text-violet-500` |
| `ProjectsModule.tsx:3868` | formato | Contêiner de grupo `rounded-3xl shadow-xl backdrop-blur-md dark:bg-dark-card/60` | `.gf-cartao` / `Cartao` |
| `ProjectsModule.tsx:4243` | formato | Cartão de produto `shadow-xl` + `before:bg-gradient-to-br` colorido por status | `.gf-cartao`; status como pílula/bolinha |
| `ProjectsModule.tsx:5265-5267` | formato | Cartão de NPS `rounded-3xl` com cabeçalho em degradê (`bg-gradient-to-r ${avgBg}`) | `Cartao` + número em `.numero` com cor |
| `GestorDashboard.tsx:62-83` | formato | Cards legados `rounded-2xl p-6`, número `text-4xl font-bold` sem `.numero`, ícone 32px | `CartaoKpi` |
| `OperacionalConsolidado.tsx:79-93, 687-691` | formato/cor | `KpiCard` antigo com quadrado cheio violet/emerald/amber/**blue-600/teal-600** — **código morto** | Apagar o `export default` e `KpiCard`/`ResultBar` |
| `ProjectsModule.tsx` (xl 75, lg 43, 2xl 28, md 12, 3xl 2) e `ClientModal.tsx` (2xl 19, xl 19, lg 11, md 10) | formato | Cantos misturados na mesma tela | Cartão = 22px (`.gf-cartao`/`modal-container`), controle = `rounded-xl`, chip = `rounded-full` |
| Modais (ver inventário) | popup/formato | 4 raios de modal no grupo: 16px (`rounded-2xl`, 23 modais), 22px (`modal-container`), 24px (`rounded-3xl`, Dashboard e Playbook), 32px (pasta do Playbook) | `modal-container` (22px) em todos |
| Todos os 17 arquivos | popup | **Nenhum modal fecha com Esc** (os únicos `Escape` são de inputs: `ProjectsModule.tsx:2430, 2724`); `ui/Modal.tsx` também não | `useEffect` de `keydown` Escape dentro de `ui/Modal.tsx` e migrar os modais para ele |
| `OnboardingOperacional.tsx:1050, 1198, 1278, 1421, 1647, 1901`; `ChecklistSaida/Integracao.tsx:923, 1028, 1118, 1249, 1368, 1506` | popup | 18 modais copiados: `div` fixa `z-50`/`z-[60]` (empata com o menu `z-50` — só fica por cima pela ordem no DOM), sem portal, **sem animação**, `bg-dark-card rounded-2xl` | `ui/Modal` (motion/react, `modal-overlay` + `modal-container`) com portal |
| `DashboardOperacional.tsx:1545, 1628` | popup | Sem animação, `bg-dark-bg rounded-3xl`, `z-[100]`/`z-[110]` | `ui/Modal` |
| `MetaAdsModal.tsx:505` | popup | Sem animação, sem portal, `z-[9999]`, `bg-dark-bg rounded-2xl` | `ui/Modal` (`maxWidth="max-w-[1200px]"`) |
| `AlertaSaldoBaixo.tsx:103` | popup/animação | `animate-in fade-in duration-200` não existe: o Tailwind é CDN sem o plugin `tailwindcss-animate` (`index.html:55-58`) → aparece seco | `motion.div` opacity + scale 0.95→1 |
| `ConfigProjetosModal.tsx:83-84` | popup | Sem animação; container próprio `bg-white dark:bg-dark-card rounded-2xl` | `modal-container` + motion |
| `ProjectsModule.tsx:3260-3274, 3327-3340` | popup | Modais "Mudar Grupo" e "Mudar de Página" com overlay e container próprios — e diferentes entre si (`bg-slate-900/20 dark:bg-black/40` × `bg-black/60`) | `modal-overlay` + `modal-container`, como os vizinhos (2374, 3426) |
| `PlaybookAcoes.tsx:637-657` | popup | `Modal` local (mesmo nome de `ui/Modal`), `z-[80]`, `bg-white/95 dark:bg-dark-card/95` translúcido, `rounded-3xl`, **sem animação de saída** (renderizado sem `AnimatePresence` em 1810-1838) | `ui/Modal` |
| `PlaybookAcoes.tsx:1617-1650` | animação/popup | "Pasta iOS": painel cresce de `scale: 0.3` a partir do cartão em 0,4 s, raio 24→32, `backdrop-blur-xl` | Se o Jean gosta, manter; senão `ui/Modal` largo. No mínimo raio 22 e 0,25 s |
| Grupo inteiro | popup | z-index de modal em 11 valores: 50, 60, 80, 100, 110, 150, 1000, 1100, 2000, 9000, 9100, 9999 | Uma escala: modal 1000, modal sobre modal 1100, alerta global 9000 — com portal |
| `OnboardingOperacional.tsx`, `ChecklistSaida.tsx`, `ChecklistIntegracao.tsx`, `PlaybookAcoes.tsx` (linha 2) | animação | Importam `framer-motion`; o resto do grupo usa `motion/react` | Trocar o import para `motion/react` |
| `OnboardingOperacional.tsx:1001, 2207`; `ChecklistSaida/Integracao.tsx:867`; `ProjectsModule.tsx:5441` | animação | Cascata `delay: idx * 0.06` por linha (+ 0,08 por grupo): 30 tarefas ≈ 1,8 s até a última aparecer | Teto no atraso: `delay: Math.min(idx, 8) * 0.04` |
| `ParceirosSquad.tsx:233, 366` | animação | `@keyframes rowFadeIn` inline com `idx * 0.04` em toda a tabela | Mesmo teto, ou sem cascata |
| `DashboardOperacional.tsx:1249` | animação | `animate-spin` aplicado no **botão inteiro** — o quadrado gira, não o ícone (ParceirosSquad 248 faz certo) | Mover `animate-spin` para o `<RefreshCw>` |
| `ProjectsModule.tsx:2804-2808` | animação | Spinner montado com `motion.div rotate repeat: Infinity` | `<Loader2 className="animate-spin" />` |
| `ProjectsModule.tsx:2355-2362` | carregamento | Spinner próprio `w-12 border-4 border-violet-500/20 border-t-violet-500` + "Carregando projetos..." | `LoadingSpinner` em `min-h-screen` |
| `ProjectsModule.tsx:2355` × `ParceirosSquad.tsx:447` | carregamento | O `if (isLoading) return` vem **antes** do guarda `modalOnly`: ao clicar numa linha em Parceiros Squad, o ProjectsModule embutido desenha um bloco `min-h-screen` com spinner embaixo da tabela | `if (isLoading) return modalOnly ? null : <LoadingSpinner/>` |
| `OnboardingOperacional.tsx:2194`; `ChecklistSaida/Integracao.tsx:1793` | carregamento | Spinner próprio `border-4 border-violet-500/30 border-t-violet-500` | `LoadingSpinner` |
| `GestorDashboard.tsx:48` | carregamento | "Carregando..." cru, em `text-white` | `LoadingSpinner` |
| `ClientModal.tsx:378, 1191, 1394`; `OnboardingOperacional.tsx:1218`; `ChecklistSaida/Integracao.tsx:1048` | carregamento | Spinners próprios `border-4`/`border-2` dentro de modal | `LoadingSpinner size="sm"` ou `Loader2` |
| `PlaybookAcoes.tsx:1421` | carregamento | Estado `carregando` é setado e nunca lido: enquanto carrega, os 10 nichos mostram "Clique para adicionar ações" (1396-1399) | `LoadingSpinner` até `carregando=false` |
| `OperacionalAcoesTab.tsx:84` | carregamento | "Calculando…" em texto cru | `LoadingSpinner` |
| `ProjectsModule.tsx:3866-3868` | vazio | Lista de grupos sem estado vazio: página de projetos sem projeto = área em branco | Ícone lucide (`FolderOpen`) + "Nenhum projeto nesta página" |
| `ParceirosSquad.tsx:342` | vazio | Busca sem resultado deixa a tabela só com cabeçalho | Linha "Nenhum parceiro encontrado" |
| `DashboardOperacional.tsx:1060`; `OperacionalConsolidado.tsx:784` | vazio/texto | Emoji em estado vazio (🔍 📝; 🎉 — este em código morto) | Frase cinza + ícone lucide |
| `OnboardingOperacional.tsx:145` (+ render 944, 962) | texto | Rótulo `'⬆️📢 SUBIR CAMPANHA'` e emoji `'📢'` desenhado antes → aparece **"📢 ⬆️📢 SUBIR CAMPANHA"**; 146 `'🧠💰'` | Tirar emoji do rótulo; ícone lucide por grupo (Rocket, GraduationCap, CalendarDays) |
| `OnboardingOperacional.tsx:145-148, 2151`; `ChecklistSaida.tsx:139-140, 1750`; `ChecklistIntegracao.tsx:139-140, 1750` | texto | Grupos de status com emoji como ícone (📢 🧠💰 🗓️ 🏆 🚪 ⚙️ ✅) | Bolinha da cor do grupo ou ícone lucide |
| `PlaybookAcoes.tsx:58-60, 1364, 1670` | texto | Ícone de nicho = emoji em `text-2xl` (🏛️ 🏦 ⚖️ 🛡️ 👨‍👩‍👧 🏥 💼 🔒 🏠 📁) | lucide: Landmark, Building2, Scale, ShieldCheck, Users, HeartPulse, Briefcase, Lock, Home, Folder |
| `PlaybookAcoes.tsx:603-606, 631, 756, 1378-1393, 1726, 1407` | texto/cor | Status com 🟢 🟡 🔴 🔵 e 🔥; amarelo em `yellow-400` e vermelho em `red-*` (padrão é amber/rose) | Bolinha `w-1.5 h-1.5 rounded-full bg-emerald-500/amber-500/rose-500/sky-500`; `Flame` lucide |
| `ProjectsModule.tsx:5419-5422` | texto | Ícone de plataforma do token em emoji (📘 🔴 🎵 🔑) | Ícone lucide/SVG da plataforma |
| `ProjectsModule.tsx:3038, 4887, 5072`; `DashboardOperacional.tsx:1204` | texto | Curtida alterna entre emoji 👍 (curtido) e `ThumbsUp` lucide (não curtido) | `ThumbsUp` com `fill="currentColor"` text-violet-500 quando curtido |
| `ProjectsModule.tsx:5584, 5630, 5691` | texto | 🔒 em filtro, selo e placeholder de nota interna | `Lock` lucide |
| `DashboardOperacional.tsx:1336` | texto | "⚠" em caixa de erro | `AlertTriangle` lucide |
| `ProjectsModule.tsx:5776, 5802` | botão | "Excluir" `bg-red-500 rounded-lg` (perigo em red e canto lg) | `bg-rose-600 hover:bg-rose-700 text-white rounded-xl` |
| `DashboardOperacional.tsx:1129, 1184` | botão | Primário `bg-violet-500 rounded-lg` | `bg-violet-600 hover:bg-violet-700 rounded-xl` |
| `ProjectsModule.tsx:3246, 3601, 3768`; `ConfigProjetosModal.tsx:178`; `AlertaSaldoBaixo.tsx:152` | botão | Hover do primário para mais claro (`violet-500`) e `shadow-lg shadow-violet-600/20`; 3500 usa `violet-700` | `hover:bg-violet-700`, sem sombra colorida |
| `OnboardingOperacional.tsx:2231-2234`; `ChecklistSaida/Integracao.tsx:1820-1823` | botão | "Novo status" sem `onClick` (não faz nada) | Implementar ou remover |
| `ParceirosSquad.tsx:314, 317` | botão | Botões Filtro e Download sem `onClick` | Implementar ou remover |
| `OnboardingOperacional.tsx:197` (e equivalente nos Checklists) | formato | `SingleDatePicker` próprio duplicando `ui/DatePicker.tsx` | Usar `ui/DatePicker` |

### Contagem por categoria (linhas da tabela; repetições agrupadas)
- cor: 14
- formato: 10 (inclui 1 de cor/formato no MetaAds e o Consolidado morto)
- cabeçalho/abas: 4
- popup: 10
- animação: 6
- carregamento: 7
- vazio: 3
- texto (emoji): 8
- botão: 5

---

## 2. Inventário de popups/modais

Esc: **nenhum** fecha com Esc. "Fora" = clique no overlay fecha.

| arquivo:linha | modal | overlay | z | container | animação | portal | fora |
|---|---|---|---|---|---|---|---|
| ProjectsModule.tsx:2374 | Produto | `modal-overlay` | 1000 | `modal-container` (22px) | motion/react op+scale .95+y | não | sim |
| ProjectsModule.tsx:3067 | Cadastrar Novo Produto | `modal-overlay` | 100 | `modal-container` | motion/react | não | sim |
| ProjectsModule.tsx:3260 | Mudar Grupo | `bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm` | 1000 | `bg-white dark:bg-dark-card rounded-2xl` | motion/react | não | sim |
| ProjectsModule.tsx:3327 | Mudar de Página | `bg-black/60 backdrop-blur-sm` | 1000 | `bg-white dark:bg-dark-card rounded-2xl` | motion/react | não | sim |
| ProjectsModule.tsx:3426 | Nova/Editar Reunião | `modal-overlay` | 1000 | `modal-container` | motion/react | não | sim |
| ProjectsModule.tsx:3513 | Novo Parceiro | `modal-overlay` | 150 | `modal-container` | motion/react | não | sim |
| ProjectsModule.tsx:4383 | Projeto (popup principal) | `ui/Modal` (`modal-overlay`) | 50 | `modal-container` | motion/react | não | sim |
| ProjectsModule.tsx:5761 / 5787 | Confirmar exclusão (projeto / produto) | `ui/Modal` | 50 | `modal-container` | motion/react | não | sim |
| ProjectsModule.tsx:5819 | Token | `modal-overlay` | 1000 | `modal-container` | motion/react | não | sim |
| ProjectsModule.tsx:6027 | Prévia de imagem | `modal-overlay` | 2000 | imagem `rounded-xl` | motion/react op+scale .9 | não | sim |
| ConfigProjetosModal.tsx:83 | Configurações da página | `bg-black/50 backdrop-blur-sm` | 9000 | `bg-white dark:bg-dark-card rounded-2xl` | nenhuma | sim | sim |
| MetaAdsModal.tsx:505 | Meta Ads | `bg-black/60 backdrop-blur-sm` | 9999 | `bg-dark-bg rounded-2xl` | nenhuma | não | sim |
| AlertaSaldoBaixo.tsx:103 | Saldo baixo (global) | `bg-black/50 backdrop-blur-sm` | 9100 | `bg-white dark:bg-dark-card rounded-2xl` | `animate-in fade-in` (classe inexistente → nenhuma) | sim | não (só X / botões) |
| ClientModal.tsx:964 | Cliente | `ui/Modal` | 50 | `modal-container` | motion/react | não | sim |
| ClientModal.tsx:1548 | Produto do cliente | `bg-black/60 backdrop-blur-sm` | 1100 | `modal-container` | motion/react | não | sim |
| DashboardOperacional.tsx:1545 | Projetos por resultado | `bg-black/60 backdrop-blur-sm` | 100 | `bg-dark-bg rounded-3xl` | nenhuma | não | sim |
| DashboardOperacional.tsx:1628 | Detalhe do projeto | `bg-black/70 backdrop-blur-sm` | 110 | `bg-dark-bg rounded-3xl` | nenhuma | não | sim |
| OnboardingOperacional.tsx:1050 | Adicionar cliente | `bg-black/60 backdrop-blur-sm` | 50 | `bg-dark-card rounded-2xl` | nenhuma | não | sim |
| OnboardingOperacional.tsx:1198 | Modelo padrão | idem | 50 | idem | nenhuma | não | sim |
| OnboardingOperacional.tsx:1278 | Item do modelo | idem | 60 | `bg-dark-card border-white/10 rounded-2xl` | nenhuma | não | sim |
| OnboardingOperacional.tsx:1421 | Detalhe da tarefa | idem | 50 | `bg-dark-card rounded-2xl` | nenhuma | não | sim |
| OnboardingOperacional.tsx:1647 | Editor de documento | idem | 60 | idem | nenhuma | não | sim |
| OnboardingOperacional.tsx:1901 | Detalhe da subtarefa | idem | 50 | idem | nenhuma | não | sim |
| ChecklistSaida.tsx / ChecklistIntegracao.tsx:923, 1028, 1118, 1249, 1368, 1506 | os mesmos 6 (adicionar, modelo, item, tarefa, documento, subtarefa) | `bg-black/60 backdrop-blur-sm` | 50/60 | `bg-dark-card rounded-2xl` | nenhuma | não | sim |
| PlaybookAcoes.tsx:637 (usado em 722, 850, 1046) | Editar ação / Comparar / Detalhe | `bg-black/70 backdrop-blur-sm` | 80 | `bg-white/95 dark:bg-dark-card/95 rounded-3xl` | framer-motion entrada op+scale .92+y; sem saída | não | sim |
| PlaybookAcoes.tsx:1617 | Pasta do nicho | `bg-black/50 backdrop-blur-xl` | 60/61 | `bg-white/95 dark:bg-dark-card/95`, raio 32 | framer-motion scale .3 a partir do cartão, 0,4 s | não | sim |

Popovers com portal (não modais, ok): `ProjectsModule.tsx:206` (tooltip de erro, z 9999), `OnboardingOperacional.tsx:329, 408, 773` e equivalentes nos Checklists (data e responsável, z 9999).

**Padrão predominante**: por quantidade, o modal feito à mão — `div fixed inset-0 bg-black/60 backdrop-blur-sm` + `bg-dark-card rounded-2xl`, **sem animação, sem portal, sem Esc**: 23 de 40 (18 cópias em Onboarding/Checklists + Dashboard ×2, MetaAds, Config, Alerta). O padrão-alvo (motion/react + `modal-overlay` + `modal-container`) aparece em 11 (9 em ProjectsModule, 2 em ClientModal); outros 2 do ProjectsModule têm motion mas container próprio, e o Playbook tem 4 no estilo dele (framer-motion, rounded-3xl translúcido).

---

## 3. Os 5 problemas mais visíveis, em ordem

1. **Onboarding e Checklists com emoji no lugar de ícone, e rótulo duplicado** — `OnboardingOperacional.tsx:145` (+ 944/962) desenha "📢 ⬆️📢 SUBIR CAMPANHA"; os grupos de status das três páginas usam emoji (🧠💰 🗓️ 🏆 🚪 ⚙️ ✅). É a primeira coisa que se vê nessas telas.
2. **Playbook de Ações inteiro em emoji e sem carregamento** — ícones de nicho (`PlaybookAcoes.tsx:58-60, 1364`), status 🟢🟡🔴🔵 (603-606, 1378-1393) e, enquanto carrega, todos os nichos dizem "Clique para adicionar ações" porque `carregando` (1421) nunca é usado.
3. **Projetos com título fixo em 4 páginas** — `ProjectsModule.tsx:3619` mostra "Projetos & Parceiros" em todas as páginas do template `projects`, em `text-4xl` enquanto as vizinhas usam 2xl; e o spinner de página (2355) vaza para Parceiros Squad ao clicar numa linha.
4. **"Ok" muda de cor entre abas do Dashboard Operacional** — menta `#2ecc8f` no mapa de resultados (`DashboardOperacional.tsx:56`), azul `#38bdf8` na aba Ações e Nichos (`OperacionalAcoesTab.tsx:27`), e verde/vermelho dos gráficos (`#10b981/#f43f5e`) diferentes dos da lista (`#2ecc8f/#f74c4c`).
5. **Popups sem Esc e em 4 formatos** — nenhum dos 40 fecha com Esc; 23 abrem secos (sem animação: `OnboardingOperacional.tsx:1050…`, `DashboardOperacional.tsx:1545/1628`, `MetaAdsModal.tsx:505`); raios 16/22/24/32 px e z-index de 50 a 9999.

Menções honrosas (tema claro): `GestorDashboard.tsx:52` e `ParceirosSquad.tsx:246` com texto branco sobre branco; `DashboardOperacional.tsx:1249` gira o botão inteiro ao atualizar.
