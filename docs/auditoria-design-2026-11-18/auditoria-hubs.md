# Auditoria de design — grupo Hubs, Tarefas e Conteúdo (18/11/2026)

Somente leitura. Base: `padrao-design.md`. Caminhos relativos à raiz do grapehub.
Observação estrutural: `VisualHub.tsx` (4.667 linhas) e `ImplementacaoIA.tsx` (3.606) são quase cópias — quase todo achado de um vale para o outro, na linha equivalente. Corrigir em par.
`IdeaisCriativos.tsx` e `ChamadosGrapehub.tsx` são só wrappers do `TodoStaff.tsx`: herdam todos os achados dele.

---

## 1. Tabela de achados

### Cor
| arquivo:linha | categoria | o que está fora | correção sugerida |
|---|---|---|---|
| VisualHub.tsx — 48 ocorrências (385, 387, 456, 479, 499, 513, 563, 807, 811, 852, 992, 1094, 1107, 1193, 1679, 1681, 2051, 2114, 2255, 2268, 2273, 2278, 2437, 2439, 2484, 2750, 2755, 2826, 2829, 3037, 3054, 3096, 3127, 3132, 3342, 3356, 3420, 3486, 3496, 3505, 3526, 3527, 3541, 3545, 3547, 3562, 3606, 4494) | cor | `border-white/5`, `border-white/10` sem par claro: no tema claro a borda some (cabeçalho e containers de modal, células da tabela) | `border-black/10 dark:border-white/10` (ou `/5`) |
| ImplementacaoIA.tsx — 40 ocorrências (327, 329, 354, 371, 389, 456, 467, 485, 502, 516, 578, 802, 908, 1291, 1396, 1397, 1464, 1465, 1752, 1931, 1948, 1953, 1958, 2117, 2119, 2164, 2327, 2333, 2337, 2411, 2416, 2443, 2444, 2508, 2518, 2527, 2547, 2553, 2555, 2586) | cor | mesmo problema | idem |
| TodoStaff.tsx — 22 ocorrências (1586, 1938, 2010, 2715, 2733, 2768, 2781, 2794, 2878, 2926, 2928, 2929, 3002, 3035, 3125, 3160, 3221, 3324, 3337, 3421, 3555, 3570) | cor | `border-white/[0.06]`/`[0.07]` sem par claro (abas, KPIs, cabeçalho das colunas) | idem |
| TodoPage.tsx — 10 ocorrências (1326, 1328, 1511, 1632, 1652, 1661, 1662, 1717, 1730, 1744) · MarketingAcoes.tsx — 13 (174, 388, 405, 411, 425, 435, 467, 522, 533, 544, 559, 573, 630) · RichTextEditor.tsx:353 | cor | mesmo problema | idem |
| MeetingNotes.tsx — 55 ocorrências (148, 163, 168, 179, 180, 184, 186, 189, 191, 195, 204, 207, 213, 216, 241, 260, 275, 277, 284…679) | cor | paleta `gray-*` + `bg-white`/`text-gray-900 dark:text-white` em vez dos tokens | `bg-dark-card`, `text-dark-text`, `text-slate-500 dark:text-slate-400`, `border-black/10 dark:border-white/10` |
| TaskDetailModal.tsx — 26 ocorrências `gray-*` (398, 407, 423, 458, 480, 492, 502, 511, 534, 571, 576, 618, 626, 629, 644, 645, 686, 695, 701, 729–731, 748, 758, 781, 789); 407 e TodoPage.tsx:1883 usam `dark:hover:bg-neutral-800` | cor | cinza fixo/neutral no escuro | `hover:bg-black/5 dark:hover:bg-white/5`; textos em `slate` |
| TaskDetailModal.tsx:429, 436, 484, 604, 605, 622, 795; avatares em degradê 739, 771 | cor | acento `purple-*` em vez do violeta do sistema; avatar `bg-gradient-to-br from-purple-500 to-violet-600` | `violet-500/600`; avatar com `UserAvatar` ou `bg-violet-500/20 text-violet-400` |
| TodoStaff.tsx:1371, 1407, 1429, 2710 | cor/botão | modal "Nova Recorrente" e botão "Recorrente" do topo inteiros em azul (`text-blue-500`, chip `bg-blue-600`, primário `bg-blue-600 hover:bg-blue-500`) | violeta: título `text-violet-500`, primário `bg-violet-600 hover:bg-violet-700`, botão do topo secundário (`bg-dark-card border border-black/10 dark:border-white/10`) |
| VisualHub.tsx:4494-4496, 4517-4519 · ImplementacaoIA.tsx:3451-3453 | cor | botões secundários do cabeçalho com acentos aleatórios (`hover:text-fuchsia-400`, ícone `text-fuchsia-400`; `hover:border-sky-500/30`, ícone `text-sky-400`) | ícones `text-violet-500` e `hover:border-violet-500/30`, como o botão "Editar Modelo Padrão" ao lado |
| MeetingNotes.tsx:157-160, 169 | cor | KPIs com hex fixo inline (`#6366f1` índigo, `#8b5cf6`, `#10b981`, `#f59e0b`) via `style` | `CartaoKpi` de `graficos.tsx` (cor = `--accent-color`) ou classes `text-violet-500/emerald-500/amber-500` |
| SolicitacoesTab.tsx:152 | cor | autor do comentário com hex inline (`#0d9488`, `#7C3AED`) | `text-teal-500` / `text-violet-500` |
| VisualHub.tsx:859, 3613, 4569, 4573 · ImplementacaoIA.tsx:3505, 3509 · TodoPage.tsx:1798 | cor | `text-white` sobre `bg-dark-card`/`bg-dark-bg/80`/`bg-white/5` (nome do arquivo no preview, "Movendo grupo…", overlay de arraste): invisível no tema claro | `text-dark-text` |
| TodoPage.tsx:1152, 1155, 1162, 1171, 1185 | cor | seletor de visualização, contador e abas em `bg-white dark:bg-white/5 border-slate-200` | `bg-dark-card border border-black/10 dark:border-white/10` |
| Estudio.tsx:1264-1265 | cor/botão | banner-botão "Gerar vídeo com IA" com degradê `from-violet-600 to-fuchsia-600` + `shadow-2xl shadow-violet-900/30` + `rounded-3xl` | `bg-violet-600 hover:bg-violet-700 rounded-[22px]` (sombra do `.gf-cartao`) ou `Cartao` com CTA violeta dentro |

### Formato
| arquivo:linha | categoria | o que está fora | correção sugerida |
|---|---|---|---|
| TodoStaff.tsx:446, 724, 1137, 1369, 1480, 1664 · ImplementacaoIA.tsx:3100 · ListaPage.tsx:107 | formato/popup | 8 modais com `bg-dark-bg rounded-3xl border-dark-text/10` — fundo de página (não de cartão) e canto diferente dos outros modais da mesma tela (`rounded-2xl bg-dark-card`) | `bg-dark-card rounded-2xl border border-black/10 dark:border-white/10` — ou migrar para `ui/Modal` |
| TodoPage.tsx:1730, 1744 | formato | colunas/grupos em `rounded-3xl bg-dark-bg/40` ao lado de cartões `rounded-xl`/`rounded-2xl` | `Cartao` (`.gf-cartao`) ou `bg-dark-card rounded-2xl` |
| TodoStaff.tsx:2758-2775 · MeetingNotes.tsx:154-170 · MarketingAcoes.tsx:385-396 | formato | KPIs montados à mão (`bg-dark-card border rounded-2xl` / `bg-white … shadow-sm`), número sem `.numero` (Azeret Mono) | `CartaoKpi` de `src/components/graficos.tsx` |
| ImplementacaoIA.tsx:2327 | formato | modal de detalhe com tamanho fixo em px (`width: 860px; height: 560px`) — diferente do VisualHub equivalente (2750: `max-w-5xl`, 90vh) | `w-full max-w-5xl` + `h-[90vh]`, igual ao VisualHub |
| TodoStaff.tsx:2010, 3421, 3570 (cores em 84-86, 185-188, 2192) | formato | cabeçalho de coluna em degradê (`bg-gradient-to-r from-x-500/20 to-x-600/10`) | fundo chapado `bg-x-500/10` ou só o rótulo com bolinha da cor |
| TodoStaff.tsx:3514 | formato | overlay de arraste com `bg-white dark:bg-dark-card/95 … shadow-violet-500/10` (sombra colorida) | `bg-dark-card shadow-2xl` |

### Cabeçalho e abas
| arquivo:linha | categoria | o que está fora | correção sugerida |
|---|---|---|---|
| TodoStaff.tsx:2703-2704 + App.tsx:459 | cabeçalho | template `todo-staff` é chamado sem `pageTitle`: toda página que usa o template mostra "TODO **Staff**" e o subtítulo fixo "Organização interna do time · seção grape" (mesmo bug do "Chamados CRM") | passar `pageTitle={findPageLabel(menu, activePage)}` no `case 'todo-staff'` |
| TodoPage.tsx:1142-1148 + App.tsx:393 | cabeçalho/texto | título fixo "To Do **Gestor**" (inglês + fixo, template `todo` reaproveitado), `text-4xl`, `text-light-text dark:text-white` | `SplitHeadline` com `pageLabel`, `className="text-2xl font-black tracking-tight text-dark-text"` |
| MeetingNotes.tsx:148 | cabeçalho | `text-4xl text-gray-900 dark:text-white`; o destaque violeta é o `pageLabel` inteiro ("Notas de **Reunião Semanal Comercial**") e não a última palavra | `SplitHeadline text={…} highlight={última palavra}` em `text-2xl … text-dark-text` |
| Estudio.tsx:1247-1249 | cabeçalho | `SplitHeadline` sem `className` → cai no padrão do componente (`text-4xl text-slate-900 dark:text-white`); subtítulo `text-sm text-gray-500` | `className="text-2xl font-black tracking-tight text-dark-text"` |
| IdeaisCriativos.tsx:17 + App.tsx:463 | cabeçalho | título fixo "Ideais Criativos" no componente, não vem do menu | receber `pageLabel` como o `ChamadosGrapehub` faz |
| TodoStaff.tsx:2731-2752 (e o calendário 371) | abas | abas Tarefas/Ideias com fundo violeta cheio `bg-violet-600 text-white shadow-lg shadow-violet-500/20` | sublinhado `border-b-2 border-violet-500` com ícone, ou `ABAS_CLS` |
| TodoPage.tsx:1182-1215 | abas | Ativos/Arquivadas com fundo cheio, e cada aba de uma cor (`bg-violet-500` / `bg-emerald-500`, ambas com sombra colorida) | idem |
| TaskDetailModal.tsx:429, 436 | abas | sublinhado e contador em `purple-500` | `violet-500` |
| MarketingAcoes.tsx:408-413 | abas (filtro) | filtro de status em pílula de fundo violeta cheio | `ABAS_CLS` ou pílula `bg-violet-500/10 text-violet-500` no ativo |

### Popup / modal
| arquivo:linha | categoria | o que está fora | correção sugerida |
|---|---|---|---|
| Todos os ~40 modais do grupo, exceto `MediaLightbox.tsx:15` | popup | **nenhum fecha com Esc** (os `Escape` encontrados são de inputs de renomear) | migrar para `ui/Modal` depois de ele ganhar `useEffect` de `keydown` Escape; ou hook `useEsc(onClose)` |
| VisualHub.tsx:2248, 2346, 2436, 3727, 3981 · ImplementacaoIA.tsx:1924, 2026, 2116, 2325, 2646, 2900, 3099 · TodoStaff.tsx:445, 723, 990, 1135, 1325, 1368, 1479, 1663 · ListaPage.tsx:106, 682 · ListaTaskDetailModal.tsx:295, 652 · TaskDetailModal.tsx:324, 818 · Estudio.tsx:397, 1067 · EstudioConfig.tsx:311 · MarketingAcoes.tsx:216, 557 | popup | 31 modais **sem portal**, renderizados dentro da página. Hoje cobrem o menu (z-50 posterior no DOM), mas qualquer ancestral com `transform` (os grupos do VisualHub/IA são `motion.div` com `y`/`scale`, 4544/3479) os prende à área da página | `createPortal(…, document.body)` — embutir no `ui/Modal` |
| (vários) | popup | z-index sem escala: 50, 60, 100, 2000, 9000, 9998, 9999, 10000, 99999 no mesmo grupo. Ex.: detalhe da tarefa do VisualHub em portal z-[9998] (2748) e detalhe da subtarefa z-50 sem portal (3981) | escala única: modal z-[100] em portal, modal sobre modal z-[110], lightbox z-[120]; confirm/toast já estão em 100000+ |
| VisualHub.tsx, ImplementacaoIA.tsx, TodoStaff.tsx, ListaPage.tsx, PostagensUI.tsx:299, MarketingAcoes.tsx:557, MediaLightbox.tsx:31 | popup/animação | modais **sem animação de entrada** (nenhum `motion` nos containers; os `motion.div` desses arquivos são de lista/linha) | `motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}}` ~0.2 s (o que o `ui/Modal` já faz) |
| TodoStaff.tsx:445, 723, 1368, 1479 | popup | Tags, Nova/Editar Tarefa, Nova Recorrente e Nova/Editar Ideia **não fecham com clique fora** (overlay sem `onClick`) — diferente dos outros modais da mesma página (1135, 1663) | `onClick={onClose}` no overlay + `stopPropagation` no container |
| VisualHub.tsx:845, 3599, 3673 · ImplementacaoIA.tsx:2625 · TodoStaff.tsx:990, 1325 · ListaTaskDetailModal.tsx:652 · TaskDetailModal.tsx:818 · MarketingAcoes.tsx:216 | popup | **9 lightboxes/previews feitos à mão**, cada um com overlay, z-index e botão de fechar próprios (`bg-black/80`…`/95`, com e sem blur) | usar `MediaLightbox` (já tem portal, Esc, setas e PDF) |
| `ui/Modal.tsx` (usado só em TodoPage.tsx:1808) | popup | o componente padrão é usado por **1** modal do grupo, e ele mesmo não tem Esc nem portal; botão fechar com `dark:hover:bg-neutral-800` | dar Esc + portal ao `ui/Modal` e migrar os modais simples (Tags, AddTask, Etapas, Nova postagem, ModalOverlay do MarketingAcoes) |
| Estudio.tsx:397-398 | popup | assistente de geração (copy → avatar → áudio → vídeo) fecha com **clique fora**, perdendo o passo em andamento; sem `exit` (a animação de saída do `AnimatePresence` não roda) | clique fora só com confirmação quando há conteúdo; `exit={{opacity:0, scale:0.97}}` |
| ListaPage.tsx:644-645 | popup/animação | `ListaTaskDetailModal` montado sem `AnimatePresence`: o `exit` definido no componente (301) nunca roda | envolver em `<AnimatePresence>` |
| VisualHub.tsx:2563 · TaskDetailModal.tsx:294, 299, 305 · Estudio.tsx:486 | popup/texto | `alert()` / `confirm()` / `window.confirm()` nativos | `toast.error(...)` de `src/lib/toast` e `confirmDialog({ message, danger: true })` de `src/lib/confirm` (os dois arquivos já usam o padrão em outros pontos) |

### Animação
| arquivo:linha | categoria | o que está fora | correção sugerida |
|---|---|---|---|
| VisualHub.tsx:2194 · ImplementacaoIA.tsx:1870 · TodoStaff.tsx:3484, 3596 · MeetingNotes.tsx:299 | animação | entrada em cascata por item (`delay: idx * 0.06`, 0,35 s): sem teto, um grupo com 30 clientes leva ~2,1 s para a última linha aparecer | limitar: `delay: Math.min(idx, 8) * 0.04` ou animar só o container |
| VisualHub.tsx:4547 · ImplementacaoIA.tsx:3482 | animação | grupos em cascata `0.4 s + gIdx * 0.08` com `y: -24` e `scale` | `duration: 0.25`, `delay` com teto, sem `scale` |
| TodoPage.tsx:85 · TodoStaff.tsx:128 · Estudio.tsx:888 | animação | barra de progresso `transition-all duration-1000` | `transition-[width] duration-300` |
| TodoStaff.tsx — 90 `transition-all` | animação | `transition-all` em todo card/linha do quadro | `transition-colors` |
| VisualHub, ImplementacaoIA, TodoStaff, ListaPage, ListaTaskDetailModal, MeetingNotes, Estudio, EstudioConfig importam `framer-motion`; TodoPage e TaskDetailModal importam `motion/react` | animação | duas bibliotecas no mesmo grupo | padronizar em `motion/react` (a do menu e do `graficos.tsx`) |

### Carregamento e feedback
| arquivo:linha | categoria | o que está fora | correção sugerida |
|---|---|---|---|
| VisualHub.tsx:4534 · ImplementacaoIA.tsx:3469 · ListaPage.tsx:516 | carregamento | spinner próprio `border-4 border-violet-500/30 border-t-violet-500 animate-spin` no carregamento da página | `LoadingSpinner` centralizado |
| TodoPage.tsx:1314 | carregamento | `Loader2` 32 px `text-purple-500` solto | `LoadingSpinner` |
| TodoStaff.tsx (sem estado `loading`) → 3476 | carregamento/vazio | não há estado de carregamento: o quadro abre com "Nenhum item" em todas as colunas até a API responder (vale para Chamados e Ideais Criativos) | `loading` + `LoadingSpinner` antes do quadro |
| Estudio.tsx:1167, 1275 | carregamento/vazio | sem `loading`: mostra "Nenhum vídeo gerado ainda" enquanto a fila carrega | idem |
| TaskHistory.tsx:36 | carregamento | texto cru "Carregando histórico..." | `Loader2` pequeno + texto cinza, ou `LoadingSpinner size="sm"` |
| VisualHub.tsx:2366, 3107, 3211, 3434 · ImplementacaoIA.tsx:2046, 2457 · MeetingNotes.tsx:244 | carregamento | mini-spinners `border-2 … animate-spin` feitos à mão ao lado de `Loader2` no mesmo arquivo | `Loader2` |
| VisualHub.tsx (42 `catch` silenciosos, 0 `toast`) · ImplementacaoIA.tsx (37, 0) · ListaTaskDetailModal.tsx (10, 0) · ListaPage.tsx (8, 0) · MarketingAcoes.tsx (2, 0) · SolicitacoesTab.tsx (4, 0) | carregamento | erro de salvar/carregar não aparece para o usuário (`catch {}` / `.catch(() => {})`) | `toast.error('Não foi possível …')` |

### Estado vazio, texto e emoji
| arquivo:linha | categoria | o que está fora | correção sugerida |
|---|---|---|---|
| TodoStaff.tsx:2029, 3584 | vazio | emoji como ícone de coluna vazia (📋, 💡) — aparece em Chamados e Ideais Criativos também | `ClipboardList` / `Lightbulb` do lucide, `text-slate-400` |
| SolicitacoesTab.tsx:109 | vazio | ícone `Plus` como ilustração de lista vazia | `Inbox` do lucide |
| SolicitacoesTab.tsx:132 | texto | "📎 Entregue pelo cliente" com emoji | `<Paperclip size={11} />` |
| VisualHub.tsx:309, 532-537, 2019, 2094 · ImplementacaoIA.tsx:227, 255, 368, 1784 · ListaPage.tsx:299-300, 356 | texto/ícone | grupos de status usam emoji como ícone (🔵 🟠 🏆 📌), escolhido num seletor de emojis | bolinha da cor do grupo (`w-2 h-2 rounded-full` com `group.color`), como na `PilulaTag`; manter o emoji só se o Jean quiser |
| TodoStaff.tsx:2703 · TodoPage.tsx:1143 | texto | "TODO Staff" / "To Do Gestor" em inglês | vir do `pageLabel` (ver Cabeçalho) |
| EstudioConfig.tsx:319 | texto | "Visível apenas para o super admin." — falso desde 21/10/2026: `diretor-operacional` também abre (CLAUDE.md, `gereCatalogo`) | "Visível para o superadmin e a diretoria operacional." |

---

## 2. Inventário de popups/modais

Legenda: Esc = fecha com Esc; Fora = fecha com clique no overlay. Nenhum modal do grupo usa `animate-in`.

| # | arquivo:linha | modal | overlay | z | container | animação | portal | Esc | Fora |
|---|---|---|---|---|---|---|---|---|---|
| 1 | VisualHub.tsx:384 | ColumnConfigModal | black/60 blur-sm | 9999 | dark-card, border-white/10, rounded-2xl, max-w-md | nenhuma | sim | não | sim |
| 2 | VisualHub.tsx:845 | Preview de arquivo (célula) | black/90 blur-xl | 9999 | dark-card, rounded-2xl, 92vw×92vh | nenhuma | sim | não | sim |
| 3 | VisualHub.tsx:2248 | AddTaskModal | black/60 blur-sm | 50 | dark-card, border par, rounded-2xl, max-w-md | nenhuma | não | não | sim |
| 4 | VisualHub.tsx:2346 | TemplateModal | black/60 blur-sm | 50 | dark-card, rounded-2xl, max-w-lg | nenhuma | não | não | sim |
| 5 | VisualHub.tsx:2436 | Item do modelo (sobre o 4) | black/60 blur-sm | 60 | dark-card, border-white/10, rounded-2xl, max-w-7xl 92vh | nenhuma | não | não | sim |
| 6 | VisualHub.tsx:2748 | TaskDetailModal | black/70 blur-sm | 9998 | dark-card, border-white/10, rounded-2xl, max-w-5xl 90vh | nenhuma | sim | não | sim |
| 7 | VisualHub.tsx:3599 | Preview de arquivo (detalhe) | black/90 blur-xl | 9999 | dark-card, rounded-2xl, 92vw×92vh | nenhuma | sim | não | sim |
| 8 | VisualHub.tsx:3673 | Lightbox de imagem do comentário | black/95 blur-xl | 99999 | imagem solta | nenhuma | sim | não | sim |
| 9 | VisualHub.tsx:3727 | DocEditorModal | black/60 blur-sm | 60 | dark-card, rounded-2xl, max-w-3xl 85vh | nenhuma | não | não | sim |
| 10 | VisualHub.tsx:3981 | SubtaskDetailModal | black/60 blur-sm | 50 | dark-card, rounded-2xl, max-w-7xl 92vh | nenhuma | não | não | sim |
| 11 | ImplementacaoIA.tsx:326 | StatusConfigModal | black/60 blur-sm | 9999 | dark-card, border-white/10, rounded-2xl, max-w-lg | nenhuma | sim | não | sim |
| 12 | ImplementacaoIA.tsx:1924 | AddTaskModal | black/60 blur-sm | 50 | dark-card, rounded-2xl, max-w-md | nenhuma | não | não | sim |
| 13 | ImplementacaoIA.tsx:2026 | TemplateModal | black/60 blur-sm | 50 | dark-card, rounded-2xl, max-w-lg | nenhuma | não | não | sim |
| 14 | ImplementacaoIA.tsx:2116 | Item do modelo | black/60 blur-sm | 60 | dark-card, rounded-2xl, max-w-7xl | nenhuma | não | não | sim |
| 15 | ImplementacaoIA.tsx:2325 | TaskDetailModal | black/60 blur-sm | 50 | dark-card, border-white/10, rounded-2xl, 860×560 px fixos | nenhuma | não | não | sim |
| 16 | ImplementacaoIA.tsx:2625 | Lightbox do comentário | black/85 sem blur | 10000 | imagem solta | nenhuma | sim | não | sim |
| 17 | ImplementacaoIA.tsx:2646 | DocEditorModal | black/60 blur-sm | 60 | dark-card, rounded-2xl, max-w-3xl | nenhuma | não | não | sim |
| 18 | ImplementacaoIA.tsx:2900 | SubtaskDetailModal | black/60 blur-sm | 50 | dark-card, rounded-2xl, max-w-7xl | nenhuma | não | não | sim |
| 19 | ImplementacaoIA.tsx:3099 | TagsManagerModal | black/60 blur-sm | 100 | **dark-bg, rounded-3xl** | nenhuma | não | não | sim |
| 20 | TodoStaff.tsx:445 | TagsManagerModal | black/40 blur-sm | 50 | **dark-bg, rounded-3xl** | nenhuma | não | não | **não** |
| 21 | TodoStaff.tsx:723 | TodoModal (nova/editar tarefa) | black/30 blur-sm | 50 | **dark-bg, rounded-3xl** | nenhuma | não | não | **não** |
| 22 | TodoStaff.tsx:990 | Preview de imagem da subtarefa | black/80 sem blur | 100 | imagem solta | nenhuma | não | não | sim |
| 23 | TodoStaff.tsx:1135 | TaskDetailModal | black/40 blur-sm | 50 | **dark-bg, rounded-3xl** | nenhuma | não | não | sim |
| 24 | TodoStaff.tsx:1325 | Preview de imagem | black/80 blur-sm | 2000 | imagem solta | nenhuma | não | não | sim |
| 25 | TodoStaff.tsx:1368 | RecModal (recorrente) | black/30 blur-sm | 50 | **dark-bg, rounded-3xl, azul** | nenhuma | não | não | **não** |
| 26 | TodoStaff.tsx:1479 | IdeaModal | black/30 blur-sm | 50 | **dark-bg, rounded-3xl** | nenhuma | não | não | **não** |
| 27 | TodoStaff.tsx:1663 | IdeaDetailModal | black/40 blur-sm | 50 | **dark-bg, rounded-3xl** | nenhuma | não | não | sim |
| 28 | ListaPage.tsx:106 | TagsManagerModal | black/60 blur-sm | 100 | **dark-bg, rounded-3xl** | nenhuma | não | não | sim |
| 29 | ListaPage.tsx:682 | EtapasModal | black/50 blur-sm | 9000 | bg-white dark:bg-dark-card, rounded-2xl, 480 px | nenhuma | não | não | sim |
| 30 | PostagensUI.tsx:299 | NovaPostagemModal | black/50 blur-sm | 9000 | bg-white dark:bg-dark-card, rounded-2xl, 480 px | nenhuma | sim | não | sim |
| 31 | ListaTaskDetailModal.tsx:295 | Detalhe da postagem | black/60 blur-sm | 50 | dark-card, border par, rounded-2xl, max-w-4xl 85vh | framer-motion scale .95→1, 0,25 s (exit não roda: sem AnimatePresence no pai) | não | não | sim |
| 32 | ListaTaskDetailModal.tsx:652 | Lightbox | black/90 sem blur | 60 | imagem solta | framer-motion opacity | não | não | sim |
| 33 | TaskDetailModal.tsx:324 | Detalhe da tarefa (To Do) | `modal-overlay` | 50 | `modal-container`, max-w-3xl 85vh | motion/react scale .95→1 + y | não | não | sim |
| 34 | TaskDetailModal.tsx:818 | Lightbox | black/90 sem blur | 60 | imagem solta | motion/react opacity | não | não | sim |
| 35 | TodoPage.tsx:1808 | Criar Lote (`ui/Modal`) | `modal-overlay` | 50 | `modal-container`, max-w-lg | motion/react scale .95→1, 0,25 s | não | **não** (o `ui/Modal` não trata Esc) | sim |
| 36 | Estudio.tsx:397 | ModalGeracao (assistente) | black/70 blur-sm | 50 | dark-card, border par, rounded-2xl, max-w-3xl 92vh | framer-motion scale .97→1, **sem exit** | não | não | sim (perde o passo) |
| 37 | Estudio.tsx:1067 | ModalGastoPorPessoa | black/70 blur-sm | 50 | dark-card, rounded-2xl, max-w-2xl | framer-motion scale .97 com exit | não | não | sim |
| 38 | EstudioConfig.tsx:311 | Configurações do Estúdio | black/70 blur-sm | 50 | dark-card, rounded-2xl, max-w-4xl 92vh | framer-motion scale .97→1, sem exit | não | não | sim |
| 39 | MarketingAcoes.tsx:557 | ModalOverlay (Adicionar/Editar Campanha, Registrar Ação) | black/60 blur-sm (div irmã) | 50 | dark-card, border-white/10, rounded-2xl, max-w-md/lg | nenhuma | não | não | sim |
| 40 | MarketingAcoes.tsx:216 | Lightbox de anexo | black/80 blur-sm | 100 | imagem rounded-2xl | nenhuma | não | não | sim |
| 41 | MediaLightbox.tsx:31 | MediaLightbox (compartilhado) | black/85 blur-sm | 10000 | tela cheia | nenhuma | sim | **sim** | sim |

Resumo: 41 modais; 10 em portal; 1 com Esc; 8 com animação de entrada; 1 usa `ui/Modal`; 4 não fecham com clique fora; 8 com `bg-dark-bg rounded-3xl`; 9 z-indexes distintos.

**Padrão predominante**: overlay montado à mão `fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm onClick={onClose}` + container `bg-dark-card border … rounded-2xl shadow-2xl` com `stopPropagation`, sem portal, sem animação e sem Esc (26 de 41). A segunda família é a do TodoStaff/TagsManager (`bg-dark-bg rounded-3xl`, overlay black/30–40), copiada em ListaPage e ImplementacaoIA.

---

## 3. Os 5 problemas mais visíveis para o usuário (em ordem)

1. **Título errado em páginas que reaproveitam template** — TodoStaff.tsx:2703 + App.tsx:459 ("TODO Staff" em toda página `todo-staff`) e TodoPage.tsx:1142 + App.tsx:393 ("To Do Gestor" fixo, `text-4xl`). O usuário vê o nome errado, em inglês, no topo da página. Correção: `pageLabel` via `findPageLabel`.
2. **Tema claro quebrado no VisualHub e na Implementação de IA** — 88 bordas `border-white/*` sem par claro (VisualHub.tsx 385…4494; ImplementacaoIA.tsx 327…2586) e `text-white` sobre cartão (VisualHub.tsx:859, 3613, 4569): no claro, modais e tabela ficam sem contorno e o nome do arquivo no preview some. Correção: `border-black/10 dark:border-white/10`, `text-dark-text`.
3. **Modais não fecham com Esc e alguns nem com clique fora** — 40 de 41 sem Esc; TodoStaff.tsx:445, 723, 1368, 1479 (Tags, Nova Tarefa, Recorrente, Ideia) só fecham pelo X, em Chamados, Ideais Criativos e TODO Staff. Correção: Esc no `ui/Modal` e migração.
4. **Quadro "vazio" enquanto carrega** — TodoStaff.tsx:3476 (sem `loading`; todas as colunas mostram "Nenhum item" + emoji 📋 em 2029) e Estudio.tsx:1275 ("Nenhum vídeo gerado ainda"). Parece perda de dados por 0,5–2 s a cada abertura. Correção: estado `loading` + `LoadingSpinner`.
5. **Abas e botões fora da cor/forma do sistema** — abas de fundo cheio TodoStaff.tsx:2733-2752 e TodoPage.tsx:1186-1215 (violeta e verde), modal "Nova Recorrente" inteiro azul (TodoStaff.tsx:1371, 1429), CTA em degradê fuchsia do Estúdio (Estudio.tsx:1265) e `alert()` nativo no VisualHub (2563) e no detalhe de tarefa (TaskDetailModal.tsx:294, 299, 305).
