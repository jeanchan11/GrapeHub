# Auditoria de design — área Comercial/CRM (18/11/2026)

Somente leitura. Referência: `padrao-design.md`. Linhas conferidas no arquivo atual.
Sem `alert()`/`confirm()`/`prompt()` nativos no grupo (exclusões usam `confirmDialog`). Sem texto de interface em inglês relevante (só "Pipeline" em Automacoes.tsx:295 e rótulos de Metas — jargão aceitável; "Webhook" idem).

## 1. Achados

| arquivo:linha | categoria | o que está fora | correção sugerida |
|---|---|---|---|
| **CrmLeads.tsx:429** (+439, 451, 499, 523, 531, 546, 554, 581) | cor / popup | Modal de histórico do lead com fundo `bg-[#151221]` fixo e textos `text-white`/`text-slate-200/300` fixos: no tema claro aparece um popup preto; no `dark.darker` destoa do card. Bolinhas da timeline com `border-[#151221]`. | Container `bg-dark-card border border-black/10 dark:border-white/10`; textos `text-dark-text` e `text-slate-500 dark:text-slate-400`; bolinhas `border-dark-card`. Melhor: trocar por `Modal`. |
| **CrmSequencias.tsx:137** | cor / cabeçalho | Título `SplitHeadline` com `text-white` fixo: **some no tema claro**. Tamanho `text-3xl`. | `className="text-2xl font-black tracking-tight text-dark-text"`. |
| CrmLeads.tsx:785 | cor / botão | Botão Exportar `text-slate-300 bg-white/5 border-white/10` — só existe no escuro (no claro fica texto cinza-claro sem borda). | Mesmo botão secundário de CrmPessoas.tsx:212 (`border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5`). |
| CrmLeads.tsx:771 | cor | Filtro de status: hover `hover:text-slate-300 hover:bg-white/5` (só escuro). | `hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5`. |
| CrmLeads.tsx:725, CrmPessoas.tsx:183, CrmEmpresas.tsx:174 | cabeçalho | Ladrilho de ícone antes do título (`p-2 bg-violet-500/10 rounded-lg border`) — terceiro estilo de cabeçalho; CrmLeads ainda põe a contagem em pílula ao lado e não tem subtítulo. | `SplitHeadline` puro + subtítulo `text-[10px] font-bold uppercase tracking-widest` (ou `PageHeader`). |
| CrmPessoas.tsx:209, CrmEmpresas.tsx:200 | botão | Botão de engrenagem sem `onClick` (não faz nada). | Remover ou ligar a uma ação. |
| Títulos de página — tamanhos misturados | cabeçalho | `text-xl` Atividades.tsx:747; `text-3xl` CrmSequencias.tsx:137, Automacoes.tsx:824, ComercialGrape.tsx:220; `text-4xl` TaskTemplates.tsx:175, CloserCalculator.tsx:189, ContratosCalculator.tsx:168, GestorCalculator.tsx:212, HeadCalculator.tsx:191. Padrão = `text-2xl`. | `text-2xl font-black tracking-tight text-dark-text` em todos. |
| Atividades.tsx:741-892 | cabeçalho/abas / botão | Cabeçalho em barra sticky de vidro (`gh-barra-vidro`), abas de status com **fundo violeta em degradê** inline (`linear-gradient(135deg,#7c3aed,#6d28d9)`, l.788-790) e botão "Nova Atividade" com degradê inline (l.885-886, `hover:shadow-violet-500/25`). Linguagem própria. | Cabeçalho comum (`SplitHeadline` + subtítulo); abas como `ABAS_CLS` (segmentada) com item ativo `bg-dark-card shadow-sm`; botão `bg-violet-600 hover:bg-violet-700 text-white rounded-xl`. |
| Atividades.tsx:897-900 | carregamento | Spinner próprio `w-10 h-10 border-4 border-violet-500/30 border-t-violet-500` + "Carregando atividades...". | `<LoadingSpinner size="lg" />`. |
| Atividades.tsx:735-738 | animação | `@keyframes sectionExpand` anima `max-height` até 2000px (custa re-layout, duração não controlada). | Expandir com `motion` (height auto) ou sem animação. |
| TaskTemplates.tsx:163-164 | carregamento | Carregamento = texto cru "Carregando modelos...". | `<div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>`. |
| TaskTemplates.tsx:180, 228 | botão | Primário `bg-violet-500 hover:bg-violet-600`, `px-6 py-3` (maior que o resto). | `bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-xl`. |
| TaskTemplates.tsx:205-210 | botão | "Duplicar" usa ícone `Plus` (parece "adicionar"). | Ícone `Copy`. |
| TaskTemplates.tsx:222 | formato | Estado vazio `rounded-3xl` enquanto os cartões ao lado são `rounded-2xl`. | `rounded-2xl` (ou `Cartao`). |
| CrmMetas.tsx:435-436 | popup | Wizard de meta: `fixed inset-0 z-50 bg-black/50`, sem desfoque, sem animação, **sem fechar no clique fora** e sem Esc. | `Modal` (ou overlay `bg-black/60 backdrop-blur-sm` com `onClick={fechar}` + motion scale .95→1). |
| CrmMetas.tsx:386, 397; MetasPopup.tsx:266, 587 | formato | Números grandes sem `.numero` (Azeret Mono). | Adicionar classe `numero`. |
| CrmMetas.tsx:131-134, MetasPopup.tsx:137-140, 563; CrmComercial.tsx:3601-3604, 3810 | cor | Mesma função de cor de progresso copiada 3× com hex (`#10b981/#f59e0b/#8b5cf6/#ef4444`). | Uma função em `src/lib` usando tokens (emerald-500/amber-500/violet-500/rose-500). |
| MetasPopup.tsx:488-491 | carregamento | Spinner próprio `border-4` + "Carregando metas...". | `LoadingSpinner size="md"`. |
| MetasPopup.tsx:428, 616 | popup / animação | Overlay é `div` comum dentro de `AnimatePresence` → **saída sem animação** (popup some de golpe; só o painel anima na entrada); overlay inline `rgba(0,0,0,.55)` sem desfoque. | Overlay em `motion.div` com opacity + `backdrop-blur-sm`; ou `Modal`. |
| CrmMetas.tsx:430-680 × MetasPopup.tsx:612-860 | popup | Wizard de meta duplicado nos dois arquivos (mesmo layout, divergem em detalhes). | Extrair componente único. |
| CrmComercial.tsx (sem estado de carregamento) | carregamento | Página não tem `loading` inicial: o quadro aparece com colunas vazias até a API responder; só o seletor mostra "Carregando..." (l.5126). | `LoadingSpinner` centralizado enquanto `kanbans`/`leads` não chegaram. |
| CrmComercial.tsx:2281-2282, 2397-2398 | carregamento | `Loader2 size={32}` + "Carregando anotações/reuniões..." dentro do card do lead. | `LoadingSpinner size="md"`. |
| CrmComercial.tsx:1414, 1470, 1514, 1671, 1752, 1929 (6 oc.) | cor | Bolinhas da timeline com `dark:border-[#1A1625]` (hex de fundo antigo). | `dark:border-dark-card`. |
| CrmComercial.tsx:2306, 2422 | cor | `dark:border-[#15121E]`. | `dark:border-dark-card`. |
| CrmComercial.tsx:2235, 2373 | cor | Aba Notas/Reuniões com `bg-[#F8F9FA]` no claro. | `bg-dark-bg` (ou sem fundo). |
| CrmComercial.tsx:1418-1448, 1552, 1709, 1722, 1834-1888, 2465, 2478 (~20 oc.) | cor | Timeline do lead com `style={{ color:'#9ca3af' / '#6b7280' / '#7c3aed' }}` e fundos `rgba(...)` inline (inclusive `rgba(0,0,0,0.03)` que some no escuro). | Classes: `text-slate-500 dark:text-slate-400`, `text-violet-600`, `bg-violet-500/10`, `bg-black/[0.03] dark:bg-white/[0.03]`. |
| CrmComercial.tsx:6190-6527 (≈18 oc.) | cor | Modal "Configurações do CRM": bordas `dark:border-[#2d2b3d]` (6190, 6194, 6204, 6468, 6477, 6494, 6507), textos `dark:text-[#6b7280]/[#4b5563]/[#9ca3af]` (6229, 6230, 6242, 6291, 6340, 6463, 6464, 6469), botões `style={{background:'#7c3aed'}}` (6483, 6513), cores inline 6502, 6518, 6525, 6527. | `border-black/10 dark:border-white/10`, `text-slate-500 dark:text-slate-400`, botão `bg-violet-600 hover:bg-violet-700`. |
| CrmComercial.tsx:6314 | botão | Botão "Salvar" do webhook de formulário em `bg-blue-600` (o do WhatsApp, 6265, é emerald). | `bg-violet-600 hover:bg-violet-700`. |
| CrmComercial.tsx:6238, 6287, 6336, 6501, 6525, 6527, 1104 | vazio/texto (emoji) | Emojis como ícone: 💬 📝 📥 📋, botões ✏️/🗑 de editar/excluir motivo, "Configure em ⚙️". | `MessageCircle`, `FileText`, `Inbox`, `ClipboardList`, `Pencil`, `Trash2` (lucide, 16px, `text-slate-400`). |
| CrmComercial.tsx:6277, 6326, 6450 | texto | "✨ Editar Integração" / "✨ Editar Roteamento (Ativo)". | Tirar o ✨; usar ícone `Check` verde para "ativo". |
| CrmComercial.tsx:1874, 1941, 3531, 4995-4996 | texto (emoji) | "Gatilho de WhatsApp acionado ✅", "CONQUISTA! 🏆", "🔥" ao lado do nome do kanban comercial, "❌ Lead marcado como perdido" (vai para histórico/toast). | Texto sem emoji; ícone lucide quando precisar (`Trophy`, `XCircle`). |
| CrmComercial.tsx:501 | animação | Selo de ganho no card do kanban com `animate-pulse` infinito. | Sem pulso (selo estático). |
| CrmComercial.tsx:366 | formato | Coluna do kanban `rounded-3xl`, cards `rounded-xl` (l.493), modais `rounded-2xl`/`rounded-3xl`/`rounded-xl` — cantos misturados na mesma tela. | Coluna `rounded-2xl`; modais `rounded-2xl` (ou o raio do `Modal`). |
| CrmComercial.tsx:1215-1220, 1940, 1949-1950, 2006, 2868, 3446 | formato | Sombras coloridas (`shadow-violet-500/50`, `shadow-emerald-500/30`, `shadow-xl shadow-violet-500/20`). | `shadow-sm` neutra ou nenhuma. |
| CrmComercial.tsx:3668 | animação | Contador do widget de meta anima em 2,5 s. | ≤ 0,8 s (CountUp do Dashboard Operacional). |
| CrmComercial.tsx:6574-6589 | cor/animação | Comemoração "NEGÓCIO GANHO! 🔥": degradê violeta→fúcsia, `drop-shadow` neon, `rounded-[2rem]`, `border-[6px]`, spring 0.5→1. É exceção intencional; só tirar o emoji se quiser coerência. | (opcional) remover 🔥. |
| CrmComercial.tsx:3485-3488 | popup | `GerenciarKanbansModal`: sem animação, sem borda, sem Esc. | `Modal`. |
| CrmComercial.tsx:5489 | popup | Modal "Gerenciar modelos": overlay **sem** `onClick` (não fecha clicando fora). | `Modal`. |
| CrmComercial.tsx:2648, 2793, 3343 | popup | Três popups internos do card com `z-[9999]`/`z-[2000]`, fundo `bg-white dark:bg-dark-card` sem borda, 2648 sem animação, 3345 `rounded-3xl`. | `Modal`. |
| CrmComercial.tsx:2033, 2095 | popup | Overlay inline `rgba(0,0,0,.55)`/`.45` sem desfoque; overlay sem animação de saída. | `Modal`. |
| ui/Modal.tsx:36-57 (afeta CrmComercial 5693…6108, CrmPessoas:311, CrmEmpresas:327, TaskTemplates:239) | popup | O próprio `Modal` **não fecha com Esc**, não usa portal, e o botão X usa `dark:hover:bg-neutral-800`/`text-gray-*` e ícone `text-purple-500`. | Adicionar `useEffect` de Escape, `createPortal(document.body)`, X com `hover:bg-black/5 dark:hover:bg-white/5`, ícone `text-violet-500`. Corrigir aqui conserta 10 modais do grupo de uma vez. |
| Atividades.tsx:213-218 | popup | Modal de atividade: overlay `rgba(0,0,0,.45)` sem desfoque; container `dark:bg-dark-bg/80` (translúcido, deixa a lista aparecer atrás); `rounded-3xl`; sem Esc; sem portal. | `bg-dark-card`, `rounded-2xl`, overlay `bg-black/60 backdrop-blur-sm` — ou `Modal`. |
| CrmLeads.tsx:427 | popup | Modal de histórico sem animação e sem Esc (tem portal e clique fora). | `Modal` ou motion scale .95→1 + Escape. |
| FechamentoPopup.tsx:94-95 | animação | Já no padrão de cor/portal/Esc; só falta animação de entrada (abre seco). `z-[90]` ok. | motion opacity + scale .95→1, 0,2 s. |
| CrmMetricas.tsx:559-561; MarketingDashboard.tsx:453-454 | carregamento | Ainda com spinner próprio `border-4 border-violet-500/30 border-t-violet-500`. | `LoadingSpinner size="lg"`. |
| CrmMetricas.tsx:550 | texto | Erro com "⚠" como ícone. | `<AlertTriangle size={14} />`. |
| CrmMetricas.tsx:274-305; MarketingDashboard.tsx:310-340 | formato (sobra) | `KpiCard` e `SessaoCard` antigos (`border-white/10` fixo) continuam no arquivo e **não são usados**; idem `LossTooltip` (CrmMetricas) e `CustomTooltip`/`PieTooltip` (Marketing). | Apagar código morto. |
| CrmMetricas.tsx:192, 208, 212, 354-372; MarketingDashboard.tsx:226, 242, 246; CrmLeads.tsx:134 | cor | Popovers de período/vendedor com `border-white/10` e `hover:bg-white/10`/`hover:bg-white/5` fixos (hover invisível no claro); o mesmo `DateRangePicker` está copiado em 3 arquivos. | `border-black/10 dark:border-white/10`, `hover:bg-black/5 dark:hover:bg-white/10`; usar `ui/DateRangePicker` único. |
| CrmMetricas.tsx:780-799 | cor | Eixos recharts `fill:'#94a3b8'` (aceitável; Jean quer manter esses gráficos). | Manter. |
| Automacoes.tsx:455-457 | vazio | Sem sequências cadastradas, mostra **"Carregando sequências..." para sempre** (a condição é `sequences.length === 0`). | Separar `carregando` de vazio: "Nenhuma sequência criada" + link. |
| Automacoes.tsx:840-848 | formato | Números do resumo (`text-2xl font-black`) sem `.numero`; resumo em faixa própria em vez de `CartaoKpi`. | `CartaoKpi` ou classe `numero`. |
| Automacoes.tsx:830, 568 | formato | Primário com `shadow-lg shadow-violet-500/20`. | Sem sombra colorida. |
| Automacoes.tsx:285, 325, 472, 952 | texto | "✓"/"✗" como ícone de status. | `Check`/`X` lucide. |
| CrmSequencias.tsx:163 | vazio | Emoji ⚡ como ícone do estado vazio. | `<Zap size={28} className="text-violet-500" />` (lucide). |
| CrmSequencias.tsx:218 | botão | "Salvar" da sequência em `bg-emerald-600`. | `bg-violet-600 hover:bg-violet-700`. |
| CrmSequencias.tsx (sem loading) | carregamento | Lista não tem estado de carregamento — mostra "Nenhuma sequência criada ainda" (165) enquanto busca. | `LoadingSpinner` até a 1ª resposta. |
| CrmLeads.tsx:367 | texto | "Lead ganho ✅". | Sem emoji (já há ícone `CheckCircle2`). |
| ComercialGrape.tsx:244, 325, 352, 366 | formato | Cartões `rounded-3xl p-6/p-7`; KPIs `rounded-2xl` (l.200) — cantos misturados. | `Cartao`/`CartaoKpi` de `graficos.tsx`. |
| ComercialGrape.tsx:313, 315, 319 | cor | Ícones dos KPIs com `bg-[#ef4444]`, `bg-[#f59e0b]`, `bg-blue-600` (cheios, cores aleatórias). | Ícone discreto `bg-violet-500/10 text-violet-500` (ou `CartaoKpi` sem ícone). |
| ComercialGrape.tsx:233, 355-356 | cor | `dark:text-[#10b981]`, `bg-[#10b981]/10`, `border-[#10b981]/20`. | `text-emerald-500`, `bg-emerald-500/10`, `border-emerald-500/20`. |
| ComercialGrape.tsx:172; CloserCalculator.tsx:164; ContratosCalculator.tsx:144; GestorCalculator.tsx:183 | cor | Exportar PNG com `backgroundColor:'#0f0f1a'` fixo: no tema claro sai texto escuro sobre fundo preto. | Ler o fundo atual (`getComputedStyle(document.body).backgroundColor`) ou omitir (HeadCalculator.tsx:177 já omite). |
| ComercialGrape.tsx:42; CloserCalculator.tsx:44; ContratosCalculator.tsx:52; GestorCalculator.tsx:44; HeadCalculator.tsx:41 | cor | Tooltip `bg-slate-800 text-white rounded` (cinza fixo, canto pequeno). | `bg-dark-card border border-black/10 dark:border-white/10 text-dark-text rounded-lg shadow-lg`. |
| CloserCalculator.tsx:217, 309, 345, 409; ContratosCalculator.tsx:196, 300, 327, 399; GestorCalculator.tsx:247, 376, 413, 444, 487 | formato | Cartões `rounded-3xl p-8` e `shadow-xl` no painel de parâmetros; HeadCalculator usa `rounded-2xl p-6` — as 4 calculadoras não batem entre si. | `Cartao` (22px) ou legado `rounded-2xl p-6`. |
| CloserCalculator.tsx:176-178; ContratosCalculator.tsx:155-157; GestorCalculator.tsx:166-168; HeadCalculator.tsx:166-170 | cor | Pizza com `#7c4dff` e `#ff7043` (violeta e laranja fora da paleta). | `rgb(var(--accent-color))`, emerald-500, amber-500. |
| CloserCalculator.tsx:275; ContratosCalculator.tsx:266; GestorCalculator.tsx:328; ComercialGrape.tsx:303 | formato | Botão exportar com `shadow-lg shadow-violet-500/20`. | Sem sombra colorida. |
| GestorCalculator.tsx:353 | cor | Barra de score `bg-blue-500` no meio da escala. | `bg-amber-500`. |
| PropostaTab.tsx:48, 64 | botão/cor | Botão primário "Baixar proposta" em `bg-fuchsia-600` e ícone fúcsia (a aba Contrato ao lado usa violeta). | `bg-violet-600 hover:bg-violet-700`; ícone `bg-violet-500/15 text-violet-400`. |
| PropostaTab.tsx:74 | cor | Fundo da prévia `bg-slate-900/60` fixo (escuro também no claro); a de Contrato (ContratoTab.tsx:390) usa `bg-slate-200/40 dark:bg-black/30`. | Igualar à do Contrato. |
| AIChat.tsx:402-432 | cor | Painel inteiro em estilo inline com paleta própria (`#0f0f17`, `#ffffff`, `#e5e7eb`…) decidida por `isDark` — não acompanha `dark.darker` nem os tokens. | Classes `bg-dark-card`, `border-black/10 dark:border-white/10`, `text-dark-text`. |
| AIChat.tsx:637-657, 669, 705, 733, 795, 905, 962, 1001 | texto (emoji) | Barra do chat com 🕐 ✏️ 🗑 ⚙ ✕ como botões; "🕐 Histórico", "⚙ Configurar", "⚠", "➤" (enviar). | `History`, `PenSquare`, `Trash2`, `Settings`, `X`, `AlertTriangle`, `SendHorizontal`. |
| AIChat.tsx:40-45 | texto (emoji) | Ícone do especialista por emoji (💰 🤝🔥 📈 ⚙️ 🍇). | Lucide por área ou o avatar do Fred. |
| AIChat.tsx:665-705, 718-736 | cor / popup | Modais Histórico/Config com borda `rgba(124,58,237,.4)`, cabeçalho violeta translúcido, textos `rgba(255,255,255,.3/.5)` e hover branco fixos (somem no claro); Histórico sem animação (Config tem `ai-modal-in`). | Mesmos tokens do resto; borda sutil `border-black/10 dark:border-white/10`. |

## 2. Inventário de popups/modais do grupo (28)

| # | arquivo:linha | overlay | z-index | container | animação | portal | Esc | clique fora |
|---|---|---|---|---|---|---|---|---|
| 1 | CrmComercial.tsx:1043 (card do lead) | `bg-black/60` + camada `backdrop-blur-sm` | z-[1000] | `modal-container` max-w-7xl h-[90vh] shadow-2xl | framer-motion spring (scale .96, y 12) | não | **não** | sim |
| 2 | CrmComercial.tsx:2033 (escolher sequência) | inline rgba(0,0,0,.55), sem blur | z-[1100] | `bg-white dark:bg-dark-card` rounded-2xl borda | framer scale .95 (overlay sem saída) | não | não | sim |
| 3 | CrmComercial.tsx:2095 (seletor de modelo) | inline rgba(0,0,0,.45), sem blur | z-[1100] | idem 2 | framer scale .95 | não | não | sim |
| 4 | CrmComercial.tsx:2648 (editor de checklist) | `bg-black/50 backdrop-blur-sm` | z-[9999] | `bg-white dark:bg-dark-card` rounded-2xl sem borda | **nenhuma** | não | não | sim |
| 5 | CrmComercial.tsx:2793 (detalhe da tarefa) | `bg-black/50 backdrop-blur-sm` | z-[9999] | idem 4, max-w-sm | `animate-in zoom-in-95` 200ms | não | não | sim |
| 6 | CrmComercial.tsx:3343 (adicionar reunião) | `bg-black/40 backdrop-blur-sm` | z-[2000] | `bg-white dark:bg-dark-card` **rounded-3xl** sem borda | `animate-in zoom-in-95` | não | não | sim |
| 7 | CrmComercial.tsx:3454 (visualizar imagem) | `bg-black/80 backdrop-blur-sm` | z-[2000] | sem container | nenhuma | não | não | sim |
| 8 | CrmComercial.tsx:3485 (Gerenciar Kanbans) | `bg-black/60 backdrop-blur-sm` | z-[1000] | `bg-white dark:bg-dark-card` rounded-2xl sem borda | nenhuma | não | não | sim |
| 9 | CrmComercial.tsx:5489 (Gerenciar modelos) | `bg-black/60 backdrop-blur-sm` | z-[2000] | rounded-2xl sem borda | framer scale .95 | não | não | **não** |
| 10-16 | CrmComercial.tsx:5693, 5788, 5847, 5881, 5956, 6078, 6108 (Novo Lead, Comentários, Histórico, Nova/Editar/Excluir Coluna, Novo Kanban) | `Modal` → `.modal-overlay` | z-50 | `.modal-container` | motion/react scale .95 + y 20, 0,25 s | não | **não** | sim |
| 17 | CrmComercial.tsx:6181 (Configurações do CRM) | inline rgba(0,0,0,.6) + blur 4px | z-[99999] | `bg-white dark:bg-dark-card` **rounded-xl**, borda `#2d2b3d` | framer scale .95, 0,2 s | não | não | sim |
| 18 | CrmComercial.tsx:6564 (comemoração) | `bg-black/80 backdrop-blur-md` | z-[100000] | sem container (gif `rounded-[2rem]`) | spring scale .5→1 | não | não | sim |
| 19 | CrmLeads.tsx:427 (histórico do lead) | `bg-black/60 backdrop-blur-sm` | z-[9999] | **`bg-[#151221]`** rounded-2xl border-white/10 | nenhuma | sim | não | sim |
| 20 | CrmPessoas.tsx:311 (contato) | `Modal` | z-50 | `.modal-container` | motion/react | não | não | sim |
| 21 | CrmEmpresas.tsx:327 (empresa) | `Modal` | z-50 | idem | motion/react | não | não | sim |
| 22 | TaskTemplates.tsx:239 (modelo) | `Modal` | z-50 | idem | motion/react | não | não | sim |
| 23 | Atividades.tsx:213 (nova/editar atividade) | inline rgba(0,0,0,.45), sem blur | z-[1100] | `bg-white dark:bg-dark-bg/80` (translúcido) **rounded-3xl** | `animate-in zoom-in-95` | não | não | sim |
| 24 | CrmMetas.tsx:435 (wizard de meta) | `bg-black/50`, sem blur | **z-50** | `bg-white dark:bg-dark-card` rounded-2xl borda | nenhuma | não | não | **não** |
| 25 | MetasPopup.tsx:428 (Metas, aberto do CRM) | inline rgba(0,0,0,.55), sem blur | z-[1200] | `bg-white dark:bg-dark-card` rounded-2xl borda | framer no painel; overlay sem saída | não | não | sim |
| 26 | MetasPopup.tsx:616 (wizard sobre o popup) | inline rgba(0,0,0,.45) | z-[1300] | idem | framer scale .95 | não | não | sim |
| 27 | FechamentoPopup.tsx:94 | `bg-black/60 backdrop-blur-sm` | z-[90] | `bg-white dark:bg-dark-card` rounded-2xl `border-black/10 dark:border-white/10` | **nenhuma** | sim | sim | sim |
| 28 | AIChat.tsx:565 (chat) / 663 (histórico) / 716 (config) | inline rgba .55 blur 8 / rgba .7 blur 6 / idem | 9990 / 10000 / 10000 | inline hex `#0f0f17`/`#fff`, raio 24/20, borda violeta .4 nos dois internos | CSS `ai-modal-in` 0,2 s / nenhuma / 0,18 s | sim | sim (cascata) | sim |

Resumo: **18 modais feitos à mão** com `fixed inset-0` e **10 via `ui/Modal`**. z-index em 12 valores diferentes (50 a 100000). 7 tons de overlay (rgba inline .45/.55/.6/.7, black/40/50/60/80). Só **5 usam portal** e só **4 fecham com Esc** (FechamentoPopup e os 3 do AIChat). 2 não fecham com clique fora (CrmMetas:435, CrmComercial:5489).

## 3. Os 5 problemas mais visíveis

1. **CrmLeads.tsx:429** — popup de histórico do lead é preto fixo (`bg-[#151221]` + texto branco) no tema claro; é o clique principal da página Leads.
2. **CrmSequencias.tsx:137** — título da página em `text-white`: no tema claro a página fica sem título.
3. **Modais do CRM sem Esc e sem padrão** — a começar pelo card do lead (CrmComercial.tsx:1043), o popup mais usado do sistema; a raiz é `ui/Modal.tsx:36` não tratar Escape. Consertar o `Modal` (Esc + portal) e migrar os 18 feitos à mão resolve o grupo.
4. **Atividades.tsx:741-900 e 213** — página com outra linguagem: cabeçalho de vidro, abas e botão em degradê violeta inline, spinner próprio e modal translúcido `dark:bg-dark-bg/80` `rounded-3xl` sem desfoque.
5. **Configurações do CRM (CrmComercial.tsx:6181-6527)** — modal com bordas/textos em hex (`#2d2b3d`, `#6b7280`…), emojis 💬 📝 📥 📋 ✏️ 🗑 como ícones, botões `#7c3aed` inline e "Salvar" em azul (6314). Junto: Calculadoras (Closer/Contratos/Gestor/ComercialGrape) exportam PNG com fundo preto fixo `#0f0f1a` e usam `rounded-3xl p-8`, `text-4xl`.
